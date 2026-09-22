// Umiestnenie: backend/src/utils/mediaUlozisko.ts
//
// UKLADANIE SÚBOROV MEDIA KNIŽNICE
//
// Postup je zámerne rovnaký ako pri fotkách hráčov, ktoré už otvrdené
// sú: súbor ide najprv do pamäte, overí sa podľa SKUTOČNÉHO OBSAHU
// (nie podľa hlavičky od klienta, ktorú sa dá ľubovoľne podvrhnúť),
// obrázky sa povinne pre-enkódujú cez sharp a príponu určujeme my,
// nie používateľ.
//
// Cesta je /uploads/media/<rok>/<mesiac>/ presne podľa požiadavky.

import path from 'path';
import fsPromises from 'fs/promises';
import sharp from 'sharp';

/** Koreň pre nahraté súbory - zhodný so statickým servovaním v index.ts */
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/** Formáty obrázkov, ktoré prijímame (kontrolujeme podľa obsahu). */
const FORMATY_OBRAZKOV = ['jpeg', 'png', 'webp', 'gif'];

/** Dokumenty sa neprekódovávajú, preto ich povoľujeme podľa prípony. */
const PRIPONY_DOKUMENTOV: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

/** Ochrana pred obrázkom s obrovskými rozmermi, ktorý by vyčerpal pamäť. */
const MAX_ROZMER = 10000;

export interface UlozenySubor {
  cesta: string;
  nazovSuboru: string;
  typ: 'obrazok' | 'dokument' | 'ine';
  mimeTyp: string;
  velkost: number;
  sirka: number | null;
  vyska: number | null;
}

/**
 * Vyrobí bezpečný názov súboru bez diakritiky a špeciálnych znakov.
 *
 * Nikdy nevracia prázdny reťazec - pri názve zo samých zvláštnych
 * znakov použije "subor".
 */
export const bezpecnyNazov = (povodny: string): string => {
  const bezPripony = path.basename(povodny, path.extname(povodny));

  const ocisteny = bezPripony
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return ocisteny || 'subor';
};

/** Priečinok pre aktuálny mesiac, napríklad "2026/09". */
export const priecinokMesiaca = (datum: Date = new Date()): string => {
  const rok = datum.getFullYear();
  const mesiac = String(datum.getMonth() + 1).padStart(2, '0');
  return `${rok}/${mesiac}`;
};

/**
 * Overí, že výsledná cesta leží vnútri priečinka uploads.
 *
 * Poistka proti path traversal - aj keby sa do premenných dostala
 * neočakávaná hodnota, súbor sa nezapíše mimo povoleného priestoru.
 */
const overCestu = (cesta: string): void => {
  const normalizovana = path.resolve(cesta);
  if (!normalizovana.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) {
    throw new Error('Neplatná cieľová cesta súboru');
  }
};

/**
 * Uloží nahratý súbor do media knižnice.
 *
 * @param buffer - obsah súboru z pamäte
 * @param originalnyNazov - názov, ktorý mal súbor u používateľa
 * @returns údaje o uloženom súbore pre zápis do databázy
 * @throws keď obsah nezodpovedá povolenému typu
 */
export const ulozMedium = async (
  buffer: Buffer,
  originalnyNazov: string
): Promise<UlozenySubor> => {
  const pripona = path.extname(originalnyNazov).toLowerCase();
  const zaklad = bezpecnyNazov(originalnyNazov);
  const mesiac = priecinokMesiaca();
  const priecinok = path.join(UPLOADS_ROOT, 'media', ...mesiac.split('/'));

  await fsPromises.mkdir(priecinok, { recursive: true });

  // Jedinečná prípona názvu - dva súbory rovnakého mena sa neprepíšu
  const odlisovac = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

  // ===== Obrázok =====
  // Skúsime ho prečítať cez sharp. Ak to prejde, je to naozaj obrázok,
  // nech mal akúkoľvek príponu alebo hlavičku.
  let metadata: sharp.Metadata | null = null;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    metadata = null;
  }

  if (metadata && metadata.format && FORMATY_OBRAZKOV.includes(metadata.format)) {
    if ((metadata.width || 0) > MAX_ROZMER || (metadata.height || 0) > MAX_ROZMER) {
      throw new Error(`Obrázok je príliš veľký (maximum ${MAX_ROZMER}×${MAX_ROZMER} bodov)`);
    }

    // Pre-enkódovanie odstráni vložené skripty, EXIF aj polyglot súbory.
    // Animované GIF-y necháme tak, aby sa nestratila animácia.
    const jeAnimovany = metadata.format === 'gif' && (metadata.pages || 1) > 1;

    const nazovSuboru = jeAnimovany
      ? `${zaklad}-${odlisovac}.gif`
      : `${zaklad}-${odlisovac}.jpg`;
    const cielova = path.join(priecinok, nazovSuboru);
    overCestu(cielova);

    const vystup = jeAnimovany
      ? buffer
      : await sharp(buffer).rotate().jpeg({ quality: 86 }).toBuffer();

    await fsPromises.writeFile(cielova, vystup);

    const finalneMeta = jeAnimovany ? metadata : await sharp(vystup).metadata();

    return {
      cesta: `/uploads/media/${mesiac}/${nazovSuboru}`,
      nazovSuboru,
      typ: 'obrazok',
      mimeTyp: jeAnimovany ? 'image/gif' : 'image/jpeg',
      velkost: vystup.length,
      sirka: finalneMeta.width ?? null,
      vyska: finalneMeta.height ?? null,
    };
  }

  // ===== Dokument =====
  const mimeDokumentu = PRIPONY_DOKUMENTOV[pripona];
  if (!mimeDokumentu) {
    throw new Error(
      'Nepodporovaný typ súboru. Povolené sú obrázky (JPEG, PNG, WebP, GIF) ' +
      `a dokumenty (${Object.keys(PRIPONY_DOKUMENTOV).join(', ')})`
    );
  }

  const nazovSuboru = `${zaklad}-${odlisovac}${pripona}`;
  const cielova = path.join(priecinok, nazovSuboru);
  overCestu(cielova);

  await fsPromises.writeFile(cielova, buffer);

  return {
    cesta: `/uploads/media/${mesiac}/${nazovSuboru}`,
    nazovSuboru,
    typ: 'dokument',
    mimeTyp: mimeDokumentu,
    velkost: buffer.length,
    sirka: null,
    vyska: null,
  };
};

/**
 * Zmaže súbor média z disku. Chyby ignoruje - ak súbor už neexistuje,
 * cieľ je aj tak splnený.
 */
export const zmazMedium = async (cesta: string): Promise<void> => {
  if (!cesta.startsWith('/uploads/')) return;

  const absolutna = path.join(process.cwd(), cesta);
  try {
    overCestu(absolutna);
    await fsPromises.unlink(absolutna);
  } catch {
    // Súbor neexistuje alebo sa nedá zmazať - pri upratovaní to nevadí
  }
};
