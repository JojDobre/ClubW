// Umiestnenie: frontend/src/pages/admin/pomocky.test.ts
// Drobné pomocníky administrácie: suma z políčka a veľkosť súboru.

import { describe, it, expect } from 'vitest';
import { sumaZVstupu } from './eshop/spolocne';
import { velkostSuboru } from './KniznicaMedii';

describe('pomocníky administrácie', () => {
  it('suma s čiarkou aj bodkou', () => {
    expect(sumaZVstupu(' 12,50 ')).toBe(12.5);
    expect(sumaZVstupu('3.2')).toBe(3.2);
    expect(sumaZVstupu('')).toBeNull();
    expect(sumaZVstupu('abc')).toBeNaN();
  });

  it('veľkosť súboru', () => {
    expect(velkostSuboru(0)).toBe('—');
    expect(velkostSuboru(500)).toBe('500 B');
    expect(velkostSuboru(2048)).toBe('2 kB');
    expect(velkostSuboru(5.5 * 1024 * 1024)).toBe('5,5 MB');
  });
});
