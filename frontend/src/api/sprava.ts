// Umiestnenie: frontend/src/api/sprava.ts
// Volania API pre systémové obrazovky: používatelia, licencia,
// nastavenia, sezóny a ochrana údajov.

import api from '../app/apiKlient';
import type {
  Pouzivatel, StavLicencie, NastaveniaAdmin, Sezona, ZaznamSupisky,
  PrehladSuhlasov, AuditnyZaznam, DruhSuhlasu, Hrac,
} from './typy';

/** Odstíni rozdiel medzi odpoveďou ako pole a ako objekt s poľom. */
const akoPole = <T>(odpoved: unknown, kluc?: string): T[] => {
  if (Array.isArray(odpoved)) return odpoved as T[];
  if (odpoved && typeof odpoved === 'object') {
    const o = odpoved as Record<string, unknown>;
    if (kluc && Array.isArray(o[kluc])) return o[kluc] as T[];
    const prve = Object.values(o).find(Array.isArray);
    if (prve) return prve as T[];
  }
  return [];
};

export const pouzivateliaApi = {
  vypis: async (signal?: AbortSignal): Promise<Pouzivatel[]> =>
    akoPole<Pouzivatel>(await api.ziskaj('/users', { parametre: { limit: 200 }, signal }), 'users'),

  vytvor: (udaje: Partial<Pouzivatel> & { heslo: string }) =>
    api.vytvor<Pouzivatel>('/users', udaje),

  uprav: (id: number, udaje: Partial<Pouzivatel> & { heslo?: string }) =>
    api.uprav<Pouzivatel>(`/users/${id}`, udaje),

  zmaz: (id: number) => api.zmaz(`/users/${id}`),
};

export const licenciaApi = {
  stav: (signal?: AbortSignal) => api.ziskaj<StavLicencie>('/license/status', { signal }),
};

export const nastaveniaApi = {
  /** Kompletné nastavenia vrátane prevádzkových údajov. */
  detail: (signal?: AbortSignal) => api.ziskaj<NastaveniaAdmin>('/admin/settings', { signal }),

  uloz: (udaje: Partial<NastaveniaAdmin>) =>
    api.uprav<NastaveniaAdmin>('/admin/settings', udaje),
};

export const sezonyApi = {
  vypis: async (signal?: AbortSignal): Promise<Sezona[]> =>
    akoPole<Sezona>(await api.ziskaj('/seasons', { signal, bezTokenu: true })),

  aktualna: (signal?: AbortSignal) =>
    api.ziskaj<Sezona>('/seasons/current', { signal, bezTokenu: true }),

  vytvor: (udaje: { nazov: string; zaciatok?: string | null; koniec?: string | null }) =>
    api.vytvor<Sezona>('/admin/seasons', udaje),

  uprav: (id: number, udaje: Partial<Sezona>) =>
    api.uprav<Sezona>(`/admin/seasons/${id}`, udaje),

  nastavAktualnu: (id: number) => api.vytvor<Sezona>(`/admin/seasons/${id}/set-current`, {}),

  zmaz: (id: number) => api.zmaz(`/admin/seasons/${id}`),

  /** Súpiska tímu pre danú sezónu. */
  supiska: async (timId: number, sezonaId?: number, signal?: AbortSignal): Promise<ZaznamSupisky[]> =>
    akoPole<ZaznamSupisky>(
      await api.ziskaj(`/teams/${timId}/roster`, {
        parametre: { sezona_id: sezonaId },
        signal,
        bezTokenu: true,
      })
    ),

  /** História pôsobenia hráča po sezónach. */
  historiaHraca: async (hracId: number, signal?: AbortSignal): Promise<ZaznamSupisky[]> =>
    akoPole<ZaznamSupisky>(
      await api.ziskaj(`/players/${hracId}/history`, { signal, bezTokenu: true })
    ),

  zapisNaSupisku: (udaje: {
    sezona_id: number;
    tim_id: number;
    hrac_id: number;
    cislo_dresu?: number | null;
    pozicia?: string | null;
    kapitan?: boolean;
  }) => api.vytvor<ZaznamSupisky>('/admin/rosters', udaje),

  zmazZoSupisky: (id: number) => api.zmaz(`/admin/rosters/${id}`),
};

export const gdprApi = {
  suhlasy: (hracId: number, signal?: AbortSignal) =>
    api.ziskaj<PrehladSuhlasov>(`/admin/players/${hracId}/consents`, { signal }),

  nastavSuhlas: (
    hracId: number,
    udaje: {
      druh: DruhSuhlasu;
      udeleny: boolean;
      udelil_meno?: string;
      udelil_vztah?: string;
      udelil_email?: string;
      zdroj?: string;
      platny_do?: string | null;
    }
  ) => api.uprav(`/admin/players/${hracId}/consents`, udaje),

  export: (hracId: number) => api.ziskaj<unknown>(`/admin/players/${hracId}/export`),

  anonymizuj: (hracId: number) =>
    api.vytvor(`/admin/players/${hracId}/anonymize`, { potvrdenie: 'ANONYMIZOVAT' }),

  audit: async (
    filtre: { entita?: string; akcia?: string; entita_id?: number; limit?: number } = {},
    signal?: AbortSignal
  ): Promise<AuditnyZaznam[]> =>
    akoPole<AuditnyZaznam>(
      await api.ziskaj('/admin/gdpr/audit', { parametre: filtre as any, signal })
    ),

  retencia: (signal?: AbortSignal) =>
    api.ziskaj<{
      doba_uchovavania_rokov: number;
      hranica: string;
      na_posudenie: Array<Pick<Hrac, 'id' | 'meno' | 'priezvisko'>>;
      pocet_na_posudenie: number;
      vyprsane_suhlasy: number;
    }>('/admin/gdpr/retention', { signal }),
};
