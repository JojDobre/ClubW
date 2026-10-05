// Umiestnenie: frontend/e2e/spolocne.ts
// Spoločné pomôcky testov v prehliadači: prihlásenie cez API, sledovanie
// chýb na stránke a kontroly rozloženia.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect, type Page } from '@playwright/test';

const TU = path.dirname(fileURLToPath(import.meta.url));

export const API = (process.env.E2E_API || 'http://127.0.0.1:3000').replace(/\/$/, '');
export const SUBOR_PRIHLASENIA = path.join(TU, '.prihlasenie.json');
export const SUBOR_STAVU_ADMINA = path.join(TU, '.stav-admina.json');

/** Token správcu z prípravy (e2e/priprava.ts). */
export const token = (): string => JSON.parse(fs.readFileSync(SUBOR_PRIHLASENIA, 'utf8')).token;

export const zavolajApi = async (metoda: string, cesta: string, telo?: unknown) => {
  const r = await fetch(API + cesta, {
    method: metoda,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: telo === undefined ? undefined : JSON.stringify(telo),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok || json.success === false) throw new Error(`${metoda} ${cesta} → ${r.status} ${json.message ?? ''}`);
  return json.data;
};

/** Šablóny dodané so systémom (priečinky so sablona.json). */
export const vstavaneSablony = (): string[] => {
  const koren = path.resolve(TU, '../../sablony');
  return fs
    .readdirSync(koren)
    .filter((s) => fs.existsSync(path.join(koren, s, 'sablona.json')))
    .sort();
};

/**
 * Zbiera chyby stránky: nezachytené výnimky a console.error. Zlyhané
 * načítanie zdroja (písma z Google Fonts, obrázky mimo siete) chybou nie je.
 */
export const sledujChyby = (page: Page): string[] => {
  const chyby: string[] = [];
  page.on('pageerror', (e) => chyby.push(`výnimka: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/Failed to load resource|ERR_|net::/i.test(text)) return;
    chyby.push(`konzola: ${text.slice(0, 300)}`);
  });
  return chyby;
};

/** Stránka nepreteká do strán a tabuľky tímov majú viditeľný posledný stĺpec. */
export const skontrolujRozlozenie = async (page: Page, popis: string) => {
  const vysledok = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const preteka = document.documentElement.scrollWidth > vw + 1;
    const zleTabulky: string[] = [];
    document.querySelectorAll('table').forEach((t) => {
      if (!(t as HTMLElement).offsetParent) return;
      const hlavicka = (t.querySelector('thead')?.textContent || '').toLowerCase();
      if (!/tím/.test(hlavicka)) return;
      let hranica = vw;
      for (let el = t.parentElement; el && el !== document.body; el = el.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowX)) hranica = Math.min(hranica, el.getBoundingClientRect().right);
      }
      const riadok = [...t.querySelectorAll('tbody tr')].find((r) => (r as HTMLElement).offsetParent);
      const bunky = riadok ? [...riadok.children].filter((c) => getComputedStyle(c).display !== 'none') : [];
      const posledna = bunky[bunky.length - 1];
      if (posledna && posledna.getBoundingClientRect().right > hranica + 1) {
        zleTabulky.push(`${t.className || 'table'} presahuje o ${Math.round(posledna.getBoundingClientRect().right - hranica)} px`);
      }
    });
    return { preteka, zleTabulky };
  });
  expect(vysledok.preteka, `${popis}: stránka preteká do strany`).toBe(false);
  expect(vysledok.zleTabulky, `${popis}: tabuľka nemá viditeľné body`).toEqual([]);
};
