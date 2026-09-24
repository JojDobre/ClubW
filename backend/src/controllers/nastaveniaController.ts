// Umiestnenie: backend/src/controllers/nastaveniaController.ts
// Čítanie a úprava nastavení klubu.

import { Request, Response } from 'express';
import NastaveniaKlubu from '../models/NastaveniaKlubu';
import { sanitizePlainText } from '../utils/sanitize';

// Polia, ktoré smie správca meniť. Zoznam je zámerne úplný a explicitný -
// bez neho by sa cez req.body dalo prepísať id alebo časové značky.
const UPRAVITELNE_POLIA = [
  'nazov', 'skratka', 'slogan', 'rok_zalozenia', 'logo', 'favicon',
  'farba_primarna', 'farba_sekundarna', 'farba_akcent',
  'farba_primarna_kontrast', 'farba_akcent_kontrast',
  'email', 'telefon', 'adresa', 'ico', 'dic', 'pravny_nazov', 'ic_dph', 'iban',
  'facebook_url', 'instagram_url', 'youtube_url', 'x_url', 'tiktok_url',
  'meta_popis', 'google_analytics_id', 'jazyk_administracie',
  // Sady nastavení ako JSON: dodatkové farby podľa šablóny, globálne
  // nastavenia komentárov, GDPR a širšie SEO. Doteraz z nich bol
  // v nastaveniach len meta_popis.
  'dodatkove_farby', 'nastavenia_komentarov', 'nastavenia_gdpr', 'nastavenia_seo',
] as const;

/** Polia, ktoré sú JSON objektom a nesmú prejsť cez odstránenie HTML. */
const JSONOVE_POLIA = [
  'dodatkove_farby', 'nastavenia_komentarov', 'nastavenia_gdpr', 'nastavenia_seo',
];

// Textové polia, ktoré prechádzajú odstránením HTML.
// Sem sa nikdy nemá dostať značkovanie - hodnoty sa vypisujú do stránky.
const TEXTOVE_POLIA = ['nazov', 'skratka', 'slogan', 'adresa', 'meta_popis', 'pravny_nazov', 'ico', 'dic', 'ic_dph'];

const text = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null) return null;
  const t = sanitizePlainText(String(v)).trim().slice(0, max);
  return t || null;
};

/**
 * Globálne nastavenia (komentáre, GDPR, SEO) - len známe kľúče so
 * správnym typom. Predtým sa uložil akýkoľvek objekt tak, ako prišiel.
 */
const OCISTI_JSON: Record<string, (v: any) => { data?: Record<string, unknown>; chyba?: string }> = {
  nastavenia_komentarov: (v) => ({
    data: {
      povolene: v.povolene !== false,
      moderovat: v.moderovat !== false,
      vyzadovat_email: v.vyzadovat_email === true,
      povolit_odpovede: v.povolit_odpovede !== false,
    },
  }),
  nastavenia_gdpr: (v) => {
    const mesiace = v.retencia_mesiacov === undefined || v.retencia_mesiacov === null ? 36 : Number(v.retencia_mesiacov);
    if (!Number.isInteger(mesiace) || mesiace < 1 || mesiace > 240) {
      return { chyba: 'Doba uchovávania údajov musí byť 1 až 240 mesiacov' };
    }
    const odkaz = text(v.odkaz_zasad, 300);
    if (odkaz && !/^(\/(?!\/)|https?:\/\/)/i.test(odkaz)) {
      return { chyba: 'Odkaz na zásady ochrany údajov musí začínať / alebo https://' };
    }
    return {
      data: {
        cookie_lista: v.cookie_lista !== false,
        text_suhlasu: text(v.text_suhlasu, 1000),
        odkaz_zasad: odkaz,
        kontakt_zodpovednej_osoby: text(v.kontakt_zodpovednej_osoby, 255),
        retencia_mesiacov: mesiace,
      },
    };
  },
  nastavenia_seo: (v) => {
    const sablona = text(v.meta_title_sablona, 120);
    if (sablona && !sablona.includes('%s')) {
      return { chyba: 'Šablóna titulku musí obsahovať %s (miesto pre názov stránky), napríklad „%s | FK Dolina"' };
    }
    const og = text(v.og_obrazok, 500);
    if (og && !/^(\/(?!\/)|https?:\/\/)/i.test(og)) {
      return { chyba: 'Obrázok pre sociálne siete musí byť nahratý súbor alebo https:// adresa' };
    }
    const overenie = text(v.google_search_console, 120);
    if (overenie && !/^[A-Za-z0-9_-]+$/.test(overenie)) {
      return { chyba: 'Kód overenia Google Search Console obsahuje len písmená, čísla, - a _ (hodnota content z meta značky)' };
    }
    return {
      data: {
        meta_title_sablona: sablona,
        kluc_slova: text(v.kluc_slova, 300),
        og_obrazok: og,
        indexovat: v.indexovat !== false,
        google_search_console: overenie,
      },
    };
  },
};

