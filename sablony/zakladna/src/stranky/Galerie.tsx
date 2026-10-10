// Umiestnenie: sablony/zakladna/src/stranky/Galerie.tsx
// Fotogaléria: pilulky podľa toho, k čomu galéria patrí (zápasy, tímy,
// články, klub) a albumy v mozaike rôzne veľkých dlaždíc (vzor sa
// opakuje po siedmich) s názvom na fotke, „Načítať ďalšie".

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiUrl } from '@clubw/jadro';
import { Chyba, Filtre, HlavickaStranky, NacitatDalsie, Nacitava, Obrazok, Prazdne, Sekcia } from '../casti';
import { sklon, useStrankovanyZoznam, useTitulok, useUpravy } from '../spolocne';

interface Galeria {
  id: number;
  nazov: string;
  pocet_obrazkov: number;
  nahladovy_obrazok: string | null;
  vytvoreny: string;
  typ_priradenia?: 'tim' | 'clanok' | 'zapas' | 'volna';
  tim?: { id: number; nazov: string } | null;
}

type Typ = '' | 'zapas' | 'tim' | 'clanok' | 'volna';

const NAZVY: Record<Exclude<Typ, ''>, string> = { zapas: 'Zápasy', tim: 'Tímy', clanok: 'Články', volna: 'Klub' };
const NA_STRANU = 12;

const stitok = (g: Galeria) => {
  if (g.typ_priradenia === 'tim') return g.tim?.nazov || NAZVY.tim;
  return NAZVY[(g.typ_priradenia ?? 'volna') as Exclude<Typ, ''>] ?? NAZVY.volna;
};

/** Počty galérií podľa typu - filtre bez obsahu sa neukážu. */
const usePocty = () => {
  const [pocty, setPocty] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    const ovladac = new AbortController();
    fetch(apiUrl('/galleries?limit=1&pocty=1'), { signal: ovladac.signal })
      .then((r) => r.json())
      .then((telo) => telo?.pocty && setPocty(telo.pocty))
      .catch(() => undefined);
    return () => ovladac.abort();
  }, []);
  return pocty;
};

const Galerie: React.FC = () => {
  const u = useUpravy();
  const [parametre, setParametre] = useSearchParams();
  const zvoleny = parametre.get('typ') ?? '';
  const typ: Typ = zvoleny in NAZVY ? (zvoleny as Typ) : '';
  const pocty = usePocty();
  useTitulok(typ ? `Fotogaléria: ${NAZVY[typ as Exclude<Typ, ''>]}` : 'Fotogaléria');

  const zoznam = useStrankovanyZoznam<Galeria>((strana) => `/galleries?page=${strana}&limit=${NA_STRANU}${typ ? `&typ=${typ}` : ''}`, typ);

  const typy = (Object.keys(NAZVY) as Array<Exclude<Typ, ''>>).filter((k) => (pocty ? pocty[k] > 0 : false));
  const zvolTyp = (k: Typ) => {
    const nove = new URLSearchParams(parametre);
    if (k) nove.set('typ', k);
    else nove.delete('typ');
    setParametre(nove, { replace: true });
  };

  return (
    <div className="zs-stranka zs-galerie">
      <HlavickaStranky stitok={u.text('stranka_galerie_stitok', 'Médiá')} nadpis={u.text('stranka_galerie_nadpis', 'Fotogaléria')} />

      {typy.length > 1 && (
        <Sekcia className="zs-sekcia--filtre">
          <Filtre<Typ>
            popis="Druh galérie"
            aktivna={typ}
            onZmena={zvolTyp}
            moznosti={[{ kluc: '', nazov: 'Všetko' }, ...typy.map((k) => ({ kluc: k, nazov: NAZVY[k] }))]}
          />
        </Sekcia>
      )}

      {zoznam.chyba ? (
        <Sekcia className="zs-sekcia--hore">
          <Chyba text={zoznam.chyba} />
        </Sekcia>
      ) : zoznam.prvaNacitava ? (
        <Nacitava text="Načítavam galérie…" />
      ) : zoznam.polozky.length === 0 ? (
        <Sekcia className="zs-sekcia--hore">
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne fotky" />
        </Sekcia>
      ) : (
        <>
          <Sekcia className={`zs-sekcia--mriezka${typy.length > 1 ? '' : ' zs-sekcia--hore'}`}>
            <div className="zs-mozaika">
              {zoznam.polozky.map((g, i) => (
                <Link key={g.id} to={`/galleries/${g.id}`} className={`zs-mozaika__dlazdica zs-mozaika__dlazdica--${(i % 7) + 1}`}>
                  <Obrazok src={g.nahladovy_obrazok} className="zs-mozaika__obrazok" />
                  <span className="zs-mozaika__text">
                    <small>
                      {stitok(g)} · {g.pocet_obrazkov} {sklon(g.pocet_obrazkov, 'fotka', 'fotky', 'fotiek')}
                    </small>
                    <strong>{g.nazov}</strong>
                  </span>
                </Link>
              ))}
            </div>
          </Sekcia>
          <Sekcia className="zs-sekcia--dalsie">{zoznam.dalsie && <NacitatDalsie nacitava={zoznam.nacitava} onClick={zoznam.nacitajDalsie} />}</Sekcia>
        </>
      )}
    </div>
  );
};

export default Galerie;
