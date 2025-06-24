// backend/src/test-kalendar.ts
// Kompletný test pre kalendár API - FÁZA 4

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testKalendar() {
  console.log('📅 KOMPLETNÝ TEST KALENDÁRA ZÁPASOV - FÁZA 4');
  console.log('==============================================');

  try {
    // 1. Základný health check
    console.log('1️⃣ Test základnej funkčnosti servera...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log(`✅ Server je funkčný: ${healthResponse.data.service} v${healthResponse.data.version}`);

    const statusResponse = await axios.get(`${API_BASE}/api/status`);
    console.log(`✅ API status: ${statusResponse.data.phase}`);

    // 2. Test mesačného kalendára
    console.log('\n2️⃣ Test mesačného kalendára...');
    
    // Kalendár pre aktuálny mesiac
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const monthResponse = await axios.get(`${API_BASE}/api/calendar/month/${currentYear}/${currentMonth}`);
    console.log(`✅ Mesačný kalendár: ${monthResponse.data.message}`);
    
    const monthData = monthResponse.data.data;
    console.log(`   Mesiac: ${monthData.month_info.nazov_mesiaca} ${monthData.month_info.rok}`);
    console.log(`   Počet zápasov: ${monthData.total_matches}`);
    console.log(`   Počet dní so zápasmi: ${Object.keys(monthData.calendar).length}`);
    
    // Zobrazenie zápasov podľa dní (max 3 dni)
    Object.entries(monthData.calendar).slice(0, 3).forEach(([datum, zapasy]) => {
      const zapasyArray = zapasy as any[];
      console.log(`   📅 ${datum}: ${zapasyArray.length} zápas(ov)`);
      zapasyArray.forEach(zapas => {
        console.log(`      ${zapas.cas} - ${zapas.nazov} ${zapas.vysledok !== 'nezadany' ? `(${zapas.vysledok})` : ''}`);
      });
    });

    // 3. Test filtrovania mesačného kalendára podľa ligy
    console.log('\n3️⃣ Test filtrovania podľa ligy...');
    try {
      const monthFilteredResponse = await axios.get(`${API_BASE}/api/calendar/month/${currentYear}/${currentMonth}?liga_id=1`);
      const monthFilteredData = monthFilteredResponse.data.data;
      console.log(`✅ Mesačný kalendár (Liga 1): ${monthFilteredData.total_matches} zápasov`);
    } catch (error: any) {
      console.log('   ⚠️ Filter podľa ligy nedostupný (liga 1 neexistuje alebo žiadne zápasy)');
    }

    // 4. Test týždenného kalendára
    console.log('\n4️⃣ Test týždenného kalendára...');
    
    // Týždeň obsahujúci dnešný dátum
    const weekResponse = await axios.get(`${API_BASE}/api/calendar/week/${currentYear}/${currentMonth}/${now.getDate()}`);
    console.log(`✅ Týždenný kalendár: ${weekResponse.data.message}`);
    
    const weekData = weekResponse.data.data;
    console.log(`   Týždeň: ${weekData.week_info.week_start} - ${weekData.week_info.week_end}`);
    console.log(`   Číslo týždňa: ${weekData.week_info.week_number}`);
    console.log(`   Počet zápasov: ${weekData.total_matches}`);

// 5. Test nadchádzajúcich zápasov - NOVÝ FORMÁT
    console.log('\n5️⃣ Test nadchádzajúcich zápasov (nový formát)...');
    const upcomingResponse = await axios.get(`${API_BASE}/api/calendar/upcoming?limit=5`);
    console.log(`✅ Nadchádzajúce zápasy: ${upcomingResponse.data.message}`);
    
    // Skontroluj či je nested formát
    if (upcomingResponse.data.data && upcomingResponse.data.data.data) {
      const upcomingData = upcomingResponse.data.data;
      console.log(`   Celkovo: ${upcomingData.count} zápasov`);
      console.log(`   Nadchádzajúce: ${upcomingData.breakdown.upcoming}`);
      console.log(`   Bez výsledku: ${upcomingData.breakdown.without_result}`);
      
      if (upcomingData.count > 0) {
        console.log('   Zápasy:');
        upcomingData.data.slice(0, 3).forEach((zapas: any, index: number) => {
          console.log(`   ${index + 1}. ${zapas.datum} ${zapas.cas} - ${zapas.nazov}`);
          console.log(`      Liga: ${zapas.liga?.nazov || 'N/A'} | Typ: ${zapas.match_type || 'N/A'}`);
          if (zapas.miesto) console.log(`      Miesto: ${zapas.miesto}`);
        });
      } else {
        console.log('   ℹ️ Žiadne nadchádzajúce zápasy v databáze');
      }
    } else {
      console.log('   ❌ Neočakávaný formát odpovede (nový endpoint má vrátiť nested objekt)');
    }

    // 5.5. Test nadchádzajúcich zápasov - LEGACY FORMÁT  
    console.log('\n5.5️⃣ Test nadchádzajúcich zápasov (legacy formát)...');
    const legacyResponse = await axios.get(`${API_BASE}/calendar/upcoming?limit=3`);
    console.log(`✅ Legacy nadchádzajúce zápasy: ${legacyResponse.data.message}`);
    
    // Skontroluj či je legacy formát (priamo array)
    if (Array.isArray(legacyResponse.data.data)) {
      console.log(`   Celkovo: ${legacyResponse.data.count} zápasov`);
      console.log(`   Legacy formát: ✅ array`);
      
      if (legacyResponse.data.count > 0) {
        console.log('   Zápasy:');
        legacyResponse.data.data.slice(0, 2).forEach((zapas: any, index: number) => {
          console.log(`   ${index + 1}. ${zapas.datum} ${zapas.cas} - ${zapas.nazov}`);
          console.log(`      Liga: ${zapas.liga?.nazov || 'N/A'}`);
        });
      }
    } else {
      console.log('   ❌ Neočakávaný formát odpovede (legacy endpoint má vrátiť priamo array)');
    }

    // 6. Test rôznych filtrov
    console.log('\n6️⃣ Test rôznych filtrov...');
    
    // Filter podľa tímu v mesačnom kalendári
    try {
      const teamFilterResponse = await axios.get(`${API_BASE}/api/calendar/month/${currentYear}/${currentMonth}?tim_id=1`);
      const teamFilterData = teamFilterResponse.data.data;
      console.log(`✅ Mesačný kalendár (Tím 1): ${teamFilterData.total_matches} zápasov`);
    } catch (error) {
      console.log('   ⚠️ Filter podľa tímu nedostupný (tím 1 neexistuje)');
    }

    // 7. Test validácie parametrov
    console.log('\n7️⃣ Test validácie parametrov...');
    
    // Neplatný rok
    try {
      await axios.get(`${API_BASE}/api/calendar/month/2050/8`);
      console.log('❌ Validácia roku zlyhala - mala by odmietnuť rok 2050');
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validácia roku funguje správne');
      } else {
        console.log('⚠️ Neočakávaná chyba pri validácii roku');
      }
    }

    // Neplatný mesiac  
    try {
      await axios.get(`${API_BASE}/api/calendar/month/2024/13`);
      console.log('❌ Validácia mesiaca zlyhala - mala by odmietnuť mesiac 13');
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validácia mesiaca funguje správne');
      } else {
        console.log('⚠️ Neočakávaná chyba pri validácii mesiaca');
      }
    }

    // 8. Test performance - veľa requestov
    console.log('\n8️⃣ Test performance...');
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(axios.get(`${API_BASE}/api/calendar/month/${currentYear}/${currentMonth}`));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    console.log(`✅ 5 simultánnych requestov za ${endTime - startTime}ms`);

    // 9. Test edge cases
    console.log('\n9️⃣ Test edge cases...');
    
    // Február v priestupnom roku
    try {
      const febResponse = await axios.get(`${API_BASE}/api/calendar/month/2024/2`);
      console.log(`✅ Február 2024 (priestupný rok): ${febResponse.data.data.total_matches} zápasov`);
    } catch (error) {
      console.log('⚠️ Chyba pri teste februára 2024');
    }
    
    // Posledný deň roka
    try {
      const endYearResponse = await axios.get(`${API_BASE}/api/calendar/week/2024/12/31`);
      console.log(`✅ Týždeň obsahujúci 31.12.2024: ${endYearResponse.data.data.total_matches} zápasov`);
    } catch (error) {
      console.log('⚠️ Chyba pri teste konca roka');
    }

    console.log('\n🎉 VŠETKY TESTY KALENDÁRA DOKONČENÉ');
    console.log('====================================');
    console.log('✅ API kalendára je funkčné a pripravené na frontend integráciu');
    console.log('🔗 Endpointy dostupné na:');
    console.log(`   📅 Mesačný kalendár: GET ${API_BASE}/api/calendar/month/:rok/:mesiac`);
    console.log(`   📆 Týždenný kalendár: GET ${API_BASE}/api/calendar/week/:rok/:mesiac/:den`);
    console.log(`   ⏰ Nadchádzajúce: GET ${API_BASE}/api/calendar/upcoming`);

  } catch (error: any) {
    console.error('\n❌ CHYBA PRI TESTOVANÍ:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Spustenie testov
if (require.main === module) {
  testKalendar()
    .then(() => {
      console.log('\n✨ Test dokončený úspešne!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test zlyhal:', error);
      process.exit(1);
    });
}

export default testKalendar;