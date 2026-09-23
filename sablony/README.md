# Šablóny webu ClubW

Šablóna určuje, ako vyzerá verejný web klubu. Funguje podobne ako téma vo WordPresse:
v administrácii (**Systém → Šablóny**) si správca vyberie aktívnu šablónu, pozrie si
náhľad inej šablóny, upraví jej nastavenia a nahrá novú šablónu ako balík `.zip`.

```
sablony/
  zakladna/          predvolená šablóna - celý verejný web (dodaná so systémom)
  stadion/           tmavá športová šablóna (dodaná so systémom)
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
    { "kluc": "titulok", "typ": "text", "menovka": "Nadpis na úvode" },
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
- Typy nastavení: `farba`, `text`, `dlhy_text`, `vyber`, `prepinac`, `cislo`, `obrazok`.
  Správca ich vyplní v administrácii cez **Prispôsobiť**.

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
| `Nenajdena` | neexistujúca adresa |

Parametre z adresy čítajte cez `useParams()` z `react-router-dom`.

### Čo poskytuje `@clubw/jadro`

| Čo | Na čo |
|---|---|
| `useNastavenia()` | názov, logo, slogan, farby, kontakt, sociálne siete, údaje klubu |
| `useNastaveniaSablony()` | hodnoty nastavení šablóny z administrácie |
| `useSablona()` | slug, názov a verzia aktívnej šablóny |
| `useMenuWebu()`, `OdkazMenu` | menu z **Menu a odkazy** (aj s podmenu) |
| `useData('/articles?limit=3')` | načítanie dát z verejného API (`{ data, nacitava, chyba }`) |
| `apiUrl()`, `souborUrl()` | adresa API a nahratých súborov (`/uploads/...`) |
| `Cast` | vykreslí inú časť - napr. `<Cast nazov="Paticka" />` |
| `ObsahSFormularmi` | HTML obsah stránky/článku so značkami `[formular slug]` a `[anketa ID]` |
| `FormularWeb`, `AnketaWeb`, `KomentarePodClankom`, `ZapasPriebeh` | hotové súčasti webu |
| `sanitizeHtml()` | bezpečné HTML z obsahu |
| `otvorNastaveniaCookies()`, `jePrihlaseny()` | odkaz v pätičke, odkaz do administrácie |

Časť základnej šablóny sa dá aj obaliť: `import { casti } from '@clubw/zakladna'`
a v novej časti vykresliť `<casti.Uvod />` s vlastným doplnkom okolo.

`import` z `react`, `react-router-dom`, `@clubw/jadro` a `@clubw/zakladna` sa do
`sablona.js` nezabalí - šablóna ich dostane od webu (`window.ClubW`). Na stránke je tak
jediný React a šablóna má len niekoľko kB.

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
