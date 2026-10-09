// Umiestnenie: license-server/tests/funkcie.test.ts
// Katalóg funkcií v administrácii musí poznať všetky šablóny dodané so systémom.

import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { FUNKCIE_LICENCIE, SABLONY } from '../admin/src/funkcie';

const PRIECINOK = path.resolve(__dirname, '..', '..', 'sablony');

describe('katalóg funkcií licencie', () => {
  it('obsahuje každú šablónu dodanú so systémom (okrem vždy povolenej Základnej)', () => {
    const slugy = fs
      .readdirSync(PRIECINOK)
      .filter((d) => fs.existsSync(path.join(PRIECINOK, d, 'sablona.json')))
      .filter((d) => d !== 'zakladna');
    expect(SABLONY.map((s) => s.slug).sort()).toEqual(slugy.sort());
  });

  it('kódy funkcií sú jedinečné a v tvare, ktorý web rozpozná', () => {
    const kody = FUNKCIE_LICENCIE.flatMap((s) => s.funkcie.map((f) => f.kod));
    expect(new Set(kody).size).toBe(kody.length);
    for (const k of kody) expect(k).toMatch(/^(sablony:vsetky|sablona:[a-z0-9-]+)$/);
  });
});
