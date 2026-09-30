// Umiestnenie: sablony/zakladna/src/stranky/Hladanie.tsx
// Vyhľadávanie na webe - predvolená stránka /hladat?q=….

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SKUPINY_HLADANIA, apiUrl, souborUrl, useHladanie, useNastavenia } from '@clubw/jadro';

const Hladanie: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const [parametre, setParametre] = useSearchParams();
  const [text, setText] = useState(parametre.get('q') ?? '');
  const { vysledky, nacitava, chyba } = useHladanie(text, 10);

  useEffect(() => {
    document.title = `Hľadať | ${nastavenia.nazov}`;
  }, [nastavenia.nazov]);
  useEffect(() => {
    const nove = new URLSearchParams(parametre);
    if (text.trim()) nove.set('q', text.trim());
    else nove.delete('q');
    setParametre(nove, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="bloky bloky--zakladne">
      <section className="blok">
        <div className="blok__vnutro" style={{ maxWidth: 860 }}>
          <h1 className="blok__nadpis blok__nadpis--velky">Hľadať na webe</h1>
          <input
            type="search"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Článok, hráč, tím, stránka…"
            aria-label="Hľadaný text"
            style={{ width: '100%', padding: '14px 16px', fontSize: '1.1rem', borderRadius: 10, border: '1px solid #cbd5e1', margin: '12px 0 24px' }}
          />
          {nacitava && <p>Hľadám…</p>}
          {chyba && <p role="alert">{chyba}</p>}
          {!nacitava && text.trim().length >= 2 && vysledky.length === 0 && !chyba && <p>Pre „{text.trim()}" sme nič nenašli.</p>}
          {SKUPINY_HLADANIA.map((sk) => {
            const vSkupine = vysledky.filter((v) => v.typ === sk.typ);
            if (vSkupine.length === 0) return null;
            return (
              <div key={sk.typ} style={{ marginBottom: 28 }}>
                <h2 className="blok__stitok">{sk.nazov}</h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                  {vSkupine.map((v) => {
                    const obsah = (
                      <>
                        {v.obrazok && <img src={/^https?:/.test(v.obrazok) ? v.obrazok : souborUrl(v.obrazok)} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />}
                        <span>
                          <strong style={{ display: 'block' }}>{v.nazov}</strong>
                          {v.popis && <small style={{ color: '#64748b' }}>{v.popis}</small>}
                        </span>
                      </>
                    );
                    const styl = { display: 'flex', gap: 12, alignItems: 'center', padding: 12, border: '1px solid #e2e8f0', borderRadius: 10, color: 'inherit', textDecoration: 'none' };
                    return (
                      <li key={`${v.typ}-${v.id}`}>
                        {v.odkaz.startsWith('/') && !v.odkaz.startsWith('/api/') ? (
                          <Link to={v.odkaz} style={styl}>
                            {obsah}
                          </Link>
                        ) : (
                          <a href={v.odkaz.startsWith('/api/') ? apiUrl(v.odkaz.replace(/^\/api/, '')) : v.odkaz} target="_blank" rel="noopener noreferrer" style={styl}>
                            {obsah}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Hladanie;
