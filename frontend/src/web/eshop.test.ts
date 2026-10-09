// Umiestnenie: frontend/src/web/eshop.test.ts
// Ceny v obchode: formát sumy, príplatky za zvolené vlastnosti a chýbajúce
// povinné voľby pred pridaním do košíka.

import { describe, it, expect } from 'vitest';
import { cenaSVolbami, cenaText, hodnotaVypredana, infoPlatby, kartaStavuObjednavky, krokyObjednavky, type ObjednavkaZakaznika, type ProduktObchodu } from './eshop';

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

// ===== Stránka objednávky pre zákazníka =====

const objednavka = (zmeny: Partial<ObjednavkaZakaznika>) =>
  ({ stav: 'potvrdena', stav_platby: 'neuhradena', platba_typ: 'prevod', platba_nazov: 'Prevod', dorucenie_nazov: 'Osobný odber', spolu: 20, mena: 'EUR', ulica: null, mesto: null, psc: null, ...zmeny }) as ObjednavkaZakaznika;

describe('stránka objednávky', () => {
  it('pripravená objednávka ukazuje krok Pripravená aj pri adrese', () => {
    const kroky = krokyObjednavky(objednavka({ stav: 'pripravena', ulica: 'Hlavná 1' }));
    expect(kroky[2]).toMatchObject({ nazov: 'Pripravená', stav: 'aktualny' });
    expect(kroky[1].stav).toBe('hotovy');
  });

  it('dobierka nie je „neuhradená“, ale dobierka bez variabilného symbolu', () => {
    const p = infoPlatby(objednavka({ platba_typ: 'dobierka' }));
    expect(p).toMatchObject({ odznak: 'Dobierka', ton: 'dobierka', udajeNaPlatbu: false });
    expect(p.text).toContain('20,00 €');
  });

  it('prevod čaká na platbu so sumou a symbolom, uhradená objednávka nie', () => {
    expect(infoPlatby(objednavka({})).udajeNaPlatbu).toBe(true);
    expect(infoPlatby(objednavka({ stav_platby: 'uhradena' }))).toMatchObject({ nadpis: 'Objednávka je uhradená', udajeNaPlatbu: false });
  });

  it('odoslaná a pripravená objednávka má vlastnú kartu stavu', () => {
    expect(kartaStavuObjednavky(objednavka({ stav: 'odoslana', ulica: 'Hlavná 1', psc: '010 01', mesto: 'Žilina' }))?.text).toContain('Hlavná 1, 010 01 Žilina');
    expect(kartaStavuObjednavky(objednavka({ stav: 'pripravena' }))?.nadpis).toBe('Objednávka je pripravená na vyzdvihnutie');
    expect(kartaStavuObjednavky(objednavka({ stav: 'potvrdena' }))).toBeNull();
  });
});
