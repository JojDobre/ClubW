// Umiestnenie: backend/src/services/suboryGalerie.ts
//
// Upratovanie súborov fotogalérií na disku.
//
// Fotky nahraté priamo do galérie ležia v /uploads/galerie/<rok>/<slug>/
// spolu s dvomi náhľadmi. Pri trvalom zmazaní fotky (alebo celej galérie
// z archívu) ich zmažeme, aby disk nerástol donekonečna. Súbory z knižnice
// médií (/uploads/media/...) sa tu nikdy nemažú - patria knižnici a
// zmazať ich možno len tam.

import path from 'path';
import { promises as fs } from 'fs';
import { Op } from 'sequelize';
import GaleriaObrazok from '../models/GaleriaObrazok';
import { zmazMedium } from '../utils/mediaUlozisko';
import { zistiPouzitie } from '../controllers/mediaController';

const PRIECINOK_GALERII = '/uploads/galerie/';

/** Cesty jednej fotky: originál a oba náhľady. */
const cestyFotky = (o: GaleriaObrazok): string[] =>
  [o.cesta_suboru, o.nahladovy_maly, o.nahladovy_stredny].filter((c): c is string => typeof c === 'string' && c.length > 0);

/**
 * Zmaže z disku súbory zadaných fotiek, ktoré už nič iné nepoužíva.
 *
 * Volá sa až PO zmazaní záznamov z databázy. Súbor ostane, ak naň ukazuje
 * iná fotka (aj v archivovanej galérii), titulný obrázok galérie, článok,
 * stránka, dokument alebo logo či fotka tímu, hráča, sponzora...
 *
 * @param obrazky - zmazané fotky (stačia ich cesty)
 * @returns počet zmazaných súborov
 */
export const zmazSuboryFotiek = async (obrazky: GaleriaObrazok[]): Promise<number> => {
  const cesty = [...new Set(obrazky.flatMap(cestyFotky))].filter((c) => c.startsWith(PRIECINOK_GALERII));
  let zmazanych = 0;
  const priecinky = new Set<string>();

  for (const cesta of cesty) {
    const inaFotka = await GaleriaObrazok.count({
      where: { [Op.or]: [{ cesta_suboru: cesta }, { nahladovy_maly: cesta }, { nahladovy_stredny: cesta }] },
    });
    if (inaFotka > 0) continue;
    const pouzitie = await zistiPouzitie(cesta);
    if (pouzitie.spolu > 0) continue;

    await zmazMedium(cesta);
    zmazanych++;
    priecinky.add(path.posix.dirname(cesta));
  }

  // Prázdny priečinok galérie po poslednej fotke odstránime (rmdir zlyhá,
  // ak v ňom ešte niečo je - to je v poriadku)
  for (const priecinok of priecinky) {
    await fs.rmdir(path.join(process.cwd(), priecinok)).catch(() => undefined);
  }

  return zmazanych;
};
