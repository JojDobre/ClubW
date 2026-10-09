// Umiestnenie: backend/tests/unit/registracia.test.ts
// Nastavenia registrácie fanúšikov a členov: predvolené hodnoty a overenie.

import { describe, expect, it } from 'vitest';
import { nastaveniaRegistracie, ocistiNastaveniaRegistracie, poleJeAktivne } from '../../src/services/registracia';

describe('nastavenia registrácie', () => {
  it('prázdne nastavenia = oba typy, nepovinné polia, predvolené texty', () => {
    const n = nastaveniaRegistracie({});
    expect(n.typy).toEqual({ fanusik: true, clen: true });
    expect(n.polia.telefon).toEqual({ rezim: 'volitelne', len_clen: false });
    expect(n.polia.adresa.len_clen).toBe(true);
    expect(n.texty.nadpis).toBe('');
    expect(n.vyhody).toEqual([]);
  });

  it('nedá sa vypnúť oba typy', () => {
    expect(ocistiNastaveniaRegistracie({ typy: { fanusik: false, clen: false } }).chyba).toBeTruthy();
    expect(nastaveniaRegistracie({ typy: { fanusik: false, clen: false } }).typy.fanusik).toBe(true);
  });

  it('neznámy režim poľa a HTML v textoch sa očistia', () => {
    const n = nastaveniaRegistracie({ polia: { telefon: { rezim: 'xxx' } }, texty: { nadpis: '<b>Pridaj sa</b>' }, vyhody: [{ nadpis: 'Zľavy', text: 'Vo fanshope' }, { nadpis: '' }] });
    expect(n.polia.telefon.rezim).toBe('volitelne');
    expect(n.texty.nadpis).toBe('Pridaj sa');
    expect(n.vyhody).toEqual([{ nadpis: 'Zľavy', text: 'Vo fanshope' }]);
  });

  it('pole len pre členov sa fanúšikovi neukáže, vypnuté pole nikomu', () => {
    const n = nastaveniaRegistracie({ polia: { sprava: { rezim: 'vypnute' } } });
    expect(poleJeAktivne(n, 'adresa', 'fanusik')).toBe(false);
    expect(poleJeAktivne(n, 'adresa', 'clen')).toBe(true);
    expect(poleJeAktivne(n, 'sprava', 'clen')).toBe(false);
  });
});
