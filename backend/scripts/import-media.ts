// Umiestnenie: backend/scripts/import-media.ts
//
// IMPORT EXISTUJÚCICH SÚBOROV DO MEDIA KNIŽNICE
//
// PREČO EXISTUJE: knižnica vznikla až teraz, takže súbory nahraté
// predtým (obrázky článkov, fotky hráčov, galérie) na disku síce sú,
// ale v databáze o nich niet záznamu - v knižnici by sa nezobrazili
// a nedali by sa znovu použiť.
//
// Skript prejde priečinok uploads, nájde súbory, ktoré v knižnici
// chýbajú, a doplní ich. SÚBORY NEPRESÚVA ani nepremenúva - staré
// cesty zostávajú platné, takže sa nerozbijú odkazy v článkoch.
//
// Spustenie:
//   cd backend
//   npm run import-media
//
// Skript sa dá spustiť opakovane; už zaevidované súbory preskočí.

import path from 'path';
import fsPromises from 'fs/promises';
import sharp from 'sharp';
import sequelize from '../src/config/database';
import Media from '../src/models/Media';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/** Prípony, ktoré berieme ako obrázok. */
const OBRAZKY = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/** Prípony dokumentov a ich typ obsahu. */
const DOKUMENTY: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

const MIME_OBRAZKOV: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

interface Najdeny {
  absolutna: string;
  webova: string;
  pripona: string;
}

/** Rekurzívne prejde priečinok a vráti všetky súbory. */
const prejdiPriecinok = async (priecinok: string): Promise<Najdeny[]> => {
  const najdene: Najdeny[] = [];

  let polozky;
  try {
    polozky = await fsPromises.readdir(priecinok, { withFileTypes: true });
  } catch {
    return najdene;
  }

  for (const polozka of polozky) {
    const absolutna = path.join(priecinok, polozka.name);

    if (polozka.isDirectory()) {
      najdene.push(...(await prejdiPriecinok(absolutna)));
      continue;
    }

    // Náhľady generované pre galérie nie sú samostatné súbory knižnice
    if (/_thumb_\d+\./.test(polozka.name)) continue;

    const pripona = path.extname(polozka.name).toLowerCase();
    if (!OBRAZKY.includes(pripona) && !DOKUMENTY[pripona]) continue;

    const relativna = path.relative(UPLOADS_ROOT, absolutna).split(path.sep).join('/');
    najdene.push({ absolutna, webova: `/uploads/${relativna}`, pripona });
  }

  return najdene;
};

const spusti = async (): Promise<void> => {
  console.log('═══════════════════════════════════════');
  console.log('  Import súborov do media knižnice');
  console.log('═══════════════════════════════════════\n');

  await sequelize.authenticate();

  const subory = await prejdiPriecinok(UPLOADS_ROOT);
  console.log(`Na disku nájdených súborov: ${subory.length}`);

  if (subory.length === 0) {
    console.log('\nPriečinok uploads je prázdny - nie je čo importovať.');
    await sequelize.close();
    return;
  }

  // Jedným dotazom zistíme, čo už v knižnici je
  const uzEvidovane = new Set(
    (await Media.findAll({ attributes: ['cesta'] })).map((m) => m.cesta)
  );

  let pridane = 0;
  let preskocene = 0;
  let chybne = 0;

  for (const subor of subory) {
    if (uzEvidovane.has(subor.webova)) {
      preskocene++;
      continue;
    }

    try {
      const info = await fsPromises.stat(subor.absolutna);
      const jeObrazok = OBRAZKY.includes(subor.pripona);

      let sirka: number | null = null;
      let vyska: number | null = null;

      if (jeObrazok) {
        try {
          const meta = await sharp(subor.absolutna).metadata();
          sirka = meta.width ?? null;
          vyska = meta.height ?? null;
        } catch {
          // Poškodený obrázok zaevidujeme bez rozmerov
        }
      }

      const nazov = path.basename(subor.absolutna, subor.pripona);

      await Media.create({
        nazov: nazov.slice(0, 200),
        originalny_nazov: path.basename(subor.absolutna).slice(0, 255),
        cesta: subor.webova,
        typ: jeObrazok ? 'obrazok' : 'dokument',
        mime_typ: jeObrazok
          ? MIME_OBRAZKOV[subor.pripona] || 'image/jpeg'
          : DOKUMENTY[subor.pripona],
        velkost: info.size,
        sirka,
        vyska,
        // Autora spätne nezistíme - súbory vznikli pred knižnicou
        autor_id: null,
      });

      pridane++;
    } catch (chyba) {
      chybne++;
      console.error(`  ✗ ${subor.webova}: ${(chyba as Error).message}`);
    }
  }

  console.log('\n───────────────────────────────────────');
  console.log(`  Pridaných do knižnice: ${pridane}`);
  console.log(`  Už evidovaných:        ${preskocene}`);
  if (chybne > 0) console.log(`  Chybných:              ${chybne}`);
  console.log('───────────────────────────────────────');
  console.log('\nSúbory sa NEPRESÚVALI - pôvodné cesty zostávajú platné.');

  await sequelize.close();
};

spusti().catch(async (chyba) => {
  console.error('\n❌ Import zlyhal:', chyba);
  await sequelize.close();
  process.exit(1);
});
