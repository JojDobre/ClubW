// backend/src/routes/kalendarRoutes.ts
// Routes pre kalendár zápasov - FÁZA 4

import express from 'express';
import {
  getMonthCalendar,
  getWeekCalendar,
  getUpcomingMatches
} from '../controllers/kalendarController';

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

export default router;