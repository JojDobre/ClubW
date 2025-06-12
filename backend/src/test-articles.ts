// backend/src/test-articles.ts
// Test pre články a rubriky

import { testConnection, syncDatabase } from './config/database';
import './models'; // Import vzťahov
import User from './models/user';
import Category from './models/Category';
import Article from './models/Article';

async function testArticles() {
  console.log('🧪 Testovanie článkov a rubrík...');
  console.log('=====================================');

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

    // 3. Vytvorenie demo rubrík
    console.log('\n3️⃣ Vytvorenie demo rubrík...');
    
    const categories = await Category.bulkCreate([
      {
        nazov: 'Zápasy',
        slug: 'zapasy', // Explicitne zadáme slug
        popis: 'Reporty a výsledky zo zápasov',
        farba: '#3b82f6',
        ikona: '⚽',
        poradie: 1,
      },
      {
        nazov: 'Rozhovory',
        slug: 'rozhovory', // Explicitne zadáme slug
        popis: 'Rozhovory s hráčmi a realizačným tímom',
        farba: '#10b981',
        ikona: '🎤',
        poradie: 2,
      },
      {
        nazov: 'Mládež',
        slug: 'mladez', // Explicitne zadáme slug
        popis: 'Správy z mládežníckych kategórií',
        farba: '#f59e0b',
        ikona: '👶',
        poradie: 3,
      },
    ]);

    console.log(`✅ ${categories.length} rubrík vytvorených`);
    categories.forEach(cat => {
      console.log(`   - ${cat.nazov} (${cat.slug})`);
    });

    // 4. Nájdenie admin používateľa
    console.log('\n4️⃣ Hľadanie admin používateľa...');
    const adminUser = await User.findOne({
      where: { rola: 'admin' }
    });

    if (!adminUser) {
      console.error('❌ Admin používateľ nebol nájdený');
      process.exit(1);
    }
    console.log(`✅ Admin používateľ nájdený: ${adminUser.meno}`);

    // 5. Vytvorenie demo článkov
    console.log('\n5️⃣ Vytvorenie demo článkov...');
    
    const articles = await Article.bulkCreate([
      {
        nazov: 'Víťazstvo v derby proti FC Trenčín',
        slug: 'vitazstvo-v-derby-proti-fc-trencin', // Explicitne zadáme slug
        obsah: '<p>Náš tím dosiahol skvelé víťazstvo v derby zápase proti FC Trenčín výsledkom 3:1. Góly strelili Novák, Kováč a Svoboda.</p><p>Zápas sa hral pred vypredaným štadiónom a atmosféra bola fantastická. Už v 15. minúte otvoril skóre náš kapitán Novák krásnou strelou z hranice šestnástky.</p>',
        excerpt: 'Náš tím dosiahol skvelé víťazstvo v derby zápase proti FC Trenčín výsledkom 3:1.',
        autor_id: adminUser.id,
        kategoria_id: categories[0].id, // Zápasy
        status: 'published',
        publikovany_datum: new Date(),
        featured: true,
        tags: JSON.stringify(['derby', 'víťazstvo', 'FC Trenčín']),
      },
      {
        nazov: 'Rozhovor s trénerom po víťaznom zápase',
        slug: 'rozhovor-s-trenerom-po-vitaznom-zapase', // Explicitne zadáme slug
        obsah: '<p>"Som veľmi spokojný s výkonom celého tímu," povedal tréner po zápase. "Chlapci ukázali charakter a bojovnosť."</p><p>Tréner tiež dodal, že tím sa pripravuje na ďalšie dôležité zápasy v lige.</p>',
        excerpt: 'Rozhovor s trénerom po víťaznom zápase proti FC Trenčín.',
        autor_id: adminUser.id,
        kategoria_id: categories[1].id, // Rozhovory
        status: 'published',
        publikovany_datum: new Date(),
        tags: JSON.stringify(['rozhovor', 'tréner']),
      },
      {
        nazov: 'U19 postúpila do semifinále',
        slug: 'u19-postupila-do-semifinale', // Explicitne zadáme slug
        obsah: '<p>Naša mládežnícka kategória U19 postúpila do semifinále regionálnej súťaže po víťazstve 2:0 nad súperom z Bratislavy.</p>',
        excerpt: 'U19 postúpila do semifinále regionálnej súťaže.',
        autor_id: adminUser.id,
        kategoria_id: categories[2].id, // Mládež
        status: 'draft', // Koncept
        tags: JSON.stringify(['U19', 'semifinále', 'mládež']),
      },
    ]);

    console.log(`✅ ${articles.length} článkov vytvorených`);
    articles.forEach(article => {
      console.log(`   - ${article.nazov} (${article.status})`);
    });

    // 6. Test načítania článkov s vzťahmi
    console.log('\n6️⃣ Test načítania článkov s autormi a kategóriami...');
    
    const articlesWithRelations = await Article.findAll({
      include: [
        {
          model: User,
          as: 'autor',
          attributes: ['id', 'meno', 'email']
        },
        {
          model: Category,
          as: 'kategoria',
          attributes: ['id', 'nazov', 'slug', 'farba', 'ikona']
        }
      ],
      order: [['vytvoreny', 'DESC']]
    });

    console.log('✅ Články s vzťahmi:');
    articlesWithRelations.forEach(article => {
      console.log(`   📰 ${article.nazov}`);
      console.log(`      👤 Autor: ${(article as any).autor.meno}`);
      console.log(`      📂 Kategória: ${(article as any).kategoria.nazov}`);
      console.log(`      🔗 Slug: ${article.slug}`);
      console.log(`      📊 Status: ${article.status}`);
      console.log(`      👁️  Zobrazenia: ${article.views}`);
      console.log('');
    });

    // 7. Test slug generovania
    console.log('7️⃣ Test generovania slug...');
    const testSlugs = [
      'Víťazstvo v derby!',
      'Nový hráč v tíme - Ján Novák',
      'Štatistiky sezóny 2024/2025'
    ];

    testSlugs.forEach(nazov => {
      const slug = Article.generateSlug(nazov);
      console.log(`   "${nazov}" → "${slug}"`);
    });

    console.log('\n🎉 Všetky testy úspešne dokončené!');
    console.log('📝 Databáza článkov je pripravená na použitie');
    
  } catch (error) {
    console.error('\n❌ Chyba počas testovania:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Spustenie testu
testArticles();