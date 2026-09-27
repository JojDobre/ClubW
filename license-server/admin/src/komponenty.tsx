// Umiestnenie: license-server/admin/src/komponenty.tsx
// Spoločné prvky administrácie: tlačidlá, karty, štítky, formulárové
// polia, okná, oznámenia, načítanie dát a stránkovanie.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// ===== Ikony =====

const CESTY: Record<string, ReactNode> = {
  prehlad: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </>
  ),
  licencie: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.2-8.2M17 6l2 2M14 9l2 2" />
    </>
  ),
  produkty: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </>
  ),
  aktualizacie: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 4v5h-5" />
    </>
  ),
  udalosti: (
    <>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </>
  ),
  administratori: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M17 11l2 2 3-4" />
    </>
  ),
  ucet: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </>
  ),
  odhlasit: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  hladat: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  kopirovat: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  zavriet: <path d="M6 6l12 12M18 6 6 18" />,
  spat: <path d="M19 12H5M11 6l-6 6 6 6" />,
  stiahnut: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  github: <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  stit: <path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6z" />,
  hodiny: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>
  ),
};

export const Ikona: React.FC<{ nazov: string; velkost?: number }> = ({ nazov, velkost = 18 }) => (
  <svg width={velkost} height={velkost} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ikona">
    {CESTY[nazov]}
  </svg>
);

// ===== Základné prvky =====

type VariantTlacidla = 'primarne' | 'sekundarne' | 'nebezpecne' | 'jemne';

export const Tlacidlo: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: VariantTlacidla; nacitava?: boolean; ikona?: string; male?: boolean }
> = ({ variant = 'sekundarne', nacitava, ikona, male, children, className = '', disabled, ...zvysok }) => (
  <button
    type="button"
    className={`tlacidlo tlacidlo--${variant}${male ? ' tlacidlo--male' : ''} ${className}`}
    disabled={disabled || nacitava}
    {...zvysok}
  >
    {nacitava ? <span className="kruh" aria-hidden="true" /> : ikona ? <Ikona nazov={ikona} velkost={16} /> : null}
    {children}
  </button>
);

export const Karta: React.FC<{ nadpis?: ReactNode; akcie?: ReactNode; children: ReactNode; className?: string }> = ({ nadpis, akcie, children, className = '' }) => (
  <section className={`karta ${className}`}>
    {(nadpis || akcie) && (
      <header className="karta__hlava">
        {nadpis && <h2>{nadpis}</h2>}
        {akcie && <div className="karta__akcie">{akcie}</div>}
      </header>
    )}
    {children}
  </section>
);

export const Stitok: React.FC<{ ton?: string; children: ReactNode; bodka?: boolean }> = ({ ton = 'seda', children, bodka }) => (
  <span className={`stitok stitok--${ton}${bodka ? ' stitok--bodka' : ''}`}>{children}</span>
);

export const HlavickaStranky: React.FC<{ nadpis: ReactNode; popis?: ReactNode; akcie?: ReactNode; spat?: ReactNode }> = ({ nadpis, popis, akcie, spat }) => (
  <header className="hlavicka-stranky">
    {spat}
    <div className="hlavicka-stranky__riadok">
      <div>
        <h1>{nadpis}</h1>
        {popis && <p>{popis}</p>}
      </div>
      {akcie && <div className="hlavicka-stranky__akcie">{akcie}</div>}
    </div>
  </header>
);

export const StatKarta: React.FC<{ nazov: string; hodnota: ReactNode; ton?: string; popis?: ReactNode; onClick?: () => void }> = ({ nazov, hodnota, ton, popis, onClick }) => (
  <button type="button" className={`stat${ton ? ` stat--${ton}` : ''}`} onClick={onClick} disabled={!onClick}>
    <span className="stat__nazov">{nazov}</span>
    <strong className="stat__hodnota">{hodnota}</strong>
    {popis && <span className="stat__popis">{popis}</span>}
  </button>
);

export const Nacitava: React.FC<{ text?: string }> = ({ text = 'Načítavam…' }) => (
  <div className="stav" role="status">
    <span className="kruh" aria-hidden="true" />
    {text}
  </div>
);

export const Prazdne: React.FC<{ nadpis: string; text?: ReactNode; children?: ReactNode }> = ({ nadpis, text, children }) => (
  <div className="prazdne">
    <strong>{nadpis}</strong>
    {text && <p>{text}</p>}
    {children}
  </div>
);

