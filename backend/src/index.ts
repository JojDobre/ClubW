// backend/src/index.ts
// Hlavný entry point backend servera

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
    message: 'ClubW Backend API v1.0.0',
    client: process.env.CLIENT_NAME || 'Demo Club',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      categories: '/api/categories/*',
      adminCategories: '/api/admin/categories/*',
      articles: '/api/articles/*',
      adminArticles: '/api/admin/articles/*',
      health: '/health',
      teams: '/api/teams/*',
    },
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

// Team routes - FÁZA 3
app.use('/api/teams', teamRoutes);

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
      : 'Interná serverová chyba',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ===== SERVER START =====

async function startServer() {
  try {
    console.log('🚀 Spúšťanie ClubW Backend servera...');
    
    // Test databázového pripojenia
    console.log('📡 Pripájanie k databáze...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Nepodarilo sa pripojiť k databáze');
      process.exit(1);
    }

    // Synchronizácia databázy (bez force v production)
    console.log('🔄 Synchronizácia databázy...');
    await syncDatabase(false);

    // Spustenie servera
    app.listen(PORT, () => {
      console.log(`✅ Backend server spustený na porte ${PORT}`);
      console.log(`🏟️  Klient: ${process.env.CLIENT_NAME || 'Demo Club'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 API status: http://localhost:${PORT}/api/status`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('');
        console.log('📝 Demo prihlasovacie údaje:');
        console.log('   Admin: admin@clubw.sk / admin123');
        console.log('   Redaktor: redaktor@clubw.sk / redaktor123');
        console.log('   Tréner: trener@clubw.sk / trener123');
      }
    });

  } catch (error) {
    console.error('❌ Chyba pri spúšťaní servera:', error);
    process.exit(1);
  }
}

// Graceful shutdown
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