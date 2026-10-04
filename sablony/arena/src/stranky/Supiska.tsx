// Umiestnenie: sablony/arena/src/stranky/Supiska.tsx
// Súpiska - slúži pre /teams aj /teams/:id. Nie mriežka kariet, ale
// zostava ako v športovej aplikácii: panel nástrojov so skokom na pozíciu
// a výberom tímu, hráči po pozíciách v širokých riadkoch (veľké číslo,
// fotka, meno, národnosť, vek, zápasy, góly, asistencie) a na konci
// realizačný tím v kompaktných kartách.

import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useNastavenia } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, HlavickaStranky, Nacitava, Prazdne, Sekcia } from '../casti';
import {
  Ikona,
  POZICIE,
  funkcia,
  obrazokUrl,
  skryObrazok,
  sklon,
  useApi,
  useTitulok,
  zoradTimy,
  type ClenTimu,
  type Hrac,
  type StatistikaHraca,
  type Tim,
  useUpravy,
} from '../spolocne';

/** Hráči zoskupení podľa pozície v poradí brankári → útočníci. */
const podlaPozicie = (hraci: Hrac[]) => {
  const skupiny = new Map<string, Hrac[]>();
  for (const h of [...hraci].sort((a, b) => (a.cislo_dresu ?? 999) - (b.cislo_dresu ?? 999))) {
    const kluc = h.pozicia && POZICIE[h.pozicia] ? h.pozicia : 'ostatni';
    skupiny.set(kluc, [...(skupiny.get(kluc) ?? []), h]);
  }
  return [...skupiny.entries()]
    .sort(([a], [b]) => (POZICIE[a]?.poradie ?? 9) - (POZICIE[b]?.poradie ?? 9))
    .map(([kluc, zoznam]) => ({ kluc, nazov: POZICIE[kluc]?.mnozne ?? 'Ďalší hráči', hraci: zoznam }));
};

const Udaj: React.FC<{ nazov: string; children: React.ReactNode }> = ({ nazov, children }) => (
  <span className="ar-hriadok__udaj">
    <small>{nazov}</small>
    {children}
  </span>
);

const RiadokHraca: React.FC<{ hrac: Hrac; statistika?: StatistikaHraca }> = ({ hrac: h, statistika: st }) => {
  const fotka = obrazokUrl(h.fotka);
  return (
    <Link to={`/players/${h.id}`} className="ar-hriadok">
      <span className="ar-hriadok__cislo">{h.cislo_dresu ?? '–'}</span>
      <span className="ar-hriadok__foto">{fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="ar-hrac__silueta" aria-hidden="true" />}</span>
      <span className="ar-hriadok__meno">
        <small>{h.meno}</small>
        <strong>{h.priezvisko}</strong>
      </span>
      <Udaj nazov="Národnosť">{h.narodnost || '–'}</Udaj>
      <Udaj nazov="Vek">{h.vek ?? '–'}</Udaj>
      <span className="ar-hriadok__staty">
        <Udaj nazov="Zápasy">{st?.zapasy ?? 0}</Udaj>
        <Udaj nazov="Góly">{st?.goly ?? 0}</Udaj>
        <Udaj nazov="Asist.">{st?.asistencie ?? 0}</Udaj>
      </span>
      <Ikona nazov="sipka" velkost={15} className="ar-hriadok__sipka" />
    </Link>
  );
};

