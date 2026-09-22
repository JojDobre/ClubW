// backend/src/controllers/teamController.ts
// OPRAVENÝ Controller pre REST API tímov - BEZ express-validator

import { Request, Response } from 'express';
import { overObrazkovySubor } from '../utils/obrazokValidator';
import Team from '../models/Team';
import Stadion from '../models/Stadion';
import Sezona from '../models/Sezona';
import Player from '../models/Player';
import Staff from '../models/Staff';

// ===== HELPER FUNCTIONS =====

// Jednoduchá validácia bez express-validator
const validateTeamData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.nazov || typeof data.nazov !== 'string' || data.nazov.length < 2 || data.nazov.length > 100) {
    errors.push('Názov musí mať 2-100 znakov');
  }
  
  if (!data.typ || !['muzi', 'zeny', 'mladez'].includes(data.typ)) {
    errors.push('Typ musí byť: muzi, zeny alebo mladez');
  }
  
  if (!data.vekova_kategoria || typeof data.vekova_kategoria !== 'string' || data.vekova_kategoria.length < 2) {
    errors.push('Veková kategória je povinná');
  }
  
  // Logo býva nahraté do uploads, nie externá adresa. Pôvodná kontrola
  // prijímala len https://..., takže logo z media knižnice sa nedalo
  // uložiť vôbec.
  if (data.logo && typeof data.logo === 'string') {
    try {
      overObrazkovySubor(data.logo);
    } catch (chyba) {
      errors.push((chyba as Error).message);
    }
  }
  
  if (data.farba_prva && typeof data.farba_prva === 'string') {
    const hexPattern = /^#[0-9A-F]{6}$/i;
    if (!hexPattern.test(data.farba_prva)) {
      errors.push('Prvá farba musí byť platný hex kód');
    }
  }
  
  if (data.farba_druha && typeof data.farba_druha === 'string') {
    const hexPattern = /^#[0-9A-F]{6}$/i;
    if (!hexPattern.test(data.farba_druha)) {
      errors.push('Druhá farba musí byť platný hex kód');
    }
  }
  
  return errors;
};

const validateTeamId = (id: string) => {
  const teamId = parseInt(id);
  if (isNaN(teamId) || teamId < 1) {
    return { valid: false, error: 'ID tímu musí byť kladné číslo' };
  }
  return { valid: true, id: teamId };
};

// ===== VEREJNÉ API ENDPOINTS =====

