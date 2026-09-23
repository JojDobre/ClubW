// Umiestnenie: frontend/src/api/formulare.ts
// Volania API pre formuláre a ich vyplnené odpovede.

import api from '../app/apiKlient';
import type { Formular, OdpovedFormulara } from './typy';

/** Udalosť, po ktorej bočné menu obnoví počet neprečítaných. */
export const UDALOST_FORMULARE = 'cw:formulare-zmena';
export const oznamZmenuFormularov = () => window.dispatchEvent(new Event(UDALOST_FORMULARE));

export const formulareApi = {
  vypis: (signal?: AbortSignal) => api.ziskaj<Formular[]>('/admin/forms', { signal }),
  detail: (id: number, signal?: AbortSignal) => api.ziskaj<Formular>(`/admin/forms/${id}`, { signal }),
  vytvor: (udaje: Partial<Formular>) => api.vytvor<Formular>('/admin/forms', udaje),
  uprav: (id: number, udaje: Partial<Formular>) => api.uprav<Formular>(`/admin/forms/${id}`, udaje),
  zmaz: (id: number) => api.zmaz(`/admin/forms/${id}`),

  odpovede: (id: number, signal?: AbortSignal) =>
    api.ziskaj<OdpovedFormulara[]>(`/admin/forms/${id}/responses`, { parametre: { limit: 500 }, signal }),
  oznac: (idOdpovede: number, precitane: boolean) =>
    api.ciastocne<OdpovedFormulara>(`/admin/forms/responses/${idOdpovede}/read`, { precitane }),
  zmazOdpoved: (idOdpovede: number) => api.zmaz(`/admin/forms/responses/${idOdpovede}`),
  pocetNeprecitanych: (signal?: AbortSignal) => api.ziskaj<number>('/admin/forms/unread-count', { signal }),
};