const SupiskaTimu: React.FC<{ tim: Tim; timy: Tim[] }> = ({ tim, timy }) => {
  const navigate = useNavigate();
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const statistiky = useApi<StatistikaHraca[]>(`/teams/${tim.id}/players/stats`);
  const clenovia = useApi<{ realizacny_tim: ClenTimu[] }>(`/teams/${tim.id}/staff`);
  const podlaId = useMemo(() => new Map((statistiky.data ?? []).map((s) => [s.hrac_id, s])), [statistiky.data]);
  const skupiny = podlaPozicie(hraci.data?.hraci ?? []);
  const realizacny = clenovia.data?.realizacny_tim ?? [];
  const pocetHracov = skupiny.reduce((n, s) => n + s.hraci.length, 0);

  const posunNa = (kluc: string) => {
    const ciel = document.getElementById(`ar-skupina-${kluc}`);
    if (ciel) window.scrollTo({ top: ciel.getBoundingClientRect().top + window.scrollY - 170, behavior: 'smooth' });
  };

  return (
    <>
      <div className="ar-kontajner ar-nastroje">
        <div className="ar-segment" role="group" aria-label="Pozície">
          {skupiny.map((s) => (
            <button key={s.kluc} type="button" onClick={() => posunNa(s.kluc)}>
              {s.nazov}
              <small>{s.hraci.length}</small>
            </button>
          ))}
          {realizacny.length > 0 && (
            <button type="button" onClick={() => posunNa('realizacny-tim')}>
              Realizačný tím
              <small>{realizacny.length}</small>
            </button>
          )}
        </div>
        {timy.length > 1 && (
          <label className="ar-vyber">
            <span>Tím</span>
            <select value={String(tim.id)} onChange={(e) => navigate(`/teams/${e.target.value}`)}>
              {timy.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.nazov}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {hraci.nacitava ? (
        <Nacitava text="Načítavam súpisku…" />
      ) : skupiny.length === 0 && realizacny.length === 0 ? (
        <Sekcia className="ar-sekcia--hore">
          <Prazdne nadpis="Súpiska zatiaľ nie je zverejnená" />
        </Sekcia>
      ) : (
        <div className="ar-kontajner ar-zostava" id="ar-supiska">
          {pocetHracov > 0 && (
            <p className="ar-zostava__suhrn">
              <strong>{pocetHracov}</strong> {sklon(pocetHracov, 'hráč', 'hráči', 'hráčov')} na súpiske
              {realizacny.length > 0 && (
                <>
                  {' '}
                  · <strong>{realizacny.length}</strong> v realizačnom tíme
                </>
              )}
            </p>
          )}
          {skupiny.map((s) => (
            <section key={s.kluc} className="ar-zostava__skupina" id={`ar-skupina-${s.kluc}`} aria-label={s.nazov}>
              <header className="ar-zostava__hlava">
                <span aria-hidden="true">{String(s.hraci.length).padStart(2, '0')}</span>
                <h2>{s.nazov}</h2>
              </header>
              <div className="ar-zostava__riadky">
                {s.hraci.map((h) => (
                  <RiadokHraca key={h.id} hrac={h} statistika={podlaId.get(h.id)} />
                ))}
              </div>
            </section>
          ))}
          {realizacny.length > 0 && (
            <section className="ar-zostava__skupina" id="ar-skupina-realizacny-tim" aria-label="Realizačný tím">
              <header className="ar-zostava__hlava">
                <span aria-hidden="true">{String(realizacny.length).padStart(2, '0')}</span>
                <h2>Realizačný tím</h2>
              </header>
              <div className="ar-zostava__clenovia">
                {realizacny.map((c) => {
                  const fotka = obrazokUrl(c.fotka);
                  return (
                    <Link key={c.id} to={`/staff/${c.id}`} className="ar-clen">
                      <span className="ar-hriadok__foto">{fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="ar-hrac__silueta" aria-hidden="true" />}</span>
                      <span>
                        <small>{funkcia(c.funkcia)}</small>
                        <strong>
                          {c.meno} {c.priezvisko}
                        </strong>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
};

const Supiska: React.FC = () => {
  const u = useUpravy();
  const { id } = useParams();
  const { nastavenia } = useNastavenia();
  const timy = useApi<Tim[]>('/teams');
  const zoradene = zoradTimy(timy.data);
  const tim = id ? zoradene.find((t) => String(t.id) === id) ?? null : zoradene.find((t) => t.typ === 'muzi') ?? zoradene[0] ?? null;
  useTitulok(tim && id ? `Súpiska: ${tim.nazov}` : 'Súpiska');

  if (timy.nacitava) return <Nacitava text="Načítavam tímy…" />;
  if (timy.chyba) return <ChybaStranky text={timy.chyba} />;
  if (id && !tim) return <NenajdenyObsah nadpis="Tento tím sme nenašli." spat={{ odkaz: '/teams', text: 'Súpiska' }} />;

  return (
    <div className="ar-stranka ar-supiska">
      <HlavickaStranky stitok={tim && zoradene.length > 1 ? tim.nazov : 'Tím'} nadpis={u.text('stranka_supiska_nadpis', 'Súpiska')}>
        {tim?.popis && <p className="ar-hlava__popis">{tim.popis}</p>}
      </HlavickaStranky>
      {tim ? (
        <SupiskaTimu key={tim.id} tim={tim} timy={zoradene} />
      ) : (
        <Sekcia className="ar-sekcia--hore">
          <Prazdne nadpis={`${nastavenia.nazov} zatiaľ nemá zverejnené tímy`} />
        </Sekcia>
      )}
    </div>
  );
};

export default Supiska;
