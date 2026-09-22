// Umiestnenie: backend/src/controllers/sezonaController.ts
// Správa sezón a súpisiek po sezónach.

import { Request, Response } from 'express';
import Sezona from '../models/Sezona';
import SupiskaSezony from '../models/SupiskaSezony';
import Player from '../models/Player';
import Team from '../models/Team';
import Liga from '../models/Liga';
import { sanitizePlainText } from '../utils/sanitize';

/**
 * GET /api/seasons
 * Zoznam sezón, najnovšia prvá.
 */
/**
 * Tvar sezóny pre API - k uloženým poliam pridá odvodený stav
 * (aktívna / neaktívna / archivovaná), ktorý žiadala požiadavka.
 */
const soStavom = (sezona: any) => ({
  ...sezona.toJSON(),
  stav: sezona.stav(),
});

export const getSezony = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Archivované sezóny sem nepatria - tie má na starosti /api/admin/archive
    const sezony = await Sezona.findAll({
      where: { aktivity: true },
      order: [['nazov', 'DESC']],
    });
    res.json({ success: true, data: sezony.map(soStavom), pocet: sezony.length });
  } catch (error) {
    console.error('Chyba pri načítaní sezón:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní sezón' });
  }
};

/**
 * GET /api/seasons/current
 * Aktuálna sezóna - verejný web podľa nej rozhoduje, čo zobraziť.
 */
