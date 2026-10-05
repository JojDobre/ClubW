// Umiestnenie: frontend/src/web/fanusik.ts
// Účet fanúšika na webe (Môj klub): prihlásenie, profil, výhody.
//
// Token je v localStorage pod vlastným kľúčom - s prihlásením do
// administrácie nemá nič spoločné. Všetky komponenty, ktoré používajú
// useFanusik(), sa pri prihlásení alebo odhlásení prekreslia naraz.

import { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';

export type TypClenstvaFanusika = 'fanusik' | 'clen' | 'vip' | 'cestny';

export interface ProfilFanusika {
  id: number;
  meno: string;
  priezvisko: string;
  email: string;
  telefon: string | null;
  adresa: string | null;
  datum_narodenia: string | null;
  typ_clenstva: TypClenstvaFanusika;
  /** aktivny | ziadost (čaká na schválenie) | zamietnuty */
  stav: string;
  /** Schválené a nevypršané členstvo */
  platne: boolean;
  cislo_karty: string | null;
  clenstvo_od: string | null;
  clenstvo_do: string | null;
  /** Kód do QR kódu karty (len pri platnom členstve) */
  overovaci_kod: string | null;
  suhlas_oznamy: boolean;
}

export interface VyhodaClena {
  id: number;
  nazov: string;
  popis: string | null;
  obrazok: string | null;
  kod: string | null;
  odkaz: string | null;
  platne_do: string | null;
  partner: { nazov: string; logo: string | null; web: string | null } | null;
}

export interface OverenieKarty {
  platne: boolean;
  meno: string;
  typ_clenstva: TypClenstvaFanusika;
  cislo_karty: string | null;
  clenstvo_do: string | null;
}

export const NAZVY_CLENSTVA: Record<TypClenstvaFanusika, string> = {
  fanusik: 'Fanúšik',
  clen: 'Člen klubu',
  vip: 'VIP člen',
  cestny: 'Čestný člen',
};

const KLUC = 'clubw_fan_token';
const UDALOST = 'clubw:fanusik';

const citajToken = (): string | null => {
  try {
    return localStorage.getItem(KLUC);
  } catch {
    return null;
  }
};

const ulozToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(KLUC, token);
    else localStorage.removeItem(KLUC);
  } catch {
    /* súkromné okno - prihlásenie vydrží len do obnovenia stránky */
  }
  stav = { ...stav, token, fanusik: token ? stav.fanusik : null };
  window.dispatchEvent(new Event(UDALOST));
};

/** Volanie API fanúšika; pri chybe vyhodí Error so správou servera. */
export const apiFanusika = async <T = unknown>(cesta: string, metoda = 'GET', telo?: unknown): Promise<{ data: T; message?: string; meta?: any }> => {
  const token = citajToken();
  const odpoved = await fetch(apiUrl(`/fan${cesta}`), {
    method: metoda,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: telo === undefined ? undefined : JSON.stringify(telo),
  });
  const json = await odpoved.json().catch(() => null);
  if (odpoved.status === 401 && token && cesta !== '/prihlasenie') ulozToken(null);
  if (!odpoved.ok || !json?.success) throw new Error(json?.message || 'Niečo sa nepodarilo. Skúste to znova.');
  return json;
};

// ===== Spoločný stav prihlásenia =====

let stav: { token: string | null; fanusik: ProfilFanusika | null; nacitava: boolean } = {
  token: typeof window === 'undefined' ? null : citajToken(),
  fanusik: null,
  nacitava: false,
};
let nacitavanie: Promise<void> | null = null;

const nastavStav = (zmena: Partial<typeof stav>) => {
  stav = { ...stav, ...zmena };
  window.dispatchEvent(new Event(UDALOST));
};

/** Načíta profil prihláseného fanúšika (raz pre všetky komponenty). */
const nacitajProfil = (): Promise<void> => {
  if (!stav.token) return Promise.resolve();
  nacitavanie ??= (async () => {
    nastavStav({ nacitava: true });
    try {
      const { data } = await apiFanusika<ProfilFanusika>('/ja');
      nastavStav({ fanusik: data });
    } catch {
      /* neplatný token - apiFanusika ho už zahodil */
    } finally {
      nastavStav({ nacitava: false });
      nacitavanie = null;
    }
  })();
  return nacitavanie;
};

/** Prihlási fanúšika; pri chybe vyhodí Error so správou pre návštevníka. */
export const prihlasFanusika = async (email: string, heslo: string): Promise<ProfilFanusika> => {
  const { data } = await apiFanusika<{ token: string; fanusik: ProfilFanusika }>('/prihlasenie', 'POST', { email, heslo });
  ulozToken(data.token);
  nastavStav({ fanusik: data.fanusik });
  return data.fanusik;
};

/** Prevezme token (po nastavení hesla z odkazu) a načíta profil. */
export const prevezmiPrihlasenie = (token: string, fanusik?: ProfilFanusika) => {
  ulozToken(token);
  if (fanusik) nastavStav({ fanusik });
  else void nacitajProfil();
};

export const odhlasFanusika = () => ulozToken(null);

/** Profil po úprave (aby ho videli všetky komponenty). */
export const aktualizujProfil = (fanusik: ProfilFanusika) => nastavStav({ fanusik });

/**
 * Prihlásený fanúšik pre šablóny: { fanusik, prihlaseny, nacitava, odhlas }.
 * fanusik je null, kým sa profil načítava alebo keď nie je nikto prihlásený.
 */
export const useFanusik = () => {
  const [, prekresli] = useState(0);
  useEffect(() => {
    const zmena = () => prekresli((n) => n + 1);
    window.addEventListener(UDALOST, zmena);
    // Prihlásenie alebo odhlásenie v inej karte prehliadača
    const ulozisko = (e: StorageEvent) => {
      if (e.key !== KLUC) return;
      stav = { ...stav, token: e.newValue, fanusik: null };
      void nacitajProfil();
      zmena();
    };
    window.addEventListener('storage', ulozisko);
    if (stav.token && !stav.fanusik) void nacitajProfil();
    return () => {
      window.removeEventListener(UDALOST, zmena);
      window.removeEventListener('storage', ulozisko);
    };
  }, []);
  return {
    fanusik: stav.fanusik,
    prihlaseny: Boolean(stav.token),
    nacitava: stav.nacitava || (Boolean(stav.token) && !stav.fanusik),
    odhlas: odhlasFanusika,
  };
};
