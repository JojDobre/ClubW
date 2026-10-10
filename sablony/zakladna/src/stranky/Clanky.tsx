// Umiestnenie: sablony/zakladna/src/stranky/Clanky.tsx
// Novinky ako časopis - nie mriežka kariet:
//  - titulný článok cez celú šírku stĺpca (fotka, veľký nadpis, perex),
//  - ďalšie články ako číslovaný zoznam riadkov (rubrika, dátum,
//    nadpis, perex, fotka napravo),
//  - prilepený bočný panel s hľadaním a rubrikami.
// Rubrika sa drží v adrese (?rubrika=slug), hľadanie v ?hladat=výraz.

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chyba, HlavickaStranky, NacitatDalsie, Nacitava, Obrazok, Prazdne } from '../casti';
import { Ikona, datum, useApi, useStrankovanyZoznam, useTitulok, type Clanok, useUpravy } from '../spolocne';

interface Rubrika {
  id: number;
  nazov: string;
  slug: string;
}

const NA_STRANU = 9;

const Clanky: React.FC = () => {
  const u = useUpravy();
  const [parametre, setParametre] = useSearchParams();
  const rubrika = parametre.get('rubrika') ?? '';
  const hladat = (parametre.get('hladat') ?? '').trim();
  const [text, setText] = useState(hladat);
  const rubriky = useApi<Rubrika[]>('/categories');
  const aktivna = (rubriky.data ?? []).find((r) => r.slug === rubrika);
  useTitulok(hladat ? `Hľadanie: ${hladat}` : aktivna ? `Novinky: ${aktivna.nazov}` : 'Novinky');
  useEffect(() => setText(hladat), [hladat]);

  const zoznam = useStrankovanyZoznam<Clanok>((strana) => {
    const q = new URLSearchParams({ page: String(strana), limit: String(NA_STRANU) });
    if (rubrika) q.set('category', rubrika);
    if (hladat) q.set('search', hladat);
    return `/articles?${q}`;
  }, `${rubrika}|${hladat}`);

  const nastav = (zmena: { rubrika?: string; hladat?: string }) => {
    const nove = new URLSearchParams(parametre);
    for (const [k, v] of Object.entries(zmena)) {
      if (v) nove.set(k, v);
      else nove.delete(k);
    }
    setParametre(nove, { replace: true });
  };

  const [titulny, ...ostatne] = zoznam.polozky;

  return (
    <div className="zs-stranka zs-casopis">
      <HlavickaStranky stitok={hladat ? 'Hľadanie' : u.text('stranka_clanky_stitok', 'Aktuality')} nadpis={hladat ? `„${hladat}"` : aktivna?.nazov || u.text('stranka_clanky_nadpis', 'Novinky')} />

      <div className="zs-kontajner zs-casopis__mriezka">
        <aside className="zs-casopis__bok" aria-label="Rubriky a hľadanie">
          <form
            className="zs-casopis__hladat"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              nastav({ hladat: text.trim(), rubrika: '' });
            }}
          >
            <Ikona nazov="hladat" velkost={17} />
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hľadať v novinkách" aria-label="Hľadať v novinkách" maxLength={100} />
          </form>
          <nav className="zs-casopis__rubriky" aria-label="Rubriky">
            <span>Rubriky</span>
            {[{ slug: '', nazov: 'Všetky novinky' }, ...(rubriky.data ?? [])].map((r) => (
              <button key={r.slug || 'vsetky'} type="button" className={!hladat && rubrika === r.slug ? 'is-aktivna' : ''} aria-pressed={!hladat && rubrika === r.slug} onClick={() => nastav({ rubrika: r.slug, hladat: '' })}>
                {r.nazov}
                <Ikona nazov="sipka" velkost={13} />
              </button>
            ))}
          </nav>
        </aside>

        <div className="zs-casopis__obsah">
          {zoznam.chyba ? (
            <Chyba text={zoznam.chyba} />
          ) : zoznam.prvaNacitava ? (
            <Nacitava text="Načítavam novinky…" />
          ) : !titulny ? (
            <Prazdne nadpis={hladat ? `Pre „${hladat}" sme nenašli žiadny článok` : 'Zatiaľ tu nie sú žiadne novinky'} text={rubrika || hladat ? 'Skúste inú rubriku.' : undefined}>
              {(rubrika || hladat) && (
                <button type="button" className="zs-tlacidlo-dalsie" onClick={() => nastav({ rubrika: '', hladat: '' })}>
                  Všetky novinky
                </button>
              )}
            </Prazdne>
          ) : (
            <>
              <Link to={`/clanek/${titulny.slug}`} className="zs-titul">
                <Obrazok src={titulny.obrazok} className="zs-titul__obrazok" />
                <span className="zs-titul__text">
                  <span className="zs-titul__meta">
                    {titulny.kategoria && <b>{titulny.kategoria.nazov}</b>}
                    {datum(titulny.publikovany_datum || titulny.vytvoreny)}
                  </span>
                  <strong>{titulny.nazov}</strong>
                  {titulny.excerpt && <p>{titulny.excerpt}</p>}
                </span>
              </Link>
              {ostatne.length > 0 && (
                <ol className="zs-casopis__zoznam">
                  {ostatne.map((c, i) => (
                    <li key={c.id}>
                      <Link to={`/clanek/${c.slug}`} className="zs-criadok">
                        <span className="zs-criadok__cislo" aria-hidden="true">
                          {String(i + 2).padStart(2, '0')}
                        </span>
                        <span className="zs-criadok__text">
                          <span className="zs-criadok__meta">
                            {c.kategoria && <b>{c.kategoria.nazov}</b>}
                            {datum(c.publikovany_datum || c.vytvoreny)}
                          </span>
                          <strong>{c.nazov}</strong>
                          {c.excerpt && <p>{c.excerpt}</p>}
                        </span>
                        <Obrazok src={c.obrazok} className="zs-criadok__obrazok" />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
              {zoznam.dalsie && (
                <div className="zs-casopis__dalsie">
                  <NacitatDalsie nacitava={zoznam.nacitava} onClick={zoznam.nacitajDalsie} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clanky;
