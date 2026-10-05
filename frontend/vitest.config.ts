// Umiestnenie: frontend/vitest.config.ts
// Jednotkové testy frontendu (npm test). Preberá aliasy z vite.config.ts,
// testy bežia v jsdom - nasimulovanom prehliadači.

import { defineConfig, mergeConfig } from 'vitest/config';
import vite from './vite.config';

export default mergeConfig(
  vite,
  defineConfig({
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
    },
  })
);
