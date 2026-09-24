// Umiestnenie: sablony/moderna/src/stranky/Liga.tsx
// Detail súťaže: plná tabuľka s formou, zápasy súťaže a strelci.

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { NenajdenyObsah } from './Nenajdena';
import {
  Chyba,
  HlavickaStranky,
  Nacitava,
  Prazdne,
  RiadokZapasu,
  TabulkaSutaze,
  Zalozky,
  podlaMesiaca,
  useApi,
  useTitulok,
  useZalozkaVAdrese,
  type Liga as TypLigy,
  type RiadokTabulky,
  type Zapas,
} from '../spolocne';

type Zalozka = 'tabulka' | 'zapasy' | 'strelci';

interface Strelec {
  poradie: number;
  hrac: { id: number; meno: string; priezvisko: string; cislo_dresu: number | null; tim?: { nazov: string } | null };
  pocet: number;
}

const Liga: React.FC = () => {
  const { id = '' } = useParams();
  const liga = useApi<TypLigy>(`/leagues/${encodeURIComponent(id)}`);
  const l = liga.data;
  const tabulka = useApi<RiadokTabulky[]>(l ? `/leagues/${l.id}/table` : null);
  const zapasy = useApi<Zapas[]>(l ? `/matches?liga_id=${l.id}&limit=200` : null);
  const strelci = useApi<Strelec[]>(l ? `/leagues/${l.id}/top-scorers?typ=gol&limit=15` : null);

  const moznosti: Array<{ kluc: Zalozka; nazov: string; pocet?: number }> = [
    { kluc: 'tabulka', nazov: 'Tabuľka' },
    { kluc: 'zapasy', nazov: 'Zápasy', pocet: (zapasy.data ?? []).length },
    ...((strelci.data ?? []).length > 0 ? [{ kluc: 'strelci' as const, nazov: 'Strelci' }] : []),
  ];
  const [zalozka, setZalozka] = useZalozkaVAdrese<Zalozka>(
    moznosti.map((m) => m.kluc),
    'tabulka'
  );
  useTitulok(l?.nazov);

  if (liga.nacitava) return <Nacitava text="Načítavam súťaž…" />;
  if (liga.stav === 404) return <NenajdenyObsah nadpis="Túto súťaž sme nenašli." spat={{ odkaz: '/leagues', text: 'Všetky súťaže' }} />;
  if (liga.chyba || !l) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={liga.chyba || 'Súťaž sa nepodarilo načítať.'} />
      </div>
    );
  }

  const zoradene = [...(zapasy.data ?? [])].sort((a, b) => a.datum_cas.localeCompare(b.datum_cas));

  return (
    <div className="md-stranka">
      <HlavickaStranky
        stitok={[l.typ_name, l.sezona ? `Sezóna ${l.sezona}` : null].filter(Boolean).join(' · ')}
        nadpis={l.nazov}
        popis={l.popis}
        spat={{ odkaz: '/leagues', text: 'Všetky súťaže' }}
      />
      <div className="md-kontajner">
        <Zalozky moznosti={moznosti} aktivna={zalozka} onZmena={setZalozka} popis="Časti súťaže" />

        {zalozka === 'tabulka' &&
          (tabulka.nacitava ? (
            <Nacitava text="Načítavam tabuľku…" />
          ) : (tabulka.data ?? []).length === 0 ? (
            l.external_widget_url ? (
              <div className="md-karta md-widget">
                <iframe src={l.external_widget_url} title={`Tabuľka ${l.nazov}`} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups" />
              </div>
            ) : (
              <Prazdne nadpis="Tabuľka zatiaľ nie je k dispozícii" />
            )
          ) : (
            <>
              <div className="md-karta md-karta--tabulka">
                <TabulkaSutaze riadky={tabulka.data!} zvyraznitTim={l.tim_id} forma={l.zobrazit_formu !== false} lenBody={l.rezim_tabulky === 'len_body'} />
              </div>
              <p className="md-legenda">
                Z – zápasy · V – výhry · R – remízy · P – prehry · B – body. Forma ukazuje posledných päť zápasov.
              </p>
            </>
          ))}

        {zalozka === 'zapasy' &&
          (zapasy.nacitava ? (
            <Nacitava text="Načítavam zápasy…" />
          ) : zoradene.length === 0 ? (
            <Prazdne nadpis="Súťaž zatiaľ nemá zápasy" />
          ) : (
            podlaMesiaca(zoradene).map((s) => (
              <section key={s.mesiac} className="md-skupina">
                <h2 className="md-skupina__nadpis">{s.mesiac}</h2>
                <div className="md-karta md-zoznam-zapasov md-zoznam-zapasov--karta">
                  {s.zapasy.map((z) => (
                    <RiadokZapasu key={z.id} zapas={z} />
                  ))}
                </div>
              </section>
            ))
          ))}

        {zalozka === 'strelci' && (
          <div className="md-karta md-karta--tabulka">
            <div className="md-tabulka-obal">
              <table className="md-tabulka">
                <thead>
                  <tr>
                    <th className="md-tabulka__poz">#</th>
                    <th className="md-tabulka__tim">Hráč</th>
                    <th>Góly</th>
                  </tr>
                </thead>
                <tbody>
                  {(strelci.data ?? []).map((s) => (
                    <tr key={s.hrac.id}>
                      <td className="md-tabulka__poz">{s.poradie}</td>
                      <td className="md-tabulka__tim">
                        <Link to={`/players/${s.hrac.id}`} className="md-tabulka__hrac">
                          <strong>
                            {s.hrac.meno} {s.hrac.priezvisko}
                          </strong>
                          {s.hrac.tim?.nazov && <small>{s.hrac.tim.nazov}</small>}
                        </Link>
                      </td>
                      <td className="md-tabulka__body">{s.pocet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Liga;
