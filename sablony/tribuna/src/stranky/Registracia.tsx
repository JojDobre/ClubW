// Umiestnenie: sablony/tribuna/src/stranky/Registracia.tsx
// Registrácia fanúšika alebo člena - tmavá hlavička, formulár v karte
// a vedľa neho výhody členstva. Žiadosť schvaľuje klub v administrácii.

import React from 'react';
import { FormularRegistracie, useNastavenia } from '@clubw/jadro';
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
  useTitulok('Registrácia');
  return (
    <div className="tb-stranka tb-registracia">
      <HlavickaStranky stitok={u.text('stranka_registracia_stitok', '') || nastavenia.nazov} nadpis={u.text('stranka_registracia_nadpis', 'Staňte sa súčasťou klubu')} />
      <Sekcia className="tb-sekcia--hore">
        <div className="tb-registracia__mriezka">
          <div className="tb-registracia__karta">
            <FormularRegistracie className="tb-formular-registracie" />
          </div>
          <aside className="tb-registracia__vyhody" aria-label="Výhody">
            <h2>{u.text('registracia_vyhody_nadpis', 'Prečo sa registrovať')}</h2>
            <ul>
              {VYHODY.map(([nadpis, text]) => (
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
