// Umiestnenie: frontend/src/api/sport.ts
// Volania API pre zápasy, tímy, hráčov a ligy.

import api from '../app/apiKlient';
import type {
  Zapas, ZapasNaUlozenie, Tim, Hrac, Liga, Stadion, PolozkaArchivu, TypArchivu,
  StatistikyZapasu, UdalostNaUlozenie, HracZostavy, TextovaUdalost, UdalostKalendara,
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

  zostava: (id: number, signal?: AbortSignal) =>
    api.ziskaj<{ vsetky: HracZostavy[] }>(`/matches/${id}/lineup`, { signal }),
  /** Nahradí celú zostavu zápasu. */
  ulozZostavu: (id: number, zostava: HracZostavy[]) =>
    api.uprav(`/matches/${id}/lineup`, { zostava }),

  textoveUdalosti: (id: number, signal?: AbortSignal) =>
    api.ziskaj<TextovaUdalost[]>(`/matches/${id}/events`, { signal }),
  ulozTextoveUdalosti: (id: number, udalosti: TextovaUdalost[]) =>
    api.uprav(`/matches/${id}/events`, { udalosti }),
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
  detail: (id: number, signal?: AbortSignal) => api.ziskaj<Liga>(`/leagues/${id}`, { signal }),
};

export const stadionyApi = {
  vypis: (signal?: AbortSignal) => api.ziskaj<Stadion[]>('/stadiums', { signal }),
  vytvor: (udaje: Partial<Stadion>) => api.vytvor<Stadion>('/stadiums', udaje),
  uprav: (id: number, udaje: Partial<Stadion>) => api.uprav<Stadion>(`/stadiums/${id}`, udaje),
  /** Archivácia - štadión sa dá obnoviť v Archíve */
  zmaz: (id: number) => api.zmaz(`/stadiums/${id}`),
};

export const archivApi = {
  vypis: (signal?: AbortSignal) => api.ziskaj<PolozkaArchivu[]>('/admin/archive', { signal }),
  obnov: (typ: TypArchivu, id: number) => api.vytvor(`/admin/archive/${typ}/${id}/restore`, {}),
  zmazTrvalo: (typ: TypArchivu, id: number) => api.zmaz(`/admin/archive/${typ}/${id}`),
};

export const kalendarApi = {
  /** Výskyty udalostí v rozsahu - opakované udalosti rozvinie server. */
  udalosti: (od: string, doKedy: string, signal?: AbortSignal) =>
    api.ziskaj<UdalostKalendara[]>('/calendar/events', { parametre: { od, do: doKedy }, signal }),
  detail: (id: number) => api.ziskaj<UdalostKalendara>(`/calendar/events/${id}`),
  vytvor: (udaje: Partial<UdalostKalendara>) => api.vytvor<UdalostKalendara>('/calendar/events', udaje),
  uprav: (id: number, udaje: Partial<UdalostKalendara>) => api.uprav<UdalostKalendara>(`/calendar/events/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/calendar/events/${id}`),
};
