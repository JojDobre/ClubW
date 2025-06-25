// backend/src/routes/gallery-images.ts
// Routes pre správu obrázkov v galérii - FÁZA 7

import express from 'express';
import {
  uploadImages,
  uploadGalleryImages,
  getGalleryImages,
  updateGalleryImage,
  deleteGalleryImage
} from '../controllers/galeriaObrazokController';
import { authenticateToken } from '../middleware/auth';

// Vytvoríme admin router pre obrázky
export const adminGalleryImagesRouter = express.Router();

// Middleware pre autentifikáciu na všetky admin routes
adminGalleryImagesRouter.use(authenticateToken);

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

// Export admin router
export default adminGalleryImagesRouter;