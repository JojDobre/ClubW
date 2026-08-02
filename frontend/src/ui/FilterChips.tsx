// Umiestnenie: frontend/src/ui/FilterChips.tsx
// Rýchle filtre ako tlačidlá nad tabuľkou.
//
// Návrh ich používa pri hráčoch a zápasoch — na rozdiel od rozbaľovacieho
// zoznamu je na prvý pohľad vidieť, ktoré možnosti existujú a ktorá je zvolená.

import React from 'react';
import './FilterChips.css';

export interface Chip {
  /** Hodnota filtra; prázdna znamená „všetko" */
  hodnota: string;
  popis: string;
  /** Počet záznamov — zobrazí sa za popisom */
  pocet?: number;
}

interface FilterChipsProps {
  moznosti: Chip[];
  zvolena: string;
  onZmena: (hodnota: string) => void;
  /** Popis pre čítačku obrazovky */
  popisSkupiny?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  moznosti, zvolena, onZmena, popisSkupiny = 'Filter',
}) => (
  <div className="cw-chips" role="group" aria-label={popisSkupiny}>
    {moznosti.map((m) => (
      <button
        key={m.hodnota}
        className={`cw-chips__chip ${m.hodnota === zvolena ? 'is-active' : ''}`}
        onClick={() => onZmena(m.hodnota)}
        aria-pressed={m.hodnota === zvolena}
      >
        {m.popis}
        {m.pocet !== undefined && <span className="cw-chips__pocet">{m.pocet}</span>}
      </button>
    ))}
  </div>
);

export default FilterChips;
