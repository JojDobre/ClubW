// Umiestnenie: frontend/src/api/logy.ts
// Prehľad logov - všetky udalosti v administrácii s filtrovaním.

import api from '../app/apiKlient';
import type { AuditnyZaznam } from './typy';

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
  vytvorenie: 'Vytvorenie',
  uprava: 'Úprava',
  zmazanie: 'Zmazanie',
  anonymizacia: 'Anonymizácia',
  export_udajov: 'Export údajov',
  zmena_suhlasu: 'Zmena súhlasu',
  prihlasenie: 'Prihlásenie',
  zmena_hesla: 'Zmena hesla',
};

/** Čitateľný opis záznamu: „Článok #12" namiesto „PUT /api/admin/articles/12". */
export const opisZaznamu = (z: Pick<AuditnyZaznam, 'entita' | 'entita_id' | 'akcia'>): string =>
  z.akcia === 'prihlasenie' ? 'Prihlásenie do administrácie' : `${z.entita}${z.entita_id ? ` #${z.entita_id}` : ''}`;
