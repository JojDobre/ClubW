# Vydanie novej verzie a nasadenie

Postup od zmergovaného kódu po aktualizované weby klubov. Prvé nasadenie licenčného servera popisuje [licencny-server/NASADENIE.md](licencny-server/NASADENIE.md). Tento návod predpokladá, že licenčný server už beží na VPS.

Poradie krokov je dôležité:

1. aktualizovať licenčný server,
2. nastaviť funkcie licencií (šablóny),
3. vydať verziu CMS (verzia, tag, GitHub Release),
4. nastaviť ju v licenčnom serveri ako aktuálnu,
5. aktualizovať jeden testovací web a skontrolovať ho,
6. aktualizovať ostatné weby.

> **Vydanie 1.6.1** (opravné, nadväzuje na 1.6.0) má vlastný skrátený postup v časti [Vydanie 1.6.1](#vydanie-161) nižšie. Ak weby ešte bežia na 1.5.x, najprv prejdite kroky pre 1.6.0 (hlavne krok 2 – funkcie licencií) a potom aktualizujte rovno na 1.6.1.

---

## 1. Aktualizácia licenčného servera

Na VPS:

```bash
ssh root@vas-vps
cd /opt/clubw/deploy/licencny-server
./aktualizuj.sh
```

Skript zálohuje databázu (`zalohy/licencie-DATUM.dump`), stiahne nový kód z `main` (`git pull --ff-only`), znova zostaví kontajnery a spustí migrácie. Funguje rovnako pre variant s Caddy aj s nginx (variant si berie z `.env`).

Kontrola:

```bash
docker compose ps                                   # licencny-server "healthy"
docker compose logs --tail 50 licencny-server       # bez chýb pri štarte a migráciách
curl -s https://licencie.vasadomena.sk/health
```

V administrácii licenčného servera otvorte **Produkty a verzie → ClubW CMS**. Úplne dole má byť karta **Funkcie licencie** so zoznamom funkcií (šablóny). Ak tam nie je, prehliadač drží starú verziu stránky. Obnovte ju cez Ctrl+F5.

> Ak `git pull --ff-only` zlyhá, na VPS niekto upravil súbory v repozitári. `git status` ukáže ktoré. Lokálne úpravy odložte (`git stash`) a skript spustite znova. `.env` a `zalohy/` git neriadi, tie sa nestratia.

## 2. Funkcie licencií – šablóny

> ⚠️ **Tento krok urobte pred aktualizáciou webov.** Od verzie 1.6.0 web klubu povolí šablóny podľa licencie. Licencia bez funkcií povolí len **Základnú**. Web, ktorý dnes používa napríklad Klubovú alebo Arénu, by sa po aktualizácii prepol na Základnú. Nastavenia jeho šablóny ostanú uložené a vrátia sa, keď licenciu doplníte.

Funkcie:

| Funkcia | Čo povolí |
|---|---|
| `sablony:vsetky` | všetky šablóny dodané so systémom, aj budúce |
| `sablona:klubova`, `sablona:arena`, `sablona:pulz`… | jednu konkrétnu šablónu |

Úplný zoznam je v karte **Funkcie licencie** na stránke produktu. Vlastné šablóny, ktoré si klub sám nahrá, licencia neobmedzuje.

**a) Plány** (pre nové licencie): Produkty a verzie → ClubW CMS → plány → pole **Funkcie**. Napríklad *pro* `sablona:klubova` a *enterprise* `sablony:vsetky`. Funkcie sa oddeľujú čiarkou. Uložiť.

**b) Existujúce licencie.** Zmena plánu sa do už vystavených licencií **neprenesie**, lebo licencia si funkcie skopírovala pri vytvorení. Preto pri každej licencii: Licencie → licencia → **Upraviť** → **Funkcie** → napr. `sablony:vsetky` → Uložiť. V detaile licencie sa funkcie zobrazia ako štítky.

Web si funkcie prevezme pri najbližšom overení licencie (raz za 24 hodín). Hneď to vynútite v administrácii webu: **Licencia → Overiť teraz**.

Weby s `LICENSE_CHECK_DISABLED=true` v `backend/.env` licenciu nekontrolujú a majú povolené všetky šablóny.

