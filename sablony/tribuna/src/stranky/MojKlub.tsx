// Umiestnenie: sablony/tribuna/src/stranky/MojKlub.tsx
// Účet fanúšika (/moj-klub) a overenie členskej karty (/overenie/:kod).
// Prihlásenie, členskú kartu s QR kódom, výhody a údaje dodá jadro,
// šablóna k nim pridá svoju hlavičku stránky.

import React from 'react';
import { MojKlubObsah, OverenieKartyObsah, useFanusik, useNastavenia } from '@clubw/jadro';
import { HlavickaStranky, Sekcia } from '../casti';
import { useTitulok, useUpravy } from '../spolocne';

export const MojKlub: React.FC = () => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const { fanusik } = useFanusik();
  useTitulok('Môj klub');
  return (
    <div className="tb-stranka tb-moj-klub">
      <HlavickaStranky
        stitok={u.text('stranka_moj_klub_stitok', '') || nastavenia.nazov}
        nadpis={fanusik ? `Ahoj, ${fanusik.meno}` : u.text('stranka_moj_klub_nadpis', 'Môj klub')}
      />
      <Sekcia className="tb-sekcia--hore">
        <MojKlubObsah />
      </Sekcia>
    </div>
  );
};

export const OverenieKarty: React.FC = () => {
  useTitulok('Overenie karty');
  return (
    <div className="tb-stranka tb-overenie">
      <Sekcia className="tb-sekcia--hore">
        <OverenieKartyObsah />
      </Sekcia>
    </div>
  );
};

export default MojKlub;
