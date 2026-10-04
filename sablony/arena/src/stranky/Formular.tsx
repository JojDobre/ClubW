// Umiestnenie: sablony/arena/src/stranky/Formular.tsx
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
    <div className="ar-stranka ar-formular">
      <HlavickaStranky stitok={nastavenia.nazov} nadpis="Vyplňte formulár" />
      <Sekcia className="ar-sekcia--hore ar-sekcia--mriezka">
        <div className="ar-formular__mriezka">
          <div className="ar-formular__uvod">
            <h2 className="ar-skupina__nadpis ar-skupina__nadpis--male">Ako to funguje</h2>
            <p className="ar-profil-o__text">
              Odpoveď dostaneme hneď po odoslaní. Polia označené hviezdičkou sú povinné. Ak máte otázku, ozvite sa nám aj priamo.
            </p>
            {(kontakt?.email || kontakt?.telefon) && (
              <div className="ar-kontakt-tlacidla">
                {kontakt.email && (
                  <a href={`mailto:${kontakt.email}`} className="ar-tlacidlo-obrys">
                    <Ikona nazov="mail" velkost={15} /> {kontakt.email}
                  </a>
                )}
                {kontakt.telefon && (
                  <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`} className="ar-tlacidlo-obrys">
                    <Ikona nazov="telefon" velkost={15} /> {kontakt.telefon}
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="ar-formular__karta">
            <FormularWeb kluc={decodeURIComponent(kluc)} />
          </div>
        </div>
      </Sekcia>
    </div>
  );
};

export default Formular;
