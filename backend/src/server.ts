// backend/src/server.ts
// Hlavný backend server s kompletným API pre články

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './models';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import articleRoutes, { adminArticleRouter } from './routes/articles';
import categoryRoutes from './routes/categories';
import publicRoutes from './routes/public';

// Načítanie environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Zvýšený limit pre obrázky
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ClubW Backend API',
    version: '1.0.0',
    database: 'connected' // TODO: skutočná kontrola DB
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    service: 'ClubW Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: 'connected',
    features: [
      'Articles management ✅',
      'Categories management ✅', 
      'User authentication ✅',
      'Admin interface ✅'
    ]
  });
});

// === API ROUTES ===

// Autentifikácia
app.use('/api/auth', authRoutes);

// Správa používateľov (vyžaduje autentifikáciu)
app.use('/api/users', userRoutes);

// Verejné články (bez autentifikácie)
app.use('/api/articles', articleRoutes);

// Admin články (vyžaduje autentifikáciu)
app.use('/api/admin/articles', adminArticleRouter);

// Kategórie
app.use('/api/categories', categoryRoutes);

// === DEMO ENDPOINTS (odstránime po implementácii skutočného API) ===

// Demo endpoint pre tímy
app.get('/api/teams', (req, res) => {
  const teams = [
    { 
      id: '1', 
      name: 'A-tím muži', 
      category: 'Seniori',
      players: 23,
      coach: 'Ján Novák'
    },
    { 
      id: '2', 
      name: 'U19', 
      category: 'Juniori',
      players: 18,
      coach: 'Peter Kováč'
    },
    { 
      id: '3', 
      name: 'U15', 
      category: 'Žiaci',
      players: 15,
      coach: 'Mária Svobodová'
    }
  ];
  
  res.json({
    success: true,
    data: teams,
    message: 'Demo tímy načítané (pripravuje sa skutočné API)'
  });
});

// Demo endpoint pre štatistiky
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalArticles: 42,
      publishedArticles: 38,
      totalViews: 15847,
      totalUsers: 12,
      totalTeams: 6,
      lastUpdate: new Date().toISOString()
    },
    message: 'Demo štatistiky'
  });
});

// === MIDDLEWARE PRE CHYBY ===

// 404 handler pre API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint nebol nájdený',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  
  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validačná chyba',
      details: err.errors.map((e: any) => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Záznam už existuje',
      field: err.errors[0]?.path || 'unknown'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Neplatný token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token vypršal'
    });
  }

  // Všeobecná chyba
  res.status(err.status || 500).json({
    success: false,
    error: 'Interná chyba servera',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Niečo sa pokazilo'
  });
});

// === FRONTEND ROUTES (SPA) ===
// Musí byť na konci, aby neprekryl API routes
app.use('/', publicRoutes);

// === INICIALIZÁCIA SERVERA ===

async function startServer() {
  try {
    // Inicializácia databázy
    console.log('📁 Inicializujem databázu...');
    await initializeDatabase();
    console.log('✅ Databáza inicializovaná');

    // Spustenie servera
    app.listen(PORT, () => {
      console.log('🚀 ClubW Backend Server');
      console.log('========================');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 API status: http://localhost:${PORT}/api/status`);
      console.log('');
      console.log('📋 Dostupné API endpoints:');
      console.log('   GET  /api/articles - Verejné články');
      console.log('   GET  /api/articles/:slug - Detail článku');
      console.log('   POST /api/auth/login - Prihlásenie');
      console.log('   GET  /api/auth/me - Aktuálny používateľ');
      console.log('   GET  /api/admin/articles - Admin články');
      console.log('   POST /api/admin/articles - Vytvorenie článku');
      console.log('');
      console.log('🌐 Frontend routes:');
      console.log('   GET  / - Domovská stránka');
      console.log('   GET  /clanky - Zoznam článkov');
      console.log('   GET  /clanek/:slug - Detail článku');
      console.log('   GET  /admin - Admin panel');
      console.log('');
      console.log(`🕐 Server spustený: ${new Date().toLocaleString('sk-SK')}`);
      console.log('========================');
    });

  } catch (error) {
    console.error('❌ Chyba pri spustení servera:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM signal received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT signal received, shutting down gracefully');
  process.exit(0);
});

// Spustenie servera
startServer();

export default app;