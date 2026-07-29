// backend/src/test-ligy-extended-fixed.ts
// Opravený test pre rozšírené ligy s tabuľkami a turnajmi - FÁZA 4+

import { testConnection, syncDatabase } from './config/database';
import Liga from './models/Liga';
import LigaTabulka from './models/LigaTabulka';
import LigaTurnaj from './models/LigaTurnaj';
import Team from './models/Team';
import Zapas from './models/Zapas';

// Import vzťahov PRED použitím helper funkcií
import './models/index';

// Import helper funkcií PO načítaní vzťahov
import { 
  getLeagueWithTable,
  getLeagueOverview,
  recalculateLeagueTable,
  exportLeagueTable,
  importLeagueTable,
  getLeagueTable,
  getLeagueTournament,
  getLeagueStats
} from './models/index';

async function testRozsireneLiby() {
  console.log('🏆 Testovanie Rozšírených Líg - FÁZA 4+');
  console.log('===========================================');

  try {
    // 1. Test pripojenia
    console.log('1️⃣ Testovanie pripojenia k databáze...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Pripojenie k databáze zlyhalo');
      process.exit(1);
    }

    // 2. Synchronizácia databázy s novými tabuľkami
    console.log('\n2️⃣ Synchronizácia databázy s novými modelmi...');
    await syncDatabase(false); // BEZ force - zachová existujúce dáta

    // 3. Kontrola existujúcich závislostí
    console.log('\n3️⃣ Kontrola existujúcich závislostí...');
    
    const teamCount = await Team.count({ where: { aktivity: true } });
    console.log(`✅ Dostupné tímy: ${teamCount}`);

    if (teamCount < 4) {
      console.log('⚠️ Vytváranie demo tímov pre testovanie...');
      await createDemoTeams();
    }

    // 4. Vytvorenie demo líg s rozšírenou funkcionalitou
    console.log('\n4️⃣ Vytvorenie demo líg s rozšírenou funkcionalitou...');
    
    const demoLigy = [
      {
        nazov: 'Fortuna Liga',
        sezona: '2024/2025',
        typ: 'sutaz' as const,
        format: 'tabulka' as const,
        datum_start: new Date('2024-07-15'),
        datum_koniec: new Date('2025-05-30'),
        pocet_timov: 12,
        body_za_vitazstvo: 3,
        body_za_remizy: 1,
        body_za_prehru: 0,
        auto_update_tabulka: true,
        zobrazit_formu: true,
        min_zapasov: 3,
        popis: 'Najvyššia slovenská futbalová súťaž',
        farba: '#FF6B35',
        poradie: 1,
        external_sync: false,
        aktivity: true
      },
      {
        nazov: 'Slovenský Pohár',
        sezona: '2024/2025',
        typ: 'pohar' as const,
        format: 'turnaj' as const,
        turnaj_typ: 'single_elimination' as const,
        pocet_timov: 16,
        datum_start: new Date('2024-09-01'),
        datum_koniec: new Date('2024-12-15'),
        body_za_vitazstvo: 3, 
        body_za_remizy: 1,    
        body_za_prehru: 0,    
        auto_update_tabulka: false,
        zobrazit_formu: false,
        min_zapasov: 0,
        popis: 'Vyraďovacia súťaž slovenských tímov',
        farba: '#4ECDC4',
        poradie: 2,
        external_sync: false,
        aktivity: true
      },
      {
        nazov: 'Regionálna Liga Západ',
        sezona: '2024/2025',
        typ: 'sutaz' as const,
        format: 'kombinovany' as const,
        turnaj_typ: 'groups_playoff' as const,
        pocet_timov: 16,
        turnaj_pocet_postupujucich: 2,
        datum_start: new Date('2024-08-01'),
        datum_koniec: new Date('2025-04-30'),
        body_za_vitazstvo: 3,
        body_za_remizy: 1,
        body_za_prehru: 0,
        auto_update_tabulka: true,
        zobrazit_formu: true,
        min_zapasov: 5,
        popis: 'Kombinovaná súťaž - skupiny + playoff',
        farba: '#45B7D1',
        poradie: 3,
        external_sync: false,
        aktivity: true
      }
    ];

    // Vytvorenie líg
    const vytvoreneLigy: Liga[] = [];
    for (const ligaData of demoLigy) {
      try {
        const existujuca = await Liga.findOne({
          where: {
            nazov: ligaData.nazov,
            sezona: ligaData.sezona,
            aktivity: true
          }
        });

        if (!existujuca) {
          const novaLiga = await Liga.create(ligaData);
          vytvoreneLigy.push(novaLiga);
          console.log(`   ✅ Vytvorená liga: ${novaLiga.getFullName()} (${novaLiga.getFormatName()})`);
          console.log(`      Bodovanie: ${novaLiga.body_za_vitazstvo}-${novaLiga.body_za_remizy}-${novaLiga.body_za_prehru}`);
          console.log(`      Auto-update: ${novaLiga.auto_update_tabulka ? 'Áno' : 'Nie'}`);
          console.log(`      Status: ${novaLiga.getStatus()}`);
        } else {
          vytvoreneLigy.push(existujuca);
          console.log(`   ⚠️ Liga už existuje: ${existujuca.getFullName()}`);
        }
      } catch (error) {
        console.error(`   ❌ Chyba pri vytváraní ligy ${ligaData.nazov}:`, error);
      }
    }

    // 5. Testovanie tabuliek
    console.log('\n5️⃣ Testovanie ligových tabuliek...');
    
    const fortunaLiga = vytvoreneLigy.find(l => l.nazov === 'Fortuna Liga');
    if (fortunaLiga && fortunaLiga.format === 'tabulka') {
      await testLigaTabulka(fortunaLiga);
    }

    // 6. Testovanie turnajov
    console.log('\n6️⃣ Testovanie turnajov...');
    
    const slovenskyPohar = vytvoreneLigy.find(l => l.nazov === 'Slovenský Pohár');
    if (slovenskyPohar && (slovenskyPohar.format === 'turnaj' || slovenskyPohar.format === 'kombinovany')) {
      await testLigaTurnaj(slovenskyPohar);
    }

    // 7. Testovanie kombinovaného formátu
    console.log('\n7️⃣ Testovanie kombinovaného formátu...');
    
    const regionalna = vytvoreneLigy.find(l => l.nazov === 'Regionálna Liga Západ');
    if (regionalna && regionalna.format === 'kombinovany') {
      console.log(`   ✅ Kombinovaná súťaž: ${regionalna.getFullName()}`);
      await testLigaTabulka(regionalna);
      await testLigaTurnaj(regionalna);
    }

    // 8. Testovanie API helper funkcií
    console.log('\n8️⃣ Testovanie API helper funkcií...');
    if (fortunaLiga) {
      await testHelperFunkcie(fortunaLiga);
    }

    // 9. Zhrnutie testu
    console.log('\n🎯 ZHRNUTIE TESTU');
    console.log('=================');
    
    const vsetkyLigy = await Liga.findAll({
      where: { aktivity: true },
      order: [['poradie', 'ASC']]
    });

    for (const liga of vsetkyLigy) {
      console.log(`\n📊 ${liga.getFullName()}:`);
      console.log(`   Typ: ${liga.getTypeName()}`);
      console.log(`   Formát: ${liga.getFormatName()}`);
      console.log(`   Status: ${liga.getStatus()}`);
      console.log(`   Bodovanie: ${liga.body_za_vitazstvo}-${liga.body_za_remizy}-${liga.body_za_prehru}`);
      console.log(`   Auto-update: ${liga.auto_update_tabulka ? '✅' : '❌'}`);
      console.log(`   Forma: ${liga.zobrazit_formu ? '✅' : '❌'}`);
      
      if (liga.format === 'tabulka' || liga.format === 'kombinovany') {
        const tabulkaCount = await LigaTabulka.count({ where: { liga_id: liga.id } });
        console.log(`   Tímy v tabuľke: ${tabulkaCount}`);
      }
      
      if (liga.format === 'turnaj' || liga.format === 'kombinovany') {
        const turnaj = await LigaTurnaj.findOne({ 
          where: { liga_id: liga.id, aktivity: true } 
        });
        console.log(`   Turnaj: ${turnaj ? 'Existuje' : 'Neexistuje'}`);
      }
    }

    console.log('\n✅ Rozšírené ligy úspešne otestované!');
    
  } catch (error) {
    console.error('❌ Chyba pri testovaní rozšírených líg:', error);
    throw error; // Prepošleme chybu ďalej
  }
}

