// backend/src/controllers/teamController.ts
// OPRAVENÝ Controller pre REST API tímov - BEZ express-validator

import { Request, Response } from 'express';
import { odpovedzNaChybuModelu } from '../utils/odpoved';
import { overObrazkovySubor } from '../utils/obrazokValidator';
import Team from '../models/Team';
import Stadion from '../models/Stadion';
import Sezona from '../models/Sezona';
import Player from '../models/Player';
import Staff from '../models/Staff';
import Zapas from '../models/Zapas';
import ZapasZostava from '../models/ZapasZostava';
import ZapasStatistika from '../models/ZapasStatistika';
import { fn, col } from 'sequelize';

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

/**
 * GET /api/teams/:id/players/stats - štatistiky hráčov tímu
 *
 * Pre karty hráčov na webe: počet odohraných zápasov (zo zostáv),
 * góly, asistencie a karty (z udalostí zápasov). Voliteľne len
 * v jednej súťaži (?liga_id=), inak zo všetkých zápasov.
 */
export const getTeamPlayerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateTeamId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({ success: false, message: validation.error });
      return;
    }
    const ligaId = req.query.liga_id !== undefined ? Number(req.query.liga_id) : null;
    if (ligaId !== null && (!Number.isInteger(ligaId) || ligaId <= 0)) {
      res.status(400).json({ success: false, message: 'Neplatné ID ligy' });
      return;
    }

    const hraci = await Player.findAll({ where: { tim_id: validation.id!, aktivity: true }, attributes: ['id'] });
    const idHracov = hraci.map((h) => h.id);
    if (idHracov.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const zapas = {
      model: Zapas,
      as: 'zapas',
      attributes: [],
      where: { aktivity: true, ...(ligaId ? { liga_id: ligaId } : {}) },
      required: true,
    };

    // Odohrané zápasy, minúty a čisté kontá zo zostáv ukončených zápasov
    const zostavy = (await ZapasZostava.findAll({
      attributes: ['hrac_id', 'zapas_id', 'zaradenie', 'odohrane_minuty'],
      where: { hrac_id: idHracov },
      include: [
        {
          ...zapas,
          attributes: ['domaci_tim_id', 'hostujuci_tim_id', 'goly_domaci', 'goly_hostia'],
          where: { ...zapas.where, status: 'ukonceny' },
        },
      ],
      raw: true,
      nest: true,
    })) as unknown as Array<{
      hrac_id: number;
      zapas_id: number;
      zaradenie: 'zakladna' | 'lavicka';
      odohrane_minuty: number | null;
      zapas: { domaci_tim_id: number | null; hostujuci_tim_id: number | null; goly_domaci: number | null; goly_hostia: number | null };
    }>;

    const udalosti = (await ZapasStatistika.findAll({
      attributes: ['hrac_id', 'typ', [fn('COUNT', col('ZapasStatistika.id')), 'pocet']],
      where: { hrac_id: idHracov, aktivity: true, typ: ['gol', 'asistencia', 'zlta_karta', 'cervena_karta'] },
      include: [zapas],
      group: ['ZapasStatistika.hrac_id', 'ZapasStatistika.typ'],
      raw: true,
    })) as unknown as Array<{ hrac_id: number; typ: string; pocet: string }>;

    type Riadok = { hrac_id: number; zapasy: number; minuty: number; ciste_konta: number; goly: number; asistencie: number; zlte_karty: number; cervene_karty: number };
    const podlaHraca = new Map<number, Riadok>();
    const zaznam = (id: number) => {
      if (!podlaHraca.has(id)) podlaHraca.set(id, { hrac_id: id, zapasy: 0, minuty: 0, ciste_konta: 0, goly: 0, asistencie: 0, zlte_karty: 0, cervene_karty: 0 });
      return podlaHraca.get(id)!;
    };
    idHracov.forEach(zaznam);
    const videne = new Set<string>();
    zostavy.forEach((r) => {
      const kluc = `${r.hrac_id}-${r.zapas_id}`;
      if (videne.has(kluc)) return;
      videne.add(kluc);
      const riadok = zaznam(r.hrac_id);
      riadok.zapasy += 1;
      riadok.minuty += Number(r.odohrane_minuty) || 0;
      // Čisté konto: hráč začínal a súper nedal gól
      const z = r.zapas;
      const inkasovane = z.domaci_tim_id === validation.id ? z.goly_hostia : z.hostujuci_tim_id === validation.id ? z.goly_domaci : null;
      if (r.zaradenie === 'zakladna' && inkasovane === 0) riadok.ciste_konta += 1;
    });
    // COUNT vracia pg driver ako reťazec
    const STLPCE: Record<string, 'goly' | 'asistencie' | 'zlte_karty' | 'cervene_karty'> = {
      gol: 'goly',
      asistencia: 'asistencie',
      zlta_karta: 'zlte_karty',
      cervena_karta: 'cervene_karty',
    };
    udalosti.forEach((r) => (zaznam(r.hrac_id)[STLPCE[r.typ]] = Number(r.pocet)));

    res.json({ success: true, data: [...podlaHraca.values()] });
  } catch (error) {
    console.error('Chyba pri načítaní štatistík hráčov:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní štatistík hráčov' });
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
    if (odpovedzNaChybuModelu(error, res)) return;
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

    // Meniť sa smú len tieto polia - pôvodne sa do update() posielalo
    // celé telo požiadavky, takže sa dalo prepísať aj aktivity či slug
    const POLIA = [
      'nazov', 'typ', 'vekova_kategoria', 'popis', 'stadion_id', 'sezona_id',
      'logo', 'farba_prva', 'farba_druha', 'poradie',
    ];
    const updateData: Record<string, any> = {};
    for (const pole of POLIA) {
      if (req.body[pole] === undefined) continue;
      updateData[pole] = req.body[pole] === '' ? null : req.body[pole];
    }

    // Kontrola celého výsledného tímu (aj polí, ktoré sa nemenili)
    const chybyUdajov = validateTeamData({ ...team.toSafeJSON(), ...updateData });
    if (chybyUdajov.length > 0) {
      res.status(400).json({ success: false, message: chybyUdajov[0], errors: chybyUdajov });
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
    if (odpovedzNaChybuModelu(error, res)) return;
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
        message: `Tím ${team.nazov} nemožno archivovať - má ${playersCount} hráčov a ${staffCount} členov realizačného tímu. Najprv ich presuňte do iného tímu.`,
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