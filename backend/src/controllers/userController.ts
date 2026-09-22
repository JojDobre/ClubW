// backend/src/controllers/userController.ts
// Controller pre správu používateľov (CRUD operácie)

import { Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { Op } from 'sequelize';
import User from '../models/user';
import Rola from '../models/Rola';
// Kontrola sily hesla - nahrádza pôvodnú podmienku "aspoň 6 znakov"
import { overSiluHesla } from '../utils/heslo';

// Validácia pre vytvorenie používateľa
export const validateCreateUser = [
  body('meno')
    .isLength({ min: 2, max: 100 })
    .withMessage('Meno musí mať 2-100 znakov')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Neplatný email formát')
    .normalizeEmail(),
  // Silu hesla overuje overSiluHesla() - kontroluje dĺžku, bežné slová
  // aj to, či heslo neobsahuje meno alebo e-mail používateľa
  body('heslo').custom((hodnota, { req }) => {
    const chyby = overSiluHesla(hodnota, { meno: req.body?.meno, email: req.body?.email });
    if (chyby.length > 0) {
      throw new Error(chyby.join(' '));
    }
    return true;
  }),
  body('priezvisko')
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage('Priezvisko môže mať najviac 100 znakov')
    .trim(),
  body('rola')
    .optional()
    .isIn(['admin', 'redaktor', 'trener', 'uzivatel'])
    .withMessage('Neplatná rola'),
  body('rola_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Rola musí byť platné ID'),
  body('tim_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Tim_id musí byť kladné číslo'),
];

// Validácia pre úpravu používateľa
export const validateUpdateUser = [
  body('meno')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Meno musí mať 2-100 znakov')
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Neplatný email formát')
    .normalizeEmail(),
  body('heslo')
    .optional()
    .custom((hodnota, { req }) => {
      const chyby = overSiluHesla(hodnota, { meno: req.body?.meno, email: req.body?.email });
      if (chyby.length > 0) {
        throw new Error(chyby.join(' '));
      }
      return true;
    }),
  body('priezvisko')
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage('Priezvisko môže mať najviac 100 znakov')
    .trim(),
  body('rola')
    .optional()
    .isIn(['admin', 'redaktor', 'trener', 'uzivatel'])
    .withMessage('Neplatná rola'),
  body('rola_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Rola musí byť platné ID'),
  body('tim_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Tim_id musí byť kladné číslo'),
  body('aktivity')
    .optional()
    .isBoolean()
    .withMessage('Aktivity musí byť boolean'),
];

// GET /api/users - Získanie zoznamu používateľov
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Query parametre pre filtrovanie a pagináciu
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';
    const active = req.query.active as string || '';

    const offset = (page - 1) * limit;

    // Podmienky pre filtrovanie
    const whereConditions: any = {};

    // Vyhľadávanie v mene a emaile
    if (search) {
      whereConditions[Op.or] = [
        { meno: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filtrovanie podľa role
    if (role) {
      whereConditions.rola = role;
    }

    // Filtrovanie podľa aktivity
    if (active !== '') {
      whereConditions.aktivity = active === 'true';
    }

    // Získanie používateľov s pagináciou
    const { count, rows: users } = await User.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['vytvoreny', 'DESC']],
      attributes: { exclude: ['heslo'] }, // Bez hesla v odpovedi
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        users: users.map(user => user.toSafeJSON()),
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Chyba pri získavaní používateľov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní používateľov',
    });
  }
};

// GET /api/users/:id - Získanie konkrétneho používateľa
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['heslo'] },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Používateľ nebol nájdený',
      });
      return;
    }

    res.json({
      success: true,
      data: { user: user.toSafeJSON() },
    });
  } catch (error) {
    console.error('Chyba pri získavaní používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní používateľa',
    });
  }
};

// POST /api/users - Vytvorenie nového používateľa
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validácia vstupných údajov
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Chybné vstupné údaje',
        errors: errors.array(),
      });
      return;
    }

    const { meno, email, heslo, rola, tim_id } = req.body;

    // Kontrola či email už existuje
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Používateľ s týmto emailom už existuje',
      });
      return;
    }

    // Vytvorenie nového používateľa
    // Rola z tabuľky rolí má prednosť. Keď ju klient neposlal, doplníme
    // ju podľa pôvodného enumu, aby mal používateľ vždy platné práva.
    let rolaId = req.body.rola_id ? Number(req.body.rola_id) : null;
    const kodRoly = rola || 'uzivatel';

    if (rolaId) {
      const zvolena = await Rola.findOne({ where: { id: rolaId, aktivity: true } });
      if (!zvolena) {
        res.status(400).json({ success: false, message: `Rola s ID ${rolaId} neexistuje` });
        return;
      }
    } else {
      const podlaKodu = await Rola.findOne({ where: { kod: kodRoly, aktivity: true } });
      rolaId = podlaKodu ? podlaKodu.id : null;
    }

    const newUser = await User.create({
      meno,
      priezvisko: req.body.priezvisko ? String(req.body.priezvisko).trim() : null,
      email: email.toLowerCase(),
      heslo,
      rola: kodRoly,
      rola_id: rolaId,
      tim_id: tim_id || null,
      aktivity: true,
    });

    res.status(201).json({
      success: true,
      message: 'Používateľ úspešne vytvorený',
      data: { user: newUser.toSafeJSON() },
    });
  } catch (error) {
    console.error('Chyba pri vytváraní používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vytváraní používateľa',
    });
  }
};

