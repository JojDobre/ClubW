// backend/src/controllers/authController.ts
// Controller pre autentifikáciu (prihlásenie, odhlásenie)

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/user';

// Generovanie JWT tokenu
const generateToken = (user: User): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET nie je nastavený');
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      rola: user.rola,
    },
    jwtSecret,
    { expiresIn: '24h'} // Explicitné typovanie
  );
};

// Validácia pre prihlásenie
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Neplatný email formát')
    .normalizeEmail(),
  body('heslo')
    .isLength({ min: 6 })
    .withMessage('Heslo musí mať aspoň 6 znakov'),
];

// POST /api/auth/login - Prihlásenie používateľa
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validácia vstupných údajov
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Chybné vstupné údaje',
        errors: errors.array(),
      });
      return;
    }

    const { email, heslo } = req.body;

    // 2. Vyhľadanie používateľa
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Neplatné prihlasovacie údaje',
      });
      return;
    }

    // 3. Kontrola či je účet aktívny
    if (!user.aktivity) {
      res.status(401).json({
        success: false,
        message: 'Účet je deaktivovaný. Kontaktujte administrátora.',
      });
      return;
    }

    // 4. Overenie hesla
    const isPasswordValid = await user.overHeslo(heslo);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Neplatné prihlasovacie údaje',
      });
      return;
    }

    // 5. Aktualizácia posledného prihlásenia
    await user.update({
      posledne_prihlasenie: new Date(),
    });

    // 6. Generovanie JWT tokenu
    const token = generateToken(user);

    // 7. Nastavenie cookie (voliteľné)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hodín
      sameSite: 'lax',
    });

    // 8. Úspešná odpoveď
    res.json({
      success: true,
      message: 'Úspešne prihlásený',
      data: {
        token,
        user: user.toSafeJSON(),
      },
    });

  } catch (error) {
    console.error('Chyba pri prihlásení:', error);
    res.status(500).json({
      success: false,
      message: 'Serverová chyba pri prihlásení',
    });
  }
};

// POST /api/auth/logout - Odhlásenie používateľa
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Vymazanie cookie
    res.clearCookie('token');

    res.json({
      success: true,
      message: 'Úspešne odhlásený',
    });
  } catch (error) {
    console.error('Chyba pri odhlásení:', error);
    res.status(500).json({
      success: false,
      message: 'Serverová chyba pri odhlásení',
    });
  }
};

// GET /api/auth/me - Získanie aktuálneho používateľa
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Používateľ nie je prihlásený',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: req.user.toSafeJSON(),
      },
    });
  } catch (error) {
    console.error('Chyba pri získavaní používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Serverová chyba',
    });
  }
};

// POST /api/auth/refresh - Obnovenie tokenu
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Používateľ nie je prihlásený',
      });
      return;
    }

    // Generovanie nového tokenu
    const newToken = generateToken(req.user);

    // Nastavenie nového cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.json({
      success: true,
      message: 'Token obnovený',
      data: {
        token: newToken,
        user: req.user.toSafeJSON(),
      },
    });
  } catch (error) {
    console.error('Chyba pri obnovovaní tokenu:', error);
    res.status(500).json({
      success: false,
      message: 'Serverová chyba pri obnovovaní tokenu',
    });
  }
};