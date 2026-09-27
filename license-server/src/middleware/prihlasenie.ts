// Umiestnenie: license-server/src/middleware/prihlasenie.ts
// Prihlásenie do administrácie licenčného servera.
//
// Relácia je náhodný token v cookie (HttpOnly - nedostane sa k nemu
// JavaScript, SameSite=Strict - prehliadač ho nepošle z cudzej stránky).
// V databáze je len jeho odtlačok SHA-256, únik databázy tak neprezradí
// platné relácie. Zmeny navyše vyžadujú hlavičku X-Poziadavka, ktorú
// cudzia stránka bez povolenia CORS poslať nevie (ochrana pred CSRF).

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Administrator, Relacia } from '../models/sprava';

export const NAZOV_COOKIE = 'clubw_licencie';
/** Najdlhšia relácia - potom sa treba prihlásiť znova. */
const PLATNOST_RELACIE_MS = 12 * 60 * 60 * 1000;
/** Po takejto nečinnosti relácia skončí. */
const NECINNOST_MS = 2 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: Administrator;
      relacia?: Relacia;
    }
  }
}

const odtlacok = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const citajCookie = (req: Request, nazov: string): string | null => {
  const hlavicka = req.headers.cookie;
  if (!hlavicka) return null;
  for (const cast of hlavicka.split(';')) {
    const [kluc, ...hodnota] = cast.trim().split('=');
    if (kluc === nazov) return decodeURIComponent(hodnota.join('='));
  }
  return null;
};

/** Cookie cez HTTPS (v produkcii vždy - za reverznou proxy s certifikátom). */
const bezpecneCookie = () => process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false');

const nastavCookie = (res: Response, token: string, maxVek: number) => {
  const casti = [`${NAZOV_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${Math.floor(maxVek / 1000)}`];
  if (bezpecneCookie()) casti.push('Secure');
  res.setHeader('Set-Cookie', casti.join('; '));
};

/** Vytvorí reláciu po úspešnom prihlásení. */
export const vytvorRelaciu = async (req: Request, res: Response, admin: Administrator): Promise<void> => {
  const token = crypto.randomBytes(32).toString('base64url');
  await Relacia.create({
    administrator_id: admin.id,
    token_hash: odtlacok(token),
    ip: req.ip ?? null,
    prehliadac: String(req.headers['user-agent'] ?? '').slice(0, 300) || null,
    plati_do: new Date(Date.now() + PLATNOST_RELACIE_MS),
  });
  // Staré relácie priebežne mažeme
  await Relacia.destroy({ where: { plati_do: { [Op.lt]: new Date() } } });
  nastavCookie(res, token, PLATNOST_RELACIE_MS);
};

/** Ukončí aktuálnu reláciu. */
export const zrusRelaciu = async (req: Request, res: Response): Promise<void> => {
  const token = citajCookie(req, NAZOV_COOKIE);
  if (token) await Relacia.destroy({ where: { token_hash: odtlacok(token) } });
  nastavCookie(res, '', 0);
};

/** Zruší všetky relácie administrátora (zmena hesla, deaktivácia). */
export const zrusVsetkyRelacie = async (administratorId: number, okremId?: number): Promise<void> => {
  await Relacia.destroy({ where: { administrator_id: administratorId, ...(okremId ? { id: { [Op.ne]: okremId } } : {}) } });
};

/** Prístup len pre prihláseného aktívneho administrátora. */
export const vyzadujPrihlasenie = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = citajCookie(req, NAZOV_COOKIE);
    if (!token) {
      res.status(401).json({ success: false, message: 'Prihláste sa' });
      return;
    }
    const relacia = await Relacia.findOne({
      where: { token_hash: odtlacok(token), plati_do: { [Op.gt]: new Date() } },
      include: [{ model: Administrator, as: 'administrator' }],
    });
    const necinna = relacia && Date.now() - new Date(relacia.posledna_aktivita).getTime() > NECINNOST_MS;
    if (!relacia || !relacia.administrator?.aktivny || necinna) {
      if (relacia) await relacia.destroy();
      nastavCookie(res, '', 0);
      res.status(401).json({ success: false, message: 'Relácia vypršala, prihláste sa znova' });
      return;
    }
    // Aktivitu zapisujeme najviac raz za minútu
    if (Date.now() - new Date(relacia.posledna_aktivita).getTime() > 60_000) {
      await relacia.update({ posledna_aktivita: new Date() });
    }
    req.admin = relacia.administrator;
    req.relacia = relacia;
    next();
  } catch (chyba) {
    next(chyba);
  }
};

/**
 * Zmeny (POST, PUT, DELETE) len s hlavičkou X-Poziadavka: 1.
 * Administrácia ju posiela vždy; formulár alebo obrázok z cudzej
 * stránky ju pridať nevie.
 */
export const vyzadujHlavicku = (req: Request, res: Response, next: NextFunction): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.header('X-Poziadavka') === '1') {
    next();
    return;
  }
  res.status(403).json({ success: false, message: 'Chýba hlavička požiadavky' });
};
