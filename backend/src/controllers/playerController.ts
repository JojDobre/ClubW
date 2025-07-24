// backend/src/controllers/playerController.ts
// Controller pre CRUD operácie hráčov - FÁZA 3

import { Request, Response } from 'express';
import Player from '../models/Player';
import Team from '../models/Team';

// ===== HELPER FUNCTIONS =====

// Validácia hráčskych dát
const validatePlayerData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.meno || typeof data.meno !== 'string' || data.meno.length < 2 || data.meno.length > 50) {
    errors.push('Meno musí mať 2-50 znakov');
  }
  
  if (!data.priezvisko || typeof data.priezvisko !== 'string' || data.priezvisko.length < 2 || data.priezvisko.length > 50) {
    errors.push('Priezvisko musí mať 2-50 znakov');
  }
  
  if (!data.datum_narodenia) {
    errors.push('Dátum narodenia je povinný');
  } else {
    const birthDate = new Date(data.datum_narodenia);
    const today = new Date();
    if (birthDate >= today) {
      errors.push('Dátum narodenia nemôže byť v budúcnosti');
    }
  }
  
  if (!data.pozicia || typeof data.pozicia !== 'string' || data.pozicia.length < 2) {
    errors.push('Pozícia je povinná');
  }
  
  if (!data.tim_id || isNaN(parseInt(data.tim_id))) {
    errors.push('Tím je povinný');
  }
  
  if (data.cislo_dresu) {
    const cislo = parseInt(data.cislo_dresu);
    if (isNaN(cislo) || cislo < 1 || cislo > 99) {
      errors.push('Číslo dresu musí byť 1-99');
    }
  }
  
  if (data.vaha) {
    const vaha = parseFloat(data.vaha);
    if (isNaN(vaha) || vaha < 30 || vaha > 200) {
      errors.push('Váha musí byť 30-200 kg');
    }
  }
  
  if (data.vyska) {
    const vyska = parseInt(data.vyska);
    if (isNaN(vyska) || vyska < 120 || vyska > 250) {
      errors.push('Výška musí byť 120-250 cm');
    }
  }

  // PRIDAJ validáciu fotky:
  if (data.fotka && typeof data.fotka === 'string' && data.fotka.length > 500) {
    errors.push('URL fotky je príliš dlhé');
  }
  
  return errors;
};

const validatePlayerId = (id: string) => {
  const playerId = parseInt(id);
  if (isNaN(playerId) || playerId < 1) {
    return { valid: false, error: 'ID hráča musí byť kladné číslo' };
  }
  return { valid: true, id: playerId };
};

// ===== VEREJNÉ API ENDPOINTS =====

