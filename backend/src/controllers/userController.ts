// backend/src/controllers/userController.ts
// Controller pre správu používateľov (CRUD operácie)

import { Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { Op } from 'sequelize';
import User from '../models/user';

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
  body('heslo')
    .isLength({ min: 6 })
    .withMessage('Heslo musí mať aspoň 6 znakov'),
  body('rola')
    .isIn(['admin', 'redaktor', 'trener', 'uzivatel'])
    .withMessage('Neplatná rola'),
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
    .isLength({ min: 6 })
    .withMessage('Heslo musí mať aspoň 6 znakov'),
  body('rola')
    .optional()
    .isIn(['admin', 'redaktor', 'trener', 'uzivatel'])
    .withMessage('Neplatná rola'),
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
    const newUser = await User.create({
      meno,
      email: email.toLowerCase(),
      heslo,
      rola,
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