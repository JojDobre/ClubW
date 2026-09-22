// Umiestnenie: backend/src/services/planovacZapasov.ts
//
// AUTOMATICKÉ PREPÍNANIE STAVU ZÁPASOV
//
// PREČO VZNIKOL: požiadavka hovorí „stav zápasu (plánovaný/odohratý -
// automaticky s možnosťou zmeny". Logika na to existovala
// (Zapas.getAutoStatus a endpoint PUT /api/matches/update-statuses),
// ale nikto ju nevolal - stav sa teda menil len vtedy, keď si niekto
// spomenul ručne spustiť endpoint.
//
// Beží v procese aplikácie ako plánovač článkov. Zrušené a odložené
// zápasy sa nikdy neprepisujú - to sú rozhodnutia človeka.

import { Op } from 'sequelize';
import Zapas from '../models/Zapas';

/** Stavy, do ktorých automatika nezasahuje. */
const RUCNE_STAVY = ['zruseny', 'odlozeny'];

/** Ako často sa stavy prepočítavajú. */
const INTERVAL_MS = 5 * 60 * 1000;

/**
 * Prejde zápasy a nastaví im stav podľa aktuálneho času.
 *
 * Exportované samostatne, aby sa dalo spustiť aj ručne (endpoint, test).
 *
 * @returns počet zápasov, ktorým sa stav zmenil
 */
export const aktualizujStavyZapasov = async (): Promise<number> => {
  const zapasy = await Zapas.findAll({
    where: {
      aktivity: true,
      status: { [Op.notIn]: RUCNE_STAVY },
    },
  });

  let zmenene = 0;

  for (const zapas of zapasy) {
    const automatickyStav = zapas.getAutoStatus();

    if (zapas.status === automatickyStav) continue;

    try {
      await zapas.update({ status: automatickyStav });
      zmenene++;
      console.log(`⚽ Zápas "${zapas.nazov}": ${zapas.status} → ${automatickyStav}`);
    } catch (chyba) {
      console.error(`Nepodarilo sa zmeniť stav zápasu ${zapas.id}:`, chyba);
    }
  }

  return zmenene;
};

/**
 * Spustí pravidelný prepočet stavov zápasov.
 *
 * @returns funkcia, ktorá prepočet zastaví (pri vypínaní servera)
 */
export const spustiPlanovacZapasov = (): (() => void) => {
  // Prvý beh hneď po štarte - zápasy odohraté počas výpadku servera
  // tak dostanú správny stav okamžite
  void aktualizujStavyZapasov().catch((chyba) => {
    console.error('Chyba pri prvom behu plánovača zápasov:', chyba);
  });

  const casovac = setInterval(() => {
    void aktualizujStavyZapasov().catch((chyba) => {
      console.error('Chyba v plánovači zápasov:', chyba);
    });
  }, INTERVAL_MS);

  if (typeof casovac.unref === 'function') {
    casovac.unref();
  }

  console.log('⚽ Plánovač zápasov spustený (prepočet stavov každých 5 minút)');

  return () => clearInterval(casovac);
};
