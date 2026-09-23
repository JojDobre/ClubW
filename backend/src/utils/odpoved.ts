/**
 * Jednotný tvar API odpovedí.
 *
 * Úspech:
 *   { success: true, data: <užitočné dáta>, message?: string, pagination?: {...} }
 *
 * Chyba:
 *   { success: false, message: string, errors?: unknown[], debug?: string }
 *
 * `errors` nesie chyby validácie vstupu - to, čo má používateľ opraviť.
 * `debug` nesie interný detail chyby a posiela sa LEN v developmente.
 *
 * Pravidlá:
 *  - `data` je priamo tá vec, o ktorú ide: entita pri detaile, pole pri zozname.
 *    Nikdy to nie je obálka s jedným kľúčom (žiadne `data.page`, `data.article`).
 *  - Ak odpoveď naozaj nesie viac rovnocenných častí (napr. liga + tabuľka),
 *    `data` je objekt s pomenovanými kľúčmi. To je výnimka, nie pravidlo.
 *  - `pagination` je súrodenec `data`, nie jeho súčasť. Frontend ho tak vie
 *    čítať rovnako pre všetky zoznamy.
 */

import { Response } from 'express';

export interface Strankovanie {
  total: number;
  limit: number;
  offset: number;
  pages: number;
  current_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface MoznostiOdpovede {
  message?: string;
  pagination?: Strankovanie | Record<string, unknown>;
  status?: number;
  /** Ďalšie údaje, ktoré patria vedľa `data` (napr. filtre použité pri výbere). */
  extra?: Record<string, unknown>;
}

/**
 * Zostaví stránkovanie z celkového počtu a parametrov výberu.
 */
export const zostavStrankovanie = (
  total: number,
  limit: number,
  offset: number
): Strankovanie => {
  const bezpecnyLimit = limit > 0 ? limit : 1;
  return {
    total,
    limit,
    offset,
    pages: Math.ceil(total / bezpecnyLimit),
    current_page: Math.floor(offset / bezpecnyLimit) + 1,
    has_next: offset + bezpecnyLimit < total,
    has_prev: offset > 0,
  };
};

/**
 * Úspešná odpoveď.
 */
export const odpovedOk = <T>(
  res: Response,
  data: T,
  moznosti: MoznostiOdpovede = {}
): Response => {
  const telo: Record<string, unknown> = { success: true };

  if (moznosti.message) {
    telo.message = moznosti.message;
  }

  telo.data = data;

  if (moznosti.pagination) {
    telo.pagination = moznosti.pagination;
  }

  if (moznosti.extra) {
    Object.assign(telo, moznosti.extra);
  }

  return res.status(moznosti.status ?? 200).json(telo);
};

/**
 * Úspešne vytvorený záznam (201).
 */
export const odpovedVytvorene = <T>(
  res: Response,
  data: T,
  message?: string
): Response => odpovedOk(res, data, { message, status: 201 });

/**
 * Chybová odpoveď.
 */
export const odpovedChyba = (
  res: Response,
  status: number,
  message: string,
  errors?: unknown[],
  /** Interný detail chyby - odošle sa len v developmente. */
  detail?: unknown
): Response => {
  const telo: Record<string, unknown> = { success: false, message };
  if (errors && errors.length > 0) {
    telo.errors = errors;
  }
  if (detail !== undefined && process.env.NODE_ENV === 'development') {
    telo.debug = detail instanceof Error ? detail.message : String(detail);
  }
  return res.status(status).json(telo);
};

/**
 * Ak ide o chybu validácie databázového modelu (neplatná hodnota,
 * porušený cudzí kľúč, duplicita), odpovie 400/409 so zrozumiteľnou
 * hláškou a vráti true. Inak nechá odpoveď na volajúcom (500).
 *
 * Bez toho končili neplatné vstupy chybou servera 500.
 */
export const odpovedzNaChybuModelu = (chyba: any, res: Response): boolean => {
  const nazov = chyba?.name;

  if (nazov === 'SequelizeValidationError') {
    const spravy: string[] = (chyba.errors ?? []).map((e: any) => e.message);
    res.status(400).json({ success: false, message: spravy[0] || 'Neplatné údaje', errors: spravy });
    return true;
  }
  if (nazov === 'SequelizeUniqueConstraintError') {
    res.status(409).json({ success: false, message: 'Taký záznam už existuje' });
    return true;
  }
  if (nazov === 'SequelizeForeignKeyConstraintError') {
    res.status(400).json({ success: false, message: 'Odkaz na neexistujúci záznam (tím, sezóna, štadión…)' });
    return true;
  }
  if (nazov === 'SequelizeDatabaseError' && /invalid input syntax|out of range/i.test(String(chyba.message))) {
    res.status(400).json({ success: false, message: 'Neplatná hodnota niektorého poľa' });
    return true;
  }
  return false;
};
