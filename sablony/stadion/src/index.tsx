// Umiestnenie: sablony/stadion/src/index.tsx
// Šablóna Štadión - nahrádza hlavičku, pätičku a úvodnú stránku.
// Všetky ostatné stránky (články, zápasy, tímy...) preberá zo základnej.
//
// Zostavenie: npm run sablony -- stadion   (vytvorí sablona.js)

import { registrujSablonu } from '@clubw/jadro';
import { Hlavicka, Paticka } from './Rozlozenie';
import Uvod from './Uvod';

registrujSablonu({
  casti: { Hlavicka, Paticka, Uvod },
});
