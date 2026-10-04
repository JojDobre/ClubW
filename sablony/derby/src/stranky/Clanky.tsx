// Umiestnenie: sablony/derby/src/stranky/Clanky.tsx
// Novinky (podľa návrhu News z Claude Design): tmavá hlavička, rubriky
// ako pilulky, veľký článok vedľa fotky, mriežka štyroch kariet
// a „Načítať ďalšie". Rubrika sa drží v adrese (?rubrika=slug).
// ?hladat=výraz ukáže výsledky hľadania (odkaz z profilu hráča a pod.).

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chyba, Filtre, HlavickaStranky, HlavnyClanok, KartaClanku, NacitatDalsie, Nacitava, Prazdne, Sekcia } from '../casti';
import { useApi, useStrankovanyZoznam, useTitulok, type Clanok, useUpravy } from '../spolocne';

interface Rubrika {
  id: number;
  nazov: string;
  slug: string;
}

// Prvý článok je veľký, pod ním mriežka 4 × 2
const NA_STRANU = 9;
const STLPCE = 4;

const Clanky: React.FC = () => {
  const u = useUpravy();
  const [parametre, setParametre] = useSearchParams();
  const rubrika = parametre.get('rubrika') ?? '';
  const hladat = (parametre.get('hladat') ?? '').trim();
  const rubriky = useApi<Rubrika[]>('/categories');
  const aktivna = (rubriky.data ?? []).find((r) => r.slug === rubrika);
  useTitulok(hladat ? `Hľadanie: ${hladat}` : aktivna ? `Novinky: ${aktivna.nazov}` : 'Novinky');

  const zoznam = useStrankovanyZoznam<Clanok>((strana) => {
    const q = new URLSearchParams({ page: String(strana), limit: String(NA_STRANU) });
    if (rubrika) q.set('category', rubrika);
    if (hladat) q.set('search', hladat);
    return `/articles?${q}`;
  }, `${rubrika}|${hladat}`);

  const zvolRubriku = (slug: string) => {
    const nove = new URLSearchParams(parametre);
    if (slug) nove.set('rubrika', slug);
    else nove.delete('rubrika');
    nove.delete('hladat');
    setParametre(nove, { replace: true });
  };

  const [hlavny, ...ostatne] = zoznam.polozky;
  // Kým sú ďalšie strany, mriežka končí celým radom kariet
  const mriezka = zoznam.dalsie ? ostatne.slice(0, Math.max(STLPCE, ostatne.length - (ostatne.length % STLPCE))) : ostatne;

  return (
    <div className="dr-stranka dr-novinky">
      <HlavickaStranky stitok={hladat ? 'Hľadanie' : u.text('stranka_clanky_stitok', 'Aktuality')} nadpis={hladat ? `„${hladat}"` : u.text('stranka_clanky_nadpis', 'Novinky')} />

      <Sekcia className="dr-sekcia--filtre">
        <Filtre
          popis="Rubriky"
          aktivna={hladat ? '__hladanie' : rubrika}
          onZmena={zvolRubriku}
          moznosti={[
            { kluc: '', nazov: 'Všetko' },
            ...(rubriky.data ?? []).map((r) => ({ kluc: r.slug, nazov: r.nazov })),
          ]}
        />
      </Sekcia>

      {zoznam.chyba ? (
        <Sekcia>
          <Chyba text={zoznam.chyba} />
        </Sekcia>
      ) : zoznam.prvaNacitava ? (
        <Nacitava text="Načítavam novinky…" />
      ) : !hlavny ? (
        <Sekcia>
          <Prazdne
            nadpis={hladat ? `Pre „${hladat}" sme nenašli žiadny článok` : 'Zatiaľ tu nie sú žiadne novinky'}
            text={rubrika || hladat ? 'Skúste inú rubriku.' : undefined}
          >
            {(rubrika || hladat) && (
              <button type="button" className="dr-tlacidlo-dalsie" onClick={() => zvolRubriku('')}>
                Všetky novinky
              </button>
            )}
          </Prazdne>
        </Sekcia>
      ) : (
        <>
          <Sekcia className="dr-sekcia--hlavny-clanok">
            <HlavnyClanok clanok={hlavny} />
          </Sekcia>
          {mriezka.length > 0 && (
            <Sekcia className="dr-sekcia--mriezka">
              <div className="dr-mriezka-4">
                {mriezka.map((c) => (
                  <KartaClanku key={c.id} clanok={c} />
                ))}
              </div>
            </Sekcia>
          )}
          <Sekcia className="dr-sekcia--dalsie">{zoznam.dalsie && <NacitatDalsie nacitava={zoznam.nacitava} onClick={zoznam.nacitajDalsie} />}</Sekcia>
        </>
      )}
    </div>
  );
};

export default Clanky;