export const ChybaStav: React.FC<{ text: string; onZnova?: () => void }> = ({ text, onZnova }) => (
  <div className="prazdne prazdne--chyba" role="alert">
    <strong>Niečo sa pokazilo</strong>
    <p>{text}</p>
    {onZnova && <Tlacidlo onClick={onZnova}>Skúsiť znova</Tlacidlo>}
  </div>
);

// ===== Formulárové polia =====

let pocitadloId = 0;
const useId = () => useRef(`pole-${++pocitadloId}`).current;

export const Pole: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { menovka: string; napoveda?: ReactNode }> = ({ menovka, napoveda, className = '', ...zvysok }) => {
  const id = useId();
  return (
    <label className={`pole ${className}`} htmlFor={id}>
      <span className="pole__menovka">{menovka}</span>
      <input id={id} {...zvysok} />
      {napoveda && <span className="pole__napoveda">{napoveda}</span>}
    </label>
  );
};

export const Oblast: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { menovka: string; napoveda?: ReactNode }> = ({ menovka, napoveda, ...zvysok }) => {
  const id = useId();
  return (
    <label className="pole" htmlFor={id}>
      <span className="pole__menovka">{menovka}</span>
      <textarea id={id} rows={3} {...zvysok} />
      {napoveda && <span className="pole__napoveda">{napoveda}</span>}
    </label>
  );
};

export const Vyber: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { menovka?: string; moznosti: Array<{ hodnota: string | number; popis: string }>; prazdna?: string; napoveda?: ReactNode }
> = ({ menovka, moznosti, prazdna, napoveda, className = '', ...zvysok }) => {
  const id = useId();
  const vyber = (
    <select id={id} aria-label={menovka ? undefined : prazdna} {...zvysok}>
      {prazdna !== undefined && <option value="">{prazdna}</option>}
      {moznosti.map((m) => (
        <option key={m.hodnota} value={m.hodnota}>
          {m.popis}
        </option>
      ))}
    </select>
  );
  if (!menovka) return <span className={`vyber-samostatny ${className}`}>{vyber}</span>;
  return (
    <label className={`pole ${className}`} htmlFor={id}>
      <span className="pole__menovka">{menovka}</span>
      {vyber}
      {napoveda && <span className="pole__napoveda">{napoveda}</span>}
    </label>
  );
};

export const Prepinac: React.FC<{ menovka: string; napoveda?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ menovka, napoveda, checked, onChange, disabled }) => (
  <label className="prepinac">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    <span className="prepinac__kolajnica" aria-hidden="true" />
    <span className="prepinac__text">
      <span>{menovka}</span>
      {napoveda && <small>{napoveda}</small>}
    </span>
  </label>
);

// ===== Okno =====

export const Okno: React.FC<{ nadpis: string; onZavriet: () => void; children: ReactNode; paticka?: ReactNode; siroke?: boolean }> = ({ nadpis, onZavriet, children, paticka, siroke }) => {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onZavriet();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onZavriet]);
  return (
    <div className="okno-pozadie" onMouseDown={(e) => e.target === e.currentTarget && onZavriet()}>
      <div className={`okno${siroke ? ' okno--siroke' : ''}`} role="dialog" aria-modal="true" aria-label={nadpis}>
        <header className="okno__hlava">
          <h2>{nadpis}</h2>
          <button type="button" className="ikona-tlacidlo" onClick={onZavriet} aria-label="Zavrieť">
            <Ikona nazov="zavriet" />
          </button>
        </header>
        <div className="okno__telo">{children}</div>
        {paticka && <footer className="okno__paticka">{paticka}</footer>}
      </div>
    </div>
  );
};

// ===== Oznámenia =====

interface Oznamenie {
  id: number;
  text: string;
  ton: 'uspech' | 'chyba';
}

const OznameniaContext = createContext<{ uspech: (t: string) => void; chyba: (t: string) => void }>({ uspech: () => undefined, chyba: () => undefined });

export const OznameniaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [zoznam, setZoznam] = useState<Oznamenie[]>([]);
  const pridaj = useCallback((text: string, ton: Oznamenie['ton']) => {
    const id = Date.now() + Math.random();
    setZoznam((z) => [...z.slice(-3), { id, text, ton }]);
    setTimeout(() => setZoznam((z) => z.filter((o) => o.id !== id)), ton === 'chyba' ? 7000 : 4000);
  }, []);
  const hodnota = useRef({ uspech: (t: string) => pridaj(t, 'uspech'), chyba: (t: string) => pridaj(t, 'chyba') }).current;
  return (
    <OznameniaContext.Provider value={hodnota}>
      {children}
      <div className="oznamenia" aria-live="polite">
        {zoznam.map((o) => (
          <div key={o.id} className={`oznamenie oznamenie--${o.ton}`} role={o.ton === 'chyba' ? 'alert' : 'status'}>
            {o.text}
          </div>
        ))}
      </div>
    </OznameniaContext.Provider>
  );
};

