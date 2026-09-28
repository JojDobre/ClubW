// Umiestnenie: sablony/klubova/src/stranky/Supiska.tsx
// Súpiska (podľa návrhu Súpiska z Claude Design) - slúži pre /teams aj
// /teams/:id. Červený pás so záložkami tímov, pilulky pozícií (posunú
// stránku ku skupine), hráči po pozíciách v kartách so štatistikami
// sezóny a na konci realizačný tím.

import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useNastavenia } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, Filtre, HlavickaStranky, KartaClena, KartaHraca, Nacitava, PasZaloziek, Prazdne, Sekcia } from '../casti';
import {
  POZICIE,
  useApi,
  useTitulok,
  zoradTimy,
  type ClenTimu,
  type Hrac,
  type StatistikaHraca,
  type Tim,
  useUpravy,
} from '../spolocne';

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

const SupiskaTimu: React.FC<{ tim: Tim; timy: Tim[] }> = ({ tim, timy }) => {
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const statistiky = useApi<StatistikaHraca[]>(`/teams/${tim.id}/players/stats`);
  const clenovia = useApi<{ realizacny_tim: ClenTimu[] }>(`/teams/${tim.id}/staff`);
  const [pozicia, setPozicia] = useState('');
  const podlaId = useMemo(() => new Map((statistiky.data ?? []).map((s) => [s.hrac_id, s])), [statistiky.data]);
  const skupiny = podlaPozicie(hraci.data?.hraci ?? []);
  const realizacny = clenovia.data?.realizacny_tim ?? [];

  const posunNa = (kluc: string) => {
    setPozicia(kluc);
    const ciel = document.getElementById(kluc ? `kl-skupina-${kluc}` : 'kl-supiska');
    if (!ciel) return;
    const hlavicka = document.querySelector<HTMLElement>('.kl-hlavicka')?.offsetHeight ?? 0;
    window.scrollTo({ top: ciel.getBoundingClientRect().top + window.scrollY - hlavicka - 16, behavior: 'smooth' });
  };

  return (
    <>
      {timy.length > 1 && (
        <PasZaloziek popis="Tímy">
          {timy.map((t) => (
            <Link key={t.id} to={`/teams/${t.id}`} className={`kl-zalozka-timu${t.id === tim.id ? ' is-aktivna' : ''}`} aria-current={t.id === tim.id ? 'page' : undefined}>
              {t.nazov}
            </Link>
          ))}
        </PasZaloziek>
      )}

      {hraci.nacitava ? (
        <Nacitava text="Načítavam súpisku…" />
      ) : skupiny.length === 0 && realizacny.length === 0 ? (
        <Sekcia className="kl-sekcia--hore">
          <Prazdne nadpis="Súpiska zatiaľ nie je zverejnená" />
        </Sekcia>
      ) : (
        <div id="kl-supiska">
          <Sekcia className="kl-sekcia--filtre kl-sekcia--pozicie">
            <Filtre
              popis="Pozície"
              aktivna={pozicia}
              onZmena={posunNa}
              moznosti={[
                { kluc: '', nazov: 'Všetci' },
                ...skupiny.map((s) => ({ kluc: s.kluc, nazov: s.nazov })),
                ...(realizacny.length > 0 ? [{ kluc: 'realizacny-tim', nazov: 'Realizačný tím' }] : []),
              ]}
            />
          </Sekcia>
          {skupiny.map((s) => (
            <Sekcia key={s.kluc} className="kl-skupina" id={`kl-skupina-${s.kluc}`} ariaLabel={s.nazov}>
              <h2 className="kl-skupina__nadpis">{s.nazov}</h2>
              <div className="kl-mriezka-4 kl-mriezka-4--hraci">
                {s.hraci.map((h) => (
                  <KartaHraca key={h.id} hrac={h} statistika={podlaId.get(h.id)} />
                ))}
              </div>
            </Sekcia>
          ))}
          {realizacny.length > 0 && (
            <Sekcia className="kl-skupina" id="kl-skupina-realizacny-tim" ariaLabel="Realizačný tím">
              <h2 className="kl-skupina__nadpis">Realizačný tím</h2>
              <div className="kl-mriezka-4 kl-mriezka-4--hraci">
                {realizacny.map((c) => (
                  <KartaClena key={c.id} clen={c} />
                ))}
              </div>
            </Sekcia>
          )}
        </div>
      )}
    </>
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

  return (
    <div className="kl-stranka kl-supiska">
      <HlavickaStranky stitok={tim && zoradene.length > 1 ? tim.nazov : 'Tím'} nadpis={u.text('stranka_supiska_nadpis', 'Súpiska')}>
        {tim?.popis && <p className="kl-hlava__popis">{tim.popis}</p>}
      </HlavickaStranky>
      {tim ? (
        <SupiskaTimu key={tim.id} tim={tim} timy={zoradene} />
      ) : (
        <Sekcia className="kl-sekcia--hore">
          <Prazdne nadpis={`${nastavenia.nazov} zatiaľ nemá zverejnené tímy`} />
        </Sekcia>
      )}
    </div>
  );
};

export default Supiska;
