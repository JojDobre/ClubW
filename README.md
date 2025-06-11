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
