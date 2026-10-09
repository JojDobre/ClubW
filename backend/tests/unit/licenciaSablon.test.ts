// Umiestnenie: backend/tests/unit/licenciaSablon.test.ts
// Ktoré šablóny povoľuje licencia klubu.

import { describe, expect, it } from 'vitest';
import { FUNKCIA_VSETKY_SABLONY, funkciaSablony, jeSablonaPovolena } from '../../src/services/licenciaSablon';

const licencia = (funkcie: string[], kontrolaVypnuta = false) => ({ funkcie, kontrolaVypnuta });
const vstavana = (slug: string) => ({ slug, vstavana: true });

describe('jeSablonaPovolena', () => {
  it('bez funkcií povolí zo vstavaných len Základnú', () => {
    expect(jeSablonaPovolena(vstavana('zakladna'), licencia([]))).toBe(true);
    expect(jeSablonaPovolena(vstavana('klubova'), licencia([]))).toBe(false);
    expect(jeSablonaPovolena(vstavana('pulz'), licencia(['live', 'export']))).toBe(false);
  });

  it('sablona:<slug> povolí jednu šablónu', () => {
    const l = licencia([funkciaSablony('pulz')]);
    expect(jeSablonaPovolena(vstavana('pulz'), l)).toBe(true);
    expect(jeSablonaPovolena(vstavana('arena'), l)).toBe(false);
  });

  it('sablony:vsetky povolí všetky vstavané', () => {
    const l = licencia([FUNKCIA_VSETKY_SABLONY]);
    for (const slug of ['klubova', 'pulz', 'arena', 'zakladna']) expect(jeSablonaPovolena(vstavana(slug), l)).toBe(true);
  });

  it('veľkosť písmen a medzery vo funkcii nerozhodujú', () => {
    expect(jeSablonaPovolena(vstavana('pulz'), licencia([' Sablona:PULZ ']))).toBe(true);
    expect(jeSablonaPovolena(vstavana('elita'), licencia(['SABLONY:VSETKY']))).toBe(true);
  });

  it('vlastnú nahratú šablónu licencia neobmedzuje', () => {
    expect(jeSablonaPovolena({ slug: 'moja-sablona', vstavana: false }, licencia([]))).toBe(true);
  });

  it('pri vypnutej kontrole licencie je povolené všetko', () => {
    expect(jeSablonaPovolena(vstavana('pulz'), licencia([], true))).toBe(true);
  });
});
