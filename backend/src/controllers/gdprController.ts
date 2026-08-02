// Umiestnenie: backend/src/controllers/gdprController.ts
// Práva dotknutých osôb a evidencia súhlasov.
//
// Rieši štyri veci, ktoré od klubu vyžaduje GDPR:
//   1. Evidencia súhlasu zákonného zástupcu so zverejnením údajov dieťaťa.
//   2. Právo na prístup - export všetkých údajov o hráčovi.
//   3. Právo na výmaz - anonymizácia namiesto mazania, aby sa nerozpadli
//      štatistiky odohraných zápasov.
//   4. Retencia - upozornenie na údaje, ktoré sa už nemajú uchovávať.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import Player from '../models/Player';
import Team from '../models/Team';
import Suhlas, { DRUHY_SUHLASU, DruhSuhlasu } from '../models/Suhlas';
import AuditLog from '../models/AuditLog';
import SupiskaSezony from '../models/SupiskaSezony';
import ZapasStatistika from '../models/ZapasStatistika';
import { sanitizePlainText } from '../utils/sanitize';

// Po koľkých rokoch od poslednej aktivity sa má hráč anonymizovať.
// Tri roky zodpovedajú bežnej praxi športových klubov - dovtedy môžu byť
// údaje potrebné pre súťažné a účtovné účely.
const ROKY_RETENCIE = 3;

/**
 * Je hráč maloletý?
 * Pri maloletých je potrebný súhlas zákonného zástupcu.
 */
export const jeMaloletý = (datumNarodenia: Date | string | null): boolean => {
  if (!datumNarodenia) return false;

  const narodenie = new Date(datumNarodenia);
  const dnes = new Date();

  let vek = dnes.getFullYear() - narodenie.getFullYear();
  const mesiac = dnes.getMonth() - narodenie.getMonth();
  if (mesiac < 0 || (mesiac === 0 && dnes.getDate() < narodenie.getDate())) {
    vek--;
  }

  return vek < 18;
};

/**
 * GET /api/admin/players/:id/consents
 * Prehľad súhlasov hráča.
 */
