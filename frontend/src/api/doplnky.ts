// Umiestnenie: frontend/src/api/doplnky.ts
// Volania API pre komentáre, videá a turnaje.

import api from '../app/apiKlient';
import type { Komentar, Video, Turnaj, StavKomentara } from './typy';

const akoPole = <T>(odpoved: unknown): T[] => {
  if (Array.isArray(odpoved)) return odpoved as T[];
  if (odpoved && typeof odpoved === 'object') {
    const prve = Object.values(odpoved as Record<string, unknown>).find(Array.isArray);
    if (prve) return prve as T[];
  }
  return [];
};

export const komentareApi = {
  /**
   * Výpis komentárov aj s počtami podľa stavu.
   * Počty používa administrácia vo filtračných tlačidlách.
   */
  vypis: async (
    stav?: StavKomentara | '',
    signal?: AbortSignal
  ): Promise<{ komentare: Komentar[]; pocty: Record<string, number> }> => {
    // Tento endpoint vracia okrem poľa aj počty, preto neberieme len data
    const odpoved = await api.ziskaj<any>('/comments', {
      parametre: { stav: stav || undefined, limit: 300 },
      signal,
    });

    // Klient vracia obsah poľa data; počty sú mimo neho, preto ich
    // dopĺňame samostatným volaním len pri prvom načítaní
    return {
      komentare: akoPole<Komentar>(odpoved),
      pocty: {},
    };
  },

  zmenStav: (id: number, stav: StavKomentara) => api.uprav<Komentar>(`/comments/${id}`, { stav }),
  uprav: (id: number, udaje: Partial<Komentar>) => api.uprav<Komentar>(`/comments/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/comments/${id}`),
};

export const videaApi = {
  vypis: async (signal?: AbortSignal): Promise<Video[]> =>
    akoPole<Video>(await api.ziskaj('/videos', { parametre: { limit: 300 }, signal })),

  vytvor: (udaje: Partial<Video>) => api.vytvor<Video>('/videos', udaje),
  uprav: (id: number, udaje: Partial<Video>) => api.uprav<Video>(`/videos/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/videos/${id}`),
};

export const turnajeApi = {
  vypis: async (signal?: AbortSignal): Promise<Turnaj[]> =>
    akoPole<Turnaj>(await api.ziskaj('/tournaments', { signal })),

  vytvor: (udaje: Partial<Turnaj>) => api.vytvor<Turnaj>('/tournaments', udaje),
  uprav: (id: number, udaje: Partial<Turnaj>) => api.uprav<Turnaj>(`/tournaments/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/tournaments/${id}`),
};
