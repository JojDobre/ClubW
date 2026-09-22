// Umiestnenie: backend/src/routes/roly.ts
// Routes pre role a oprávnenia.
//
// Celá správa rolí patrí správcovi - kto môže meniť oprávnenia,
// môže si ich nastaviť aj sám sebe.

import { Router } from 'express';
import {
  getRoly,
  getRola,
  createRola,
  updateRola,
  deleteRola,
} from '../controllers/rolaController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

/** @route GET /api/admin/roles - zoznam rolí aj so zoznamom modulov */
router.get('/', authenticateToken, requirePermission('pouzivatelia', 'citat'), getRoly);

/** @route GET /api/admin/roles/:id */
router.get('/:id', authenticateToken, requirePermission('pouzivatelia', 'citat'), getRola);

/** @route POST /api/admin/roles */
router.post('/', authenticateToken, requirePermission('pouzivatelia', 'pisat'), createRola);

/** @route PUT /api/admin/roles/:id */
router.put('/:id', authenticateToken, requirePermission('pouzivatelia', 'pisat'), updateRola);

/** @route DELETE /api/admin/roles/:id */
router.delete('/:id', authenticateToken, requirePermission('pouzivatelia', 'mazat'), deleteRola);

export default router;
