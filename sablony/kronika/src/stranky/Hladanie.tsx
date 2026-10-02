// Umiestnenie: sablony/kronika/src/stranky/Hladanie.tsx
// Vyhľadávanie na webe (/hladat?q=…): veľké pole v tmavej hlavičke,
// výsledky sa zobrazujú počas písania, zoskupené podľa typu.

import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SKUPINY_HLADANIA, apiUrl, useHladanie, type VysledokHladania } from '@clubw/jadro';
import { Sekcia } from '../casti';
import { Ikona, obrazokUrl, useTitulok } from '../spolocne';

const Vysledok: React.FC<{ v: VysledokHladania }> = ({ v }) => {
  const obrazok = obrazokUrl(v.obrazok);
  const obsah = (
    <>
      <span className={`kr-vysledok__obrazok${obrazok ? '' : ' is-prazdny'}`}>
        {obrazok ? <img src={obrazok} alt="" loading="lazy" /> : <Ikona nazov={v.typ === 'hrac' || v.typ === 'tim' ? 'tim' : v.typ === 'video' ? 'play' : 'spravy'} velkost={20} />}
      </span>
      <span className="kr-vysledok__text">
        <strong>{v.nazov}</strong>
        {v.popis && <small>{v.popis}</small>}
      </span>
      <Ikona nazov="sipka" velkost={16} className="kr-vysledok__sipka" />
    </>
  );
  if (v.odkaz.startsWith('/api/')) {
    return (
      <a href={apiUrl(v.odkaz.replace(/^\/api/, ''))} className="kr-vysledok" target="_blank" rel="noopener noreferrer">
        {obsah}
      </a>
    );
  }
  return v.odkaz.startsWith('/') ? (
    <Link to={v.odkaz} className="kr-vysledok">
      {obsah}
    </Link>
  ) : (
    <a href={v.odkaz} className="kr-vysledok" target="_blank" rel="noopener noreferrer">
      {obsah}
    </a>
  );
};

const Hladanie: React.FC = () => {
  useTitulok('Hľadať');
  const [parametre, setParametre] = useSearchParams();
  const [text, setText] = useState(parametre.get('q') ?? '');
  const pole = useRef<HTMLInputElement>(null);
  const { vysledky, nacitava, chyba } = useHladanie(text, 8);
  const dotaz = text.trim();

  useEffect(() => {
    pole.current?.focus();
  }, []);
  // Hľadaný text sa drží v adrese (dá sa zdieľať a vrátiť späť)
  useEffect(() => {
    const nove = new URLSearchParams(parametre);
    if (dotaz) nove.set('q', dotaz);
    else nove.delete('q');
    setParametre(nove, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dotaz]);

  return (
    <div className="kr-stranka kr-hladanie">
      <header className="kr-hlava kr-hlava--hladanie">
        <div className="kr-kontajner">
          <span className="kr-hlava__stitok">Hľadať na webe</span>
          <form className="kr-hladanie__pole" role="search" onSubmit={(e) => e.preventDefault()}>
            <Ikona nazov="hladat" velkost={24} />
            <input ref={pole} type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Článok, hráč, tím, stránka…" aria-label="Hľadaný text" />
            {text && (
              <button type="button" onClick={() => setText('')} aria-label="Vymazať">
                <Ikona nazov="zavriet" velkost={18} />
              </button>
            )}
          </form>
        </div>
      </header>
      <Sekcia className="kr-sekcia--hore">
        {dotaz.length < 2 ? (
          <p className="kr-hladanie__info">Zadajte aspoň 2 znaky - hľadáme v článkoch, stránkach, tímoch, hráčoch, videách, galériách, dokumentoch aj vo fanshope.</p>
        ) : nacitava && vysledky.length === 0 ? (
          <p className="kr-hladanie__info">Hľadám…</p>
        ) : chyba ? (
          <p className="kr-hladanie__info" role="alert">
            {chyba}
          </p>
        ) : vysledky.length === 0 ? (
          <div className="kr-hladanie__prazdne">
            <strong>Pre „{dotaz}" sme nič nenašli</strong>
            <p>Skúste iné slovo alebo kratší výraz.</p>
          </div>
        ) : (
          <div className="kr-hladanie__skupiny" aria-live="polite">
            <p className="kr-hladanie__info">
              Nájdené výsledky pre „{dotaz}": <strong>{vysledky.length}</strong>
            </p>
            {SKUPINY_HLADANIA.map((sk) => {
              const vSkupine = vysledky.filter((v) => v.typ === sk.typ);
              if (vSkupine.length === 0) return null;
              return (
                <section key={sk.typ} className="kr-hladanie__skupina" aria-label={sk.nazov}>
                  <h2 className="kr-skupina__nadpis kr-skupina__nadpis--male">
                    {sk.nazov} <span>{vSkupine.length}</span>
                  </h2>
                  <div className="kr-hladanie__zoznam">
                    {vSkupine.map((v) => (
                      <Vysledok key={`${v.typ}-${v.id}`} v={v} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Sekcia>
    </div>
  );
};

export default Hladanie;
