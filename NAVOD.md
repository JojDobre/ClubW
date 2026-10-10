# ClubW — návod na spustenie

Systém na správu futbalového klubu. Tri časti:

| Časť | Priečinok | Port | Čo robí |
|---|---|---|---|
| **Backend** | `backend/` | 3000 | API, databáza, obchodná logika |
| **Frontend** | `frontend/` | 3002 | Verejný web klubu + administrácia |
| **Licenčný server** | `license-server/` | 3001 | Overovanie licencií klientov |

---

## 1. Čo potrebujete nainštalovať

| Nástroj | Verzia | Overenie |
|---|---|---|
| Node.js | 20 alebo novší | `node -v` |
| npm | 10 alebo novší | `npm -v` |
| PostgreSQL | 14 alebo novší | `psql --version` |

Na Windows odporúčam nainštalovať Node.js z [nodejs.org](https://nodejs.org) a PostgreSQL z [postgresql.org](https://www.postgresql.org/download/windows/).

---

## 2. Príprava databázy

Vytvorte databázu a používateľa. V termináli (Linux/Mac) alebo v **SQL Shell (psql)** na Windows:

```sql
CREATE USER client_dev WITH PASSWORD 'zvolte_si_silne_heslo';
CREATE DATABASE clubw_client_dev OWNER client_dev;

-- Databáza pre licenčný server (len ak ho budete prevádzkovať)
CREATE DATABASE clubw_licencie OWNER client_dev;
```

> **Poznámka:** predvolený port PostgreSQL je 5432. Projekt má v predvolených hodnotách 5435 — ak používate štandardný port, uvediete ho v `.env` v ďalšom kroku.

---

## 3. Inštalácia závislostí

V koreňovom priečinku projektu (tam, kde je hlavný `package.json`):

```bash
npm install
```

Jeden príkaz nainštaluje závislosti pre všetky tri časti — projekt používa npm workspaces.

> **Ak sa objaví chyba `Could not load the "sharp" module`:** súbor `package-lock.json` bol vytvorený na inom operačnom systéme. `sharp` je natívny modul a pre každý systém má vlastnú binárku. Riešenie:
>
> ```bash
> rm -rf node_modules package-lock.json
> npm install
> ```

---

## 4. Nastavenie backendu

### 4.1 Vytvorte súbor `backend/.env`

Skopírujte vzor a doplňte hodnoty:

```bash
cp backend/.env.example backend/.env
```

Minimálny obsah pre vývoj:

```env
NODE_ENV=development
PORT=3000

# Databáza
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clubw_client_dev
DB_USER=client_dev
DB_PASSWORD=zvolte_si_silne_heslo

# Podpisovanie prihlasovacích tokenov.
# Vygenerujte: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
JWT_SECRET=sem_vlozte_vygenerovanu_hodnotu

CORS_ORIGIN=http://localhost:3002
FRONTEND_URL=http://localhost:3002

# Vo vývoji vypnite kontrolu licencie
LICENSE_CHECK_DISABLED=true
```

> ⚠️ **`JWT_SECRET` nikdy nenechávajte na predvolenej hodnote.** Kto ho pozná, vie si vyrobiť platný prihlasovací token pre ľubovoľný účet.

### 4.2 Vytvorenie tabuliek

```bash
cd backend
npm run db:migrate
```

Uvidíte zoznam spustených migrácií. Vytvorí sa 20+ tabuliek, predvolené nastavenia klubu aj prvá sezóna.

> **Ak už máte databázu z predchádzajúcej verzie** (vytvorenú cez `sync()`): migrácie sú na to pripravené. Pri existujúcich tabuľkách vypíšu `ℹ️ Tabuľka už existuje, preskakujem` a doplnia len to, čo chýba. Údaje sa nestratia — ligy sa prepoja na sezóny a súpisky sa založia podľa aktuálneho zaradenia hráčov.

### 4.3 Vytvorenie prvého správcu

Zatiaľ neexistuje registračný formulár, prvý účet vytvorte skriptom:

```bash
cd backend
npm run vytvor-spravcu
```

Skript sa spýta na meno, e-mail a heslo. Funguje rovnako v PowerShelli aj v Bashi.

Údaje sa dajú zadať aj rovno:

```bash
npm run vytvor-spravcu -- --meno "Adam Novák" --email admin@vasklub.sk --heslo "zelena lucna kosacka pri potoku"
```

> **Požiadavky na heslo.** Aspoň 10 znakov, nesmie obsahovať bežné slová (`heslo`, `admin`, `password`, `123456`), vaše meno ani e-mail. Kratšie heslo než 16 znakov musí obsahovať aspoň tri zo skupín: malé písmená, veľké písmená, číslice, špeciálne znaky.
>
> Najjednoduchšie prejde **dlhá zapamätateľná fráza** — napríklad `zelena lucna kosacka pri potoku`. Je bezpečnejšia než krátka zmes znakov a ľahšie sa pamätá.
>
> Príklady, ktoré **neprejdú**: `test123123123` (málo druhov znakov), `Heslo2026!` (obsahuje slovo „heslo"), `Adam1234!` (obsahuje vaše meno).

Ak účet s daným e-mailom už existuje, skript ponúkne nastavenie nového hesla — hodí sa, keď zabudnete prístup.

### 4.4 Spustenie

```bash
cd backend
npm run dev
```

Overenie: otvorte `http://localhost:3000/health` — má vrátiť `{"status":"ok"}`.

### 4.5 Testovací obsah (voliteľné)

Na vyskúšanie šablón a administrácie naplní web kompletným ukážkovým obsahom:
6 tímov s hráčmi a realizačným tímom, súťaže s tabuľkami, odohrané zápasy
(góly, karty, striedania, zostavy, priebeh) aj zápasy v programe, články,
fotogalérie, videá, udalosti v kalendári, turnaj s pavúkom, partnerov,
dokumenty, anketu, fanshop, stránky O klube a Kontakt a stránku `/vsetky-bloky`.
Obrázky si skript nakreslí sám, nič nesťahuje.

```bash
cd backend
ADMIN_EMAIL=admin@vasklub.sk ADMIN_HESLO="vaše heslo" npm run testovaci-obsah
```

V PowerShelli: `$env:ADMIN_EMAIL="..."; $env:ADMIN_HESLO="..."; npm run testovaci-obsah`.
Backend musí bežať. Opakované spustenie nič nezdvojí. Menu vytvorí len vtedy,
keď je prázdne. Nepúšťajte ho na ostrom webe — názvy klubov sú vymyslené.

---

## 5. Nastavenie frontendu

### 5.1 Súbor `frontend/.env` (voliteľný pre vývoj)

Vo vývoji netreba nič — Vite presmeruje `/api` na backend automaticky. Pre produkciu:

```env
VITE_API_URL=https://api.vasklub.sk
```

### 5.2 Spustenie

```bash
cd frontend
npm run dev
```

Otvorte `http://localhost:3002`. Prihláste sa účtom z kroku 4.3.

---

## 5b. Nová administrácia

Administrácia bola prepísaná podľa návrhu z Claude Design. **Obe verzie bežia vedľa seba**, cesty sa nekrížia:

| Adresa | Verzia |
|---|---|
| `/prihlasenie`, `/admin/*` | **nová administrácia** |
| `/` a ostatné cesty | pôvodná (stále funkčná) |
| `/ui-kit.html` | kontrolná obrazovka prvkov rozhrania |

Prihláste sa na `http://localhost:3002/prihlasenie`.

### Obrazovky

Menu má štyri sekcie podľa návrhu:

**OBSAH**

| Obrazovka | Cesta |
|---|---|
| Dashboard | `/admin` |
| Články + editor | `/admin/clanky` |
| Kategórie | `/admin/kategorie` |
| Komentáre | `/admin/komentare` |
| Stránky | `/admin/stranky` |
| Galérie | `/admin/galerie` |
| Videá | `/admin/videa` |

**ŠPORT**

| Obrazovka | Cesta |
|---|---|
| Tímy | `/admin/timy` |
| Hráči | `/admin/hraci` |
| Realizačný tím | `/admin/realizacny-tim` |
| Ligy a tabuľky | `/admin/ligy` |
| Turnaje | `/admin/turnaje` |
| Zápasy + editor + **živé sledovanie** | `/admin/zapasy` |
| Kalendár | `/admin/kalendar` |

**KLUB**

| Obrazovka | Cesta |
|---|---|
| Sponzori | `/admin/sponzori` |
| Dokumenty | `/admin/dokumenty` |
| Ankety | `/admin/ankety` |
| Fanúšikovia | `/admin/fanusikovia` |

**SYSTÉM**

| Obrazovka | Cesta |
|---|---|
| Používatelia | `/admin/pouzivatelia` |
| Nastavenia | `/admin/nastavenia` |
| Licencia | `/admin/licencia` |
| Sezóny a súpisky | `/admin/sezony` |
| Ochrana údajov (GDPR) | `/admin/ochrana-udajov` |

Spolu **25 obrazoviek**. Pôvodná administrácia sa už nikde nepoužíva.

### Prebrandovanie klubu

Farby a identita sa nastavujú v `/admin/nastavenia`. **Tri farby prefarbia celý web aj administráciu** — ostatné odtiene sa dopočítajú cez CSS `color-mix`. Zmena sa prejaví okamžite bez obnovenia stránky.

Technicky: backend servuje farby cez `/api/settings.css`, ktorý je odkazovaný priamo v `index.html`. Načíta sa spolu so stránkou, takže nič neblikne v predvolených farbách.

### Živé sledovanie zápasu

Určené na zapisovanie udalostí priamo počas zápasu na štadióne (Zápasy → zápas → Živý záznam):

- Veľké tlačidlá +/- na skóre (44 px, ovládateľné prstom)
- **Priebeh zápasu**: tlačidlá Začať 1. polčas → Ukončiť polčas → Začať 2. polčas → Predĺženie → Penalty. Server si zapíše čas začiatku fázy a web z neho návštevníkom sám počíta bežiacu minútu (napr. 23', 45+2'). Spustenie fázy prepne zápas na „prebieha".
- **Dĺžka polčasu** (predvolene 45 minút) - pre mládež napr. 35 alebo 40
- **Odkaz na živý prenos** (musí začínať `https://`). YouTube a Facebook sa prehrajú priamo na stránke zápasu, ostatné siete (Twitch, vlastný server...) sa otvoria odkazom. Pred zápasom web ukáže „Prenos začne so začiatkom zápasu".
- Pole minúty sa predvyplní podľa bežiacej fázy (inak odhadom podľa času výkopu)
- Administrácia sa obnovuje každých 10 sekúnd, web návštevníkom každých 20 sekúnd; **obnovovanie sa zastaví, keď je karta v pozadí** (šetrí batériu telefónu)
- „Ukončiť zápas" spustí prepočet ligovej tabuľky na serveri a fázu vymaže

Na webe sa živý pás (Live, minúta, fáza, tlačidlo „Sledovať naživo") zobrazí na stránke zápasu vo všetkých šablónach; šablóna ho vloží komponentom `<ZivyPrenos zapas={z} />` z jadra.

### Registrácia fanúšikov a členov

Fanúšikovia → **Nastavenia registrácie**:

- **Povolené typy** - fanúšik, člen klubu (napr. vypnúť členstvo, ak klub prijíma len fanúšikov)
- **Polia formulára** - telefón, dátum narodenia, adresa a správa pre klub: vypnuté / voliteľné / povinné, prípadne len pri žiadosti o členstvo. Meno, e-mail a **heslo do účtu Môj klub sú vždy povinné**.
- **Texty stránky** - nadpis, úvod, názvy a popisy typov, text tlačidiel, poďakovanie po odoslaní a výhody v bočnom paneli. Prázdne pole ponechá text šablóny.

### Objednávky v obchode

- Objednávka s platbou **prevodom, dobierkou alebo v hotovosti** sa po odoslaní rovno **potvrdí** (objaví sa v „Na vybavenie"). Stav „nová" zostáva len pri platbe kartou cez platobnú bránu, kým platba neprejde.
- Pri dobierke a hotovosti stránka objednávky ukazuje platbu „Dobierka" / „Pri prevzatí" namiesto uhradená/neuhradená, bez údajov na prevod.
- Priebeh na stránke objednávky má tretí krok podľa skutočného stavu - „Pripravená" (objednávka čaká na vyzdvihnutie), inak „Odoslaná". Pod platbou je karta s aktuálnym stavom (odoslaná, pripravená na vyzdvihnutie, vybavená).

### Tmavý režim

Prepína sa v hornej lište. Voľba sa uloží; ak si používateľ nič nezvolil, prevezme sa nastavenie operačného systému.

### Šablóny webu

Vzhľad verejného webu určuje **šablóna** (ako téma vo WordPresse). V `/admin/sablony` správca vyberie aktívnu šablónu, pozrie si náhľad inej (vidí ho len on), upraví jej nastavenia (farba, fotka na úvode...) a nahrá novú šablónu ako balík `.zip`.

Šablóny sú v samostatnom priečinku `sablony/` (dodané so systémom: **Základná** a ďalšie - Klubová, Moderná, Aréna, Pulz...), nahraté šablóny v `backend/sablony/`. Ako šablónu vytvoriť, zostaviť a zabaliť, popisuje `sablony/README.md`.

**Základná** je vždy povolená (aj bez licencie) a ostatné šablóny z nej preberajú stránky, ktoré samy nemajú. Má vlastnú identitu vo farbách klubu: horná lišta s kontaktom a sieťami, hlavička s hľadaním, košíkom a Môj klub, úvod s erbom a najbližším alebo práve hraným zápasom (odpočet, živé skóre), aktuality, program a výsledky, anketa, produkty z obchodu a výzva na registráciu. V nastaveniach šablóny sa dá vypnúť horná lišta, pridať tlačidlo do hlavičky (napr. Vstupenky), fotka do úvodného pásu a vlastné sekcie na troch miestach úvodu. Všetky podstránky (novinky, článok, súpiska, profil hráča a člena realizačného tímu, súťaže, kalendár, galérie, videá, turnaje, dokumenty, partneri, štatistiky, obchod, registrácia, Môj klub, hľadanie, 404) a všetky bloky stránok majú hlavičku vo farbe klubu a rovnaké karty, tabuľky a filtre; na mobile sa správajú ako obrazovky aplikácie. Vzhľad podstránok je v `sablony/zakladna/src/stranky.css` (triedy `zs-`), takže ho majú aj šablóny, ktoré si niektorú stránku od Základnej požičajú.

### Štruktúra kódu

```
sablony/
  zakladna/     celý verejný web - stránky, rozloženie, úvod
  stadion/      druhá šablóna (styl.css + sablona.js zo src/)
  README.md     ako vytvoriť šablónu
frontend/src/
  web/          jadro webu: adresy → časti šablóny, načítanie šablóny, @clubw/jadro
  components/   súčasti webu (formuláre, ankety, komentáre, SEO a cookies)
  design/       tokens.css, global.css      dizajnové tokeny a globálne štýly
  ui/           komponenty rozhrania        Button, Field, Card, Modal, Toast, DataTable
  layout/       AppShell, Sidebar, Topbar   rámec administrácie
  app/          App, AuthContext, apiKlient routovanie, prihlásenie, volania API
  api/          typované volania backendu
  pages/admin/  obrazovky administrácie
```

---

## 6. Licenčný server (voliteľné)

Potrebujete ho len vtedy, ak systém prevádzkujete pre viacero klubov. Pre jeden klub stačí `LICENSE_CHECK_DISABLED=true` v backende.

Licenčný server má vlastnú webovú administráciu. V nej vytvárate licenčné kľúče, sledujete inštalácie, určujete aktuálnu verziu CMS z GitHubu a spúšťate aktualizácie webov klubov. **Nasadenie na VPS s doménou a HTTPS je v [deploy/licencny-server/NASADENIE.md](deploy/licencny-server/NASADENIE.md).** Nasledujúce kroky sú pre lokálny vývoj.

### 6.1 Vygenerovanie podpisových kľúčov

```bash
cd license-server
npm run generuj-kluce
```

Skript vypíše dvojicu kľúčov. **Súkromný** patrí do `license-server/.env`, **verejný** do `backend/.env` každého klienta.

### 6.2 Súbor `license-server/.env`

Skopírujte `license-server/.env.example` a doplňte databázu a kľúče z kroku 6.1:

```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5435
DB_NAME=clubw_licenses_dev
DB_USER=client_dev
DB_PASSWORD=client_dev_password
LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

### 6.3 Spustenie a prvý administrátor

```bash
cd license-server
npm run db:migrate
npm run build && npm run build:admin
npm run vytvor-admina -- --email vas@email.sk --meno "Vaše meno"
npm start                      # administrácia na http://localhost:3001
```

Pri vývoji administrácie spustite `npm run dev` (server) a `npm run dev --workspace=@clubw/license-admin` (administrácia na http://localhost:5299 so živým obnovovaním). Testy: `npm test` (potrebujú databázu `clubw_licenses_test`).

Bez HTTPS nastavte v `.env` aj `COOKIE_SECURE=false`, inak sa v produkčnom režime neprihlásite.

### 6.4 Licencia pre klub

V administrácii **Licencie → Nová licencia**. V detaile licencie je karta **Nastavenie pre klienta** s riadkami pre `backend/.env` klienta:

```env
LICENSE_KEY=CLUBW-XXXX-XXXX-XXXX-XXXX
LICENSE_SERVER_URL=http://localhost:3001
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
# a odstráňte LICENSE_CHECK_DISABLED
```

#### Šablóny podľa licencie

Ktoré šablóny klub smie používať, určujú **funkcie** plánu (Produkt → Plány → Funkcie) alebo priamo licencie, oddelené čiarkou:

| Funkcia | Čo povolí |
| --- | --- |
| `sablony:vsetky` | všetky šablóny dodané so systémom |
| `sablona:pulz`, `sablona:arena`, … | jednu šablónu (slug z priečinka `sablony/`) |

- Bez týchto funkcií má klub zo šablón dodaných so systémom len **Základnú**. Vlastné šablóny, ktoré si klub sám nahrá, licencia neobmedzuje.
- Administrácia klubu ukazuje len povolené šablóny. Aktiváciu, náhľad aj úpravu nastavení nepovolenej šablóny server odmietne.
- Keď licencia aktívnu šablónu prestane povoľovať, web použije Základnú. Nastavenia pôvodnej šablóny ostanú uložené a po obnovení licencie sa web vráti k nej.
- Pri `LICENSE_CHECK_DISABLED=true` sú povolené všetky šablóny.
- Zoznam všetkých funkcií je v administrácii licenčného servera dole na stránke produktu (karta **Funkcie licencie**).

### 6.5 Aktualizácie z licenčného servera

Web klubu pri overení licencie pošle svoju verziu (z `package.json` v koreni projektu). Licenčný server mu ponúkne aktuálnu verziu produktu alebo pošle príkaz na aktualizáciu. Inštaláciu vykoná skript `scripts/aktualizuj.mjs`:

1. stiahne balík verzie a overí kontrolný súčet z podpísanej odpovede;
2. zálohuje súbory aj databázu do `zalohy/`;
3. nahrá novú verziu, spustí `npm ci`, build a migrácie;
4. reštartuje backend.

Pri chybe vráti pôvodnú verziu. Zapína sa v `backend/.env`:

```env
AKTUALIZACIE_POVOLENE=true
AKTUALIZACIA_RESTART=pm2 restart clubw-backend    # alebo "ukoncit" pri pm2/systemd, prázdne = ručne
```

Stav a tlačidlo aktualizácie sú v administrácii CMS: **Licencia → Aktualizácie**. Súbory `.env`, `backend/uploads` a `backend/sablony` sa pri aktualizácii nikdy neprepisujú. Podrobnosti sú v [NASADENIE.md](deploy/licencny-server/NASADENIE.md#10-aktualizácie-webov-klubov).

**Ako sa licencia správa:**
- Overuje sa raz za 24 hodín, výsledok sa drží v pamäti aj na disku
- Ak je licenčný server nedostupný, platí **ochranná lehota 7 dní** — výpadok nesmie položiť klub
- Pri neplatnej licencii sa blokujú **len zápisy**; verejný web aj prihlásenie fungujú ďalej, aby správca videl upozornenie

---

## 7. Nastavenie klubu (prebrandovanie)

Farby a identita sú v databáze, nie v kóde. Zmeníte ich cez API alebo priamo v administrácii:

```bash
curl -X PUT http://localhost:3000/api/admin/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VAS_TOKEN" \
  -d '{
    "nazov": "FC Slovan Dolina",
    "skratka": "SD",
    "slogan": "Srdcom pre futbal",
    "rok_zalozenia": 1932,
    "farba_primarna": "#1B5E20",
    "farba_akcent": "#FFC107",
    "email": "info@slovandolina.sk",
    "facebook_url": "https://facebook.com/slovandolina"
  }'
```

Zmena troch farieb prefarbí celý web — ostatné odtiene sa dopočítajú cez CSS `color-mix`.

---

## 8. Testy

```bash
# Jednotkové a integračné testy
cd backend
npm test                  # všetko
npm run test:unit         # len jednotkové (nepotrebujú databázu)
npm run test:coverage     # s prehľadom pokrytia

# End-to-end testy proti bežiacemu API
bash tests-e2e/run-api-tests.sh tests-e2e/02-autentifikacia.sh
```

Pri každom commite na GitHub sa automaticky spustí kontrola typov, migrácie (vrátane rollbacku) a testy — viď `.github/workflows/ci.yml`.

---

## 9. Nasadenie do produkcie

### 9.1 Povinné premenné

V produkcii aplikácia **odmietne naštartovať** bez týchto hodnôt — je to zámerná poistka proti behu na vývojových heslách:

```env
NODE_ENV=production
DB_HOST=...
DB_PORT=...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=...
CORS_ORIGIN=https://vasklub.sk
FRONTEND_URL=https://vasklub.sk
# ak backend beží za nginx (odporúčané):
TRUST_PROXY=1
```

`TRUST_PROXY` povie serveru, že skutočnú adresu návštevníka posiela proxy. Bez neho by limity podľa IP adresy (pokusy o prihlásenie, hlasovanie v anketách, odosielanie formulárov) platili pre všetkých návštevníkov spolu.

### 9.2 Odosielanie e-mailov

SMTP server sa nastavuje v administrácii v **E-maily → Nastavenia** (vrátane skúšobného e-mailu). Celý postup od vytvorenia schránky na hostingu cez výber e-mailovej služby a DNS záznamy (SPF, DKIM, DMARC) až po šablóny a hromadné e-maily je v samostatnom návode **[NAVOD-EMAILY.md](NAVOD-EMAILY.md)**.

Na serveri nezabudnite nastaviť adresu webu - z nej sa skladajú odkazy v e-mailoch:

```env
WEB_URL=https://www.vasklub.sk
```

Staršie premenné `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` a `SMTP_FROM` fungujú ďalej - použijú sa, kým je server v administrácii prázdny.

### 9.3 Postup

```bash
# 1. Build
npm run build --workspace=backend
npm run build --workspace=frontend

# 2. Migrácie (sync() je v produkcii zakázaný)
cd backend && NODE_ENV=production npm run db:migrate

# 3. Spustenie
cd backend && NODE_ENV=production npm start
```

Obsah `frontend/build/` nahrajte na webserver alebo ho servujte cez nginx.

Na backend musia smerovať adresy `/api`, `/uploads` **a `/sablony`** (súbory šablón webu). Príklad pre nginx:

```nginx
location ~ ^/(api|uploads|sablony)/ { proxy_pass http://127.0.0.1:3000; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
location / { root /cesta/k/frontend/build; try_files $uri /index.html; }
```

Vydanie novej verzie a aktualizáciu webov klubov cez licenčný server popisuje [deploy/VYDANIE.md](deploy/VYDANIE.md).

### 9.4 Čo nezabudnúť

- **HTTPS je nutnosť** — prihlasovacie cookies sa v produkcii posielajú len cez zabezpečené spojenie
- **Zálohy databázy** — `pg_dump` v cron úlohe
- **Priečinky `backend/uploads/` a `backend/sablony/`** zálohujte tiež, sú tam fotky a nahraté šablóny
- Súbory `.env` **nikdy necommitujte** do gitu

---

## 10. Riešenie problémov

| Problém | Príčina a riešenie |
|---|---|
| `Chýba povinná premenná prostredia DB_HOST` | V produkcii chýba `.env`. Skopírujte `.env.example` a doplňte hodnoty. |
| `connect ECONNREFUSED ...:5432` | PostgreSQL nebeží alebo je iný port. Skontrolujte `DB_PORT`. |
| `relation "..." already exists` | Databáza vznikla starším spôsobom. Migrácie to zvládnu — ak nie, napíšte, ktorá zlyhala. |
| Prihlásenie vráti 401 pri správnom hesle | Zmenil sa `JWT_SECRET`, alebo je účet neaktívny (`aktivity = false`). |
| `sync() je v produkcii zakázaný` | Správne. Použite `npm run db:migrate`. |
| Web je čierno-biely | Backend nebeží — `/api/settings.css` sa nenačítalo. |
| Fotky hráčov sa nezobrazujú | Pri maloletých je to zámer — chýba súhlas zákonného zástupcu. Doplňte ho v administrácii. |
| Frontend hlási CORS chybu | `CORS_ORIGIN` v backende musí presne sedieť s adresou frontendu. |

---

## 11. Prehľad API

### Verejné (bez prihlásenia)
```
GET  /health                        stav servera
GET  /api/settings                  názov, farby, kontakty klubu
GET  /api/settings.css              farby ako CSS premenné
GET  /api/articles                  články
GET  /api/teams, /api/players       tímy a hráči (údaje detí filtrované)
GET  /api/leagues/:id/table         ligová tabuľka
GET  /api/leagues/:id/top-scorers   poradie strelcov
GET  /api/matches                   zápasy
GET  /api/matches/:id/statistics    strelci, asistencie, karty
GET  /api/seasons, /seasons/current sezóny
GET  /api/teams/:id/roster          súpiska tímu
GET  /api/players/:id/history       história hráča po sezónach
```

### Prihlásenie
```
POST /api/auth/login                prihlásenie
POST /api/auth/refresh              obnovenie relácie
POST /api/auth/logout               odhlásenie
POST /api/auth/zabudnute-heslo      vyžiadanie obnovy hesla
POST /api/auth/obnova-hesla         nastavenie nového hesla
POST /api/auth/zmena-hesla          zmena hesla (prihlásený)
POST /api/auth/odhlas-vsade         ukončenie všetkých relácií
```

### Správa (vyžaduje token)
```
POST/PUT/DELETE  /api/teams, /players, /staff, /leagues, /matches
PUT              /api/matches/:id/statistics
GET/PUT          /api/admin/settings
POST/PUT/DELETE  /api/admin/seasons
POST/DELETE      /api/admin/rosters
GET/PUT          /api/admin/players/:id/consents      súhlasy GDPR
GET              /api/admin/players/:id/export        export údajov
POST             /api/admin/players/:id/anonymize     výmaz údajov
GET              /api/admin/gdpr/audit                auditný záznam
GET              /api/admin/gdpr/retention            doba uchovávania
```

---

## 12. Čo ešte nie je hotové

Vedomé rozhodnutia, nie prehliadnutia:

- **SEO verejného webu** — verejná časť je stále SPA, takže články nemajú náhľady pri zdieľaní na Facebooku a Google ich indexuje horšie. Riešením je prepis verejnej časti na Next.js alebo Astro. Administrácia SEO nepotrebuje, tá môže zostať tak, ako je.
- **Verejný web** — návrhy FC Slovan Dolina (28 sekcií) zatiaľ nie sú implementované. Prepísaná bola administrácia.
- **Nahrávanie obrázkov z rozhrania** — backend upload rieši a je zabezpečený, ale nové obrazovky zatiaľ prijímajú len adresu obrázka. Prehliadanie a nahrávanie súborov pribudne.
- **Päť obrazoviek v pôvodnej administrácii** — kategórie, stránky, galérie, realizačný tím a ligy. V novom návrhu neboli; fungujú v pôvodnej verzii, nová na ne odkazuje.
- **Živé sledovanie cez WebSocket** — teraz sa údaje obnovujú dopytovaním každých 10 sekúnd. Funguje to spoľahlivo a nevyžaduje zásah do servera; WebSocket by ušetril dopyty pri viacerých súčasne sledovaných zápasoch.
- **Fázy 6, 8, 9, 10** z pôvodného plánu — oznamy, sponzori, formuláre.
- **Odstránenie textového poľa `sezona`** v tabuľke líg — zostalo kvôli spätnej kompatibilite, dá sa odstrániť samostatnou migráciou.

---

## 13. Zhrnutie prác

### Opravy (kroky 1–19)

**Kritické zraniteľnosti:** 18 nechránených API operácií · stored XSS · path traversal pri čítaní aj zápise · podvrhnutie typu súboru pri uploade · nefunkčný licenčný systém · produkčné heslá v kóde · chýbajúca ochrana údajov detí.

**Chyby odhalené runtime testovaním:** duplicitný názov indexu (server nenaštartoval na čerstvej inštalácii) · `updateMatch` mazal polia, ktoré klient neposlal · nemožnosť čiastočnej aktualizácie zápasu · rozbitá funkcia nad neexistujúcim stĺpcom · ochranná lehota licencie bez perzistencie · migrácie zlyhávajúce na databáze zo `sync()`.

**Nové funkcie:** obnovovacie tokeny a reset hesla · nastavenia klubu (white-label) · sezóny a súpisky · GDPR modul · štatistiky zápasov · migrácie namiesto `sync()` · testy a CI.

### Prerábka administrácie (fázy 1–6)

Dizajnové tokeny, UI kit s 9 komponentmi a 36 ikonami, univerzálna dátová tabuľka a 14 obrazoviek podľa návrhu z Claude Design. Približne 12 200 riadkov v 67 súboroch.

### Stav

| | |
|---|---|
| Testy | 253 (36 automatizovaných + 217 e2e) |
| Migrácie | 6 + 1 licenčná |
| Kompilácia | 0 chýb vo všetkých troch častiach |
