// Umiestnenie: sablony/zakladna/src/stranky/ClenRealizacnehoTimu.tsx
// Profil člena realizačného tímu - rovnaký tvar ako profil hráča:
// hlavička vo farbe klubu s fotkou na karte, profil s kartou údajov
// a kontaktom a ostatní členovia realizačného tímu.

import React from 'react';
import { useParams } from 'react-router-dom';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, KartaClena, Nacitava, Sekcia } from '../casti';
import { Ikona, NadpisSekcie, datumCiselny, funkcia, obrazokUrl, useApi, useTitulok, type ClenTimu } from '../spolocne';
import { ProfilHlavicka, ProfilO } from '../profil';

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
    <div className="zs-stranka zs-profil zs-profil--clen zk-profil-stranka">
      <ProfilHlavicka
        stitok={c.tim ? `Realizačný tím · ${c.tim.nazov}` : 'Realizačný tím'}
        meno={c.meno}
        priezvisko={c.priezvisko}
        rola={funkcia(c.funkcia)}
        fotka={fotka}
        spat={{ odkaz: c.tim_id ? `/teams/${c.tim_id}` : '/teams', text: 'Súpiska' }}
      />

      <ProfilO nadpis="O členovi tímu" id="zs-o-clenovi" text={popis} udaje={udaje}>
        {(c.email || c.telefon) && (
          <div className="zs-kontakt-tlacidla">
            {c.email && (
              <a href={`mailto:${c.email}`} className="zs-tlacidlo-obrys">
                <Ikona nazov="mail" velkost={15} /> {c.email}
              </a>
            )}
            {c.telefon && (
              <a href={`tel:${c.telefon.replace(/\s+/g, '')}`} className="zs-tlacidlo-obrys">
                <Ikona nazov="telefon" velkost={15} /> {c.telefon}
              </a>
            )}
          </div>
        )}
      </ProfilO>

      {ostatni.length > 0 && (
        <Sekcia className="zs-sekcia--siva zs-sekcia--suvisiace">
          <NadpisSekcie nadpis="Realizačný tím" odkaz={c.tim_id ? `/teams/${c.tim_id}` : null} />
          <div className="zk-mriezka-clenov">
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
