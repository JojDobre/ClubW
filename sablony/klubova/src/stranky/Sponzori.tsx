// Umiestnenie: sablony/klubova/src/stranky/Sponzori.tsx
// Partneri klubu zoskupení podľa úrovne (generálny, hlavný, partner...)
// v kartách s logom. Veľkosť loga určuje nastavenie úrovne v administrácii.

import React from 'react';
import { useNastavenia } from '@clubw/jadro';
import { Chyba, HlavickaStranky, Nacitava, Prazdne, Sekcia } from '../casti';
import { Ikona, obrazokUrl, skryObrazok, useApi, useTitulok } from '../spolocne';

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
    <div className="kl-stranka kl-sponzori">
      <HlavickaStranky stitok="Partneri" nadpis="Ďakujeme, že ste s nami">
        <p className="kl-hlava__popis">Bez podpory partnerov by {nastavenia.nazov} nebol tým, čím je.</p>
      </HlavickaStranky>
      {sponzori.nacitava ? (
        <Nacitava text="Načítavam partnerov…" />
      ) : sponzori.chyba ? (
        <Sekcia className="kl-sekcia--hore">
          <Chyba text={sponzori.chyba} />
        </Sekcia>
      ) : skupiny.length === 0 ? (
        <Sekcia className="kl-sekcia--hore">
          <Prazdne nadpis="Zoznam partnerov pripravujeme" />
        </Sekcia>
      ) : (
        skupiny.map((s, i) => (
          <Sekcia key={s.kluc} className={`kl-skupina${i === 0 ? ' kl-sekcia--hore' : ''}${i === skupiny.length - 1 ? ' kl-skupina--posledna' : ''}`} ariaLabel={s.nazov}>
            <h2 className="kl-skupina__nadpis">{s.nazov}</h2>
            {s.popis && <p className="kl-skupina__popis">{s.popis}</p>}
            <div className={`kl-mriezka-partnerov kl-mriezka-partnerov--${s.velkost}`}>
              {s.polozky.map((p) => {
                const logo = obrazokUrl(p.logo);
                const obsah = (
                  <>
                    <span className="kl-partner-karta__logo">{logo ? <img src={logo} alt={p.nazov} loading="lazy" onError={skryObrazok} /> : <strong>{p.nazov}</strong>}</span>
                    <span className="kl-partner-karta__text">
                      <strong>{p.nazov}</strong>
                      {p.popis && <small>{p.popis}</small>}
                    </span>
                    {p.web_url && <Ikona nazov="von" velkost={16} className="kl-partner-karta__web" />}
                  </>
                );
                return p.web_url ? (
                  <a key={p.id} href={p.web_url} target="_blank" rel="noopener noreferrer" className="kl-partner-karta">
                    {obsah}
                  </a>
                ) : (
                  <div key={p.id} className="kl-partner-karta">
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
