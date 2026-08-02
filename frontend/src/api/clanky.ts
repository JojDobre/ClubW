// Umiestnenie: frontend/src/api/clanky.ts
// Volania API pre články a kategórie.

import api from '../app/apiKlient';
import type {
  ClanokVoVypise, Clanok, ClanokNaUlozenie, Kategoria, Strankovanie, StavClanku,
} from './typy';

interface OdpovedVypisu {
  articles: ClanokVoVypise[];
  pagination: Strankovanie;
}

export interface FiltreClankov {
  page?: number;
  limit?: number;
  search?: string;
  status?: StavClanku | '';
  kategoria_id?: number | '';
}

export const clankyApi = {
  /**
   * Výpis článkov pre administráciu — vrátane konceptov.
   *
   * @param filtre - stránkovanie a filtrovanie
   * @param signal - prerušenie pri odchode z obrazovky
   */
  vypis: (filtre: FiltreClankov = {}, signal?: AbortSignal) =>
    api.ziskaj<OdpovedVypisu>('/admin/articles', {
      parametre: {
        page: filtre.page,
        limit: filtre.limit,
        search: filtre.search,
        status: filtre.status,
        kategoria_id: filtre.kategoria_id,
      },
      signal,
    }),

  /** Detail článku na úpravu. */
  detail: (id: number, signal?: AbortSignal) =>
    api.ziskaj<{ article: Clanok } | Clanok>(`/admin/articles/${id}`, { signal }),

  vytvor: (udaje: ClanokNaUlozenie) =>
    api.vytvor<{ article: Clanok } | Clanok>('/admin/articles', udaje),

  uprav: (id: number, udaje: Partial<ClanokNaUlozenie>) =>
    api.uprav<{ article: Clanok } | Clanok>(`/admin/articles/${id}`, udaje),

  zmaz: (id: number) => api.zmaz(`/admin/articles/${id}`),
};

export const kategorieApi = {
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<{ categories: Kategoria[] } | Kategoria[]>('/categories', { signal }),
};

/**
 * Odpovede backendu sa v tvare líšia — niektoré vracajú { article: {...} },
 * iné objekt priamo. Táto funkcia rozdiel odstíni, aby ho obrazovky
 * nemuseli riešiť.
 */
export const rozbal = <T>(odpoved: T | Record<string, T>, kluc: string): T => {
  if (odpoved && typeof odpoved === 'object' && kluc in (odpoved as any)) {
    return (odpoved as any)[kluc];
  }
  return odpoved as T;
};
