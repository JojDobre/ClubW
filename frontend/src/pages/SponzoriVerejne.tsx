// frontend/src/pages/SponzoriVerejne.tsx
// Verejná stránka partnerov klubu (/sponzori), zoskupená podľa úrovne.
// Server vracia len zobrazených sponzorov s platným partnerstvom.

import React, { useEffect, useState } from 'react';
import { apiUrl, souborUrl } from '../config/api';
import './SponzoriVerejne.css';

interface Sponzor {
  id: number;
  nazov: string;
  uroven_id: number | null;
  logo: string | null;
  web_url: string | null;
  popis: string | null;
}

interface Uroven {
  id: number;
  nazov: string;
  popis: string | null;
  poradie: number;
  velkost_loga: 'velke' | 'stredne' | 'male';
}

const nacitaj = async <T,>(cesta: string): Promise<T[]> => {
  const r = await fetch(apiUrl(cesta));
  const obsah = await r.json().catch(() => null);
  if (!r.ok || !obsah?.success) throw new Error(obsah?.message || 'Partnerov sa nepodarilo načítať');
  return Array.isArray(obsah.data) ? obsah.data : [];
};

const SponzoriVerejne: React.FC = () => {
  const [sponzori, setSponzori] = useState<Sponzor[] | null>(null);
  const [urovne, setUrovne] = useState<Uroven[]>([]);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Partneri klubu';
    Promise.all([nacitaj<Sponzor>('/sponsors?limit=500'), nacitaj<Uroven>('/sponsor-levels')])
      .then(([s, u]) => {
        setUrovne([...u].sort((a, b) => a.poradie - b.poradie));
        setSponzori(s);
      })
      .catch((e) => setChyba(e.message));
  }, []);

  // Skupiny v poradí úrovní; sponzori bez úrovne ako „Ďalší partneri" na konci
  const skupiny = [
    ...urovne.map((u) => ({ kluc: String(u.id), nazov: u.nazov, popis: u.popis, velkost: u.velkost_loga, polozky: (sponzori ?? []).filter((s) => s.uroven_id === u.id) })),
    {
      kluc: 'ostatni',
      nazov: 'Ďalší partneri',
      popis: null,
      velkost: 'stredne' as const,
      polozky: (sponzori ?? []).filter((s) => !s.uroven_id || !urovne.some((u) => u.id === s.uroven_id)),
    },
  ].filter((sk) => sk.polozky.length > 0);

  return (
    <div className="sp">
      <h1>Partneri klubu</h1>
      <p className="sp__uvod">Ďakujeme všetkým, ktorí podporujú náš klub.</p>

      {chyba ? (
        <p className="sp__stav">{chyba}</p>
      ) : sponzori === null ? (
        <p className="sp__stav">Načítavam partnerov...</p>
      ) : sponzori.length === 0 ? (
        <p className="sp__stav">Zatiaľ tu nie sú žiadni partneri.</p>
      ) : (
        skupiny.map((sk) => (
          <section key={sk.kluc} className={`sp__skupina sp__skupina--${sk.velkost}`}>
            <h2>{sk.nazov}</h2>
            {sk.popis && <p className="sp__popis-urovne">{sk.popis}</p>}
            <div className="sp__mriezka">
              {sk.polozky.map((s) => {
                const obsah = (
                  <>
                    <span className="sp__logo">
                      {s.logo ? <img src={souborUrl(s.logo)} alt={s.nazov} /> : <strong>{s.nazov}</strong>}
                    </span>
                    {/* Bez loga je názov už v ploche loga */}
                    {s.logo && <span className="sp__nazov">{s.nazov}</span>}
                    {s.popis && <span className="sp__popis">{s.popis}</span>}
                  </>
                );
                return s.web_url ? (
                  <a key={s.id} className="sp__karta" href={s.web_url} target="_blank" rel="noopener noreferrer">
                    {obsah}
                  </a>
                ) : (
                  <div key={s.id} className="sp__karta">
                    {obsah}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default SponzoriVerejne;
