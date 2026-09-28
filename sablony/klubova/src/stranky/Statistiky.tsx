// Umiestnenie: sablony/klubova/src/stranky/Statistiky.tsx
// Klub v číslach: súhrn klubu vo veľkých červených číslach (ako Úspechy
// na úvode), bilancia hlavného tímu na červenom pozadí so vzorom
// a rebríčky strelcov a nahrávačov v tabuľkách.

import React from 'react';
import { useNastavenia, useNastaveniaSablony } from '@clubw/jadro';
import { Rebricek, type Poradie } from './Liga';
import { Chyba, HlavickaStranky, Nacitava, Sekcia } from '../casti';
import { NadpisStredovy, useApi, useTitulok, zoradTimy, useUpravy, type Liga, type RiadokTabulky, type Tim } from '../spolocne';

interface Suhrn {
  totalArticles: number;
  totalTeams: number;
  totalPlayers: number;
  totalStaff: number;
  finishedMatches: number;
  totalGoals: number;
}

const Statistiky: React.FC = () => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<{ hraci_tim: number | null }>();
  const suhrn = useApi<Suhrn>('/stats');
  const timy = useApi<Tim[]>('/teams');
  const zoradene = zoradTimy(timy.data);
  const hlavny = (s.hraci_tim ? zoradene.find((t) => t.id === Number(s.hraci_tim)) : null) ?? zoradene.find((t) => t.typ === 'muzi') ?? zoradene[0] ?? null;
  const ligy = useApi<Liga[]>('/leagues');
  const liga =
    (ligy.data ?? []).find((l) => hlavny && l.tim_id === hlavny.id && l.format !== 'turnaj') ?? (ligy.data ?? []).find((l) => l.format !== 'turnaj') ?? null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);
  const strelci = useApi<Poradie[]>(liga ? `/leagues/${liga.id}/top-scorers?typ=gol&limit=10` : null);
  const nahravaci = useApi<Poradie[]>(liga ? `/leagues/${liga.id}/top-scorers?typ=asistencia&limit=10` : null);
  useTitulok('Štatistiky');

  const riadok = (tabulka.data ?? []).find((r) => r.tim_id === (hlavny?.id ?? liga?.tim_id));
  const d = suhrn.data;
  const cisla = (
    [
      ['Tímov', d?.totalTeams],
      ['Hráčov', d?.totalPlayers],
      ['Odohraných zápasov', d?.finishedMatches],
      ['Strelených gólov', d?.totalGoals],
      ['Článkov', d?.totalArticles],
      ['Trénerov a členov RT', d?.totalStaff],
    ] as Array<[string, number | undefined]>
  ).filter(([, n]) => typeof n === 'number') as Array<[string, number]>;

  return (
    <div className="kl-stranka kl-statistiky">
      <HlavickaStranky stitok={u.text('stranka_statistiky_stitok', 'Štatistiky')} nadpis={`${nastavenia.nazov} v číslach`} />
      {suhrn.nacitava ? (
        <Nacitava text="Načítavam štatistiky…" />
      ) : suhrn.chyba ? (
        <Sekcia className="kl-sekcia--hore">
          <Chyba text={suhrn.chyba} />
        </Sekcia>
      ) : (
        <>
          <Sekcia className="kl-sekcia--hore kl-sekcia--mriezka" ariaLabel="Klub v číslach">
            <div className="kl-cisla">
              {cisla.map(([nazov, n]) => (
                <div key={nazov} className="kl-cislo">
                  <strong>{n.toLocaleString('sk-SK')}</strong>
                  <span>{nazov}</span>
                </div>
              ))}
            </div>
          </Sekcia>

          {liga && riadok && (
            <section className="kl-bilancia" aria-label={`Bilancia v súťaži ${liga.nazov}`}>
              <div className="kl-kontajner">
                <span className="kl-bilancia__stitok">
                  {hlavny?.nazov ?? nastavenia.nazov} · {liga.nazov}
                </span>
                <div className="kl-bilancia__cisla">
                  <div className="kl-bilancia__poradie">
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
              </div>
            </section>
          )}

          {liga && ((strelci.data ?? []).length > 0 || (nahravaci.data ?? []).length > 0) && (
            <Sekcia className="kl-sekcia--suvisiace kl-sekcia--mriezka" ariaLabel="Rebríčky">
              <NadpisStredovy nadpis="Rebríčky" />
              <div className="kl-dva-stlpce">
                <div>
                  <h2 className="kl-skupina__nadpis kl-skupina__nadpis--male">Strelci</h2>
                  <Rebricek riadky={(strelci.data ?? []).slice(0, 8)} stlpec="Góly" />
                </div>
                <div>
                  <h2 className="kl-skupina__nadpis kl-skupina__nadpis--male">Nahrávači</h2>
                  <Rebricek riadky={(nahravaci.data ?? []).slice(0, 8)} stlpec="Asist." />
                </div>
              </div>
            </Sekcia>
          )}
        </>
      )}
    </div>
  );
};

export default Statistiky;
