#!/bin/bash
# Git setup script pre ClubW projekt

set -e

echo "📦 ClubW - Git Repository Setup"
echo "==============================="

# 1. Kontrola či je git nainštalovaný
if ! command -v git &> /dev/null; then
    echo "❌ Git nie je nainštalovaný. Prosím nainštalujte Git."
    exit 1
fi

echo "✅ Git $(git --version)"

# 2. Inicializácia git repository ak ešte nie je
if [ ! -d ".git" ]; then
    echo "🔧 Inicializujem Git repository..."
    git init
else
    echo "✅ Git repository už existuje"
fi

# 3. Vytvorenie/aktualizácia .gitignore
echo "📝 Vytváram .gitignore..."

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Production builds
build/
dist/
*/build/
*/dist/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Logs
logs
*.log

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# IDEs and editors
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Application specific
uploads/
*/uploads/
temp/
*/temp/
logs/
*/logs/

# Database files
*.sqlite
*.sqlite3
*.db

# Docker volumes
postgres_data/
redis_data/
*_postgres_*_data/
*_redis_*_data/

# Backup files
*.bak
*.backup

# SSL certificates
*.pem
*.key
*.crt

# Local development files
local/
*.local

# Package lock files (nepovinné - závisí od preference)
# package-lock.json
# yarn.lock

# Sequelize migration state
.sequelizerc

# Jest coverage
coverage/

# ESLint cache
.eslintcache

# Prettier cache
.prettiercache
EOF

# 4. Vytvorenie README.md ak neexistuje alebo je prázdny
if [ ! -s "README.md" ]; then
    echo "📄 Vytváram README.md..."
    
    cat > README.md << 'EOF'
# ClubW - Škálovateľná webová platforma pre športové kluby

