// backend/src/controllers/galeriaObrazokController.ts
// Controller pre správu obrázkov v galérii - FÁZA 7

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Galeria, GaleriaObrazok } from '../models';
import Media from '../models/Media';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// ===== MULTER CONFIGURATION =====

// Konfigurácia úložiska súborov
// ===== BEZPECNE NAHRAVANIE =====
//
// Subor ide najprv do PAMATE a na disk sa zapise az po overeni obsahu.
//
// Povodna verzia pouzivala diskStorage: neovereny subor sa rovno zapisal
// na disk, typ sa veril podla hlavicky "mimetype" od klienta (ktoru sa da
// lubovolne podvrhnut) a pripona sa preberala z povodneho nazvu. Do
// priecinka uploads sa tak dal ulozit subor s lubovolnou priponou.
// Fotky hracov aj media kniznica uz robia to iste bezpecne - tu to bolo
// jedine miesto, kde to este platilo.

export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Max 10MB na subor
    files: 20,
  },
}).array('images', 20);

// ===== HELPER FUNCTIONS =====

/**
 * Uloží obrázok galérie aj s náhľadmi.
 *
 * Postup je rovnaký ako v media knižnici: obsah sa overí cez sharp
 * (nie podľa hlavičky od klienta), obrázok sa pre-enkóduje, čím sa
 * odstránia vložené skripty aj EXIF, a príponu určujeme my.
 *
 * Cesta je /uploads/galerie/<rok>/<slug-galérie>/ podľa požiadavky.
 *
 * @param buffer - obsah nahratého súboru
 * @param povodnyNazov - názov súboru u používateľa
 * @param slugGalerie - slug galérie, tvorí priečinok
 * @returns cesty a rozmery pre zápis do databázy
 */
const ulozObrazokGalerie = async (
  buffer: Buffer,
  povodnyNazov: string,
  slugGalerie: string
): Promise<{
  cesta: string;
  nahladMaly: string;
  nahladStredny: string;
  sirka: number | null;
  vyska: number | null;
  velkost: number;
}> => {
  // Overenie podľa skutočného obsahu - neplatný obrázok tu vyhodí chybu
  const metadata = await sharp(buffer).metadata();
  const POVOLENE = ['jpeg', 'png', 'webp', 'gif'];

  if (!metadata.format || !POVOLENE.includes(metadata.format)) {
    throw new Error('Súbor nie je podporovaný obrázok (JPEG, PNG, WebP, GIF)');
  }

  if ((metadata.width || 0) > 10000 || (metadata.height || 0) > 10000) {
    throw new Error('Obrázok je príliš veľký (maximum 10000×10000 bodov)');
  }

  const rok = String(new Date().getFullYear());
  const bezpecnySlug = (slugGalerie || 'galeria').replace(/[^a-z0-9-]/gi, '').slice(0, 80) || 'galeria';
  const priecinok = path.join(process.cwd(), 'uploads', 'galerie', rok, bezpecnySlug);

  await fs.mkdir(priecinok, { recursive: true });

  // Poistka proti path traversal - výsledok musí ležať v uploads
  const koren = path.resolve(process.cwd(), 'uploads');
  if (!path.resolve(priecinok).startsWith(koren + path.sep)) {
    throw new Error('Neplatná cieľová cesta súboru');
  }

  const zaklad = path
    .basename(povodnyNazov, path.extname(povodnyNazov))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'obrazok';

  const odlisovac = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const nazovSuboru = `${zaklad}-${odlisovac}.jpg`;

  const hlavny = path.join(priecinok, nazovSuboru);
  const maly = path.join(priecinok, `${zaklad}-${odlisovac}_thumb_150.jpg`);
  const stredny = path.join(priecinok, `${zaklad}-${odlisovac}_thumb_400.jpg`);

  // Pre-enkódovanie hlavného obrázka
  const vystup = await sharp(buffer).rotate().jpeg({ quality: 88 }).toBuffer();
  await fs.writeFile(hlavny, vystup);

  await sharp(buffer).rotate().resize(150, 150, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 80 }).toFile(maly);
  await sharp(buffer).rotate().resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 }).toFile(stredny);

  const finalne = await sharp(vystup).metadata();
  const naWeb = (p: string) => '/' + path.relative(path.join(process.cwd(), 'uploads'), p).replace(/\\/g, '/');

  return {
    cesta: `/uploads${naWeb(hlavny)}`,
    nahladMaly: `/uploads${naWeb(maly)}`,
    nahladStredny: `/uploads${naWeb(stredny)}`,
    sirka: finalne.width ?? null,
    vyska: finalne.height ?? null,
    velkost: vystup.length,
  };
};

