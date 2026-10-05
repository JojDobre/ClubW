# E-maily v ClubW: ako ich spojazdniť

Tento návod prevedie celým nastavením: od vytvorenia e-mailovej schránky
na hostingu alebo výberu e-mailovej služby cez DNS záznamy, aby e-maily
nekončili v spame, až po nastavenie v administrácii. Na konci je časť
o vlastnom SMTP serveri.

> **Skrátená verzia pre netrpezlivých:** vytvorte si u hostingu schránku
> `noreply@vasklub.sk`, v administrácii otvorte **E-maily → Nastavenia**,
> kliknite na svojho poskytovateľa v „Rýchlom vyplnení", doplňte meno
> a heslo schránky a stlačte **Poslať skúšobný e-mail**. Keď príde,
> uložte. Potom si skontrolujte DNS záznamy (kapitola 6).

> **`vasklub.sk` v príkladoch je len ukážka** - dosaďte svoju doménu,
> nech sa volá akokoľvek (nemusí obsahovať názov klubu). Dôležité je
> jediné: **e-mail odosielateľa musí patriť k schránke, do ktorej sa
> prihlasujete** (pri službách ako Brevo k doméne, ktorú ste v službe
> overili). Ak pole *E-mail odosielateľa* necháte prázdne, použije sa
> prihlasovacia schránka - to funguje vždy.

---

## 1. Čo web posiela

| E-mail | Komu | Kedy |
|---|---|---|
| Obnova hesla do administrácie | redaktor, správca | zabudnuté heslo |
| Nová odpoveď na formulár | klub | niekto vyplní formulár na webe |
| Potvrdenie objednávky | zákazník | objednávka vo fanshope |
| Nová objednávka | klub | objednávka vo fanshope |
| Zmena stavu objednávky | zákazník | v objednávke zvolíte „upozorniť zákazníka" |
| Nová registrácia fanúšika | klub | žiadosť o členstvo z webu |
| Schválenie registrácie | fanúšik | schválite žiadosť |
| Pozvánka do Môj klub | fanúšik | pozvete fanúšika bez účtu |
| Nové heslo fanúšika | fanúšik | fanúšik zabudne heslo |
| Zrušený účet fanúšika | klub | fanúšik si zruší účet |
| **Hromadné e-maily** | fanúšikovia a členovia so súhlasom | pošlete ich vy |

Text každého automatického e-mailu môžete zmeniť v **E-maily → Šablóny**
(kapitola 8).

---

## 2. Ako to funguje

```
web (objednávka, heslo…)  ─┐
hromadný e-mail           ─┼─►  fronta e-mailov  ─►  SMTP server  ─►  schránka príjemcu
skúšobný e-mail           ─┘    (databáza)           (hosting/služba)
```

- **SMTP server** je „pošta", cez ktorú e-maily odchádzajú. ClubW ho sám
  nemá - používa schránku u vášho hostingu alebo e-mailovú službu.
- **Fronta:** každý e-mail sa najprv zapíše do databázy. Bežné e-maily
  odídu hneď. Keď SMTP server práve nefunguje, e-mail sa nestratí -
  systém ho skúsi poslať znova po 1, 5, 15 a 60 minútach.
- **Záznam:** všetky e-maily (odoslané, čakajúce, chyby) vidíte
  v **E-maily → Odoslané**. Záznamy sa po 180 dňoch mažú.
- **Hromadné e-maily** odchádzajú postupne podľa limitu za minútu, aby vás
  poskytovateľ nezablokoval.
- **Vzhľad:** každý e-mail dostane logo, farbu klubu, pätičku a textovú
  verziu pre jednoduché e-mailové programy.

---

## 3. Akým spôsobom posielať

| | Schránka u hostingu | E-mailová služba (Brevo, Mailgun…) | Gmail / Microsoft 365 | Vlastný server |
|---|---|---|---|---|
| Cena | väčšinou v cene hostingu | zadarmo do limitu, potom platené | v cene účtu | VPS + veľa práce |
| Nastavenie | 10 minút | 30 minút (overenie domény) | 15 minút | dni |
| Bežné e-maily | ✅ výborné | ✅ výborné | ✅ áno | ⚠️ podľa reputácie |
| Hromadné e-maily | ⚠️ do pár stoviek | ✅ tisíce | ❌ prísne limity | ⚠️ riziko spamu |
| Doručiteľnosť | dobrá s DNS záznamami | najlepšia | dobrá | najťažšia |

