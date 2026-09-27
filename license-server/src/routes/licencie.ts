// Umiestnenie: license-server/src/routes/licencie.ts
// Verejné endpointy licenčného servera - volajú ich klientske weby.
//
//   POST /api/license/verify            overenie licencie; odpoveď je podpísaná
//                                        a nesie aj dostupnú aktualizáciu a príkazy
//   GET  /api/license/status/:kluc       stručný stav bez podpisu
//   POST /api/license/prikaz/:id         inštalácia hlási priebeh príkazu
//   GET  /api/license/balik/:verziaId    stiahnutie balíka verzie (hlavička X-License-Key)
//
// Administrácia má vlastné endpointy pod /api/sprava (routes/sprava.ts).

import fs from 'fs';
import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import rateLimit from 'express-rate-limit';
import Licencia from '../models/Licencia';
import { NEUKONCENE_STAVY, Prikaz, Produkt, Verzia, zaznamenaj } from '../models/sprava';
import { podpis } from '../utils/podpis';
import { cestaBaliku } from '../utils/balicky';
import { normalizujVerziu, porovnajVerzie } from '../utils/verzie';
import { dostupnaAktualizacia, verziaPreKlienta, vypocitanyStav, vytvorPrikazAktualizacie, ChybaPrikazu } from '../sluzby/licencie';

const router = Router();

// Ako dlho je podpísaná odpoveď platná. Klient si ju smie zapamätať
// najviac na tento čas, potom sa musí spýtať znova.
const PLATNOST_ODPOVEDE_HODIN = 24;

/**
 * Obmedzenie počtu overovacích požiadaviek z jednej IP adresy.
 * Bráni skúšaniu licenčných kľúčov hrubou silou.
 */
const limitOverovania = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Príliš veľa požiadaviek na overenie. Skúste o chvíľu znova.' },
});

/** Sťahovanie balíkov - každá inštalácia potrebuje najviac pár za deň. */
const limitStahovania = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Príliš veľa sťahovaní. Skúste o chvíľu znova.' },
});

const najdiLicenciu = (kluc: unknown) =>
  typeof kluc === 'string' && kluc.length <= 64 ? Licencia.findOne({ where: { kluc: kluc.trim().toUpperCase() } }) : Promise.resolve(null);

/**
 * Údaje, ktoré o sebe hlási inštalácia (adresa webu, Node, systém...).
 * Berieme len jednoduché hodnoty s obmedzenou dĺžkou - nič z toho sa
 * nesmie dať zneužiť na zahltenie databázy.
 */
const ocistiInstalaciu = (vstup: unknown): Record<string, string | number | boolean> | null => {
  if (!vstup || typeof vstup !== 'object' || Array.isArray(vstup)) return null;
  const vysledok: Record<string, string | number | boolean> = {};
  for (const [kluc, hodnota] of Object.entries(vstup as Record<string, unknown>).slice(0, 25)) {
    if (!/^[a-z0-9_]{1,40}$/i.test(kluc)) continue;
    if (typeof hodnota === 'string') vysledok[kluc] = hodnota.slice(0, 200);
    else if (typeof hodnota === 'number' && Number.isFinite(hodnota)) vysledok[kluc] = hodnota;
    else if (typeof hodnota === 'boolean') vysledok[kluc] = hodnota;
  }
  return vysledok;
};

// ===================== OVERENIE LICENCIE =====================

/**
 * POST /api/license/verify
 *
 * Telo: { licenseKey, domena?, verzia?, instalacia? }
 *
 * Odpoveď obsahuje údaje o licencii a ich podpis. Klient podpis overí
 * verejným kľúčom, takže odpoveď sa nedá podvrhnúť - ani dostupná
 * aktualizácia a jej kontrolný súčet.
 */
