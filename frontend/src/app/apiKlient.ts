// Umiestnenie: frontend/src/app/apiKlient.ts
// Spoločný klient pre volania API.
//
// PREČO VZNIKOL: pôvodných 38 služieb malo každá vlastné spracovanie chýb.
// Niektoré vracali null, iné vyhadzovali výnimku, ďalšie tichým zlyhaním
// nechali obrazovku prázdnu bez vysvetlenia. Tu je to na jednom mieste.
//
// ČO RIEŠI NAVYŠE:
//   - Automatické priloženie prihlasovacieho tokenu.
//   - Obnovenie vypršaného tokenu a zopakovanie požiadavky. Bez toho by
//     používateľovi po 24 hodinách zlyhala akcia, ktorú práve robil.
//   - Zrozumiteľné hlášky namiesto „Failed to fetch".

import { apiUrl } from '../config/api';
import type { Strankovanie } from '../api/typy';

/** Chyba z API s prístupom k stavovému kódu a podrobnostiam. */
export class ApiChyba extends Error {
  constructor(
    public readonly stav: number,
    sprava: string,
    /** Validačné chyby po jednotlivých poliach, ak ich server poslal */
    public readonly chybyPoli?: string[]
  ) {
    super(sprava);
    this.name = 'ApiChyba';
  }

  /** Vypršal prihlasovací token? */
  get jeNeprihlaseny(): boolean {
    return this.stav === 401;
  }

  /** Chýba oprávnenie (napríklad neplatná licencia alebo nízka rola)? */
  get jeZakazane(): boolean {
    return this.stav === 403;
  }
}

const KLUC_TOKEN = 'clubw_token';
const KLUC_REFRESH = 'clubw_refresh';

/**
 * Prebieha práve obnovenie tokenu?
 *
 * Keď obrazovka spustí niekoľko volaní naraz a token vypršal, všetky by
 * sa pokúsili obnoviť token súčasne. Prvé by uspelo, ostatné by dostali
 * už zrušený token a používateľa by odhlásilo. Preto ostatné čakajú
 * na výsledok prvého pokusu.
 */
let prebiehaObnova: Promise<boolean> | null = null;

