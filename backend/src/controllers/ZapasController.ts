// backend/src/controllers/zapasController.ts
// Controller pre správu zápasov - FÁZA 4

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Zapas from '../models/Zapas';
import ZapasStatistika from '../models/ZapasStatistika';
import Liga from '../models/Liga';
import Team from '../models/Team';
import Player from '../models/Player';
import Article from '../models/Article';

// ===== HELPER FUNCTIONS =====

// Jednoduchá validácia bez express-validator
const validateZapasData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.nazov || typeof data.nazov !== 'string' || data.nazov.length < 5 || data.nazov.length > 200) {
    errors.push('Názov musí mať 5-200 znakov');
  }
  
  if (!data.liga_id || isNaN(Number(data.liga_id)) || Number(data.liga_id) < 1) {
    errors.push('Liga ID je povinné a musí byť kladné číslo');
  }
  
  if (!data.datum_cas || !Date.parse(data.datum_cas)) {
    errors.push('Dátum a čas je povinný a musí byť platný');
  }
  
  if (!data.domaci_tim_id || isNaN(Number(data.domaci_tim_id)) || Number(data.domaci_tim_id) < 1) {
    errors.push('Domáci tím ID je povinné a musí byť kladné číslo');
  }
  
  if (!data.hostujuci_tim_id || isNaN(Number(data.hostujuci_tim_id)) || Number(data.hostujuci_tim_id) < 1) {
    errors.push('Hosťujúci tím ID je povinné a musí byť kladné číslo');
  }
  
  if (data.domaci_tim_id && data.hostujuci_tim_id && Number(data.domaci_tim_id) === Number(data.hostujuci_tim_id)) {
    errors.push('Domáci a hosťujúci tím nemôžu byť rovnaké');
  }
  
  if (data.status && !['naplanovany', 'prebieha', 'ukonceny', 'odlozeny', 'zruseny'].includes(data.status)) {
    errors.push('Status musí byť: naplanovany, prebieha, ukonceny, odlozeny alebo zruseny');
  }
  
  if (data.goly_domaci !== undefined && (isNaN(Number(data.goly_domaci)) || Number(data.goly_domaci) < 0 || Number(data.goly_domaci) > 50)) {
    errors.push('Góly domáci musia byť číslo od 0 do 50');
  }
  
  if (data.goly_hostia !== undefined && (isNaN(Number(data.goly_hostia)) || Number(data.goly_hostia) < 0 || Number(data.goly_hostia) > 50)) {
    errors.push('Góly hostia musia byť číslo od 0 do 50');
  }
  
  if (data.pocet_divakov !== undefined && data.pocet_divakov !== null && (isNaN(Number(data.pocet_divakov)) || Number(data.pocet_divakov) < 0)) {
    errors.push('Počet divákov musí byť nezáporné číslo');
  }
  
  if (data.video_url && typeof data.video_url === 'string') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.video_url)) {
      errors.push('Video URL musí byť platná URL');
    }
  }
  
  return errors;
};

const validateZapasId = (id: string) => {
  const zapasId = parseInt(id);
  if (isNaN(zapasId) || zapasId < 1) {
    return { valid: false, error: 'ID zápasu musí byť kladné číslo' };
  }
  return { valid: true, id: zapasId };
};

// ===== VEREJNÉ API ENDPOINTS =====

