// Umiestnenie: backend/tests/integration/emaily.test.ts
// E-mailový systém: vzhľad a bezpečné vkladanie hodnôt, nastavenia SMTP
// (heslo zašifrované, nikdy v odpovedi), úprava a vypnutie šablón, fronta
// s opakovanými pokusmi, hromadné e-maily len so súhlasom a odhlásenie.
//
// Skutočný SMTP server sa nepoužíva - testy podstrčia vlastný prenos.
// Vyžadujú bežiacu databázu (npm run db:migrate).

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import sequelize from '../../src/config/database';
import models from '../../src/models';
import { adminEmailRouter, verejnyEmailRouter } from '../../src/routes/emaily';
import { nastavPrenosPreTesty, posliSablonu, spracujFrontu } from '../../src/services/email/odosielanie';
import { vyrobEmail } from '../../src/services/email/vzhlad';
import { odkazOdhlasenia } from '../../src/services/email/kampane';

const { User, Fanusik, EmailNastavenia, EmailSablona, EmailFronta, EmailKampan } = models as any;

process.env.JWT_SECRET ||= 'test_tajomstvo';
const P = `em${Date.now()}`;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/admin/email', adminEmailRouter);
app.use('/api/email', verejnyEmailRouter);

let token: string;
let povodne: Record<string, unknown>;
const odoslane: any[] = [];
let zlyhanie: Error | null = null;

const prenos = {
  sendMail: async (m: any) => {
    if (zlyhanie) throw zlyhanie;
    odoslane.push(m);
    return { messageId: 'test' };
  },
  verify: async () => {
    if (zlyhanie) throw zlyhanie;
    return true;
  },
};

const klub = { nazov: 'FK Test', logo: null, farba: '#123456', farbaKontrast: '#ffffff', email: null, telefon: null, adresa: null, web: 'https://klub.sk' };
const get = (u: string) => request(app).get(u).set('Authorization', `Bearer ${token}`);
const post = (u: string, b?: object) => request(app).post(u).set('Authorization', `Bearer ${token}`).send(b ?? {});
const put = (u: string, b: object) => request(app).put(u).set('Authorization', `Bearer ${token}`).send(b);

