// Umiestnenie: sablony/derby/src/stranky/Turnaje.tsx
// Turnaje: zoznam (/turnaje) v kartách a detail (/turnaje/:id) so
// skupinami (tabuľka a výsledky) a vyraďovacím pavúkom.

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { NenajdenyObsah } from './Nenajdena';
import { Chyba, ChybaStranky, HlavickaStranky, Nacitava, Prazdne, Sekcia } from '../casti';
import { Erb, Ikona, datum, useApi, useTitulok, useUpravy } from '../spolocne';

interface TimTurnaja {
  nazov: string;
  tim_id: number | null;
  logo: string | null;
}
interface ZapasPavuka {
  kod: string;
  domaci: TimTurnaja | null;
  hostia: TimTurnaja | null;
  skore_domaci: number | null;
  skore_hostia: number | null;
  vitaz: 'domaci' | 'hostia' | null;
}
interface RiadokSkupiny {
  poradie: number;
  tim: TimTurnaja;
  zapasy: number;
  goly_za: number;
  goly_proti: number;
  body: number;
  postupuje: boolean;
}
interface Skupina {
  nazov: string;
  timy: TimTurnaja[];
  tabulka: RiadokSkupiny[];
  zapasy: Array<{ kod: string; domaci: number; hostia: number; skore_domaci: number | null; skore_hostia: number | null }>;
}
interface Turnaj {
  id: number;
  nazov: string;
  popis: string | null;
  logo: string | null;
  status: string;
  datum_start: string | null;
  datum_koniec: string | null;
  vitaz_nazov: string | null;
  skupiny?: { postupuju: number; skupiny: Skupina[] };
  pavuk?: { kola: Array<{ nazov: string; poradie: number; zapasy: ZapasPavuka[] }>; o_tretie?: ZapasPavuka | null };
}

const obdobie = (t: Turnaj) =>
  [datum(t.datum_start), t.datum_koniec && t.datum_koniec !== t.datum_start ? datum(t.datum_koniec) : null].filter(Boolean).join(' – ');

const ZapasVPavuku: React.FC<{ z: ZapasPavuka }> = ({ z }) => (
  <div className="dr-pavuk__zapas">
    {(['domaci', 'hostia'] as const).map((strana) => {
      const tim = z[strana];
      const skore = strana === 'domaci' ? z.skore_domaci : z.skore_hostia;
      return (
        <div key={strana} className={`dr-pavuk__tim${z.vitaz === strana ? ' is-vitaz' : ''}`}>
          <span>
            {tim && <Erb nazov={tim.nazov} logo={tim.logo} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} />}
            {tim?.nazov ?? <em>Čaká sa</em>}
          </span>
          <strong>{skore ?? ''}</strong>
        </div>
      );
    })}
  </div>
);

const ZoznamTurnajov: React.FC = () => {
  const u = useUpravy();
  const turnaje = useApi<Turnaj[]>('/tournaments');
  useTitulok('Turnaje');
  return (
    <div className="dr-stranka dr-turnaje">
      <HlavickaStranky stitok={u.text('stranka_turnaje_stitok', 'Súťaže')} nadpis={u.text('stranka_turnaje_nadpis', 'Turnaje')} />
      <Sekcia className="dr-sekcia--hore dr-sekcia--mriezka">
        {turnaje.nacitava ? (
          <Nacitava text="Načítavam turnaje…" />
        ) : turnaje.chyba ? (
          <Chyba text={turnaje.chyba} />
        ) : (turnaje.data ?? []).length === 0 ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne turnaje" />
        ) : (
          <div className="dr-mriezka-3 dr-mriezka-riadkov">
            {turnaje.data!.map((t) => (
              <Link key={t.id} to={`/turnaje/${t.id}`} className="dr-riadok-karta">
                <Erb nazov={t.nazov} logo={t.logo} ton="akcent" velky />
                <span className="dr-riadok-karta__text">
                  <span className="dr-clanok__kategoria">{obdobie(t) || 'Turnaj'}</span>
                  <strong>{t.nazov}</strong>
                  <small>{t.vitaz_nazov ? `Víťaz: ${t.vitaz_nazov}` : t.status === 'prebieha' ? 'Práve prebieha' : 'Výsledky a pavúk'}</small>
                </span>
                <Ikona nazov="vpravo" />
              </Link>
            ))}
          </div>
        )}
      </Sekcia>
    </div>
  );
};

