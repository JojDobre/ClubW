// Umiestnenie: backend/src/utils/sifrovanie.ts
// Šifrovanie tajomstiev uložených v databáze (heslo k SMTP serveru).
//
// AES-256-GCM s kľúčom odvodeným z EMAIL_SIFROVACI_KLUC, inak z JWT_SECRET.
// Únik zálohy databázy tak neprezradí heslo k e-mailovej schránke.
// Po zmene kľúča sa uložené heslo nedá prečítať - treba ho zadať znova.

import crypto from 'crypto';

const kluc = (): Buffer => {
  const tajomstvo = process.env.EMAIL_SIFROVACI_KLUC || process.env.JWT_SECRET;
  if (!tajomstvo) throw new Error('Chýba EMAIL_SIFROVACI_KLUC alebo JWT_SECRET');
  return crypto.createHash('sha256').update(`clubw-sifrovanie:${tajomstvo}`).digest();
};

/** Zašifruje text; výsledok je „v1:iv:tag:data" v base64url. */
export const zasifruj = (text: string): string => {
  const iv = crypto.randomBytes(12);
  const sifra = crypto.createCipheriv('aes-256-gcm', kluc(), iv);
  const data = Buffer.concat([sifra.update(text, 'utf8'), sifra.final()]);
  return ['v1', iv.toString('base64url'), sifra.getAuthTag().toString('base64url'), data.toString('base64url')].join(':');
};

/** Dešifruje text zo zasifruj(); pri zlom kľúči alebo poškodených dátach vráti null. */
export const desifruj = (zasifrovane: string | null | undefined): string | null => {
  if (!zasifrovane) return null;
  const [verzia, iv, tag, data] = zasifrovane.split(':');
  if (verzia !== 'v1' || !iv || !tag || !data) return null;
  try {
    const desifra = crypto.createDecipheriv('aes-256-gcm', kluc(), Buffer.from(iv, 'base64url'));
    desifra.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([desifra.update(Buffer.from(data, 'base64url')), desifra.final()]).toString('utf8');
  } catch {
    return null;
  }
};
