// Umiestnenie: backend/src/routes/sablony.ts
// Šablóny verejného webu - výber aktívnej, nahranie nových, nastavenia.
//
//   GET    /api/sablony/aktivna               verejné - čo má web načítať
//   GET    /api/admin/sablony                 zoznam pre administráciu
//   POST   /api/admin/sablony                 nahranie balíka ZIP (len správca)
//   PUT    /api/admin/sablony/aktivna         aktivácia
//   PUT    /api/admin/sablony/:slug/nastavenia  hodnoty nastavení šablóny
//   DELETE /api/admin/sablony/:slug           zmazanie (len správca)
//
// Súbory šablón servuje index.ts na adrese /sablony/:slug/*.

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import NastaveniaKlubu from '../models/NastaveniaKlubu';
import { authenticateToken, optionalAuth, requirePermission, smieVModule } from '../middleware/auth';
import {
  ChybaSablony,
  MAX_VELKOST_ZIP,
  ZAKLADNA_SABLONA,
  Sablona,
  hodnotyNastaveni,
  najdiSablonu,
  nainstalujZBalika,
  overHodnoty,
  zmazSablonu,
  zoznamSablon,
} from '../services/sablony';

export const verejneSablonyRouter = Router();
export const adminSablonyRouter = Router();

/** Adresa súboru šablóny s verziou - po aktualizácii prehliadač stiahne nový. */
const adresa = (s: Sablona, subor: string | null) =>
  subor ? `/sablony/${s.slug}/${subor.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(s.verzia)}` : null;

/**
 * Šablónu nahrávať a mazať smie len správca. Skript šablóny beží na webe
 * s plnými právami - kto ho nahrá, vie ovládnuť aj prihláseného správcu.
 */
const lenSpravca = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as any).user?.rola === 'admin') {
    next();
    return;
  }
  res.status(403).json({ success: false, message: 'Nahrávať a mazať šablóny smie len správca' });
};

const nahranie = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VELKOST_ZIP, files: 1 },
  fileFilter: (_req, subor, cb) => {
    // Typ od prehliadača je len orientačný, skutočný obsah overí rozbalenie
    cb(null, /\.zip$/i.test(subor.originalname));
  },
}).single('subor');

const prijmiBalik = (req: Request, res: Response, next: NextFunction) => {
  nahranie(req, res, (chyba: unknown) => {
    if (chyba) {
      const sprava =
        (chyba as any)?.code === 'LIMIT_FILE_SIZE'
          ? `Balík je väčší ako ${Math.round(MAX_VELKOST_ZIP / 1024 / 1024)} MB`
          : 'Balík sa nepodarilo prijať';
      res.status(400).json({ success: false, message: sprava });
      return;
    }
    next();
  });
};

const odpovedzChybou = (res: Response, chyba: unknown, kontext: string) => {
  if (chyba instanceof ChybaSablony) {
    res.status(400).json({ success: false, message: chyba.message });
    return;
  }
  console.error(`Chyba pri ${kontext}:`, chyba);
  res.status(500).json({ success: false, message: 'Chyba servera' });
};

/** Aktívna šablóna; ak zmizla alebo je poškodená, web ostane na základnej. */
const aktivnaSablona = async (nastavenia: NastaveniaKlubu): Promise<Sablona | null> =>
  (await najdiSablonu(nastavenia.aktivna_sablona)) ?? (await najdiSablonu(ZAKLADNA_SABLONA));

/**
 * GET /api/sablony/aktivna
 * Čo má verejný web načítať. S ?nahlad=slug ukáže inú šablónu - len
 * prihlásenému, kto smie šablóny vidieť (náhľad pred aktiváciou).
 */
verejneSablonyRouter.get('/sablony/aktivna', optionalAuth, async (req: Request, res: Response) => {
  try {
    const nastavenia = await NastaveniaKlubu.nacitaj();
    let sablona: Sablona | null = null;
    let nahlad = false;

    const ziadany = typeof req.query.nahlad === 'string' ? req.query.nahlad : '';
    if (ziadany && (await smieVModule(req, 'sablony', 'citat'))) {
      sablona = await najdiSablonu(ziadany);
      nahlad = Boolean(sablona);
    }
    if (!sablona) sablona = await aktivnaSablona(nastavenia);

    // Ani základná šablóna nie je na disku - web pobeží so vstavaným vzhľadom
    if (!sablona) {
      res.set('Cache-Control', 'no-cache');
      res.json({
        success: true,
        data: { slug: ZAKLADNA_SABLONA, nazov: 'Základná', verzia: '0', styl: null, skript: null, nastavenia: {}, nahlad: false },
      });
      return;
    }

    res.set('Cache-Control', nahlad ? 'no-store' : 'no-cache');
    res.json({
      success: true,
      data: {
        slug: sablona.slug,
        nazov: sablona.nazov,
        verzia: sablona.verzia,
        styl: adresa(sablona, sablona.styl),
        skript: adresa(sablona, sablona.skript),
        nastavenia: hodnotyNastaveni(sablona, nastavenia.nastavenia_sablon?.[sablona.slug]),
        nahlad,
      },
    });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'načítaní aktívnej šablóny');
  }
});

