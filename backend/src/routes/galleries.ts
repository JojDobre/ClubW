// backend/src/routes/galleries.ts
// Routes pre fotogalérie - FÁZA 7

import express from 'express';
import {
  getPublicGalleries,
  getPublicGallery,
  getGalleriesByTypeEndpoint,
  getAdminGalleries,
  getAdminGallery,
  createGallery,
  updateGallery,
  deleteGallery
} from '../controllers/galeriaController';
import { authenticateToken, requireEditor } from '../middleware/auth';

const router = express.Router();

// ===== PUBLIC ROUTES (bez autentifikácie) =====

// GET /api/galleries - Zoznam verejných galérií s filtrovaním a pagináciou
router.get('/', getPublicGalleries);

// GET /api/galleries/by-type/:typ - Galérie podľa typu priradenia
// Príklady: /api/galleries/by-type/tim?object_id=1
//          /api/galleries/by-type/zapas?object_id=5
//          /api/galleries/by-type/volna
router.get('/by-type/:typ', getGalleriesByTypeEndpoint);

// GET /api/galleries/:id - Detail konkrétnej galérie s obrázkami
router.get('/:id', getPublicGallery);

// ===== ADMIN ROUTES (s autentifikáciou) =====

// Vytvoríme separátny admin router
export const adminGalleryRouter = express.Router();

// Middleware pre autentifikáciu na všetky admin routes
// Správa galérií patrí redaktorovi - samotné prihlásenie nestačí, inak by
// galérie menil aj bežný používateľ bez prístupu do administrácie
adminGalleryRouter.use(authenticateToken, requireEditor);

// GET /api/admin/galleries - Zoznam všetkých galérií pre admin (vrátane neaktívnych)
adminGalleryRouter.get('/', getAdminGalleries);

// GET /api/admin/galleries/:id - Detail pre editor (aj skrytá galéria)
adminGalleryRouter.get('/:id', getAdminGallery);

// POST /api/admin/galleries - Vytvorenie novej galérie
adminGalleryRouter.post('/', createGallery);

// PUT /api/admin/galleries/:id - Aktualizácia galérie
adminGalleryRouter.put('/:id', updateGallery);

// DELETE /api/admin/galleries/:id - Vymazanie galérie (soft delete)
adminGalleryRouter.delete('/:id', deleteGallery);

// Export public router ako default
export default router;