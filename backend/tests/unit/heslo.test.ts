// Umiestnenie: backend/tests/unit/heslo.test.ts
// Testy kontroly sily hesla.

import { describe, it, expect } from 'vitest';
import { overSiluHesla } from '../../src/utils/heslo';

describe('overSiluHesla', () => {
  describe('odmietnuté heslá', () => {
    it('odmietne prázdne heslo', () => {
      expect(overSiluHesla('')).toContain('Heslo je povinné');
      expect(overSiluHesla(null).length).toBeGreaterThan(0);
      expect(overSiluHesla(undefined).length).toBeGreaterThan(0);
    });

    it('odmietne krátke heslo', () => {
      expect(overSiluHesla('Kr4t!').length).toBeGreaterThan(0);
      expect(overSiluHesla('123456').length).toBeGreaterThan(0);
    });

    it('odmietne bežné slová', () => {
      // Kontrola je bez ohľadu na veľkosť písmen a diakritiku
      expect(overSiluHesla('MojeHeslo2026!').some((c) => c.includes('heslo'))).toBe(true);
      expect(overSiluHesla('Password123456!').some((c) => c.includes('password'))).toBe(true);
      expect(overSiluHesla('SuperAdmin2026!').some((c) => c.includes('admin'))).toBe(true);
    });

    it('odmietne jednoduché postupnosti', () => {
      expect(overSiluHesla('abcdefghijk').length).toBeGreaterThan(0);
      expect(overSiluHesla('Zaaaaaaa1!').length).toBeGreaterThan(0);
    });

    it('odmietne heslo obsahujúce meno používateľa', () => {
      const chyby = overSiluHesla('NovakJeSuper9!', { meno: 'Peter Novak' });
      expect(chyby.some((c) => c.includes('meno'))).toBe(true);
    });

    it('odmietne heslo obsahujúce e-mail používateľa', () => {
      const chyby = overSiluHesla('petornovak-2026-X', { email: 'petornovak@klub.sk' });
      expect(chyby.some((c) => c.includes('e-mail'))).toBe(true);
    });

    it('odmietne krátke heslo s malým počtom druhov znakov', () => {
      // 10 znakov, len malé písmená - to nestačí
      expect(overSiluHesla('bratislava').length).toBeGreaterThan(0);
    });

    it('odmietne heslo dlhšie ako 72 znakov', () => {
      // bcrypt spracuje len prvých 72 bajtov, dlhšie heslo klame používateľa
      const chyby = overSiluHesla('x'.repeat(80));
      expect(chyby.some((c) => c.includes('72'))).toBe(true);
    });
  });

  describe('prijaté heslá', () => {
    it('prijme dlhú zapamätateľnú frázu', () => {
      expect(overSiluHesla('zelena lucna kosacka pri potoku')).toEqual([]);
    });

    it('prijme kratšie heslo s tromi druhmi znakov', () => {
      expect(overSiluHesla('Vrchol-2026-Klub')).toEqual([]);
    });

    it('prijme heslo s presne 16 znakmi bez ďalších podmienok', () => {
      expect(overSiluHesla('sladkovicovaulica')).toEqual([]);
    });
  });
});
