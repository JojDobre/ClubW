// Umiestnenie: sablony/moderna/src/stranky/Statistiky.tsx
// Klub v číslach: súhrn klubu, bilancia hlavného tímu v súťaži
// a rebríčky strelcov a nahrávačov.

import React from 'react';
import { Link } from 'react-router-dom';
import { useNastavenia, useNastaveniaSablony } from '@clubw/jadro';
import { Chyba, HlavickaStranky, Nacitava, useApi, useTitulok, vyberHlavnyTim, type Liga, type RiadokTabulky, type Tim } from '../spolocne';

interface Suhrn {
  totalArticles: number;
  totalTeams: number;
  totalPlayers: number;
  totalStaff: number;
  totalMatches: number;
  finishedMatches: number;
  upcomingMatches: number;
  totalGoals: number;
}

interface Poradie {
  poradie: number;
  hrac: { id: number; meno: string; priezvisko: string; cislo_dresu: number | null };
  pocet: number;
}

const Rebricek: React.FC<{ nazov: string; riadky: Poradie[] }> = ({ nazov, riadky }) => (
  <section className="md-karta md-rebricek">
    <h2 className="md-karta__nadpis">{nazov}</h2>
    {riadky.length === 0 ? (
      <p className="md-tlmene">Zatiaľ bez záznamov.</p>
    ) : (
      <ol>
        {riadky.slice(0, 8).map((r, i) => (
          <li key={r.hrac.id} className={i === 0 ? 'is-prvy' : ''}>
            <span className="md-rebricek__poradie">{r.poradie}</span>
            <Link to={`/players/${r.hrac.id}`}>
              {r.hrac.meno} <strong>{r.hrac.priezvisko}</strong>
            </Link>
            <span className="md-rebricek__pocet">{r.pocet}</span>
          </li>
        ))}
      </ol>
    )}
  </section>
);

const Statistiky: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<{ tim_uvodu: number | null }>();
  const suhrn = useApi<Suhrn>('/stats');
  const timy = useApi<Tim[]>('/teams');
  const hlavny = vyberHlavnyTim(timy.data, s.tim_uvodu);
  const ligy = useApi<Liga[]>('/leagues');
  const liga = (ligy.data ?? []).find((l) => hlavny && l.tim_id === hlavny.id && l.format !== 'turnaj') ?? (ligy.data ?? []).find((l) => l.format !== 'turnaj') ?? null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);
  const strelci = useApi<Poradie[]>(liga ? `/leagues/${liga.id}/top-scorers?typ=gol&limit=10` : null);
  const nahravaci = useApi<Poradie[]>(liga ? `/leagues/${liga.id}/top-scorers?typ=asistencia&limit=10` : null);
  useTitulok('Štatistiky');

  const riadok = (tabulka.data ?? []).find((r) => r.tim_id === (hlavny?.id ?? liga?.tim_id));
  const d = suhrn.data;

  const cisla: Array<[string, number | undefined]> = [
    ['Tímov', d?.totalTeams],
    ['Hráčov', d?.totalPlayers],
    ['Odohraných zápasov', d?.finishedMatches],
    ['Strelených gólov', d?.totalGoals],
    ['Článkov', d?.totalArticles],
    ['Trénerov a členov RT', d?.totalStaff],
  ];

  return (
    <div className="md-stranka">
      <HlavickaStranky stitok="Štatistiky" nadpis={`${nastavenia.nazov} v číslach.`} popis="Súhrn klubu a sezóny, strelci a nahrávači." />
      <div className="md-kontajner">
        {suhrn.nacitava ? (
          <Nacitava text="Načítavam štatistiky…" />
        ) : suhrn.chyba ? (
          <Chyba text={suhrn.chyba} />
        ) : (
          <>
            <div className="md-cisla">
              {cisla
                .filter(([, n]) => typeof n === 'number')
                .map(([nazov, n]) => (
                  <div key={nazov} className="md-cislo">
                    <strong>{n!.toLocaleString('sk-SK')}</strong>
                    <span>{nazov}</span>
                  </div>
                ))}
            </div>

            {liga && riadok && (
              <section className="md-skupina">
                <h2 className="md-skupina__nadpis">
                  {hlavny?.nazov ?? nastavenia.nazov} · {liga.nazov}
                </h2>
                <div className="md-bilancia">
                  <div className="md-bilancia__poradie">
                    <strong>{riadok.pozicia}.</strong>
                    <span>miesto</span>
                  </div>
                  {(
                    [
                      ['Body', riadok.body],
                      ['Výhry', riadok.vitazstva],
                      ['Remízy', riadok.remizy],
                      ['Prehry', riadok.prehry],
                      ['Skóre', `${riadok.goly_za}:${riadok.goly_proti}`],
                    ] as Array<[string, string | number]>
                  ).map(([nazov, hodnota]) => (
                    <div key={nazov}>
                      <strong>{hodnota}</strong>
                      <span>{nazov}</span>
                    </div>
                  ))}
                </div>
                {riadok.zapasy > 0 && (
                  <div className="md-pomer" aria-label="Pomer výsledkov">
                    <span className="md-pomer__V" style={{ flexGrow: riadok.vitazstva }} />
                    <span className="md-pomer__R" style={{ flexGrow: riadok.remizy }} />
                    <span className="md-pomer__P" style={{ flexGrow: riadok.prehry }} />
                  </div>
                )}
              </section>
            )}

            {liga && (
              <div className="md-dva-stlpce">
                <Rebricek nazov="Strelci" riadky={strelci.data ?? []} />
                <Rebricek nazov="Nahrávači" riadky={nahravaci.data ?? []} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Statistiky;
