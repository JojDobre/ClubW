// Umiestnenie: backend/tests/integration/tabulka.test.ts
// Integračné testy prepočtu ligovej tabuľky.
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import sequelize from '../../src/config/database';
import models from '../../src/models';

const { Team, Liga, Zapas, LigaTabulka } = models as any;

// Jedinečná prípona pre tento beh - testy sa nesmú zraziť s existujúcimi dátami
const P = `T${Date.now()}`;

let timA: any, timB: any, timC: any, liga: any;

/** Dátum pred zadaným počtom dní. */
const preddnami = (dni: number) => new Date(Date.now() - dni * 86400000);

beforeAll(async () => {
  await sequelize.authenticate();
  // Načítanie modelov zaregistruje asociácie do inštancie Sequelize
  expect(Object.keys(sequelize.models).length).toBeGreaterThan(0);
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  // Čistý stav pre každý test - inak by sa výsledky ovplyvňovali
  if (liga) {
    await Zapas.destroy({ where: { liga_id: liga.id }, force: true });
    await LigaTabulka.destroy({ where: { liga_id: liga.id }, force: true });
    await liga.destroy({ force: true });
  }
  if (timA) await Team.destroy({ where: { id: [timA.id, timB.id, timC.id] }, force: true });

  timA = await Team.create({ nazov: `${P} A`, slug: `${P.toLowerCase()}-a`, typ: 'muzi', vekova_kategoria: 'seniori' });
  timB = await Team.create({ nazov: `${P} B`, slug: `${P.toLowerCase()}-b`, typ: 'muzi', vekova_kategoria: 'seniori' });
  timC = await Team.create({ nazov: `${P} C`, slug: `${P.toLowerCase()}-c`, typ: 'muzi', vekova_kategoria: 'seniori' });

  liga = await Liga.create({
    nazov: `${P} Liga`, slug: `${P.toLowerCase()}-liga`,
    typ: 'sutaz', format: 'tabulka', sezona: '2025/2026',
    body_za_vitazstvo: 3, body_za_remizy: 1,
  });
});