// Helper funkcia na vytvorenie demo tímov
async function createDemoTeams() {
  const demoTeams = [
    { 
      nazov: 'Slovan Bratislava', 
      slug: 'slovan-bratislava',  // ✅ PRIDANÉ
      typ: 'muzi' as const, 
      vekova_kategoria: 'seniori', 
      farba_prva: '#87CEEB', 
      poradie: 1, 
      aktivity: true 
    },
    { 
      nazov: 'Sparta Praha', 
      slug: 'sparta-praha',  // ✅ PRIDANÉ
      typ: 'muzi' as const, 
      vekova_kategoria: 'seniori', 
      farba_prva: '#DC143C', 
      poradie: 2, 
      aktivity: true 
    },
    { 
      nazov: 'Žilina', 
      slug: 'zilina',  // ✅ PRIDANÉ
      typ: 'muzi' as const, 
      vekova_kategoria: 'seniori', 
      farba_prva: '#FFD700', 
      poradie: 3, 
      aktivity: true 
    },
    { 
      nazov: 'Dunajská Streda', 
      slug: 'dunajska-streda',  // ✅ PRIDANÉ
      typ: 'muzi' as const, 
      vekova_kategoria: 'seniori', 
      farba_prva: '#32CD32', 
      poradie: 4, 
      aktivity: true 
    },
    { 
      nazov: 'Trnava', 
      slug: 'trnava',  // ✅ PRIDANÉ
      typ: 'muzi' as const, 
      vekova_kategoria: 'seniori', 
      farba_prva: '#FF4500', 
      poradie: 5, 
      aktivity: true 
    },
    { 
      nazov: 'Trenčín', 
      slug: 'trencin',  // ✅ PRIDANÉ
      typ: 'muzi' as const, 
      vekova_kategoria: 'seniori', 
      farba_prva: '#9370DB', 
      poradie: 6, 
      aktivity: true 
    }
  ];

  for (const teamData of demoTeams) {
    try {
      const existing = await Team.findOne({ where: { nazov: teamData.nazov } });
      if (!existing) {
        await Team.create(teamData);
        console.log(`   ✅ Vytvorený tím: ${teamData.nazov}`);
      }
    } catch (error) {
      console.error(`   ❌ Chyba pri vytváraní tímu ${teamData.nazov}:`, error);
    }
  }
}