beforeAll(async () => {
  await sequelize.authenticate();
  const u = await User.findOne({ where: { rola: 'admin', aktivity: true } });
  token = jwt.sign({ userId: u.id, email: u.email, rola: u.rola }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  const n = await EmailNastavenia.nacitaj();
  povodne = { ...n.get() };
  await n.update({ smtp_host: 'smtp.test.local', smtp_port: 587, odosielatel_email: 'web@klub-test.sk', limit_za_minutu: 100 });
  nastavPrenosPreTesty(prenos);
});

afterAll(async () => {
  nastavPrenosPreTesty(null);
  const n = await EmailNastavenia.nacitaj();
  const { id: _id, vytvoreny: _v, aktualizovany: _a, ...hodnoty } = povodne as any;
  await n.update(hodnoty);
  await EmailSablona.destroy({ where: { kluc: ['fanusik_schvalenie', 'objednavka_stav'] } });
  await EmailFronta.destroy({ where: { prijemca: { [Op.like]: `%${P}%` } } });
  await EmailKampan.destroy({ where: { nazov: { [Op.like]: `${P}%` } } });
  await Fanusik.destroy({ where: { email: { [Op.like]: `${P}-%` } } });
});

beforeEach(() => {
  odoslane.length = 0;
  zlyhanie = null;
});

describe('vzhľad e-mailu', () => {
  it('hodnoty od návštevníkov sa escapujú a zápis v nich nefunguje', () => {
    const e = vyrobEmail(
      { predmet: 'Ahoj {{meno}}', obsah: 'Meno: {{meno}}\n\n[Otvoriť]({{odkaz}})' },
      { meno: '<script>x</script> [klik](https://zle.sk)', odkaz: 'https://klub.sk/a?b=1&c=2' },
      klub
    );
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;');
    expect(e.html).not.toContain('href="https://zle.sk"');
    // Samostatný odkaz je tlačidlo s farbou klubu
    expect(e.html).toContain('href="https://klub.sk/a?b=1&amp;c=2"');
    expect(e.html).toContain('background:#123456');
    expect(e.text).toContain('Otvoriť: https://klub.sk/a?b=1&c=2');
  });

  it('riadok s prázdnou značkou sa vynechá, nebezpečný odkaz nie je odkazom', () => {
    const e = vyrobEmail({ predmet: 'P', obsah: 'Ahoj\nPoznámka: {{poznamka}}\n\n[Klik](javascript:alert(1))' }, { poznamka: '' }, klub);
    expect(e.text).not.toContain('Poznámka');
    expect(e.html).not.toContain('href="javascript');
  });
});

describe('nastavenia', () => {
  it('heslo sa uloží zašifrované a nevráti sa', async () => {
    const r = await put('/api/admin/email/nastavenia', {
      smtp_host: 'smtp.test.local',
      smtp_port: 587,
      smtp_zabezpecenie: 'starttls',
      smtp_pouzivatel: 'web@klub-test.sk',
      heslo: 'tajne heslo 123',
      odosielatel_email: 'web@klub-test.sk',
      limit_za_minutu: 100,
    });
    expect(r.status).toBe(200);
    expect(r.body.data.ma_heslo).toBe(true);
    expect(JSON.stringify(r.body)).not.toContain('tajne heslo');
    const surove = await EmailNastavenia.findOne();
    expect(surove.smtp_heslo).toMatch(/^v1:/);
    expect(surove.smtp_heslo).not.toContain('tajne');
    // Prázdne heslo pri ďalšom uložení ponechá pôvodné
    await put('/api/admin/email/nastavenia', { smtp_host: 'smtp.test.local', smtp_port: 587, odosielatel_email: 'web@klub-test.sk', limit_za_minutu: 100 });
    expect((await get('/api/admin/email/nastavenia')).body.data.ma_heslo).toBe(true);
  });

  it('skúšobný e-mail a zrozumiteľná chyba prihlásenia', async () => {
    const ok = await post('/api/admin/email/nastavenia/test', { prijemca: `${P}@test.sk` });
    expect(ok.status).toBe(200);
    expect(odoslane[0].to).toBe(`${P}@test.sk`);

    zlyhanie = Object.assign(new Error('535 Authentication failed'), { code: 'EAUTH', responseCode: 535 });
    const zle = await post('/api/admin/email/nastavenia/test', { prijemca: `${P}@test.sk` });
    expect(zle.status).toBe(400);
    expect(zle.body.message).toContain('Prihlásenie na SMTP server zlyhalo');
  });
});

describe('šablóny', () => {
  it('upravený text sa použije, vypnutá šablóna sa nepošle, obnovenie vráti predvolený', async () => {
    await put('/api/admin/email/sablony/fanusik_schvalenie', { predmet: 'Vitaj {{meno}} v {{klub}}!', obsah: 'Karta: {{cislo_karty}}', aktivna: true });
    expect(await posliSablonu('fanusik_schvalenie', `${P}-a@test.sk`, { meno: 'Eva', cislo_karty: '2026-00001' })).toBe(true);
    expect(odoslane[0].subject).toMatch(/^Vitaj Eva v /);
    expect(odoslane[0].text).toContain('Karta: 2026-00001');

    await put('/api/admin/email/sablony/fanusik_schvalenie', { predmet: 'X', obsah: 'Y', aktivna: false });
    expect(await posliSablonu('fanusik_schvalenie', `${P}-a@test.sk`, { meno: 'Eva' })).toBe(false);
    expect(odoslane).toHaveLength(1);

    await request(app).delete('/api/admin/email/sablony/fanusik_schvalenie').set('Authorization', `Bearer ${token}`);
    const detail = (await get('/api/admin/email/sablony/fanusik_schvalenie')).body.data;
    expect(detail.upravena).toBe(false);
    expect(detail.obsah).toBe(detail.predvoleny_obsah);
  });

  it('odkaz na heslo sa vypnúť nedá a náhľad má ukážkové hodnoty', async () => {
    await put('/api/admin/email/sablony/fanusik_heslo', { predmet: 'Heslo', obsah: 'Odkaz: {{odkaz}}', aktivna: false });
    expect(await posliSablonu('fanusik_heslo', `${P}-b@test.sk`, { meno: 'Eva', odkaz: 'https://klub.sk/x' })).toBe(true);
    await request(app).delete('/api/admin/email/sablony/fanusik_heslo').set('Authorization', `Bearer ${token}`);

    const nahlad = await post('/api/admin/email/sablony/objednavka_zakaznik/nahlad', {});
    expect(nahlad.body.data.html).toContain('2026-0042');
  });
});

describe('fronta', () => {
  it('pri výpadku SMTP e-mail počká a odíde pri ďalšom pokuse', async () => {
    zlyhanie = Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });
    expect(await posliSablonu('objednavka_stav', `${P}-c@test.sk`, { meno: 'Eva', cislo: '1', stav: 'odoslaná' })).toBe(false);
    const z = await EmailFronta.findOne({ where: { prijemca: `${P}-c@test.sk` }, order: [['id', 'DESC']] });
    expect(z.stav).toBe('caka');
    expect(z.pokusy).toBe(1);
    expect(z.posledna_chyba).toContain('Nepodarilo sa spojiť');
    expect(new Date(z.odoslat_po).getTime()).toBeGreaterThan(Date.now());

    zlyhanie = null;
    await z.update({ odoslat_po: new Date(Date.now() - 1000) });
    await spracujFrontu();
    await z.reload();
    expect(z.stav).toBe('odoslany');
    expect(odoslane.some((m) => m.to === `${P}-c@test.sk`)).toBe(true);
  });
});

