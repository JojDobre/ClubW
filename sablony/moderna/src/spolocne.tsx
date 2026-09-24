// Umiestnenie: sablony/moderna/src/spolocne.tsx
// Spoločné súčasti šablóny Moderná: načítanie dát, formáty dátumov,
// erby tímov, stavy načítania a karty, ktoré sa opakujú na viacerých
// stránkach (článok, zápas, hráč, tabuľka).

import React, { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl, skusPresmerovat, souborUrl, useNastavenia } from '@clubw/jadro';

// ===== Typy dát z verejného API =====

export interface Clanok {
  id: number;
  nazov: string;
  slug: string;
  excerpt?: string | null;
  obsah?: string;
  obrazok?: string | null;
  publikovany_datum?: string | null;
  vytvoreny: string;
  featured?: boolean;
  views?: number;
  autor?: { id: number; meno: string } | null;
  kategoria?: { id: number; nazov: string; slug: string; farba?: string | null } | null;
  komentare_povolene?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
}

export interface Zapas {
  id: number;
  liga_id: number | null;
  liga_nazov?: string | null;
  kolo?: string | null;
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
  rozhodca?: string | null;
  pocet_divakov?: number | null;
  poznamky?: string | null;
  video_url?: string | null;
  clanok_id?: number | null;
  fotogaleria_id?: number | null;
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
  datum_narodenia?: string | null;
  vyska?: number | null;
  vaha?: string | number | null;
  vek?: number | null;
  tim_id?: number | null;
  poznamky?: string | null;
  tim?: Tim | null;
}

export interface ClenTimu {
  id: number;
  meno: string;
  priezvisko: string;
  funkcia: string;
  fotka: string | null;
  email?: string | null;
  telefon?: string | null;
  narodnost?: string | null;
  kvalifikacia?: string | null;
  datum_narodenia?: string | null;
  vek?: number | null;
  poznamky?: string | null;
  tim_id?: number | null;
  tim?: Tim | null;
}

export interface Tim {
  id: number;
  nazov: string;
  typ: 'muzi' | 'zeny' | 'mladez';
  vekova_kategoria?: string | null;
  popis?: string | null;
  logo: string | null;
  poradie?: number;
  pocet_hracov?: number;
  pocet_realizacny_tim?: number;
}

export interface RiadokTabulky {
  id: number;
  tim_id: number | null;
  custom_tim_nazov?: string | null;
  custom_tim_logo?: string | null;
  tim_nazov?: string | null;
  tim_logo?: string | null;
  pozicia: number;
  body: number;
  zapasy: number;
  vitazstva: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  goly_rozdiel: number;
  forma?: string | null;
  poznamky?: string | null;
}

export interface Liga {
  id: number;
  nazov: string;
  sezona?: string | null;
  tim_id?: number | null;
  typ?: string;
  typ_name?: string;
  popis?: string | null;
  logo?: string | null;
  format?: string;
  pocet_timov?: number;
  zobrazit_formu?: boolean;
  rezim_tabulky?: 'plna' | 'len_body';
  external_widget_url?: string | null;
  status?: string;
}

export interface Strankovanie {
  total: number;
  pages: number;
  current_page: number;
  has_next: boolean;
}

// ===== Načítanie dát =====

export interface Odpoved<T> {
  data: T | null;
  strankovanie: Strankovanie | null;
  nacitava: boolean;
  chyba: string | null;
  /** HTTP stav poslednej odpovede (404 = neexistuje) */
  stav: number | null;
}

/**
 * Načíta dáta z verejného API. Na rozdiel od useData z jadra vracia aj
 * stránkovanie a HTTP stav (404 → stránka nenájdená / presmerovanie).
 */
export const useApi = <T,>(cesta: string | null, hlavicky?: Record<string, string>): Odpoved<T> => {
  const [stav, setStav] = useState<Odpoved<T>>({ data: null, strankovanie: null, nacitava: Boolean(cesta), chyba: null, stav: null });
  const kluc = hlavicky ? JSON.stringify(hlavicky) : '';
  useEffect(() => {
    if (!cesta) {
      setStav({ data: null, strankovanie: null, nacitava: false, chyba: null, stav: null });
      return;
    }
    const ovladac = new AbortController();
    setStav((s) => ({ ...s, nacitava: true, chyba: null }));
    fetch(apiUrl(cesta), { signal: ovladac.signal, headers: hlavicky })
      .then(async (r) => {
        const telo = await r.json().catch(() => null);
        if (!r.ok || !telo?.success) {
          setStav({ data: null, strankovanie: null, nacitava: false, chyba: telo?.message || `Chyba ${r.status}`, stav: r.status });
          return;
        }
        setStav({ data: telo.data as T, strankovanie: telo.pagination ?? null, nacitava: false, chyba: null, stav: r.status });
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setStav({ data: null, strankovanie: null, nacitava: false, chyba: 'Nepodarilo sa spojiť so serverom', stav: null });
      });
    return () => ovladac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesta, kluc]);
  return stav;
};