export const useOznamenia = () => useContext(OznameniaContext);

// ===== Načítanie dát =====

export const useNacitaj = <T,>(nacitaj: ((signal: AbortSignal) => Promise<T>) | null, zavislosti: unknown[]) => {
  const [stav, setStav] = useState<{ data: T | null; nacitava: boolean; chyba: string | null }>({ data: null, nacitava: Boolean(nacitaj), chyba: null });
  const [obnovenie, setObnovenie] = useState(0);
  useEffect(() => {
    if (!nacitaj) return;
    const ovladac = new AbortController();
    setStav((s) => ({ ...s, nacitava: true, chyba: null }));
    nacitaj(ovladac.signal)
      .then((data) => setStav({ data, nacitava: false, chyba: null }))
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setStav((s) => ({ ...s, nacitava: false, chyba: e?.message || 'Načítanie zlyhalo' }));
      });
    return () => ovladac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...zavislosti, obnovenie]);
  const obnov = useCallback(() => setObnovenie((x) => x + 1), []);
  return { ...stav, obnov };
};

/** Pravidelné obnovenie (napr. kým sa pripravuje balík alebo beží aktualizácia). */
export const useInterval = (fn: () => void, ms: number | null) => {
  const ulozena = useRef(fn);
  ulozena.current = fn;
  useEffect(() => {
    if (ms === null) return;
    const t = setInterval(() => ulozena.current(), ms);
    return () => clearInterval(t);
  }, [ms]);
};

// ===== Drobnosti =====

export const Kopirovat: React.FC<{ text: string; popis?: string }> = ({ text, popis = 'Kopírovať' }) => {
  const [hotovo, setHotovo] = useState(false);
  const kopiruj = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const pole = document.createElement('textarea');
      pole.value = text;
      document.body.appendChild(pole);
      pole.select();
      document.execCommand('copy');
      pole.remove();
    }
    setHotovo(true);
    setTimeout(() => setHotovo(false), 1800);
  };
  return (
    <Tlacidlo male variant="jemne" ikona="kopirovat" onClick={kopiruj}>
      {hotovo ? 'Skopírované' : popis}
    </Tlacidlo>
  );
};

export const Strankovanie: React.FC<{ strana: number; stran: number; celkom: number; onZmena: (s: number) => void }> = ({ strana, stran, celkom, onZmena }) =>
  stran <= 1 ? (
    <p className="strankovanie__info">Spolu {celkom}</p>
  ) : (
    <nav className="strankovanie" aria-label="Stránkovanie">
      <span className="strankovanie__info">
        Strana {strana} z {stran} · spolu {celkom}
      </span>
      <Tlacidlo male disabled={strana <= 1} onClick={() => onZmena(strana - 1)}>
        Predošlá
      </Tlacidlo>
      <Tlacidlo male disabled={strana >= stran} onClick={() => onZmena(strana + 1)}>
        Ďalšia
      </Tlacidlo>
    </nav>
  );

/** Potvrdenie akcie v okne (namiesto window.confirm). */
export const usePotvrdenie = () => {
  const [otazka, setOtazka] = useState<{ nadpis: string; text: ReactNode; potvrdit: string; nebezpecne?: boolean; vyries: (v: boolean) => void } | null>(null);
  const potvrd = (nadpis: string, text: ReactNode, potvrdit = 'Potvrdiť', nebezpecne = false) =>
    new Promise<boolean>((vyries) => setOtazka({ nadpis, text, potvrdit, nebezpecne, vyries }));
  const okno = otazka ? (
    <Okno
      nadpis={otazka.nadpis}
      onZavriet={() => {
        otazka.vyries(false);
        setOtazka(null);
      }}
      paticka={
        <>
          <Tlacidlo
            onClick={() => {
              otazka.vyries(false);
              setOtazka(null);
            }}
          >
            Zrušiť
          </Tlacidlo>
          <Tlacidlo
            variant={otazka.nebezpecne ? 'nebezpecne' : 'primarne'}
            onClick={() => {
              otazka.vyries(true);
              setOtazka(null);
            }}
          >
            {otazka.potvrdit}
          </Tlacidlo>
        </>
      }
    >
      <div className="okno__text">{otazka.text}</div>
    </Okno>
  ) : null;
  return { potvrd, okno };
};
