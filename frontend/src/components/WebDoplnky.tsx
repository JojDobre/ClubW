// Umiestnenie: frontend/src/components/WebDoplnky.tsx
// Doplnky verejného webu z Nastavení: SEO značky, lišta súhlasu
// s cookies a meranie návštevnosti (Google Analytics) až po súhlase.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { souborUrl } from '../config/api';
import { useNastavenia } from '../context/NastaveniaContext';
import './WebDoplnky.css';

const KLUC_SUHLASU = 'clubw_cookies';
type Suhlas = 'vsetko' | 'nevyhnutne' | null;

const citajSuhlas = (): Suhlas => {
  try {
    const v = localStorage.getItem(KLUC_SUHLASU);
    return v === 'vsetko' || v === 'nevyhnutne' ? v : null;
  } catch {
    return null;
  }
};

/** Nastaví (alebo odstráni) meta značku v hlavičke dokumentu. */
const nastavMeta = (atribut: 'name' | 'property', kluc: string, hodnota: string | null | undefined) => {
  let znacka = document.head.querySelector<HTMLMetaElement>(`meta[${atribut}="${kluc}"][data-clubw]`);
  if (!hodnota) {
    znacka?.remove();
    return;
  }
  if (!znacka) {
    znacka = document.createElement('meta');
    znacka.setAttribute(atribut, kluc);
    znacka.setAttribute('data-clubw', '');
    document.head.appendChild(znacka);
  }
  znacka.content = hodnota;
};

/** Spustí Google Analytics (len raz). */
const spustiAnalytiku = (id: string) => {
  if (document.getElementById('clubw-ga')) return;
  const skript = document.createElement('script');
  skript.id = 'clubw-ga';
  skript.async = true;
  skript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(skript);
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', id, { anonymize_ip: true });
};

export const WebDoplnky: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const [suhlas, setSuhlas] = useState<Suhlas>(citajSuhlas);
  const seo = nastavenia.seo ?? {};
  const gdpr = nastavenia.gdpr ?? {};
  const lista = gdpr.cookie_lista !== false;

  // ===== SEO značky =====
  useEffect(() => {
    nastavMeta('name', 'robots', seo.indexovat === false ? 'noindex, nofollow' : null);
    nastavMeta('name', 'keywords', seo.kluc_slova);
    nastavMeta('name', 'google-site-verification', seo.google_search_console);
    nastavMeta('property', 'og:site_name', nastavenia.nazov);
    nastavMeta('property', 'og:image', seo.og_obrazok ? new URL(souborUrl(seo.og_obrazok), window.location.origin).toString() : null);
    // Predvolený popis - stránka ho môže prepísať vlastným
    const popis = document.head.querySelector<HTMLMetaElement>('meta[name="description"]:not([data-clubw])');
    nastavMeta('name', 'description', popis?.content ? null : nastavenia.meta_popis);
  }, [nastavenia, seo.indexovat, seo.kluc_slova, seo.google_search_console, seo.og_obrazok]);

  // ===== Šablóna titulku: „%s | Názov klubu" =====
  useEffect(() => {
    const sablona = seo.meta_title_sablona;
    if (!sablona || !sablona.includes('%s')) return;
    const [pred, po] = sablona.split('%s');
    const uprav = () => {
      const t = document.title;
      if (!t || t === nastavenia.nazov || (t.startsWith(pred) && t.endsWith(po))) return;
      document.title = `${pred}${t}${po}`;
    };
    uprav();
    const titulok = document.querySelector('title');
    if (!titulok) return;
    const pozorovatel = new MutationObserver(uprav);
    pozorovatel.observe(titulok, { childList: true, characterData: true, subtree: true });
    return () => pozorovatel.disconnect();
  }, [seo.meta_title_sablona, nastavenia.nazov]);

  // ===== Meranie návštevnosti =====
  useEffect(() => {
    const id = nastavenia.google_analytics_id;
    if (!id) return;
    if (!lista || suhlas === 'vsetko') spustiAnalytiku(id);
  }, [nastavenia.google_analytics_id, lista, suhlas]);

  const rozhodni = (hodnota: Exclude<Suhlas, null>) => {
    try {
      localStorage.setItem(KLUC_SUHLASU, hodnota);
    } catch {
      /* súkromné okno - platí aspoň do zavretia */
    }
    setSuhlas(hodnota);
  };

  if (!lista || suhlas) return null;

  const odkaz = gdpr.odkaz_zasad;
  return (
    <div className="web-cookies" role="dialog" aria-label="Súhlas s cookies">
      <p>
        {gdpr.text_suhlasu ||
          'Používame cookies na meranie návštevnosti, aby sme web zlepšovali. Nevyhnutné cookies sú vždy zapnuté.'}{' '}
        {odkaz &&
          (odkaz.startsWith('/') ? (
            <Link to={odkaz}>Zásady ochrany údajov</Link>
          ) : (
            <a href={odkaz} target="_blank" rel="noopener noreferrer">
              Zásady ochrany údajov
            </a>
          ))}
      </p>
      <div className="web-cookies__tlacidla">
        <button type="button" className="web-cookies__druhe" onClick={() => rozhodni('nevyhnutne')}>
          Len nevyhnutné
        </button>
        <button type="button" onClick={() => rozhodni('vsetko')}>
          Súhlasím
        </button>
      </div>
    </div>
  );
};

export default WebDoplnky;
