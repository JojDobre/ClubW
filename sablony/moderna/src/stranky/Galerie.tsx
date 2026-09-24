// Umiestnenie: sablony/moderna/src/stranky/Galerie.tsx
// Zoznam fotogalérií - veľké náhľady albumov, postupné načítanie.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '@clubw/jadro';
import { Chyba, HlavickaStranky, Ikona, NacitatDalsie, Nacitava, Obrazok, Prazdne, datum, sklon, useTitulok, type Strankovanie } from '../spolocne';

interface Galeria {
  id: number;
  nazov: string;
  popis: string | null;
  pocet_obrazkov: number;
  nahladovy_obrazok: string | null;
  vytvoreny: string;
}

const Galerie: React.FC = () => {
  const [galerie, setGalerie] = useState<Galeria[]>([]);
  const [strana, setStrana] = useState(1);
  const [strankovanie, setStrankovanie] = useState<Strankovanie | null>(null);
  const [nacitava, setNacitava] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  useTitulok('Fotogalérie');

  useEffect(() => {
    const ovladac = new AbortController();
    setNacitava(true);
    fetch(apiUrl(`/galleries?page=${strana}&limit=12`), { signal: ovladac.signal })
      .then((r) => r.json())
      .then((telo) => {
        if (!telo?.success) throw new Error(telo?.message || 'Galérie sa nepodarilo načítať');
        setGalerie((s) => [...s, ...telo.data.filter((g: Galeria) => !s.some((x) => x.id === g.id))]);
        setStrankovanie(telo.pagination ?? null);
      })
      .catch((e: Error) => e.name !== 'AbortError' && setChyba(e.message))
      .finally(() => !ovladac.signal.aborted && setNacitava(false));
    return () => ovladac.abort();
  }, [strana]);

  return (
    <div className="md-stranka">
      <HlavickaStranky
        stitok="Fotogalérie"
        nadpis="Momenty, ktoré ostanú."
        popis="Zápasy, tréningy a život v klube na fotkách."
      >
        <Link to="/videa" className="md-tlacidlo md-tlacidlo--sekundarne">
          <Ikona nazov="hrat" velkost={16} /> Videá
        </Link>
      </HlavickaStranky>
      <div className="md-kontajner">
        {chyba ? (
          <Chyba text={chyba} />
        ) : nacitava && galerie.length === 0 ? (
          <Nacitava text="Načítavam galérie…" />
        ) : galerie.length === 0 ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne fotky" />
        ) : (
          <>
            <div className="md-mriezka-galerii">
              {galerie.map((g, i) => (
                <Link key={g.id} to={`/galleries/${g.id}`} className={`md-album${i === 0 ? ' md-album--velky' : ''}`}>
                  <div className="md-album__obrazok">
                    <Obrazok src={g.nahladovy_obrazok} />
                  </div>
                  <div className="md-album__text">
                    <span className="md-stitok md-stitok--svetly">
                      <Ikona nazov="foto" velkost={14} /> {g.pocet_obrazkov} {sklon(g.pocet_obrazkov, 'fotka', 'fotky', 'fotiek')}
                    </span>
                    <strong>{g.nazov}</strong>
                    <small>{datum(g.vytvoreny)}</small>
                  </div>
                </Link>
              ))}
            </div>
            {strankovanie?.has_next && <NacitatDalsie nacitava={nacitava} onClick={() => setStrana((s) => s + 1)} />}
          </>
        )}
      </div>
    </div>
  );
};

export default Galerie;
