// Umiestnenie: backend/src/services/fanusikUcet.ts
//
// Účty fanúšikov na webe (Môj klub). Sú úplne oddelené od účtov
// administrácie: vlastný typ tokenu (typ: 'fanusik'), ktorý administrácia
// neprijme, a naopak token správcu neotvorí účet fanúšika.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Fanusik from '../models/Fanusik';
import FanusikToken, { type UcelTokenu } from '../models/FanusikToken';
import NastaveniaKlubu from '../models/NastaveniaKlubu';
import { posliEmail } from '../utils/email';
import { adresaWebu } from './eshop';

const PLATNOST_PRIHLASENIA = '30d';

interface TokenFanusika {
  fanusikId: number;
  typ: 'fanusik';
  /** Verzia tokenov fanúšika v čase vydania - zmena hesla ju zvýši */
  v: number;
}

const tajomstvo = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET nie je nastavený');
  return s;
};

/** Prihlasovací token fanúšika (30 dní). */
export const vydajTokenFanusika = (f: Fanusik): string =>
  jwt.sign({ fanusikId: f.id, typ: 'fanusik', v: f.verzia_tokenu ?? 0 } satisfies TokenFanusika, tajomstvo(), {
    expiresIn: PLATNOST_PRIHLASENIA,
  });

export interface RequestFanusika extends Request {
  fanusik?: Fanusik;
}

/**
 * Middleware: požiadavka musí mať platný token fanúšika. Zamietnutý,
 * zmazaný alebo odhlásený (zmena hesla) účet neprejde.
 */
export const vyzadujFanusika = async (req: RequestFanusika, res: Response, next: NextFunction): Promise<void> => {
  const hlavicka = req.headers.authorization || '';
  const token = hlavicka.startsWith('Bearer ') ? hlavicka.slice(7) : '';
  const neprihlaseny = () => res.status(401).json({ success: false, message: 'Prihláste sa do svojho účtu' });
  if (!token) {
    neprihlaseny();
    return;
  }
  try {
    const obsah = jwt.verify(token, tajomstvo()) as Partial<TokenFanusika>;
    if (obsah.typ !== 'fanusik' || !Number.isInteger(obsah.fanusikId)) {
      neprihlaseny();
      return;
    }
    const f = await Fanusik.findByPk(obsah.fanusikId);
    if (!f || !f.aktivity || f.stav === 'zamietnuty' || !f.heslo_hash || (f.verzia_tokenu ?? 0) !== obsah.v) {
      neprihlaseny();
      return;
    }
    req.fanusik = f;
    next();
  } catch {
    neprihlaseny();
  }
};

/** Údaje fanúšika pre jeho vlastný profil (bez interných polí). */
export const profilFanusika = (f: Fanusik) => ({
  id: f.id,
  meno: f.meno,
  priezvisko: f.priezvisko,
  email: f.email,
  telefon: f.telefon,
  adresa: f.adresa,
  datum_narodenia: f.datum_narodenia,
  typ_clenstva: f.typ_clenstva,
  stav: f.stav,
  platne: f.jePlatne(),
  cislo_karty: f.stav === 'aktivny' ? f.cislo_karty : null,
  clenstvo_od: f.clenstvo_od,
  clenstvo_do: f.clenstvo_do,
  // Kód do QR kódu karty - len pri platnom členstve
  overovaci_kod: f.jePlatne() ? f.overovaci_kod : null,
  suhlas_oznamy: f.suhlas_oznamy,
  vytvoreny: f.vytvoreny,
});

/** Odkaz na stránku nastavenia hesla na webe. */
export const odkazNaHeslo = (token: string): string => `${adresaWebu()}/moj-klub/heslo?token=${encodeURIComponent(token)}`;

/**
 * Vystaví jednorazový odkaz na nastavenie hesla a pošle ho e-mailom.
 * @returns odkaz (administrácia ho môže skopírovať, ak e-mail nefunguje)
 */
export const posliOdkazNaHeslo = async (f: Fanusik, ucel: UcelTokenu): Promise<{ odkaz: string; odoslany: boolean }> => {
  const token = await FanusikToken.vystav(f.id, ucel);
  const odkaz = odkazNaHeslo(token);
  const klub = (await NastaveniaKlubu.nacitaj())?.nazov || 'Klub';
  const text =
    ucel === 'pozvanka'
      ? `Dobrý deň ${f.meno},\n\n${klub} vám pripravil účet na webe. V účte nájdete svoju členskú kartu a výhody pre členov.\n\n` +
        `Heslo si nastavíte tu (odkaz platí 7 dní):\n${odkaz}\n\nPrihlasovací e-mail: ${f.email}\n`
      : `Dobrý deň ${f.meno},\n\ndostali sme žiadosť o nové heslo k vášmu účtu na webe ${klub}.\n\n` +
        `Nové heslo si nastavíte tu (odkaz platí 2 hodiny):\n${odkaz}\n\nAk ste o zmenu nežiadali, správu ignorujte - heslo ostane bez zmeny.\n`;
  const odoslany = await posliEmail({
    prijemca: f.email,
    predmet: ucel === 'pozvanka' ? `${klub}: váš účet na webe` : `${klub}: nastavenie hesla`,
    text,
  }).catch(() => false);
  return { odkaz, odoslany };
};

/** Pošle schválenému členovi správu (s pozvánkou, ak ešte nemá heslo). */
export const oznamSchvalenie = async (f: Fanusik): Promise<{ odkaz: string | null; odoslany: boolean }> => {
  if (!f.heslo_hash) {
    const { odkaz, odoslany } = await posliOdkazNaHeslo(f, 'pozvanka');
    return { odkaz, odoslany };
  }
  const klub = (await NastaveniaKlubu.nacitaj())?.nazov || 'Klub';
  const odoslany = await posliEmail({
    prijemca: f.email,
    predmet: `${klub}: registrácia bola schválená`,
    text:
      `Dobrý deň ${f.meno},\n\nvaša registrácia v klube ${klub} bola schválená. Vitajte!\n\n` +
      `Po prihlásení nájdete svoju členskú kartu a výhody pre členov:\n${adresaWebu()}/moj-klub\n`,
  }).catch(() => false);
  return { odkaz: null, odoslany };
};
