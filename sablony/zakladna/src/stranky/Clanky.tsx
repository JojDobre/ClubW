// Umiestnenie: sablony/zakladna/src/stranky/Clanky.tsx
// Novinky: hľadanie v hlavičke a rubriky ako jej záložky, pod nimi
// titulný článok (fotka vľavo, text vpravo ako na úvode) a ďalšie
// články v mriežke bielych kariet so žltou linkou pod fotkou.
// Rubrika sa drží v adrese (?rubrika=slug), hľadanie v ?hladat=výraz.

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chyba, HlavickaStranky, NacitatDalsie, Nacitava, Obrazok, Prazdne } from '../casti';
import './Clanky.css';
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
    <div className="zs-stranka zk-novinky">
      <HlavickaStranky
        stitok={hladat ? 'Hľadanie' : u.text('stranka_clanky_stitok', 'Aktuality')}
        nadpis={hladat ? `„${hladat}"` : aktivna?.nazov || u.text('stranka_clanky_nadpis', 'Novinky')}
        zalozky={[{ slug: '', nazov: 'Všetko' }, ...(rubriky.data ?? [])].map((r) => (
          <button key={r.slug || 'vsetky'} type="button" className={!hladat && rubrika === r.slug ? 'is-aktivny' : undefined} aria-pressed={!hladat && rubrika === r.slug} onClick={() => nastav({ rubrika: r.slug, hladat: '' })}>
            {r.nazov}
          </button>
        ))}
      >
        <form
          className="zk-novinky__hladat"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            nastav({ hladat: text.trim(), rubrika: '' });
          }}
        >
          <Ikona nazov="hladat" velkost={17} />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hľadať v novinkách" aria-label="Hľadať v novinkách" maxLength={100} />
        </form>
      </HlavickaStranky>

      <div className="zs-kontajner zk-novinky__obsah">
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
            <Link to={`/clanek/${titulny.slug}`} className="zk-novinka zk-novinka--titulna">
              <Obrazok src={titulny.obrazok} className="zk-novinka__obrazok" />
              <span className="zk-novinka__telo">
                <span className="zk-novinka__meta">
                  {titulny.kategoria && <b>{titulny.kategoria.nazov}</b>}
                  {datum(titulny.publikovany_datum || titulny.vytvoreny)}
                </span>
                <strong>{titulny.nazov}</strong>
                {titulny.excerpt && <p>{titulny.excerpt}</p>}
                <span className="zk-novinka__viac">
                  Čítať článok <Ikona nazov="sipka" velkost={15} />
                </span>
              </span>
            </Link>
            {ostatne.length > 0 && (
              <div className="zk-novinky__mriezka">
                {ostatne.map((c) => (
                  <Link key={c.id} to={`/clanek/${c.slug}`} className="zk-novinka">
                    <Obrazok src={c.obrazok} className="zk-novinka__obrazok" />
                    <span className="zk-novinka__telo">
                      <span className="zk-novinka__meta">
                        {c.kategoria && <b>{c.kategoria.nazov}</b>}
                        {datum(c.publikovany_datum || c.vytvoreny)}
                      </span>
                      <strong>{c.nazov}</strong>
                      {c.excerpt && <p>{c.excerpt}</p>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {zoznam.dalsie && (
              <div className="zk-novinky__dalsie">
                <NacitatDalsie nacitava={zoznam.nacitava} onClick={zoznam.nacitajDalsie} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Clanky;
