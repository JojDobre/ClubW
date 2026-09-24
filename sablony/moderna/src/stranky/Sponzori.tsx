// Umiestnenie: sablony/moderna/src/stranky/Sponzori.tsx
// Partneri klubu zoskupení podľa úrovne (generálny, hlavný, partner...).
// Veľkosť loga určuje nastavenie úrovne v administrácii.

import React from 'react';
import { souborUrl, useNastavenia } from '@clubw/jadro';
import { Chyba, HlavickaStranky, Ikona, Nacitava, Prazdne, useApi, useTitulok } from '../spolocne';

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
    <div className="md-stranka">
      <HlavickaStranky stitok="Partneri" nadpis="Ďakujeme, že ste s nami." popis={`Bez podpory partnerov by ${nastavenia.nazov} nebol tým, čím je.`} />
      <div className="md-kontajner">
        {sponzori.nacitava ? (
          <Nacitava text="Načítavam partnerov…" />
        ) : sponzori.chyba ? (
          <Chyba text={sponzori.chyba} />
        ) : skupiny.length === 0 ? (
          <Prazdne nadpis="Zoznam partnerov pripravujeme" />
        ) : (
          skupiny.map((s) => (
            <section key={s.kluc} className="md-skupina">
              <h2 className="md-skupina__nadpis">{s.nazov}</h2>
              {s.popis && <p className="md-skupina__popis">{s.popis}</p>}
              <div className={`md-mriezka-partnerov md-mriezka-partnerov--${s.velkost}`}>
                {s.polozky.map((p) => {
                  const obsah = (
                    <>
                      <span className="md-partner__logo">{p.logo ? <img src={souborUrl(p.logo)} alt={p.nazov} loading="lazy" /> : <strong>{p.nazov}</strong>}</span>
                      <span className="md-partner__text">
                        <strong>{p.nazov}</strong>
                        {p.popis && <small>{p.popis}</small>}
                      </span>
                      {p.web_url && (
                        <span className="md-partner__web" aria-hidden="true">
                          <Ikona nazov="sipka_hore" velkost={16} />
                        </span>
                      )}
                    </>
                  );
                  return p.web_url ? (
                    <a key={p.id} href={p.web_url} target="_blank" rel="noopener noreferrer" className="md-partner">
                      {obsah}
                    </a>
                  ) : (
                    <div key={p.id} className="md-partner">
                      {obsah}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default Sponzori;
