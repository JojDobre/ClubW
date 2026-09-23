// Umiestnenie: frontend/vite.config.ts
// Konfigurácia Vite build nástroja - nahrádza Create React App (react-scripts)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // React plugin - zabezpečuje JSX transformáciu a Fast Refresh (hot reload)
  plugins: [react()],

  // SPA režim: neznáme cesty (napríklad /admin/clanky) vráti index.html,
  // aby ich obslúžil react-router. Bez toho by priame otvorenie adresy
  // alebo obnovenie stránky vrátilo chybu 404.
  appType: 'spa',

  resolve: {
    alias: {
      // Rozhranie jadra pre šablóny - základná šablóna ho importuje rovnako
      // ako nahraté šablóny (tie ho dostanú cez window.ClubW.jadro)
      '@clubw/jadro': path.resolve(__dirname, 'src/web/jadro.ts'),
      // Šablóny webu ležia mimo frontendu v priečinku /sablony
      '@sablony': path.resolve(__dirname, '../sablony'),
    },
  },

  server: {
    // Rovnaký port ako mal CRA setup (set PORT=3002)
    port: 3002,
    // Proxy - nahrádza "proxy": "http://localhost:3000" z package.json (CRA)
    // Požiadavky na /api a /uploads sa presmerujú na backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Súbory šablón (štýl, skript, náhľad) servuje backend
      '/sablony': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      input: {
        // Hlavná aplikácia
        main: 'index.html',
        // Kontrolná obrazovka prvkov rozhrania (/ui-kit.html)
        uiKit: 'ui-kit.html',
      },
    },
    // Výstupný priečinok buildu (rovnaký ako CRA, aby fungovali existujúce deploy skripty)
    outDir: 'build',
    // Sourcemapy pre jednoduchšie debugovanie produkčných chýb
    sourcemap: true,
  },
});
