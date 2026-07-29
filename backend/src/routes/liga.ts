// backend/src/routes/liga.ts
// Rozšírené routes pre ligy s tabuľkami a turnajmi - FÁZA 4+

import express from 'express';
import {
  // Základné CRUD operácie
  getLeagues,
  getLeague,
  createLeague,
  updateLeague,
  deleteLeague,
  
  // Tabuľkové operácie
  getLeagueTableEndpoint,
  recalculateLeagueTableEndpoint,
  updateLeagueTableEndpoint,
  
  // Turnajové operácie
  getLeagueTournamentEndpoint,
  
  // Štatistiky a prehľady
  getLeagueStatsEndpoint,
  getLeagueOverviewEndpoint,
  
  // Import/Export
  exportLeagueTableEndpoint,
  importLeagueTableEndpoint
} from '../controllers/ligaController';
// Controller pre poradie strelcov ligy
import { getTopScorers } from '../controllers/ZapasStatistikaController';
// Auth middleware - ochrana zápisových operácií pred neprihlásenými používateľmi
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';

const router = express.Router();

// ===== ZÁKLADNÉ CRUD ROUTES =====

/**
 * @route GET /api/leagues
 * @desc Získať zoznam všetkých aktívnych líg s rozšírenými filtrami
 * @query typ - filter podľa typu (sutaz|pohar|priatelska)
 * @query format - filter podľa formátu (tabulka|turnaj|kombinovany)
 * @query status - filter podľa statusu (upcoming|active|finished)
 * @query search - vyhľadávanie v názve, sezóne a popise
 * @query include_stats - pridanie štatistík (true/false)
 * @query include_table - pridanie top 10 tabuľky (true/false)
 * @query limit - počet výsledkov (default: 50)
 * @query offset - offset pre pagináciu (default: 0)
 * @access Public
 * @example GET /api/leagues?typ=sutaz&format=tabulka&include_stats=true&limit=20
 */
/**
 * @route GET /api/leagues/:id/top-scorers
 * @desc Poradie najlepších strelcov (alebo asistentov) ligy
 * @access Public
 */
router.get('/:id/top-scorers', getTopScorers);

router.get('/', getLeagues);

/**
 * @route GET /api/leagues/:id
 * @desc Získať detail konkrétnej ligy s rozšírenými dátami
 * @param id - ID ligy
 * @query include_table - pridanie kompletnej tabuľky (true/false)
 * @query include_tournament - pridanie turnajových dát (true/false)
 * @query include_stats - pridanie štatistík (true/false)
 * @query include_matches - pridanie posledných zápasov (true/false)
 * @access Public
 * @example GET /api/leagues/1?include_table=true&include_stats=true
 */
router.get('/:id', getLeague);

/**
 * @route POST /api/leagues
 * @desc Vytvorenie novej ligy s rozšírenou funkcionalitou
 * @body {
 *   nazov: string,
 *   sezona: string,
 *   typ: 'sutaz'|'pohar'|'priatelska',
 *   format: 'tabulka'|'turnaj'|'kombinovany',
 *   datum_start?: string,
 *   datum_koniec?: string,
 *   pocet_timov?: number,
 *   body_za_vitazstvo?: number (default: 3),
 *   body_za_remizy?: number (default: 1),
 *   body_za_prehru?: number (default: 0),
 *   auto_update_tabulka?: boolean (default: true),
 *   zobrazit_formu?: boolean (default: true),
 *   min_zapasov?: number (default: 0),
 *   turnaj_typ?: 'single_elimination'|'double_elimination'|'round_robin'|'groups_playoff',
 *   turnaj_pocet_postupujucich?: number,
 *   popis?: string,
 *   logo?: string,
 *   farba?: string,
 *   external_widget_url?: string,
 *   external_sync?: boolean (default: false)
 * }
 * @access Private (Admin)
 */
router.post('/', authenticateToken, requireEditor, createLeague);

/**
 * @route PUT /api/leagues/:id  
 * @desc Aktualizácia existujúcej ligy s rozšírenou funkcionalitou
 * @param id - ID ligy
 * @body Rovnaké polia ako pri POST, všetky voliteľné
 * @access Private (Admin)
 */
router.put('/:id', authenticateToken, requireEditor, updateLeague);

/**
 * @route DELETE /api/leagues/:id
 * @desc Soft delete ligy (označenie ako neaktívna)
 * @param id - ID ligy  
 * @access Private (Admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, deleteLeague);

// ===== TABUĽKOVÉ ROUTES =====

/**
 * @route GET /api/leagues/:id/table
 * @desc Získanie tabuľky súťaže s kompletními štatistikami
 * @param id - ID ligy
 * @query include_inactive - zahrnúť neaktívne tímy (true/false, default: false)
 * @access Public
 * @example GET /api/leagues/1/table
 */
