// backend/src/routes/gallery-images.ts
// Routes pre správu obrázkov v galérii - FÁZA 7

import express from 'express';
import {
  uploadImages,
  uploadGalleryImages,
  getGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
  pridajZKniznice,
  nastavTitulnyObrazok,
} from '../controllers/galeriaObrazokController';
import { authenticateToken, requireEditor } from '../middleware/auth';

// Vytvoríme admin router pre obrázky
export const adminGalleryImagesRouter = express.Router();

// Middleware pre autentifikáciu na všetky admin routes
// Správa galérií patrí redaktorovi - samotné prihlásenie nestačí, inak by
// galérie menil aj bežný používateľ bez prístupu do administrácie
adminGalleryImagesRouter.use(authenticateToken, requireEditor);

// ===== ADMIN ROUTES PRE OBRÁZKY =====

// POST /api/admin/galleries/:id/images - Upload obrázkov do galérie
// Middleware multer sa aplikuje v controlleri cez uploadImages
adminGalleryImagesRouter.post('/:id/images', (req, res) => {
  // Multer middleware
  uploadImages(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Chyba pri upload súborov'
      });
    }
    
    // Volanie controller funkcie
    uploadGalleryImages(req, res);
  });
});

// GET /api/admin/galleries/:id/images - Získanie obrázkov galérie
adminGalleryImagesRouter.get('/:id/images', getGalleryImages);

// PUT /api/admin/galleries/:galleryId/images/:imageId - Aktualizácia obrázka
adminGalleryImagesRouter.put('/:galleryId/images/:imageId', updateGalleryImage);

// DELETE /api/admin/galleries/:galleryId/images/:imageId - Vymazanie obrázka  
adminGalleryImagesRouter.delete('/:galleryId/images/:imageId', deleteGalleryImage);

/**
 * @route POST /api/admin/galleries/:id/images/from-media
 * @desc Pridá do galérie obrázok, ktorý je už v media knižnici -
 *       bez opätovného nahrávania toho istého súboru
 */
adminGalleryImagesRouter.post('/:id/images/from-media', pridajZKniznice);

/**
 * @route PATCH /api/admin/galleries/:galleryId/images/:imageId/cover
 * @desc Označí obrázok ako titulný obrázok galérie
 */
adminGalleryImagesRouter.patch('/:galleryId/images/:imageId/cover', nastavTitulnyObrazok);

// Export admin router
export default adminGalleryImagesRouter;