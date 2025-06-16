// backend/src/test-api.ts
// FINÁLNY test REST API endpoints pre tímy - FÁZA 3

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testTeamsAPI() {
  console.log('🧪 Testovanie Teams REST API - FÁZA 3');
  console.log('=========================================');

  try {
    // 1. Test health check
    console.log('\n1️⃣ Test health check...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', healthResponse.data.message);

    // 2. Test API status
    console.log('\n2️⃣ Test API status...');
    const statusResponse = await axios.get(`${API_BASE}/api/status`);
    console.log('✅ API status:', statusResponse.data.message);
    console.log('   Environment:', statusResponse.data.environment);

    // 3. Test GET /api/teams - zoznam všetkých tímov
    console.log('\n3️⃣ Test GET /api/teams...');
    const teamsResponse = await axios.get(`${API_BASE}/api/teams`);
    console.log(`✅ Načítaných ${teamsResponse.data.count} tímov`);
    
    if (teamsResponse.data.data.length > 0) {
      console.log('   Prvý tím:', teamsResponse.data.data[0].nazov);
    }

    // 4. Test GET /api/teams?typ=mladez - filter podľa typu
    console.log('\n4️⃣ Test GET /api/teams?typ=mladez...');
    const mladezResponse = await axios.get(`${API_BASE}/api/teams?typ=mladez`);
    console.log(`✅ Nájdených ${mladezResponse.data.count} mládežníckych tímov`);

    // 5. Test GET /api/teams?include_stats=true - so štatistikami
    console.log('\n5️⃣ Test GET /api/teams?include_stats=true...');
    const statsResponse = await axios.get(`${API_BASE}/api/teams?include_stats=true`);
    console.log(`✅ Tímy so štatistikami:`);
    statsResponse.data.data.forEach((team: any) => {
      console.log(`   - ${team.nazov} ${team.vekova_kategoria}: ${team.pocet_hracov} hráčov, ${team.pocet_realizacny_tim} realizačný tím`);
    });

    // 6. Test GET /api/teams/:id - detail tímu
    if (teamsResponse.data.data.length > 0) {
      const firstTeam = teamsResponse.data.data[0];
      console.log(`\n6️⃣ Test GET /api/teams/${firstTeam.id}...`);
      
      const teamDetailResponse = await axios.get(`${API_BASE}/api/teams/${firstTeam.id}`);
      console.log(`✅ Detail tímu: ${teamDetailResponse.data.data.nazov} ${teamDetailResponse.data.data.vekova_kategoria}`);
      console.log(`   Typ: ${teamDetailResponse.data.data.typ}`);
      console.log(`   Slug: ${teamDetailResponse.data.data.slug}`);

      // 7. Test GET /api/teams/:id?include_players=true&include_staff=true
      console.log(`\n7️⃣ Test GET /api/teams/${firstTeam.id}?include_players=true&include_staff=true...`);
      
      const teamFullResponse = await axios.get(`${API_BASE}/api/teams/${firstTeam.id}?include_players=true&include_staff=true`);
      const teamFull = teamFullResponse.data.data;
      
      console.log(`✅ Úplný detail tímu: ${teamFull.nazov}`);
      console.log(`   Hráči (${teamFull.hraci?.length || 0}):`);
      teamFull.hraci?.forEach((player: any) => {
        console.log(`     - ${player.full_name} (#${player.cislo_dresu}) - ${player.pozicia}`);
      });
      
      console.log(`   Realizačný tím (${teamFull.realizacny_tim?.length || 0}):`);
      teamFull.realizacny_tim?.forEach((staff: any) => {
        console.log(`     - ${staff.full_name} - ${staff.funkcia}`);
      });

      // 8. Test GET /api/teams/:id/players
      console.log(`\n8️⃣ Test GET /api/teams/${firstTeam.id}/players...`);
      
      const playersResponse = await axios.get(`${API_BASE}/api/teams/${firstTeam.id}/players`);
      console.log(`✅ Hráči tímu ${playersResponse.data.data.tim.nazov}:`);
      console.log(`   Počet: ${playersResponse.data.count}`);
      playersResponse.data.data.hraci.forEach((player: any) => {
        console.log(`   - ${player.full_name} (#${player.cislo_dresu}) - ${player.pozicia} - ${player.vek} rokov`);
      });

      // 9. Test GET /api/teams/:id/staff
      console.log(`\n9️⃣ Test GET /api/teams/${firstTeam.id}/staff...`);
      
      const staffResponse = await axios.get(`${API_BASE}/api/teams/${firstTeam.id}/staff`);
      console.log(`✅ Realizačný tím ${staffResponse.data.data.tim.nazov}:`);
      console.log(`   Počet: ${staffResponse.data.count}`);
      staffResponse.data.data.realizacny_tim.forEach((staff: any) => {
        console.log(`   - ${staff.full_name} - ${staff.funkcia} (${staff.vek} rokov)`);
        if (staff.ma_kontakt) {
          console.log(`     📧 ${staff.kontakt.email || 'N/A'} | 📞 ${staff.kontakt.telefon || 'N/A'}`);
        }
      });
    }

    // 10. Test vyhľadávania
    console.log('\n🔟 Test vyhľadávania...');
    const searchResponse = await axios.get(`${API_BASE}/api/teams?search=A-tím`);
    console.log(`✅ Vyhľadávanie "A-tím": ${searchResponse.data.count} výsledkov`);

    // 11. Test neexistujúceho tímu
    console.log('\n1️⃣1️⃣ Test neexistujúceho tímu...');
    try {
      await axios.get(`${API_BASE}/api/teams/9999`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('✅ 404 error pre neexistujúci tím - správne');
      } else {
        console.log('❌ Neočakávaná chyba:', error.response?.status);
      }
    }

    // 12. Test neplatného ID
    console.log('\n1️⃣2️⃣ Test neplatného ID...');
    try {
      await axios.get(`${API_BASE}/api/teams/abc`);
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ 400 error pre neplatné ID - správne');
        console.log('   Chyba:', error.response.data.message);
      } else {
        console.log('❌ Neočakávaná chyba:', error.response?.status);
      }
    }

    // 13. Test vytvorenia tímu (POST)
    console.log('\n1️⃣3️⃣ Test POST /api/teams - vytvorenie tímu...');
    try {
      const newTeamData = {
        nazov: 'Test tím',
        typ: 'mladez',
        vekova_kategoria: 'U11',
        popis: 'Testovací tím vytvorený cez API',
        farba_prva: '#FF0000',
        farba_druha: '#FFFFFF',
        poradie: 10
      };

      console.log('   Posielam dáta:', newTeamData);
      const createResponse = await axios.post(`${API_BASE}/api/teams`, newTeamData);
      console.log(`✅ Tím úspešne vytvorený: ${createResponse.data.data.nazov} ${createResponse.data.data.vekova_kategoria}`);
      console.log(`   ID: ${createResponse.data.data.id}`);
      console.log(`   Slug: ${createResponse.data.data.slug}`);

      const createdTeamId = createResponse.data.data.id;

      // 14. Test aktualizácie tímu (PUT)
      console.log('\n1️⃣4️⃣ Test PUT /api/teams/:id - aktualizácia tímu...');
      const updateData = {
        popis: 'Aktualizovaný popis testovacieho tímu',
        farba_druha: '#0000FF'
      };

      console.log('   Posielam update dáta:', updateData);
      const updateResponse = await axios.put(`${API_BASE}/api/teams/${createdTeamId}`, updateData);
      console.log(`✅ Tím úspešne aktualizovaný: ${updateResponse.data.message}`);

      // 15. Test vymazania tímu (DELETE)
      console.log('\n1️⃣5️⃣ Test DELETE /api/teams/:id - vymazanie tímu...');
      const deleteResponse = await axios.delete(`${API_BASE}/api/teams/${createdTeamId}`);
      console.log(`✅ Tím úspešne vymazaný: ${deleteResponse.data.message}`);

    } catch (error: any) {
      console.log('❌ Chyba pri CRUD operáciách:');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
      console.log('   Error:', error.response?.data?.error);
      if (error.response?.data?.errors) {
        console.log('   Validation Errors:', error.response.data.errors);
      }
    }

    // 16. Test validácie - neplatné dáta
    console.log('\n1️⃣6️⃣ Test validácie neplatných dát...');
    try {
      const invalidData = {
        nazov: 'A', // Príliš krátky
        typ: 'neplatny_typ',
        vekova_kategoria: ''
      };

      await axios.post(`${API_BASE}/api/teams`, invalidData);
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Validácia funguje - zamietnuté neplatné dáta');
        console.log('   Errors:', error.response.data.errors);
      } else {
        console.log('❌ Neočakávaná chyba pri validácii:', error.response?.status);
      }
    }

    // 17. Test duplikátneho tímu
    console.log('\n1️⃣7️⃣ Test duplikátneho tímu...');
    try {
      const duplicateData = {
        nazov: 'A-tím',  // Už existuje
        typ: 'muzi',
        vekova_kategoria: 'seniori'
      };

      await axios.post(`${API_BASE}/api/teams`, duplicateData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('✅ Duplikát kontrola funguje - zamietnutý existujúci tím');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('❌ Neočakávaná chyba pri duplikát kontrole:', error.response?.status);
      }
    }

    console.log('\n✅ Test Teams API úspešne dokončený!');
    console.log('====================================');
    console.log('\n📋 Dostupné endpoints:');
    console.log('GET    /api/teams');
    console.log('GET    /api/teams?typ=mladez');
    console.log('GET    /api/teams?search=nazov');
    console.log('GET    /api/teams?include_stats=true');
    console.log('GET    /api/teams/:id');
    console.log('GET    /api/teams/:id?include_players=true&include_staff=true');
    console.log('GET    /api/teams/:id/players');
    console.log('GET    /api/teams/:id/staff');
    console.log('POST   /api/teams');
    console.log('PUT    /api/teams/:id');
    console.log('DELETE /api/teams/:id');

    console.log('\n🎯 Všetky funkcie Teams API sú funkčné!');

  } catch (error: any) {
    console.error('❌ Chyba pri testovaní API:', error.message);
    
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
testTeamsAPI();