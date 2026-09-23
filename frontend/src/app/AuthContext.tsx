// Umiestnenie: frontend/src/context/AuthContext.tsx
// Prihlásenie a udržanie relácie.
//
// PREČO NANOVO: pôvodná administrácia držala token v localStorage a stav
// prihlásenia v App.tsx. Backend medzitým dostal obnovovacie tokeny
// (dlhodobé, uložené v databáze, dajú sa zrušiť), takže relácia už nekončí
// po 24 hodinách. Tento kontext to využíva.
//
// POZNÁMKA K ULOŽENIU TOKENU: backend nastavuje aj httpOnly cookies, ktoré
// sú voči XSS odolnejšie. Token držíme aj tu, lebo API služby ho posielajú
// v hlavičke Authorization. Ochranou proti XSS je sanitizácia obsahu
// na oboch stranách — bez nej by nepomohlo ani cookie.

import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { apiUrl } from '../config/api';
import { UDALOST_RELACIA_SKONCILA } from './apiKlient';

export type Rola = 'admin' | 'redaktor' | 'trener' | 'uzivatel';

export interface Pouzivatel {
  id: number;
  meno: string;
  email: string;
  rola: Rola;
  tim_id: number | null;
  posledne_prihlasenie?: string | null;
  priezvisko?: string | null;
  rola_id?: number | null;
  rola_nazov?: string;
  /** Oprávnenia roly po moduloch - posiela ich server */
  opravnenia?: Record<string, { citat?: boolean; pisat?: boolean; mazat?: boolean }>;
}

interface HodnotaKontextu {
  pouzivatel: Pouzivatel | null;
  /** Prebieha úvodné overenie uloženej relácie */
  nacitava: boolean;
  prihlaseny: boolean;
  prihlas: (email: string, heslo: string) => Promise<void>;
  odhlas: () => Promise<void>;
  /** Má používateľ aspoň jednu zo zadaných rolí? */
  maRolu: (...role: Rola[]) => boolean;
  /** Smie používateľ v module danú akciu? Správca smie všetko. */
  smie: (modul: string, akcia?: 'citat' | 'pisat' | 'mazat') => boolean;
}

const AuthContext = createContext<HodnotaKontextu | undefined>(undefined);

// Kľúče v úložisku prehliadača
const KLUC_TOKEN = 'clubw_token';
const KLUC_REFRESH = 'clubw_refresh';

/** Prečíta prístupový token. Používajú ho API služby. */
export const ziskajToken = (): string | null => localStorage.getItem(KLUC_TOKEN);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pouzivatel, setPouzivatel] = useState<Pouzivatel | null>(null);
  const [nacitava, setNacitava] = useState(true);

  /** Uloží dvojicu tokenov po prihlásení alebo obnovení. */
  const ulozTokeny = (token: string, refreshToken?: string) => {
    localStorage.setItem(KLUC_TOKEN, token);
    if (refreshToken) localStorage.setItem(KLUC_REFRESH, refreshToken);
  };

  const zmazTokeny = () => {
    localStorage.removeItem(KLUC_TOKEN);
    localStorage.removeItem(KLUC_REFRESH);
  };

  /**
   * Pokúsi sa obnoviť reláciu obnovovacím tokenom.
   * @returns true, ak sa relácia podarilo obnoviť
   */
  const skusObnovit = useCallback(async (): Promise<boolean> => {
    const refresh = localStorage.getItem(KLUC_REFRESH);
    if (!refresh) return false;

    try {
      const odpoved = await fetch(apiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!odpoved.ok) return false;

      const telo = await odpoved.json();
      if (!telo?.success) return false;

      ulozTokeny(telo.data.token, telo.data.refreshToken);
      setPouzivatel(telo.data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Overí uloženú reláciu pri načítaní aplikácie. */
  const overRelaciu = useCallback(async () => {
    const token = localStorage.getItem(KLUC_TOKEN);

    if (!token) {
      // Prístupový token chýba, ale obnovovací mohol prežiť
      await skusObnovit();
      setNacitava(false);
      return;
    }

    try {
      const odpoved = await fetch(apiUrl('/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (odpoved.ok) {
        const telo = await odpoved.json();
        setPouzivatel(telo.data);
      } else if (odpoved.status === 401) {
        // Prístupový token vypršal — skúsime ho obnoviť.
        // Bez tohto kroku by používateľa vyhodilo každých 24 hodín.
        const obnovene = await skusObnovit();
        if (!obnovene) zmazTokeny();
      }
    } catch {
      // Nedostupný server pri štarte nemá používateľa odhlásiť —
      // token necháme a skúsi sa znova pri ďalšej akcii
    } finally {
      setNacitava(false);
    }
  }, [skusObnovit]);

  useEffect(() => {
    void overRelaciu();
  }, [overRelaciu]);

  // Server reláciu odmietol (napr. po reštarte s novou databázou) -
  // odhlásime aj rozhranie, chránené cesty presmerujú na prihlásenie
  useEffect(() => {
    const skoncila = () => setPouzivatel(null);
    window.addEventListener(UDALOST_RELACIA_SKONCILA, skoncila);
    return () => window.removeEventListener(UDALOST_RELACIA_SKONCILA, skoncila);
  }, []);

  const prihlas = useCallback(async (email: string, heslo: string) => {
    const odpoved = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, heslo }),
    });

    const telo = await odpoved.json().catch(() => null);

    if (!odpoved.ok || !telo?.success) {
      // Hlášku berieme zo servera, ale nikdy neprezradíme,
      // či zlyhal e-mail alebo heslo
      throw new Error(telo?.message || 'Prihlásenie zlyhalo');
    }

    ulozTokeny(telo.data.token, telo.data.refreshToken);
    setPouzivatel(telo.data.user);
  }, []);

  const odhlas = useCallback(async () => {
    const refresh = localStorage.getItem(KLUC_REFRESH);

    try {
      // Zrušenie relácie na serveri, aby sa nedala obnoviť
      await fetch(apiUrl('/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: refresh }),
      });
    } catch {
      // Aj keď sa odhlásenie na serveri nepodarí, lokálne tokeny zmažeme
    }

    zmazTokeny();
    setPouzivatel(null);
  }, []);

  const smie = useCallback(
    (modul: string, akcia: 'citat' | 'pisat' | 'mazat' = 'citat') => {
      if (!pouzivatel) return false;
      if (pouzivatel.rola === 'admin') return true;
      if (pouzivatel.opravnenia) return Boolean(pouzivatel.opravnenia[modul]?.[akcia]);
      // Starší server bez oprávnení - podľa pevnej roly
      return akcia === 'citat' ? pouzivatel.rola !== 'uzivatel' : pouzivatel.rola === 'redaktor';
    },
    [pouzivatel]
  );

  const maRolu = useCallback(
    (...role: Rola[]) => (pouzivatel ? role.includes(pouzivatel.rola) : false),
    [pouzivatel]
  );

  return (
    <AuthContext.Provider
      value={{
        pouzivatel,
        nacitava,
        prihlaseny: pouzivatel !== null,
        prihlas,
        odhlas,
        maRolu,
        smie,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): HodnotaKontextu => {
  const kontext = useContext(AuthContext);
  if (!kontext) {
    throw new Error('useAuth sa musí volať vnútri <AuthProvider>');
  }
  return kontext;
};
