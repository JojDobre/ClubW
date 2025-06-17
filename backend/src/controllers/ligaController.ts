// backend/src/controllers/ligaController.ts
// Controller pre správu líg - FÁZA 4

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Liga from '../models/Liga';

// ===== HELPER FUNCTIONS =====

// Jednoduchá validácia bez express-validator
const validateLigaData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.nazov || typeof data.nazov !== 'string' || data.nazov.length < 2 || data.nazov.length > 100) {
    errors.push('Názov musí mať 2-100 znakov');
  }
  
  if (!data.sezona || typeof data.sezona !== 'string' || data.sezona.length < 4 || data.sezona.length > 20) {
    errors.push('Sezóna je povinná a musí mať 4-20 znakov');
  }
  
  if (data.sezona && !/^[0-9/\-\s]+$/.test(data.sezona)) {
    errors.push('Sezóna môže obsahovať len čísla, lomky, pomlčky a medzery');
  }
  
  if (!data.typ || !['sutaz', 'pohar', 'priatelska'].includes(data.typ)) {
    errors.push('Typ musí byť: sutaz, pohar alebo priatelska');
  }
  
  if (data.external_widget_url && typeof data.external_widget_url === 'string') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.external_widget_url)) {
      errors.push('External widget URL musí byť platná URL');
    }
  }
  
  if (data.logo && typeof data.logo === 'string') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.logo)) {
      errors.push('Logo musí byť platná URL');
    }
  }
  
  if (data.farba && typeof data.farba === 'string') {
    const hexPattern = /^#[0-9A-F]{6}$/i;
    if (!hexPattern.test(data.farba)) {
      errors.push('Farba musí byť platný hex kód (#RRGGBB)');
    }
  }
  
  if (data.poradie !== undefined && (isNaN(Number(data.poradie)) || Number(data.poradie) < 0)) {
    errors.push('Poradie musí byť nezáporné číslo');
  }
  
  return errors;
};

const validateLigaId = (id: string) => {
  const ligaId = parseInt(id);
  if (isNaN(ligaId) || ligaId < 1) {
    return { valid: false, error: 'ID ligy musí byť kladné číslo' };
  }
  return { valid: true, id: ligaId };
};

// ===== VEREJNÉ API ENDPOINTS =====

// GET /api/leagues - Zoznam všetkých aktívnych líg
export const getLeagues = async (req: Request, res: Response): Promise<void> => {
  try {
    const { typ, search, include_stats } = req.query;

    // Základné filter podmienky
    const whereConditions: any = { aktivity: true };

    // Filter podľa typu
    if (typ && ['sutaz', 'pohar', 'priatelska'].includes(typ as string)) {
      whereConditions.typ = typ;
    }

    let leagues = await Liga.findAll({
      where: whereConditions,
      order: [['poradie', 'ASC'], ['nazov', 'ASC']]
    });

    // Vyhľadávanie v názve a sezóne
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      leagues = leagues.filter(liga => 
        liga.nazov.toLowerCase().includes(searchTerm) ||
        liga.sezona.toLowerCase().includes(searchTerm)
      );
    }

    // Transformácia na safe JSON
    const result = leagues.map(liga => liga.toSafeJSON());

    res.json({
      success: true,
      data: result,
      count: result.length,
      message: `Nájdených ${result.length} líg`
    });

  } catch (error) {
    console.error('Chyba pri načítaní líg:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní líg',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/leagues/:id - Detail konkrétnej ligy
export const getLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateLigaId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const liga = await Liga.findByPk(validation.id);

    if (!liga) {
      res.status(404).json({
        success: false,
        message: 'Liga nenájdená'
      });
      return;
    }

    if (!liga.aktivity) {
      res.status(404).json({
        success: false,
        message: 'Liga nie je aktívna'
      });
      return;
    }

    res.json({
      success: true,
      data: liga.toSafeJSON(),
      message: 'Liga úspešne načítaná'
    });

  } catch (error) {
    console.error('Chyba pri načítaní detailu ligy:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní detailu ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// POST /api/leagues - Vytvorenie novej ligy
export const createLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validateLigaData(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors
      });
      return;
    }

    // Kontrola jedinečnosti názvu a sezóny
    const existingLiga = await Liga.findOne({
      where: {
        nazov: req.body.nazov,
        sezona: req.body.sezona,
        aktivity: true
      }
    });

    if (existingLiga) {
      res.status(409).json({
        success: false,
        message: 'Liga s týmto názvom a sezónou už existuje'
      });
      return;
    }

    const newLiga = await Liga.create(req.body);

    res.status(201).json({
      success: true,
      data: newLiga.toSafeJSON(),
      message: 'Liga úspešne vytvorená'
    });

  } catch (error) {
    console.error('Chyba pri vytváraní ligy:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/leagues/:id - Aktualizácia ligy
export const updateLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateLigaId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const errors = validateLigaData(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors
      });
      return;
    }

    const liga = await Liga.findByPk(validation.id);
    if (!liga) {
      res.status(404).json({
        success: false,
        message: 'Liga nenájdená'
      });
      return;
    }

    // Kontrola jedinečnosti pri úprave
    if (req.body.nazov && req.body.sezona) {
      const existingLiga = await Liga.findOne({
        where: {
          nazov: req.body.nazov,
          sezona: req.body.sezona,
          aktivity: true,
          id: { [Op.ne]: validation.id }
        }
      });

      if (existingLiga) {
        res.status(409).json({
          success: false,
          message: 'Liga s týmto názvom a sezónou už existuje'
        });
        return;
      }
    }

    await liga.update(req.body);

    res.json({
      success: true,
      data: liga.toSafeJSON(),
      message: 'Liga úspešne aktualizovaná'
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii ligy:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// DELETE /api/leagues/:id - Soft delete ligy
export const deleteLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateLigaId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const liga = await Liga.findByPk(validation.id);
    if (!liga) {
      res.status(404).json({
        success: false,
        message: 'Liga nenájdená'
      });
      return;
    }

    // Soft delete - označenie ako neaktívna
    await liga.update({ aktivity: false });

    res.json({
      success: true,
      message: 'Liga úspešne vymazaná'
    });

  } catch (error) {
    console.error('Chyba pri mazaní ligy:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};