// GET /api/teams - Zoznam všetkých aktívnych tímov
export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { typ, search, include_stats } = req.query;

    // Základné filter podmienky
    const whereConditions: any = { aktivity: true };

    // Filter podľa typu
    if (typ && ['muzi', 'zeny', 'mladez'].includes(typ as string)) {
      whereConditions.typ = typ;
    }

    let teams = await Team.findAll({
      where: whereConditions,
      order: [['poradie', 'ASC'], ['nazov', 'ASC']]
    });

    // Vyhľadávanie v JS (bez Sequelize Op.iLike)
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      teams = teams.filter(team => 
        team.nazov.toLowerCase().includes(searchTerm) ||
        team.vekova_kategoria.toLowerCase().includes(searchTerm)
      );
    }

    // Ak chceme štatistiky, pridáme počty hráčov a realizačného tímu
    let result;
    if (include_stats === 'true') {
      result = await Promise.all(teams.map(async (team) => {
        const playersCount = await Player.count({
          where: { tim_id: team.id, aktivity: true }
        });
        const staffCount = await Staff.count({
          where: { tim_id: team.id, aktivity: true }
        });

        return {
          ...team.toSafeJSON(),
          pocet_hracov: playersCount,
          pocet_realizacny_tim: staffCount
        };
      }));
    } else {
      result = teams.map(team => team.toSafeJSON());
    }

    res.json({
      success: true,
      data: result,
      message: `Nájdených ${result.length} tímov`
    });

  } catch (error) {
    console.error('Chyba pri načítaní tímov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní tímov',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// GET /api/teams/:id - Detail konkrétneho tímu
export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateTeamId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const teamId = validation.id!;
    const { include_players, include_staff } = req.query;

    const team = await Team.findOne({
      where: { id: teamId, aktivity: true }
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: 'Tím nebol nájdený'
      });
      return;
    }

    let teamData: any = team.toSafeJSON();

    // Voliteľne pridáme hráčov
    if (include_players === 'true') {
      const players = await Player.findAll({
        where: { tim_id: teamId, aktivity: true },
        order: [['cislo_dresu', 'ASC']]
      });
      teamData.hraci = players.map((player: any) => player.toSafeJSON());
    }

    // Voliteľne pridáme realizačný tím
    if (include_staff === 'true') {
      const staff = await Staff.findAll({
        where: { tim_id: teamId, aktivity: true },
        order: [['poradie', 'ASC']]
      });
      teamData.realizacny_tim = staff.map((member: any) => member.toSafeJSON());
    }

    res.json({
      success: true,
      data: teamData,
      message: 'Tím úspešne načítaný'
    });

  } catch (error) {
    console.error('Chyba pri načítaní tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// GET /api/teams/:id/players - Hráči konkrétneho tímu
export const getTeamPlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateTeamId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const teamId = validation.id!;
    const { pozicia } = req.query;

    // Skontrolujeme, či tím existuje
    const team = await Team.findOne({
      where: { id: teamId, aktivity: true }
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: 'Tím nebol nájdený'
      });
      return;
    }

    // Filter podmienky pre hráčov
    const whereConditions: any = { tim_id: teamId, aktivity: true };
    
    let players = await Player.findAll({
      where: whereConditions,
      order: [['cislo_dresu', 'ASC']]
    });

    // Filter pozície v JS
    if (pozicia) {
      const poziciaTerm = (pozicia as string).toLowerCase();
      players = players.filter((player: any) => 
        player.pozicia.toLowerCase().includes(poziciaTerm)
      );
    }

    res.json({
      success: true,
      data: {
        tim: team.toSafeJSON(),
        hraci: players.map((player: any) => player.toSafeJSON())
      },
      message: `Nájdených ${players.length} hráčov pre tím ${team.getFullName()}`
    });

  } catch (error) {
    console.error('Chyba pri načítaní hráčov tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní hráčov',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// GET /api/teams/:id/staff - Realizačný tím konkrétneho tímu
export const getTeamStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateTeamId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const teamId = validation.id!;
    const { funkcia } = req.query;

    // Skontrolujeme, či tím existuje
    const team = await Team.findOne({
      where: { id: teamId, aktivity: true }
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: 'Tím nebol nájdený'
      });
      return;
    }

    // Filter podmienky pre realizačný tím
    const whereConditions: any = { tim_id: teamId, aktivity: true };
    
    let staff = await Staff.findAll({
      where: whereConditions,
      order: [['poradie', 'ASC']]
    });

    // Filter funkcie v JS
    if (funkcia) {
      const funkciaTerm = (funkcia as string).toLowerCase();
      staff = staff.filter((member: any) => 
        member.funkcia.toLowerCase().includes(funkciaTerm)
      );
    }

    res.json({
      success: true,
      data: {
        tim: team.toSafeJSON(),
        realizacny_tim: staff.map((member: any) => member.toSafeJSON())
      },
      message: `Nájdených ${staff.length} členov realizačného tímu pre tím ${team.getFullName()}`
    });

  } catch (error) {
    console.error('Chyba pri načítaní realizačného tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní realizačného tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ===== ADMIN API ENDPOINTS =====


/**
 * Overí, že štadión a sezóna, na ktoré sa tím odkazuje, naozaj existujú.
 *
 * Bez toho by zápis padol až na cudzom kľúči a používateľ by dostal 500
 * namiesto zrozumiteľnej hlášky.
 *
 * @returns text chyby, alebo null keď je všetko v poriadku
 */
const overVazbyTimu = async (udaje: any): Promise<string | null> => {
  if (udaje.stadion_id) {
    const stadion = await Stadion.findOne({ where: { id: udaje.stadion_id, aktivity: true } });
    if (!stadion) return `Štadión s ID ${udaje.stadion_id} neexistuje`;
  }
  if (udaje.sezona_id) {
    const sezona = await Sezona.findOne({ where: { id: udaje.sezona_id, aktivity: true } });
    if (!sezona) return `Sezóna s ID ${udaje.sezona_id} neexistuje`;
  }
  return null;
};

// POST /api/teams - Vytvorenie nového tímu
export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('POST /api/teams - Received data:', req.body);

    // Validácia vstupných dát
    const validationErrors = validateTeamData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: validationErrors
      });
      return;
    }

    const teamData = req.body;

    const chybaVazby = await overVazbyTimu(teamData);
    if (chybaVazby) {
      res.status(400).json({ success: false, message: chybaVazby });
      return;
    }

    // Skontrolujeme duplicitný názov + veková kategória
    const existingTeam = await Team.findOne({
      where: {
        nazov: teamData.nazov,
        vekova_kategoria: teamData.vekova_kategoria,
        aktivity: true
      }
    });

    if (existingTeam) {
      res.status(409).json({
        success: false,
        message: `Tím ${teamData.nazov} ${teamData.vekova_kategoria} už existuje`
      });
      return;
    }

    // Vytvorenie tímu s manuálnym slug generovaním
    const newTeam = await Team.create({
      nazov: teamData.nazov,
      slug: Team.generateSlug(`${teamData.nazov}-${teamData.vekova_kategoria}`), // Manuálne generovanie slug
      typ: teamData.typ,
      vekova_kategoria: teamData.vekova_kategoria,
      popis: teamData.popis || null,
      stadion_id: teamData.stadion_id || null,
      sezona_id: teamData.sezona_id || null,
      logo: teamData.logo || null,
      farba_prva: teamData.farba_prva || null,
      farba_druha: teamData.farba_druha || null,
      poradie: teamData.poradie || 0
    });

    console.log('Team created successfully:', newTeam.id);

    res.status(201).json({
      success: true,
      data: newTeam.toSafeJSON(),
      message: `Tím ${newTeam.getFullName()} bol úspešne vytvorený`
    });

  } catch (error) {
    console.error('Chyba pri vytváraní tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// PUT /api/teams/:id - Aktualizácia tímu
export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`PUT /api/teams/${req.params.id} - Received data:`, req.body);

    const validation = validateTeamId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const teamId = validation.id!;
    const updateData = req.body;

    const team = await Team.findOne({
      where: { id: teamId, aktivity: true }
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: 'Tím nebol nájdený'
      });
      return;
    }

    const chybaVazby = await overVazbyTimu(updateData);
    if (chybaVazby) {
      res.status(400).json({ success: false, message: chybaVazby });
      return;
    }

    // Aktualizácia
    await team.update(updateData);

    console.log('Team updated successfully:', team.id);

    res.json({
      success: true,
      data: team.toSafeJSON(),
      message: `Tím ${team.getFullName()} bol úspešne aktualizovaný`
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// DELETE /api/teams/:id - Soft delete tímu
export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`DELETE /api/teams/${req.params.id}`);

    const validation = validateTeamId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const teamId = validation.id!;

    const team = await Team.findOne({
      where: { id: teamId, aktivity: true }
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: 'Tím nebol nájdený'
      });
      return;
    }

    // Skontrolujeme, či má tím hráčov alebo realizačný tím
    const playersCount = await Player.count({
      where: { tim_id: teamId, aktivity: true }
    });
    const staffCount = await Staff.count({
      where: { tim_id: teamId, aktivity: true }
    });

    if (playersCount > 0 || staffCount > 0) {
      res.status(409).json({
        success: false,
        message: `Nemožno vymazať tím ${team.getFullName()}. Má priradených ${playersCount} hráčov a ${staffCount} členov realizačného tímu.`,
        data: {
          pocet_hracov: playersCount,
          pocet_realizacny_tim: staffCount
        }
      });
      return;
    }

    // Soft delete
    await team.update({ aktivity: false });

    console.log('Team deleted successfully:', team.id);

    res.json({
      success: true,
      message: `Tím ${team.getFullName()} bol úspešne vymazaný`
    });

  } catch (error) {
    console.error('Chyba pri mazaní tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};