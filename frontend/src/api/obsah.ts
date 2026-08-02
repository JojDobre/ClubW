// Umiestnenie: frontend/src/api/obsah.ts
// Volania API pre kategórie, stránky, galérie, realizačný tím
// a ligové tabuľky.

import api from '../app/apiKlient';
import type {
  Kategoria, Stranka, Galeria, ClenRealizacnehoTimu, RiadokTabulky, Liga,
} from './typy';

/**
 * Vybalí jeden záznam z odpovede.
 *
 * Backend vracia vytvorený záznam zabalený pod kľúčom podľa entity —
 * { category: {...} }, { page: {...} }, { galeria: {...} }. Bez rozbalenia
 * by obrazovka dostala obal namiesto samotného záznamu.
 */
const rozbalZaznam = <T>(odpoved: unknown): T => {
  if (odpoved && typeof odpoved === 'object' && !Array.isArray(odpoved)) {
    const hodnoty = Object.values(odpoved as Record<string, unknown>);
    // Ak objekt obsahuje práve jeden vnorený objekt, je to obal
    if (hodnoty.length === 1 && typeof hodnoty[0] === 'object' && hodnoty[0] !== null) {
      return hodnoty[0] as T;
    }
  }
  return odpoved as T;
};

/** Odstíni rozdiel medzi odpoveďou ako pole a ako objekt s poľom. */
const akoPole = <T>(odpoved: unknown, kluc?: string): T[] => {
  if (Array.isArray(odpoved)) return odpoved as T[];
  if (odpoved && typeof odpoved === 'object') {
    const o = odpoved as Record<string, unknown>;
    if (kluc && Array.isArray(o[kluc])) return o[kluc] as T[];
    const prve = Object.values(o).find(Array.isArray);
    if (prve) return prve as T[];
  }
  return [];
};

export const kategorieSpravaApi = {
  vypis: async (signal?: AbortSignal): Promise<Kategoria[]> =>
    akoPole<Kategoria>(await api.ziskaj('/categories', { signal }), 'categories'),

  vytvor: async (udaje: Partial<Kategoria>) =>
    rozbalZaznam<Kategoria>(await api.vytvor('/admin/categories', udaje)),
  uprav: async (id: number, udaje: Partial<Kategoria>) =>
    rozbalZaznam<Kategoria>(await api.uprav(`/admin/categories/${id}`, udaje)),
  zmaz: (id: number) => api.zmaz(`/admin/categories/${id}`),
};

export const strankyApi = {
  vypis: async (signal?: AbortSignal): Promise<Stranka[]> =>
    akoPole<Stranka>(
      await api.ziskaj('/admin/pages', { parametre: { limit: 200 }, signal }),
      'pages'
    ),

  detail: async (id: number, signal?: AbortSignal) =>
    rozbalZaznam<Stranka>(await api.ziskaj(`/admin/pages/${id}`, { signal })),

  vytvor: async (udaje: Partial<Stranka>) =>
    rozbalZaznam<Stranka>(await api.vytvor('/admin/pages', udaje)),
  uprav: async (id: number, udaje: Partial<Stranka>) =>
    rozbalZaznam<Stranka>(await api.uprav(`/admin/pages/${id}`, udaje)),
  zmaz: (id: number) => api.zmaz(`/admin/pages/${id}`),
};

export const galerieApi = {
  vypis: async (signal?: AbortSignal): Promise<Galeria[]> =>
    akoPole<Galeria>(
      await api.ziskaj('/galleries', { parametre: { limit: 200 }, signal }),
      'galerie'
    ),

  vytvor: async (udaje: Partial<Galeria>) =>
    rozbalZaznam<Galeria>(await api.vytvor('/admin/galleries', udaje)),
  uprav: async (id: number, udaje: Partial<Galeria>) =>
    rozbalZaznam<Galeria>(await api.uprav(`/admin/galleries/${id}`, udaje)),
  zmaz: (id: number) => api.zmaz(`/admin/galleries/${id}`),
};

export const realizacnyTimApi = {
  vypis: async (signal?: AbortSignal): Promise<ClenRealizacnehoTimu[]> =>
    akoPole<ClenRealizacnehoTimu>(
      await api.ziskaj('/staff', { parametre: { limit: 200 }, signal }),
      'staff'
    ),

  vytvor: (udaje: Partial<ClenRealizacnehoTimu>) =>
    api.vytvor<ClenRealizacnehoTimu>('/staff', udaje),
  uprav: (id: number, udaje: Partial<ClenRealizacnehoTimu>) =>
    api.uprav<ClenRealizacnehoTimu>(`/staff/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/staff/${id}`),
};

export const tabulkyApi = {
  /** Ligová tabuľka. */
  tabulka: async (ligaId: number, signal?: AbortSignal): Promise<RiadokTabulky[]> =>
    akoPole<RiadokTabulky>(await api.ziskaj(`/leagues/${ligaId}/table`, { signal })),

  /** Vynúti prepočet tabuľky zo zápasov. */
  prepocitaj: (ligaId: number) => api.vytvor(`/leagues/${ligaId}/table/recalculate`, {}),

  vytvorLigu: (udaje: Partial<Liga>) => api.vytvor<Liga>('/leagues', udaje),
  upravLigu: (id: number, udaje: Partial<Liga>) => api.uprav<Liga>(`/leagues/${id}`, udaje),
  zmazLigu: (id: number) => api.zmaz(`/leagues/${id}`),
};
