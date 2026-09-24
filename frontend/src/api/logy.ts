// Umiestnenie: frontend/src/api/logy.ts
// Prehľad logov - všetky udalosti v administrácii s filtrovaním.

import api from '../app/apiKlient';
import type { AuditnyZaznam } from './typy';
import { tr } from '../i18n';

export interface ZaznamLogu extends AuditnyZaznam {
  pouzivatel: { id: number; meno: string } | null;
}

export interface FiltreLogov {
  akcia?: string;
  entita?: string;
  pouzivatel_id?: number;
  od?: string;
  do?: string;
  hladat?: string;
  limit?: number;
  offset?: number;
}

export interface MoznostiFiltraLogov {
  akcie: string[];
  entity: string[];
  pouzivatelia: Array<{ id: number; meno: string }>;
}

export const logyApi = {
  vypis: (filtre: FiltreLogov, signal?: AbortSignal) =>
    api.ziskajZoznam<ZaznamLogu>('/admin/logs', { parametre: filtre as any, signal }),
  moznosti: (signal?: AbortSignal) => api.ziskaj<MoznostiFiltraLogov>('/admin/logs/filters', { signal }),
};

/** Názvy akcií v administrácii. */
export const NAZVY_AKCII: Record<string, string> = {
  vytvorenie: tr('Vytvorenie'),
  uprava: tr('Úprava'),
  zmazanie: tr('Zmazanie'),
  anonymizacia: tr('Anonymizácia'),
  export_udajov: tr('Export údajov'),
  zmena_suhlasu: tr('Zmena súhlasu'),
  prihlasenie: tr('Prihlásenie'),
  zmena_hesla: tr('Zmena hesla'),
};

/** Čitateľný opis záznamu: „Článok #12" namiesto „PUT /api/admin/articles/12". */
export const opisZaznamu = (z: Pick<AuditnyZaznam, 'entita' | 'entita_id' | 'akcia'>): string =>
  z.akcia === 'prihlasenie' ? tr('Prihlásenie do administrácie') : `${tr(z.entita)}${z.entita_id ? ` #${z.entita_id}` : ''}`;
