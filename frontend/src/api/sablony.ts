// Umiestnenie: frontend/src/api/sablony.ts
// Šablóny verejného webu - zoznam, aktivácia, nahranie, nastavenia.

import api from '../app/apiKlient';
import { jazyk } from '../i18n';

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
  /** Vlastné preklady šablóny: { en: { "slovenský text": "preklad" } } */
  preklady?: Record<string, Record<string, string>>;
  hodnoty: Record<string, HodnotaNastaveniaSablony>;
}

/**
 * Preloží texty šablóny (menovky, skupiny, nápovedy, možnosti, popis) do
 * jazyka administrácie. Prednosť majú preklady priamo zo šablóny, potom
 * spoločný slovník vstavaných šablón (src/i18n/sablony), inak ostane
 * slovenský originál.
 */
export const prelozSablony = async (sablony: SablonaWebu[]): Promise<SablonaWebu[]> => {
  const j = jazyk();
  if (j === 'sk') return sablony;
  let spolocny: Record<string, string> = {};
  try {
    spolocny = (await import(`../i18n/sablony/${j}.json`)).default;
  } catch {
    /* slovník chýba - ostanú originály */
  }
  return sablony.map((s) => {
    const vlastny = s.preklady?.[j] ?? {};
    const p = <T extends string | null | undefined>(text: T): T => (text ? ((vlastny[text] ?? spolocny[text] ?? text) as T) : text);
    return {
      ...s,
      popis: p(s.popis),
      nastavenia: s.nastavenia.map((n) => ({
        ...n,
        menovka: p(n.menovka),
        skupina: p(n.skupina),
        napoveda: p(n.napoveda),
        moznosti: n.moznosti?.map((m) => ({ ...m, popis: p(m.popis) })),
        pozicie: n.pozicie?.map((m) => ({ ...m, popis: p(m.popis) })),
      })),
    };
  });
};

export const sablonyApi = {
  vypis: async (signal?: AbortSignal) => prelozSablony(await api.ziskaj<SablonaWebu[]>('/admin/sablony', { signal })),
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
