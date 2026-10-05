// Umiestnenie: frontend/playwright.config.ts
// Testy v prehliadači (npm run test:e2e). Bežia proti spustenému webu -
// postup je v e2e/README.md. Testy menia aktívnu šablónu, preto idú za
// sebou v jednom procese.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]] : 'list',
  globalSetup: './e2e/priprava.ts',
  outputDir: 'e2e-vysledky',
  use: {
    baseURL: process.env.E2E_URL || 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Vlastný Chromium (napr. predinštalovaný), inak ten z playwright install
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
