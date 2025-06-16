// backend/src/routes/teams.ts
// OPRAVENÉ REST API routes pre tímy - BEZ express-validator

import { Router } from 'express';
import {
  getTeams,
  getTeamById,
  getTeamPlayers,
  getTeamStaff,
  createTeam,
  updateTeam,
  deleteTeam
} from '../controllers/teamController';

const router = Router();

// ===== VEREJNÉ ROUTES =====

/**
 * @route   GET /api/teams
 * @desc    Získať zoznam všetkých aktívnych tímov
 * @access  Verejné
 * @query   typ - filter podľa typu (muzi|zeny|mladez)
 * @query   search - vyhľadávanie v názve alebo kategórii
 * @query   include_stats - pridať štatistiky (true|false)
 * @example GET /api/teams?typ=mladez&include_stats=true
 */
router.get('/', getTeams);

/**
 * @route   GET /api/teams/:id
 * @desc    Získať detail konkrétneho tímu
 * @access  Verejné
 * @param   id - ID tímu
 * @query   include_players - pridať zoznam hráčov (true|false)
 * @query   include_staff - pridať realizačný tím (true|false)
 * @example GET /api/teams/1?include_players=true&include_staff=true
 */
router.get('/:id', getTeamById);

/**
 * @route   GET /api/teams/:id/players
 * @desc    Získať hráčov konkrétneho tímu
 * @access  Verejné
 * @param   id - ID tímu
 * @query   pozicia - filter podľa pozície
 * @example GET /api/teams/1/players?pozicia=brankár
 */
router.get('/:id/players', getTeamPlayers);

/**
 * @route   GET /api/teams/:id/staff
 * @desc    Získať realizačný tím konkrétneho tímu
 * @access  Verejné
 * @param   id - ID tímu
 * @query   funkcia - filter podľa funkcie
 * @example GET /api/teams/1/staff?funkcia=tréner
 */
router.get('/:id/staff', getTeamStaff);

// ===== ADMIN ROUTES (vyžadujú autentifikáciu) =====

/**
 * @route   POST /api/teams
 * @desc    Vytvoriť nový tím
 * @access  Admin
 * @body    nazov, typ, vekova_kategoria, popis?, logo?, farba_prva?, farba_druha?, poradie?
 */
router.post('/', createTeam);

/**
 * @route   PUT /api/teams/:id
 * @desc    Aktualizovať existujúci tím
 * @access  Admin
 * @param   id - ID tímu
 * @body    nazov?, typ?, vekova_kategoria?, popis?, logo?, farba_prva?, farba_druha?, poradie?
 */
router.put('/:id', updateTeam);

/**
 * @route   DELETE /api/teams/:id
 * @desc    Vymazať tím (soft delete)
 * @access  Admin
 * @param   id - ID tímu
 */
router.delete('/:id', deleteTeam);

export default router;