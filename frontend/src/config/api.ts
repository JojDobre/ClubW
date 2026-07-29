// Umiestnenie: frontend/src/config/api.ts
// Jediné miesto, kde sa určuje adresa backendu.
//
// PREČO: adresa http://localhost:3000 bola natvrdo zapísaná na 100 miestach
// v 38 súboroch. Produkčný build sa tak vždy pokúšal spojiť s localhostom
// na počítači návštevníka a aplikácia nefungovala nikde okrem vývoja.
//
// NASTAVENIE:
//   - Vývoj: netreba nič. Vite presmeruje /api a /uploads na localhost:3000
//     (nastavené v vite.config.ts), takže sa použijú relatívne cesty.
//   - Produkcia: v súbore .env nastav VITE_API_URL na adresu backendu,
//     napríklad VITE_API_URL=https://api.tvojklub.sk

// Základ adresy servera bez koncového lomítka (napr. https://api.tvojklub.sk).
// Prázdna hodnota znamená rovnaký pôvod ako frontend - vtedy sa použijú
// relatívne cesty a vo vývoji sa uplatní proxy z vite.config.ts.
const SERVER_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

/**
 * Základ pre API volania, napríklad `${API_BASE_URL}/teams`.
 */
export const API_BASE_URL = `${SERVER_URL}/api`;

/**
 * Zloží plnú adresu API endpointu.
 *
 * @param cesta - cesta bez predpony /api, napr. '/teams/5' alebo 'teams/5'
 * @returns adresa pripravená pre fetch
 *
 * @example
 *   apiUrl('/teams')        // '/api/teams'
 *   apiUrl('matches/12')    // '/api/matches/12'
 */
export const apiUrl = (cesta: string): string => {
  const normalizovana = cesta.startsWith('/') ? cesta : `/${cesta}`;
  return `${API_BASE_URL}${normalizovana}`;
};

/**
 * Zloží adresu nahratého súboru (fotky hráčov, logá tímov, obrázky článkov).
 *
 * Backend ukladá do databázy relatívne cesty typu '/uploads/images/players/1/foto.jpg'.
 * Táto funkcia z nich urobí adresu použiteľnú v atribúte src.
 *
 * @param cesta - relatívna cesta k súboru z databázy
 * @returns plná adresa súboru, alebo prázdny reťazec ak cesta chýba
 *
 * @example
 *   souborUrl('/uploads/images/players/1/foto.jpg')  // '/uploads/images/players/1/foto.jpg'
 */
export const souborUrl = (cesta: string | null | undefined): string => {
  if (!cesta) return '';

  // Ak už ide o úplnú adresu (napr. obrázok z externého zdroja), necháme ju tak
  if (cesta.startsWith('http://') || cesta.startsWith('https://') || cesta.startsWith('data:')) {
    return cesta;
  }

  const normalizovana = cesta.startsWith('/') ? cesta : `/${cesta}`;
  return `${SERVER_URL}${normalizovana}`;
};