/** Kľúč dodatkovej farby - použije sa v CSS ako --club-extra-<kluc>. */
const VZOR_KLUCA_FARBY = /^[a-z][a-z0-9-]{0,30}$/;

/**
 * Overí dodatkové farby šablóny: najviac 12, kľúč malými písmenami,
 * hodnota #RRGGBB. Vráti chybu alebo očistený objekt.
 */
const overDodatkoveFarby = (vstup: Record<string, unknown>): { farby?: Record<string, string>; chyba?: string } => {
  const zaznamy = Object.entries(vstup);
  if (zaznamy.length > 12) return { chyba: 'Dodatkových farieb môže byť najviac 12' };
  const farby: Record<string, string> = {};
  for (const [kluc, hodnota] of zaznamy) {
    if (!VZOR_KLUCA_FARBY.test(kluc)) {
      return { chyba: `Názov farby „${kluc}" smie obsahovať len malé písmená bez diakritiky, číslice a pomlčku` };
    }
    if (typeof hodnota !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(hodnota)) {
      return { chyba: `Farba „${kluc}" musí byť v tvare #RRGGBB` };
    }
    farby[kluc] = hodnota;
  }
  return { farby };
};

/**
 * GET /api/settings
 * Verejné nastavenia pre vykreslenie webu (farby, názov, kontakty).
 */
export const getNastavenia = async (_req: Request, res: Response): Promise<void> => {
  try {
    const nastavenia = await NastaveniaKlubu.nacitaj();

    res.json({
      success: true,
      data: nastavenia.verejneUdaje(),
    });
  } catch (error) {
    console.error('Chyba pri načítaní nastavení klubu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní nastavení' });
  }
};

/**
 * GET /api/settings.css
 * Nastavenia ako CSS súbor s premennými.
 *
 * PREČO: ak by farby doťahoval až JavaScript, stránka by na okamih blikla
 * v predvolených farbách. Takto sa štýl načíta spolu so stránkou.
 */
export const getNastaveniaCss = async (_req: Request, res: Response): Promise<void> => {
  try {
    const n = await NastaveniaKlubu.nacitaj();

    // color-mix odvodí zvyšné odtiene z primárnej farby, takže na
    // prebrandovanie stačia tri hodnoty (rovnako ako v návrhu webu)
    const css = `:root {
  --club-primary: ${n.farba_primarna};
  --club-secondary: ${n.farba_sekundarna};
  --club-accent: ${n.farba_akcent};
  --club-primary-contrast: ${n.farba_primarna_kontrast};
  --club-accent-contrast: ${n.farba_akcent_kontrast};

  /* Odvodené odtiene - prispôsobia sa akejkoľvek primárnej farbe */
  --club-primary-strong: color-mix(in srgb, var(--club-primary) 82%, #000);
  --club-primary-deep: color-mix(in srgb, var(--club-primary) 62%, #000);
  --club-primary-soft: color-mix(in srgb, var(--club-primary) 9%, #fff);
  --club-primary-tint: color-mix(in srgb, var(--club-primary) 20%, #fff);
  --club-primary-line: color-mix(in srgb, var(--club-primary) 30%, #fff);
  --accent-soft: color-mix(in srgb, var(--club-accent) 30%, #fff);
${Object.entries(n.dodatkove_farby || {})
  .filter(([k, v]) => VZOR_KLUCA_FARBY.test(k) && /^#[0-9A-Fa-f]{6}$/.test(String(v)))
  .map(([k, v]) => `  --club-extra-${k}: ${v};`)
  .join('\n')}
}
`;

    res.type('text/css');
    // Krátka platnosť vo vyrovnávacej pamäti - zmena farieb sa prejaví
    // do minúty, no bežné načítania servera nezaťažujú
    res.set('Cache-Control', 'public, max-age=60');
    res.send(css);
  } catch (error) {
    console.error('Chyba pri generovaní CSS nastavení:', error);
    // Aj pri chybe pošleme platné CSS s predvolenými farbami,
    // aby web nezostal bez štýlu
    res.type('text/css').send(':root { --club-primary: #1B5E20; --club-secondary: #FFFFFF; --club-accent: #FFC107; }');
  }
};

