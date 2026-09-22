// backend/src/routes/articles.ts
// Routes pre články

import { Router } from 'express';

import {
  getPublicArticles,
  getPublicArticleBySlug,
  getAdminArticles,
  getAdminArticleById,
  createArticle,
  updateArticle,
  previewArticle,
  deleteArticle,
  bulkDeleteArticles,    
  bulkDuplicateArticles,
  validateArticle,
  validateArticleUpdate,
  uploadArticleImage, 
} from '../controllers/articleController';
import { uploadMedia } from '../controllers/mediaController';
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';


const router: Router = Router();

// === VEREJNÉ API (bez autentifikácie) ===

// GET /api/articles - Zoznam publikovaných článkov
router.get('/', getPublicArticles);

// GET /api/articles/:slug - Detail článku podľa slug
router.get('/:slug', getPublicArticleBySlug);

export default router;

// === Separátny router pre admin ===
export const adminArticleRouter: Router = Router();

// GET /api/admin/articles - Zoznam všetkých článkov (aj koncepty)
adminArticleRouter.get('/', authenticateToken, requireEditor, getAdminArticles);

// GET /api/admin/articles/:id - Detail článku pre admin
adminArticleRouter.get('/:id', authenticateToken, requireEditor, getAdminArticleById);

// POST /api/admin/articles - Vytvorenie nového článku
adminArticleRouter.post('/', authenticateToken, requireEditor, validateArticle, createArticle);

// PUT /api/admin/articles/:id - Úprava článku
adminArticleRouter.put('/:id', authenticateToken, requireEditor, validateArticleUpdate, updateArticle);

// DELETE /api/admin/articles/:id - Vymazanie článku
adminArticleRouter.delete('/:id', authenticateToken, requireEditor, deleteArticle);

// Náhľad článku vo verejnom tvare, aj keď ešte nie je zverejnený
adminArticleRouter.get('/:id/preview', authenticateToken, requireEditor, previewArticle);

// Obrázok článku ide cez MEDIA KNIŽNICU.
//
// Pôvodne sa ukladal ploche do /uploads/articles/, bez roka a mesiaca
// a bez akéhokoľvek záznamu v databáze - nedal sa teda znovu použiť
// a nemal alt text. Teraz končí v /uploads/media/<rok>/<mesiac>/
// a objaví sa v knižnici ako každý iný súbor.
adminArticleRouter.post(
  '/upload-image',
  authenticateToken,
  requireEditor,
  uploadMedia,
  uploadArticleImage
);


// POST /api/admin/articles/bulk-delete - Bulk vymazanie článkov
adminArticleRouter.post('/bulk-delete', authenticateToken, requireEditor, bulkDeleteArticles);

// POST /api/admin/articles/bulk-duplicate - Bulk duplikovanie článkov
adminArticleRouter.post('/bulk-duplicate', authenticateToken, requireEditor, bulkDuplicateArticles);