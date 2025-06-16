// backend/src/test-players.ts
// Test pre hráčov - FÁZA 3

import { testConnection, syncDatabase } from './config/database';
import Team from './models/Team';
import Player from './models/Player';

async function testPlayers() {
  console.log('🧪 Testovanie hráčov - FÁZA 3');
  console.log('==============================');

  try {
    // 1. Test pripojenia
    console.log('1️⃣ Testovanie pripojenia k databáze...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Pripojenie k databáze zlyhalo');
      process.exit(1);
    }

    // 2. Synchronizácia databázy
    console.log('\n2️⃣ Synchronizácia databázy...');
    await syncDatabase(false); // Bez force - zachová existujúce dáta

    // 3. Nájdenie existujúcich tímov
    console.log('\n3️⃣ Načítanie existujúcich tímov...');
    
    const teams = await Team.findAll({
      order: [['poradie', 'ASC']]
    });

    if (teams.length === 0) {
      console.error('❌ Žiadne tímy neboli nájdené. Najprv spustite test-teams.ts');
      process.exit(1);
    }

    console.log(`✅ Nájdených ${teams.length} tímov:`);
    teams.forEach(team => {
      console.log(`   - ID: ${team.id}, Názov: ${team.getFullName()}`);
    });

    // 4. Vytvorenie demo hráčov pre A-tím
    console.log('\n4️⃣ Vytvorenie demo hráčov pre A-tím...');
    
    const aTeam = teams.find(t => t.nazov === 'A-tím');
    if (!aTeam) {
      console.error('❌ A-tím nebol nájdený');
      process.exit(1);
    }

    const aTeamPlayers = await Player.bulkCreate([
      {
        meno: 'Ján',
        priezvisko: 'Novák',
        datum_narodenia: new Date('1995-03-15'),
        cislo_dresu: 1,
        pozicia: 'brankár',
        narodnost: 'Slovensko',
        vaha: 82.5,
        vyska: 188,
        tim_id: aTeam.id,
      },
      {
        meno: 'Peter',
        priezvisko: 'Kováč',
        datum_narodenia: new Date('1992-07-22'),
        cislo_dresu: 10,
        pozicia: 'stredopoliar',
        narodnost: 'Slovensko',
        vaha: 75.0,
        vyska: 178,
        tim_id: aTeam.id,
      },
      {
        meno: 'Martin',
        priezvisko: 'Svoboda',
        datum_narodenia: new Date('1998-11-08'),
        cislo_dresu: 9,
        pozicia: 'útočník',
        narodnost: 'Česko',
        vaha: 73.5,
        vyska: 182,
        tim_id: aTeam.id,
      },
      {
        meno: 'Tomáš',
        priezvisko: 'Horváth',
        datum_narodenia: new Date('1994-01-30'),
        cislo_dresu: 4,
        pozicia: 'obranca',
        narodnost: 'Slovensko',
        vaha: 80.0,
        vyska: 185,
        tim_id: aTeam.id,
      },
    ], {
      individualHooks: true // Povoliť hooks pre validáciu čísla dresu
    });

    console.log(`✅ ${aTeamPlayers.length} hráčov vytvorených pre A-tím:`);
    aTeamPlayers.forEach(player => {
      console.log(`   - ${player.getFullName()} (#${player.cislo_dresu}) - ${player.pozicia} - vek ${player.getAge()}`);
    });

    // 5. Vytvorenie hráčov pre mládežnícky tím
    console.log('\n5️⃣ Vytvorenie demo hráčov pre Žiaci mladší...');
    
    const mladsiZiaci = teams.find(t => t.nazov === 'Žiaci mladší');
    if (!mladsiZiaci) {
      console.error('❌ Žiaci mladší neboli nájdení');
      process.exit(1);
    }

    const mladsiZiaciPlayers = await Player.bulkCreate([
      {
        meno: 'Adam',
        priezvisko: 'Malý',
        datum_narodenia: new Date('2012-05-15'),
        cislo_dresu: 1,
        pozicia: 'brankár',
        narodnost: 'Slovensko',
        tim_id: mladsiZiaci.id,
      },
      {
        meno: 'Filip',
        priezvisko: 'Rýchly',
        datum_narodenia: new Date('2011-09-03'),
        cislo_dresu: 7,
        pozicia: 'útočník',
        narodnost: 'Slovensko',
        tim_id: mladsiZiaci.id,
      },
      {
        meno: 'Matej',
        priezvisko: 'Silný',
        datum_narodenia: new Date('2012-12-20'),
        cislo_dresu: 5,
        pozicia: 'obranca',
        narodnost: 'Slovensko',
        tim_id: mladsiZiaci.id,
      },
    ], {
      individualHooks: true
    });

    console.log(`✅ ${mladsiZiaciPlayers.length} hráčov vytvorených pre Žiaci mladší:`);
    mladsiZiaciPlayers.forEach(player => {
      console.log(`   - ${player.getFullName()} (#${player.cislo_dresu}) - ${player.pozicia} - vek ${player.getAge()}`);
    });

    // 6. Test načítania všetkých hráčov
    console.log('\n6️⃣ Test načítania všetkých hráčov...');
    
    const allPlayers = await Player.findAll({
      order: [['tim_id', 'ASC'], ['cislo_dresu', 'ASC']]
    });
    
    console.log(`✅ Načítaných ${allPlayers.length} hráčov z databázy:`);
    allPlayers.forEach(player => {
      console.log(`   - ID: ${player.id}, ${player.getFullName()} (#${player.cislo_dresu || 'bez čísla'}) - Tím ID: ${player.tim_id} - Vek: ${player.getAge()}`);
    });

    // 7. Test filtrovania hráčov podľa pozície
    console.log('\n7️⃣ Test filtrovania hráčov podľa pozície...');
    
    const brankari = await Player.findAll({
      where: { pozicia: 'brankár' },
      order: [['tim_id', 'ASC']]
    });
    
    const utocnici = await Player.findAll({
      where: { pozicia: 'útočník' },
      order: [['tim_id', 'ASC']]
    });

    console.log(`✅ Brankári (${brankari.length}):`);
    brankari.forEach(player => console.log(`   - ${player.getFullName()} (Tím ID: ${player.tim_id})`));
    
    console.log(`✅ Útočníci (${utocnici.length}):`);
    utocnici.forEach(player => console.log(`   - ${player.getFullName()} (Tím ID: ${player.tim_id})`));

    // 8. Test validácie duplicitného čísla dresu
    console.log('\n8️⃣ Test validácie duplicitného čísla dresu...');
    
    try {
      await Player.create({
        meno: 'Test',
        priezvisko: 'Hráč',
        datum_narodenia: new Date('2000-01-01'),
        cislo_dresu: 1, // Už existuje v A-tíme
        pozicia: 'stredopoliar',
        tim_id: aTeam.id,
      });
      console.log('❌ Validácia zlyhala - duplicitné číslo dresu nebolo zachytené!');
    } catch (error) {
      console.log('✅ Validácia funguje - duplicitné číslo dresu bolo zamietnuté');
      console.log(`   Chyba: ${(error as Error).message}`);
    }

    // 9. Test toSafeJSON metódy
    console.log('\n9️⃣ Test toSafeJSON metódy...');
    
    const firstPlayer = allPlayers[0];
    const safeJSON = firstPlayer.toSafeJSON();
    
    console.log('✅ Ukážka bezpečných údajov hráča:');
    console.log(JSON.stringify(safeJSON, null, 2));

    console.log('\n✅ Test hráčov úspešne dokončený!');
    console.log('==================================');

  } catch (error) {
    console.error('❌ Chyba pri testovaní hráčov:', error);
    process.exit(1);
  } finally {
    // Uzavretie pripojenia
    process.exit(0);
  }
}

// Spustenie testu
testPlayers();