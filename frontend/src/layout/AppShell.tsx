// Umiestnenie: frontend/src/layout/AppShell.tsx
// Rámec administrácie: bočné menu, horná lišta, obsah.
//
// Obsah jednotlivých obrazoviek sa vykresľuje cez <Outlet /> z react-routera,
// takže pri prechode medzi obrazovkami sa rámec neprekresľuje.

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import RightBar from './RightBar';
import { useAuth } from '../app/AuthContext';
import { useNastavenia } from '../context/NastaveniaContext';
import { nazovObrazovky } from '../app/navigacia';
import './AppShell.css';

const KLUC_ZUZENIE = 'clubw_menu_zuzene';

export const AppShell: React.FC = () => {
  const { pouzivatel } = useAuth();
  const { nastavenia } = useNastavenia();
  const location = useLocation();

  // Voľba zúženia prežije obnovenie stránky
  const [zuzeny, setZuzeny] = useState(
    () => localStorage.getItem(KLUC_ZUZENIE) === '1'
  );
  const [mobilneMenu, setMobilneMenu] = useState(false);

  const nadpis = nazovObrazovky(location.pathname);

  useEffect(() => {
    localStorage.setItem(KLUC_ZUZENIE, zuzeny ? '1' : '0');
  }, [zuzeny]);

  // Názov obrazovky v titulku okna — pomáha pri viacerých otvorených kartách
  useEffect(() => {
    document.title = `${nadpis} · ${nastavenia.nazov}`;
  }, [nadpis, nastavenia.nazov]);

  // Zatvorenie vysunutého menu po prechode na inú obrazovku
  useEffect(() => {
    setMobilneMenu(false);
  }, [location.pathname]);

  return (
    <div className="cw-shell">
      <Sidebar
        zuzeny={zuzeny}
        onPrepniZuzenie={() => setZuzeny((z) => !z)}
        mobilneOtvorene={mobilneMenu}
        onZavriMobilne={() => setMobilneMenu(false)}
        rola={pouzivatel?.rola}
        aktualnaCesta={location.pathname}
      />

      <div className="cw-shell__main">
        <Topbar nadpis={nadpis} onOtvorMobilneMenu={() => setMobilneMenu(true)} />

        {/* Kľúč vynúti nábehovú animáciu pri každej zmene obrazovky */}
        <main className="cw-shell__content cw-screen-enter" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      {/* Pravý panel s nedávnou aktivitou — na užších obrazovkách sa skryje */}
      <RightBar />

      <BottomNav
        aktualnaCesta={location.pathname}
        onOtvorMenu={() => setMobilneMenu(true)}
      />
    </div>
  );
};

export default AppShell;
