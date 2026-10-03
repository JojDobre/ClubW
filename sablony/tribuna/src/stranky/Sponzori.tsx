// Umiestnenie: sablony/tribuna/src/stranky/Sponzori.tsx
// Partneri klubu zoskupení podľa úrovne (generálny, hlavný, partner...)
// v kartách s logom. Veľkosť loga určuje nastavenie úrovne v administrácii.

import React from 'react';
import { useNastavenia } from '@clubw/jadro';
import { Chyba, HlavickaStranky, Nacitava, Prazdne, Sekcia } from '../casti';
import { Ikona, obrazokUrl, skryObrazok, useApi, useTitulok, useUpravy } from '../spolocne';

interface Sponzor {
  id: number;
  nazov: string;
  uroven_id: number | null;
  logo: string | null;
  web_url: string | null;
  popis: string | null;
}

interface Uroven {
  id: number;
  nazov: string;
  popis: string | null;
  poradie: number;
  velkost_loga: 'velke' | 'stredne' | 'male';
}

const Sponzori: React.FC = () => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const sponzori = useApi<Sponzor[]>('/sponsors?limit=500');
  const urovne = useApi<Uroven[]>('/sponsor-levels');
  useTitulok('Partneri klubu');

  const zoradene = [...(urovne.data ?? [])].sort((a, b) => a.poradie - b.poradie);
  const skupiny = [
    ...zoradene.map((u) => ({ kluc: String(u.id), nazov: u.nazov, popis: u.popis, velkost: u.velkost_loga, polozky: (sponzori.data ?? []).filter((s) => s.uroven_id === u.id) })),
    {
      kluc: 'ostatni',
      nazov: 'Partneri',
      popis: null,
      velkost: 'stredne' as const,
      polozky: (sponzori.data ?? []).filter((s) => !s.uroven_id || !zoradene.some((u) => u.id === s.uroven_id)),
    },
  ].filter((s) => s.polozky.length > 0);

  return (
    <div className="tb-stranka tb-sponzori">
      <HlavickaStranky stitok={u.text('stranka_partneri_stitok', 'Partneri')} nadpis={u.text('stranka_partneri_nadpis', 'Ďakujeme, že ste s nami')}>
        <p className="tb-hlava__popis">{u.text('stranka_partneri_popis', 'Bez podpory partnerov by {klub} nebol tým, čím je.')}</p>
      </HlavickaStranky>
      {sponzori.nacitava ? (
        <Nacitava text="Načítavam partnerov…" />
      ) : sponzori.chyba ? (
        <Sekcia className="tb-sekcia--hore">
          <Chyba text={sponzori.chyba} />
        </Sekcia>
      ) : skupiny.length === 0 ? (
        <Sekcia className="tb-sekcia--hore">
          <Prazdne nadpis="Zoznam partnerov pripravujeme" />
        </Sekcia>
      ) : (
        skupiny.map((s, i) => (
          <Sekcia key={s.kluc} className={`tb-skupina${i === 0 ? ' tb-sekcia--hore' : ''}${i === skupiny.length - 1 ? ' tb-skupina--posledna' : ''}`} ariaLabel={s.nazov}>
            <h2 className="tb-skupina__nadpis">{s.nazov}</h2>
            {s.popis && <p className="tb-skupina__popis">{s.popis}</p>}
            <div className={`tb-mriezka-partnerov tb-mriezka-partnerov--${s.velkost}`}>
              {s.polozky.map((p) => {
                const logo = obrazokUrl(p.logo);
                const obsah = (
                  <>
                    <span className="tb-partner-karta__logo">{logo ? <img src={logo} alt={p.nazov} loading="lazy" onError={skryObrazok} /> : <strong>{p.nazov}</strong>}</span>
                    <span className="tb-partner-karta__text">
                      <strong>{p.nazov}</strong>
                      {p.popis && <small>{p.popis}</small>}
                    </span>
                    {p.web_url && <Ikona nazov="von" velkost={16} className="tb-partner-karta__web" />}
                  </>
                );
                return p.web_url ? (
                  <a key={p.id} href={p.web_url} target="_blank" rel="noopener noreferrer" className="tb-partner-karta">
                    {obsah}
                  </a>
                ) : (
                  <div key={p.id} className="tb-partner-karta">
                    {obsah}
                  </div>
                );
              })}
            </div>
          </Sekcia>
        ))
      )}
    </div>
  );
};

export default Sponzori;
