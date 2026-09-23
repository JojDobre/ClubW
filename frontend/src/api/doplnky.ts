// Umiestnenie: frontend/src/api/doplnky.ts
// Volania API pre komentáre, videá a turnaje.

import api from '../app/apiKlient';
import type { Komentar, Video, Turnaj, StavKomentara, ZisteneVideo } from './typy';

export const komentareApi = {
  /**
   * Výpis komentárov aj s počtami podľa stavu.
   * Počty používa administrácia vo filtračných tlačidlách.
   */
  vypis: async (
    stav?: StavKomentara | '',
    signal?: AbortSignal
  ): Promise<{ komentare: Komentar[]; pocty: Record<string, number> }> => {
    // Počty podľa stavu chodia vedľa `data`, preto berieme celú obálku
    const obalka = await api.ziskajObalku<Komentar[]>('/comments', {
      parametre: { stav: stav || undefined, limit: 300 },
      signal,
    });

    return {
      komentare: obalka.data ?? [],
      pocty: (obalka as any).pocty_stavov ?? {},
    };
  },

  zmenStav: (id: number, stav: StavKomentara) => api.uprav<Komentar>(`/comments/${id}`, { stav }),
  uprav: (id: number, udaje: Partial<Komentar>) => api.uprav<Komentar>(`/comments/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/comments/${id}`),
};

export const videaApi = {
  /** Administrácia potrebuje aj skryté videá (vsetky=1). */
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Video[]>('/videos', { parametre: { limit: 500, vsetky: 1 }, signal }),

  /** Názov, náhľad a dĺžka zistené priamo z videa. */
  zisti: (url: string, signal?: AbortSignal) =>
    api.ziskaj<ZisteneVideo>('/videos/zisti', { parametre: { url }, signal }),

  vytvor: (udaje: Partial<Video>) => api.vytvor<Video>('/videos', udaje),
  uprav: (id: number, udaje: Partial<Video>) => api.uprav<Video>(`/videos/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/videos/${id}`),
};

export const turnajeApi = {
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Turnaj[]>('/tournaments', { signal }),

  vytvor: (udaje: Partial<Turnaj>) => api.vytvor<Turnaj>('/tournaments', udaje),
  uprav: (id: number, udaje: Partial<Turnaj>) => api.uprav<Turnaj>(`/tournaments/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/tournaments/${id}`),
};
