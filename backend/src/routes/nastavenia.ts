// Umiestnenie: backend/src/routes/nastavenia.ts
// Routes pre nastavenia klubu (white-label identita a farby).

import { Router } from 'express';
import {
  getNastavenia,
  getNastaveniaCss,
  getNastaveniaAdmin,
  updateNastavenia,
} from '../controllers/nastaveniaController';
// Auth middleware - úpravy smie robiť len administrátor
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/settings
 * @desc Verejné nastavenia klubu (názov, farby, kontakt, sociálne siete)
 * @access Public
 */
router.get('/settings', getNastavenia);

/**
 * @route GET /api/settings.css
 * @desc Farby klubu ako CSS premenné - vkladá sa priamo do <head>
 * @access Public
 */
router.get('/settings.css', getNastaveniaCss);

/**
 * @route GET /api/admin/settings
 * @desc Kompletné nastavenia vrátane prevádzkových údajov (IČO, analytika)
 * @access Private (Admin)
 */
router.get('/admin/settings', authenticateToken, requireAdmin, getNastaveniaAdmin);

/**
 * @route PUT /api/admin/settings
 * @desc Úprava nastavení klubu
 * @access Private (Admin)
 */
router.put('/admin/settings', authenticateToken, requireAdmin, updateNastavenia);

export default router;
