// backend/src/index.ts
// Hlavný entry point backend servera - KOMPLETNÝ pre FÁZU 4

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import models from './models'; // DÔLEŽITÉ - načíta aj vzťahy medzi modelmi
import sequelize from './config/database';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import sharp from 'sharp';

// Import databázových funkcií
import { testConnection, syncDatabase } from './config/database';
// Kontrola licencie - blokuje zápisové operácie pri neplatnej licencii
import { kontrolaLicencie, spustiKontroluLicencie, stavLicencie } from './middleware/licencia';
// Upratovanie vypršaných tokenov
import { uprataStareTokeny } from './controllers/hesloController';

// Import route handlerov
// Nastavenia klubu (white-label identita a farby)
import nastaveniaRoutes from './routes/nastavenia';
// Sezóny a súpisky hráčov
import sezonyRoutes from './routes/sezony';
// GDPR - súhlasy, export údajov, anonymizácia, audit
import gdprRoutes from './routes/gdpr';
// Sekcia KLUB — sponzori, dokumenty, ankety, fanúšikovia
import klubRoutes from './routes/klub';
// Komentáre, videá a turnaje
import obsahDoplnkyRoutes from './routes/obsah-doplnky';
import authRoutes from './routes/auth';
import licenciaRoutes from './routes/licencia';
import userRoutes from './routes/users';
import categoryRoutes, { adminCategoryRouter } from './routes/categories';
import articleRoutes, { adminArticleRouter } from './routes/articles';
import teamRoutes from './routes/teams';
import playerRoutes from './routes/players'; 
import staffRoutes from './routes/staff'; 
import ligaRoutes from './routes/liga';
import zapasRoutes from './routes/zapas';
import kalendarRoutes from './routes/kalendar';
import pagesRoutes, { adminPageRouter } from './routes/pages'; 
import galleriesRoutes, { adminGalleryRouter } from './routes/galleries';
import { adminGalleryImagesRouter } from './routes/gallery-images';
import uploadRoutes from './routes/upload';
import archivRoutes from './routes/archiv';
import stadionRoutes from './routes/stadiony';
import mediaRoutes from './routes/media';
import rolaRoutes from './routes/roly';
import menuRoutes from './routes/menu';
import formularRoutes from './routes/formulare';
import logRoutes from './routes/logy';
import { zaznamenajZmeny } from './middleware/auditLog';
import { vykonajPresmerovania } from './middleware/presmerovania';
import { spustiPlanovacClankov } from './services/planovacClankov';
import { spustiPlanovacZapasov } from './services/planovacZapasov';

