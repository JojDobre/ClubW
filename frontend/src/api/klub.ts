// Umiestnenie: frontend/src/api/klub.ts
// Volania API sekcie KLUB.

import api from '../app/apiKlient';
import type { Sponzor, Dokument, Anketa, Fanusik, KategoriaDokumentu, UrovenPartnerstva } from './typy';

/**
 * Vytvorí sadu volaní pre jednu entitu.
 * Všetky štyri majú rovnaký tvar operácií, preto ich generujeme.
 */
const operacie = <T>(cesta: string) => ({
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<T[]>(`/${cesta}`, { parametre: { limit: 300 }, signal }),

  vytvor: (udaje: Partial<T>) => api.vytvor<T>(`/${cesta}`, udaje),
  uprav: (id: number, udaje: Partial<T>) => api.uprav<T>(`/${cesta}/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/${cesta}/${id}`),
});

export const sponzoriApi = operacie<Sponzor>('sponsors');
export const urovneSponzorovApi = operacie<UrovenPartnerstva>('sponsor-levels');
export const dokumentyApi = operacie<Dokument>('documents');
export const kategorieDokumentovApi = operacie<KategoriaDokumentu>('document-categories');
export const anketyApi = operacie<Anketa>('polls');
export const fanusikoviaApi = operacie<Fanusik>('fans');
