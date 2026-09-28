// Umiestnenie: sablony/klubova/src/spolocne.tsx
// Spoločné súčasti šablóny Klubová: načítanie dát, typy z verejného API,
// formáty dátumov, erby tímov, ikony a nadpis sekcie.

import React, { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl, souborUrl, useNastavenia } from '@clubw/jadro';

// ===== Typy dát z verejného API =====

export interface Clanok {
  id: number;
  nazov: string;
  slug: string;
  excerpt?: string | null;
  obrazok?: string | null;
  publikovany_datum?: string | null;
  vytvoreny: string;
  kategoria?: { id: number; nazov: string; slug: string } | null;
}

export interface Zapas {
  id: number;
  liga_id: number | null;
  liga_nazov?: string | null;
  datum_cas: string;
  miesto?: string | null;
  typ_zapasu?: 'doma' | 'vonku' | 'neutralne';
  domaci_tim_id: number | null;
  domaci_tim_nazov?: string | null;
  hostujuci_tim_id: number | null;
  hostujuci_tim_nazov?: string | null;
  goly_domaci: number | null;
  goly_hostia: number | null;
  status: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  actual_status?: string;
  supier_logo?: string | null;
  video_url?: string | null;
  domaci_tim?: { id: number; nazov: string; logo: string | null } | null;
  hostujuci_tim?: { id: number; nazov: string; logo: string | null } | null;
}

export interface Hrac {
  id: number;
  meno: string;
  priezvisko: string;
  cislo_dresu: number | null;
  pozicia: string | null;
  fotka: string | null;
  narodnost?: string | null;
}

export interface Tim {
  id: number;
  nazov: string;
  typ: 'muzi' | 'zeny' | 'mladez';
  logo: string | null;
  poradie?: number;
}

export interface StatistikaHraca {
  hrac_id: number;
  zapasy: number;
  goly: number;
  asistencie: number;
  zlte_karty: number;
  cervene_karty: number;
}

export interface Video {
  id: number;
  nazov: string;
  url: string;
  nahlad_url?: string | null;
  nahlad?: string | null;
  dlzka?: number | null;
}

export interface Partner {
  id: number;
  nazov: string;
  uroven: 'generalny' | 'hlavny' | 'partner' | 'dodavatel' | null;
  logo: string | null;
  web_url: string | null;
  poradie?: number;
}

// ===== Načítanie dát =====

export interface Odpoved<T> {
  data: T | null;
  nacitava: boolean;
  chyba: string | null;
}

/** Načíta dáta z verejného API. Prázdna cesta = nič nenačítavať. */
export const useApi = <T,>(cesta: string | null): Odpoved<T> => {
  const [stav, setStav] = useState<Odpoved<T>>({ data: null, nacitava: Boolean(cesta), chyba: null });
  useEffect(() => {
    if (!cesta) {
      setStav({ data: null, nacitava: false, chyba: null });
      return;
    }
    const ovladac = new AbortController();
    setStav((s) => ({ ...s, nacitava: true, chyba: null }));
    fetch(apiUrl(cesta), { signal: ovladac.signal })
      .then(async (r) => {
        const telo = await r.json().catch(() => null);
        if (!r.ok || !telo?.success) {
          setStav({ data: null, nacitava: false, chyba: telo?.message || `Chyba ${r.status}` });
          return;
        }
        setStav({ data: telo.data as T, nacitava: false, chyba: null });
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setStav({ data: null, nacitava: false, chyba: 'Nepodarilo sa spojiť so serverom' });
      });
    return () => ovladac.abort();
  }, [cesta]);
  return stav;
};

/** Titulok karty prehliadača. */
export const useTitulok = (titulok: string | null | undefined) => {
  const { nastavenia } = useNastavenia();
  useEffect(() => {
    if (!titulok) return;
    const maSablonu = Boolean(nastavenia.seo?.meta_title_sablona?.includes('%s'));
    document.title = maSablonu || titulok === nastavenia.nazov ? titulok : `${titulok} · ${nastavenia.nazov}`;
  }, [titulok, nastavenia.nazov, nastavenia.seo?.meta_title_sablona]);
};

