// Umiestnenie: backend/src/routes/formulare.ts
// Routes formulárov.
//
// Definícia formulára a jeho odoslanie sú verejné - formulár má
// vyplniť návštevník webu. Vyplnené odpovede vidí len administrácia.

import { Router } from 'express';
import {
  getFormulare,
  getFormular,
  createFormular,
  updateFormular,
  deleteFormular,
  getOdpovede,
  oznacPrecitane,
  deleteOdpoved,
  getVerejnyFormular,
  odosliFormular,
  getPocetNeprecitanych,
} from '../controllers/formularController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

// ===== VEREJNÁ ČASŤ =====

/** @route GET /api/forms/:kluc - definícia pre vykreslenie (ID alebo slug) */
router.get('/forms/:kluc', getVerejnyFormular);

/** @route POST /api/forms/:kluc/submit - odoslanie vyplneného formulára */
router.post('/forms/:kluc/submit', odosliFormular);

// ===== ADMINISTRÁCIA =====

/** @route GET /api/admin/forms/unread-count - odznak v menu */
router.get('/admin/forms/unread-count', authenticateToken, requirePermission('formulare', 'citat'), getPocetNeprecitanych);

/** @route PATCH /api/admin/forms/responses/:id/read - prečítané/neprečítané */
router.patch('/admin/forms/responses/:id/read', authenticateToken, requirePermission('formulare', 'pisat'), oznacPrecitane);

/** @route DELETE /api/admin/forms/responses/:id */
router.delete('/admin/forms/responses/:id', authenticateToken, requirePermission('formulare', 'mazat'), deleteOdpoved);

/** @route GET /api/admin/forms */
router.get('/admin/forms', authenticateToken, requirePermission('formulare', 'citat'), getFormulare);

/** @route GET /api/admin/forms/:id/responses - vyplnené formuláre */
router.get('/admin/forms/:id/responses', authenticateToken, requirePermission('formulare', 'citat'), getOdpovede);

/** @route GET /api/admin/forms/:id */
router.get('/admin/forms/:id', authenticateToken, requirePermission('formulare', 'citat'), getFormular);

/** @route POST /api/admin/forms */
router.post('/admin/forms', authenticateToken, requirePermission('formulare', 'pisat'), createFormular);

/** @route PUT /api/admin/forms/:id */
router.put('/admin/forms/:id', authenticateToken, requirePermission('formulare', 'pisat'), updateFormular);

/** @route DELETE /api/admin/forms/:id */
router.delete('/admin/forms/:id', authenticateToken, requirePermission('formulare', 'mazat'), deleteFormular);

export default router;
