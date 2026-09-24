// Umiestnenie: sablony/moderna/src/stranky/Clanky.tsx
// Zoznam správ: rubriky ako čipy, vyhľadávanie a postupné načítanie
// ďalších správ. Rubrika sa drží v adrese (?rubrika=slug), aby sa dala
// poslať odkazom.

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiUrl } from '@clubw/jadro';
import {
  Chyba,
  HlavickaStranky,
  Ikona,
  KartaClanku,
  NacitatDalsie,
  Nacitava,
  Prazdne,
  useApi,
  useTitulok,
  type Clanok,
  type Strankovanie,
} from '../spolocne';

interface Rubrika {
  id: number;
  nazov: string;
  slug: string;
}

const NA_STRANU = 12;

const Clanky: React.FC = () => {
  const [parametre, setParametre] = useSearchParams();
  const rubrika = parametre.get('rubrika') ?? '';
  const [hladat, setHladat] = useState(parametre.get('hladat') ?? '');
  const [dotaz, setDotaz] = useState(hladat.trim());
  const [clanky, setClanky] = useState<Clanok[]>([]);
  const [strankovanie, setStrankovanie] = useState<Strankovanie | null>(null);
  // Strana patrí k filtru - po zmene rubriky alebo hľadania sa začína od prvej
  const filter = `${rubrika}|${dotaz}`;
  const [stranaFiltra, setStranaFiltra] = useState({ filter, cislo: 1 });
  const strana = stranaFiltra.filter === filter ? stranaFiltra.cislo : 1;
  const [nacitava, setNacitava] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);

  const rubriky = useApi<Rubrika[]>('/categories');
  const aktivna = (rubriky.data ?? []).find((r) => r.slug === rubrika);
  useTitulok(aktivna ? `Správy: ${aktivna.nazov}` : 'Správy');

  // Hľadanie s oneskorením - neposielame dotaz pri každom písmene
  useEffect(() => {
    const t = setTimeout(() => setDotaz(hladat.trim()), 350);
    return () => clearTimeout(t);
  }, [hladat]);

  useEffect(() => {
    const ovladac = new AbortController();
    const q = new URLSearchParams({ page: String(strana), limit: String(NA_STRANU) });
    if (rubrika) q.set('category', rubrika);
    if (dotaz) q.set('search', dotaz);
    setNacitava(true);
    setChyba(null);
    fetch(apiUrl(`/articles?${q}`), { signal: ovladac.signal })
      .then((r) => r.json())
      .then((telo) => {
        if (!telo?.success) throw new Error(telo?.message || 'Správy sa nepodarilo načítať');
        setClanky((s) => (strana === 1 ? telo.data : [...s, ...telo.data.filter((c: Clanok) => !s.some((x) => x.id === c.id))]));
        setStrankovanie(telo.pagination ?? null);
      })
      .catch((e: Error) => e.name !== 'AbortError' && setChyba(e.message))
      .finally(() => !ovladac.signal.aborted && setNacitava(false));
    return () => ovladac.abort();
  }, [strana, rubrika, dotaz]);

  const zvolRubriku = (slug: string) => {
    const nove = new URLSearchParams(parametre);
    if (slug) nove.set('rubrika', slug);
    else nove.delete('rubrika');
    setParametre(nove, { replace: true });
  };

  const bezFiltra = !rubrika && !dotaz;
  const [hlavny, ...ostatne] = clanky;

  return (
    <div className="md-stranka">
      <HlavickaStranky
        stitok="Správy"
        nadpis={aktivna ? aktivna.nazov : 'Príbehy z klubu.'}
        popis="Zápasy, zákulisie, mládež a všetko, čo sa v klube deje."
      />

      <div className="md-kontajner">
        <div className="md-filter">
          <div className="md-cipy md-posuvnik" role="group" aria-label="Rubriky">
            <button type="button" className={`md-cip${!rubrika ? ' is-aktivny' : ''}`} onClick={() => zvolRubriku('')}>
              Všetko
            </button>
            {(rubriky.data ?? []).map((r) => (
              <button key={r.id} type="button" className={`md-cip${rubrika === r.slug ? ' is-aktivny' : ''}`} onClick={() => zvolRubriku(r.slug)}>
                {r.nazov}
              </button>
            ))}
          </div>
          <label className="md-hladat">
            <Ikona nazov="hladat" />
            <input type="search" value={hladat} onChange={(e) => setHladat(e.target.value)} placeholder="Hľadať v správach" aria-label="Hľadať v správach" />
          </label>
        </div>

        {chyba ? (
          <Chyba text={chyba} />
        ) : nacitava && clanky.length === 0 ? (
          <Nacitava text="Načítavam správy…" />
        ) : clanky.length === 0 ? (
          <Prazdne
            nadpis={dotaz ? `Pre „${dotaz}" sme nenašli žiadnu správu` : 'Zatiaľ tu nie sú žiadne správy'}
            text={rubrika || dotaz ? 'Skúste inú rubriku alebo iný výraz.' : undefined}
          >
            {(rubrika || dotaz) && (
              <button
                type="button"
                className="md-tlacidlo md-tlacidlo--sekundarne"
                onClick={() => {
                  setHladat('');
                  zvolRubriku('');
                }}
              >
                Zobraziť všetky správy
              </button>
            )}
          </Prazdne>
        ) : (
          <>
            <div className="md-mriezka-clankov">
              {bezFiltra && hlavny ? (
                <>
                  <div className="md-mriezka-clankov__hlavny">
                    <KartaClanku clanok={hlavny} velka />
                  </div>
                  {ostatne.map((c) => (
                    <KartaClanku key={c.id} clanok={c} />
                  ))}
                </>
              ) : (
                clanky.map((c) => <KartaClanku key={c.id} clanok={c} />)
              )}
            </div>
            {strankovanie?.has_next && <NacitatDalsie nacitava={nacitava} onClick={() => setStranaFiltra({ filter, cislo: strana + 1 })} />}
          </>
        )}
      </div>
    </div>
  );
};

export default Clanky;
