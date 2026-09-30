# Šablóny webu ClubW

Šablóna určuje, ako vyzerá verejný web klubu. Funguje podobne ako téma vo WordPresse:
v administrácii (**Systém → Šablóny**) si správca vyberie aktívnu šablónu, pozrie si
náhľad inej šablóny, upraví jej nastavenia a nahrá novú šablónu ako balík `.zip`.

```
sablony/
  klubova/           predvolená šablóna - výrazný klubový vzhľad, mobil ako aplikácia
  zakladna/          pôvodný verejný web; ostatné šablóny z neho preberajú, čo nenahradia
  stadion/           tmavá športová šablóna (dodaná so systémom)
  moderna/           prémiový redakčný vzhľad, nahrádza všetky stránky (dodaná so systémom)
  README.md          tento návod
backend/sablony/     šablóny nahraté v administrácii (nie sú v gite)
```

## Ako to funguje

Web pozná **časti** - hlavičku, pätičku, úvodnú stránku, zoznam článkov, detail zápasu...
Šablóna nahradí len tie, ktoré chce zmeniť. **Čo nenahradí, zobrazí sa zo základnej
šablóny.** Šablóna tak môže byť:

- **len štýl** - `sablona.json` + `styl.css` (iné farby, písmo, rozostupy),
- **štýl a skript** - navyše `sablona.js`, ktorý nahradí vybrané časti webu vlastnými
  komponentmi Reactu.

Základná šablóna je jediná, ktorá sa zostavuje spolu s webom. Všetky ostatné sa načítajú
až v prehliadači z adresy `/sablony/<slug>/...`.

## Súbory šablóny

| Súbor | Povinný | Účel |
|---|---|---|
| `sablona.json` | áno | názov, verzia, autor, nastavenia |
| `styl.css` | nie | štýl - načíta sa pred zobrazením webu |
| `sablona.js` | nie | zostavený skript (`npm run sablony`) |
| `nahlad.svg` / `.png` / `.jpg` / `.webp` | nie | obrázok v administrácii, ideálne 600 × 400 |
| `src/` | nie | zdrojové súbory skriptu - na web sa neinštalujú |

V balíku môžu byť aj obrázky a písma (`.png .jpg .webp .gif .svg .ico .woff .woff2 .ttf .otf`),
na ktoré sa `styl.css` odkazuje relatívne (`url(fonts/nazov.woff2)`).

### sablona.json

```json
{
  "slug": "moja-sablona",
  "nazov": "Moja šablóna",
  "verzia": "1.0.0",
  "autor": "Meno autora",
  "web_autora": "https://example.sk",
  "popis": "Krátky popis do administrácie.",
  "api": 1,
  "nahlad": "nahlad.svg",
  "styl": "styl.css",
  "skript": "sablona.js",
  "nastavenia": [
    { "kluc": "akcent", "typ": "farba", "menovka": "Farba zvýraznenia", "predvolene": "#F59E0B" },
    { "kluc": "uvodna_fotka", "typ": "obrazok", "menovka": "Fotka na úvode" },
    { "kluc": "titulok", "typ": "text", "menovka": "Nadpis na úvode", "skupina": "Úvod" },
    { "kluc": "vstupenky", "typ": "odkaz", "menovka": "Odkaz na vstupenky", "skupina": "Úvod" },
    { "kluc": "styl_menu", "typ": "vyber", "menovka": "Menu",
      "moznosti": [{ "hodnota": "svetle", "popis": "Svetlé" }, { "hodnota": "tmave", "popis": "Tmavé" }],
      "predvolene": "svetle" },
    { "kluc": "pocet", "typ": "cislo", "menovka": "Počet článkov", "min": 2, "max": 9, "predvolene": 4 },
    { "kluc": "anketa", "typ": "prepinac", "menovka": "Ukázať anketu", "predvolene": true }
  ]
}
```

- `slug` - malé písmená, číslice a pomlčky; musí sa zhodovať s názvom priečinka.
  Nahratie balíka s rovnakým slugom šablónu **aktualizuje** (nastavenia ostanú).
- `verzia` - napr. `1.0.0`; pri aktualizácii ju zvýšte, prehliadače si tak stiahnu nové súbory.
- `api` - verzia rozhrania šablón (teraz `1`). Šablónu pre novšie rozhranie systém odmietne.
- Typy nastavení: `farba`, `text`, `dlhy_text`, `vyber`, `prepinac`, `cislo`, `obrazok`
  a `odkaz` (stránka webu `/...`, `https://`, `mailto:` alebo `tel:`).
  Správca ich vyplní v administrácii cez **Prispôsobiť**.