router.get('/:id/table', getLeagueTableEndpoint);

/**
 * @route POST /api/leagues/:id/table/recalculate
 * @desc Automatické prepočítanie tabuľky na základe výsledkov zápasov
 * @param id - ID ligy
 * @access Private (Admin)
 * @note Funguje len ak má liga zapnutú automatickú aktualizáciu
 */
router.post('/:id/table/recalculate', authenticateToken, requireEditor, recalculateLeagueTableEndpoint);

/**
 * @route PUT /api/leagues/:id/table
 * @desc Manuálna úprava tabuľky súťaže
 * @param id - ID ligy
 * @body {
 *   tabulka_data: Array<{
 *     id: number,
 *     pozicia: number,
 *     body?: number,
 *     zapasy?: number,
 *     vitazstva?: number,
 *     remizy?: number,
 *     prehry?: number,
 *     goly_za?: number,
 *     goly_proti?: number,
 *     penalizacne_body?: number,
 *     bonus_body?: number,
 *     poznamky?: string
 *   }>
 * }
 * @access Private (Admin)
 */
router.put('/:id/table', authenticateToken, requireEditor, updateLeagueTableEndpoint);

// ===== TURNAJOVÉ ROUTES =====

/**
 * @route GET /api/leagues/:id/tournament
 * @desc Získanie turnajových dát (pavúk, skupiny, postupujúci)
 * @param id - ID ligy
 * @access Public
 * @example GET /api/leagues/1/tournament
 */
router.get('/:id/tournament', getLeagueTournamentEndpoint);

// ===== ŠTATISTIKY A PREHĽADY =====

/**
 * @route GET /api/leagues/:id/stats
 * @desc Získanie štatistík ligy (počty zápasov, gólov, tímov, lídri)
 * @param id - ID ligy
 * @access Public
 * @example GET /api/leagues/1/stats
 */
router.get('/:id/stats', getLeagueStatsEndpoint);

/**
 * @route GET /api/leagues/:id/overview
 * @desc Kompletný prehľad ligy (liga + tabuľka + turnaj + štatistiky)
 * @param id - ID ligy
 * @access Public
 * @note Optimalizovaný endpoint pre získanie všetkých dát naraz
 * @example GET /api/leagues/1/overview
 */
router.get('/:id/overview', getLeagueOverviewEndpoint);

// ===== IMPORT/EXPORT ROUTES =====

/**
 * @route GET /api/leagues/:id/export
 * @desc Export tabuľky do JSON alebo CSV formátu
 * @param id - ID ligy
 * @query format - formát exportu (json|csv, default: json)
 * @access Private (Admin)
 * @returns File download
 * @example GET /api/leagues/1/export?format=csv
 */
router.get('/:id/export', exportLeagueTableEndpoint);

/**
 * @route POST /api/leagues/:id/import
 * @desc Import tabuľky z JSON alebo CSV formátu
 * @param id - ID ligy
 * @body {
 *   data: Array<TabulkaRecord> | string,
 *   format: 'json'|'csv' (default: 'json')
 * }
 * @access Private (Admin)
 * @note Vymaže existujúcu tabuľku a nahradí ju importovanými dátami
 */
router.post('/:id/import', authenticateToken, requireEditor, importLeagueTableEndpoint);

// ===== POKROČILÉ ROUTES (pre budúce rozšírenia) =====

/**
 * @route GET /api/leagues/:id/matches
 * @desc Získanie všetkých zápasov ligy s filtrovaniem
 * @param id - ID ligy
 * @query status - filter podľa statusu zápasu
 * @query limit - počet výsledkov
 * @query offset - offset pre pagináciu
 * @access Public
 * @todo Implementovať v ZapasController
 */
// router.get('/:id/matches', getLeagueMatchesEndpoint);

/**
 * @route GET /api/leagues/:id/standings/history
 * @desc História zmien v tabuľke (snapshoty po jednotlivých kolách)
 * @param id - ID ligy
 * @access Public
 * @todo Implementovať v budúcnosti
 */
// router.get('/:id/standings/history', getStandingsHistoryEndpoint);

/**
 * @route POST /api/leagues/:id/table/reset
 * @desc Reset tabuľky na prázdnu (zachováva len tímy)
 * @param id - ID ligy
 * @access Private (Admin)
 * @todo Implementovať v budúcnosti
 */
