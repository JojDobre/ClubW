// backend/src/middleware/auth.ts
// Middleware pre JWT autentifikáciu

import { Request, Response, NextFunction } from 'express';
import Rola from '../models/Rola';
import jwt from 'jsonwebtoken';
import User from '../models/user';

// Rozšírenie Express Request interface o user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: number;
    }
  }
}

// Interface pre JWT payload
interface JwtPayload {
  userId: number;
  email: string;
  rola: string;
  iat: number;
  exp: number;
}

// Hlavný auth middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Získanie token z headeru alebo cookies
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies?.token;

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'Prístup odmietnutý. Token chýba.' 
      });
      return;
    }

    // 2. Overenie JWT tokenu
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET nie je nastavený');
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // 3. Vyhľadanie používateľa v databáze
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Token je neplatný. Používateľ neexistuje.' 
      });
      return;
    }

    // 4. Kontrola či je používateľ aktívny
    if (!user.aktivity) {
      res.status(401).json({ 
        success: false, 
        message: 'Účet je deaktivovaný.' 
      });
      return;
    }

    // 5. Pridanie používateľa do request objektu
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false, 
        message: 'Token je neplatný.' 
      });
      return;
    }

    console.error('Chyba v auth middleware:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Serverová chyba pri autentifikácii.' 
    });
  }
};

/**
 * Modul administrácie podľa adresy požiadavky.
 *
 * Kľúč je prvý úsek cesty za /api (prípadne za /api/admin). Cesty,
 * ktoré tu nie sú (GDPR, menu, ankety...), sa posudzujú len podľa
 * pevnej roly.
 */
const MODUL_PODLA_CESTY: Record<string, string> = {
  articles: 'clanky',
  categories: 'rubriky',
  comments: 'komentare',
  pages: 'stranky',
  galleries: 'galerie',
  videos: 'videa',
  media: 'media',
  upload: 'media',
  stadiums: 'stadiony',
  seasons: 'sezony',
  rosters: 'sezony',
  teams: 'timy',
  players: 'hraci',
  staff: 'realizacny_tim',
  leagues: 'ligy',
  tournaments: 'turnaje',
  matches: 'zapasy',
  calendar: 'kalendar',
  sponsors: 'sponzori',
  'sponsor-levels': 'sponzori',
  documents: 'dokumenty',
  'document-categories': 'dokumenty',
  forms: 'formulare',
  users: 'pouzivatelia',
  roles: 'pouzivatelia',
  archive: 'archiv',
  settings: 'nastavenia',
  sablony: 'sablony',
  logs: 'logy',
  license: 'licencia',
};

export const modulZCesty = (cesta: string): string | null => {
  const useky = cesta.split('?')[0].split('/').filter(Boolean);
  const bezApi = useky[0] === 'api' ? useky.slice(1) : useky;
  const bezAdmin = bezApi[0] === 'admin' ? bezApi.slice(1) : bezApi;
  return MODUL_PODLA_CESTY[bezAdmin[0] ?? ''] ?? null;
};

/** Akcia podľa HTTP metódy: čítanie, zápis alebo mazanie. */
export const akciaZMetody = (metoda: string): 'citat' | 'pisat' | 'mazat' =>
  metoda === 'GET' || metoda === 'HEAD' ? 'citat' : metoda === 'DELETE' ? 'mazat' : 'pisat';

/**
 * Smie prihlásený používateľ v module danú akciu? Pre miesta, kde sa
 * rozhoduje v kóde (napr. či ukázať aj neverejné záznamy).
 */
export const smieVModule = async (req: Request, modul: string | null, akcia: 'citat' | 'pisat' | 'mazat'): Promise<boolean> => {
  const user: any = (req as any).user;
  if (!user) return false;
  if (user.rola === 'admin') return true;
  if (modul && user.rola_id) {
    const rola = await Rola.findOne({ where: { id: user.rola_id, aktivity: true } });
    if (rola) return rola.smie(modul, akcia);
  }
  return user.rola === 'redaktor';
};

