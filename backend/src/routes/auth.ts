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
// Obnovovacie tokeny a správa hesiel
import {
  obnovToken, odhlas, odhlasVsade,
  zabudnuteHeslo, obnovHeslo, zmenHeslo,
} from '../controllers/hesloController';

const router: Router = Router();

// POST /api/auth/login - Prihlásenie
router.post('/login', validateLogin, login);

// POST /api/auth/logout - Odhlásenie
router.post('/logout', odhlas);

// GET /api/auth/me - Aktuálny používateľ (vyžaduje prihlásenie)
router.get('/me', authenticateToken, getCurrentUser);

// POST /api/auth/refresh - Obnovenie tokenu (vyžaduje prihlásenie)
router.post('/refresh', obnovToken);

/**
 * @route POST /api/auth/zabudnute-heslo
 * @desc Vyžiadanie odkazu na obnovu hesla
 * @access Public
 */
router.post('/zabudnute-heslo', zabudnuteHeslo);

/**
 * @route POST /api/auth/obnova-hesla
 * @desc Nastavenie nového hesla pomocou tokenu z e-mailu
 * @access Public
 */
router.post('/obnova-hesla', obnovHeslo);

/**
 * @route POST /api/auth/zmena-hesla
 * @desc Zmena hesla prihláseným používateľom
 * @access Private
 */
router.post('/zmena-hesla', authenticateToken, zmenHeslo);

/**
 * @route POST /api/auth/odhlas-vsade
 * @desc Ukončenie relácií na všetkých zariadeniach
 * @access Private
 */
router.post('/odhlas-vsade', authenticateToken, odhlasVsade);

export default router;