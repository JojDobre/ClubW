// Umiestnenie: backend/tests/integration/galerieVerejne.test.ts
// GET /api/galleries - filter podľa typu priradenia bez ID, názov tímu
// pri galérii a počty galérií podľa typu (?pocty=1) pre filtre na webe.
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sequelize from '../../src/config/database';
import models from '../../src/models';
import { getPublicGalleries } from '../../src/controllers/galeriaController';

const { Team, Galeria } = models as any;

const P = `G${Date.now()}`;
let tim: any;
const galerie: any[] = [];

const zavolaj = async (query: Record<string, string>) => {
  let telo: any = null;
  const res: any = {
    status: () => res,
    json(t: any) {
      telo = t;
      return res;
    },
  };
  await getPublicGalleries({ query: { limit: '50', search: P, ...query } } as any, res);
  return telo;
};

beforeAll(async () => {
  await sequelize.authenticate();
  tim = await Team.create({ nazov: `${P} Tím`, slug: `${P.toLowerCase()}-tim`, typ: 'muzi', vekova_kategoria: 'seniori' });
  const galeria = (nazov: string, extra: Record<string, unknown> = {}) =>
    Galeria.create({ nazov: `${P} ${nazov}`, slug: `${P.toLowerCase()}-${nazov}`, zobrazit_na_webe: true, ...extra });
  galerie.push(await galeria('tim', { tim_id: tim.id }));
  galerie.push(await galeria('volna'));
  galerie.push(await galeria('skryta', { tim_id: tim.id, zobrazit_na_webe: false }));
});

afterAll(async () => {
  for (const g of galerie) await g.destroy({ force: true });
  await tim.destroy({ force: true });
  await sequelize.close();
});

describe('verejné galérie', () => {
  it('typ=tim bez ID vráti všetky verejné galérie tímov aj s názvom tímu', async () => {
    const telo = await zavolaj({ typ: 'tim' });
    expect(telo.success).toBe(true);
    expect(telo.data.map((g: any) => g.nazov)).toEqual([`${P} tim`]);
    expect(telo.data[0].tim).toMatchObject({ id: tim.id, nazov: `${P} Tím` });
  });

  it('typ=volna vráti galérie bez priradenia', async () => {
    const telo = await zavolaj({ typ: 'volna' });
    expect(telo.data.map((g: any) => g.nazov)).toEqual([`${P} volna`]);
  });

  it('?pocty=1 pridá počty verejných galérií podľa typu', async () => {
    const telo = await zavolaj({ pocty: '1' });
    expect(telo.pocty.tim).toBeGreaterThanOrEqual(1);
    expect(telo.pocty.volna).toBeGreaterThanOrEqual(1);
    expect(Object.keys(telo.pocty).sort()).toEqual(['clanok', 'tim', 'volna', 'zapas']);
    expect((await zavolaj({})).pocty).toBeUndefined();
  });
});