// GET /api/matches - Zoznam všetkých aktívnych zápasov
export const getMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      liga_id, 
      tim_id, 
      status, 
      od_datumu, 
      do_datumu, 
      search, 
      include_details,
      page = '1',
      limit = '20'
    } = req.query;

    // Základné filter podmienky
    const whereConditions: any = { aktivity: true };

    // Filter podľa ligy
    if (liga_id && !isNaN(Number(liga_id))) {
      whereConditions.liga_id = Number(liga_id);
    }

    // Filter podľa tímu (domáci alebo hosťujúci)
    if (tim_id && !isNaN(Number(tim_id))) {
      whereConditions[Op.or] = [
        { domaci_tim_id: Number(tim_id) },
        { hostujuci_tim_id: Number(tim_id) }
      ];
    }

    // Filter podľa statusu
    if (status && ['naplanovany', 'prebieha', 'ukonceny', 'odlozeny', 'zruseny'].includes(status as string)) {
      whereConditions.status = status;
    }

    // Filter podľa dátumu
    if (od_datumu) {
      whereConditions.datum_cas = { [Op.gte]: new Date(od_datumu as string) };
    }
    if (do_datumu) {
      if (whereConditions.datum_cas) {
        whereConditions.datum_cas[Op.lte] = new Date(do_datumu as string);
      } else {
        whereConditions.datum_cas = { [Op.lte]: new Date(do_datumu as string) };
      }
    }

    // Paginácia
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Include podmienky
    const includeOptions = [];
    
    if (include_details === 'true') {
      includeOptions.push(
        {
          model: Liga,
          as: 'liga',
          attributes: ['id', 'nazov', 'sezona', 'typ']
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov', 'vekova_kategoria']
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov', 'vekova_kategoria']
        }
      );
    }

    const { rows: matches, count } = await Zapas.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      order: [['datum_cas', 'DESC']],
      limit: limitNum,
      offset
    });

    // Vyhľadávanie v názve (po načítaní kvôli jednoduchosti)
    let filteredMatches = matches;
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredMatches = matches.filter(zapas => 
        zapas.nazov.toLowerCase().includes(searchTerm) ||
        zapas.miesto?.toLowerCase().includes(searchTerm) ||
        zapas.kolo?.toLowerCase().includes(searchTerm)
      );
    }

    // Transformácia na safe JSON
    const result = filteredMatches.map(zapas => zapas.toSafeJSON());

    res.json({
      success: true,
      data: result,
      count: result.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      message: `Nájdených ${result.length} zápasov`
    });

  } catch (error) {
    console.error('Chyba pri načítaní zápasov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní zápasov',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/matches/:id - Detail konkrétneho zápasu
export const getMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateZapasId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const zapas = await Zapas.findByPk(validation.id, {
      include: [
        {
          model: Liga,
          as: 'liga',
          attributes: ['id', 'nazov', 'sezona', 'typ']
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov', 'vekova_kategoria']
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov', 'vekova_kategoria']
        },
        {
          model: Article,
          as: 'clanok',
          attributes: ['id', 'nazov', 'slug'],
          required: false
        },
        {
          model: ZapasStatistika,
          as: 'statistiky',
          where: { aktivity: true },
          required: false,
          include: [
            {
              model: Player,
              as: 'hrac',
              attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu']
            }
          ],
          order: [['minuta', 'ASC'], ['typ', 'ASC']]
        }
      ]
    });

    if (!zapas) {
      res.status(404).json({
        success: false,
        message: 'Zápas nenájdený'
      });
      return;
    }

    if (!zapas.aktivity) {
      res.status(404).json({
        success: false,
        message: 'Zápas nie je aktívny'
      });
      return;
    }

    res.json({
      success: true,
      data: zapas.toSafeJSON(),
      message: 'Zápas úspešne načítaný'
    });

  } catch (error) {
    console.error('Chyba pri načítaní detailu zápasu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní detailu zápasu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// POST /api/matches - Vytvorenie nového zápasu
export const createMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validateZapasData(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors
      });
      return;
    }

    // Kontrola existencie ligy
    const liga = await Liga.findOne({
      where: { id: req.body.liga_id, aktivity: true }
    });
    if (!liga) {
      res.status(400).json({
        success: false,
        message: 'Liga nenájdená alebo nie je aktívna'
      });
      return;
    }

    // Kontrola existencie tímov
    const domaciTim = await Team.findOne({
      where: { id: req.body.domaci_tim_id, aktivity: true }
    });
    const hostujuciTim = await Team.findOne({
      where: { id: req.body.hostujuci_tim_id, aktivity: true }
    });

    if (!domaciTim || !hostujuciTim) {
      res.status(400).json({
        success: false,
        message: 'Jeden alebo oba tímy neboli nájdené alebo nie sú aktívne'
      });
      return;
    }

    const newZapas = await Zapas.create(req.body);

    res.status(201).json({
      success: true,
      data: newZapas.toSafeJSON(),
      message: 'Zápas úspešne vytvorený'
    });

  } catch (error) {
    console.error('Chyba pri vytváraní zápasu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní zápasu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/matches/:id - Aktualizácia zápasu
export const updateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateZapasId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const errors = validateZapasData(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors
      });
      return;
    }

    const zapas = await Zapas.findByPk(validation.id);
    if (!zapas) {
      res.status(404).json({
        success: false,
        message: 'Zápas nenájdený'
      });
      return;
    }

    await zapas.update(req.body);

    res.json({
      success: true,
      data: zapas.toSafeJSON(),
      message: 'Zápas úspešne aktualizovaný'
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii zápasu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii zápasu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// DELETE /api/matches/:id - Soft delete zápasu
export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateZapasId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const zapas = await Zapas.findByPk(validation.id);
    if (!zapas) {
      res.status(404).json({
        success: false,
        message: 'Zápas nenájdený'
      });
      return;
    }

    // Soft delete - označenie ako neaktívny
    await zapas.update({ aktivity: false });

    res.json({
      success: true,
      message: 'Zápas úspešne vymazaný'
    });

  } catch (error) {
    console.error('Chyba pri mazaní zápasu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní zápasu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};