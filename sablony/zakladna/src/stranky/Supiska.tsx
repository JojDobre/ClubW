// Umiestnenie: sablony/zakladna/src/stranky/Supiska.tsx
// Súpiska - slúži pre /teams aj /teams/:id. V hlavičke výber tímu ako
// záložky a súhrn kádra, pod ňou rýchly skok na pozíciu. Hráči sú po
// pozíciách v mriežke kariet (KartaHraca z casti.tsx), na konci
// realizačný tím v kartách s okrúhlou fotkou.

import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useNastavenia } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, HlavickaStranky, KartaClena, KartaHraca, Nacitava, Prazdne, Sekcia } from '../casti';
import {
  POZICIE,
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
import './Supiska.css';

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

const Skupina: React.FC<{ id: string; nazov: string; pocet: number; stitok: string; children: React.ReactNode }> = ({ id, nazov, pocet, stitok, children }) => (
  <section className="zk-sup__skupina" id={id} aria-label={nazov}>
    <header className="zk-nadpis">
      <span className="zk-stitok">{stitok}</span>
      <h2>
        {nazov}
        <span>{pocet}</span>
      </h2>
    </header>
    {children}
  </section>
);

const SupiskaTimu: React.FC<{ tim: Tim }> = ({ tim }) => {
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const statistiky = useApi<StatistikaHraca[]>(`/teams/${tim.id}/players/stats`);
  const clenovia = useApi<{ realizacny_tim: ClenTimu[] }>(`/teams/${tim.id}/staff`);
  const podlaId = useMemo(() => new Map((statistiky.data ?? []).map((s) => [s.hrac_id, s])), [statistiky.data]);
  const skupiny = podlaPozicie(hraci.data?.hraci ?? []);
  const realizacny = clenovia.data?.realizacny_tim ?? [];

  const posunNa = (kluc: string) => {
    const ciel = document.getElementById(`zk-sup-${kluc}`);
    if (ciel) window.scrollTo({ top: ciel.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
  };

  if (hraci.nacitava) return <Nacitava text="Načítavam súpisku…" />;
  if (skupiny.length === 0 && realizacny.length === 0) {
    return (
      <Sekcia className="zs-sekcia--hore">
        <Prazdne nadpis="Súpiska zatiaľ nie je zverejnená" />
      </Sekcia>
    );
  }

  return (
    <div className="zs-kontajner zk-sup__obsah">
      {skupiny.length + (realizacny.length ? 1 : 0) > 1 && (
        <nav className="zk-sup__skok" aria-label="Pozície">
          {skupiny.map((s) => (
            <button key={s.kluc} type="button" onClick={() => posunNa(s.kluc)}>
              {s.nazov}
            </button>
          ))}
          {realizacny.length > 0 && (
            <button type="button" onClick={() => posunNa('realizacny-tim')}>
              Realizačný tím
            </button>
          )}
        </nav>
      )}
      {skupiny.map((s) => (
        <Skupina key={s.kluc} id={`zk-sup-${s.kluc}`} nazov={s.nazov} pocet={s.hraci.length} stitok="Pozícia">
          <div className="zk-mriezka-osob">
            {s.hraci.map((h) => (
              <KartaHraca key={h.id} hrac={h} statistika={podlaId.get(h.id)} />
            ))}
          </div>
        </Skupina>
      ))}
      {realizacny.length > 0 && (
        <Skupina id="zk-sup-realizacny-tim" nazov="Realizačný tím" pocet={realizacny.length} stitok="Za tímom">
          <div className="zk-mriezka-clenov">
            {realizacny.map((c) => (
              <KartaClena key={c.id} clen={c} />
            ))}
          </div>
        </Skupina>
      )}
    </div>
  );
};

/** Súhrn kádra v hlavičke: počet hráčov, priemerný vek, realizačný tím. */
const Suhrn: React.FC<{ tim: Tim }> = ({ tim }) => {
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`).data?.hraci ?? [];
  const clenovia = useApi<{ realizacny_tim: ClenTimu[] }>(`/teams/${tim.id}/staff`).data?.realizacny_tim ?? [];
  const veky = hraci.map((h) => h.vek).filter((v): v is number => typeof v === 'number' && v > 0);
  const polozky: Array<[string, string]> = [];
  if (hraci.length) polozky.push([String(hraci.length), sklon(hraci.length, 'hráč', 'hráči', 'hráčov')]);
  if (veky.length) polozky.push([(veky.reduce((a, b) => a + b, 0) / veky.length).toLocaleString('sk-SK', { maximumFractionDigits: 1 }), 'priemerný vek']);
  if (clenovia.length) polozky.push([String(clenovia.length), 'realizačný tím']);
  if (!polozky.length) return null;
  return (
    <dl className="zk-sup__suhrn">
      {polozky.map(([hodnota, nazov]) => (
        <div key={nazov}>
          <dt>{nazov}</dt>
          <dd>{hodnota}</dd>
        </div>
      ))}
    </dl>
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

  const zalozkyTimov = zoradene.map((t) => {
    const logo = obrazokUrl(t.logo);
    return (
      <Link key={t.id} to={`/teams/${t.id}`} className={t.id === tim?.id ? 'is-aktivny' : undefined} aria-current={t.id === tim?.id ? 'page' : undefined}>
        {logo && <img src={logo} alt="" onError={skryObrazok} />}
        <span>
          {t.nazov}
          {t.vekova_kategoria && <small>{t.vekova_kategoria}</small>}
        </span>
      </Link>
    );
  });

  return (
    <div className="zs-stranka zk-sup">
      <HlavickaStranky
        className="zk-sup__hlavicka"
        zalozky={zoradene.length > 1 ? zalozkyTimov : undefined}
        stitok={tim ? tim.vekova_kategoria || tim.nazov : 'Tím'} nadpis={u.text('stranka_supiska_nadpis', 'Súpiska')}>
        {tim?.popis && <p className="zs-hlava__popis">{tim.popis}</p>}
        {tim && <Suhrn key={tim.id} tim={tim} />}
      </HlavickaStranky>
      {tim ? (
        <SupiskaTimu key={tim.id} tim={tim} />
      ) : (
        <Sekcia className="zs-sekcia--hore">
          <Prazdne nadpis={`${nastavenia.nazov} zatiaľ nemá zverejnené tímy`} />
        </Sekcia>
      )}
    </div>
  );
};

export default Supiska;
