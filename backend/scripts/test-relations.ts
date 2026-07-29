// backend/src/test-simple-relations.ts
// Jednoduchý test vzťahov - bez komplikovaných typov

import { testConnection, syncDatabase } from './config/database';
import Team from './models/Team';
import Player from './models/Player';
import Staff from './models/Staff';

async function testSimpleRelations() {
  console.log('🧪 Jednoduchý test vzťahov - FÁZA 3');
  console.log('===================================');

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
    await syncDatabase(false);

    // 3. Test basic načítania tímu s hráčmi (ručný JOIN)
    console.log('\n3️⃣ Test načítania tímu s hráčmi...');
    
    const aTeam = await Team.findOne({ where: { nazov: 'A-tím' } });
    if (!aTeam) {
      console.error('❌ A-tím nebol nájdený');
      process.exit(1);
    }

    // Ručný join - načítame hráčov tohto tímu
    const teamPlayers = await Player.findAll({
      where: { tim_id: aTeam.id, aktivity: true },
      order: [['cislo_dresu', 'ASC']]
    });

    console.log(`✅ Tím: ${aTeam.nazov} ${aTeam.vekova_kategoria}`);
    console.log(`   Hráči (${teamPlayers.length}):`);
    teamPlayers.forEach(player => {
      console.log(`     - ${(player as any).meno} ${(player as any).priezvisko} (#${(player as any).cislo_dresu}) - ${(player as any).pozicia}`);
    });

    // 4. Test načítania realizačného tímu
    console.log('\n4️⃣ Test načítania realizačného tímu...');
    
    const teamStaff = await Staff.findAll({
      where: { tim_id: aTeam.id, aktivity: true },
      order: [['poradie', 'ASC']]
    });

    console.log(`   Realizačný tím A-tímu (${teamStaff.length}):`);
    teamStaff.forEach(staff => {
      const age = (staff as any).getAge ? (staff as any).getAge() : 'N/A';
      console.log(`     - ${(staff as any).meno} ${(staff as any).priezvisko} - ${(staff as any).funkcia} (${age} rokov)`);
    });

    // 5. Test načítania všetkých tímov so štatistikami
    console.log('\n5️⃣ Test načítania tímov so štatistikami...');
    
    const allTeams = await Team.findAll({
      where: { aktivity: true },
      order: [['poradie', 'ASC']]
    });

    console.log(`✅ Prehľad všetkých tímov (${allTeams.length}):`);
    
    for (const team of allTeams) {
      // Počítame hráčov pre každý tím
      const playersCount = await Player.count({
        where: { tim_id: team.id, aktivity: true }
      });
      
      // Počítame realizačný tím pre každý tím
      const staffCount = await Staff.count({
        where: { tim_id: team.id, aktivity: true }
      });

      console.log(`   - ${team.nazov} ${team.vekova_kategoria} (${team.typ})`);
      console.log(`     👥 Hráči: ${playersCount} | 🎯 Realizačný tím: ${staffCount}`);
    }

    // 6. Test vyhľadávania hráčov podľa pozície
    console.log('\n6️⃣ Test vyhľadávania hráčov podľa pozície...');
    
    const brankari = await Player.findAll({
      where: { pozicia: 'brankár', aktivity: true }
    });

    console.log(`✅ Brankári v klube (${brankari.length}):`);
    for (const player of brankari) {
      // Nájdeme tím pre každého brankára
      const playerTeam = await Team.findByPk((player as any).tim_id);
      const teamName = playerTeam ? `${playerTeam.nazov} ${playerTeam.vekova_kategoria}` : 'Neznámy tím';
      
      console.log(`   - ${(player as any).meno} ${(player as any).priezvisko} (#${(player as any).cislo_dresu}) - ${teamName}`);
    }

    // 7. Test klubových členov (bez priradenia k tímu)
    console.log('\n7️⃣ Test klubových členov...');
    
    const clubStaff = await Staff.findAll({
      where: { tim_id: null, aktivity: true },
      order: [['poradie', 'ASC']]
    });

    console.log(`✅ Kluboví členovia (${clubStaff.length}):`);
    clubStaff.forEach(staff => {
      console.log(`   - ${(staff as any).meno} ${(staff as any).priezvisko} - ${(staff as any).funkcia}`);
      if ((staff as any).kvalifikacia) {
        console.log(`     🎓 ${(staff as any).kvalifikacia}`);
      }
    });

    // 8. Test detailného profilu hráča
    console.log('\n8️⃣ Test detailného profilu hráča...');
    
    const detailPlayer = await Player.findOne({
      where: { meno: 'Ján', priezvisko: 'Novák' }
    });

    if (detailPlayer) {
      const playerTeam = await Team.findByPk((detailPlayer as any).tim_id);
      
      console.log(`✅ Profil hráča:`);
      console.log(`   Meno: ${(detailPlayer as any).meno} ${(detailPlayer as any).priezvisko}`);
      console.log(`   Pozícia: ${(detailPlayer as any).pozicia}`);
      console.log(`   Číslo dresu: ${(detailPlayer as any).cislo_dresu}`);
      console.log(`   Vek: ${(detailPlayer as any).getAge ? (detailPlayer as any).getAge() : 'N/A'} rokov`);
      console.log(`   Tím: ${playerTeam ? `${playerTeam.nazov} ${playerTeam.vekova_kategoria}` : 'Neznámy'}`);
      console.log(`   Váha: ${(detailPlayer as any).vaha || 'N/A'} kg`);
      console.log(`   Výška: ${(detailPlayer as any).vyska || 'N/A'} cm`);
      console.log(`   Národnosť: ${(detailPlayer as any).narodnost || 'N/A'}`);
    }

    // 9. Test štatistík klubu
    console.log('\n9️⃣ Test štatistík klubu...');
    
    const totalTeams = await Team.count({ where: { aktivity: true } });
    const totalPlayers = await Player.count({ where: { aktivity: true } });
    const totalStaff = await Staff.count({ where: { aktivity: true } });
    const totalClubStaff = await Staff.count({ where: { tim_id: null, aktivity: true } });
    
    const muzskeTímy = await Team.count({ where: { typ: 'muzi', aktivity: true } });
    const zenskeTímy = await Team.count({ where: { typ: 'zeny', aktivity: true } });
    const mladezTímy = await Team.count({ where: { typ: 'mladez', aktivity: true } });

    console.log(`✅ Štatistiky klubu:`);
    console.log(`   📊 Celkovo:`);
    console.log(`     - Tímy: ${totalTeams}`);
    console.log(`     - Hráči: ${totalPlayers}`);
    console.log(`     - Realizačný tím: ${totalStaff}`);
    console.log(`     - Kluboví funkcionári: ${totalClubStaff}`);
    console.log(`   🏆 Rozdelenie tímov:`);
    console.log(`     - Mužské: ${muzskeTímy}`);
    console.log(`     - Ženské: ${zenskeTímy}`);
    console.log(`     - Mládežnícke: ${mladezTímy}`);

    console.log('\n✅ Jednoduchý test vzťahov úspešne dokončený!');
    console.log('============================================');

  } catch (error) {
    console.error('❌ Chyba pri testovaní vzťahov:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Spustenie testu
testSimpleRelations();