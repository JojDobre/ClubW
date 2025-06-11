import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:3002'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ClubW Backend',
    client: process.env.CLIENT_NAME || 'Demo Club',
    version: '1.0.0'
  });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Backend is running!',
    client: process.env.CLIENT_NAME || 'Demo Club',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/teams', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'A-tím muži', type: 'men', playerCount: 25 },
      { id: '2', name: 'U19', type: 'youth', playerCount: 18 }
    ]
  });
});

app.get('/api/articles', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', title: 'Víťazstvo v derby!', status: 'published' }
    ]
  });
});

// Error handling
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`⚽ Backend running on port ${PORT}`);
  console.log(`🏟️  Client: ${process.env.CLIENT_NAME || 'Demo Club'}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
});
