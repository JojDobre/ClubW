// backend/src/controllers/authController.ts
// Controller pre autentifikáciu (prihlásenie, odhlásenie)

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/user';
import { sanitizePlainText } from '../utils/sanitize';
import Rola, { MODULY } from '../models/Rola';
import NastaveniaKlubu from '../models/NastaveniaKlubu';

/**
 * Používateľ aj s oprávneniami jeho roly - administrácia podľa nich
 * skryje sekcie, do ktorých nesmie. Skutočnú kontrolu robí server.
 */
/** Jazyky administrácie */
export const JAZYKY = ['sk', 'cs', 'en'];

export const sOpravneniami = async (user: User) => {
  const data: any = user.toSafeJSON();
  const vsetko = (citat: boolean, pisat: boolean, mazat: boolean) =>
    Object.fromEntries(MODULY.map((m) => [m, { citat, pisat, mazat }]));

  if (user.rola === 'admin') {
    data.opravnenia = vsetko(true, true, true);
  } else {
    const rola = user.rola_id ? await Rola.findOne({ where: { id: user.rola_id, aktivity: true } }) : null;
    if (rola) {
      data.opravnenia = rola.opravnenia;
      data.rola_nazov = rola.nazov;
    } else {
      // Bez roly z tabuľky - podľa pevnej roly
      data.opravnenia =
        user.rola === 'redaktor' ? vsetko(true, true, false) : user.rola === 'trener' ? vsetko(true, false, false) : vsetko(false, false, false);
    }
  }
  // Jazyk, v ktorom sa má administrácia zobraziť: vlastný, inak klubu
  data.jazyk_administracie = JAZYKY.includes(user.jazyk as string)
    ? user.jazyk
    : (await NastaveniaKlubu.nacitaj()).jazyk_administracie || 'sk';
  return data;
};
// Vytvorenie dlhodobého obnovovacieho tokenu pri prihlásení
import { vytvorObnovovaciToken } from './hesloController';

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
  // Pri prihlásení silu hesla nekontrolujeme - existujúci používateľ
  // môže mať staršie heslo. Overujeme len, že pole nie je prázdne.
  body('heslo')
    .isString()
    .notEmpty()
    .withMessage('Heslo je povinné'),
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

    // 7. Dlhodobý obnovovací token uložený v databáze.
    // Vďaka nemu používateľ neprestane byť prihlásený po 24 hodinách
    // a relácia sa dá kedykoľvek zrušiť (odhlásenie, zmena hesla).
    const obnovovaciToken = await vytvorObnovovaciToken(user, req);

    // 8. Nastavenie cookies.
    // httpOnly znamená, že sa k nim nedostane JavaScript v prehliadači,
    // takže prípadné XSS nevie token ukradnúť.
    const vProdukcii = process.env.NODE_ENV === 'production';

    res.cookie('clubw_token', token, {
      httpOnly: true,
      secure: vProdukcii,
      maxAge: 24 * 60 * 60 * 1000, // 24 hodín
      sameSite: 'lax',
    });

    res.cookie('clubw_refresh', obnovovaciToken, {
      httpOnly: true,
      secure: vProdukcii,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dní
      sameSite: 'lax',
      // Obnovovací token posielame len na endpointy autentifikácie
      path: '/api/auth',
    });

    // 9. Úspešná odpoveď
    res.json({
      success: true,
      message: 'Úspešne prihlásený',
      data: {
        token,
        refreshToken: obnovovaciToken,
        user: await sOpravneniami(user),
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
      data: await sOpravneniami(req.user),
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
        user: await sOpravneniami(req.user),
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

/**
 * PUT /api/auth/profil
 * Vlastné meno a priezvisko - každý prihlásený, aj bez práva
 * spravovať používateľov (e-mail a rolu mení správca).
 */
export const upravProfil = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Používateľ nie je prihlásený' });
      return;
    }
    const zmeny: { meno?: string; priezvisko?: string | null; jazyk?: string | null } = {};
    // Meno sa mení len keď prišlo - samotná zmena jazyka ho neposiela
    if (req.body?.meno !== undefined) {
      const meno = sanitizePlainText(String(req.body.meno ?? '')).trim();
      const priezvisko = req.body?.priezvisko ? sanitizePlainText(String(req.body.priezvisko)).trim() : null;
      if (meno.length < 2 || meno.length > 100) {
        res.status(400).json({ success: false, message: 'Meno musí mať 2-100 znakov' });
        return;
      }
      if (priezvisko && priezvisko.length > 100) {
        res.status(400).json({ success: false, message: 'Priezvisko môže mať najviac 100 znakov' });
        return;
      }
      zmeny.meno = meno;
      zmeny.priezvisko = priezvisko;
    }
    if (req.body?.jazyk !== undefined) {
      const jazyk = req.body.jazyk || null;
      if (jazyk !== null && !JAZYKY.includes(jazyk)) {
        res.status(400).json({ success: false, message: 'Nepodporovaný jazyk' });
        return;
      }
      zmeny.jazyk = jazyk;
    }
    await req.user.update(zmeny);
    res.json({ success: true, data: await sOpravneniami(req.user), message: 'Profil bol uložený' });
  } catch (error) {
    console.error('Chyba pri úprave profilu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri úprave profilu' });
  }
};
