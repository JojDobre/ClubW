// Umiestnenie: frontend/src/web/zivyPrenos.tsx
//
// Živý prenos zápasu na webe: fáza (1. polčas, polčas, 2. polčas...),
// bežiaca minúta a video prenos (YouTube, Facebook alebo odkaz).
// Administrácia (Zápasy → Živý záznam) zapisuje fázu a čas jej začiatku,
// minútu z nich počíta prehliadač návštevníka.
//
// Šablóna použije hotový <ZivyPrenos zapas={z} /> na stránke zápasu a
// useZivaObnova(), aby sa skóre a udalosti počas zápasu samy obnovovali.

import React, { useEffect, useState } from 'react';
import './zivyPrenos.css';

import { NAZVY_FAZ, vlozenieStreamu, zivaMinuta, type ZapasPrenosu } from './zivaMinuta';

export { NAZVY_FAZ, vlozenieStreamu, zivaMinuta };
export type { ZapasPrenosu };

/** Aktuálny čas, ktorý sa obnovuje v danom intervale (pre bežiacu minútu). */
export const useTeraz = (ms = 15_000): number => {
  const [teraz, setTeraz] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setTeraz(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return teraz;
};

/**
 * Počítadlo, ktoré sa počas živého zápasu zvýši každých 20 sekúnd
 * (len keď je karta viditeľná). Šablóna ho pridá do adresy API, aby sa
 * skóre, udalosti a fáza načítali znova:
 *
 * @example
 *   const tik = useZivaObnova(stav === 'prebieha');
 *   const zapas = useApi(`/matches/${id}${tik ? `?t=${tik}` : ''}`);
 */
export const useZivaObnova = (aktivne: boolean, ms = 20_000): number => {
  const [tik, setTik] = useState(0);
  useEffect(() => {
    if (!aktivne) return;
    const t = setInterval(() => {
      if (!document.hidden) setTik((x) => x + 1);
    }, ms);
    return () => clearInterval(t);
  }, [aktivne, ms]);
  return tik;
};

/**
 * Pás živého prenosu: Live, fáza, bežiaca minúta a video. Pred zápasom
 * s odkazom na prenos ponúkne „Prenos začne…“. Po zápase sa neukáže.
 */
export const ZivyPrenos: React.FC<{ zapas: ZapasPrenosu; className?: string }> = ({ zapas: z, className = '' }) => {
  const teraz = useTeraz();
  const [prehravac, setPrehravac] = useState(false);
  const zivy = z.status === 'prebieha';
  if (!zivy && !(z.stream_url && z.status === 'naplanovany')) return null;
  const minuta = zivy ? zivaMinuta(z, teraz) : null;
  const faza = zivy && z.live_faza ? NAZVY_FAZ[z.live_faza] : null;
  const vlozenie = vlozenieStreamu(z.stream_url);
  return (
    <section className={`zivy-prenos${zivy ? ' is-zivy' : ''} ${className}`} aria-label="Živý prenos">
      <div className="zivy-prenos__lista">
        {zivy ? (
          <span className="zivy-prenos__live">
            <i aria-hidden="true" />
            Live
          </span>
        ) : (
          <span className="zivy-prenos__live zivy-prenos__live--caka">Prenos</span>
        )}
        <span className="zivy-prenos__stav">
          {zivy ? (
            <>
              {minuta && <strong>{minuta}</strong>}
              {faza ?? 'Zápas prebieha'}
            </>
          ) : (
            'Prenos začne so začiatkom zápasu'
          )}
        </span>
        {z.stream_url && !prehravac && (
          vlozenie ? (
            <button type="button" className="zivy-prenos__tlacidlo" onClick={() => setPrehravac(true)}>
              ▶ Sledovať naživo
            </button>
          ) : (
            <a className="zivy-prenos__tlacidlo" href={z.stream_url} target="_blank" rel="noopener noreferrer">
              ▶ Sledovať naživo
            </a>
          )
        )}
      </div>
      {prehravac && vlozenie && (
        <div className="zivy-prenos__video">
          <iframe src={vlozenie} title="Živý prenos zápasu" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        </div>
      )}
    </section>
  );
};
