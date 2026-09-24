// Umiestnenie: sablony/moderna/src/stranky/Timy.tsx
// Zoznam tímov klubu zoskupený na mužov, ženy a mládež.

import React from 'react';
import { Link } from 'react-router-dom';
import { useNastavenia } from '@clubw/jadro';
import { Chyba, Erb, HlavickaStranky, Ikona, Nacitava, Prazdne, TYPY_TIMOV, sklon, useApi, useTitulok, type Tim } from '../spolocne';

const PORADIE_TYPOV: Array<Tim['typ']> = ['muzi', 'zeny', 'mladez'];

const Timy: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const timy = useApi<Tim[]>('/teams?include_stats=true');
  useTitulok('Tímy');

  const skupiny = PORADIE_TYPOV.map((typ) => ({
    typ,
    timy: (timy.data ?? []).filter((t) => t.typ === typ).sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.nazov.localeCompare(b.nazov, 'sk')),
  })).filter((s) => s.timy.length > 0);

  return (
    <div className="md-stranka">
      <HlavickaStranky stitok={nastavenia.nazov} nadpis="Naše tímy." popis="Od prípravky až po A-tím - všetci hráme za jeden erb." />
      <div className="md-kontajner">
        {timy.nacitava ? (
          <Nacitava text="Načítavam tímy…" />
        ) : timy.chyba ? (
          <Chyba text={timy.chyba} />
        ) : skupiny.length === 0 ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne tímy" />
        ) : (
          skupiny.map((s) => (
            <section key={s.typ} className="md-skupina" aria-labelledby={`md-timy-${s.typ}`}>
              <h2 id={`md-timy-${s.typ}`} className="md-skupina__nadpis">
                {TYPY_TIMOV[s.typ]}
              </h2>
              <div className="md-mriezka-timov">
                {s.timy.map((t) => (
                  <Link key={t.id} to={`/teams/${t.id}`} className="md-karta-timu">
                    <Erb nazov={t.nazov} logo={t.logo || nastavenia.logo} velkost="lg" />
                    <span className="md-karta-timu__text">
                      {t.vekova_kategoria && <span className="md-stitok">{t.vekova_kategoria}</span>}
                      <strong>{t.nazov}</strong>
                      <small>
                        {[
                          t.pocet_hracov ? `${t.pocet_hracov} ${sklon(t.pocet_hracov, 'hráč', 'hráči', 'hráčov')}` : null,
                          t.pocet_realizacny_tim ? `${t.pocet_realizacny_tim} v realizačnom tíme` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Káder a zápasy'}
                      </small>
                    </span>
                    <span className="md-karta-timu__sipka" aria-hidden="true">
                      <Ikona nazov="sipka" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default Timy;
