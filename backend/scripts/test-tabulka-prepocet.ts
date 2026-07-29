// Umiestnenie: backend/scripts/test-tabulka-prepocet.ts
// Overenie Kroku 6: prepočet ligovej tabuľky
// Spustenie: npx tsx scripts/test-tabulka-prepocet.ts

import sequelize from '../src/config/database';
import models from '../src/models';

const { Team, Liga, Zapas, LigaTabulka } = models as any;

let preslo = 0;
let zlyhalo = 0;

// Pomocná funkcia na porovnanie očakávanej a skutočnej hodnoty
function over(nazov: string, ocakavane: any, skutocne: any) {
  if (JSON.stringify(ocakavane) === JSON.stringify(skutocne)) {
    console.log(`  ✅ ${nazov}: ${JSON.stringify(skutocne)}`);
    preslo++;
  } else {
    console.log(`  ❌ ${nazov}: očakávané ${JSON.stringify(ocakavane)}, skutočné ${JSON.stringify(skutocne)}`);
    zlyhalo++;
  }
}

async function spusti() {
  await sequelize.authenticate();

  // ===== PRÍPRAVA: vyčistenie testovacích dát z predchádzajúceho behu =====
  const staraLiga = await Liga.findOne({ where: { nazov: 'TEST Liga Prepočet' } });
  if (staraLiga) {
    await Zapas.destroy({ where: { liga_id: staraLiga.id }, force: true });
    await LigaTabulka.destroy({ where: { liga_id: staraLiga.id }, force: true });
    await staraLiga.destroy({ force: true });
  }
  await Team.destroy({ where: { nazov: ['TEST Tím A', 'TEST Tím B', 'TEST Tím C'] }, force: true });

  // ===== VYTVORENIE TESTOVACÍCH DÁT =====
  console.log('\n═══ Príprava testovacích dát ═══');

  const timA = await Team.create({ nazov: 'TEST Tím A', slug: 'test-tim-a-' + Date.now(), typ: 'muzi', vekova_kategoria: 'seniori' });
  const timB = await Team.create({ nazov: 'TEST Tím B', slug: 'test-tim-b-' + Date.now(), typ: 'muzi', vekova_kategoria: 'seniori' });
  const timC = await Team.create({ nazov: 'TEST Tím C', slug: 'test-tim-c-' + Date.now(), typ: 'muzi', vekova_kategoria: 'seniori' });
  console.log(`  Vytvorené 3 databázové tímy (A=${timA.id}, B=${timB.id}, C=${timC.id})`);

  const liga = await Liga.create({
    nazov: 'TEST Liga Prepočet',
    slug: 'test-liga-prepocet-' + Date.now(),
    typ: 'sutaz',        // enum: sutaz, pohar, priatelska
    format: 'tabulka',   // enum: tabulka, turnaj, kombinovany
    sezona: '2025/2026',
    body_za_vitazstvo: 3,
    body_za_remizy: 1,
  });
  console.log(`  Vytvorená liga (id=${liga.id})`);

  // Tím C pridáme do tabuľky, ale neodohrá žiadny zápas
  await LigaTabulka.createInitialTable(liga.id, [timA.id, timB.id, timC.id]);
  console.log('  Počiatočná tabuľka s 3 tímami vytvorená');

  const datum = (dni: number) => new Date(Date.now() - dni * 86400000);

  // Zápas 1: A 3:1 B  → A vyhráva (3 body), B prehráva
  await Zapas.create({
    nazov: 'A vs B', liga_id: liga.id, datum_cas: datum(10),
    domaci_tim_id: timA.id, hostujuci_tim_id: timB.id,
    goly_domaci: 3, goly_hostia: 1, status: 'ukonceny',
  });

  // Zápas 2: B 2:2 A  → remíza (obaja 1 bod)
  await Zapas.create({
    nazov: 'B vs A', liga_id: liga.id, datum_cas: datum(5),
    domaci_tim_id: timB.id, hostujuci_tim_id: timA.id,
    goly_domaci: 2, goly_hostia: 2, status: 'ukonceny',
  });

  // Zápas 3: A vs CUSTOM tím (súper mimo databázy), A prehráva 0:1
  await Zapas.create({
    nazov: 'A vs Custom', liga_id: liga.id, datum_cas: datum(3),
    domaci_tim_id: timA.id, hostujuci_tim_nazov: 'FK Externý',
    goly_domaci: 0, goly_hostia: 1, status: 'ukonceny',
  });

  // Zápas 4: neukončený zápas - nesmie sa započítať
  await Zapas.create({
    nazov: 'Budúci zápas', liga_id: liga.id, datum_cas: new Date(Date.now() + 86400000),
    domaci_tim_id: timB.id, hostujuci_tim_id: timC.id,
    status: 'naplanovany',
  });

  console.log('  Vytvorené 4 zápasy (3 ukončené, 1 naplánovaný)');

  // ===== TEST 1: Základný prepočet =====
  console.log('\n═══ TEST 1: Prepočet s custom tímom ═══');
  await LigaTabulka.recalculateTable(liga.id, 3, 1);

  let tabulka = await LigaTabulka.findAll({
    where: { liga_id: liga.id },
    order: [['pozicia', 'ASC']],
  });

  console.log('\n  Tabuľka po prepočte:');
  for (const r of tabulka) {
    const nazov = r.tim_id === timA.id ? 'Tím A'
      : r.tim_id === timB.id ? 'Tím B'
      : r.tim_id === timC.id ? 'Tím C'
      : r.custom_tim_nazov || '?';
    console.log(`    ${r.pozicia}. ${nazov.padEnd(12)} Z:${r.zapasy} V:${r.vitazstva} R:${r.remizy} P:${r.prehry} ` +
      `${r.goly_za}:${r.goly_proti} (${r.goly_rozdiel >= 0 ? '+' : ''}${r.goly_rozdiel}) B:${r.body} forma:${r.forma || '-'}`);
  }
  console.log('');

  over('Počet riadkov v tabuľke (3 DB tímy + 1 custom)', 4, tabulka.length);

  const custom = tabulka.find((r: any) => r.custom_tim_nazov === 'FK Externý');
  over('Custom tím "FK Externý" je v tabuľke', true, !!custom);
  if (custom) {
    over('  Custom tím - zápasy', 1, custom.zapasy);
    over('  Custom tím - víťazstvá', 1, custom.vitazstva);
    over('  Custom tím - body', 3, custom.body);
    over('  Custom tím - góly za:proti', [1, 0], [custom.goly_za, custom.goly_proti]);
  }

  const rA = tabulka.find((r: any) => r.tim_id === timA.id);
  // Tím A: výhra 3:1, remíza 2:2, prehra 0:1 → 3+1+0 = 4 body, góly 5:4
  over('Tím A - zápasy', 3, rA.zapasy);
  over('Tím A - body (3 + 1 + 0)', 4, rA.body);
  over('Tím A - V/R/P', [1, 1, 1], [rA.vitazstva, rA.remizy, rA.prehry]);
  over('Tím A - góly za:proti', [5, 4], [rA.goly_za, rA.goly_proti]);
  over('Tím A - gólový rozdiel', 1, rA.goly_rozdiel);
  over('Tím A - forma (najnovší zápas prvý: L,D,W)', 'LDW', rA.forma);

  const rB = tabulka.find((r: any) => r.tim_id === timB.id);
  // Tím B: prehra 1:3, remíza 2:2 → 0+1 = 1 bod, góly 3:5
  over('Tím B - body (0 + 1)', 1, rB.body);
  over('Tím B - góly za:proti', [3, 5], [rB.goly_za, rB.goly_proti]);

  const rC = tabulka.find((r: any) => r.tim_id === timC.id);
  over('Tím C bez zápasu ostal v tabuľke', true, !!rC);
  if (rC) {
    over('  Tím C - zápasy (0)', 0, rC.zapasy);
    over('  Tím C - body (0)', 0, rC.body);
  }

  // Poradie: Tím A 4b, Custom 3b, Tím B 1b, Tím C 0b
  over('Poradie na 1. mieste (Tím A, 4 body)', timA.id, tabulka[0].tim_id);
  over('Poradie na 2. mieste (FK Externý, 3 body)', 'FK Externý', tabulka[1].custom_tim_nazov);
  over('Poradie na 4. mieste (Tím C, 0 bodov)', timC.id, tabulka[3].tim_id);

  // ===== TEST 2: Manuálne upravený riadok sa zachová =====
  console.log('\n═══ TEST 2: Zachovanie manuálnej úpravy ═══');

  // Admin ručne opraví Tím B na 10 bodov (napr. dodatočne uznaný výsledok)
  await LigaTabulka.update(
    { body: 10, manualne_upravene: true, poznamky: 'Ručná korekcia' },
    { where: { liga_id: liga.id, tim_id: timB.id } }
  );
  console.log('  Tím B ručne upravený na 10 bodov');

  await LigaTabulka.recalculateTable(liga.id, 3, 1);

  tabulka = await LigaTabulka.findAll({ where: { liga_id: liga.id }, order: [['pozicia', 'ASC']] });
  const rBpo = tabulka.find((r: any) => r.tim_id === timB.id);

  over('Manuálna úprava zachovaná (10 bodov)', 10, rBpo.body);
  over('Príznak manualne_upravene zachovaný', true, rBpo.manualne_upravene);
  over('Poznámka zachovaná', 'Ručná korekcia', rBpo.poznamky);
  over('Tím B je teraz 1. (10 bodov)', timB.id, tabulka[0].tim_id);
  over('Custom tím po prepočte stále existuje', true,
    tabulka.some((r: any) => r.custom_tim_nazov === 'FK Externý'));
  over('Počet riadkov nezmenený', 4, tabulka.length);

  // ===== TEST 3: Penalizačné body =====
  console.log('\n═══ TEST 3: Penalizačné body ═══');

  // Zrušíme manuálnu úpravu Tímu B a dáme mu penalizáciu -3 body
  await LigaTabulka.update(
    { manualne_upravene: false, penalizacne_body: -3, poznamky: null },
    { where: { liga_id: liga.id, tim_id: timB.id } }
  );
  console.log('  Tím B: penalizácia -3 body');

  await LigaTabulka.recalculateTable(liga.id, 3, 1);
  tabulka = await LigaTabulka.findAll({ where: { liga_id: liga.id }, order: [['pozicia', 'ASC']] });
  const rBpen = tabulka.find((r: any) => r.tim_id === timB.id);

  // Tím B: 1 bod zo zápasov - 3 penalizácia = -2
  over('Body s penalizáciou (1 - 3)', -2, rBpen.body);
  over('Penalizácia uložená', -3, rBpen.penalizacne_body);
  over('Tím B je posledný', 4, rBpen.pozicia);

  // ===== TEST 4: Transakcia - integrita pri chybe =====
  console.log('\n═══ TEST 4: Transakcia pri zlyhaní zápisu ═══');

  const povodnyPocet = tabulka.length;
  const povodneBodyA = tabulka.find((r: any) => r.tim_id === timA.id).body;

  // Simulujeme zlyhanie: dočasne pokazíme bulkCreate
  const povodnyBulkCreate = LigaTabulka.bulkCreate;
  LigaTabulka.bulkCreate = async () => {
    throw new Error('Simulované zlyhanie zápisu do databázy');
  };

  let chytenaChyba = false;
  try {
    await LigaTabulka.recalculateTable(liga.id, 3, 1);
  } catch (e) {
    chytenaChyba = true;
  }

  // Obnovíme pôvodnú metódu
  LigaTabulka.bulkCreate = povodnyBulkCreate;

  over('Chyba pri zápise bola zachytená', true, chytenaChyba);

  const poChybe = await LigaTabulka.findAll({ where: { liga_id: liga.id } });
  over('Tabuľka NEostala prázdna (transakcia vrátená späť)', povodnyPocet, poChybe.length);
  over('Body Tímu A nezmenené', povodneBodyA,
    poChybe.find((r: any) => r.tim_id === timA.id)?.body);

  // ===== UPRATANIE =====
  await Zapas.destroy({ where: { liga_id: liga.id }, force: true });
  await LigaTabulka.destroy({ where: { liga_id: liga.id }, force: true });
  await liga.destroy({ force: true });
  await Team.destroy({ where: { id: [timA.id, timB.id, timC.id] }, force: true });

  console.log('\n═══════════════════════════════════════');
  console.log(`  VÝSLEDOK: ${preslo} prešlo, ${zlyhalo} zlyhalo`);
  console.log('═══════════════════════════════════════');

  await sequelize.close();
  process.exit(zlyhalo > 0 ? 1 : 0);
}

spusti().catch((e) => {
  console.error('❌ Chyba pri behu testu:', e);
  process.exit(1);
});
