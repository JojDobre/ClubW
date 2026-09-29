# Licenčný server na vlastnom VPS

Tento návod spustí licenčný server ClubW s webovou administráciou na vašom VPS a doméne. V administrácii vytvárate licenčné kľúče, sledujete inštalácie, nastavujete aktuálnu verziu CMS z GitHubu a spúšťate aktualizácie webov klubov.

> **Na VPS už bežia iné weby cez nginx?** Postupujte podľa časti [Variant: VPS s nginx](#variant-vps-s-nginx) nižšie. Caddy by sa s nginx pobil o porty 80 a 443.

Beží to v troch kontajneroch:

| Kontajner | Čo robí |
|---|---|
| `db` | PostgreSQL s licenciami. Dáta sú vo volume `databaza`. |
| `licencny-server` | API pre weby klubov a webová administrácia. Migrácie sa spustia pri každom štarte. |
| `caddy` | HTTPS pre vašu doménu. Certifikát Let's Encrypt vybaví a obnovuje sám. |

---

## 1. Čo budete potrebovať

- **VPS** s Ubuntu 22.04 alebo 24.04 (Debian funguje tiež). Stačí 1 vCPU a 1 GB RAM.
- **Doménu alebo subdoménu**, napríklad `licencie.vasadomena.sk`.
- Prístup na server cez **SSH** ako root alebo používateľ so `sudo`.

## 2. DNS

U správcu domény vytvorte záznam:

```
Typ: A      Názov: licencie      Hodnota: <IP adresa VPS>
```

Ak má VPS aj IPv6, pridajte aj záznam `AAAA`. Po niekoľkých minútach overte, že doména ukazuje na server:

```bash
dig +short licencie.vasadomena.sk     # musí vypísať IP vášho VPS
```

Kým doména neukazuje na server, Caddy certifikát nezíska.

## 3. Docker a firewall

Na VPS:

```bash
curl -fsSL https://get.docker.com | sh
docker compose version        # musí vypísať verziu, napr. v2.x

# Firewall: SSH, HTTP (pre overenie certifikátu) a HTTPS
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw enable
```

Port 3001 **neotvárajte**. Licenčný server je dostupný len cez Caddy (HTTPS).

## 4. Stiahnutie kódu

```bash
git clone https://github.com/JojDobre/ClubW.git /opt/clubw
cd /opt/clubw/deploy/licencny-server
```

Pri súkromnom repozitári git vypýta meno a heslo. Ako heslo zadajte [osobný token GitHubu](https://github.com/settings/tokens?type=beta) s právom *Contents: Read-only* na tento repozitár.

## 5. Príprava nastavení

```bash
./priprav.sh licencie.vasadomena.sk vas@email.sk
```

Pri súkromnom repozitári pridajte token ako tretí parameter:

```bash
./priprav.sh licencie.vasadomena.sk vas@email.sk github_pat_...
```

Skript vytvorí súbor `.env` s doménou, náhodným heslom databázy a párom podpisových kľúčov. Vypíše aj **verejný kľúč**, ktorý neskôr patrí do nastavení každého webu klubu.

> ⚠️ **Súbor `.env` si zálohujte** mimo servera (správca hesiel, šifrovaný disk). Je v ňom súkromný kľúč, ktorým server podpisuje licencie. Ak by sa stratil, treba vygenerovať nový a vymeniť verejný kľúč vo všetkých weboch. Ak by ho niekto získal, vedel by si vystaviť platnú licenciu.

## 6. Spustenie

```bash
docker compose up -d --build
docker compose ps                     # všetky tri služby "Up", server "healthy"
docker compose logs -f licencny-server
```

Prvé zostavenie trvá 2 až 4 minúty. Potom otvorte `https://licencie.vasadomena.sk`. Mala by sa zobraziť prihlasovacia stránka.

## 7. Prvý administrátor

```bash
docker compose exec licencny-server npm run vytvor-admina -- --email vas@email.sk --meno "Vaše meno"
```

Skript vypýta heslo (aspoň 12 znakov) a nezobrazuje ho pri písaní. Rovnakým príkazom sa dá zabudnuté heslo nastaviť znova (zároveň vypne dvojstupňové overenie).

Po prihlásení hneď choďte do **Môj účet** a **zapnite dvojstupňové overenie**. Ďalších administrátorov pridáte v časti **Administrátori**.

---

## Variant: VPS s nginx

Ak na serveri už beží nginx (`sudo ss -tlnp | grep ':443'` ukáže `nginx`), Caddy sa nespúšťa. Licenčný server počúva len na `127.0.0.1:3101` a HTTPS mu robí váš nginx s certifikátom z certbotu. Ostatné weby ostanú nedotknuté.

Kroky 1 až 4 sú rovnaké, ale **nespúšťajte `ufw enable` ani nemeňte firewall**: nginx má porty 80 a 443 už otvorené. Port 3101 neotvárajte. Docker ho publikuje len na localhost, a to je zámer (porty publikované Dockerom na `0.0.0.0` by ufw obišli).

```bash
cd /opt/clubw/deploy/licencny-server
./priprav.sh licencie.vasadomena.sk vas@email.sk --nginx
docker compose up -d --build
docker compose ps                         # db a licencny-server, bez caddy
curl -s http://127.0.0.1:3101/health      # odpoveď servera
```

`--nginx` zapíše do `.env` riadok `COMPOSE_FILE=...docker-compose.nginx.yml`, takže `docker compose`, `zaloha.sh` aj `aktualizuj.sh` použijú tento variant samy.

Stránka nginx a certifikát:

```bash
DOMENA=licencie.vasadomena.sk                          # vaša subdoména
sudo apt install -y certbot python3-certbot-nginx     # ak certbot ešte nemáte
sudo cp nginx-licencie.conf /etc/nginx/sites-available/licencie
sudo sed -i "s/licencie.vasadomena.sk/$DOMENA/" /etc/nginx/sites-available/licencie
sudo ln -s /etc/nginx/sites-available/licencie /etc/nginx/sites-enabled/licencie
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d "$DOMENA" --redirect
```

`nginx -t` musí vypísať `syntax is ok` a `test is successful`. Inak `reload` nespúšťajte, aby sa nezastavili ostatné weby. Certbot doplní HTTPS, presmerovanie z HTTP a automatickú obnovu certifikátu. Potom pokračujte krokom 7 (prvý administrátor).

---

## 8. Produkt a verzie CMS

Produkt **ClubW CMS** s repozitárom `JojDobre/ClubW` a plánmi *pro* (12 mesiacov) a *enterprise* (24 mesiacov) je vytvorený automaticky. Plány a ďalšie produkty upravíte v časti **Produkty a verzie**.

### Vydanie novej verzie

Weby klubov poznajú svoju verziu z `package.json` v koreni projektu. Pri každom vydaní ju preto zvýšte:

```bash
# na vašom počítači, v priečinku ClubW
npm version 1.2.0 --no-git-tag-version
git commit -am "Verzia 1.2.0"
git tag v1.2.0
git push && git push --tags
```

Na GitHube potom v **Releases → Draft a new release** vyberte tag `v1.2.0` a napíšte poznámky k vydaniu. Tie uvidia správcovia webov pred aktualizáciou.

V administrácii licenčného servera:

1. **Produkty a verzie → ClubW CMS → Načítať verzie z GitHubu**. Načítajú sa vydania aj tagy v tvare `v1.2.0`.
2. Pri verzii kliknite na **Nastaviť ako aktuálnu**. Server si stiahne balík verzie z GitHubu a vypočíta jeho kontrolný súčet. Keď je balík *Pripravený*, weby ho môžu nainštalovať.
3. Voliteľne nastavte **Minimálnu verziu**. Webom so staršou verziou sa aktualizácia zobrazí ako povinná (napríklad bezpečnostná oprava).

Aktualizátor odmietne balík, ktorého `package.json` má inú verziu ako tag. Na zvýšenie verzie pred vydaním preto nezabudnite.

## 9. Licencie

**Licencie → Nová licencia**: vyberte produkt a plán, vyplňte klienta a doménu. Doména je nepovinná: prázdna znamená, že licencia platí na ľubovoľnej doméne.

V detaile licencie je karta **Nastavenie pre klienta** s riadkami pre `backend/.env` webu klubu (kľúč, adresa servera, doména, verejný kľúč). Tlačidlom **Kopírovať .env** ich skopírujete.

V detaile licencie ďalej môžete:

- licenciu **predĺžiť**, **pozastaviť** (napr. neuhradená faktúra), **obnoviť** alebo **zrušiť**;
- **vymeniť kľúč**, ak unikol (starý kľúč prestane platiť okamžite);
- vidieť inštaláciu: verziu, adresu webu, posledný kontakt, IP adresu a históriu udalostí.

Pri pozastavenej alebo vypršanej licencii web klubu ďalej zobrazuje verejný obsah, zablokujú sa len úpravy v administrácii.

## 10. Aktualizácie webov klubov

Aktualizácia prebieha takto:

1. Web klubu overuje licenciu raz za 24 hodín, prípadne hneď po kliknutí na **Overiť teraz** v jeho administrácii. Pritom pošle svoju verziu.
2. Licenčný server v podpísanej odpovedi vráti dostupnú aktualizáciu a prípadne príkaz na aktualizáciu.
3. Web si stiahne balík (len s platným licenčným kľúčom) a overí jeho kontrolný súčet. Potom zálohuje súbory aj databázu, nahrá novú verziu, spustí `npm ci`, zostaví backend aj frontend, spustí migrácie a reštartuje sa.
4. Priebeh vidíte v časti **Aktualizácie**. Ak niečo zlyhá, web sa vráti na pôvodnú verziu a chyba sa ukáže aj so záznamom z inštalácie.

Aktualizáciu spustíte v administrácii licenčného servera:

- **pre jeden web**: detail licencie → **Aktualizovať na X**;
- **pre všetky weby naraz**: Produkty a verzie → produkt → **Aktualizovať inštalácie** (predvolene len weby, ktoré sa ozvali za posledných 48 hodín);
- **automaticky**: prepínač **Automatické aktualizácie** pri licencii. Nová aktuálna verzia sa nainštaluje sama pri najbližšom overení.

**Pripnutá verzia** pri licencii drží web na konkrétnej verzii, ktorá sa mu potom neponúka novšia. Príkaz, ktorý web ešte neprevzal, zrušíte tlačidlom **Zrušiť**.

Správca webu môže aktualizáciu spustiť aj sám v administrácii CMS: **Licencia → Aktualizácie → Aktualizovať na X**.

### Nastavenie na serveri webu klubu

Automatická inštalácia je na weboch **predvolene vypnutá**. V `backend/.env` webu ju zapnete takto:

```env
AKTUALIZACIE_POVOLENE=true
# Ako sa má backend po aktualizácii reštartovať:
AKTUALIZACIA_RESTART=pm2 restart clubw-backend
```

Hodnoty `AKTUALIZACIA_RESTART`:

| Hodnota | Čo sa stane |
|---|---|
| prázdne | Nová verzia sa nainštaluje, backend treba reštartovať ručne. |
| `ukoncit` | Backend sa ukončí a správca procesov (pm2, systemd s `Restart=always`) ho spustí s novou verziou. |
| príkaz | Ľubovoľný príkaz, napr. `pm2 restart clubw-backend` alebo `sudo systemctl restart clubw-backend`. |

Server webu musí mať `node`, `npm` a `tar`. `pg_dump` je voliteľný a slúži na zálohu databázy pred migráciami. Zálohy sú v priečinku `zalohy/` v koreni projektu, ponechávajú sa posledné tri.

Aktualizácia **nikdy neprepíše** súbory `.env`, fotky v `backend/uploads`, nahraté šablóny v `backend/sablony` ani `node_modules`.

Príklad spustenia backendu cez pm2:

```bash
npm install -g pm2
cd /var/www/clubw/backend && pm2 start npm --name clubw-backend -- start
pm2 save && pm2 startup
```

---

## 11. Zálohy

```bash
./zaloha.sh                      # záloha databázy do zalohy/licencie-DATUM.dump
crontab -e                       # každú noc o 3:15:
15 3 * * * /opt/clubw/deploy/licencny-server/zaloha.sh >/dev/null 2>&1
```

Obnova zo zálohy:

```bash
docker compose exec -T db pg_restore -U licencie -d licencie --clean < zalohy/licencie-20260927-031500.dump
```

Priečinok `zalohy/` a súbor `.env` pravidelne kopírujte aj mimo VPS. Balíky verzií zálohovať netreba, dajú sa znova stiahnuť z GitHubu.

## 12. Aktualizácia licenčného servera

```bash
cd /opt/clubw/deploy/licencny-server
./aktualizuj.sh
```

Skript zálohuje databázu, stiahne nový kód (`git pull`) a znova zostaví a spustí kontajnery. Migrácie databázy prebehnú automaticky pri štarte.

## 13. Riešenie problémov

| Problém | Riešenie |
|---|---|
| Stránka sa nenačíta, certifikát chýba | `docker compose logs caddy`. Doména musí ukazovať na VPS (`dig +short`) a porty 80 a 443 musia byť otvorené. |
| Prihlásenie „neprejde", stránka sa len obnoví | Administrácia beží len cez HTTPS (bezpečné cookie). Otvorte `https://` adresu. |
| Načítanie verzií z GitHubu zlyhá | Súkromný repozitár potrebuje `GITHUB_TOKEN` v `.env` (potom `docker compose up -d`). Bez tokenu GitHub povolí len 60 dotazov za hodinu. |
| Balík verzie má stav *Chyba* | Chyba je pri verzii. Tlačidlom **Pripraviť balík** to skúsite znova. |
| Web klubu hlási `neplatny_podpis` | Vo webe je iný `LICENSE_PUBLIC_KEY`. Skopírujte ho z detailu licencie (Kopírovať .env). |
| Web sa neozýva (offline) | Web overuje licenciu raz za 24 h. Skontrolujte `LICENSE_SERVER_URL` v jeho `backend/.env` a či sa zo servera webu dostane na `https://licencie.vasadomena.sk/health`. |
| Aktualizácia zlyhala | Záznam je v detaile príkazu (Aktualizácie) aj na serveri webu v súbore `aktualizacia.log`. Pôvodná verzia sa obnovila automaticky. |

Stav služieb a záznamy:

```bash
docker compose ps
docker compose logs --tail 100 licencny-server
curl https://licencie.vasadomena.sk/health
```
