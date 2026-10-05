// Umiestnenie: frontend/src/api/sablony.test.ts
// Texty nastavení šablón v jazyku administrácie: najprv preklad zo šablóny,
// potom spoločný slovník vstavaných šablón, inak slovenský originál.

import { describe, it, expect, vi } from 'vitest';

let jazyk = 'en';
vi.mock('../i18n', () => ({ jazyk: () => jazyk }));
vi.mock('../app/apiKlient', () => ({ default: {} }));

const { prelozSablony } = await import('./sablony');

const sablona = {
  slug: 'test', nazov: 'Test', popis: 'Preklad z manifestu', verzia: '1.0.0', autor: null, web_autora: null,
  nahlad: null, vstavana: false, aktivna: false, ma_skript: false, chyba: null, hodnoty: {},
  nastavenia: [
    { kluc: 'farba', typ: 'farba', menovka: 'Farba klubu', skupina: 'Farby a písmo', napoveda: 'Bez prekladu' },
    { kluc: 'pismo', typ: 'vyber', menovka: 'Písmo nadpisov', moznosti: [{ hodnota: 'a', popis: 'Automaticky' }] },
  ],
  preklady: { en: { 'Preklad z manifestu': 'From the manifest', 'Farba klubu': 'Team colour' } },
} as never;

describe('preklad šablón', () => {
  it('manifest má prednosť pred spoločným slovníkom', async () => {
    const [s] = await prelozSablony([sablona]);
    expect(s.popis).toBe('From the manifest');
    expect(s.nastavenia[0].menovka).toBe('Team colour');
    expect(s.nastavenia[0].skupina).toBe('Colours and font');
    expect(s.nastavenia[0].napoveda).toBe('Bez prekladu');
    expect(s.nastavenia[1].moznosti?.[0].popis).toBe('Automatic');
  });

  it('v slovenčine sa nič nemení', async () => {
    jazyk = 'sk';
    const [s] = await prelozSablony([sablona]);
    expect(s).toBe(sablona);
  });
});
