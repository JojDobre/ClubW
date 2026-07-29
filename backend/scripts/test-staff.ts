// backend/src/test-staff.ts
// Test pre realizačný tím - FÁZA 3

import { testConnection, syncDatabase } from './config/database';
import Team from './models/Team';
import Staff from './models/Staff';

async function testStaff() {
  console.log('🧪 Testovanie realizačného tímu - FÁZA 3');
  console.log('==========================================');

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

    // 3. Nájdenie existujúcich tímov
    console.log('\n3️⃣ Načítanie existujúcich tímov...');
    
    const teams = await Team.findAll({
      order: [['poradie', 'ASC']]
    });

    if (teams.length === 0) {
      console.error('❌ Žiadne tímy neboli nájdené. Najprv spustite test-teams.ts');
      process.exit(1);
    }

    console.log(`✅ Nájdených ${teams.length} tímov`);

    // 4. Vytvorenie klubového realizačného tímu (bez priradenia k špecifickému tímu)
    console.log('\n4️⃣ Vytvorenie klubového realizačného tímu...');
    
    const clubStaff = await Staff.bulkCreate([
      {
        meno: 'Marián',
        priezvisko: 'Novotný',
        funkcia: 'predseda klubu',
        email: 'predseda@klub.sk',
        telefon: '+421901234567',
        datum_narodenia: new Date('1970-05-12'),
        kvalifikacia: 'Magister športového manažmentu',
        tim_id: null, // Pracuje pre celý klub
        poradie: 1,
      },
      {
        meno: 'Eva',
        priezvisko: 'Krásna',
        funkcia: 'sekretár',
        email: 'sekretar@klub.sk',
        telefon: '+421902345678',
        datum_narodenia: new Date('1985-08-20'),
        tim_id: null, // Pracuje pre celý klub
        poradie: 2,
      },
      {
        meno: 'MUDr. Pavel',
        priezvisko: 'Zdravý',
        funkcia: 'lekár',
        email: 'lekar@klub.sk',
        telefon: '+421903456789',
        datum_narodenia: new Date('1975-12-03'),
        kvalifikacia: 'Špecialista pre športovú medicínu, UEFA Medical Certificate',
        tim_id: null, // Pracuje pre celý klub
        poradie: 3,
      },
    ], {
      individualHooks: true
    });

    console.log(`✅ ${clubStaff.length} členov klubového realizačného tímu vytvorených:`);
    clubStaff.forEach(staff => {
      const age = staff.getAge();
      const contact = staff.hasContactInfo() ? '📧📞' : '';
      console.log(`   - ${staff.getFullName()} - ${staff.funkcia} ${contact} ${age ? `(${age} rokov)` : ''}`);
    });

    // 5. Vytvorenie realizačného tímu pre A-tím
    console.log('\n5️⃣ Vytvorenie realizačného tímu pre A-tím...');
    
    const aTeam = teams.find(t => t.nazov === 'A-tím');
    if (!aTeam) {
      console.error('❌ A-tím nebol nájdený');
      process.exit(1);
    }

    const aTeamStaff = await Staff.bulkCreate([
      {
        meno: 'Ján',
        priezvisko: 'Tréner',
        funkcia: 'hlavný tréner',
        email: 'trener.a@klub.sk',
        telefon: '+421904567890',
        datum_narodenia: new Date('1980-03-15'),
        kvalifikacia: 'UEFA A licencia, bývalý profesionálny hráč',
        tim_id: aTeam.id,
        poradie: 1,
      },
      {
        meno: 'Peter',
        priezvisko: 'Pomocník',
        funkcia: 'asistent trénera',
        email: 'asistent.a@klub.sk',
        telefon: '+421905678901',
        datum_narodenia: new Date('1983-07-22'),
        kvalifikacia: 'UEFA B licencia',
        tim_id: aTeam.id,
        poradie: 2,
      },
      {
        meno: 'Tomáš',
        priezvisko: 'Brankár',
        funkcia: 'tréner brankárov',
        email: 'brankar.trener@klub.sk',
        datum_narodenia: new Date('1978-11-08'),
        kvalifikacia: 'Špecializácia na tréning brankárov, bývalý reprezentačný brankár',
        tim_id: aTeam.id,
        poradie: 3,
      },
    ], {
      individualHooks: true
    });

    console.log(`✅ ${aTeamStaff.length} členov realizačného tímu A-tímu vytvorených:`);
    aTeamStaff.forEach(staff => {
      const age = staff.getAge();
      const contact = staff.hasContactInfo() ? '📧📞' : '';
      console.log(`   - ${staff.getFullName()} - ${staff.funkcia} ${contact} ${age ? `(${age} rokov)` : ''}`);
    });

    // 6. Vytvorenie realizačného tímu pre mládežnícky tím
    console.log('\n6️⃣ Vytvorenie realizačného tímu pre Žiaci mladší...');
    
    const mladsiZiaci = teams.find(t => t.nazov === 'Žiaci mladší');
    if (!mladsiZiaci) {
      console.error('❌ Žiaci mladší neboli nájdení');
      process.exit(1);
    }

    const youthStaff = await Staff.bulkCreate([
      {
        meno: 'Milan',
        priezvisko: 'Mladý',
        funkcia: 'hlavný tréner',
        email: 'trener.mladez@klub.sk',
        telefon: '+421906789012',
        datum_narodenia: new Date('1985-09-10'),
        kvalifikacia: 'UEFA C licencia, špecializácia na mládežnícky futbal',
        tim_id: mladsiZiaci.id,
        poradie: 1,
      },
      {
        meno: 'Anna',
        priezvisko: 'Výchovná',
        funkcia: 'vedúci mužstva',
        email: 'veduca.mladez@klub.sk',
        telefon: '+421907890123',
        datum_narodenia: new Date('1990-04-25'),
        tim_id: mladsiZiaci.id,
        poradie: 2,
      },
    ], {
      individualHooks: true
    });

    console.log(`✅ ${youthStaff.length} členov realizačného tímu Žiaci mladší vytvorených:`);
    youthStaff.forEach(staff => {
      const age = staff.getAge();
      const contact = staff.hasContactInfo() ? '📧📞' : '';
      console.log(`   - ${staff.getFullName()} - ${staff.funkcia} ${contact} ${age ? `(${age} rokov)` : ''}`);
    });

    // 7. Test načítania všetkých členov realizačného tímu
    console.log('\n7️⃣ Test načítania všetkých členov realizačného tímu...');
    
    const allStaff = await Staff.findAll({
      order: [['tim_id', 'ASC'], ['poradie', 'ASC']]
    });
    
    console.log(`✅ Načítaných ${allStaff.length} členov realizačného tímu z databázy:`);
    allStaff.forEach(staff => {
      const teamInfo = staff.tim_id ? `Tím ID: ${staff.tim_id}` : 'Celý klub';
      const age = staff.getAge();
      console.log(`   - ${staff.getFullName()} - ${staff.funkcia} (${teamInfo}) ${age ? `- ${age} rokov` : ''}`);
    });

    // 8. Test filtrovania podľa funkcie
    console.log('\n8️⃣ Test filtrovania podľa funkcie...');
    
    const treneri = await Staff.findAll({
      where: { 
        funkcia: {
          [require('sequelize').Op.like]: '%tréner%'
        }
      },
      order: [['tim_id', 'ASC'], ['poradie', 'ASC']]
    });
    
    console.log(`✅ Tréneri (${treneri.length}):`);
    treneri.forEach(staff => {
      const teamInfo = staff.tim_id ? `Tím ID: ${staff.tim_id}` : 'Celý klub';
      console.log(`   - ${staff.getFullName()} - ${staff.funkcia} (${teamInfo})`);
    });

    // 9. Test členov pre konkrétny tím
    console.log('\n9️⃣ Test načítania realizačného tímu pre A-tím...');
    
    const aTeamStaffMembers = await Staff.findAll({
      where: { tim_id: aTeam.id },
      order: [['poradie', 'ASC']]
    });
    
    console.log(`✅ Realizačný tím A-tímu (${aTeamStaffMembers.length}):`);
    aTeamStaffMembers.forEach(staff => {
      console.log(`   - ${staff.getFullName()} - ${staff.funkcia}`);
      if (staff.hasContactInfo()) {
        const contact = staff.getContactInfo();
        console.log(`     📧 ${contact.email || 'N/A'} | 📞 ${contact.telefon || 'N/A'}`);
      }
    });

    // 10. Test klubových členov (bez priradenia k tímu)
    console.log('\n🔟 Test načítania klubových členov...');
    
    const clubStaffMembers = await Staff.findAll({
      where: { tim_id: null },
      order: [['poradie', 'ASC']]
    });
    
    console.log(`✅ Kluboví členovia (${clubStaffMembers.length}):`);
    clubStaffMembers.forEach(staff => {
      console.log(`   - ${staff.getFullName()} - ${staff.funkcia}`);
      if (staff.kvalifikacia) {
        console.log(`     🎓 ${staff.kvalifikacia}`);
      }
    });

    // 11. Test dostupných funkcií
    console.log('\n1️⃣1️⃣ Test dostupných funkcií...');
    
    const availableFunctions = Staff.getAvailableFunctions();
    console.log('✅ Dostupné funkcie v realizačnom tíme:');
    availableFunctions.forEach((funkcia, index) => {
      console.log(`   ${index + 1}. ${funkcia}`);
    });

    // 12. Test toSafeJSON metódy
    console.log('\n1️⃣2️⃣ Test toSafeJSON metódy...');
    
    const firstStaff = allStaff[0];
    const safeJSON = firstStaff.toSafeJSON();
    
    console.log('✅ Ukážka bezpečných údajov člena realizačného tímu:');
    console.log(JSON.stringify(safeJSON, null, 2));

    console.log('\n✅ Test realizačného tímu úspešne dokončený!');
    console.log('=============================================');

  } catch (error) {
    console.error('❌ Chyba pri testovaní realizačného tímu:', error);
    process.exit(1);
  } finally {
    // Uzavretie pripojenia
    process.exit(0);
  }
}

// Spustenie testu
testStaff();