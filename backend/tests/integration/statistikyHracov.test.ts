// Umiestnenie: backend/tests/integration/statistikyHracov.test.ts
// GET /api/teams/:id/players/stats - štatistiky hráčov tímu pre karty na webe.
// GET /api/players/:id/stats - štatistiky jedného hráča podľa súťaží (profil).
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sequelize from '../../src/config/database';
import models from '../../src/models';
import { getTeamPlayerStats } from '../../src/controllers/teamController';
import { getPlayerStats } from '../../src/controllers/playerController';

const { Team, Player, Liga, Zapas, ZapasZostava, ZapasStatistika } = models as any;

const P = `S${Date.now()}`;
let tim: any, liga: any, inaLiga: any, hrac1: any, hrac2: any, priatelskyId: number;

/** Zavolá kontrolér s falošnou požiadavkou a vráti telo odpovede. */
const zavolaj = async (id: number | string, query: Record<string, string> = {}, kontroler: any = getTeamPlayerStats) => {
  let stav = 200;
  let telo: any = null;
  const res: any = {
    status(s: number) {
      stav = s;
      return res;
    },
    json(t: any) {
      telo = t;
      return res;
    },
  };
  await kontroler({ params: { id: String(id) }, query } as any, res);
  return { stav, telo };
};

const preddnami = (dni: number) => new Date(Date.now() - dni * 86400000);

beforeAll(async () => {
  await sequelize.authenticate();
  tim = await Team.create({ nazov: `${P} Tím`, slug: `${P.toLowerCase()}-tim`, typ: 'muzi', vekova_kategoria: 'seniori' });
  const hrac = (meno: string, cislo: number) =>
    Player.create({ meno, priezvisko: P, datum_narodenia: '2000-01-01', pozicia: 'utocnik', cislo_dresu: cislo, tim_id: tim.id });
  hrac1 = await hrac('Adam', 9);
  hrac2 = await hrac('Boris', 10);
  liga = await Liga.create({ nazov: `${P} Liga`, slug: `${P.toLowerCase()}-liga`, typ: 'sutaz', format: 'tabulka', sezona: '2025/2026' });
  inaLiga = await Liga.create({ nazov: `${P} Pohár`, slug: `${P.toLowerCase()}-pohar`, typ: 'sutaz', format: 'tabulka', sezona: '2025/2026' });

  const zapas = (ligaId: number, status: string, dni: number) =>
    Zapas.create({
      nazov: `${P} zápas`, liga_id: ligaId, datum_cas: preddnami(dni), domaci_tim_id: tim.id,
      hostujuci_tim_nazov: 'Súper', goly_domaci: status === 'ukonceny' ? 2 : null, goly_hostia: status === 'ukonceny' ? 0 : null, status,
    });
  const z1 = await zapas(liga.id, 'ukonceny', 14);
  const z2 = await zapas(liga.id, 'ukonceny', 7);
  const z3 = await zapas(inaLiga.id, 'ukonceny', 3);
  const buduci = await zapas(liga.id, 'naplanovany', -5);

  // Hráč 1 hral všetky tri odohrané zápasy, hráč 2 len prvý; zostava budúceho zápasu sa nepočíta
  for (const z of [z1, z2, z3, buduci]) {
    await ZapasZostava.create({ zapas_id: z.id, strana: 'domaci', hrac_id: hrac1.id, zaradenie: 'zakladna', odohrane_minuty: z === z3 ? 45 : 90 });
  }
  // Zápas mimo súťaží v systéme (len s názvom súťaže)
  const priatelsky = await Zapas.create({
    nazov: `${P} priateľský`, liga_id: null, liga_nazov: 'Príprava', datum_cas: preddnami(20), domaci_tim_id: tim.id,
    hostujuci_tim_nazov: 'Súper', goly_domaci: 1, goly_hostia: 1, status: 'ukonceny',
  });
  priatelskyId = priatelsky.id;
  await ZapasZostava.create({ zapas_id: priatelsky.id, strana: 'domaci', hrac_id: hrac1.id, zaradenie: 'zakladna', odohrane_minuty: 60 });
  await ZapasZostava.create({ zapas_id: z1.id, strana: 'domaci', hrac_id: hrac2.id, zaradenie: 'lavicka' });

  const udalost = (z: any, h: any, typ: string) => ZapasStatistika.create({ zapas_id: z.id, hrac_id: h.id, typ, minuta: 10 });
  await udalost(z1, hrac1, 'gol');
  await udalost(z2, hrac1, 'gol');
  await udalost(z3, hrac1, 'gol');
  await udalost(z1, hrac2, 'asistencia');
  await udalost(z2, hrac1, 'zlta_karta');
});

