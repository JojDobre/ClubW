// Umiestnenie: backend/src/services/registracia.ts
//
// Nastavenia verejnej registrácie fanúšikov a členov klubu (stĺpec
// nastavenia_klubu.nastavenia_registracie). Prázdny text znamená
// predvolený text webu - ten sa prekladá do jazyka návštevníka.

import { sanitizePlainText } from '../utils/sanitize';

export type TypRegistracie = 'fanusik' | 'clen';
export type RezimPola = 'vypnute' | 'volitelne' | 'povinne';

export const POLIA_REGISTRACIE = ['telefon', 'datum_narodenia', 'adresa', 'sprava'] as const;
export type PoleRegistracie = (typeof POLIA_REGISTRACIE)[number];

export const TEXTY_REGISTRACIE = [
  'nadpis', 'uvod', 'fanusik_nazov', 'fanusik_popis', 'clen_nazov', 'clen_popis',
  'tlacidlo_fanusik', 'tlacidlo_clen', 'hotovo_fanusik', 'hotovo_clen', 'suhlas_oznamy', 'vyhody_nadpis',
] as const;
export type TextRegistracie = (typeof TEXTY_REGISTRACIE)[number];

export interface NastaveniaRegistracie {
  /** Ktoré typy registrácie web ponúka (aspoň jeden) */
  typy: Record<TypRegistracie, boolean>;
  /** Voliteľné polia formulára; len_clen = pole sa ukáže len pri členstve */
  polia: Record<PoleRegistracie, { rezim: RezimPola; len_clen: boolean }>;
  texty: Record<TextRegistracie, string>;
  /** Výhody vedľa formulára; prázdne = výhody zo šablóny */
  vyhody: Array<{ nadpis: string; text: string }>;
}

const PREDVOLENE_POLIA: NastaveniaRegistracie['polia'] = {
  telefon: { rezim: 'volitelne', len_clen: false },
  datum_narodenia: { rezim: 'volitelne', len_clen: true },
  adresa: { rezim: 'volitelne', len_clen: true },
  sprava: { rezim: 'volitelne', len_clen: false },
};

const MAX_TEXTU: Record<TextRegistracie, number> = {
  nadpis: 120, uvod: 600, fanusik_nazov: 60, fanusik_popis: 160, clen_nazov: 60, clen_popis: 160,
  tlacidlo_fanusik: 60, tlacidlo_clen: 60, hotovo_fanusik: 300, hotovo_clen: 300, suhlas_oznamy: 200, vyhody_nadpis: 120,
};

const text = (v: unknown, max: number) => sanitizePlainText(String(v ?? '')).trim().slice(0, max);

/** Uložené nastavenia doplnené o predvolené hodnoty (bezpečné aj pre starý alebo poškodený obsah). */
export const nastaveniaRegistracie = (ulozene: unknown): NastaveniaRegistracie => {
  const v = (ulozene && typeof ulozene === 'object' ? ulozene : {}) as Record<string, any>;
  const typy = {
    fanusik: v.typy?.fanusik !== false,
    clen: v.typy?.clen !== false,
  };
  if (!typy.fanusik && !typy.clen) typy.fanusik = true;
  const polia = {} as NastaveniaRegistracie['polia'];
  for (const pole of POLIA_REGISTRACIE) {
    const p = v.polia?.[pole] ?? {};
    const rezim: RezimPola = ['vypnute', 'volitelne', 'povinne'].includes(p.rezim) ? p.rezim : PREDVOLENE_POLIA[pole].rezim;
    polia[pole] = { rezim, len_clen: typeof p.len_clen === 'boolean' ? p.len_clen : PREDVOLENE_POLIA[pole].len_clen };
  }
  const texty = {} as NastaveniaRegistracie['texty'];
  for (const k of TEXTY_REGISTRACIE) texty[k] = text(v.texty?.[k], MAX_TEXTU[k]);
  const vyhody = (Array.isArray(v.vyhody) ? v.vyhody : [])
    .slice(0, 6)
    .map((x: any) => ({ nadpis: text(x?.nadpis, 80), text: text(x?.text, 240) }))
    .filter((x: { nadpis: string }) => x.nadpis);
  return { typy, polia, texty, vyhody };
};

/** Overí nastavenia od správcu pred uložením. */
export const ocistiNastaveniaRegistracie = (v: unknown): { data?: NastaveniaRegistracie; chyba?: string } => {
  const vstup = (v && typeof v === 'object' ? v : {}) as Record<string, any>;
  if (vstup.typy && vstup.typy.fanusik === false && vstup.typy.clen === false) {
    return { chyba: 'Povoľte aspoň jeden typ registrácie (fanúšik alebo člen klubu)' };
  }
  return { data: nastaveniaRegistracie(vstup) };
};

/** Smie sa pole ukázať pri danom type registrácie? */
export const poleJeAktivne = (n: NastaveniaRegistracie, pole: PoleRegistracie, typ: TypRegistracie) =>
  n.polia[pole].rezim !== 'vypnute' && (!n.polia[pole].len_clen || typ === 'clen');
