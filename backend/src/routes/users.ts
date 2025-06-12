// backend/src/routes/users.ts
// Routes pre správu používateľov

import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  validateCreateUser,
  validateUpdateUser,
} from '../controllers/userController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router: Router = Router();

// Všetky user routes vyžadujú autentifikáciu
router.use(authenticateToken);

// GET /api/users - Zoznam používateľov (len admin)
router.get('/', requireAdmin, getUsers);

// GET /api/users/:id - Detail používateľa (len admin)
router.get('/:id', requireAdmin, getUserById);

// POST /api/users - Vytvorenie nového používateľa (len admin)
router.post('/', requireAdmin, validateCreateUser, createUser);

// PUT /api/users/:id - Úprava používateľa (len admin)
router.put('/:id', requireAdmin, validateUpdateUser, updateUser);

// DELETE /api/users/:id - Vymazanie používateľa (len admin)
router.delete('/:id', requireAdmin, deleteUser);

// PATCH /api/users/:id/toggle-status - Prepnutie aktivity (len admin)
router.patch('/:id/toggle-status', requireAdmin, toggleUserStatus);

export default router;