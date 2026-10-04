// Umiestnenie: sablony/arena/src/stranky/Liga.tsx
// Detail súťaže: pilulky Tabuľka / Zápasy / Strelci / Nahrávači, plná
// tabuľka s formou, zápasy súťaže v kartách podľa mesiaca a rebríčky.
// Zvolená časť sa drží v adrese (?cast=zapasy).

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { NenajdenyObsah } from './Nenajdena';
import { TYPY_SUTAZI } from './Ligy';
import { ChybaStranky, Filtre, HlavickaStranky, KartaZapasu, Nacitava, Prazdne, Sekcia, TabulkaSutaze } from '../casti';
import { podlaMesiaca, useApi, useTitulok, useVolbaVAdrese, type Liga as TypLigy, type RiadokTabulky, type Zapas } from '../spolocne';

type Cast = 'tabulka' | 'zapasy' | 'strelci' | 'nahravaci';

export interface Poradie {
  poradie: number;
  hrac: { id: number; meno: string; priezvisko: string; cislo_dresu: number | null; tim?: { nazov: string } | null };
  pocet: number;
}

/** Rebríček hráčov (strelci, nahrávači) v tabuľke so štýlom Arény. */
export const Rebricek: React.FC<{ riadky: Poradie[]; stlpec: string }> = ({ riadky, stlpec }) => (
  <div className="ar-tabulka-obal">
    <table className="ar-tabulka ar-tabulka--sutaz">
      <thead>
        <tr>
          <th className="ar-tabulka__poz">#</th>
          <th className="ar-tabulka__tim">Hráč</th>
          <th>{stlpec}</th>
        </tr>
      </thead>
      <tbody>
        {riadky.map((r) => (
          <tr key={r.hrac.id}>
            <td className="ar-tabulka__poz">{r.poradie}</td>
            <td className="ar-tabulka__tim">
              <Link to={`/players/${r.hrac.id}`} className="ar-tabulka__hrac">
                <span className="ar-tabulka__nazov">
                  {r.hrac.meno} {r.hrac.priezvisko}
                </span>
                {r.hrac.tim?.nazov && <small>{r.hrac.tim.nazov}</small>}
              </Link>
            </td>
            <td className="ar-tabulka__body">{r.pocet}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Liga: React.FC = () => {
  const { id = '' } = useParams();
  const liga = useApi<TypLigy>(`/leagues/${encodeURIComponent(id)}`);
  const l = liga.data;
  const tabulka = useApi<RiadokTabulky[]>(l ? `/leagues/${l.id}/table` : null);
  const zapasy = useApi<Zapas[]>(l ? `/matches?liga_id=${l.id}&limit=200` : null);
  const strelci = useApi<Poradie[]>(l ? `/leagues/${l.id}/top-scorers?typ=gol&limit=15` : null);
  const nahravaci = useApi<Poradie[]>(l ? `/leagues/${l.id}/top-scorers?typ=asistencia&limit=15` : null);

  const moznosti: Array<{ kluc: Cast; nazov: string }> = [
    { kluc: 'tabulka', nazov: 'Tabuľka' },
    { kluc: 'zapasy', nazov: 'Zápasy' },
    ...((strelci.data ?? []).length > 0 ? [{ kluc: 'strelci' as const, nazov: 'Strelci' }] : []),
    ...((nahravaci.data ?? []).length > 0 ? [{ kluc: 'nahravaci' as const, nazov: 'Nahrávači' }] : []),
  ];
  const [cast, setCast] = useVolbaVAdrese<Cast>(
    'cast',
    moznosti.map((m) => m.kluc),
    'tabulka'
  );
  useTitulok(l?.nazov);

  if (liga.nacitava) return <Nacitava text="Načítavam súťaž…" />;
  if (liga.stav === 404) return <NenajdenyObsah nadpis="Túto súťaž sme nenašli" spat={{ odkaz: '/leagues', text: 'Všetky súťaže' }} />;
  if (liga.chyba || !l) return <ChybaStranky text={liga.chyba || 'Súťaž sa nepodarilo načítať.'} />;

  const zoradene = [...(zapasy.data ?? [])].sort((a, b) => a.datum_cas.localeCompare(b.datum_cas));

  return (
    <div className="ar-stranka ar-liga">
      <HlavickaStranky
        stitok={[TYPY_SUTAZI[l.typ ?? ''] ?? l.typ_name, l.sezona ? `Sezóna ${l.sezona}` : null].filter(Boolean).join(' · ')}
        nadpis={l.nazov}
        spat={{ odkaz: '/leagues', text: 'Všetky súťaže' }}
      >
        {l.popis && <p className="ar-hlava__popis">{l.popis}</p>}
      </HlavickaStranky>

      <Sekcia className="ar-sekcia--filtre">
        <Filtre<Cast> popis="Časti súťaže" aktivna={cast} onZmena={setCast} moznosti={moznosti} />
      </Sekcia>

      {cast === 'tabulka' && (
        <Sekcia className="ar-sekcia--mriezka">
          {tabulka.nacitava ? (
            <Nacitava text="Načítavam tabuľku…" />
          ) : (tabulka.data ?? []).length === 0 ? (
            l.external_widget_url ? (
              <div className="ar-widget">
                <iframe src={l.external_widget_url} title={`Tabuľka ${l.nazov}`} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups" />
              </div>
            ) : (
              <Prazdne nadpis="Tabuľka zatiaľ nie je k dispozícii" />
            )
          ) : (
            <>
              <TabulkaSutaze riadky={tabulka.data!} zvyraznitTim={l.tim_id} forma={l.zobrazit_formu !== false} lenBody={l.rezim_tabulky === 'len_body'} />
              <p className="ar-legenda">Z – zápasy · V – výhry · R – remízy · P – prehry · B – body. Forma ukazuje posledných päť zápasov.</p>
            </>
          )}
        </Sekcia>
      )}

      {cast === 'zapasy' &&
        (zapasy.nacitava ? (
          <Nacitava text="Načítavam zápasy…" />
        ) : zoradene.length === 0 ? (
          <Sekcia className="ar-sekcia--mriezka">
            <Prazdne nadpis="Súťaž zatiaľ nemá zápasy" />
          </Sekcia>
        ) : (
          podlaMesiaca(zoradene).map((m) => (
            <Sekcia key={m.mesiac} className="ar-skupina" ariaLabel={m.mesiac}>
              <h2 className="ar-skupina__nadpis">{m.mesiac}</h2>
              <div className="ar-mriezka-3 ar-mriezka-zapasov">
                {m.zapasy.map((z) => (
                  <KartaZapasu key={z.id} zapas={z} />
                ))}
              </div>
            </Sekcia>
          ))
        ))}

      {cast === 'strelci' && (
        <Sekcia className="ar-sekcia--mriezka">
          <Rebricek riadky={strelci.data ?? []} stlpec="Góly" />
        </Sekcia>
      )}
      {cast === 'nahravaci' && (
        <Sekcia className="ar-sekcia--mriezka">
          <Rebricek riadky={nahravaci.data ?? []} stlpec="Asistencie" />
        </Sekcia>
      )}
    </div>
  );
};

export default Liga;
