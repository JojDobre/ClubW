// Umiestnenie: sablony/kronika/src/index.tsx
// Šablóna Kronika - hlavička, pätička, mobilná navigácia a všetky
// verejné stránky webu vrátane fanshopu (obchod, košík, pokladňa). Úvod, Novinky, Videá, Fotogaléria, Súpiska
// a Profil hráča sú podľa návrhov z Claude Design, ostatné stránky
// z nich preberajú hlavičku, filtre, karty a tabuľky.
//
// Zostavenie: npm run sablony -- kronika   (vytvorí sablona.js)

import { registrujSablonu } from '@clubw/jadro';
import { Rozlozenie, Hlavicka, Paticka, Nacitavanie } from './Rozlozenie';
import Uvod from './stranky/Uvod';
import Clanky from './stranky/Clanky';
import Clanok from './stranky/Clanok';
import Stranka from './stranky/Stranka';
import Videa from './stranky/Videa';
import Galerie from './stranky/Galerie';
import Galeria from './stranky/Galeria';
import Supiska from './stranky/Supiska';
import Hrac from './stranky/Hrac';
import ClenRealizacnehoTimu from './stranky/ClenRealizacnehoTimu';
import Zapasy from './stranky/Zapasy';
import Zapas from './stranky/Zapas';
import Ligy from './stranky/Ligy';
import Liga from './stranky/Liga';
import Kalendar from './stranky/Kalendar';
import Turnaje from './stranky/Turnaje';
import Dokumenty from './stranky/Dokumenty';
import Sponzori from './stranky/Sponzori';
import Formular from './stranky/Formular';
import Statistiky from './stranky/Statistiky';
import Nenajdena from './stranky/Nenajdena';
import Registracia from './stranky/Registracia';
import Hladanie from './stranky/Hladanie';
import { Obchod, Produkt, Kosik, Pokladna, Objednavka } from './stranky/Obchod';

registrujSablonu({
  casti: {
    Rozlozenie,
    Hlavicka,
    Paticka,
    Nacitavanie,
    Uvod,
    Clanky,
    Clanok,
    Stranka,
    Videa,
    Galerie,
    Galeria,
    Timy: Supiska,
    Tim: Supiska,
    Hrac,
    ClenRealizacnehoTimu,
    Zapasy,
    Zapas,
    Ligy,
    Liga,
    Kalendar,
    Turnaje,
    Dokumenty,
    Sponzori,
    Formular,
    Statistiky,
    Obchod,
    Produkt,
    Kosik,
    Pokladna,
    Objednavka,
    Registracia,
    Hladanie,
    Nenajdena,
  },
});
