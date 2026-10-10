// Umiestnenie: sablony/zakladna/src/index.ts
// Základná šablóna - všetky časti verejného webu.
//
// Zostavuje sa spolu s webom (nie je to samostatný balík), lebo slúži
// ako záloha: čo iná šablóna nenahradí, zobrazí sa odtiaľto. Stránky sa
// načítavajú až pri prvej návšteve (lazy), úvodná stránka tak nenesie
// kód kalendára či turnajov.
//
// Každá podstránka je zabalená v <div class="zs">, pod ktorým platí jej
// vzhľad (stranky.css, načíta ho casti.tsx spolu s prvou podstránkou).
// Stránka si tak drží vzhľad Základnej aj vtedy,
// keď ju zobrazí iná šablóna, ktorá ju sama nenahradila.

import { createElement, lazy, type ComponentType } from 'react';
import type { CastiSablony } from '@clubw/jadro';
import { Rozlozenie, Hlavicka, Paticka, Nacitavanie } from './Rozlozenie';

type Modul = Record<string, unknown>;

/** Lazy stránka z modulu (predvolený alebo pomenovaný export) v obale .zs. */
const stranka = (nacitaj: () => Promise<Modul>, nazov = 'default') =>
  lazy(async () => {
    const Komponent = (await nacitaj())[nazov] as ComponentType;
    return { default: () => createElement('div', { className: 'zs' }, createElement(Komponent)) };
  });

const obchod = () => import('./stranky/Obchod');
const mojKlub = () => import('./stranky/MojKlub');

export const casti: CastiSablony = {
  Rozlozenie,
  Hlavicka,
  Paticka,
  Nacitavanie,
  Uvod: stranka(() => import('./stranky/Uvod')),
  Clanky: stranka(() => import('./stranky/Clanky')),
  Clanok: stranka(() => import('./stranky/Clanok')),
  Stranka: stranka(() => import('./stranky/Stranka')),
  Timy: stranka(() => import('./stranky/Supiska')),
  Tim: stranka(() => import('./stranky/Supiska')),
  Hrac: stranka(() => import('./stranky/Hrac')),
  ClenRealizacnehoTimu: stranka(() => import('./stranky/ClenRealizacnehoTimu')),
  Ligy: stranka(() => import('./stranky/Ligy')),
  Liga: stranka(() => import('./stranky/Liga')),
  Zapasy: stranka(() => import('./stranky/Matches')),
  Zapas: stranka(() => import('./stranky/MatchDetail')),
  Kalendar: stranka(() => import('./stranky/Kalendar')),
  Galerie: stranka(() => import('./stranky/Galerie')),
  Galeria: stranka(() => import('./stranky/Galeria')),
  Videa: stranka(() => import('./stranky/Videa')),
  Turnaje: stranka(() => import('./stranky/Turnaje')),
  Dokumenty: stranka(() => import('./stranky/Dokumenty')),
  Sponzori: stranka(() => import('./stranky/Sponzori')),
  Formular: stranka(() => import('./stranky/Formular')),
  Statistiky: stranka(() => import('./stranky/Statistiky')),
  Obchod: stranka(obchod, 'Obchod'),
  Produkt: stranka(obchod, 'Produkt'),
  Kosik: stranka(obchod, 'Kosik'),
  Pokladna: stranka(obchod, 'Pokladna'),
  Objednavka: stranka(obchod, 'Objednavka'),
  Registracia: stranka(() => import('./stranky/Registracia')),
  Hladanie: stranka(() => import('./stranky/Hladanie')),
  MojKlub: stranka(mojKlub, 'MojKlub'),
  OverenieKarty: stranka(mojKlub, 'OverenieKarty'),
  Nenajdena: stranka(() => import('./stranky/Nenajdena')),
};

export default casti;
