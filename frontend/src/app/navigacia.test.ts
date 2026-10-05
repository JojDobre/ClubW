// Umiestnenie: frontend/src/app/navigacia.test.ts
// Menu administrácie: aktívna položka, názov obrazovky a položky podľa roly.

import { describe, it, expect } from 'vitest';
import { dostupneSekcie, jeAktivna, nazovObrazovky } from './navigacia';

describe('menu administrácie', () => {
  it('prehľad je aktívny len na presnej adrese', () => {
    expect(jeAktivna('/admin', '/admin')).toBe(true);
    expect(jeAktivna('/admin', '/admin/clanky')).toBe(false);
    expect(jeAktivna('/admin/clanky', '/admin/clanky/novy')).toBe(true);
    expect(jeAktivna('/admin/clanky', '/admin/clankyx')).toBe(false);
  });

  it('podstránka zdedí názov nadradenej položky', () => {
    expect(nazovObrazovky('/admin/clanky/12')).toBe(nazovObrazovky('/admin/clanky'));
    expect(nazovObrazovky('/admin/neexistuje-xyz')).toBe('Administrácia');
  });

  it('správca vidí všetko, iná rola len povolené moduly', () => {
    const vsetky = dostupneSekcie('admin').flatMap((s) => s.polozky).length;
    const lenClanky = dostupneSekcie('redaktor' as never, (m) => m === 'clanky').flatMap((s) => s.polozky);
    expect(vsetky).toBeGreaterThan(20);
    expect(lenClanky.length).toBeLessThan(vsetky);
    expect(lenClanky.every((p) => !p.modul || p.modul === 'clanky')).toBe(true);
  });
});
