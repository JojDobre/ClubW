// Umiestnenie: frontend/src/api/menu.ts
// Menu verejného webu - položky, poradie a vnorenie.

import api from '../app/apiKlient';
import type { PolozkaMenuWebu, PresmerovanieOdkazu } from './typy';

export const menuApi = {
  /** Všetky položky vrátane skrytých, ploché aj ako strom. */
  vypis: (signal?: AbortSignal) =>
    api.ziskaj<{ strom: PolozkaMenuWebu[]; zoznam: PolozkaMenuWebu[] }>('/admin/menu', { signal }),
  vytvor: (udaje: Partial<PolozkaMenuWebu>) => api.vytvor<PolozkaMenuWebu>('/admin/menu', udaje),
  uprav: (id: number, udaje: Partial<PolozkaMenuWebu>) => api.uprav<PolozkaMenuWebu>(`/admin/menu/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/admin/menu/${id}`),
  /** Poradie a vnorenie viacerých položiek naraz. */
  poradie: (poradie: Array<{ id: number; poradie: number; rodic_id: number | null }>) =>
    api.ciastocne('/admin/menu/reorder', { poradie }),
};

export const presmerovaniaApi = {
  vypis: (signal?: AbortSignal) => api.ziskaj<PresmerovanieOdkazu[]>('/admin/redirects', { signal }),
  vytvor: (udaje: Partial<PresmerovanieOdkazu>) => api.vytvor<PresmerovanieOdkazu>('/admin/redirects', udaje),
  uprav: (id: number, udaje: Partial<PresmerovanieOdkazu>) => api.uprav<PresmerovanieOdkazu>(`/admin/redirects/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/admin/redirects/${id}`),
};
