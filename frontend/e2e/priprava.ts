// Umiestnenie: frontend/e2e/priprava.ts
// Raz pred testami: prihlásenie správcu (token pre API a uložený stav
// prehliadača pre administráciu). Prihlasujeme sa len raz - server má
// limit pokusov o prihlásenie.

import fs from 'fs';
import { chromium, type FullConfig } from '@playwright/test';
import { API, SUBOR_PRIHLASENIA, SUBOR_STAVU_ADMINA } from './spolocne';

export default async function priprava(config: FullConfig) {
  const email = process.env.E2E_EMAIL;
  const heslo = process.env.E2E_HESLO;
  if (!email || !heslo) throw new Error('Nastavte E2E_EMAIL a E2E_HESLO (účet administrátora).');

  const baseURL = config.projects[0].use.baseURL as string;
  const prehliadac = await chromium.launch(config.projects[0].use.launchOptions);
  const stranka = await prehliadac.newPage({ baseURL });
  await stranka.goto('/prihlasenie');
  await stranka.fill('input[type=email]', email);
  await stranka.fill('input[type=password]', heslo);
  await stranka.keyboard.press('Enter');
  await stranka.waitForURL(/\/admin/, { timeout: 60_000 });
  const token = await stranka.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const hodnota = localStorage.getItem(localStorage.key(i)!) || '';
      if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(hodnota)) return hodnota;
    }
    return null;
  });
  if (!token) throw new Error('Po prihlásení sa nenašiel token');
  fs.writeFileSync(SUBOR_PRIHLASENIA, JSON.stringify({ token, api: API }));
  await stranka.context().storageState({ path: SUBOR_STAVU_ADMINA });
  await prehliadac.close();
}
