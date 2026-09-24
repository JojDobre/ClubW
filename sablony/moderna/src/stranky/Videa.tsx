// Umiestnenie: sablony/moderna/src/stranky/Videa.tsx
// Videá: veľký prehrávač a mriežka ďalších videí. Prehrávač YouTube
// (bez cookies) alebo Vimeo sa načíta až po kliknutí - dovtedy stránka
// nenačíta nič z cudzích serverov okrem náhľadov.
// ?zapas=<id> ukáže len videá z jedného zápasu.

import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chyba, HlavickaStranky, Ikona, Nacitava, Prazdne, datum, skryObrazok, useApi, useTitulok } from '../spolocne';

interface Video {
  id: number;
  nazov: string;
  popis: string | null;
  url: string;
  zdroj: 'youtube' | 'vimeo' | 'ine';
  video_id: string | null;
  nahlad_url?: string | null;
  nahlad?: string | null;
  dlzka: number | null;
  vytvorene: string;
  rubrika?: { nazov: string } | null;
  zapas?: { id: number; nazov?: string } | null;
}

const dlzkaText = (s: number | null) => {
  if (!s) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sek}` : `${m}:${sek}`;
};

const embedUrl = (v: Video) => {
  if (v.zdroj === 'youtube' && v.video_id) return `https://www.youtube-nocookie.com/embed/${v.video_id}?autoplay=1&rel=0`;
  if (v.zdroj === 'vimeo' && v.video_id) return `https://player.vimeo.com/video/${v.video_id}?autoplay=1`;
  return null;
};

const nahlad = (v: Video) => v.nahlad_url || v.nahlad || null;

const Videa: React.FC = () => {
  const [parametre] = useSearchParams();
  const zapas = parametre.get('zapas');
  const videa = useApi<Video[]>(`/videos?limit=500${zapas ? `&zapas_id=${encodeURIComponent(zapas)}` : ''}`);
  const [vybrane, setVybrane] = useState<Video | null>(null);
  const [hra, setHra] = useState(false);
  const prehravac = useRef<HTMLDivElement>(null);
  useTitulok('Videá');

  const zoznam = videa.data ?? [];
  const aktualne = vybrane ?? zoznam[0] ?? null;

  useEffect(() => setHra(false), [aktualne?.id]);

  const vyber = (v: Video) => {
    if (!embedUrl(v)) {
      window.open(v.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setVybrane(v);
    setTimeout(() => {
      setHra(true);
      prehravac.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  return (
    <div className="md-stranka">
      <HlavickaStranky stitok="Videá" nadpis="Zostrihy, góly a rozhovory." popis={zapas ? 'Videá z vybraného zápasu.' : 'Klubový život v pohybe.'}>
        {zapas ? (
          <Link to="/videa" className="md-tlacidlo md-tlacidlo--sekundarne">
            Všetky videá
          </Link>
        ) : (
          <Link to="/galleries" className="md-tlacidlo md-tlacidlo--sekundarne">
            <Ikona nazov="foto" velkost={16} /> Fotogalérie
          </Link>
        )}
      </HlavickaStranky>
      <div className="md-kontajner">
        {videa.nacitava ? (
          <Nacitava text="Načítavam videá…" />
        ) : videa.chyba ? (
          <Chyba text={videa.chyba} />
        ) : !aktualne ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne videá" />
        ) : (
          <>
            <div className="md-prehravac" ref={prehravac}>
              <div className="md-prehravac__okno">
                {hra && embedUrl(aktualne) ? (
                  <iframe
                    src={embedUrl(aktualne)!}
                    title={aktualne.nazov}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <button type="button" className="md-prehravac__nahlad" onClick={() => vyber(aktualne)} aria-label={`Prehrať video ${aktualne.nazov}`}>
                    {nahlad(aktualne) && <img src={nahlad(aktualne)!} alt="" onError={skryObrazok} />}
                    <span className="md-prehravac__hrat" aria-hidden="true">
                      <Ikona nazov="hrat" velkost={30} />
                    </span>
                  </button>
                )}
              </div>
              <div className="md-prehravac__text">
                <div className="md-stitok">{[aktualne.rubrika?.nazov, datum(aktualne.vytvorene)].filter(Boolean).join(' · ')}</div>
                <h2>{aktualne.nazov}</h2>
                {aktualne.popis && <p>{aktualne.popis}</p>}
                {aktualne.zapas && (
                  <Link to={`/matches/${aktualne.zapas.id}`} className="md-odkaz-sipka">
                    Detail zápasu <Ikona nazov="sipka" />
                  </Link>
                )}
              </div>
            </div>

            {zoznam.length > 1 && (
              <div className="md-mriezka-videi">
                {zoznam.map((v) => (
                  <button key={v.id} type="button" className={`md-video${v.id === aktualne.id ? ' is-aktivne' : ''}`} onClick={() => vyber(v)}>
                    <span className="md-video__nahlad">
                      {nahlad(v) ? <img src={nahlad(v)!} alt="" loading="lazy" onError={skryObrazok} /> : <span className="md-obrazok--prazdny" />}
                      <span className="md-video__hrat" aria-hidden="true">
                        <Ikona nazov="hrat" velkost={18} />
                      </span>
                      {dlzkaText(v.dlzka) && <span className="md-video__dlzka">{dlzkaText(v.dlzka)}</span>}
                    </span>
                    <span className="md-video__text">
                      <strong>{v.nazov}</strong>
                      <small>{datum(v.vytvorene)}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Videa;
