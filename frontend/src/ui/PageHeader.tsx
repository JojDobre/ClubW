// Umiestnenie: frontend/src/ui/PageHeader.tsx
// Hlavička obrazovky podľa návrhu.
//
// V návrhu má KAŽDÁ obrazovka rovnakú štruktúru: nadpis a podnadpis vľavo,
// akčné tlačidlá vpravo — a to NAD obsahom, nie vnútri karty.
// Pôvodne som obsah balil do karty s titulkom, čo návrhu nezodpovedá.

import React from 'react';
import './PageHeader.css';

interface PageHeaderProps {
  nadpis: string;
  podnadpis?: string;
  /** Tlačidlá vpravo */
  akcie?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ nadpis, podnadpis, akcie }) => (
  <header className="cw-pagehead">
    <div className="cw-pagehead__text">
      <h1 className="cw-pagehead__title">{nadpis}</h1>
      {podnadpis && <p className="cw-pagehead__sub">{podnadpis}</p>}
    </div>
    {akcie && <div className="cw-pagehead__actions">{akcie}</div>}
  </header>
);

export default PageHeader;
