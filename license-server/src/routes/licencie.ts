// Umiestnenie: license-server/src/routes/licencie.ts
// Endpointy licenčného servera.
//
// Verejné (volá ich klientsky web):
//   POST /api/license/verify      - overenie licencie, odpoveď je podpísaná
//   GET  /api/license/status/:kluc - stručný stav bez podpisu
//
// Administratívne (chránené hlavičkou X-Admin-Key):
//   GET    /api/admin/licenses      - zoznam licencií
//   POST   /api/admin/licenses      - vytvorenie licencie
//   PUT    /api/admin/licenses/:id  - úprava (predĺženie, pozastavenie)
//   DELETE /api/admin/licenses/:id  - zrušenie licencie

import { Router, Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import rateLimit from 'express-rate-limit';
import Licencia from '../models/Licencia';
import { podpis, vygenerujLicencnyKluc } from '../utils/podpis';

const router = Router();

// Ako dlho je podpísaná odpoveď platná. Klient si ju smie zapamätať
// najviac na tento čas, potom sa musí spýtať znova.
const PLATNOST_ODPOVEDE_HODIN = 24;

/**
 * Obmedzenie počtu overovacích požiadaviek z jednej IP adresy.
 * Bráni skúšaniu licenčných kľúčov hrubou silou.
 */
const limitOverovania = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minút
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Príliš veľa požiadaviek na overenie. Skúste o chvíľu znova.',
  },
});

/**
 * Prísnejší limit pre administratívne rozhranie.
 */
const limitAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Overenie administrátorského kľúča.
 * Kľúč sa nastavuje premennou ADMIN_API_KEY a posiela v hlavičke X-Admin-Key.
 */
const vyzadujAdmina = (req: Request, res: Response, next: NextFunction): void => {
  const ocakavany = process.env.ADMIN_API_KEY;

  if (!ocakavany) {
    res.status(500).json({
      success: false,
      message: 'Administratívne rozhranie nie je nastavené (chýba ADMIN_API_KEY)',
    });
    return;
  }

  const poslany = req.header('X-Admin-Key');

  // Porovnanie s rovnakým časom pre všetky vstupy - bežné porovnanie
  // reťazcov skončí pri prvom rozdiele a prezradilo by, koľko znakov sedí
  const sedi =
    typeof poslany === 'string' &&
    poslany.length === ocakavany.length &&
    require('crypto').timingSafeEqual(Buffer.from(poslany), Buffer.from(ocakavany));

  if (!sedi) {
    res.status(401).json({ success: false, message: 'Neplatný administrátorský kľúč' });
    return;
  }

  next();
};

// ===================== VEREJNÉ ENDPOINTY =====================

/**
 * POST /api/license/verify
 *
 * Telo požiadavky: { licenseKey: "CLUBW-...", domena?: "klub.sk" }
 *
 * Odpoveď obsahuje údaje o licencii a ich podpis. Klient podpis overí
 * verejným kľúčom, takže odpoveď sa nedá podvrhnúť.
 */
