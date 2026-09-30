// Umiestnenie: frontend/src/web/hladanie.ts
// Vyhľadávanie na webe pre šablóny: useHladanie(text) sa po krátkej
// pauze v písaní opýta servera (GET /api/hladat) a vráti výsledky
// zoskupené podľa typu (stránky, články, hráči…).

import { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';

export type TypVysledku = 'stranka' | 'clanok' | 'tim' | 'hrac' | 'video' | 'galeria' | 'dokument' | 'produkt';

export interface VysledokHladania {
  typ: TypVysledku;
  id: number;
  nazov: string;
  /** Adresa na webe (/clanek/…) alebo úplná adresa (video, dokument) */
  odkaz: string;
  popis: string | null;
  obrazok: string | null;
}

/** Názvy skupín výsledkov v poradí, v akom sa zobrazujú. */
export const SKUPINY_HLADANIA: Array<{ typ: TypVysledku; nazov: string }> = [
  { typ: 'stranka', nazov: 'Stránky' },
  { typ: 'clanok', nazov: 'Články' },
  { typ: 'tim', nazov: 'Tímy' },
  { typ: 'hrac', nazov: 'Hráči' },
  { typ: 'video', nazov: 'Videá' },
  { typ: 'galeria', nazov: 'Galérie' },
  { typ: 'dokument', nazov: 'Dokumenty' },
  { typ: 'produkt', nazov: 'Fanshop' },
];

/**
 * Výsledky vyhľadávania pre text (od 2 znakov, s oneskorením 250 ms).
 * @returns výsledky, stav načítavania a chyba
 */
export const useHladanie = (text: string, limit = 6): { vysledky: VysledokHladania[]; nacitava: boolean; chyba: string | null } => {
  const [stav, setStav] = useState<{ vysledky: VysledokHladania[]; nacitava: boolean; chyba: string | null }>({ vysledky: [], nacitava: false, chyba: null });
  const dotaz = text.trim();
  useEffect(() => {
    if (dotaz.length < 2) {
      setStav({ vysledky: [], nacitava: false, chyba: null });
      return;
    }
    const ovladac = new AbortController();
    setStav((s) => ({ ...s, nacitava: true, chyba: null }));
    const casovac = window.setTimeout(() => {
      fetch(apiUrl(`/hladat?q=${encodeURIComponent(dotaz)}&limit=${limit}`), { signal: ovladac.signal })
        .then(async (r) => {
          const telo = await r.json().catch(() => null);
          if (!r.ok || !telo?.success) throw new Error(telo?.message || 'Vyhľadávanie sa nepodarilo');
          setStav({ vysledky: telo.data as VysledokHladania[], nacitava: false, chyba: null });
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setStav({ vysledky: [], nacitava: false, chyba: e.message });
        });
    }, 250);
    return () => {
      window.clearTimeout(casovac);
      ovladac.abort();
    };
  }, [dotaz, limit]);
  return stav;
};
