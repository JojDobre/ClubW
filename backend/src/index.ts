// backend/src/index.ts
// Hlavný entry point backend servera - AKTUALIZOVANÝ pre FÁZU 3

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
import playerRoutes from './routes/players'; // NOVÝ import
import staffRoutes from './routes/staff'; // NOVÝ import

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
    message: 'ClubW Backend API v1.0.0 - FÁZA 3',
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
      players: '/api/players/*',      // ✅ Hráči - NOVÉ
      staff: '/api/staff/*',          // ✅ Realizačný tím - NOVÉ
      health: '/health',
    },
    phase: 'FÁZA 3 - Tímy, hráči a realizačný tím',
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
app.use('/api/players', playerRoutes);  // ✅ Hráči - NOVÉ
app.use('/api/staff', staffRoutes);     // ✅ Realizačný tím - NOVÉ

// ===== ERROR HANDLING =====

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} nebola nájdená`,
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
      console.log('');
      console.log('🎯 FÁZA 3: Tímy, hráči a realizačný tím - PRIPRAVENÉ NA TESTOVANIE');
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