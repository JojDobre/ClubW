// Umiestnenie: sablony/moderna/src/stranky/MojKlub.tsx
// Účet fanúšika (/moj-klub) a overenie členskej karty (/overenie/:kod).
// Prihlásenie, členskú kartu s QR kódom, výhody a údaje dodá jadro,
// šablóna k nim pridá svoju hlavičku stránky.

import React from 'react';
import { MojKlubObsah, OverenieKartyObsah, useFanusik, useNastavenia } from '@clubw/jadro';
import { HlavickaStranky, useTitulok } from '../spolocne';

export const MojKlub: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { fanusik } = useFanusik();
  useTitulok('Môj klub');
  return (
    <div className="md-stranka md-moj-klub">
      <HlavickaStranky stitok={nastavenia.nazov} nadpis={fanusik ? `Ahoj, ${fanusik.meno}` : 'Môj klub'} />
      <div className="md-kontajner md-moj-klub__telo">
        <MojKlubObsah />
      </div>
    </div>
  );
};

export const OverenieKarty: React.FC = () => {
  useTitulok('Overenie karty');
  return (
    <div className="md-stranka md-overenie">
      <div className="md-kontajner md-moj-klub__telo">
        <OverenieKartyObsah />
      </div>
    </div>
  );
};

export default MojKlub;