afterAll(async () => {
  await Zapas.destroy({ where: { liga_id: [liga.id, inaLiga.id] }, force: true });
  await Zapas.destroy({ where: { id: priatelskyId }, force: true });
  await Player.destroy({ where: { tim_id: tim.id }, force: true });
  await Liga.destroy({ where: { id: [liga.id, inaLiga.id] }, force: true });
  await tim.destroy({ force: true });
  await sequelize.close();
});

describe('štatistiky hráčov tímu', () => {
  it('spočíta odohrané zápasy zo zostáv a udalosti zo všetkých súťaží', async () => {
    const { stav, telo } = await zavolaj(tim.id);
    expect(stav).toBe(200);
    const s1 = telo.data.find((s: any) => s.hrac_id === hrac1.id);
    const s2 = telo.data.find((s: any) => s.hrac_id === hrac2.id);
    expect(s1).toEqual({ hrac_id: hrac1.id, zapasy: 4, minuty: 285, ciste_konta: 3, goly: 3, asistencie: 0, zlte_karty: 1, cervene_karty: 0 });
    expect(s2).toEqual({ hrac_id: hrac2.id, zapasy: 1, minuty: 0, ciste_konta: 0, goly: 0, asistencie: 1, zlte_karty: 0, cervene_karty: 0 });
  });

  it('čisté konto počíta len hráčom v základnej zostave bez inkasovaného gólu', async () => {
    const { telo } = await zavolaj(tim.id);
    const s2 = telo.data.find((s: any) => s.hrac_id === hrac2.id);
    expect(s2.ciste_konta).toBe(0);
  });

  it('s ?liga_id= počíta len zápasy jednej súťaže', async () => {
    const { telo } = await zavolaj(tim.id, { liga_id: String(liga.id) });
    const s1 = telo.data.find((s: any) => s.hrac_id === hrac1.id);
    expect(s1.zapasy).toBe(2);
    expect(s1.goly).toBe(2);
  });

  it('odmietne neplatné ID', async () => {
    expect((await zavolaj('abc')).stav).toBe(400);
    expect((await zavolaj(tim.id, { liga_id: 'x' })).stav).toBe(400);
  });
});

describe('štatistiky hráča podľa súťaží', () => {
  it('rozdelí zápasy, minúty a udalosti podľa súťaže', async () => {
    const { stav, telo } = await zavolaj(hrac1.id, {}, getPlayerStats);
    expect(stav).toBe(200);
    const vLige = telo.data.find((r: any) => r.liga_id === liga.id);
    const vPohari = telo.data.find((r: any) => r.liga_id === inaLiga.id);
    const priatelske = telo.data.find((r: any) => r.liga_id === null);
    expect(vLige).toMatchObject({ liga_nazov: `${P} Liga`, sezona: '2025/2026', zapasy: 2, minuty: 180, goly: 2, asistencie: 0, zlte_karty: 1 });
    expect(vPohari).toMatchObject({ zapasy: 1, minuty: 45, goly: 1 });
    expect(priatelske).toMatchObject({ liga_nazov: 'Príprava', zapasy: 1, minuty: 60, goly: 0 });
  });

  it('hráč s jedným zápasom má jeden riadok, neexistujúci 404', async () => {
    expect((await zavolaj(hrac2.id, {}, getPlayerStats)).telo.data).toHaveLength(1);
    expect((await zavolaj(999999999, {}, getPlayerStats)).stav).toBe(404);
    expect((await zavolaj('abc', {}, getPlayerStats)).stav).toBe(400);
  });
});
