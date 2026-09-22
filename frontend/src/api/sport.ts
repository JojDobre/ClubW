// Umiestnenie: frontend/src/api/sport.ts
// Volania API pre zápasy, tímy, hráčov a ligy.

import api from '../app/apiKlient';
import type {
  Zapas, ZapasNaUlozenie, Tim, Hrac, Liga,
  StatistikyZapasu, UdalostNaUlozenie,
} from './typy';

export const zapasyApi = {
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Zapas[]>('/matches', { parametre: { limit: 500 }, signal }),

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
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Tim[]>('/teams', { parametre: { limit: 200 }, signal }),

  vytvor: (udaje: Partial<Tim>) => api.vytvor<Tim>('/teams', udaje),
  uprav: (id: number, udaje: Partial<Tim>) => api.uprav<Tim>(`/teams/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/teams/${id}`),
};

export const hraciApi = {
  vypis: (timId?: number, signal?: AbortSignal) =>
    api.ziskaj<Hrac[]>('/players', { parametre: { limit: 500, tim_id: timId }, signal }),

  vytvor: (udaje: Partial<Hrac>) => api.vytvor<Hrac>('/players', udaje),
  uprav: (id: number, udaje: Partial<Hrac>) => api.uprav<Hrac>(`/players/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/players/${id}`),
};

export const ligyApi = {
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<Liga[]>('/leagues', { parametre: { limit: 200 }, signal }),
};