export const getAktualnaSezona = async (_req: Request, res: Response): Promise<void> => {
  try {
    const sezona = await Sezona.aktualnaSezona();
    if (!sezona) {
      res.status(404).json({ success: false, message: 'Žiadna sezóna nie je vytvorená' });
      return;
    }
    res.json({ success: true, data: soStavom(sezona) });
  } catch (error) {
    console.error('Chyba pri načítaní aktuálnej sezóny:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * POST /api/admin/seasons
 * Vytvorenie novej sezóny.
 */
export const createSezona = async (req: Request, res: Response): Promise<void> => {
  try {
    const nazov = sanitizePlainText(String(req.body?.nazov || '')).trim();

    if (!nazov) {
      // Ak názov nebol zadaný, ponúkneme návrh podľa poslednej sezóny
      const navrh = await Sezona.navrhniNazovNovej();
      res.status(400).json({
        success: false,
        message: 'Názov sezóny je povinný',
        navrh,
      });
      return;
    }

    const existujuca = await Sezona.findOne({ where: { nazov } });
    if (existujuca) {
      res.status(409).json({
        success: false,
        message: `Sezóna "${nazov}" už existuje`,
      });
      return;
    }

    const sezona = await Sezona.create({
      nazov,
      zaciatok: req.body?.zaciatok || null,
      koniec: req.body?.koniec || null,
      poznamka: req.body?.poznamka ? sanitizePlainText(req.body.poznamka) : null,
    });

    // Ak je to prvá sezóna, rovno ju označíme ako aktuálnu
    const pocet = await Sezona.count();
    if (pocet === 1) {
      await Sezona.nastavAktualnu(sezona.id);
      await sezona.reload();
    }

    res.status(201).json({
      success: true,
      data: sezona,
      message: `Sezóna ${nazov} bola vytvorená`,
    });
  } catch (error: any) {
    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje sezóny',
        errors: error.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri vytváraní sezóny:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní sezóny' });
  }
};

/**
 * PUT /api/admin/seasons/:id
 * Úprava sezóny.
 */
export const updateSezona = async (req: Request, res: Response): Promise<void> => {
  try {
    const sezona = await Sezona.findByPk(Number(req.params.id));
    if (!sezona) {
      res.status(404).json({ success: false, message: 'Sezóna nenájdená' });
      return;
    }

    const zmeny: any = {};
    if (req.body.nazov !== undefined) zmeny.nazov = sanitizePlainText(req.body.nazov).trim();
    if (req.body.zaciatok !== undefined) zmeny.zaciatok = req.body.zaciatok || null;
    if (req.body.koniec !== undefined) zmeny.koniec = req.body.koniec || null;
    if (req.body.uzavreta !== undefined) zmeny.uzavreta = Boolean(req.body.uzavreta);
    if (req.body.poznamka !== undefined) {
      zmeny.poznamka = req.body.poznamka ? sanitizePlainText(req.body.poznamka) : null;
    }

    await sezona.update(zmeny);

    res.json({ success: true, data: soStavom(sezona), message: 'Sezóna bola upravená' });
  } catch (error: any) {
    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje sezóny',
        errors: error.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri úprave sezóny:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * POST /api/admin/seasons/:id/set-current
 * Označenie sezóny ako aktuálnej.
 */
export const nastavAktualnuSezonu = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const sezona = await Sezona.findByPk(id);
    if (!sezona) {
      res.status(404).json({ success: false, message: 'Sezóna nenájdená' });
      return;
    }

    await Sezona.nastavAktualnu(id);
    await sezona.reload();

    res.json({
      success: true,
      data: sezona,
      message: `Sezóna ${sezona.nazov} je teraz aktuálna`,
    });
  } catch (error) {
    console.error('Chyba pri nastavovaní aktuálnej sezóny:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * DELETE /api/admin/seasons/:id
 * Archivácia sezóny.
 *
 * Pôvodne tu bolo trvalé zmazanie (sezona.destroy()). Sezóna bola jediná
 * entita z archívu, ktorá sa mazala natvrdo, takže sa nedala obnoviť
 * a miznula aj z prehľadu archívu. Teraz sa, rovnako ako tímy, hráči,
 * realizačný tím a ligy, len označí ako neaktívna a vráti sa cez
 * POST /api/admin/archive/sezony/:id/restore.
 *
 * Kontroly nižšie zostávajú: sezónu, na ktorú niečo odkazuje, ani
 * aktuálnu sezónu nemá zmysel schovať pred používateľom.
 */
export const deleteSezona = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const sezona = await Sezona.findByPk(id);
    if (!sezona) {
      res.status(404).json({ success: false, message: 'Sezóna nenájdená' });
      return;
    }

    // História sa nemaže. Radšej vysvetlíme, čo sezónu drží.
    const pocetLig = await Liga.count({ where: { sezona_id: id } as any });
    const pocetSupisiek = await SupiskaSezony.count({ where: { sezona_id: id } });

    if (pocetLig > 0 || pocetSupisiek > 0) {
      res.status(409).json({
        success: false,
        message:
          `Sezónu nemožno zmazať - odkazuje na ňu ${pocetLig} líg a ${pocetSupisiek} záznamov na súpiskách. ` +
          'Ak ju chcete uzavrieť, nastavte príznak "uzavreta".',
      });
      return;
    }

    if (sezona.aktualna) {
      res.status(409).json({
        success: false,
        message: 'Aktuálnu sezónu nemožno zmazať. Najprv označte ako aktuálnu inú sezónu.',
      });
      return;
    }

    await sezona.update({ aktivity: false });
    res.json({
      success: true,
      message: `Sezóna ${sezona.nazov} bola presunutá do archívu`,
    });
  } catch (error) {
    console.error('Chyba pri archivácii sezóny:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * GET /api/teams/:id/roster
 * Súpiska tímu pre danú sezónu.
 *
 * Query: sezona_id (voliteľné, predvolene aktuálna sezóna)
 */
export const getSupiska = async (req: Request, res: Response): Promise<void> => {
  try {
    const timId = Number(req.params.id);
    if (!Number.isInteger(timId) || timId <= 0) {
      res.status(400).json({ success: false, message: 'Neplatné ID tímu' });
      return;
    }

    let sezonaId = Number(req.query.sezona_id);
    if (!Number.isInteger(sezonaId) || sezonaId <= 0) {
      const aktualna = await Sezona.aktualnaSezona();
      if (!aktualna) {
        res.status(404).json({ success: false, message: 'Žiadna sezóna nie je vytvorená' });
        return;
      }
      sezonaId = aktualna.id;
    }

    const supiska = await SupiskaSezony.findAll({
      where: { tim_id: timId, sezona_id: sezonaId, aktivny: true },
      include: [
        {
          model: Player,
          as: 'hrac',
          attributes: ['id', 'meno', 'priezvisko', 'datum_narodenia', 'fotka'],
        },
      ],
      // Hráči bez čísla dresu idú na koniec zoznamu.
      // Názov tabuľky uvádzame preto, že stĺpec cislo_dresu existuje
      // aj v tabuľke hráčov a bez upresnenia je odkaz nejednoznačný.
      order: [
        [
          require('sequelize').literal(
            'CASE WHEN "SupiskaSezony"."cislo_dresu" IS NULL THEN 1 ELSE 0 END'
          ),
          'ASC',
        ],
        require('sequelize').literal('"SupiskaSezony"."cislo_dresu" ASC'),
      ],
    });

    const sezona = await Sezona.findByPk(sezonaId);

    res.json({
      success: true,
      data: supiska,
      meta: { tim_id: timId, sezona: sezona?.nazov ?? null, pocet: supiska.length },
    });
  } catch (error) {
    console.error('Chyba pri načítaní súpisky:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní súpisky' });
  }
};

/**
 * GET /api/players/:id/history
 * História pôsobenia hráča po sezónach.
 *
 * Toto je hlavný dôvod, prečo súpisky vznikli - doteraz sa dalo zistiť
 * len to, v ktorom tíme je hráč práve teraz.
 */
export const getHistoriaHraca = async (req: Request, res: Response): Promise<void> => {
  try {
    const hracId = Number(req.params.id);
    if (!Number.isInteger(hracId) || hracId <= 0) {
      res.status(400).json({ success: false, message: 'Neplatné ID hráča' });
      return;
    }

    const zaznamy = await SupiskaSezony.findAll({
      where: { hrac_id: hracId },
      include: [
        { model: Sezona, as: 'sezona', attributes: ['id', 'nazov', 'aktualna'] },
        { model: Team, as: 'tim', attributes: ['id', 'nazov', 'vekova_kategoria'] },
      ],
      order: [[{ model: Sezona, as: 'sezona' }, 'nazov', 'DESC']],
    });

    res.json({ success: true, data: zaznamy, pocet: zaznamy.length });
  } catch (error) {
    console.error('Chyba pri načítaní histórie hráča:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * POST /api/admin/rosters
 * Zapísanie hráča na súpisku tímu v danej sezóne.
 */
export const zapisNaSupisku = async (req: Request, res: Response): Promise<void> => {
  try {
    const sezonaId = Number(req.body?.sezona_id);
    const timId = Number(req.body?.tim_id);
    const hracId = Number(req.body?.hrac_id);

    if (![sezonaId, timId, hracId].every((n) => Number.isInteger(n) && n > 0)) {
      res.status(400).json({
        success: false,
        message: 'Povinné sú sezona_id, tim_id a hrac_id (kladné celé čísla)',
      });
      return;
    }

    // Overíme, že všetko existuje - inak by chybu nahlásila až databáza
    const [sezona, tim, hrac] = await Promise.all([
      Sezona.findByPk(sezonaId),
      Team.findByPk(timId),
      Player.findByPk(hracId),
    ]);

    if (!sezona) { res.status(404).json({ success: false, message: 'Sezóna nenájdená' }); return; }
    if (!tim) { res.status(404).json({ success: false, message: 'Tím nenájdený' }); return; }
    if (!hrac) { res.status(404).json({ success: false, message: 'Hráč nenájdený' }); return; }

    if (sezona.uzavreta) {
      res.status(409).json({
        success: false,
        message: `Sezóna ${sezona.nazov} je uzavretá, súpisku už nemožno meniť`,
      });
      return;
    }

    const zaznam = await SupiskaSezony.zapisHraca({
      sezona_id: sezonaId,
      tim_id: timId,
      hrac_id: hracId,
      cislo_dresu: req.body?.cislo_dresu ?? null,
      pozicia: req.body?.pozicia ?? null,
      kapitan: Boolean(req.body?.kapitan),
    });

    // Ak zapisujeme do aktuálnej sezóny, aktualizujeme aj "aktuálny tím"
    // hráča, aby zostali obe miesta v súlade
    if (sezona.aktualna && hrac.tim_id !== timId) {
      await hrac.update({ tim_id: timId });
    }

    res.status(201).json({
      success: true,
      data: zaznam,
      message: `Hráč bol zapísaný na súpisku (sezóna ${sezona.nazov})`,
    });
  } catch (error) {
    console.error('Chyba pri zápise na súpisku:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri zápise na súpisku' });
  }
};

/**
 * DELETE /api/admin/rosters/:id
 * Odobratie hráča zo súpisky.
 */
export const zmazZoSupisky = async (req: Request, res: Response): Promise<void> => {
  try {
    const zaznam = await SupiskaSezony.findByPk(Number(req.params.id), {
      include: [{ model: Sezona, as: 'sezona' }],
    });

    if (!zaznam) {
      res.status(404).json({ success: false, message: 'Záznam na súpiske nenájdený' });
      return;
    }

    const sezona = (zaznam as any).sezona as Sezona | undefined;
    if (sezona?.uzavreta) {
      res.status(409).json({
        success: false,
        message: `Sezóna ${sezona.nazov} je uzavretá, súpisku už nemožno meniť`,
      });
      return;
    }

    await zaznam.destroy();
    res.json({ success: true, message: 'Hráč bol odobratý zo súpisky' });
  } catch (error) {
    console.error('Chyba pri mazaní zo súpisky:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};
