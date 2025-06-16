// backend/src/routes/players.ts
// REST API routes pre hráčov - FÁZA 3

import { Router } from 'express';
import {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer
} from '../controllers/playerController';

const router = Router();

// ===== VEREJNÉ ROUTES =====

/**
 * @route   GET /api/players
 * @desc    Získať zoznam všetkých aktívnych hráčov
 * @access  Verejné
 * @query   tim_id - filter podľa tímu
 * @query   pozicia - filter podľa pozície
 * @query   search - vyhľadávanie v mene/priezvisku
 * @query   include_team - pridať info o tíme (true|false)
 * @example GET /api/players?tim_id=1&pozicia=brankár&include_team=true
 */
router.get('/', getPlayers);

/**
 * @route   GET /api/players/:id
 * @desc    Získať detail konkrétneho hráča
 * @access  Verejné
 * @param   id - ID hráča
 * @query   include_team - pridať info o tíme (true|false)
 * @example GET /api/players/1?include_team=true
 */
router.get('/:id', getPlayerById);

// ===== ADMIN ROUTES (vyžadujú autentifikáciu) =====

/**
 * @route   POST /api/players
 * @desc    Vytvoriť nového hráča
 * @access  Admin
 * @body    meno, priezvisko, datum_narodenia, pozicia, tim_id, cislo_dresu?, narodnost?, vaha?, vyska?, fotka?, poznamky?
 */
router.post('/', createPlayer);

/**
 * @route   PUT /api/players/:id
 * @desc    Aktualizovať existujúceho hráča
 * @access  Admin
 * @param   id - ID hráča
 * @body    meno?, priezvisko?, datum_narodenia?, pozicia?, tim_id?, cislo_dresu?, narodnost?, vaha?, vyska?, fotka?, poznamky?
 */
router.put('/:id', updatePlayer);

/**
 * @route   DELETE /api/players/:id
 * @desc    Vymazať hráča (soft delete)
 * @access  Admin
 * @param   id - ID hráča
 */
router.delete('/:id', deletePlayer);

export default router;