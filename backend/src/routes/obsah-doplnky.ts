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
import { authenticateToken, optionalAuth, requireEditor, requireAdmin } from '../middleware/auth';
import { sanitizePlainText } from '../utils/sanitize';
import { zistiUdajeVidea } from '../services/youtube';
import NastaveniaKlubu from '../models/NastaveniaKlubu';

const router = Router();

// ============ KOMENTÁRE ============

const STAVY_KOMENTARA = ['caka', 'schvaleny', 'zamietnuty', 'spam'] as const;

interface NastaveniaKomentarov {
  /** Komentáre na celom webe zapnuté/vypnuté. */
  povolene: boolean;
  /** Nový komentár čaká na schválenie (inak sa zobrazí hneď). */
  moderovat: boolean;
  vyzadovat_email: boolean;
  /** Dá sa odpovedať na iný komentár. */
  povolit_odpovede: boolean;
}

/**
 * Globálne nastavenia komentárov z Nastavení klubu.
 *
 * Doteraz sa ukladali, ale nič ich nečítalo - vypnutie komentárov na webe
 * alebo vypnutie moderovania nemalo žiadny účinok.
 */
const nastaveniaKomentarov = async (): Promise<NastaveniaKomentarov> => {
  const n = (await NastaveniaKlubu.nacitaj()).nastavenia_komentarov as Partial<NastaveniaKomentarov>;
  return {
    povolene: n?.povolene !== false,
    moderovat: n?.moderovat !== false,
    vyzadovat_email: n?.vyzadovat_email === true,
    povolit_odpovede: n?.povolit_odpovede !== false,
  };
};

/** Je článok naozaj na webe? (publikovaný a dátum publikovania už nastal) */
const clanokJeVerejny = (clanok: Article): boolean =>
  clanok.status === 'published' &&
  (!clanok.publikovany_datum || new Date(clanok.publikovany_datum).getTime() <= Date.now());

/** Komentár tak, ako ho smie vidieť návštevník - bez e-mailu a IP adresy. */
const verejnyKomentar = (k: Komentar, prihlasenyId?: number) => ({
  id: k.id,
  rodic_id: k.rodic_id,
  autor_meno: k.autor_meno,
  obsah: k.obsah,
  vytvoreny: k.vytvoreny,
  upraveny: Boolean(k.upraveny_autorom),
  // Vlastný komentár vidí autor aj kým čaká na schválenie a smie ho upraviť
  moj: Boolean(prihlasenyId && k.pouzivatel_id === prihlasenyId),
  caka_na_schvalenie: k.stav === 'caka',
});

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
    if (req.body.stav !== undefined) {
      // Neplatný stav predtým padol až v databáze na 500
      if (!STAVY_KOMENTARA.includes(req.body.stav)) {
        res.status(400).json({
          success: false,
          message: `Neplatný stav komentára. Povolené: ${STAVY_KOMENTARA.join(', ')}`,
        });
        return;
      }
      zmeny.stav = req.body.stav;
    }
    // Redaktor môže opraviť preklep alebo skrátiť vulgárny výraz
    if (req.body.obsah !== undefined) zmeny.obsah = sanitizePlainText(String(req.body.obsah));

    await komentar.update(zmeny);
    res.json({ success: true, data: komentar, message: 'Komentár bol upravený' });
  } catch (chyba: any) {
    if (chyba?.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: chyba.errors.map((e: any) => e.message),
      });
      return;
    }
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
 * GET /api/comments/clanok/:clanokId
 * Komentáre pod článkom pre návštevníka webu.
 *
 * Doteraz žiadny verejný výpis neexistoval - komentáre sa dali len
 * moderovať v administrácii, ale na webe ich nikto nevidel.
 *
 * Vracia schválené komentáre, a prihlásenému používateľovi navyše jeho
 * vlastné, ktoré ešte čakajú na schválenie (aby nezmizli hneď po odoslaní
 * alebo úprave). E-mail ani IP adresa sa nevracajú nikdy.
 */
