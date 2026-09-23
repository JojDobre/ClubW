// Umiestnenie: sablony/zakladna/src/Rozlozenie.tsx
// Rozloženie základnej šablóny: hlavička s menu, obsah, pätička.
//
// Hlavička a pätička sa vykresľujú cez <Cast>, takže šablóna, ktorá
// nahradí len hlavičku, dostane zvyšok rozloženia odtiaľto. Vzhľad je
// v triedach zk-* (Rozlozenie.css) - šablóna len so štýlom ich môže
// prepísať bez jediného riadku skriptu.

import React, { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Cast,
  OdkazMenu,
  jePrihlaseny,
  otvorNastaveniaCookies,
  souborUrl,
  useMenuWebu,
  useNastavenia,
} from '@clubw/jadro';
import './Rozlozenie.css';

export const Rozlozenie: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="zk">
    <Cast nazov="Hlavicka" />
    <main className="zk-obsah">{children}</main>
    <Cast nazov="Paticka" />
  </div>
);

export const Hlavicka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { polozky } = useMenuWebu();
  const [otvorene, setOtvorene] = useState(false);
  const { pathname } = useLocation();

  // Po prechode na inú stránku sa mobilné menu zavrie
  useEffect(() => setOtvorene(false), [pathname]);

  return (
    <header className="zk-hlavicka">
      <div className="zk-hlavicka__vnutro">
        <Link to="/" className="zk-logo">
          {nastavenia.logo ? (
            <img src={souborUrl(nastavenia.logo)} alt="" className="zk-logo__obrazok" />
          ) : (
            <span className="zk-logo__znak" aria-hidden="true">
              {nastavenia.skratka || nastavenia.nazov.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="zk-logo__nazov">{nastavenia.nazov}</span>
        </Link>

        <button
          type="button"
          className="zk-menu-tlacidlo"
          aria-expanded={otvorene}
          aria-controls="zk-menu"
          onClick={() => setOtvorene((o) => !o)}
        >
          <span aria-hidden="true">{otvorene ? '✕' : '☰'}</span>
          <span className="zk-skryte">Menu</span>
        </button>

        <nav id="zk-menu" className={`zk-menu${otvorene ? ' is-otvorene' : ''}`} aria-label="Hlavné menu">
          {polozky.map((p) => (
            <div key={p.id} className="zk-menu__polozka">
              <OdkazMenu polozka={p} className={`zk-menu__odkaz${p.odkaz === pathname ? ' is-aktivny' : ''}`} />
              {(p.deti?.length ?? 0) > 0 && (
                <div className="zk-menu__podmenu">
                  {p.deti!.map((d) => (
                    <OdkazMenu key={d.id} polozka={d} className="zk-menu__pododkaz" />
                  ))}
                </div>
              )}
            </div>
          ))}
          {jePrihlaseny() && (
            <Link to="/admin" className="zk-menu__admin">
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
  const { polozky } = useMenuWebu();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const udaje = nastavenia.udaje;
  const gdpr = nastavenia.gdpr ?? {};
  const siete = Object.entries({
    Facebook: nastavenia.socialne_siete?.facebook,
    Instagram: nastavenia.socialne_siete?.instagram,
    YouTube: nastavenia.socialne_siete?.youtube,
    X: nastavenia.socialne_siete?.x,
    TikTok: nastavenia.socialne_siete?.tiktok,
  }).filter(([, url]) => Boolean(url)) as Array<[string, string]>;

  return (
    <footer className="zk-paticka">
      <div className="zk-paticka__stlpce">
        <div>
          <h3>{nastavenia.nazov}</h3>
          {(nastavenia.slogan || nastavenia.meta_popis) && <p>{nastavenia.slogan || nastavenia.meta_popis}</p>}
          {nastavenia.rok_zalozenia && <p>Založený v roku {nastavenia.rok_zalozenia}</p>}
          {siete.length > 0 && (
            <div className="zk-paticka__siete">
              {siete.map(([nazov, url]) => (
                <a key={nazov} href={url} target="_blank" rel="noopener noreferrer">
                  {nazov}
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4>Rýchle odkazy</h4>
          <div className="zk-paticka__odkazy">
            {polozky.slice(0, 8).map((p) => (
              <OdkazMenu key={p.id} polozka={p} />
            ))}
          </div>
        </div>

        <div>
          <h4>Kontakt</h4>
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
          {kontakt.adresa && <p>{kontakt.adresa}</p>}
          {udaje?.pravny_nazov && <p>{udaje.pravny_nazov}</p>}
          {(udaje?.ico || udaje?.dic || udaje?.ic_dph) && (
            <p>
              {[udaje?.ico && `IČO: ${udaje.ico}`, udaje?.dic && `DIČ: ${udaje.dic}`, udaje?.ic_dph && `IČ DPH: ${udaje.ic_dph}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {udaje?.iban && <p>IBAN: {udaje.iban.replace(/(.{4})/g, '$1 ').trim()}</p>}
        </div>
      </div>

      <div className="zk-paticka__spodok">
        <p>
          &copy; {new Date().getFullYear()} {nastavenia.nazov}. Všetky práva vyhradené.
        </p>
        {(gdpr.odkaz_zasad || gdpr.kontakt_zodpovednej_osoby) && (
          <p>
            {gdpr.odkaz_zasad && <a href={gdpr.odkaz_zasad}>Ochrana osobných údajov</a>}
            {gdpr.odkaz_zasad && gdpr.kontakt_zodpovednej_osoby && ' · '}
            {gdpr.kontakt_zodpovednej_osoby && <>Zodpovedná osoba: {gdpr.kontakt_zodpovednej_osoby}</>}
          </p>
        )}
        <button type="button" className="zk-paticka__cookies" onClick={otvorNastaveniaCookies}>
          Nastavenia cookies
        </button>
      </div>
    </footer>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="zk-nacitavanie" role="status">
    <span className="zk-nacitavanie__kruh" aria-hidden="true" />
    Načítavam...
  </div>
);
