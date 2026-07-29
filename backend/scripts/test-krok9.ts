// Umiestnenie: backend/scripts/test-krok9.ts
// Overenie Kroku 9: agregácie štatistík a ukladanie času v UTC
// Spustenie: npx tsx scripts/test-krok9.ts

import sequelize from '../src/config/database';
import models, { getLeagueStats } from '../src/models';

const { Team, Liga, Zapas, LigaTabulka } = models as any;

let preslo = 0;
let zlyhalo = 0;

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
  const rnd = Math.floor(Math.random() * 100000);

  // ===== TEST 1: Súčet gólov v štatistikách ligy =====
  console.log('\n═══ TEST 1: Súčet gólov (SUM vracia z pg reťazec) ═══');

  const timA = await Team.create({ nazov: `K9 Tim A ${rnd}`, slug: `k9-a-${rnd}`, typ: 'muzi', vekova_kategoria: 'seniori' });
  const timB = await Team.create({ nazov: `K9 Tim B ${rnd}`, slug: `k9-b-${rnd}`, typ: 'muzi', vekova_kategoria: 'seniori' });

  const liga = await Liga.create({
    nazov: `K9 Liga ${rnd}`, slug: `k9-liga-${rnd}`,
    typ: 'sutaz', format: 'tabulka', sezona: '2025/2026',
  });

  // Tri zápasy: domáci góly 12 spolu, hostia 8 spolu → celkovo 20
  const zapasy = [
    { d: 5, h: 3 },
    { d: 4, h: 2 },
    { d: 3, h: 3 },
  ];
  for (let i = 0; i < zapasy.length; i++) {
    await Zapas.create({
      nazov: `K9 zapas ${i}`, liga_id: liga.id,
      datum_cas: new Date(Date.now() - (i + 1) * 86400000),
      domaci_tim_id: timA.id, hostujuci_tim_id: timB.id,
      goly_domaci: zapasy[i].d, goly_hostia: zapasy[i].h,
      status: 'ukonceny',
    });
  }
  console.log('  Zápasy: 5:3, 4:2, 3:3  (domáci spolu 12, hostia spolu 8)');

  const stats = await getLeagueStats(liga.id);

  over('Celkové góly (12 + 8, nie zreťazené "128")', 20, stats.celkove_goly);
  over('Typ hodnoty je číslo', 'number', typeof stats.celkove_goly);
  over('Priemer gólov na zápas (20 / 3)', '6.67', stats.priemer_golov_na_zapas);
  over('Počet ukončených zápasov', 3, stats.ukoncene_zapasy);

  // ===== TEST 2: Ukladanie času v UTC =====
  console.log('\n═══ TEST 2: Čas sa ukladá v UTC ═══');

  // Zápas v lete - vtedy má Slovensko +02:00, pôvodná konfigurácia mala natvrdo +01:00
  const letnyCasUtc = new Date('2026-07-15T13:00:00.000Z');
  const zapasLeto = await Zapas.create({
    nazov: `K9 letny zapas ${rnd}`, liga_id: liga.id,
    datum_cas: letnyCasUtc,
    domaci_tim_id: timA.id, hostujuci_tim_id: timB.id,
    status: 'naplanovany',
  });

  // Načítame priamo z databázy surovú hodnotu
  const [surove]: any = await sequelize.query(
    `SELECT datum_cas AT TIME ZONE 'UTC' AS utc_cas FROM zapasy WHERE id = ${zapasLeto.id}`
  );
  const ulozenyUtc = new Date(surove[0].utc_cas + 'Z');

  console.log(`  Uložené (UTC):     ${letnyCasUtc.toISOString()}`);
  console.log(`  Načítané (UTC):    ${ulozenyUtc.toISOString()}`);

  over('Čas sa nezmenil (žiadny posun o hodinu)',
    letnyCasUtc.toISOString(), ulozenyUtc.toISOString());

  // Kontrola prepočtu na slovenský čas pri zobrazení
  const slovenskyCas = letnyCasUtc.toLocaleString('sk-SK', {
    timeZone: 'Europe/Bratislava',
    hour: '2-digit', minute: '2-digit',
  });
  console.log(`  Zobrazenie v SR (leto, +02:00): ${slovenskyCas}`);
  over('Letný čas správne prepočítaný na 15:00', '15:00', slovenskyCas);

  // To isté pre zimný čas (+01:00)
  const zimnyCasUtc = new Date('2026-01-15T14:00:00.000Z');
  const zimnySlovensky = zimnyCasUtc.toLocaleString('sk-SK', {
    timeZone: 'Europe/Bratislava',
    hour: '2-digit', minute: '2-digit',
  });
  console.log(`  Zobrazenie v SR (zima, +01:00): ${zimnySlovensky}`);
  over('Zimný čas správne prepočítaný na 15:00', '15:00', zimnySlovensky);

  // ===== UPRATANIE =====
  await Zapas.destroy({ where: { liga_id: liga.id }, force: true });
  await LigaTabulka.destroy({ where: { liga_id: liga.id }, force: true });
  await liga.destroy({ force: true });
  await Team.destroy({ where: { id: [timA.id, timB.id] }, force: true });

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
