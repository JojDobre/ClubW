// Umiestnenie: frontend/src/web/bloky/pomocky.tsx
// Spoločné súčasti blokov stránok (obrázok, odkaz, hlavička, HTML).

import React, { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { souborUrl } from '../../config/api';
import { sanitizeHtml } from '../../utils/sanitize';
import { ObsahSFormularmi } from '../../components/FormularWeb';

/** Adresa obrázka z knižnice médií alebo úplná adresa. */
export const obrazokBloku = (cesta?: string | null): string | null =>
  cesta ? (/^https?:\/\//.test(cesta) ? cesta : souborUrl(cesta)) : null;

/** Odkaz: interný bez znovunačítania stránky, externý do nového okna. */
export const OdkazBloku: React.FC<{ to: string; className?: string; noveOkno?: boolean; children: React.ReactNode }> = ({ to, className, noveOkno, children }) =>
  to.startsWith('/') && !to.startsWith('//') && !noveOkno ? (
    <Link to={to} className={className}>
      {children}
    </Link>
  ) : (
    <a href={to} className={className} {...(noveOkno || /^https?:/.test(to) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );

export const Obr: React.FC<{ src?: string | null; alt?: string; className?: string }> = ({ src, alt = '', className }) => {
  const adresa = obrazokBloku(src);
  return adresa ? <img src={adresa} alt={alt} loading="lazy" className={className} /> : null;
};

/** Čo dostane hlavička bloku - nadpis, úvod a voliteľný odkaz „Zobraziť všetky". */
export interface VlastnostiHlavickyBloku {
  nadpis?: string;
  uvod?: string;
  odkaz?: string | null;
  textOdkazu?: string | null;
}

/**
 * Vlastná hlavička blokov od šablóny (napr. nadpis sekcie úvodu s odkazom
 * presne ako ostatné sekcie). Nastavuje ju BlokyStranky / SekcieUvodu
 * vlastnosťou `hlavicka`.
 */
export const HlavickaBlokuKontext = createContext<React.ComponentType<VlastnostiHlavickyBloku> | null>(null);

/**
 * Nadpis a úvod bloku (spoločné pre väčšinu typov). S `odkaz` je vedľa
 * nadpisu odkaz „Zobraziť všetky" (napr. na všetky články rubriky).
 */
export const HlavickaBloku: React.FC<VlastnostiHlavickyBloku> = ({ nadpis, uvod, odkaz, textOdkazu }) => {
  const Vlastna = useContext(HlavickaBlokuKontext);
  if (!nadpis && !uvod && !odkaz) return null;
  if (Vlastna) return <Vlastna nadpis={nadpis} uvod={uvod} odkaz={odkaz} textOdkazu={textOdkazu} />;
  const texty = (
    <>
      {nadpis && <h2 className="blok__nadpis">{nadpis}</h2>}
      {uvod && <p className="blok__uvod">{uvod}</p>}
    </>
  );
  if (!odkaz) return <header className="blok__hlavicka">{texty}</header>;
  return (
    <header className="blok__hlavicka blok__hlavicka--s-odkazom">
      <div className="blok__hlavicka-text">{texty}</div>
      <OdkazBloku to={odkaz} className="blok__vsetky">
        {textOdkazu?.trim() || 'Zobraziť všetky'}
        <span aria-hidden="true">→</span>
      </OdkazBloku>
    </header>
  );
};

/**
 * Kam vedie „Zobraziť všetky" pri bloku s údajmi webu, keď ho správca
 * zapol (odkaz_vsetky). Bloky s predvoleným tímom alebo ligou (tabuľka,
 * strelci, káder) si adresu skladajú samy, keď poznajú vybraný tím.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const odkazVsetkychBloku = (typ: string, data: Record<string, any> | null | undefined): string | null => {
  if (!data || data.odkaz_vsetky !== true) return null;
  const tim = Number(data.tim_id) > 0 ? Number(data.tim_id) : null;
  switch (typ) {
    case 'clanky':
      return data.rubrika ? `/clanky?rubrika=${encodeURIComponent(String(data.rubrika))}` : '/clanky';
    case 'zapasy': {
      const q = new URLSearchParams();
      if (tim) q.set('tim', String(tim));
      if (data.rezim === 'vysledky') q.set('zobrazit', 'vysledky');
      return `/matches${q.toString() ? `?${q}` : ''}`;
    }
    case 'partneri':
      return '/sponzori';
    case 'videa':
      return '/videa';
    case 'galerie':
      return '/galleries';
    case 'produkty':
      return '/obchod';
    case 'udalosti':
      return '/calendar';
    default:
      return null;
  }
};

export const Html: React.FC<{ html?: string; className?: string }> = ({ html, className = 'blok__text' }) =>
  html ? <ObsahSFormularmi html={sanitizeHtml(html)} className={className} /> : null;

