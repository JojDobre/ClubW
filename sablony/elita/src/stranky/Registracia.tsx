// Umiestnenie: sablony/elita/src/stranky/Registracia.tsx
// Registrácia fanúšika alebo člena - tmavá hlavička, formulár v karte
// a vedľa neho výhody členstva. Žiadosť schvaľuje klub v administrácii.

import React from 'react';
import { FormularRegistracie, useNastavenia, useRegistracia } from '@clubw/jadro';
import { HlavickaStranky, Sekcia } from '../casti';
import { useTitulok, useUpravy } from '../spolocne';

const VYHODY = [
  ['Novinky ako prví', 'Pozvánky na zápasy, akcie klubu a výsledky priamo do e-mailu.'],
  ['Zľavy vo fanshope', 'Členovia a registrovaní fanúšikovia dostávajú zvýhodnené ponuky.'],
  ['Hlas v klube', 'Členovia sa zúčastňujú na členskej schôdzi a rozhodovaní klubu.'],
];

const Registracia: React.FC = () => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  // Texty a výhody z nastavení registrácie klubu majú prednosť pred textami šablóny
  const reg = useRegistracia();
  const vyhody = reg.vyhody.length ? reg.vyhody.map((v) => [v.nadpis, v.text] as const) : VYHODY;
  useTitulok('Registrácia');
  return (
    <div className="el-stranka el-registracia">
      <HlavickaStranky stitok={u.text('stranka_registracia_stitok', '') || nastavenia.nazov} nadpis={reg.texty.nadpis || u.text('stranka_registracia_nadpis', 'Staňte sa súčasťou klubu')}>
        {reg.texty.uvod && <p className="el-hlava__popis">{reg.texty.uvod}</p>}
      </HlavickaStranky>
      <Sekcia className="el-sekcia--hore">
        <div className="el-registracia__mriezka">
          <div className="el-registracia__karta">
            <FormularRegistracie className="el-formular-registracie" />
          </div>
          <aside className="el-registracia__vyhody" aria-label="Výhody">
            <h2>{reg.texty.vyhody_nadpis || u.text('registracia_vyhody_nadpis', 'Prečo sa registrovať')}</h2>
            <ul>
              {vyhody.map(([nadpis, text]) => (
                <li key={nadpis}>
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>{nadpis}</strong>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Sekcia>
    </div>
  );
};

export default Registracia;