**Odporúčanie:**

1. **Začnite schránkou u hostingu** - máte ju k doméne zadarmo a na
   potvrdenia objednávok, heslá a menší klub úplne stačí.
2. **Keď pošlete hromadný e-mail viac ako pár stovkám ľudí** alebo e-maily
   padajú do spamu, prejdite na **e-mailovú službu**. Pre slovenský klub
   je praktické **Brevo** (európska firma, slovenské/české rozhranie,
   bezplatný program).
3. Gmail ani osobnú schránku nepoužívajte - majú denné limity a pri
   hromadných e-mailoch ich Google rýchlo zablokuje.

### Porovnanie e-mailových služieb

Ceny a limity sa menia - **pred výberom si overte aktuálny cenník**.
Tabuľka je orientačná.

| Služba | Bezplatne | Poznámka |
|---|---|---|
| **Brevo** | približne 300 e-mailov denne | EÚ, jednoduché rozhranie, vhodné aj na hromadné e-maily |
| **Mailgun** | obmedzený skúšobný program | dátové centrum v EÚ (`smtp.eu.mailgun.org`) |
| **Amazon SES** | nie (platí sa za odoslané e-maily, veľmi lacno) | najlacnejšie pri veľkých objemoch, zložitejšie nastavenie |
| **Postmark** | malý skúšobný objem | výborná doručiteľnosť bežných e-mailov |
| **Resend** | malý mesačný objem | moderné, jednoduché |

---

## 4. Možnosť A: schránka u hostingu

### 4.1 Vytvorte schránku

V administrácii hostingu (Websupport, WebHouse, Active24, Forpsi…) nájdite
**E-maily / Poštové schránky → Vytvoriť schránku**:

- adresa: `noreply@vasklub.sk` (alebo `web@`, `info@`),
- **silné heslo** - schránku používa len web, nikto sa do nej neprihlasuje
  ručne; heslo si uložte do správcu hesiel,
- veľkosť stačí najmenšia.

> Nepoužívajte osobnú schránku predsedu alebo trénera. Keď odíde z klubu,
> e-maily z webu prestanú chodiť.

### 4.2 Zistite údaje SMTP

U hostingu hľadajte „nastavenie poštového klienta", „SMTP" alebo
„Outlook/Thunderbird". Potrebujete:

| Údaj | Príklad (Websupport) |
|---|---|
| Server | `smtp.websupport.sk` |
| Port a zabezpečenie | `465` + SSL, alebo `587` + STARTTLS |
| Používateľské meno | celá adresa `noreply@vasklub.sk` |
| Heslo | heslo schránky |

Pre Websupport, Seznam, Gmail a ďalších je v administrácii ClubW tlačidlo
v **Rýchlom vyplnení** - doplní server a port.

### 4.3 Pokračujte kapitolou 6 (DNS) a 7 (nastavenie v ClubW)

---

## 5. Možnosť B: e-mailová služba (príklad Brevo)

Postup u iných služieb je podobný: registrácia → overenie domény (DNS) →
SMTP údaje.

1. Zaregistrujte sa na [brevo.com](https://www.brevo.com) (účet na klub,
   nie na osobu).
2. **Overte doménu:** v nastaveniach hľadajte *Senders, Domains & Dedicated
   IPs → Domains → Add a domain*. Brevo vám ukáže DNS záznamy (overovací
   kód, DKIM, odporúčaný DMARC) - pridajte ich u správcu domény
   (kapitola 6) a vráťte sa kliknúť na overenie. Prejavenie DNS môže trvať
   od pár minút do niekoľkých hodín.
3. **Pridajte odosielateľa:** *Senders → Add a sender*, napr.
   `noreply@vasklub.sk`, meno „FK Dolina".
4. **SMTP údaje:** *SMTP & API → SMTP* - server `smtp-relay.brevo.com`,
   port `587`, prihlasovacie meno (login) a tlačidlom *Generate a new SMTP
   key* vytvorte kľúč. **Kľúč je heslo**, ktoré zadáte do ClubW.
5. V ClubW: **E-maily → Nastavenia → Rýchle vyplnenie → Brevo**, doplňte
   login a SMTP kľúč, e-mail odosielateľa `noreply@vasklub.sk`.

> Názvy položiek v menu služieb sa občas menia - keď niečo nenájdete,
> hľadajte v ich pomocníkovi „SMTP".

---

## 6. DNS záznamy: aby e-maily nekončili v spame

