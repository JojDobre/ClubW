// Umiestnenie: sablony/kronika/src/stranky/Hrac.tsx
// Profil hráča (podľa návrhu Profil hráča z Claude Design): tmavá
// hlavička s číslom, menom a fotkou, „O hráčovi" s kartou údajov,
// tabuľka sezóny podľa súťaží (zápasy, góly, asistencie, minúty)
// a súvisiace novinky (články, v ktorých sa hráč spomína).

import React from 'react';
import { useParams } from 'react-router-dom';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, KartaClanku, Nacitava, Sekcia } from '../casti';
import { NadpisSekcie, datumCiselny, obrazokUrl, pozicia, skryObrazok, useApi, useTitulok, type Clanok, type Hrac as TypHraca } from '../spolocne';

interface RiadokSezony {
  liga_id: number | null;
  liga_nazov: string;
  sezona: string | null;
  zapasy: number;
  minuty: number;
  goly: number;
  asistencie: number;
  zlte_karty: number;
  cervene_karty: number;
}

/** Riadky zoskupené podľa sezóny; zápasy bez sezóny patria k najnovšej. */
const podlaSezony = (riadky: RiadokSezony[]) => {
  const sezony: Array<{ sezona: string | null; riadky: RiadokSezony[] }> = [];
  for (const r of riadky.filter((x) => x.sezona)) {
    const s = sezony.find((x) => x.sezona === r.sezona);
    if (s) s.riadky.push(r);
    else sezony.push({ sezona: r.sezona, riadky: [r] });
  }
  const bez = riadky.filter((x) => !x.sezona);
  if (bez.length) {
    if (sezony[0]) sezony[0].riadky.push(...bez);
    else sezony.push({ sezona: null, riadky: bez });
  }
  return sezony;
};

