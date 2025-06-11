#!/bin/bash
# Kompletný setup script pre ClubW projekt
# Spustenie: bash setup-clubw.sh

set -e

echo "🚀 ClubW - Kompletná inštalácia od začiatku"
echo "=========================================="

# Kontrola predpokladov
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nie je nainštalovaný. Prosím nainštalujte Node.js 18 alebo vyšší."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ NPM nie je nainštalovaný."
    exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ NPM $(npm -v)"
echo ""

# 1. VYTVORENIE ŠTRUKTÚRY PRIEČINKOV
echo "📁 Vytváram štruktúru priečinkov..."

mkdir -p license-server/src/{controllers,models,routes,middleware,services,types,utils,config}
mkdir -p backend/src/{controllers,models,routes,middleware,services,types,utils,config}
mkdir -p frontend/{src,public}
mkdir -p shared/src/{types,utils,constants}
mkdir -p docker/{postgres,redis}
mkdir -p scripts
mkdir -p docs

# 2. ROOT PACKAGE.JSON
echo "📦 Vytváram root package.json..."

cat > package.json << 'EOF'
{
  "name": "clubw",
  "version": "1.0.0",
  "description": "Škálovateľná webová platforma pre športové kluby",
  "private": true,
  "workspaces": [
    "license-server",
    "backend", 
    "frontend",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:license\" \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:license": "cd license-server && npm run dev",
    "dev:backend": "cd backend && npm run dev", 
    "dev:frontend": "cd frontend && npm start",
    "build": "npm run build:shared && npm run build:license && npm run build:backend && npm run build:frontend",
    "build:shared": "cd shared && npm run build",
    "build:license": "cd license-server && npm run build",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  },
  "devDependencies": {
    "concurrently": "latest"
  }
}
EOF

# 3. SHARED PACKAGE
echo "📦 Vytváram shared package..."

cat > shared/package.json << 'EOF'
{
  "name": "@clubw/shared",
  "version": "1.0.0",
  "description": "Zdieľané typy a utility pre ClubW platformu",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
EOF

cat > shared/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

cat > shared/src/index.ts << 'EOF'
// Shared package - hlavný export
export * from './types';
export * from './utils';
export * from './constants';
EOF

cat > shared/src/types/index.ts << 'EOF'
// Zdieľané typy
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  COACH = 'coach',
  VIEWER = 'viewer'
}

export enum LicenseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended'
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface License extends BaseEntity {
  clientId: string;
  licenseKey: string;
  status: LicenseStatus;
  expiresAt: Date;
  maxUsers: number;
  maxTeams: number;
}
EOF

cat > shared/src/utils/index.ts << 'EOF'
// Utility funkcie
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
EOF

cat > shared/src/constants/index.ts << 'EOF'
// Konštanty
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout'
  },
  LICENSE: {
    VERIFY: '/api/license/verify',
    STATUS: '/api/license/status'
  }
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
} as const;
EOF

# 4. LICENSE SERVER
echo "📦 Vytváram license server..."

cat > license-server/package.json << 'EOF'
{
  "name": "@clubw/license-server",
  "version": "1.0.0",
  "description": "Centrálny licenčný server pre ClubW platformu",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "express": "latest",
    "cors": "latest",
    "helmet": "latest",
    "dotenv": "latest",
    "bcryptjs": "latest",
    "jsonwebtoken": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/express": "latest",
    "@types/cors": "latest",
    "@types/bcryptjs": "latest",
    "@types/jsonwebtoken": "latest",
    "typescript": "latest",
    "ts-node": "latest",
    "nodemon": "latest"
  }
}
EOF

cat > license-server/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

cat > license-server/src/index.ts << 'EOF'
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
EOF

cat > license-server/.env.example << 'EOF'
NODE_ENV=development
PORT=3001
JWT_SECRET=your_jwt_secret_key_change_in_production
BCRYPT_ROUNDS=10
EOF

cat > license-server/.env << 'EOF'
NODE_ENV=development
PORT=3001
JWT_SECRET=license_dev_jwt_secret_key_123456789
BCRYPT_ROUNDS=10
EOF

# 5. BACKEND
echo "📦 Vytváram backend..."