// Test ligových tabuliek
async function testLigaTabulka(liga: Liga) {
  console.log(`   🏆 Testovanie tabuľky pre: ${liga.getFullName()}`);
  
  try {
    // Získanie tímov pre tabuľku
    const timy = await Team.findAll({
      where: { aktivity: true },
      limit: 6,
      order: [['poradie', 'ASC']]
    });

    if (timy.length === 0) {
      console.log('   ⚠️ Žiadne tímy pre vytvorenie tabuľky');
      return;
    }

    // Vytvorenie demo tabuľky
    console.log('   📊 Vytváranie demo tabuľky...');
    
    const tabulkaData = timy.map((tim, index) => ({
      liga_id: liga.id,
      tim_id: tim.id,
      pozicia: index + 1,
      body: Math.floor(Math.random() * 30) + 10, // 10-40 bodov
      zapasy: Math.floor(Math.random() * 10) + 10, // 10-20 zápasov
      vitazstva: Math.floor(Math.random() * 8) + 3,
      remizy: Math.floor(Math.random() * 4) + 1,
      prehry: Math.floor(Math.random() * 6) + 2,
      goly_za: Math.floor(Math.random() * 20) + 15,
      goly_proti: Math.floor(Math.random() * 15) + 10,
      goly_rozdiel: 0, // Vypočíta sa automaticky
      forma: generateRandomForma(),
      manualne_upravene: false
    }));

    // Vypočítanie gólovej bilancie
    tabulkaData.forEach(item => {
      item.goly_rozdiel = item.goly_za - item.goly_proti;
    });

    // Zoradenie podľa bodov
    tabulkaData.sort((a, b) => {
      if (a.body !== b.body) return b.body - a.body;
      if (a.goly_rozdiel !== b.goly_rozdiel) return b.goly_rozdiel - a.goly_rozdiel;
      return b.goly_za - a.goly_za;
    });

    // Aktualizácia pozícií
    tabulkaData.forEach((item, index) => {
      item.pozicia = index + 1;
    });

    // Vymazanie existujúcej tabuľky a vytvorenie novej
    await LigaTabulka.destroy({ where: { liga_id: liga.id } });
    await LigaTabulka.bulkCreate(tabulkaData);

    console.log(`   ✅ Vytvorená tabuľka s ${tabulkaData.length} tímami`);

    // Test načítania tabuľky
    try {
      const tabulka = await getLeagueTable(liga.id);
      if (tabulka && tabulka.length > 0) {
        console.log('   📋 Top 3 tímy:');
        tabulka.slice(0, 3).forEach((pozicia: any, index: number) => {
          console.log(`      ${index + 1}. ${pozicia.tim?.nazov || pozicia.custom_tim_nazov} - ${pozicia.body} bodov (${pozicia.forma || 'N/A'})`);
        });
      }
    } catch (error) {
      console.log('   ⚠️ Nepodarilo sa načítať tabuľku');
    }

  } catch (error) {
    console.error(`   ❌ Chyba pri testovaní tabuľky:`, error);
  }
}

