// Umiestnenie: frontend/src/web/eshop.tsx
// E-shop pre šablóny: košík (uložený v prehliadači), nastavenia obchodu,
// výpočet ceny so zvolenými vlastnosťami, odoslanie objednávky a rámec
// pre platobnú bránu. Šablóny ich dostanú cez @clubw/jadro, takže každá
// rieši len vzhľad - správanie košíka je všade rovnaké.
//
// Ceny v košíku sú len na zobrazenie. Pri odoslaní objednávky ich server
// prepočíta z databázy, takže úprava košíka v prehliadači nič nezmení.

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { apiUrl } from '../config/api';

// ===== Typy =====

export interface HodnotaVlastnosti {
  id: string;
  nazov: string;
  priplatok: number;
  sklad: number | null;
}

export interface VlastnostProduktu {
  id: string;
  nazov: string;
  typ: 'vyber' | 'text';
  povinna: boolean;
  hodnoty: HodnotaVlastnosti[];
  priplatok: number;
  max_dlzka: number | null;
}

export interface ProduktObchodu {
  id: number;
  nazov: string;
  slug: string;
  kategoria?: { id: number; nazov: string; slug: string } | null;
  kratky_popis: string | null;
  popis: string | null;
  cena: number;
  povodna_cena: number | null;
  obrazok: string | null;
  obrazky: string[];
  vlastnosti: VlastnostProduktu[];
  sklad: number | null;
  odporucany: boolean;
  vypredany: boolean;
}

export interface KategoriaObchodu {
  id: number;
  nazov: string;
  slug: string;
  popis: string | null;
  pocet_produktov: number;
}

export interface SposobDorucenia {
  id: number;
  nazov: string;
  popis: string | null;
  cena: number;
  zadarmo_od: number | null;
  vyzaduje_adresu: boolean;
}

export interface SposobPlatby {
  id: number;
  nazov: string;
  popis: string | null;
  typ: 'prevod' | 'dobierka' | 'hotovost' | 'brana' | 'ine';
  poplatok: number;
  /** Povolené doručenia (id); prázdne = všetky */
  dorucenia: number[];
}

export interface NastaveniaObchodu {
  zapnuty: boolean;
  mena: string;
  podmienky_url: string | null;
  predvolena_krajina: string;
  minimalna_objednavka: number;
  dorucenia: SposobDorucenia[];
  platby: SposobPlatby[];
}

export interface PolozkaKosika {
  /** Produkt + zvolené vlastnosti - rovnaká kombinácia sa sčíta */
  kluc: string;
  produkt_id: number;
  slug: string;
  nazov: string;
  obrazok: string | null;
  /** Cena kusu v čase pridania - len na zobrazenie */
  cena_za_kus: number;
  pocet: number;
  /** { [vlastnost_id]: hodnota_id alebo text } */
  volby: Record<string, string>;
  /** „Veľkosť: XL", „Meno na dres: NOVÁK 9" */
  popis_volieb: string[];
}

export interface ObjednavkaZakaznika {
  cislo: string;
  stav: 'nova' | 'potvrdena' | 'pripravena' | 'odoslana' | 'vybavena' | 'zrusena';
  stav_platby: 'neuhradena' | 'uhradena' | 'vratena';
  vytvorena: string;
  meno: string;
  email: string;
  telefon: string | null;
  ulica: string | null;
  mesto: string | null;
  psc: string | null;
  krajina: string | null;
  poznamka: string | null;
  dorucenie_nazov: string;
  dorucenie_cena: number;
  platba_nazov: string;
  platba_typ: SposobPlatby['typ'];
  platba_poplatok: number;
  medzisucet: number;
  spolu: number;
  mena: string;
  variabilny_symbol: string;
  polozky: Array<{ id: number; nazov: string; vlastnosti: Array<{ nazov: string; hodnota: string }>; cena_za_kus: number; pocet: number; spolu: number }>;
  text_potvrdenia: string | null;
  pokyny: string | null;
  brana_html: string | null;
}

export interface UdajeObjednavky {
  meno: string;
  email: string;
  telefon?: string;
  ulica?: string;
  mesto?: string;
  psc?: string;
  krajina?: string;
  poznamka?: string;
  dorucenie_id: number;
  platba_id: number;
  suhlas_podmienky?: boolean;
}

