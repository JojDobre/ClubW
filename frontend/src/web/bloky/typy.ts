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
  | 'partneri'
  | 'tlacidla'
  | 'podmenu'
  | 'tabulka'
  | 'stlpce'
  | 'kroky'
  | 'vyhody'
  | 'cennik'
  | 'oddelovac'
  | 'kontakt'
  | 'stadion'
  | 'registracia'
  | 'dve_percenta';

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
  /** Vlastná sekcia úvodu šablóny: miesto na stránke (pozícia z manifestu) */
  pozicia?: string;
}

/** Vlastné zobrazenie jedného typu bloku v šablóne (bloky = všetky viditeľné bloky stránky, napr. pre podmenu). */
export type KomponentBloku = (props: { blok: BlokStranky; bloky: BlokStranky[] }) => JSX.Element | null;

/** Kotva bloku na stránke (odkaz z podmenu). */
export const kotvaBloku = (b: Pick<BlokStranky, 'id'>) => `blok-${b.id}`;
