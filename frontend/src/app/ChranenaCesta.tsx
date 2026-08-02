// Umiestnenie: frontend/src/app/ChranenaCesta.tsx
// Ochrana ciest, ktoré vyžadujú prihlásenie.

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type Rola } from './AuthContext';

interface ChranenaCestaProps {
  children: React.ReactNode;
  /** Ak je uvedené, prístup majú len tieto role */
  role?: Rola[];
}

export const ChranenaCesta: React.FC<ChranenaCestaProps> = ({ children, role }) => {
  const { prihlaseny, nacitava, pouzivatel } = useAuth();
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

  if (role && pouzivatel && !role.includes(pouzivatel.rola)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ChranenaCesta;