describe('LigaTabulka.recalculateTable', () => {
  it('spočíta body, góly a formu z ukončených zápasov', async () => {
    await Zapas.create({
      nazov: 'A vs B', liga_id: liga.id, datum_cas: preddnami(10),
      domaci_tim_id: timA.id, hostujuci_tim_id: timB.id,
      goly_domaci: 3, goly_hostia: 1, status: 'ukonceny',
    });
    await Zapas.create({
      nazov: 'B vs A', liga_id: liga.id, datum_cas: preddnami(5),
      domaci_tim_id: timB.id, hostujuci_tim_id: timA.id,
      goly_domaci: 2, goly_hostia: 2, status: 'ukonceny',
    });

    await LigaTabulka.recalculateTable(liga.id, 3, 1);
    const tabulka = await LigaTabulka.findAll({ where: { liga_id: liga.id }, order: [['pozicia', 'ASC']] });

    const a = tabulka.find((r: any) => r.tim_id === timA.id);
    expect(a.body).toBe(4);           // výhra + remíza
    expect(a.zapasy).toBe(2);
    expect(a.goly_za).toBe(5);
    expect(a.goly_proti).toBe(3);
    expect(a.forma).toBe('DW');       // najnovší zápas prvý

    const b = tabulka.find((r: any) => r.tim_id === timB.id);
    expect(b.body).toBe(1);
  });

  it('započíta aj zápasy s tímom mimo databázy', async () => {
    // Toto pôvodná verzia nedokázala - takéto zápasy úplne preskočila
    await Zapas.create({
      nazov: 'A vs Externý', liga_id: liga.id, datum_cas: preddnami(3),
      domaci_tim_id: timA.id, hostujuci_tim_nazov: 'FK Externý',
      goly_domaci: 0, goly_hostia: 1, status: 'ukonceny',
    });

    await LigaTabulka.recalculateTable(liga.id, 3, 1);
    const tabulka = await LigaTabulka.findAll({ where: { liga_id: liga.id } });

    const externy = tabulka.find((r: any) => r.custom_tim_nazov === 'FK Externý');
    expect(externy).toBeDefined();
    expect(externy.body).toBe(3);
    expect(externy.goly_za).toBe(1);
  });

  it('nezapočíta neukončené zápasy', async () => {
    await Zapas.create({
      nazov: 'Budúci', liga_id: liga.id, datum_cas: new Date(Date.now() + 86400000),
      domaci_tim_id: timA.id, hostujuci_tim_id: timB.id, status: 'naplanovany',
    });

    await LigaTabulka.recalculateTable(liga.id, 3, 1);
    const tabulka = await LigaTabulka.findAll({ where: { liga_id: liga.id } });

    for (const riadok of tabulka) {
      expect(riadok.zapasy).toBe(0);
    }
  });

  it('zachová ručne upravený riadok', async () => {
    await Zapas.create({
      nazov: 'A vs B', liga_id: liga.id, datum_cas: preddnami(2),
      domaci_tim_id: timA.id, hostujuci_tim_id: timB.id,
      goly_domaci: 1, goly_hostia: 0, status: 'ukonceny',
    });
    await LigaTabulka.recalculateTable(liga.id, 3, 1);

    // Správca ručne opraví tím B
    await LigaTabulka.update(
      { body: 10, manualne_upravene: true, poznamky: 'Dodatočne uznaný výsledok' },
      { where: { liga_id: liga.id, tim_id: timB.id } }
    );

    await LigaTabulka.recalculateTable(liga.id, 3, 1);
    const tabulka = await LigaTabulka.findAll({ where: { liga_id: liga.id } });

    const b = tabulka.find((r: any) => r.tim_id === timB.id);
    expect(b.body).toBe(10);
    expect(b.manualne_upravene).toBe(true);
    expect(b.poznamky).toBe('Dodatočne uznaný výsledok');

    // Tím sa nesmie objaviť dvakrát (raz ručný, raz vypočítaný riadok)
    const pocetB = tabulka.filter((r: any) => r.tim_id === timB.id).length;
    expect(pocetB).toBe(1);
  });

  it('započíta penalizačné body', async () => {
    await Zapas.create({
      nazov: 'A vs B', liga_id: liga.id, datum_cas: preddnami(2),
      domaci_tim_id: timA.id, hostujuci_tim_id: timB.id,
      goly_domaci: 1, goly_hostia: 0, status: 'ukonceny',
    });
    await LigaTabulka.recalculateTable(liga.id, 3, 1);

    await LigaTabulka.update(
      { penalizacne_body: -3 },
      { where: { liga_id: liga.id, tim_id: timA.id } }
    );
    await LigaTabulka.recalculateTable(liga.id, 3, 1);

    const a = await LigaTabulka.findOne({ where: { liga_id: liga.id, tim_id: timA.id } });
    expect(a.body).toBe(0); // 3 za výhru - 3 penalizácia
  });

  it('pri zlyhaní zápisu nenechá tabuľku prázdnu', async () => {
    await Zapas.create({
      nazov: 'A vs B', liga_id: liga.id, datum_cas: preddnami(2),
      domaci_tim_id: timA.id, hostujuci_tim_id: timB.id,
      goly_domaci: 2, goly_hostia: 0, status: 'ukonceny',
    });
    await LigaTabulka.recalculateTable(liga.id, 3, 1);

    const pocetPred = await LigaTabulka.count({ where: { liga_id: liga.id } });

    // Simulujeme zlyhanie zápisu
    const povodny = LigaTabulka.bulkCreate;
    LigaTabulka.bulkCreate = async () => {
      throw new Error('Simulované zlyhanie');
    };

    await expect(LigaTabulka.recalculateTable(liga.id, 3, 1)).rejects.toThrow();

    LigaTabulka.bulkCreate = povodny;

    // Transakcia sa vrátila späť - tabuľka zostala v pôvodnom stave
    const pocetPo = await LigaTabulka.count({ where: { liga_id: liga.id } });
    expect(pocetPo).toBe(pocetPred);
  });
});