// Test turnajov
async function testLigaTurnaj(liga: Liga) {
  console.log(`   🏆 Testovanie turnaja pre: ${liga.getFullName()}`);
  
  try {
    // Kontrola či turnaj už existuje
    let turnaj = await LigaTurnaj.findOne({
      where: { liga_id: liga.id, aktivity: true }
    });

    if (!turnaj) {
      // Vytvorenie nového turnaja
      console.log('   🆕 Vytváranie nového turnaja...');
      
      const timy = await Team.findAll({
        where: { aktivity: true },
        limit: liga.pocet_timov || 8,
        order: [['poradie', 'ASC']]
      });

      const turnajData = {
        liga_id: liga.id,
        nazov: `${liga.nazov} - Turnaj`,
        typ: liga.turnaj_typ || 'single_elimination' as const,
        pocet_timov: Math.max(timy.length, 2), // ✅ OPRAVENÉ - minimum 2 tímy
        pocet_postupujucich: liga.turnaj_pocet_postupujucich,
        celkove_fazy: ['round_1', 'round_2', 'semifinale', 'finale'],
        aktualna_faza: 'round_1',
        status: 'pripravuje' as const,
        ma_tretie_miesto: true
      };

      turnaj = await LigaTurnaj.create(turnajData);
      
      // Generovanie štruktúry turnaja
      const timyIds = timy.map(t => t.id);
      turnaj.generateTournamentStructure(timyIds);
      await turnaj.save();
      
      console.log(`   ✅ Vytvorený turnaj: ${turnaj.getTypNazov()}`);
    }

    console.log(`   📊 Turnaj info:`);
    console.log(`      Typ: ${turnaj.getTypNazov()}`);
    console.log(`      Status: ${turnaj.getStatusNazov()}`);
    console.log(`      Aktuálna fáza: ${turnaj.getCurrentPhaseDisplay()}`);
    console.log(`      Počet tímov: ${turnaj.pocet_timov}`);
    console.log(`      Tretie miesto: ${turnaj.ma_tretie_miesto ? 'Áno' : 'Nie'}`);

    // Test štruktúry pavúka
    const struktura = turnaj.getPavukStruktura();
    if (struktura && struktura.matches) {
      console.log(`      Celkovo zápasov: ${struktura.matches.length}`);
    }

  } catch (error) {
    console.error(`   ❌ Chyba pri testovaní turnaja:`, error);
  }
}

// Test helper funkcií
async function testHelperFunkcie(liga: Liga) {
  console.log(`   🔧 Testovanie helper funkcií pre: ${liga.getFullName()}`);
  
  try {
    // Test getLeagueOverview
    console.log('   📊 Testovanie getLeagueOverview...');
    const overview = await getLeagueOverview(liga.id);
    console.log(`      Liga: ${overview.liga.nazov} (${overview.liga.format_name})`);
    console.log(`      Tabuľka: ${overview.tabulka.length} tímov`);
    console.log(`      Turnaj: ${overview.turnaj ? 'Existuje' : 'Neexistuje'}`);
    console.log(`      Celkové zápasy: ${overview.statistiky.celkove_zapasy}`);
    
    console.log('   ✅ Helper funkcie úspešne otestované');
    
  } catch (error) {
    console.log(`   ❌ Chyba pri testovaní helper funkcií: ${error}`);
  }
}

// Helper funkcia na generovanie náhodnej formy
function generateRandomForma(): string {
  const vysledky = ['W', 'D', 'L'];
  const forma = [];
  
  for (let i = 0; i < 5; i++) {
    forma.push(vysledky[Math.floor(Math.random() * vysledky.length)]);
  }
  
  return forma.join('');
}

// Spustenie testu
if (require.main === module) {
  testRozsireneLiby()
    .then(() => {
      console.log('\n🎉 Test úspešne dokončený!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test zlyhal:', error);
      process.exit(1);
    });
}

export default testRozsireneLiby;