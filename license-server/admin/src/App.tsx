// Umiestnenie: license-server/admin/src/App.tsx
// Rozloženie administrácie licenčného servera: bočné menu, prihlásenie
// a adresy jednotlivých obrazoviek.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, UDALOST_ODHLASENIA, type Administrator } from './api';
import { Ikona, Nacitava } from './komponenty';
import Prihlasenie from './stranky/Prihlasenie';
import Prehlad from './stranky/Prehlad';
import Licencie from './stranky/Licencie';
import LicenciaDetail from './stranky/LicenciaDetail';
import Produkty from './stranky/Produkty';
import ProduktDetail from './stranky/ProduktDetail';
import Aktualizacie from './stranky/Aktualizacie';
import Udalosti from './stranky/Udalosti';
import Administratori from './stranky/Administratori';
import Ucet from './stranky/Ucet';

interface Prihlaseny {
  admin: Administrator;
  nastav: (a: Administrator | null) => void;
}

const PrihlasenyContext = createContext<Prihlaseny | null>(null);
export const usePrihlaseny = () => useContext(PrihlasenyContext)!;

const MENU = [
  { odkaz: '/', nazov: 'Prehľad', ikona: 'prehlad', presne: true },
  { odkaz: '/licencie', nazov: 'Licencie', ikona: 'licencie' },
  { odkaz: '/produkty', nazov: 'Produkty a verzie', ikona: 'produkty' },
  { odkaz: '/aktualizacie', nazov: 'Aktualizácie', ikona: 'aktualizacie' },
  { odkaz: '/udalosti', nazov: 'Udalosti', ikona: 'udalosti' },
  { odkaz: '/administratori', nazov: 'Administrátori', ikona: 'administratori' },
];

const App: React.FC = () => {
  const [admin, setAdmin] = useState<Administrator | null | undefined>(undefined);
  const [menuOtvorene, setMenuOtvorene] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    api
      .get<Administrator>('/ja')
      .then((r) => setAdmin(r.data))
      .catch(() => setAdmin(null));
    const odhlaseny = () => setAdmin(null);
    window.addEventListener(UDALOST_ODHLASENIA, odhlaseny);
    return () => window.removeEventListener(UDALOST_ODHLASENIA, odhlaseny);
  }, []);

  useEffect(() => setMenuOtvorene(false), [pathname]);

  if (admin === undefined) return <Nacitava />;
  if (!admin) return <Prihlasenie onPrihlaseny={setAdmin} />;

  const odhlas = async () => {
    await api.post('/odhlasenie').catch(() => undefined);
    setAdmin(null);
  };

  return (
    <PrihlasenyContext.Provider value={{ admin, nastav: setAdmin }}>
      <div className="aplikacia">
        <aside className={`bocny${menuOtvorene ? ' is-otvorene' : ''}`}>
          <div className="bocny__logo">
            <span className="bocny__znak" aria-hidden="true">
              <Ikona nazov="stit" velkost={18} />
            </span>
            <span>
              <strong>ClubW</strong>
              <small>Licenčný server</small>
            </span>
          </div>
          <nav className="bocny__menu" aria-label="Hlavné menu">
            {MENU.map((m) => (
              <NavLink key={m.odkaz} to={m.odkaz} end={m.presne} className={({ isActive }) => `bocny__odkaz${isActive ? ' is-aktivny' : ''}`}>
                <Ikona nazov={m.ikona} />
                {m.nazov}
              </NavLink>
            ))}
          </nav>
          <div className="bocny__pouzivatel">
            <NavLink to="/ucet" className={({ isActive }) => `bocny__odkaz${isActive ? ' is-aktivny' : ''}`}>
              <Ikona nazov="ucet" />
              <span className="bocny__meno">
                {admin.meno}
                <small>{admin.totp_aktivne ? 'Dvojstupňové overenie zapnuté' : 'Môj účet'}</small>
              </span>
            </NavLink>
            <button type="button" className="bocny__odkaz" onClick={odhlas}>
              <Ikona nazov="odhlasit" />
              Odhlásiť sa
            </button>
          </div>
        </aside>

        <div className="hlavna">
          <header className="horna-lista">
            <button type="button" className="ikona-tlacidlo" onClick={() => setMenuOtvorene((o) => !o)} aria-label="Menu" aria-expanded={menuOtvorene}>
              <Ikona nazov={menuOtvorene ? 'zavriet' : 'menu'} />
            </button>
            <strong>ClubW Licencie</strong>
          </header>
          {!admin.totp_aktivne && pathname !== '/ucet' && (
            <div className="upozornenie-pruh">
              <Ikona nazov="stit" velkost={16} />
              <span>
                Zapnite si dvojstupňové overenie - kto má prístup sem, vie vydávať licencie. <NavLink to="/ucet">Zapnúť v Mojom účte</NavLink>
              </span>
            </div>
          )}
          <main className="obsah">
            <Routes>
              <Route path="/" element={<Prehlad />} />
              <Route path="/licencie" element={<Licencie />} />
              <Route path="/licencie/:id" element={<LicenciaDetail />} />
              <Route path="/produkty" element={<Produkty />} />
              <Route path="/produkty/:id" element={<ProduktDetail />} />
              <Route path="/aktualizacie" element={<Aktualizacie />} />
              <Route path="/udalosti" element={<Udalosti />} />
              <Route path="/administratori" element={<Administratori />} />
              <Route path="/ucet" element={<Ucet />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </PrihlasenyContext.Provider>
  );
};

export default App;