// router.post('/:id/table/reset', resetLeagueTableEndpoint);

/**
 * @route GET /api/leagues/:id/predictions
 * @desc Predikcie konečného poradia na základe aktuálnej formy
 * @param id - ID ligy
 * @access Public
 * @todo Implementovať v budúcnosti s ML algoritmami
 */
// router.get('/:id/predictions', getLeaguePredictionsEndpoint);

/**
 * @route POST /api/leagues/:id/simulate
 * @desc Simulácia zostávajúcich zápasov v lige
 * @param id - ID ligy
 * @body simulation_params - parametre simulácie
 * @access Private (Admin)
 * @todo Implementovať v budúcnosti
 */
// router.post('/:id/simulate', simulateRemainingMatchesEndpoint);

// ===== BULK OPERÁCIE =====

/**
 * @route POST /api/leagues/bulk
 * @desc Hromadné operácie s ligami (create, update, delete)
 * @body {
 *   operation: 'create'|'update'|'delete',
 *   data: Array<Liga>
 * }
 * @access Private (Admin)
 * @todo Implementovať v budúcnosti pre mass operations
 */
// router.post('/bulk', bulkLeagueOperationsEndpoint);

export default router;

// ===== PRÍKLADY POUŽITIA API =====

/*

=== VYTVORENIE NOVEJ LIGY S TABUĽKOU ===
POST /api/leagues
{
  "nazov": "Slovenská Fortuna Liga",
  "sezona": "2024/2025",
  "typ": "sutaz",
  "format": "tabulka",
  "datum_start": "2024-07-15",
  "datum_koniec": "2025-05-30",
  "pocet_timov": 12,
  "body_za_vitazstvo": 3,
  "body_za_remizy": 1,
  "body_za_prehru": 0,
  "auto_update_tabulka": true,
  "zobrazit_formu": true,
  "min_zapasov": 5,
  "popis": "Najvyššia slovenská futbalová súťaž",
  "farba": "#FF6B35"
}

=== VYTVORENIE TURNAJA ===
POST /api/leagues
{
  "nazov": "Slovenský Pohár",
  "sezona": "2024/2025",
  "typ": "pohar", 
  "format": "turnaj",
  "turnaj_typ": "single_elimination",
  "pocet_timov": 16,
  "datum_start": "2024-09-01",
  "datum_koniec": "2024-12-15",
  "auto_update_tabulka": false,
  "popis": "Vyraďovacia súťaž slovenských tímov"
}

=== KOMBINOVANÝ FORMÁT (SKUPINY + PLAYOFF) ===
POST /api/leagues  
{
  "nazov": "Liga majstrov - simulácia",
  "sezona": "2024/2025",
  "typ": "sutaz",
  "format": "kombinovany",
  "turnaj_typ": "groups_playoff",
  "pocet_timov": 32,
  "turnaj_pocet_postupujucich": 2,
  "datum_start": "2024-09-15",
  "datum_koniec": "2025-05-31"
}

=== ZÍSKANIE KOMPLETNÉHO PREHĽADU LIGY ===
GET /api/leagues/1/overview
Response:
{
  "success": true,
  "data": {
    "liga": {  Liga info  },
    "tabulka": [  Kompletná tabuľka  ],
    "turnaj": {  Turnajové dáta  },
    "statistiky": {
      "celkove_zapasy": 132,
      "ukoncene_zapasy": 95,
      "naplanovane_zapasy": 37,
      "pocet_timov": 12,
      "celkove_goly": 247,
      "priemer_golov_na_zapas": "2.60",
      "lidri_tabulky": [...]
    }
  }
}

=== PREPOČÍTANIE TABUĽKY ===
POST /api/leagues/1/table/recalculate
Response: Automaticky prepočítaná tabuľka na základe výsledkov

=== MANUÁLNA ÚPRAVA TABUĽKY ===
PUT /api/leagues/1/table
{
  "tabulka_data": [
    {
      "id": 15,
      "pozicia": 1,
      "body": 25,
      "penalizacne_body": -3,
      "poznamky": "Penalizácia za nedodržanie finančných pravidiel"
    }
  ]
}

=== EXPORT TABUĽKY ===
GET /api/leagues/1/export?format=csv
Returns: CSV file download

=== IMPORT TABUĽKY ===
POST /api/leagues/1/import
{
  "format": "json",
  "data": [
    {
      "tim_id": 1,
      "pozicia": 1,
      "body": 30,
      "zapasy": 15,
      "vitazstva": 10,
      "remizy": 0,
      "prehry": 5
    }
  ]
}

*/