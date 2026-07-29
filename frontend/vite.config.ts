// Umiestnenie: frontend/vite.config.ts
// Konfigurácia Vite build nástroja - nahrádza Create React App (react-scripts)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // React plugin - zabezpečuje JSX transformáciu a Fast Refresh (hot reload)
  plugins: [react()],

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
    },
  },

  build: {
    // Výstupný priečinok buildu (rovnaký ako CRA, aby fungovali existujúce deploy skripty)
    outDir: 'build',
    // Sourcemapy pre jednoduchšie debugovanie produkčných chýb
    sourcemap: true,
  },
});