router.get('/comments/clanok/:clanokId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const clanokId = Number(req.params.clanokId);
    const clanok = Number.isInteger(clanokId) ? await Article.findByPk(clanokId) : null;

    if (!clanok || !clanokJeVerejny(clanok)) {
      res.status(404).json({ success: false, message: 'Článok sa nenašiel' });
      return;
    }

    const nastavenia = await nastaveniaKomentarov();
    const prihlasenyId = req.userId ?? undefined;

    const kde: any = prihlasenyId
      ? {
          clanok_id: clanokId,
          [Op.or]: [
            { stav: 'schvaleny' },
            { stav: 'caka', pouzivatel_id: prihlasenyId },
          ],
        }
      : { clanok_id: clanokId, stav: 'schvaleny' };

    const komentare = await Komentar.findAll({
      where: kde,
      order: [['vytvoreny', 'ASC']],
      limit: 500,
    });

    res.json({
      success: true,
      data: komentare.map((k) => verejnyKomentar(k, prihlasenyId)),
      // Podľa toho web ukáže alebo schová formulár
      nastavenia: {
        povolene: nastavenia.povolene && clanok.komentare_povolene,
        vyzadovat_email: nastavenia.vyzadovat_email,
        povolit_odpovede: nastavenia.povolit_odpovede,
        moderovat: nastavenia.moderovat,
      },
    });
  } catch (chyba) {
    console.error('Chyba pri načítaní komentárov článku:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/**
 * POST /api/comments
 * Nový komentár od návštevníka webu — bez prihlásenia.
 *
 * Kontroluje, či sa pod článok vôbec dá komentovať. Predtým sa dal pridať
 * komentár aj k článku s vypnutými komentármi, aj ku konceptu, ktorý
 * na webe ešte nie je.
 */
router.post('/comments', optionalAuth, async (req: Request, res: Response) => {
  try {
    const clanokId = Number(req.body?.clanok_id);
    const clanok = Number.isInteger(clanokId) ? await Article.findByPk(clanokId) : null;
    if (!clanok || !clanokJeVerejny(clanok)) {
      res.status(404).json({ success: false, message: 'Článok sa nenašiel' });
      return;
    }

    const nastavenia = await nastaveniaKomentarov();

    if (!nastavenia.povolene || !clanok.komentare_povolene) {
      res.status(403).json({
        success: false,
        message: 'Komentáre sú pri tomto článku vypnuté.',
      });
      return;
    }

    const email = req.body?.autor_email ? String(req.body.autor_email).trim() : '';
    if (nastavenia.vyzadovat_email && !email) {
      res.status(400).json({ success: false, message: 'Zadajte e-mailovú adresu.' });
      return;
    }

    // Odpoveď musí patriť k tomu istému článku a mieriť na schválený komentár
    let rodicId: number | null = null;
    if (req.body?.rodic_id) {
      if (!nastavenia.povolit_odpovede) {
        res.status(400).json({ success: false, message: 'Odpovede na komentáre sú vypnuté.' });
        return;
      }
      const rodic = await Komentar.findByPk(Number(req.body.rodic_id));
      if (!rodic || rodic.clanok_id !== clanokId || rodic.stav !== 'schvaleny') {
        res.status(400).json({ success: false, message: 'Komentár, na ktorý odpovedáte, neexistuje.' });
        return;
      }
      rodicId = rodic.id;
    }

    const komentar = await Komentar.create({
      clanok_id: clanokId,
      // Keď je návštevník prihlásený, komentár si spárujeme s jeho
      // účtom - inak sa nedá overiť vlastníctvo a autor by svoj
      // vlastný komentár nemohol upraviť.
      pouzivatel_id: req.userId ?? null,
      autor_meno: sanitizePlainText(
        String(req.body?.autor_meno || req.user?.meno || '')
      ).trim(),
      autor_email: email || null,
      obsah: sanitizePlainText(String(req.body?.obsah || '')).trim(),
      rodic_id: rodicId,
      ip_adresa: req.ip || null,
      // Pri zapnutom moderovaní sa komentár zobrazí až po schválení
      stav: nastavenia.moderovat ? 'caka' : 'schvaleny',
    });

    res.status(201).json({
      success: true,
      data: verejnyKomentar(komentar, req.userId ?? undefined),
      message: nastavenia.moderovat
        ? 'Ďakujeme. Komentár sa zobrazí po schválení.'
        : 'Ďakujeme za komentár.',
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

/**
 * PUT /api/comments/:id/moj
 *
 * Úprava VLASTNÉHO komentára prihláseným autorom.
 *
 * PREČO SAMOSTATNE OD ADMIN ÚPRAVY: PUT /api/comments/:id je chránený
 * pre redaktora a slúži na moderovanie. Požiadavka hovorí „na klubovom
 * frontende ich autor vie upravovať", čo je iná operácia: autor smie
 * zmeniť len text svojho komentára a nič iné.
 *
 * Upravený komentár ide znova na schválenie - inak by sa dal
 * po schválení prepísať na ľubovoľný obsah.
 */
router.put('/comments/:id/moj', authenticateToken, async (req: Request, res: Response) => {
  try {
    const komentar = await Komentar.findByPk(Number(req.params.id));

    if (!komentar) {
      res.status(404).json({ success: false, message: 'Komentár sa nenašiel' });
      return;
    }

    if (!komentar.pouzivatel_id || komentar.pouzivatel_id !== req.userId) {
      res.status(403).json({
        success: false,
        message: 'Upraviť sa dá len vlastný komentár',
      });
      return;
    }

    const obsah = sanitizePlainText(String(req.body?.obsah || '')).trim();
    if (obsah.length < 2) {
      res.status(400).json({ success: false, message: 'Komentár nesmie byť prázdny' });
      return;
    }

    const { moderovat } = await nastaveniaKomentarov();

    await komentar.update({
      obsah,
      upraveny_autorom: new Date(),
      // Pri moderovaní ide upravený komentár znova na schválenie
      stav: moderovat ? 'caka' : komentar.stav,
    });

    res.json({
      success: true,
      data: verejnyKomentar(komentar, req.userId ?? undefined),
      message: moderovat
        ? 'Komentár bol upravený a čaká na schválenie.'
        : 'Komentár bol upravený.',
    });
  } catch (chyba) {
    console.error('Chyba pri úprave komentára:', chyba);
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

    res.json({ success: true, data: sNahladmi });
  } catch (chyba) {
    console.error('Chyba pri načítaní videí:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** POST /api/videos */
router.post('/videos', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const url = String(req.body?.url || '');

    // Čo sa dá, doplníme z videa. Ručne zadané hodnoty majú prednosť -
    // požiadavka hovorí „automaticky" ako pohodlie, nie ako prepisovanie.
    const zistene = await zistiUdajeVidea(url);

    // Keď názov neprišiel a ani sa ho nepodarilo zistiť (video je
    // súkromné, zmazané, alebo server nemá von prístup), povieme to
    // rovno - inak by z toho bola technická hláška o validácii.
    const nazovVidea = sanitizePlainText(String(req.body?.nazov || zistene.nazov || '')).trim();
    if (!nazovVidea) {
      res.status(400).json({
        success: false,
        message:
          'Názov videa sa nepodarilo zistiť automaticky. ' +
          'Skontrolujte adresu, alebo názov zadajte ručne.',
      });
      return;
    }

    const video = await Video.create({
      nazov: nazovVidea,
      popis: req.body?.popis ? sanitizePlainText(req.body.popis) : null,
      url,
      nahlad: req.body?.nahlad || zistene.nahlad,
      dlzka: req.body?.dlzka ?? zistene.dlzka,
      kategoria: req.body?.kategoria || null,
      rubrika_id: req.body?.rubrika_id ?? null,
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

    const polia = ['nazov', 'popis', 'url', 'nahlad', 'dlzka', 'kategoria', 'rubrika_id', 'zapas_id', 'publikovane', 'poradie'];
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

    res.json({ success: true, data: turnaje });
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
