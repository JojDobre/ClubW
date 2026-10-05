// Umiestnenie: sablony/zakladna/src/index.ts
// Základná šablóna - všetky časti verejného webu.
//
// Zostavuje sa spolu s webom (nie je to samostatný balík), lebo slúži
// ako záloha: čo iná šablóna nenahradí, zobrazí sa odtiaľto. Stránky sa
// načítavajú až pri prvej návšteve (lazy), úvodná stránka tak nenesie
// kód kalendára či turnajov.

import { lazy } from 'react';

const obchod = () => import('./stranky/Obchod');
const ligy = () => import('./stranky/Ligy');
const mojKlub = () => import('./stranky/MojKlub');
import type { CastiSablony } from '@clubw/jadro';
import { Rozlozenie, Hlavicka, Paticka, Nacitavanie } from './Rozlozenie';

export const casti: CastiSablony = {
  Rozlozenie,
  Hlavicka,
  Paticka,
  Nacitavanie,
  Uvod: lazy(() => import('./stranky/Uvod')),
  Clanky: lazy(() => import('./stranky/ArticlesPage')),
  Clanok: lazy(() => import('./stranky/ArticleDetailPage')),
  Stranka: lazy(() => import('./stranky/Stranka')),
  Timy: lazy(() => import('./stranky/Teams')),
  Tim: lazy(() => import('./stranky/TeamDetail')),
  Hrac: lazy(() => import('./stranky/PlayerDetail')),
  ClenRealizacnehoTimu: lazy(() => import('./stranky/StaffDetail')),
  Ligy: lazy(() => ligy().then((m) => ({ default: m.Ligy }))),
  Liga: lazy(() => ligy().then((m) => ({ default: m.Liga }))),
  Zapasy: lazy(() => import('./stranky/Matches')),
  Zapas: lazy(() => import('./stranky/MatchDetail')),
  Kalendar: lazy(() => import('./stranky/CalendarPage')),
  Galerie: lazy(() => import('./stranky/Galleries')),
  Galeria: lazy(() => import('./stranky/GalleryDetail')),
  Videa: lazy(() => import('./stranky/Videos')),
  Turnaje: lazy(() => import('./stranky/Turnaje')),
  Dokumenty: lazy(() => import('./stranky/Dokumenty')),
  Sponzori: lazy(() => import('./stranky/SponzoriVerejne')),
  Formular: lazy(() => import('./stranky/FormularStranka')),
  Statistiky: lazy(() => import('./stranky/Stats')),
  Obchod: lazy(() => obchod().then((m) => ({ default: m.Obchod }))),
  Produkt: lazy(() => obchod().then((m) => ({ default: m.Produkt }))),
  Kosik: lazy(() => obchod().then((m) => ({ default: m.Kosik }))),
  Pokladna: lazy(() => obchod().then((m) => ({ default: m.Pokladna }))),
  Objednavka: lazy(() => obchod().then((m) => ({ default: m.Objednavka }))),
  Registracia: lazy(() => import('./stranky/Registracia')),
  Hladanie: lazy(() => import('./stranky/Hladanie')),
  MojKlub: lazy(() => mojKlub().then((m) => ({ default: m.MojKlub }))),
  OverenieKarty: lazy(() => mojKlub().then((m) => ({ default: m.OverenieKarty }))),
  Nenajdena: lazy(() => import('./stranky/Nenajdena')),
};

export default casti;
