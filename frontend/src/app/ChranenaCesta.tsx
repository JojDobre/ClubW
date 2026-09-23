// Umiestnenie: frontend/src/app/ChranenaCesta.tsx
// Ochrana ciest, ktoré vyžadujú prihlásenie.

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type Rola } from './AuthContext';

interface ChranenaCestaProps {
  children: React.ReactNode;
  /** Ak je uvedené, prístup majú len tieto role */
  role?: Rola[];
  /** Ak je uvedené, prístup má ten, koho rola smie modul čítať */
  modul?: string;
}

export const ChranenaCesta: React.FC<ChranenaCestaProps> = ({ children, role, modul }) => {
  const { prihlaseny, nacitava, pouzivatel, smie } = useAuth();
  const location = useLocation();

  // Kým prebieha overenie uloženej relácie, nesmieme presmerovať —
  // inak by sa prihlásený používateľ pri obnovení stránky vždy
  // na okamih ocitol na prihlasovacej obrazovke
  if (nacitava) {
    return (
      <div className="cw-boot">
        <div className="cw-boot__spinner" aria-label="Načítava sa" />
      </div>
    );
  }

  if (!prihlaseny) {
    // Zapamätáme si, kam chcel používateľ ísť, a po prihlásení ho
    // tam pošleme namiesto úvodnej obrazovky
    return <Navigate to="/prihlasenie" state={{ odkial: location.pathname }} replace />;
  }

  if (modul && pouzivatel) {
    if (!smie(modul)) return <Navigate to="/admin" replace />;
  } else if (role && pouzivatel && !role.includes(pouzivatel.rola)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ChranenaCesta;
