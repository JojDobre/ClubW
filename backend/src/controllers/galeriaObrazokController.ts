// backend/src/controllers/galeriaObrazokController.ts
// Controller pre správu obrázkov v galérii - FÁZA 7

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Galeria, GaleriaObrazok } from '../models';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// ===== MULTER CONFIGURATION =====

// Konfigurácia úložiska súborov
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const galeriaId = req.params.id;
      
      // Získame galériu z databázy pre názov
      const galeria = await Galeria.findByPk(galeriaId);
      if (!galeria) {
        return cb(new Error('Galéria nenájdená'), '');
      }

      // Vytvoríme bezpečný názov adresára zo slug galérie
      const safeDirName = galeria.slug || `galeria-${galeriaId}`;
      
      // Vytvorenie adresárovej štruktúry: uploads/galerie/nazov-galerie/
      const uploadPath = path.join(process.cwd(), 'uploads', 'galerie', safeDirName);
      
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      console.error('Chyba pri vytváraní upload adresára:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    // Generovanie unikátneho názvu súboru
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

// Filtrovanie súborov - len obrázky
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Nepodporovaný typ súboru: ${file.mimetype}. Povolené sú: JPEG, PNG, GIF, WebP, BMP`));
  }
};

// Multer middleware
export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Max 10MB na súbor
    files: 20 // Max 20 súborov naraz
  }
}).array('images', 20); // Pole obrázkov s max 20 súbormi

// ===== HELPER FUNCTIONS =====

// Generovanie náhľadových obrázkov
const generateThumbnails = async (imagePath: string): Promise<{ small: string; medium: string }> => {
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath);
  const basename = path.basename(imagePath, ext);
  
  const smallPath = path.join(dir, `${basename}_thumb_150${ext}`);
  const mediumPath = path.join(dir, `${basename}_thumb_400${ext}`);
  
  try {
    // Malý náhľad 150x150
    await sharp(imagePath)
      .resize(150, 150, { 
        fit: 'cover', 
        position: 'center' 
      })
      .jpeg({ quality: 80 })
      .toFile(smallPath);
    
    // Stredný náhľad 400x400
    await sharp(imagePath)
      .resize(400, 400, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toFile(mediumPath);
    
    // Relatívne cesty pre databázu
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const relativeSmall = path.relative(uploadsDir, smallPath).replace(/\\/g, '/');
    const relativeMedium = path.relative(uploadsDir, mediumPath).replace(/\\/g, '/');
    
    return {
      small: `/${relativeSmall}`,
      medium: `/${relativeMedium}`
    };
  } catch (error) {
    console.error('Chyba pri generovaní náhľadov:', error);
    return { small: '', medium: '' };
  }
};

// Získanie rozmerov obrázka
const getImageDimensions = async (imagePath: string): Promise<{ width: number; height: number }> => {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  } catch (error) {
    console.error('Chyba pri získavaní rozmerov obrázka:', error);
    return { width: 0, height: 0 };
  }
};

// ===== API ENDPOINTS =====

// POST /api/admin/galleries/:id/images - Upload obrázkov do galérie
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
        
        // Získanie rozmerov
        const dimensions = await getImageDimensions(file.path);
        
        // Generovanie náhľadov
        const thumbnails = await generateThumbnails(file.path);
        
        // Relatívna cesta k hlavnému súboru
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const relativePath = path.relative(uploadsDir, file.path).replace(/\\/g, '/');
        
        // Automatické určenie, či je to náhľadový obrázok (prvý obrázok ak ešte neexistuje žiadny)
        const isFirstImage = existingCount === 0 && i === 0;
        
        // Vytvorenie záznamu v databáze
        const obrazok = await GaleriaObrazok.create({
          galeria_id: galeriaId,
          nazov: null, // Názov sa môže pridať neskôr
          popis: null,
          cesta_suboru: `/${relativePath}`,
          originalny_nazov: file.originalname,
          velkost_suboru: file.size,
          mime_typ: file.mimetype,
          sirka: dimensions.width,
          vyska: dimensions.height,
          nahladovy_maly: thumbnails.small,
          nahladovy_stredny: thumbnails.medium,
          poradie: existingCount + i + 1,
          je_nahladovy: isFirstImage
        });

        uploadedImages.push(obrazok.toJSON());
        console.log(`✅ Obrázok ${i + 1} úspešne spracovaný (ID: ${obrazok.id})`);
        
      } catch (error: any) {
        console.error(`❌ Chyba pri spracovaní obrázka ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
        
        // Pokus o vymazanie súboru pri chybe
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Chyba pri mazaní súboru:', unlinkError);
        }
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