// Umiestnenie: frontend/src/layout/BottomNav.tsx
// Spodná navigácia pre mobil.
//
// Obsahuje len najčastejšie obrazovky — zvyšok je dostupný cez vysúvacie
// menu. Viac ako päť položiek sa na šírku telefónu zmysluplne nezmestí.

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../ui';
import { MOBILNA_NAVIGACIA, jeAktivna } from '../app/navigacia';
import { tr } from '../i18n';
import './BottomNav.css';

interface BottomNavProps {
  aktualnaCesta: string;
  onOtvorMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ aktualnaCesta, onOtvorMenu }) => (
  <nav className="cw-bottomnav" aria-label={tr('Rýchla navigácia')}>
    {MOBILNA_NAVIGACIA.map((polozka) => (
      <NavLink
        key={polozka.cesta}
        to={polozka.cesta}
        className={
          jeAktivna(polozka.cesta, aktualnaCesta)
            ? 'cw-bottomnav__item is-active'
            : 'cw-bottomnav__item'
        }
      >
        <Icon nazov={polozka.ikona} velkost={19} />
        <span>{polozka.popis}</span>
      </NavLink>
    ))}

    {/* Posledná položka otvára plné menu */}
    <button className="cw-bottomnav__item" onClick={onOtvorMenu}>
      <Icon nazov="menu" velkost={19} />
      <span>{tr('Viac')}</span>
    </button>
  </nav>
);

export default BottomNav;
