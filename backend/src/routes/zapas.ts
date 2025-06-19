// backend/src/routes/zapasRoutes.ts
// Routes pre zápasy - FÁZA 4

import express from 'express';
import {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  updateMatchStatuses
} from '../controllers/ZapasController';

const router = express.Router();

// ===== VEREJNÉ ROUTES =====

/**
 * @route GET /api/matches
 * @desc Získať zoznam všetkých aktívnych zápasov
 * @query liga_id - filter podľa ligy
 * @query tim_id - filter podľa tímu (domáci alebo hosťujúci)
 * @query status - filter podľa statusu (naplanovany|prebieha|ukonceny|odlozeny|zruseny)
 * @query od_datumu - filter od dátumu (YYYY-MM-DD)
 * @query do_datumu - filter do dátumu (YYYY-MM-DD)
 * @query search - vyhľadávanie v názve, mieste, kole
 * @query include_details - pridanie detailov (liga, tímy) - true/false
 * @query page - stránka pre pagináciu
 * @query limit - počet záznamov na stránku
 * @access Public
 */
router.get('/', getMatches);

/**
 * @route GET /api/matches/:id
 * @desc Získať detail konkrétneho zápasu s kompletnou informáciou
 * @param id - ID zápasu
 * @access Public
 */
router.get('/:id', getMatch);

/**
 * @route POST /api/matches
 * @desc Vytvorenie nového zápasu
 * @body nazov, liga_id, datum_cas, domaci_tim_id, hostujuci_tim_id, kolo?, miesto?, status?, goly_domaci?, goly_hostia?, pocet_divakov?, poznamky?, video_url?, clanok_id?
 * @access Private (Admin)
 * @todo Pridať autentifikačný middleware
 */
router.post('/', createMatch);

/**
 * @route PUT /api/matches/:id  
 * @desc Aktualizácia existujúceho zápasu
 * @param id - ID zápasu
 * @body nazov?, liga_id?, datum_cas?, domaci_tim_id?, hostujuci_tim_id?, kolo?, miesto?, status?, goly_domaci?, goly_hostia?, pocet_divakov?, poznamky?, video_url?, clanok_id?
 * @access Private (Admin)
 * @todo Pridať autentifikačný middleware
 */
router.put('/:id', updateMatch);

/**
 * @route DELETE /api/matches/:id
 * @desc Soft delete zápasu (označenie ako neaktívny)
 * @param id - ID zápasu  
 * @access Private (Admin)
 * @todo Pridať autentifikačný middleware
 */
router.delete('/:id', deleteMatch);

/**
 * @route PUT /api/matches/update-statuses
 * @desc Automatická aktualizácia statusov všetkých zápasov
 * @access Private (Admin)
 */
router.put('/update-statuses', updateMatchStatuses);

export default router;