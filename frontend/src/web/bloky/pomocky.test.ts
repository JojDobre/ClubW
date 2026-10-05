// Umiestnenie: frontend/src/web/bloky/pomocky.test.ts
// Adresy, kam vedú bloky stránok („Zobraziť všetky", zoznam zápasov).

import { describe, it, expect } from 'vitest';
import { odkazVsetkychBloku } from './pomocky';
import { adresaZapasovBloku } from './BlokyStranky';

describe('odkaz „Zobraziť všetky"', () => {
  it('bez zapnutia nevedie nikam', () => {
    expect(odkazVsetkychBloku('clanky', { rubrika: 'mladez' })).toBeNull();
    expect(odkazVsetkychBloku('clanky', null)).toBeNull();
  });
  it('podľa typu bloku', () => {
    expect(odkazVsetkychBloku('clanky', { odkaz_vsetky: true, rubrika: 'a tím' })).toBe('/clanky?rubrika=a%20t%C3%ADm');
    expect(odkazVsetkychBloku('zapasy', { odkaz_vsetky: true, tim_id: 4, rezim: 'vysledky' })).toBe('/matches?tim=4&zobrazit=vysledky');
    expect(odkazVsetkychBloku('zapasy', { odkaz_vsetky: true, tim_id: 0 })).toBe('/matches');
    expect(odkazVsetkychBloku('partneri', { odkaz_vsetky: true })).toBe('/sponzori');
    expect(odkazVsetkychBloku('neznamy', { odkaz_vsetky: true })).toBeNull();
  });
});

describe('zápasy bloku', () => {
  it('výsledky a program s tímom', () => {
    expect(adresaZapasovBloku({ rezim: 'vysledky', pocet: 5, tim_id: 2 })).toBe('/matches?status=ukonceny&limit=5&tim_id=2');
    const program = adresaZapasovBloku({});
    expect(program).toMatch(/^\/matches\?status=naplanovany&od_datumu=\d{4}-\d{2}-\d{2}&poradie=asc&limit=50$/);
  });
});
