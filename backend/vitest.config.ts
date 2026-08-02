// Umiestnenie: backend/vitest.config.ts
// Konfigurácia testovacieho behu.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Testy bežia v prostredí Node, nie v prehliadači
    environment: 'node',
    // Kde hľadať testy
    include: ['tests/**/*.test.ts'],
    // Integračné testy pracujú s jednou databázou, preto ich nespúšťame
    // súbežne - inak by si navzájom prepisovali dáta
    fileParallelism: false,
    // Integračné testy potrebujú čas na pripojenie k databáze
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      // Do pokrytia nezahŕňame konfiguráciu, migrácie ani pomocné skripty
      exclude: ['tests/**', 'dist/**', 'migrations/**', 'scripts/**', '*.config.ts'],
    },
  },
});
