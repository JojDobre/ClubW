// Umiestnenie: backend/src/middleware/uploadMiddleware.ts
// Bezpečný upload a spracovanie fotiek hráčov a realizačného tímu.
//
// ČO SA ZMENILO OPROTI PÔVODNEJ VERZII:
// 1. Súbor sa najprv načíta do pamäte (memoryStorage) a na disk sa zapíše až
//    po overení. Pôvodne sa neoverený súbor rovno uložil na disk.
// 2. Typ súboru sa overuje podľa skutočného obsahu, nie podľa hlavičky
//    mimetype od klienta, ktorú sa dá ľubovoľne podvrhnúť.
// 3. Každý obrázok sa povinne pre-enkóduje cez sharp. Tým sa odstránia
//    prípadné vložené skripty, EXIF metadáta aj polyglot súbory.
// 4. Prípona výsledného súboru je vždy .jpg - určujeme ju my, nie používateľ.
// 5. Všetky operácie so súbormi sú asynchrónne (pôvodne blokovali event loop).

import multer from 'multer';
import path from 'path';
import fsPromises from 'fs/promises';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

// Maximálna veľkosť nahrávaného súboru
const MAX_VELKOST_SUBORU = 5 * 1024 * 1024; // 5 MB

// Povolené formáty obrázkov (kontrolujeme podľa skutočného obsahu súboru)
const POVOLENE_FORMATY = ['jpeg', 'png', 'webp'];

// Rozmery výsledného orezaného obrázka
const VYSTUPNA_VELKOST = 400;

// Ochrana pred "decompression bomb" - obrázok s obrovskými rozmermi
// by pri spracovaní vyčerpal pamäť servera
const MAX_ROZMER = 10000;

/**
 * Multer konfigurácia s uložením do pamäte.
 * Súbor sa na disk zapíše až po overení obsahu a pre-enkódovaní.
 */
const vytvorUploader = () =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_VELKOST_SUBORU,
      files: 1, // Naraz len jeden súbor
    },
    fileFilter: (_req, file, cb) => {
      // Predbežná kontrola podľa hlavičky - rýchlo odmietne zjavne zlé súbory.
      // NIE JE to bezpečnostná kontrola, tá prebieha až nad obsahom súboru.
      const povoleneHlavicky = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (povoleneHlavicky.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Nepovolený typ súboru. Povolené sú: JPEG, PNG, WebP'));
      }
    },
  });

// Uploadery pre jednotlivé typy fotiek
export const uploadPlayerPhoto = vytvorUploader();
export const uploadStaffPhoto = vytvorUploader();

/**
 * Overí, spracuje a uloží nahratý obrázok.
 * @param typ - 'players' alebo 'staff', určuje cieľový priečinok a prefix názvu
 */
const spracujObrazok = (typ: 'players' | 'staff') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Ak nebol nahratý žiadny súbor, pokračujeme ďalej
    if (!req.file || !req.file.buffer) {
      next();
      return;
    }

    try {
      // ===== KROK 1: Overenie skutočného obsahu súboru =====
      // sharp prečíta hlavičku obrázka. Ak súbor nie je platný obrázok
      // (napr. premenovaný .exe alebo PHP skript), vyhodí chybu.
      const metadata = await sharp(req.file.buffer).metadata();

      if (!metadata.format || !POVOLENE_FORMATY.includes(metadata.format)) {
        res.status(400).json({
          success: false,
          message: `Súbor nie je platný obrázok vo formáte JPEG, PNG alebo WebP (zistený formát: ${metadata.format || 'neznámy'})`,
        });
        return;
      }

      if ((metadata.width || 0) > MAX_ROZMER || (metadata.height || 0) > MAX_ROZMER) {
        res.status(400).json({
          success: false,
          message: 'Obrázok má príliš veľké rozmery (maximum 10000x10000 pixelov)',
        });
        return;
      }

      // ===== KROK 2: Príprava cieľového priečinka =====
      const cielovyPriecinok = path.join(process.cwd(), 'uploads', 'images', typ, 'temp');
      await fsPromises.mkdir(cielovyPriecinok, { recursive: true });

      // ===== KROK 3: Generovanie bezpečného názvu súboru =====
      // Názov určujeme my - pôvodný názov od používateľa vôbec nepoužívame.
      // Prípona je vždy .jpg, lebo obrázok pre-enkódujeme na JPEG.
      const casovaZnacka = Date.now();
      const nahodneCislo = Math.round(Math.random() * 1e9);
      const prefix = typ === 'players' ? 'player' : 'staff';
      const nazovSuboru = `${prefix}_${casovaZnacka}_${nahodneCislo}.jpg`;
      const cielovaCesta = path.join(cielovyPriecinok, nazovSuboru);

      // ===== KROK 4: Pre-enkódovanie a uloženie =====
      // Sharp obrázok kompletne prekreslí. Tým sa zahodí všetko okrem
      // obrazových dát - vložené skripty, EXIF údaje (vrátane GPS polohy,
      // čo je dôležité pri fotkách detí) aj polyglot konštrukcie.
      await sharp(req.file.buffer)
        .rotate() // Podľa EXIF orientácie, aby fotka nebola otočená nabok
        .resize(VYSTUPNA_VELKOST, VYSTUPNA_VELKOST, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toFile(cielovaCesta);

      // ===== KROK 5: Doplnenie údajov o súbore pre ďalší middleware =====
      // Kontrolery očakávajú req.file.path a req.file.filename,
      // pri memoryStorage ich multer nenastavuje, doplníme ich sami.
      req.file.path = cielovaCesta;
      req.file.filename = nazovSuboru;
      req.file.destination = cielovyPriecinok;
      req.file.mimetype = 'image/jpeg';

      next();
    } catch (error) {
      console.error(`Chyba pri spracovaní obrázka (${typ}):`, error);

      // Sharp vyhodí chybu aj vtedy, keď súbor vôbec nie je obrázok -
      // to je očakávaný stav pri pokuse o nahratie podvrhnutého súboru
      res.status(400).json({
        success: false,
        message: 'Súbor sa nepodarilo spracovať. Uistite sa, že ide o platný obrázok vo formáte JPEG, PNG alebo WebP.',
      });
    }
  };
};

// Exportované middleware pre jednotlivé typy fotiek
export const optimizePlayerPhoto = spracujObrazok('players');
export const optimizeStaffPhoto = spracujObrazok('staff');
