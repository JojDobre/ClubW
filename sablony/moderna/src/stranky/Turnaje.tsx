// Umiestnenie: sablony/moderna/src/stranky/Turnaje.tsx
// Turnaje: zoznam (/turnaje) a detail (/turnaje/:id) so skupinami
// (tabuľka a výsledky) a vyraďovacím pavúkom.

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { NenajdenyObsah } from './Nenajdena';
import { Chyba, Erb, HlavickaStranky, Ikona, Nacitava, Prazdne, datum, useApi, useTitulok } from '../spolocne';

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
  vyhry: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  body: number;
  postupuje: boolean;
}
interface Skupina {
  nazov: string;
  timy: TimTurnaja[];
  tabulka: RiadokSkupiny[];
  zapasy: Array<{ kod: string; kolo: number; domaci: number; hostia: number; skore_domaci: number | null; skore_hostia: number | null }>;
}
interface Turnaj {
  id: number;
  nazov: string;
  popis: string | null;
  logo: string | null;
  typ: string;
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
  <div className="md-pavuk__zapas">
    {(['domaci', 'hostia'] as const).map((strana) => {
      const tim = z[strana];
      const skore = strana === 'domaci' ? z.skore_domaci : z.skore_hostia;
      return (
        <div key={strana} className={`md-pavuk__tim${z.vitaz === strana ? ' is-vitaz' : ''}`}>
          <span>
            {tim ? <Erb nazov={tim.nazov} logo={tim.logo} velkost="xs" /> : null}
            {tim?.nazov ?? <em>Čaká sa</em>}
          </span>
          <strong>{skore ?? ''}</strong>
        </div>
      );
    })}
  </div>
);

const ZoznamTurnajov: React.FC = () => {
  const turnaje = useApi<Turnaj[]>('/tournaments');
  useTitulok('Turnaje');
  return (
    <div className="md-stranka">
      <HlavickaStranky stitok="Turnaje" nadpis="Turnaje klubu." popis="Skupiny, výsledky a vyraďovacie pavúky." />
      <div className="md-kontajner">
        {turnaje.nacitava ? (
          <Nacitava text="Načítavam turnaje…" />
        ) : turnaje.chyba ? (
          <Chyba text={turnaje.chyba} />
        ) : (turnaje.data ?? []).length === 0 ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne turnaje" />
        ) : (
          <div className="md-mriezka-timov">
            {turnaje.data!.map((t) => (
              <Link key={t.id} to={`/turnaje/${t.id}`} className="md-karta-timu">
                <Erb nazov={t.nazov} logo={t.logo} velkost="lg" />
                <span className="md-karta-timu__text">
                  <span className="md-stitok">{obdobie(t) || 'Turnaj'}</span>
                  <strong>{t.nazov}</strong>
                  <small>{t.vitaz_nazov ? `Víťaz: ${t.vitaz_nazov}` : t.status === 'prebieha' ? 'Práve prebieha' : 'Výsledky a pavúk'}</small>
                </span>
                <span className="md-karta-timu__sipka" aria-hidden="true">
                  <Ikona nazov="sipka" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DetailTurnaja: React.FC<{ id: string }> = ({ id }) => {
  const turnaj = useApi<Turnaj>(`/tournaments/${encodeURIComponent(id)}`);
  const t = turnaj.data;
  useTitulok(t?.nazov);

  if (turnaj.nacitava) return <Nacitava text="Načítavam turnaj…" />;
  if (turnaj.stav === 404) return <NenajdenyObsah nadpis="Tento turnaj sme nenašli." spat={{ odkaz: '/turnaje', text: 'Všetky turnaje' }} />;
  if (turnaj.chyba || !t) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={turnaj.chyba || 'Turnaj sa nepodarilo načítať.'} />
      </div>
    );
  }

  const skupiny = t.skupiny?.skupiny ?? [];
  const pavuk = t.pavuk;

  return (
    <div className="md-stranka">
      <HlavickaStranky stitok={obdobie(t) || 'Turnaj'} nadpis={t.nazov} popis={t.popis} spat={{ odkaz: '/turnaje', text: 'Všetky turnaje' }}>
        {t.vitaz_nazov && (
          <div className="md-vitaz">
            <Ikona nazov="pohar" velkost={22} />
            <span>
              <small>Víťaz</small>
              <strong>{t.vitaz_nazov}</strong>
            </span>
          </div>
        )}
      </HlavickaStranky>
      <div className="md-kontajner">
        {skupiny.length > 0 && (
          <section className="md-skupina">
            <h2 className="md-skupina__nadpis">Skupiny</h2>
            <div className="md-mriezka-skupin">
              {skupiny.map((s) => (
                <div key={s.nazov} className="md-karta md-karta--tabulka md-skupina-turnaja">
                  <h3>Skupina {s.nazov}</h3>
                  <div className="md-tabulka-obal">
                    <table className="md-tabulka md-tabulka--kompaktna">
                      <thead>
                        <tr>
                          <th className="md-tabulka__poz">#</th>
                          <th className="md-tabulka__tim">Tím</th>
                          <th>Z</th>
                          <th>Skóre</th>
                          <th>B</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.tabulka.map((r) => (
                          <tr key={r.tim.tim_id ?? r.tim.nazov} className={r.postupuje ? 'is-postup' : ''}>
                            <td className="md-tabulka__poz">{r.poradie}</td>
                            <td className="md-tabulka__tim">
                              <span>
                                <Erb nazov={r.tim.nazov} logo={r.tim.logo} velkost="xs" />
                                <span className="md-tabulka__nazov">{r.tim.nazov}</span>
                              </span>
                            </td>
                            <td>{r.zapasy}</td>
                            <td className="md-tabulka__skore">
                              {r.goly_za}:{r.goly_proti}
                            </td>
                            <td className="md-tabulka__body">{r.body}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {s.zapasy.length > 0 && (
                    <ul className="md-vysledky-skupiny">
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
            {t.skupiny?.postupuju ? <p className="md-legenda">Zvýraznené tímy postupujú do vyraďovacej časti.</p> : null}
          </section>
        )}

        {pavuk && pavuk.kola.length > 0 && (
          <section className="md-skupina">
            <h2 className="md-skupina__nadpis">Vyraďovacia časť</h2>
            <div className="md-pavuk md-posuvnik">
              {pavuk.kola.map((kolo) => (
                <div key={kolo.poradie} className="md-pavuk__kolo">
                  <h3>{kolo.nazov}</h3>
                  <div className="md-pavuk__zapasy">
                    {kolo.zapasy.map((z) => (
                      <ZapasVPavuku key={z.kod} z={z} />
                    ))}
                  </div>
                </div>
              ))}
              {pavuk.o_tretie && (
                <div className="md-pavuk__kolo">
                  <h3>O 3. miesto</h3>
                  <div className="md-pavuk__zapasy">
                    <ZapasVPavuku z={pavuk.o_tretie} />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {skupiny.length === 0 && !(pavuk && pavuk.kola.length > 0) && <Prazdne nadpis="Rozpis turnaja zatiaľ nie je zverejnený" />}
      </div>
    </div>
  );
};

const Turnaje: React.FC = () => {
  const { id } = useParams();
  return id ? <DetailTurnaja id={id} /> : <ZoznamTurnajov />;
};

export default Turnaje;
