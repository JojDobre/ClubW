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
// Controller pre štatistiky zápasu (góly, asistencie, karty)
import { getMatchStatistics, setMatchStatistics } from '../controllers/ZapasStatistikaController';
// Auth middleware - ochrana zápisových operácií pred neprihlásenými používateľmi
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';

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
 */
router.post('/', authenticateToken, requireEditor, createMatch);

/**
 * @route GET /api/matches/:id/statistics
 * @desc Štatistiky zápasu - góly, asistencie, karty
 * @access Public
 */
router.get('/:id/statistics', getMatchStatistics);

/**
 * @route PUT /api/matches/:id/statistics
 * @desc Nastavenie štatistík zápasu (nahradí predchádzajúce)
 * @access Private (Admin/Redaktor)
 */
router.put('/:id/statistics', authenticateToken, requireEditor, setMatchStatistics);

/**
 * @route PUT /api/matches/update-statuses
 * @desc Automatická aktualizácia statusov všetkých zápasov
 * @access Private (Admin/Redaktor)
 * POZOR: musí byť definovaný PRED PUT /:id, inak Express namatchuje
 * "update-statuses" ako :id a tento endpoint je nedosiahnuteľný
 */
router.put('/update-statuses', authenticateToken, requireEditor, updateMatchStatuses);

/**
 * @route PUT /api/matches/:id  
 * @desc Aktualizácia existujúceho zápasu
 * @param id - ID zápasu
 * @body nazov?, liga_id?, datum_cas?, domaci_tim_id?, hostujuci_tim_id?, kolo?, miesto?, status?, goly_domaci?, goly_hostia?, pocet_divakov?, poznamky?, video_url?, clanok_id?
 * @access Private (Admin)
 */
router.put('/:id', authenticateToken, requireEditor, updateMatch);

/**
 * @route DELETE /api/matches/:id
 * @desc Soft delete zápasu (označenie ako neaktívny)
 * @param id - ID zápasu  
 * @access Private (Admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, deleteMatch);


export default router;