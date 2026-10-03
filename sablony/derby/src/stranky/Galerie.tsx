// Umiestnenie: sablony/derby/src/stranky/Galerie.tsx
// Fotogaléria (podľa návrhu Fotogaléria z Claude Design): pilulky podľa
// toho, k čomu galéria patrí (zápasy, tímy, články, klub), prvých šesť
// albumov vo veľkých kartách po troch, ďalšie po štyroch a „Načítať ďalšie".

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
const VELKYCH = 6;

const stitok = (g: Galeria) => {
  if (g.typ_priradenia === 'tim') return g.tim?.nazov || NAZVY.tim;
  return NAZVY[(g.typ_priradenia ?? 'volna') as Exclude<Typ, ''>] ?? NAZVY.volna;
};

const KartaGalerie: React.FC<{ galeria: Galeria; velka?: boolean }> = ({ galeria: g, velka = false }) => (
  <Link to={`/galleries/${g.id}`} className={`dr-karta dr-karta--galeria${velka ? ' dr-karta--velka' : ''}`}>
    <Obrazok src={g.nahladovy_obrazok} className="dr-karta__obrazok" />
    <div className="dr-karta__text">
      <h4>{g.nazov}</h4>
      <div className="dr-clanok__meta">
        <span className="dr-clanok__kategoria">{stitok(g)}</span>
        <span className="dr-clanok__datum">
          {g.pocet_obrazkov} {sklon(g.pocet_obrazkov, 'fotka', 'fotky', 'fotiek')}
        </span>
      </div>
    </div>
  </Link>
);

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

  const velke = zoznam.polozky.slice(0, VELKYCH);
  const male = zoznam.polozky.slice(VELKYCH);

  return (
    <div className="dr-stranka dr-galerie">
      <HlavickaStranky stitok={u.text('stranka_galerie_stitok', 'Médiá')} nadpis={u.text('stranka_galerie_nadpis', 'Fotogaléria')} />

      {typy.length > 1 && (
        <Sekcia className="dr-sekcia--filtre">
          <Filtre<Typ>
            popis="Druh galérie"
            aktivna={typ}
            onZmena={zvolTyp}
            moznosti={[{ kluc: '', nazov: 'Všetko' }, ...typy.map((k) => ({ kluc: k, nazov: NAZVY[k] }))]}
          />
        </Sekcia>
      )}

      {zoznam.chyba ? (
        <Sekcia className="dr-sekcia--hore">
          <Chyba text={zoznam.chyba} />
        </Sekcia>
      ) : zoznam.prvaNacitava ? (
        <Nacitava text="Načítavam galérie…" />
      ) : zoznam.polozky.length === 0 ? (
        <Sekcia className="dr-sekcia--hore">
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne fotky" />
        </Sekcia>
      ) : (
        <>
          <Sekcia className={`dr-sekcia--mriezka${typy.length > 1 ? '' : ' dr-sekcia--hore'}`}>
            <div className="dr-mriezka-3 dr-mriezka-3--karty">
              {velke.map((g) => (
                <KartaGalerie key={g.id} galeria={g} velka />
              ))}
            </div>
            {male.length > 0 && (
              <div className="dr-mriezka-4 dr-mriezka-4--galerie">
                {male.map((g) => (
                  <KartaGalerie key={g.id} galeria={g} />
                ))}
              </div>
            )}
          </Sekcia>
          <Sekcia className="dr-sekcia--dalsie">{zoznam.dalsie && <NacitatDalsie nacitava={zoznam.nacitava} onClick={zoznam.nacitajDalsie} />}</Sekcia>
        </>
      )}
    </div>
  );
};

export default Galerie;
