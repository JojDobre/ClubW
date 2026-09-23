// Umiestnenie: backend/tests/unit/turnaj.test.ts
// Testy logiky turnaja: rozpis skupiny, tabuľka skupiny, nasadenie v pavúku.

import { describe, it, expect } from 'vitest';
import { rozpisSkupiny, tabulkaSkupiny, poradieNasadenia } from '../../src/controllers/turnajController';

const tim = (nazov: string) => ({ nazov, tim_id: null, logo: null });

describe('rozpisSkupiny', () => {
  it('každý hrá s každým práve raz (4 tímy = 6 zápasov v 3 kolách)', () => {
    const rozpis = rozpisSkupiny(4);
    expect(rozpis).toHaveLength(6);
    const dvojice = new Set(rozpis.map((z) => [z.domaci, z.hostia].sort().join('-')));
    expect(dvojice.size).toBe(6);
    expect(new Set(rozpis.map((z) => z.kolo))).toEqual(new Set([1, 2, 3]));
  });

  it('nepárny počet - tím v kole stojí, ale dvojice sú kompletné (5 tímov = 10 zápasov)', () => {
    const rozpis = rozpisSkupiny(5);
    expect(rozpis).toHaveLength(10);
    expect(new Set(rozpis.map((z) => [z.domaci, z.hostia].sort().join('-'))).size).toBe(10);
  });
});

describe('tabulkaSkupiny', () => {
  it('body, skóre a postupujúci', () => {
    const skupina = {
      nazov: 'A',
      timy: [tim('Alfa'), tim('Beta'), tim('Gama')],
      zapasy: [
        { kod: 'A1', kolo: 1, domaci: 0, hostia: 1, skore_domaci: 2, skore_hostia: 0 },
        { kod: 'A2', kolo: 2, domaci: 1, hostia: 2, skore_domaci: 1, skore_hostia: 1 },
        { kod: 'A3', kolo: 3, domaci: 2, hostia: 0, skore_domaci: null, skore_hostia: null },
      ],
    };
    const t = tabulkaSkupiny(skupina, 2);
    expect(t.map((r) => r.tim.nazov)).toEqual(['Alfa', 'Gama', 'Beta']);
    expect(t[0]).toMatchObject({ body: 3, vyhry: 1, goly_za: 2, postupuje: true });
    expect(t[1]).toMatchObject({ body: 1, remizy: 1, postupuje: true });
    expect(t[2]).toMatchObject({ body: 1, prehry: 1, postupuje: false });
  });
});

describe('poradieNasadenia', () => {
  it('najlepší nasadení sa stretnú až na konci', () => {
    expect(poradieNasadenia(4)).toEqual([1, 4, 2, 3]);
    expect(poradieNasadenia(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});
