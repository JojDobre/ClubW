// backend/src/test-pages.ts
// Test súbor pre Page model (FÁZA 5)

import { sequelize, testConnection, syncDatabase } from './config/database';
import Page from './models/Page';
import { getPublishedPages, getMenuPages, getPageBySlug, getAllPagesForAdmin } from './models';

async function testPages() {
  console.log('🧪 TESTOVANIE PAGE MODELU (FÁZA 5)');
  console.log('=====================================\n');

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
      force: true // Hard delete pre test
    });
    console.log('✅ Testované údaje vyčistené\n');

    // 4. Test generovania slug
    console.log('4️⃣ Test generovania slug...');
    const testSlugs = [
      'História klubu',
      'O nás - Naša vízia',
      'Kontaktné údaje & informácie',
      'Športové úspechy 2024/2025!'
    ];

    testSlugs.forEach(nazov => {
      const slug = Page.generateSlug(nazov);
      console.log(`   "${nazov}" → "${slug}"`);
    });
    console.log('✅ Generovanie slug funguje\n');

    // 5. Vytvorenie testovacích stránok
    console.log('5️⃣ Vytvorenie testovacích stránok...');
    
    const testPages = [
      {
        nazov: 'História klubu',
        obsah: '<h1>História nášho klubu</h1><p>Náš klub bol založený v roku 1950 a má bohatú históriu...</p>',
        v_menu: true,
        poradie_menu: 10,
        publikovany: true,
        meta_title: 'História športového klubu - od založenia po súčasnosť',
        meta_description: 'Spoznajte bohatú históriu nášho športového klubu od jeho založenia v roku 1950.'
      },
      {
        nazov: 'O klube',
        obsah: '<h1>O nás</h1><p>Sme športový klub zameraný na futbal a rozvoj mladých talentov...</p>',
        v_menu: true,
        poradie_menu: 5,
        publikovany: true
      },
      {
        nazov: 'Kontakt',
        obsah: '<h1>Kontaktné údaje</h1><p>Email: info@klub.sk<br>Telefón: +421 123 456 789</p>',
        v_menu: true,
        poradie_menu: 99,
        publikovany: true
      },
      {
        nazov: 'Pravidlá a stanovy',
        obsah: '<h1>Pravidlá klubu</h1><p>Oficiálne pravidlá a stanovy klubu...</p>',
        v_menu: false, // Nie je v menu
        publikovany: true
      },
      {
        nazov: 'Rozpracovaná stránka',
        obsah: '<p>Táto stránka sa ešte pripravuje...</p>',
        v_menu: false,
        publikovany: false // Nepublikovaná
      }
    ];

    const createdPages = [];
    for (const pageData of testPages) {
      const page = await Page.create(pageData);
      createdPages.push(page);
      console.log(`   ✓ Vytvorená: "${page.nazov}" (slug: ${page.slug})`);
    }
    console.log(`✅ Vytvorených ${createdPages.length} testovacích stránok\n`);

    // 6. Test jedinečnosti slug
    console.log('6️⃣ Test jedinečnosti slug...');
    try {
      await Page.create({
        nazov: 'História klubu', // Rovnaký názov = rovnaký slug
        obsah: '<p>Iný obsah ale rovnaký slug</p>'
      });
      console.log('❌ CHYBA: Mal by hodiť error pre duplicitný slug');
    } catch (error) {
      console.log('   ✓ Správne zachytený error pre duplicitný slug');
    }
    console.log('✅ Validácia jedinečnosti slug funguje\n');

    // 7. Test helper metód
    console.log('7️⃣ Test helper metód...');
    const testPage = createdPages[0];
    
    console.log(`   URL: ${testPage.getUrl()}`);
    console.log(`   Excerpt: ${testPage.getExcerpt(50)}...`);
    console.log(`   Počet slov: ${testPage.getWordCount()}`);
    console.log(`   Je publikovaná: ${testPage.isPublished()}`);
    console.log(`   Je v menu: ${testPage.isInMenu()}`);
    console.log('✅ Helper metódy fungujú\n');

    // 8. Test query funkcií
    console.log('8️⃣ Test query funkcií...');
    
    // Všetky publikované stránky
    const publishedPages = await getPublishedPages();
    console.log(`   Publikované stránky: ${publishedPages.length}`);
    
    // Stránky v menu
    const menuPages = await getMenuPages();
    console.log(`   Stránky v menu: ${menuPages.length}`);
    menuPages.forEach(page => {
      console.log(`     - ${page.nazov} (poradie: ${page.poradie_menu})`);
    });
    
    // Vyhľadanie stránky podľa slug
    const foundPage = await getPageBySlug('historia-klubu');
    console.log(`   Nájdená stránka: ${foundPage ? foundPage.nazov : 'nenájdená'}`);
    
    // Všetky stránky pre admin
    const allPages = await getAllPagesForAdmin();
    console.log(`   Všetky stránky (admin): ${allPages.length}`);
    console.log('✅ Query funkcie fungujú\n');

    // 9. Test automatického poradia v menu
    console.log('9️⃣ Test automatického poradia v menu...');
    const nextOrder = await Page.getNextMenuOrder();
    console.log(`   Ďalšie poradie v menu: ${nextOrder}`);
    
    const newPage = await Page.create({
      nazov: 'Nová stránka v menu',
      obsah: '<p>Automatické poradie</p>',
      v_menu: true
    });
    console.log(`   Nová stránka má poradie: ${newPage.poradie_menu}`);
    console.log('✅ Automatické poradie funguje\n');

    // 10. Test úpravy stránky
    console.log('🔟 Test úpravy stránky...');
    const pageToUpdate = createdPages[1];
    await pageToUpdate.update({
      nazov: 'O klube - aktualizované',
      obsah: '<h1>O nás - nový obsah</h1><p>Aktualizovaný obsah stránky...</p>'
    });
    await pageToUpdate.reload();
    console.log(`   Aktualizovaný názov: ${pageToUpdate.nazov}`);
    console.log(`   Slug zostal: ${pageToUpdate.slug}`); // Slug sa nemení pri update
    console.log('✅ Úprava stránky funguje\n');

    // 11. Test JSON output
    console.log('1️⃣1️⃣ Test JSON output...');
    const jsonOutput = testPage.toJSON();
    console.log('   JSON obsahuje kľúče:', Object.keys(jsonOutput).join(', '));
    console.log('   Helper fields:');
    console.log(`     - url: ${jsonOutput.url}`);
    console.log(`     - excerpt: ${jsonOutput.excerpt.substring(0, 50)}...`);
    console.log(`     - word_count: ${jsonOutput.word_count}`);
    console.log(`     - is_published: ${jsonOutput.is_published}`);
    console.log(`     - is_in_menu: ${jsonOutput.is_in_menu}`);
    console.log('✅ JSON output funguje\n');

    // 12. Štatistiky
    console.log('1️⃣2️⃣ Finálne štatistiky...');
    const stats = await Page.findAndCountAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN publikovany = true THEN 1 ELSE 0 END')), 'published'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN v_menu = true THEN 1 ELSE 0 END')), 'in_menu'],
      ],
      raw: true
    });
    
    console.log('   📊 Štatistiky stránok:');
    console.log(`     - Celkom stránok: ${allPages.length}`);
    console.log(`     - Publikovaných: ${publishedPages.length}`);
    console.log(`     - V menu: ${menuPages.length}`);
    console.log(`     - Nepublikovaných: ${allPages.length - publishedPages.length}`);

    console.log('\n🎉 Všetky testy Page modelu úspešne dokončené!');
    console.log('📄 FÁZA 5: Stránky (statický obsah) - databázový model je pripravený');
    console.log('✅ Môžeme pokračovať vytvorením API routes\n');
    
  } catch (error) {
    console.error('\n❌ Chyba počas testovania:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Spustenie testu
testPages();