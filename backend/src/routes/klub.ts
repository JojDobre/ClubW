// Umiestnenie: backend/src/routes/klub.ts
// Routes sekcie KLUB: sponzori, dokumenty, ankety, fanúšikovia.
//
// Všetky štyri entity majú rovnaký tvar operácií (výpis, vytvorenie,
// úprava, zmazanie), preto ich obsluhuje spoločná továreň. Bez nej by
// tu boli štyri takmer identické kópie toho istého kódu.

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import sequelize from '../config/database';
import { Model, ModelStatic, Op } from 'sequelize';
import Sponzor from '../models/Sponzor';
import Dokument from '../models/Dokument';
import DokumentKategoria from '../models/DokumentKategoria';
import UrovenSponzora from '../models/UrovenSponzora';
import Anketa from '../models/Anketa';
import Fanusik from '../models/Fanusik';
import { authenticateToken, optionalAuth, requireEditor, requireAdmin, smieVModule, modulZCesty } from '../middleware/auth';
import { sanitizePlainText } from '../utils/sanitize';
import { odpovedzNaChybuModelu } from '../utils/odpoved';
import { posliEmail } from '../utils/email';
import { overSiluHesla } from '../utils/heslo';
import NastaveniaKlubu from '../models/NastaveniaKlubu';

const router = Router();

interface NastaveniaEntity {
  /** Model, s ktorým sa pracuje */
  model: ModelStatic<any>;
  /** Polia, ktoré smie klient nastaviť */
  polia: string[];
  /** Textové polia, z ktorých odstránime HTML */
  textovePolia?: string[];
  /** Predvolené zoradenie výpisu */
  zoradenie?: Array<[string, 'ASC' | 'DESC']>;
  /** Polia, v ktorých sa vyhľadáva */
  hladatV?: string[];
  /** Popis entity do hlášok, napríklad „Sponzor" */
  nazov: string;
  /** Rod názvu do hlášok („Anketa bola vytvorená"), predvolene mužský */
  zensky?: boolean;
  /**
   * Kto smie čítať. 'redaktor' = len prihlásený redaktor/správca
   * (osobné údaje fanúšikov). Predvolene verejne.
   */
  citanie?: 'verejne' | 'redaktor';
  /** Podmienka pre verejné čítanie (napr. len verejné dokumenty) */
  verejnyFilter?: Record<string, unknown> | (() => Record<string | symbol, unknown>);
}

/**
 * Vytvorí sadu operácií pre jednu entitu.
 *
 * @param cesta - základ adresy, napríklad 'sponsors'
 * @param nastavenia - model a jeho pravidlá
 */
