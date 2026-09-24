// Umiestnenie: frontend/src/app/useNacitanie.ts
// Načítanie dát z API so správou stavov.
//
// PREČO: každá obrazovka potrebuje to isté — načítavam / mám dáta / chyba,
// možnosť skúsiť znova a prerušenie požiadavky pri odchode z obrazovky.
// Pôvodná administrácia to riešila v každom komponente zvlášť a niekde
// chýbalo ošetrenie chyby, takže obrazovka zostala navždy prázdna.

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiChyba } from './apiKlient';
import { tr } from '../i18n';

interface Vysledok<T> {
  data: T | null;
  nacitava: boolean;
  chyba: string | null;
  /** Znovu načíta dáta — pre tlačidlo „Skúsiť znova" a po uložení zmien */
  obnov: () => void;
  /** Priame nastavenie dát bez volania servera (po lokálnej úprave) */
  nastavData: (data: T | null) => void;
}

/**
 * Načíta dáta a udržiava stav načítavania.
 *
 * @param nacitaj - funkcia volajúca API; dostane signál na prerušenie
 * @param zavislosti - pri ich zmene sa načítanie zopakuje
 *
 * @example
 *   const { data, nacitava, chyba, obnov } = useNacitanie(
 *     (signal) => clankyApi.vypis({ page }, signal),
 *     [page]
 *   );
 */
export function useNacitanie<T>(
  nacitaj: (signal: AbortSignal) => Promise<T>,
  zavislosti: unknown[] = []
): Vysledok<T> {
  const [data, setData] = useState<T | null>(null);
  const [nacitava, setNacitava] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);

  // Počítadlo vynúti opakovanie načítania pri zavolaní obnov()
  const [pocitadlo, setPocitadlo] = useState(0);

  // Funkciu držíme v referencii, aby jej zmena nespôsobila ďalšie načítanie.
  // Bez toho by stačilo, že ju rodič vytvorí nanovo pri každom prekreslení,
  // a vzniklo by nekonečné načítavanie.
  const nacitajRef = useRef(nacitaj);
  nacitajRef.current = nacitaj;

  useEffect(() => {
    const controller = new AbortController();
    let zrusene = false;

    setNacitava(true);
    setChyba(null);

    nacitajRef
      .current(controller.signal)
      .then((vysledok) => {
        if (!zrusene) setData(vysledok);
      })
      .catch((e: unknown) => {
        // Prerušenie pri odchode z obrazovky nie je chyba
        if (e instanceof Error && e.name === 'AbortError') return;
        if (zrusene) return;

        setChyba(
          e instanceof ApiChyba
            ? e.message
            : e instanceof Error
              ? e.message
              : tr('Neznáma chyba')
        );
      })
      .finally(() => {
        if (!zrusene) setNacitava(false);
      });

    return () => {
      zrusene = true;
      // Prerušenie požiadavky — inak by odpoveď dorazila do odpojeného
      // komponentu a React by hlásil zápis do neexistujúceho stavu
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...zavislosti, pocitadlo]);

  const obnov = useCallback(() => setPocitadlo((p) => p + 1), []);

  return { data, nacitava, chyba, obnov, nastavData: setData };
}

export default useNacitanie;
