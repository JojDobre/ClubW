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
  deleteArticle,
  validateArticle,
} from '../controllers/articleController';
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
adminArticleRouter.put('/:id', authenticateToken, requireEditor, validateArticle, updateArticle);

// DELETE /api/admin/articles/:id - Vymazanie článku
adminArticleRouter.delete('/:id', authenticateToken, requireEditor, deleteArticle);