const TabulkaSezony: React.FC<{ riadky: RiadokSezony[] }> = ({ riadky }) => (
  <div className="kr-tabulka-obal">
    <table className="kr-tabulka kr-tabulka--sezona">
      <thead>
        <tr>
          <th className="kr-tabulka__sutaz">Súťaž</th>
          <th>Zápasy</th>
          <th>Góly</th>
          <th>Asist.</th>
          <th>Minúty</th>
        </tr>
      </thead>
      <tbody>
        {riadky.map((r) => (
          <tr key={`${r.liga_id ?? r.liga_nazov}`}>
            <td className="kr-tabulka__sutaz">{r.liga_nazov}</td>
            <td>{r.zapasy}</td>
            <td>{r.goly}</td>
            <td>{r.asistencie}</td>
            <td>{r.minuty || '–'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Hrac: React.FC = () => {
  const { id = '' } = useParams();
  const hrac = useApi<TypHraca>(`/players/${encodeURIComponent(id)}?include_team=true`);
  const h = hrac.data;
  const statistiky = useApi<RiadokSezony[]>(h ? `/players/${h.id}/stats` : null);
  const clanky = useApi<Clanok[]>(h ? `/articles?search=${encodeURIComponent(h.priezvisko)}&limit=3` : null);

  useTitulok(h ? `${h.meno} ${h.priezvisko}` : null);

  if (hrac.nacitava) return <Nacitava text="Načítavam hráča…" />;
  if (hrac.stav === 404) return <NenajdenyObsah nadpis="Tohto hráča sme nenašli" spat={{ odkaz: '/teams', text: 'Súpiska' }} />;
  if (hrac.chyba || !h) return <ChybaStranky text={hrac.chyba || 'Hráča sa nepodarilo načítať.'} />;

  const fotka = obrazokUrl(h.fotka);
  const udaje: Array<[string, string | number | null | undefined]> = [
    ['Národnosť', h.narodnost],
    ['Dátum narodenia', h.datum_narodenia ? datumCiselny(h.datum_narodenia) : null],
    ['Vek', !h.datum_narodenia && h.vek ? `${h.vek} rokov` : null],
    ['Výška', h.vyska ? `${h.vyska} cm` : null],
    ['Váha', h.vaha ? `${Math.round(Number(h.vaha))} kg` : null],
    ['Pozícia', pozicia(h.pozicia)],
  ].filter(([, hodnota]) => hodnota !== null && hodnota !== undefined && hodnota !== '') as Array<[string, string | number]>;
  const sezony = podlaSezony(statistiky.data ?? []);
  // Bez vlastného popisu z administrácie krátka veta z údajov hráča
  const popis =
    h.poznamky ||
    [
      `${h.meno} ${h.priezvisko}`,
      h.pozicia ? `hrá na pozícii ${pozicia(h.pozicia).toLowerCase()}` : 'je hráčom',
      h.tim ? `v tíme ${h.tim.nazov}` : null,
      h.cislo_dresu !== null && h.cislo_dresu !== undefined ? `a nosí dres s číslom ${h.cislo_dresu}` : null,
    ]
      .filter(Boolean)
      .join(' ') + '.';
  const suvisiace = clanky.data ?? [];

  return (
    <div className="kr-stranka kr-profil">
      <header className="kr-profil-hero">
        <div className="kr-kontajner kr-profil-hero__mriezka">
          <div className="kr-profil-hero__text">
            {h.tim && <span className="kr-hlava__stitok">{h.tim.nazov}</span>}
            <div className="kr-profil-hero__meno">
              {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <span className="kr-profil-hero__cislo">{h.cislo_dresu}</span>}
              <h1>
                <span className="kr-profil-hero__krstne">{h.meno}</span>
                <span className="kr-profil-hero__priezvisko">{h.priezvisko}</span>
              </h1>
            </div>
            {h.pozicia && <span className="kr-profil-hero__pozicia">{pozicia(h.pozicia)}</span>}
          </div>
          <div className="kr-profil-hero__foto">
            {fotka ? (
              <img src={fotka} alt={`${h.meno} ${h.priezvisko}`} onError={skryObrazok} />
            ) : (
              <span className="kr-hrac__silueta" aria-hidden="true" />
            )}
          </div>
        </div>
      </header>

      <section className="kr-profil-o" aria-labelledby="kr-o-hracovi">
          <div className={`kr-profil-o__mriezka${udaje.length ? '' : ' kr-profil-o__mriezka--bez-udajov'}`}>
            <div>
              <h2 id="kr-o-hracovi" className="kr-skupina__nadpis kr-skupina__nadpis--male">
                O hráčovi
              </h2>
              <p className="kr-profil-o__text">{popis}</p>
            </div>
            {udaje.length > 0 && (
              <dl className="kr-udaje" aria-label="Údaje o hráčovi">
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

      {sezony.length > 0 && (
        <section className="kr-profil-sezona" aria-label="Štatistiky">
          <div className="kr-kontajner">
            {sezony.map((s) => (
              <div key={s.sezona ?? 'bez'} className="kr-profil-sezona__blok">
                <h2 className="kr-skupina__nadpis">{s.sezona ? `Sezóna ${s.sezona}` : 'Štatistiky'}</h2>
                <TabulkaSezony riadky={s.riadky} />
              </div>
            ))}
          </div>
        </section>
      )}

      {suvisiace.length > 0 && (
        <Sekcia className="kr-sekcia--suvisiace">
          <NadpisSekcie
            nadpis="Súvisiace novinky"
            odkaz={clanky.strankovanie?.has_next ? `/clanky?hladat=${encodeURIComponent(h.priezvisko)}` : null}
          />
          <div className="kr-mriezka-3 kr-mriezka-3--karty kr-pas-mobil">
            {suvisiace.map((c) => (
              <KartaClanku key={c.id} clanok={c} />
            ))}
          </div>
        </Sekcia>
      )}
    </div>
  );
};

export default Hrac;
