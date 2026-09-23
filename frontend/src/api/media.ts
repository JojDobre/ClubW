// Umiestnenie: frontend/src/api/media.ts
// Volania API pre Media knižnicu.

import api from '../app/apiKlient';
import type { MediaSubor, MediaDetail } from './typy';

export interface FiltreMedii {
  typ?: 'obrazok' | 'dokument' | 'ine';
  hladat?: string;
  limit?: number;
  offset?: number;
}

export const mediaApi = {
  /** Súbory v knižnici, najnovšie prvé. */
  vypis: (filtre: FiltreMedii = {}, signal?: AbortSignal) =>
    api.ziskajZoznam<MediaSubor>('/admin/media', {
      parametre: {
        typ: filtre.typ,
        hladat: filtre.hladat,
        limit: filtre.limit ?? 60,
        offset: filtre.offset ?? 0,
      },
      signal,
    }),

  /** Nahrá súbory do knižnice (pole "subory"), vráti uložené záznamy. */
  nahraj: (subory: File[]) => {
    const data = new FormData();
    subory.forEach((f) => data.append('subory', f));
    return api.vytvor<MediaSubor[]>('/admin/media/upload', data);
  },

  /** Detail súboru aj s miestami použitia. */
  detail: (id: number, signal?: AbortSignal) => api.ziskaj<MediaDetail>(`/admin/media/${id}`, { signal }),

  /** Názov, alt text a popis. Samotný súbor sa nemení. */
  uprav: (id: number, udaje: { nazov?: string; alt_text?: string | null; popis?: string | null }) =>
    api.uprav<MediaSubor>(`/admin/media/${id}`, udaje),

  /** Zmazanie (len administrátor). Použitý súbor vyžaduje vynutenie. */
  zmaz: (id: number, vynutit = false) =>
    api.zmaz(`/admin/media/${id}`, { parametre: vynutit ? { force: 'true' } : undefined }),
};
