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

  /**
   * Nahrá hlavný obrázok článku.
   *
   * Súbor skončí v /uploads/media/<rok>/<mesiac>/ a zaeviduje sa do Media
   * knižnice, takže sa dá neskôr použiť aj inde. Vracia cestu, ktorú
   * editor zapíše do poľa `obrazok`.
   */
  nahrajObrazok: async (subor: File): Promise<{ cesta: string; media_id?: number }> => {
    const telo = new FormData();
    // multer na serveri číta pole 'subory' (uploadMedia .array('subory'))
    telo.append('subory', subor);
    const odpoved = await api.vytvor<{ cesta?: string; filename?: string; media_id?: number }>(
      '/admin/articles/upload-image',
      telo
    );
    return { cesta: odpoved.cesta ?? odpoved.filename ?? '', media_id: odpoved.media_id };
  },
};

export const kategorieApi = {
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Kategoria[]>('/categories', { signal }),
};
