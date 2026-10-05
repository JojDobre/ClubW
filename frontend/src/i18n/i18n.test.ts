// Umiestnenie: frontend/src/i18n/i18n.test.ts
// Preklady administrácie: slovenčina ako kľúč, parametre a množné číslo.

import { describe, it, expect } from 'vitest';
import { jeJazyk, nacitajJazyk, tr, trn } from './index';

describe('preklady', () => {
  it('slovenčina vráti originál s dosadenými parametrami', async () => {
    await nacitajJazyk('sk');
    expect(tr('Prispôsobiť')).toBe('Prispôsobiť');
    expect(tr('Ahoj {meno}', { meno: 'Jano' })).toBe('Ahoj Jano');
    expect(['1 hlas', '3 hlasy', '5 hlasov']).toEqual([1, 3, 5].map((n) => trn(n, '{n} hlas', '{n} hlasy', '{n} hlasov')));
  });

  it('angličtina zo slovníka, neznámy text ostane', async () => {
    await nacitajJazyk('en');
    expect(tr('Prispôsobiť')).toBe('Customize');
    expect(tr('Text, ktorý v slovníku nie je')).toBe('Text, ktorý v slovníku nie je');
    expect(document.documentElement.lang).toBe('en');
    await nacitajJazyk('sk');
  });

  it('pozná podporované jazyky', () => {
    expect(['sk', 'cs', 'en', 'pl', 'de', 'es', 'fr'].every(jeJazyk)).toBe(true);
    expect(jeJazyk('hu')).toBe(false);
  });
});