router.post('/license/verify', limitOverovania, async (req: Request, res: Response) => {
  try {
    const { licenseKey, domena } = req.body;

    if (!licenseKey || typeof licenseKey !== 'string') {
      res.status(400).json({ success: false, message: 'Chýba licenseKey' });
      return;
    }

    const licencia = await Licencia.findOne({
      where: { kluc: licenseKey.trim().toUpperCase() },
    });

    // Zostavenie odpovede. Aj zamietavá odpoveď je podpísaná, aby útočník
    // nemohol zablokovaním komunikácie predstierať dostupnosť servera.
    const zostavOdpoved = (
      platna: boolean,
      dovod: string | null,
      detaily: Record<string, unknown> = {}
    ) => {
      const udaje = {
        platna,
        dovod,
        kluc: licenseKey,
        overene: new Date().toISOString(),
        // Do kedy smie klient túto odpoveď považovať za aktuálnu
        platneDo: new Date(
          Date.now() + PLATNOST_ODPOVEDE_HODIN * 60 * 60 * 1000
        ).toISOString(),
        ...detaily,
      };

      const sukromnyKluc = process.env.LICENSE_PRIVATE_KEY;
      if (!sukromnyKluc) {
        throw new Error('Chýba LICENSE_PRIVATE_KEY - server nemôže podpisovať odpovede');
      }

      // DÔLEŽITÉ: podpisujeme až podobu, ktorú klient reálne dostane.
      // Hodnoty typu Date sa pri odoslaní cez res.json() zmenia na reťazec,
      // takže podpis nad pôvodným objektom by klientovi nikdy nesedel.
      const udajeNaOdoslanie = JSON.parse(JSON.stringify(udaje));

      return {
        success: true,
        data: udajeNaOdoslanie,
        podpis: podpis(udajeNaOdoslanie, sukromnyKluc.replace(/\\n/g, '\n')),
      };
    };

    // Kľúč neexistuje
    if (!licencia) {
      res.status(404).json(zostavOdpoved(false, 'neexistujuca_licencia'));
      return;
    }

    // Zaznamenáme, že sa klient ozval (užitočné pri riešení problémov)
    await licencia.update({
      posledna_kontrola: new Date(),
      pocet_kontrol: licencia.pocet_kontrol + 1,
    });

    // Licencia je zrušená alebo pozastavená
    if (licencia.stav !== 'aktivna') {
      res.json(zostavOdpoved(false, `licencia_${licencia.stav}`, { plan: licencia.plan }));
      return;
    }

    // Licencia vypršala
    if (!licencia.jePlatna()) {
      res.json(
        zostavOdpoved(false, 'vyprsana_licencia', {
          plan: licencia.plan,
          platnaDo: licencia.platna_do,
        })
      );
      return;
    }

    // Licencia je viazaná na inú doménu
    if (!licencia.sediDomena(domena)) {
      res.json(
        zostavOdpoved(false, 'nespravna_domena', {
          ocakavanaDomena: licencia.domena,
        })
      );
      return;
    }

    // Všetko v poriadku
    res.json(
      zostavOdpoved(true, null, {
        plan: licencia.plan,
        funkcie: licencia.funkcie,
        platnaDo: licencia.platna_do,
        dniDoVyprsania: licencia.dniDoVyprsania(),
        nazovKlienta: licencia.nazov_klienta,
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
    const licencia = await Licencia.findOne({
      where: { kluc: String(req.params.kluc).trim().toUpperCase() },
      // Zámerne neposielame e-mail ani poznámky - to sú interné údaje
      attributes: ['plan', 'stav', 'platna_do', 'funkcie'],
    });

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

// ===================== ADMINISTRATÍVNE ENDPOINTY =====================

/**
 * GET /api/admin/licenses
 * Zoznam licencií s možnosťou filtrovania.
 */
router.get('/admin/licenses', limitAdmin, vyzadujAdmina, async (req: Request, res: Response) => {
  try {
    const kde: any = {};

    if (req.query.stav) kde.stav = req.query.stav;
    if (req.query.plan) kde.plan = req.query.plan;

    // Licencie, ktoré čoskoro vypršia - podklad pre upozornenia klientom
    if (req.query.vyprsiaDo) {
      const dni = Math.min(Number(req.query.vyprsiaDo) || 30, 365);
      kde.platna_do = {
        [Op.between]: [new Date(), new Date(Date.now() + dni * 24 * 60 * 60 * 1000)],
      };
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const licencie = await Licencia.findAll({
      where: kde,
      order: [['platna_do', 'ASC']],
      limit,
    });

    res.json({ success: true, data: licencie, pocet: licencie.length });
  } catch (error) {
    console.error('Chyba pri načítaní licencií:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/**
 * POST /api/admin/licenses
 * Vytvorenie novej licencie. Kľúč sa generuje automaticky.
 */
router.post('/admin/licenses', limitAdmin, vyzadujAdmina, async (req: Request, res: Response) => {
  try {
    const { nazov_klienta, email_klienta, domena, plan, funkcie, poznamka, platna_do } = req.body;

    if (!nazov_klienta || !email_klienta) {
      res.status(400).json({
        success: false,
        message: 'Názov klienta a e-mail sú povinné',
      });
      return;
    }

    const zvolenyPlan = plan === 'enterprise' ? 'enterprise' : 'pro';

    // Predvolená dĺžka podľa plánu: Pro 1 rok, Enterprise 2 roky
    const rokov = zvolenyPlan === 'enterprise' ? 2 : 1;
    const predvolenaPlatnost = new Date();
    predvolenaPlatnost.setFullYear(predvolenaPlatnost.getFullYear() + rokov);

    const licencia = await Licencia.create({
      kluc: vygenerujLicencnyKluc(),
      nazov_klienta: String(nazov_klienta).trim(),
      email_klienta: String(email_klienta).trim().toLowerCase(),
      domena: domena ? String(domena).trim().toLowerCase() : null,
      plan: zvolenyPlan,
      funkcie: Array.isArray(funkcie) ? funkcie : [],
      platna_do: platna_do ? new Date(platna_do) : predvolenaPlatnost,
      poznamka: poznamka ? String(poznamka) : null,
    });

    res.status(201).json({
      success: true,
      data: licencia,
      message: 'Licencia vytvorená',
    });
  } catch (error) {
    console.error('Chyba pri vytváraní licencie:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní licencie' });
  }
});

/**
 * PUT /api/admin/licenses/:id
 * Úprava licencie - predĺženie platnosti, pozastavenie, zmena plánu.
 */
router.put('/admin/licenses/:id', limitAdmin, vyzadujAdmina, async (req: Request, res: Response) => {
  try {
    const licencia = await Licencia.findByPk(Number(req.params.id));

    if (!licencia) {
      res.status(404).json({ success: false, message: 'Licencia nenájdená' });
      return;
    }

    // Meníme len polia, ktoré klient poslal
    const zmeny: any = {};
    const povolene = ['nazov_klienta', 'email_klienta', 'domena', 'plan', 'funkcie', 'stav', 'poznamka', 'platna_do'];

    for (const pole of povolene) {
      if (req.body[pole] !== undefined) {
        zmeny[pole] = req.body[pole];
      }
    }

    // Kľúč sa nikdy nemení - klient ho má zadaný vo svojom webe
    delete zmeny.kluc;

    await licencia.update(zmeny);

    res.json({ success: true, data: licencia, message: 'Licencia aktualizovaná' });
  } catch (error) {
    console.error('Chyba pri úprave licencie:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/**
 * DELETE /api/admin/licenses/:id
 * Zrušenie licencie. Záznam ostáva v databáze kvôli histórii,
 * len sa nastaví stav na 'zrusena'.
 */
router.delete('/admin/licenses/:id', limitAdmin, vyzadujAdmina, async (req: Request, res: Response) => {
  try {
    const licencia = await Licencia.findByPk(Number(req.params.id));

    if (!licencia) {
      res.status(404).json({ success: false, message: 'Licencia nenájdená' });
      return;
    }

    await licencia.update({ stav: 'zrusena' });

    res.json({ success: true, message: 'Licencia zrušená' });
  } catch (error) {
    console.error('Chyba pri rušení licencie:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

export default router;
