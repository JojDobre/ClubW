// Umiestnenie: backend/src/routes/media.ts
// Routes media knižnice.
//
// Celá knižnica je chránená - zoznam nahratých súborov aj s menami
// autorov nepatrí neprihlásenému návštevníkovi. Samotné súbory sú
// naďalej verejne dostupné cez /uploads, aby sa dali zobraziť na webe.

import { Router } from 'express';
import {
  getMediaZoznam,
  getMedium,
  nahrajMedia,
  updateMedium,
  deleteMedium,
  uploadMedia,
} from '../controllers/mediaController';
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';

const router = Router();

/** @route GET /api/admin/media - zoznam, ?typ= ?hladat= ?limit= ?offset= */
router.get('/', authenticateToken, requireEditor, getMediaZoznam);

/** @route GET /api/admin/media/:id - detail vrátane miest použitia */
router.get('/:id', authenticateToken, requireEditor, getMedium);

/** @route POST /api/admin/media/upload - nahratie súborov (pole "subory") */
router.post('/upload', authenticateToken, requireEditor, uploadMedia, nahrajMedia);

/** @route PUT /api/admin/media/:id - alt text, popis, názov */
router.put('/:id', authenticateToken, requireEditor, updateMedium);

/** @route DELETE /api/admin/media/:id - mazanie, ?force=true obíde kontrolu použitia */
router.delete('/:id', authenticateToken, requireAdmin, deleteMedium);

export default router;
