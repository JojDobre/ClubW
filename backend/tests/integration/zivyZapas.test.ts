// Umiestnenie: backend/tests/integration/zivyZapas.test.ts
// Integračné testy živého zápasu: fáza, čas jej začiatku, dĺžka polčasu
// a odkaz na prenos (Zápasy → Živý záznam).
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import sequelize from '../../src/config/database';
import '../../src/models';
import Zapas from '../../src/models/Zapas';
import { updateMatch } from '../../src/controllers/ZapasController';

const app = express();
app.use(express.json());
app.put('/api/matches/:id', updateMatch);

const P = `Z${Date.now()}`;
let zapas: any;

beforeAll(async () => {
  await sequelize.authenticate();
  zapas = await Zapas.create({
    nazov: `${P} živý`,
    datum_cas: new Date(Date.now() + 86_400_000),
    domaci_tim_nazov: `${P} Domáci`,
    hostujuci_tim_nazov: `${P} Hostia`,
    liga_nazov: `${P} Liga`,
    status: 'naplanovany',
  } as any);
});

afterAll(async () => {
  if (zapas) await Zapas.destroy({ where: { id: zapas.id }, force: true });
  await sequelize.close();
});

describe('Živý zápas', () => {
  it('spustenie fázy zapíše čas začiatku a zápas prepne na prebieha', async () => {
    const pred = Date.now();
    const odpoved = await request(app).put(`/api/matches/${zapas.id}`).send({ live_faza: 'prvy_polcas' });
    expect(odpoved.status).toBe(200);
    expect(odpoved.body.data.live_faza).toBe('prvy_polcas');
    expect(odpoved.body.data.status).toBe('prebieha');
    expect(new Date(odpoved.body.data.live_faza_od).getTime()).toBeGreaterThanOrEqual(pred - 1000);
  });

  it('uloží odkaz na prenos a dĺžku polčasu, neplatné hodnoty odmietne', async () => {
    const ok = await request(app)
      .put(`/api/matches/${zapas.id}`)
      .send({ stream_url: 'https://www.youtube.com/watch?v=abc123def45', dlzka_polcasu: 40 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.stream_url).toBe('https://www.youtube.com/watch?v=abc123def45');
    expect(ok.body.data.dlzka_polcasu).toBe(40);

    expect((await request(app).put(`/api/matches/${zapas.id}`).send({ stream_url: 'http://nezabezpecene.sk' })).status).toBe(400);
    expect((await request(app).put(`/api/matches/${zapas.id}`).send({ dlzka_polcasu: 90 })).status).toBe(400);
    expect((await request(app).put(`/api/matches/${zapas.id}`).send({ live_faza: 'tretia_tretina' })).status).toBe(400);
  });

  it('ukončenie zápasu fázu vymaže', async () => {
    const odpoved = await request(app)
      .put(`/api/matches/${zapas.id}`)
      .send({ status: 'ukonceny', goly_domaci: 1, goly_hostia: 0 });
    expect(odpoved.status).toBe(200);
    expect(odpoved.body.data.live_faza).toBeNull();
    expect(odpoved.body.data.live_faza_od).toBeNull();
  });
});
