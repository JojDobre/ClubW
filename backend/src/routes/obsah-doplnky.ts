// Umiestnenie: backend/src/routes/obsah-doplnky.ts
// Routes pre komentáre, videá a turnaje.

import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import Komentar from '../models/Komentar';
import Video from '../models/Video';
import LigaTurnaj from '../models/LigaTurnaj';
import Liga from '../models/Liga';
import Article from '../models/Article';
import {
  getPavuk,
  generujPavuka,
  ulozPavuka,
  zapisVysledok,
} from '../controllers/turnajController';
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';
import { sanitizePlainText } from '../utils/sanitize';

const router = Router();

// ============ KOMENTÁRE ============

/**
 * GET /api/comments
 * Výpis komentárov pre administráciu.
 *
 * Query: stav (caka/schvaleny/zamietnuty/spam), clanok_id, limit
 */
router.get('/comments', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const kde: any = {};

    if (req.query.stav) kde.stav = String(req.query.stav);
    if (req.query.clanok_id) kde.clanok_id = Number(req.query.clanok_id);

    const komentare = await Komentar.findAll({
      where: kde,
      include: [{ model: Article, as: 'clanok', attributes: ['id', 'nazov', 'slug'], required: false }],
      order: [['vytvoreny', 'DESC']],
      limit,
    });

    // Počty podľa stavu — administrácia z nich robí filtre s číslami
    const pocty = await Komentar.findAll({
      attributes: ['stav', [Komentar.sequelize!.fn('COUNT', '*'), 'pocet']],
      group: ['stav'],
      raw: true,
    });

    res.json({
      success: true,
      data: komentare,
      pocet: komentare.length,
      // Pri agregácii vracia PostgreSQL počty ako reťazce
      pocty_stavov: Object.fromEntries(
        (pocty as any[]).map((p) => [p.stav, Number(p.pocet)])
      ),
    });
  } catch (chyba) {
    console.error('Chyba pri načítaní komentárov:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/**
 * PUT /api/comments/:id
 * Zmena stavu komentára — schválenie, zamietnutie, označenie za spam.
 */
router.put('/comments/:id', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const komentar = await Komentar.findByPk(Number(req.params.id));
    if (!komentar) {
      res.status(404).json({ success: false, message: 'Komentár sa nenašiel' });
      return;
    }

    const zmeny: any = {};
    if (req.body.stav) zmeny.stav = req.body.stav;
    // Redaktor môže opraviť preklep alebo skrátiť vulgárny výraz
    if (req.body.obsah !== undefined) zmeny.obsah = sanitizePlainText(req.body.obsah);

    await komentar.update(zmeny);
    res.json({ success: true, data: komentar, message: 'Komentár bol upravený' });
  } catch (chyba) {
    console.error('Chyba pri úprave komentára:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** DELETE /api/comments/:id */
router.delete('/comments/:id', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const komentar = await Komentar.findByPk(Number(req.params.id));
    if (!komentar) {
      res.status(404).json({ success: false, message: 'Komentár sa nenašiel' });
      return;
    }
    await komentar.destroy();
    res.json({ success: true, message: 'Komentár bol zmazaný' });
  } catch (chyba) {
    console.error('Chyba pri mazaní komentára:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/**
 * POST /api/comments
 * Nový komentár od návštevníka webu — bez prihlásenia.
 */
router.post('/comments', async (req: Request, res: Response) => {
  try {
    const clanokId = Number(req.body?.clanok_id);
    const clanok = await Article.findByPk(clanokId);
    if (!clanok) {
      res.status(404).json({ success: false, message: 'Článok sa nenašiel' });
      return;
    }

    const komentar = await Komentar.create({
      clanok_id: clanokId,
      autor_meno: sanitizePlainText(String(req.body?.autor_meno || '')),
      autor_email: req.body?.autor_email || null,
      obsah: sanitizePlainText(String(req.body?.obsah || '')),
      rodic_id: req.body?.rodic_id ? Number(req.body.rodic_id) : null,
      ip_adresa: req.ip || null,
      // Zámerne 'caka' — komentár sa zobrazí až po schválení
      stav: 'caka',
    });

    res.status(201).json({
      success: true,
      data: { id: komentar.id },
      message: 'Ďakujeme. Komentár sa zobrazí po schválení.',
    });
  } catch (chyba: any) {
    if (chyba.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: chyba.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri ukladaní komentára:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

// ============ VIDEÁ ============

/** GET /api/videos — verejné */
router.get('/videos', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const kde: any = {};

    if (req.query.kategoria) kde.kategoria = String(req.query.kategoria);
    if (req.query.search) {
      kde.nazov = { [Op.iLike]: `%${String(req.query.search)}%` };
    }

    const videa = await Video.findAll({
      where: kde,
      order: [['poradie', 'ASC'], ['vytvorene', 'DESC']],
      limit,
    });

    // Doplníme adresu náhľadu — pri YouTube ju vieme odvodiť
    const sNahladmi = videa.map((v) => ({
      ...v.toJSON(),
      nahlad_url: v.nahladovyObrazok(),
    }));

    res.json({ success: true, data: sNahladmi, pocet: videa.length });
  } catch (chyba) {
    console.error('Chyba pri načítaní videí:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** POST /api/videos */
router.post('/videos', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const video = await Video.create({
      nazov: sanitizePlainText(String(req.body?.nazov || '')),
      popis: req.body?.popis ? sanitizePlainText(req.body.popis) : null,
      url: String(req.body?.url || ''),
      nahlad: req.body?.nahlad || null,
      dlzka: req.body?.dlzka ?? null,
      kategoria: req.body?.kategoria || null,
      zapas_id: req.body?.zapas_id ?? null,
      publikovane: req.body?.publikovane ?? true,
      poradie: req.body?.poradie ?? 0,
    } as any);

    res.status(201).json({ success: true, data: video, message: 'Video bolo pridané' });
  } catch (chyba: any) {
    if (chyba.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: chyba.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri pridávaní videa:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** PUT /api/videos/:id */
router.put('/videos/:id', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const video = await Video.findByPk(Number(req.params.id));
    if (!video) {
      res.status(404).json({ success: false, message: 'Video sa nenašlo' });
      return;
    }

    const polia = ['nazov', 'popis', 'url', 'nahlad', 'dlzka', 'kategoria', 'zapas_id', 'publikovane', 'poradie'];
    const zmeny: any = {};

    for (const pole of polia) {
      if (req.body[pole] === undefined) continue;
      let hodnota = req.body[pole];
      if (hodnota === '') hodnota = null;
      if (hodnota !== null && ['nazov', 'popis', 'kategoria'].includes(pole)) {
        hodnota = sanitizePlainText(String(hodnota));
      }
      zmeny[pole] = hodnota;
    }

    await video.update(zmeny);
    res.json({ success: true, data: video, message: 'Zmeny boli uložené' });
  } catch (chyba) {
    console.error('Chyba pri úprave videa:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** DELETE /api/videos/:id */
router.delete('/videos/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const video = await Video.findByPk(Number(req.params.id));
    if (!video) {
      res.status(404).json({ success: false, message: 'Video sa nenašlo' });
      return;
    }
    await video.destroy();
    res.json({ success: true, message: 'Video bolo zmazané' });
  } catch (chyba) {
    console.error('Chyba pri mazaní videa:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

// ============ TURNAJE ============

/**
 * GET /api/tournaments
 * Turnaje aj s ligou, do ktorej patria.
 *
 * Model LigaTurnaj existoval už predtým, ale nemal žiadne rozhranie —
 * turnaje sa nedali spravovať.
 */
router.get('/tournaments', async (_req: Request, res: Response) => {
  try {
    const turnaje = await LigaTurnaj.findAll({
      include: [{ model: Liga, as: 'liga', attributes: ['id', 'nazov', 'sezona'], required: false }],
      order: [['id', 'DESC']],
      limit: 200,
    });

    res.json({ success: true, data: turnaje, pocet: turnaje.length });
  } catch (chyba) {
    console.error('Chyba pri načítaní turnajov:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** POST /api/tournaments */
router.post('/tournaments', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const turnaj = await LigaTurnaj.create({
      liga_id: Number(req.body?.liga_id),
      nazov: sanitizePlainText(String(req.body?.nazov || '')),
      typ: req.body?.typ || 'single_elimination',
      pocet_timov: Number(req.body?.pocet_timov) || 8,
      pocet_postupujucich: req.body?.pocet_postupujucich ?? null,
      pocet_skupin: req.body?.pocet_skupin ?? null,
      ma_tretie_miesto: Boolean(req.body?.ma_tretie_miesto),
      status: req.body?.status || 'pripravuje',
      datum_start: req.body?.datum_start || null,
    } as any);

    res.status(201).json({ success: true, data: turnaj, message: 'Turnaj bol vytvorený' });
  } catch (chyba: any) {
    if (chyba.name === 'SequelizeValidationError' || chyba.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: chyba.errors?.map((e: any) => e.message) ?? [chyba.message],
      });
      return;
    }
    console.error('Chyba pri vytváraní turnaja:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** PUT /api/tournaments/:id */
router.put('/tournaments/:id', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const turnaj = await LigaTurnaj.findByPk(Number(req.params.id));
    if (!turnaj) {
      res.status(404).json({ success: false, message: 'Turnaj sa nenašiel' });
      return;
    }

    const polia = [
      'nazov', 'typ', 'pocet_timov', 'pocet_postupujucich', 'pocet_skupin',
      'ma_tretie_miesto', 'status', 'datum_start', 'aktualna_faza',
    ];
    const zmeny: any = {};

    for (const pole of polia) {
      if (req.body[pole] === undefined) continue;
      zmeny[pole] = pole === 'nazov' ? sanitizePlainText(req.body[pole]) : req.body[pole];
    }

    await turnaj.update(zmeny);
    res.json({ success: true, data: turnaj, message: 'Zmeny boli uložené' });
  } catch (chyba) {
    console.error('Chyba pri úprave turnaja:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** DELETE /api/tournaments/:id */
router.delete('/tournaments/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const turnaj = await LigaTurnaj.findByPk(Number(req.params.id));
    if (!turnaj) {
      res.status(404).json({ success: false, message: 'Turnaj sa nenašiel' });
      return;
    }
    await turnaj.destroy();
    res.json({ success: true, message: 'Turnaj bol zmazaný' });
  } catch (chyba) {
    console.error('Chyba pri mazaní turnaja:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

// ===== PAVÚK TURNAJA =====
//
// Pole pavuk_struktura na modeli existovalo, ale bol to len textový
// JSON blob bez obsluhy - nedal sa vygenerovať pavúk, zapísať výsledok
// ani posunúť tím do ďalšieho kola.

/** @route GET /api/tournaments/:id/bracket */
router.get('/tournaments/:id/bracket', getPavuk);

/** @route POST /api/tournaments/:id/bracket/generate - telo: { timy: [...] } */
router.post('/tournaments/:id/bracket/generate', authenticateToken, requireEditor, generujPavuka);

/** @route PUT /api/tournaments/:id/bracket - ručná úprava celého pavúka */
router.put('/tournaments/:id/bracket', authenticateToken, requireEditor, ulozPavuka);

/** @route PATCH /api/tournaments/:id/bracket/match/:kod - výsledok a postup */
router.patch('/tournaments/:id/bracket/match/:kod', authenticateToken, requireEditor, zapisVysledok);

export default router;
