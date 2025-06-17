// backend/src/routes/ligaRoutes.ts
// Routes pre ligy - FÁZA 4

import express from 'express';
import {
  getLeagues,
  getLeague,
  createLeague,
  updateLeague,
  deleteLeague
} from '../controllers/LigaController';

const router = express.Router();

// ===== VEREJNÉ ROUTES =====

/**
 * @route GET /api/leagues
 * @desc Získať zoznam všetkých aktívnych líg
 * @query typ - filter podľa typu (sutaz|pohar|priatelska)
 * @query search - vyhľadávanie v názve a sezóne  
 * @query include_stats - pridanie štatistík (true/false)
 * @access Public
 */
router.get('/', getLeagues);

/**
 * @route GET /api/leagues/:id
 * @desc Získať detail konkrétnej ligy
 * @param id - ID ligy
 * @access Public
 */
router.get('/:id', getLeague);

/**
 * @route POST /api/leagues
 * @desc Vytvorenie novej ligy
 * @body nazov, sezona, typ, popis?, external_widget_url?, logo?, farba?, poradie?
 * @access Private (Admin)
 * @todo Pridať autentifikačný middleware
 */
router.post('/', createLeague);

/**
 * @route PUT /api/leagues/:id  
 * @desc Aktualizácia existujúcej ligy
 * @param id - ID ligy
 * @body nazov?, sezona?, typ?, popis?, external_widget_url?, logo?, farba?, poradie?
 * @access Private (Admin)
 * @todo Pridať autentifikačný middleware
 */
router.put('/:id', updateLeague);

/**
 * @route DELETE /api/leagues/:id
 * @desc Soft delete ligy (označenie ako neaktívna)
 * @param id - ID ligy  
 * @access Private (Admin)
 * @todo Pridať autentifikačný middleware
 */
router.delete('/:id', deleteLeague);

export default router;