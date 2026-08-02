// Umiestnenie: backend/src/routes/sezony.ts
// Routes pre sezóny a súpisky hráčov po sezónach.

import { Router } from 'express';
import {
  getSezony, getAktualnaSezona, createSezona, updateSezona,
  nastavAktualnuSezonu, deleteSezona,
  getSupiska, getHistoriaHraca, zapisNaSupisku, zmazZoSupisky,
} from '../controllers/sezonaController';
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';

const router = Router();

// ===== VEREJNÉ ČÍTANIE =====
// Verejný web potrebuje vedieť, ktorá sezóna je aktuálna,
// a zobraziť súpisky aj archív

/**
 * @route GET /api/seasons/current
 * @desc Aktuálna sezóna
 * @access Public
 * POZOR: musí byť pred /:id, inak by Express bral "current" ako ID
 */
router.get('/seasons/current', getAktualnaSezona);

/**
 * @route GET /api/seasons
 * @desc Zoznam sezón (podklad pre archív)
 * @access Public
 */
router.get('/seasons', getSezony);

/**
 * @route GET /api/teams/:id/roster
 * @desc Súpiska tímu pre sezónu (predvolene aktuálnu)
 * @access Public
 */
router.get('/teams/:id/roster', getSupiska);

/**
 * @route GET /api/players/:id/history
 * @desc História pôsobenia hráča po sezónach
 * @access Public
 */
router.get('/players/:id/history', getHistoriaHraca);

// ===== SPRÁVA =====

/**
 * @route POST /api/admin/seasons
 * @desc Vytvorenie sezóny
 * @access Private (Admin)
 */
router.post('/admin/seasons', authenticateToken, requireAdmin, createSezona);

/**
 * @route PUT /api/admin/seasons/:id
 * @desc Úprava sezóny
 * @access Private (Admin)
 */
router.put('/admin/seasons/:id', authenticateToken, requireAdmin, updateSezona);

/**
 * @route POST /api/admin/seasons/:id/set-current
 * @desc Označenie sezóny ako aktuálnej
 * @access Private (Admin)
 */
router.post('/admin/seasons/:id/set-current', authenticateToken, requireAdmin, nastavAktualnuSezonu);

/**
 * @route DELETE /api/admin/seasons/:id
 * @desc Zmazanie sezóny (len ak na ňu nič neodkazuje)
 * @access Private (Admin)
 */
router.delete('/admin/seasons/:id', authenticateToken, requireAdmin, deleteSezona);

/**
 * @route POST /api/admin/rosters
 * @desc Zapísanie hráča na súpisku
 * @access Private (Admin/Redaktor)
 */
router.post('/admin/rosters', authenticateToken, requireEditor, zapisNaSupisku);

/**
 * @route DELETE /api/admin/rosters/:id
 * @desc Odobratie hráča zo súpisky
 * @access Private (Admin/Redaktor)
 */
router.delete('/admin/rosters/:id', authenticateToken, requireEditor, zmazZoSupisky);

export default router;
