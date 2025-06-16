// backend/src/test-teams.ts
// Test pre tímy - FÁZA 3

import { testConnection, syncDatabase } from './config/database';
import Team from './models/Team';

async function testTeams() {
  console.log('🧪 Testovanie tímov - FÁZA 3');
  console.log('===============================');

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

    // 3. Vytvorenie demo tímov
    console.log('\n3️⃣ Vytvorenie demo tímov...');
    
    const teams = await Team.bulkCreate([
      {
        nazov: 'A-tím',
        slug: 'a-tim-seniori', // Explicitne zadáme slug
        typ: 'muzi',
        vekova_kategoria: 'seniori',
        popis: 'Prvý tím mužov - najvyššia súťaž',
        farba_prva: '#FF0000',
        farba_druha: '#FFFFFF',
        poradie: 1,
      },
      {
        nazov: 'B-tím',
        slug: 'b-tim-seniori', // Explicitne zadáme slug
        typ: 'muzi', 
        vekova_kategoria: 'seniori',
        popis: 'Druhý tím mužov',
        farba_prva: '#FF0000',
        farba_druha: '#0000FF',
        poradie: 2,
      },
      {
        nazov: 'Ženy',
        slug: 'zeny-zeny', // Explicitne zadáme slug
        typ: 'zeny',
        vekova_kategoria: 'ženy',
        popis: 'Ženský tím',
        farba_prva: '#FF69B4',
        farba_druha: '#FFFFFF',
        poradie: 3,
      },
      {
        nazov: 'Dorast',
        slug: 'dorast-u19', // Explicitne zadáme slug
        typ: 'mladez',
        vekova_kategoria: 'U19',
        popis: 'Dorastenecký tím',
        farba_prva: '#FF0000',
        farba_druha: '#000000',
        poradie: 4,
      },
      {
        nazov: 'Žiaci starší',
        slug: 'ziaci-starsi-u15', // Explicitne zadáme slug
        typ: 'mladez',
        vekova_kategoria: 'U15',
        popis: 'Starší žiaci',
        farba_prva: '#FF0000',
        farba_druha: '#FFFF00',
        poradie: 5,
      },
      {
        nazov: 'Žiaci mladší',
        slug: 'ziaci-mladsi-u13', // Explicitne zadáme slug
        typ: 'mladez',
        vekova_kategoria: 'U13',
        popis: 'Mladší žiaci',
        farba_prva: '#FF0000',
        farba_druha: '#00FF00',
        poradie: 6,
      },
    ], {
      individualHooks: true // Toto povoľuje spustenie hooks pre každý riadok
    });

    console.log(`✅ ${teams.length} tímov vytvorených`);
    teams.forEach(team => {
      console.log(`   - ${team.getFullName()} (${team.slug}) - ${team.typ}`);
    });

    // 4. Test načítania tímov
    console.log('\n4️⃣ Test načítania tímov...');
    
    const allTeams = await Team.findAll({
      order: [['poradie', 'ASC']]
    });
    
    console.log(`✅ Načítaných ${allTeams.length} tímov z databázy:`);
    allTeams.forEach(team => {
      console.log(`   - ID: ${team.id}, Názov: ${team.getFullName()}, Typ: ${team.typ}`);
    });

    // 5. Test filtrovania podľa typu
    console.log('\n5️⃣ Test filtrovania tímov...');
    
    const muzskeTímy = await Team.findAll({
      where: { typ: 'muzi' },
      order: [['poradie', 'ASC']]
    });
    
    const zenskeTímy = await Team.findAll({
      where: { typ: 'zeny' },
      order: [['poradie', 'ASC']]
    });
    
    const mladezTímy = await Team.findAll({
      where: { typ: 'mladez' },
      order: [['poradie', 'ASC']]
    });

    console.log(`✅ Mužské tímy (${muzskeTímy.length}):`);
    muzskeTímy.forEach(team => console.log(`   - ${team.getFullName()}`));
    
    console.log(`✅ Ženské tímy (${zenskeTímy.length}):`);
    zenskeTímy.forEach(team => console.log(`   - ${team.getFullName()}`));
    
    console.log(`✅ Mládežnícke tímy (${mladezTímy.length}):`);
    mladezTímy.forEach(team => console.log(`   - ${team.getFullName()}`));

    // 6. Test slug generovania
    console.log('\n6️⃣ Test slug generovania...');
    console.log('✅ Všetky slug hodnoty:');
    allTeams.forEach(team => {
      console.log(`   - "${team.nazov} ${team.vekova_kategoria}" → "${team.slug}"`);
    });

    console.log('\n✅ Test tímov úspešne dokončený!');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Chyba pri testovaní tímov:', error);
    process.exit(1);
  } finally {
    // Uzavretie pripojenia
    process.exit(0);
  }
}

// Spustenie testu
testTeams();