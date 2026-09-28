// Umiestnenie: sablony/klubova/src/index.tsx
// Šablóna Klubová - hlavička, pätička, mobilná navigácia a úvodná stránka.
// Ostatné stránky zatiaľ preberá zo základnej šablóny (vykreslia sa
// v hlavičke a pätičke tejto šablóny).
//
// Zostavenie: npm run sablony -- klubova   (vytvorí sablona.js)

import { registrujSablonu } from '@clubw/jadro';
import { Rozlozenie, Hlavicka, Paticka, Nacitavanie } from './Rozlozenie';
import Uvod from './stranky/Uvod';

registrujSablonu({
  casti: {
    Rozlozenie,
    Hlavicka,
    Paticka,
    Nacitavanie,
    Uvod,
  },
});
