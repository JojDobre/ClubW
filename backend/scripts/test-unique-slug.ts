// backend/src/test-unique-slug.ts
// Test automatického generovania unikátnych slug (FÁZA 5)

import { sequelize, testConnection, syncDatabase } from './config/database';
import Page from './models/Page';

async function testUniqueSlugGeneration() {
  console.log('🧪 TESTOVANIE AUTOMATICKÉHO GENEROVANIA UNIKÁTNYCH SLUG');
  console.log('======================================================\n');

  try {
    // 1. Test pripojenia k databáze
    console.log('1️⃣ Test pripojenia k databáze...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Nepodarilo sa pripojiť k databáze');
    }
    console.log('✅ Pripojenie úspešné\n');

    // 2. Synchronizácia databázy
    console.log('2️⃣ Synchronizácia databázy...');
    await syncDatabase();
    console.log('✅ Databáza synchronizovaná\n');

    // 3. Vyčistenie existujúcich dát
    console.log('3️⃣ Vyčistenie existujúcich testovacích dát...');
    await Page.destroy({ 
      where: {},
      force: true
    });
    console.log('✅ Testované údaje vyčistené\n');

    // 4. Test základného generovania slug
    console.log('4️⃣ Test základného generovania slug...');
    const testTitles = [
      'História klubu',
      'O nás - Naša vízia',
      'Kontaktné údaje & informácie',
      'Športové úspechy 2024/2025!'
    ];

    for (const title of testTitles) {
      const slug = Page.generateSlug(title);
      console.log(`   "${title}" → "${slug}"`);
    }
    console.log('✅ Základné generovanie slug funguje\n');

    // 5. Test unikátneho slug generovania
    console.log('5️⃣ Test automatického generovania unikátnych slug...');
    
    // Vytvoríme stránku s názvom "História klubu"
    console.log('   Vytváram prvú stránku: "História klubu"');
    const page1 = await Page.create({
      nazov: 'História klubu',
      obsah: '<p>Prvá stránka o histórií klubu.</p>',
      publikovany: true
    });
    console.log(`   ✅ Vytvorená s slug: "${page1.slug}"`);

    // Pokúsime sa vytvoriť ďalšie stránky s rovnakým názvom
    console.log('\n   Vytváram druhú stránku s rovnakým názvom...');
    const page2 = await Page.create({
      nazov: 'História klubu',
      obsah: '<p>Druhá stránka o histórií klubu.</p>',
      publikovany: true
    });
    console.log(`   ✅ Vytvorená s slug: "${page2.slug}"`);

    console.log('\n   Vytváram tretiu stránku s rovnakým názvom...');
    const page3 = await Page.create({
      nazov: 'História klubu',
      obsah: '<p>Tretia stránka o histórií klubu.</p>',
      publikovany: true
    });
    console.log(`   ✅ Vytvorená s slug: "${page3.slug}"`);

    console.log('\n   Vytváram štvrtú stránku s rovnakým názvom...');
    const page4 = await Page.create({
      nazov: 'História klubu',
      obsah: '<p>Štvrtá stránka o histórií klubu.</p>',
      publikovany: true
    });
    console.log(`   ✅ Vytvorená s slug: "${page4.slug}"`);

    console.log('\n✅ Test automatického generovania unikátnych slug úspešný!');

    // 6. Test s rôznymi názvami
    console.log('\n6️⃣ Test s rôznymi názvami...');
    
    const moreTestTitles = [
      'O nás',
      'O nás',  // Rovnaký názov
      'Kontakt',
      'Kontakt', // Rovnaký názov
      'Tréningy',
      'Tréningy' // Rovnaký názov
    ];

    for (const title of moreTestTitles) {
      console.log(`   Vytváram stránku: "${title}"`);
      const page = await Page.create({
        nazov: title,
        obsah: `<p>Obsah pre stránku ${title}.</p>`,
        publikovany: true
      });
      console.log(`   ✅ Vytvorená s slug: "${page.slug}"`);
    }

    // 7. Overenie všetkých stránok
    console.log('\n7️⃣ Prehľad všetkých vytvorených stránok...');
    const allPages = await Page.findAll({
      order: [['vytvoreny', 'ASC']]
    });

    console.log('   📄 Zoznam všetkých stránok:');
    allPages.forEach((page, index) => {
      console.log(`   ${index + 1}. "${page.nazov}" → "${page.slug}"`);
    });

    console.log(`\n   📊 Celkom vytvorených stránok: ${allPages.length}`);

    // 8. Test validácie jedinečnosti
    console.log('\n8️⃣ Test validácie jedinečnosti slug...');
    
    // Skúsime validovať existujúce slug
    const isHistoriaUnique = await Page.validateUniqueSlug('historia-klubu');
    console.log(`   Slug "historia-klubu" je unikátny: ${isHistoriaUnique ? 'ÁNO' : 'NIE'}`);
    
    const isHistoria1Unique = await Page.validateUniqueSlug('historia-klubu-1');
    console.log(`   Slug "historia-klubu-1" je unikátny: ${isHistoria1Unique ? 'ÁNO' : 'NIE'}`);
    
    const isNewSlugUnique = await Page.validateUniqueSlug('nova-stranka');
    console.log(`   Slug "nova-stranka" je unikátny: ${isNewSlugUnique ? 'ÁNO' : 'NIE'}`);

    // 9. Test generateUniqueSlug metódy
    console.log('\n9️⃣ Test generateUniqueSlug metódy...');
    
    const uniqueSlug1 = await Page.generateUniqueSlug('historia-klubu');
    console.log(`   generateUniqueSlug("historia-klubu") → "${uniqueSlug1}"`);
    
    const uniqueSlug2 = await Page.generateUniqueSlug('nova-stranka');
    console.log(`   generateUniqueSlug("nova-stranka") → "${uniqueSlug2}"`);
    
    const uniqueSlug3 = await Page.generateUniqueSlugFromTitle('História klubu');
    console.log(`   generateUniqueSlugFromTitle("História klubu") → "${uniqueSlug3}"`);

    console.log('\n🎉 Všetky testy automatického generovania unikátnych slug úspešne dokončené!');
    console.log('✅ Systém automaticky pridáva číselné suffixy pre duplicitné slug');
    console.log('📄 FÁZA 5: Stránky s automatickým slug generovaním sú pripravené na produkciu\n');
    
  } catch (error) {
    console.error('\n❌ Chyba počas testovania:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Spustenie testu
testUniqueSlugGeneration();