// Načítanie environment premenných
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Vytvorenie predvoleného avatara pri štarte servera.
// POZOR: ukladáme ho ako PNG, nie SVG - SVG súbory sa z priečinka uploads
// servujú len ako príloha (ochrana pred XSS), takže by sa nezobrazili.
const createDefaultAvatar = async () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fsPromises.mkdir(uploadsDir, { recursive: true });

  const defaultAvatarPath = path.join(uploadsDir, 'default-avatar.png');

  try {
    await fsPromises.access(defaultAvatarPath);
    // Súbor už existuje - nič nerobíme
  } catch {
    // Silueta osoby: sivé pozadie s kruhom (hlava) a polkruhom (ramená)
    const svgPredloha = Buffer.from(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="95" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
  <circle cx="100" cy="75" r="25" fill="#9ca3af"/>
  <circle cx="100" cy="140" r="35" fill="#9ca3af"/>
</svg>`);

    // SVG predlohu prevedieme cez sharp na bezpečný PNG rasterový obrázok
    await sharp(svgPredloha).png().toFile(defaultAvatarPath);
    console.log('✅ Default avatar (PNG) vytvorený');
  }
};


// ===== MIDDLEWARE SETUP =====

// Security middleware - MUSÍ byť pred static serving,
// inak sa upload súbory servujú bez security hlavičiek
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Static serving pre upload súbory (až PO helmete)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  // Skryté súbory (.env a pod.) sa nikdy neservujú
  dotfiles: 'deny',
  // Zakážeme automatické doplnenie prípony - zabraňuje obídeniu kontrol
  extensions: false,
  index: false,
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    // SVG a HTML v uploads by sa mohli spustiť ako skript v kontexte našej domény.
    // Vynútime stiahnutie namiesto zobrazenia (ochrana pred stored XSS).
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.svg' || ext === '.html' || ext === '.htm') {
      res.setHeader('Content-Disposition', 'attachment');
    }
    // Prehliadač nesmie hádať typ obsahu podľa obsahu súboru
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// Kompressia odpovedí
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// CORS konfigurácia
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
  credentials: true, // Povolenie cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minút
  max: 500, // max 500 requestov na IP za 15 minút
  message: {
    success: false,
    message: 'Príliš veľa requestov, skúste neskôr.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Špecialný rate limit pre login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minút
  max: 5, // max 5 pokusov o prihlásenie za 15 minút
  message: {
    success: false,
    message: 'Príliš veľa pokusov o prihlásenie, skúste neskôr.'
  },
});

// Rate limit pre komentáre návštevníkov. Pridať komentár sa dá bez
// prihlásenia, takže bez limitu by jeden skript zahltil frontu na schválenie.
// Týka sa len odoslania nového komentára, nie čítania ani moderovania.
const komentarLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minút
  max: 10, // max 10 nových komentárov z jednej adresy za 10 minút
  message: {
    success: false,
    message: 'Poslali ste priveľa komentárov naraz. Skúste to o chvíľu znova.'
  },
});

// Rate limit pre verejné formuláre (prihlášky, kontakt) - rovnaký dôvod
// ako pri komentároch: odoslať sa dá bez prihlásenia.
const formularLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Odoslali ste priveľa formulárov naraz. Skúste to o chvíľu znova.'
  },
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// ===== ROUTES =====

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server je spustený',
    service: 'ClubW Backend',
    client: process.env.CLIENT_NAME || 'Demo Club',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'ClubW Backend API v1.0.0 - FÁZA 5',
    client: process.env.CLIENT_NAME || 'Demo Club',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      categories: '/api/categories/*',
      adminCategories: '/api/admin/categories/*',
      articles: '/api/articles/*',
      adminArticles: '/api/admin/articles/*',
      teams: '/api/teams/*',          // ✅ Tímy
      players: '/api/players/*',      // ✅ Hráči
      staff: '/api/staff/*',          // ✅ Realizačný tím 
      leagues: '/api/leagues/*',      // ✅ Ligy 
      matches: '/api/matches/*',      // ✅ Zápasy
      calendar: '/api/calendar/*',    // ✅ Kalendár 
      pages: '/api/pages/*',           // ✅ Pages
      adminPage: '/api/admin/pages/*',
      health: '/health',
    },
    phase: 'FÁZA 4 - Ligy, zápasy, štatistiky a kalendár',
    features: [
      '✅ Autentifikácia a správa používateľov',
      '✅ Články a kategórie',
      '✅ Tímy, hráči a realizačný tím',
      '✅ Ligy a súťaže',
      '✅ Zápasy a výsledky',
      '✅ Štatistiky hráčov (góly, asistencie, karty)',
      '✅ Pages management',
      '✅ Kalendár zápasov - mesačný/týždenný'
    ],
    timestamp: new Date().toISOString(),
  });
});

// Auth routes s rate limitom
app.use('/api/auth/login', loginLimiter);
app.post('/api/comments', komentarLimiter);
app.post('/api/forms/:kluc/submit', formularLimiter);
// Kontrola licencie - musí byť pred API routes.
// Čítanie necháva prejsť vždy, blokuje len zmeny obsahu.
app.use(kontrolaLicencie);

// Licencia: stav, overenie na licenčnom serveri, verzia systému
app.use('/api/license', licenciaRoutes);

// Nastavenia klubu - musia byť dostupné aj bez prihlásenia,
// verejný web z nich berie farby a názov
// Presmerovania starých odkazov. Musia byť PRED ostatnými routami,
// inak by stará adresa skončila na chybovej stránke skôr, než sa
// presmerovanie stihne vyhodnotiť.
app.use(vykonajPresmerovania);

// Audit: zaznamená každý úspešný zápis. Musí byť pred routami, aby
// zachytil všetky - dopĺňať volanie do každého controllera by
// znamenalo, že sa naň pri novom endpointe zabudne.
app.use(zaznamenajZmeny);

app.use('/api', nastaveniaRoutes);

// Sezóny a súpisky - čítanie je verejné (archív, súpisky tímov)
app.use('/api', sezonyRoutes);

// GDPR - všetky endpointy sú chránené, pracujú s osobnými údajmi
app.use('/api', gdprRoutes);

// Sekcia KLUB — čítanie je verejné (sponzori a dokumenty na webe)
app.use('/api', klubRoutes);
app.use('/api', obsahDoplnkyRoutes);

app.use('/api/auth', authRoutes);

// User management routes
app.use('/api/users', userRoutes);

// Category routes
app.use('/api/categories', categoryRoutes);
app.use('/api/admin/categories', adminCategoryRouter);

// Article routes
app.use('/api/articles', articleRoutes);
app.use('/api/admin/articles', adminArticleRouter);

// FÁZA 3 ROUTES
app.use('/api/teams', teamRoutes);      // ✅ Tímy
app.use('/api/players', playerRoutes);  // ✅ Hráči 
app.use('/api/staff', staffRoutes);     // ✅ Realizačný tím 

// FÁZA 4 ROUTES 
app.use('/api/leagues', ligaRoutes);    // ✅ Ligy 
app.use('/api/matches', zapasRoutes);   // ✅ Zápasy
app.use('/api/calendar', kalendarRoutes); // ✅ Kalendár

// FÁZA 5: Stránky (statický obsah)
app.use('/api/pages', pagesRoutes);
app.use('/api/admin/pages', adminPageRouter);

// FÁZA 7: Fotogalérie
app.use('/api/galleries', galleriesRoutes);
app.use('/api/admin/galleries', adminGalleryImagesRouter);
app.use('/api/admin/galleries', adminGalleryRouter);

app.use('/api/upload', uploadRoutes);

// Štadióny - čítanie verejné (adresa patrí na web)
app.use('/api/stadiums', stadionRoutes);

// Archív - mäkko odstránené položky a ich obnova
app.use('/api/admin/archive', archivRoutes);

// Media knižnica - všetky nahraté súbory na jednom mieste
app.use('/api/admin/media', mediaRoutes);

// Role a oprávnenia - vlastné role so zaškrtávacími právami na modul
app.use('/api/admin/roles', rolaRoutes);

// Menu a presmerovania
app.use('/api', menuRoutes);

// Formuláre - verejné vyplnenie aj správa vyplnených
app.use('/api', formularRoutes);

// Logy - všetky udalosti s filtrovaním
app.use('/api/admin/logs', logRoutes);


// ===== ŠTATISTIKY =====

// GET /api/stats - Reálne štatistiky z databázy
// (nahrádza pôvodný demo endpoint, ktorý vracal natvrdo vymyslené čísla)
app.get('/api/stats', async (req, res, next) => {
  try {
    // Modely sú načítané hore pri štarte, netreba ich doťahovať znova
    const { Article, User, Team, Player, Staff, Liga, Zapas } = models as any;

    // Všetky počty naraz cez Promise.all - jediný roundtrip čas namiesto sekvenčného čakania
    const [
      totalArticles,
      publishedArticles,
      totalUsers,
      totalTeams,
      totalPlayers,
      totalStaff,
      totalLeagues,
      totalMatches,
      finishedMatches,
      upcomingMatches,
    ] = await Promise.all([
      Article.count(),
      Article.count({ where: { status: 'published' } }),
      User.count({ where: { aktivity: true } }),
      Team.count({ where: { aktivity: true } }),
      Player.count({ where: { aktivity: true } }),
      Staff.count({ where: { aktivity: true } }),
      Liga.count({ where: { aktivity: true } }),
      Zapas.count({ where: { aktivity: true } }),
      Zapas.count({ where: { aktivity: true, status: 'ukonceny' } }),
      Zapas.count({ where: { aktivity: true, status: 'naplanovany' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalArticles,
        publishedArticles,
        totalUsers,
        totalTeams,
        totalPlayers,
        totalStaff,
        totalLeagues,
        totalMatches,
        finishedMatches,
        upcomingMatches,
        lastUpdate: new Date().toISOString(),
      },
      message: 'Štatistiky načítané z databázy',
    });
  } catch (error) {
    // Chybu delegujeme na globálny error handler
    next(error);
  }
});










// ===== ERROR HANDLING =====

// 404 handler pre API routes - MUSÍ byť pred všeobecným '*' handlerom,
// inak sa nikdy nevykoná (pôvodná chyba: bol registrovaný až za ním)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} nebol nájdený`,
  });
});

