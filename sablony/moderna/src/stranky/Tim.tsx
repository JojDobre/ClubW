// Umiestnenie: sablony/moderna/src/stranky/Tim.tsx
// Detail tímu: tmavá hlavička s erbom a záložky Káder, Zápasy,
// Tabuľka a Realizačný tím.

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useNastavenia } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import {
  Chyba,
  Erb,
  Ikona,
  KartaClena,
  KartaHraca,
  Nacitava,
  POZICIE,
  Prazdne,
  RiadokZapasu,
  TabulkaSutaze,
  Zalozky,
  useApi,
  useTitulok,
  useZalozkaVAdrese,
  type ClenTimu,
  type Hrac,
  type Liga,
  type RiadokTabulky,
  type Tim as TypTimu,
  type Zapas,
} from '../spolocne';

type Zalozka = 'kader' | 'zapasy' | 'tabulka' | 'realizacny-tim';

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

const Tim: React.FC = () => {
  const { id = '' } = useParams();
  const { nastavenia } = useNastavenia();
  const tim = useApi<TypTimu>(`/teams/${encodeURIComponent(id)}`);
  const hraci = useApi<{ hraci: Hrac[] }>(tim.data ? `/teams/${tim.data.id}/players` : null);
  const clenovia = useApi<{ realizacny_tim: ClenTimu[] }>(tim.data ? `/teams/${tim.data.id}/staff` : null);
  const zapasy = useApi<Zapas[]>(tim.data ? `/matches?tim_id=${tim.data.id}&limit=100` : null);
  const ligy = useApi<Liga[]>(tim.data ? '/leagues' : null);
  const liga = (ligy.data ?? []).find((l) => l.tim_id === tim.data?.id && l.format !== 'turnaj') ?? null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);

  const kader = hraci.data?.hraci ?? [];
  const realizacny = clenovia.data?.realizacny_tim ?? [];
  const vsetkyZapasy = zapasy.data ?? [];
  const program = vsetkyZapasy.filter((z) => z.status === 'naplanovany' && new Date(z.datum_cas).getTime() > Date.now() - 3 * 3_600_000).sort((a, b) => a.datum_cas.localeCompare(b.datum_cas));
  const vysledky = vsetkyZapasy.filter((z) => z.status === 'ukonceny' || z.status === 'prebieha').sort((a, b) => b.datum_cas.localeCompare(a.datum_cas));

  const moznosti: Array<{ kluc: Zalozka; nazov: string; pocet?: number }> = [
    { kluc: 'kader', nazov: 'Káder', pocet: kader.length },
    { kluc: 'zapasy', nazov: 'Zápasy', pocet: vsetkyZapasy.length },
    ...(liga && (tabulka.data ?? []).length > 0 ? [{ kluc: 'tabulka' as const, nazov: 'Tabuľka' }] : []),
    ...(realizacny.length > 0 ? [{ kluc: 'realizacny-tim' as const, nazov: 'Realizačný tím', pocet: realizacny.length }] : []),
  ];
  const [zalozka, setZalozka] = useZalozkaVAdrese<Zalozka>(moznosti.map((m) => m.kluc), 'kader');

  useTitulok(tim.data?.nazov);

  if (tim.nacitava) return <Nacitava text="Načítavam tím…" />;
  if (tim.stav === 404) return <NenajdenyObsah nadpis="Tento tím sme nenašli." spat={{ odkaz: '/teams', text: 'Všetky tímy' }} />;
  if (tim.chyba || !tim.data) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={tim.chyba || 'Tím sa nepodarilo načítať.'} />
      </div>
    );
  }

  const t = tim.data;
  const veky = kader.map((h) => h.vek).filter((v): v is number => typeof v === 'number');
  const priemernyVek = veky.length ? (veky.reduce((a, b) => a + b, 0) / veky.length).toFixed(1).replace('.', ',') : null;

  return (
    <div className="md-detail">
      <section className="md-detail-hero">
        <div className="md-kontajner md-detail-hero__obsah">
          <Link to="/teams" className="md-spat md-spat--svetly">
            <Ikona nazov="spat" /> Všetky tímy
          </Link>
          <div className="md-detail-hero__riadok">
            <Erb nazov={t.nazov} logo={t.logo || nastavenia.logo} velkost="xl" />
            <div>
              {t.vekova_kategoria && <div className="md-stitok md-stitok--svetly">{t.vekova_kategoria}</div>}
              <h1>{t.nazov}</h1>
              {t.popis && <p className="md-detail-hero__popis">{t.popis}</p>}
            </div>
          </div>
          <dl className="md-fakty md-fakty--svetle">
            <div>
              <dt>Hráči</dt>
              <dd>{kader.length}</dd>
            </div>
            {priemernyVek && (
              <div>
                <dt>Priemerný vek</dt>
                <dd>{priemernyVek}</dd>
              </div>
            )}
            {liga && (
              <div>
                <dt>Súťaž</dt>
                <dd>{liga.nazov}</dd>
              </div>
            )}
            {liga && (tabulka.data ?? []).some((r) => r.tim_id === t.id) && (
              <div>
                <dt>Miesto v tabuľke</dt>
                <dd>{tabulka.data!.find((r) => r.tim_id === t.id)!.pozicia}.</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <div className="md-kontajner md-detail__telo">
        <Zalozky moznosti={moznosti} aktivna={zalozka} onZmena={setZalozka} popis="Časti tímu" />

        {zalozka === 'kader' &&
          (hraci.nacitava ? (
            <Nacitava text="Načítavam káder…" />
          ) : kader.length === 0 ? (
            <Prazdne nadpis="Káder zatiaľ nie je zverejnený" />
          ) : (
            podlaPozicie(kader).map((s) => (
              <section key={s.kluc} className="md-skupina">
                <h2 className="md-skupina__nadpis">
                  {s.nazov} <span>{s.hraci.length}</span>
                </h2>
                <div className="md-mriezka-hracov">
                  {s.hraci.map((h) => (
                    <KartaHraca key={h.id} hrac={h} />
                  ))}
                </div>
              </section>
            ))
          ))}

        {zalozka === 'zapasy' &&
          (zapasy.nacitava ? (
            <Nacitava text="Načítavam zápasy…" />
          ) : vsetkyZapasy.length === 0 ? (
            <Prazdne nadpis="Tím zatiaľ nemá žiadne zápasy" />
          ) : (
            <div className="md-dva-stlpce">
              <section className="md-karta">
                <h2 className="md-karta__nadpis">Program</h2>
                {program.length === 0 ? (
                  <p className="md-tlmene">Žiadne naplánované zápasy.</p>
                ) : (
                  <div className="md-zoznam-zapasov">
                    {program.slice(0, 6).map((z) => (
                      <RiadokZapasu key={z.id} zapas={z} />
                    ))}
                  </div>
                )}
              </section>
              <section className="md-karta">
                <h2 className="md-karta__nadpis">Výsledky</h2>
                {vysledky.length === 0 ? (
                  <p className="md-tlmene">Zatiaľ žiadne odohrané zápasy.</p>
                ) : (
                  <div className="md-zoznam-zapasov">
                    {vysledky.slice(0, 6).map((z) => (
                      <RiadokZapasu key={z.id} zapas={z} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ))}

        {zalozka === 'tabulka' && liga && (
          <section>
            <div className="md-sekcia__hlava md-sekcia__hlava--mala">
              <div>
                {liga.sezona && <div className="md-stitok">Sezóna {liga.sezona}</div>}
                <h2>{liga.nazov}</h2>
              </div>
              <Link to={`/leagues/${liga.id}`} className="md-odkaz-sipka">
                Detail súťaže <Ikona nazov="sipka" />
              </Link>
            </div>
            <div className="md-karta md-karta--tabulka">
              <TabulkaSutaze riadky={tabulka.data ?? []} zvyraznitTim={t.id} forma={liga.zobrazit_formu !== false} lenBody={liga.rezim_tabulky === 'len_body'} />
            </div>
          </section>
        )}

        {zalozka === 'realizacny-tim' && (
          <div className="md-mriezka-clenov">
            {realizacny.map((c) => (
              <KartaClena key={c.id} clen={c} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Tim;