Gmail, Seznam a ďalší kontrolujú, či e-mail naozaj prišiel od vašej
domény. Bez týchto záznamov skončí veľa e-mailov v nevyžiadanej pošte
a **hromadné e-maily do Gmailu od roku 2024 bez nich vôbec neprejdú**.

Záznamy pridáte u správcu domény (často ten istý ako hosting) v časti
**DNS záznamy / DNS zóna**.

### SPF - kto smie posielať za vašu doménu

Záznam typu **TXT** na samotnej doméne (`@`):

```
v=spf1 include:<záznam vášho hostingu> include:<záznam služby> ~all
```

- presný text `include:` vám dá hosting/služba (Brevo napr. `include:spf.brevo.com`),
- **na doméne smie byť iba jeden SPF záznam** - ak už existuje, iba doň
  pridajte ďalší `include:`,
- hostingy záznam často nastavujú samy - najprv sa pozrite, či už existuje.

### DKIM - digitálny podpis e-mailov

Záznam (TXT alebo CNAME) s názvom napr. `mail._domainkey` alebo
`brevo1._domainkey`. Hodnotu vám vygeneruje hosting alebo služba -
**skopírujte ju presne**. U hostingu ho často zapnete jedným tlačidlom
„DKIM" pri schránkach.

### DMARC - čo robiť s podvrhnutými e-mailmi

Záznam typu **TXT** s názvom `_dmarc`:

```
v=DMARC1; p=none; rua=mailto:dmarc@vasklub.sk
```

Začnite s `p=none` (len sledovanie). Keď všetko funguje niekoľko týždňov,
môžete prejsť na `p=quarantine`.

### Ako to skontrolovať

