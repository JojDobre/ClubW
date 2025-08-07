// backend/src/test-database-sync.ts
// Jednoduchý test na opravu synchronizácie databázy

import { testConnection, syncDatabase } from './config/database';

// Import všetkých modelov v správnom poradí
import User from './models/user';
import Category from './models/Category';
import Article from './models/Article';
import Team from './models/Team';
import Player from './models/Player';
import Staff from './models/Staff';
import Liga from './models/Liga';
import LigaTabulka from './models/LigaTabulka';
import LigaTurnaj from './models/LigaTurnaj';
import Zapas from './models/Zapas';
import ZapasStatistika from './models/ZapasStatistika';
import Page from './models/Page';

// Import vzťahov PO definícii modelov
import './models/index';

async function fixDatabaseSync() {
  console.log('🔧 Oprava synchronizácie databázy');
  console.log('==================================');

  try {
    // 1. Test pripojenia
    console.log('1️⃣ Testovanie pripojenia k databáze...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Pripojenie k databáze zlyhalo');
      process.exit(1);
    }

    // 2. Kontrola existujúcich tabuliek
    console.log('\n2️⃣ Kontrola existujúcich tabuliek...');
    
    // Získanie informácií o existujúcich tabuľkách
    const { QueryInterface } = require('sequelize');
    const sequelize = require('./config/database').default;
    
    const queryInterface = sequelize.getQueryInterface();
    
    try {
      const tables = await queryInterface.showAllTables();
      console.log('✅ Existujúce tabuľky:', tables);
      
      // Kontrola kľúčových tabuliek
      const requiredTables = ['pouzivatelia', 'rubriky', 'clanky', 'timy', 'ligy'];
      const missingTables = requiredTables.filter(table => !tables.includes(table));
      
      if (missingTables.length > 0) {
        console.log('⚠️ Chýbajúce tabuľky:', missingTables);
      } else {
        console.log('✅ Všetky základné tabuľky existujú');
      }
      
    } catch (error) {
      console.log('⚠️ Nemožno získať zoznam tabuliek, pokračujeme so synchronizáciou');
    }

    // 3. Synchronizácia v správnom poradí
    console.log('\n3️⃣ Synchronizácia modelov v správnom poradí...');
    
    // Najprv základné tabuľky bez závislostí
    console.log('   📄 Synchronizácia User...');
    await User.sync({ alter: true });
    
    console.log('   📄 Synchronizácia Category...');
    await Category.sync({ alter: true });
    
    console.log('   📄 Synchronizácia Team...');
    await Team.sync({ alter: true });
    
    console.log('   📄 Synchronizácia Liga...');
    await Liga.sync({ alter: true });
    
    console.log('   📄 Synchronizácia Page...');
    await Page.sync({ alter: true });
    
    // Potom tabuľky so závislosťami
    console.log('   📄 Synchronizácia Article...');
    await Article.sync({ alter: true });
    
    console.log('   📄 Synchronizácia Player...');
    await Player.sync({ alter: true });
    
    console.log('   📄 Synchronizácia Staff...');
    await Staff.sync({ alter: true });
    
    console.log('   📄 Synchronizácia LigaTabulka...');
    await LigaTabulka.sync({ alter: true });
    
    console.log('   📄 Synchronizácia LigaTurnaj...');
    await LigaTurnaj.sync({ alter: true });
    
    console.log('   📄 Synchronizácia Zapas...');
    await Zapas.sync({ alter: true });
    
    console.log('   📄 Synchronizácia ZapasStatistika...');
    await ZapasStatistika.sync({ alter: true });

    // 4. Overenie synchronizácie
    console.log('\n4️⃣ Overenie synchronizácie...');
    
    const finalTables = await queryInterface.showAllTables();
    console.log('✅ Finálne tabuľky:', finalTables.sort());
    
    // Kontrola kľúčových tabuliek
    const expectedTables = [
      'pouzivatelia', 'rubriky', 'clanky', 'timy', 'hraci', 'realizacny_tim',
      'ligy', 'liga_tabulky', 'liga_turnaje', 'zapasy', 'zapas_statistiky', 'stranky'
    ];
    
    const stillMissing = expectedTables.filter(table => !finalTables.includes(table));
    
    if (stillMissing.length > 0) {
      console.log('❌ Stále chýbajú tabuľky:', stillMissing);
    } else {
      console.log('✅ Všetky potrebné tabuľky sú vytvorené');
    }

    // 5. Test základných operácii
    console.log('\n5️⃣ Test základných operácií...');
    
    try {
      const userCount = await User.count();
      const teamCount = await Team.count();
      const ligaCount = await Liga.count();
      
      console.log(`✅ Users: ${userCount}`);
      console.log(`✅ Teams: ${teamCount}`);
      console.log(`✅ Ligy: ${ligaCount}`);
      
    } catch (error) {
      console.log('⚠️ Chyba pri testovaní operácií:', error);
    }

    console.log('\n✅ Synchronizácia databázy dokončená!');
    console.log('Môžete teraz spustiť test-ligy-extended.ts');
    
  } catch (error) {
    console.error('❌ Chyba pri synchronizácii:', error);
    throw error;
  }
}

// Spustenie
if (require.main === module) {
  fixDatabaseSync()
    .then(() => {
      console.log('\n🎉 Oprava úspešne dokončená!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Oprava zlyhala:', error);
      process.exit(1);
    });
}

export default fixDatabaseSync;