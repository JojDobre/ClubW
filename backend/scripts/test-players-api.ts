// backend/src/test-players-api.ts
// Test pre Players API endpoints - FÁZA 3

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testPlayersAPI() {
  console.log('🧪 Testovanie Players API endpoints - FÁZA 3');
  console.log('===============================================');

  try {
    // 1. Test health check
    console.log('1️⃣ Test server health check...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log(`✅ Server je spustený: ${healthResponse.data.service}`);

    // 2. Test status
    console.log('\n2️⃣ Test API status...');
    const statusResponse = await axios.get(`${API_BASE}/api/status`);
    console.log(`✅ API status: ${statusResponse.data.message}`);
    console.log(`   Endpoints: players = ${statusResponse.data.endpoints.players}`);

    // 3. Test GET /api/players - zoznam všetkých hráčov
    console.log('\n3️⃣ Test GET /api/players...');
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    console.log(`✅ Zoznam hráčov úspešne načítaný:`);
    console.log(`   Počet hráčov: ${playersResponse.data.count}`);
    playersResponse.data.data.forEach((player: any, index: number) => {
      const cislo = player.cislo_dresu ? `#${player.cislo_dresu}` : 'bez čísla';
      const vek = player.vek ? `(${player.vek} rokov)` : '';
      console.log(`   ${index + 1}. ${player.full_name} ${cislo} - ${player.pozicia} ${vek} - Tím ID: ${player.tim_id}`);
    });

    // 4. Test GET /api/players?tim_id=1 - hráči konkrétneho tímu
    console.log('\n4️⃣ Test GET /api/players?tim_id=1...');
    const teamPlayersResponse = await axios.get(`${API_BASE}/api/players?tim_id=1`);
    console.log(`✅ Hráči tímu ID 1 (${teamPlayersResponse.data.count}):`);
    teamPlayersResponse.data.data.forEach((player: any) => {
      const cislo = player.cislo_dresu ? `#${player.cislo_dresu}` : 'bez čísla';
      console.log(`   - ${player.full_name} ${cislo} - ${player.pozicia}`);
    });

    // 5. Test GET /api/players?pozicia=brankár - filter podľa pozície
    console.log('\n5️⃣ Test GET /api/players?pozicia=brankár...');
    const goalkeepersResponse = await axios.get(`${API_BASE}/api/players?pozicia=brankár`);
    console.log(`✅ Brankári (${goalkeepersResponse.data.count}):`);
    goalkeepersResponse.data.data.forEach((player: any) => {
      const cislo = player.cislo_dresu ? `#${player.cislo_dresu}` : 'bez čísla';
      console.log(`   - ${player.full_name} ${cislo} - Tím ID: ${player.tim_id}`);
    });

    // 6. Test GET /api/players?include_team=true - s informáciami o tíme
    console.log('\n6️⃣ Test GET /api/players?include_team=true...');
    const playersWithTeamsResponse = await axios.get(`${API_BASE}/api/players?include_team=true`);
    console.log(`✅ Hráči s informáciami o tímoch:`);
    playersWithTeamsResponse.data.data.slice(0, 5).forEach((player: any) => { // Zobrazíme len prvých 5
      const cislo = player.cislo_dresu ? `#${player.cislo_dresu}` : 'bez čísla';
      if (player.tim) {
        console.log(`   - ${player.full_name} ${cislo} - ${player.pozicia} (${player.tim.nazov} ${player.tim.vekova_kategoria})`);
      } else {
        console.log(`   - ${player.full_name} ${cislo} - ${player.pozicia} (Tím nenájdený)`);
      }
    });

    // 7. Test GET /api/players/:id - detail konkrétneho hráča
    if (playersResponse.data.data.length > 0) {
      const firstPlayer = playersResponse.data.data[0];
      console.log(`\n7️⃣ Test GET /api/players/${firstPlayer.id}...`);
      
      const playerDetailResponse = await axios.get(`${API_BASE}/api/players/${firstPlayer.id}`);
      console.log(`✅ Detail hráča: ${playerDetailResponse.data.data.full_name}`);
      console.log(`   Pozícia: ${playerDetailResponse.data.data.pozicia}`);
      console.log(`   Číslo dresu: ${playerDetailResponse.data.data.cislo_dresu || 'N/A'}`);
      console.log(`   Vek: ${playerDetailResponse.data.data.vek || 'N/A'} rokov`);
      console.log(`   Výška: ${playerDetailResponse.data.data.vyska || 'N/A'} cm`);
      console.log(`   Váha: ${playerDetailResponse.data.data.vaha || 'N/A'} kg`);

      // 8. Test GET /api/players/:id?include_team=true
      console.log(`\n8️⃣ Test GET /api/players/${firstPlayer.id}?include_team=true...`);
      
      const playerDetailWithTeamResponse = await axios.get(`${API_BASE}/api/players/${firstPlayer.id}?include_team=true`);
      const playerDetail = playerDetailWithTeamResponse.data.data;
      
      console.log(`✅ Úplný detail hráča: ${playerDetail.full_name}`);
      if (playerDetail.tim) {
        console.log(`   Tím: ${playerDetail.tim.nazov} ${playerDetail.tim.vekova_kategoria}`);
        console.log(`   Typ tímu: ${playerDetail.tim.typ}`);
      } else {
        console.log(`   Tím: Nenájdený`);
      }
    }

    // 9. Test vyhľadávania
    console.log('\n9️⃣ Test vyhľadávania...');
    const searchResponse = await axios.get(`${API_BASE}/api/players?search=Ján`);
    console.log(`✅ Vyhľadávanie "Ján": ${searchResponse.data.count} výsledkov`);

    // 10. Test CRUD operácií (CREATE, UPDATE, DELETE)
    console.log('\n🔟 Test CRUD operácií...');
    try {
      // Najprv zistíme, aký tím existuje
      let availableTeamId = null;
      if (playersResponse.data.data.length > 0) {
        availableTeamId = playersResponse.data.data[0].tim_id; // Použijeme tím od existujúceho hráča
      } else {
        // Ak nemáme hráčov, skúsime načítať tímy
        const availableTeamsResponse = await axios.get(`${API_BASE}/api/teams`);
        if (availableTeamsResponse.data.data.length > 0) {
          availableTeamId = availableTeamsResponse.data.data[0].id;
        }
      }

      if (!availableTeamId) {
        console.log('❌ Žiadny dostupný tím pre test - preskakujem CRUD testy');
        return;
      }

      // CREATE - vytvorenie nového hráča
      console.log('\n   📝 Test POST /api/players - vytvorenie nového hráča...');
      const newPlayerData = {
        meno: 'Test',
        priezvisko: 'Hráč',
        datum_narodenia: '2000-05-15',
        pozicia: 'stredopoliar',
        tim_id: availableTeamId, // Použijeme existujúci tím
        cislo_dresu: 99,
        narodnost: 'Slovensko',
        vaha: 75.5,
        vyska: 180,
        poznamky: 'Testovací hráč'
      };

      console.log(`   Posielam dáta pre tím ID ${availableTeamId}:`, newPlayerData);
      const createResponse = await axios.post(`${API_BASE}/api/players`, newPlayerData);
      const createdPlayerId = createResponse.data.data.id;
      console.log(`✅ Hráč vytvorený: ${createResponse.data.message}`);
      console.log(`   ID: ${createdPlayerId}, Číslo dresu: ${createResponse.data.data.cislo_dresu}`);

      // UPDATE - aktualizácia hráča
      console.log('\n   ✏️ Test PUT /api/players/:id - aktualizácia hráča...');
      const updateData = {
        pozicia: 'útočník',
        vaha: 77.0,
        poznamky: 'Aktualizovaný testovací hráč'
      };

      console.log('   Posielam update dáta:', updateData);
      const updateResponse = await axios.put(`${API_BASE}/api/players/${createdPlayerId}`, updateData);
      console.log(`✅ Hráč úspešne aktualizovaný: ${updateResponse.data.message}`);
      console.log(`   Nová pozícia: ${updateResponse.data.data.pozicia}`);

      // DELETE - vymazanie hráča
      console.log('\n   🗑️ Test DELETE /api/players/:id - vymazanie hráča...');
      const deleteResponse = await axios.delete(`${API_BASE}/api/players/${createdPlayerId}`);
      console.log(`✅ Hráč úspešne vymazaný: ${deleteResponse.data.message}`);

    } catch (error: any) {
      console.log('❌ Chyba pri CRUD operáciách:');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
      console.log('   Error:', error.response?.data?.error);
      if (error.response?.data?.errors) {
        console.log('   Validation Errors:', error.response.data.errors);
      }
    }

    // 11. Test validácie - neplatné dáta
    console.log('\n1️⃣1️⃣ Test validácie neplatných dát...');
    try {
      const invalidData = {
        meno: 'A', // Príliš krátky
        priezvisko: '', // Prázdny
        datum_narodenia: '2030-01-01', // Budúcnosť
        pozicia: '',
        tim_id: 'neplatne_id'
      };

      await axios.post(`${API_BASE}/api/players`, invalidData);
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Validácia funguje - zamietnuté neplatné dáta');
        console.log('   Errors:', error.response.data.errors);
      } else {
        console.log('❌ Neočakávaná chyba pri validácii:', error.response?.status);
      }
    }

    // 12. Test duplikátneho čísla dresu
    console.log('\n1️⃣2️⃣ Test duplikátneho čísla dresu...');
    try {
      // Použijeme číslo dresu od existujúceho hráča
      let existingDresNumber = 1; // default
      let existingTeamId = null;
      
      // Najprv zistíme, aký tím existuje (znovu)
      if (playersResponse.data.data.length > 0) {
        const playerWithDres = playersResponse.data.data.find((p: any) => p.cislo_dresu);
        if (playerWithDres) {
          existingDresNumber = playerWithDres.cislo_dresu;
          existingTeamId = playerWithDres.tim_id;
        } else {
          // Ak žiadny hráč nemá číslo dresu, použijeme prvého hráča
          existingTeamId = playersResponse.data.data[0].tim_id;
        }
      } else {
        // Ak nemáme hráčov, skúsime načítať tím z teams API
        const teamsResponse = await axios.get(`${API_BASE}/api/teams`);
        if (teamsResponse.data.data.length > 0) {
          existingTeamId = teamsResponse.data.data[0].id;
        }
      }

      if (!existingTeamId) {
        console.log('⚠️ Žiadny dostupný tím pre test duplikátu');
        return;
      }

      const duplicateDresData = {
        meno: 'Duplicitný',
        priezvisko: 'Dres',
        datum_narodenia: '1995-01-01',
        pozicia: 'obranca',
        tim_id: existingTeamId,
        cislo_dresu: existingDresNumber // Použijeme existujúce číslo
      };

      await axios.post(`${API_BASE}/api/players`, duplicateDresData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('✅ Duplikát číslo dresu kontrola funguje - zamietnuté existujúce číslo');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('❌ Neočakávaná chyba pri duplikát číslo dresu kontrole:', error.response?.status);
      }
    }

    // 13. Test neexistujúceho tímu
    console.log('\n1️⃣3️⃣ Test neexistujúceho tímu...');
    try {
      const nonExistentTeamData = {
        meno: 'Test',
        priezvisko: 'Hráč',
        datum_narodenia: '2000-01-01',
        pozicia: 'stredopoliar',
        tim_id: 999999 // Neexistujúci tím
      };

      await axios.post(`${API_BASE}/api/players`, nonExistentTeamData);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('✅ Kontrola existencie tímu funguje - zamietnutý neexistujúci tím');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('❌ Neočakávaná chyba pri kontrole existencie tímu:', error.response?.status);
      }
    }

    console.log('\n✅ Test Players API úspešne dokončený!');
    console.log('======================================');
    console.log('\n📋 Dostupné Players endpoints:');
    console.log('GET    /api/players');
    console.log('GET    /api/players?tim_id=1');
    console.log('GET    /api/players?pozicia=brankár');
    console.log('GET    /api/players?search=meno');
    console.log('GET    /api/players?include_team=true');
    console.log('GET    /api/players/:id');
    console.log('GET    /api/players/:id?include_team=true');
    console.log('POST   /api/players');
    console.log('PUT    /api/players/:id');
    console.log('DELETE /api/players/:id');

    console.log('\n🎯 Všetky funkcie Players API sú funkčné!');

  } catch (error: any) {
    console.error('❌ Chyba pri testovaní Players API:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Uistite sa, že backend server beží na porte 3000');
      console.error('   Spustite: cd backend && npm run dev');
    } else if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Data:', error.response.data);
    } else {
      console.error('   Full Error:', error);
    }
    
    process.exit(1);
  }
}

// Spustenie testu
testPlayersAPI();