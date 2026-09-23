// Umiestnenie: backend/src/routes/obsah-doplnky.ts
// Routes pre komentáre, videá a turnaje.

import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import Komentar from '../models/Komentar';
import Video from '../models/Video';
import LigaTurnaj from '../models/LigaTurnaj';
import Liga from '../models/Liga';
import Article from '../models/Article';
import Category from '../models/Category';
import Zapas from '../models/Zapas';
import {
  getPavuk,
  getTurnaj,
  generujPavuka,
  ulozPavuka,
  zapisVysledok,
  nastavSkupiny,
  zapisVysledokSkupiny,
  pavukZoSkupin,
  zmazPavuka,
} from '../controllers/turnajController';
import Team from '../models/Team';
import Sezona from '../models/Sezona';
import { odpovedzNaChybuModelu } from '../utils/odpoved';
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

/** Pridružené záznamy, ktoré sa vracajú pri videu. */
const PRILOHY_VIDEA = [
  { model: Category, as: 'rubrika', attributes: ['id', 'nazov', 'slug', 'farba'], required: false },
  {
    model: Zapas,
    as: 'zapas',
    attributes: ['id', 'nazov', 'datum_cas', 'domaci_tim_nazov', 'hostujuci_tim_nazov', 'goly_domaci', 'goly_hostia'],
    required: false,
  },
];

/** Video pre klienta - s adresou náhľadu, ktorú vieme pri YouTube odvodiť. */
const videoNaVystup = (v: Video) => ({ ...v.toJSON(), nahlad_url: v.nahladovyObrazok() });

/** Prihlásený redaktor alebo správca smie vidieť aj skryté videá. */
const jeRedaktor = (req: Request): boolean =>
  ['admin', 'redaktor'].includes(String((req as any).user?.rola || ''));

/** Kladné celé číslo alebo null; pri nezmysle vráti undefined. */
const idAleboNull = (hodnota: unknown): number | null | undefined => {
  if (hodnota === null || hodnota === '' || hodnota === undefined) return null;
  const cislo = Number(hodnota);
  return Number.isInteger(cislo) && cislo > 0 ? cislo : undefined;
};

/**
 * Overí a pripraví polia videa z tela požiadavky.
 * Vracia buď chybovú správu, alebo objekt len s poslanými poliami.
 */
const pripravPoliaVidea = async (
  telo: any
): Promise<{ chyba: string } | { polia: Record<string, any> }> => {
  const polia: Record<string, any> = {};

  if (telo.url !== undefined) {
    const url = String(telo.url || '').trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      return { chyba: 'Zadajte platný odkaz na video (začína https://)' };
    }
    polia.url = url;
  }

  if (telo.nazov !== undefined) polia.nazov = sanitizePlainText(String(telo.nazov || '')).trim();
  if (telo.popis !== undefined) {
    polia.popis = telo.popis ? sanitizePlainText(String(telo.popis)).trim() || null : null;
  }
  if (telo.kategoria !== undefined) {
    polia.kategoria = telo.kategoria ? sanitizePlainText(String(telo.kategoria)).slice(0, 60) : null;
  }
  if (telo.nahlad !== undefined) {
    const nahlad = telo.nahlad ? String(telo.nahlad).trim() : null;
    if (nahlad && !/^(https?:\/\/|\/uploads\/)/i.test(nahlad)) {
      return { chyba: 'Náhľad musí byť odkaz na obrázok' };
    }
    polia.nahlad = nahlad;
  }

  if (telo.dlzka !== undefined) {
    if (telo.dlzka === null || telo.dlzka === '') {
      polia.dlzka = null;
    } else {
      const dlzka = Number(telo.dlzka);
      if (!Number.isInteger(dlzka) || dlzka < 0 || dlzka > 86400) {
        return { chyba: 'Dĺžka videa musí byť počet sekúnd (0 – 86400)' };
      }
      polia.dlzka = dlzka;
    }
  }

  if (telo.poradie !== undefined) {
    const poradie = Number(telo.poradie);
    polia.poradie = Number.isInteger(poradie) ? poradie : 0;
  }
  if (telo.publikovane !== undefined) polia.publikovane = Boolean(telo.publikovane);

  // Väzby overíme vopred - inak by neexistujúce ID skončilo chybou databázy
  if (telo.rubrika_id !== undefined) {
    const id = idAleboNull(telo.rubrika_id);
    if (id === undefined) return { chyba: 'Neplatná rubrika' };
    if (id !== null && !(await Category.findByPk(id))) {
      return { chyba: 'Zvolená rubrika neexistuje' };
    }
    polia.rubrika_id = id;
  }
  if (telo.zapas_id !== undefined) {
    const id = idAleboNull(telo.zapas_id);
    if (id === undefined) return { chyba: 'Neplatný zápas' };
    if (id !== null && !(await Zapas.findByPk(id))) {
      return { chyba: 'Zvolený zápas neexistuje' };
    }
    polia.zapas_id = id;
  }

  return { polia };
};

