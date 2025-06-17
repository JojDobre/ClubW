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
import './models'; // DÔLEŽITÉ - pre načítanie vzťahov

// Import databázových funkcií
import { testConnection, syncDatabase } from './config/database';

// Import route handlerov
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes, { adminCategoryRouter } from './routes/categories';
import articleRoutes, { adminArticleRouter } from './routes/articles';
import teamRoutes from './routes/teams';
import playerRoutes from './routes/players'; 
import staffRoutes from './routes/staff'; 
import ligaRoutes from './routes/liga';
import zapasRoutes from './routes/zapas';
import kalendarRoutes from './routes/kalendar';

// Načítanie environment premenných
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE SETUP =====

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
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
  max: 100, // max 100 requestov na IP za 15 minút
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
    message: 'ClubW Backend API v1.0.0 - FÁZA 4',
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
      '✅ Kalendár zápasov - mesačný/týždenný'
    ],
    timestamp: new Date().toISOString(),
  });
});

// Auth routes s rate limitom
app.use('/api/auth/login', loginLimiter);
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





// ===== DEMO ENDPOINTS (môžeme odstrániť po úplnej implementácii) ===

// Redirect na nový kalendár API
app.get('/api/calendar', (req, res) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  res.json({
    success: true,
    message: 'Kalendár API je dostupný na nových endpointoch',
    endpoints: {
      month: `/api/calendar/month/${currentYear}/${currentMonth}`,
      week: `/api/calendar/week/${currentYear}/${currentMonth}/${currentDate.getDate()}`,
      upcoming: '/api/calendar/upcoming'
    },
    examples: [
      'GET /api/calendar/month/2024/8 - Mesačný kalendár',
      'GET /api/calendar/week/2024/8/15 - Týždenný kalendár', 
      'GET /api/calendar/upcoming?limit=5 - Nadchádzajúce zápasy',
      'GET /api/calendar/month/2024/8?liga_id=1 - Filter podľa ligy'
    ]
  });
});

// Demo endpoint pre kalendár (FÁZA 4 - môže zostať ako ukážka)
app.get('/api/calendar', async (req, res) => {
  try {
    // Simulácia kalendárnych dát (v skutočnosti by sme načítali zo Zapas modelu)
    const calendar = {
      currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
      events: [
        {
          date: '2024-08-15',
          matches: [
            { id: 1, time: '18:00', teams: 'A-tím vs B-tím', league: 'I. liga' },
            { id: 2, time: '20:00', teams: 'C-tím vs D-tím', league: 'I. liga' }
          ]
        },
        {
          date: '2024-08-22',
          matches: [
            { id: 3, time: '18:30', teams: 'B-tím vs C-tím', league: 'Regionálna liga' }
          ]
        }
      ],
      totalMatches: 3,
      upcomingMatches: 1
    };

    res.json({
      success: true,
      data: calendar,
      message: 'Demo kalendár načítaný (implementácia v príprave)'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Chyba pri načítaní kalendára',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Demo endpoint pre štatistiky (rozšírený pre FÁZU 4)
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      // Základné štatistiky
      totalArticles: 42,
      publishedArticles: 38,
      totalViews: 15847,
      totalUsers: 12,
      
      // FÁZA 3 štatistiky
      totalTeams: 6,
      totalPlayers: 87,
      totalStaff: 18,
      
      // FÁZA 4 štatistiky
      totalLeagues: 4,
      totalMatches: 24,
      finishedMatches: 18,
      upcomingMatches: 6,
      totalGoals: 67,
      totalCards: 23,
      
      lastUpdate: new Date().toISOString()
    },
    message: 'Demo štatistiky pre všetky fázy'
  });
});










// ===== ERROR HANDLING =====

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} nebola nájdená`,
  });
});

// 404 handler pre API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.path} nebol nájdený`,
    availableEndpoints: [
      '/api/auth/*',
      '/api/users/*', 
      '/api/categories/*',
      '/api/articles/*',
      '/api/teams/*',
      '/api/players/*',
      '/api/staff/*',
      '/api/leagues/*',
      '/api/matches/*',
      '/api/calendar/*',
      '/api/stats'
    ]
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Chyba servera',
    error: process.env.NODE_ENV === 'development' 
      ? err.stack 
      : undefined
  });

    // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validačná chyba',
      errors: err.errors.map((e: any) => ({
        field: e.path,
        message: e.message,
        value: e.value
      }))
    });
  }

// Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Neplatná referencia na súvisiaci záznam',
      table: err.table || 'unknown',
      field: err.fields || 'unknown'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Neplatný autentifikačný token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Autentifikačný token vypršal'
    });
  }

  // Všeobecná chyba
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Interná chyba servera',
    error: process.env.NODE_ENV === 'development' 
      ? err.stack 
      : undefined,
  });
});

// ===== SERVER START =====

async function startServer() {
  try {
    console.log('🚀 Spúšťanie ClubW Backend servera...');
    
    // Testovanie pripojenia k databáze
    console.log('📊 Testovanie pripojenia k databáze...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Pripojenie k databáze zlyhalo');
      process.exit(1);
    }

    // Synchronizácia databázy
    console.log('🔄 Synchronizácia databázy...');
    await syncDatabase(false); // false = bez force, zachová existujúce dáta

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