// Umiestnenie: backend/tests/integration/fanusikUcet.test.ts
// Účet fanúšika: registrácia s heslom, prihlásenie, schválenie (číslo
// karty, QR kód), výhody podľa typu členstva, overenie karty, pozvánka
// od klubu, zmena hesla a oddelenie od účtov administrácie.
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import sequelize from '../../src/config/database';
import models from '../../src/models';
import klubRoutes from '../../src/routes/klub';
import { fanusikRouter, adminFanusikRouter } from '../../src/routes/fanusik';
import { authenticateToken } from '../../src/middleware/auth';

const { Fanusik, FanusikToken, VyhodaFanusika, User } = models as any;

process.env.JWT_SECRET ||= 'test_tajomstvo';
const P = `fu${Date.now()}`;
const HESLO = 'zelene pole za dedinou';
const email = (s: string) => `${P}-${s}@test.sk`;

const app = express();
app.use(express.json());
app.use('/api', klubRoutes);
app.use('/api/fan', fanusikRouter);
app.use('/api/admin', adminFanusikRouter);
app.get('/api/admin-test', authenticateToken, (_req, res) => res.json({ success: true }));

let adminToken: string;
const vyhody: any[] = [];

beforeAll(async () => {
  await sequelize.authenticate();
  const admin = await User.findOne({ where: { rola: 'admin', aktivity: true } });
  adminToken = jwt.sign({ userId: admin.id, email: admin.email, rola: admin.rola }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  vyhody.push(await VyhodaFanusika.create({ nazov: `${P} pre všetkých`, kod: 'VSETCI10' }));
  vyhody.push(await VyhodaFanusika.create({ nazov: `${P} len VIP`, typy_clenstva: ['vip'], kod: 'VIP20' }));
  vyhody.push(await VyhodaFanusika.create({ nazov: `${P} skončená`, platne_do: '2020-01-01' }));
});

afterAll(async () => {
  await Fanusik.destroy({ where: { email: { [Op.like]: `${P}-%` } } });
  for (const v of vyhody) await v.destroy();
});

const registruj = (s: string, heslo?: string) =>
  request(app).post('/api/fans/registracia').send({ meno: 'Ján', priezvisko: 'Testovací', email: email(s), suhlas_gdpr: true, heslo });
const prihlas = (s: string, heslo = HESLO) => request(app).post('/api/fan/prihlasenie').send({ email: email(s), heslo });
const ja = (token: string) => request(app).get('/api/fan/ja').set('Authorization', `Bearer ${token}`);

describe('účet fanúšika', () => {
  it('registrácia s heslom, prihlásenie, čakanie na schválenie', async () => {
    expect((await registruj('a', HESLO)).body.data.ucet).toBe(true);
    const prihlasenie = await prihlas('a');
    expect(prihlasenie.status).toBe(200);
    const token = prihlasenie.body.data.token;

    const profil = (await ja(token)).body.data;
    expect(profil).toMatchObject({ stav: 'ziadost', platne: false, cislo_karty: null, overovaci_kod: null });
    expect(profil.heslo_hash).toBeUndefined();

    const vyhodyPred = await request(app).get('/api/fan/vyhody').set('Authorization', `Bearer ${token}`);
    expect(vyhodyPred.body.data).toEqual([]);
    expect(vyhodyPred.body.meta.dostupne).toBe(false);
  });

  it('slabé heslo a zlé prihlasovacie údaje', async () => {
    expect((await registruj('slabe', 'heslo')).status).toBe(400);
    expect((await prihlas('a', 'zle heslo nie')).status).toBe(401);
    expect((await prihlas('neexistuje')).status).toBe(401);
  });

  it('schválenie pridelí kartu a sprístupní výhody podľa typu', async () => {
    const f = await Fanusik.findOne({ where: { email: email('a') } });
    const schvalenie = await request(app).post(`/api/admin/fans/${f.id}/schvalit`).set('Authorization', `Bearer ${adminToken}`);
    expect(schvalenie.status).toBe(200);

    const token = (await prihlas('a')).body.data.token;
    const profil = (await ja(token)).body.data;
    expect(profil.platne).toBe(true);
    expect(profil.cislo_karty).toMatch(/^\d{4}-\d{5}$/);
    expect(profil.overovaci_kod).toHaveLength(20);

    const nazvy = (await request(app).get('/api/fan/vyhody').set('Authorization', `Bearer ${token}`)).body.data.map((v: any) => v.nazov);
    expect(nazvy).toContain(`${P} pre všetkých`);
    expect(nazvy).not.toContain(`${P} len VIP`);
    expect(nazvy).not.toContain(`${P} skončená`);

    const overenie = await request(app).get(`/api/fan/overenie/${profil.overovaci_kod}`);
    expect(overenie.body.data).toMatchObject({ platne: true, meno: 'Ján T.', cislo_karty: profil.cislo_karty });
    expect(overenie.body.data.email).toBeUndefined();
    expect((await request(app).get('/api/fan/overenie/neexistujucikod123')).status).toBe(404);
  });

  it('pozvánka od klubu: odkaz nastaví heslo raz', async () => {
    const f = await Fanusik.create({ meno: 'Eva', priezvisko: 'Pozvaná', email: email('b'), stav: 'aktivny' });
    const pozvanka = await request(app).post(`/api/admin/fans/${f.id}/pozvanka`).set('Authorization', `Bearer ${adminToken}`);
    const token = new URL(pozvanka.body.data.odkaz).searchParams.get('token');
    expect(token).toBeTruthy();

    const nastavenie = await request(app).post('/api/fan/heslo/nastavit').send({ token, heslo: HESLO });
    expect(nastavenie.status).toBe(200);
    expect((await ja(nastavenie.body.data.token)).body.data.email).toBe(email('b'));
    // Druhé použitie odkazu nefunguje
    expect((await request(app).post('/api/fan/heslo/nastavit').send({ token, heslo: HESLO })).status).toBe(400);
    expect(await FanusikToken.count({ where: { fanusik_id: f.id, pouzity: false } })).toBe(0);
  });

  it('zmena hesla odhlási staré prihlásenia', async () => {
    const stary = (await prihlas('b')).body.data.token;
    const zmena = await request(app)
      .put('/api/fan/ja/heslo')
      .set('Authorization', `Bearer ${stary}`)
      .send({ stare_heslo: HESLO, nove_heslo: 'modre more pri ostrove' });
    expect(zmena.status).toBe(200);
    expect((await ja(stary)).status).toBe(401);
    expect((await ja(zmena.body.data.token)).status).toBe(200);
  });

  it('účty fanúšikov a administrácie sú oddelené', async () => {
    const fanToken = (await prihlas('a')).body.data.token;
    expect((await request(app).get('/api/admin-test').set('Authorization', `Bearer ${fanToken}`)).status).toBe(401);
    expect((await ja(adminToken)).status).toBe(401);
    // Administrácia nevidí heslo ani kód karty
    const zoznam = await request(app).get(`/api/fans?search=${P}`).set('Authorization', `Bearer ${adminToken}`);
    const a = zoznam.body.data.find((f: any) => f.email === email('a'));
    expect(a.ma_ucet).toBe(true);
    expect(a.heslo_hash).toBeUndefined();
    expect(a.overovaci_kod).toBeUndefined();
  });

  it('zrušenie účtu zmaže údaje', async () => {
    const token = (await prihlas('a')).body.data.token;
    expect((await request(app).delete('/api/fan/ja').set('Authorization', `Bearer ${token}`).send({ heslo: 'zle' })).status).toBe(400);
    expect((await request(app).delete('/api/fan/ja').set('Authorization', `Bearer ${token}`).send({ heslo: HESLO })).status).toBe(200);
    expect(await Fanusik.count({ where: { email: email('a') } })).toBe(0);
  });
});
