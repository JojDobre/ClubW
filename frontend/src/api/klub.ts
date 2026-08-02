// Umiestnenie: frontend/src/api/klub.ts
// Volania API sekcie KLUB.

import api from '../app/apiKlient';
import type { Sponzor, Dokument, Anketa, Fanusik } from './typy';

/** Odstíni rozdiel medzi odpoveďou ako pole a ako objekt s poľom. */
const akoPole = <T>(odpoved: unknown): T[] => {
  if (Array.isArray(odpoved)) return odpoved as T[];
  if (odpoved && typeof odpoved === 'object') {
    const prve = Object.values(odpoved as Record<string, unknown>).find(Array.isArray);
    if (prve) return prve as T[];
  }
  return [];
};

/**
 * Vytvorí sadu volaní pre jednu entitu.
 * Všetky štyri majú rovnaký tvar operácií, preto ich generujeme.
 */
const operacie = <T>(cesta: string) => ({
  vypis: async (signal?: AbortSignal): Promise<T[]> =>
    akoPole<T>(await api.ziskaj(`/${cesta}`, { parametre: { limit: 300 }, signal })),

  vytvor: (udaje: Partial<T>) => api.vytvor<T>(`/${cesta}`, udaje),
  uprav: (id: number, udaje: Partial<T>) => api.uprav<T>(`/${cesta}/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/${cesta}/${id}`),
});

export const sponzoriApi = operacie<Sponzor>('sponsors');
export const dokumentyApi = operacie<Dokument>('documents');
export const anketyApi = operacie<Anketa>('polls');
export const fanusikoviaApi = operacie<Fanusik>('fans');
