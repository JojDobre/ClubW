// Umiestnenie: backend/src/routes/stadiony.ts
// Routes pre štadióny.
//
// Čítanie je verejné - adresa štadióna patrí na web, aby fanúšik vedel,
// kam má prísť. Zápis je chránený ako všade inde.

import { Router } from 'express';
import {
  getStadiony,
  getStadion,
  createStadion,
  updateStadion,
  deleteStadion,
} from '../controllers/stadionController';
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';

const router = Router();

/** @route GET /api/stadiums - zoznam, ?hladat= filtruje podľa názvu a adresy */
router.get('/', getStadiony);

/** @route GET /api/stadiums/:id - detail vrátane tímov, ktoré tu hrávajú */
router.get('/:id', getStadion);

/** @route POST /api/stadiums */
router.post('/', authenticateToken, requireEditor, createStadion);

/** @route PUT /api/stadiums/:id */
router.put('/:id', authenticateToken, requireEditor, updateStadion);

/** @route DELETE /api/stadiums/:id - archivácia */
router.delete('/:id', authenticateToken, requireAdmin, deleteStadion);

export default router;
