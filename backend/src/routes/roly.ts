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
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';

/**
 * Roly a ich oprávnenia mení len správca. Inak by si ktokoľvek s právom
 * spravovať používateľov vedel vyrobiť rolu so všetkými právami.
 */
const lenSpravca = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.rola === 'admin') {
    next();
    return;
  }
  res.status(403).json({ success: false, message: 'Roly a oprávnenia smie meniť len správca' });
};

const router = Router();

/** @route GET /api/admin/roles - zoznam rolí aj so zoznamom modulov */
router.get('/', authenticateToken, requirePermission('pouzivatelia', 'citat'), getRoly);

/** @route GET /api/admin/roles/:id */
router.get('/:id', authenticateToken, requirePermission('pouzivatelia', 'citat'), getRola);

/** @route POST /api/admin/roles */
router.post('/', authenticateToken, requirePermission('pouzivatelia', 'pisat'), lenSpravca, createRola);

/** @route PUT /api/admin/roles/:id */
router.put('/:id', authenticateToken, requirePermission('pouzivatelia', 'pisat'), lenSpravca, updateRola);

/** @route DELETE /api/admin/roles/:id */
router.delete('/:id', authenticateToken, requirePermission('pouzivatelia', 'mazat'), lenSpravca, deleteRola);

export default router;