/**
 * GET /api/videos
 * Verejne len zverejnené videá. Redaktor s ?vsetky=1 dostane aj skryté
 * (administrácia ich musí vidieť, aby ich mohla znova zverejniť).
 * Filtre: rubrika_id, zapas_id, kategoria, search.
 */
router.get('/videos', optionalAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const kde: any = {};

    if (!(req.query.vsetky === '1' && jeRedaktor(req))) kde.publikovane = true;
    if (req.query.kategoria) kde.kategoria = String(req.query.kategoria);
    const rubrika = idAleboNull(req.query.rubrika_id);
    if (rubrika) kde.rubrika_id = rubrika;
    const zapas = idAleboNull(req.query.zapas_id);
    if (zapas) kde.zapas_id = zapas;
    if (req.query.search) {
      kde.nazov = { [Op.iLike]: `%${String(req.query.search)}%` };
    }

    const videa = await Video.findAll({
      where: kde,
      include: PRILOHY_VIDEA as any,
      order: [['poradie', 'ASC'], ['vytvorene', 'DESC']],
      limit,
    });

    res.json({ success: true, data: videa.map(videoNaVystup) });
  } catch (chyba) {
    console.error('Chyba pri načítaní videí:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/**
 * GET /api/videos/zisti?url=...
 * Predvyplnenie formulára - názov, náhľad a dĺžka zistené z videa.
 */
router.get('/videos/zisti', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  const url = String(req.query.url || '').trim();
  if (!/^https?:\/\/\S+$/i.test(url)) {
    res.status(400).json({ success: false, message: 'Zadajte platný odkaz na video' });
    return;
  }

  const zistene = await zistiUdajeVidea(url);
  const rozpoznane = Video.rozpoznajId(url);

  res.json({
    success: true,
    data: { ...zistene, zdroj: rozpoznane.zdroj },
    message:
      rozpoznane.zdroj === 'ine'
        ? 'Odkaz nie je z YouTube ani Vimeo - údaje zadajte ručne'
        : undefined,
  });
});

/** GET /api/videos/:id - verejne len zverejnené video */
router.get('/videos/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = idAleboNull(req.params.id);
    const video = id ? await Video.findByPk(id, { include: PRILOHY_VIDEA as any }) : null;

    if (!video || (!video.publikovane && !jeRedaktor(req))) {
      res.status(404).json({ success: false, message: 'Video sa nenašlo' });
      return;
    }

    res.json({ success: true, data: videoNaVystup(video) });
  } catch (chyba) {
    console.error('Chyba pri načítaní videa:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** POST /api/videos */
router.post('/videos', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const pripravene = await pripravPoliaVidea({ ...req.body, url: req.body?.url ?? '' });
    if ('chyba' in pripravene) {
      res.status(400).json({ success: false, message: pripravene.chyba });
      return;
    }
    const polia = pripravene.polia;

    // Čo sa dá, doplníme z videa. Ručne zadané hodnoty majú prednosť -
    // požiadavka hovorí „automaticky" ako pohodlie, nie ako prepisovanie.
    const zistene = await zistiUdajeVidea(polia.url);

    // Keď názov neprišiel a ani sa ho nepodarilo zistiť (video je
    // súkromné, zmazané, alebo server nemá von prístup), povieme to
    // rovno - inak by z toho bola technická hláška o validácii.
    const nazovVidea = polia.nazov || sanitizePlainText(zistene.nazov || '').trim();
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
      publikovane: true,
      poradie: 0,
      ...polia,
      nazov: nazovVidea,
      nahlad: polia.nahlad || zistene.nahlad,
      dlzka: polia.dlzka ?? zistene.dlzka,
    } as any);

    await video.reload({ include: PRILOHY_VIDEA as any });
    res.status(201).json({ success: true, data: videoNaVystup(video), message: 'Video bolo pridané' });
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
    const id = idAleboNull(req.params.id);
    const video = id ? await Video.findByPk(id) : null;
    if (!video) {
      res.status(404).json({ success: false, message: 'Video sa nenašlo' });
      return;
    }

    const pripravene = await pripravPoliaVidea(req.body || {});
    if ('chyba' in pripravene) {
      res.status(400).json({ success: false, message: pripravene.chyba });
      return;
    }
    const zmeny = pripravene.polia;

    if (zmeny.nazov !== undefined && !zmeny.nazov) {
      res.status(400).json({ success: false, message: 'Názov videa nesmie byť prázdny' });
      return;
    }

    // Nový odkaz = iné video: náhľad a dĺžku doplníme z neho,
    // pokiaľ ich redaktor zároveň nezadal ručne
    if (zmeny.url && zmeny.url !== video.url) {
      const zistene = await zistiUdajeVidea(zmeny.url);
      if (!zmeny.nahlad) zmeny.nahlad = zistene.nahlad;
      if (zmeny.dlzka === undefined || zmeny.dlzka === null) zmeny.dlzka = zistene.dlzka;
    }

    await video.update(zmeny);
    await video.reload({ include: PRILOHY_VIDEA as any });
    res.json({ success: true, data: videoNaVystup(video), message: 'Zmeny boli uložené' });
  } catch (chyba: any) {
    if (chyba.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: chyba.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri úprave videa:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** DELETE /api/videos/:id - rovnako ako galérie smie mazať redaktor */
router.delete('/videos/:id', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = idAleboNull(req.params.id);
    const video = id ? await Video.findByPk(id) : null;
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
//
// Turnaj je samostatná súťaž: vlastný názov, sezóna, logo, popis a náš tím.
// Väzba na ligu je voliteľná (liga s formátom „turnaj" si ho zakladá sama).

/** Polia turnaja, ktoré smie klient nastaviť. */
const pripravTurnaj = async (telo: any, jeNovy: boolean): Promise<{ polia: any } | { chyba: string }> => {
  const polia: any = {};
  const volitelneId = async (pole: string, model: any, popis: string) => {
    if (telo[pole] === undefined) return null;
    if (telo[pole] === null || telo[pole] === '') { polia[pole] = null; return null; }
    const id = Number(telo[pole]);
    if (!Number.isInteger(id) || id < 1 || !(await model.findByPk(id))) return `${popis} neexistuje`;
    polia[pole] = id;
    return null;
  };

  if (telo.nazov !== undefined || jeNovy) {
    const nazov = sanitizePlainText(String(telo.nazov || '')).trim();
    if (nazov.length < 2 || nazov.length > 100) return { chyba: 'Názov turnaja musí mať 2 – 100 znakov' };
    polia.nazov = nazov;
  }
  if (telo.popis !== undefined) polia.popis = telo.popis ? sanitizePlainText(String(telo.popis)) : null;
  if (telo.poznamky !== undefined) polia.poznamky = telo.poznamky ? sanitizePlainText(String(telo.poznamky)) : null;
  if (telo.logo !== undefined) {
    const logo = telo.logo ? String(telo.logo) : null;
    if (logo && !/^(\/uploads\/|https?:\/\/)/.test(logo)) return { chyba: 'Logo musí byť nahratý obrázok alebo adresa' };
    polia.logo = logo;
  }
  if (telo.typ !== undefined || jeNovy) {
    const typ = telo.typ || 'single_elimination';
    if (!['single_elimination', 'groups_playoff', 'round_robin'].includes(typ)) {
      return { chyba: 'Formát musí byť pavúk, skupiny + pavúk, alebo každý s každým' };
    }
    polia.typ = typ;
  }
  if (telo.status !== undefined) {
    if (!['pripravuje', 'prebiehajuci', 'ukonceny', 'pozastaveny'].includes(telo.status)) return { chyba: 'Neplatný stav turnaja' };
    polia.status = telo.status;
  }
  for (const pole of ['datum_start', 'datum_koniec']) {
    if (telo[pole] === undefined) continue;
    if (telo[pole] && !/^\d{4}-\d{2}-\d{2}$/.test(String(telo[pole]))) return { chyba: 'Dátum musí byť v tvare RRRR-MM-DD' };
    polia[pole] = telo[pole] || null;
  }
  const zaciatok = polia.datum_start ?? telo._povodny_start;
  const koniec = polia.datum_koniec ?? telo._povodny_koniec;
  if (zaciatok && koniec && koniec < zaciatok) return { chyba: 'Koniec turnaja nemôže byť pred začiatkom' };
  if (telo.ma_tretie_miesto !== undefined) polia.ma_tretie_miesto = Boolean(telo.ma_tretie_miesto);
  if (telo.zobrazit_na_webe !== undefined) polia.zobrazit_na_webe = Boolean(telo.zobrazit_na_webe);

  const chyba =
    (await volitelneId('tim_id', Team, 'Zvolený tím')) ||
    (await volitelneId('sezona_id', Sezona, 'Zvolená sezóna')) ||
    (await volitelneId('liga_id', Liga, 'Zvolená liga'));
  if (chyba) return { chyba };

  if (jeNovy) {
    polia.pocet_timov = 2;
    polia.status = polia.status || 'pripravuje';
    polia.aktualna_faza = 'priprava';
    polia.celkove_fazy = [];
  }
  return { polia };
};

/**
 * GET /api/tournaments
 * Verejne len zverejnené turnaje; administrácia s ?vsetky=1 aj skryté.
 */
router.get('/tournaments', optionalAuth, async (req: Request, res: Response) => {
  try {
    const kde: any = { aktivity: true };
    const redaktor = ['admin', 'redaktor'].includes(String((req as any).user?.rola || ''));
    if (!(req.query.vsetky === '1' && redaktor)) kde.zobrazit_na_webe = true;

    const turnaje = await LigaTurnaj.findAll({
      where: kde,
      include: [{ model: Liga, as: 'liga', attributes: ['id', 'nazov', 'sezona'], required: false }],
      order: [['datum_start', 'DESC NULLS LAST'], ['id', 'DESC']],
      limit: 200,
    });

    // Do zoznamu netreba celé štruktúry - len prehľad
    const data = turnaje.map((t) => {
      const { pavuk_struktura, skupiny_struktura, ...zvysok } = t.toJSON() as any;
      let pocetSkupin = 0;
      try { pocetSkupin = JSON.parse(skupiny_struktura || '{}').skupiny?.length ?? 0; } catch { /* nič */ }
      return { ...zvysok, ma_pavuka: Boolean(pavuk_struktura), pocet_skupin_realne: pocetSkupin };
    });

    res.json({ success: true, data });
  } catch (chyba) {
    console.error('Chyba pri načítaní turnajov:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** GET /api/tournaments/:id - turnaj so skupinami a pavúkom */
router.get('/tournaments/:id', optionalAuth, getTurnaj);

/** POST /api/tournaments */
router.post('/tournaments', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const pripravene = await pripravTurnaj(req.body || {}, true);
    if ('chyba' in pripravene) {
      res.status(400).json({ success: false, message: pripravene.chyba });
      return;
    }
    const turnaj = await LigaTurnaj.create(pripravene.polia);
    res.status(201).json({ success: true, data: turnaj, message: 'Turnaj bol vytvorený' });
  } catch (chyba: any) {
    if (odpovedzNaChybuModelu(chyba, res)) return;
    console.error('Chyba pri vytváraní turnaja:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** PUT /api/tournaments/:id */
router.put('/tournaments/:id', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const turnaj = await LigaTurnaj.findOne({ where: { id: Number(req.params.id) || 0, aktivity: true } });
    if (!turnaj) {
      res.status(404).json({ success: false, message: 'Turnaj sa nenašiel' });
      return;
    }

    const pripravene = await pripravTurnaj(
      { ...req.body, _povodny_start: turnaj.datum_start, _povodny_koniec: turnaj.datum_koniec },
      false
    );
    if ('chyba' in pripravene) {
      res.status(400).json({ success: false, message: pripravene.chyba });
      return;
    }

    await turnaj.update(pripravene.polia);
    res.json({ success: true, data: turnaj, message: 'Zmeny boli uložené' });
  } catch (chyba: any) {
    if (odpovedzNaChybuModelu(chyba, res)) return;
    console.error('Chyba pri úprave turnaja:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** DELETE /api/tournaments/:id - archivácia, turnaj sa dá obnoviť v Archíve */
router.delete('/tournaments/:id', authenticateToken, requireEditor, async (req: Request, res: Response) => {
  try {
    const turnaj = await LigaTurnaj.findOne({ where: { id: Number(req.params.id) || 0, aktivity: true } });
    if (!turnaj) {
      res.status(404).json({ success: false, message: 'Turnaj sa nenašiel' });
      return;
    }
    await turnaj.update({ aktivity: false });
    res.json({ success: true, message: `Turnaj ${turnaj.nazov} bol presunutý do archívu` });
  } catch (chyba) {
    console.error('Chyba pri archivácii turnaja:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

// ===== SKUPINY A PAVÚK =====

/** @route PUT /api/tournaments/:id/groups - skupiny a rozpis zápasov */
router.put('/tournaments/:id/groups', authenticateToken, requireEditor, nastavSkupiny);

/** @route PATCH /api/tournaments/:id/groups/match/:kod - výsledok v skupine */
router.patch('/tournaments/:id/groups/match/:kod', authenticateToken, requireEditor, zapisVysledokSkupiny);

/** @route GET /api/tournaments/:id/bracket */
router.get('/tournaments/:id/bracket', getPavuk);

/** @route POST /api/tournaments/:id/bracket/generate - telo: { timy: [...] } */
router.post('/tournaments/:id/bracket/generate', authenticateToken, requireEditor, generujPavuka);

/** @route POST /api/tournaments/:id/bracket/from-groups - pavúk z postupujúcich */
router.post('/tournaments/:id/bracket/from-groups', authenticateToken, requireEditor, pavukZoSkupin);

/** @route PUT /api/tournaments/:id/bracket - ručná úprava celého pavúka */
router.put('/tournaments/:id/bracket', authenticateToken, requireEditor, ulozPavuka);

/** @route DELETE /api/tournaments/:id/bracket - zrušenie pavúka */
router.delete('/tournaments/:id/bracket', authenticateToken, requireEditor, zmazPavuka);

/** @route PATCH /api/tournaments/:id/bracket/match/:kod - výsledok a postup */
router.patch('/tournaments/:id/bracket/match/:kod', authenticateToken, requireEditor, zapisVysledok);

export default router;
