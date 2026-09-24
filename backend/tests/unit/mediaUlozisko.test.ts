// Umiestnenie: backend/tests/unit/mediaUlozisko.test.ts
// Uloženie obrázka do knižnice médií - priehľadné PNG (erby, logá
// partnerov) musia ostať priehľadné, ostatné obrázky sa ukladajú ako JPG.

import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { describe, it, expect, afterAll, vi } from 'vitest';

// Priečinok uploads sa určuje pri načítaní modulu podľa pracovného priečinka
const koren = fs.mkdtempSync(path.join(os.tmpdir(), 'clubw-media-'));
vi.spyOn(process, 'cwd').mockReturnValue(koren);
const { ulozMedium } = await import('../../src/utils/mediaUlozisko');

const obrazok = (alfa: number) =>
  sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 11, g: 110, b: 79, alpha: alfa } } })
    .png()
    .toBuffer();

afterAll(() => fs.rmSync(koren, { recursive: true, force: true }));

describe('ulozMedium', () => {
  it('priehľadné PNG ostane PNG s priehľadnosťou', async () => {
    const ulozeny = await ulozMedium(await obrazok(0), 'erb.png');
    expect(ulozeny.cesta).toMatch(/\.png$/);
    expect(ulozeny.mimeTyp).toBe('image/png');
    const meta = await sharp(path.join(koren, ulozeny.cesta)).metadata();
    expect(meta.format).toBe('png');
    expect(meta.hasAlpha).toBe(true);
  });

  it('fotka bez priehľadnosti sa uloží ako JPG', async () => {
    const jpg = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#0b6e4f' } }).jpeg().toBuffer();
    const ulozeny = await ulozMedium(jpg, 'fotka.jpg');
    expect(ulozeny.cesta).toMatch(/\.jpg$/);
    expect(ulozeny.mimeTyp).toBe('image/jpeg');
  });
});
