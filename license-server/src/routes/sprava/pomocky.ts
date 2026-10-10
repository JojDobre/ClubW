// Umiestnenie: license-server/src/routes/sprava/pomocky.ts
// Pomôcky pre endpointy administrácie: overenie vstupov, stránkovanie,
// zachytenie chýb v asynchrónnych obsluhách.

import { Request, Response, NextFunction, RequestHandler } from 'express';

/** Asynchrónna obsluha - chyba skončí v spoločnom spracovaní chýb. */
export const a =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export class ChybaVstupu extends Error {
  constructor(sprava: string, public stav = 400) {
    super(sprava);
  }
}

/** Text zo vstupu: orezaný, s maximálnou dĺžkou; prázdny = null. */
export const text = (hodnota: unknown, max: number, pole: string, povinne = false): string | null => {
  if (hodnota === undefined || hodnota === null || (typeof hodnota === 'string' && hodnota.trim() === '')) {
    if (povinne) throw new ChybaVstupu(`${pole} je povinné`);
    return null;
  }
  if (typeof hodnota !== 'string') throw new ChybaVstupu(`${pole} musí byť text`);
  const orezany = hodnota.trim();
  if (orezany.length > max) throw new ChybaVstupu(`${pole} môže mať najviac ${max} znakov`);
  return orezany;
};

export const email = (hodnota: unknown, pole = 'E-mail'): string => {
  const e = text(hodnota, 200, pole, true)!.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ChybaVstupu(`${pole} nemá správny tvar`);
  return e;
};

/** Doména bez protokolu, cesty a www (klub.sk). Prázdna = licencia neviazaná na doménu. */
export const domena = (hodnota: unknown): string | null => {
  const d = text(hodnota, 200, 'Doména');
  if (!d) return null;
  const cista = d.toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/^www\./, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$|^localhost$/.test(cista)) throw new ChybaVstupu('Doména nemá správny tvar (napr. klub.sk)');
  return cista;
};

export const datum = (hodnota: unknown, pole: string): Date | null => {
  if (hodnota === undefined || hodnota === null || hodnota === '') return null;
  const d = new Date(String(hodnota));
  if (Number.isNaN(d.getTime())) throw new ChybaVstupu(`${pole} nie je platný dátum`);
  return d;
};

export const cislo = (hodnota: unknown, pole: string, min: number, max: number): number => {
  const n = Number(hodnota);
  if (!Number.isInteger(n) || n < min || n > max) throw new ChybaVstupu(`${pole} musí byť celé číslo ${min} až ${max}`);
  return n;
};

/**
 * Zoznam kódov (funkcie plánu a licencie), napríklad sablony:vsetky alebo
 * sablona:arena. Neplatná položka vráti chybu - potichu zahodená funkcia
 * by sa po uložení len stratila.
 */
export const zoznamTextov = (hodnota: unknown, pole: string): string[] => {
  if (hodnota === undefined || hodnota === null) return [];
  if (!Array.isArray(hodnota) || hodnota.length > 100) throw new ChybaVstupu(`${pole} musí byť zoznam`);
  const polozky = hodnota.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  const neplatne = polozky.filter((x) => !/^[a-z0-9][a-z0-9_:.-]{0,59}$/.test(x));
  if (neplatne.length) {
    throw new ChybaVstupu(`${pole}: neplatná hodnota ${neplatne.join(', ')} (povolené sú písmená, číslice a znaky : . _ -)`);
  }
  return [...new Set(polozky)];
};

export const strankovanie = (req: Request, predvolene = 50) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || predvolene, 1), 200);
  const strana = Math.max(Number(req.query.strana) || 1, 1);
  return { limit, offset: (strana - 1) * limit, strana };
};

export const ip = (req: Request) => req.ip ?? null;
