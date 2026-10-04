// Umiestnenie: sablony/arena/src/stranky/Zapas.tsx
// Detail zápasu: tmavá hlavička s veľkým výsledkom (alebo časom výkopu
// a odpočtom), strelci, priebeh zápasu, zostavy, informácie v karte ako
// v profile hráča a odkazy na článok, fotky a videá.

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useNastavenia } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, Nacitava } from '../casti';
import {
  Erb,
  Ikona,
  STAVY_ZAPASU,
  cas,
  datum,
  denVTyzdni,
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
  typ: string;
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

/** Strana udalosti: hráč z databázy patrí nášmu tímu, hráč zadaný menom súperovi. Vlastný gól sa pripíše druhej strane. */
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
    <div className="ar-odpocet" role="timer" aria-label="Do výkopu zostáva">
      {(
        [
          [dni, 'dní'],
          [hodiny, 'hod'],
          [minuty, 'min'],
        ] as Array<[number, string]>
      ).map(([n, s]) => (
        <span key={s}>
          <strong>{String(n).padStart(2, '0')}</strong>
          <small>{s}</small>
        </span>
      ))}
    </div>
  );
};

const Strana: React.FC<{ z: TypZapasu; strana: 'domaci' | 'hostia'; logoKlubu: string | null }> = ({ z, strana, logoKlubu }) => {
  const nazov = strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z);
  const timId = strana === 'domaci' ? z.domaci_tim_id : z.hostujuci_tim_id;
  return (
    <div className={`ar-skore__tim ar-skore__tim--${strana}`}>
      <Erb nazov={nazov} logo={logoStrany(z, strana, logoKlubu)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} velky />
      {timId ? <Link to={`/teams/${timId}`}>{nazov}</Link> : <strong>{nazov}</strong>}
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
  const videa = useApi<Array<{ id: number }>>(z ? `/videos?zapas_id=${z.id}` : null);

  useTitulok(z ? `${nazovDomacich(z)} – ${nazovHosti(z)}${maVysledok(z) ? ` ${z.goly_domaci}:${z.goly_hostia}` : ''}` : null);

  if (zapas.nacitava) return <Nacitava text="Načítavam zápas…" />;
  if (zapas.stav === 404) return <NenajdenyObsah nadpis="Tento zápas sme nenašli" spat={{ odkaz: '/matches', text: 'Všetky zápasy' }} />;
  if (zapas.chyba || !z) return <ChybaStranky text={zapas.chyba || 'Zápas sa nepodarilo načítať.'} />;

  const stav = stavZapasu(z);
  const odohrany = maVysledok(z) && stav !== 'naplanovany';
  const udalosti = statistiky.data?.vsetky ?? [];
  const goly = udalosti.filter((u) => u.typ === 'gol' || u.typ === 'vlastny_gol').sort((a, b) => (a.minuta ?? 0) - (b.minuta ?? 0));
  const asistencie = udalosti.filter((u) => u.typ === 'asistencia');
  const priebeh = [
    ...udalosti.filter((u) => u.typ !== 'asistencia').map((u) => ({ kluc: `u${u.id}`, minuta: u.minuta, udalost: u as Udalost | null, text: null as string | null })),
    ...(komentar.data ?? []).map((k) => ({ kluc: `k${k.id}`, minuta: k.minuta, udalost: null, text: k.text })),
  ].sort((a, b) => (a.minuta ?? 999) - (b.minuta ?? 999));
  const hraciZostavy = zostava.data?.vsetky ?? [];
  const pocetVidei = (videa.data ?? []).length;

  const striedany = (u: Udalost) => {
    if (u.striedany_hrac_meno) return u.striedany_hrac_meno;
    const h = [...udalosti.map((x) => x.hrac), ...hraciZostavy.map((x) => x.hrac)].find((x) => x && x.id === u.striedany_hrac_id);
    return h ? `${h.meno} ${h.priezvisko}` : null;
  };

  const informacie = (
    [
      ['Výkop', `${denVTyzdni(z.datum_cas)} ${datum(z.datum_cas)}, ${cas(z.datum_cas)}`],
      ['Miesto', z.miesto],
      ['Súťaž', [z.liga_nazov, z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ')],
      ['Rozhodca', z.rozhodca],
      ['Diváci', z.pocet_divakov ? z.pocet_divakov.toLocaleString('sk-SK') : null],
    ] as Array<[string, string | null | undefined]>
  ).filter(([, hodnota]) => Boolean(hodnota)) as Array<[string, string]>;

  return (
    <div className="ar-stranka ar-zapas-detail">
      <header className="ar-hlava ar-hlava--zapas">
        <div className="ar-kontajner">
          <Link to="/matches" className="ar-spat">
            <Ikona nazov="vlavo" velkost={14} /> Všetky zápasy
          </Link>
          <div className="ar-skore__stitky">
            <span className="ar-hlava__stitok">{[z.liga_nazov || 'Zápas', z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ')}</span>
            <span className={`ar-skore__stav ar-skore__stav--${stav}`}>{STAVY_ZAPASU[stav] ?? stav}</span>
          </div>
          <h1 className="ar-skryte">
            {nazovDomacich(z)} – {nazovHosti(z)}
          </h1>
          <div className="ar-skore">
            <Strana z={z} strana="domaci" logoKlubu={nastavenia.logo} />
            <div className="ar-skore__stred">
              {odohrany ? (
                <span className="ar-skore__vysledok">
                  {z.goly_domaci}
                  <i>:</i>
                  {z.goly_hostia}
                </span>
              ) : (
                <span className="ar-skore__cas">{cas(z.datum_cas)}</span>
              )}
              <small>{odohrany ? datum(z.datum_cas) : zaKolko(z.datum_cas) || datum(z.datum_cas)}</small>
            </div>
            <Strana z={z} strana="hostia" logoKlubu={nastavenia.logo} />
          </div>

          {goly.length > 0 && (
            <div className="ar-strelci">
              {(['domaci', 'hostia'] as const).map((strana) => (
                <ul key={strana} className={`ar-strelci__strana ar-strelci__strana--${strana}`}>
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
      </header>

      <div className="ar-sekcia ar-sekcia--hore">
        <div className="ar-kontajner ar-zapas-detail__mriezka">
          <div className="ar-zapas-detail__hlavny">
            {priebeh.length > 0 && (
              <section aria-labelledby="ar-priebeh">
                <h2 id="ar-priebeh" className="ar-skupina__nadpis ar-skupina__nadpis--male">
                  Priebeh zápasu
                </h2>
                <ol className="ar-priebeh">
                  {priebeh.map((p) => {
                    if (!p.udalost) {
                      return (
                        <li key={p.kluc} className="ar-priebeh__polozka ar-priebeh__polozka--text">
                          <span className="ar-priebeh__minuta">{p.minuta != null ? `${p.minuta}'` : ''}</span>
                          <p>{p.text}</p>
                        </li>
                      );
                    }
                    const u = p.udalost;
                    const typ = TYPY[u.typ] ?? { nazov: u.typ, znak: '•' };
                    const asistencia = u.typ === 'gol' ? asistencie.find((a) => a.minuta === u.minuta) : undefined;
                    return (
                      <li key={p.kluc} className={`ar-priebeh__polozka ar-priebeh__polozka--${stranaUdalosti(u, z)}`}>
                        <span className="ar-priebeh__minuta">{u.minuta != null ? `${u.minuta}'` : ''}</span>
                        <span className={`ar-priebeh__znak ar-priebeh__znak--${u.typ}`} aria-hidden="true">
                          {typ.znak}
                        </span>
                        <span className="ar-priebeh__text">
                          <strong>{menoHraca(u)}</strong>
                          <small>
                            {typ.nazov}
                            {u.typ === 'striedanie' && striedany(u) ? ` za ${striedany(u)}` : ''}
                            {asistencia ? ` · asistencia ${menoHraca(asistencia)}` : ''}
                            {' · '}
                            {stranaUdalosti(u, z) === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}
                          </small>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {hraciZostavy.length > 0 && (
              <section aria-labelledby="ar-zostavy">
                <h2 id="ar-zostavy" className="ar-skupina__nadpis ar-skupina__nadpis--male">
                  Zostavy
                </h2>
                <div className="ar-zostavy">
                  {(['domaci', 'hostia'] as const)
                    .filter((strana) => hraciZostavy.some((h) => h.strana === strana))
                    .map((strana) => (
                      <div key={strana} className="ar-zostavy__strana">
                        <h3>{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</h3>
                        {(['zakladna', 'lavicka'] as const).map((zaradenie) => {
                          const hraci = hraciZostavy.filter((h) => h.strana === strana && h.zaradenie === zaradenie);
                          if (hraci.length === 0) return null;
                          return (
                            <div key={zaradenie}>
                              <span className="ar-zostavy__skupina">{zaradenie === 'zakladna' ? 'Základná zostava' : 'Náhradníci'}</span>
                              <ul>
                                {hraci.map((h) => (
                                  <li key={h.id}>
                                    <span className="ar-zostavy__cislo">{h.hrac?.cislo_dresu ?? h.hostujuci_hrac_cislo ?? ''}</span>
                                    {h.hrac ? <Link to={`/players/${h.hrac.id}`}>{menoHraca(h)}</Link> : <span>{menoHraca(h)}</span>}
                                    {h.kapitan && (
                                      <abbr title="Kapitán" className="ar-zostavy__kapitan">
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
              <div className="ar-prazdne">
                <strong>{odohrany ? 'Bez priebehu' : 'Zápas sa ešte nehral'}</strong>
                <p>{odohrany ? 'K tomuto zápasu nie je zverejnený priebeh ani zostavy.' : 'Zostavy a priebeh zverejníme počas zápasu.'}</p>
              </div>
            )}
          </div>

          <aside className="ar-zapas-detail__bok">
            <dl className="ar-udaje" aria-label="Informácie o zápase">
              {informacie.map(([nazov, hodnota]) => (
                <div key={nazov}>
                  <dt>{nazov}</dt>
                  <dd>{hodnota}</dd>
                </div>
              ))}
            </dl>
            {z.poznamky && <p className="ar-zapas-detail__poznamky">{z.poznamky}</p>}

            {(z.video_url || pocetVidei > 0 || z.fotogaleria_id || z.clanok?.slug) && (
              <div className="ar-odkazy-zapasu">
                {z.clanok?.slug && (
                  <Link to={`/clanek/${z.clanok.slug}`}>
                    <Ikona nazov="spravy" /> <span>{z.clanok.nazov || 'Článok zo zápasu'}</span>
                    <Ikona nazov="vpravo" velkost={14} />
                  </Link>
                )}
                {z.fotogaleria_id && (
                  <Link to={`/galleries/${z.fotogaleria_id}`}>
                    <Ikona nazov="foto" /> <span>Fotogaléria</span>
                    <Ikona nazov="vpravo" velkost={14} />
                  </Link>
                )}
                {pocetVidei > 0 ? (
                  <Link to={`/videa?zapas=${z.id}`}>
                    <Ikona nazov="play" /> <span>Videá zo zápasu ({pocetVidei})</span>
                    <Ikona nazov="vpravo" velkost={14} />
                  </Link>
                ) : (
                  z.video_url && (
                    <a href={z.video_url} target="_blank" rel="noopener noreferrer">
                      <Ikona nazov="play" /> <span>Záznam zápasu</span>
                      <Ikona nazov="von" velkost={14} />
                    </a>
                  )
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Zapas;
