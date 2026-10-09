// Umiestnenie: backend/tests/integration/registraciaHladanie.test.ts
// Registrácia fanúšika/člena z webu a vyhľadávanie na webe.
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import NastaveniaKlubu from '../../src/models/NastaveniaKlubu';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import sequelize from '../../src/config/database';
import '../../src/models';
import Fanusik from '../../src/models/Fanusik';
import Page from '../../src/models/Page';
import klubRoutes from '../../src/routes/klub';
import hladanieRouter from '../../src/routes/hladanie';

const P = `R${Date.now()}`;
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api', klubRoutes);
app.use('/api', hladanieRouter);

let stranka: Page;

beforeAll(async () => {
  await sequelize.authenticate();
  stranka = await Page.create({ nazov: `${P} Nábor detí`, slug: `${P.toLowerCase()}-nabor`, obsah: '<p>Prihláste dieťa do futbalovej prípravky.</p>', publikovany: true });
});

afterAll(async () => {
  await Fanusik.destroy({ where: { email: { [Op.like]: `${P.toLowerCase()}%` } } });
  await stranka.destroy();
});

const registruj = (udaje: Record<string, unknown>, ip = '10.0.0.1') =>
  request(app).post('/api/fans/registracia').set('X-Forwarded-For', ip).send({ meno: 'Ján', priezvisko: 'Fanúšik', suhlas_gdpr: true, heslo: 'modra lavica pri tichom rybniku', ...udaje });

describe('registrácia z webu', () => {
  it('vytvorí žiadosť o členstvo', async () => {
    const r = await registruj({ email: `${P.toLowerCase()}a@example.com`, typ: 'clen', datum_narodenia: '1990-05-01', telefon: '0900 111 222' });
    expect(r.status).toBe(201);
    const f = await Fanusik.findOne({ where: { email: `${P.toLowerCase()}a@example.com` } });
    expect(f).toMatchObject({ stav: 'ziadost', zdroj: 'web', typ_clenstva: 'clen', datum_narodenia: '1990-05-01' });
  });

  it('bez súhlasu alebo so zlým e-mailom odmietne, duplicitu neprezradí', async () => {
    expect((await registruj({ email: `${P.toLowerCase()}b@example.com`, suhlas_gdpr: false }, '10.0.0.2')).status).toBe(400);
    expect((await registruj({ email: 'zly-email' }, '10.0.0.2')).status).toBe(400);
    const znova = await registruj({ email: `${P.toLowerCase()}a@example.com` }, '10.0.0.2');
    expect(znova.status).toBe(201);
    expect(await Fanusik.count({ where: { email: `${P.toLowerCase()}a@example.com` } })).toBe(1);
  });

  it('heslo je povinné, vypnutý typ a povinné pole sa skontrolujú', async () => {
    expect((await registruj({ email: `${P.toLowerCase()}d@example.com`, heslo: '' }, '10.0.0.4')).status).toBe(400);
    const klub = await NastaveniaKlubu.nacitaj();
    const povodne = klub.nastavenia_registracie;
    await klub.update({ nastavenia_registracie: { typy: { fanusik: true, clen: false }, polia: { telefon: { rezim: 'povinne', len_clen: false } } } });
    try {
      expect((await registruj({ email: `${P.toLowerCase()}d@example.com`, typ: 'clen', telefon: '0900 1' }, '10.0.0.4')).status).toBe(400);
      expect((await registruj({ email: `${P.toLowerCase()}d@example.com` }, '10.0.0.4')).status).toBe(400);
      expect((await registruj({ email: `${P.toLowerCase()}d@example.com`, telefon: '0900 111 333' }, '10.0.0.4')).status).toBe(201);
    } finally {
      await klub.update({ nastavenia_registracie: povodne });
    }
  });

  it('robot s vyplneným skrytým poľom nič nevytvorí', async () => {
    const r = await registruj({ email: `${P.toLowerCase()}c@example.com`, web: 'http://spam' }, '10.0.0.3');
    expect(r.status).toBe(201);
    expect(await Fanusik.count({ where: { email: `${P.toLowerCase()}c@example.com` } })).toBe(0);
  });
});

describe('vyhľadávanie', () => {
  it('nájde zverejnenú stránku podľa textu', async () => {
    const r = await request(app).get('/api/hladat').query({ q: 'prípravky' });
    expect(r.status).toBe(200);
    expect(r.body.data.some((v: any) => v.typ === 'stranka' && v.odkaz === `/${stranka.slug}`)).toBe(true);
  });

  it('krátky dotaz odmietne', async () => {
    expect((await request(app).get('/api/hladat').query({ q: 'a' })).status).toBe(400);
  });
});
