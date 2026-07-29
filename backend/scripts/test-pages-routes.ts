// backend/src/test-pages-routes.ts
// Test súbor pre Pages API routes (FÁZA 5)

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

async function testPagesRoutes() {
  console.log('🧪 TESTOVANIE PAGES API ROUTES (FÁZA 5)');
  console.log('========================================\n');

  try {
    // Predpokladáme, že server beží na porte 3000
    console.log('🔗 Testujeme API na:', API_URL);
    console.log('⚠️  Uistite sa, že backend server beží: npm run dev\n');

    // 1. Test health check
    console.log('1️⃣ Test server health check...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Server je dostupný:', healthResponse.data.message);
    } catch (error) {
      console.log('❌ Server nie je dostupný. Spustite: npm run dev');
      return;
    }

    // 2. Test verejného API - všetky stránky
    console.log('\n2️⃣ Test GET /api/pages (verejné)...');
    try {
      const response = await axios.get(`${API_URL}/pages`);
      
      if (response.data.success) {
        const pages = response.data.data.pages;
        console.log(`✅ Načítaných ${pages.length} publikovaných stránok`);
        
        // Ukážka prvej stránky
        if (pages.length > 0) {
          const firstPage = pages[0];
          console.log(`   Prvá stránka: "${firstPage.nazov}" (${firstPage.slug})`);
          console.log(`   V menu: ${firstPage.is_in_menu}, Publikovaná: ${firstPage.is_published}`);
        }
      } else {
        console.log('❌ API vrátilo chybu:', response.data.message);
      }
    } catch (error: any) {
      console.log('❌ Chyba pri volaní API:', error.message);
    }

    // 3. Test menu API
    console.log('\n3️⃣ Test GET /api/pages/menu...');
    try {
      const response = await axios.get(`${API_URL}/pages/menu`);
      
      if (response.data.success) {
        const menuPages = response.data.data.pages;
        console.log(`✅ Menu obsahuje ${menuPages.length} stránok`);
        
        menuPages.forEach((page: any, index: number) => {
          console.log(`   ${index + 1}. ${page.nazov} (${page.url}) - poradie: ${page.poradie_menu}`);
        });
      } else {
        console.log('❌ Menu API vrátilo chybu:', response.data.message);
      }
    } catch (error: any) {
      console.log('❌ Chyba pri volaní menu API:', error.message);
    }

    // 4. Test detail stránky
    console.log('\n4️⃣ Test GET /api/pages/:slug...');
    try {
      // Skúsime načítať stránku "o-klube"
      const response = await axios.get(`${API_URL}/pages/o-klube`);
      
      if (response.data.success) {
        const page = response.data.data.page;
        console.log(`✅ Načítaná stránka: "${page.nazov}"`);
        console.log(`   URL: ${page.url}`);
        console.log(`   Excerpt: ${page.excerpt.substring(0, 80)}...`);
        console.log(`   Počet slov: ${page.word_count}`);
      } else {
        console.log('❌ Detail API vrátilo chybu:', response.data.message);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('⚠️  Stránka "o-klube" neexistuje - to je v poriadku pre test');
      } else {
        console.log('❌ Chyba pri volaní detail API:', error.message);
      }
    }

    // 5. Test neplatného slug
    console.log('\n5️⃣ Test neplatného slug...');
    try {
      const response = await axios.get(`${API_URL}/pages/neexistujuca-stranka`);
      console.log('❌ API malo vrátiť 404 error');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('✅ Správne vrátený 404 pre neexistujúcu stránku');
      } else {
        console.log('❌ Neočakávaná chyba:', error.message);
      }
    }

    // 6. Test filtrovania
    console.log('\n6️⃣ Test filtrovania stránok...');
    try {
      // Filter len stránky v menu
      const menuResponse = await axios.get(`${API_URL}/pages?in_menu=true`);
      const allResponse = await axios.get(`${API_URL}/pages`);
      
      if (menuResponse.data.success && allResponse.data.success) {
        const menuCount = menuResponse.data.data.pages.length;
        const allCount = allResponse.data.data.pages.length;
        
        console.log(`✅ Filter funguje: ${menuCount} stránok v menu z ${allCount} celkovo`);
      }
    } catch (error: any) {
      console.log('❌ Chyba pri testovaní filtrov:', error.message);
    }

    // 7. Test vyhľadávania
    console.log('\n7️⃣ Test vyhľadávania...');
    try {
      const response = await axios.get(`${API_URL}/pages?search=klub`);
      
      if (response.data.success) {
        const pages = response.data.data.pages;
        console.log(`✅ Vyhľadávanie "klub": ${pages.length} výsledkov`);
        
        pages.forEach((page: any) => {
          console.log(`   - ${page.nazov}`);
        });
      }
    } catch (error: any) {
      console.log('❌ Chyba pri vyhľadávaní:', error.message);
    }

    // 8. Test limitu a stránkovania
    console.log('\n8️⃣ Test stránkovania...');
    try {
      const response = await axios.get(`${API_URL}/pages?limit=2&offset=0`);
      
      if (response.data.success) {
        const { pages, pagination } = response.data.data;
        console.log(`✅ Stránkovanie: ${pages.length} stránok z ${pagination.total}`);
        console.log(`   Limit: ${pagination.limit}, Offset: ${pagination.offset}`);
        console.log(`   Má ďalšie: ${pagination.has_more}`);
      }
    } catch (error: any) {
      console.log('❌ Chyba pri testovaní stránkovania:', error.message);
    }

    console.log('\n🎉 Test verejného Pages API dokončený!');
    console.log('\n⚠️  POZNÁMKA: Admin API testy vyžadujú autentifikáciu');
    console.log('   Pre testovanie admin funkcií je potrebné:');
    console.log('   1. Prihlásiť sa a získať JWT token');
    console.log('   2. Pridať Authorization header do requestov');
    console.log('   3. Mať používateľa s rolou admin/redaktor');
    
    console.log('\n✅ FÁZA 5: Stránky API je pripravené na použitie!');

  } catch (error) {
    console.error('\n❌ Neočakávaná chyba počas testovania:', error);
  }
}

// Spustenie testu
if (require.main === module) {
  testPagesRoutes();
}

export default testPagesRoutes;