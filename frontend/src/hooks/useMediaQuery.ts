// Umiestnenie: frontend/src/hooks/useMediaQuery.ts
// Sledovanie veľkosti obrazovky v Reacte.
//
// PREČO: komponenty čítali window.innerWidth priamo v renderi. React sa
// pri zmene šírky okna nemá ako dozvedieť, že treba prekresliť, takže po
// otočení telefónu alebo zmene veľkosti okna zostalo zobrazenie v pôvodnom
// stave - mobilné menu sa nezobrazilo alebo naopak neschovalo.
//
// matchMedia navyše zodpovedá tomu, ako fungujú CSS media queries,
// takže sa správanie v JS a v CSS nerozchádza.

import { useState, useEffect } from 'react';

/**
 * Sleduje, či platí zadaná media query.
 *
 * @param query - CSS media query, napr. '(max-width: 768px)'
 * @returns true, ak podmienka práve platí
 *
 * @example
 *   const jeMobil = useMediaQuery('(max-width: 768px)');
 */
export const useMediaQuery = (query: string): boolean => {
  const [zhoduje, setZhoduje] = useState<boolean>(() => {
    // Pri prvom vykreslení na serveri window neexistuje
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Stav zosúladíme hneď - query sa mohla medzitým zmeniť
    setZhoduje(mediaQuery.matches);

    const naZmenu = (e: MediaQueryListEvent) => setZhoduje(e.matches);

    mediaQuery.addEventListener('change', naZmenu);
    return () => mediaQuery.removeEventListener('change', naZmenu);
  }, [query]);

  return zhoduje;
};

/**
 * Skratka pre najčastejšie použitie - mobilné zobrazenie.
 * Hranica 768px zodpovedá breakpointu použitému v štýloch projektu.
 */
export const useJeMobil = (): boolean => useMediaQuery('(max-width: 768px)');
