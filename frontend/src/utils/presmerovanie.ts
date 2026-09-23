// Umiestnenie: frontend/src/utils/presmerovanie.ts
// Presmerovanie starých odkazov na webe.
//
// Web beží ako samostatná aplikácia, takže požiadavka na stránku sa
// k backendu nedostane. Pri nenájdenej stránke sa preto spýtame, či
// pre adresu nie je nastavené presmerovanie (Menu a odkazy).

import { apiUrl } from '../config/api';

/**
 * Presmeruje, ak pre aktuálnu adresu existuje presmerovanie.
 * @returns true, ak presmerovanie prebieha (netreba ukázať „nenájdené")
 */
export const skusPresmerovat = async (): Promise<boolean> => {
  try {
    const cesta = window.location.pathname;
    const odpoved = await fetch(apiUrl(`/redirects/resolve?cesta=${encodeURIComponent(cesta)}`));
    if (!odpoved.ok) return false;
    const telo = await odpoved.json();
    const ciel: string | undefined = telo?.data?.novy;
    if (!ciel || ciel === cesta) return false;
    window.location.replace(ciel);
    return true;
  } catch {
    return false;
  }
};