/**
 * Záznam neexistuje (404): najprv sa skúsi presmerovanie starej adresy,
 * až potom stránka ukáže „nenájdené". Vracia 'overuje' počas pokusu.
 */
export const useNenajdene = (nenajdene: boolean): 'nie' | 'overuje' | 'ano' => {
  const [stav, setStav] = useState<'nie' | 'overuje' | 'ano'>('nie');
  useEffect(() => {
    if (!nenajdene) {
      setStav('nie');
      return;
    }
    let zruseny = false;
    setStav('overuje');
    void skusPresmerovat().then((presmeruje) => !presmeruje && !zruseny && setStav('ano'));
    return () => {
      zruseny = true;
    };
  }, [nenajdene]);
  return stav;
};

/** Hlavička s prihlásením - pre náhľad nepublikovaného obsahu z administrácie. */
export const hlavickaPrihlasenia = (): Record<string, string> => {
  try {
    const token = localStorage.getItem('clubw_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/** Titulok karty prehliadača. Šablónu titulku (%s | Klub) doplní jadro. */
export const useTitulok = (titulok: string | null | undefined) => {
  const { nastavenia } = useNastavenia();
  useEffect(() => {
    if (!titulok) return;
    const maSablonu = Boolean(nastavenia.seo?.meta_title_sablona?.includes('%s'));
    document.title = maSablonu || titulok === nastavenia.nazov ? titulok : `${titulok} · ${nastavenia.nazov}`;
  }, [titulok, nastavenia.nazov, nastavenia.seo?.meta_title_sablona]);
};

/** Popis stránky pre vyhľadávače (meta description). */
export const useMetaPopis = (popis: string | null | undefined) => {
  useEffect(() => {
    if (!popis) return;
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]:not([data-clubw])');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const povodny = meta.content;
    meta.content = popis.slice(0, 300);
    return () => {
      if (meta) meta.content = povodny;
    };
  }, [popis]);
};

// ===== Formáty =====

const LOKALITA = 'sk-SK';

const naDatum = (d: string | Date) => {
  // Samotný dátum (2026-09-24) je miestny deň, nie polnoc v UTC
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T12:00:00`);
  return new Date(d);
};

export const datum = (d?: string | null, moznosti: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  d ? naDatum(d).toLocaleDateString(LOKALITA, moznosti) : '';
export const datumKratky = (d?: string | null) => datum(d, { day: 'numeric', month: 'short' });
export const cas = (d?: string | null) => (d ? naDatum(d).toLocaleTimeString(LOKALITA, { hour: '2-digit', minute: '2-digit' }) : '');
export const denVTyzdni = (d?: string | null) => datum(d, { weekday: 'long' });
export const mesiacRok = (d: string | Date) => {
  const text = naDatum(d).toLocaleDateString(LOKALITA, { month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** „dnes", „zajtra", „o 3 dni" - na odpočet k zápasu. */
export const zaKolko = (d: string) => {
  const zaciatok = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dni = Math.round((zaciatok(naDatum(d)) - zaciatok(new Date())) / 86_400_000);
  if (dni === 0) return 'dnes';
  if (dni === 1) return 'zajtra';
  if (dni < 0) return '';
  if (dni < 5) return `o ${dni} dni`;
  return `o ${dni} dní`;
};

/** Slovenské množné číslo: sklon(3, 'gól', 'góly', 'gólov') → „góly". */
export const sklon = (n: number, jeden: string, dva: string, pat: string) => (n === 1 ? jeden : n >= 2 && n <= 4 ? dva : pat);

export const POZICIE: Record<string, { nazov: string; mnozne: string; poradie: number }> = {
  brankar: { nazov: 'Brankár', mnozne: 'Brankári', poradie: 1 },
  obranca: { nazov: 'Obranca', mnozne: 'Obrancovia', poradie: 2 },
  zaloznik: { nazov: 'Záložník', mnozne: 'Záložníci', poradie: 3 },
  utocnik: { nazov: 'Útočník', mnozne: 'Útočníci', poradie: 4 },
};
export const pozicia = (p?: string | null) => (p ? POZICIE[p]?.nazov ?? p.charAt(0).toUpperCase() + p.slice(1) : '');

/** Staršie kódy funkcií - nové záznamy majú funkciu slovom („hlavný tréner"). */
const STARE_FUNKCIE: Record<string, string> = {
  hlavny_trener: 'hlavný tréner',
  asistent: 'asistent trénera',
  asistent_trenera: 'asistent trénera',
  trener_brankarov: 'tréner brankárov',
  kondicny_trener: 'kondičný tréner',
  veduci_muzstva: 'vedúci mužstva',
  lekar: 'lekár',
  funkcionar: 'funkcionár',
  manazer: 'manažér',
};
export const funkcia = (f?: string | null) => {
  if (!f) return '';
  const slovo = STARE_FUNKCIE[f] ?? f.replace(/_/g, ' ');
  return slovo.charAt(0).toUpperCase() + slovo.slice(1);
};

export const TYPY_TIMOV: Record<string, string> = { muzi: 'Muži', zeny: 'Ženy', mladez: 'Mládež' };

export const STAVY_ZAPASU: Record<string, string> = {
  naplanovany: 'Naplánovaný',
  prebieha: 'Práve sa hrá',
  ukonceny: 'Koniec',
  odlozeny: 'Odložený',
  zruseny: 'Zrušený',
};

// ===== Zápas: názvy a erby strán =====

export const stavZapasu = (z: Zapas) => (z.actual_status as Zapas['status']) || z.status;
export const maVysledok = (z: Zapas) => z.goly_domaci !== null && z.goly_domaci !== undefined && z.goly_hostia !== null && z.goly_hostia !== undefined;
export const nazovDomacich = (z: Zapas) => z.domaci_tim_nazov || z.domaci_tim?.nazov || 'Domáci';
export const nazovHosti = (z: Zapas) => z.hostujuci_tim_nazov || z.hostujuci_tim?.nazov || 'Hostia';

/**
 * Logo strany zápasu: náš tím má logo tímu (alebo klubu), súper
 * logo zadané pri zápase. Bez loga sa zobrazia iniciály.
 */
export const logoStrany = (z: Zapas, strana: 'domaci' | 'hostia', logoKlubu: string | null) => {
  const nasTim = strana === 'domaci' ? z.domaci_tim_id : z.hostujuci_tim_id;
  const tim = strana === 'domaci' ? z.domaci_tim : z.hostujuci_tim;
  if (nasTim) return tim?.logo || logoKlubu;
  return z.supier_logo || null;
};

/** Výsledok z pohľadu klubu: výhra / remíza / prehra. */
export const vysledokKlubu = (z: Zapas): 'V' | 'R' | 'P' | null => {
  if (!maVysledok(z) || stavZapasu(z) !== 'ukonceny') return null;
  const nasDomaci = Boolean(z.domaci_tim_id);
  const nasHostia = Boolean(z.hostujuci_tim_id);
  if (!nasDomaci && !nasHostia) return null;
  const my = nasDomaci ? z.goly_domaci! : z.goly_hostia!;
  const oni = nasDomaci ? z.goly_hostia! : z.goly_domaci!;
  return my > oni ? 'V' : my < oni ? 'P' : 'R';
};

const iniciely = (nazov: string) =>
  nazov
    .replace(/\b(FK|FC|TJ|ŠK|MŠK|OFK|SK|AFC|MFK|FO|OŠK)\b/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || nazov.slice(0, 2).toUpperCase();

/** Erb tímu - logo, alebo iniciály na mäkkom podklade. */
export const Erb: React.FC<{ nazov: string; logo?: string | null; velkost?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; klub?: boolean }> = ({
  nazov,
  logo,
  velkost = 'md',
  klub = false,
}) =>
  logo ? (
    <span className={`md-erb md-erb--${velkost} md-erb--logo`}>
      <img src={souborUrl(logo)} alt="" loading="lazy" />
    </span>
  ) : (
    <span className={`md-erb md-erb--${velkost}${klub ? ' md-erb--klub' : ''}`} aria-hidden="true">
      {iniciely(nazov)}
    </span>
  );

// ===== Stavy stránky =====

export const Nacitava: React.FC<{ text?: string }> = ({ text = 'Načítavam…' }) => (
  <div className="md-stav" role="status">
    <span className="md-stav__kruh" aria-hidden="true" />
    {text}
  </div>
);

export const Prazdne: React.FC<{ nadpis: string; text?: string; children?: ReactNode }> = ({ nadpis, text, children }) => (
  <div className="md-prazdne">
    <strong>{nadpis}</strong>
    {text && <p>{text}</p>}
    {children}
  </div>
);

export const Chyba: React.FC<{ text: string }> = ({ text }) => (
  <div className="md-prazdne md-prazdne--chyba" role="alert">
    <strong>Niečo sa pokazilo</strong>
    <p>{text}</p>
    <button type="button" className="md-tlacidlo md-tlacidlo--sekundarne" onClick={() => window.location.reload()}>
      Skúsiť znova
    </button>
  </div>
);

/** Hlavička podstránky: štítok, veľký nadpis, popis a voliteľný doplnok vpravo. */
export const HlavickaStranky: React.FC<{
  stitok?: ReactNode;
  nadpis: ReactNode;
  popis?: ReactNode;
  spat?: { odkaz: string; text: string };
  children?: ReactNode;
}> = ({ stitok, nadpis, popis, spat, children }) => (
  <header className="md-hlava md-kontajner">
    {spat && (
      <Link to={spat.odkaz} className="md-spat">
        <Ikona nazov="spat" /> {spat.text}
      </Link>
    )}
    <div className="md-hlava__riadok">
      <div className="md-hlava__text">
        {stitok && <div className="md-stitok">{stitok}</div>}
        <h1>{nadpis}</h1>
        {popis && <p className="md-hlava__popis">{popis}</p>}
      </div>
      {children && <div className="md-hlava__doplnok">{children}</div>}
    </div>
  </header>
);

/** Nadpis sekcie: štítok, nadpis a odkaz „Všetko". */
export const NadpisSekcie: React.FC<{ stitok?: string; nadpis: ReactNode; odkaz?: string; textOdkazu?: string; id?: string }> = ({
  stitok,
  nadpis,
  odkaz,
  textOdkazu = 'Zobraziť všetko',
  id,
}) => (
  <div className="md-sekcia__hlava">
    <div>
      {stitok && <div className="md-stitok">{stitok}</div>}
      <h2 id={id}>{nadpis}</h2>
    </div>
    {odkaz && (
      <Link to={odkaz} className="md-odkaz-sipka">
        {textOdkazu} <Ikona nazov="sipka" />
      </Link>
    )}
  </div>
);

// ===== Ikony (vlastné, jednoduché ťahy) =====

const CESTY: Record<string, ReactNode> = {
  domov: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  spravy: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 9h10M7 13h10M7 17h6" />
    </>
  ),
  zapasy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 4 3-1.5 4.5h-5L8 10z" />
    </>
  ),
  timy: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  zavriet: <path d="M6 6l12 12M18 6 6 18" />,
  hladat: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  sipka: <path d="M5 12h14M13 6l6 6-6 6" />,
  sipka_hore: <path d="M7 17 17 7M8 7h9v9" />,
  spat: <path d="M19 12H5M11 6l-6 6 6 6" />,
  vlavo: <path d="m15 6-6 6 6 6" />,
  vpravo: <path d="m9 6 6 6-6 6" />,
  kalendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  miesto: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  hrat: <path d="M8 5.5v13l11-6.5z" />,
  foto: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <circle cx="12" cy="12.5" r="3.5" />
      <path d="M8 5l1.5-2h5L16 5" />
    </>
  ),
  dokument: (
    <>
      <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </>
  ),
  stiahnut: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  zdielat: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  odkaz: <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />,
  pohar: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  telefon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />,
  hodiny: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  stit: <path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6z" />,
};

export const Ikona: React.FC<{ nazov: keyof typeof CESTY | string; velkost?: number }> = ({ nazov, velkost = 18 }) => (
  <svg
    className="md-ikona"
    width={velkost}
    height={velkost}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {CESTY[nazov]}
  </svg>
);

// ===== Karty =====

/** Obrázok s náhradným podkladom, keď chýba. */
export const Obrazok: React.FC<{ src?: string | null; alt?: string; className?: string; pomer?: string }> = ({ src, alt = '', className = '', pomer }) =>
  src ? (
    <img src={souborUrl(src)} alt={alt} loading="lazy" className={`md-obrazok ${className}`} style={pomer ? { aspectRatio: pomer } : undefined} />
  ) : (
    <div className={`md-obrazok md-obrazok--prazdny ${className}`} style={pomer ? { aspectRatio: pomer } : undefined} aria-hidden="true" />
  );

export const KartaClanku: React.FC<{ clanok: Clanok; velka?: boolean; bezObrazka?: boolean }> = ({ clanok, velka = false, bezObrazka = false }) => (
  <Link to={`/clanek/${clanok.slug}`} className={`md-karta-clanku${velka ? ' md-karta-clanku--velka' : ''}`}>
    {!bezObrazka && (
      <div className="md-karta-clanku__obrazok">
        <Obrazok src={clanok.obrazok} />
      </div>
    )}
    <div className="md-karta-clanku__telo">
      <div className="md-karta-clanku__meta">
        {clanok.kategoria && <span className="md-stitok">{clanok.kategoria.nazov}</span>}
        <span>{datumKratky(clanok.publikovany_datum || clanok.vytvoreny)}</span>
      </div>
      <h3>{clanok.nazov}</h3>
      {velka && clanok.excerpt && <p>{clanok.excerpt}</p>}
    </div>
  </Link>
);

export const KartaHraca: React.FC<{ hrac: Hrac }> = ({ hrac }) => (
  <Link to={`/players/${hrac.id}`} className="md-karta-hraca">
    <div className="md-karta-hraca__foto">
      {hrac.fotka ? (
        <img src={souborUrl(hrac.fotka)} alt="" loading="lazy" />
      ) : (
        <span className="md-karta-hraca__inicialy" aria-hidden="true">
          {hrac.meno.charAt(0)}
          {hrac.priezvisko.charAt(0)}
        </span>
      )}
      {hrac.cislo_dresu !== null && hrac.cislo_dresu !== undefined && <span className="md-karta-hraca__cislo">{hrac.cislo_dresu}</span>}
    </div>
    <div className="md-karta-hraca__text">
      <span className="md-karta-hraca__meno">{hrac.meno}</span>
      <strong>{hrac.priezvisko}</strong>
      <small>{pozicia(hrac.pozicia)}</small>
    </div>
  </Link>
);

export const KartaClena: React.FC<{ clen: ClenTimu }> = ({ clen }) => (
  <Link to={`/staff/${clen.id}`} className="md-karta-clena">
    {clen.fotka ? (
      <img src={souborUrl(clen.fotka)} alt="" loading="lazy" />
    ) : (
      <span className="md-karta-clena__inicialy" aria-hidden="true">
        {clen.meno.charAt(0)}
        {clen.priezvisko.charAt(0)}
      </span>
    )}
    <span>
      <strong>
        {clen.meno} {clen.priezvisko}
      </strong>
      <small>{funkcia(clen.funkcia)}</small>
    </span>
  </Link>
);

/** Riadok zápasu v zozname: dátum, tímy, výsledok alebo čas. */
export const RiadokZapasu: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const { nastavenia } = useNastavenia();
  const stav = stavZapasu(z);
  const vysledok = vysledokKlubu(z);
  return (
    <Link to={`/matches/${z.id}`} className="md-riadok-zapasu">
      <span className="md-riadok-zapasu__datum">
        <strong>{datum(z.datum_cas, { day: 'numeric' })}</strong>
        <small>{datum(z.datum_cas, { month: 'short' })}</small>
      </span>
      <span className="md-riadok-zapasu__info">
        <small>
          {[z.liga_nazov, z.kolo ? `${z.kolo}. kolo` : null, denVTyzdni(z.datum_cas)].filter(Boolean).join(' · ')}
        </small>
        <span className="md-riadok-zapasu__timy">
          <span className="md-riadok-zapasu__tim">
            <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} velkost="xs" />
            <span className={z.domaci_tim_id ? 'is-nas' : ''}>{nazovDomacich(z)}</span>
          </span>
          <span className="md-riadok-zapasu__tim">
            <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} velkost="xs" />
            <span className={z.hostujuci_tim_id ? 'is-nas' : ''}>{nazovHosti(z)}</span>
          </span>
        </span>
      </span>
      <span className="md-riadok-zapasu__stav">
        {maVysledok(z) && stav !== 'naplanovany' ? (
          <>
            <span className={`md-skore${vysledok ? ` md-skore--${vysledok}` : ''}`}>
              {z.goly_domaci}
              <i>:</i>
              {z.goly_hostia}
            </span>
            {stav === 'prebieha' && <small className="md-live">Live</small>}
          </>
        ) : stav === 'odlozeny' || stav === 'zruseny' ? (
          <small className="md-riadok-zapasu__zruseny">{STAVY_ZAPASU[stav]}</small>
        ) : (
          <span className="md-riadok-zapasu__cas">{cas(z.datum_cas)}</span>
        )}
      </span>
    </Link>
  );
};

/** Forma tímu: posledné zápasy ako farebné bodky (W/D/L alebo V/R/P). */
export const Forma: React.FC<{ forma?: string | null }> = ({ forma }) => {
  if (!forma) return null;
  const znaky = forma.toUpperCase().replace(/[^WDLVRP]/g, '').slice(-5).split('');
  const typ = (z: string) => (z === 'W' || z === 'V' ? 'V' : z === 'D' || z === 'R' ? 'R' : 'P');
  const popis: Record<string, string> = { V: 'Výhra', R: 'Remíza', P: 'Prehra' };
  return (
    <span className="md-forma">
      {znaky.map((z, i) => (
        <span key={i} className={`md-forma__znak md-forma__znak--${typ(z)}`} title={popis[typ(z)]}>
          {typ(z)}
        </span>
      ))}
    </span>
  );
};

/** Tabuľka súťaže. `kompaktna` = len pozícia, tím, zápasy, skóre a body. */
export const TabulkaSutaze: React.FC<{
  riadky: RiadokTabulky[];
  zvyraznitTim?: number | null;
  kompaktna?: boolean;
  forma?: boolean;
  lenBody?: boolean;
}> = ({ riadky, zvyraznitTim, kompaktna = false, forma = true, lenBody = false }) => {
  const nazov = (r: RiadokTabulky) => r.tim_nazov || r.custom_tim_nazov || 'Tím';
  const logo = (r: RiadokTabulky) => r.tim_logo || r.custom_tim_logo || null;
  return (
    <div className="md-tabulka-obal">
      <table className={`md-tabulka${kompaktna ? ' md-tabulka--kompaktna' : ''}`}>
        <thead>
          <tr>
            <th className="md-tabulka__poz">#</th>
            <th className="md-tabulka__tim">Tím</th>
            <th title="Zápasy">Z</th>
            {!kompaktna && !lenBody && (
              <>
                <th title="Výhry" className="md-tabulka__volitelne">V</th>
                <th title="Remízy" className="md-tabulka__volitelne">R</th>
                <th title="Prehry" className="md-tabulka__volitelne">P</th>
              </>
            )}
            {!lenBody && <th title="Skóre">Skóre</th>}
            {!kompaktna && !lenBody && (
              <th title="Rozdiel skóre" className="md-tabulka__volitelne">
                +/−
              </th>
            )}
            <th title="Body">B</th>
            {!kompaktna && forma && <th className="md-tabulka__forma">Forma</th>}
          </tr>
        </thead>
        <tbody>
          {riadky.map((r) => (
            <tr key={r.id} className={zvyraznitTim && r.tim_id === zvyraznitTim ? 'is-nas' : ''}>
              <td className="md-tabulka__poz">{r.pozicia}</td>
              <td className="md-tabulka__tim">
                <span>
                  <Erb nazov={nazov(r)} logo={logo(r)} velkost="xs" />
                  <span className="md-tabulka__nazov">{nazov(r)}</span>
                </span>
              </td>
              <td>{r.zapasy}</td>
              {!kompaktna && !lenBody && (
                <>
                  <td className="md-tabulka__volitelne">{r.vitazstva}</td>
                  <td className="md-tabulka__volitelne">{r.remizy}</td>
                  <td className="md-tabulka__volitelne">{r.prehry}</td>
                </>
              )}
              {!lenBody && (
                <td className="md-tabulka__skore">
                  {r.goly_za}:{r.goly_proti}
                </td>
              )}
              {!kompaktna && !lenBody && <td className="md-tabulka__volitelne">{r.goly_rozdiel > 0 ? `+${r.goly_rozdiel}` : r.goly_rozdiel}</td>}
              <td className="md-tabulka__body">{r.body}</td>
              {!kompaktna && forma && (
                <td className="md-tabulka__forma">
                  <Forma forma={r.forma} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Výrez tabuľky okolo nášho tímu (na úvod) - najviac `pocet` riadkov. */
export const vyrezTabulky = (riadky: RiadokTabulky[], timId: number | null | undefined, pocet = 6) => {
  if (riadky.length <= pocet) return riadky;
  const index = timId ? riadky.findIndex((r) => r.tim_id === timId) : -1;
  if (index < 0) return riadky.slice(0, pocet);
  const zaciatok = Math.max(0, Math.min(index - Math.floor(pocet / 2), riadky.length - pocet));
  return riadky.slice(zaciatok, zaciatok + pocet);
};

/** Tlačidlo „Načítať ďalšie" pre stránkované zoznamy. */
export const NacitatDalsie: React.FC<{ onClick: () => void; nacitava: boolean }> = ({ onClick, nacitava }) => (
  <div className="md-dalsie">
    <button type="button" className="md-tlacidlo md-tlacidlo--sekundarne" onClick={onClick} disabled={nacitava}>
      {nacitava ? 'Načítavam…' : 'Načítať ďalšie'}
    </button>
  </div>
);

/** Hlavný tím klubu pre úvod a rýchle odkazy: podľa nastavenia šablóny, inak prvý mužský. */
export const vyberHlavnyTim = (timy: Tim[] | null | undefined, podlaNastavenia?: number | null) => {
  if (!timy?.length) return null;
  if (podlaNastavenia) {
    const zvoleny = timy.find((t) => t.id === Number(podlaNastavenia));
    if (zvoleny) return zvoleny;
  }
  const zoradene = [...timy].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id);
  return zoradene.find((t) => t.typ === 'muzi') ?? zoradene[0];
};

/** Prepínač záložiek (segmentované tlačidlá ako v aplikácii). */
export const Zalozky = <K extends string>({
  moznosti,
  aktivna,
  onZmena,
  popis,
}: {
  moznosti: Array<{ kluc: K; nazov: string; pocet?: number }>;
  aktivna: K;
  onZmena: (kluc: K) => void;
  popis: string;
}) => (
  <div className="md-zalozky md-posuvnik" role="tablist" aria-label={popis}>
    {moznosti.map((m) => (
      <button
        key={m.kluc}
        type="button"
        role="tab"
        aria-selected={aktivna === m.kluc}
        className={`md-zalozky__polozka${aktivna === m.kluc ? ' is-aktivna' : ''}`}
        onClick={() => onZmena(m.kluc)}
      >
        {m.nazov}
        {m.pocet !== undefined && <span>{m.pocet}</span>}
      </button>
    ))}
  </div>
);

/** Záložka uložená v adrese (#kader) - dá sa poslať odkazom a prežije návrat späť. */
export const useZalozkaVAdrese = <K extends string>(povolene: K[], predvolena: K): [K, (k: K) => void] => {
  const [ziadana, setZiadana] = useState<string>(() => window.location.hash.replace('#', ''));
  const zmen = (k: K) => {
    setZiadana(k);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${k === predvolena ? '' : `#${k}`}`);
  };
  // Ak záložka z adresy zatiaľ neexistuje (dáta sa ešte načítavajú), nechá sa predvolená
  return [povolene.includes(ziadana as K) ? (ziadana as K) : predvolena, zmen];
};

/** Zápasy zoskupené podľa mesiaca. */
export const podlaMesiaca = (zapasy: Zapas[]) => {
  const skupiny: Array<{ mesiac: string; zapasy: Zapas[] }> = [];
  for (const z of zapasy) {
    const mesiac = mesiacRok(z.datum_cas);
    const posledna = skupiny[skupiny.length - 1];
    if (posledna?.mesiac === mesiac) posledna.zapasy.push(z);
    else skupiny.push({ mesiac, zapasy: [z] });
  }
  return skupiny;
};

/** Obrázok z cudzieho servera (náhľad YouTube) sa nenačítal - radšej nič než ikona rozbitého obrázka. */
export const skryObrazok = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = 'hidden';
};
