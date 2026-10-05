// Umiestnenie: frontend/e2e/administracia.spec.ts
// Obrazovky administrácie sa otvoria bez chyby a s obsahom; okno
// Prispôsobiť šablónu je preložené do jazyka používateľa.

import { test, expect } from '@playwright/test';
import { SUBOR_STAVU_ADMINA, sledujChyby, zavolajApi } from './spolocne';

const OBRAZOVKY = [
  '', 'clanky', 'clanky/novy', 'kategorie', 'stranky', 'galerie', 'komentare', 'videa', 'timy', 'hraci', 'realizacny-tim',
  'ligy', 'turnaje', 'zapasy', 'kalendar', 'sezony', 'stadiony', 'sponzori', 'eshop/objednavky', 'eshop/produkty',
  'eshop/doprava-platba', 'dokumenty', 'formulare', 'media', 'menu', 'sablony', 'ankety', 'fanusikovia', 'vyhody-clenov', 'pouzivatelia',
  'nastavenia', 'ochrana-udajov', 'archiv', 'logy', 'profil',
];

test.use({ storageState: SUBOR_STAVU_ADMINA });

test('obrazovky administrácie', async ({ page }) => {
  const chyby = sledujChyby(page);
  for (const obrazovka of OBRAZOVKY) {
    await page.goto(`/admin/${obrazovka}`);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    // Obsah obrazovky sa vykreslil (editor článku nemá nadpis, len políčko názvu)
    await expect(page.locator('main').first(), `/admin/${obrazovka}: prázdna obrazovka`).toContainText(/\p{L}{3}/u);
    await expect(page.locator('.cw-skeleton'), `/admin/${obrazovka}: načítava sa príliš dlho`).toHaveCount(0);
    await expect(page.locator('.cw-error-state'), `/admin/${obrazovka}: chyba načítania`).toHaveCount(0);
  }
  expect(chyby).toEqual([]);
});

test('nastavenia šablóny v angličtine', async ({ page }) => {
  await zavolajApi('PUT', '/api/auth/profil', { jazyk: 'en' });
  try {
    await page.goto('/admin/sablony');
    await page.getByRole('button', { name: /Customize/ }).first().click();
    await expect(page.getByText('Colours and font').first()).toBeVisible();
    await expect(page.getByText('Farby a písmo')).toHaveCount(0);
  } finally {
    await zavolajApi('PUT', '/api/auth/profil', { jazyk: null });
  }
});
