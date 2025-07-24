// Umiestnenie: backend/src/middleware/uploadMiddleware.ts
// Nový súbor - middleware pre upload fotiek

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Vytvorenie storage konfigurácie
const createPlayerPhotoStorage = () => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        // Vytvor základný priečinok pre teraz - tím ID sa použije neskôr
        const uploadPath = path.join(__dirname, '../../uploads/images/players/temp');
        
        // Vytvor priečinok ak neexistuje
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
      } catch (error) {
        cb(error as Error, '');
      }
    },
    
    filename: (req, file, cb) => {
      try {
        // Vytvor jedinečný názov súboru
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname).toLowerCase();
        
        const filename = `player_${timestamp}_${random}${extension}`;
        cb(null, filename);
      } catch (error) {
        cb(error as Error, '');
      }
    }
  });
};

// Multer konfigurácia pre fotky hráčov
export const uploadPlayerPhoto = multer({
  storage: createPlayerPhotoStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Len jeden súbor
  },
  fileFilter: (req, file, cb) => {
    // Povoľ len obrázky
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nepovolený typ súboru. Povolené sú: JPEG, PNG, WebP'));
    }
  }
});

// Middleware na spracovanie a optimalizáciu obrázka
export const optimizePlayerPhoto = async (req: any, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  try {
    const inputPath = req.file.path;
    const filename = req.file.filename;
    const outputPath = path.join(path.dirname(inputPath), `optimized_${filename}`);
    
    // Optimalizuj obrázok pomocou Sharp
    await sharp(inputPath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toFile(outputPath);
    
    // Počkaj aby sa Sharp ukončil úplne
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Vymaž pôvodný súbor
      fs.unlinkSync(inputPath);
      
      // Premenuj optimalizovaný súbor
      fs.renameSync(outputPath, inputPath);
    } catch (fileError) {
      console.log('Chyba pri file operáciách, pokračujem bez optimalizácie:', fileError);
      // Ak file operácie zlyhajú, aspoň vymaž optimalizovaný súbor
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (e) {
        // Ignoruj chybu
      }
    }
    
    next();
  } catch (error) {
    console.error('Chyba pri optimalizácii obrázka:', error);
    next(); // Pokračuj aj pri chybe optimalizácie
  }
};