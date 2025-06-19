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
  
  console.log('=== VALIDATION DEBUG ===');
  console.log('Input data:', JSON.stringify(data, null, 2));
  
  // 1. Dátum je povinný
  if (!data.datum_cas || !Date.parse(data.datum_cas)) {
    errors.push('Dátum a čas je povinný a musí byť platný');
  }
  
  // 2. Liga JE povinná - buď ID alebo custom názov
  const hasLigaId = data.liga_id && !isNaN(Number(data.liga_id)) && Number(data.liga_id) > 0;
  const hasLigaNazov = data.liga_nazov && typeof data.liga_nazov === 'string' && data.liga_nazov.trim().length >= 2;
  
  if (!hasLigaId && !hasLigaNazov) {
    errors.push('Liga je povinná (buď vyberte zo zoznamu alebo zadajte vlastný názov)');
  }
  
  // 3. Domáci tím - aspoň jeden spôsob musí byť zadaný
  const hasDomaciTimId = data.domaci_tim_id && !isNaN(Number(data.domaci_tim_id)) && Number(data.domaci_tim_id) > 0;
  const hasDomaciTimNazov = data.domaci_tim_nazov && typeof data.domaci_tim_nazov === 'string' && data.domaci_tim_nazov.trim().length >= 2;
  
  if (!hasDomaciTimId && !hasDomaciTimNazov) {
    errors.push('Domáci tím je povinný (buď vyberte zo zoznamu alebo zadajte vlastný názov)');
  }
  
  // 4. Hosťujúci tím - aspoň jeden spôsob musí byť zadaný  
  const hasHostujuciTimId = data.hostujuci_tim_id && !isNaN(Number(data.hostujuci_tim_id)) && Number(data.hostujuci_tim_id) > 0;
  const hasHostujuciTimNazov = data.hostujuci_tim_nazov && typeof data.hostujuci_tim_nazov === 'string' && data.hostujuci_tim_nazov.trim().length >= 2;
  
  if (!hasHostujuciTimId && !hasHostujuciTimNazov) {
    errors.push('Hosťujúci tím je povinný (buď vyberte zo zoznamu alebo zadajte vlastný názov)');
  }
  
  // 5. Tímy nemôžu byť rovnaké (len ak sú oba z databázy)
  if (hasDomaciTimId && hasHostujuciTimId && Number(data.domaci_tim_id) === Number(data.hostujuci_tim_id)) {
    errors.push('Domáci a hosťujúci tím nemôžu byť rovnaké');
  }
  
  // 6. Status validácia
  if (data.status && !['naplanovany', 'prebieha', 'ukonceny', 'odlozeny', 'zruseny'].includes(data.status)) {
    errors.push('Neplatný status');
  }
  
  // 7. Góly validácia (len ak sú zadané)
  if (data.goly_domaci !== undefined && data.goly_domaci !== null && 
      (isNaN(Number(data.goly_domaci)) || Number(data.goly_domaci) < 0 || Number(data.goly_domaci) > 50)) {
    errors.push('Góly domáci musia byť číslo medzi 0-50');
  }
  
  if (data.goly_hostia !== undefined && data.goly_hostia !== null && 
      (isNaN(Number(data.goly_hostia)) || Number(data.goly_hostia) < 0 || Number(data.goly_hostia) > 50)) {
    errors.push('Góly hostia musia byť číslo medzi 0-50');
  }
  
  // 8. Počet divákov
  if (data.pocet_divakov !== undefined && data.pocet_divakov !== null && 
      (isNaN(Number(data.pocet_divakov)) || Number(data.pocet_divakov) < 0)) {
    errors.push('Počet divákov musí byť nezáporné číslo');
  }
  
  // 9. Video URL
  if (data.video_url && typeof data.video_url === 'string' && data.video_url.trim() !== '') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.video_url)) {
      errors.push('Video URL musí začínať http:// alebo https://');
    }
  }
  
  console.log('Validation result:', errors.length === 0 ? 'PASSED' : 'FAILED');
  console.log('Errors:', errors);
  console.log('=== END VALIDATION DEBUG ===');
  
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
    console.log('POST /api/matches - Received data:', req.body);

    const errors = validateZapasData(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors
      });
      return;
    }

    // Príprava dát pre vytvorenie
    const createData: any = {
      nazov: req.body.nazov,
      datum_cas: req.body.datum_cas,
      status: req.body.status || 'naplanovany'
    };

    // Liga handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.liga_id && req.body.liga_id > 0) {
      // Kontrola existencie ligy z databázy
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
      createData.liga_id = req.body.liga_id;
      createData.liga_nazov = liga.nazov; // PRIDANÉ: ulož aj názov pre DB ligu
      console.log('Using DB liga:', liga.nazov);
    } else if (req.body.liga_nazov) {
      createData.liga_nazov = req.body.liga_nazov.trim();
      console.log('Using custom liga:', createData.liga_nazov);
    }

    // Domáci tím handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.domaci_tim_id && req.body.domaci_tim_id > 0) {
      const domaciTim = await Team.findOne({
        where: { id: req.body.domaci_tim_id, aktivity: true }
      });
      if (!domaciTim) {
        res.status(400).json({
          success: false,
          message: 'Domáci tím nenájdený alebo nie je aktívny'
        });
        return;
      }
      createData.domaci_tim_id = req.body.domaci_tim_id;
      createData.domaci_tim_nazov = domaciTim.nazov; // PRIDANÉ: ulož aj názov pre DB tím
      console.log('Using DB domaci tim:', domaciTim.nazov);
    } else if (req.body.domaci_tim_nazov) {
      createData.domaci_tim_nazov = req.body.domaci_tim_nazov.trim();
      console.log('Using custom domaci tim:', createData.domaci_tim_nazov);
    }

    // Hosťujúci tím handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.hostujuci_tim_id && req.body.hostujuci_tim_id > 0) {
      const hostujuciTim = await Team.findOne({
        where: { id: req.body.hostujuci_tim_id, aktivity: true }
      });
      if (!hostujuciTim) {
        res.status(400).json({
          success: false,
          message: 'Hosťujúci tím nenájdený alebo nie je aktívny'
        });
        return;
      }
      createData.hostujuci_tim_id = req.body.hostujuci_tim_id;
      createData.hostujuci_tim_nazov = hostujuciTim.nazov; // PRIDANÉ: ulož aj názov pre DB tím
      console.log('Using DB hostujuci tim:', hostujuciTim.nazov);
    } else if (req.body.hostujuci_tim_nazov) {
      createData.hostujuci_tim_nazov = req.body.hostujuci_tim_nazov.trim();
      console.log('Using custom hostujuci tim:', createData.hostujuci_tim_nazov);
    }

    // Voliteľné polia
    if (req.body.kolo) createData.kolo = req.body.kolo;
    if (req.body.miesto) createData.miesto = req.body.miesto;
    if (req.body.goly_domaci !== undefined) createData.goly_domaci = req.body.goly_domaci;
    if (req.body.goly_hostia !== undefined) createData.goly_hostia = req.body.goly_hostia;
    if (req.body.pocet_divakov !== undefined) createData.pocet_divakov = req.body.pocet_divakov;
    if (req.body.poznamky) createData.poznamky = req.body.poznamky;
    if (req.body.video_url) createData.video_url = req.body.video_url;
    if (req.body.clanok_id) createData.clanok_id = req.body.clanok_id;
    if (req.body.fotogaleria_id) createData.fotogaleria_id = req.body.fotogaleria_id;

    console.log('Creating match with data:', createData);

    const newZapas = await Zapas.create(createData);

    // Načítanie s relačnými objektmi pre response (len tie ktoré existujú)
    const includeOptions = [];
    
    if (newZapas.liga_id) {
      includeOptions.push({
        model: Liga,
        as: 'liga',
        attributes: ['id', 'nazov', 'sezona', 'typ'],
        required: false
      });
    }
    
    if (newZapas.domaci_tim_id) {
      includeOptions.push({
        model: Team,
        as: 'domaci_tim',
        attributes: ['id', 'nazov', 'vekova_kategoria'],
        required: false
      });
    }
    
    if (newZapas.hostujuci_tim_id) {
      includeOptions.push({
        model: Team,
        as: 'hostujuci_tim',
        attributes: ['id', 'nazov', 'vekova_kategoria'],
        required: false
      });
    }

    const createdZapas = await Zapas.findByPk(newZapas.id, {
      include: includeOptions
    });

    const formattedMatch = {
      ...createdZapas!.toSafeJSON(),
      domaci_tim_nazov: createdZapas!.getDomaciTimNazov(),
      hostujuci_tim_nazov: createdZapas!.getHostujuciTimNazov(),
      liga_nazov: createdZapas!.getLigaNazov()
    };

    res.status(201).json({
      success: true,
      data: formattedMatch,
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
    console.log(`PUT /api/matches/${req.params.id} - Received data:`, req.body);

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

    const zapas = await Zapas.findOne({
      where: { id: validation.id, aktivity: true }
    });

    if (!zapas) {
      res.status(404).json({
        success: false,
        message: 'Zápas nenájdený'
      });
      return;
    }

    // Príprava dát pre aktualizáciu
    const updateData: any = {
      nazov: req.body.nazov,
      datum_cas: req.body.datum_cas,
      status: req.body.status || 'naplanovany'
    };

    // Liga handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.liga_id && req.body.liga_id > 0) {
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
      updateData.liga_id = req.body.liga_id;
      updateData.liga_nazov = liga.nazov; // PRIDANÉ: ulož aj názov pre DB ligu
      console.log('Using DB liga:', liga.nazov);
    } else if (req.body.liga_nazov) {
      updateData.liga_id = null; // Clear DB reference
      updateData.liga_nazov = req.body.liga_nazov.trim();
      console.log('Using custom liga:', updateData.liga_nazov);
    } else {
      updateData.liga_id = null;
      updateData.liga_nazov = null;
    }

    // Domáci tím handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.domaci_tim_id && req.body.domaci_tim_id > 0) {
      const domaciTim = await Team.findOne({
        where: { id: req.body.domaci_tim_id, aktivity: true }
      });
      if (!domaciTim) {
        res.status(400).json({
          success: false,
          message: 'Domáci tím nenájdený alebo nie je aktívny'
        });
        return;
      }
      updateData.domaci_tim_id = req.body.domaci_tim_id;
      updateData.domaci_tim_nazov = domaciTim.nazov; // PRIDANÉ: ulož aj názov pre DB tím
      console.log('Using DB domaci tim:', domaciTim.nazov);
    } else if (req.body.domaci_tim_nazov) {
      updateData.domaci_tim_id = null;
      updateData.domaci_tim_nazov = req.body.domaci_tim_nazov.trim();
      console.log('Using custom domaci tim:', updateData.domaci_tim_nazov);
    }

    // Hosťujúci tím handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.hostujuci_tim_id && req.body.hostujuci_tim_id > 0) {
      const hostujuciTim = await Team.findOne({
        where: { id: req.body.hostujuci_tim_id, aktivity: true }
      });
      if (!hostujuciTim) {
        res.status(400).json({
          success: false,
          message: 'Hosťujúci tím nenájdený alebo nie je aktívny'
        });
        return;
      }
      updateData.hostujuci_tim_id = req.body.hostujuci_tim_id;
      updateData.hostujuci_tim_nazov = hostujuciTim.nazov; // PRIDANÉ: ulož aj názov pre DB tím
      console.log('Using DB hostujuci tim:', hostujuciTim.nazov);
    } else if (req.body.hostujuci_tim_nazov) {
      updateData.hostujuci_tim_id = null;
      updateData.hostujuci_tim_nazov = req.body.hostujuci_tim_nazov.trim();
      console.log('Using custom hostujuci tim:', updateData.hostujuci_tim_nazov);
    }

    // Voliteľné polia
    updateData.kolo = req.body.kolo || null;
    updateData.miesto = req.body.miesto || null;
    updateData.goly_domaci = req.body.goly_domaci !== undefined ? req.body.goly_domaci : null;
    updateData.goly_hostia = req.body.goly_hostia !== undefined ? req.body.goly_hostia : null;
    updateData.pocet_divakov = req.body.pocet_divakov !== undefined ? req.body.pocet_divakov : null;
    updateData.poznamky = req.body.poznamky || null;
    updateData.video_url = req.body.video_url || null;
    updateData.clanok_id = req.body.clanok_id || null;
    updateData.fotogaleria_id = req.body.fotogaleria_id || null;

    console.log('Updating match with data:', updateData);

    await zapas.update(updateData);

    // Načítanie s relačnými objektmi pre response (len tie ktoré existujú)
    const includeOptions = [];
    
    if (zapas.liga_id) {
      includeOptions.push({
        model: Liga,
        as: 'liga',
        attributes: ['id', 'nazov', 'sezona', 'typ'],
        required: false
      });
    }
    
    if (zapas.domaci_tim_id) {
      includeOptions.push({
        model: Team,
        as: 'domaci_tim',
        attributes: ['id', 'nazov', 'vekova_kategoria'],
        required: false
      });
    }
    
    if (zapas.hostujuci_tim_id) {
      includeOptions.push({
        model: Team,
        as: 'hostujuci_tim',
        attributes: ['id', 'nazov', 'vekova_kategoria'],
        required: false
      });
    }

    const updatedZapas = await Zapas.findByPk(zapas.id, {
      include: includeOptions
    });

    const formattedMatch = {
      ...updatedZapas!.toSafeJSON(),
      domaci_tim_nazov: updatedZapas!.getDomaciTimNazov(),
      hostujuci_tim_nazov: updatedZapas!.getHostujuciTimNazov(),
      liga_nazov: updatedZapas!.getLigaNazov()
    };

    res.json({
      success: true,
      data: formattedMatch,
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

export const updateMatchStatuses = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Nájdi všetky aktívne zápasy ktoré nie sú manuálne nastavené
    const zapasy = await Zapas.findAll({
      where: {
        aktivity: true,
        status: {
          [Op.notIn]: ['zruseny', 'odlozeny'] // Nevyber zrušené/odložené
        }
      }
    });

    let updatedCount = 0;
    const updates = [];

    for (const zapas of zapasy) {
      const currentAutoStatus = zapas.getAutoStatus();
      
      // Aktualizuj len ak sa automatický status líši od uloženého
      if (zapas.status !== currentAutoStatus) {
        await zapas.update({ status: currentAutoStatus });
        updatedCount++;
        
        updates.push({
          id: zapas.id,
          nazov: zapas.nazov,
          old_status: zapas.status,
          new_status: currentAutoStatus,
          datum_cas: zapas.datum_cas
        });
      }
    }

    res.json({
      success: true,
      message: `Aktualizovaných ${updatedCount} zápasov`,
      updated_count: updatedCount,
      total_checked: zapasy.length,
      updates: updates
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii statusov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii statusov',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};