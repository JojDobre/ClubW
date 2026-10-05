// Umiestnenie: frontend/src/web/eshop.test.ts
// Ceny v obchode: formát sumy, príplatky za zvolené vlastnosti a chýbajúce
// povinné voľby pred pridaním do košíka.

import { describe, it, expect } from 'vitest';
import { cenaSVolbami, cenaText, hodnotaVypredana, type ProduktObchodu } from './eshop';

const dres = {
  id: 1,
  nazov: 'Dres',
  cena: 49.9,
  vlastnosti: [
    {
      id: 'velkost', nazov: 'Veľkosť', typ: 'vyber', povinna: true, priplatok: 0,
      hodnoty: [{ id: 'm', nazov: 'M', priplatok: 0, sklad: 3 }, { id: 'xxl', nazov: 'XXL', priplatok: 5, sklad: 0 }],
    },
    { id: 'meno', nazov: 'Meno na chrbte', typ: 'text', povinna: false, priplatok: 7.5, hodnoty: [] },
  ],
} as unknown as ProduktObchodu;

describe('ceny obchodu', () => {
  it('formát sumy v eurách', () => {
    expect(cenaText(49.9).replace(/\s/g, ' ')).toBe('49,90 €');
    expect(cenaText(null).replace(/\s/g, ' ')).toBe('0,00 €');
    expect(cenaText(10, 'CZK').replace(/\s/g, ' ')).toBe('10,00 CZK');
  });

  it('príplatky za veľkosť a potlač', () => {
    expect(cenaSVolbami(dres, { velkost: 'xxl', meno: 'NOVÁK' })).toEqual({
      cena: 62.4,
      chybajuce: [],
      popis: ['Veľkosť: XXL', 'Meno na chrbte: NOVÁK'],
    });
  });

  it('chýbajúca povinná voľba', () => {
    const v = cenaSVolbami(dres, { meno: '  ' });
    expect(v.chybajuce).toEqual(['Veľkosť']);
    expect(v.cena).toBe(49.9);
  });

  it('vypredaná hodnota', () => {
    expect(hodnotaVypredana({ sklad: 0 } as never)).toBe(true);
    expect(hodnotaVypredana({ sklad: 2 } as never)).toBe(false);
    expect(hodnotaVypredana({ sklad: null } as never)).toBe(false);
  });
});
