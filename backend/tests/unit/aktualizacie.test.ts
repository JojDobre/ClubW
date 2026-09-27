// Umiestnenie: backend/tests/unit/aktualizacie.test.ts
// Aktualizácie z licenčného servera: spracovanie príkazu a spustenie aktualizátora.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let koren: string;
let sluzba: typeof import('../../src/services/aktualizacie');
const volania: Array<{ url: string; telo: any }> = [];

const PRIKAZ = {
  id: 41,
  typ: 'aktualizacia',
  verzia: { id: 7, verzia: '1.4.0', sha256: 'a'.repeat(64), velkost: 1000 },
};

const pockaj = async (podmienka: () => boolean, ms = 5000) => {
  const koniec = Date.now() + ms;
  while (!podmienka()) {
    if (Date.now() > koniec) throw new Error('Čakanie vypršalo');
    await new Promise((r) => setTimeout(r, 50));
  }
};

beforeEach(async () => {
  koren = fs.mkdtempSync(path.join(os.tmpdir(), 'clubw-akt-'));
  fs.writeFileSync(path.join(koren, 'package.json'), JSON.stringify({ version: '1.3.0' }));
  process.env.CLUBW_KOREN = koren;
  process.env.LICENSE_KEY = 'CLUBW-TEST-TEST-TEST-TEST';
  process.env.LICENSE_SERVER_URL = 'http://licencie.test';
  delete process.env.AKTUALIZACIE_POVOLENE;
  volania.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: any) => {
      volania.push({ url, telo: JSON.parse(init.body) });
      return new Response('{}');
    })
  );
  vi.resetModules();
  sluzba = await import('../../src/services/aktualizacie');
});

afterEach(() => {
  vi.unstubAllGlobals();
  fs.rmSync(koren, { recursive: true, force: true });
});

describe('aktualizácie z licenčného servera', () => {
  it('verzia sa číta z package.json v koreni projektu', () => {
    expect(sluzba.VERZIA_APLIKACIE).toBe('1.3.0');
    expect(sluzba.udajeInstalacie()).toMatchObject({ sposob: 'balik', aktualizacie: false });
  });

  it('pri vypnutých aktualizáciách príkaz odmietne a nahlási to len raz', async () => {
    await sluzba.spracujPrikaz(PRIKAZ);
    await sluzba.spracujPrikaz(PRIKAZ);
    expect(volania).toHaveLength(1);
    expect(volania[0].url).toBe('http://licencie.test/api/license/prikaz/41');
    expect(volania[0].telo).toMatchObject({ licenseKey: 'CLUBW-TEST-TEST-TEST-TEST', stav: 'chyba' });
    expect(volania[0].telo.sprava).toContain('AKTUALIZACIE_POVOLENE');
    expect(fs.existsSync(sluzba.SUBOR_BEHU)).toBe(false);
  });

  it('spustí aktualizátor ako samostatný proces s údajmi z príkazu', async () => {
    process.env.AKTUALIZACIE_POVOLENE = 'true';
    // Náhradný aktualizátor len zapíše, čo dostal
    fs.mkdirSync(path.join(koren, 'scripts'));
    fs.writeFileSync(
      path.join(koren, 'scripts', 'aktualizuj.mjs'),
      `import fs from 'fs';
       const e = process.env;
       fs.writeFileSync('prijate.json', JSON.stringify({ id: e.AKT_VERZIA_ID, verzia: e.AKT_VERZIA, sha: e.AKT_SHA256, prikaz: e.AKT_PRIKAZ_ID, z: e.AKT_Z_VERZIE, cwd: process.cwd() }));`
    );

    await sluzba.spracujPrikaz(PRIKAZ);

    const beh = sluzba.nacitajBeh();
    expect(beh).toMatchObject({ verzia: '1.4.0', z_verzie: '1.3.0', prikaz_id: 41 });
    expect(volania.map((v) => v.telo.stav)).toEqual(['prevzaty']);

    const prijate = path.join(koren, 'prijate.json');
    await pockaj(() => fs.existsSync(prijate) && fs.statSync(prijate).size > 0);
    expect(JSON.parse(fs.readFileSync(prijate, 'utf8'))).toMatchObject({
      id: '7',
      verzia: '1.4.0',
      sha: 'a'.repeat(64),
      prikaz: '41',
      z: '1.3.0',
      cwd: fs.realpathSync(koren),
    });
  });

  it('nespustí druhú aktualizáciu, kým prvá beží', () => {
    process.env.AKTUALIZACIE_POVOLENE = 'true';
    fs.writeFileSync(sluzba.SUBOR_BEHU, JSON.stringify({ stav: 'prebieha', verzia: '1.4.0', pid: process.pid }));
    expect(() => sluzba.spustiAktualizator(PRIKAZ.verzia, null)).toThrow('Aktualizácia už prebieha');
  });

  it('beh bez živého procesu sa ukáže ako chyba', () => {
    fs.writeFileSync(sluzba.SUBOR_BEHU, JSON.stringify({ stav: 'prebieha', verzia: '1.4.0', pid: 999999999 }));
    expect(sluzba.nacitajBeh()?.stav).toBe('chyba');
    expect(sluzba.aktualizaciaBezi()).toBe(false);
  });

  it('balík bez kontrolného súčtu odmietne', () => {
    process.env.AKTUALIZACIE_POVOLENE = 'true';
    expect(() => sluzba.spustiAktualizator({ ...PRIKAZ.verzia, sha256: null }, null)).toThrow('kontrolný súčet');
  });

  it('zlyhaný príkaz neopakuje, len znova nahlási výsledok', async () => {
    process.env.AKTUALIZACIE_POVOLENE = 'true';
    fs.writeFileSync(sluzba.SUBOR_BEHU, JSON.stringify({ stav: 'chyba', verzia: '1.4.0', prikaz_id: 41, sprava: 'Build zlyhal' }));
    await sluzba.spracujPrikaz(PRIKAZ);
    expect(volania).toHaveLength(1);
    expect(volania[0].telo).toMatchObject({ stav: 'chyba', sprava: 'Build zlyhal' });
    expect(sluzba.nacitajBeh()?.stav).toBe('chyba');
  });
});
