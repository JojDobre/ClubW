// Umiestnenie: frontend/src/api/sablony.ts
// Šablóny verejného webu - zoznam, aktivácia, nahranie, nastavenia.

import api from '../app/apiKlient';

import type { BlokStranky } from '../web/bloky/typy';

export type TypNastaveniaSablony = 'farba' | 'text' | 'dlhy_text' | 'vyber' | 'prepinac' | 'obrazok' | 'cislo' | 'odkaz' | 'sekcie';
/** Typ „sekcie" má ako hodnotu zoznam blokov (vlastné sekcie úvodu). */
export type HodnotaNastaveniaSablony = string | number | boolean | null | BlokStranky[];

export interface NastavenieSablony {
  kluc: string;
  typ: TypNastaveniaSablony;
  menovka: string;
  napoveda?: string;
  /** Záložka v okne Prispôsobiť */
  skupina?: string;
  predvolene?: HodnotaNastaveniaSablony;
  moznosti?: Array<{ hodnota: string; popis: string }>;
  min?: number;
  max?: number;
  /** Typ „sekcie": miesta na úvode, kam sa dá sekcia vložiť */
  pozicie?: Array<{ hodnota: string; popis: string }>;
}

export interface SablonaWebu {
  slug: string;
  nazov: string;
  verzia: string | null;
  autor: string | null;
  web_autora: string | null;
  popis: string | null;
  /** Adresa obrázka náhľadu */
  nahlad: string | null;
  /** Dodaná so systémom - nedá sa zmazať */
  vstavana: boolean;
  aktivna: boolean;
  /** Šablóna mení aj časti webu (nie len štýl) */
  ma_skript: boolean;
  /** Poškodený balík - prečo sa nedá použiť */
  chyba: string | null;
  nastavenia: NastavenieSablony[];
  hodnoty: Record<string, HodnotaNastaveniaSablony>;
}

export const sablonyApi = {
  vypis: (signal?: AbortSignal) => api.ziskaj<SablonaWebu[]>('/admin/sablony', { signal }),
  aktivuj: (slug: string) => api.uprav<{ slug: string }>('/admin/sablony/aktivna', { slug }),
  ulozNastavenia: (slug: string, hodnoty: Record<string, HodnotaNastaveniaSablony>) =>
    api.uprav<Record<string, HodnotaNastaveniaSablony>>(`/admin/sablony/${encodeURIComponent(slug)}/nastavenia`, { hodnoty }),
  /** Nahrá balík .zip - novú šablónu alebo novšiu verziu existujúcej. */
  nahraj: (subor: File) => {
    const data = new FormData();
    data.append('subor', subor);
    return api.vytvor<{ slug: string; nazov: string; verzia: string; predchadzajuca_verzia: string | null }>(
      '/admin/sablony',
      data
    );
  },
  zmaz: (slug: string) => api.zmaz(`/admin/sablony/${encodeURIComponent(slug)}`),
};
