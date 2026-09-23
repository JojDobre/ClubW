// Umiestnenie: frontend/src/web/WebApp.tsx
// Verejný web klubu - adresy, ktoré ukážu jednotlivé časti šablóny.
//
// Web sám nič nevykresľuje, len rozhodne, ktorá časť šablóny patrí
// k adrese (/clanky → Clanky, /matches/5 → Zapas...). Ako časť vyzerá,
// určuje aktívna šablóna; čo nenahradí, zobrazí základná šablóna
// (priečinok sablony/zakladna).
//
// Jadro okrem toho vždy pripojí SEO značky, lištu súhlasu s cookies
// a lištu náhľadu šablóny - tie nezávisia od šablóny.

import React, { Suspense } from 'react';
import * as ReactDOM from 'react-dom';
import * as jsxRuntime from 'react/jsx-runtime';
import * as ReactRouterDom from 'react-router-dom';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { NastaveniaProvider } from '../context/NastaveniaContext';
import WebDoplnky from '../components/WebDoplnky';
import * as zakladnaModul from '@sablony/zakladna/src';
import * as jadro from './jadro';
import { Cast, SablonaProvider, useSablona, ukonciNahlad } from './SablonaKontext';
import type { NazovCasti } from './typy';
// Základná typografia a štýly, na ktorých stoja stránky základnej šablóny
import '../styles/globals.css';
import '../index.css';
import './WebApp.css';

/**
 * Knižnice pre nahraté šablóny. Šablóna je zostavená bez vlastného
 * Reactu (bol by to druhý React, ktorý by s webom nespolupracoval) -
 * „import React from 'react'" v nej vedie sem.
 */
declare global {
  interface Window {
    ClubW?: Record<string, unknown>;
  }
}
window.ClubW = {
  React,
  ReactDOM,
  jsxRuntime,
  ReactRouterDom,
  jadro,
  // Nahratá šablóna môže časť základnej obaliť: import { casti } from '@clubw/zakladna'
  zakladna: zakladnaModul,
  registrujSablonu: jadro.registrujSablonu,
  verzia: jadro.VERZIA_ROZHRANIA,
};

/** Adresa → časť šablóny. Poradie rozhoduje (/:slug je až na konci). */
const ADRESY: Array<[string, NazovCasti]> = [
  ['/', 'Uvod'],
  ['/clanky', 'Clanky'],
  ['/clanek/:slug', 'Clanok'],
  ['/teams', 'Timy'],
  ['/teams/:id', 'Tim'],
  ['/players/:id', 'Hrac'],
  ['/staff/:id', 'ClenRealizacnehoTimu'],
  ['/leagues', 'Ligy'],
  ['/leagues/:id', 'Liga'],
  ['/matches', 'Zapasy'],
  ['/matches/:id', 'Zapas'],
  ['/calendar', 'Kalendar'],
  ['/galleries', 'Galerie'],
  ['/galleries/:id', 'Galeria'],
  ['/videa', 'Videa'],
  ['/turnaje', 'Turnaje'],
  ['/turnaje/:id', 'Turnaje'],
  ['/dokumenty', 'Dokumenty'],
  ['/sponzori', 'Sponzori'],
  ['/formular/:kluc', 'Formular'],
  ['/stats', 'Statistiky'],
  ['/:slug', 'Stranka'],
  ['*', 'Nenajdena'],
];

/** Časť stránky v rozložení šablóny. */
const StrankaWebu: React.FC<{ cast: NazovCasti }> = ({ cast }) => {
  // Kľúč podľa adresy: prechod z /teams/1 na /teams/2 stránku znovu
  // pripojí (stránky si parametre čítajú z adresy pri načítaní)
  const { pathname } = useLocation();
  return (
    <Cast nazov="Rozlozenie">
      <Suspense fallback={<Cast nazov="Nacitavanie" />}>
        <Cast key={pathname} nazov={cast} />
      </Suspense>
    </Cast>
  );
};

/** Lišta pre správcu, ktorý si prezerá inú než aktívnu šablónu. */
const ListaNahladu: React.FC = () => {
  const sablona = useSablona();
  if (!sablona.nahlad) return null;
  return (
    <div className="web-nahlad" role="status">
      <span>
        Náhľad šablóny <strong>{sablona.nazov}</strong> - návštevníci vidia aktívnu šablónu.
      </span>
      <a href="/admin/sablony">Späť na šablóny</a>
      <button type="button" onClick={ukonciNahlad}>
        Ukončiť náhľad
      </button>
    </div>
  );
};

/** Chyba v šablóne nesmie zhodiť celý web - aspoň oznámenie. */
class ZachytenieChyby extends React.Component<{ children: React.ReactNode }, { chyba: boolean }> {
  state = { chyba: false };
  static getDerivedStateFromError() {
    return { chyba: true };
  }
  componentDidCatch(chyba: unknown) {
    console.error('ClubW: chyba pri vykreslení šablóny', chyba);
  }
  render() {
    if (this.state.chyba) {
      return (
        <div className="web-chyba">
          <h1>Stránku sa nepodarilo zobraziť</h1>
          <p>Skúste ju načítať znovu. Ak problém pretrváva, dajte vedieť správcovi webu.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Načítať znovu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Adresy webu. Pri prechode na inú stránku sa oznámenie o chybe zruší. */
const ObsahWebu: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <ZachytenieChyby key={pathname}>
      <Routes>
        {ADRESY.map(([cesta, cast]) => (
          <Route key={cesta} path={cesta} element={<StrankaWebu cast={cast} />} />
        ))}
      </Routes>
    </ZachytenieChyby>
  );
};

const WebApp: React.FC = () => (
  <NastaveniaProvider>
    <BrowserRouter>
      <SablonaProvider zakladna={zakladnaModul.casti}>
        <ObsahWebu />
        <WebDoplnky />
        <ListaNahladu />
      </SablonaProvider>
    </BrowserRouter>
  </NastaveniaProvider>
);

export default WebApp;
