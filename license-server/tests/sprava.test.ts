// Umiestnenie: license-server/tests/sprava.test.ts
// Celý tok licenčného servera: prihlásenie a 2FA, licencie, podpísané
// overenie, verzie z GitHubu (falošný GitHub), balíky, príkazy na
// aktualizáciu a ich priebeh, pozastavenie, export, hromadná aktualizácia.

import './prostredie';
import crypto from 'crypto';
import http from 'http';
import zlib from 'zlib';
import { AddressInfo } from 'net';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { VEREJNY_KLUC, pripravDatabazu } from './prostredie';

// ===== Falošný GitHub =====
const BALIK = zlib.gzipSync(Buffer.from('obsah verzie 1.1.0'));
const SHA_BALIKA = crypto.createHash('sha256').update(BALIK).digest('hex');
let github: http.Server;

const spustiGithub = () =>
  new Promise<void>((resolve) => {
    github = http.createServer((req, res) => {
      const json = (data: unknown) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };
      if (req.url?.startsWith('/repos/klub/cms/releases')) {
        return json([
          { tag_name: 'v1.1.0', name: 'Jesenná verzia', body: '- Nová šablóna\n- Opravy', prerelease: false, draft: false, published_at: '2026-09-20T10:00:00Z' },
          { tag_name: 'v1.2.0-beta.1', name: 'Beta', body: 'Skúšobná', prerelease: true, draft: false, published_at: '2026-09-25T10:00:00Z' },
          { tag_name: 'koncept', name: 'Rozpracované', body: '', prerelease: false, draft: true },
        ]);
      }
      if (req.url?.startsWith('/repos/klub/cms/tags')) {
        return json([{ name: 'v1.1.0', commit: { sha: 'abc123' } }, { name: 'v1.0.0', commit: { sha: 'def456' } }, { name: 'nahodny-tag', commit: { sha: 'x' } }]);
      }
      if (req.url === '/repos/klub/cms/tarball/v1.1.0' || req.url === '/repos/klub/cms/tarball/v1.0.0') {
        res.setHeader('Content-Type', 'application/gzip');
        return res.end(BALIK);
      }
      res.statusCode = 404;
      json({ message: 'Not Found' });
    });
    github.listen(0, '127.0.0.1', () => {
      process.env.GITHUB_API_URL = `http://127.0.0.1:${(github.address() as AddressInfo).port}`;
      resolve();
    });
  });

// ===== Pomôcky =====
let app: any;
let agent: request.SuperAgentTest;
const EMAIL = 'spravca@clubw.sk';
const HESLO = 'dlhe tajne heslo spravcu';

const stabilnyJson = (h: unknown): string => {
  if (h === null || typeof h !== 'object') return JSON.stringify(h);
  if (Array.isArray(h)) return `[${h.map(stabilnyJson).join(',')}]`;
  return `{${Object.keys(h as object).sort().map((k) => `${JSON.stringify(k)}:${stabilnyJson((h as any)[k])}`).join(',')}}`;
};
const podpisSedi = (telo: any) => crypto.verify(null, Buffer.from(stabilnyJson(telo.data)), crypto.createPublicKey(VEREJNY_KLUC), Buffer.from(telo.podpis, 'base64'));

const post = (cesta: string, telo: object = {}) => agent.post(`/api/sprava${cesta}`).set('X-Poziadavka', '1').send(telo);
const put = (cesta: string, telo: object = {}) => agent.put(`/api/sprava${cesta}`).set('X-Poziadavka', '1').send(telo);
const get = (cesta: string) => agent.get(`/api/sprava${cesta}`);
const over = (kluc: string, verzia?: string) =>
  request(app).post('/api/license/verify').send({ licenseKey: kluc, domena: 'fkdolina.sk', verzia, instalacia: { adresa: 'https://fkdolina.sk', node: 'v22', zly: { vnoreny: 1 } } });

