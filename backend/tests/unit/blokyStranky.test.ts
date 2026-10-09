// Umiestnenie: backend/tests/unit/blokyStranky.test.ts
// Bloky stránok: overenie typov, očistenie polí, odkazy, obrázky, video.

import { describe, it, expect } from 'vitest';
import { ChybaBlokovError, MAX_BLOKOV, SCHEMA_BLOKOV, ocistiBloky, textBlokov } from '../../src/services/blokyStranky';

describe('ocistiBloky', () => {
  it('prázdny vstup = žiadne bloky', () => {
    expect(ocistiBloky(undefined)).toEqual([]);
    expect(ocistiBloky(null)).toEqual([]);
  });

  it('časová os: položky, orezanie textu, zahodenie neznámych polí', () => {
    const [b] = ocistiBloky([
      {
        id: 'historia',
        typ: 'casova_os',
        data: { nadpis: 'História', neznáme: 'x' },
        polozky: [{ rok: '1932', nadpis: 'Založenie', text: 'a'.repeat(5000), obrazok: '/uploads/a.jpg', skryte: true }],
      },
    ]);
    expect(b.id).toBe('historia');
    expect(b.data).toEqual({ nadpis: 'História', uvod: '' });
    expect(b.polozky![0]).toEqual({ rok: '1932', nadpis: 'Založenie', text: 'a'.repeat(1500), obrazok: '/uploads/a.jpg' });
    expect(b.pozadie).toBe('biele');
    expect(b.skryty).toBe(false);
  });

  it('výber a čísla sa držia povolených hodnôt', () => {
    const [osoby, clanky] = ocistiBloky([
      { typ: 'osoby', data: { stlpce: '7' }, polozky: [] },
      { typ: 'clanky', data: { pocet: 99 } },
    ]);
    expect(osoby.data.stlpce).toBe('2');
    expect(clanky.data.pocet).toBe(12);
  });

  it('obrázok: šírka a orezanie z povolených hodnôt, zlý obrázok sa odmietne', () => {
    const [b] = ocistiBloky([
      { typ: 'obrazok', data: { obrazok: '/uploads/media/a.jpg', popis: 'Tím', sirka: 'obrovska', pomer: '16-9', nove_okno: 'ano', navyse: 1 } },
    ]);
    expect(b.data).toMatchObject({ obrazok: '/uploads/media/a.jpg', popis: 'Tím', sirka: 'obsah', pomer: '16-9' });
    expect(b.data.navyse).toBeUndefined();
    expect(() => ocistiBloky([{ typ: 'obrazok', data: { obrazok: 'javascript:alert(1)' } }])).toThrow(/obrázka/);
  });

  it('HTML sa vyčistí proti XSS', () => {
    const [b] = ocistiBloky([{ typ: 'text', data: { html: '<p>Ahoj<script>alert(1)</script></p><a href="javascript:x">x</a>' } }]);
    expect(b.data.html).not.toContain('<script');
    expect(b.data.html).not.toContain('javascript:');
  });

  it('odmietne neznámy typ, zlý odkaz, obrázok a video', () => {
    expect(() => ocistiBloky([{ typ: 'reklama' }])).toThrow(ChybaBlokovError);
    expect(() => ocistiBloky([{ typ: 'vyzva', data: { odkaz: 'javascript:alert(1)' } }])).toThrow(/odkaz musí/);
    expect(() => ocistiBloky([{ typ: 'citat', data: { foto: 'data:image/png;base64,xx' } }])).toThrow(/obrázka/);
    expect(() => ocistiBloky([{ typ: 'video', data: { url: 'https://example.com/v.mp4' } }])).toThrow(/YouTube/);
    expect(() => ocistiBloky(new Array(MAX_BLOKOV + 1).fill({ typ: 'text' }))).toThrow(ChybaBlokovError);
  });

  it('video z YouTube dostane ID a platformu', () => {
    const [b] = ocistiBloky([{ typ: 'video', data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } }]);
    expect(b.data).toMatchObject({ platforma: 'youtube', video_id: 'dQw4w9WgXcQ' });
  });

  it('duplicitné ID blokov sa rozlíšia', () => {
    const bloky = ocistiBloky([{ id: 'a', typ: 'text' }, { id: 'a', typ: 'text' }]);
    expect(new Set(bloky.map((b) => b.id)).size).toBe(2);
  });

  it('každý typ bloku z schémy sa dá uložiť prázdny', () => {
    const typy = Object.keys(SCHEMA_BLOKOV);
    expect(ocistiBloky(typy.map((typ) => ({ typ })))).toHaveLength(typy.length);
  });

  it('tabuľka: orezanie stĺpcov a riadkov, bunky podľa hlavičky', () => {
    const [b] = ocistiBloky([
      { typ: 'tabulka', data: { tabulka: { hlavicka: ['Kategória', 'Ročník', 'Tréningy'], riadky: [['U9', '2018'], ['U11', '2016', 'Po, St', 'navyše']] }, pruhovana: 'ano' } },
    ]);
    expect(b.data.tabulka).toEqual({ hlavicka: ['Kategória', 'Ročník', 'Tréningy'], riadky: [['U9', '2018', ''], ['U11', '2016', 'Po, St']] });
    expect(b.data.pruhovana).toBe(false);
  });

  it('tlačidlá a cenník: prepínače len true/false, štýl z povolených', () => {
    const [tl, cen] = ocistiBloky([
      { typ: 'tlacidla', data: { vzhlad: 'velke' }, polozky: [{ text: 'Kontakt', odkaz: '/kontakt', styl: 'neon', nove_okno: 1 }] },
      { typ: 'cennik', polozky: [{ nazov: 'Člen', cena: '20 €', zvyraznene: true }] },
    ]);
    expect(tl.data.vzhlad).toBe('velke');
    expect(tl.polozky![0]).toMatchObject({ styl: 'hlavne', nove_okno: false });
    expect(cen.polozky![0].zvyraznene).toBe(true);
  });

  it('text blokov pre popis vyhľadávačov vynechá odkazy a skryté bloky', () => {
    const bloky = ocistiBloky([
      { typ: 'nadpis', data: { nadpis: 'Vedenie klubu', text: 'Ľudia za klubom' } },
      { typ: 'vyzva', data: { nadpis: 'Skryté', odkaz: '/kontakt' }, skryty: true },
    ]);
    expect(textBlokov(bloky)).toBe('Vedenie klubu Ľudia za klubom');
  });
});
