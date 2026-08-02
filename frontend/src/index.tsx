// Umiestnenie: frontend/src/index.tsx
// Vstupný bod aplikácie.
//
// SÚBEŽNÁ PREVÁDZKA DVOCH ADMINISTRÁCIÍ: nová administrácia sa stavia
// postupne po obrazovkách. Aby klub medzitým nezostal bez použiteľného
// rozhrania, obe verzie bežia vedľa seba a rozhodne sa podľa adresy:
//
//   /admin/*, /prihlasenie   → nová administrácia (app/App.tsx)
//   všetko ostatné           → pôvodná administrácia (App.tsx)
//
// Cesty sa nekrížia — pôvodná používa /articles, /teams, /players,
// nová má všetko pod /admin. Po dokončení všetkých obrazoviek sa
// tento prepínač aj pôvodná verzia odstránia.

import React from 'react';
import ReactDOM from 'react-dom/client';

// Predpony, ktoré patria novej administrácii
const NOVE_CESTY = ['/admin', '/prihlasenie', '/zabudnute-heslo', '/obnova-hesla'];

const jeNovaAdministracia = (): boolean => {
  const cesta = window.location.pathname;
  return NOVE_CESTY.some((p) => cesta === p || cesta.startsWith(p + '/'));
};

const koren = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

/**
 * Načítanie príslušnej verzie.
 *
 * Dynamický import zabezpečí, že sa do balíka pre danú adresu nedostane
 * kód druhej verzie — nová administrácia tak nenesie starú a naopak.
 */
if (jeNovaAdministracia()) {
  void import('./app/App').then(({ default: App }) => {
    koren.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
} else {
  void Promise.all([import('./App'), import('./index.css')]).then(
    ([{ default: StaraApp }]) => {
      koren.render(
        <React.StrictMode>
          <StaraApp />
        </React.StrictMode>
      );
    }
  );
}
