// Umiestnenie: license-server/src/utils/heslo.ts
// Hašovanie hesiel administrátorov cez scrypt (zabudovaný v Node.js).
//
// Formát uloženej hodnoty: scrypt$N$r$p$sol$odvodenyKluc (base64)

import crypto from 'crypto';

const N = 16384;
const R = 8;
const P = 1;
const DLZKA = 64;

const scrypt = (heslo: string, sol: Buffer, n = N, r = R, p = P): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    crypto.scrypt(heslo, sol, DLZKA, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (chyba, kluc) => (chyba ? reject(chyba) : resolve(kluc)))
  );

export const zahasujHeslo = async (heslo: string): Promise<string> => {
  const sol = crypto.randomBytes(16);
  const kluc = await scrypt(heslo, sol);
  return `scrypt$${N}$${R}$${P}$${sol.toString('base64')}$${kluc.toString('base64')}`;
};

export const overHeslo = async (heslo: string, ulozene: string): Promise<boolean> => {
  const casti = ulozene.split('$');
  if (casti.length !== 6 || casti[0] !== 'scrypt') return false;
  const [, n, r, p, sol, kluc] = casti;
  const ocakavany = Buffer.from(kluc, 'base64');
  const vypocitany = await scrypt(heslo, Buffer.from(sol, 'base64'), Number(n), Number(r), Number(p));
  return ocakavany.length === vypocitany.length && crypto.timingSafeEqual(ocakavany, vypocitany);
};

/** Požiadavky na heslo administrátora - chráni prístup k vydávaniu licencií. */
export const chybaHesla = (heslo: unknown): string | null => {
  if (typeof heslo !== 'string' || heslo.length < 12) return 'Heslo musí mať aspoň 12 znakov';
  if (heslo.length > 200) return 'Heslo je príliš dlhé';
  return null;
};
