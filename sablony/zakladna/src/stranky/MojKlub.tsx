// Umiestnenie: sablony/zakladna/src/stranky/MojKlub.tsx
// Účet fanúšika (/moj-klub) a overenie členskej karty (/overenie/:kod).
// Obsah aj správanie sú v jadre, šablóna dodá len rám stránky.

import React, { useEffect } from 'react';
import { MojKlubObsah, OverenieKartyObsah, useFanusik } from '@clubw/jadro';

const useTitulok = (text: string) => {
  useEffect(() => {
    document.title = text;
  }, [text]);
};

export const MojKlub: React.FC = () => {
  const { fanusik } = useFanusik();
  useTitulok('Môj klub');
  return (
    <div className="zk-moj-klub" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 56px' }}>
      <h1 style={{ fontSize: '2rem', margin: '0 0 24px' }}>{fanusik ? 'Môj klub' : 'Prihlásenie do klubu'}</h1>
      <MojKlubObsah />
    </div>
  );
};

export const OverenieKarty: React.FC = () => {
  useTitulok('Overenie karty');
  return (
    <div style={{ padding: '40px 16px 64px' }}>
      <OverenieKartyObsah />
    </div>
  );
};

export default MojKlub;