// ===== Formáty =====

const LOKALITA = 'sk-SK';

const naDatum = (d: string | Date) => {
  // Samotný dátum (2026-09-24) je miestny deň, nie polnoc v UTC
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T12:00:00`);
  return new Date(d);
};

/** „25. september 2026" - v slovenčine s menom mesiaca v nominatíve, ako v návrhu. */
const MESIACE = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
const MESIACE_SKRATKY = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const datum = (d?: string | null) => {
  if (!d) return '';
  const x = naDatum(d);
  return `${x.getDate()}. ${MESIACE[x.getMonth()]} ${x.getFullYear()}`;
};
/** „20. sep" */
export const datumKratky = (d?: string | null) => {
  if (!d) return '';
  const x = naDatum(d);
  return `${x.getDate()}. ${MESIACE_SKRATKY[x.getMonth()]}`;
};
export const cas = (d?: string | null) => (d ? naDatum(d).toLocaleTimeString(LOKALITA, { hour: '2-digit', minute: '2-digit' }) : '');

/** Dnešný dátum v tvare, ktorý očakáva API (RRRR-MM-DD). */
export const dnes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Dĺžka videa v sekundách → „4:12". */
export const dlzkaVidea = (s?: number | null) => {
  if (!s || s <= 0) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = String(Math.floor(s % 60)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sek}` : `${m}:${sek}`;
};

const POZICIE: Record<string, string> = { brankar: 'Brankár', obranca: 'Obranca', zaloznik: 'Stredopoliar', utocnik: 'Útočník' };
export const pozicia = (p?: string | null) => (p ? POZICIE[p] ?? p.charAt(0).toUpperCase() + p.slice(1) : '');

// ===== Zápas =====

export const stavZapasu = (z: Zapas) => (z.actual_status as Zapas['status']) || z.status;
export const maVysledok = (z: Zapas) => z.goly_domaci !== null && z.goly_domaci !== undefined && z.goly_hostia !== null && z.goly_hostia !== undefined;
export const nazovDomacich = (z: Zapas) => z.domaci_tim_nazov || z.domaci_tim?.nazov || 'Domáci';
export const nazovHosti = (z: Zapas) => z.hostujuci_tim_nazov || z.hostujuci_tim?.nazov || 'Hostia';

/** Logo strany zápasu: náš tím má logo tímu (alebo klubu), súper logo zadané pri zápase. */
export const logoStrany = (z: Zapas, strana: 'domaci' | 'hostia', logoKlubu: string | null) => {
  const nasTim = strana === 'domaci' ? z.domaci_tim_id : z.hostujuci_tim_id;
  const tim = strana === 'domaci' ? z.domaci_tim : z.hostujuci_tim;
  if (nasTim) return tim?.logo || logoKlubu;
  return z.supier_logo || null;
};

/** Hrá náš tím doma? (typ zápasu, inak podľa toho, ktorá strana je náš tím) */
export const hrameDoma = (z: Zapas) => (z.typ_zapasu ? z.typ_zapasu !== 'vonku' : Boolean(z.domaci_tim_id));

// ===== Erb =====

