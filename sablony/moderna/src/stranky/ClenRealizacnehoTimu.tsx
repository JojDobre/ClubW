// Umiestnenie: sablony/moderna/src/stranky/ClenRealizacnehoTimu.tsx
// Profil člena realizačného tímu: fotka, funkcia, kvalifikácia a kontakt.

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { souborUrl } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { Chyba, Ikona, KartaClena, Nacitava, datum, funkcia, useApi, useTitulok, type ClenTimu } from '../spolocne';

const ClenRealizacnehoTimu: React.FC = () => {
  const { id = '' } = useParams();
  const clen = useApi<ClenTimu>(`/staff/${encodeURIComponent(id)}?include_team=true`);
  const c = clen.data;
  const kolegovia = useApi<{ realizacny_tim: ClenTimu[] }>(c?.tim_id ? `/teams/${c.tim_id}/staff` : null);

  useTitulok(c ? `${c.meno} ${c.priezvisko}` : null);

  if (clen.nacitava) return <Nacitava />;
  if (clen.stav === 404) return <NenajdenyObsah nadpis="Tohto člena tímu sme nenašli." spat={{ odkaz: '/teams', text: 'Tímy' }} />;
  if (clen.chyba || !c) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={clen.chyba || 'Profil sa nepodarilo načítať.'} />
      </div>
    );
  }

  const fakty: Array<[string, string | null | undefined]> = [
    ['Funkcia', funkcia(c.funkcia)],
    ['Tím', c.tim?.nazov],
    ['Kvalifikácia', c.kvalifikacia],
    ['Národnosť', c.narodnost],
    ['Vek', c.vek ? `${c.vek} rokov` : null],
    ['Dátum narodenia', c.datum_narodenia ? datum(c.datum_narodenia) : null],
  ];
  const ostatni = (kolegovia.data?.realizacny_tim ?? []).filter((x) => x.id !== c.id);

  return (
    <div className="md-detail md-profil">
      <div className="md-kontajner">
        {c.tim && (
          <Link to={`/teams/${c.tim.id}#realizacny-tim`} className="md-spat">
            <Ikona nazov="spat" /> {c.tim.nazov}
          </Link>
        )}
        <div className="md-profil__mriezka">
          <div className="md-profil__foto md-profil__foto--clen">
            {c.fotka ? (
              <img src={souborUrl(c.fotka)} alt={`${c.meno} ${c.priezvisko}`} />
            ) : (
              <span className="md-karta-hraca__inicialy" aria-hidden="true">
                {c.meno.charAt(0)}
                {c.priezvisko.charAt(0)}
              </span>
            )}
          </div>
          <div className="md-profil__text">
            <div className="md-stitok">{[funkcia(c.funkcia), c.tim?.nazov].filter(Boolean).join(' · ')}</div>
            <h1>
              <span>{c.meno}</span> {c.priezvisko}
            </h1>
            <dl className="md-fakty">
              {fakty
                .filter(([, hodnota]) => Boolean(hodnota))
                .map(([nazov, hodnota]) => (
                  <div key={nazov}>
                    <dt>{nazov}</dt>
                    <dd>{hodnota}</dd>
                  </div>
                ))}
            </dl>
            {(c.email || c.telefon) && (
              <div className="md-profil__kontakt">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="md-tlacidlo md-tlacidlo--sekundarne">
                    <Ikona nazov="mail" velkost={16} /> {c.email}
                  </a>
                )}
                {c.telefon && (
                  <a href={`tel:${c.telefon.replace(/\s+/g, '')}`} className="md-tlacidlo md-tlacidlo--sekundarne">
                    <Ikona nazov="telefon" velkost={16} /> {c.telefon}
                  </a>
                )}
              </div>
            )}
            {c.poznamky && <p className="md-profil__bio">{c.poznamky}</p>}
          </div>
        </div>

        {ostatni.length > 0 && (
          <section className="md-sekcia md-sekcia--bez-spodnej" aria-labelledby="md-kolegovia">
            <div className="md-sekcia__hlava md-sekcia__hlava--mala">
              <div>
                <div className="md-stitok">{c.tim?.nazov}</div>
                <h2 id="md-kolegovia">Realizačný tím.</h2>
              </div>
            </div>
            <div className="md-mriezka-clenov">
              {ostatni.map((x) => (
                <KartaClena key={x.id} clen={x} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ClenRealizacnehoTimu;
