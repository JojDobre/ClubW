// Umiestnenie: frontend/src/web/SablonaKontext.tsx
// Načítanie aktívnej šablóny webu a výber častí, ktoré zobrazí.
//
// POSTUP: web sa spýta servera na aktívnu šablónu, pripojí jej štýl
// a spustí jej skript. Skript zavolá ClubW.registrujSablonu({ casti })
// a odovzdá časti webu, ktoré nahrádza. Čo nenahradí, zobrazí sa zo
// základnej šablóny. Kým sa šablóna nenačíta, web nič nevykreslí - inak
// by na okamih bliklo základné rozloženie.

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiUrl, souborUrl } from '../config/api';
import type { AktivnaSablona, CastiSablony, DefiniciaSablony, HodnotaNastavenia, NazovCasti } from './typy';

const KLUC_NAHLADU = 'clubw_nahlad_sablony';
const LIMIT_NACITANIA = 6000;

interface HodnotaKontextu {
  sablona: AktivnaSablona;
  casti: CastiSablony;
}

const SablonaContext = createContext<HodnotaKontextu | null>(null);

// ===== Registrácia šablóny zo skriptu =====

let cakajuca: ((definicia: DefiniciaSablony) => void) | null = null;

/**
 * Volá skript šablóny: ClubW.registrujSablonu({ casti: { Hlavicka, Uvod } }).
 * Registrácia mimo načítavania šablóny (napr. dvakrát) sa ignoruje.
 */
export const registrujSablonu = (definicia: DefiniciaSablony): void => {
  if (!cakajuca) {
    console.warn('ClubW: registrujSablonu bolo zavolané mimo načítania šablóny - ignorujem');
    return;
  }
  const hotovo = cakajuca;
  cakajuca = null;
  hotovo(definicia ?? {});
};

const nacitajSkript = (adresa: string): Promise<DefiniciaSablony> =>
  new Promise((resolve) => {
    const skript = document.createElement('script');
    let vybavene = false;
    const koniec = (definicia: DefiniciaSablony) => {
      if (vybavene) return;
      vybavene = true;
      cakajuca = null;
      clearTimeout(casovac);
      resolve(definicia);
    };
    const casovac = setTimeout(() => {
      console.error('ClubW: skript šablóny sa nenačítal včas, použije sa základná šablóna');
      koniec({});
    }, LIMIT_NACITANIA);

    cakajuca = koniec;
    skript.src = adresa;
    skript.async = true;
    skript.dataset.clubwSablona = '';
    // Skript sa spustil, ale nezaregistroval - šablóna má len štýl
    skript.onload = () => setTimeout(() => koniec({}), 0);
    skript.onerror = () => {
      console.error('ClubW: skript šablóny sa nepodarilo načítať, použije sa základná šablóna');
      koniec({});
    };
    document.head.appendChild(skript);
  });

const pripojStyl = (adresa: string): Promise<void> =>
  new Promise((resolve) => {
    const odkaz = document.createElement('link');
    odkaz.rel = 'stylesheet';
    odkaz.href = adresa;
    odkaz.dataset.clubwSablona = '';
    const hotovo = () => {
      clearTimeout(casovac);
      resolve();
    };
    const casovac = setTimeout(hotovo, LIMIT_NACITANIA);
    odkaz.onload = hotovo;
    odkaz.onerror = () => {
      console.error('ClubW: štýl šablóny sa nepodarilo načítať');
      hotovo();
    };
    document.head.appendChild(odkaz);
  });

/** Nastavenia šablóny ako CSS premenné: akcent → --sablona-akcent. */
const nastavPremenne = (nastavenia: Record<string, HodnotaNastavenia>) => {
  const koren = document.documentElement;
  for (const [kluc, hodnota] of Object.entries(nastavenia)) {
    const premenna = `--sablona-${kluc.replace(/_/g, '-')}`;
    if (hodnota === null || hodnota === '') {
      koren.style.removeProperty(premenna);
    } else if (typeof hodnota === 'boolean') {
      koren.style.setProperty(premenna, hodnota ? '1' : '0');
    } else if (typeof hodnota === 'number') {
      koren.style.setProperty(premenna, String(hodnota));
    } else if (/^#[0-9A-Fa-f]{6}$/.test(hodnota)) {
      koren.style.setProperty(premenna, hodnota);
    } else if (/^(\/uploads\/|https:\/\/)/.test(hodnota)) {
      koren.style.setProperty(premenna, `url("${souborUrl(hodnota).replace(/["\\\n]/g, '')}")`);
    } else if (/^[a-z0-9-]{1,60}$/i.test(hodnota)) {
      // Hodnota výberu (napr. „tmava") - použiteľná aj ako CSS kľúčové slovo
      koren.style.setProperty(premenna, hodnota);
    }
    // Voľný text do CSS nepatrí - šablóna ho číta cez useNastaveniaSablony()
  }
};

