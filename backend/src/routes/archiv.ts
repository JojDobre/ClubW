// Umiestnenie: backend/src/routes/archiv.ts
// Routes archívu - zoznam mäkko odstránených položiek a ich obnova.
//
// Celý archív je chránený: pracuje s údajmi, ktoré boli zámerne stiahnuté
// z webu, takže nepatria neprihlásenému návštevníkovi.

import { Router } from 'express';
import { getArchiv, obnovPolozku, zmazTrvalo } from '../controllers/archivController';
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/admin/archive
 * @desc Archivované položky naprieč entitami. ?typ=hraci obmedzí na jednu,
 *       ?hladat= filtruje podľa názvu.
 * @access Private (Admin/Redaktor)
 */
router.get('/', authenticateToken, requireEditor, getArchiv);

/**
 * @route POST /api/admin/archive/:typ/:id/restore
 * @desc Vráti položku späť medzi aktívne
 * @access Private (Admin/Redaktor)
 */
router.post('/:typ/:id/restore', authenticateToken, requireEditor, obnovPolozku);

/**
 * @route DELETE /api/admin/archive/:typ/:id
 * @desc Trvalé odstránenie - nevratné, preto len pre správcu
 * @access Private (Admin)
 */
router.delete('/:typ/:id', authenticateToken, requireAdmin, zmazTrvalo);

export default router;