![License](https://img.shields.io/badge/license-PROPRIETARY-red.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue.svg)

ClubW je komplexný systém na správu športových klubov s centrálnym licenčným serverom a škálovateľným backend riešením.

## 🏗️ Architektúra

```
ClubW/
├── license-server/     # Centrálny licenčný server (port 3001)
├── backend/           # Backend pre klientov (port 3000)  
├── frontend/          # React frontend aplikácia (port 3002)
├── shared/            # Zdieľané typy a utility
├── docker/            # Docker konfigurácie
└── docs/              # Dokumentácia
```

## 🚀 Rýchly štart

### Predpoklady
- Node.js 18+
- Docker & Docker Compose (voliteľné)
- Git

### Inštalácia a spustenie

```bash
# 1. Klonovanie projektu
git clone <repository-url> clubw
cd clubw

# 2. Inštalácia závislostí
npm install

# 3. Spustenie databáz (voliteľné)
docker-compose -f docker-compose.dev.yml up -d

# 4. Spustenie všetkých servisov
npm run dev
```

## 🌐 Dostupné služby

Po spustení `npm run dev` budú dostupné:

- **Frontend:** http://localhost:3002
- **Backend API:** http://localhost:3000
- **License Server:** http://localhost:3001

### Health check endpoints
- **Backend:** http://localhost:3000/health
- **License Server:** http://localhost:3001/health

## 📊 Stav projektu

### ✅ Dokončené
- [x] Základná infraštruktúra projektu
- [x] License server s demo API
- [x] Backend server s demo endpoints
- [x] React frontend s live status check
- [x] Docker konfigurácia pre databázy
- [x] TypeScript konfigurácia
- [x] Workspace setup (monorepo)

### 🚧 V procese (Fáza 1)
- [ ] Databázové modely (Sequelize)
- [ ] Autentifikácia (JWT)
- [ ] Správa používateľov
- [ ] Admin rozhranie

### 📋 Plánované fázy

#### 🔐 FÁZA 1: Základná infraštruktúra & autentifikácia
- Prihlásenie používateľa
- Správa používateľských účtov

#### 📰 FÁZA 2: Články a rubriky
- Správa obsahu (novinky, rozhovory, reporty)

#### ⚽️ FÁZA 3: Tímy, hráči a realizačný tím
- Správa klubových zložiek

#### 📆 FÁZA 4: Ligy, zápasy, štatistiky a kalendár
- Zadávanie zápasov, výsledkov a štatistík

#### 📄 FÁZA 5: Stránky (statický obsah)
- Vlastné podstránky klubu

## 🛠️ Development príkazy

```bash
# Spustenie všetkých servisov
npm run dev

# Spustenie jednotlivých servisov
npm run dev:license     # License server
npm run dev:backend     # Backend API
npm run dev:frontend    # React frontend

# Build
npm run build           # Build všetkých projektov
npm run build:shared    # Build shared package
npm run build:license   # Build license server
npm run build:backend   # Build backend
npm run build:frontend  # Build frontend

# Docker
npm run docker:up       # Spustenie databáz
npm run docker:down     # Zastavenie databáz
```

## 🗄️ Databázy (Development)

Ak používate Docker:

- **License PostgreSQL:** localhost:5434
  - DB: `license_server_dev`
  - User: `license_dev`
  - Password: `license_dev_password`

- **Client PostgreSQL:** localhost:5435
  - DB: `clubw_client_dev` 
  - User: `client_dev`
  - Password: `client_dev_password`

- **Redis:** localhost:6380

## 📚 API Dokumentácia

### Backend API (port 3000)
- `GET /health` - Health check
- `GET /api/status` - Server status
- `GET /api/teams` - Demo teams
- `GET /api/articles` - Demo articles

### License Server API (port 3001)
- `GET /health` - Health check
- `GET /api/status` - Server status
- `POST /api/license/verify` - License verification

## 🔧 Technológie

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Sequelize** (PostgreSQL ORM)
- **JWT** pre autentifikáciu
- **Redis** pre cache a sessions
- **Docker** pre databázy

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** pre styling
- **React Router** pre routing
- **Axios** pre HTTP requesty

### DevOps
- **Docker Compose** pre development
- **Concurrently** pre multi-service development
- **Nodemon** pre hot reload

## 🔐 Bezpečnosť

- JWT tokeny pre autentifikáciu
- Bcrypt pre hashovanie hesiel
- CORS konfigurácia
- Rate limiting
- Input validácia
- Šifrované licencie

## 🤝 Prispievanie

1. Fork projektu
2. Vytvorte feature branch (`git checkout -b feature/nova-funkcionalita`)
3. Commit zmeny (`git commit -m 'Pridanie novej funkcionality'`)
4. Push do branch (`git push origin feature/nova-funkcionalita`)
5. Otvorte Pull Request

## 📄 Licencia

Proprietárny softvér - všetky práva vyhradené.

## 📞 Kontakt

Pre otázky a podporu kontaktujte vývojový tím.

---

**Status:** ✅ Základná infraštruktúra funkčná | 🚧 Fáza 1 v procese
EOF
fi

# 5. Pridanie všetkých súborov do git
echo "📦 Pridávam súbory do Git..."
git add .

# 6. Prvý commit ak ešte nebol
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
    echo "📝 Vytváram prvý commit..."
    git commit -m "🎉 Initial commit: ClubW projekt infrastructure

✅ Základná štruktúra projektu
✅ License server (port 3001)
✅ Backend API (port 3000)  
✅ React frontend (port 3002)
✅ Shared TypeScript typy
✅ Docker konfigurácia
✅ Workspace setup

Pripravené na Fázu 1: Autentifikácia & správa používateľov"
else
    echo "📝 Commit existujúcich zmien..."
    git add .
    if ! git diff --cached --quiet; then
        git commit -m "📦 Update: Git setup a dokumentácia

- Pridaný .gitignore
- Aktualizovaný README.md  
- Pripravené pre development"
    else
        echo "✅ Žiadne zmeny na commit"
    fi
fi

# 7. Nastavenie remote repository (ak je poskytnuté)
if [ ! -z "$1" ]; then
    echo "🔗 Nastavujem remote repository..."
    git remote remove origin 2>/dev/null || true
    git remote add origin "$1"
    echo "✅ Remote repository nastavený: $1"
    
    echo "📤 Chcete pushnúť projekt do remote repository? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "📤 Pushuje do remote repository..."
        git branch -M main
        git push -u origin main
        echo "🎉 Projekt úspešne nahraný na Git!"
    fi
else
    echo "ℹ️  Pre nastavenie remote repository spustite:"
    echo "   git remote add origin <your-repository-url>"
    echo "   git branch -M main"
    echo "   git push -u origin main"
fi

echo ""
echo "🎉 Git setup dokončený!"
echo "========================"
echo ""
echo "📋 Git status:"
git status --short
echo ""
echo "🔗 Užitočné Git príkazy:"
echo "   git status          - Status zmien"
echo "   git add .          - Pridanie všetkých zmien"
echo "   git commit -m 'msg' - Commit zmien"
echo "   git push           - Push do remote"
echo "   git pull           - Pull z remote"
echo ""
echo "✨ Projekt je pripravený na version control!"