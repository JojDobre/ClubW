// Umiestnenie: frontend/src/index.tsx
// Vstupný bod aplikácie.
//
// Podľa adresy sa načíta jedna z dvoch aplikácií:
//
//   /admin/*, /prihlasenie...  → administrácia (app/App.tsx)
//   všetko ostatné             → verejný web v aktívnej šablóne (web/WebApp.tsx)

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
 * Dynamický import zabezpečí, že návštevník webu nesťahuje kód
 * administrácie a naopak.
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
  void import('./web/WebApp').then(({ default: WebApp }) => {
    koren.render(
      <React.StrictMode>
        <WebApp />
      </React.StrictMode>
    );
  });
}
