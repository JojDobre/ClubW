// Umiestnenie: sablony/klubova/src/spolocne.tsx
// Spoločné súčasti šablóny Klubová: načítanie dát, typy z verejného API,
// formáty dátumov, erby tímov, ikony a nadpis sekcie.

import React, { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  autor?: { id: number; meno: string } | null;
  kategoria?: { id: number; nazov: string; slug: string } | null;
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
  video_url?: string | null;
  rozhodca?: string | null;
  pocet_divakov?: number | null;
  poznamky?: string | null;
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
  zobrazit_formu?: boolean;
  rezim_tabulky?: 'plna' | 'len_body';
  external_widget_url?: string | null;
}

export interface Strankovanie {
  total: number;
  pages: number;
  current_page: number;
  has_next: boolean;
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
  popis?: string | null;
  url: string;
  zdroj?: 'youtube' | 'vimeo' | 'ine';
  video_id?: string | null;
  nahlad_url?: string | null;
  nahlad?: string | null;
  dlzka?: number | null;
  kategoria?: string | null;
  vytvorene?: string;
  rubrika?: { nazov: string } | null;
  zapas?: { id: number } | null;
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
  strankovanie: Strankovanie | null;
  nacitava: boolean;
  chyba: string | null;
  /** HTTP stav odpovede (404 = neexistuje) */
  stav: number | null;
}

/** Načíta dáta z verejného API. Prázdna cesta = nič nenačítavať. */
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
 * Stránkovaný zoznam s tlačidlom „Načítať ďalšie". Po zmene filtra
 * (inej adresy) sa začína znova od prvej strany.
 */
