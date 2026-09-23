// Umiestnenie: frontend/src/app/navigacia.ts
// Jediný zdroj pravdy pre navigáciu administrácie.
//
// PREČO NA JEDNOM MIESTE: pôvodná administrácia mala zoznam obrazoviek
// rozpísaný na troch miestach (menu, router, mapovanie názvov). Pridanie
// obrazovky znamenalo upraviť všetky tri a na jedno sa vždy zabudlo.
// Odtiaľto sa generuje bočné menu, mobilná navigácia aj drobečková cesta.

import type { NazovIkony } from '../ui/Icon';

/** Rola potrebná na zobrazenie položky. */
export type Rola = 'admin' | 'redaktor' | 'trener' | 'uzivatel';

export interface PolozkaMenu {
  /** Cesta v adresnom riadku, napríklad '/admin/clanky' */
  cesta: string;
  popis: string;
  ikona: NazovIkony;
  /** Kto položku uvidí. Prázdne = všetci prihlásení. */
  role?: Rola[];
  /** Obrazovka zatiaľ nemá rozhranie — zobrazí sa so značkou „pripravuje sa" */
  pripravujeSa?: boolean;
  /** Modul oprávnení - položku uvidí, kto smie modul čítať */
  modul?: string;
  /** Odznak s počtom nových položiek (napr. neprečítané formuláre) */
  odznak?: 'formulare';
}

export interface SekciaMenu {
  nazov: string;
  polozky: PolozkaMenu[];
}

/**
 * Sekcie bočného menu.
 *
 * Oproti návrhu sú doplnené Sezóny a Ochrana údajov — backend pre ne má
 * funkčné rozhranie (súpisky po sezónach, súhlasy zákonných zástupcov),
 * bez položky v menu by sa však nedali používať.
 */
export const SEKCIE_MENU: SekciaMenu[] = [
  {
    nazov: 'OBSAH',
    polozky: [
      { cesta: '/admin', popis: 'Dashboard', ikona: 'dashboard' },
      { modul: 'clanky', cesta: '/admin/clanky', popis: 'Články', ikona: 'clanky' },
      { modul: 'rubriky', cesta: '/admin/kategorie', popis: 'Kategórie', ikona: 'kategorie' },
      { modul: 'komentare', cesta: '/admin/komentare', popis: 'Komentáre', ikona: 'komentare' },
      { modul: 'stranky', cesta: '/admin/stranky', popis: 'Stránky', ikona: 'stranky' },
      { modul: 'galerie', cesta: '/admin/galerie', popis: 'Galérie', ikona: 'galerie' },
      { modul: 'videa', cesta: '/admin/videa', popis: 'Videá', ikona: 'videa' },
      { modul: 'media', cesta: '/admin/media', popis: 'Knižnica médií', ikona: 'media' },
    ],
  },
  {
    nazov: 'ŠPORT',
    polozky: [
      { modul: 'timy', cesta: '/admin/timy', popis: 'Tímy', ikona: 'timy' },
      { modul: 'hraci', cesta: '/admin/hraci', popis: 'Hráči', ikona: 'hraci' },
      { modul: 'realizacny_tim', cesta: '/admin/realizacny-tim', popis: 'Realizačný tím', ikona: 'pouzivatelia' },
      { modul: 'stadiony', cesta: '/admin/stadiony', popis: 'Štadióny', ikona: 'stadion' },
      { modul: 'ligy', cesta: '/admin/ligy', popis: 'Ligy a tabuľky', ikona: 'ligy' },
      { modul: 'turnaje', cesta: '/admin/turnaje', popis: 'Turnaje', ikona: 'ligy' },
      { modul: 'zapasy', cesta: '/admin/zapasy', popis: 'Zápasy', ikona: 'zapasy' },
      { modul: 'kalendar', cesta: '/admin/kalendar', popis: 'Kalendár', ikona: 'kalendar' },
    ],
  },
  {
    nazov: 'KLUB',
    polozky: [
      { modul: 'sponzori', cesta: '/admin/sponzori', popis: 'Sponzori', ikona: 'licencia' },
      { modul: 'dokumenty', cesta: '/admin/dokumenty', popis: 'Dokumenty', ikona: 'stranky' },
      { modul: 'formulare', cesta: '/admin/formulare', popis: 'Formuláre', ikona: 'formular', odznak: 'formulare' },
      { cesta: '/admin/ankety', popis: 'Ankety', ikona: 'komentare', role: ['admin', 'redaktor'] },
      { cesta: '/admin/fanusikovia', popis: 'Fanúšikovia', ikona: 'pouzivatelia', role: ['admin', 'redaktor'] },
    ],
  },
  {
    nazov: 'SYSTÉM',
    polozky: [
      { modul: 'pouzivatelia', cesta: '/admin/pouzivatelia', popis: 'Používatelia', ikona: 'pouzivatelia', role: ['admin'] },
      { modul: 'nastavenia', cesta: '/admin/nastavenia', popis: 'Nastavenia', ikona: 'nastavenia', role: ['admin'] },
      { modul: 'nastavenia', cesta: '/admin/menu', popis: 'Menu webu', ikona: 'menu', role: ['admin'] },
      { modul: 'licencia', cesta: '/admin/licencia', popis: 'Licencia', ikona: 'licencia', role: ['admin'] },
      // Doplnené nad rámec návrhu — backend má funkčné rozhranie
      // pre sezóny a GDPR, bez položky v menu by sa nedali používať
      { modul: 'sezony', cesta: '/admin/sezony', popis: 'Sezóny a súpisky', ikona: 'sezony' },
      { modul: 'archiv', cesta: '/admin/archiv', popis: 'Archív', ikona: 'archiv' },
      { modul: 'logy', cesta: '/admin/logy', popis: 'Logy', ikona: 'hodiny', role: ['admin'] },
      { cesta: '/admin/ochrana-udajov', popis: 'Ochrana údajov', ikona: 'gdpr', role: ['admin'] },
    ],
  },
];

