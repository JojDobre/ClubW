// Umiestnenie: backend/src/services/planovacClankov.ts
//
// PLÁNOVANÉ PUBLIKOVANIE ČLÁNKOV
//
// PREČO VZNIKOL: článok sa dal uložiť so stavom "scheduled" a dátumom
// vydania, ale nič ho nikdy nezverejnilo. Článok naplánovaný na minulý
// týždeň zostal navždy v stave scheduled a na web sa nedostal - funkcia
// "naplánovať" teda existovala len na papieri.
//
// Beží v procese aplikácie, rovnako ako upratovanie starých tokenov
// a kontrola licencie. Nepotrebuje teda externý cron ani ďalšiu službu.

import { Op } from 'sequelize';
import Article from '../models/Article';

/** Ako často sa kontroluje, či nie je čo zverejniť. */
const INTERVAL_MS = 60 * 1000;

/**
 * Zverejní všetky články, ktorých čas vydania už nastal.
 *
 * Exportované samostatne, aby sa dalo spustiť aj ručne (test, skript).
 *
 * @returns počet článkov, ktoré prešli do stavu published
 */
export const zverejniNaplanovane = async (): Promise<number> => {
  const teraz = new Date();

  const clanky = await Article.findAll({
    where: {
      status: 'scheduled',
      publikovany_datum: { [Op.ne]: null, [Op.lte]: teraz },
    },
  });

  if (clanky.length === 0) {
    return 0;
  }

  for (const clanok of clanky) {
    // Ukladáme po jednom, nie hromadným UPDATE. Hooky na modeli tak
    // dobehnú normálne (slug, excerpt, SEO) a prípadná chyba na jednom
    // článku nezhodí zvyšok dávky.
    try {
      await clanok.update({ status: 'published' });
      console.log(`📰 Zverejnený naplánovaný článok: ${clanok.nazov}`);
    } catch (chyba) {
      console.error(`Nepodarilo sa zverejniť článok ${clanok.id}:`, chyba);
    }
  }

  return clanky.length;
};

/**
 * Spustí pravidelnú kontrolu naplánovaných článkov.
 *
 * @returns funkcia, ktorá kontrolu zastaví (pri vypínaní servera)
 */
export const spustiPlanovacClankov = (): (() => void) => {
  // Prvý beh hneď po štarte - články naplánované počas výpadku servera
  // sa tak zverejnia okamžite, nie až o minútu.
  void zverejniNaplanovane().catch((chyba) => {
    console.error('Chyba pri prvom behu plánovača článkov:', chyba);
  });

  const casovac = setInterval(() => {
    void zverejniNaplanovane().catch((chyba) => {
      console.error('Chyba v plánovači článkov:', chyba);
    });
  }, INTERVAL_MS);

  // Časovač nesmie držať proces nažive, keď sa server vypína
  if (typeof casovac.unref === 'function') {
    casovac.unref();
  }

  console.log('🗓️  Plánovač článkov spustený (kontrola každú minútu)');

  return () => clearInterval(casovac);
};
