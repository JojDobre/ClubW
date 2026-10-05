// Umiestnenie: frontend/e2e/sablony.spec.ts
// Každá vstavaná šablóna: hlavné stránky webu na počítači aj na mobile
// sa načítajú bez chyby, majú obsah, nepretekajú do strán a tabuľky
// súťaží ukazujú body aj pri veľmi dlhom názve tímu (demo dáta).

import { test, expect } from '@playwright/test';
import { skontrolujRozlozenie, sledujChyby, vstavaneSablony, zavolajApi } from './spolocne';

const STRANKY = ['/', '/clanky', '/leagues', '/leagues/1', '/matches', '/teams', '/calendar', '/galleries', '/videa', '/sponzori', '/hladat?q=dolina', '/registracia', '/neexistujuca-stranka-e2e'];
const ZARIADENIA = [
  { nazov: 'počítač', viewport: { width: 1440, height: 900 }, isMobile: false },
  { nazov: 'mobil', viewport: { width: 390, height: 844 }, isMobile: true },
];

let povodna = 'klubova';

test.beforeAll(async () => {
  const sablony = (await zavolajApi('GET', '/api/admin/sablony')) as Array<{ slug: string; aktivna: boolean }>;
  povodna = sablony.find((s) => s.aktivna)?.slug ?? povodna;
});
test.afterAll(async () => {
  await zavolajApi('PUT', '/api/admin/sablony/aktivna', { slug: povodna });
});

for (const slug of vstavaneSablony()) {
  test(`šablóna ${slug}`, async ({ browser }) => {
    await zavolajApi('PUT', '/api/admin/sablony/aktivna', { slug });
    for (const zariadenie of ZARIADENIA) {
      const kontext = await browser.newContext({ viewport: zariadenie.viewport, isMobile: zariadenie.isMobile, hasTouch: zariadenie.isMobile });
      // Lišta súhlasu s cookies by prekrývala obsah
      await kontext.addInitScript(() => {
        try {
          localStorage.setItem('clubw_cookies', 'nevyhnutne');
        } catch {
          /* súkromné okno */
        }
      });
      const page = await kontext.newPage();
      const chyby = sledujChyby(page);
      for (const cesta of STRANKY) {
        const popis = `${slug} ${zariadenie.nazov} ${cesta}`;
        await page.goto(cesta);
        await page.waitForLoadState('networkidle').catch(() => undefined);
        await expect(page.locator('.web-chyba'), `${popis}: chybová obrazovka`).toHaveCount(0);
        const text = await page.locator('#root').innerText();
        expect(text.trim().length, `${popis}: prázdna stránka`).toBeGreaterThan(40);
        await skontrolujRozlozenie(page, popis);
      }
      expect(chyby, `${slug} ${zariadenie.nazov}: chyby na stránkach`).toEqual([]);
      await kontext.close();
    }
  });
}
