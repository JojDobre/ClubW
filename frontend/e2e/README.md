# Testy v prehliadači (Playwright)

Testy otvoria skutočný web v Chromiu a overia:

- **každú vstavanú šablónu** na počítači aj na mobile: hlavné stránky
  (úvod, články, súťaže, detail súťaže, zápasy, tímy, kalendár, galérie,
  videá, partneri, hľadanie, registrácia, neexistujúca stránka) sa načítajú
  bez chyby a s obsahom, nepretekajú do strán a tabuľky súťaží ukazujú
  body aj pri veľmi dlhom názve tímu;
- **administráciu**: obrazovky sa otvoria s nadpisom a bez chyby,
  okno Prispôsobiť šablónu je preložené do angličtiny.

V CI bežia automaticky (úloha „Testy v prehliadači"). Pri chybe sa uloží
správa so snímkami a záznamom (artefakt `e2e-vysledky`).

## Lokálne spustenie

Testy menia aktívnu šablónu a jazyk správcu, preto ich spúšťajte proti
**testovacej** databáze, nie proti webu klubu.

```bash
# 1. Prázdna databáza, migrácie a správca
cd backend
DB_NAME=clubw_e2e npx sequelize-cli db:migrate
DB_NAME=clubw_e2e npx tsx scripts/vytvor-spravcu.ts --email e2e@test.sk --meno "E2E Správca" --heslo "modra lavica pri tichom rybniku"

# 2. Backend na porte 3100
DB_NAME=clubw_e2e PORT=3100 LICENSE_CHECK_DISABLED=true npx tsx src/index.ts

# 3. Produkčný build webu napojený na tento backend
cd frontend
npx vite build
API_PROXY=http://127.0.0.1:3100 npx vite preview --port 4173

# 4. Demo dáta a testy
export E2E_API=http://127.0.0.1:3100 E2E_URL=http://127.0.0.1:4173
export E2E_EMAIL=e2e@test.sk E2E_HESLO="modra lavica pri tichom rybniku"
npm run e2e:data
npx playwright install chromium   # raz
npm run test:e2e
```

Vlastný Chromium (napr. predinštalovaný) nastavíte cez `E2E_CHROMIUM=/cesta/k/chrome`.

## Jednotkové testy

Rýchle testy logiky frontendu (preklady, ceny obchodu, časy zápasov,
čistenie HTML, odkazy blokov...) sú v `src/**/*.test.ts`:

```bash
npm test
```
