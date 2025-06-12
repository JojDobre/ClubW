// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './models';

// Načítanie environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ClubW Backend API',
    version: '1.0.0'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    service: 'ClubW Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: 'connected', // TODO: skutočná kontrola DB
    features: [
      'Articles management',
      'Categories management', 
      'User authentication (pripravuje sa)',
      'Teams management (pripravuje sa)'
    ]
  });
});

// Demo endpoint pre tímy (z pôvodného kódu)
app.get('/api/teams', (req, res) => {
  const teams = [
    { id: '1', name: 'A-tím muži', category: 'Seniori' },
    { id: '2', name: 'U19', category: 'Juniori' },
    { id: '3', name: 'U15', category: 'Žiaci' }
  ];
  
  res.json({
    success: true,
    data: teams,
    message: 'Demo tímy načítané'
  });
});

// Demo endpoint pre články (aktualizovaný - bude neskôr nahradený skutočným API)
app.get('/api/articles', (req, res) => {
  const articles = [
    {
      id: '1',
      title: 'Víťazstvo v poslednom zápase sezóny',
      excerpt: 'Náš tím dokázal v poslednom zápase sezóny zvíťaziť nad súperom...',
      author: 'Redakcia',
      category: 'Zápasy',
      publishedAt: new Date().toISOString(),
      isPublished: true
    },
    {
      id: '2', 
      title: 'Nový tréner pre A-tím',
      excerpt: 'Klub oficiálne oznámil príchod nového trénera...',
      author: 'Redakcia',
      category: 'Novinky',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      isPublished: true
    }
  ];
  
  res.json({
    success: true,
    data: articles,
    message: 'Demo články načítané (čoskoro z databázy)'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Interná chyba servera',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Niečo sa pokazilo'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cesta ${req.originalUrl} nebola nájdená`
  });
});

// Funkcia pre spustenie servera
const startServer = async (): Promise<void> => {
  try {
    console.log('🚀 Spúšťam ClubW Backend Server...');
    
    // Inicializácia databázy
    // POZOR: force: true vymaže všetky dáta! Pre produkciu použiť false
    const shouldResetDB = process.env.RESET_DB === 'true';
    await initializeDatabase(shouldResetDB);
    
    // Spustenie servera
    app.listen(PORT, () => {
      console.log('');
      console.log('🎉 ClubW Backend Server je spustený!');
      console.log('================================');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Status: http://localhost:${PORT}/api/status`);
      console.log(`⚽ Demo tímy: http://localhost:${PORT}/api/teams`);
      console.log(`📰 Demo články: http://localhost:${PORT}/api/articles`);
      console.log('');
      console.log('✅ Databáza: pripojená a synchronizovaná');
      console.log('✅ Modely: Category, Article');
      console.log('✅ CORS: povolené pre frontend');
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Chyba pri spustení servera:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Zastavujem server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Zastavujem server...');
  process.exit(0);
});

// Spustenie servera
startServer();

export default app;