- `skupina` - nepovinný názov záložky v okne Prispôsobiť (napr. „Úvod - zápasy").
  Pri viacerých skupinách má okno záložky a vyhľadávanie; poradie skupín je podľa
  prvého výskytu v zozname. Šablóna môže mať najviac 200 nastavení.
- Dobrá šablóna nemá natvrdo zapísané texty, ktoré by klub chcel zmeniť: nadpisy
  sekcií, texty tlačidiel a zapínanie sekcií patria do nastavení (predvolená
  hodnota = pôvodný text).

### Nastavenia v štýle

Každé nastavenie je v CSS dostupné ako premenná `--sablona-<kluc>` (podčiarkovník sa
zmení na pomlčku). Farby klubu z Nastavení sú v premenných `--club-primary`,
`--club-secondary`, `--club-accent`, `--club-primary-contrast`, `--club-accent-contrast`.

```css
.moja-hlavicka { border-bottom: 4px solid var(--sablona-akcent, #f59e0b); }
.moja-uvodna   { background-image: var(--sablona-uvodna-fotka); }
```

Na `<html>` je atribút `data-sablona="<slug>"` - štýl tak môže upraviť aj stránky základnej
šablóny bez toho, aby ovplyvnil iné šablóny:

```css
[data-sablona='moja-sablona'] .zk-hlavicka { background: #111; }
```

Triedy základnej šablóny začínajú `zk-` (hlavička `zk-hlavicka`, menu `zk-menu`,
pätička `zk-paticka`, úvod `zk-uvod`...).

## Šablóna so skriptom

Zdrojové súbory patria do `src/index.tsx`. Skript zaregistruje časti, ktoré nahrádza:

```tsx
// sablony/moja-sablona/src/index.tsx
import { registrujSablonu } from '@clubw/jadro';
import Hlavicka from './Hlavicka';
import Uvod from './Uvod';

registrujSablonu({ casti: { Hlavicka, Uvod } });
```

```tsx
// sablony/moja-sablona/src/Hlavicka.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { OdkazMenu, useMenuWebu, useNastavenia } from '@clubw/jadro';

const Hlavicka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { polozky } = useMenuWebu();
  return (
    <header className="moja-hlavicka">
      <Link to="/">{nastavenia.nazov}</Link>
      <nav>{polozky.map((p) => <OdkazMenu key={p.id} polozka={p} />)}</nav>
    </header>
  );
};
export default Hlavicka;
```

Zostavenie a zabalenie (z priečinka `frontend`):

```bash
npm run sablony -- moja-sablona            # vytvorí sablony/moja-sablona/sablona.js
npm run sablony -- moja-sablona --balik    # a balík sablony/_balicky/moja-sablona-1.0.0.zip
npm run sablony                            # zostaví všetky šablóny so src/
```

Balík `.zip` potom nahrajte v administrácii tlačidlom **Pridať šablónu**.

### Časti, ktoré môže šablóna nahradiť

| Časť | Adresa |
|---|---|
| `Rozlozenie` | kostra každej stránky - dostane `children` (obsah stránky) |
| `Hlavicka`, `Paticka` | vykresľuje ich rozloženie základnej šablóny |
| `Nacitavanie` | kým sa stránka načíta |
| `Uvod` | `/` |
| `Clanky`, `Clanok` | `/clanky`, `/clanek/:slug` |
| `Stranka` | `/:slug` - stránky z administrácie |
| `Timy`, `Tim`, `Hrac`, `ClenRealizacnehoTimu` | `/teams`, `/teams/:id`, `/players/:id`, `/staff/:id` |
| `Ligy`, `Liga`, `Zapasy`, `Zapas`, `Kalendar` | `/leagues`, `/leagues/:id`, `/matches`, `/matches/:id`, `/calendar` |
| `Galerie`, `Galeria`, `Videa` | `/galleries`, `/galleries/:id`, `/videa` |
| `Turnaje`, `Dokumenty`, `Sponzori`, `Formular`, `Statistiky` | `/turnaje`, `/dokumenty`, `/sponzori`, `/formular/:kluc`, `/stats` |
| `Obchod`, `Produkt`, `Kosik`, `Pokladna`, `Objednavka` | `/obchod`, `/obchod/:slug`, `/kosik`, `/pokladna`, `/objednavka/:token` |
| `Nenajdena` | neexistujúca adresa |

Parametre z adresy čítajte cez `useParams()` z `react-router-dom`.

### Čo poskytuje `@clubw/jadro`

Obchod (E-shop v administrácii) má zobraziť každá šablóna - košík, ceny a objednávku
rieši jadro, šablóna len vzhľad. Ceny v košíku sú len na zobrazenie; server ich pri
objednávke prepočíta a overí sklad. Odkaz na košík v hlavičke ukazujte len pri
`useNastavenia().nastavenia.eshop?.zapnuty`.

| Čo | Na čo |
|---|---|
| `useNastavenia()` | názov, logo, slogan, farby, kontakt, sociálne siete, údaje klubu |
| `useNastaveniaSablony()` | hodnoty nastavení šablóny z administrácie |
| `useSablona()` | slug, názov a verzia aktívnej šablóny |
| `useMenuWebu()`, `OdkazMenu` | menu z **Menu a odkazy** – najviac 3 úrovne: hlavná položka → podmenu → odkazy v kategórii. Kategória má `odkaz: null` (`OdkazMenu` ju vykreslí ako `<span>`), položka môže mať `obrazok` pre kartu v podmenu |
| `useData('/articles?limit=3')` | načítanie dát z verejného API (`{ data, nacitava, chyba }`) |
| `apiUrl()`, `souborUrl()` | adresa API a nahratých súborov (`/uploads/...`) |
| `Cast` | vykreslí inú časť - napr. `<Cast nazov="Paticka" />` |
| `ObsahSFormularmi` | HTML obsah stránky/článku so značkami `[formular slug]` a `[anketa ID]` |
| `FormularWeb`, `AnketaWeb`, `KomentarePodClankom`, `ZapasPriebeh` | hotové súčasti webu |
| `sanitizeHtml()` | bezpečné HTML z obsahu |
| `otvorNastaveniaCookies()`, `jePrihlaseny()` | odkaz v pätičke, odkaz do administrácie |
| `useObchod()` | nastavenia obchodu: zapnutý, mena, spôsoby doručenia a platby |
| `useKosik()` | košík (v prehliadači, zdieľaný hlavičkou a kartami): `polozky`, `pocet`, `medzisucet`, `pridaj(produkt, volby, pocet)`, `zmenPocet`, `odstran` |
| `cenaSVolbami()`, `hodnotaVypredana()`, `cenaText()` | cena so zvolenými vlastnosťami a chýbajúce povinné voľby, formát „49,90 €“ |
| `usePokladna()` | celá pokladňa: údaje zákazníka, doručenie, platba, súčty, `odosli()` vráti token objednávky |
| `useObjednavka(token)`, `PlatobnaBrana` | stav objednávky (po návrate z brány sa chvíľu obnovuje) a kód brány v izolovanom rámci |

Časť základnej šablóny sa dá aj obaliť: `import { casti } from '@clubw/zakladna'`
a v novej časti vykresliť `<casti.Uvod />` s vlastným doplnkom okolo.

`import` z `react`, `react-router-dom`, `@clubw/jadro` a `@clubw/zakladna` sa do
`sablona.js` nezabalí - šablóna ich dostane od webu (`window.ClubW`). Na stránke je tak
jediný React a šablóna má len niekoľko kB.

## Šablóna Moderná

Úplná šablóna - nahrádza **všetky** časti webu, zo základnej nepreberá nič. Slúži aj ako
vzor, ako napísať celú šablónu od nuly.

- **Desktop** - redakčný web: veľký tmavý úvod s najbližším zápasom, rýchle odkazy,
  Match Centre s odpočtom, správy, hráči, tabuľka s anketou, fotky a videá, tmavý panel
  s výzvou (vstupenky, členstvo) a partneri.
- **Tablet** - hybrid: menu sa presúva do spodnej lišty, karty sa skladajú do dvoch stĺpcov.
- **Mobil** - ako športová aplikácia: spodná navigácia (Domov, Správy, Zápasy, Tímy, Menu),
  posúvateľné karty hráčov, kalendár ako zoznam dní, fotky s potiahnutím prstom.
- **Vyhľadávanie** - ikona lupy v hlavičke alebo `Ctrl+K`: správy, hráči, zápasy, tímy, stránky.
- **Farby** - všetko sa odvodzuje od hlavnej farby klubu z Nastavení (`--club-primary`).

Nastavenia (Šablóny → Moderná → Prispôsobiť): fotka a texty úvodu, ktorý tím sa ukáže na
úvode (ID tímu, 0 = prvý mužský), počet správ, zapnutie tabuľky, hráčov, médií, ankety
a partnerov, texty a odkaz tmavého panelu (prázdny nadpis panel skryje).

Zdrojové súbory sú v `moderna/src/` (`spolocne.tsx` - karty, tabuľka, formáty,
`Rozlozenie.tsx` - hlavička, pätička, spodná navigácia, `stranky/` - jednotlivé stránky),
štýl v `moderna/styl.css` (triedy `md-`, tokeny na začiatku súboru).

## Šablóna Klubová (predvolená)

Podľa návrhov z Claude Design. Nové inštalácie ju majú aktívnu a weby, ktoré ostali
na pôvodnej základnej šablóne, sa na ňu prepnú migráciou. Nahrádza všetky verejné
stránky webu.

- **Podľa návrhov 1:1** - úvod, Novinky (`/clanky`), Videá (`/videa`), Fotogaléria
  (`/galleries`), Súpiska (`/teams`, `/teams/:id`) a Profil hráča (`/players/:id`).
- **Dogenerované v rovnakom štýle** - detail článku, obsahová stránka, detail galérie
  s prehliadačom fotiek, zápasy a detail zápasu (výsledok, strelci, priebeh, zostavy),
  súťaže a detail súťaže (tabuľka, zápasy, strelci, nahrávači), kalendár, turnaje,
  dokumenty, partneri, formulár, štatistiky, profil člena realizačného tímu a 404.
  Všetky majú tmavú hlavičku s červeným štítkom, filtre ako pilulky, karty a tabuľky
  z návrhov a na spodku partnerov.
- **Desktop** - priehľadná hlavička nad sliderom (na podstránkach tmavá), rozbaľovacie
  menu cez celú šírku.
- **Tablet** - menu v paneli, mriežky v dvoch až troch stĺpcoch.
- **Mobil** - ako klubová aplikácia: horná lišta s logom, spodné záložky (Domov,
  Správy, Zápasy, Tím, Menu), zaoblené hlavičky obrazoviek, filtre ako posúvateľné
  čipy, novinky ako zoznam, karty posúvateľné prstom, kalendár ako zoznam dní.
- **Dáta** - štatistiky hráčov tímu z `GET /api/teams/:id/players/stats`, tabuľka sezóny
  v profile hráča z `GET /api/players/:id/stats` (zápasy, minúty, góly, asistencie
  a karty po súťažiach), filtre fotogalérie z `GET /api/galleries?typ=...&pocty=1`
  (zápasy, tímy, články, klub), kategórie videí z poľa Kategória pri videu. Videá
  z YouTube (bez cookies) a Vimeo sa prehrajú v okne priamo na stránke.
- **Nastavenia** (Šablóny → Klubová → Prispôsobiť) - 102 nastavení v 16 záložkách:
  farby (zvýraznenie, tmavá, pozadie) a písmo nadpisov; hlavička (tlačidlo, košík,
  odkaz Admin); mobilné záložky (názvy a odkazy); každá sekcia úvodu sa dá vypnúť
  a premenovať (slider, zápasy, články, fanshop, videá, hráči, úspechy, sociálne
  siete, odkaz klubu, partneri) spolu s jej vlastnými poľami; štítky a nadpisy
  podstránok (Novinky, Videá, Fotogaléria, Zápasy, Súťaže, Turnaje, Dokumenty,
  Partneri, Obchod, Súpiska, Kalendár, Štatistiky); pätička (texty stĺpcov, siete,
  copyright) a texty tlačidiel (Zobraziť všetky, Čítať viac, Detail...). Prázdny text = predvolený text šablóny, `{klub}` = názov klubu.
  Sekcie bez obsahu sa neukážu.
- **Fanshop** - obchod s kategóriami, produkt s galériou a výberom vlastností
  (veľkosti ako pilulky, text na dres), košík, pokladňa v krokoch a stav objednávky
  s pokynmi k platbe alebo platobnou bránou. Košík s počtom kusov je v hlavičke, na
  mobile má produkt lištu „Pridať do košíka“ nad záložkami. Úvod so zapnutým obchodom
  ukáže odporúčané produkty; bez obchodu tri produkty z nastavení šablóny.
- **Písma** Poppins a Inter sú pribalené v `klubova/pisma` (bez Google Fonts).

Zdrojové súbory: `klubova/src/Rozlozenie.tsx` (hlavička, menu, pätička, záložky),
`klubova/src/casti.tsx` (hlavička podstránky, filtre, karty, partneri, tabuľka,
prehrávač videa), `klubova/src/spolocne.tsx` (dáta, typy, formáty, ikony) a stránky
v `klubova/src/stranky/`; štýl `klubova/styl.css` (triedy `kl-`, tokeny na začiatku súboru).

## Bezpečnosť

Skript šablóny beží na webe s rovnakými právami ako web sám. Preto:

- nahrávať a mazať šablóny smie **len správca**,
- nahrávajte len šablóny od autorov, ktorým dôverujete,
- server pri inštalácii kontroluje cesty v balíku, povolené typy súborov a veľkosť
  (balík najviac 15 MB, po rozbalení 40 MB, najviac 400 súborov).

Náhľad inej než aktívnej šablóny (`/?nahlad_sablony=<slug>`) server ukáže len prihlásenému
používateľovi s právom vidieť šablóny. Ostatní návštevníci vidia vždy aktívnu šablónu.

## Nasadenie

Backend servuje súbory šablón na adrese `/sablony/...`. Ak web a API bežia za nginx,
presmerujte túto adresu na backend rovnako ako `/api` a `/uploads`. Nahraté šablóny sú
v `backend/sablony/` (alebo v priečinku z premennej `SABLONY_DIR`) - zálohujte ho spolu
s `backend/uploads/`.
