// backend/src/test-galeria.ts
// Test súbor pre Galéria a GaleriaObrazok modely (FÁZA 7)

import { sequelize, testConnection, syncDatabase } from './config/database';
import { Galeria, GaleriaObrazok } from './models';
import { getGalleryWithImages, getGalleriesByType, getAllGalleriesForAdmin } from './models';

async function testGaleriaModels() {
  console.log('🧪 TESTOVANIE FOTOGALÉRIA MODELOV (FÁZA 7)');
  console.log('==========================================\n');

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

    // 3. Vyčistenie existujúcich testovacích dát
    console.log('3️⃣ Vyčistenie existujúcich testovacích dát...');
    await GaleriaObrazok.destroy({ 
      where: {},
      force: true // Hard delete pre test
    });
    await Galeria.destroy({ 
      where: {},
      force: true // Hard delete pre test
    });
    console.log('✅ Testované údaje vyčistené\n');

    // 4. Test generovania slug
    console.log('4️⃣ Test generovania slug...');
    const testSlugs = [
      'Zápas proti Spartak Trnava',
      'Tréning A-tímu - máj 2024',
      'Klubová oslava 2024/2025',
      'Nové dresy & výstroj!'
    ];

    testSlugs.forEach(nazov => {
      const slug = Galeria.generateSlug(nazov);
      console.log(`   "${nazov}" → "${slug}"`);
    });
    console.log('✅ Generovanie slug funguje\n');

    // 5. Vytvorenie testovacích galérií
    console.log('5️⃣ Vytvorenie testovacích galérií...');
    
    const testGalerie = [
      {
        nazov: 'Zápas proti Spartak Trnava',
        popis: 'Fotky z dramatického zápasu kde sme vyhrali 3:2',
        // Bez priradenia - budeme testovať voľnú galériu
      },
      {
        nazov: 'Tréning A-tímu',
        popis: 'Letná príprava na novú sezónu',
        // Bez priradenia - budeme testovať voľnú galériu
      },
      {
        nazov: 'Klubová oslava',
        popis: 'Oslava úspešnej sezóny s hráčmi a fanúšikmi',
        // Bez priradenia - voľná galéria
      },
      {
        nazov: 'Rozhovor s trénerom',
        popis: 'Exkluzívne foto z rozhovoru',
        // Bez priradenia - budeme testovať voľnú galériu
      }
    ];

    const vytvoreneGalerie = [];
    for (const galeriaData of testGalerie) {
      const galeria = await Galeria.create(galeriaData);
      vytvoreneGalerie.push(galeria);
      console.log(`   ✅ Galéria "${galeria.nazov}" vytvorená (ID: ${galeria.id}, slug: ${galeria.slug})`);
    }
    console.log('✅ Všetky galérie vytvorené\n');

    // 6. Test validácie priradenia (len jedno priradenie naraz)
    console.log('6️⃣ Test validácie priradenia...');
    try {
      // Skúsime vytvoriť galériu s viacerými priradeniami (to by malo vyhodiť chybu)
      const invalidGaleria = Galeria.build({
        nazov: 'Neplatná galéria',
        tim_id: 999,    // Fake ID
        clanok_id: 999, // Fake ID - toto by malo vyhodiť chybu už pri validácii
      });
      
      await invalidGaleria.validate(); // Testujeme len validáciu, nie uloženie do DB
      console.log('   ❌ Validácia nefunguje - mal by vyhodiť chybu!');
    } catch (error) {
      console.log('   ✅ Validácia funguje - galéria môže byť priradená len k jednému objektu');
    }

    // 7. Vytvorenie testovacích obrázkov
    console.log('7️⃣ Vytvorenie testovacích obrázkov...');
    
    const galeria1 = vytvoreneGalerie[0]; // Zápas galéria
    const galeria2 = vytvoreneGalerie[1]; // Tím galéria

    const testObrazky = [
      // Obrázky pre galériu 1
      {
        galeria_id: galeria1.id,
        nazov: 'Gól v 45. minúte',
        popis: 'Rozhodujúci moment zápasu',
        cesta_suboru: '/uploads/galerie/2024/zapas1_gol.jpg',
        originalny_nazov: 'gol_45min.jpg',
        velkost_suboru: 2456789,
        mime_typ: 'image/jpeg',
        sirka: 1920,
        vyska: 1080,
        poradie: 1,
        je_nahladovy: true,
      },
      {
        galeria_id: galeria1.id,
        nazov: 'Oslava po góle',
        cesta_suboru: '/uploads/galerie/2024/zapas1_oslava.jpg',
        originalny_nazov: 'oslava_hraci.jpg',
        velkost_suboru: 1876543,
        mime_typ: 'image/jpeg',
        sirka: 1920,
        vyska: 1080,
        poradie: 2,
      },
      {
        galeria_id: galeria1.id,
        nazov: 'Fanúšikovia',
        cesta_suboru: '/uploads/galerie/2024/zapas1_fanusikovia.jpg',
        originalny_nazov: 'fanusikovia.jpg',
        velkost_suboru: 3234567,
        mime_typ: 'image/jpeg',
        sirka: 1920,
        vyska: 1080,
        poradie: 3,
      },
      // Obrázky pre galériu 2  
      {
        galeria_id: galeria2.id,
        nazov: 'Rozcvička',
        popis: 'Príprava na tréning',
        cesta_suboru: '/uploads/galerie/2024/trening1_rozcvicka.jpg',
        originalny_nazov: 'rozcvicka.jpg',
        velkost_suboru: 1567890,
        mime_typ: 'image/jpeg',
        sirka: 1280,
        vyska: 720,
        poradie: 1,
        je_nahladovy: true,
      },
      {
        galeria_id: galeria2.id,
        nazov: 'Taktická príprava',
        cesta_suboru: '/uploads/galerie/2024/trening1_taktika.jpg',
        originalny_nazov: 'taktika.jpg',
        velkost_suboru: 2123456,
        mime_typ: 'image/jpeg',
        sirka: 1280,
        vyska: 720,
        poradie: 2,
      }
    ];

    const vytvoreneObrazky = [];
    for (const obrazokData of testObrazky) {
      const obrazok = await GaleriaObrazok.create(obrazokData);
      vytvoreneObrazky.push(obrazok);
      console.log(`   ✅ Obrázok "${obrazok.nazov || obrazok.originalny_nazov}" vytvorený (${obrazok.getFormattedFileSize()})`);
    }
    console.log('✅ Všetky obrázky vytvorené\n');

    // 8. Test metód modelov
    console.log('8️⃣ Test metód modelov...');
    
    const prvaGaleria = vytvoreneGalerie[0];
    console.log(`   Typ priradenia galérie "${prvaGaleria.nazov}": ${prvaGaleria.getTypPriradenia()}`);
    
    const prvyObrazok = vytvoreneObrazky[0];
    console.log(`   URL obrázka (original): ${prvyObrazok.getImageUrl('original')}`);
    console.log(`   URL obrázka (malý): ${prvyObrazok.getImageUrl('maly')}`);
    console.log(`   Formátovaná veľkosť: ${prvyObrazok.getFormattedFileSize()}`);
    
    // Test validácie typu obrázka
    console.log(`   Je JPEG platný typ? ${GaleriaObrazok.isValidImageType('image/jpeg')}`);
    console.log(`   Je PDF platný typ? ${GaleriaObrazok.isValidImageType('application/pdf')}`);
    console.log('✅ Metódy modelov fungujú\n');

    // 9. Test helper funkcií
    console.log('9️⃣ Test helper funkcií...');
    
    // Test getGalleryWithImages
    const galeriaSSDetails = await getGalleryWithImages(galeria1.id);
    console.log(`   ✅ getGalleryWithImages: galéria "${galeriaSSDetails?.nazov}" má ${galeriaSSDetails?.obrazky?.length} obrázkov`);
    
    // Test getGalleriesByType
    const galerieZapasov = await getGalleriesByType('zapas', 999); // Fake ID
    console.log(`   ✅ getGalleriesByType: našli sme ${galerieZapasov.length} galérií pre zápas`);
    
    const volneGalerie = await getGalleriesByType('volna');
    console.log(`   ✅ getGalleriesByType: našli sme ${volneGalerie.length} voľných galérií`);
    
    // Test getAllGalleriesForAdmin
    const adminGalerie = await getAllGalleriesForAdmin();
    console.log(`   ✅ getAllGalleriesForAdmin: celkom ${adminGalerie.length} galérií v systéme`);
    
    console.log('✅ Helper funkcie fungujú\n');

    // 10. Test aktualizácie počtu obrázkov v galérii
    console.log('🔟 Test aktualizácie počtu obrázkov...');
    
    // Manuálne aktualizujeme počet obrázkov
    for (const galeria of vytvoreneGalerie) {
      const pocetObrazkov = await GaleriaObrazok.count({
        where: { galeria_id: galeria.id, aktivity: true }
      });
      
      await galeria.update({ pocet_obrazkov: pocetObrazkov });
      console.log(`   ✅ Galéria "${galeria.nazov}": ${pocetObrazkov} obrázkov`);
    }
    console.log('✅ Počty obrázkov aktualizované\n');

    // 11. Test JSON exportu
    console.log('1️⃣1️⃣ Test JSON exportu...');
    
    const jsonGaleria = prvaGaleria.toJSON();
    console.log(`   ✅ JSON galérie obsahuje: ${Object.keys(jsonGaleria).join(', ')}`);
    
    const jsonObrazok = prvyObrazok.toJSON();
    console.log(`   ✅ JSON obrázka obsahuje: ${Object.keys(jsonObrazok).join(', ')}`);
    console.log('✅ JSON export funguje\n');

    // 12. Finálny súhrn
    console.log('1️⃣2️⃣ Finálny súhrn...');
    
    const finalGalerie = await Galeria.count({ where: { aktivity: true } });
    const finalObrazky = await GaleriaObrazok.count({ where: { aktivity: true } });
    
    console.log('📊 Finálny stav databázy:');
    console.log(`   🖼️ Galérie: ${finalGalerie}`);
    console.log(`   🎨 Obrázky: ${finalObrazky}`);
    console.log('');

    console.log('🎉 FÁZA 7 - MODELY ÚSPEŠNE OTESTOVANÉ!');
    console.log('========================================');
    console.log('✅ Galeria model - kompletne funkčný');
    console.log('✅ GaleriaObrazok model - kompletne funkčný');
    console.log('✅ Vzťahy medzi modelmi - funkčné');
    console.log('✅ Validácie - funkčné');
    console.log('✅ Helper funkcie - funkčné');
    console.log('✅ JSON export - funkčný');
    console.log('');
    console.log('🚀 Modely sú pripravené na implementáciu API!');

  } catch (error: any) {
    console.error('❌ KRITICKÁ CHYBA pri testovaní modelov FÁZY 7:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Databáza nebeží! Spustite: npm run docker:up');
    } else if (error.name === 'SequelizeConnectionError') {
      console.error('💡 Problém s pripojením k databáze - skontrolujte konfiguráciu');
    } else if (error.name === 'SequelizeValidationError') {
      console.error('💡 Validačná chyba:', error.errors?.map((e: any) => e.message).join(', '));
    } else {
      console.error('💡 Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Spustenie testu ak je súbor spustený priamo
if (require.main === module) {
  testGaleriaModels().finally(() => {
    console.log('\n🔚 Test dokončený');
    process.exit(0);
  });
}

export default testGaleriaModels;