// Umiestnenie: frontend/src/i18n/index.ts
// Jazyk administrácie - slovenčina, čeština, angličtina.
//
// AKO TO FUNGUJE: texty sa v kóde píšu po slovensky a obalia sa do tr():
//   tr('Uložiť zmeny')
//   tr('Zmazať rolu {nazov}?', { nazov: r.nazov })
//   trn(pocet, '{n} hlas', '{n} hlasy', '{n} hlasov')
// Slovenský text je zároveň kľúčom do slovníka en.json / cs.json. Keď
// preklad chýba, zobrazí sa slovenský text - administrácia sa nerozbije.
//
// Jazyk sa zvolí pred načítaním administrácie (index.tsx). Zmena jazyka
// stránku znovu načíta - preto môžu byť tr() aj v konštantách mimo
// komponentov (menu, zoznamy možností) a nič netreba prekresľovať.
//
// Kontrola chýbajúcich prekladov: npm run preklady (priečinok frontend).

export type Jazyk = 'sk' | 'cs' | 'en';

export const JAZYKY: Array<{ kod: Jazyk; nazov: string }> = [
  { kod: 'sk', nazov: 'Slovenčina' },
  { kod: 'cs', nazov: 'Čeština' },
  { kod: 'en', nazov: 'English' },
];

const LOKALITY: Record<Jazyk, string> = { sk: 'sk-SK', cs: 'cs-CZ', en: 'en-GB' };

export const KLUC_JAZYKA = 'clubw_jazyk';

let aktualny: Jazyk = 'sk';
let slovnik: Record<string, string> = {};

export const jeJazyk = (j: unknown): j is Jazyk => j === 'sk' || j === 'cs' || j === 'en';

/**
 * Jazyk pri štarte administrácie: z minulej návštevy, inak predvolený
 * jazyk klubu (Nastavenia), inak slovenčina. Jazyk prehliadača zámerne
 * nerozhoduje - mnoho ľudí ho má v angličtine, hoci administrácia klubu
 * je po slovensky. Po prihlásení platí jazyk z profilu používateľa.
 */
export const ulozenyJazyk = async (): Promise<Jazyk> => {
  try {
    const ulozeny = localStorage.getItem(KLUC_JAZYKA);
    if (jeJazyk(ulozeny)) return ulozeny;
  } catch {
    /* súkromné okno */
  }
  try {
    const { apiUrl } = await import('../config/api');
    const telo = await (await fetch(apiUrl('/settings'))).json();
    if (jeJazyk(telo?.data?.jazyk_administracie)) return telo.data.jazyk_administracie;
  } catch {
    /* server nedostupný */
  }
  return 'sk';
};

/** Načíta slovník jazyka. Volá sa raz pred vykreslením administrácie. */
export const nacitajJazyk = async (j: Jazyk): Promise<void> => {
  slovnik = j === 'sk' ? {} : (await import(`./${j}.json`)).default;
  aktualny = j;
  document.documentElement.lang = j;
};

/** Aktuálny jazyk administrácie. */
export const jazyk = (): Jazyk => aktualny;

/** Lokalita pre formátovanie dátumov a čísel (toLocaleDateString...). */
export const lokalita = (): string => LOKALITY[aktualny];

/**
 * Zmení jazyk a znovu načíta stránku. Uloženie do profilu používateľa
 * rieši volajúci (Môj profil).
 */
export const zmenJazyk = (j: Jazyk): void => {
  try {
    localStorage.setItem(KLUC_JAZYKA, j);
  } catch {
    /* súkromné okno */
  }
  if (j !== aktualny) window.location.reload();
};

/** Hlavička, podľa ktorej server preloží svoje hlášky (slovenčina bez nej). */
export const hlavickaJazyka = (): Record<string, string> => (aktualny === 'sk' ? {} : { 'X-Jazyk': aktualny });

const dosad = (text: string, parametre?: Record<string, string | number | null | undefined>): string =>
  parametre ? text.replace(/\{(\w+)\}/g, (cele, kluc: string) => (kluc in parametre ? String(parametre[kluc] ?? '') : cele)) : text;

/** Preloží text (slovenský text je kľúčom). */
export const tr = (text: string, parametre?: Record<string, string | number | null | undefined>): string =>
  dosad(aktualny === 'sk' ? text : slovnik[text] ?? text, parametre);

/**
 * Text podľa počtu: trn(3, '{n} hlas', '{n} hlasy', '{n} hlasov') → „3 hlasy".
 * Slovenské tvary: 1 / 2-4 / 5 a viac. Čeština má rovnaké tri tvary,
 * angličtina dva (1 / ostatné) - v slovníku sú oddelené znakom |.
 */
export const trn = (
  pocet: number,
  jeden: string,
  dva: string,
  pat: string,
  parametre?: Record<string, string | number | null | undefined>
): string => {
  const hodnoty = { n: pocet, ...parametre };
  const kategoria = new Intl.PluralRules(lokalita()).select(pocet);
  if (aktualny === 'sk') {
    return dosad(kategoria === 'one' ? jeden : kategoria === 'few' ? dva : pat, hodnoty);
  }
  const preklad = slovnik[`${jeden}|${dva}|${pat}`];
  if (!preklad) return dosad(pocet === 1 ? jeden : pocet >= 2 && pocet <= 4 ? dva : pat, hodnoty);
  const tvary = preklad.split('|');
  const index = aktualny === 'en' ? (kategoria === 'one' ? 0 : 1) : kategoria === 'one' ? 0 : kategoria === 'few' ? 1 : 2;
  return dosad(tvary[Math.min(index, tvary.length - 1)], hodnoty);
};
