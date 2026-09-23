// Umiestnenie: frontend/src/context/NastaveniaContext.tsx
// Poskytuje nastavenia klubu (názov, farby, kontakty) celej aplikácii.
//
// FARBY: hlavný spôsob ich nastavenia je <link> na /api/settings.css
// v index.html - štýl sa načíta spolu so stránkou a nič neblikne.
// Tento kontext farby ešte raz nastaví do :root, aby sa zmena v admin
// rozhraní prejavila okamžite bez obnovenia stránky.

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiUrl } from '../config/api';

export interface FarbyKlubu {
  primarna: string;
  sekundarna: string;
  akcent: string;
  primarna_kontrast: string;
  akcent_kontrast: string;
}

export interface NastaveniaKlubu {
  nazov: string;
  skratka: string | null;
  slogan: string | null;
  rok_zalozenia: number | null;
  logo: string | null;
  favicon: string | null;
  farby: FarbyKlubu;
  kontakt: {
    email: string | null;
    telefon: string | null;
    adresa: string | null;
  };
  socialne_siete: {
    facebook: string | null;
    instagram: string | null;
    youtube: string | null;
    x: string | null;
    tiktok?: string | null;
  };
  /** Údaje organizácie do päty webu */
  udaje?: {
    pravny_nazov: string | null;
    ico: string | null;
    dic: string | null;
    ic_dph: string | null;
    iban: string | null;
  };
  meta_popis: string | null;
}

// Predvolené hodnoty sa použijú, kým sa načítajú skutočné nastavenia,
// alebo ak backend nie je dostupný. Web tak nikdy nezostane bez farieb.
const PREDVOLENE: NastaveniaKlubu = {
  nazov: 'Futbalový klub',
  skratka: null,
  slogan: null,
  rok_zalozenia: null,
  logo: null,
  favicon: null,
  farby: {
    primarna: '#1B5E20',
    sekundarna: '#FFFFFF',
    akcent: '#FFC107',
    primarna_kontrast: '#FFFFFF',
    akcent_kontrast: '#1B2410',
  },
  kontakt: { email: null, telefon: null, adresa: null },
  socialne_siete: { facebook: null, instagram: null, youtube: null, x: null },
  meta_popis: null,
};

interface HodnotaKontextu {
  nastavenia: NastaveniaKlubu;
  nacitava: boolean;
  /** Znovu načíta nastavenia zo servera - volá sa po uložení v admine */
  obnov: () => Promise<void>;
}

const NastaveniaContext = createContext<HodnotaKontextu | undefined>(undefined);

/**
 * Zapíše farby do :root, aby ich videli všetky CSS pravidlá.
 * Odvodené odtiene rieši CSS funkcia color-mix, netreba ich počítať v JS.
 */
const nastavFarbyDoDokumentu = (farby: FarbyKlubu): void => {
  const koren = document.documentElement;
  koren.style.setProperty('--club-primary', farby.primarna);
  koren.style.setProperty('--club-secondary', farby.sekundarna);
  koren.style.setProperty('--club-accent', farby.akcent);
  koren.style.setProperty('--club-primary-contrast', farby.primarna_kontrast);
  koren.style.setProperty('--club-accent-contrast', farby.akcent_kontrast);
  // Dodatkové farby šablóny prídu v tom istom objekte - ako --club-extra-*
  const zakladne = ['primarna', 'sekundarna', 'akcent', 'primarna_kontrast', 'akcent_kontrast'];
  for (const [kluc, hodnota] of Object.entries(farby as unknown as Record<string, string>)) {
    if (!zakladne.includes(kluc) && /^#[0-9A-Fa-f]{6}$/.test(String(hodnota))) {
      koren.style.setProperty(`--club-extra-${kluc}`, hodnota);
    }
  }
};

export const NastaveniaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [nastavenia, setNastavenia] = useState<NastaveniaKlubu>(PREDVOLENE);
  const [nacitava, setNacitava] = useState(true);

  const nacitaj = async (): Promise<void> => {
    try {
      const odpoved = await fetch(apiUrl('/settings'));
      if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status}`);

      const telo = await odpoved.json();
      if (telo?.success && telo.data) {
        setNastavenia(telo.data);
        nastavFarbyDoDokumentu(telo.data.farby);

        // Názov klubu v titulku okna a záložke prehliadača
        document.title = telo.data.nazov;

        if (telo.data.favicon) {
          let ikona = document.querySelector<HTMLLinkElement>("link[rel='icon']");
          if (!ikona) {
            ikona = document.createElement('link');
            ikona.rel = 'icon';
            document.head.appendChild(ikona);
          }
          ikona.href = telo.data.favicon;
        }
      }
    } catch (chyba) {
      // Nedostupné nastavenia nesmú položiť celý web -
      // zostanú predvolené hodnoty
      console.warn('Nastavenia klubu sa nepodarilo načítať, používajú sa predvolené:', chyba);
    } finally {
      setNacitava(false);
    }
  };

  useEffect(() => {
    void nacitaj();
  }, []);

  return (
    <NastaveniaContext.Provider value={{ nastavenia, nacitava, obnov: nacitaj }}>
      {children}
    </NastaveniaContext.Provider>
  );
};

/**
 * Prístup k nastaveniam klubu.
 *
 * @example
 *   const { nastavenia } = useNastavenia();
 *   <h1>{nastavenia.nazov}</h1>
 */
export const useNastavenia = (): HodnotaKontextu => {
  const kontext = useContext(NastaveniaContext);
  if (!kontext) {
    throw new Error('useNastavenia sa musí volať vnútri <NastaveniaProvider>');
  }
  return kontext;
};
