// Umiestnenie: sablony/elita/src/stranky/ClenRealizacnehoTimu.tsx
// Profil člena realizačného tímu - rovnaký tvar ako profil hráča:
// tmavá hlavička s menom a fotkou, „O nás" s kartou údajov a kontaktom
// a ostatní členovia realizačného tímu.

import React from 'react';
import { useParams } from 'react-router-dom';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, KartaClena, Nacitava, Sekcia } from '../casti';
import { Ikona, NadpisSekcie, datumCiselny, funkcia, obrazokUrl, skryObrazok, useApi, useTitulok, type ClenTimu } from '../spolocne';

const ClenRealizacnehoTimu: React.FC = () => {
  const { id = '' } = useParams();
  const clen = useApi<ClenTimu>(`/staff/${encodeURIComponent(id)}?include_team=true`);
  const c = clen.data;
  const kolegovia = useApi<{ realizacny_tim: ClenTimu[] }>(c?.tim_id ? `/teams/${c.tim_id}/staff` : null);

  useTitulok(c ? `${c.meno} ${c.priezvisko}` : null);

  if (clen.nacitava) return <Nacitava />;
  if (clen.stav === 404) return <NenajdenyObsah nadpis="Tohto člena tímu sme nenašli" spat={{ odkaz: '/teams', text: 'Súpiska' }} />;
  if (clen.chyba || !c) return <ChybaStranky text={clen.chyba || 'Profil sa nepodarilo načítať.'} />;

  const fotka = obrazokUrl(c.fotka);
  const udaje = (
    [
      ['Funkcia', funkcia(c.funkcia)],
      ['Tím', c.tim?.nazov],
      ['Kvalifikácia', c.kvalifikacia],
      ['Národnosť', c.narodnost],
      ['Dátum narodenia', c.datum_narodenia ? datumCiselny(c.datum_narodenia) : null],
    ] as Array<[string, string | null | undefined]>
  ).filter(([, hodnota]) => Boolean(hodnota)) as Array<[string, string]>;
  const popis = c.poznamky || `${c.meno} ${c.priezvisko} pôsobí v klube ako ${funkcia(c.funkcia).toLowerCase()}${c.tim ? ` tímu ${c.tim.nazov}` : ''}.`;
  const ostatni = (kolegovia.data?.realizacny_tim ?? []).filter((x) => x.id !== c.id);

  return (
    <div className="el-stranka el-profil el-profil--clen">
      <header className="el-profil-hero">
        <div className="el-kontajner el-profil-hero__mriezka">
          <div className="el-profil-hero__text">
            <span className="el-hlava__stitok">{c.tim ? `Realizačný tím · ${c.tim.nazov}` : 'Realizačný tím'}</span>
            <div className="el-profil-hero__meno">
              <h1>
                <span className="el-profil-hero__krstne">{c.meno}</span>
                <span className="el-profil-hero__priezvisko">{c.priezvisko}</span>
              </h1>
            </div>
            <span className="el-profil-hero__pozicia">{funkcia(c.funkcia)}</span>
          </div>
          <div className="el-profil-hero__foto">
            {fotka ? <img src={fotka} alt={`${c.meno} ${c.priezvisko}`} onError={skryObrazok} /> : <span className="el-hrac__silueta" aria-hidden="true" />}
          </div>
        </div>
      </header>

      <section className="el-profil-o" aria-labelledby="el-o-clenovi">
        <div className={`el-profil-o__mriezka${udaje.length ? '' : ' el-profil-o__mriezka--bez-udajov'}`}>
          <div>
            <h2 id="el-o-clenovi" className="el-skupina__nadpis el-skupina__nadpis--male">
              Profil
            </h2>
            <p className="el-profil-o__text">{popis}</p>
            {(c.email || c.telefon) && (
              <div className="el-kontakt-tlacidla">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="el-tlacidlo-obrys">
                    <Ikona nazov="mail" velkost={15} /> {c.email}
                  </a>
                )}
                {c.telefon && (
                  <a href={`tel:${c.telefon.replace(/\s+/g, '')}`} className="el-tlacidlo-obrys">
                    <Ikona nazov="telefon" velkost={15} /> {c.telefon}
                  </a>
                )}
              </div>
            )}
          </div>
          {udaje.length > 0 && (
            <dl className="el-udaje" aria-label="Údaje">
              {udaje.map(([nazov, hodnota]) => (
                <div key={nazov}>
                  <dt>{nazov}</dt>
                  <dd>{hodnota}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {ostatni.length > 0 && (
        <Sekcia className="el-sekcia--siva el-sekcia--suvisiace">
          <NadpisSekcie nadpis="Realizačný tím" odkaz={c.tim_id ? `/teams/${c.tim_id}` : null} />
          <div className="el-mriezka-4 el-mriezka-4--hraci">
            {ostatni.map((x) => (
              <KartaClena key={x.id} clen={x} />
            ))}
          </div>
        </Sekcia>
      )}
    </div>
  );
};

export default ClenRealizacnehoTimu;
