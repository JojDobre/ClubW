// Umiestnenie: frontend/e2e/fanusik.spec.ts
// Účet fanúšika na webe: klub pošle pozvánku, fanúšik si cez odkaz
// nastaví heslo, uvidí členskú kartu s QR kódom a výhody, odhlási sa,
// prihlási sa formulárom a usporiadateľ overí kartu z QR kódu.

import { test, expect } from '@playwright/test';
import { sledujChyby, zavolajApi } from './spolocne';

const ZNACKA = `e2e${Date.now()}`;
const EMAIL = `${ZNACKA}@test.sk`;
const HESLO = 'modra lavicka pri stadione';

let fanusikId = 0;
let vyhodaId = 0;

test.beforeAll(async () => {
  const f = (await zavolajApi('POST', '/api/fans', {
    meno: 'Eva',
    priezvisko: 'Testovacia',
    email: EMAIL,
    typ_clenstva: 'clen',
    stav: 'aktivny',
  })) as { id: number };
  fanusikId = f.id;
  const v = (await zavolajApi('POST', '/api/admin/fan-vyhody', { nazov: `Výhoda ${ZNACKA}`, kod: 'E2E10', typy_clenstva: ['clen'] })) as { id: number };
  vyhodaId = v.id;
});

test.afterAll(async () => {
  if (fanusikId) await zavolajApi('DELETE', `/api/fans/${fanusikId}`).catch(() => undefined);
  if (vyhodaId) await zavolajApi('DELETE', `/api/admin/fan-vyhody/${vyhodaId}`).catch(() => undefined);
});

test('pozvánka, karta, výhody, prihlásenie a overenie karty', async ({ browser }) => {
  const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await kontext.addInitScript(() => {
    try {
      localStorage.setItem('clubw_cookies', 'nevyhnutne');
    } catch {
      /* súkromné okno */
    }
  });
  const page = await kontext.newPage();
  const chyby = sledujChyby(page);

  // Odkaz z pozvánky (adresa webu sa v testoch môže líšiť - berieme cestu)
  const { odkaz } = (await zavolajApi('POST', `/api/admin/fans/${fanusikId}/pozvanka`)) as { odkaz: string };
  const adresa = new URL(odkaz);
  await page.goto(adresa.pathname + adresa.search);
  await page.getByLabel('Nové heslo').fill(HESLO);
  await page.getByLabel('Heslo znova').fill(HESLO);
  await page.getByRole('button', { name: 'Nastaviť heslo a prihlásiť sa' }).click();

  // Členská karta s číslom a QR kódom, výhoda pre členov
  await expect(page.locator('.mk-karta')).toContainText('Eva Testovacia');
  await expect(page.locator('.mk-karta')).toContainText(/\d{4}-\d{5}/);
  await expect(page.locator('.mk-qr svg')).toBeVisible();
  await expect(page.getByText(`Výhoda ${ZNACKA}`)).toBeVisible();
  await expect(page.getByText('E2E10')).toBeVisible();

  // Odhlásenie a prihlásenie formulárom
  await page.getByRole('button', { name: 'Odhlásiť sa' }).click();
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Heslo', { exact: true }).fill('zle heslo urcite nie');
  await page.getByRole('button', { name: 'Prihlásiť sa' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Heslo', { exact: true }).fill(HESLO);
  await page.getByRole('button', { name: 'Prihlásiť sa' }).click();
  await expect(page.locator('.mk-karta')).toBeVisible();

  // Usporiadateľ naskenuje QR kód: stránka overenia bez prihlásenia
  const profil = await page.evaluate(async () => {
    const r = await fetch('/api/fan/ja', { headers: { Authorization: `Bearer ${localStorage.getItem('clubw_fan_token')}` } });
    return (await r.json()).data as { overovaci_kod: string };
  });
  const usporiadatel = await browser.newPage();
  await usporiadatel.goto(`/overenie/${profil.overovaci_kod}`);
  await expect(usporiadatel.getByText('Platná karta')).toBeVisible();
  await expect(usporiadatel.getByText('Eva T.')).toBeVisible();
  await usporiadatel.close();

  expect(chyby, 'chyby na stránke').toEqual([]);
  await kontext.close();
});
