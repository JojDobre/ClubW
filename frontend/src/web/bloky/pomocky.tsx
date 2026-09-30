// Umiestnenie: frontend/src/web/bloky/pomocky.tsx
// Spoločné súčasti blokov stránok (obrázok, odkaz, hlavička, HTML).

import React from 'react';
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

/** Nadpis a úvod bloku (spoločné pre väčšinu typov). */
export const HlavickaBloku: React.FC<{ nadpis?: string; uvod?: string }> = ({ nadpis, uvod }) =>
  nadpis || uvod ? (
    <header className="blok__hlavicka">
      {nadpis && <h2 className="blok__nadpis">{nadpis}</h2>}
      {uvod && <p className="blok__uvod">{uvod}</p>}
    </header>
  ) : null;

export const Html: React.FC<{ html?: string; className?: string }> = ({ html, className = 'blok__text' }) =>
  html ? <ObsahSFormularmi html={sanitizeHtml(html)} className={className} /> : null;

