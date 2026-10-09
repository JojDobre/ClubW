// Umiestnenie: sablony/zakladna/src/stranky/Registracia.tsx
// Registrácia fanúšika alebo člena - predvolená stránka /registracia.

import React, { useEffect } from 'react';
import { FormularRegistracie, useNastavenia, useRegistracia } from '@clubw/jadro';

const Registracia: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const reg = useRegistracia();
  useEffect(() => {
    document.title = `Registrácia | ${nastavenia.nazov}`;
  }, [nastavenia.nazov]);
  return (
    <div className="bloky bloky--zakladne">
      <section className="blok">
        <div className="blok__vnutro" style={{ maxWidth: 760 }}>
          <header className="blok__hlavicka">
            <span className="blok__stitok">{nastavenia.nazov}</span>
            <h1 className="blok__nadpis blok__nadpis--velky">{reg.texty.nadpis || 'Staňte sa súčasťou klubu'}</h1>
            <p className="blok__uvod">{reg.texty.uvod || 'Zaregistrujte sa ako fanúšik alebo požiadajte o členstvo. Žiadosť posúdime a ozveme sa vám.'}</p>
          </header>
          <FormularRegistracie />
        </div>
      </section>
    </div>
  );
};

export default Registracia;
