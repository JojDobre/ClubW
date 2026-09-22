// Umiestnenie: backend/src/routes/logy.ts
// Routes prehľadu logov.

import { Router } from 'express';
import { getLogy, getMoznostiFiltra } from '../controllers/logController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

/** @route GET /api/admin/logs/filters - hodnoty do filtra */
router.get('/filters', authenticateToken, requirePermission('logy', 'citat'), getMoznostiFiltra);

/**
 * @route GET /api/admin/logs
 * @desc Všetky udalosti. Filtre: ?akcia= ?entita= ?pouzivatel_id=
 *       ?od= ?do= ?hladat= ?limit= ?offset=
 */
router.get('/', authenticateToken, requirePermission('logy', 'citat'), getLogy);

export default router;
