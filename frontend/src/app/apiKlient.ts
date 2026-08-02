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
 * Zavolá API a vráti obsah poľa `data` z odpovede.
 *
 * @throws ApiChyba pri chybe servera alebo siete
 */
async function zavolaj<T>(cesta: string, moznosti: Moznosti = {}, jePokusOZopakovanie = false): Promise<T> {
  const { metoda = 'GET', telo, parametre, bezTokenu, signal } = moznosti;

  const hlavicky: Record<string, string> = {};
  if (telo !== undefined) hlavicky['Content-Type'] = 'application/json';

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
      body: telo !== undefined ? JSON.stringify(telo) : undefined,
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
      return zavolaj<T>(cesta, moznosti, true);
    }
  }

  // 204 znamená úspech bez obsahu (napríklad po zmazaní)
  if (odpoved.status === 204) {
    return undefined as T;
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

    throw new ApiChyba(odpoved.status, sprava, obsah?.errors);
  }

  // Endpointy vracajú užitočné údaje v poli data; niektoré (napríklad
  // generované CSS) vracajú obsah priamo
  return (obsah?.data !== undefined ? obsah.data : obsah) as T;
}

export const api = {
  ziskaj: <T>(cesta: string, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'GET' }),

  vytvor: <T>(cesta: string, telo: unknown, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'POST', telo }),

  uprav: <T>(cesta: string, telo: unknown, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'PUT', telo }),

  zmaz: <T = void>(cesta: string, moznosti?: Omit<Moznosti, 'metoda' | 'telo'>) =>
    zavolaj<T>(cesta, { ...moznosti, metoda: 'DELETE' }),
};

export default api;
