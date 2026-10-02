// Umiestnenie: sablony/elita/src/stranky/Hrac.tsx
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
  <div className="el-tabulka-obal">
    <table className="el-tabulka el-tabulka--sezona">
      <thead>
        <tr>
          <th className="el-tabulka__sutaz">Súťaž</th>
          <th>Zápasy</th>
          <th>Góly</th>
          <th>Asist.</th>
          <th>Minúty</th>
        </tr>
      </thead>
      <tbody>
        {riadky.map((r) => (
          <tr key={`${r.liga_id ?? r.liga_nazov}`}>
            <td className="el-tabulka__sutaz">{r.liga_nazov}</td>
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
  // Bez vlastného popisu z administrácie elátka veta z údajov hráča
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
    <div className="el-stranka el-profil">
      <header className="el-profil-hero">
        <div className="el-kontajner el-profil-hero__mriezka">
          <div className="el-profil-hero__text">
            {h.tim && <span className="el-hlava__stitok">{h.tim.nazov}</span>}
            <div className="el-profil-hero__meno">
              {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <span className="el-profil-hero__cislo">{h.cislo_dresu}</span>}
              <h1>
                <span className="el-profil-hero__krstne">{h.meno}</span>
                <span className="el-profil-hero__priezvisko">{h.priezvisko}</span>
              </h1>
            </div>
            {h.pozicia && <span className="el-profil-hero__pozicia">{pozicia(h.pozicia)}</span>}
          </div>
          <div className="el-profil-hero__foto">
            {fotka ? (
              <img src={fotka} alt={`${h.meno} ${h.priezvisko}`} onError={skryObrazok} />
            ) : (
              <span className="el-hrac__silueta" aria-hidden="true" />
            )}
          </div>
        </div>
      </header>

      <section className="el-profil-o" aria-labelledby="el-o-hracovi">
          <div className={`el-profil-o__mriezka${udaje.length ? '' : ' el-profil-o__mriezka--bez-udajov'}`}>
            <div>
              <h2 id="el-o-hracovi" className="el-skupina__nadpis el-skupina__nadpis--male">
                O hráčovi
              </h2>
              <p className="el-profil-o__text">{popis}</p>
            </div>
            {udaje.length > 0 && (
              <dl className="el-udaje" aria-label="Údaje o hráčovi">
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
        <section className="el-profil-sezona" aria-label="Štatistiky">
          <div className="el-kontajner">
            {sezony.map((s) => (
              <div key={s.sezona ?? 'bez'} className="el-profil-sezona__blok">
                <h2 className="el-skupina__nadpis">{s.sezona ? `Sezóna ${s.sezona}` : 'Štatistiky'}</h2>
                <TabulkaSezony riadky={s.riadky} />
              </div>
            ))}
          </div>
        </section>
      )}

      {suvisiace.length > 0 && (
        <Sekcia className="el-sekcia--suvisiace">
          <NadpisSekcie
            nadpis="Súvisiace novinky"
            odkaz={clanky.strankovanie?.has_next ? `/clanky?hladat=${encodeURIComponent(h.priezvisko)}` : null}
          />
          <div className="el-mriezka-3 el-mriezka-3--karty el-pas-mobil">
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