export const useStrankovanyZoznam = <T extends { id: number }>(cesta: (strana: number) => string | null, filter: string) => {
  const [stranaFiltra, setStranaFiltra] = useState({ filter, cislo: 1 });
  const strana = stranaFiltra.filter === filter ? stranaFiltra.cislo : 1;
  const [stav, setStav] = useState<{ filter: string; polozky: T[] }>({ filter, polozky: [] });
  const odpoved = useApi<T[]>(cesta(strana));
  useEffect(() => {
    if (!odpoved.data) return;
    const nove = odpoved.data;
    setStav((s) =>
      strana === 1 || s.filter !== filter ? { filter, polozky: nove } : { filter, polozky: [...s.polozky, ...nove.filter((x) => !s.polozky.some((y) => y.id === x.id))] }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odpoved.data]);
  const polozky = stav.filter === filter ? stav.polozky : [];
  return {
    polozky,
    nacitava: odpoved.nacitava,
    chyba: odpoved.chyba,
    dalsie: Boolean(odpoved.strankovanie?.has_next),
    nacitajDalsie: () => setStranaFiltra({ filter, cislo: strana + 1 }),
    prvaNacitava: odpoved.nacitava && polozky.length === 0,
  };
};

/**
 * Voľba uložená v adrese (?cast=zapasy) - dá sa poslať odkazom a prežije
 * návrat späť. Neznáma hodnota (dáta sa ešte načítavajú) = predvolená.
 */
export const useVolbaVAdrese = <K extends string>(kluc: string, povolene: K[], predvolena: K): [K, (k: K) => void] => {
  const [parametre, setParametre] = useSearchParams();
  const ziadana = parametre.get(kluc) ?? '';
  const zmen = (k: K) => {
    const nove = new URLSearchParams(parametre);
    if (k === predvolena) nove.delete(kluc);
    else nove.set(kluc, k);
    setParametre(nove, { replace: true });
  };
  return [povolene.includes(ziadana as K) ? (ziadana as K) : predvolena, zmen];
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
/** „12. 4. 2001" */
export const datumCiselny = (d?: string | null) => {
  if (!d) return '';
  const x = naDatum(d);
  return `${x.getDate()}. ${x.getMonth() + 1}. ${x.getFullYear()}`;
};
const DNI_TYZDNA = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
export const denVTyzdni = (d?: string | null) => (d ? DNI_TYZDNA[naDatum(d).getDay()] : '');
/** „September 2026" */
export const mesiacRok = (d: string | Date) => {
  const x = naDatum(d);
  const m = MESIACE[x.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${x.getFullYear()}`;
};
/** Slovenské množné číslo: sklon(3, 'gól', 'góly', 'gólov') → „góly". */
export const sklon = (n: number, jeden: string, dva: string, pat: string) => (n === 1 ? jeden : n >= 2 && n <= 4 ? dva : pat);

/** „dnes", „zajtra", „o 3 dni" */
export const zaKolko = (d: string) => {
  const zaciatok = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dni = Math.round((zaciatok(naDatum(d)) - zaciatok(new Date())) / 86_400_000);
  if (dni === 0) return 'dnes';
  if (dni === 1) return 'zajtra';
  if (dni < 0) return '';
  if (dni < 5) return `o ${dni} dni`;
  return `o ${dni} dní`;
};

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

export const POZICIE: Record<string, { nazov: string; mnozne: string; poradie: number }> = {
  brankar: { nazov: 'Brankár', mnozne: 'Brankári', poradie: 1 },
  obranca: { nazov: 'Obranca', mnozne: 'Obrancovia', poradie: 2 },
  zaloznik: { nazov: 'Stredopoliar', mnozne: 'Stredopoliari', poradie: 3 },
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

/** Tímy klubu v poradí z administrácie. */
export const zoradTimy = (timy: Tim[] | null | undefined) => [...(timy ?? [])].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id);

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

export const STAVY_ZAPASU: Record<string, string> = {
  naplanovany: 'Nadchádzajúci',
  prebieha: 'Prebieha',
  ukonceny: 'Odohraný',
  odlozeny: 'Odložený',
  zruseny: 'Zrušený',
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
export const Erb: React.FC<{ nazov: string; logo?: string | null; ton?: 'tmavy' | 'akcent'; velky?: boolean }> = ({ nazov, logo, ton = 'tmavy', velky = false }) =>
  logo ? (
    <span className={`kl-erb kl-erb--logo${velky ? ' kl-erb--velky' : ''}`}>
      <img src={obrazokUrl(logo) ?? ''} alt="" loading="lazy" />
    </span>
  ) : (
    <span className={`kl-erb kl-erb--${ton}${velky ? ' kl-erb--velky' : ''}`} aria-hidden="true">
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
  stiahnut: 'M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10',
  dokument: 'M4 1.8h5.2L12.5 5v9.2H4ZM9 1.8V5.2h3.4M6 8.5h4.5M6 11h4.5',
  foto: 'M2 4.5h2.6L6 2.8h4L11.4 4.5H14v8.7H2ZM8 11a2.3 2.3 0 1 0 0-4.6A2.3 2.3 0 0 0 8 11Z',
  mail: 'M2 3.5h12v9H2ZM2.5 4l5.5 4.5L13.5 4',
  telefon: 'M5.2 2H3a1 1 0 0 0-1 1.1C2.5 9 7 13.5 12.9 14a1 1 0 0 0 1.1-1v-2.2l-2.9-1.2-1.4 1.4A7.6 7.6 0 0 1 5 6.3L6.4 5Z',
  pohar: 'M4.5 2h7v3.5a3.5 3.5 0 0 1-7 0ZM4.5 3.5H2.2c0 2 1 3.2 2.6 3.4M11.5 3.5h2.3c0 2-1 3.2-2.6 3.4M8 9v2.8M5.3 14h5.4M6 11.8h4',
  miesto: 'M8 14.5s-4.8-4.3-4.8-8a4.8 4.8 0 0 1 9.6 0c0 3.7-4.8 8-4.8 8ZM8 8.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z',
  hodiny: 'M8 14.2A6.2 6.2 0 1 0 8 1.8a6.2 6.2 0 0 0 0 12.4ZM8 4.6V8l2.4 1.6',
  zdielat: 'M11.8 5.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM4.2 9.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM11.8 14.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM5.8 7.1l4.4-2.3M5.8 8.9l4.4 2.3',
  hladat: 'M7 12.2A5.2 5.2 0 1 0 7 1.8a5.2 5.2 0 0 0 0 10.4ZM10.8 10.8 14 14',
  odkaz: 'M6.8 9.2a3 3 0 0 0 4.3 0l2-2a3 3 0 0 0-4.3-4.3l-1 1M9.2 6.8a3 3 0 0 0-4.3 0l-2 2a3 3 0 0 0 4.3 4.3l1-1',
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