const iniciely = (nazov: string) =>
  nazov
    .replace(/\b(FK|FC|TJ|ŠK|MŠK|OFK|SK|AFC|MFK|FO|OŠK)\b/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || nazov.slice(0, 2).toUpperCase();

/** Erb tímu - logo, inak farebný kruh (v návrhu tmavý pre domácich, akcent pre hostí). */
export const Erb: React.FC<{ nazov: string; logo?: string | null; ton?: 'tmavy' | 'akcent' }> = ({ nazov, logo, ton = 'tmavy' }) =>
  logo ? (
    <span className="kl-erb kl-erb--logo">
      <img src={souborUrl(logo)} alt="" loading="lazy" />
    </span>
  ) : (
    <span className={`kl-erb kl-erb--${ton}`} aria-hidden="true">
      {iniciely(nazov)}
    </span>
  );

// ===== Ikony =====

const CESTY: Record<string, string> = {
  vlavo: 'M10 3L5 8L10 13',
  vpravo: 'M6 3L11 8L6 13',
  dole: 'M1 1L5 5L9 1',
  sipka: 'M3 8h10M9 4l4 4-4 4',
  domov: 'M2.5 7.2 8 2.5l5.5 4.7V13a.8.8 0 0 1-.8.8H9.8V10H6.2v3.8H3.3a.8.8 0 0 1-.8-.8Z',
  spravy: 'M3 2.5h7.5l2.5 2.5v8.5H3ZM5.5 6.5h5M5.5 9h5M5.5 11.5h3',
  zapasy: 'M2.5 3.5h11v10h-11ZM2.5 6.5h11M5.5 2v3M10.5 2v3',
  tim: 'M6 7.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM1.8 13.5c.4-2.4 2.1-3.8 4.2-3.8s3.8 1.4 4.2 3.8M11 7.4a2 2 0 1 0-.6-3.9M12 9.9c1.3.4 2.1 1.6 2.3 3.6',
  menu: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11',
  zavriet: 'M4 4l8 8M12 4l-8 8',
  play: 'M6 4l11 6-11 6V4z',
  von: 'M9 3h4v4M13 3 7.5 8.5M11.5 9.5V13H3V4.5h3.5',
};

export const Ikona: React.FC<{ nazov: keyof typeof CESTY | string; velkost?: number; className?: string }> = ({ nazov, velkost = 16, className }) => {
  if (nazov === 'dole') {
    return (
      <svg width={(velkost * 10) / 16} height={(velkost * 6) / 16} viewBox="0 0 10 6" fill="none" aria-hidden="true" className={className}>
        <path d={CESTY.dole} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (nazov === 'play') {
    return (
      <svg width={velkost} height={velkost} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
        <path d={CESTY.play} fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={velkost} height={velkost} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d={CESTY[nazov] ?? ''} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ===== Nadpis sekcie =====

/** Odkaz - interný cez router, externý cez <a>. */
export const Odkaz: React.FC<{ to: string; className?: string; children: ReactNode; ariaLabel?: string; onClick?: () => void }> = ({
  to,
  className,
  children,
  ariaLabel,
  onClick,
}) =>
  to.startsWith('/') && !to.startsWith('//') ? (
    <Link to={to} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <a href={to} className={className} aria-label={ariaLabel} onClick={onClick} {...(/^https?:/.test(to) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );

/** Nadpis sekcie: VEĽKÝ NADPIS | Zobraziť všetky (podľa návrhu). */
export const NadpisSekcie: React.FC<{ nadpis: string; odkaz?: string | null; svetly?: boolean; id?: string }> = ({ nadpis, odkaz, svetly = false, id }) => (
  <div className={`kl-nadpis${svetly ? ' kl-nadpis--svetly' : ''}`}>
    <h2 id={id}>{nadpis}</h2>
    <span className="kl-nadpis__ciara" aria-hidden="true" />
    {odkaz && (
      <Odkaz to={odkaz} className="kl-nadpis__odkaz">
        Zobraziť všetky
      </Odkaz>
    )}
  </div>
);

/** Nadpis medzi dvoma čiarami (Úspechy, Partneri). */
export const NadpisStredovy: React.FC<{ nadpis: string }> = ({ nadpis }) => (
  <div className="kl-nadpis-stred">
    <span aria-hidden="true" />
    <h2>{nadpis}</h2>
    <span aria-hidden="true" />
  </div>
);

/** Skryje obrázok, ktorý sa nepodarilo načítať (zmazaný súbor). */
export const skryObrazok = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = 'hidden';
};

/** Adresa obrázka z nastavení alebo uploadov; externé adresy nechá tak. */
export const obrazokUrl = (cesta?: string | null) => (cesta ? (/^https?:\/\//.test(cesta) ? cesta : souborUrl(cesta)) : null);
