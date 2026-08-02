// Umiestnenie: frontend/src/api/sport.ts
// Volania API pre zápasy, tímy, hráčov a ligy.

import api from '../app/apiKlient';
import type {
  Zapas, ZapasNaUlozenie, Tim, Hrac, Liga,
  StatistikyZapasu, UdalostNaUlozenie,
} from './typy';

/**
 * Odpovede prichádzajú raz ako pole, raz ako objekt s poľom vnútri.
 * Táto funkcia rozdiel odstíni na jednom mieste.
 */
const akoPole = <T>(odpoved: unknown, kluc?: string): T[] => {
  if (Array.isArray(odpoved)) return odpoved as T[];
  if (odpoved && typeof odpoved === 'object') {
    const o = odpoved as Record<string, unknown>;
    if (kluc && Array.isArray(o[kluc])) return o[kluc] as T[];
    // Prvé pole, ktoré v objekte nájdeme
    const prve = Object.values(o).find(Array.isArray);
    if (prve) return prve as T[];
  }
  return [];
};

export const zapasyApi = {
  vypis: async (signal?: AbortSignal): Promise<Zapas[]> =>
    akoPole<Zapas>(await api.ziskaj('/matches', { parametre: { limit: 500 }, signal }), 'matches'),

  detail: (id: number, signal?: AbortSignal) =>
    api.ziskaj<Zapas>(`/matches/${id}`, { signal }),

  vytvor: (udaje: ZapasNaUlozenie) => api.vytvor<Zapas>('/matches', udaje),

  /** Čiastočná úprava — posielame len zmenené polia. */
  uprav: (id: number, udaje: ZapasNaUlozenie) => api.uprav<Zapas>(`/matches/${id}`, udaje),

  zmaz: (id: number) => api.zmaz(`/matches/${id}`),

  statistiky: (id: number, signal?: AbortSignal) =>
    api.ziskaj<StatistikyZapasu>(`/matches/${id}/statistics`, { signal, bezTokenu: true }),

  /** Nastaví štatistiky zápasu — nahradí predchádzajúce. */
  ulozStatistiky: (id: number, statistiky: UdalostNaUlozenie[]) =>
    api.uprav(`/matches/${id}/statistics`, { statistiky }),
};

export const timyApi = {
  vypis: async (signal?: AbortSignal): Promise<Tim[]> =>
    akoPole<Tim>(await api.ziskaj('/teams', { parametre: { limit: 200 }, signal }), 'teams'),

  vytvor: (udaje: Partial<Tim>) => api.vytvor<Tim>('/teams', udaje),
  uprav: (id: number, udaje: Partial<Tim>) => api.uprav<Tim>(`/teams/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/teams/${id}`),
};

export const hraciApi = {
  vypis: async (timId?: number, signal?: AbortSignal): Promise<Hrac[]> =>
    akoPole<Hrac>(
      await api.ziskaj('/players', { parametre: { limit: 500, tim_id: timId }, signal }),
      'players'
    ),

  vytvor: (udaje: Partial<Hrac>) => api.vytvor<Hrac>('/players', udaje),
  uprav: (id: number, udaje: Partial<Hrac>) => api.uprav<Hrac>(`/players/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/players/${id}`),
};

export const ligyApi = {
  vypis: async (signal?: AbortSignal): Promise<Liga[]> =>
    akoPole<Liga>(await api.ziskaj('/leagues', { parametre: { limit: 200 }, signal }), 'leagues'),
};