// GET /api/players - Zoznam všetkých hráčov
export const getPlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tim_id, pozicia, search, include_team } = req.query;

    // Základné filter podmienky
    const whereConditions: any = { aktivity: true };

    // Filter podľa tímu
    if (tim_id) {
      const teamId = parseInt(tim_id as string);
      if (!isNaN(teamId)) {
        whereConditions.tim_id = teamId;
      }
    }

    let players = await Player.findAll({
      where: whereConditions,
      order: [['tim_id', 'ASC'], ['cislo_dresu', 'ASC'], ['priezvisko', 'ASC']]
    });

    // Filter pozície v JS
    if (pozicia) {
      const poziciaTerm = (pozicia as string).toLowerCase();
      players = players.filter((player: any) => 
        player.pozicia.toLowerCase().includes(poziciaTerm)
      );
    }

    // Vyhľadávanie v mene/priezvisku
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      players = players.filter((player: any) => 
        player.meno.toLowerCase().includes(searchTerm) ||
        player.priezvisko.toLowerCase().includes(searchTerm)
      );
    }

    // Ak chceme info o tíme
    let result;
    if (include_team === 'true') {
      result = await Promise.all(players.map(async (player: any) => {
        const team = await Team.findByPk(player.tim_id);
        return {
          ...player.toSafeJSON(),
          tim: team ? team.toSafeJSON() : null
        };
      }));
    } else {
      result = players.map((player: any) => player.toSafeJSON());
    }

    res.json({
      success: true,
      data: result,
      count: result.length,
      message: `Nájdených ${result.length} hráčov`
    });

  } catch (error) {
    console.error('Chyba pri načítaní hráčov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní hráčov',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// GET /api/players/:id - Detail konkrétneho hráča
export const getPlayerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validatePlayerId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const playerId = validation.id!;
    const { include_team } = req.query;

    const player = await Player.findOne({
      where: { id: playerId, aktivity: true }
    });

    if (!player) {
      res.status(404).json({
        success: false,
        message: 'Hráč nebol nájdený'
      });
      return;
    }

    let playerData: any = (player as any).toSafeJSON();

    // Voliteľne pridáme info o tíme
    if (include_team === 'true') {
      const team = await Team.findByPk((player as any).tim_id);
      playerData.tim = team ? team.toSafeJSON() : null;
    }

    res.json({
      success: true,
      data: playerData,
      message: 'Hráč úspešne načítaný'
    });

  } catch (error) {
    console.error('Chyba pri načítaní hráča:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní hráča',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// POST /api/players - Vytvorenie nového hráča
export const createPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('POST /api/players - Received data:', JSON.stringify(req.body, null, 2));

    // PRIDAJ tento debug:
    console.log('Fotka URL:', req.body.fotka);
    console.log('Type fotky:', typeof req.body.fotka);


    // Validácia vstupných dát
    const validationErrors = validatePlayerData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: validationErrors
      });
      return;
    }

    const playerData = req.body;

    // Skontrolujeme, či tím existuje
    const team = await Team.findOne({
      where: { id: playerData.tim_id, aktivity: true }
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: 'Tím nebol nájdený'
      });
      return;
    }

    // Skontrolujeme číslo dresu (ak je zadané)
    if (playerData.cislo_dresu) {
      const existingPlayer = await Player.findOne({
        where: {
          cislo_dresu: playerData.cislo_dresu,
          tim_id: playerData.tim_id,
          aktivity: true
        }
      });

      if (existingPlayer) {
        res.status(409).json({
          success: false,
          message: `Číslo dresu ${playerData.cislo_dresu} je už obsadené v tíme ${team.getFullName()}`
        });
        return;
      }
    }

    // Vytvorenie hráča
    const newPlayer = await Player.create({
      meno: playerData.meno,
      priezvisko: playerData.priezvisko,
      datum_narodenia: playerData.datum_narodenia,
      cislo_dresu: playerData.cislo_dresu || null,
      pozicia: playerData.pozicia,
      narodnost: playerData.narodnost || null,
      vaha: playerData.vaha || null,
      vyska: playerData.vyska || null,
      fotka: playerData.fotka || null,
      tim_id: playerData.tim_id,
      poznamky: playerData.poznamky || null
    });

    console.log('Player created successfully:', newPlayer.id);

    res.status(201).json({
      success: true,
      data: (newPlayer as any).toSafeJSON(),
      message: `Hráč ${(newPlayer as any).getFullName()} bol úspešne vytvorený`
    });

  } catch (error) {
    console.error('Chyba pri vytváraní hráča:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní hráča',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// PUT /api/players/:id - Aktualizácia hráča
export const updatePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`PUT /api/players/${req.params.id} - Received data:`, req.body);

    const validation = validatePlayerId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const playerId = validation.id!;
    const updateData = req.body;

    const player = await Player.findOne({
      where: { id: playerId, aktivity: true }
    });

    if (!player) {
      res.status(404).json({
        success: false,
        message: 'Hráč nebol nájdený'
      });
      return;
    }

    // Skontrolujeme číslo dresu (ak sa mení)
    if (updateData.cislo_dresu && updateData.cislo_dresu !== (player as any).cislo_dresu) {
      const existingPlayer = await Player.findOne({
        where: {
          cislo_dresu: updateData.cislo_dresu,
          tim_id: (player as any).tim_id,
          aktivity: true,
          id: { [require('sequelize').Op.ne]: playerId }
        }
      });

      if (existingPlayer) {
        res.status(409).json({
          success: false,
          message: `Číslo dresu ${updateData.cislo_dresu} je už obsadené v tomto tíme`
        });
        return;
      }
    }

    // Aktualizácia
    await player.update(updateData);

    console.log('Player updated successfully:', player.id);

    res.json({
      success: true,
      data: (player as any).toSafeJSON(),
      message: `Hráč ${(player as any).getFullName()} bol úspešne aktualizovaný`
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii hráča:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii hráča',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// DELETE /api/players/:id - Soft delete hráča
export const deletePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`DELETE /api/players/${req.params.id}`);

    const validation = validatePlayerId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const playerId = validation.id!;

    const player = await Player.findOne({
      where: { id: playerId, aktivity: true }
    });

    if (!player) {
      res.status(404).json({
        success: false,
        message: 'Hráč nebol nájdený'
      });
      return;
    }

    // Soft delete
    await player.update({ aktivity: false });

    console.log('Player deleted successfully:', player.id);

    res.json({
      success: true,
      message: `Hráč ${(player as any).getFullName()} bol úspešne vymazaný`
    });

  } catch (error) {
    console.error('Chyba pri mazaní hráča:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní hráča',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};