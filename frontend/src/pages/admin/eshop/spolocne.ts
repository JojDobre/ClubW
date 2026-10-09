// Umiestnenie: frontend/src/pages/admin/eshop/spolocne.ts
// Názvy a farby stavov objednávok a typov platieb pre obrazovky e-shopu.

import type { TonStitka } from '../../../ui';
import type { StavObjednavky, StavPlatby, TypPlatby } from '../../../api/eshop';
import { tr } from '../../../i18n';

export const STAVY_OBJEDNAVKY: Array<{ hodnota: StavObjednavky; popis: string; ton: TonStitka }> = [
  { hodnota: 'nova', popis: tr('Nová'), ton: 'info' },
  { hodnota: 'potvrdena', popis: tr('Potvrdená'), ton: 'primary' },
  { hodnota: 'pripravena', popis: tr('Pripravená'), ton: 'warning' },
  { hodnota: 'odoslana', popis: tr('Odoslaná'), ton: 'primary' },
  { hodnota: 'vybavena', popis: tr('Vybavená'), ton: 'success' },
  { hodnota: 'zrusena', popis: tr('Zrušená'), ton: 'neutral' },
];

export const STAVY_PLATBY: Array<{ hodnota: StavPlatby; popis: string; ton: TonStitka }> = [
  { hodnota: 'neuhradena', popis: tr('Neuhradená'), ton: 'warning' },
  { hodnota: 'uhradena', popis: tr('Uhradená'), ton: 'success' },
  { hodnota: 'vratena', popis: tr('Vrátená'), ton: 'neutral' },
];

export const TYPY_PLATBY: Array<{ hodnota: TypPlatby; popis: string; napoveda: string }> = [
  { hodnota: 'prevod', popis: tr('Bankový prevod'), napoveda: tr('Zákazník dostane pokyny s IBAN a variabilným symbolom') },
  { hodnota: 'dobierka', popis: tr('Dobierka'), napoveda: tr('Platba kuriérovi pri prevzatí') },
  { hodnota: 'hotovost', popis: tr('Hotovosť'), napoveda: tr('Platba pri osobnom odbere') },
  { hodnota: 'brana', popis: tr('Platobná brána'), napoveda: tr('Platba kartou cez kód od poskytovateľa brány') },
  { hodnota: 'ine', popis: tr('Iná platba'), napoveda: tr('Vlastný spôsob s pokynmi pre zákazníka') },
];

export const stavObjednavky = (stav: string) => STAVY_OBJEDNAVKY.find((s) => s.hodnota === stav) ?? STAVY_OBJEDNAVKY[0];
export const stavPlatby = (stav: string) => STAVY_PLATBY.find((s) => s.hodnota === stav) ?? STAVY_PLATBY[0];

/**
 * Stav platby objednávky na zobrazenie. Pri dobierke a hotovosti sa
 * neuhradená objednávka neoznačuje ako dlžná - zákazník platí pri prevzatí.
 */
export const stavPlatbyObjednavky = (o: { stav_platby: string; platba_typ: string }) =>
  o.stav_platby === 'neuhradena' && o.platba_typ === 'dobierka'
    ? { hodnota: 'dobierka', popis: tr('Dobierka'), ton: 'info' as TonStitka }
    : o.stav_platby === 'neuhradena' && o.platba_typ === 'hotovost'
      ? { hodnota: 'hotovost', popis: tr('Hotovosť'), ton: 'info' as TonStitka }
      : stavPlatby(o.stav_platby);
export const typPlatby = (typ: string) => TYPY_PLATBY.find((t) => t.hodnota === typ) ?? TYPY_PLATBY[4];

/** Suma zo vstupu (čiarka aj bodka) - prázdne = null. */
export const sumaZVstupu = (h: string): number | null => {
  const t = h.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};