export const getSuhlasy = async (req: Request, res: Response): Promise<void> => {
  try {
    const hracId = Number(req.params.id);
    const hrac = await Player.findByPk(hracId);
    if (!hrac) {
      res.status(404).json({ success: false, message: 'Hráč nenájdený' });
      return;
    }

    const suhlasy = await Suhlas.findAll({ where: { hrac_id: hracId } });

    // Doplníme aj druhy, na ktoré zatiaľ žiadny záznam neexistuje,
    // aby správca videl kompletný prehľad a vedel, čo chýba
    const podlaDruhu = new Map(suhlasy.map((s) => [s.druh, s]));
    const prehlad = DRUHY_SUHLASU.map((druh) => {
      const zaznam = podlaDruhu.get(druh);
      return {
        druh,
        udeleny: zaznam?.udeleny ?? false,
        platny: zaznam?.jePlatny() ?? false,
        udelil_meno: zaznam?.udelil_meno ?? null,
        udelil_vztah: zaznam?.udelil_vztah ?? null,
        datum_udelenia: zaznam?.datum_udelenia ?? null,
        datum_odvolania: zaznam?.datum_odvolania ?? null,
        platny_do: zaznam?.platny_do ?? null,
        zdroj: zaznam?.zdroj ?? null,
        id: zaznam?.id ?? null,
      };
    });

    res.json({
      success: true,
      data: {
        hrac: { id: hrac.id, meno: hrac.meno, priezvisko: hrac.priezvisko },
        maloletý: jeMaloletý(hrac.datum_narodenia),
        suhlasy: prehlad,
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní súhlasov:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * PUT /api/admin/players/:id/consents
 * Zaznamenanie alebo odvolanie súhlasu.
 */
export const setSuhlas = async (req: Request, res: Response): Promise<void> => {
  try {
    const hracId = Number(req.params.id);
    const hrac = await Player.findByPk(hracId);
    if (!hrac) {
      res.status(404).json({ success: false, message: 'Hráč nenájdený' });
      return;
    }

    const druh = String(req.body?.druh || '') as DruhSuhlasu;
    if (!DRUHY_SUHLASU.includes(druh)) {
      res.status(400).json({
        success: false,
        message: `Neplatný druh súhlasu. Povolené: ${DRUHY_SUHLASU.join(', ')}`,
      });
      return;
    }

    const udeleny = Boolean(req.body?.udeleny);

    // Pri maloletom musíme vedieť, kto súhlas udelil.
    // Bez tejto informácie by klub nevedel preukázať jeho platnosť.
    if (udeleny && jeMaloletý(hrac.datum_narodenia)) {
      const meno = String(req.body?.udelil_meno || '').trim();
      const vztah = String(req.body?.udelil_vztah || '').trim();
      if (!meno || !vztah) {
        res.status(400).json({
          success: false,
          message:
            'Hráč je maloletý. Pri udelení súhlasu je povinné uviesť meno ' +
            'zákonného zástupcu (udelil_meno) a jeho vzťah k dieťaťu (udelil_vztah).',
        });
        return;
      }
    }

    const [zaznam] = await Suhlas.findOrCreate({
      where: { hrac_id: hracId, druh },
      defaults: { hrac_id: hracId, druh },
    });

    await zaznam.update({
      udeleny,
      udelil_meno: req.body?.udelil_meno ? sanitizePlainText(req.body.udelil_meno) : zaznam.udelil_meno,
      udelil_vztah: req.body?.udelil_vztah ? sanitizePlainText(req.body.udelil_vztah) : zaznam.udelil_vztah,
      udelil_email: req.body?.udelil_email ?? zaznam.udelil_email,
      zdroj: req.body?.zdroj ? sanitizePlainText(req.body.zdroj) : zaznam.zdroj,
      platny_do: req.body?.platny_do ?? zaznam.platny_do,
      poznamka: req.body?.poznamka ? sanitizePlainText(req.body.poznamka) : zaznam.poznamka,
      // Dátumy nastavujeme podľa toho, či sa súhlas udeľuje alebo odvoláva
      datum_udelenia: udeleny ? (zaznam.datum_udelenia ?? new Date()) : zaznam.datum_udelenia,
      datum_odvolania: udeleny ? null : new Date(),
    });

    await AuditLog.zaznamenaj({
      req,
      akcia: 'zmena_suhlasu',
      entita: 'Suhlas',
      entita_id: zaznam.id,
      popis: `${udeleny ? 'Udelený' : 'Odvolaný'} súhlas "${druh}" pre hráča ${hracId}`,
    });

    res.json({
      success: true,
      data: zaznam,
      message: udeleny ? 'Súhlas bol zaznamenaný' : 'Súhlas bol odvolaný',
    });
  } catch (error) {
    console.error('Chyba pri zmene súhlasu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * GET /api/admin/players/:id/export
 * Export všetkých údajov o hráčovi (právo na prístup).
 */
export const exportUdajov = async (req: Request, res: Response): Promise<void> => {
  try {
    const hracId = Number(req.params.id);

    const hrac = await Player.findByPk(hracId, {
      include: [{ model: Team, as: 'tim', attributes: ['id', 'nazov'] }],
    });
    if (!hrac) {
      res.status(404).json({ success: false, message: 'Hráč nenájdený' });
      return;
    }

    const [suhlasy, supisky, statistiky] = await Promise.all([
      Suhlas.findAll({ where: { hrac_id: hracId } }),
      SupiskaSezony.findAll({ where: { hrac_id: hracId } }),
      ZapasStatistika.findAll({ where: { hrac_id: hracId } }),
    ]);

    await AuditLog.zaznamenaj({
      req,
      akcia: 'export_udajov',
      entita: 'Player',
      entita_id: hracId,
      popis: `Export osobných údajov hráča ${hrac.meno} ${hrac.priezvisko}`,
    });

    res.json({
      success: true,
      data: {
        vytvorene: new Date().toISOString(),
        osobne_udaje: hrac.toJSON(),
        suhlasy,
        supisky_po_sezonach: supisky,
        statistiky_zapasov: statistiky,
      },
      message: 'Export osobných údajov. Odovzdajte ho dotknutej osobe.',
    });
  } catch (error) {
    console.error('Chyba pri exporte údajov:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri exporte' });
  }
};

/**
 * POST /api/admin/players/:id/anonymize
 * Anonymizácia hráča (právo na výmaz).
 *
 * PREČO ANONYMIZÁCIA A NIE ZMAZANIE: na hráča sa odkazujú štatistiky
 * odohraných zápasov a súpisky. Ich zmazaním by sa rozpadli výsledky
 * a poradie strelcov za minulé sezóny. Anonymizácia odstráni osobné
 * údaje, ale zachová športovú históriu klubu.
 */
export const anonymizuj = async (req: Request, res: Response): Promise<void> => {
  try {
    const hracId = Number(req.params.id);
    const hrac = await Player.findByPk(hracId);
    if (!hrac) {
      res.status(404).json({ success: false, message: 'Hráč nenájdený' });
      return;
    }

    // Potvrdenie zámeru - anonymizácia je nezvratná
    if (req.body?.potvrdenie !== 'ANONYMIZOVAT') {
      res.status(400).json({
        success: false,
        message:
          'Anonymizácia je nezvratná. Na potvrdenie pošlite v tele požiadavky ' +
          '{"potvrdenie": "ANONYMIZOVAT"}.',
      });
      return;
    }

    const povodneMeno = `${hrac.meno} ${hrac.priezvisko}`;

    await sequelize.transaction(async (t) => {
      await hrac.update(
        {
          meno: 'Anonymizovaný',
          priezvisko: `hráč #${hrac.id}`,
          // Dátum narodenia nahradíme 1. januárom toho istého roku.
          // Vek zostane orientačne zachovaný pre vekové kategórie,
          // ale presný dátum ako osobný údaj zmizne.
          datum_narodenia: new Date(new Date(hrac.datum_narodenia).getFullYear(), 0, 1),
          fotka: null,
          narodnost: null,
          vaha: null,
          vyska: null,
          aktivity: false,
        },
        { transaction: t }
      );

      // Súhlasy strácajú zmysel - osobné údaje už neexistujú
      await Suhlas.destroy({ where: { hrac_id: hracId }, transaction: t });
    });

    await AuditLog.zaznamenaj({
      req,
      akcia: 'anonymizacia',
      entita: 'Player',
      entita_id: hracId,
      popis: `Anonymizovaný hráč (pôvodne ${povodneMeno})`,
    });

    res.json({
      success: true,
      message:
        'Osobné údaje hráča boli odstránené. Štatistiky odohraných zápasov ' +
        'zostali zachované pod anonymným označením.',
    });
  } catch (error) {
    console.error('Chyba pri anonymizácii:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri anonymizácii' });
  }
};

/**
 * GET /api/admin/gdpr/retention
 * Prehľad údajov, ktoré presiahli dobu uchovávania.
 *
 * Zámerne len upozorňuje, nemaže automaticky - rozhodnutie o výmaze
 * má urobiť človek, ktorý pozná dôvod, prečo sú údaje ešte potrebné.
 */
export const prehladRetencie = async (req: Request, res: Response): Promise<void> => {
  try {
    const hranica = new Date();
    hranica.setFullYear(hranica.getFullYear() - ROKY_RETENCIE);

    // Neaktívni hráči, ktorí od hranice nemajú žiadny zápis na súpiske
    const neaktivni = await Player.findAll({
      where: {
        aktivity: false,
        aktualizovany: { [Op.lt]: hranica } as any,
        meno: { [Op.ne]: 'Anonymizovaný' } as any,
      },
      attributes: ['id', 'meno', 'priezvisko', 'aktualizovany'],
      limit: 200,
    });

    // Súhlasy, ktorým vypršala platnosť
    const vyprsaneSuhlasy = await Suhlas.count({
      where: {
        udeleny: true,
        datum_odvolania: null as any,
        platny_do: { [Op.lt]: new Date() } as any,
      },
    });

    res.json({
      success: true,
      data: {
        doba_uchovavania_rokov: ROKY_RETENCIE,
        hranica: hranica.toISOString().slice(0, 10),
        na_posudenie: neaktivni,
        pocet_na_posudenie: neaktivni.length,
        vyprsane_suhlasy: vyprsaneSuhlasy,
      },
      message:
        neaktivni.length > 0
          ? `${neaktivni.length} neaktívnych hráčov presiahlo dobu uchovávania. Posúďte, či ich údaje ešte potrebujete.`
          : 'Žiadne údaje nepresiahli dobu uchovávania.',
    });
  } catch (error) {
    console.error('Chyba pri prehľade retencie:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * GET /api/admin/gdpr/audit
 * Výpis auditného záznamu.
 */
export const getAudit = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const kde: any = {};

    if (req.query.entita) kde.entita = String(req.query.entita);
    if (req.query.akcia) kde.akcia = String(req.query.akcia);
    if (req.query.entita_id) kde.entita_id = Number(req.query.entita_id);

    const zaznamy = await AuditLog.findAll({
      where: kde,
      order: [['vytvoreny', 'DESC']],
      limit,
    });

    res.json({ success: true, data: zaznamy, pocet: zaznamy.length });
  } catch (error) {
    console.error('Chyba pri načítaní auditu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};
