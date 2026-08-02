// Umiestnenie: frontend/src/app/RezimContext.tsx
// Prepínanie svetlého a tmavého režimu novej administrácie.
//
// POZOR: nezamieňať s context/ThemeContext.tsx — ten patrí pôvodnej
// administrácii a zostáva funkčný, kým nebude nahradená celá.
// Nové obrazovky používajú tento.
//
// Voľba sa ukladá do prehliadača. Ak si používateľ nič nezvolil,
// prevezme sa nastavenie operačného systému.

import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';

export type Rezim = 'light' | 'dark';

interface HodnotaKontextu {
  rezim: Rezim;
  jeTmavy: boolean;
  prepni: () => void;
  nastav: (rezim: Rezim) => void;
}

const RezimContext = createContext<HodnotaKontextu | undefined>(undefined);

const KLUC = 'clubw_rezim';

/** Zistí počiatočný režim: uložená voľba, inak nastavenie systému. */
const zistiPociatocnyRezim = (): Rezim => {
  if (typeof window === 'undefined') return 'light';

  const ulozeny = localStorage.getItem(KLUC);
  if (ulozeny === 'light' || ulozeny === 'dark') return ulozeny;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const RezimProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rezim, setRezim] = useState<Rezim>(zistiPociatocnyRezim);

  // Režim zapisujeme na koreňový prvok — CSS naň reaguje cez [data-theme]
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', rezim);
    localStorage.setItem(KLUC, rezim);
  }, [rezim]);

  // Sledovanie zmeny v systéme. Uplatní sa len vtedy, keď si používateľ
  // režim ešte nezvolil ručne — inak by mu systém prepisoval voľbu.
  useEffect(() => {
    const dopyt = window.matchMedia('(prefers-color-scheme: dark)');

    const naZmenu = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(KLUC)) {
        setRezim(e.matches ? 'dark' : 'light');
      }
    };

    dopyt.addEventListener('change', naZmenu);
    return () => dopyt.removeEventListener('change', naZmenu);
  }, []);

  const prepni = useCallback(() => {
    setRezim((doterajsi) => (doterajsi === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <RezimContext.Provider
      value={{ rezim, jeTmavy: rezim === 'dark', prepni, nastav: setRezim }}
    >
      {children}
    </RezimContext.Provider>
  );
};

export const useRezim = (): HodnotaKontextu => {
  const kontext = useContext(RezimContext);
  if (!kontext) {
    throw new Error('useRezim sa musí volať vnútri <RezimProvider>');
  }
  return kontext;
};
