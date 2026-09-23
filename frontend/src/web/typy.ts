// Umiestnenie: frontend/src/web/typy.ts
// Typy rozhrania šablón - čo šablóna môže nahradiť a čo dostane od jadra.

import type { ComponentType, ReactNode } from 'react';

/**
 * Časti webu, ktoré šablóna môže nahradiť. Čo šablóna nenahradí, zobrazí
 * sa zo základnej šablóny (ako rodičovská téma vo WordPresse).
 *
 * Stránkové časti (Uvod, Clanky...) si parametre čítajú z adresy samy,
 * napríklad slug článku cez useParams() z react-router-dom.
 */
export interface CastiSablony {
  /** Kostra stránky: hlavička, obsah, pätička */
  Rozlozenie: ComponentType<{ children: ReactNode }>;
  Hlavicka: ComponentType;
  Paticka: ComponentType;
  /** Zobrazí sa, kým sa stránka načítava */
  Nacitavanie: ComponentType;

  Uvod: ComponentType;
  Clanky: ComponentType;
  Clanok: ComponentType;
  /** Stránka z administrácie (O klube, Kontakt...) - adresa /:slug */
  Stranka: ComponentType;
  Timy: ComponentType;
  Tim: ComponentType;
  Hrac: ComponentType;
  ClenRealizacnehoTimu: ComponentType;
  Ligy: ComponentType;
  Liga: ComponentType;
  Zapasy: ComponentType;
  Zapas: ComponentType;
  Kalendar: ComponentType;
  Galerie: ComponentType;
  Galeria: ComponentType;
  Videa: ComponentType;
  Turnaje: ComponentType;
  Dokumenty: ComponentType;
  Sponzori: ComponentType;
  Formular: ComponentType;
  Statistiky: ComponentType;
  /** Adresa neexistuje (po neúspešnom pokuse o presmerovanie) */
  Nenajdena: ComponentType;
}

export type NazovCasti = keyof CastiSablony;

/** Čo šablóna odovzdá pri registrácii (ClubW.registrujSablonu). */
export interface DefiniciaSablony {
  /** Nahradené časti webu - stačí len tie, ktoré šablóna mení */
  casti?: Partial<CastiSablony>;
}

/** Hodnota nastavenia šablóny (farba, text, prepínač...). */
export type HodnotaNastavenia = string | number | boolean | null;

/** Aktívna šablóna podľa servera (/api/sablony/aktivna). */
export interface AktivnaSablona {
  slug: string;
  nazov: string;
  verzia: string;
  styl: string | null;
  skript: string | null;
  nastavenia: Record<string, HodnotaNastavenia>;
  /** Šablóna je zobrazená len ako náhľad pre správcu */
  nahlad: boolean;
}
