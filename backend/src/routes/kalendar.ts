// backend/src/routes/kalendarRoutes.ts
// Routes pre kalendár zápasov - FÁZA 4

import express from 'express';
import {
  getMonthCalendar,
  getWeekCalendar,
  getUpcomingMatches
} from '../controllers/kalendarController';
import {
  getUdalosti,
  getUdalost,
  createUdalost,
  updateUdalost,
  deleteUdalost,
} from '../controllers/kalendarUdalostController';
import { authenticateToken, requireEditor } from '../middleware/auth';

const router = express.Router();

// ===== KALENDÁR ROUTES =====

/**
 * @route GET /api/calendar/month/:rok/:mesiac
 * @desc Mesačný kalendár zápasov
 * @param rok - Rok (2020-2030)
 * @param mesiac - Mesiac (1-12)
 * @query liga_id - filter podľa ligy
 * @query tim_id - filter podľa tímu (domáci alebo hosťujúci)
 * @access Public
 * @example GET /api/calendar/month/2024/8
 * @example GET /api/calendar/month/2024/8?liga_id=1
 */
router.get('/month/:rok/:mesiac', getMonthCalendar);

/**
 * @route GET /api/calendar/week/:rok/:mesiac/:den
 * @desc Týždenný kalendár zápasov (týždeň obsahujúci zadaný dátum)
 * @param rok - Rok
 * @param mesiac - Mesiac
 * @param den - Deň
 * @query liga_id - filter podľa ligy
 * @query tim_id - filter podľa tímu (domáci alebo hosťujúci)
 * @access Public
 * @example GET /api/calendar/week/2024/8/15
 */
router.get('/week/:rok/:mesiac/:den', getWeekCalendar);

/**
 * @route GET /api/calendar/upcoming
 * @desc Nadchádzajúce zápasy (v chronologickom poradí)
 * @query limit - počet zápasov (default: 10)
 * @query liga_id - filter podľa ligy
 * @query tim_id - filter podľa tímu (domáci alebo hosťujúci)
 * @access Public
 * @example GET /api/calendar/upcoming?limit=5
 * @example GET /api/calendar/upcoming?tim_id=1&limit=3
 */
router.get('/upcoming', getUpcomingMatches);

// ===== VLASTNÉ UDALOSTI (tréningy, sústredenia, klubové akcie) =====
//
// Doteraz kalendár vedel len čítať zápasy. Vlastnú udalosť sa nedalo
// vytvoriť vôbec.

/**
 * @route GET /api/calendar/events
 * @desc Výskyty udalostí v rozsahu. ?od=&do= (bez nich aktuálny mesiac),
 *       ?tim_id= obmedzí na jeden tím. Opakovanie je už rozvinuté.
 * @access Public - tréningy patria na klubový web
 */
router.get('/events', getUdalosti);

/** @route GET /api/calendar/events/:id - jedna udalosť aj s pravidlom */
router.get('/events/:id', getUdalost);

/** @route POST /api/calendar/events */
router.post('/events', authenticateToken, requireEditor, createUdalost);

/** @route PUT /api/calendar/events/:id - zmena platí pre celý rad */
router.put('/events/:id', authenticateToken, requireEditor, updateUdalost);

/** @route DELETE /api/calendar/events/:id - zruší celý rad */
router.delete('/events/:id', authenticateToken, requireEditor, deleteUdalost);

export default router;