const DetailTurnaja: React.FC<{ id: string }> = ({ id }) => {
  const turnaj = useApi<Turnaj>(`/tournaments/${encodeURIComponent(id)}`);
  const t = turnaj.data;
  useTitulok(t?.nazov);

  if (turnaj.nacitava) return <Nacitava text="Načítavam turnaj…" />;
  if (turnaj.stav === 404) return <NenajdenyObsah nadpis="Tento turnaj sme nenašli" spat={{ odkaz: '/turnaje', text: 'Všetky turnaje' }} />;
  if (turnaj.chyba || !t) return <ChybaStranky text={turnaj.chyba || 'Turnaj sa nepodarilo načítať.'} />;

  const skupiny = t.skupiny?.skupiny ?? [];
  const pavuk = t.pavuk;

  return (
    <div className="dr-stranka dr-turnaj">
      <HlavickaStranky stitok={obdobie(t) || 'Turnaj'} nadpis={t.nazov} spat={{ odkaz: '/turnaje', text: 'Všetky turnaje' }}>
        {t.popis && <p className="dr-hlava__popis">{t.popis}</p>}
        {t.vitaz_nazov && (
          <div className="dr-vitaz">
            <Ikona nazov="pohar" velkost={22} />
            <span>
              <small>Víťaz</small>
              <strong>{t.vitaz_nazov}</strong>
            </span>
          </div>
        )}
      </HlavickaStranky>

      {skupiny.length > 0 && (
        <Sekcia className="dr-sekcia--hore dr-skupina" ariaLabel="Skupiny">
          <h2 className="dr-skupina__nadpis">Skupiny</h2>
          <div className="dr-mriezka-lig">
            {skupiny.map((s) => (
              <div key={s.nazov} className="dr-liga-karta">
                <div className="dr-liga-karta__hlava">
                  <h3>Skupina {s.nazov}</h3>
                </div>
                <div className="dr-tabulka-obal">
                  <table className="dr-tabulka dr-tabulka--sutaz">
                    <thead>
                      <tr>
                        <th className="dr-tabulka__poz">#</th>
                        <th className="dr-tabulka__tim">Tím</th>
                        <th>Z</th>
                        <th>Skóre</th>
                        <th>B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.tabulka.map((r) => (
                        <tr key={r.tim.tim_id ?? r.tim.nazov} className={r.postupuje ? 'is-nas' : ''}>
                          <td className="dr-tabulka__poz">{r.poradie}</td>
                          <td className="dr-tabulka__tim">
                            <span>
                              <Erb nazov={r.tim.nazov} logo={r.tim.logo} />
                              <span className="dr-tabulka__nazov">{r.tim.nazov}</span>
                            </span>
                          </td>
                          <td>{r.zapasy}</td>
                          <td>
                            {r.goly_za}:{r.goly_proti}
                          </td>
                          <td className="dr-tabulka__body">{r.body}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {s.zapasy.length > 0 && (
                  <ul className="dr-vysledky-skupiny">
                    {s.zapasy.map((z) => (
                      <li key={z.kod}>
                        <span>{s.timy[z.domaci]?.nazov}</span>
                        <strong>{z.skore_domaci !== null ? `${z.skore_domaci}:${z.skore_hostia}` : '–:–'}</strong>
                        <span>{s.timy[z.hostia]?.nazov}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          {t.skupiny?.postupuju ? <p className="dr-legenda">Zvýraznené tímy postupujú do vyraďovacej časti.</p> : null}
        </Sekcia>
      )}

      {pavuk && pavuk.kola.length > 0 && (
        <Sekcia className={`dr-skupina${skupiny.length ? '' : ' dr-sekcia--hore'}`} ariaLabel="Vyraďovacia časť">
          <h2 className="dr-skupina__nadpis">Vyraďovacia časť</h2>
          <div className="dr-pavuk">
            {pavuk.kola.map((kolo) => (
              <div key={kolo.poradie} className="dr-pavuk__kolo">
                <h3>{kolo.nazov}</h3>
                <div className="dr-pavuk__zapasy">
                  {kolo.zapasy.map((z) => (
                    <ZapasVPavuku key={z.kod} z={z} />
                  ))}
                </div>
              </div>
            ))}
            {pavuk.o_tretie && (
              <div className="dr-pavuk__kolo">
                <h3>O 3. miesto</h3>
                <div className="dr-pavuk__zapasy">
                  <ZapasVPavuku z={pavuk.o_tretie} />
                </div>
              </div>
            )}
          </div>
        </Sekcia>
      )}

      {skupiny.length === 0 && !(pavuk && pavuk.kola.length > 0) && (
        <Sekcia className="dr-sekcia--hore dr-sekcia--mriezka">
          <Prazdne nadpis="Rozpis turnaja zatiaľ nie je zverejnený" />
        </Sekcia>
      )}
    </div>
  );
};

const Turnaje: React.FC = () => {
  const { id } = useParams();
  return id ? <DetailTurnaja id={id} /> : <ZoznamTurnajov />;
};

export default Turnaje;
