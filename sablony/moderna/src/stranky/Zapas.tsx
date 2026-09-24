// Umiestnenie: sablony/moderna/src/stranky/Zapas.tsx
// Detail zápasu: tmavá hlavička s výsledkom a strelcami, priebeh
// zápasu (udalosti hráčov a komentár), zostavy a odkazy na video,
// fotky a článok.

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useNastavenia } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import {
  Chyba,
  Erb,
  Ikona,
  Nacitava,
  STAVY_ZAPASU,
  cas,
  datum,
  logoStrany,
  maVysledok,
  nazovDomacich,
  nazovHosti,
  stavZapasu,
  useApi,
  useTitulok,
  zaKolko,
  type Zapas as TypZapasu,
} from '../spolocne';

interface HracUdalosti {
  id: number;
  meno: string;
  priezvisko: string;
  cislo_dresu: number | null;
  tim_id?: number | null;
}

interface Udalost {
  id: number;
  typ: 'gol' | 'vlastny_gol' | 'asistencia' | 'zlta_karta' | 'cervena_karta' | 'striedanie' | string;
  minuta: number | null;
  hrac_id: number | null;
  hrac?: HracUdalosti | null;
  hostujuci_hrac_meno?: string | null;
  hostujuci_hrac_cislo?: number | null;
  striedany_hrac_id?: number | null;
  striedany_hrac_meno?: string | null;
}

interface Komentar {
  id: number;
  minuta: number | null;
  text: string;
}

interface Zostava {
  id: number;
  strana: 'domaci' | 'hostia';
  zaradenie: 'zakladna' | 'lavicka';
  hrac?: HracUdalosti | null;
  hostujuci_hrac_meno?: string | null;
  hostujuci_hrac_cislo?: number | null;
  kapitan?: boolean;
  odohrane_minuty?: number | null;
}

interface Video {
  id: number;
  nazov: string;
  url: string;
}

const TYPY: Record<string, { nazov: string; znak: string }> = {
  gol: { nazov: 'Gól', znak: '⚽' },
  vlastny_gol: { nazov: 'Vlastný gól', znak: '⚽' },
  asistencia: { nazov: 'Asistencia', znak: '↗' },
  zlta_karta: { nazov: 'Žltá karta', znak: '' },
  cervena_karta: { nazov: 'Červená karta', znak: '' },
  striedanie: { nazov: 'Striedanie', znak: '⇄' },
};

const menoHraca = (u: { hrac?: HracUdalosti | null; hostujuci_hrac_meno?: string | null; hostujuci_hrac_cislo?: number | null }) =>
  u.hrac ? `${u.hrac.meno} ${u.hrac.priezvisko}` : `${u.hostujuci_hrac_meno ?? 'Neznámy hráč'}${u.hostujuci_hrac_cislo != null ? ` (${u.hostujuci_hrac_cislo})` : ''}`;

/**
 * Strana udalosti: hráč z databázy patrí nášmu tímu, hráč zadaný menom
 * súperovi. Vlastný gól sa pripíše druhej strane.
 */
const stranaUdalosti = (u: Udalost, z: TypZapasu): 'domaci' | 'hostia' => {
  const nasa: 'domaci' | 'hostia' = z.domaci_tim_id && (!u.hrac?.tim_id || u.hrac.tim_id === z.domaci_tim_id) ? 'domaci' : 'hostia';
  const hracStrana = u.hrac ? nasa : nasa === 'domaci' ? 'hostia' : 'domaci';
  if (u.typ === 'vlastny_gol') return hracStrana === 'domaci' ? 'hostia' : 'domaci';
  return hracStrana;
};

