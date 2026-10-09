// Umiestnenie: backend/src/services/licenciaSablon.ts
//
// Ktoré šablóny smie klub používať podľa licencie.
//
// Licenčný server posiela v licencii zoznam funkcií (pole „Funkcie“ plánu
// alebo licencie). Šablóny sa povoľujú takto:
//   sablony:vsetky   - všetky šablóny dodané so systémom
//   sablona:<slug>   - jedna šablóna, napríklad sablona:pulz
//
// Bez týchto funkcií má klub zo šablón dodaných so systémom len Základnú.
// Vlastné šablóny, ktoré si správca klubu sám nahrá, licencia neobmedzuje.
// Pri vypnutej kontrole licencie (vývoj, testy, jeden klub bez licenčného
// servera) sú povolené všetky šablóny.

import { stavLicencie } from '../middleware/licencia';
import { ZAKLADNA_SABLONA } from './sablony';

/** Funkcia licencie, ktorá povolí všetky šablóny dodané so systémom. */
export const FUNKCIA_VSETKY_SABLONY = 'sablony:vsetky';

/** Funkcia licencie, ktorá povolí jednu šablónu. */
export const funkciaSablony = (slug: string): string => `sablona:${slug}`;

export interface LicenciaSablon {
  /** Kontrola licencie je vypnutá - povolené je všetko */
  kontrolaVypnuta: boolean;
  /** Funkcie z licencie */
  funkcie: string[];
}

/** Údaje z aktuálneho stavu licencie, ktoré rozhodujú o šablónach. */
export const licenciaSablon = (): LicenciaSablon => ({
  kontrolaVypnuta: process.env.LICENSE_CHECK_DISABLED === 'true',
  funkcie: stavLicencie().funkcie,
});

/**
 * Smie klub používať túto šablónu?
 *
 * @param sablona - slug a či je dodaná so systémom
 * @param licencia - predvolene aktuálny stav licencie
 */
export const jeSablonaPovolena = (
  sablona: { slug: string; vstavana: boolean },
  licencia: LicenciaSablon = licenciaSablon()
): boolean => {
  if (licencia.kontrolaVypnuta) return true;
  if (!sablona.vstavana) return true;
  if (sablona.slug === ZAKLADNA_SABLONA) return true;
  // Funkcie píše človek v administrácii licenčného servera - veľkosť
  // písmen a medzery okolo nerozhodujú
  const funkcie = new Set(licencia.funkcie.map((f) => String(f).trim().toLowerCase()));
  return funkcie.has(FUNKCIA_VSETKY_SABLONY) || funkcie.has(funkciaSablony(sablona.slug));
};