/** GET /api/admin/sablony - všetky šablóny aj s poškodenými. */
adminSablonyRouter.get('/', authenticateToken, requirePermission('sablony', 'citat'), async (_req: Request, res: Response) => {
  try {
    const nastavenia = await NastaveniaKlubu.nacitaj();
    const aktivna = (await aktivnaSablona(nastavenia))?.slug ?? ZAKLADNA_SABLONA;
    const zoznam = await zoznamSablon();

    res.json({
      success: true,
      data: zoznam.map(({ slug, vstavana, sablona, chyba }) => ({
        slug,
        vstavana,
        aktivna: slug === aktivna,
        chyba,
        nazov: sablona?.nazov ?? slug,
        verzia: sablona?.verzia ?? null,
        autor: sablona?.autor ?? null,
        web_autora: sablona?.web_autora ?? null,
        popis: sablona?.popis ?? null,
        nahlad: sablona ? adresa(sablona, sablona.nahlad) : null,
        ma_skript: Boolean(sablona?.skript),
        nastavenia: sablona?.nastavenia ?? [],
        hodnoty: sablona ? hodnotyNastaveni(sablona, nastavenia.nastavenia_sablon?.[slug]) : {},
      })),
    });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'načítaní šablón');
  }
});

/** POST /api/admin/sablony - nahranie novej šablóny alebo jej aktualizácia. */
adminSablonyRouter.post(
  '/',
  authenticateToken,
  requirePermission('sablony', 'pisat'),
  lenSpravca,
  prijmiBalik,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Vyberte balík šablóny (súbor .zip)' });
        return;
      }
      const { sablona, predchadzajucaVerzia } = await nainstalujZBalika(req.file.buffer);
      res.status(predchadzajucaVerzia !== null ? 200 : 201).json({
        success: true,
        data: { slug: sablona.slug, nazov: sablona.nazov, verzia: sablona.verzia, predchadzajuca_verzia: predchadzajucaVerzia },
        message:
          predchadzajucaVerzia !== null
            ? `Šablóna ${sablona.nazov} bola aktualizovaná z verzie ${predchadzajucaVerzia} na ${sablona.verzia}`
            : `Šablóna ${sablona.nazov} bola nainštalovaná`,
      });
    } catch (chyba) {
      odpovedzChybou(res, chyba, 'inštalácii šablóny');
    }
  }
);

/** PUT /api/admin/sablony/aktivna - { slug } */
adminSablonyRouter.put('/aktivna', authenticateToken, requirePermission('sablony', 'pisat'), async (req: Request, res: Response) => {
  try {
    const slug = typeof req.body?.slug === 'string' ? req.body.slug : '';
    const sablona = await najdiSablonu(slug);
    if (!sablona) {
      res.status(400).json({ success: false, message: 'Šablóna neexistuje alebo je poškodená' });
      return;
    }
    const nastavenia = await NastaveniaKlubu.nacitaj();
    await nastavenia.update({ aktivna_sablona: sablona.slug });
    res.json({ success: true, data: { slug: sablona.slug }, message: `Aktívna šablóna: ${sablona.nazov}` });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'aktivácii šablóny');
  }
});

/** PUT /api/admin/sablony/:slug/nastavenia - { hodnoty: {...} } */
adminSablonyRouter.put(
  '/:slug/nastavenia',
  authenticateToken,
  requirePermission('sablony', 'pisat'),
  async (req: Request, res: Response) => {
    try {
      const sablona = await najdiSablonu(req.params.slug);
      if (!sablona) {
        res.status(404).json({ success: false, message: 'Šablóna sa nenašla' });
        return;
      }
      const vstup = req.body?.hodnoty;
      if (!vstup || typeof vstup !== 'object' || Array.isArray(vstup)) {
        res.status(400).json({ success: false, message: 'Chýbajú hodnoty nastavení' });
        return;
      }
      const { hodnoty, chyba } = overHodnoty(sablona, vstup);
      if (chyba) {
        res.status(400).json({ success: false, message: chyba });
        return;
      }
      const nastavenia = await NastaveniaKlubu.nacitaj();
      const vsetky = { ...(nastavenia.nastavenia_sablon || {}) };
      vsetky[sablona.slug] = { ...(vsetky[sablona.slug] || {}), ...hodnoty };
      // JSONB stĺpec - nový objekt, aby Sequelize zmenu určite zapísal
      await nastavenia.update({ nastavenia_sablon: vsetky });
      res.json({
        success: true,
        data: hodnotyNastaveni(sablona, vsetky[sablona.slug]),
        message: `Nastavenia šablóny ${sablona.nazov} boli uložené`,
      });
    } catch (chyba) {
      odpovedzChybou(res, chyba, 'ukladaní nastavení šablóny');
    }
  }
);

/** DELETE /api/admin/sablony/:slug */
adminSablonyRouter.delete(
  '/:slug',
  authenticateToken,
  requirePermission('sablony', 'mazat'),
  lenSpravca,
  async (req: Request, res: Response) => {
    try {
      const nastavenia = await NastaveniaKlubu.nacitaj();
      if ((await aktivnaSablona(nastavenia))?.slug === req.params.slug) {
        res.status(409).json({ success: false, message: 'Aktívnu šablónu nemožno zmazať. Najprv aktivujte inú.' });
        return;
      }
      await zmazSablonu(req.params.slug);
      // Uložené nastavenia zmazanej šablóny už nie sú potrebné
      if (nastavenia.nastavenia_sablon?.[req.params.slug]) {
        const vsetky = { ...nastavenia.nastavenia_sablon };
        delete vsetky[req.params.slug];
        await nastavenia.update({ nastavenia_sablon: vsetky });
      }
      res.json({ success: true, message: 'Šablóna bola zmazaná' });
    } catch (chyba) {
      odpovedzChybou(res, chyba, 'mazaní šablóny');
    }
  }
);