// Všeobecný 404 handler pre všetky ostatné cesty
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} nebola nájdená`,
  });
});

// Global error handler
// OPRAVA: špecifické kontroly chýb musia byť PRED všeobecnou odpoveďou.
// Pôvodný kód najprv odoslal 500 a až potom kontroloval typy chýb,
// čo spôsobovalo ERR_HTTP_HEADERS_SENT a klient nikdy nedostal validačné chyby.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);

  // Poistka: ak už bola odpoveď odoslaná, delegujeme na Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Sequelize validačné chyby (napr. nesplnená podmienka v modeli)
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validačná chyba',
      errors: err.errors.map((e: any) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      })),
    });
  }

  // Sequelize unique constraint (duplicitný záznam, napr. rovnaký email)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Záznam s touto hodnotou už existuje',
      field: err.errors?.[0]?.path || 'unknown',
    });
  }

  // Sequelize foreign key chyby (referencia na neexistujúci záznam)
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Neplatná referencia na súvisiaci záznam',
      table: err.table || 'unknown',
      field: err.fields || 'unknown',
    });
  }

  // JWT chyby - neplatný token
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Neplatný autentifikačný token',
    });
  }

  // JWT chyby - expirovaný token
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Autentifikačný token vypršal',
    });
  }

  // Multer chyby pri uploade (prekročená veľkosť súboru a pod.)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Chyba pri nahrávaní súboru: ${err.message}`,
    });
  }

  // Všeobecná chyba - až ako POSLEDNÁ možnosť
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Interná chyba servera',
    // Stack trace posielame len v developmente, v produkcii by prezrádzal interné detaily
    debug: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ===== SERVER START =====

