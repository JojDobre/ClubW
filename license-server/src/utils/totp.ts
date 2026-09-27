// Umiestnenie: license-server/src/utils/totp.ts
// Dvojstupňové overenie - jednorazové kódy podľa RFC 6238 (TOTP), aké
// generujú aplikácie Google Authenticator, Microsoft Authenticator, Aegis...

import crypto from 'crypto';

const ABECEDA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Nové tajomstvo (base32, 160 bitov). */
export const noveTajomstvo = (): string => {
  const bajty = crypto.randomBytes(20);
  let bity = '';
  for (const b of bajty) bity += b.toString(2).padStart(8, '0');
  let vysledok = '';
  for (let i = 0; i + 5 <= bity.length; i += 5) vysledok += ABECEDA[parseInt(bity.slice(i, i + 5), 2)];
  return vysledok;
};

const zBase32 = (text: string): Buffer => {
  const cisty = text.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bity = '';
  for (const znak of cisty) {
    const hodnota = ABECEDA.indexOf(znak);
    if (hodnota < 0) throw new Error('Neplatné tajomstvo');
    bity += hodnota.toString(2).padStart(5, '0');
  }
  const bajty: number[] = [];
  for (let i = 0; i + 8 <= bity.length; i += 8) bajty.push(parseInt(bity.slice(i, i + 8), 2));
  return Buffer.from(bajty);
};

/** Kód pre dané časové okno (30 sekúnd). */
export const kodPreCas = (tajomstvo: string, cas = Date.now()): string => {
  const pocitadlo = Math.floor(cas / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(pocitadlo));
  const hmac = crypto.createHmac('sha1', zBase32(tajomstvo)).update(buffer).digest();
  const posun = hmac[hmac.length - 1] & 0x0f;
  const cislo = (hmac.readUInt32BE(posun) & 0x7fffffff) % 1_000_000;
  return String(cislo).padStart(6, '0');
};

/** Overí kód; toleruje jedno okno dozadu a dopredu (rozdiel hodín). */
export const overKod = (tajomstvo: string, kod: unknown): boolean => {
  if (typeof kod !== 'string' || !/^\d{6}$/.test(kod.trim())) return false;
  const zadany = Buffer.from(kod.trim());
  return [-1, 0, 1].some((okno) => {
    const ocakavany = Buffer.from(kodPreCas(tajomstvo, Date.now() + okno * 30_000));
    return crypto.timingSafeEqual(ocakavany, zadany);
  });
};

/** Odkaz pre aplikáciu (otpauth://), dá sa otvoriť priamo v telefóne. */
export const otpauthOdkaz = (tajomstvo: string, email: string, vydavatel = 'ClubW Licencie'): string =>
  `otpauth://totp/${encodeURIComponent(`${vydavatel}:${email}`)}?secret=${tajomstvo}&issuer=${encodeURIComponent(vydavatel)}&algorithm=SHA1&digits=6&period=30`;
