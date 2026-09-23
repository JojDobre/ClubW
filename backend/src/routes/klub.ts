// Umiestnenie: backend/src/routes/klub.ts
// Routes sekcie KLUB: sponzori, dokumenty, ankety, fanúšikovia.
//
// Všetky štyri entity majú rovnaký tvar operácií (výpis, vytvorenie,
// úprava, zmazanie), preto ich obsluhuje spoločná továreň. Bez nej by
// tu boli štyri takmer identické kópie toho istého kódu.

import { Router, Request, Response } from 'express';
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
    citanie = 'verejne', verejnyFilter,
  } = nastavenia;

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
        res.status(404).json({ success: false, message: `${nazov} sa nenašiel` });
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
      res.status(201).json({ success: true, data: zaznam, message: `${nazov} bol vytvorený` });
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
        res.status(404).json({ success: false, message: `${nazov} sa nenašiel` });
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
        res.status(404).json({ success: false, message: `${nazov} sa nenašiel` });
        return;
      }

      await zaznam.destroy();
      res.json({ success: true, message: `${nazov} bol zmazaný` });
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
  ],
  textovePolia: ['meno', 'priezvisko', 'poznamka'],
  zoradenie: [['priezvisko', 'ASC'], ['meno', 'ASC']],
  hladatV: ['meno', 'priezvisko', 'email'],
  // Osobné údaje fanúšikov (e-mail, telefón) - len pre administráciu
  citanie: 'redaktor',
});

/**
 * POST /api/polls/:id/vote
 * Hlasovanie v ankete — používa ho verejný web.
 */
router.post('/polls/:id/vote', async (req: Request, res: Response) => {
  try {
    const anketa = await Anketa.findByPk(Number(req.params.id));
    if (!anketa) {
      res.status(404).json({ success: false, message: 'Anketa sa nenašla' });
      return;
    }

    if (!anketa.otvorena) {
      res.status(409).json({ success: false, message: 'Anketa je uzavretá' });
      return;
    }

    const idMoznosti = String(req.body?.moznost || '');
    const moznosti = [...(anketa.moznosti ?? [])];
    const index = moznosti.findIndex((m) => m.id === idMoznosti);

    if (index === -1) {
      res.status(400).json({ success: false, message: 'Neplatná možnosť' });
      return;
    }

    moznosti[index] = { ...moznosti[index], hlasy: (moznosti[index].hlasy || 0) + 1 };

    await anketa.update({
      moznosti,
      celkom_hlasov: moznosti.reduce((s, m) => s + (m.hlasy || 0), 0),
    });

    res.json({ success: true, data: anketa, message: 'Hlas bol zaznamenaný' });
  } catch (chyba) {
    console.error('Chyba pri hlasovaní:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

export default router;