cat > backend/package.json << 'EOF'
{
  "name": "@clubw/backend",
  "version": "1.0.0",
  "description": "Backend server pre ClubW športové kluby",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "express": "latest",
    "cors": "latest",
    "helmet": "latest",
    "dotenv": "latest",
    "bcryptjs": "latest",
    "jsonwebtoken": "latest",
    "axios": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/express": "latest",
    "@types/cors": "latest",
    "@types/bcryptjs": "latest",
    "@types/jsonwebtoken": "latest",
    "typescript": "latest",
    "ts-node": "latest",
    "nodemon": "latest"
  }
}
EOF

cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

cat > backend/src/index.ts << 'EOF'
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
EOF

cat > backend/.env.example << 'EOF'
NODE_ENV=development
PORT=3000
CLIENT_NAME=demo_fc
LICENSE_KEY=DEMO-your-license-key-here
LICENSE_SERVER_URL=http://localhost:3001
JWT_SECRET=your_backend_jwt_secret_change_in_production
EOF

cat > backend/.env << 'EOF'
NODE_ENV=development
PORT=3000
CLIENT_NAME=Demo FC
LICENSE_KEY=DEMO-123456789ABCDEF
LICENSE_SERVER_URL=http://localhost:3001
JWT_SECRET=backend_dev_jwt_secret_key_123456789
EOF

# 6. FRONTEND
echo "📦 Vytváram frontend..."

cat > frontend/package.json << 'EOF'
{
  "name": "@clubw/frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "latest",
    "react-dom": "latest",
    "react-scripts": "latest",
    "web-vitals": "latest"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@types/node": "latest",
    "typescript": "latest"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": ["react-app"]
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  },
  "proxy": "http://localhost:3000"
}
EOF

cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
EOF

mkdir -p frontend/public frontend/src

cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="ClubW - Správa športového klubu" />
    <title>ClubW - Správa športového klubu</title>
  </head>
  <body>
    <noscript>Pre správnu funkčnosť potrebujete povoliť JavaScript.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF

cat > frontend/src/index.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

cat > frontend/src/index.css << 'EOF'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f3f4f6;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  padding: 20px 0;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn:hover {
  background: #2563eb;
}

