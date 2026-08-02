// Umiestnenie: backend/tests/unit/gdpr.test.ts
// Testy filtrovania osobných údajov maloletých.

import { describe, it, expect } from 'vitest';
import { jeMaloletý } from '../../src/controllers/gdprController';
import { filtrujUdajeHraca } from '../../src/utils/gdprFilter';
import type { DruhSuhlasu } from '../../src/models/Suhlas';

/** Vytvorí dátum narodenia pre zadaný vek. */
const narodeninyPreVek = (vek: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - vek);
  // Odsunieme o mesiac dozadu, aby vek platil bez ohľadu na deň v mesiaci
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

describe('jeMaloletý', () => {
  it('rozpozná dieťa', () => {
    expect(jeMaloletý(narodeninyPreVek(10))).toBe(true);
    expect(jeMaloletý(narodeninyPreVek(17))).toBe(true);
  });

  it('rozpozná dospelého', () => {
    expect(jeMaloletý(narodeninyPreVek(18))).toBe(false);
    expect(jeMaloletý(narodeninyPreVek(30))).toBe(false);
  });

  it('zvládne chýbajúci dátum', () => {
    expect(jeMaloletý(null)).toBe(false);
  });
});

describe('filtrujUdajeHraca', () => {
  const dieta = {
    id: 1,
    meno: 'Tomas',
    priezvisko: 'Novak',
    datum_narodenia: narodeninyPreVek(14),
    fotka: '/uploads/fotka.jpg',
    vaha: 52,
    vyska: 162,
  };

  const dospely = { ...dieta, id: 2, datum_narodenia: narodeninyPreVek(25) };

  it('dospelého nefiltruje', () => {
    const vysledok = filtrujUdajeHraca(dospely, new Set<DruhSuhlasu>());
    expect(vysledok.fotka).toBe('/uploads/fotka.jpg');
    expect(vysledok.meno).toBe('Tomas');
  });

  it('bez súhlasu skryje fotku dieťaťa', () => {
    const vysledok = filtrujUdajeHraca(dieta, new Set<DruhSuhlasu>());
    expect(vysledok.fotka).toBeNull();
    expect(vysledok.fotka_skryta_bez_suhlasu).toBe(true);
  });

  it('bez súhlasu skráti meno dieťaťa na iniciálu', () => {
    const vysledok = filtrujUdajeHraca(dieta, new Set<DruhSuhlasu>());
    expect(vysledok.meno).toBe('T.');
    // Priezvisko zostáva, aby bola súpiska použiteľná
    expect(vysledok.priezvisko).toBe('Novak');
  });

  it('so súhlasom zobrazí fotku aj meno', () => {
    const suhlasy = new Set<DruhSuhlasu>(['zverejnenie_fotky', 'zverejnenie_mena']);
    const vysledok = filtrujUdajeHraca(dieta, suhlasy);
    expect(vysledok.fotka).toBe('/uploads/fotka.jpg');
    expect(vysledok.meno).toBe('Tomas');
  });

  it('presný dátum narodenia dieťaťa skryje aj so súhlasom', () => {
    const suhlasy = new Set<DruhSuhlasu>(['zverejnenie_fotky', 'zverejnenie_mena']);
    const vysledok = filtrujUdajeHraca(dieta, suhlasy);
    expect(vysledok.datum_narodenia).toBeUndefined();
    // Rok stačí na zaradenie do vekovej kategórie
    expect(vysledok.rok_narodenia).toBe(new Date(dieta.datum_narodenia).getFullYear());
  });

  it('odstráni telesné údaje dieťaťa', () => {
    const vysledok = filtrujUdajeHraca(dieta, new Set<DruhSuhlasu>(['zverejnenie_fotky']));
    expect(vysledok.vaha).toBeUndefined();
    expect(vysledok.vyska).toBeUndefined();
  });

  it('pôvodný objekt nemení', () => {
    filtrujUdajeHraca(dieta, new Set<DruhSuhlasu>());
    expect(dieta.fotka).toBe('/uploads/fotka.jpg');
  });
});
