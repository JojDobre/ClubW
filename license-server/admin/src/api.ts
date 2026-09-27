// Umiestnenie: license-server/admin/src/api.ts
// Volania API administrácie. Relácia je v HttpOnly cookie, každá zmena
// posiela hlavičku X-Poziadavka (ochrana pred CSRF).

export class ChybaApi extends Error {
  constructor(sprava: string, public stav: number, public telo: any = null) {
    super(sprava);
  }
}

/** Po vypršaní relácie aplikácia prejde na prihlásenie. */
export const UDALOST_ODHLASENIA = 'clubw-odhlaseny';

export interface Odpoved<T> {
  success: boolean;
  data: T;
  message?: string;
  strankovanie?: { celkom: number; strana: number; stran: number };
  [kluc: string]: unknown;
}

export const volaj = async <T,>(metoda: 'GET' | 'POST' | 'PUT' | 'DELETE', cesta: string, telo?: unknown, signal?: AbortSignal): Promise<Odpoved<T>> => {
  const odpoved = await fetch(`/api/sprava${cesta}`, {
    method: metoda,
    headers: { 'Content-Type': 'application/json', 'X-Poziadavka': '1' },
    credentials: 'same-origin',
    body: telo === undefined ? undefined : JSON.stringify(telo),
    signal,
  });
  const json = await odpoved.json().catch(() => null);
  if (!odpoved.ok || !json?.success) {
    if (odpoved.status === 401 && cesta !== '/prihlasenie') window.dispatchEvent(new Event(UDALOST_ODHLASENIA));
    throw new ChybaApi(json?.message || `Chyba servera (${odpoved.status})`, odpoved.status, json);
  }
  return json as Odpoved<T>;
};

export const api = {
  get: <T,>(cesta: string, signal?: AbortSignal) => volaj<T>('GET', cesta, undefined, signal),
  post: <T,>(cesta: string, telo: unknown = {}) => volaj<T>('POST', cesta, telo),
  put: <T,>(cesta: string, telo: unknown) => volaj<T>('PUT', cesta, telo),
  delete: <T,>(cesta: string) => volaj<T>('DELETE', cesta),
};

/** Parametre adresy bez prázdnych hodnôt. */
export const parametre = (hodnoty: Record<string, string | number | boolean | null | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(hodnoty)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

// ===== Typy =====

export interface Plan {
  kod: string;
  nazov: string;
  mesiacov: number;
  funkcie: string[];
}

export interface Verzia {
  id: number;
  produkt_id: number;
  verzia: string;
  tag: string;
  nazov: string | null;
  poznamky: string | null;
  publikovana: string | null;
  predbezna: boolean;
  zdroj: 'release' | 'tag' | 'rucne';
  balik_stav: 'ziadny' | 'pripravuje' | 'pripraveny' | 'chyba';
  balik_sha256: string | null;
  balik_velkost: number | null;
  balik_chyba: string | null;
  aktualna?: boolean;
  instalacii?: number;
}

export interface Produkt {
  id: number;
  kod: string;
  nazov: string;
  popis: string | null;
  github_repo: string | null;
  plany: Plan[];
  aktualna_verzia_id: number | null;
  aktualna_verzia?: Verzia | null;
  minimalna_verzia: string | null;
  aktivny: boolean;
  licencie?: Record<string, number>;
}

export type StavLicencie = 'aktivna' | 'vyprsana' | 'pozastavena' | 'zrusena';

export interface Licencia {
  id: number;
  kluc: string;
  produkt_id: number;
  produkt?: { id: number; kod: string; nazov: string; plany?: Plan[]; github_repo?: string | null };
  nazov_klienta: string;
  email_klienta: string;
  domena: string | null;
  plan: string;
  funkcie: string[];
  platna_od: string;
  platna_do: string;
  stav: 'aktivna' | 'pozastavena' | 'zrusena';
  vypocitany_stav: StavLicencie;
  dni_do_vyprsania: number;
  poznamka: string | null;
  posledna_kontrola: string | null;
  pocet_kontrol: number;
  nainstalovana_verzia: string | null;
  posledna_ip: string | null;
  instalacia: Record<string, string | number | boolean | null> | null;
  automaticke_aktualizacie: boolean;
  pripnuta_verzia_id: number | null;
  pripnuta_verzia?: Verzia | null;
  online: boolean;
  vytvoreny: string;
}

export interface Prikaz {
  id: number;
  licencia_id: number;
  typ: string;
  stav: 'caka' | 'prevzaty' | 'prebieha' | 'hotovo' | 'chyba' | 'zruseny';
  sprava: string | null;
  vytvoreny: string;
  prevzaty: string | null;
  dokonceny: string | null;
  verzia?: { id: number; verzia: string; tag: string } | null;
  vytvoril?: { id: number; meno: string } | null;
  licencia?: { id: number; nazov_klienta: string; domena: string | null; nainstalovana_verzia: string | null };
}

export interface Udalost {
  id: number;
  typ: string;
  popis: string;
  detaily: Record<string, unknown> | null;
  ip: string | null;
  vytvorena: string;
  administrator?: { id: number; meno: string } | null;
  licencia?: { id: number; nazov_klienta: string } | null;
  licencia_id: number | null;
}

export interface Administrator {
  id: number;
  email: string;
  meno: string;
  totp_aktivne: boolean;
  aktivny: boolean;
  posledne_prihlasenie: string | null;
  vytvoreny: string;
}