/**
 * Položky mobilnej spodnej navigácie.
 * Zámerne len päť najčastejších — viac sa na šírku telefónu nezmestí.
 */
export const MOBILNA_NAVIGACIA: PolozkaMenu[] = [
  { cesta: '/admin', popis: 'Prehľad', ikona: 'dashboard' },
  { modul: 'clanky', cesta: '/admin/clanky', popis: 'Články', ikona: 'clanky' },
  { modul: 'zapasy', cesta: '/admin/zapasy', popis: 'Zápasy', ikona: 'zapasy' },
  { modul: 'hraci', cesta: '/admin/hraci', popis: 'Hráči', ikona: 'hraci' },
];

/**
 * Nájde názov obrazovky podľa cesty — pre nadpis a titulok okna.
 *
 * @param cesta - aktuálna cesta z adresného riadka
 */
export const nazovObrazovky = (cesta: string): string => {
  // Najprv skúsime presnú zhodu
  for (const sekcia of SEKCIE_MENU) {
    const presna = sekcia.polozky.find((p) => p.cesta === cesta);
    if (presna) return presna.popis;
  }

  // Podstránky (napríklad /admin/clanky/novy) dedia názov nadradenej
  // položky, aby sa v hlavičke nezobrazovala prázdna hodnota
  const kandidati = SEKCIE_MENU.flatMap((s) => s.polozky)
    .filter((p) => p.cesta !== '/admin' && cesta.startsWith(p.cesta + '/'))
    // Pri viacerých zhodách vyhráva najdlhšia (najkonkrétnejšia) cesta
    .sort((a, b) => b.cesta.length - a.cesta.length);

  return kandidati[0]?.popis ?? 'Administrácia';
};

/**
 * Je položka menu práve aktívna?
 *
 * Prehľad ('/admin') porovnávame presne — inak by bol zvýraznený vždy,
 * lebo každá cesta administrácie ním začína.
 */
export const jeAktivna = (cestaPolozky: string, aktualnaCesta: string): boolean => {
  if (cestaPolozky === '/admin') return aktualnaCesta === '/admin';
  return aktualnaCesta === cestaPolozky || aktualnaCesta.startsWith(cestaPolozky + '/');
};

/**
 * Vyfiltruje položky, na ktoré má používateľ právo.
 *
 * Toto je len skrytie v rozhraní — skutočnú ochranu zabezpečuje backend,
 * ktorý pri každej požiadavke overuje rolu. Skryté menu je pohodlie,
 * nie bezpečnostné opatrenie.
 */
export const dostupneSekcie = (
  rola: Rola | undefined,
  smie?: (modul: string) => boolean
): SekciaMenu[] =>
  SEKCIE_MENU
    .map((sekcia) => ({
      ...sekcia,
      polozky: sekcia.polozky.filter((p) => {
        if (rola === 'admin') return true;
        // Podľa oprávnení roly - aj vlastné roly vidia len svoje sekcie
        if (p.modul && smie) return smie(p.modul);
        return !p.role || (rola !== undefined && p.role.includes(rola));
      }),
    }))
    // Sekcia bez položiek sa nezobrazuje
    .filter((sekcia) => sekcia.polozky.length > 0);