.status-item {
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.status-item:last-child {
  border-bottom: none;
}

.status-ok { color: #10b981; }
.status-warning { color: #f59e0b; }
.status-error { color: #ef4444; }
EOF

cat > frontend/src/App.tsx << 'EOF'
import React, { useState, useEffect } from 'react';

interface ServerStatus {
  backend: 'ok' | 'error' | 'loading';
  license: 'ok' | 'error' | 'loading';
}

function App() {
  const [status, setStatus] = useState<ServerStatus>({
    backend: 'loading',
    license: 'loading'
  });

  useEffect(() => {
    // Kontrola backend statusu
    fetch('/api/status')
      .then(res => res.json())
      .then(() => setStatus(prev => ({ ...prev, backend: 'ok' })))
      .catch(() => setStatus(prev => ({ ...prev, backend: 'error' })));

    // Kontrola license statusu
    fetch('http://localhost:3001/api/status')
      .then(res => res.json())
      .then(() => setStatus(prev => ({ ...prev, license: 'ok' })))
      .catch(() => setStatus(prev => ({ ...prev, license: 'error' })));
  }, []);

  const getStatusText = (stat: 'ok' | 'error' | 'loading') => {
    switch(stat) {
      case 'ok': return '✅ Pripojený';
      case 'error': return '❌ Nedostupný';
      case 'loading': return '⏳ Kontrolujem...';
    }
  };

  const getStatusClass = (stat: 'ok' | 'error' | 'loading') => {
    switch(stat) {
      case 'ok': return 'status-ok';
      case 'error': return 'status-error';
      case 'loading': return 'status-warning';
    }
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1 style={{margin: 0, fontSize: '2rem', fontWeight: 'bold'}}>ClubW</h1>
          <p style={{margin: '5px 0 0 0', color: '#6b7280'}}>
            Platforma pre správu športových klubov
          </p>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 style={{marginTop: 0}}>Vitajte v ClubW</h2>
          <p>Systém pre kompletnú správu športového klubu je pripravený na použitie.</p>
          
          <h3>Status systému</h3>
          <div className="status-item">
            <strong>Frontend:</strong> 
            <span className="status-ok"> ✅ Spustený</span>
          </div>
          <div className="status-item">
            <strong>Backend API:</strong> 
            <span className={getStatusClass(status.backend)}> {getStatusText(status.backend)}</span>
          </div>
          <div className="status-item">
            <strong>License Server:</strong> 
            <span className={getStatusClass(status.license)}> {getStatusText(status.license)}</span>
          </div>

          <div style={{marginTop: '20px'}}>
            <h3>Dostupné funkcie</h3>
            <ul>
              <li>✅ Základná štruktúra aplikácie</li>
              <li>✅ License server</li>
              <li>✅ Backend API</li>
              <li>✅ React frontend</li>
              <li>⏳ Admin rozhranie (pripravuje sa)</li>
              <li>⏳ Správa tímov (pripravuje sa)</li>
              <li>⏳ Správa článkov (pripravuje sa)</li>
            </ul>
          </div>

          <div style={{marginTop: '20px'}}>
            <a href="#" className="btn">Prejsť do admin rozhrania</a>
          </div>
        </div>

        <div className="card">
          <h3>Informácie o projekte</h3>
          <p><strong>Verzia:</strong> 1.0.0</p>
          <p><strong>Prostredie:</strong> Development</p>
          <p><strong>Klient:</strong> Demo FC</p>
          <p><strong>Posledná aktualizácia:</strong> {new Date().toLocaleString('sk-SK')}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
EOF

# 7. DOCKER KONFIGURÁCIE
echo "🐳 Vytváram Docker konfigurácie..."

cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  license-postgres-dev:
    image: postgres:15-alpine
    container_name: clubw-license-postgres-dev
    environment:
      POSTGRES_DB: license_server_dev
      POSTGRES_USER: license_dev
      POSTGRES_PASSWORD: license_dev_password
    volumes:
      - license_postgres_dev_data:/var/lib/postgresql/data
    ports:
      - "5434:5432"
    networks:
      - clubw-dev-network

  client-postgres-dev:
    image: postgres:15-alpine
    container_name: clubw-client-postgres-dev
    environment:
      POSTGRES_DB: clubw_client_dev
      POSTGRES_USER: client_dev
      POSTGRES_PASSWORD: client_dev_password
    volumes:
      - client_postgres_dev_data:/var/lib/postgresql/data
    ports:
      - "5435:5432"
    networks:
      - clubw-dev-network

  redis-dev:
    image: redis:7-alpine
    container_name: clubw-redis-dev
    ports:
      - "6380:6379"
    networks:
      - clubw-dev-network

networks:
  clubw-dev-network:
    driver: bridge

volumes:
  license_postgres_dev_data:
  client_postgres_dev_data:
EOF

# 8. GIT IGNORE
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Production builds
build/
dist/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/

# Database
*.sqlite
*.db

# Uploads
uploads/
temp/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
postgres_data/
redis_data/
EOF

# 9. README
cat > README.md << 'EOF'
# ClubW - Platforma pre športové kluby

## Rýchly štart

1. Spustenie databáz:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. Inštalácia závislostí:
```bash
npm install
```

3. Spustenie aplikácií:
```bash
npm run dev
```

## Prístupné služby

- **Frontend:** http://localhost:3002
- **Backend API:** http://localhost:3000
- **License Server:** http://localhost:3001

## Status kontrola

- **Backend health:** http://localhost:3000/health
- **License health:** http://localhost:3001/health
EOF

# 10. INŠTALÁCIA ZÁVISLOSTÍ
echo ""
echo "📦 Inštalujem závislosti..."

# Root
npm install

# Shared
cd shared
npm install
npm run build
cd ..

# License server
cd license-server
npm install
cd ..

# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..

# 11. SPUSTENIE DATABÁZ
if command -v docker-compose &> /dev/null; then
    echo ""
    echo "🐳 Spúšťam databázy..."
    docker-compose -f docker-compose.dev.yml up -d
    echo "⏳ Čakanie na spustenie databáz..."
    sleep 5
fi

echo ""
echo "🎉 INŠTALÁCIA DOKONČENÁ!"
echo "========================"
echo ""
echo "📋 Môžete teraz spustiť:"
echo "   npm run dev"
echo ""
echo "🌐 Dostupné služby:"
echo "   - Frontend:      http://localhost:3002"
echo "   - Backend API:   http://localhost:3000"
echo "   - License Server: http://localhost:3001"
echo ""
echo "🔍 Health check:"
echo "   - Backend:       http://localhost:3000/health"
echo "   - License:       http://localhost:3001/health"
echo ""
echo "✨ Všetko je pripravené na použitie!"