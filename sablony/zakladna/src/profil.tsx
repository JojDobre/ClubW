// Umiestnenie: sablony/zakladna/src/profil.tsx
// Hlavička a karty profilu hráča a člena realizačného tímu: fotka na
// karte vo farbe klubu s číslom dresu, meno v Barlow verzálkach, rola
// a súhrn sezóny v sklenených dlaždiciach. Pod hlavičkou karta textu
// „O hráčovi" a karta údajov.

import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Silueta } from './casti';
import { Ikona, skryObrazok } from './spolocne';
import './profil.css';

export const ProfilHlavicka: React.FC<{
  stitok?: ReactNode;
  meno: string;
  priezvisko: string;
  rola?: string | null;
  cislo?: number | null;
  fotka?: string | null;
  spat?: { odkaz: string; text: string };
  staty?: Array<[string | number, string]>;
}> = ({ stitok, meno, priezvisko, rola, cislo, fotka, spat, staty = [] }) => (
  <header className="zk-profil">
    <div className="zs-kontajner">
      {spat && (
        <Link to={spat.odkaz} className="zk-profil__spat">
          <Ikona nazov="vlavo" velkost={14} /> {spat.text}
        </Link>
      )}
      <div className="zk-profil__mriezka">
        <div className="zk-profil__foto">
          {cislo !== null && cislo !== undefined && <span className="zk-profil__cislo">{cislo}</span>}
          {fotka ? <img src={fotka} alt={`${meno} ${priezvisko}`} onError={skryObrazok} /> : <Silueta className="zk-profil__silueta" />}
        </div>
        <div className="zk-profil__text">
          {stitok && <span className="zk-profil__stitok">{stitok}</span>}
          <h1>
            <small>{meno}</small>
            <span>{priezvisko}</span>
          </h1>
          {rola && <p className="zk-profil__rola">{rola}</p>}
          {staty.length > 0 && (
            <dl className="zk-profil__staty">
              {staty.map(([hodnota, nazov]) => (
                <div key={nazov}>
                  <dt>{nazov}</dt>
                  <dd>{hodnota}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  </header>
);

/** Text o osobe vľavo a karta údajov vpravo. */
export const ProfilO: React.FC<{ nadpis: string; id: string; text: string; udaje: Array<[string, string | number]>; children?: ReactNode }> = ({ nadpis, id, text, udaje, children }) => (
  <section className="zs-kontajner zk-profil-o" aria-labelledby={id}>
    <div className="zk-profil-o__karta">
      <div className="zk-nadpis">
        <span className="zk-stitok">Profil</span>
        <h2 id={id}>{nadpis}</h2>
      </div>
      <p className="zk-profil-o__text">{text}</p>
      {children}
    </div>
    {udaje.length > 0 && (
      <dl className="zk-profil-o__udaje" aria-label="Údaje">
        {udaje.map(([nazov, hodnota]) => (
          <div key={nazov}>
            <dt>{nazov}</dt>
            <dd>{hodnota}</dd>
          </div>
        ))}
      </dl>
    )}
  </section>
);
