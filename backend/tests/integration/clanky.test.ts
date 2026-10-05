// Umiestnenie: backend/tests/integration/clanky.test.ts
// Vytvorenie článku z administrácie: rovnaký názov ako existujúci článok
// (opakovaný pokus po chybe), dlhý formátovaný text, dátum v minulosti
// a príliš dlhá adresa obrázka (predtým chyba 500).
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import sequelize from '../../src/config/database';
import models from '../../src/models';
import { Op } from 'sequelize';
import { createArticle, validateArticle } from '../../src/controllers/articleController';

const { Article, Category, User } = models as any;
const P = `Clanok test ${Date.now()}`;
let kategoriaId: number;
let autorId: number;

const app = express();
app.use(express.json({ limit: '10mb' }));
app.post('/api/admin/articles', (req: any, _res, next) => { req.userId = autorId; next(); }, validateArticle, createArticle);

const clanok = (udaje: Record<string, unknown> = {}) => ({
  nazov: P,
  obsah: '<p>Dlhý text článku s viac ako desiatimi znakmi.</p>',
  excerpt: 'Krátky text.',
  obrazok: '/uploads/media/2026/09/foto.jpg',
  kategoria_id: kategoriaId,
  status: 'published',
  publikovany_datum: '2026-09-15T12:30:00.000Z',
  ...udaje,
});

beforeAll(async () => {
  await sequelize.authenticate();
  kategoriaId = (await Category.findOne()).id;
  autorId = (await User.findOne()).id;
});

afterAll(async () => {
  await Article.destroy({ where: { nazov: { [Op.like]: `${P}%` } }, force: true });
});

describe('vytvorenie článku', () => {
  it('rovnaký názov dostane voľnú adresu namiesto chyby', async () => {
    const prvy = await request(app).post('/api/admin/articles').send(clanok());
    const druhy = await request(app).post('/api/admin/articles').send(clanok());
    expect(prvy.status).toBe(201);
    expect(druhy.status).toBe(201);
    expect(druhy.body.data.slug).toBe(`${prvy.body.data.slug}-2`);
  });

  it('uloží dátum v minulosti a dlhý formátovaný text', async () => {
    const odpoved = await request(app)
      .post('/api/admin/articles')
      .send(clanok({ nazov: `${P} dlhy`, obsah: `<p>${'Odsek s formátovaním. '.repeat(4000)}</p>` }));
    expect(odpoved.status).toBe(201);
    expect(new Date(odpoved.body.data.publikovany_datum).toISOString()).toBe('2026-09-15T12:30:00.000Z');
  });

  it('príliš dlhá adresa obrázka vráti zrozumiteľnú chybu, nie 500', async () => {
    const odpoved = await request(app)
      .post('/api/admin/articles')
      .send(clanok({ nazov: `${P} obrazok`, obrazok: `/uploads/${'a'.repeat(300)}.jpg` }));
    expect(odpoved.status).toBe(400);
    expect(odpoved.body.errors[0].msg).toMatch(/255/);
  });
});