describe('hromadné e-maily', () => {
  it('len fanúšikom so súhlasom, s odkazom na odhlásenie', async () => {
    const so = await Fanusik.create({ meno: 'Súhlas', priezvisko: 'Áno', email: `${P}-so@test.sk`, stav: 'aktivny', suhlas_oznamy: true, typ_clenstva: 'clen' });
    await Fanusik.create({ meno: 'Bez', priezvisko: 'Súhlasu', email: `${P}-bez@test.sk`, stav: 'aktivny', suhlas_oznamy: false, typ_clenstva: 'clen' });
    await Fanusik.create({ meno: 'Iný', priezvisko: 'Typ', email: `${P}-vip@test.sk`, stav: 'aktivny', suhlas_oznamy: true, typ_clenstva: 'vip' });

    const k = await post('/api/admin/email/kampane', { nazov: `${P} oznam`, predmet: 'Ahoj {{meno}}', obsah: 'Zápas v sobotu!', adresati: { typy: ['clen'] } });
    expect(k.status).toBe(201);
    const id = k.body.data.id;
    const pocet = (await post('/api/admin/email/kampane/pocet', { adresati: { typy: ['clen'] } })).body.data.pocet;
    expect(pocet).toBeGreaterThanOrEqual(1);

    const r = await post(`/api/admin/email/kampane/${id}/odoslat`);
    expect(r.status).toBe(200);
    // Druhé odoslanie nejde
    expect((await post(`/api/admin/email/kampane/${id}/odoslat`)).status).toBe(400);
    // Odosielanie beží na pozadí - počkáme, kým fronta kampane nie je prázdna
    for (let i = 0; i < 50; i++) {
      await spracujFrontu();
      if (!(await EmailFronta.count({ where: { kampan_id: id, stav: ['caka', 'odosiela'] } }))) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect((await get(`/api/admin/email/kampane/${id}`)).body.data.stav).toBe('odoslana');

    const moje = odoslane.filter((m) => String(m.to).includes(P));
    expect(moje.map((m) => m.to)).toEqual([`${P}-so@test.sk`]);
    expect(moje[0].subject).toBe('Ahoj Súhlas');
    expect(moje[0].headers['List-Unsubscribe']).toContain('/email/odhlasit?f=');

    // Odhlásenie: GET len zobrazí potvrdenie, POST odhlási
    const cesta = new URL(odkazOdhlasenia(so.id)).search;
    expect((await request(app).get(`/api/email/odhlasit${cesta}`)).status).toBe(200);
    await so.reload();
    expect(so.suhlas_oznamy).toBe(true);
    expect((await request(app).post(`/api/email/odhlasit${cesta}`).type('form').send('List-Unsubscribe=One-Click')).status).toBe(200);
    await so.reload();
    expect(so.suhlas_oznamy).toBe(false);
    expect((await request(app).post(`/api/email/odhlasit?f=${so.id}&t=zly-podpis`)).status).toBe(404);
  });
});
