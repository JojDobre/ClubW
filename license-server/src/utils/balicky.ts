// Umiestnenie: license-server/src/utils/balicky.ts
// Balíky verzií na stiahnutie klientskymi webmi.
//
// Licenčný server stiahne z GitHubu archív verzie (tar.gz) raz, uloží si
// ho a spočíta kontrolný súčet SHA-256. Klient potom sťahuje balík od
// licenčného servera (len s platnou licenciou) a súčet si overí - súčet
// mu prišiel v podpísanej odpovedi, takže podvrhnutý balík neprejde.
// Klienti tak nepotrebujú prístup ku GitHubu ani token k súkromnému repozitáru.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { githubApi, hlavickyGithubu } from './github';
import type { Verzia } from '../models/sprava';

/** Najväčší povolený balík - ochrana disku pred nečakaným obsahom. */
const MAX_VELKOST = 300 * 1024 * 1024;

export const priecinokBalikov = () => path.resolve(process.env.BALIKY_DIR || path.join(process.cwd(), 'baliky'));

const bezpecnyNazov = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '_');

/** Cesta k balíku verzie na disku. */
export const cestaBaliku = (kodProduktu: string, tag: string) =>
  path.join(priecinokBalikov(), bezpecnyNazov(kodProduktu), `${bezpecnyNazov(tag)}.tar.gz`);

/**
 * Stiahne archív verzie z GitHubu, uloží ho a vráti súčet a veľkosť.
 * Sťahuje sa do dočasného súboru - rozpracovaný balík nikdy nie je
 * dostupný klientom.
 */
export const stiahniBalik = async (repo: string, kodProduktu: string, tag: string): Promise<{ sha256: string; velkost: number }> => {
  const ciel = cestaBaliku(kodProduktu, tag);
  await fs.promises.mkdir(path.dirname(ciel), { recursive: true });
  const docasny = `${ciel}.${process.pid}.${Date.now()}.tmp`;

  const odpoved = await fetch(`${githubApi()}/repos/${repo}/tarball/${encodeURIComponent(tag)}`, {
    headers: hlavickyGithubu(),
    redirect: 'follow',
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  if (!odpoved.ok || !odpoved.body) throw new Error(`GitHub nevydal archív verzie ${tag} (chyba ${odpoved.status})`);

  const hash = crypto.createHash('sha256');
  let velkost = 0;
  const pocitadlo = new Transform({
    transform(kus: Buffer, _k, hotovo) {
      velkost += kus.length;
      if (velkost > MAX_VELKOST) {
        hotovo(new Error('Archív verzie je väčší než 300 MB'));
        return;
      }
      hash.update(kus);
      hotovo(null, kus);
    },
  });

  try {
    await pipeline(Readable.fromWeb(odpoved.body as any), pocitadlo, fs.createWriteStream(docasny));
    await fs.promises.rename(docasny, ciel);
  } catch (chyba) {
    await fs.promises.rm(docasny, { force: true });
    throw chyba;
  }
  return { sha256: hash.digest('hex'), velkost };
};

/** Balík existuje na disku a sedí mu súčet uložený pri verzii. */
export const balikJeNaDisku = (kodProduktu: string, verzia: Verzia): boolean =>
  verzia.balik_stav === 'pripraveny' && fs.existsSync(cestaBaliku(kodProduktu, verzia.tag));