router.post('/license/verify', limitOverovania, async (req: Request, res: Response) => {
  try {
    const { licenseKey, domena } = req.body;
    const verzia = typeof req.body.verzia === 'string' && req.body.verzia.length <= 40 ? normalizujVerziu(req.body.verzia) : null;

    if (!licenseKey || typeof licenseKey !== 'string') {
      res.status(400).json({ success: false, message: 'Chýba licenseKey' });
      return;
    }

    const licencia = await najdiLicenciu(licenseKey);

    // Aj zamietavá odpoveď je podpísaná, aby útočník nemohol zablokovaním
    // komunikácie predstierať dostupnosť servera.
    const zostavOdpoved = (platna: boolean, dovod: string | null, detaily: Record<string, unknown> = {}) => {
      const udaje = {
        platna,
        dovod,
        kluc: licenseKey,
        overene: new Date().toISOString(),
        platneDo: new Date(Date.now() + PLATNOST_ODPOVEDE_HODIN * 60 * 60 * 1000).toISOString(),
        ...detaily,
      };
      const sukromnyKluc = process.env.LICENSE_PRIVATE_KEY;
      if (!sukromnyKluc) throw new Error('Chýba LICENSE_PRIVATE_KEY - server nemôže podpisovať odpovede');
      // Podpisujeme až podobu, ktorú klient reálne dostane (dátumy ako text)
      const udajeNaOdoslanie = JSON.parse(JSON.stringify(udaje));
      return { success: true, data: udajeNaOdoslanie, podpis: podpis(udajeNaOdoslanie, sukromnyKluc.replace(/\\n/g, '\n')) };
    };

    if (!licencia) {
      res.status(404).json(zostavOdpoved(false, 'neexistujuca_licencia'));
      return;
    }

    // Čo inštalácia hlási o sebe
    const zmeny: Record<string, unknown> = {
      posledna_kontrola: new Date(),
      pocet_kontrol: licencia.pocet_kontrol + 1,
      posledna_ip: req.ip ?? null,
    };
    const instalacia = ocistiInstalaciu(req.body.instalacia);
    if (instalacia) zmeny.instalacia = { ...instalacia, domena: typeof domena === 'string' ? domena.slice(0, 200) : null };
    const predoslaVerzia = licencia.nainstalovana_verzia;
    if (verzia) zmeny.nainstalovana_verzia = verzia;
    if (licencia.pocet_kontrol === 0) {
      await zaznamenaj({ typ: 'instalacia_prvy_kontakt', popis: `Prvé overenie licencie - ${licencia.nazov_klienta}`, licencia_id: licencia.id, produkt_id: licencia.produkt_id, ip: req.ip ?? null, detaily: { verzia, domena } });
    }
    await licencia.update(zmeny);

    // Inštalácia hlási novú verziu - rozpracovaný príkaz na túto verziu je hotový
    if (verzia && predoslaVerzia && porovnajVerzie(verzia, predoslaVerzia) !== 0) {
      await zaznamenaj({ typ: 'instalacia_verzia', popis: `${licencia.nazov_klienta}: verzia ${predoslaVerzia} → ${verzia}`, licencia_id: licencia.id, produkt_id: licencia.produkt_id, ip: req.ip ?? null });
    }
    if (verzia) {
      const rozpracovane = await Prikaz.findAll({
        where: { licencia_id: licencia.id, stav: { [Op.in]: NEUKONCENE_STAVY } },
        include: [{ model: Verzia, as: 'verzia' }],
      });
      for (const p of rozpracovane) {
        if (p.verzia && porovnajVerzie(p.verzia.verzia, verzia) === 0) {
          await p.update({ stav: 'hotovo', dokonceny: new Date(), sprava: p.sprava ?? 'Inštalácia hlási novú verziu' });
        }
      }
    }

    if (licencia.stav !== 'aktivna') {
      res.json(zostavOdpoved(false, `licencia_${licencia.stav}`, { plan: licencia.plan }));
      return;
    }
    if (!licencia.jePlatna()) {
      res.json(zostavOdpoved(false, 'vyprsana_licencia', { plan: licencia.plan, platnaDo: licencia.platna_do }));
      return;
    }
    if (!licencia.sediDomena(domena)) {
      res.json(zostavOdpoved(false, 'nespravna_domena', { ocakavanaDomena: licencia.domena }));
      return;
    }

    // Dostupná aktualizácia; pri automatických aktualizáciách z nej rovno príkaz
    const aktualizacia = await dostupnaAktualizacia(licencia, verzia);
    if (aktualizacia && licencia.automaticke_aktualizacie) {
      const uzBol = await Prikaz.findOne({ where: { licencia_id: licencia.id, verzia_id: aktualizacia.id, stav: { [Op.ne]: 'zruseny' } } });
      const verziaModel = await Verzia.findByPk(aktualizacia.id);
      if (!uzBol && verziaModel) {
        try {
          await vytvorPrikazAktualizacie(licencia, verziaModel, { automaticky: true, ip: req.ip ?? null });
        } catch (chyba) {
          if (!(chyba instanceof ChybaPrikazu)) throw chyba;
        }
      }
    }

    // Príkaz čakajúci na inštaláciu (najstarší nedokončený)
    const prikaz = await Prikaz.findOne({
      where: { licencia_id: licencia.id, stav: { [Op.in]: ['caka', 'prevzaty'] } },
      include: [{ model: Verzia, as: 'verzia' }],
      order: [['vytvoreny', 'ASC']],
    });
    const prikazPreKlienta =
      prikaz?.verzia && prikaz.verzia.balik_stav === 'pripraveny' ? { id: prikaz.id, typ: prikaz.typ, verzia: verziaPreKlienta(prikaz.verzia) } : null;

    res.json(
      zostavOdpoved(true, null, {
        plan: licencia.plan,
        funkcie: licencia.funkcie,
        platnaDo: licencia.platna_do,
        dniDoVyprsania: licencia.dniDoVyprsania(),
        nazovKlienta: licencia.nazov_klienta,
        aktualizacia,
        prikaz: prikazPreKlienta,
      })
    );
  } catch (error) {
    console.error('Chyba pri overovaní licencie:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri overovaní licencie' });
  }
});