/**
 * Middleware pre kontrolu role.
 *
 * Používateľ s rolou z tabuľky rolí sa posudzuje podľa JEJ oprávnení
 * pre modul, ktorého sa požiadavka týka (čítať/písať/mazať podľa
 * metódy). Tak platia aj vlastné roly vytvorené v administrácii, nielen
 * pevné admin/redaktor/tréner. Správca smie vždy všetko; cesty mimo
 * modulov a používatelia bez roly sa posudzujú podľa pevnej roly.
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Autentifikácia je potrebná.' 
      });
      return;
    }

    if (req.user.rola === 'admin') {
      next();
      return;
    }

    const rolaId = (req.user as any).rola_id;
    const modul = modulZCesty(req.originalUrl);
    if (rolaId && modul) {
      try {
        const rola = await Rola.findOne({ where: { id: rolaId, aktivity: true } });
        if (rola) {
          const akcia = akciaZMetody(req.method);
          if (rola.smie(modul, akcia)) {
            next();
            return;
          }
          const popisAkcie = { citat: 'čítať', pisat: 'upravovať', mazat: 'mazať' }[akcia];
          res.status(403).json({
            success: false,
            message: `Vaša rola „${rola.nazov}" nemá právo ${popisAkcie} v tejto sekcii.`,
          });
          return;
        }
      } catch (chyba) {
        console.error('Chyba pri overovaní oprávnení roly:', chyba);
        res.status(500).json({ success: false, message: 'Serverová chyba pri overovaní oprávnení.' });
        return;
      }
    }

    if (!allowedRoles.includes(req.user.rola)) {
      res.status(403).json({ 
        success: false, 
        message: `Prístup odmietnutý. Vyžaduje sa rola: ${allowedRoles.join(' alebo ')}.` 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware pre kontrolu KONKRÉTNEHO OPRÁVNENIA.
 *
 * PREČO POPRI requireRole: role boli doteraz pevný enum, takže sa dalo
 * povedať len „musíš byť admin alebo redaktor". Odkedy si klub vie
 * vytvoriť vlastnú rolu a zaškrtať jej práva po moduloch, musí sa
 * kontrolovať samotné právo, nie meno roly.
 *
 * Používateľ bez priradenej roly z tabuľky rolí sa posudzuje podľa
 * pôvodného enumu, aby po nasadení nikto neprišiel o prístup.
 *
 * @param modul - modul administrácie, napríklad 'clanky'
 * @param akcia - 'citat' | 'pisat' | 'mazat'
 */
export const requirePermission = (modul: string, akcia: 'citat' | 'pisat' | 'mazat') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Autentifikácia je potrebná.' });
      return;
    }

    // Správca podľa pôvodného enumu smie všetko - poistka, aby sa klub
    // nemohol omylom zamknúť mimo vlastnej administrácie
    if (req.user.rola === 'admin') {
      next();
      return;
    }

    const rolaId = (req.user as any).rola_id;

    if (rolaId) {
      const rola = await Rola.findOne({ where: { id: rolaId, aktivity: true } });
      if (rola && rola.smie(modul, akcia)) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: `Vaša rola nemá právo „${akcia}" v module „${modul}".`,
      });
      return;
    }

    // Bez priradenej roly padáme späť na pôvodný enum
    const podlaEnumu: Record<string, string[]> = {
      citat: ['admin', 'redaktor', 'trener'],
      pisat: ['admin', 'redaktor'],
      mazat: ['admin'],
    };

    if (podlaEnumu[akcia]?.includes(req.user.rola)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Prístup odmietnutý - chýba právo „${akcia}" v module „${modul}".`,
    });
  };
};

// Middleware len pre adminov
export const requireAdmin = requireRole(['admin']);

// Middleware pre adminov a redaktorov
export const requireEditor = requireRole(['admin', 'redaktor']);

// Middleware pre adminov a trénerov
export const requireTrainer = requireRole(['admin', 'trener']);

// Voliteľný auth middleware (nepožaduje prihlásenie)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies?.token;

    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        const user = await User.findByPk(decoded.userId);
        
        if (user && user.aktivity) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }
    
    next();
  } catch (error) {
    // Pri voliteľnom auth ignorujeme chyby a pokračujeme
    next();
  }
};