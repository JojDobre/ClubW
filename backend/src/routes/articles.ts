// backend/src/routes/articles.ts
// Routes pre články

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

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
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';


// Pridaj konfiguráciu multer:
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'articles');
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `article-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nepodporovaný typ súboru'));
    }
  }
});

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

adminArticleRouter.post('/upload-image', authenticateToken, requireEditor, upload.single('image'), uploadArticleImage);


// POST /api/admin/articles/bulk-delete - Bulk vymazanie článkov
adminArticleRouter.post('/bulk-delete', authenticateToken, requireEditor, bulkDeleteArticles);

// POST /api/admin/articles/bulk-duplicate - Bulk duplikovanie článkov
adminArticleRouter.post('/bulk-duplicate', authenticateToken, requireEditor, bulkDuplicateArticles);