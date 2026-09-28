// Umiestnenie: frontend/src/api/eshop.ts
// Volania administrácie e-shopu: produkty, kategórie, doručenie, platby,
// nastavenia obchodu a objednávky.

import api, { type Zoznam } from '../app/apiKlient';
import { lokalita } from '../i18n';

export interface HodnotaVlastnosti {
  id: string;
  nazov: string;
  priplatok: number;
  sklad: number | null;
}

export interface VlastnostProduktu {
  id: string;
  nazov: string;
  typ: 'vyber' | 'text';
  povinna: boolean;
  hodnoty: HodnotaVlastnosti[];
  priplatok: number;
  max_dlzka: number | null;
}

export interface EshopKategoria {
  id: number;
  nazov: string;
  slug: string;
  popis: string | null;
  poradie: number;
  aktivity: boolean;
  pocet_produktov?: number;
}

export interface EshopProdukt {
  id: number;
  nazov: string;
  slug: string;
  kategoria_id: number | null;
  kategoria?: { id: number; nazov: string; slug: string } | null;
  kratky_popis: string | null;
  popis: string | null;
  cena: number;
  povodna_cena: number | null;
  obrazok: string | null;
  obrazky: string[];
  vlastnosti: VlastnostProduktu[];
  sklad: number | null;
  kod: string | null;
  odporucany: boolean;
  aktivny: boolean;
  poradie: number;
  vypredany: boolean;
  vytvoreny: string;
}

export interface EshopDorucenie {
  id: number;
  nazov: string;
  popis: string | null;
  cena: number;
  zadarmo_od: number | null;
  vyzaduje_adresu: boolean;
  aktivny: boolean;
  poradie: number;
}

export type TypPlatby = 'prevod' | 'dobierka' | 'hotovost' | 'brana' | 'ine';

export interface EshopPlatba {
  id: number;
  nazov: string;
  popis: string | null;
  typ: TypPlatby;
  poplatok: number;
  pokyny: string | null;
  brana_html: string | null;
  brana_kluc: string | null;
  dorucenia: number[];
  aktivny: boolean;
  poradie: number;
}

export interface NastaveniaEshopu {
  zapnuty: boolean;
  mena: string;
  email_objednavok: string | null;
  podmienky_url: string | null;
  text_potvrdenia: string | null;
  predvolena_krajina: string;
  minimalna_objednavka: number;
}

export type StavObjednavky = 'nova' | 'potvrdena' | 'pripravena' | 'odoslana' | 'vybavena' | 'zrusena';
export type StavPlatby = 'neuhradena' | 'uhradena' | 'vratena';

export interface PolozkaObjednavky {
  id: number;
  produkt_id: number | null;
  nazov: string;
  kod: string | null;
  vlastnosti: Array<{ vlastnost_id: string; nazov: string; hodnota: string; hodnota_id: string | null }>;
  cena_za_kus: number;
  pocet: number;
  spolu: number;
}

export interface EshopObjednavka {
  id: number;
  cislo: string;
  token: string;
  stav: StavObjednavky;
  stav_platby: StavPlatby;
  meno: string;
  email: string;
  telefon: string | null;
  ulica: string | null;
  mesto: string | null;
  psc: string | null;
  krajina: string | null;
  poznamka: string | null;
  dorucenie_nazov: string;
  dorucenie_cena: number;
  platba_nazov: string;
  platba_typ: TypPlatby;
  platba_poplatok: number;
  medzisucet: number;
  spolu: number;
  mena: string;
  variabilny_symbol: string;
  platba_referencia: string | null;
  uhradena: string | null;
  poznamka_interna: string | null;
  vytvorena: string;
  polozky?: PolozkaObjednavky[];
}

export interface ZoznamObjednavok extends Zoznam<EshopObjednavka> {
  pocty: Partial<Record<StavObjednavky, number>>;
  tentoMesiac: { spolu: number; pocet: number };
}

const crud = <T>(cesta: string) => ({
  vypis: (signal?: AbortSignal) => api.ziskaj<T[]>(`/admin/eshop/${cesta}`, { signal }),
  vytvor: (udaje: Partial<T>) => api.vytvor<T>(`/admin/eshop/${cesta}`, udaje),
  uprav: (id: number, udaje: Partial<T>) => api.uprav<T>(`/admin/eshop/${cesta}/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/admin/eshop/${cesta}/${id}`),
});

export const eshopKategorieApi = crud<EshopKategoria>('kategorie');
export const eshopDoruceniaApi = crud<EshopDorucenie>('dorucenia');

export const eshopPlatbyApi = {
  ...crud<EshopPlatba>('platby'),
  novyKluc: (id: number) => api.vytvor<EshopPlatba>(`/admin/eshop/platby/${id}/novy-kluc`, {}),
};

export const eshopProduktyApi = {
  ...crud<EshopProdukt>('produkty'),
  detail: (id: number, signal?: AbortSignal) => api.ziskaj<EshopProdukt>(`/admin/eshop/produkty/${id}`, { signal }),
};

export const eshopNastaveniaApi = {
  nacitaj: (signal?: AbortSignal) => api.ziskaj<NastaveniaEshopu>('/admin/eshop/nastavenia', { signal }),
  uloz: (udaje: Partial<NastaveniaEshopu>) => api.uprav<NastaveniaEshopu>('/admin/eshop/nastavenia', udaje),
};

export const eshopObjednavkyApi = {
  vypis: async (
    parametre: { stav?: string; stav_platby?: string; hladat?: string; page?: number; limit?: number },
    signal?: AbortSignal
  ): Promise<ZoznamObjednavok> => {
    const obalka = await api.ziskajObalku<EshopObjednavka[]>('/admin/eshop/objednavky', {
      parametre: Object.fromEntries(Object.entries(parametre).filter(([, h]) => h !== undefined && h !== '')) as Record<string, string | number>,
      signal,
    });
    const doplnky = obalka as unknown as { pocty_stavov?: ZoznamObjednavok['pocty']; tento_mesiac?: ZoznamObjednavok['tentoMesiac'] };
    return {
      polozky: Array.isArray(obalka.data) ? obalka.data : [],
      strankovanie: obalka.pagination,
      pocty: doplnky.pocty_stavov ?? {},
      tentoMesiac: doplnky.tento_mesiac ?? { spolu: 0, pocet: 0 },
    };
  },
  detail: (id: number, signal?: AbortSignal) => api.ziskaj<EshopObjednavka>(`/admin/eshop/objednavky/${id}`, { signal }),
  uprav: (
    id: number,
    udaje: { stav?: StavObjednavky; stav_platby?: StavPlatby; poznamka_interna?: string | null; upozornit_zakaznika?: boolean }
  ) => api.uprav<EshopObjednavka>(`/admin/eshop/objednavky/${id}`, udaje),
};

/** „49,90 €" - desatinná čiarka/bodka podľa jazyka administrácie */
export const cenaText = (suma: number | null | undefined, mena = 'EUR') =>
  `${Number(suma ?? 0).toLocaleString(lokalita(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${mena === 'EUR' ? '€' : mena}`;