const vytvorOperacie = (cesta: string, nastavenia: NastaveniaEntity) => {
  const {
    model, polia, textovePolia = [], zoradenie = [['id', 'DESC']], hladatV = [], nazov,
    citanie = 'verejne', verejnyFilter, zensky = false,
  } = nastavenia;
  const koncovka = zensky ? 'a' : '';
  const nenasiel = `${nazov} sa nenaš${zensky ? 'la' : 'iel'}`;

  /**
   * Overí právo na čítanie a vráti podmienku, ktorá sa pridá k dotazu.
   * PREČO: čítanie bolo úplne verejné - bez prihlásenia sa dali stiahnuť
   * neverejné dokumenty aj zoznam fanúšikov s e-mailmi a telefónmi.
   */
  const pravoCitat = async (req: Request, res: Response): Promise<Record<string | symbol, unknown> | null> => {
    // Kto smie modul čítať v administrácii, vidí aj neverejné záznamy
    if (await smieVModule(req, modulZCesty(req.originalUrl), 'citat')) return {};
    if (citanie === 'redaktor') {
      res.status((req as any).user ? 403 : 401).json({
        success: false,
        message: (req as any).user ? 'Prístup odmietnutý' : 'Prístup odmietnutý. Token chýba.',
      });
      return null;
    }
    return (typeof verejnyFilter === 'function' ? verejnyFilter() : verejnyFilter) ?? {};
  };

  /** Vyberie z tela požiadavky len povolené polia. */
  const pripravUdaje = (telo: any): Record<string, unknown> => {
    const udaje: Record<string, unknown> = {};

    for (const pole of polia) {
      if (telo[pole] === undefined) continue;

      let hodnota = telo[pole];

      // Prázdny reťazec berieme ako zámer pole vyprázdniť
      if (hodnota === '') hodnota = null;

      // Z textových polí odstránime prípadné HTML — hodnoty sa
      // vypisujú na verejnom webe
      if (hodnota !== null && textovePolia.includes(pole)) {
        hodnota = sanitizePlainText(String(hodnota));
      }

      udaje[pole] = hodnota;
    }

    return udaje;
  };

  // ===== Výpis =====
  router.get(`/${cesta}`, optionalAuth, async (req: Request, res: Response) => {
    try {
      const filter = await pravoCitat(req, res);
      if (!filter) return;
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const hladane = String(req.query.search || '').trim();

      const kde: any = { ...filter };

      if (hladane && hladatV.length > 0) {
        kde[Op.or] = hladatV.map((p) => ({ [p]: { [Op.iLike]: `%${hladane}%` } }));
      }

      const zaznamy = await model.findAll({ where: kde, order: zoradenie, limit });

      res.json({ success: true, data: zaznamy });
    } catch (chyba) {
      console.error(`Chyba pri načítaní (${nazov}):`, chyba);
      res.status(500).json({ success: false, message: `Chyba pri načítaní: ${nazov}` });
    }
  });

  // ===== Detail =====
  router.get(`/${cesta}/:id`, optionalAuth, async (req: Request, res: Response) => {
    try {
      const filter = await pravoCitat(req, res);
      if (!filter) return;
      const zaznam = await model.findOne({ where: { id: Number(req.params.id) || 0, ...filter } });
      if (!zaznam) {
        res.status(404).json({ success: false, message: nenasiel });
        return;
      }
      res.json({ success: true, data: zaznam });
    } catch (chyba) {
      console.error(`Chyba pri načítaní detailu (${nazov}):`, chyba);
      res.status(500).json({ success: false, message: 'Chyba servera' });
    }
  });

  // ===== Vytvorenie =====
  router.post(`/${cesta}`, authenticateToken, requireEditor, async (req: Request, res: Response) => {
    try {
      const zaznam = await model.create(pripravUdaje(req.body) as any);
      res.status(201).json({ success: true, data: zaznam, message: `${nazov} bol${koncovka} vytvoren${zensky ? 'á' : 'ý'}` });
    } catch (chyba: any) {
      if (odpovedzNaChybuModelu(chyba, res)) return;
      console.error(`Chyba pri vytváraní (${nazov}):`, chyba);
      res.status(500).json({ success: false, message: 'Chyba servera' });
    }
  });

  // ===== Úprava =====
  router.put(`/${cesta}/:id`, authenticateToken, requireEditor, async (req: Request, res: Response) => {
    try {
      const zaznam = await model.findByPk(Number(req.params.id));
      if (!zaznam) {
        res.status(404).json({ success: false, message: nenasiel });
        return;
      }

      await zaznam.update(pripravUdaje(req.body));
      res.json({ success: true, data: zaznam, message: 'Zmeny boli uložené' });
    } catch (chyba: any) {
      if (odpovedzNaChybuModelu(chyba, res)) return;
      console.error(`Chyba pri úprave (${nazov}):`, chyba);
      res.status(500).json({ success: false, message: 'Chyba servera' });
    }
  });

  // ===== Zmazanie =====
  router.delete(`/${cesta}/:id`, authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const zaznam = await model.findByPk(Number(req.params.id));
      if (!zaznam) {
        res.status(404).json({ success: false, message: nenasiel });
        return;
      }

      await zaznam.destroy();
      res.json({ success: true, message: `${nazov} bol${koncovka} zmazan${zensky ? 'á' : 'ý'}` });
    } catch (chyba) {
      console.error(`Chyba pri mazaní (${nazov}):`, chyba);
      res.status(500).json({ success: false, message: 'Chyba servera' });
    }
  });
};