## 3. Vydanie verzie CMS

Web pozná svoju verziu z `package.json` v koreni projektu a aktualizátor odmietne balík, ktorého verzia nesedí s tagom.

Na svojom počítači:

```bash
cd ClubW
git checkout main && git pull
node -p "require('./package.json').version"     # musí vypísať novú verziu, napr. 1.6.0
git tag v1.6.0
git push origin v1.6.0
```

Ak verzia v `package.json` ešte nie je zvýšená:

```bash
npm version 1.6.0 --no-git-tag-version
git commit -am "Verzia 1.6.0"
git push
```

Na GitHube **Releases → Draft a new release** → tag `v1.6.0` → názov `1.6.0` → poznámky k vydaniu (predloha je nižšie v časti [Poznámky k vydaniu 1.6.0](#poznámky-k-vydaniu-160)) → **Publish release**. Poznámky uvidia správcovia webov pred aktualizáciou.

## 4. Nastavenie aktuálnej verzie v licenčnom serveri

V administrácii licenčného servera:

1. **Produkty a verzie → ClubW CMS → Načítať verzie z GitHubu**.
2. Pri `1.6.0` → **Nastaviť ako aktuálnu**. Počkajte, kým je balík **Pripravený**. Server si ho stiahne z GitHubu a vypočíta kontrolný súčet. Pri stave *Chyba* kliknite na **Pripraviť balík**.
3. **Minimálnu verziu** nemeňte, toto vydanie nie je bezpečnostná oprava.

## 5. Testovacia aktualizácia jedného webu

Začnite webom, ktorý nevadí, ak bude chvíľu nedostupný (testovací alebo vlastný klub).

1. Licencie → licencia → **Aktualizovať na 1.6.0**. Alebo v administrácii webu: **Licencia → Aktualizácie → Aktualizovať na 1.6.0**.
2. Priebeh sledujte v časti **Aktualizácie**. Web zálohuje súbory aj databázu, nainštaluje novú verziu, spustí `npm ci`, zostaví backend a frontend, spustí **dve nové migrácie** (nastavenia registrácie, živý prenos zápasu) a reštartuje sa. Trvá to niekoľko minút.
3. Ak niečo zlyhá, web sa vráti na pôvodnú verziu a záznam je pri príkaze aj na serveri webu v `aktualizacia.log`.

Po aktualizácii skontrolujte:

- [ ] Web beží a v administrácii (Licencia) je verzia **1.6.0**.
- [ ] **Šablóny**: aktívna je stále tá istá šablóna (nie Základná). Ak sa prepla na Základnú, chýba funkcia v licencii (krok 2). Doplňte ju a kliknite na **Overiť teraz**.
- [ ] **Stránka zápasu**: zápas v administrácii → **Živý záznam** → Začať 1. polčas a vložiť odkaz na YouTube. Na webe sa na stránke zápasu ukáže pás Live s minútou a tlačidlo **Sledovať naživo**. Potom zápas vráťte do pôvodného stavu.
- [ ] **Registrácia**: Fanúšikovia → **Nastavenia registrácie** sa otvorí. Stránka `/registracia` vyžaduje heslo.
- [ ] **Obchod** (ak ho klub má): skúšobná objednávka s platbou prevodom skončí na stránke „potvrdená“ a v administrácii je v „Na vybavenie“. Potom ju zrušte.
- [ ] Prehliadač: obnovte stránku cez Ctrl+F5, ak sa ukazuje starý vzhľad.

Ak web nemá zapnuté automatické inštalácie (`AKTUALIZACIE_POVOLENE=false`), nasaďte ho ručne. Pri webe nasadenom ako git klon:

```bash
cd /var/www/clubw                      # priečinok webu
git fetch --tags && git checkout v1.6.0
npm ci
npm run build --workspace=backend
npm run build --workspace=frontend
cd backend && NODE_ENV=production npm run db:migrate && cd ..
pm2 restart clubw-backend              # alebo váš spôsob reštartu
```

Bez gitu stiahnite z GitHubu archív vydania (Releases → 1.6.0 → Source code), rozbaľte ho cez existujúci priečinok (bez `.env`, `backend/uploads`, `backend/sablony`) a spustite rovnaké príkazy od `npm ci`. Ak nginx servuje `frontend/build` priamo, je hneď aktuálny. Nové `.env` premenné ani závislosti systému táto verzia nepotrebuje.

## 6. Aktualizácia ostatných webov

- **Všetky naraz:** Produkty a verzie → ClubW CMS → **Aktualizovať inštalácie**. Predvolene sa aktualizujú len weby, ktoré sa ozvali za posledných 48 hodín.
- **Po jednom:** detail licencie → **Aktualizovať na 1.6.0**.
- Licencie so zapnutými **Automatickými aktualizáciami** si verziu nainštalujú samy pri najbližšom overení. Licencie s **pripnutou verziou** ostanú na nej.

Priebeh je v časti **Aktualizácie**. Web, ktorý sa neozýva, overuje licenciu raz za 24 hodín. Príkaz prevezme pri najbližšom kontakte.

## 7. Čo oznámiť klubom

Zmeny, ktoré si správcovia webov všimnú:

- **Objednávky s platbou prevodom, dobierkou alebo v hotovosti sa hneď potvrdia** a sú rovno v „Na vybavenie“. Doteraz čakali v stave „nová“.
- **Registrácia vyžaduje heslo** do účtu Môj klub. Polia, povolené typy (fanúšik/člen) a texty sa nastavujú vo Fanúšikovia → Nastavenia registrácie.
- **Živý záznam zápasu**: tlačidlá polčasov, dĺžka polčasu a odkaz na prenos (YouTube, Facebook, iné). Web sám ukazuje bežiacu minútu.
- **Šablóny podľa licencie**: v zozname šablón sú len tie, ktoré licencia povoľuje.
- **Nová Základná šablóna** (pre kluby, ktoré ju používajú): nový vzhľad úvodu, zoznamu a detailu zápasu. V nastaveniach šablóny je horná lišta, tlačidlo v hlavičke a fotka úvodu.

## Ak treba vrátiť späť

- **Web klubu:** neúspešná automatická aktualizácia sa vráti sama. Pri problémoch zistených neskôr nastavte v licenčnom serveri pri licencii **Pripnutú verziu** 1.5.2. Na serveri webu obnovte zálohu z priečinka `zalohy/` alebo nasaďte ručne `git checkout v1.5.2` a príkazy z kroku 5. Migrácie 1.6.0 len pridávajú stĺpce, staršia verzia s nimi funguje.
- **Licenčný server:** na VPS `git checkout <predchádzajúci commit>` a `docker compose up -d --build`. Databázu obnovíte zo zálohy, ktorú pred aktualizáciou vytvoril `aktualizuj.sh` (príkaz je v NASADENIE.md, časť Zálohy).

---

## Vydanie 1.6.1

Opravné vydanie bez migrácií databázy a bez nových závislostí. Obsahuje:

- **Licenčný server:** funkcie s dvojbodkou (`sablona:arena`, `sablony:vsetky`) sa pri úprave licencie a plánu ukladajú. Doteraz ich server potichu zahodil a pole zostalo prázdne. Neplatná hodnota teraz vypíše chybu namiesto ticha.
- **Šablóna Základná 1.3.0:** všetky podstránky a bloky v novom vzhľade. Súpiska s kartami hráčov a súhrnom kádra, novinky s hľadaním v hlavičke, profil hráča a člena realizačného tímu, článok s fotkou presahujúcou do hlavičky, filtre ako záložky v hlavičke. Nový vzhľad majú aj šablóny, ktoré si stránky od Základnej požičiavajú (napr. Štadión).

Postup:

1. **Licenčný server** – na VPS `./aktualizuj.sh` (krok 1). Potom v licenčnom serveri otvorte licencie, ktorým ste funkcie zadali pred opravou, a skontrolujte, či ich pole **Funkcie** nie je prázdne. Ak je, zadajte ich znova (napr. `sablony:vsetky`) a uložte. V detaile licencie sa musia zobraziť ako štítky.
2. **Vydanie CMS** – v `package.json` je už verzia `1.6.1`. Tag a release:

   ```bash
   git checkout main && git pull
   node -p "require('./package.json').version"     # 1.6.1
   git tag v1.6.1
   git push origin v1.6.1
   ```

   Na GitHube **Releases → Draft a new release** → tag `v1.6.1` → názov `1.6.1` → poznámky z časti [Poznámky k vydaniu 1.6.1](#poznámky-k-vydaniu-161) → **Publish release**.
3. **Aktuálna verzia** – v licenčnom serveri **Načítať verzie z GitHubu** → pri `1.6.1` **Nastaviť ako aktuálnu** a počkať na **Pripravený** (krok 4).
4. **Testovací web** – aktualizovať jeden web (krok 5). Kontrola:
   - [ ] V administrácii (Licencia) je verzia **1.6.1** a aktívna šablóna sa nezmenila.
   - [ ] Pri webe so Základnou (alebo Štadiónom): `/teams`, `/clanky`, profil hráča, článok, `/obchod` – nový vzhľad. Ak sa ukazuje starý, obnovte stránku cez Ctrl+F5.
   - [ ] Na mobile sa záložky v hlavičke (rubriky, tímy, kategórie) dajú posúvať do strany.
5. **Ostatné weby** – hromadne alebo po jednom (krok 6).

Návrat späť: pripnúť verziu 1.6.0 pri licencii. 1.6.1 nemení databázu, takže 1.6.0 s ňou funguje bez zásahu.

---

## Poznámky k vydaniu 1.6.1

Predloha pre GitHub Release:

```markdown
## Opravy

- **Licenčný server:** funkcie licencie s dvojbodkou (`sablona:arena`, `sablony:vsetky`) sa pri úprave licencie a plánu správne uložia. Neplatná hodnota vypíše chybu.

## Šablóna Základná 1.3.0

- Všetky podstránky a bloky majú vlastný vzhľad Základnej: plochy vo farbe klubu, biele karty so žltou linkou, nadpisy so žltou čiarou a tabuľky s hlavičkou v odtieni farby klubu.
- Súpiska: karty hráčov s fotkou, číslom a štatistikami, súhrn kádra (počet hráčov, priemerný vek, realizačný tím), výber tímu záložkami a rýchly skok na pozíciu.
- Novinky: hľadanie v hlavičke, rubriky ako záložky, titulný článok a mriežka kariet.
- Profil hráča a člena realizačného tímu: fotka na karte s číslom dresu a súhrn sezóny.
- Článok a obsahové stránky: fotka presahuje do hlavičky, text je na bielom liste.
- Kategórie videí, obchodu, galérií a dokumentov a časti súťaže sú záložky v hlavičke.
- Fotogalérie a produkty v obchode sú v kartách.

## Pri aktualizácii

- Žiadne migrácie databázy ani nové nastavenia.
- Najprv aktualizujte licenčný server a skontrolujte funkcie licencií.
```

---

## Poznámky k vydaniu 1.6.0

Predloha pre GitHub Release (skopírujte a upravte):

```markdown
## Novinky

- **Živý záznam zápasu** – fázy (1. polčas, polčas, 2. polčas, predĺženie, penalty), dĺžka polčasu a odkaz na živý prenos. Web ukazuje bežiacu minútu, prehrá YouTube a Facebook priamo na stránke zápasu a počas zápasu sa sám obnovuje.
- **Nastavenia registrácie** – povolené typy (fanúšik, člen), polia formulára (vypnuté, voliteľné, povinné), vlastné texty a výhody. Heslo do účtu Môj klub je vždy povinné.
- **Obchod** – platba prevodom, dobierkou a v hotovosti objednávku rovno potvrdí. Platba „Dobierka“ / „Pri prevzatí“ a priebeh objednávky podľa skutočného stavu (pripravená / odoslaná).
- **Šablóny podľa licencie** – zoznam šablón sa riadi licenciou klubu. Bez nej je k dispozícii Základná.
- **Nová Základná šablóna** – identita vo farbách klubu, úvod s najbližším alebo živým zápasom, nový zoznam a detail zápasu.
- Aréna a Pulz: zarovnané riadky zápasov.

## Pri aktualizácii

- Spustia sa 2 migrácie databázy (prebehnú automaticky).
- Pred aktualizáciou musí mať licencia klubu funkcie šablón (`sablony:vsetky` alebo `sablona:<nazov>`). Inak sa web prepne na Základnú šablónu.
```