const Odpocet: React.FC<{ kedy: string }> = ({ kedy }) => {
  const [teraz, setTeraz] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setTeraz(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const zostava = new Date(kedy).getTime() - teraz;
  if (zostava <= 0) return null;
  const dni = Math.floor(zostava / 86_400_000);
  const hodiny = Math.floor((zostava % 86_400_000) / 3_600_000);
  const minuty = Math.floor((zostava % 3_600_000) / 60_000);
  return (
    <div className="md-odpocet md-odpocet--tmavy" role="timer">
      {[
        [dni, 'dní'],
        [hodiny, 'hod'],
        [minuty, 'min'],
      ].map(([n, s]) => (
        <span key={s as string}>
          <strong>{String(n).padStart(2, '0')}</strong>
          <small>{s}</small>
        </span>
      ))}
    </div>
  );
};

const Zapas: React.FC = () => {
  const { id = '' } = useParams();
  const { nastavenia } = useNastavenia();
  const zapas = useApi<TypZapasu & { clanok?: { nazov: string; slug: string } | null }>(`/matches/${encodeURIComponent(id)}`);
  const z = zapas.data;
  const statistiky = useApi<{ vsetky: Udalost[] }>(z ? `/matches/${z.id}/statistics` : null);
  const komentar = useApi<Komentar[]>(z ? `/matches/${z.id}/events` : null);
  const zostava = useApi<{ vsetky: Zostava[] }>(z ? `/matches/${z.id}/lineup` : null);
  const videa = useApi<Video[]>(z ? `/videos?zapas_id=${z.id}` : null);

  useTitulok(z ? `${nazovDomacich(z)} – ${nazovHosti(z)}${maVysledok(z) ? ` ${z.goly_domaci}:${z.goly_hostia}` : ''}` : null);

  if (zapas.nacitava) return <Nacitava text="Načítavam zápas…" />;
  if (zapas.stav === 404) return <NenajdenyObsah nadpis="Tento zápas sme nenašli." spat={{ odkaz: '/matches', text: 'Všetky zápasy' }} />;
  if (zapas.chyba || !z) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={zapas.chyba || 'Zápas sa nepodarilo načítať.'} />
      </div>
    );
  }

  const stav = stavZapasu(z);
  const odohrany = maVysledok(z) && stav !== 'naplanovany';
  const udalosti = statistiky.data?.vsetky ?? [];
  const goly = udalosti.filter((u) => u.typ === 'gol' || u.typ === 'vlastny_gol').sort((a, b) => (a.minuta ?? 0) - (b.minuta ?? 0));
  const priebeh = [
    ...udalosti.filter((u) => u.typ !== 'asistencia').map((u) => ({ kluc: `u${u.id}`, minuta: u.minuta, udalost: u as Udalost | null, text: null as string | null })),
    ...(komentar.data ?? []).map((k) => ({ kluc: `k${k.id}`, minuta: k.minuta, udalost: null, text: k.text })),
  ].sort((a, b) => (a.minuta ?? 999) - (b.minuta ?? 999));
  const asistencie = udalosti.filter((u) => u.typ === 'asistencia');
  const hraciZostavy = zostava.data?.vsetky ?? [];

  const striedany = (u: Udalost) => {
    if (u.striedany_hrac_meno) return u.striedany_hrac_meno;
    const h = [...udalosti.map((x) => x.hrac), ...hraciZostavy.map((x) => x.hrac)].find((x) => x && x.id === u.striedany_hrac_id);
    return h ? `${h.meno} ${h.priezvisko}` : null;
  };

  const detaily: Array<[string, string, string | number | null | undefined]> = [
    ['kalendar', 'Výkop', `${datum(z.datum_cas, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${cas(z.datum_cas)}`],
    ['miesto', 'Miesto', z.miesto],
    ['pohar', 'Súťaž', [z.liga_nazov, z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ')],
    ['stit', 'Rozhodca', z.rozhodca],
    ['timy', 'Diváci', z.pocet_divakov ? z.pocet_divakov.toLocaleString('sk-SK') : null],
  ];

  return (
    <div className="md-detail md-zapas">
      <section className="md-detail-hero md-zapas-hero">
        <div className="md-kontajner md-detail-hero__obsah">
          <Link to="/matches" className="md-spat md-spat--svetly">
            <Ikona nazov="spat" /> Všetky zápasy
          </Link>
          <div className="md-zapas-hero__meta">
            <span className="md-pill">{[z.liga_nazov || 'Zápas', z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ')}</span>
            <span className={`md-pill md-pill--stav-${stav}`}>{STAVY_ZAPASU[stav] ?? stav}</span>
          </div>
          <div className="md-zapas-hero__timy">
            <div className="md-zapas-hero__tim">
              <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} velkost="xl" />
              {z.domaci_tim_id ? <Link to={`/teams/${z.domaci_tim_id}`}>{nazovDomacich(z)}</Link> : <strong>{nazovDomacich(z)}</strong>}
            </div>
            <div className="md-zapas-hero__stred">
              {odohrany ? (
                <span className="md-zapas-hero__skore">
                  {z.goly_domaci}
                  <i>:</i>
                  {z.goly_hostia}
                </span>
              ) : (
                <span className="md-zapas-hero__cas">{cas(z.datum_cas)}</span>
              )}
              <small>{odohrany ? datum(z.datum_cas) : zaKolko(z.datum_cas) || datum(z.datum_cas)}</small>
            </div>
            <div className="md-zapas-hero__tim">
              <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} velkost="xl" />
              {z.hostujuci_tim_id ? <Link to={`/teams/${z.hostujuci_tim_id}`}>{nazovHosti(z)}</Link> : <strong>{nazovHosti(z)}</strong>}
            </div>
          </div>

          {goly.length > 0 && (
            <div className="md-zapas-hero__strelci">
              {(['domaci', 'hostia'] as const).map((strana) => (
                <ul key={strana} className={`md-strelci md-strelci--${strana}`}>
                  {goly
                    .filter((g) => stranaUdalosti(g, z) === strana)
                    .map((g) => (
                      <li key={g.id}>
                        {menoHraca(g)} {g.minuta != null && <span>{g.minuta}'</span>}
                        {g.typ === 'vlastny_gol' && <span> (vl.)</span>}
                      </li>
                    ))}
                </ul>
              ))}
            </div>
          )}

          {!odohrany && stav === 'naplanovany' && <Odpocet kedy={z.datum_cas} />}
        </div>
      </section>

      <div className="md-kontajner md-detail__telo md-zapas__mriezka">
        <div className="md-zapas__hlavny">
          {priebeh.length > 0 && (
            <section className="md-karta" aria-labelledby="md-priebeh">
              <h2 id="md-priebeh" className="md-karta__nadpis">
                Priebeh zápasu
              </h2>
              <ol className="md-priebeh">
                {priebeh.map((p) => {
                  if (!p.udalost) {
                    return (
                      <li key={p.kluc} className="md-priebeh__polozka md-priebeh__polozka--text">
                        <span className="md-priebeh__minuta">{p.minuta != null ? `${p.minuta}'` : ''}</span>
                        <p>{p.text}</p>
                      </li>
                    );
                  }
                  const u = p.udalost;
                  const typ = TYPY[u.typ] ?? { nazov: u.typ, znak: '•' };
                  const asistencia = u.typ === 'gol' ? asistencie.find((a) => a.minuta === u.minuta) : undefined;
                  return (
                    <li key={p.kluc} className={`md-priebeh__polozka md-priebeh__polozka--${stranaUdalosti(u, z)} md-priebeh__polozka--${u.typ}`}>
                      <span className="md-priebeh__minuta">{u.minuta != null ? `${u.minuta}'` : ''}</span>
                      <span className={`md-priebeh__znak md-priebeh__znak--${u.typ}`} aria-hidden="true">
                        {typ.znak}
                      </span>
                      <span className="md-priebeh__text">
                        <strong>{menoHraca(u)}</strong>
                        <small>
                          {typ.nazov}
                          {u.typ === 'striedanie' && striedany(u) ? ` za ${striedany(u)}` : ''}
                          {asistencia ? ` · asistencia ${menoHraca(asistencia)}` : ''}
                        </small>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {hraciZostavy.length > 0 && (
            <section className="md-karta" aria-labelledby="md-zostavy">
              <h2 id="md-zostavy" className="md-karta__nadpis">
                Zostavy
              </h2>
              <div className="md-zostavy">
                {(['domaci', 'hostia'] as const)
                  .filter((strana) => hraciZostavy.some((h) => h.strana === strana))
                  .map((strana) => (
                    <div key={strana}>
                      <h3>{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</h3>
                      {(['zakladna', 'lavicka'] as const).map((zaradenie) => {
                        const hraci = hraciZostavy.filter((h) => h.strana === strana && h.zaradenie === zaradenie);
                        if (hraci.length === 0) return null;
                        return (
                          <div key={zaradenie} className="md-zostavy__skupina">
                            <div className="md-stitok">{zaradenie === 'zakladna' ? 'Základná zostava' : 'Náhradníci'}</div>
                            <ul>
                              {hraci.map((h) => (
                                <li key={h.id}>
                                  <span className="md-zostavy__cislo">{h.hrac?.cislo_dresu ?? h.hostujuci_hrac_cislo ?? ''}</span>
                                  {h.hrac ? <Link to={`/players/${h.hrac.id}`}>{menoHraca(h)}</Link> : <span>{menoHraca(h)}</span>}
                                  {h.kapitan && (
                                    <abbr title="Kapitán" className="md-zostavy__kapitan">
                                      C
                                    </abbr>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            </section>
          )}

          {priebeh.length === 0 && hraciZostavy.length === 0 && (
            <section className="md-karta md-zapas__bez-priebehu">
              <p className="md-tlmene">
                {odohrany ? 'K tomuto zápasu nie je zverejnený priebeh ani zostavy.' : 'Zostavy a priebeh zverejníme počas zápasu.'}
              </p>
            </section>
          )}
        </div>

        <aside className="md-zapas__bok">
          <section className="md-karta">
            <h2 className="md-karta__nadpis">Informácie</h2>
            <dl className="md-info-zoznam">
              {detaily
                .filter(([, , hodnota]) => Boolean(hodnota))
                .map(([ikona, nazov, hodnota]) => (
                  <div key={nazov}>
                    <dt>
                      <Ikona nazov={ikona} velkost={16} /> {nazov}
                    </dt>
                    <dd>{hodnota}</dd>
                  </div>
                ))}
            </dl>
            {z.poznamky && <p className="md-zapas__poznamky">{z.poznamky}</p>}
          </section>

          {(z.video_url || (videa.data ?? []).length > 0 || z.fotogaleria_id || z.clanok?.slug) && (
            <section className="md-karta">
              <h2 className="md-karta__nadpis">Viac zo zápasu</h2>
              <div className="md-odkazy-zapasu">
                {z.clanok?.slug && (
                  <Link to={`/clanek/${z.clanok.slug}`}>
                    <Ikona nazov="spravy" /> <span>{z.clanok.nazov || 'Správa zo zápasu'}</span>
                  </Link>
                )}
                {z.fotogaleria_id && (
                  <Link to={`/galleries/${z.fotogaleria_id}`}>
                    <Ikona nazov="foto" /> <span>Fotogaléria</span>
                  </Link>
                )}
                {(videa.data ?? []).length > 0 ? (
                  <Link to={`/videa?zapas=${z.id}`}>
                    <Ikona nazov="hrat" /> <span>Videá zo zápasu ({videa.data!.length})</span>
                  </Link>
                ) : (
                  z.video_url && (
                    <a href={z.video_url} target="_blank" rel="noopener noreferrer">
                      <Ikona nazov="hrat" /> <span>Záznam zápasu</span>
                    </a>
                  )
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Zapas;
