// Umiestnenie: sablony/moderna/src/stranky/Galeria.tsx
// Fotogaléria: mriežka fotiek a prehliadač na celú obrazovku
// (šípky, Escape, potiahnutie prstom na mobile).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { souborUrl } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { Chyba, HlavickaStranky, Ikona, Nacitava, Prazdne, datum, sklon, useApi, useTitulok } from '../spolocne';

interface Fotka {
  id: number;
  nazov: string | null;
  popis: string | null;
  sirka: number | null;
  vyska: number | null;
  url_original: string;
  url_stredny?: string | null;
  url_maly?: string | null;
}

interface Galeria {
  id: number;
  nazov: string;
  popis: string | null;
  pocet_obrazkov: number;
  vytvoreny: string;
  obrazky: Fotka[];
}

const Prehliadac: React.FC<{ fotky: Fotka[]; index: number; setIndex: (i: number | null) => void; nazov: string }> = ({ fotky, index, setIndex, nazov }) => {
  const dotyk = useRef<number | null>(null);
  const zavriet = useRef<HTMLButtonElement>(null);
  const fotka = fotky[index];
  const dalsia = useCallback(() => setIndex((index + 1) % fotky.length), [index, fotky.length, setIndex]);
  const predosla = useCallback(() => setIndex((index - 1 + fotky.length) % fotky.length), [index, fotky.length, setIndex]);

  useEffect(() => {
    const klaves = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowRight') dalsia();
      if (e.key === 'ArrowLeft') predosla();
    };
    window.addEventListener('keydown', klaves);
    document.body.classList.add('md-bez-posunu');
    return () => {
      window.removeEventListener('keydown', klaves);
      document.body.classList.remove('md-bez-posunu');
    };
  }, [dalsia, predosla, setIndex]);

  useEffect(() => zavriet.current?.focus(), []);

  return (
    <div
      className="md-prehliadac"
      role="dialog"
      aria-modal="true"
      aria-label={`${nazov} - fotka ${index + 1} z ${fotky.length}`}
      onTouchStart={(e) => (dotyk.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (dotyk.current === null) return;
        const posun = e.changedTouches[0].clientX - dotyk.current;
        if (Math.abs(posun) > 50) (posun < 0 ? dalsia : predosla)();
        dotyk.current = null;
      }}
    >
      <div className="md-prehliadac__lista">
        <span>
          {index + 1} / {fotky.length}
        </span>
        <div>
          <a href={souborUrl(fotka.url_original)} target="_blank" rel="noopener noreferrer" className="md-ikona-tlacidlo" aria-label="Otvoriť v plnej veľkosti">
            <Ikona nazov="stiahnut" velkost={20} />
          </a>
          <button ref={zavriet} type="button" className="md-ikona-tlacidlo" onClick={() => setIndex(null)} aria-label="Zavrieť">
            <Ikona nazov="zavriet" velkost={22} />
          </button>
        </div>
      </div>
      <figure className="md-prehliadac__fotka">
        <img key={fotka.id} src={souborUrl(fotka.url_original)} alt={fotka.popis || fotka.nazov || ''} />
        {fotka.popis && <figcaption>{fotka.popis}</figcaption>}
      </figure>
      {fotky.length > 1 && (
        <>
          <button type="button" className="md-prehliadac__sipka md-prehliadac__sipka--vlavo" onClick={predosla} aria-label="Predchádzajúca fotka">
            <Ikona nazov="vlavo" velkost={26} />
          </button>
          <button type="button" className="md-prehliadac__sipka md-prehliadac__sipka--vpravo" onClick={dalsia} aria-label="Ďalšia fotka">
            <Ikona nazov="vpravo" velkost={26} />
          </button>
        </>
      )}
    </div>
  );
};

const Galeria: React.FC = () => {
  const { id = '' } = useParams();
  const galeria = useApi<Galeria>(`/galleries/${encodeURIComponent(id)}`);
  const [otvorena, setOtvorena] = useState<number | null>(null);
  const g = galeria.data;
  useTitulok(g?.nazov);

  if (galeria.nacitava) return <Nacitava text="Načítavam fotky…" />;
  if (galeria.stav === 404) return <NenajdenyObsah nadpis="Túto galériu sme nenašli." spat={{ odkaz: '/galleries', text: 'Všetky galérie' }} />;
  if (galeria.chyba || !g) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={galeria.chyba || 'Galériu sa nepodarilo načítať.'} />
      </div>
    );
  }

  const fotky = g.obrazky ?? [];

  return (
    <div className="md-stranka">
      <HlavickaStranky
        stitok={`${fotky.length} ${sklon(fotky.length, 'fotka', 'fotky', 'fotiek')} · ${datum(g.vytvoreny)}`}
        nadpis={g.nazov}
        popis={g.popis}
        spat={{ odkaz: '/galleries', text: 'Všetky galérie' }}
      />
      <div className="md-kontajner">
        {fotky.length === 0 ? (
          <Prazdne nadpis="Galéria je zatiaľ prázdna" />
        ) : (
          <div className="md-fotky">
            {fotky.map((f, i) => (
              <button key={f.id} type="button" className="md-fotky__polozka" onClick={() => setOtvorena(i)} aria-label={`Otvoriť fotku ${i + 1}${f.popis ? `: ${f.popis}` : ''}`}>
                <img
                  src={souborUrl(f.url_stredny || f.url_original)}
                  alt={f.popis || ''}
                  loading="lazy"
                  width={f.sirka ?? undefined}
                  height={f.vyska ?? undefined}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {otvorena !== null && fotky[otvorena] && <Prehliadac fotky={fotky} index={otvorena} setIndex={setOtvorena} nazov={g.nazov} />}
    </div>
  );
};

export default Galeria;
