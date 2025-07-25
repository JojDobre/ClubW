import { Router, Request, Response } from 'express';
import { uploadPlayerPhoto } from '../middleware/uploadMiddleware';
import path from 'path';
import fs from 'fs';

const router = Router();

// POST /api/upload/player-photo - Upload fotky hráča
router.post('/player-photo', 
  uploadPlayerPhoto.single('photo'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Žiadny súbor nebol nahraný'
        });
      }

      const { tim_id } = req.body;
      
      if (!tim_id) {
        // Vymaž nahraný súbor ak nie je tim_id
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Tím ID je povinný'
        });
      }

      // Vytvor finálny priečinok pre tím
      const finalDir = path.join(__dirname, '../../uploads/images/players', tim_id.toString());
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }

      // Presunie súbor do správneho priečinka
      const finalPath = path.join(finalDir, req.file.filename);
      
      try {
        if (fs.existsSync(req.file.path)) {
          fs.renameSync(req.file.path, finalPath); // RENAME automaticky vymaže pôvodný súbor
          console.log('✅ Súbor presunutý z:', req.file.path, 'do:', finalPath);
        } else {
          throw new Error('Dočasný súbor sa nenašiel');
        }
      } catch (moveError) {
        console.error('❌ Chyba pri presúvaní súboru:', moveError);
        
        // Vyčisti pôvodný súbor ak existuje
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(500).json({
          success: false,
          message: 'Chyba pri ukladaní súboru'
        });
      }

      // Vytvor URL cestu k obrázku (použij RELATÍVNU cestu pre DB)
      const relativePath = `/uploads/images/players/${tim_id}/${req.file.filename}`;

      console.log('✅ Fotka hráča úspešne nahraná:');
      console.log('   - Finálny súbor:', finalPath);
      console.log('   - Relatívna cesta pre DB:', relativePath);

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          url: relativePath, // VRÁŤ LEN RELATÍVNU CESTU
          relativePath: relativePath
        },
        message: 'Fotka hráča úspešne nahraná'
      });

    } catch (error) {
      console.error('❌ Chyba pri upload fotky hráča:', error);
      
      // Vymaž súbor v prípade chyby
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('⚠️ Chyba pri čistení súboru:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Chyba servera pri upload fotky',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
);

// GET /api/upload/test-avatar - Test endpoint pre default avatar
router.get('/test-avatar', (req, res) => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.includes('default-avatar'));
  
  res.json({
    success: true,
    uploads_dir: uploadsDir,
    default_avatars: files,
    message: 'Test default avatar súborov'
  });
});

export default router;