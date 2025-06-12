// backend/src/routes/categories.ts
// Routes pre kategórie článkov

import { Router } from 'express';
import {
  getCategories,
  getAdminCategories,
  getCategoryBySlug,
  getAdminCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  reorderCategories,
  validateCategory,
} from '../controllers/categoryController';
import { authenticateToken, requireAdmin, requireEditor } from '../middleware/auth';

const router: Router = Router();

// === VEREJNÉ API (bez autentifikácie) ===

// GET /api/categories - Zoznam aktívnych kategórií
router.get('/', getCategories);

// GET /api/categories/:slug - Detail kategórie podľa slug (musí byť na konci)
router.get('/:slug', getCategoryBySlug);

export default router;

// === Vytvoríme separátny router pre admin ===
export const adminCategoryRouter: Router = Router();

// GET /api/admin/categories - Zoznam všetkých kategórií (aj neaktívnych)
adminCategoryRouter.get('/', authenticateToken, requireEditor, getAdminCategories);

// GET /api/admin/categories/:id - Detail kategórie pre admin
adminCategoryRouter.get('/:id', authenticateToken, requireEditor, getAdminCategoryById);

// POST /api/admin/categories - Vytvorenie novej kategórie (len admin)
adminCategoryRouter.post('/', authenticateToken, requireAdmin, validateCategory, createCategory);

// PUT /api/admin/categories/:id - Úprava kategórie (len admin)
adminCategoryRouter.put('/:id', authenticateToken, requireAdmin, validateCategory, updateCategory);

// DELETE /api/admin/categories/:id - Vymazanie kategórie (len admin)
adminCategoryRouter.delete('/:id', authenticateToken, requireAdmin, deleteCategory);

// PATCH /api/admin/categories/:id/toggle-status - Prepnutie aktivity (len admin)
adminCategoryRouter.patch('/:id/toggle-status', authenticateToken, requireAdmin, toggleCategoryStatus);

// PATCH /api/admin/categories/reorder - Zmena poradia (len admin)
adminCategoryRouter.patch('/reorder', authenticateToken, requireAdmin, reorderCategories);