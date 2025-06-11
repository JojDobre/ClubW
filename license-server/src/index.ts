import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'], credentials: true }));
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
    service: 'ClubW License Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'License Server is running!',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.post('/api/license/verify', (req, res) => {
  const { licenseKey } = req.body;
  res.json({
    success: true,
    isValid: true,
    license: {
      key: licenseKey,
      plan: 'pro',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      features: ['basic_cms', 'team_management']
    }
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
  console.log(`🔐 License Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
});