// PUT /api/users/:id - Úprava používateľa
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validácia vstupných údajov
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Chybné vstupné údaje',
        errors: errors.array(),
      });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    // Nájdenie používateľa
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Používateľ nebol nájdený',
      });
      return;
    }

    // Kontrola či sa nemení email na už existujúci
    if (updateData.email) {
      const existingUser = await User.findOne({
        where: { 
          email: updateData.email.toLowerCase(),
          id: { [Op.ne]: id }
        },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Používateľ s týmto emailom už existuje',
        });
        return;
      }

      updateData.email = updateData.email.toLowerCase();
    }

    // Aktualizácia používateľa
    await user.update(updateData);

    res.json({
      success: true,
      message: 'Používateľ úspešne aktualizovaný',
      data: { user: user.toSafeJSON() },
    });
  } catch (error) {
    console.error('Chyba pri aktualizácii používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri aktualizácii používateľa',
    });
  }
};

// DELETE /api/users/:id - Vymazanie používateľa
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Kontrola či sa používateľ nepokúša vymazať sám seba
    if (req.userId && parseInt(id) === req.userId) {
      res.status(400).json({
        success: false,
        message: 'Nemôžete vymazať svoj vlastný účet',
      });
      return;
    }

    // Nájdenie používateľa
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Používateľ nebol nájdený',
      });
      return;
    }

    // Vymazanie používateľa
    await user.destroy();

    res.json({
      success: true,
      message: 'Používateľ úspešne vymazaný',
    });
  } catch (error) {
    console.error('Chyba pri vymazávaní používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vymazávaní používateľa',
    });
  }
};

// PATCH /api/users/:id/toggle-status - Prepnutie aktivity používateľa
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Kontrola či sa používateľ nepokúša deaktivovať sám seba
    if (req.userId && parseInt(id) === req.userId) {
      res.status(400).json({
        success: false,
        message: 'Nemôžete deaktivovať svoj vlastný účet',
      });
      return;
    }

    // Nájdenie používateľa
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Používateľ nebol nájdený',
      });
      return;
    }

    // Prepnutie aktivity
    await user.update({ aktivity: !user.aktivity });

    res.json({
      success: true,
      message: `Používateľ ${user.aktivity ? 'aktivovaný' : 'deaktivovaný'}`,
      data: { user: user.toSafeJSON() },
    });
  } catch (error) {
    console.error('Chyba pri prepínaní stavu používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri prepínaní stavu používateľa',
    });
  }
};


// POST /api/users/bulk-delete - Bulk vymazanie používateľov
export const bulkDeleteUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné ID používateľov - musí byť neprázdne pole',
      });
      return;
    }

    // Kontrola, že sa používateľ nepokúša vymazať sám seba
    if (req.userId && ids.includes(req.userId.toString())) {
      res.status(400).json({
        success: false,
        message: 'Nemôžete vymazať svoj vlastný účet',
      });
      return;
    }

    // Nájdenie používateľov, ktorí existujú
    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      },
      attributes: ['id', 'meno', 'email']
    });

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Žiadni používatelia neboli nájdení',
      });
      return;
    }

    // Vymazanie používateľov
    const deletedCount = await User.destroy({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    res.json({
      success: true,
      message: `Úspešne vymazaných ${deletedCount} používateľov`,
      data: {
        deletedCount,
        deletedUsers: users.map(u => ({ id: u.id, meno: u.meno, email: u.email }))
      }
    });

  } catch (error) {
    console.error('Chyba pri bulk delete používateľov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní používateľov',
    });
  }
};

// POST /api/users/bulk-duplicate - Bulk duplikovanie používateľov
export const bulkDuplicateUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné ID používateľov - musí byť neprázdne pole',
      });
      return;
    }

    // Nájdenie pôvodných používateľov
    const originalUsers = await User.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    if (originalUsers.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Žiadni používatelia neboli nájdení',
      });
      return;
    }

    // Vytvorenie duplikátov
    const duplicatedUsers = [];
    const timestamp = Date.now();
    
    for (const user of originalUsers) {
      const duplicate = await User.create({
        meno: `${user.meno} (kópia)`,
        email: `copy_${timestamp}_${user.email}`,
        heslo: user.heslo, // Zachová hash hesla
        rola: user.rola,
        tim_id: user.tim_id,
        aktivity: false, // Duplikáty sú defaultne neaktívne
      });
      
      duplicatedUsers.push(duplicate.toSafeJSON());
    }

    res.json({
      success: true,
      message: `Úspešne duplikovaných ${duplicatedUsers.length} používateľov`,
      data: {
        duplicatedCount: duplicatedUsers.length,
        duplicatedUsers
      }
    });

  } catch (error) {
    console.error('Chyba pri bulk duplicate používateľov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri duplikovaní používateľov',
    });
  }
};