const pockaj = async (podmienka: () => Promise<boolean>, ms = 5000) => {
  const koniec = Date.now() + ms;
  while (Date.now() < koniec) {
    if (await podmienka()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Podmienka sa nesplnila včas');
};

let sequelize: any;

beforeAll(async () => {
  await spustiGithub();
  sequelize = await pripravDatabazu();
  app = (await import('../src/app')).default;
  const { Administrator } = await import('../src/models/sprava');
  const { zahasujHeslo } = await import('../src/utils/heslo');
  await Administrator.create({ email: EMAIL, meno: 'Hlavný správca', heslo_hash: await zahasujHeslo(HESLO) });
  agent = request.agent(app);
});

afterAll(async () => {
  github?.close();
  await sequelize?.close();
});

describe('prihlásenie', () => {
  it('bez prihlásenia administrácia nič nevydá', async () => {
    expect((await request(app).get('/api/sprava/licencie')).status).toBe(401);
  });

  it('nesprávne heslo a neznámy e-mail vrátia rovnakú chybu', async () => {
    const zle = await request(app).post('/api/sprava/prihlasenie').set('X-Poziadavka', '1').send({ email: EMAIL, heslo: 'zle heslo nie je dobre' });
    const nikto = await request(app).post('/api/sprava/prihlasenie').set('X-Poziadavka', '1').send({ email: 'nikto@clubw.sk', heslo: 'hocico hocico' });
    expect(zle.status).toBe(401);
    expect(nikto.status).toBe(401);
    expect(zle.body.message).toBe(nikto.body.message);
  });

  it('zmena bez hlavičky X-Poziadavka je odmietnutá (CSRF)', async () => {
    const r = await request(app).post('/api/sprava/prihlasenie').send({ email: EMAIL, heslo: HESLO });
    expect(r.status).toBe(403);
  });

  it('prihlásenie nastaví bezpečnú cookie relácie', async () => {
    const r = await post('/prihlasenie', { email: EMAIL, heslo: HESLO });
    expect(r.status).toBe(200);
    const cookie = String(r.headers['set-cookie']);
    expect(cookie).toMatch(/clubw_licencie=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect((await get('/ja')).body.data.email).toBe(EMAIL);
  });

  it('dvojstupňové overenie: zapnutie a prihlásenie s kódom', async () => {
    const { kodPreCas } = await import('../src/utils/totp');
    const priprava = await post('/ja/2fa/priprav');
    expect(priprava.body.data.odkaz).toMatch(/^otpauth:\/\/totp\//);
    expect((await post('/ja/2fa/zapni', { kod: '000000' })).status).toBe(400);
    expect((await post('/ja/2fa/zapni', { kod: kodPreCas(priprava.body.data.tajomstvo) })).status).toBe(200);

    const druhy = request.agent(app);
    const bezKodu = await druhy.post('/api/sprava/prihlasenie').set('X-Poziadavka', '1').send({ email: EMAIL, heslo: HESLO });
    expect(bezKodu.status).toBe(401);
    expect(bezKodu.body.vyzaduje_kod).toBe(true);
    const sKodom = await druhy
      .post('/api/sprava/prihlasenie')
      .set('X-Poziadavka', '1')
      .send({ email: EMAIL, heslo: HESLO, kod: kodPreCas(priprava.body.data.tajomstvo) });
    expect(sKodom.status).toBe(200);
    expect((await post('/ja/2fa/vypni', { heslo: HESLO })).status).toBe(200);
  });
});

let produktId: number;
let licencia: any;

describe('licencie a overenie', () => {
  it('prvý produkt ClubW existuje s plánmi Pro a Enterprise', async () => {
    const r = await get('/produkty');
    const clubw = r.body.data.find((p: any) => p.kod === 'clubw');
    expect(clubw.plany.map((p: any) => p.kod)).toEqual(['pro', 'enterprise']);
    produktId = clubw.id;
    expect((await put(`/produkty/${produktId}`, { github_repo: 'https://github.com/klub/cms.git' })).body.data.github_repo).toBe('klub/cms');
  });

  it('nová licencia: kľúč, platnosť podľa plánu, normalizovaná doména', async () => {
    const r = await post('/licencie', { produkt_id: produktId, plan: 'enterprise', nazov_klienta: 'FK Dolina', email_klienta: 'Info@FKDolina.sk', domena: 'https://www.FKDolina.sk/' });
    expect(r.status).toBe(201);
    licencia = r.body.data;
    expect(licencia.kluc).toMatch(/^CLUBW(-[A-Z0-9]{4}){4}$/);
    expect(licencia.domena).toBe('fkdolina.sk');
    expect(licencia.email_klienta).toBe('info@fkdolina.sk');
    const rokov = (new Date(licencia.platna_do).getTime() - Date.now()) / (365 * 24 * 3600 * 1000);
    expect(Math.round(rokov)).toBe(2);
    expect((await post('/licencie', { produkt_id: produktId, plan: 'neexistuje', nazov_klienta: 'X', email_klienta: 'x@x.sk' })).status).toBe(400);
  });

  it('overenie licencie je podpísané a zapíše verziu a údaje o inštalácii', async () => {
    const r = await over(licencia.kluc, 'v1.0.0');
    expect(r.body.data.platna).toBe(true);
    expect(podpisSedi(r.body)).toBe(true);
    expect(r.body.data.aktualizacia).toBeNull();
    const detail = (await get(`/licencie/${licencia.id}`)).body.data;
    expect(detail.nainstalovana_verzia).toBe('1.0.0');
    expect(detail.online).toBe(true);
    expect(detail.instalacia.adresa).toBe('https://fkdolina.sk');
    expect(detail.instalacia.zly).toBeUndefined();
    expect(detail.udalosti.some((u: any) => u.typ === 'instalacia_prvy_kontakt')).toBe(true);
  });

  it('nesprávna doména a neexistujúci kľúč sú zamietnuté s podpisom', async () => {
    const zlaDomena = await request(app).post('/api/license/verify').send({ licenseKey: licencia.kluc, domena: 'iny-klub.sk' });
    expect(zlaDomena.body.data.dovod).toBe('nespravna_domena');
    const nikto = await request(app).post('/api/license/verify').send({ licenseKey: 'CLUBW-XXXX-XXXX-XXXX-XXXX' });
    expect(nikto.status).toBe(404);
    expect(podpisSedi(nikto.body)).toBe(true);
  });
});

let verzia110: any;

describe('verzie a aktualizácie', () => {
  it('synchronizácia z GitHubu berie vydania aj tagy v tvare verzie', async () => {
    const r = await post(`/produkty/${produktId}/synchronizovat`);
    expect(r.status).toBe(200);
    expect(r.body.data.nove).toBe(3);
    const verzie = (await get(`/produkty/${produktId}/verzie`)).body.data;
    expect(verzie.map((v: any) => v.verzia)).toEqual(['1.2.0-beta.1', '1.1.0', '1.0.0']);
    verzia110 = verzie.find((v: any) => v.verzia === '1.1.0');
    expect(verzia110.poznamky).toContain('Nová šablóna');
    expect(verzie.find((v: any) => v.verzia === '1.0.0').instalacii).toBe(1);
  });

  it('aktuálna verzia pripraví balík a overenie ponúkne aktualizáciu s kontrolným súčtom', async () => {
    expect((await post(`/verzie/${verzia110.id}/aktualna`)).status).toBe(200);
    await pockaj(async () => (await get(`/produkty/${produktId}/verzie`)).body.data.find((v: any) => v.id === verzia110.id).balik_stav === 'pripraveny');
    const r = await over(licencia.kluc, '1.0.0');
    expect(r.body.data.aktualizacia).toMatchObject({ verzia: '1.1.0', sha256: SHA_BALIKA, povinna: false });
    expect(podpisSedi(r.body)).toBe(true);
    // Na aktuálnej verzii už aktualizácia nie je
    expect((await over(licencia.kluc, '1.1.0')).body.data.aktualizacia).toBeNull();
    await over(licencia.kluc, '1.0.0');
  });

  it('minimálna verzia robí aktualizáciu povinnou', async () => {
    await put(`/produkty/${produktId}`, { minimalna_verzia: 'v1.1.0' });
    expect((await over(licencia.kluc, '1.0.0')).body.data.aktualizacia.povinna).toBe(true);
    await put(`/produkty/${produktId}`, { minimalna_verzia: '' });
  });

  it('balík sa stiahne len s platným kľúčom a sedí mu súčet', async () => {
    expect((await request(app).get(`/api/license/balik/${verzia110.id}`)).status).toBe(403);
    const r = await request(app).get(`/api/license/balik/${verzia110.id}`).set('X-License-Key', licencia.kluc).buffer(true).parse((res, cb) => {
      const kusy: Buffer[] = [];
      res.on('data', (k: Buffer) => kusy.push(k));
      res.on('end', () => cb(null, Buffer.concat(kusy)));
    });
    expect(r.status).toBe(200);
    expect(crypto.createHash('sha256').update(r.body).digest('hex')).toBe(SHA_BALIKA);
  });

  it('príkaz na aktualizáciu: zadanie, prevzatie inštaláciou, dokončenie novou verziou', async () => {
    const zadanie = await post(`/licencie/${licencia.id}/aktualizovat`);
    expect(zadanie.status).toBe(201);
    expect((await post(`/licencie/${licencia.id}/aktualizovat`)).status).toBe(409);

    const overenie = await over(licencia.kluc, '1.0.0');
    const prikaz = overenie.body.data.prikaz;
    expect(prikaz).toMatchObject({ typ: 'aktualizacia', verzia: { verzia: '1.1.0', sha256: SHA_BALIKA } });

    // Cudzí kľúč príkaz meniť nesmie
    expect((await request(app).post(`/api/license/prikaz/${prikaz.id}`).send({ licenseKey: 'CLUBW-AAAA-AAAA-AAAA-AAAA', stav: 'hotovo' })).status).toBe(404);
    expect((await request(app).post(`/api/license/prikaz/${prikaz.id}`).send({ licenseKey: licencia.kluc, stav: 'prevzaty' })).status).toBe(200);
    expect((await request(app).post(`/api/license/prikaz/${prikaz.id}`).send({ licenseKey: licencia.kluc, stav: 'prebieha', sprava: 'Sťahujem balík' })).status).toBe(200);

    // Inštalácia po reštarte hlási novú verziu → príkaz je hotový
    await over(licencia.kluc, '1.1.0');
    const prikazy = (await get(`/prikazy?licencia_id=${licencia.id}`)).body.data;
    expect(prikazy[0].stav).toBe('hotovo');
    expect((await request(app).post(`/api/license/prikaz/${prikaz.id}`).send({ licenseKey: licencia.kluc, stav: 'chyba' })).status).toBe(409);
  });

  it('automatické aktualizácie vytvoria príkaz samé', async () => {
    const auto = (await post('/licencie', { produkt_id: produktId, plan: 'pro', nazov_klienta: 'TJ Auto', email_klienta: 'auto@tj.sk', automaticke_aktualizacie: true })).body.data;
    const r = await over(auto.kluc, '1.0.0');
    expect(r.body.data.prikaz?.verzia.verzia).toBe('1.1.0');
    const detail = (await get(`/licencie/${auto.id}`)).body.data;
    expect(detail.prikazy[0].sprava).toBe('Automatická aktualizácia');
  });

  it('hromadná aktualizácia zadá príkaz len starším aktívnym inštaláciám', async () => {
    const stara = (await post('/licencie', { produkt_id: produktId, plan: 'pro', nazov_klienta: 'ŠK Stará', email_klienta: 'stara@sk.sk' })).body.data;
    await over(stara.kluc, '1.0.0');
    const r = await post(`/produkty/${produktId}/aktualizovat`, {});
    expect(r.status).toBe(200);
    // FK Dolina už má 1.1.0, TJ Auto má rozpracovaný automatický príkaz
    expect(r.body.data.zadane).toBe(1);
    expect(r.body.data.preskocene.some((s: string) => s.startsWith('TJ Auto'))).toBe(true);
  });

  it('pripnutá verzia: licencia nedostane novšiu verziu', async () => {
    const verzie = (await get(`/produkty/${produktId}/verzie`)).body.data;
    const v100 = verzie.find((v: any) => v.verzia === '1.0.0');
    const pripnuta = (await post('/licencie', { produkt_id: produktId, plan: 'pro', nazov_klienta: 'FC Pripnutý', email_klienta: 'pin@fc.sk', pripnuta_verzia_id: v100.id })).body.data;
    expect((await over(pripnuta.kluc, '1.0.0')).body.data.aktualizacia).toBeNull();
  });
});

describe('správa licencie', () => {
  it('pozastavenie: overenie zamietne, balík sa nestiahne, obnovenie vráti platnosť', async () => {
    expect((await post(`/licencie/${licencia.id}/pozastavit`, { dovod: 'Nezaplatená faktúra' })).status).toBe(200);
    expect((await over(licencia.kluc, '1.1.0')).body.data.dovod).toBe('licencia_pozastavena');
    expect((await request(app).get(`/api/license/balik/${verzia110.id}`).set('X-License-Key', licencia.kluc)).status).toBe(403);
    expect((await post(`/licencie/${licencia.id}/obnovit`)).status).toBe(200);
    expect((await over(licencia.kluc, '1.1.0')).body.data.platna).toBe(true);
  });

  it('predĺženie a úprava sa zapíšu do udalostí s rozdielom', async () => {
    const pred = new Date(licencia.platna_do);
    const r = await post(`/licencie/${licencia.id}/predlzit`, { mesiacov: 12 });
    expect(new Date(r.body.data.platna_do).getFullYear()).toBe(pred.getFullYear() + 1);
    await put(`/licencie/${licencia.id}`, { poznamka: 'VIP klient' });
    const udalosti = (await get(`/licencie/${licencia.id}`)).body.data.udalosti;
    expect(udalosti.find((u: any) => u.typ === 'licencia_upravena').detaily.poznamka.po).toBe('VIP klient');
    expect(udalosti.some((u: any) => u.typ === 'licencia_predlzena')).toBe(true);
  });

  it('funkcie licencie s dvojbodkou sa uložia a web ich dostane v podpísanom overení', async () => {
    const r = await put(`/licencie/${licencia.id}`, { funkcie: ['sablona:arena', 'Sablony:Vsetky', 'sablona:arena'] });
    expect(r.status).toBe(200);
    expect(r.body.data.funkcie).toEqual(['sablona:arena', 'sablony:vsetky']);
    expect((await get(`/licencie/${licencia.id}`)).body.data.funkcie).toEqual(['sablona:arena', 'sablony:vsetky']);
    const overenie = await over(licencia.kluc, 'v1.0.0');
    expect(overenie.body.data.funkcie).toEqual(['sablona:arena', 'sablony:vsetky']);
    expect(podpisSedi(overenie.body)).toBe(true);
    // Neplatná funkcia sa nezahodí potichu, ale vráti chybu
    expect((await put(`/licencie/${licencia.id}`, { funkcie: ['sablona arena!'] })).status).toBe(400);
    // Funkcie plánu prejdú rovnako
    const plany = [{ kod: 'pro', nazov: 'Pro', mesiacov: 12, funkcie: ['sablona:klubova'] }, { kod: 'enterprise', nazov: 'Enterprise', mesiacov: 24, funkcie: ['sablony:vsetky'] }];
    const p = await put(`/produkty/${produktId}`, { plany });
    expect(p.body.data.plany.map((x: any) => x.funkcie)).toEqual([['sablona:klubova'], ['sablony:vsetky']]);
  });

  it('nový kľúč: starý prestane platiť', async () => {
    const stary = licencia.kluc;
    const novy = (await post(`/licencie/${licencia.id}/novy-kluc`)).body.data.kluc;
    expect(novy).not.toBe(stary);
    expect((await request(app).post('/api/license/verify').send({ licenseKey: stary })).body.data.dovod).toBe('neexistujuca_licencia');
    licencia.kluc = novy;
  });

  it('zmazať sa dá len nepoužitú licenciu', async () => {
    expect((await agent.delete(`/api/sprava/licencie/${licencia.id}`).set('X-Poziadavka', '1')).status).toBe(409);
    const nova = (await post('/licencie', { produkt_id: produktId, plan: 'pro', nazov_klienta: 'Omylom', email_klienta: 'omyl@x.sk' })).body.data;
    expect((await agent.delete(`/api/sprava/licencie/${nova.id}`).set('X-Poziadavka', '1')).status).toBe(200);
  });

  it('zoznam: filtre, hľadanie a export do CSV', async () => {
    expect((await get('/licencie?hladat=dolina')).body.data.map((l: any) => l.nazov_klienta)).toEqual(['FK Dolina']);
    expect((await get('/licencie?stav=online')).body.strankovanie.celkom).toBeGreaterThanOrEqual(3);
    expect((await get('/licencie?stav=pozastavena')).body.strankovanie.celkom).toBe(0);
    const csv = await get('/licencie/export.csv');
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('FK Dolina');
  });

  it('prehľad spočíta licencie, verzie a udalosti', async () => {
    const p = (await get('/prehlad')).body.data;
    expect(p.licencie.aktivne).toBeGreaterThanOrEqual(4);
    expect(p.produkty[0].aktualna_verzia.verzia).toBe('1.1.0');
    expect(p.udalosti.length).toBeGreaterThan(0);
  });

  it('administrátori: nový správca, krátke heslo odmietnuté, odhlásenie ukončí reláciu', async () => {
    expect((await post('/administratori', { email: 'druhy@clubw.sk', meno: 'Druhý', heslo: 'kratke' })).status).toBe(400);
    expect((await post('/administratori', { email: 'druhy@clubw.sk', meno: 'Druhý', heslo: 'dostatocne dlhe heslo' })).status).toBe(201);
    expect((await post('/odhlasenie')).status).toBe(200);
    expect((await get('/ja')).status).toBe(401);
  });
});
