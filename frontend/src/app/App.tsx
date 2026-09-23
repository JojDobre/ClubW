// Umiestnenie: frontend/src/app/App.tsx
// Koreň novej administrácie: poskytovatelia kontextu a routovanie.
//
// POZNÁMKA K SÚBEŽNEJ PREVÁDZKE: pôvodná administrácia zatiaľ zostáva
// funkčná na svojich cestách. Nová beží pod /admin a preberá obrazovky
// postupne, aby klub nezostal bez použiteľného rozhrania.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './AuthContext';
import { RezimProvider } from './RezimContext';
import { NastaveniaProvider } from '../context/NastaveniaContext';
import { ToastProvider } from '../ui';
import ChranenaCesta from './ChranenaCesta';

import AppShell from '../layout/AppShell';
import Prihlasenie from '../pages/Prihlasenie';
import Prehlad from '../pages/admin/Prehlad';
import Clanky from '../pages/admin/Clanky';
import ClanokEditor from '../pages/admin/ClanokEditor';
import Zapasy from '../pages/admin/Zapasy';
import ZapasEditor from '../pages/admin/ZapasEditor';
import ZapasLive from '../pages/admin/ZapasLive';
import Hraci from '../pages/admin/Hraci';
import Timy from '../pages/admin/Timy';
import Kalendar from '../pages/admin/Kalendar';
import Pouzivatelia from '../pages/admin/Pouzivatelia';
import Nastavenia from '../pages/admin/Nastavenia';
import Licencia from '../pages/admin/Licencia';
import Sezony from '../pages/admin/Sezony';
import Stadiony from '../pages/admin/Stadiony';
import TurnajEditor from '../pages/admin/TurnajEditor';
import Archiv from '../pages/admin/Archiv';
import OchranaUdajov from '../pages/admin/OchranaUdajov';
import Kategorie from '../pages/admin/Kategorie';
import Stranky from '../pages/admin/Stranky';
import Galerie from '../pages/admin/Galerie';
import GaleriaEditor from '../pages/admin/GaleriaEditor';
import RealizacnyTim from '../pages/admin/RealizacnyTim';
import Ligy from '../pages/admin/Ligy';
// Sekcia KLUB
import Sponzori from '../pages/admin/Sponzori';
import Dokumenty from '../pages/admin/Dokumenty';
import Ankety from '../pages/admin/Ankety';
import Fanusikovia from '../pages/admin/Fanusikovia';
// Doplnky sekcie OBSAH a ŠPORT
import Komentare from '../pages/admin/Komentare';
import Videa from '../pages/admin/Videa';
import Turnaje from '../pages/admin/Turnaje';
import Formulare from '../pages/admin/Formulare';
import FormularEditor from '../pages/admin/FormularEditor';
import FormularOdpovede from '../pages/admin/FormularOdpovede';
import KniznicaMedii from '../pages/admin/KniznicaMedii';
import Logy from '../pages/admin/Logy';
import MenuWebu from '../pages/admin/MenuWebu';
import Profil from '../pages/admin/Profil';
import { ZabudnuteHeslo, ObnovaHesla } from '../pages/ObnovaHesla';

import '../design/global.css';
import './App.css';

export const App: React.FC = () => (
  <RezimProvider>
    <NastaveniaProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Verejné cesty */}
              <Route path="/prihlasenie" element={<Prihlasenie />} />
              <Route path="/zabudnute-heslo" element={<ZabudnuteHeslo />} />
              <Route path="/obnova-hesla" element={<ObnovaHesla />} />

              {/* Administrácia */}
              <Route
                path="/admin"
                element={
                  <ChranenaCesta>
                    <AppShell />
                  </ChranenaCesta>
                }
              >
                {/* Obrazovky pribudnú v ďalších fázach. Dovtedy sa
                    zobrazuje rozpracovaný stav, aby navigácia fungovala. */}
                <Route index element={<Prehlad />} />
                <Route path="clanky" element={<Clanky />} />
                {/* Nový článok musí byť pred :id, inak by sa "novy"
                    vyhodnotilo ako identifikátor článku */}
                <Route path="clanky/novy" element={<ClanokEditor />} />
                <Route path="clanky/:id" element={<ClanokEditor />} />
                <Route path="kategorie" element={<Kategorie />} />
                <Route path="stranky" element={<Stranky />} />
                <Route path="galerie" element={<Galerie />} />
                <Route path="galerie/nova" element={<GaleriaEditor />} />
                <Route path="galerie/:id" element={<GaleriaEditor />} />
                <Route path="komentare" element={<Komentare />} />
                <Route path="videa" element={<Videa />} />
                <Route path="timy" element={<Timy />} />
                <Route path="hraci" element={<Hraci />} />
                <Route path="realizacny-tim" element={<RealizacnyTim />} />
                <Route path="ligy" element={<Ligy />} />
                <Route path="turnaje" element={<Turnaje />} />
                <Route path="turnaje/:id" element={<TurnajEditor />} />
                <Route path="zapasy" element={<Zapasy />} />
                {/* "novy" musí byť pred :id, inak by sa vyhodnotilo ako identifikátor */}
                <Route path="zapasy/novy" element={<ZapasEditor />} />
                <Route path="zapasy/:id" element={<ZapasEditor />} />
                <Route path="zapasy/:id/live" element={<ZapasLive />} />
                <Route path="kalendar" element={<Kalendar />} />
                <Route path="sezony" element={<Sezony />} />
                <Route path="stadiony" element={<Stadiony />} />
                <Route path="archiv" element={<Archiv />} />

                {/* Sekcia KLUB */}
                <Route path="sponzori" element={<Sponzori />} />
                <Route path="dokumenty" element={<Dokumenty />} />
                <Route path="formulare" element={<Formulare />} />
                <Route path="formulare/novy" element={<FormularEditor />} />
                <Route path="formulare/:id" element={<FormularEditor />} />
                <Route path="formulare/:id/odpovede" element={<FormularOdpovede />} />
                <Route path="media" element={<KniznicaMedii />} />
                <Route path="logy" element={<Logy />} />
                <Route
                  path="menu"
                  element={
                    <ChranenaCesta modul="nastavenia">
                      <MenuWebu />
                    </ChranenaCesta>
                  }
                />
                <Route path="ankety" element={<Ankety />} />
                <Route path="fanusikovia" element={<Fanusikovia />} />
                <Route path="profil" element={<Profil />} />

                {/* Cesty len pre administrátora */}
                <Route
                  path="pouzivatelia"
                  element={
                    <ChranenaCesta modul="pouzivatelia">
                      <Pouzivatelia />
                    </ChranenaCesta>
                  }
                />
                <Route
                  path="ochrana-udajov"
                  element={
                    <ChranenaCesta role={['admin']}>
                      <OchranaUdajov />
                    </ChranenaCesta>
                  }
                />
                <Route
                  path="nastavenia"
                  element={
                    <ChranenaCesta modul="nastavenia">
                      <Nastavenia />
                    </ChranenaCesta>
                  }
                />
                <Route
                  path="licencia"
                  element={
                    <ChranenaCesta modul="licencia">
                      <Licencia />
                    </ChranenaCesta>
                  }
                />
              </Route>

              {/* Neznáma cesta vedie do administrácie */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </NastaveniaProvider>
  </RezimProvider>
);

export default App;
