// Umiestnenie: frontend/src/api/clanky.ts
// Volania API pre články a kategórie.

import api from '../app/apiKlient';
import type {
  ClanokVoVypise, Clanok, ClanokNaUlozenie, Kategoria, Strankovanie, StavClanku,
} from './typy';

/** Výpis článkov aj so stránkovaním. */
export interface VypisClankov {
  polozky: ClanokVoVypise[];
  strankovanie?: Strankovanie;
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
  vypis: (filtre: FiltreClankov = {}, signal?: AbortSignal): Promise<VypisClankov> =>
    api.ziskajZoznam<ClanokVoVypise>('/admin/articles', {
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
    api.ziskaj<Clanok>(`/admin/articles/${id}`, { signal }),

  vytvor: (udaje: ClanokNaUlozenie) =>
    api.vytvor<Clanok>('/admin/articles', udaje),

  uprav: (id: number, udaje: Partial<ClanokNaUlozenie>) =>
    api.uprav<Clanok>(`/admin/articles/${id}`, udaje),

  zmaz: (id: number) => api.zmaz(`/admin/articles/${id}`),
};

export const kategorieApi = {
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Kategoria[]>('/categories', { signal }),
};
