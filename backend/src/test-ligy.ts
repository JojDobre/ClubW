// backend/src/test-ligy.ts
// Test pre Ligy - FÁZA 4

import { testConnection, syncDatabase } from './config/database';
import Liga from './models/Liga';

async function testLigy() {
  console.log('🏆 Testovanie Líg - FÁZA 4');
  console.log('===========================');

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

    // 3. Kontrola či Liga tabuľka existuje
    console.log('\n3️⃣ Kontrola Liga tabuľky...');
    
    const ligaCount = await Liga.count();
    console.log(`✅ Liga tabuľka existuje. Aktuálny počet líg: ${ligaCount}`);

    // 4. Vytvorenie demo líg
    console.log('\n4️⃣ Vytvorenie demo líg...');
    
    const demoLigy = [
      {
        nazov: 'I. liga Slovensko',
        sezona: '2024/2025',
        typ: 'sutaz' as const,
        popis: 'Najvyššia slovenská futbalová súťaž',
        farba: '#FF6B35',
        poradie: 1
      },
      {
        nazov: 'Slovenský pohár',
        sezona: '2024/2025', 
        typ: 'pohar' as const,
        popis: 'Národný pohár Slovenska',
        farba: '#4ECDC4',
        poradie: 2
      },
      {
        nazov: 'Regionálna liga',
        sezona: '2024/2025',
        typ: 'sutaz' as const,
        popis: 'Regionálna súťaž západného Slovenska',
        farba: '#45B7D1',
        poradie: 3
      },
      {
        nazov: 'Prípravné zápasy',
        sezona: '2024/2025',
        typ: 'priatelska' as const,
        popis: 'Priateľské a prípravné zápasy',
        farba: '#96CEB4',
        poradie: 4
      }
    ];

    // Vytvorenie líg len ak ešte neexistujú
    for (const ligaData of demoLigy) {
      const existujuca = await Liga.findOne({
        where: {
          nazov: ligaData.nazov,
          sezona: ligaData.sezona,
          aktivity: true
        }
      });

      if (!existujuca) {
        const novaLiga = await Liga.create(ligaData);
        console.log(`   ✅ Vytvorená liga: ${novaLiga.getFullName()} (${novaLiga.getTypeName()})`);
      } else {
        console.log(`   ⚠️ Liga už existuje: ${existujuca.getFullName()}`);
      }
    }

    // 5. Načítanie a zobrazenie všetkých líg
    console.log('\n5️⃣ Načítanie všetkých líg...');
    
    const vsetkyLigy = await Liga.findAll({
      where: { aktivity: true },
      order: [['poradie', 'ASC']]
    });

    console.log(`✅ Nájdených ${vsetkyLigy.length} aktívnych líg:`);
    vsetkyLigy.forEach((liga, index) => {
      console.log(`   ${index + 1}. ${liga.getFullName()}`);
      console.log(`      Typ: ${liga.getTypeName()}`);
      console.log(`      Farba: ${liga.farba || 'N/A'}`);
      console.log(`      External widget: ${liga.hasExternalWidget() ? 'Áno' : 'Nie'}`);
      console.log(`      Poradie: ${liga.poradie}`);
      console.log('');
    });

    // 6. Test helper metód
    console.log('\n6️⃣ Test helper metód...');
    
    if (vsetkyLigy.length > 0) {
      const prvaLiga = vsetkyLigy[0];
      console.log(`✅ Test helper metód na lige "${prvaLiga.nazov}":`);
      console.log(`   getFullName(): "${prvaLiga.getFullName()}"`);
      console.log(`   getTypeName(): "${prvaLiga.getTypeName()}"`);
      console.log(`   hasExternalWidget(): ${prvaLiga.hasExternalWidget()}`);
      
      const safeJSON = prvaLiga.toSafeJSON();
      console.log(`   toSafeJSON() obsahuje ${Object.keys(safeJSON).length} polí`);
    }

    // 7. Test filtrovania
    console.log('\n7️⃣ Test filtrovania líg...');
    
    const sutaze = await Liga.findAll({
      where: { typ: 'sutaz', aktivity: true },
      order: [['poradie', 'ASC']]
    });
    
    const pohary = await Liga.findAll({
      where: { typ: 'pohar', aktivity: true },
      order: [['poradie', 'ASC']]
    });
    
    const priatelske = await Liga.findAll({
      where: { typ: 'priatelska', aktivity: true },
      order: [['poradie', 'ASC']]
    });

    console.log(`✅ Rozdelenie podľa typu:`);
    console.log(`   Súťaže: ${sutaze.length}`);
    console.log(`   Poháre: ${pohary.length}`);
    console.log(`   Priateľské: ${priatelske.length}`);

    // 8. Test validácie
    console.log('\n8️⃣ Test validácie...');
    
    try {
      // Test neplatnej sezóny
      await Liga.create({
        nazov: 'Test Liga',
        sezona: 'neplatná sezóna!@#',
        typ: 'sutaz'
      });
      console.log('❌ Validácia zlyhala - mala by odmietnuť neplatnú sezónu');
    } catch (error: any) {
      console.log('✅ Validácia sezóny funguje správne');
    }

    try {
      // Test neplatnej farby
      await Liga.create({
        nazov: 'Test Liga 2',
        sezona: '2024/2025',
        typ: 'sutaz',
        farba: 'neplatná farba'
      });
      console.log('❌ Validácia zlyhala - mala by odmietnuť neplatnú farbu');
    } catch (error: any) {
      console.log('✅ Validácia farby funguje správne');
    }

    console.log('\n✅ Test líg úspešne dokončený!');
    console.log('================================');

  } catch (error) {
    console.error('❌ Chyba pri testovaní líg:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Spustenie testu
testLigy();