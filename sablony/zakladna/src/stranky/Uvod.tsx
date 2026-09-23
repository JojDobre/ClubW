// Umiestnenie: sablony/zakladna/src/stranky/Uvod.tsx
// Úvodná stránka základnej šablóny - klub, najnovšie články,
// najbližšie zápasy, posledné výsledky a anketa.

import React from 'react';
import { Link } from 'react-router-dom';
import { AnketaWeb, souborUrl, useData, useNastavenia } from '@clubw/jadro';
import './Uvod.css';

interface ClanokVZozname {
  id: number;
  nazov: string;
  slug: string;
  excerpt?: string | null;
  obrazok?: string | null;
  publikovany_datum?: string | null;
  vytvoreny: string;
}

interface ZapasVZozname {
  id: number;
  datum_cas: string;
  domaci_tim_nazov?: string;
  hostujuci_tim_nazov?: string;
  goly_domaci?: number | null;
  goly_hostia?: number | null;
  liga_nazov?: string | null;
  kolo?: string | null;
  miesto?: string | null;
}

const datum = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const datumCas = (d: string) =>
  new Date(d).toLocaleString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

const Uvod: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const clanky = useData<ClanokVZozname[]>('/articles?limit=3');
  // Zoznam zápasov je zoradený od najnovšieho - najbližšie berieme z konca
  const buduce = useData<ZapasVZozname[]>(`/matches?status=naplanovany&od_datumu=${new Date().toISOString().slice(0, 10)}&limit=50`);
  const vysledky = useData<ZapasVZozname[]>('/matches?status=ukonceny&limit=3');
  const najblizsie = [...(buduce.data ?? [])].sort((a, b) => a.datum_cas.localeCompare(b.datum_cas)).slice(0, 3);

  return (
    <div className="zk-uvod">
      <section className="zk-uvod__hlava">
        <h1>Vitajte v klube {nastavenia.nazov}</h1>
        {(nastavenia.slogan || nastavenia.meta_popis) && <p>{nastavenia.slogan || nastavenia.meta_popis}</p>}
      </section>

      <div className="zk-uvod__mriezka">
        <section className="zk-uvod__clanky" aria-labelledby="zk-aktuality">
          <div className="zk-uvod__nadpis">
            <h2 id="zk-aktuality">Aktuality</h2>
            <Link to="/clanky">Všetky články →</Link>
          </div>
          {clanky.nacitava ? (
            <p className="zk-uvod__prazdne">Načítavam...</p>
          ) : (clanky.data ?? []).length === 0 ? (
            <p className="zk-uvod__prazdne">Zatiaľ žiadne články.</p>
          ) : (
            <div className="zk-uvod__karty">
              {clanky.data!.map((c) => (
                <Link key={c.id} to={`/clanek/${c.slug}`} className="zk-karta">
                  {c.obrazok ? (
                    <img src={souborUrl(c.obrazok)} alt="" className="zk-karta__obrazok" loading="lazy" />
                  ) : (
                    <div className="zk-karta__obrazok zk-karta__obrazok--prazdny" aria-hidden="true" />
                  )}
                  <div className="zk-karta__telo">
                    <span className="zk-karta__datum">{datum(c.publikovany_datum || c.vytvoreny)}</span>
                    <h3>{c.nazov}</h3>
                    {c.excerpt && <p>{c.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="zk-uvod__bok">
          <section className="zk-panel" aria-labelledby="zk-najblizsie">
            <h2 id="zk-najblizsie">Najbližšie zápasy</h2>
            {najblizsie.length === 0 ? (
              <p className="zk-uvod__prazdne">{buduce.nacitava ? 'Načítavam...' : 'Žiadne naplánované zápasy.'}</p>
            ) : (
              <ul className="zk-zapasy">
                {najblizsie.map((z) => (
                  <li key={z.id}>
                    <Link to={`/matches/${z.id}`}>
                      <span className="zk-zapasy__kedy">{datumCas(z.datum_cas)}</span>
                      <span className="zk-zapasy__timy">
                        {z.domaci_tim_nazov} – {z.hostujuci_tim_nazov}
                      </span>
                      {(z.liga_nazov || z.miesto) && (
                        <span className="zk-zapasy__kde">{[z.liga_nazov, z.miesto].filter(Boolean).join(' · ')}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/matches" className="zk-panel__odkaz">
              Všetky zápasy →
            </Link>
          </section>

          {(vysledky.data ?? []).length > 0 && (
            <section className="zk-panel" aria-labelledby="zk-vysledky">
              <h2 id="zk-vysledky">Posledné výsledky</h2>
              <ul className="zk-zapasy">
                {vysledky.data!.map((z) => (
                  <li key={z.id}>
                    <Link to={`/matches/${z.id}`}>
                      <span className="zk-zapasy__timy">
                        {z.domaci_tim_nazov}{' '}
                        <strong>
                          {z.goly_domaci ?? '-'}:{z.goly_hostia ?? '-'}
                        </strong>{' '}
                        {z.hostujuci_tim_nazov}
                      </span>
                      <span className="zk-zapasy__kedy">{datum(z.datum_cas)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AnketaWeb najnovsia />
        </aside>
      </div>
    </div>
  );
};

export default Uvod;
