// Umiestnenie: backend/src/routes/gdpr.ts
// Routes pre správu súhlasov a práva dotknutých osôb.
//
// Všetky endpointy sú chránené - pracujú s osobnými údajmi,
// vrátane údajov maloletých.

import { Router } from 'express';
import {
  getSuhlasy, setSuhlas, exportUdajov, anonymizuj,
  prehladRetencie, getAudit,
} from '../controllers/gdprController';
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/admin/players/:id/consents
 * @desc Prehľad súhlasov hráča
 * @access Private (Admin/Redaktor)
 */
router.get('/admin/players/:id/consents', authenticateToken, requireEditor, getSuhlasy);

/**
 * @route PUT /api/admin/players/:id/consents
 * @desc Zaznamenanie alebo odvolanie súhlasu
 * @access Private (Admin/Redaktor)
 */
router.put('/admin/players/:id/consents', authenticateToken, requireEditor, setSuhlas);

/**
 * @route GET /api/admin/players/:id/export
 * @desc Export osobných údajov hráča (právo na prístup)
 * @access Private (Admin)
 */
router.get('/admin/players/:id/export', authenticateToken, requireAdmin, exportUdajov);

/**
 * @route POST /api/admin/players/:id/anonymize
 * @desc Anonymizácia hráča (právo na výmaz)
 * @access Private (Admin)
 */
router.post('/admin/players/:id/anonymize', authenticateToken, requireAdmin, anonymizuj);

/**
 * @route GET /api/admin/gdpr/retention
 * @desc Prehľad údajov po uplynutí doby uchovávania
 * @access Private (Admin)
 */
router.get('/admin/gdpr/retention', authenticateToken, requireAdmin, prehladRetencie);

/**
 * @route GET /api/admin/gdpr/audit
 * @desc Výpis auditného záznamu
 * @access Private (Admin)
 */
router.get('/admin/gdpr/audit', authenticateToken, requireAdmin, getAudit);

export default router;
