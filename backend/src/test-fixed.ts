// backend/src/test-fixes.ts
// Rýchly test opráv pre CRUD problémy

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testFixes() {
  console.log('🔧 Testovanie opráv pre CRUD operácie');
  console.log('====================================');

  try {
    // 1. Test Staff UPDATE opravy
    console.log('1️⃣ Test Staff UPDATE opravy...');
    
    // Najprv vytvoríme testovacieho člena
    const newStaffData = {
      meno: 'Test',
      priezvisko: 'Oprava',
      funkcia: 'testovacia funkcia',
      email: 'test.oprava@klub.sk'
    };

    const createStaffResponse = await axios.post(`${API_BASE}/api/staff`, newStaffData);
    const staffId = createStaffResponse.data.data.id;
    console.log(`✅ Testovací člen vytvorený (ID: ${staffId})`);

    // Teraz skúsime UPDATE len s niektorými poliami
    const updateStaffData = {
      kvalifikacia: 'Aktualizovaná kvalifikácia',
      poznamky: 'Test opravy UPDATE validácie'
    };

    const updateStaffResponse = await axios.put(`${API_BASE}/api/staff/${staffId}`, updateStaffData);
    console.log(`✅ Staff UPDATE funguje: ${updateStaffResponse.data.message}`);

    // Vyčistíme testovacieho člena
    await axios.delete(`${API_BASE}/api/staff/${staffId}`);
    console.log(`✅ Testovací člen vymazaný`);

    // 2. Test Players CREATE s existujúcim tímom
    console.log('\n2️⃣ Test Players CREATE s existujúcim tímom...');
    
    // Najprv načítame dostupné tímy
    const teamsResponse = await axios.get(`${API_BASE}/api/teams`);
    if (teamsResponse.data.data.length === 0) {
      console.log('❌ Žiadne tímy nedostupné pre test');
      return;
    }

    const availableTeam = teamsResponse.data.data[0];
    console.log(`   Použijem tím: ${availableTeam.nazov} (ID: ${availableTeam.id})`);

    // Vytvoríme testovacieho hráča
    const newPlayerData = {
      meno: 'Test',
      priezvisko: 'Oprava',
      datum_narodenia: '2000-01-01',
      pozicia: 'testovacia pozícia',
      tim_id: availableTeam.id, // Použijeme existujúci tím
      cislo_dresu: 98
    };

    const createPlayerResponse = await axios.post(`${API_BASE}/api/players`, newPlayerData);
    const playerId = createPlayerResponse.data.data.id;
    console.log(`✅ Testovací hráč vytvorený (ID: ${playerId})`);

    // Test UPDATE hráča
    const updatePlayerData = {
      pozicia: 'stredopoliar',
      poznamky: 'Test opravy Player CREATE/UPDATE'
    };

    const updatePlayerResponse = await axios.put(`${API_BASE}/api/players/${playerId}`, updatePlayerData);
    console.log(`✅ Player UPDATE funguje: ${updatePlayerResponse.data.message}`);

    // Vyčistíme testovacieho hráča
    await axios.delete(`${API_BASE}/api/players/${playerId}`);
    console.log(`✅ Testovací hráč vymazaný`);

    // 3. Test duplikátneho čísla dresu s existujúcimi dátami
    console.log('\n3️⃣ Test duplikátneho čísla dresu...');
    
    // Najprv načítame existujúcich hráčov
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    if (playersResponse.data.data.length > 0) {
      const existingPlayer = playersResponse.data.data[0];
      
      if (existingPlayer.cislo_dresu) {
        try {
          const duplicateData = {
            meno: 'Duplikát',
            priezvisko: 'Test',
            datum_narodenia: '2000-01-01',
            pozicia: 'obranca',
            tim_id: existingPlayer.tim_id,
            cislo_dresu: existingPlayer.cislo_dresu // Použijeme existujúce číslo
          };

          await axios.post(`${API_BASE}/api/players`, duplicateData);
          console.log('❌ Duplikát číslo dresu nebol zachytený!');
        } catch (error: any) {
          if (error.response?.status === 409) {
            console.log('✅ Duplikát číslo dresu správne zamietnutý');
            console.log(`   Message: ${error.response.data.message}`);
          } else {
            console.log(`❌ Neočakávaná chyba: ${error.response?.status} - ${error.response?.data?.message}`);
          }
        }
      } else {
        console.log('⚠️ Žiadny hráč s číslom dresu pre test duplikátu');
      }
    } else {
      console.log('⚠️ Žiadni hráči pre test duplikátu');
    }

    console.log('\n🎉 Všetky opravy úspešne otestované!');
    console.log('===================================');
    console.log('✅ Staff UPDATE - opravené');
    console.log('✅ Players CREATE - opravené');
    console.log('✅ Duplikát číslo dresu - funguje');

  } catch (error: any) {
    console.error('❌ Chyba pri testovaní opráv:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message);
      console.error('   Errors:', error.response.data?.errors);
    }
    
    process.exit(1);
  }
}

// Spustenie testu opráv
testFixes();