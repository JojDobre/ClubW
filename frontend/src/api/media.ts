// Umiestnenie: frontend/src/api/media.ts
// Volania API pre Media knižnicu.

import api from '../app/apiKlient';
import type { MediaSubor } from './typy';

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
};
