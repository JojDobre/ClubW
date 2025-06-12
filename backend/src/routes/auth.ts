// backend/src/routes/auth.ts
// Routes pre autentifikáciu

import { Router } from 'express';
import {
  login,
  logout,
  getCurrentUser,
  refreshToken,
  validateLogin,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// POST /api/auth/login - Prihlásenie
router.post('/login', validateLogin, login);

// POST /api/auth/logout - Odhlásenie
router.post('/logout', logout);

// GET /api/auth/me - Aktuálny používateľ (vyžaduje prihlásenie)
router.get('/me', authenticateToken, getCurrentUser);

// POST /api/auth/refresh - Obnovenie tokenu (vyžaduje prihlásenie)
router.post('/refresh', authenticateToken, refreshToken);

export default router;