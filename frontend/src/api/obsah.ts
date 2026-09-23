// Umiestnenie: frontend/src/api/obsah.ts
// Volania API pre kategórie, stránky, galérie, realizačný tím
// a ligové tabuľky.

import api from '../app/apiKlient';
import type {
  Kategoria, Stranka, Galeria, GaleriaObrazok, ClenRealizacnehoTimu, RiadokTabulky, Liga,
} from './typy';

export const kategorieSpravaApi = {
  /** Administrátorský výpis - aj s počtom článkov v každej kategórii. */
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Kategoria[]>('/admin/categories', { signal }),

  vytvor: (udaje: Partial<Kategoria>) =>
    api.vytvor<Kategoria>('/admin/categories', udaje),
  uprav: (id: number, udaje: Partial<Kategoria>) =>
    api.uprav<Kategoria>(`/admin/categories/${id}`, udaje),
  /**
   * Zmaže kategóriu. Ak obsahuje články, treba povedať, kam ich presunúť -
   * článok bez kategórie existovať nemôže.
   */
  zmaz: (id: number, presunutDo?: number | null) =>
    api.zmaz(`/admin/categories/${id}`, {
      parametre: presunutDo ? { presunut_do: presunutDo } : undefined,
    }),
};

export const strankyApi = {
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Stranka[]>('/admin/pages', { parametre: { limit: 200 }, signal }),

  detail: (id: number, signal?: AbortSignal) =>
    api.ziskaj<Stranka>(`/admin/pages/${id}`, { signal }),

  /** Náhľad stránky aj keď ešte nie je publikovaná. */
  nahlad: (id: number, signal?: AbortSignal) =>
    api.ziskaj<{ page: Stranka; nahlad: boolean; publikovana: boolean }>(
      `/admin/pages/${id}/nahlad`,
      { signal }
    ),

  vytvor: (udaje: Partial<Stranka>) =>
    api.vytvor<Stranka>('/admin/pages', udaje),
  uprav: (id: number, udaje: Partial<Stranka>) =>
    api.uprav<Stranka>(`/admin/pages/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/admin/pages/${id}`),
};

export const galerieApi = {
  /**
   * Administrátorský výpis - aj skryté galérie. Server vracia najviac 50
   * na stránku, tak dočítame všetky.
   */
  vypis: async (signal?: AbortSignal): Promise<Galeria[]> => {
    const vsetky: Galeria[] = [];
    for (let strana = 1; strana <= 40; strana++) {
      const { polozky, strankovanie } = await api.ziskajZoznam<Galeria>('/admin/galleries', {
        parametre: { limit: 50, page: strana },
        signal,
      });
      vsetky.push(...polozky);
      if (!strankovanie?.has_next) break;
    }
    return vsetky;
  },

  detail: (id: number, signal?: AbortSignal) =>
    api.ziskaj<Galeria>(`/admin/galleries/${id}`, { signal }),

  vytvor: (udaje: Partial<Galeria>) =>
    api.vytvor<Galeria>('/admin/galleries', udaje),
  uprav: (id: number, udaje: Partial<Galeria>) =>
    api.uprav<Galeria>(`/admin/galleries/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/admin/galleries/${id}`),

  /** Všetky fotky galérie v poradí. */
  obrazky: async (id: number, signal?: AbortSignal): Promise<GaleriaObrazok[]> => {
    const odpoved = await api.ziskaj<{ obrazky: GaleriaObrazok[] }>(`/admin/galleries/${id}/images`, {
      parametre: { limit: 500 },
      signal,
    });
    return odpoved?.obrazky ?? [];
  },

  /** Nahrá fotky - skončia v /uploads/galerie/<rok>/<galéria>/ a v Media knižnici. */
  nahraj: (id: number, subory: File[]) => {
    const telo = new FormData();
    subory.forEach((s) => telo.append('images', s));
    return api.vytvor<unknown>(`/admin/galleries/${id}/images`, telo);
  },

  /** Pridá do galérie fotky, ktoré už sú v Media knižnici. */
  pridajZKniznice: (id: number, mediaIds: number[]) =>
    api.vytvor<unknown>(`/admin/galleries/${id}/images/from-media`, { media_ids: mediaIds }),

  upravObrazok: (galeriaId: number, obrazokId: number, udaje: { popis?: string | null; nazov?: string | null }) =>
    api.uprav<GaleriaObrazok>(`/admin/galleries/${galeriaId}/images/${obrazokId}`, udaje),

  zmazObrazok: (galeriaId: number, obrazokId: number) =>
    api.zmaz(`/admin/galleries/${galeriaId}/images/${obrazokId}`),

  nastavTitulny: (galeriaId: number, obrazokId: number) =>
    api.ciastocne<unknown>(`/admin/galleries/${galeriaId}/images/${obrazokId}/cover`),
};

export const realizacnyTimApi = {
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<ClenRealizacnehoTimu[]>('/staff', { parametre: { limit: 200 }, signal }),

  vytvor: (udaje: Partial<ClenRealizacnehoTimu>) =>
    api.vytvor<ClenRealizacnehoTimu>('/staff', udaje),
  uprav: (id: number, udaje: Partial<ClenRealizacnehoTimu>) =>
    api.uprav<ClenRealizacnehoTimu>(`/staff/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/staff/${id}`),
};

export const tabulkyApi = {
  /** Ligová tabuľka. */
  tabulka: (ligaId: number, signal?: AbortSignal) =>
    api.ziskaj<RiadokTabulky[]>(`/leagues/${ligaId}/table`, { signal }),

  /** Vynúti prepočet tabuľky zo zápasov. */
  prepocitaj: (ligaId: number) => api.vytvor(`/leagues/${ligaId}/table/recalculate`, {}),

  vytvorLigu: (udaje: Partial<Liga>) => api.vytvor<Liga>('/leagues', udaje),
  upravLigu: (id: number, udaje: Partial<Liga>) => api.uprav<Liga>(`/leagues/${id}`, udaje),
  zmazLigu: (id: number) => api.zmaz(`/leagues/${id}`),
};
