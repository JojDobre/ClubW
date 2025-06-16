// backend/src/routes/staff.ts
// REST API routes pre realizačný tím - FÁZA 3

import { Router } from 'express';
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff
} from '../controllers/staffController';

const router = Router();

// ===== VEREJNÉ ROUTES =====

/**
 * @route   GET /api/staff
 * @desc    Získať zoznam všetkých aktívnych členov realizačného tímu
 * @access  Verejné
 * @query   tim_id - filter podľa tímu
 * @query   funkcia - filter podľa funkcie
 * @query   search - vyhľadávanie v mene/priezvisku
 * @query   include_team - pridať info o tíme (true|false)
 * @query   klubovi - len kluboví členovia bez priradenia k tímu (true|false)
 * @example GET /api/staff?tim_id=1&funkcia=tréner&include_team=true
 * @example GET /api/staff?klubovi=true - len členovia pracujúci pre celý klub
 */
router.get('/', getStaff);

/**
 * @route   GET /api/staff/:id
 * @desc    Získať detail konkrétneho člena realizačného tímu
 * @access  Verejné
 * @param   id - ID člena realizačného tímu
 * @query   include_team - pridať info o tíme (true|false)
 * @example GET /api/staff/1?include_team=true
 */
router.get('/:id', getStaffById);

// ===== ADMIN ROUTES (vyžadujú autentifikáciu) =====

/**
 * @route   POST /api/staff
 * @desc    Vytvoriť nového člena realizačného tímu
 * @access  Admin
 * @body    meno, priezvisko, funkcia, email?, telefon?, datum_narodenia?, kvalifikacia?, fotka?, tim_id?, poznamky?, poradie?
 * @example 
 * {
 *   "meno": "Ján",
 *   "priezvisko": "Tréner", 
 *   "funkcia": "hlavný tréner",
 *   "email": "trener@klub.sk",
 *   "telefon": "+421901234567",
 *   "datum_narodenia": "1980-05-15",
 *   "kvalifikacia": "UEFA A licencia",
 *   "tim_id": 1,
 *   "poradie": 1
 * }
 */
router.post('/', createStaff);

/**
 * @route   PUT /api/staff/:id
 * @desc    Aktualizovať existujúceho člena realizačného tímu
 * @access  Admin
 * @param   id - ID člena realizačného tímu
 * @body    meno?, priezvisko?, funkcia?, email?, telefon?, datum_narodenia?, kvalifikacia?, fotka?, tim_id?, poznamky?, poradie?
 */
router.put('/:id', updateStaff);

/**
 * @route   DELETE /api/staff/:id
 * @desc    Vymazať člena realizačného tímu (soft delete)
 * @access  Admin
 * @param   id - ID člena realizačného tímu
 */
router.delete('/:id', deleteStaff);

export default router;