// Umiestnenie: backend/src/routes/upload.ts
// Routes pre nahrávanie fotiek hráčov a realizačného tímu.
//
// ČO SA ZMENILO OPROTI PÔVODNEJ VERZII:
// 1. tim_id z tela požiadavky sa validuje ako celé číslo PREDTÝM, než sa
//    použije v ceste k priečinku. Pôvodne šlo priamo do path.join, takže
//    hodnota "../../../etc" umožňovala zápis súboru mimo priečinka uploads.
// 2. Všetky operácie so súbormi sú asynchrónne (pôvodne blokovali event loop).
// 3. Cesty vychádzajú z process.cwd(), rovnako ako static serving v index.ts.
// 4. Odstránený debug endpoint /test-avatar, ktorý vypisoval cestu na serveri.

import { Router, Request, Response } from 'express';
import {
  uploadStaffPhoto,
  optimizePlayerPhoto,
  optimizeStaffPhoto,
  uploadPlayerPhoto,
} from '../middleware/uploadMiddleware';
import path from 'path';
import fsPromises from 'fs/promises';
// Auth middleware - ochrana zápisových operácií pred neprihlásenými používateľmi
import { authenticateToken, requireEditor } from '../middleware/auth';

const router = Router();

// Základný priečinok pre nahraté súbory
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/**
 * Overí, že hodnota je kladné celé číslo, a vráti ju ako reťazec.
 * Slúži ako ochrana pred path traversal - do názvu priečinka sa nikdy
 * nedostane nič iné ako číslice.
 *
 * @param hodnota - surová hodnota z req.body
 * @returns reťazec s číslom, alebo null ak hodnota nie je platné ID
 */
const overIdPriecinka = (hodnota: unknown): string | null => {
  const cislo = Number(hodnota);
  if (!Number.isInteger(cislo) || cislo <= 0) {
    return null;
  }
  return String(cislo);
};

/**
 * Bezpečne zmaže súbor, ak existuje. Chyby ignoruje - používa sa pri upratovaní.
 */
const zmazSuborAkExistuje = async (cesta: string | undefined): Promise<void> => {
  if (!cesta) return;
  try {
    await fsPromises.unlink(cesta);
  } catch {
    // Súbor už neexistuje alebo sa nedá zmazať - pri upratovaní to nevadí
  }
};

/**
 * Presunie spracovaný súbor z dočasného priečinka do finálneho.
 * @returns relatívna cesta k súboru pre uloženie do databázy
 */
const presunDoFinalnehoPriecinka = async (
  docasnaCesta: string,
  nazovSuboru: string,
  podpriecinok: string,
  idPriecinka: string
): Promise<string> => {
  const finalnyPriecinok = path.join(UPLOADS_ROOT, 'images', podpriecinok, idPriecinka);
  await fsPromises.mkdir(finalnyPriecinok, { recursive: true });

  const finalnaCesta = path.join(finalnyPriecinok, nazovSuboru);

  // Poistka: overíme, že výsledná cesta naozaj leží vnútri priečinka uploads.
  // Aj keby sa niekedy do premenných dostala neočakávaná hodnota,
  // súbor sa nezapíše mimo povoleného priestoru.
  const normalizovana = path.resolve(finalnaCesta);
  if (!normalizovana.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) {
    throw new Error('Neplatná cieľová cesta súboru');
  }

  await fsPromises.rename(docasnaCesta, finalnaCesta);

  return `/uploads/images/${podpriecinok}/${idPriecinka}/${nazovSuboru}`;
};

/**
 * @route POST /api/upload/player-photo
 * @desc Nahratie fotky hráča
 * @access Private (Admin/Redaktor)
 */
router.post(
  '/player-photo',
  authenticateToken,
  requireEditor,
  uploadPlayerPhoto.single('photo'),
  optimizePlayerPhoto,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Žiadny súbor nebol nahraný',
        });
      }

      // Validácia tim_id PRED použitím v ceste - ochrana pred path traversal
      const idTimu = overIdPriecinka(req.body.tim_id);
      if (!idTimu) {
        await zmazSuborAkExistuje(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Tím ID je povinný a musí byť kladné celé číslo',
        });
      }

      const relativnaCesta = await presunDoFinalnehoPriecinka(
        req.file.path,
        req.file.filename,
        'players',
        idTimu
      );

      res.json({
        success: true,
        message: 'Fotka hráča bola úspešne nahraná',
        data: {
          filename: req.file.filename,
          path: relativnaCesta,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error('Chyba pri nahrávaní fotky hráča:', error);

      // Upratanie dočasného súboru pri chybe
      await zmazSuborAkExistuje(req.file?.path);

      res.status(500).json({
        success: false,
        message: 'Chyba servera pri nahrávaní fotky',
      });
    }
  }
);

/**
 * @route POST /api/upload/staff-photo
 * @desc Nahratie fotky člena realizačného tímu
 * @access Private (Admin/Redaktor)
 */
router.post(
  '/staff-photo',
  authenticateToken,
  requireEditor,
  uploadStaffPhoto.single('photo'),
  optimizeStaffPhoto,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Žiadny súbor nebol nahraný',
        });
      }

      // Pri realizačnom tíme je tim_id voliteľné - členovia môžu patriť celému klubu.
      // Ak je zadané, musí byť platné číslo; inak použijeme priečinok 'club'.
      const surovyIdTimu = req.body.tim_id;
      let priecinokTimu: string;

      if (surovyIdTimu === undefined || surovyIdTimu === null || surovyIdTimu === '' || surovyIdTimu === '0') {
        priecinokTimu = 'club';
      } else {
        const overeny = overIdPriecinka(surovyIdTimu);
        if (!overeny) {
          await zmazSuborAkExistuje(req.file.path);
          return res.status(400).json({
            success: false,
            message: 'Tím ID musí byť kladné celé číslo alebo prázdne',
          });
        }
        priecinokTimu = overeny;
      }

      const relativnaCesta = await presunDoFinalnehoPriecinka(
        req.file.path,
        req.file.filename,
        'staff',
        priecinokTimu
      );

      res.json({
        success: true,
        message: 'Fotka člena realizačného tímu bola úspešne nahraná',
        data: {
          filename: req.file.filename,
          path: relativnaCesta,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error('Chyba pri nahrávaní fotky realizačného tímu:', error);

      await zmazSuborAkExistuje(req.file?.path);

      res.status(500).json({
        success: false,
        message: 'Chyba servera pri nahrávaní fotky',
      });
    }
  }
);

export default router;
