// frontend/src/pages/SponzoriVerejne.tsx
// Verejná stránka partnerov klubu (/sponzori), zoskupená podľa úrovne.
// Server vracia len zobrazených sponzorov s platným partnerstvom.

import React, { useEffect, useState } from 'react';
import { apiUrl, souborUrl } from '../config/api';
import './SponzoriVerejne.css';

interface Sponzor {
  id: number;
  nazov: string;
  uroven: 'generalny' | 'hlavny' | 'partner' | 'dodavatel';
  logo: string | null;
  web_url: string | null;
  popis: string | null;
}

const UROVNE: Array<{ hodnota: Sponzor['uroven']; nazov: string }> = [
  { hodnota: 'generalny', nazov: 'Generálny partner' },
  { hodnota: 'hlavny', nazov: 'Hlavní partneri' },
  { hodnota: 'partner', nazov: 'Partneri' },
  { hodnota: 'dodavatel', nazov: 'Dodávatelia' },
];

const SponzoriVerejne: React.FC = () => {
  const [sponzori, setSponzori] = useState<Sponzor[] | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Partneri klubu';
    fetch(apiUrl('/sponsors?limit=500'))
      .then(async (r) => {
        const obsah = await r.json().catch(() => null);
        if (!r.ok || !obsah?.success) throw new Error(obsah?.message || 'Partnerov sa nepodarilo načítať');
        setSponzori(obsah.data);
      })
      .catch((e) => setChyba(e.message));
  }, []);

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
        UROVNE.map((u) => {
          const skupina = sponzori.filter((s) => s.uroven === u.hodnota);
          if (skupina.length === 0) return null;
          return (
            <section key={u.hodnota} className={`sp__skupina sp__skupina--${u.hodnota}`}>
              <h2>{u.nazov}</h2>
              <div className="sp__mriezka">
                {skupina.map((s) => {
                  const obsah = (
                    <>
                      <span className="sp__logo">
                        {s.logo ? <img src={souborUrl(s.logo)} alt={s.nazov} /> : <strong>{s.nazov}</strong>}
                      </span>
                      <span className="sp__nazov">{s.nazov}</span>
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
          );
        })
      )}
    </div>
  );
};

export default SponzoriVerejne;
