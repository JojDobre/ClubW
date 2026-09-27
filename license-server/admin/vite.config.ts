// Umiestnenie: license-server/admin/vite.config.ts
// Webová administrácia licenčného servera. Pri vývoji beží na porte 5299
// a požiadavky /api posiela na licenčný server (3001).

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5299,
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
});