1. Na [mail-tester.com](https://www.mail-tester.com) skopírujte ponúknutú
   adresu.
2. V ClubW **E-maily → Nastavenia → Skúšobný e-mail** ju zadajte a pošlite.
3. Na mail-tester.com uvidíte hodnotenie a čo opraviť. Cieľ je 9/10 a viac.

---

## 7. Nastavenie v ClubW

### 7.1 V administrácii (odporúčané)

**E-maily → Nastavenia** (vidí len správca):

| Pole | Čo zadať |
|---|---|
| Server, port, zabezpečenie | údaje SMTP (tlačidlá Rýchleho vyplnenia) |
| Používateľské meno, heslo | schránka alebo login/kľúč služby; heslo sa ukladá zašifrované |
| Meno odosielateľa | napr. „FK Dolina" (prázdne = názov klubu) |
| E-mail odosielateľa | **prázdne = prihlasovacia schránka** (odporúčané pri hostingu a Gmaile). Iná adresa funguje len ak je to alias tej istej schránky alebo adresa na doméne overenej v službe (Brevo, Mailgun…) |
| Odpovede posielať na | kam pôjdu odpovede ľudí, napr. `info@vasklub.sk` |
| Pätička | text pod každým e-mailom (môže obsahovať `{{klub}}`, `{{web}}`) |
| Koľko za minútu | limit hromadných e-mailov (hosting 20-50, služby viac) |

Potom **Poslať skúšobný e-mail**. Skúška používa údaje z formulára aj
pred uložením - meňte, skúšajte, a keď e-mail príde, **Uložte**.

Hore na stránke uvidíte stav: či e-maily odchádzajú, koľko ich odišlo za
24 hodín, koľko čaká a koľko skončilo chybou.

### 7.2 Premenné na serveri (`backend/.env`)

> Túto časť nastavuje ten, kto web prevádzkuje (dodávateľ alebo správca
> servera). Klub si vystačí s administráciou (kapitola 7.1) - ak by odkazy
> v e-mailoch viedli na `localhost`, dajte vedieť dodávateľovi, aby
> nastavil `WEB_URL`.

| Premenná | Načo |
|---|---|
| `WEB_URL` | **adresa webu**, napr. `https://www.vasklub.sk` - z nej sa skladajú odkazy v e-mailoch (heslo, objednávka, logo). Bez nej budú odkazy viesť na `localhost`. |
| `EMAIL_SIFROVACI_KLUC` | voliteľné; kľúč na zašifrovanie hesla SMTP v databáze. Bez neho sa použije `JWT_SECRET`. Po zmene treba heslo SMTP zadať znova. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | starší spôsob nastavenia SMTP - použije sa, len keď je server v administrácii prázdny |

Fronta e-mailov beží v procese backendu - netreba nič ďalšie spúšťať.

---

## 8. Šablóny: čo bude v e-mailoch napísané

**E-maily → Šablóny** - zoznam všetkých automatických e-mailov. Pri každom
môžete:

- zmeniť **predmet** a **text**,
- **vypnúť** ho (okrem odkazov na heslo a potvrdenia objednávky - bez nich
  by sa ľudia nedostali k účtu či objednávke),
- poslať si **skúšku** na vlastný e-mail,
- **obnoviť predvolený text**.

Vpravo je živý náhľad s vymyslenými údajmi.

### Značky

Kliknutím na značku pod editorom sa vloží na miesto kurzora. Pri odoslaní
sa nahradí skutočnou hodnotou:

| Značka | Príklad |
|---|---|
| `{{klub}}`, `{{web}}`, `{{klub_email}}`, `{{klub_telefon}}`, `{{rok}}` | vo všetkých e-mailoch |
| `{{meno}}`, `{{odkaz}}`, `{{cislo}}`, `{{suhrn}}`… | podľa e-mailu - vždy ich vidíte pod editorom |

**Riadok, v ktorom sú všetky značky prázdne, sa vynechá.** Napr. riadok
`Poznámka: {{poznamka}}` sa neukáže, keď zákazník poznámku nenapísal.

### Zápis textu

| Napíšete | Uvidíte |
|---|---|
| prázdny riadok | nový odsek |
| `**dôležité**` | **dôležité** |
| `[Kúpiť vstupenky](https://www.vasklub.sk/obchod)` | odkaz; sám na riadku = tlačidlo vo farbe klubu |
| `![Plagát](https://www.vasklub.sk/uploads/plagat.jpg)` | obrázok (adresu skopírujete v Knižnici médií) |
| `- položka` | odrážka |

Logo, farby klubu, pätičku a kontakty pridá systém sám.

---

## 9. Hromadné e-maily

**E-maily → Hromadné e-maily → Nový e-mail.**

1. **Komu:** typ členstva (nič nezaškrtnuté = všetci) a voliteľne len
   s platným členstvom. Počet adresátov sa ukazuje hneď.
2. **Text:** predmet a text so značkami `{{meno}}`, `{{priezvisko}}`,
   `{{cislo_karty}}`, `{{typ_clenstva}}`, `{{clenstvo_do}}`.
3. **Poslať skúšku** sebe - skontrolujte vzhľad v mobile aj počítači.
4. **Odoslať.** E-maily odchádzajú postupne, priebeh vidíte na stránke.
   Odosielanie sa dá zastaviť; odoslaný e-mail sa už nedá upraviť, ale dá
   sa z neho vytvoriť kópia.

**Kto dostane hromadný e-mail:** len aktívni fanúšikovia a členovia, ktorí
pri registrácii alebo v Môj klub **súhlasili so zasielaním oznamov**.
Každý e-mail obsahuje odkaz na odhlásenie a hlavičku pre tlačidlo
„Odhlásiť" v Gmaile - po odhlásení sa súhlas zruší automaticky. Toto
vyžaduje GDPR aj pravidlá Gmailu a Yahoo.

---

## 10. Riešenie problémov

| Hláška / príznak | Príčina | Riešenie |
|---|---|---|
| *Prihlásenie na SMTP server zlyhalo* | zlé meno alebo heslo | meno je zvyčajne celá adresa; pri Gmaile treba heslo aplikácie, pri Brevo SMTP kľúč |
| *Nesprávne zabezpečenie spojenia* | port a zabezpečenie nesedia | 465 → SSL, 587 → STARTTLS |
| *Nepodarilo sa spojiť so serverom* | zlá adresa servera alebo blokovaný port | skontrolujte server; niektorí poskytovatelia VPS blokujú odchádzajúce SMTP - skúste 587 aj 465, prípadne požiadajte o odblokovanie |
| *Server odmietol odosielateľa* | e-mail odosielateľa nepatrí k schránke, do ktorej sa prihlasujete (napr. prihlásenie `jozko@gmail.com`, odosielateľ `info@mojklub.sk`) | pole *E-mail odosielateľa* nechajte prázdne alebo vpíšte presne prihlasovaciu adresu; pri Brevo/Mailgun overte doménu odosielateľa v službe. Hláška obsahuje aj doslovnú odpoveď servera - pošlite ju podpore hostingu, ak si neviete rady |
| *Server odmietol adresu príjemcu* | adresa príjemcu neexistuje alebo ju server nepozná | skontrolujte adresu, na ktorú e-mail ide |
| *Server odmietol e-mail* | server e-mail vyhodnotil ako spam alebo prekročili ste limit | pozrite odpoveď servera v hláške; skontrolujte SPF/DKIM (kapitola 6) a limit za minútu |
| E-maily chodia do spamu | chýba SPF/DKIM/DMARC | kapitola 6, test na mail-tester.com |
| Odkazy v e-mailoch vedú na `localhost` | na serveri chýba `WEB_URL` | požiadajte dodávateľa webu, aby nastavil `WEB_URL` v `backend/.env` |
| Logo sa v e-maile neukazuje | logo nie je dostupné z internetu | skontrolujte `WEB_URL` a logo v Nastaveniach klubu |
| E-maily „čakajú" | SMTP nefunguje alebo nie je nastavené | **E-maily → Odoslané** ukáže dôvod; po oprave **Poslať čakajúce teraz** |
| „Len v konzole" | vývojová inštalácia bez SMTP | v produkcii nastavte SMTP |

---

## 11. A čo vlastný SMTP server?

Krátka odpoveď: **dá sa, ale neoplatí sa.** Ťažká nie je samotná
inštalácia, ale to, aby e-maily z vlastného servera Gmail, Seznam či
Outlook nepovažovali za spam.

### Čo ClubW už robí sám

Väčšinu toho, čo by sa od „vlastného e-mailového systému" čakalo, má
ClubW zabudované: frontu s opakovanými pokusmi, záznam odoslaných e-mailov,
šablóny, hromadné e-maily s postupným odosielaním a odhlásením. Chýba mu
len posledný krok - samotné doručenie do schránky príjemcu. To robí SMTP
server a práve tam je problém.

### Prečo je vlastný server náročný

| Požiadavka | Prečo je problém |
|---|---|
| **Port 25 odchádzajúci** | veľa poskytovateľov serverov ho blokuje kvôli spamu; treba žiadať o odblokovanie |
| **Čistá IP adresa** | IP adresy VPS často bývajú na čiernych listinách po predchádzajúcich zákazníkoch |
| **PTR záznam (reverse DNS)** | IP musí spätne ukazovať na vašu doménu - nastavuje ho poskytovateľ servera |
| **SPF, DKIM, DMARC** | rovnako ako pri službách, ale DKIM podpisovanie si nastavujete sami |
| **Reputácia a „zahrievanie"** | nová IP musí posielať najprv málo e-mailov a postupne pridávať; pri hromadnom e-maile hneď na začiatku skončíte v spame |
| **Bezpečnosť** | zle nastavený server sa stane „open relay" a spammeri ho zneužijú za pár hodín |
| **Údržba** | aktualizácie, sledovanie čiernych listín, zálohy, riešenie vrátených e-mailov |

Služby ako Brevo či Amazon SES toto riešia za vás a pri objemoch klubu sú
zadarmo alebo za pár eur mesačne.

### Ak ho napriek tomu chcete

Potrebujete VPS s povoleným portom 25 a možnosťou nastaviť PTR záznam.
Najjednoduchšie hotové riešenia:

- **docker-mailserver** - ľahký, len poštový server (Postfix + Dovecot +
  OpenDKIM), konfigurácia súbormi,
- **Mailcow** alebo **Mail-in-a-Box** - kompletné riešenia s webovým
  rozhraním (náročnejšie na výkon).

Postup v skratke:

1. VPS s vlastnou IP, PTR záznam `mail.vasklub.sk`, otvorené porty 25, 465, 587.
2. Inštalácia zvoleného riešenia, vytvorenie schránky `noreply@vasklub.sk`.
3. DNS: záznam A pre `mail.vasklub.sk`, MX (ak má server aj prijímať),
   SPF s IP servera, DKIM kľúč z inštalácie, DMARC.
4. Kontrola: mail-tester.com, MXToolbox (čierne listiny, „open relay").
5. V ClubW: server `mail.vasklub.sk`, port 587, STARTTLS, meno a heslo
   schránky - rovnako ako pri hostingu.
6. Prvé týždne posielajte len bežné e-maily; hromadné až keď mail-tester
   ukazuje 10/10 a e-maily chodia do doručenej pošty.

**Odporúčanie:** bežné e-maily cez schránku na hostingu, hromadné cez
Brevo. Vlastný server len vtedy, keď máte niekoho, kto sa o neho bude
dlhodobo starať.
