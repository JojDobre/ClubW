// Umiestnenie: frontend/src/web/SekcieUvodu.tsx
// Vlastné sekcie úvodnej stránky šablóny.
//
// Šablóna v sablona.json opíše nastavenie typu „sekcie" s pozíciami
// (miesta medzi sekciami úvodu). Správca potom v prispôsobení šablóny
// pridáva sekcie - články z rubriky, tabuľku, strelcov, káder, text…
// Každá sekcia je blok stránky s pozíciou. Šablóna na každé miesto
// vloží <SekcieUvodu pozicia="pod_hero" … /> a bloky sa vykreslia
// rovnako ako bloky stránok (BlokyStranky), teda v dizajne šablóny.

import React from 'react';
import { useNastaveniaSablony } from './SablonaKontext';
import { BlokyStranky } from './bloky/BlokyStranky';
import type { BlokStranky, KomponentBloku } from './bloky/typy';

/** Viditeľné vlastné sekcie na danej pozícii (v poradí z administrácie). */
export const useSekcieUvodu = (pozicia: string, kluc = 'sekcie_uvodu'): BlokStranky[] => {
  const hodnota = (useNastaveniaSablony() as Record<string, unknown>)[kluc];
  if (!Array.isArray(hodnota)) return [];
  return (hodnota as BlokStranky[]).filter((b) => b && typeof b === 'object' && b.pozicia === pozicia && !b.skryty);
};

/**
 * Vlastné sekcie na jednej pozícii úvodu. Bez sekcií nevykreslí nič.
 * @param kluc kľúč nastavenia typu „sekcie" (predvolene sekcie_uvodu)
 * @param className, predvolenyVzhlad, komponenty - ako pri BlokyStranky
 */
export const SekcieUvodu: React.FC<{
  pozicia: string;
  kluc?: string;
  className?: string;
  predvolenyVzhlad?: boolean;
  komponenty?: Partial<Record<string, KomponentBloku>>;
}> = ({ pozicia, kluc, className = '', predvolenyVzhlad, komponenty }) => {
  const bloky = useSekcieUvodu(pozicia, kluc);
  if (bloky.length === 0) return null;
  return (
    <BlokyStranky
      bloky={bloky}
      className={`sekcie-uvodu sekcie-uvodu--${pozicia.replace(/_/g, '-')}${className ? ` ${className}` : ''}`}
      predvolenyVzhlad={predvolenyVzhlad}
      komponenty={komponenty}
    />
  );
};

export default SekcieUvodu;