async function startServer() {
  try {
    console.log('🚀 Spúšťanie ClubW Backend servera...');

    // Príprava priečinka uploads a predvoleného avatara
    await createDefaultAvatar();
    
    // Testovanie pripojenia k databáze
    console.log('📊 Testovanie pripojenia k databáze...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Pripojenie k databáze zlyhalo');
      process.exit(1);
    }

    // Príprava schémy databázy.
    //
    // Schému spravujú VÝHRADNE migrácie (npm run db:migrate), a to aj vo
    // vývoji. Predtým tu vo vývoji bežal sync() pri každom štarte a ticho
    // si dorobil chýbajúce tabuľky z modelov. Tie potom vyzerali inak než
    // tie z migrácií (Sequelize napríklad nedáva DEFAULT na časové stĺpce,
    // dopĺňa ich v JS) a následná migrácia buď padla, alebo tabuľku
    // preskočila a nechala schému rozídenú s históriou migrácií.
    //
    // Kto sync naozaj chce (rýchle skúšanie na zahodenej databáze),
    // zapne si ho premennou DB_SYNC=true.
    if (process.env.DB_SYNC === 'true' && process.env.NODE_ENV !== 'production') {
      console.log('🔄 Synchronizácia databázy (DB_SYNC=true)...');
      console.log('⚠️  Pozor: schému má spravovať npm run db:migrate.');
      await syncDatabase(false); // false = bez force, zachová existujúce dáta
    } else {
      console.log('ℹ️  Schému spravujú migrácie (npm run db:migrate)');
    }

    // Spustenie pravidelnej kontroly licencie (prvá prebehne hneď)
    spustiKontroluLicencie();

    // Upratovanie vypršaných tokenov - hneď po štarte a potom raz denne.
    // Bez toho by tabuľky tokenov postupne narastali o nepotrebné záznamy.
    void uprataStareTokeny();
    const upratovanie = setInterval(() => void uprataStareTokeny(), 24 * 60 * 60 * 1000);
    upratovanie.unref(); // časovač nebráni ukončeniu procesu

    // Zverejňovanie naplánovaných článkov - bez neho zostane článok
    // v stave "scheduled" navždy, aj keď jeho čas vydania dávno prešiel
    spustiPlanovacClankov();

    // Prepínanie stavu zápasov na odohratý - logika existovala, ale
    // nikto ju nevolal, takže sa stav menil len ručne
    spustiPlanovacZapasov();

    // Spustenie servera
    app.listen(PORT, () => {
      console.log('✅ ClubW Backend server je spustený!');
      console.log(`🌐 Server beží na: http://localhost:${PORT}`);
      console.log(`📋 API dokumentácia: http://localhost:${PORT}/api/status`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📡 Dostupné API endpoints:');
      console.log('   🔐 Auth:      /api/auth/*');
      console.log('   👥 Users:     /api/users/*');
      console.log('   📰 Articles:  /api/articles/*');
      console.log('   GET  /api/articles/:slug - Detail článku');
      console.log('   GET  /api/pages - Verejné stránky'); // NOVÉ
      console.log('   GET  /api/pages/:slug - Detail stránky'); // NOVÉ
      console.log('   GET  /api/pages/menu - Menu stránky'); // NOVÉ
      console.log('   GET  /api/admin/pages - Admin stránky'); // NOVÉ
      console.log('   POST /api/admin/pages - Vytvorenie stránky'); // NOVÉ
      console.log('   📁 Categories:/api/categories/*');
      console.log('   🏆 Teams:     /api/teams/*');
      console.log('   ⚽ Players:   /api/players/*');
      console.log('   👨‍💼 Staff:     /api/staff/*');
      console.log('   🏆 Leagues:     /api/leagues/*');
      console.log('   🤝 Matches:     /api/matches/*');
      console.log('   📅 Calendar:    /api/calendar/*');
      console.log('   📊 Stats:       /api/stats');
      console.log('');
      console.log('🎯 FÁZA 4 - Ligy, zápasy, štatistiky a kalendár');
    });

  } catch (error) {
    console.error('❌ Chyba pri spúšťaní servera:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n🛑 Vypínanie servera...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server ukončený');
  process.exit(0);
});

// Spustenie servera
startServer();