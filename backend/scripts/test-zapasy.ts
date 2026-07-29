// backend/src/test-zapasy.ts
// Test pre Zápasy - FÁZA 4

import { testConnection, syncDatabase } from './config/database';
import './models'; // DÔLEŽITÉ - načítanie vzťahov
import Liga from './models/Liga';
import Team from './models/Team';
import Player from './models/Player';
import Zapas from './models/Zapas';
import ZapasStatistika from './models/ZapasStatistika';

async function testZapasy() {
  console.log('⚽ Testovanie Zápasov - FÁZA 4');
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

    // 3. Kontrola závislostí
    console.log('\n3️⃣ Kontrola závislostí...');
    
    const ligaCount = await Liga.count({ where: { aktivity: true } });
    const teamCount = await Team.count({ where: { aktivity: true } });
    const playerCount = await Player.count({ where: { aktivity: true } });

    console.log(`✅ Dostupné ligy: ${ligaCount}`);
    console.log(`✅ Dostupné tímy: ${teamCount}`);
    console.log(`✅ Dostupní hráči: ${playerCount}`);

    if (ligaCount === 0 || teamCount === 0) {
      console.error('❌ Chýbajú ligy alebo tímy. Najprv spustite test-ligy.ts a test-teams.ts');
      process.exit(1);
    }

    // 4. Načítanie existujúcich dát
    console.log('\n4️⃣ Načítanie existujúcich dát...');
    
    const ligy = await Liga.findAll({
      where: { aktivity: true },
      order: [['poradie', 'ASC']],
      limit: 2
    });

    const timy = await Team.findAll({
      where: { aktivity: true },
      order: [['poradie', 'ASC']],
      limit: 4
    });

    console.log(`✅ Použijeme ${ligy.length} líg a ${timy.length} tímov`);

    // 5. Vytvorenie demo zápasov
    console.log('\n5️⃣ Vytvorenie demo zápasov...');

    const prvaLiga = ligy[0];
    const druhaLiga = ligy.length > 1 ? ligy[1] : ligy[0];

    const demoZapasy = [
      {
        nazov: `${timy[0].nazov} vs ${timy[1].nazov}`,
        liga_id: prvaLiga.id,
        kolo: '1. kolo',
        datum_cas: new Date('2024-08-15T18:00:00'),
        miesto: 'Domáci štadión',
        domaci_tim_id: timy[0].id,
        hostujuci_tim_id: timy[1].id,
        goly_domaci: 2,
        goly_hostia: 1,
        status: 'ukonceny' as const,
        pocet_divakov: 1500,
        poznamky: 'Veľmi kvalitný zápas s pekným futbalom'
      },
      {
        nazov: `${timy[2].nazov} vs ${timy[3].nazov}`,
        liga_id: prvaLiga.id,
        kolo: '1. kolo',
        datum_cas: new Date('2024-08-15T20:00:00'),
        miesto: 'Mestský štadión',
        domaci_tim_id: timy[2].id,
        hostujuci_tim_id: timy[3].id,
        goly_domaci: 0,
        goly_hostia: 0,
        status: 'ukonceny' as const,
        pocet_divakov: 800
      },
      {
        nazov: `${timy[1].nazov} vs ${timy[2].nazov}`,
        liga_id: druhaLiga.id,
        kolo: '2. kolo',
        datum_cas: new Date('2024-08-22T18:30:00'),
        miesto: 'Tréningové ihrisko',
        domaci_tim_id: timy[1].id,
        hostujuci_tim_id: timy[2].id,
        status: 'naplanovany' as const
      },
      {
        nazov: `${timy[0].nazov} vs ${timy[3].nazov}`,
        liga_id: prvaLiga.id,
        kolo: '3. kolo',
        datum_cas: new Date('2024-08-29T19:00:00'),
        miesto: 'Hlavný štadión',
        domaci_tim_id: timy[0].id,
        hostujuci_tim_id: timy[3].id,
        goly_domaci: 3,
        goly_hostia: 2,
        status: 'ukonceny' as const,
        pocet_divakov: 2200,
        video_url: 'https://youtube.com/watch?v=example'
      }
    ];

    const vytvoreneZapasy = [];
    for (const zapasData of demoZapasy) {
      const existujuci = await Zapas.findOne({
        where: {
          nazov: zapasData.nazov,
          datum_cas: zapasData.datum_cas,
          aktivity: true
        }
      });

      if (!existujuci) {
        const novyZapas = await Zapas.create(zapasData);
        vytvoreneZapasy.push(novyZapas);
        console.log(`   ✅ Vytvorený zápas: ${novyZapas.getFullName()}`);
        console.log(`      Liga: ${prvaLiga.nazov}, Status: ${novyZapas.getStatusName()}`);
      } else {
        vytvoreneZapasy.push(existujuci);
        console.log(`   ⚠️ Zápas už existuje: ${existujuci.getFullName()}`);
      }
    }

    // 6. Vytvorenie štatistík pre ukončené zápasy
    console.log('\n6️⃣ Vytvorenie štatistík pre ukončené zápasy...');

    // Získanie hráčov pre štatistiky (len základné dáta)
    const hraci = await Player.findAll({
      where: { aktivity: true },
      limit: 8
    });

    if (hraci.length > 0) {
      // Pridáme štatistiky k prvému zápasu (2:1)
      const prvyZapas = vytvoreneZapasy[0];
      if (prvyZapas && prvyZapas.isUkonceny()) {
        const existujuceStatistiky = await ZapasStatistika.count({
          where: { zapas_id: prvyZapas.id, aktivity: true }
        });

        if (existujuceStatistiky === 0) {
          // Góly a asistencie pre prvý zápas
          const statistiky = [
            {
              zapas_id: prvyZapas.id,
              hrac_id: hraci[0].id,
              typ: 'gol' as const,
              minuta: 15,
              poznamka: 'Krásny gól z voleja'
            },
            {
              zapas_id: prvyZapas.id,
              hrac_id: hraci[1].id,
              typ: 'asistencia' as const,
              minuta: 15,
              poznamka: 'Perfektná prihrávka'
            },
            {
              zapas_id: prvyZapas.id,
              hrac_id: hraci[2].id,
              typ: 'gol' as const,
              minuta: 34,
              poznamka: 'Gól z penalty'
            },
            {
              zapas_id: prvyZapas.id,
              hrac_id: hraci[3].id,
              typ: 'gol' as const,
              minuta: 67,
              poznamka: 'Kontaktný gól hostí'
            },
            {
              zapas_id: prvyZapas.id,
              hrac_id: hraci[4].id,
              typ: 'zlta_karta' as const,
              minuta: 45,
              poznamka: 'Hrubá hra'
            }
          ];

          await ZapasStatistika.bulkCreate(statistiky);
          console.log(`   ✅ Vytvorených ${statistiky.length} štatistík pre zápas: ${prvyZapas.nazov}`);
        }
      }
    }

    // 7. Načítanie a zobrazenie všetkých zápasov
    console.log('\n7️⃣ Načítanie všetkých zápasov...');
    
    const vsetkyZapasy = await Zapas.findAll({
      where: { aktivity: true },
      include: [
        {
          model: Liga,
          as: 'liga',
          attributes: ['nazov', 'sezona']
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['nazov']
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['nazov']
        }
      ],
      order: [['datum_cas', 'DESC']]
    });

    console.log(`✅ Nájdených ${vsetkyZapasy.length} zápasov:`);
    vsetkyZapasy.forEach((zapas, index) => {
      console.log(`   ${index + 1}. ${zapas.getFullName()}`);
      console.log(`      Liga: ${(zapas as any).liga?.nazov || 'Neznáma'}`);
      console.log(`      Status: ${zapas.getStatusName()}`);
      console.log(`      Dátum: ${zapas.datum_cas.toLocaleDateString('sk-SK')}`);
      console.log(`      Víťaz: ${zapas.getVitaz()}`);
      console.log('');
    });

    // 8. Test helper metód
    console.log('\n8️⃣ Test helper metód...');
    
    if (vsetkyZapasy.length > 0) {
      const prvyZapas = vsetkyZapasy[0];
      console.log(`✅ Test helper metód na zápase "${prvyZapas.nazov}":`);
      console.log(`   getVysledok(): "${prvyZapas.getVysledok()}"`);
      console.log(`   getFullName(): "${prvyZapas.getFullName()}"`);
      console.log(`   isUkonceny(): ${prvyZapas.isUkonceny()}`);
      console.log(`   hasVysledok(): ${prvyZapas.hasVysledok()}`);
      console.log(`   getVitaz(): ${prvyZapas.getVitaz()}`);
      console.log(`   isBuduci(): ${prvyZapas.isBuduci()}`);
      console.log(`   getStatusName(): "${prvyZapas.getStatusName()}"`);
      
      const safeJSON = prvyZapas.toSafeJSON();
      console.log(`   toSafeJSON() obsahuje ${Object.keys(safeJSON).length} polí`);
    }

    // 9. Test filtrovania
    console.log('\n9️⃣ Test filtrovania zápasov...');
    
    const ukonceneZapasy = await Zapas.findAll({
      where: { status: 'ukonceny', aktivity: true }
    });
    
    const naplanovaneZapasy = await Zapas.findAll({
      where: { status: 'naplanovany', aktivity: true }
    });

    const zapasyPrvejLigy = await Zapas.findAll({
      where: { liga_id: prvaLiga.id, aktivity: true }
    });

    console.log(`✅ Rozdelenie podľa statusu:`);
    console.log(`   Ukončené: ${ukonceneZapasy.length}`);
    console.log(`   Naplánované: ${naplanovaneZapasy.length}`);
    console.log(`   V prvej lige: ${zapasyPrvejLigy.length}`);

    // 10. Test štatistík
    console.log('\n🔟 Test štatistík zápasov...');
    
    const statistiky = await ZapasStatistika.findAll({
      where: { aktivity: true },
      include: [
        {
          model: Zapas,
          as: 'zapas',
          attributes: ['nazov']
        },
        {
          model: Player,
          as: 'hrac',
          attributes: ['meno', 'priezvisko']
        }
      ],
      order: [['minuta', 'ASC']]
    });

    console.log(`✅ Nájdených ${statistiky.length} štatistík:`);
    statistiky.forEach((stat, index) => {
      const hrac = (stat as any).hrac;
      const zapas = (stat as any).zapas;
      console.log(`   ${index + 1}. ${stat.getEmoji()} ${stat.getDescription()}`);
      console.log(`      Hráč: ${hrac?.meno || 'Neznámy'} ${hrac?.priezvisko || ''}`);
      console.log(`      Zápas: ${zapas?.nazov || 'Neznámy'}`);
    });

    console.log('\n✅ Test zápasov úspešne dokončený!');
    console.log('===================================');

  } catch (error) {
    console.error('❌ Chyba pri testovaní zápasov:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Spustenie testu
testZapasy();