// ===== Sponzori =====
vytvorOperacie('sponsors', {
  model: Sponzor,
  nazov: 'Sponzor',
  polia: ['nazov', 'uroven_id', 'logo', 'web_url', 'popis', 'platny_od', 'platny_do', 'poradie', 'aktivity'],
  textovePolia: ['nazov', 'popis'],
  zoradenie: [['poradie', 'ASC'], ['nazov', 'ASC']],
  hladatV: ['nazov', 'popis'],
  // Na webe len zobrazení sponzori s platným partnerstvom
  verejnyFilter: () => {
    const dnes = new Date().toISOString().slice(0, 10);
    return {
      aktivity: true,
      [Op.and]: [
        { [Op.or]: [{ platny_od: null }, { platny_od: { [Op.lte]: dnes } }] },
        { [Op.or]: [{ platny_do: null }, { platny_do: { [Op.gte]: dnes } }] },
      ],
    };
  },
});

// ===== Úrovne partnerstva =====
// Spravovateľný zoznam namiesto pevných štyroch úrovní. Po zmazaní
// úrovne zostanú jej sponzori bez úrovne (ON DELETE SET NULL).
vytvorOperacie('sponsor-levels', {
  model: UrovenSponzora,
  nazov: 'Úroveň partnerstva',
  zensky: true,
  polia: ['nazov', 'popis', 'poradie', 'velkost_loga', 'aktivity'],
  textovePolia: ['nazov', 'popis'],
  zoradenie: [['poradie', 'ASC'], ['nazov', 'ASC']],
  hladatV: ['nazov'],
  verejnyFilter: { aktivity: true },
});

// ===== Dokumenty =====
vytvorOperacie('documents', {
  model: Dokument,
  nazov: 'Dokument',
  polia: ['nazov', 'popis', 'subor_url', 'typ_suboru', 'velkost_kb', 'kategoria', 'kategoria_id', 'verejny', 'poradie', 'aktivity'],
  textovePolia: ['nazov', 'popis', 'kategoria'],
  zoradenie: [['poradie', 'ASC'], ['nazov', 'ASC']],
  hladatV: ['nazov', 'popis'],
  // Neverejné a skryté dokumenty vidí len administrácia
  verejnyFilter: { verejny: true, aktivity: true },
});

/**
 * GET /api/documents/:id/download
 * Stiahnutie dokumentu - zvýši počítadlo a presmeruje na súbor.
 * Neverejný dokument stiahne len administrácia.
 */
