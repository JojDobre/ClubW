// Umiestnenie: frontend/src/web/bloky/typy.ts
// Bloky stránok - typy zdieľané administráciou a šablónami (@clubw/jadro).
// Rovnakú schému overuje server (backend/src/services/blokyStranky.ts).

export type TypBloku =
  | 'text'
  | 'nadpis'
  | 'casova_os'
  | 'osoby'
  | 'karty'
  | 'cisla'
  | 'obrazok_text'
  | 'galeria'
  | 'citat'
  | 'vyzva'
  | 'faq'
  | 'uspechy'
  | 'video'
  | 'mapa'
  | 'formular'
  | 'clanky'
  | 'zapasy'
  | 'partneri';

export type PozadieBloku = 'biele' | 'sive' | 'tmave';

/** Blok stránky: údaje bloku, pri zoznamových blokoch aj položky. */
export interface BlokStranky {
  id: string;
  typ: TypBloku | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  polozky?: Array<Record<string, any>>;
  pozadie?: PozadieBloku;
  skryty?: boolean;
}

/** Vlastné zobrazenie jedného typu bloku v šablóne. */
export type KomponentBloku = (props: { blok: BlokStranky }) => JSX.Element | null;
