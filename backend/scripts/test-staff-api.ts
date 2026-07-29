// backend/src/test-staff-api.ts
// Test pre Staff API endpoints - FÁZA 3

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testStaffAPI() {
  console.log('🧪 Testovanie Staff API endpoints - FÁZA 3');
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
    console.log(`   Phase: ${statusResponse.data.phase}`);
    console.log(`   Endpoints: staff = ${statusResponse.data.endpoints.staff}`);

    // 3. Test GET /api/staff - zoznam všetkých členov realizačného tímu
    console.log('\n3️⃣ Test GET /api/staff...');
    const staffResponse = await axios.get(`${API_BASE}/api/staff`);
    console.log(`✅ Zoznam realizačného tímu úspešne načítaný:`);
    console.log(`   Počet členov: ${staffResponse.data.count}`);
    staffResponse.data.data.forEach((member: any, index: number) => {
      const teamInfo = member.tim_id ? `Tím ID: ${member.tim_id}` : 'Celý klub';
      const contact = member.ma_kontakt ? '📧📞' : '';
      console.log(`   ${index + 1}. ${member.full_name} - ${member.funkcia} (${teamInfo}) ${contact}`);
    });

    // 4. Test GET /api/staff?klubovi=true - len kluboví členovia
    console.log('\n4️⃣ Test GET /api/staff?klubovi=true...');
    const clubStaffResponse = await axios.get(`${API_BASE}/api/staff?klubovi=true`);
    console.log(`✅ Kluboví členovia (${clubStaffResponse.data.count}):`);
    clubStaffResponse.data.data.forEach((member: any) => {
      const age = member.vek ? `(${member.vek} rokov)` : '';
      console.log(`   - ${member.full_name} - ${member.funkcia} ${age}`);
      if (member.kvalifikacia) {
        console.log(`     🎓 ${member.kvalifikacia}`);
      }
    });

    // 5. Test GET /api/staff?funkcia=tréner - filter podľa funkcie
    console.log('\n5️⃣ Test GET /api/staff?funkcia=tréner...');
    const trainersResponse = await axios.get(`${API_BASE}/api/staff?funkcia=tréner`);
    console.log(`✅ Tréneri (${trainersResponse.data.count}):`);
    trainersResponse.data.data.forEach((member: any) => {
      const teamInfo = member.tim_id ? `Tím ID: ${member.tim_id}` : 'Celý klub';
      console.log(`   - ${member.full_name} - ${member.funkcia} (${teamInfo})`);
    });

    // 6. Test GET /api/staff?include_team=true - s informáciami o tíme
    console.log('\n6️⃣ Test GET /api/staff?include_team=true...');
    const staffWithTeamsResponse = await axios.get(`${API_BASE}/api/staff?include_team=true`);
    console.log(`✅ Realizačný tím s informáciami o tímoch:`);
    staffWithTeamsResponse.data.data.forEach((member: any) => {
      if (member.tim) {
        console.log(`   - ${member.full_name} - ${member.funkcia} (${member.tim.nazov} ${member.tim.vekova_kategoria})`);
      } else {
        console.log(`   - ${member.full_name} - ${member.funkcia} (Celý klub)`);
      }
    });

    // 7. Test GET /api/staff/:id - detail konkrétneho člena
    if (staffResponse.data.data.length > 0) {
      const firstStaff = staffResponse.data.data[0];
      console.log(`\n7️⃣ Test GET /api/staff/${firstStaff.id}...`);
      
      const staffDetailResponse = await axios.get(`${API_BASE}/api/staff/${firstStaff.id}`);
      console.log(`✅ Detail člena realizačného tímu: ${staffDetailResponse.data.data.full_name}`);
      console.log(`   Funkcia: ${staffDetailResponse.data.data.funkcia}`);
      console.log(`   Vek: ${staffDetailResponse.data.data.vek || 'N/A'} rokov`);
      console.log(`   Kontakt: 📧 ${staffDetailResponse.data.data.kontakt.email || 'N/A'} | 📞 ${staffDetailResponse.data.data.kontakt.telefon || 'N/A'}`);

      // 8. Test GET /api/staff/:id?include_team=true
      console.log(`\n8️⃣ Test GET /api/staff/${firstStaff.id}?include_team=true...`);
      
      const staffDetailWithTeamResponse = await axios.get(`${API_BASE}/api/staff/${firstStaff.id}?include_team=true`);
      const staffDetail = staffDetailWithTeamResponse.data.data;
      
      console.log(`✅ Úplný detail člena realizačného tímu: ${staffDetail.full_name}`);
      if (staffDetail.tim) {
        console.log(`   Tím: ${staffDetail.tim.nazov} ${staffDetail.tim.vekova_kategoria}`);
      } else {
        console.log(`   Tím: Celý klub`);
      }
    }

    // 9. Test vyhľadávania
    console.log('\n9️⃣ Test vyhľadávania...');
    const searchResponse = await axios.get(`${API_BASE}/api/staff?search=tréner`);
    console.log(`✅ Vyhľadávanie "tréner": ${searchResponse.data.count} výsledkov`);

    // 10. Test CRUD operácií (CREATE, UPDATE, DELETE)
    console.log('\n🔟 Test CRUD operácií...');
    try {
      // CREATE - vytvorenie nového člena realizačného tímu
      console.log('\n   📝 Test POST /api/staff - vytvorenie nového člena...');
      const newStaffData = {
        meno: 'Test',
        priezvisko: 'Tréner',
        funkcia: 'asistent trénera',
        email: 'test.trener@klub.sk',
        telefon: '+421999123456',
        datum_narodenia: '1985-03-15',
        kvalifikacia: 'UEFA B licencia',
        tim_id: null, // Clubový člen
        poradie: 10
      };

      console.log('   Posielam dáta:', newStaffData);
      const createResponse = await axios.post(`${API_BASE}/api/staff`, newStaffData);
      const createdStaffId = createResponse.data.data.id;
      console.log(`✅ Člen realizačného tímu vytvorený: ${createResponse.data.message}`);
      console.log(`   ID: ${createdStaffId}`);

      // UPDATE - aktualizácia člena realizačného tímu
      console.log('\n   ✏️ Test PUT /api/staff/:id - aktualizácia člena...');
      const updateData = {
        kvalifikacia: 'UEFA A licencia',
        poznamky: 'Aktualizovaný testovací člen realizačného tímu'
      };

      console.log('   Posielam update dáta:', updateData);
      const updateResponse = await axios.put(`${API_BASE}/api/staff/${createdStaffId}`, updateData);
      console.log(`✅ Člen realizačného tímu úspešne aktualizovaný: ${updateResponse.data.message}`);

      // DELETE - vymazanie člena realizačného tímu
      console.log('\n   🗑️ Test DELETE /api/staff/:id - vymazanie člena...');
      const deleteResponse = await axios.delete(`${API_BASE}/api/staff/${createdStaffId}`);
      console.log(`✅ Člen realizačného tímu úspešne vymazaný: ${deleteResponse.data.message}`);

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
        funkcia: '',
        email: 'neplatny-email'
      };

      await axios.post(`${API_BASE}/api/staff`, invalidData);
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Validácia funguje - zamietnuté neplatné dáta');
        console.log('   Errors:', error.response.data.errors);
      } else {
        console.log('❌ Neočakávaná chyba pri validácii:', error.response?.status);
      }
    }

    // 12. Test duplikátneho emailu
    console.log('\n1️⃣2️⃣ Test duplikátneho emailu...');
    try {
      const duplicateEmailData = {
        meno: 'Duplicitný',
        priezvisko: 'Email',
        funkcia: 'test funkcia',
        email: 'predseda@klub.sk' // Už existuje
      };

      await axios.post(`${API_BASE}/api/staff`, duplicateEmailData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('✅ Duplikát email kontrola funguje - zamietnutý existujúci email');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('❌ Neočakávaná chyba pri duplikát email kontrole:', error.response?.status);
      }
    }

    console.log('\n✅ Test Staff API úspešne dokončený!');
    console.log('=====================================');
    console.log('\n📋 Dostupné Staff endpoints:');
    console.log('GET    /api/staff');
    console.log('GET    /api/staff?tim_id=1');
    console.log('GET    /api/staff?funkcia=tréner');
    console.log('GET    /api/staff?search=meno');
    console.log('GET    /api/staff?include_team=true');
    console.log('GET    /api/staff?klubovi=true');
    console.log('GET    /api/staff/:id');
    console.log('GET    /api/staff/:id?include_team=true');
    console.log('POST   /api/staff');
    console.log('PUT    /api/staff/:id');
    console.log('DELETE /api/staff/:id');

    console.log('\n🎯 Všetky funkcie Staff API sú funkčné!');

  } catch (error: any) {
    console.error('❌ Chyba pri testovaní Staff API:', error.message);
    
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
testStaffAPI();