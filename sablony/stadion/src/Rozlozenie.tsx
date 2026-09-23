// Umiestnenie: sablony/stadion/src/Rozlozenie.tsx
// Hlavička a pätička šablóny Štadión.

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  OdkazMenu,
  jePrihlaseny,
  otvorNastaveniaCookies,
  souborUrl,
  useMenuWebu,
  useNastavenia,
  useNastaveniaSablony,
} from '@clubw/jadro';

interface Nastavenia extends Record<string, string | number | boolean | null> {
  farba_hlavicky: 'tmava' | 'klub';
}

export const Hlavicka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { farba_hlavicky } = useNastaveniaSablony<Nastavenia>();
  const { polozky } = useMenuWebu();
  const { pathname } = useLocation();
  const [otvorene, setOtvorene] = useState(false);

  useEffect(() => setOtvorene(false), [pathname]);

  return (
    <header className={`st-hlavicka st-hlavicka--${farba_hlavicky === 'klub' ? 'klub' : 'tmava'}`}>
      <div className="st-hlavicka__vnutro">
        <Link to="/" className="st-logo">
          {nastavenia.logo ? (
            <img src={souborUrl(nastavenia.logo)} alt="" />
          ) : (
            <span className="st-logo__znak" aria-hidden="true">
              {nastavenia.skratka || nastavenia.nazov.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="st-logo__text">
            <strong>{nastavenia.nazov}</strong>
            {nastavenia.rok_zalozenia && <small>od roku {nastavenia.rok_zalozenia}</small>}
          </span>
        </Link>

        <button
          type="button"
          className="st-menu-tlacidlo"
          aria-expanded={otvorene}
          aria-controls="st-menu"
          onClick={() => setOtvorene((o) => !o)}
        >
          {otvorene ? 'Zavrieť' : 'Menu'}
        </button>

        <nav id="st-menu" className={`st-menu${otvorene ? ' is-otvorene' : ''}`} aria-label="Hlavné menu">
          {polozky.map((p) => (
            <div key={p.id} className="st-menu__polozka">
              <OdkazMenu polozka={p} className={`st-menu__odkaz${p.odkaz === pathname ? ' is-aktivny' : ''}`} />
              {(p.deti?.length ?? 0) > 0 && (
                <div className="st-menu__podmenu">
                  {p.deti!.map((d) => (
                    <OdkazMenu key={d.id} polozka={d} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {jePrihlaseny() && (
            <Link to="/admin" className="st-menu__admin">
              Administrácia
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { farba_hlavicky } = useNastaveniaSablony<Nastavenia>();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const siete = Object.entries({
    Facebook: nastavenia.socialne_siete?.facebook,
    Instagram: nastavenia.socialne_siete?.instagram,
    YouTube: nastavenia.socialne_siete?.youtube,
    X: nastavenia.socialne_siete?.x,
    TikTok: nastavenia.socialne_siete?.tiktok,
  }).filter(([, url]) => Boolean(url)) as Array<[string, string]>;
  const gdpr = nastavenia.gdpr ?? {};

  return (
    <footer className={`st-paticka st-paticka--${farba_hlavicky === 'klub' ? 'klub' : 'tmava'}`}>
      <div className="st-paticka__vnutro">
        <div className="st-paticka__klub">
          <strong>{nastavenia.nazov}</strong>
          {nastavenia.slogan && <p>{nastavenia.slogan}</p>}
          {nastavenia.udaje?.pravny_nazov && <p>{nastavenia.udaje.pravny_nazov}</p>}
          {nastavenia.udaje?.ico && <p>IČO: {nastavenia.udaje.ico}</p>}
        </div>
        <div className="st-paticka__kontakt">
          {kontakt.adresa && <p>{kontakt.adresa}</p>}
          {kontakt.email && (
            <p>
              <a href={`mailto:${kontakt.email}`}>{kontakt.email}</a>
            </p>
          )}
          {kontakt.telefon && (
            <p>
              <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>{kontakt.telefon}</a>
            </p>
          )}
        </div>
        {siete.length > 0 && (
          <div className="st-paticka__siete">
            {siete.map(([nazov, url]) => (
              <a key={nazov} href={url} target="_blank" rel="noopener noreferrer">
                {nazov}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="st-paticka__spodok">
        <span>
          © {new Date().getFullYear()} {nastavenia.nazov}
        </span>
        {gdpr.odkaz_zasad && <a href={gdpr.odkaz_zasad}>Ochrana osobných údajov</a>}
        <button type="button" onClick={otvorNastaveniaCookies}>
          Nastavenia cookies
        </button>
      </div>
    </footer>
  );
};
