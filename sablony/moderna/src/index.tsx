// Umiestnenie: sablony/moderna/src/index.tsx
// Šablóna Moderná - nahrádza všetky časti webu.
//
// Zostavenie: npm run sablony -- moderna   (vytvorí sablona.js)
//
// Skript šablóny je jeden súbor (IIFE), preto sa stránky nenačítavajú
// lenivo ako v základnej šablóne - celá šablóna má po zbalení len
// niekoľko desiatok kB.

import { registrujSablonu } from '@clubw/jadro';
import { Rozlozenie, Hlavicka, Paticka, Nacitavanie } from './Rozlozenie';
import Uvod from './stranky/Uvod';
import Clanky from './stranky/Clanky';
import Clanok from './stranky/Clanok';
import Stranka from './stranky/Stranka';
import Timy from './stranky/Timy';
import Tim from './stranky/Tim';
import Hrac from './stranky/Hrac';
import ClenRealizacnehoTimu from './stranky/ClenRealizacnehoTimu';
import Ligy from './stranky/Ligy';
import Liga from './stranky/Liga';
import Zapasy from './stranky/Zapasy';
import Zapas from './stranky/Zapas';
import Kalendar from './stranky/Kalendar';
import Galerie from './stranky/Galerie';
import Galeria from './stranky/Galeria';
import Videa from './stranky/Videa';
import Turnaje from './stranky/Turnaje';
import Dokumenty from './stranky/Dokumenty';
import Sponzori from './stranky/Sponzori';
import Formular from './stranky/Formular';
import Statistiky from './stranky/Statistiky';
import Nenajdena from './stranky/Nenajdena';

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
    Timy,
    Tim,
    Hrac,
    ClenRealizacnehoTimu,
    Ligy,
    Liga,
    Zapasy,
    Zapas,
    Kalendar,
    Galerie,
    Galeria,
    Videa,
    Turnaje,
    Dokumenty,
    Sponzori,
    Formular,
    Statistiky,
    Nenajdena,
  },
});
