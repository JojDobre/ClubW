# End-to-end testy

Testy volajú bežiace API cez `curl`. Overujú správanie celej aplikácie
vrátane databázy, na rozdiel od jednotkových testov v `backend/tests/`.

## Spustenie

Testy potrebujú bežiaci backend (a pri licenčných aj licenčný server).
Pomocné skripty ich spustia samy:

```bash
# Jeden test
bash tests-e2e/run-api-tests.sh tests-e2e/02-autentifikacia.sh

# Licenčný server
bash tests-e2e/run-license-tests.sh tests-e2e/07-licencny-server.sh

# Klientská kontrola licencie (spúšťa oba servery)
bash tests-e2e/08-licencia-klient.sh
```

## Predpoklady

- PostgreSQL beží a `backend/.env` mieri naň
- Migrácie sú spustené: `cd backend && npm run db:migrate`
- Existuje testovací účet `test-admin@clubw.sk` s heslom `TestHeslo123`
  (vytvorí ho `02-autentifikacia.sh` pri prvom behu)

## Zoznam

| Súbor | Čo overuje |
|---|---|
| `01-error-handling.sh` | Spracovanie chýb, 404, reálne štatistiky |
| `02-autentifikacia.sh` | Ochrana zápisových operácií tokenom |
| `03-xss.sh` | Sanitizácia HTML v článkoch |
| `04-upload.sh` | Kontrola typu súboru, path traversal |
| `05-prepocet-tabulky.sh` | Automatický prepočet po zmene zápasu |
| `06-statistiky-zapasov.sh` | Strelci, asistencie, karty |
| `07-licencny-server.sh` | Overovanie licencií, podpisy |
| `08-licencia-klient.sh` | Blokovanie zápisov, ochranná lehota |
| `09-tokeny-a-hesla.sh` | Obnovovacie tokeny, reset hesla, sila hesla |
| `10-nastavenia-klubu.sh` | White-label nastavenia a farby |
| `11-sezony.sh` | Sezóny a súpisky po sezónach |
| `12-gdpr.sh` | Súhlasy, filtrovanie údajov detí, anonymizácia |