// ===== Formáty =====

/** „49,90 €" */
export const cenaText = (suma: number | null | undefined, mena = 'EUR'): string =>
  `${Number(suma ?? 0).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${mena === 'EUR' ? '€' : mena}`;

export const NAZVY_STAVOV_OBJEDNAVKY: Record<string, string> = {
  nova: 'Prijatá',
  potvrdena: 'Potvrdená',
  pripravena: 'Pripravená na odovzdanie',
  odoslana: 'Odoslaná',
  vybavena: 'Vybavená',
  zrusena: 'Zrušená',
};

// ===== Stránka objednávky pre zákazníka =====

export interface KrokObjednavky {
  kluc: string;
  nazov: string;
  stav: 'hotovy' | 'aktualny' | 'caka';
}

/**
 * Kroky priebehu objednávky: Prijatá → Potvrdená → Odoslaná / Pripravená → Vybavená.
 * Tretí krok sa riadi skutočným stavom (objednávka pripravená na vyzdvihnutie
 * je „Pripravená“, aj keď má adresu), inak spôsobom doručenia.
 */
export const krokyObjednavky = (o: ObjednavkaZakaznika): KrokObjednavky[] => {
  if (o.stav === 'zrusena') return [];
  const treti = o.stav === 'pripravena' || o.stav === 'odoslana' ? o.stav : o.ulica ? 'odoslana' : 'pripravena';
  const kroky: Array<[string, string]> = [
    ['nova', 'Prijatá'],
    ['potvrdena', 'Potvrdená'],
    [treti, treti === 'pripravena' ? 'Pripravená' : 'Odoslaná'],
    ['vybavena', 'Vybavená'],
  ];
  const poradie: Record<string, number> = { nova: 0, potvrdena: 1, pripravena: 2, odoslana: 2, vybavena: 3 };
  const aktualny = poradie[o.stav] ?? 0;
  return kroky.map(([kluc, nazov], i) => ({ kluc, nazov, stav: i < aktualny ? 'hotovy' : i === aktualny ? 'aktualny' : 'caka' }));
};

export interface InfoPlatby {
  /** Nadpis karty platby */
  nadpis: string;
  /** Text odznaku, napríklad „Zaplatené“ alebo „Dobierka“ */
  odznak: string;
  /** Tón odznaku - šablóna podľa neho volí farbu */
  ton: 'uhradena' | 'neuhradena' | 'vratena' | 'dobierka';
  /** Vysvetlenie pre zákazníka */
  text: string | null;
  /** Ukázať sumu a variabilný symbol (platí sa prevodom alebo bránou) */
  udajeNaPlatbu: boolean;
}

/**
 * Čo ukázať v karte platby. Dobierka a hotovosť sa platia pri prevzatí -
 * nie sú „neuhradené“ ani nečakajú na platbu ako prevod alebo brána.
 */
export const infoPlatby = (o: ObjednavkaZakaznika): InfoPlatby => {
  if (o.stav_platby === 'uhradena') return { nadpis: 'Objednávka je uhradená', odznak: 'Zaplatené', ton: 'uhradena', text: null, udajeNaPlatbu: false };
  if (o.stav_platby === 'vratena') return { nadpis: 'Platba bola vrátená', odznak: 'Vrátené', ton: 'vratena', text: null, udajeNaPlatbu: false };
  const suma = cenaText(o.spolu, o.mena);
  if (o.platba_typ === 'dobierka') {
    return { nadpis: o.platba_nazov, odznak: 'Dobierka', ton: 'dobierka', text: `Sumu ${suma} zaplatíte kuriérovi pri prevzatí zásielky.`, udajeNaPlatbu: false };
  }
  if (o.platba_typ === 'hotovost') {
    return { nadpis: o.platba_nazov, odznak: 'Pri prevzatí', ton: 'dobierka', text: `Sumu ${suma} zaplatíte pri prevzatí objednávky.`, udajeNaPlatbu: false };
  }
  return { nadpis: o.platba_nazov, odznak: 'Čaká na platbu', ton: 'neuhradena', text: null, udajeNaPlatbu: true };
};

/**
 * Karta s aktuálnym stavom vybavenia (po karte platby): odoslaná,
 * pripravená na vyzdvihnutie alebo vybavená. Pri ostatných stavoch null.
 */
