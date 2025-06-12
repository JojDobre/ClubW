// backend/src/test-db.ts
// Test pripojenia k databáze a vytvorenia tabuliek

import { testConnection, syncDatabase } from './config/database';
import User from './models/user';

async function testDatabase() {
  console.log('🧪 Testovanie databázového pripojenia...');
  console.log('=====================================');

  try {
    // 1. Test pripojenia
    console.log('1️⃣ Testovanie pripojenia k databáze...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Pripojenie k databáze zlyhalo');
      process.exit(1);
    }

    // 2. Synchronizácia databázy (vytvorenie tabuliek)
    console.log('\n2️⃣ Synchronizácia databázy...');
    await syncDatabase(true); // force: true pre čisté vytvorenie tabuliek

    // 3. Test vytvorenia používateľa
    console.log('\n3️⃣ Test vytvorenia admin používateľa...');
    
    // Vytvorenie admin používateľa
    const adminUser = await User.create({
      meno: 'Admin Test',
      email: 'admin@clubw.sk',
      heslo: 'admin123',
      rola: 'admin',
      aktivity: true,
    });

    console.log('✅ Admin používateľ vytvorený:', adminUser.toSafeJSON());

    // 4. Test prihlásenia
    console.log('\n4️⃣ Test overovania hesla...');
    const isPasswordValid = await adminUser.overHeslo('admin123');
    console.log('✅ Heslo správne:', isPasswordValid);

    const isPasswordInvalid = await adminUser.overHeslo('wrong_password');
    console.log('✅ Nesprávne heslo odmietnuté:', !isPasswordInvalid);

    // 5. Test vyhľadania používateľa
    console.log('\n5️⃣ Test vyhľadania používateľa...');
    const foundUser = await User.findOne({
      where: { email: 'admin@clubw.sk' }
    });

    if (foundUser) {
      console.log('✅ Používateľ nájdený:', foundUser.toSafeJSON());
    }

    // 6. Vytvorenie demo používateľov
    console.log('\n6️⃣ Vytvorenie demo používateľov...');
    
    const demoUsers = await User.bulkCreate([
      {
        meno: 'Redaktor Demo',
        email: 'redaktor@clubw.sk',
        heslo: 'redaktor123',
        rola: 'redaktor',
        aktivity: true,
      },
      {
        meno: 'Tréner Demo',
        email: 'trener@clubw.sk',
        heslo: 'trener123',
        rola: 'trener',
        aktivity: true,
      },
    ]);

    console.log(`✅ ${demoUsers.length} demo používateľov vytvorených`);

    // 7. Výpis všetkých používateľov
    console.log('\n7️⃣ Zoznam všetkých používateľov:');
    const allUsers = await User.findAll();
    allUsers.forEach(user => {
      console.log(`   - ${user.meno} (${user.email}) - ${user.rola}`);
    });

    console.log('\n🎉 Všetky testy úspešne dokončené!');
    console.log('📝 Databáza je pripravená na použitie');
    
  } catch (error) {
    console.error('\n❌ Chyba počas testovania:', error);
    process.exit(1);
  }

  // Ukončenie procesu
  process.exit(0);
}

// Spustenie testu
testDatabase();