// Umiestnenie: backend/tests/integration/menu.test.ts
// Menu webu s kategóriami: tri úrovne (hlavná položka → kategória → odkaz),
// kategória bez odkazu, obrázok karty a ochrana pred slučkou či 4. úrovňou.
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import sequelize from '../../src/config/database';
import '../../src/models';
import MenuPolozka from '../../src/models/MenuPolozka';
import { Op } from 'sequelize';
import { createMenuPolozka, getMenu, updateMenuPolozka } from '../../src/controllers/menuController';

const P = `M${Date.now()}`;
const app = express();
app.use(express.json());
app.get('/api/menu', getMenu);
app.post('/api/admin/menu', createMenuPolozka);
app.put('/api/admin/menu/:id', updateMenuPolozka);

const vytvor = async (udaje: Record<string, unknown>) => {
  const odpoved = await request(app).post('/api/admin/menu').send({ typ: 'url', url: '/x', ...udaje, nazov: `${P} ${udaje.nazov}` });
  return odpoved;
};

let hlavna: number, kategoria: number, odkaz: number;

beforeAll(async () => {
  await sequelize.authenticate();
});

afterAll(async () => {
  // Deti sa zmažú kaskádou s rodičom
  await MenuPolozka.destroy({ where: { rodic_id: null, nazov: { [Op.like]: `${P}%` } } });
});

describe('menu s kategóriami', () => {
  it('vytvorí tri úrovne a kategóriu bez odkazu', async () => {
    const h = await vytvor({ nazov: 'Zápasy', url: '/matches' });
    expect(h.status).toBe(201);
    hlavna = h.body.data.id;

    const k = await vytvor({ nazov: 'Súťaže', typ: 'nadpis', url: '/ignoruje-sa', rodic_id: hlavna });
    expect(k.status).toBe(201);
    expect(k.body.data).toMatchObject({ typ: 'nadpis', url: null, odkaz: null });
    kategoria = k.body.data.id;

    const o = await vytvor({ nazov: 'Tabuľky', url: '/leagues', rodic_id: kategoria });
    expect(o.status).toBe(201);
    odkaz = o.body.data.id;
  });

  it('odmietne štvrtú úroveň', async () => {
    const r = await vytvor({ nazov: 'Príliš hlboko', rodic_id: odkaz });
    expect(r.status).toBe(400);
    expect(r.body.message).toContain('najviac 3');
  });

  it('odmietne presun, ktorý by prekročil tri úrovne alebo vyrobil slučku', async () => {
    const druha = await vytvor({ nazov: 'O klube' });
    const presunHlbko = await request(app).put(`/api/admin/menu/${hlavna}`).send({ rodic_id: druha.body.data.id });
    expect(presunHlbko.status).toBe(400);

    const slucka = await request(app).put(`/api/admin/menu/${kategoria}`).send({ rodic_id: odkaz });
    expect(slucka.status).toBe(400);
    expect(slucka.body.message).toContain('vlastného podmenu');

    // Kategória s odkazmi (2 úrovne) sa dá presunúť pod inú hlavnú položku
    const presun = await request(app).put(`/api/admin/menu/${kategoria}`).send({ rodic_id: druha.body.data.id });
    expect(presun.status).toBe(200);
    await request(app).put(`/api/admin/menu/${kategoria}`).send({ rodic_id: hlavna });
  });

  it('obrázok karty prijme len adresu z webu alebo https', async () => {
    const zly = await vytvor({ nazov: 'Zlá karta', rodic_id: hlavna, obrazok: 'javascript:alert(1)' });
    expect(zly.status).toBe(400);
    const dobry = await vytvor({ nazov: 'Karta', rodic_id: hlavna, obrazok: '/uploads/media/karta.jpg' });
    expect(dobry.status).toBe(201);
    expect(dobry.body.data.obrazok).toBe('/uploads/media/karta.jpg');
  });

  it('verejné menu vráti strom a vynechá prázdne kategórie', async () => {
    await vytvor({ nazov: 'Prázdna kategória', typ: 'nadpis', rodic_id: hlavna });
    const menu = await request(app).get('/api/menu');
    expect(menu.status).toBe(200);
    const zapasy = menu.body.data.find((p: any) => p.id === hlavna);
    const nazvy = zapasy.deti.map((d: any) => d.nazov);
    expect(nazvy).toContain(`${P} Súťaže`);
    expect(nazvy).not.toContain(`${P} Prázdna kategória`);
    const sutaze = zapasy.deti.find((d: any) => d.id === kategoria);
    expect(sutaze.deti.map((d: any) => d.nazov)).toEqual([`${P} Tabuľky`]);
    expect(zapasy.deti.find((d: any) => d.nazov === `${P} Karta`).obrazok).toBe('/uploads/media/karta.jpg');
  });
});