export const uploadGalleryImages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const galeriaId = parseInt(id, 10);

    if (isNaN(galeriaId)) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID galérie'
      });
    }

    // Overenie existencie galérie
    const galeria = await Galeria.findByPk(galeriaId);
    if (!galeria || !galeria.aktivity) {
      return res.status(404).json({
        success: false,
        message: 'Galéria nenájdená'
      });
    }

    // Overenie upload súborov
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Neboli nahrané žiadne súbory'
      });
    }

    console.log(`📤 Nahrávam ${files.length} obrázkov do galérie "${galeria.nazov}"`);

    // Získanie aktuálneho počtu obrázkov pre poradie
    const existingCount = await GaleriaObrazok.count({
      where: { galeria_id: galeriaId, aktivity: true }
    });

    const uploadedImages = [];
    const errors = [];

    // Spracovanie každého súboru
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        console.log(`📸 Spracovávam obrázok ${i + 1}/${files.length}: ${file.originalname}`);

        // Uloženie aj s náhľadmi; obsah sa overí vnútri
        const ulozeny = await ulozObrazokGalerie(file.buffer, file.originalname, galeria.slug);

        // Prvý obrázok galérie sa automaticky stane titulným.
        // Požiadavka hovorí „titulný obrázok (dá sa aj automaticky
        // z galérie)" - dovtedy sa musel označiť ručne.
        const jePrvy = existingCount === 0 && i === 0;

        const obrazok = await GaleriaObrazok.create({
          galeria_id: galeriaId,
          nazov: null, // Názov sa môže pridať neskôr
          popis: null,
          cesta_suboru: ulozeny.cesta,
          originalny_nazov: file.originalname,
          velkost_suboru: ulozeny.velkost,
          mime_typ: 'image/jpeg',
          sirka: ulozeny.sirka,
          vyska: ulozeny.vyska,
          nahladovy_maly: ulozeny.nahladMaly,
          nahladovy_stredny: ulozeny.nahladStredny,
          poradie: existingCount + i + 1,
          je_nahladovy: jePrvy
        });

        // Titulný obrázok galérie držíme aj na galérii, aby sa nemusel
        // dohľadávať pri každom výpise
        if (jePrvy) {
          await galeria.update({ nahladovy_obrazok: ulozeny.nahladStredny });
        }

        uploadedImages.push(obrazok.toJSON());
        console.log(`✅ Obrázok ${i + 1} úspešne spracovaný (ID: ${obrazok.id})`);
        
      } catch (error: any) {
        console.error(`❌ Chyba pri spracovaní obrázka ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
        
        // Súbor sa na disk nikdy nedostal (spracúva sa z pamäte),
        // takže tu nie je čo upratovať.
      }
    }

    // Aktualizácia počtu obrázkov v galérii
    const newCount = await GaleriaObrazok.count({
      where: { galeria_id: galeriaId, aktivity: true }
    });
    
    await galeria.update({ pocet_obrazkov: newCount });

    // Nastavenie náhľadového obrázka galérie ak ešte nie je nastavený
    if (!galeria.nahladovy_obrazok && uploadedImages.length > 0) {
      const firstImage = uploadedImages[0] as any; // Type assertion pre toJSON() výsledok
      await galeria.update({ 
        nahladovy_obrazok: firstImage.nahladovy_maly || firstImage.cesta_suboru 
      });
    }

    res.status(201).json({
      success: true,
      data: {
        galeria_id: galeriaId,
        uploaded_images: uploadedImages,
        uploaded_count: uploadedImages.length,
        errors: errors.length > 0 ? errors : undefined,
        total_images: newCount
      },
      message: `Úspešne nahraných ${uploadedImages.length} obrázkov${errors.length > 0 ? ` (${errors.length} chýb)` : ''}`
    });

  } catch (error: any) {
    console.error('Chyba pri upload obrázkov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri upload obrázkov',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/admin/galleries/:id/images - Získanie obrázkov galérie pre admin
export const getGalleryImages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const galeriaId = parseInt(id, 10);

    if (isNaN(galeriaId)) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID galérie'
      });
    }

    // Validácia paginácie
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Overenie existencie galérie
    const galeria = await Galeria.findByPk(galeriaId);
    if (!galeria) {
      return res.status(404).json({
        success: false,
        message: 'Galéria nenájdená'
      });
    }

    // Získanie obrázkov s pagináciou
    const { count, rows: obrazky } = await GaleriaObrazok.findAndCountAll({
      where: { 
        galeria_id: galeriaId,
        aktivity: true 
      },
      order: [['poradie', 'ASC'], ['vytvoreny', 'ASC']],
      limit: limitNum,
      offset
    });

    res.json({
      success: true,
      data: {
        galeria: {
          id: galeria.id,
          nazov: galeria.nazov,
          pocet_obrazkov: galeria.pocet_obrazkov
        },
        obrazky: obrazky.map(o => o.toJSON()),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          pages: Math.ceil(count / limitNum),
          hasNext: offset + limitNum < count,
          hasPrev: pageNum > 1
        }
      },
      message: `Načítaných ${obrazky.length} obrázkov`
    });

  } catch (error: any) {
    console.error('Chyba pri načítaní obrázkov galérie:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní obrázkov',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// PUT /api/admin/galleries/:galleryId/images/:imageId - Aktualizácia obrázka
export const updateGalleryImage = async (req: Request, res: Response) => {
  try {
    const { galleryId, imageId } = req.params;
    const { nazov, popis, je_nahladovy } = req.body;
    
    const galeriaId = parseInt(galleryId, 10);
    const obrazokId = parseInt(imageId, 10);

    if (isNaN(galeriaId) || isNaN(obrazokId)) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID galérie alebo obrázka'
      });
    }

    // Nájdenie obrázka
    const obrazok = await GaleriaObrazok.findOne({
      where: { 
        id: obrazokId,
        galeria_id: galeriaId,
        aktivity: true 
      }
    });

    if (!obrazok) {
      return res.status(404).json({
        success: false,
        message: 'Obrázok nenájdený'
      });
    }

    // Ak sa nastavuje ako náhľadový, zruš predchádzajúci náhľadový
    if (je_nahladovy === true) {
      await GaleriaObrazok.update(
        { je_nahladovy: false },
        { where: { galeria_id: galeriaId, aktivity: true } }
      );
    }

    // Aktualizácia obrázka
    const updateData: any = {};
    if (nazov !== undefined) updateData.nazov = nazov || null;
    if (popis !== undefined) updateData.popis = popis || null;
    if (je_nahladovy !== undefined) updateData.je_nahladovy = Boolean(je_nahladovy);

    await obrazok.update(updateData);

    res.json({
      success: true,
      data: { obrazok: obrazok.toJSON() },
      message: 'Obrázok úspešne aktualizovaný'
    });

  } catch (error: any) {
    console.error('Chyba pri aktualizácii obrázka:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii obrázka',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// DELETE /api/admin/galleries/:galleryId/images/:imageId - Vymazanie obrázka
export const deleteGalleryImage = async (req: Request, res: Response) => {
  try {
    const { galleryId, imageId } = req.params;
    const galeriaId = parseInt(galleryId, 10);
    const obrazokId = parseInt(imageId, 10);

    if (isNaN(galeriaId) || isNaN(obrazokId)) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID galérie alebo obrázka'
      });
    }

    // Nájdenie obrázka
    const obrazok = await GaleriaObrazok.findOne({
      where: { 
        id: obrazokId,
        galeria_id: galeriaId,
        aktivity: true 
      }
    });

    if (!obrazok) {
      return res.status(404).json({
        success: false,
        message: 'Obrázok nenájdený'
      });
    }

    // Soft delete obrázka
    await obrazok.update({ aktivity: false });

    // Aktualizácia počtu obrázkov v galérii
    const newCount = await GaleriaObrazok.count({
      where: { galeria_id: galeriaId, aktivity: true }
    });
    
    const galeria = await Galeria.findByPk(galeriaId);
    if (galeria) {
      await galeria.update({ pocet_obrazkov: newCount });
    }

    // TODO: V produkcii by sme mohli skutočne vymazať súbory z disku
    // const uploadsDir = path.join(process.cwd(), 'uploads');
    // const fullPath = path.join(uploadsDir, obrazok.cesta_suboru);
    // await fs.unlink(fullPath);

    res.json({
      success: true,
      message: 'Obrázok úspešne vymazaný'
    });

  } catch (error: any) {
    console.error('Chyba pri vymazávaní obrázka:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vymazávaní obrázka',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export všetkých funkcií
export default {
  uploadGalleryImages,
  getGalleryImages,
  updateGalleryImage,
  deleteGalleryImage
};

/**
 * POST /api/admin/galleries/:id/images/from-media
 *
 * Pridá do galérie obrázok, ktorý je UŽ nahratý v media knižnici.
 *
 * PREČO: požiadavka hovorí „možnosť použiť obrázok aj z galérie".
 * Doteraz sa obrázok do galérie dal dostať len novým nahratím, takže
 * ten istý súbor skončil na disku viackrát. Tu sa len založí záznam,
 * ktorý ukazuje na existujúci súbor.
 *
 * Telo: { "media_ids": [3, 7] }
 */
export const pridajZKniznice = async (req: Request, res: Response) => {
  try {
    const galeriaId = parseInt(req.params.id, 10);
    if (isNaN(galeriaId)) {
      return res.status(400).json({ success: false, message: 'Neplatné ID galérie' });
    }

    const galeria = await Galeria.findByPk(galeriaId);
    if (!galeria || !galeria.aktivity) {
      return res.status(404).json({ success: false, message: 'Galéria nenájdená' });
    }

    const ids: number[] = Array.isArray(req.body.media_ids)
      ? req.body.media_ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Uveďte media_ids - pole ID súborov z knižnice',
      });
    }

    const subory = await Media.findAll({ where: { id: ids, aktivity: true, typ: 'obrazok' } });

    if (subory.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Žiadny zo zadaných súborov nie je obrázok v knižnici',
      });
    }

    const existujucich = await GaleriaObrazok.count({
      where: { galeria_id: galeriaId, aktivity: true },
    });

    const pridane: any[] = [];
    let poradie = existujucich;

    for (const subor of subory) {
      // Ten istý súbor nepridávame do galérie dvakrát
      const uzTam = await GaleriaObrazok.findOne({
        where: { galeria_id: galeriaId, cesta_suboru: subor.cesta, aktivity: true },
      });
      if (uzTam) continue;

      poradie++;
      const jePrvy = existujucich === 0 && pridane.length === 0;

      const obrazok = await GaleriaObrazok.create({
        galeria_id: galeriaId,
        nazov: subor.nazov,
        popis: subor.popis,
        cesta_suboru: subor.cesta,
        originalny_nazov: subor.originalny_nazov,
        velkost_suboru: Number(subor.velkost),
        mime_typ: subor.mime_typ,
        sirka: subor.sirka,
        vyska: subor.vyska,
        // Súbor z knižnice nemá vlastné náhľady - použijeme originál
        nahladovy_maly: subor.cesta,
        nahladovy_stredny: subor.cesta,
        poradie,
        je_nahladovy: jePrvy,
      });

      if (jePrvy) {
        await galeria.update({ nahladovy_obrazok: subor.cesta });
      }

      pridane.push(obrazok.toJSON());
    }

    // Počet obrázkov galérie držíme aktuálny
    const novyPocet = await GaleriaObrazok.count({
      where: { galeria_id: galeriaId, aktivity: true },
    });
    await galeria.update({ pocet_obrazkov: novyPocet });

    res.status(201).json({
      success: true,
      data: pridane,
      message: pridane.length
        ? `Do galérie pridaných ${pridane.length} obrázkov z knižnice`
        : 'Všetky zvolené obrázky už v galérii sú',
    });
  } catch (error: any) {
    console.error('Chyba pri pridávaní obrázkov z knižnice:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri pridávaní obrázkov' });
  }
};

/**
 * PATCH /api/admin/galleries/:galleryId/images/:imageId/cover
 *
 * Označí obrázok ako titulný. Doterajší titulný stratí príznak, takže
 * galéria má vždy práve jeden.
 */
export const nastavTitulnyObrazok = async (req: Request, res: Response) => {
  try {
    const galeriaId = parseInt(req.params.galleryId, 10);
    const obrazokId = parseInt(req.params.imageId, 10);

    if (isNaN(galeriaId) || isNaN(obrazokId)) {
      return res.status(400).json({ success: false, message: 'Neplatné ID' });
    }

    const galeria = await Galeria.findByPk(galeriaId);
    if (!galeria || !galeria.aktivity) {
      return res.status(404).json({ success: false, message: 'Galéria nenájdená' });
    }

    const obrazok = await GaleriaObrazok.findOne({
      where: { id: obrazokId, galeria_id: galeriaId, aktivity: true },
    });
    if (!obrazok) {
      return res.status(404).json({ success: false, message: 'Obrázok v tejto galérii nenájdený' });
    }

    await GaleriaObrazok.update(
      { je_nahladovy: false },
      { where: { galeria_id: galeriaId, je_nahladovy: true } }
    );
    await obrazok.update({ je_nahladovy: true });
    await galeria.update({
      nahladovy_obrazok: obrazok.nahladovy_stredny || obrazok.cesta_suboru,
    });

    res.json({
      success: true,
      data: obrazok.toJSON(),
      message: 'Titulný obrázok galérie bol nastavený',
    });
  } catch (error) {
    console.error('Chyba pri nastavovaní titulného obrázka:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};