/**
 * GET /api/license/status/:kluc
 * Stručný stav licencie - na rýchlu kontrolu v admin rozhraní klienta.
 */
router.get('/license/status/:kluc', limitOverovania, async (req: Request, res: Response) => {
  try {
    const licencia = await najdiLicenciu(String(req.params.kluc));
    if (!licencia) {
      res.status(404).json({ success: false, message: 'Licencia nenájdená' });
      return;
    }
    res.json({
      success: true,
      data: {
        plan: licencia.plan,
        stav: licencia.stav,
        platnaDo: licencia.platna_do,
        funkcie: licencia.funkcie,
        dniDoVyprsania: licencia.dniDoVyprsania(),
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní stavu licencie:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

// ===================== PRÍKAZY A BALÍKY =====================

const STAVY_Z_INSTALACIE = ['prevzaty', 'prebieha', 'hotovo', 'chyba'] as const;

/**
 * POST /api/license/prikaz/:id
 * Telo: { licenseKey, stav: prevzaty | prebieha | hotovo | chyba, sprava? }
 *
 * Inštalácia hlási priebeh príkazu. Príkaz musí patriť licencii
 * s týmto kľúčom a nesmie byť už ukončený.
 */
router.post('/license/prikaz/:id', limitOverovania, async (req: Request, res: Response) => {
  try {
    const licencia = await najdiLicenciu(req.body?.licenseKey);
    const prikaz = await Prikaz.findByPk(Number(req.params.id), { include: [{ model: Verzia, as: 'verzia' }] });
    if (!licencia || !prikaz || prikaz.licencia_id !== licencia.id) {
      res.status(404).json({ success: false, message: 'Príkaz nenájdený' });
      return;
    }
    const stav = req.body.stav;
    if (!STAVY_Z_INSTALACIE.includes(stav)) {
      res.status(400).json({ success: false, message: 'Neplatný stav príkazu' });
      return;
    }
    if (!NEUKONCENE_STAVY.includes(prikaz.stav)) {
      res.status(409).json({ success: false, message: 'Príkaz je už ukončený' });
      return;
    }
    const sprava = typeof req.body.sprava === 'string' ? req.body.sprava.slice(-20000) : prikaz.sprava;
    const zmeny: Record<string, unknown> = { stav, sprava };
    if (stav === 'prevzaty' && !prikaz.prevzaty) zmeny.prevzaty = new Date();
    if (stav === 'hotovo' || stav === 'chyba') zmeny.dokonceny = new Date();
    await prikaz.update(zmeny);

    if (stav === 'hotovo' || stav === 'chyba') {
      await zaznamenaj({
        typ: stav === 'hotovo' ? 'aktualizacia_hotova' : 'aktualizacia_chyba',
        popis:
          stav === 'hotovo'
            ? `${licencia.nazov_klienta}: aktualizácia na ${prikaz.verzia?.verzia ?? '?'} dokončená`
            : `${licencia.nazov_klienta}: aktualizácia na ${prikaz.verzia?.verzia ?? '?'} zlyhala`,
        licencia_id: licencia.id,
        produkt_id: licencia.produkt_id,
        ip: req.ip ?? null,
        detaily: { prikaz_id: prikaz.id },
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Chyba pri hlásení príkazu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/**
 * GET /api/license/balik/:verziaId  (hlavička X-License-Key)
 *
 * Balík verzie pre inštaláciu s platnou licenciou. Kontrolný súčet
 * dostala inštalácia v podpísanej odpovedi pri overení licencie.
 */
router.get('/license/balik/:verziaId', limitStahovania, async (req: Request, res: Response) => {
  try {
    const licencia = await najdiLicenciu(req.header('X-License-Key'));
    if (!licencia || vypocitanyStav(licencia) !== 'aktivna') {
      res.status(403).json({ success: false, message: 'Balík je dostupný len s platnou licenciou' });
      return;
    }
    const verzia = await Verzia.findByPk(Number(req.params.verziaId));
    const produkt = verzia ? await Produkt.findByPk(verzia.produkt_id) : null;
    if (!verzia || !produkt || verzia.produkt_id !== licencia.produkt_id || verzia.balik_stav !== 'pripraveny') {
      res.status(404).json({ success: false, message: 'Balík nenájdený' });
      return;
    }
    const cesta = cestaBaliku(produkt.kod, verzia.tag);
    const info = await fs.promises.stat(cesta).catch(() => null);
    if (!info) {
      res.status(404).json({ success: false, message: 'Balík na serveri chýba - pripravte ho v administrácii znova' });
      return;
    }
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Length', String(info.size));
    res.setHeader('Content-Disposition', `attachment; filename="${produkt.kod}-${verzia.verzia}.tar.gz"`);
    if (verzia.balik_sha256) res.setHeader('X-SHA256', verzia.balik_sha256);
    fs.createReadStream(cesta).pipe(res);
  } catch (error) {
    console.error('Chyba pri sťahovaní balíka:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

export default router;