export const kartaStavuObjednavky = (o: ObjednavkaZakaznika): { nadpis: string; text: string; odznak: string } | null => {
  if (o.stav === 'odoslana') {
    const adresa = [o.ulica, [o.psc, o.mesto].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return { nadpis: 'Objednávka je odoslaná', odznak: 'Na ceste', text: adresa ? `Zásielka je na ceste na adresu ${adresa}.` : 'Zásielka je na ceste.' };
  }
  if (o.stav === 'pripravena') {
    return { nadpis: 'Objednávka je pripravená na vyzdvihnutie', odznak: 'Pripravená', text: `Vyzdvihnúť si ju môžete: ${o.dorucenie_nazov}.` };
  }
  if (o.stav === 'vybavena') return { nadpis: 'Objednávka je vybavená', odznak: 'Vybavená', text: 'Ďakujeme za nákup a podporu klubu!' };
  return null;
};

// ===== Nastavenia obchodu =====

let pamatNastaveni: Promise<NastaveniaObchodu | null> | null = null;

const nacitajNastavenia = () => {
  if (!pamatNastaveni) {
    pamatNastaveni = fetch(apiUrl('/eshop/nastavenia'))
      .then((r) => r.json())
      .then((telo) => (telo?.success ? (telo.data as NastaveniaObchodu) : null))
      .catch(() => null);
  }
  return pamatNastaveni;
};

/** Nastavenia obchodu: zapnutý?, mena, spôsoby doručenia a platby. */
export const useObchod = (): { obchod: NastaveniaObchodu | null; nacitava: boolean } => {
  const [obchod, setObchod] = useState<NastaveniaObchodu | null>(null);
  const [nacitava, setNacitava] = useState(true);
  useEffect(() => {
    let zruseny = false;
    nacitajNastavenia().then((n) => {
      if (zruseny) return;
      setObchod(n);
      setNacitava(false);
    });
    return () => {
      zruseny = true;
    };
  }, []);
  return { obchod, nacitava };
};

// ===== Cena so zvolenými vlastnosťami =====

/**
 * Cena kusu so zvolenými vlastnosťami a chýbajúce povinné voľby -
 * na zobrazenie pred pridaním do košíka.
 */
export const cenaSVolbami = (produkt: ProduktObchodu, volby: Record<string, string>) => {
  let cena = produkt.cena;
  const chybajuce: string[] = [];
  const popis: string[] = [];
  for (const v of produkt.vlastnosti || []) {
    const hodnota = (volby[v.id] ?? '').trim();
    if (v.typ === 'vyber') {
      const h = v.hodnoty.find((x) => x.id === hodnota);
      if (!h) chybajuce.push(v.nazov);
      else {
        cena += h.priplatok || 0;
        popis.push(`${v.nazov}: ${h.nazov}`);
      }
    } else if (hodnota) {
      cena += v.priplatok || 0;
      popis.push(`${v.nazov}: ${hodnota}`);
    } else if (v.povinna) chybajuce.push(v.nazov);
  }
  return { cena: Math.round(cena * 100) / 100, chybajuce, popis };
};

/** Je hodnota vlastnosti vypredaná? */
export const hodnotaVypredana = (h: HodnotaVlastnosti) => h.sklad !== null && h.sklad <= 0;

// ===== Košík =====

const KLUC_KOSIKA = 'clubw_kosik';
const UDALOST = 'clubw:kosik';
const PRAZDNY: PolozkaKosika[] = [];
let posledny: { text: string | null; polozky: PolozkaKosika[] } = { text: null, polozky: PRAZDNY };

const citajKosik = (): PolozkaKosika[] => {
  let text: string | null = null;
  try {
    text = localStorage.getItem(KLUC_KOSIKA);
  } catch {
    return PRAZDNY;
  }
  // Rovnaký text = rovnaké pole (useSyncExternalStore vyžaduje stabilnú hodnotu)
  if (text === posledny.text) return posledny.polozky;
  let polozky: PolozkaKosika[] = PRAZDNY;
  try {
    const data = text ? JSON.parse(text) : [];
    if (Array.isArray(data)) polozky = data.filter((p) => p && typeof p.produkt_id === 'number' && p.pocet > 0);
  } catch {
    /* poškodený košík = prázdny */
  }
  posledny = { text, polozky };
  return polozky;
};

const zapisKosik = (polozky: PolozkaKosika[]) => {
  try {
    if (polozky.length) localStorage.setItem(KLUC_KOSIKA, JSON.stringify(polozky));
    else localStorage.removeItem(KLUC_KOSIKA);
  } catch {
    /* súkromné okno - košík vydrží len do obnovenia stránky */
  }
  window.dispatchEvent(new Event(UDALOST));
};

const odoberaj = (zmena: () => void) => {
  window.addEventListener(UDALOST, zmena);
  // Košík zmenený v inej karte prehliadača
  const zInejKarty = (e: StorageEvent) => e.key === KLUC_KOSIKA && zmena();
  window.addEventListener('storage', zInejKarty);
  return () => {
    window.removeEventListener(UDALOST, zmena);
    window.removeEventListener('storage', zInejKarty);
  };
};

const MAX_KUSOV = 99;

/** Košík zdieľaný celým webom (hlavička, stránky obchodu) a kartami prehliadača. */
export const useKosik = () => {
  const polozky = useSyncExternalStore(odoberaj, citajKosik, () => PRAZDNY);

  const pridaj = useCallback((produkt: ProduktObchodu, volby: Record<string, string> = {}, pocet = 1) => {
    const { cena, popis } = cenaSVolbami(produkt, volby);
    const ocistene = Object.fromEntries(Object.entries(volby).filter(([, h]) => String(h).trim() !== '').map(([k, h]) => [k, String(h).trim()]));
    const kluc = `${produkt.id}|${Object.keys(ocistene).sort().map((k) => `${k}=${ocistene[k]}`).join('&')}`;
    const sucasne = citajKosik();
    const existujuca = sucasne.find((p) => p.kluc === kluc);
    zapisKosik(
      existujuca
        ? sucasne.map((p) => (p.kluc === kluc ? { ...p, pocet: Math.min(MAX_KUSOV, p.pocet + pocet), cena_za_kus: cena } : p))
        : [
            ...sucasne,
            { kluc, produkt_id: produkt.id, slug: produkt.slug, nazov: produkt.nazov, obrazok: produkt.obrazok, cena_za_kus: cena, pocet: Math.min(MAX_KUSOV, pocet), volby: ocistene, popis_volieb: popis },
          ]
    );
  }, []);

  const zmenPocet = useCallback((kluc: string, pocet: number) => {
    const sucasne = citajKosik();
    zapisKosik(pocet <= 0 ? sucasne.filter((p) => p.kluc !== kluc) : sucasne.map((p) => (p.kluc === kluc ? { ...p, pocet: Math.min(MAX_KUSOV, pocet) } : p)));
  }, []);

  const odstran = useCallback((kluc: string) => zapisKosik(citajKosik().filter((p) => p.kluc !== kluc)), []);
  const vyprazdni = useCallback(() => zapisKosik([]), []);

  const pocet = useMemo(() => polozky.reduce((s, p) => s + p.pocet, 0), [polozky]);
  const medzisucet = useMemo(() => Math.round(polozky.reduce((s, p) => s + p.cena_za_kus * p.pocet, 0) * 100) / 100, [polozky]);

  return { polozky, pocet, medzisucet, pridaj, zmenPocet, odstran, vyprazdni };
};

// ===== Objednávka =====

/**
 * Odošle objednávku z košíka. Server prepočíta ceny a overí sklad.
 *
 * @returns číslo objednávky a tajný kód do odkazu /objednavka/:token
 * @throws Error s hláškou pre zákazníka (vypredané, chýba adresa...)
 */
export const odosliObjednavku = async (polozky: PolozkaKosika[], udaje: UdajeObjednavky): Promise<{ cislo: string; token: string }> => {
  let odpoved: Response;
  try {
    odpoved = await fetch(apiUrl('/eshop/objednavky'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...udaje, polozky: polozky.map((p) => ({ produkt_id: p.produkt_id, pocet: p.pocet, volby: p.volby })) }),
    });
  } catch {
    throw new Error('Nepodarilo sa spojiť so serverom. Skúste to znova.');
  }
  const telo = await odpoved.json().catch(() => null);
  if (!odpoved.ok || !telo?.success) throw new Error(telo?.message || `Objednávku sa nepodarilo odoslať (${odpoved.status})`);
  return telo.data;
};

