// Umiestnenie: sablony/moderna/src/stranky/Formular.tsx
// Samostatná adresa formulára: /formular/:kluc (prihláška, kontakt...).

import React from 'react';
import { useParams } from 'react-router-dom';
import { FormularWeb, useNastavenia } from '@clubw/jadro';
import { useTitulok } from '../spolocne';

const Formular: React.FC = () => {
  const { kluc = '' } = useParams();
  const { nastavenia } = useNastavenia();
  useTitulok('Formulár');

  return (
    <div className="md-stranka md-formular">
      <div className="md-kontajner md-formular__mriezka">
        <div className="md-formular__uvod">
          <div className="md-stitok">{nastavenia.nazov}</div>
          <h1>Vyplňte formulár.</h1>
          <p>Odpoveď dostaneme hneď po odoslaní. Polia označené hviezdičkou sú povinné. Ak máte otázku, ozvite sa nám aj priamo.</p>
          {(nastavenia.kontakt?.email || nastavenia.kontakt?.telefon) && (
            <ul className="md-formular__kontakt">
              {nastavenia.kontakt.email && (
                <li>
                  <a href={`mailto:${nastavenia.kontakt.email}`}>{nastavenia.kontakt.email}</a>
                </li>
              )}
              {nastavenia.kontakt.telefon && (
                <li>
                  <a href={`tel:${nastavenia.kontakt.telefon.replace(/\s+/g, '')}`}>{nastavenia.kontakt.telefon}</a>
                </li>
              )}
            </ul>
          )}
        </div>
        <div className="md-formular__formular">
          <FormularWeb kluc={decodeURIComponent(kluc)} />
        </div>
      </div>
    </div>
  );
};

export default Formular;
