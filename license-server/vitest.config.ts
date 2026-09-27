// Umiestnenie: license-server/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Testy zdieľajú jednu databázu - bežia za sebou
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