// ===== Platobná brána =====

/**
 * Kód platobnej brány z administrácie v izolovanom rámci. Rámec nemá
 * prístup k webu (sandbox bez allow-same-origin) - skripty brány nevidia
 * prihlásenie ani košík. Formulár brány smie otvoriť platobnú stránku
 * v celom okne (po kliknutí používateľa) alebo v novom okne.
 */
export const PlatobnaBrana: React.FC<{ html: string; className?: string; title?: string }> = ({ html, className, title = 'Platba' }) => {
  const ramec = useRef<HTMLIFrameElement>(null);
  const [vyska, setVyska] = useState(160);
  const obsah = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif;background:transparent}</style></head><body>${html}` +
      // Rámec oznámi svoju výšku, aby nebol posuvník
      `<script>(function(){var p=function(){parent.postMessage({clubwBrana:1,vyska:Math.ceil(document.body.getBoundingClientRect().height)},'*')};` +
      `window.addEventListener('load',p);new ResizeObserver(p).observe(document.body);setTimeout(p,300);})();<\/script></body></html>`,
    [html]
  );
  useEffect(() => {
    const sprava = (e: MessageEvent) => {
      if (e.source !== ramec.current?.contentWindow || !e.data?.clubwBrana) return;
      const h = Number(e.data.vyska);
      if (Number.isFinite(h)) setVyska(Math.min(Math.max(h, 60), 1600));
    };
    window.addEventListener('message', sprava);
    return () => window.removeEventListener('message', sprava);
  }, []);
  return (
    <iframe
      ref={ramec}
      className={className}
      title={title}
      srcDoc={obsah}
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      style={{ width: '100%', height: vyska, border: 0, display: 'block' }}
    />
  );
};

// ===== Stav objednávky =====

/**
 * Stav objednávky. Po návrate z platobnej brány (adresa s parametrami)
 * sa stav chvíľu obnovuje, kým brána nepošle oznámenie o platbe.
 */
export const useObjednavka = (token: string) => {
  const [objednavka, setObjednavka] = useState<ObjednavkaZakaznika | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  // Po návrate z brány má adresa parametre (?platba=..., ?status=...)
  const [zBrany] = useState(() => typeof window !== 'undefined' && window.location.search.length > 1);
  const [overuje, setOveruje] = useState(zBrany);

  useEffect(() => {
    let zruseny = false;
    let pokusy = 0;
    let casovac: ReturnType<typeof setTimeout>;
    const nacitaj = async () => {
      try {
        const r = await fetch(apiUrl(`/eshop/objednavky/${encodeURIComponent(token)}`));
        const telo = await r.json().catch(() => null);
        if (!r.ok || !telo?.success) throw new Error(telo?.message || 'Objednávka sa nenašla');
        if (zruseny) return;
        const o = telo.data as ObjednavkaZakaznika;
        setObjednavka(o);
        if (zBrany && o.stav_platby !== 'uhradena' && ++pokusy < 6) casovac = setTimeout(nacitaj, 4000);
        else setOveruje(false);
      } catch (e) {
        if (!zruseny) {
          setChyba((e as Error).message);
          setOveruje(false);
        }
      }
    };
    nacitaj();
    return () => {
      zruseny = true;
      clearTimeout(casovac);
    };
  }, [token, zBrany]);

  return { objednavka, chyba, overuje };
};

// ===== Pokladňa =====

export interface UdajeZakaznika {
  meno: string;
  email: string;
  telefon: string;
  ulica: string;
  mesto: string;
  psc: string;
  krajina: string;
  poznamka: string;
}

/**
 * Stav pokladne: údaje zákazníka, zvolené doručenie a platba, súčty
 * a odoslanie objednávky. Šablóna vykreslí len formulár.
 *
 * @example
 *   const p = usePokladna();
 *   <input value={p.udaje.meno} onChange={(e) => p.nastav({ meno: e.target.value })} />
 *   <button onClick={async () => { const t = await p.odosli(); if (t) navigate(`/objednavka/${t}`); }}>
 */
export const usePokladna = () => {
  const kosik = useKosik();
  const { obchod, nacitava } = useObchod();
  const [udaje, setUdaje] = useState<UdajeZakaznika>({ meno: '', email: '', telefon: '', ulica: '', mesto: '', psc: '', krajina: '', poznamka: '' });
  const [dorucenieId, setDorucenieId] = useState<number | null>(null);
  const [platbaId, setPlatbaId] = useState<number | null>(null);
  const [suhlas, setSuhlas] = useState(false);
  const [odosiela, setOdosiela] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const dorucenia = obchod?.dorucenia ?? [];
  const dorucenie = dorucenia.find((d) => d.id === dorucenieId) ?? null;
  const platby = (obchod?.platby ?? []).filter((p) => !dorucenie || p.dorucenia.length === 0 || p.dorucenia.includes(dorucenie.id));
  const platba = platby.find((p) => p.id === platbaId) ?? null;

  // Predvolené: prvé doručenie a prvá platba, ktorá sa k nemu hodí
  useEffect(() => {
    if (dorucenieId === null && dorucenia[0]) setDorucenieId(dorucenia[0].id);
  }, [dorucenia, dorucenieId]);
  useEffect(() => {
    if (!platby.some((p) => p.id === platbaId)) setPlatbaId(platby[0]?.id ?? null);
  }, [platby, platbaId]);
  useEffect(() => {
    if (obchod && !udaje.krajina) setUdaje((u) => ({ ...u, krajina: obchod.predvolena_krajina }));
  }, [obchod, udaje.krajina]);

  const cenaDorucenia = dorucenie ? (dorucenie.zadarmo_od !== null && kosik.medzisucet >= dorucenie.zadarmo_od ? 0 : dorucenie.cena) : 0;
  const poplatok = platba?.poplatok ?? 0;
  const spolu = Math.round((kosik.medzisucet + cenaDorucenia + poplatok) * 100) / 100;
  const potrebnaAdresa = Boolean(dorucenie?.vyzaduje_adresu);
  const chybaMinimum = obchod && obchod.minimalna_objednavka > 0 && kosik.medzisucet < obchod.minimalna_objednavka ? obchod.minimalna_objednavka : null;

  const nastav = useCallback((zmeny: Partial<UdajeZakaznika>) => setUdaje((u) => ({ ...u, ...zmeny })), []);

  /** Odošle objednávku; vráti token do odkazu /objednavka/:token alebo null pri chybe. */
  const odosli = useCallback(async (): Promise<string | null> => {
    setChyba(null);
    if (kosik.polozky.length === 0) return setChyba('Košík je prázdny'), null;
    if (udaje.meno.trim().length < 2) return setChyba('Zadajte meno a priezvisko'), null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(udaje.email.trim())) return setChyba('Zadajte platný e-mail'), null;
    if (!dorucenie) return setChyba('Vyberte spôsob doručenia'), null;
    if (!platba) return setChyba('Vyberte spôsob platby'), null;
    if (potrebnaAdresa && (!udaje.ulica.trim() || !udaje.mesto.trim() || !udaje.psc.trim())) return setChyba('Vyplňte ulicu, mesto a PSČ'), null;
    if (potrebnaAdresa && !udaje.telefon.trim()) return setChyba('Zadajte telefón pre kuriéra'), null;
    if (obchod?.podmienky_url && !suhlas) return setChyba('Potvrďte súhlas s obchodnými podmienkami'), null;
    setOdosiela(true);
    try {
      const { token } = await odosliObjednavku(kosik.polozky, {
        ...udaje,
        dorucenie_id: dorucenie.id,
        platba_id: platba.id,
        suhlas_podmienky: suhlas,
        ...(potrebnaAdresa ? {} : { ulica: '', mesto: '', psc: '' }),
      });
      kosik.vyprazdni();
      return token;
    } catch (e) {
      setChyba((e as Error).message);
      return null;
    } finally {
      setOdosiela(false);
    }
  }, [kosik, udaje, dorucenie, platba, potrebnaAdresa, obchod, suhlas]);

  return {
    kosik,
    obchod,
    nacitava,
    udaje,
    nastav,
    dorucenia,
    dorucenie,
    setDorucenieId,
    platby,
    platba,
    setPlatbaId,
    suhlas,
    setSuhlas,
    cenaDorucenia,
    poplatok,
    spolu,
    potrebnaAdresa,
    chybaMinimum,
    odosiela,
    chyba,
    odosli,
  };
};