router.get('/documents/:id/download', optionalAuth, async (req: Request, res: Response) => {
  try {
    const kde: any = { id: Number(req.params.id) || 0 };
    if (!(await smieVModule(req, 'dokumenty', 'citat'))) Object.assign(kde, { verejny: true, aktivity: true });
    const dokument = await Dokument.findOne({ where: kde });
    if (!dokument) {
      res.status(404).json({ success: false, message: 'Dokument sa nenašiel' });
      return;
    }
    await dokument.increment('pocet_stiahnuti');
    const url = String((dokument as any).subor_url || '');
    // Presmerovať len na nahratý súbor alebo úplnú adresu - nie kamkoľvek
    if (!/^(\/uploads\/|https?:\/\/)/.test(url)) {
      res.status(404).json({ success: false, message: 'Súbor dokumentu chýba' });
      return;
    }
    res.redirect(302, url);
  } catch (chyba) {
    console.error('Chyba pri sťahovaní dokumentu:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

// ===== Kategórie dokumentov =====
// Požiadavka hovorí „Kategória dokumentov - popis, názov", teda
// samostatná entita. Doteraz to bol len voľný text na dokumente.
vytvorOperacie('document-categories', {
  model: DokumentKategoria,
  nazov: 'Kategória dokumentov',
  zensky: true,
  polia: ['nazov', 'popis', 'poradie', 'aktivity'],
  textovePolia: ['nazov', 'popis'],
  zoradenie: [['poradie', 'ASC'], ['nazov', 'ASC']],
  hladatV: ['nazov', 'popis'],
  verejnyFilter: { aktivity: true },
});

// ===== Ankety =====
vytvorOperacie('polls', {
  model: Anketa,
  nazov: 'Anketa',
  zensky: true,
  polia: ['otazka', 'moznosti', 'otvorena', 'publikovana', 'platna_od', 'platna_do'],
  textovePolia: ['otazka'],
  zoradenie: [['id', 'DESC']],
  hladatV: ['otazka'],
  // Nepublikované ankety verejne nevidno
  verejnyFilter: { publikovana: true },
});

// ===== Fanúšikovia =====
vytvorOperacie('fans', {
  model: Fanusik,
  nazov: 'Fanúšik',
  polia: [
    'meno', 'priezvisko', 'email', 'telefon', 'typ_clenstva', 'cislo_karty',
    'clenstvo_od', 'clenstvo_do', 'suhlas_oznamy', 'poznamka', 'aktivity',
    'stav', 'datum_narodenia', 'adresa',
  ],
  textovePolia: ['meno', 'priezvisko', 'poznamka', 'adresa'],
  zoradenie: [['priezvisko', 'ASC'], ['meno', 'ASC']],
  hladatV: ['meno', 'priezvisko', 'email'],
  // Osobné údaje fanúšikov (e-mail, telefón) - len pre administráciu
  citanie: 'redaktor',
});

/**
 * POST /api/polls/:id/vote
 * Hlasovanie v ankete — používa ho verejný web.
 */
/**
 * Obmedzenie hlasovania: z jednej adresy najviac 3 hlasy v jednej ankete
 * za deň (rodina na jednej Wi-Fi), inak by skript vedel anketu zmanipulovať.
 */
const hlasovanieLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `${req.ip}:${req.params.id}`,
  message: { success: false, message: 'Z tohto zariadenia ste už v ankete hlasovali.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/polls/:id/vote', hlasovanieLimit, async (req: Request, res: Response) => {
  try {
    const dnes = new Date().toISOString().slice(0, 10);
    // Hlas započítame v transakcii so zámkom riadku - pri súbežných
    // hlasoch by sa inak navzájom prepísali
    const vysledok = await sequelize.transaction(async (t) => {
      const anketa = await Anketa.findByPk(Number(req.params.id), { transaction: t, lock: t.LOCK.UPDATE });
      if (!anketa || !anketa.publikovana) return { stav: 404, sprava: 'Anketa sa nenašla' };
      if (
        !anketa.otvorena ||
        (anketa.platna_od && String(anketa.platna_od) > dnes) ||
        (anketa.platna_do && String(anketa.platna_do) < dnes)
      ) {
        return { stav: 409, sprava: 'Anketa je uzavretá' };
      }

      const idMoznosti = String(req.body?.moznost || '');
      const moznosti = [...(anketa.moznosti ?? [])];
      const index = moznosti.findIndex((m) => m.id === idMoznosti);
      if (index === -1) return { stav: 400, sprava: 'Neplatná možnosť' };

      moznosti[index] = { ...moznosti[index], hlasy: (moznosti[index].hlasy || 0) + 1 };
      await anketa.update(
        { moznosti, celkom_hlasov: moznosti.reduce((s, m) => s + (m.hlasy || 0), 0) },
        { transaction: t }
      );
      return { stav: 200, anketa };
    });

    if (vysledok.stav !== 200) {
      res.status(vysledok.stav).json({ success: false, message: vysledok.sprava });
      return;
    }
    res.json({ success: true, data: vysledok.anketa, message: 'Hlas bol zaznamenaný' });
  } catch (chyba) {
    console.error('Chyba pri hlasovaní:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

// ===== Registrácia fanúšikov a členov z webu =====

/** Z jednej adresy najviac 5 registrácií za hodinu - proti zahlteniu. */
const registraciaLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Príliš veľa registrácií z tohto zariadenia. Skúste to neskôr.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const EMAIL_VZOR = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (hodnota: unknown, max: number) => sanitizePlainText(String(hodnota ?? '')).slice(0, max).trim();

/**
 * POST /api/fans/registracia
 * Verejná registrácia fanúšika alebo člena. Záznam čaká na schválenie
 * v administrácii (Fanúšikovia → Nové žiadosti), klub dostane e-mail.
 */
router.post('/fans/registracia', registraciaLimit, async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    // Skryté pole pre roboty - človek ho nevyplní
    if (b.web) {
      res.status(201).json({ success: true, message: 'Ďakujeme, registrácia bola odoslaná.' });
      return;
    }
    const meno = text(b.meno, 80);
    const priezvisko = text(b.priezvisko, 80);
    const email = text(b.email, 150).toLowerCase();
    const typ = b.typ === 'clen' ? 'clen' : 'fanusik';
    if (!meno || !priezvisko) {
      res.status(400).json({ success: false, message: 'Vyplňte meno a priezvisko' });
      return;
    }
    if (!EMAIL_VZOR.test(email)) {
      res.status(400).json({ success: false, message: 'Zadajte platný e-mail' });
      return;
    }
    if (b.suhlas_gdpr !== true) {
      res.status(400).json({ success: false, message: 'Na registráciu je potrebný súhlas so spracovaním osobných údajov' });
      return;
    }
    const datum = typeof b.datum_narodenia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.datum_narodenia) ? b.datum_narodenia : null;
    if (datum && (new Date(datum).getTime() > Date.now() || new Date(datum).getFullYear() < 1900)) {
      res.status(400).json({ success: false, message: 'Dátum narodenia nie je platný' });
      return;
    }

    // Voliteľné heslo - registrovaný si hneď založí účet na webe (Môj klub)
    const heslo = typeof b.heslo === 'string' && b.heslo ? b.heslo : null;
    if (heslo) {
      const chyby = overSiluHesla(heslo, { meno: `${meno} ${priezvisko}`, email });
      if (chyby.length) {
        res.status(400).json({ success: false, message: chyby[0], errors: chyby });
        return;
      }
    }

    // Už evidovaný e-mail neprezrádzame - odpoveď je rovnaká ako pri novej registrácii
    const existujuci = await Fanusik.findOne({ where: { email } });
    if (!existujuci) {
      const novy = Fanusik.build({
        meno,
        priezvisko,
        email,
        telefon: text(b.telefon, 40) || null,
        typ_clenstva: typ,
        datum_narodenia: datum,
        adresa: text(b.adresa, 255) || null,
        sprava: text(b.sprava, 2000) || null,
        suhlas_oznamy: b.suhlas_oznamy === true,
        stav: 'ziadost',
        zdroj: 'web',
      });
      if (heslo) await novy.nastavHeslo(heslo);
      await novy.save();

      const klub = await NastaveniaKlubu.nacitaj();
      if (klub?.email) {
        posliEmail({
          prijemca: klub.email,
          predmet: `Nová registrácia ${typ === 'clen' ? 'člena' : 'fanúšika'}: ${meno} ${priezvisko}`,
          text:
            `Na webe sa zaregistroval ${typ === 'clen' ? 'nový člen' : 'nový fanúšik'}.\n\n` +
            `Meno: ${meno} ${priezvisko}\nE-mail: ${email}\nTelefón: ${text(b.telefon, 40) || '-'}\n` +
            `${text(b.sprava, 2000) ? `Správa: ${text(b.sprava, 2000)}\n` : ''}` +
            `\nŽiadosť schválite v administrácii: Fanúšikovia → Nové žiadosti.`,
        }).catch((e) => console.error('Upozornenie na registráciu sa nepodarilo odoslať:', e));
      }
    }

    res.status(201).json({
      success: true,
      data: { ucet: Boolean(heslo) },
      message: typ === 'clen'
        ? 'Ďakujeme, žiadosť o členstvo sme prijali. Klub sa vám ozve.'
        : 'Ďakujeme za registráciu. Vitajte medzi fanúšikmi!',
    });
  } catch (chyba) {
    console.error('Chyba pri registrácii fanúšika:', chyba);
    res.status(500).json({ success: false, message: 'Registráciu sa nepodarilo odoslať. Skúste to znova.' });
  }
});

export default router;
