// Umiestnenie: backend/tests/unit/sablony.test.ts
// Testy šablón webu - kontrola sablona.json, hodnôt nastavení a inštalácie
// balíka (cesty, typy súborov, veľkosť, aktualizácia).

import fs from 'fs';
import os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Priečinky sa čítajú pri načítaní modulu - nastavíme ich pred importom
const koren = fs.mkdtempSync(path.join(os.tmpdir(), 'clubw-sablony-'));
process.env.SABLONY_VSTAVANE_DIR = path.join(koren, 'vstavane');
process.env.SABLONY_DIR = path.join(koren, 'nahrate');

const sablony = await import('../../src/services/sablony');
const { overManifest, overHodnotu, hodnotyNastaveni, nainstalujZBalika, zmazSablonu, zoznamSablon, suborSablony, ChybaSablony } = sablony;

const zakladny = { slug: 'moja', nazov: 'Moja', verzia: '1.0.0', styl: 'styl.css' };
const zip = (subory: Record<string, string | Buffer>) => {
  const z = new AdmZip();
  for (const [meno, obsah] of Object.entries(subory)) z.addFile(meno, Buffer.isBuffer(obsah) ? obsah : Buffer.from(obsah));
  return z.toBuffer();
};

beforeAll(() => {
  const vstavana = path.join(koren, 'vstavane', 'zakladna');
  fs.mkdirSync(vstavana, { recursive: true });
  fs.writeFileSync(path.join(vstavana, 'sablona.json'), JSON.stringify({ slug: 'zakladna', nazov: 'Základná', verzia: '1.0.0' }));
});
afterAll(() => fs.rmSync(koren, { recursive: true, force: true }));

describe('overManifest', () => {
  it('prijme platný manifest', () => {
    const m = overManifest({ ...zakladny, nastavenia: [{ kluc: 'akcent', typ: 'farba', menovka: 'Akcent', predvolene: '#f59e0b' }] });
    expect(m.api).toBe(1);
    expect(m.nastavenia[0].predvolene).toBe('#F59E0B');
  });
  it('odmietne zlý slug, verziu a novšie api', () => {
    expect(() => overManifest({ ...zakladny, slug: '../x' })).toThrow(ChybaSablony);
    expect(() => overManifest({ ...zakladny, verzia: 'najnovsia' })).toThrow(/Verzia/);
    expect(() => overManifest({ ...zakladny, api: 99 })).toThrow(/novšiu verziu/);
  });
  it('odmietne cestu k súboru mimo šablóny', () => {
    expect(() => overManifest({ ...zakladny, styl: '../../etc/x.css' })).toThrow(/cesta/);
    expect(() => overManifest({ ...zakladny, skript: 'x.php' })).toThrow(/\.js/);
  });
  it('odstráni HTML z textov', () => {
    expect(overManifest({ ...zakladny, nazov: '<img src=x onerror=alert(1)>Moja' }).nazov).toBe('Moja');
  });
});

describe('hodnoty nastavení', () => {
  const vyber = { kluc: 'rez', typ: 'vyber' as const, menovka: 'Režim', moznosti: [{ hodnota: 'a', popis: 'A' }] };
  it('kontroluje typy', () => {
    expect(overHodnotu({ kluc: 'f', typ: 'farba', menovka: 'F' }, 'red').chyba).toBeTruthy();
    expect(overHodnotu(vyber, 'b').chyba).toBeTruthy();
    expect(overHodnotu({ kluc: 'c', typ: 'cislo', menovka: 'C', min: 1, max: 5 }, 9).chyba).toBeTruthy();
    expect(overHodnotu({ kluc: 'o', typ: 'obrazok', menovka: 'O' }, 'javascript:alert(1)').chyba).toBeTruthy();
    expect(overHodnotu({ kluc: 'o', typ: 'obrazok', menovka: 'O' }, '/uploads/images/a.jpg').hodnota).toBe('/uploads/images/a.jpg');
  });
  it('doplní predvolené a vynechá neznáme kľúče', () => {
    const m = overManifest({ ...zakladny, nastavenia: [{ kluc: 'ukaz', typ: 'prepinac', menovka: 'U', predvolene: true }] });
    expect(hodnotyNastaveni(m, { cudzi: 1 })).toEqual({ ukaz: true });
    expect(hodnotyNastaveni(m, { ukaz: false })).toEqual({ ukaz: false });
  });
});

describe('inštalácia balíka', () => {
  it('nainštaluje šablónu z priečinka v balíku a potom ju aktualizuje', async () => {
    const prva = await nainstalujZBalika(zip({ 'moja/sablona.json': JSON.stringify(zakladny), 'moja/styl.css': 'a{}' }));
    expect(prva.predchadzajucaVerzia).toBeNull();
    const druha = await nainstalujZBalika(zip({ 'sablona.json': JSON.stringify({ ...zakladny, verzia: '1.1.0' }), 'styl.css': 'b{}' }));
    expect(druha.predchadzajucaVerzia).toBe('1.0.0');
    expect(fs.readFileSync(path.join(koren, 'nahrate', 'moja', 'styl.css'), 'utf8')).toBe('b{}');
    expect((await zoznamSablon()).map((s) => s.slug)).toEqual(['zakladna', 'moja']);
  });

  it('odmietne únik z priečinka, nepovolené typy a vstavaný slug', async () => {
    const z = new AdmZip();
    z.addFile('sablona.json', Buffer.from(JSON.stringify({ ...zakladny, slug: 'unik' })));
    z.addFile('styl.css', Buffer.from('a{}'));
    z.getEntries()[1].entryName = '../../unik.css';
    await expect(nainstalujZBalika(z.toBuffer())).rejects.toThrow(/Neplatná cesta/);
    await expect(nainstalujZBalika(zip({ 'sablona.json': JSON.stringify(zakladny), 'styl.css': 'a{}', 'x.sh': 'rm' }))).rejects.toThrow(/nepovolený typ/);
    await expect(nainstalujZBalika(zip({ 'sablona.json': JSON.stringify({ ...zakladny, slug: 'zakladna' }) }))).rejects.toThrow(/dodaná so systémom/);
    expect(fs.existsSync(path.join(koren, 'unik.css'))).toBe(false);
  });

  it('odmietne zip bombu', async () => {
    const balik = zip({ 'sablona.json': JSON.stringify({ ...zakladny, slug: 'bomba' }), 'velky.txt': Buffer.alloc(45 * 1024 * 1024) });
    expect(balik.length).toBeLessThan(1024 * 1024);
    await expect(nainstalujZBalika(balik)).rejects.toThrow(/príliš veľký/);
    expect(fs.existsSync(path.join(koren, 'nahrate', 'bomba'))).toBe(false);
  });

  it('servuje len povolené súbory šablóny', async () => {
    expect(await suborSablony('moja', 'styl.css')).toBeTruthy();
    expect(await suborSablony('moja', '../zakladna/sablona.json')).toBeNull();
    expect(await suborSablony('moja', 'sablona.json.bak')).toBeNull();
    expect(await suborSablony('moja', '.skryty.css')).toBeNull();
  });

  it('zmaže nahratú, ale nie vstavanú šablónu', async () => {
    await expect(zmazSablonu('zakladna')).rejects.toThrow(/nedá zmazať/);
    await zmazSablonu('moja');
    expect(fs.existsSync(path.join(koren, 'nahrate', 'moja'))).toBe(false);
  });
});
