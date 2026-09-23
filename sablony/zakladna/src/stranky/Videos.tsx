// Umiestnenie: sablony/zakladna/src/stranky/Videos.tsx
// Verejná videogaléria - zverejnené videá klubu s filtrom podľa rubriky.
// Video sa prehrá priamo na stránke (vložený prehrávač YouTube / Vimeo).

import React, { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@clubw/jadro';
import './Videos.css';

interface VerejneVideo {
  id: number;
  nazov: string;
  popis: string | null;
  url: string;
  zdroj: 'youtube' | 'vimeo' | 'ine';
  video_id: string | null;
  nahlad_url: string | null;
  dlzka: number | null;
  rubrika?: { id: number; nazov: string } | null;
  zapas?: { id: number; nazov: string } | null;
  vytvorene: string;
}

const dlzkaText = (sekundy: number | null): string => {
  if (!sekundy) return '';
  const h = Math.floor(sekundy / 3600);
  const m = Math.floor((sekundy % 3600) / 60);
  const s = String(sekundy % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/** Adresa vloženého prehrávača; pri neznámom zdroji null (otvorí sa odkaz). */
const embedUrl = (v: VerejneVideo): string | null => {
  if (v.zdroj === 'youtube' && v.video_id) {
    return `https://www.youtube-nocookie.com/embed/${v.video_id}?autoplay=1&rel=0`;
  }
  if (v.zdroj === 'vimeo' && v.video_id) return `https://player.vimeo.com/video/${v.video_id}?autoplay=1`;
  return null;
};

const Videos: React.FC = () => {
  const [videa, setVidea] = useState<VerejneVideo[]>([]);
  const [nacitava, setNacitava] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [rubrika, setRubrika] = useState<number | null>(null);
  const [prehrava, setPrehrava] = useState<VerejneVideo | null>(null);

  useEffect(() => {
    // Priamy odkaz na zápasové videá: /videa?zapas=12
    const zapas = new URLSearchParams(window.location.search).get('zapas');
    const url = apiUrl(`/videos?limit=500${zapas ? `&zapas_id=${encodeURIComponent(zapas)}` : ''}`);

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message || 'Videá sa nepodarilo načítať');
        setVidea(json.data ?? []);
      })
      .catch((e) => setChyba(e.message || 'Videá sa nepodarilo načítať'))
      .finally(() => setNacitava(false));
  }, []);

  useEffect(() => {
    if (!prehrava) return;
    const zavri = (e: KeyboardEvent) => e.key === 'Escape' && setPrehrava(null);
    window.addEventListener('keydown', zavri);
    return () => window.removeEventListener('keydown', zavri);
  }, [prehrava]);

  const rubriky = useMemo(() => {
    const mapa = new Map<number, string>();
    videa.forEach((v) => v.rubrika && mapa.set(v.rubrika.id, v.rubrika.nazov));
    return [...mapa.entries()].map(([id, nazov]) => ({ id, nazov }));
  }, [videa]);

  const zobrazene = rubrika ? videa.filter((v) => v.rubrika?.id === rubrika) : videa;

  const prehraj = (v: VerejneVideo) => {
    if (embedUrl(v)) setPrehrava(v);
    else window.open(v.url, '_blank', 'noopener');
  };

  return (
    <div className="vg">
      <header className="vg__hlavicka">
        <h1>Videá</h1>
        <p>Zostrihy zápasov, góly a rozhovory.</p>
      </header>

      {rubriky.length > 0 && (
        <div className="vg__filter" role="group" aria-label="Filtrovať podľa rubriky">
          <button className={rubrika === null ? 'is-aktivne' : ''} onClick={() => setRubrika(null)}>
            Všetky
          </button>
          {rubriky.map((r) => (
            <button key={r.id} className={rubrika === r.id ? 'is-aktivne' : ''} onClick={() => setRubrika(r.id)}>
              {r.nazov}
            </button>
          ))}
        </div>
      )}

      {nacitava ? (
        <p className="vg__stav">Načítavam videá…</p>
      ) : chyba ? (
        <p className="vg__stav vg__stav--chyba">{chyba}</p>
      ) : zobrazene.length === 0 ? (
        <p className="vg__stav">Zatiaľ tu nie sú žiadne videá.</p>
      ) : (
        <div className="vg__mriezka">
          {zobrazene.map((v) => (
            <article key={v.id} className="vg__karta">
              <button className="vg__nahlad" onClick={() => prehraj(v)} aria-label={`Prehrať ${v.nazov}`}>
                {v.nahlad_url && <img src={v.nahlad_url} alt="" loading="lazy" />}
                <span className="vg__play" aria-hidden="true">▶</span>
                {v.dlzka ? <span className="vg__dlzka">{dlzkaText(v.dlzka)}</span> : null}
              </button>
              <div className="vg__telo">
                {v.rubrika && <span className="vg__rubrika">{v.rubrika.nazov}</span>}
                <h2>{v.nazov}</h2>
                {v.popis && <p>{v.popis}</p>}
                {v.zapas && (
                  <a className="vg__zapas" href={`/matches/${v.zapas.id}`}>
                    Zápas: {v.zapas.nazov}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {prehrava && (
        <div className="vg__prehravac" role="dialog" aria-modal="true" aria-label={prehrava.nazov} onClick={() => setPrehrava(null)}>
          <div className="vg__prehravac-obsah" onClick={(e) => e.stopPropagation()}>
            <button className="vg__zavriet" onClick={() => setPrehrava(null)} aria-label="Zavrieť">×</button>
            <div className="vg__ramec">
              <iframe
                src={embedUrl(prehrava)!}
                title={prehrava.nazov}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
            <h2>{prehrava.nazov}</h2>
            {prehrava.popis && <p>{prehrava.popis}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Videos;