/** Náhľad inej šablóny (?nahlad_sablony=slug) - drží sa počas prehliadania. */
const zistiNahlad = (): string | null => {
  try {
    const parametre = new URLSearchParams(window.location.search);
    const zAdresy = parametre.get('nahlad_sablony');
    if (zAdresy) {
      sessionStorage.setItem(KLUC_NAHLADU, zAdresy);
      parametre.delete('nahlad_sablony');
      const zvysok = parametre.toString();
      window.history.replaceState(null, '', window.location.pathname + (zvysok ? `?${zvysok}` : '') + window.location.hash);
      return zAdresy;
    }
    return sessionStorage.getItem(KLUC_NAHLADU);
  } catch {
    return null;
  }
};

export const ukonciNahlad = () => {
  try {
    sessionStorage.removeItem(KLUC_NAHLADU);
  } catch {
    /* súkromné okno */
  }
  window.location.reload();
};

const PREDVOLENA: AktivnaSablona = {
  slug: 'zakladna',
  nazov: 'Základná',
  verzia: '0',
  styl: null,
  skript: null,
  nastavenia: {},
  nahlad: false,
};

const nacitajAktivnu = async (): Promise<AktivnaSablona> => {
  const nahlad = zistiNahlad();
  const hlavicky: Record<string, string> = {};
  let token: string | null = null;
  try {
    token = localStorage.getItem('clubw_token');
  } catch {
    /* súkromné okno */
  }
  // Náhľad inej šablóny server ukáže len prihlásenému správcovi webu
  if (nahlad && token) hlavicky.Authorization = `Bearer ${token}`;
  try {
    const odpoved = await fetch(apiUrl(`/sablony/aktivna${nahlad ? `?nahlad=${encodeURIComponent(nahlad)}` : ''}`), {
      headers: hlavicky,
    });
    const telo = await odpoved.json();
    if (telo?.success && telo.data?.slug) return telo.data as AktivnaSablona;
  } catch {
    /* server nedostupný - web pobeží v základnej šablóne */
  }
  return PREDVOLENA;
};

// ===== Poskytovateľ =====

export const SablonaProvider: React.FC<{ zakladna: CastiSablony; children: ReactNode }> = ({ zakladna, children }) => {
  const [stav, setStav] = useState<HodnotaKontextu | null>(null);

  useEffect(() => {
    let zruseny = false;
    (async () => {
      const sablona = await nacitajAktivnu();
      const [, definicia] = await Promise.all([
        sablona.styl ? pripojStyl(souborUrl(sablona.styl)) : Promise.resolve(),
        sablona.skript ? nacitajSkript(souborUrl(sablona.skript)) : Promise.resolve({} as DefiniciaSablony),
      ]);
      if (zruseny) return;

      nastavPremenne(sablona.nastavenia ?? {});
      document.documentElement.dataset.sablona = sablona.slug;

      // Len známe časti, ktoré sú naozaj komponentom
      const nahradene: Partial<CastiSablony> = {};
      for (const [nazov, komponent] of Object.entries(definicia?.casti ?? {})) {
        if (nazov in zakladna && komponent && (typeof komponent === 'function' || typeof komponent === 'object')) {
          (nahradene as Record<string, unknown>)[nazov] = komponent;
        } else {
          console.warn(`ClubW: šablóna nahrádza neznámu časť „${nazov}" - ignorujem`);
        }
      }
      setStav({ sablona, casti: { ...zakladna, ...nahradene } });
    })();
    return () => {
      zruseny = true;
    };
  }, [zakladna]);

  if (!stav) return null;
  return <SablonaContext.Provider value={stav}>{children}</SablonaContext.Provider>;
};

// ===== Použitie v šablónach =====

const useKontext = (): HodnotaKontextu => {
  const kontext = useContext(SablonaContext);
  if (!kontext) throw new Error('Časti šablóny sa musia vykresliť vnútri webu (SablonaProvider)');
  return kontext;
};

/** Informácie o aktívnej šablóne (slug, názov, verzia, náhľad). */
export const useSablona = (): AktivnaSablona => useKontext().sablona;

/**
 * Hodnoty nastavení šablóny z administrácie (Vzhľad → Šablóny →
 * Prispôsobiť). Kľúče sú tie z poľa „nastavenia" v sablona.json.
 */
export const useNastaveniaSablony = <T extends Record<string, HodnotaNastavenia> = Record<string, HodnotaNastavenia>>(): T =>
  useKontext().sablona.nastavenia as T;

/**
 * Vykreslí časť webu z aktívnej šablóny, alebo zo základnej.
 * Príklad: <Cast nazov="Hlavicka" /> v rozložení.
 */
export const Cast: React.FC<{ nazov: NazovCasti; children?: ReactNode }> = ({ nazov, children }) => {
  const Komponent = useKontext().casti[nazov] as React.ComponentType<{ children?: ReactNode }>;
  return <Komponent>{children}</Komponent>;
};