/**
 * GET /api/admin/settings
 * Kompletné nastavenia vrátane prevádzkových údajov.
 */
export const getNastaveniaAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const nastavenia = await NastaveniaKlubu.nacitaj();
    res.json({ success: true, data: nastavenia });
  } catch (error) {
    console.error('Chyba pri načítaní nastavení klubu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní nastavení' });
  }
};

/**
 * PUT /api/admin/settings
 * Úprava nastavení klubu.
 */
export const updateNastavenia = async (req: Request, res: Response): Promise<void> => {
  try {
    const nastavenia = await NastaveniaKlubu.nacitaj();

    const zmeny: Record<string, unknown> = {};

    for (const pole of UPRAVITELNE_POLIA) {
      if (req.body[pole] === undefined) continue;

      let hodnota: any = req.body[pole];

      // JSON sady sa spracúvajú zvlášť - nie sú to textové polia
      // a prázdny objekt je platná hodnota.
      if (JSONOVE_POLIA.includes(pole)) {
        if (hodnota === null || hodnota === undefined) {
          hodnota = {};
        }
        if (typeof hodnota !== 'object' || Array.isArray(hodnota)) {
          res.status(400).json({
            success: false,
            message: `Pole ${pole} musí byť objekt s nastaveniami`,
          });
          return;
        }
        if (OCISTI_JSON[pole]) {
          const { data, chyba } = OCISTI_JSON[pole](hodnota);
          if (chyba) {
            res.status(400).json({ success: false, message: chyba });
            return;
          }
          hodnota = data;
        }
        if (pole === 'dodatkove_farby') {
          const { farby, chyba } = overDodatkoveFarby(hodnota);
          if (chyba) {
            res.status(400).json({ success: false, message: chyba });
            return;
          }
          hodnota = farby;
        }
        zmeny[pole] = hodnota;
        continue;
      }

      // Prázdny reťazec berieme ako zámer pole vyprázdniť.
      // Názov a farby sú povinné, tie takto vymazať nejde.
      if (hodnota === '') {
        const povinne = ['nazov', 'farba_primarna', 'farba_sekundarna', 'farba_akcent',
                         'farba_primarna_kontrast', 'farba_akcent_kontrast'];
        if (povinne.includes(pole)) {
          res.status(400).json({
            success: false,
            message: `Pole ${pole} nemôže byť prázdne`,
          });
          return;
        }
        hodnota = null;
      }

      // Odstránenie prípadného HTML z textových polí
      if (hodnota !== null && TEXTOVE_POLIA.includes(pole)) {
        hodnota = sanitizePlainText(String(hodnota));
      }

      if (pole === 'rok_zalozenia' && hodnota !== null) {
        hodnota = Number(hodnota);
        if (!Number.isInteger(hodnota)) {
          res.status(400).json({
            success: false,
            message: 'Rok založenia musí byť celé číslo',
          });
          return;
        }
      }

      if (pole === 'google_analytics_id' && hodnota !== null && !/^(G|GT|UA|AW)-[A-Z0-9-]{4,24}$/i.test(String(hodnota).trim())) {
        res.status(400).json({ success: false, message: 'Google Analytics ID má tvar G-XXXXXXXXXX' });
        return;
      }

      if (pole === 'jazyk_administracie' && !['sk', 'cs', 'en'].includes(String(hodnota))) {
        res.status(400).json({ success: false, message: 'Nepodporovaný jazyk administrácie' });
        return;
      }

      // IBAN ľudia píšu s medzerami - ukladáme bez nich
      if (pole === 'iban' && hodnota !== null) {
        hodnota = String(hodnota).replace(/\s+/g, '').toUpperCase();
      }

      zmeny[pole] = hodnota;
    }

    if (Object.keys(zmeny).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neboli poslané žiadne údaje na úpravu',
      });
      return;
    }

    // Validácia farieb a e-mailu prebehne v modeli;
    // chybu prevedieme na zrozumiteľnú odpoveď
    try {
      await nastavenia.update(zmeny);
    } catch (chyba: any) {
      if (chyba.name === 'SequelizeValidationError') {
        res.status(400).json({
          success: false,
          message: chyba.errors?.[0]?.message || 'Neplatné hodnoty nastavení',
          errors: chyba.errors.map((e: any) => `${e.path}: ${e.message}`),
        });
        return;
      }
      throw chyba;
    }

    res.json({
      success: true,
      data: nastavenia,
      message: 'Nastavenia klubu boli uložené',
    });
  } catch (error) {
    console.error('Chyba pri ukladaní nastavení klubu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri ukladaní nastavení' });
  }
};