const obnovToken = async (): Promise<boolean> => {
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

    localStorage.setItem(KLUC_TOKEN, telo.data.token);
    if (telo.data.refreshToken) {
      localStorage.setItem(KLUC_REFRESH, telo.data.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
};

const obnovTokenRaz = (): Promise<boolean> => {
  if (!prebiehaObnova) {
    prebiehaObnova = obnovToken().finally(() => {
      prebiehaObnova = null;
    });
  }
  return prebiehaObnova;
};

interface Moznosti {
  metoda?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Telo požiadavky — prevedie sa na JSON */
  telo?: unknown;
  /** Parametre v adrese. Prázdne a nedefinované hodnoty sa vynechajú. */
  parametre?: Record<string, string | number | boolean | undefined | null>;
  /** Vypne priloženie tokenu (pre verejné endpointy) */
  bezTokenu?: boolean;
  /** Prerušenie požiadavky pri odchode z obrazovky */
  signal?: AbortSignal;
}

/** Zloží adresu s parametrami. */
const sParametrami = (cesta: string, parametre?: Moznosti['parametre']): string => {
  if (!parametre) return cesta;

  const usporiadane = new URLSearchParams();
  for (const [kluc, hodnota] of Object.entries(parametre)) {
    // Prázdny filter nemá ísť do adresy — server by ho bral ako hodnotu
    if (hodnota === undefined || hodnota === null || hodnota === '') continue;
    usporiadane.set(kluc, String(hodnota));
  }

  const retazec = usporiadane.toString();
  return retazec ? `${cesta}?${retazec}` : cesta;
};

/**
 * Prevedie chyby zo servera na obyčajné reťazce.
 *
 * PREČO: express-validator posiela chyby ako objekty
 * { type, value, msg, path, location }, iné endpointy ako pole reťazcov.
 * Obrazovky ich vykresľujú priamo, takže pri objekte spadlo celé
 * vykreslenie na „Objects are not valid as a React child" - a používateľ
 * neuvidel ani tú chybu, ani nič iné. Prevod patrí sem, na jedno miesto,
 * nie do každej obrazovky zvlášť.
 */
const chybyNaText = (chyby: unknown): string[] | undefined => {
  if (!Array.isArray(chyby)) return undefined;

  const text = chyby
    .map((ch) => {
      if (typeof ch === 'string') return ch;
      if (ch && typeof ch === 'object') {
        const o = ch as Record<string, unknown>;
        // express-validator: msg je hláška, path názov poľa
        const hlaska = o.msg ?? o.message;
        if (typeof hlaska === 'string') {
          return typeof o.path === 'string' && o.path ? `${o.path}: ${hlaska}` : hlaska;
        }
      }
      return String(ch);
    })
    .filter((ch) => ch && ch !== 'undefined' && ch !== '[object Object]');

  return text.length > 0 ? text : undefined;
};

/**
 * Jednotná obálka odpovede z API.
 *
 * `data` je priamo tá vec, o ktorú ide - entita pri detaile, pole pri zozname.
 * `pagination` stojí vedľa nej, nie v nej, takže pri zoznamoch treba siahnuť
 * po celej obálke (`zavolajCele` / `api.ziskajZoznam`), nie len po `data`.
 */
export interface Obalka<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: unknown[];
  pagination?: Strankovanie;
}

/**
 * Zavolá API a vráti CELÚ obálku odpovede (aj so stránkovaním).
 *
 * @throws ApiChyba pri chybe servera alebo siete
 */
async function zavolajCele<T>(cesta: string, moznosti: Moznosti = {}, jePokusOZopakovanie = false): Promise<Obalka<T>> {
  const { metoda = 'GET', telo, parametre, bezTokenu, signal } = moznosti;

  // Pri nahrávaní súboru sa Content-Type NESMIE nastaviť ručne - prehliadač
  // ho musí doplniť aj s hranicou (boundary), inak server telo neprečíta.
  const jeSubor = typeof FormData !== 'undefined' && telo instanceof FormData;

  const hlavicky: Record<string, string> = {};
  if (telo !== undefined && !jeSubor) hlavicky['Content-Type'] = 'application/json';

  if (!bezTokenu) {
    const token = localStorage.getItem(KLUC_TOKEN);
    if (token) hlavicky.Authorization = `Bearer ${token}`;
  }

  let odpoved: Response;
  try {
    odpoved = await fetch(apiUrl(sParametrami(cesta, parametre)), {
      method: metoda,
      headers: hlavicky,
      credentials: 'include',
      body: telo === undefined ? undefined : jeSubor ? (telo as FormData) : JSON.stringify(telo),
      signal,
    });
  } catch (e: any) {
    // Prerušenie pri odchode z obrazovky nie je chyba, ktorú treba hlásiť
    if (e?.name === 'AbortError') throw e;

    throw new ApiChyba(
      0,
      'Server neodpovedá. Skontrolujte pripojenie k internetu.'
    );
  }

  // Vypršaný token skúsime obnoviť a požiadavku zopakovať.
  // Opakujeme len raz, aby nevznikol nekonečný kruh.
  if (odpoved.status === 401 && !bezTokenu && !jePokusOZopakovanie) {
    const obnovene = await obnovTokenRaz();
    if (obnovene) {
      return zavolajCele<T>(cesta, moznosti, true);
    }
  }

  // 204 znamená úspech bez obsahu (napríklad po zmazaní)
  if (odpoved.status === 204) {
    return { success: true, data: undefined as T };
  }

  const obsah = await odpoved.json().catch(() => null);

  if (!odpoved.ok || obsah?.success === false) {
    const sprava =
      obsah?.message ||
      (odpoved.status === 403
        ? 'Na túto akciu nemáte oprávnenie.'
        : odpoved.status === 404
          ? 'Záznam sa nenašiel.'
          : `Chyba servera (${odpoved.status})`);

    throw new ApiChyba(odpoved.status, sprava, chybyNaText(obsah?.errors));
  }

  // Endpointy vracajú užitočné údaje v poli data; niektoré (napríklad
  // generované CSS) vracajú obsah priamo
  if (obsah && typeof obsah === 'object' && 'data' in obsah) {
    return obsah as Obalka<T>;
  }

  return { success: true, data: obsah as T };
}

/**
 * Zavolá API a vráti obsah poľa `data` z odpovede.
 *
 * @throws ApiChyba pri chybe servera alebo siete
 */
async function zavolaj<T>(cesta: string, moznosti: Moznosti = {}): Promise<T> {
  const obalka = await zavolajCele<T>(cesta, moznosti);
  return obalka.data;
}

/** Zoznam aj so stránkovaním - to, čo obrazovke so stránkovaním treba. */
export interface Zoznam<T> {
  polozky: T[];
  strankovanie?: Strankovanie;
}

export const api = {
  ziskaj: <T>(cesta: string, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'GET' }),

  /**
   * Zavolá API a vráti CELÚ obálku odpovede.
   *
   * Treba ju tam, kde endpoint posiela popri `data` aj ďalšie údaje
   * (počty podľa stavu, filtre) - `ziskaj` vracia len `data`.
   */
  ziskajObalku: <T>(cesta: string, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolajCele<T>(cesta, { ...moznosti, metoda: 'GET' }),

  /**
   * Načíta zoznam aj so stránkovaním.
   *
   * Backend vracia stránkovanie vedľa `data`, nie v ňom, takže `ziskaj`
   * by ho zahodil.
   */
  ziskajZoznam: async <T>(
    cesta: string,
    moznosti?: Omit<Moznosti, 'metoda' | 'telo'>
  ): Promise<Zoznam<T>> => {
    const obalka = await zavolajCele<T[]>(cesta, { ...moznosti, metoda: 'GET' });
    return {
      polozky: Array.isArray(obalka.data) ? obalka.data : [],
      strankovanie: obalka.pagination,
    };
  },

  vytvor: <T>(cesta: string, telo: unknown, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'POST', telo }),

  uprav: <T>(cesta: string, telo: unknown, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'PUT', telo }),

  /** Čiastočná zmena (PATCH) - napr. nastavenie titulnej fotky. */
  ciastocne: <T>(cesta: string, telo: unknown = {}, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'PATCH', telo }),

  zmaz: <T = void>(cesta: string, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'DELETE' }),
};

export default api;
