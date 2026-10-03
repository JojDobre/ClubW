// Umiestnenie: sablony/tribuna/src/stranky/Formular.tsx
// Samostatná adresa formulára: /formular/:kluc (prihláška, kontakt...).
// Tmavá hlavička, vľavo kontakt na klub, vpravo formulár v karte.

import React from 'react';
import { useParams } from 'react-router-dom';
import { FormularWeb, useNastavenia } from '@clubw/jadro';
import { HlavickaStranky, Sekcia } from '../casti';
import { Ikona, useTitulok } from '../spolocne';

const Formular: React.FC = () => {
  const { kluc = '' } = useParams();
  const { nastavenia } = useNastavenia();
  useTitulok('Formulár');
  const kontakt = nastavenia.kontakt;

  return (
    <div className="tb-stranka tb-formular">
      <HlavickaStranky stitok={nastavenia.nazov} nadpis="Vyplňte formulár" />
      <Sekcia className="tb-sekcia--hore tb-sekcia--mriezka">
        <div className="tb-formular__mriezka">
          <div className="tb-formular__uvod">
            <h2 className="tb-skupina__nadpis tb-skupina__nadpis--male">Ako to funguje</h2>
            <p className="tb-profil-o__text">
              Odpoveď dostaneme hneď po odoslaní. Polia označené hviezdičkou sú povinné. Ak máte otázku, ozvite sa nám aj priamo.
            </p>
            {(kontakt?.email || kontakt?.telefon) && (
              <div className="tb-kontakt-tlacidla">
                {kontakt.email && (
                  <a href={`mailto:${kontakt.email}`} className="tb-tlacidlo-obrys">
                    <Ikona nazov="mail" velkost={15} /> {kontakt.email}
                  </a>
                )}
                {kontakt.telefon && (
                  <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`} className="tb-tlacidlo-obrys">
                    <Ikona nazov="telefon" velkost={15} /> {kontakt.telefon}
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="tb-formular__karta">
            <FormularWeb kluc={decodeURIComponent(kluc)} />
          </div>
        </div>
      </Sekcia>
    </div>
  );
};

export default Formular;
