// Umiestnenie: sablony/moderna/src/stranky/Hrac.tsx
// Profil hráča: veľká fotka s číslom dresu, osobné údaje, štatistiky
// v súťaži tímu a spoluhráči.

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { souborUrl } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import {
  Chyba,
  Ikona,
  KartaHraca,
  Nacitava,
  datum,
  pozicia,
  useApi,
  useTitulok,
  type Hrac as TypHraca,
  type Liga,
} from '../spolocne';

interface Strelec {
  hrac: { id: number };
  pocet: number;
}

/** Počet udalostí hráča v súťaži (góly, asistencie, karty). */
const useStatistika = (ligaId: number | null, typ: string, hracId: number | undefined) => {
  const rebricek = useApi<Strelec[]>(ligaId && hracId ? `/leagues/${ligaId}/top-scorers?typ=${typ}&limit=100` : null);
  return rebricek.data ? rebricek.data.find((r) => r.hrac.id === hracId)?.pocet ?? 0 : null;
};

const Hrac: React.FC = () => {
  const { id = '' } = useParams();
  const hrac = useApi<TypHraca>(`/players/${encodeURIComponent(id)}?include_team=true`);
  const h = hrac.data;
  const ligy = useApi<Liga[]>(h?.tim_id ? '/leagues' : null);
  const liga = (ligy.data ?? []).find((l) => l.tim_id === h?.tim_id && l.format !== 'turnaj') ?? null;
  const goly = useStatistika(liga?.id ?? null, 'gol', h?.id);
  const asistencie = useStatistika(liga?.id ?? null, 'asistencia', h?.id);
  const zlte = useStatistika(liga?.id ?? null, 'zlta_karta', h?.id);
  const spoluhraci = useApi<{ hraci: TypHraca[] }>(h?.tim_id ? `/teams/${h.tim_id}/players` : null);

  useTitulok(h ? `${h.meno} ${h.priezvisko}` : null);

  if (hrac.nacitava) return <Nacitava text="Načítavam hráča…" />;
  if (hrac.stav === 404) return <NenajdenyObsah nadpis="Tohto hráča sme nenašli." spat={{ odkaz: '/teams', text: 'Tímy' }} />;
  if (hrac.chyba || !h) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={hrac.chyba || 'Hráča sa nepodarilo načítať.'} />
      </div>
    );
  }

  const fakty: Array<[string, string | number | null | undefined]> = [
    ['Pozícia', pozicia(h.pozicia)],
    ['Číslo dresu', h.cislo_dresu],
    ['Vek', h.vek ? `${h.vek} rokov` : null],
    ['Dátum narodenia', h.datum_narodenia ? datum(h.datum_narodenia) : null],
    ['Národnosť', h.narodnost],
    ['Výška', h.vyska ? `${h.vyska} cm` : null],
    ['Váha', h.vaha ? `${Math.round(Number(h.vaha))} kg` : null],
  ];
  const ostatni = (spoluhraci.data?.hraci ?? [])
    .filter((x) => x.id !== h.id)
    .sort((a, b) => Number(b.pozicia === h.pozicia) - Number(a.pozicia === h.pozicia) || Number(Boolean(b.fotka)) - Number(Boolean(a.fotka)))
    .slice(0, 4);

  return (
    <div className="md-detail md-profil">
      <div className="md-kontajner">
        {h.tim && (
          <Link to={`/teams/${h.tim.id}`} className="md-spat">
            <Ikona nazov="spat" /> {h.tim.nazov}
          </Link>
        )}
        <div className="md-profil__mriezka">
          <div className="md-profil__foto">
            {h.fotka ? (
              <img src={souborUrl(h.fotka)} alt={`${h.meno} ${h.priezvisko}`} />
            ) : (
              <span className="md-karta-hraca__inicialy" aria-hidden="true">
                {h.meno.charAt(0)}
                {h.priezvisko.charAt(0)}
              </span>
            )}
            {h.cislo_dresu !== null && h.cislo_dresu !== undefined && (
              <span className="md-profil__cislo" aria-hidden="true">
                {h.cislo_dresu}
              </span>
            )}
          </div>

          <div className="md-profil__text">
            <div className="md-stitok">{[pozicia(h.pozicia), h.tim?.nazov].filter(Boolean).join(' · ')}</div>
            <h1>
              <span>{h.meno}</span> {h.priezvisko}
            </h1>

            {liga && (goly !== null || asistencie !== null) && (
              <div className="md-statistiky-hraca" aria-label={`Štatistiky v súťaži ${liga.nazov}`}>
                <div>
                  <strong>{goly ?? '–'}</strong>
                  <span>Góly</span>
                </div>
                <div>
                  <strong>{asistencie ?? '–'}</strong>
                  <span>Asistencie</span>
                </div>
                <div>
                  <strong>{zlte ?? '–'}</strong>
                  <span>Žlté karty</span>
                </div>
                <small>
                  {liga.nazov}
                  {liga.sezona ? ` · ${liga.sezona}` : ''}
                </small>
              </div>
            )}

            <dl className="md-fakty">
              {fakty
                .filter(([, hodnota]) => hodnota !== null && hodnota !== undefined && hodnota !== '')
                .map(([nazov, hodnota]) => (
                  <div key={nazov}>
                    <dt>{nazov}</dt>
                    <dd>{hodnota}</dd>
                  </div>
                ))}
            </dl>

            {h.poznamky && <p className="md-profil__bio">{h.poznamky}</p>}
          </div>
        </div>
      </div>

      {ostatni.length > 0 && h.tim && (
        <section className="md-sekcia" aria-labelledby="md-spoluhraci">
          <div className="md-kontajner">
            <div className="md-sekcia__hlava">
              <div>
                <div className="md-stitok">{h.tim.nazov}</div>
                <h2 id="md-spoluhraci">Spoluhráči.</h2>
              </div>
              <Link to={`/teams/${h.tim.id}`} className="md-odkaz-sipka">
                Celý káder <Ikona nazov="sipka" />
              </Link>
            </div>
            <div className="md-hraci md-posuvnik">
              {ostatni.map((x) => (
                <KartaHraca key={x.id} hrac={x} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Hrac;
