// Umiestnenie: sablony/pulz/src/Rozlozenie.tsx
// Kostra šablóny Pulz - moderný web s plávajúcou navigáciou.
//
// Navigácia nie je pás cez celú šírku, ale „ostrov" - zaoblený obdĺžnik
// so sklenenou výplňou, ktorý pláva nad stránkou s odstupom od vrchu.
// Pri posúvaní sa zúži a stmaví. Rozbaľovacie menu je plávajúca karta
// pod ostrovom. Na mobile ostáva malý ostrov s erbom a tlačidlom, menu
// sa otvorí cez celú obrazovku s veľkými odkazmi. Pätička je veľký
// zaoblený panel s obrovským názvom klubu.

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Cast,
  OdkazMenu,
  SKUPINY_HLADANIA,
  jePrihlaseny,
  otvorNastaveniaCookies,
  souborUrl,
  useHladanie,
  useKosik,
  useMenuWebu,
  useNastavenia,
  type PolozkaMenu,
  OdkazUctu,
} from '@clubw/jadro';
import {
  Ikona,
  Odkaz,
  cas,
  datumKratky,
  denVTyzdni,
  dnes,
  nazovDomacich,
  nazovHosti,
  obrazokUrl,
  useApi,
  useUpravy,
  type Clanok,
  type Partner,
  type Tim,
  type Zapas,
} from './spolocne';
import { RadyPartnerov } from './casti';

const jeAktivny = (odkaz: string | null, pathname: string) => {
  if (!odkaz || !odkaz.startsWith('/')) return false;
  if (odkaz === '/') return pathname === '/';
  return pathname === odkaz || pathname.startsWith(`${odkaz}/`);
};

const jeAktivnaPolozka = (p: PolozkaMenu, pathname: string): boolean =>
  jeAktivny(p.odkaz, pathname) || (p.deti ?? []).some((d) => jeAktivnaPolozka(d, pathname));

/** Tlačidlo v hlavičke: text a odkaz z nastavení, inak e-mail klubu. */
const useTlacidloHlavicky = () => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  // Predvolený text dopĺňa server; vymazaný text (null) tlačidlo skryje.
  const text = u.text('tlacidlo_text', '');
  const odkaz = String(u.s.tlacidlo_odkaz || '').trim() || (nastavenia.kontakt?.email ? `mailto:${nastavenia.kontakt.email}` : '');
  return text && odkaz ? { text, odkaz } : null;
};

/** Zabráni posúvaniu stránky pod otvoreným panelom. */
const useZamknutyPosun = (zamknuty: boolean) => {
  useEffect(() => {
    if (!zamknuty) return;
    document.body.classList.add('pz-bez-posunu');
    return () => document.body.classList.remove('pz-bez-posunu');
  }, [zamknuty]);
};

const jeSeniorska = (k?: string | null) => ['seniori', 'muzi'].includes((k || 'seniori').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());

/** Tímy zoradené podľa poradia a hlavný tím (A tím mužov, inak prvý). */
export const useHlavnyTim = () => {
  const timy = useApi<Tim[]>('/teams');
  const zoradene = useMemo(() => [...(timy.data ?? [])].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id), [timy.data]);
  const hlavny = zoradene.find((t) => t.typ === 'muzi' && jeSeniorska(t.vekova_kategoria)) ?? zoradene[0] ?? null;
  return { timy: zoradene, hlavny, nacitava: timy.nacitava };
};

export const podlaCasu = (a: Zapas, b: Zapas) => a.datum_cas.localeCompare(b.datum_cas);

// ===== Rozloženie =====

export const Rozlozenie: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const u = useUpravy();
  const jeUvod = pathname === '/';

  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  const pismo = typeof u.s.pismo === 'string' && u.s.pismo ? ` pz--pismo-${u.s.pismo}` : '';
  const rohy = typeof u.s.zaoblenie === 'string' && u.s.zaoblenie ? ` pz--rohy-${u.s.zaoblenie}` : '';

  return (
    <div className={`pz${jeUvod ? ' pz--uvod' : ''}${pismo}${rohy}`}>
      <a href="#pz-obsah" className="pz-preskocit">
        Preskočiť na obsah
      </a>
      <Cast nazov="Hlavicka" />
      <main id="pz-obsah" className="pz-obsah">
        {children}
      </main>
      <Cast nazov="Paticka" />
    </div>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="pz-nacitava" role="status">
    <span aria-hidden="true" />
    Načítavam…
  </div>
);

// ===== Erb =====

const ZnakKlubu: React.FC = () => {
  const { nastavenia } = useNastavenia();
  return nastavenia.logo ? <img src={souborUrl(nastavenia.logo)} alt="" /> : <span className="pz-logo__znak">{(nastavenia.skratka || nastavenia.nazov).slice(0, 3)}</span>;
};

const Logo: React.FC<{ className?: string; onClick?: () => void }> = ({ className = 'pz-logo', onClick }) => {
  const { nastavenia } = useNastavenia();
  return (
    <Link to="/" className={className} aria-label={`${nastavenia.nazov} - úvodná stránka`} onClick={onClick}>
      <ZnakKlubu />
    </Link>
  );
};

// ===== Sociálne siete =====

export const SIETE = [
  { kluc: 'instagram', nazov: 'Instagram', skratka: 'IG' },
  { kluc: 'facebook', nazov: 'Facebook', skratka: 'FB' },
  { kluc: 'x', nazov: 'X', skratka: 'X' },
  { kluc: 'youtube', nazov: 'YouTube', skratka: 'YT' },
  { kluc: 'tiktok', nazov: 'TikTok', skratka: 'TT' },
] as const;

export const useSiete = () => {
  const { nastavenia } = useNastavenia();
  const siete = (nastavenia.socialne_siete ?? {}) as Record<string, string | null | undefined>;
  return SIETE.filter((s) => Boolean(siete[s.kluc])).map((s) => ({ ...s, url: siete[s.kluc] as string }));
};

/** Ikony sociálnych sietí (zjednodušené znaky, plné tvary 24 × 24). */
const ZNAKY_SIETI: Record<string, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </>
  ),
  facebook: <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21Z" fill="currentColor" />,
  x: <path d="M17.6 3h3l-6.6 7.6L21.8 21h-6.1l-4.8-6.2L5.4 21h-3l7.1-8.1L2 3h6.2l4.3 5.7Zm-1 16.2h1.7L7.5 4.7H5.7Z" fill="currentColor" />,
  youtube: (
    <path
      d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15V9l5.2 3Z"
      fill="currentColor"
    />
  ),
  tiktok: <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3a7 7 0 0 1-3.9-1.2v6.1a5.7 5.7 0 1 1-5.7-5.7l.6.1v3.1a2.6 2.6 0 1 0 2 2.5V3Z" fill="currentColor" />,
};

export const IkonaSiete: React.FC<{ kluc: string; velkost?: number }> = ({ kluc, velkost = 18 }) => (
  <svg width={velkost} height={velkost} viewBox="0 0 24 24" aria-hidden="true">
    {ZNAKY_SIETI[kluc]}
  </svg>
);

export const SocialneSiete: React.FC<{ className?: string; velkost?: number }> = ({ className = 'pz-siete', velkost }) => {
  const siete = useSiete();
  if (siete.length === 0) return null;
  return (
    <div className={className}>
      {siete.map((s) => (
        <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer" className="pz-siete__odkaz" aria-label={s.nazov} title={s.nazov}>
          <IkonaSiete kluc={s.kluc} velkost={velkost} />
        </a>
      ))}
    </div>
  );
};

// ===== Rozbaľovacie menu =====

/** Najnovšie články - položka menu typu „Najnovšie články". */
const ClankyMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void; trieda?: string }> = ({ polozka, zavriet, trieda = 'pz-panel__karta' }) => {
  const pocet = Math.min(6, Math.max(1, Number(polozka.pocet) || 2));
  const rubrika = polozka.rubrika_slug ? `&category=${encodeURIComponent(polozka.rubrika_slug)}` : '';
  const clanky = useApi<Clanok[]>(`/articles?limit=${pocet}${rubrika}`);
  return (
    <>
      {(clanky.data ?? []).map((c) => (
        <Link key={c.id} to={`/clanek/${c.slug}`} className={trieda} onClick={zavriet}>
          <span className="pz-panel__obrazok">{c.obrazok ? <img src={obrazokUrl(c.obrazok) ?? ''} alt="" loading="lazy" /> : null}</span>
          <span className="pz-panel__titulok">{c.nazov}</span>
        </Link>
      ))}
    </>
  );
};

/**
 * Mega menu: vľavo názov sekcie s odkazom, v strede stĺpce odkazov
 * (každá kategória vlastný stĺpec, priame odkazy v prvom) a vpravo
 * obrázkové karty a najnovšie články.
 */
const PanelMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void }> = ({ polozka, zavriet }) => {
  const deti = polozka.deti ?? [];
  const clankove = deti.filter((d) => d.typ === 'clanky');
  const ostatne = deti.filter((d) => d.typ !== 'clanky');
  const kategorie = ostatne.filter((d) => (d.deti?.length ?? 0) > 0);
  const karty = ostatne.filter((d) => !d.deti?.length && d.obrazok && d.odkaz);
  const odkazy = ostatne.filter((d) => !d.deti?.length && !(d.obrazok && d.odkaz));

  return (
    <div className="pz-kontajner pz-panel__vnutro">
      <div className="pz-panel__uvod">
        <span className="pz-stitok">Sekcia</span>
        <strong>{polozka.nazov}</strong>
        {polozka.odkaz && (
          <OdkazMenu polozka={{ ...polozka, deti: [] }} className="pz-panel__prehlad" onClick={zavriet}>
            Prejsť na sekciu
            <Ikona nazov="sipka" velkost={14} />
          </OdkazMenu>
        )}
      </div>
      <div className="pz-panel__stlpce">
        {odkazy.length > 0 && (
          <div className="pz-panel__stlpec">
            {odkazy.map((d) => (
              <OdkazMenu key={d.id} polozka={d} className="pz-panel__odkaz" onClick={zavriet} />
            ))}
          </div>
        )}
        {kategorie.map((k) => (
          <div key={k.id} className="pz-panel__stlpec">
            <OdkazMenu polozka={{ ...k, deti: [] }} className="pz-panel__nadpis" onClick={zavriet} />
            {(k.deti ?? []).map((v) => (
              <OdkazMenu key={v.id} polozka={v} className="pz-panel__odkaz pz-panel__odkaz--maly" onClick={zavriet} />
            ))}
          </div>
        ))}
      </div>
      {(karty.length > 0 || clankove.length > 0) && (
        <div className="pz-panel__karty">
          {karty.slice(0, 3).map((d) => (
            <OdkazMenu key={d.id} polozka={d} className="pz-panel__karta pz-panel__karta--obrazkova" onClick={zavriet}>
              <span className="pz-panel__obrazok">
                <img src={obrazokUrl(d.obrazok) ?? ''} alt="" loading="lazy" />
              </span>
              <span className="pz-panel__titulok">{d.nazov}</span>
            </OdkazMenu>
          ))}
          {clankove.map((c) => (
            <ClankyMenu key={c.id} polozka={c} zavriet={zavriet} />
          ))}
        </div>
      )}
    </div>
  );
};

// ===== Vyhľadávanie =====

const PanelHladania: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const pole = useRef<HTMLInputElement>(null);
  const { vysledky, nacitava, chyba } = useHladanie(text, 4);
  const dotaz = text.trim();

  useEffect(() => {
    window.setTimeout(() => pole.current?.focus(), 40);
  }, []);

  const skupiny = SKUPINY_HLADANIA.map((s) => ({ ...s, polozky: vysledky.filter((v) => v.typ === s.typ) })).filter((s) => s.polozky.length > 0);
  const vsetky = () => {
    zavriet();
    navigate(dotaz ? `/hladat?q=${encodeURIComponent(dotaz)}` : '/hladat');
  };

  return (
    <div className="pz-kontajner pz-hpanel" role="dialog" aria-label="Vyhľadávanie">
      <form
        className="pz-hpanel__pole"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          vsetky();
        }}
      >
        <Ikona nazov="hladat" velkost={22} />
        <input ref={pole} type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hľadať hráča, zápas alebo článok" aria-label="Hľadať na webe" maxLength={100} />
        <button type="submit">Hľadať</button>
      </form>
      {dotaz.length >= 2 && (
        <div className="pz-hpanel__vysledky" aria-live="polite">
          {nacitava && vysledky.length === 0 && <p className="pz-hpanel__stav">Hľadám…</p>}
          {chyba && <p className="pz-hpanel__stav">{chyba}</p>}
          {!nacitava && !chyba && vysledky.length === 0 && <p className="pz-hpanel__stav">Pre „{dotaz}“ sme nič nenašli.</p>}
          {skupiny.map((s) => (
            <div key={s.typ} className="pz-hpanel__skupina">
              <span className="pz-stitok">{s.nazov}</span>
              {s.polozky.map((v) => (
                <Odkaz key={`${v.typ}-${v.id}`} to={v.odkaz} className="pz-hpanel__vysledok" onClick={zavriet}>
                  <span className="pz-hpanel__nahlad">{v.obrazok ? <img src={obrazokUrl(v.obrazok) ?? ''} alt="" loading="lazy" /> : <Ikona nazov="hladat" velkost={14} />}</span>
                  <span>
                    <strong>{v.nazov}</strong>
                    {v.popis && <small>{v.popis}</small>}
                  </span>
                </Odkaz>
              ))}
            </div>
          ))}
          {vysledky.length > 0 && (
            <button type="button" className="pz-hpanel__vsetky" onClick={vsetky}>
              Všetky výsledky <Ikona nazov="sipka" velkost={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ===== Hlavička =====

const KosikHlavicky: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { nastavenia } = useNastavenia();
  const { pocet } = useKosik();
  const u = useUpravy();
  if (!nastavenia.eshop?.zapnuty || !u.zapnute('ukazat_kosik')) return null;
  return (
    <Link to="/kosik" className="pz-ikona-tl" aria-label={pocet ? `Košík, ${pocet} ks` : 'Košík'} onClick={onClick}>
      <Ikona nazov="kosik" velkost={20} />
      {pocet > 0 && <span className="pz-ikona-tl__pocet">{pocet > 99 ? '99+' : pocet}</span>}
    </Link>
  );
};

/** Účet fanúšika (Môj klub) - prihlásenému ukáže iniciály. */
const UcetHlavicky: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const u = useUpravy();
  if (!u.zapnute('ukazat_ucet')) return null;
  return <OdkazUctu className="pz-ikona-tl" onClick={onClick} />;
};

export const Hlavicka: React.FC = () => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const [otvorene, setOtvorene] = useState<PolozkaMenu['id'] | null>(null);
  const [hladanie, setHladanie] = useState(false);
  const [mobilneMenu, setMobilneMenu] = useState(false);
  const [zmensena, setZmensena] = useState(false);
  const hlavicka = useRef<HTMLElement>(null);
  const casovac = useRef<number>();

  // Po odrolovaní sa biely pás zníži a erb zmenší
  useEffect(() => {
    let ramec = 0;
    const kontrola = () => {
      ramec = 0;
      const hore = hlavicka.current?.getBoundingClientRect().top ?? 1;
      setZmensena(window.scrollY > 40 && hore <= 40);
    };
    const pri = () => {
      if (!ramec) ramec = window.requestAnimationFrame(kontrola);
    };
    kontrola();
    window.addEventListener('scroll', pri, { passive: true });
    return () => {
      window.removeEventListener('scroll', pri);
      window.cancelAnimationFrame(ramec);
    };
  }, []);

  useEffect(() => {
    setOtvorene(null);
    setHladanie(false);
    setMobilneMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (otvorene === null && !hladanie) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOtvorene(null);
      setHladanie(false);
    };
    const klik = (e: MouseEvent) => {
      if (hlavicka.current && !hlavicka.current.contains(e.target as Node)) {
        setOtvorene(null);
        setHladanie(false);
      }
    };
    window.addEventListener('keydown', esc);
    document.addEventListener('mousedown', klik);
    return () => {
      window.removeEventListener('keydown', esc);
      document.removeEventListener('mousedown', klik);
    };
  }, [otvorene, hladanie]);

  useEffect(() => () => window.clearTimeout(casovac.current), []);

  const otvor = (id: PolozkaMenu['id']) => {
    window.clearTimeout(casovac.current);
    setHladanie(false);
    setOtvorene(id);
  };
  const zavriSOneskorenim = () => {
    window.clearTimeout(casovac.current);
    casovac.current = window.setTimeout(() => setOtvorene(null), 220);
  };
  const zavri = useCallback(() => setOtvorene(null), []);
  const aktivnaPolozka = polozky.find((p) => p.id === otvorene);
  const prepniHladanie = () => {
    setOtvorene(null);
    setHladanie((h) => !h);
  };

  const odkazMenu = (p: PolozkaMenu) => {
    const maDeti = (p.deti?.length ?? 0) > 0;
    const jeOtvorene = otvorene === p.id;
    const aktivna = jeAktivnaPolozka(p, pathname);
    if (!maDeti) return <OdkazMenu key={p.id} polozka={p} className={`pz-menu__odkaz${aktivna ? ' is-aktivny' : ''}`} />;
    return (
      <button
        key={p.id}
        type="button"
        className={`pz-menu__odkaz${jeOtvorene ? ' is-otvoreny' : ''}${aktivna ? ' is-aktivny' : ''}`}
        aria-expanded={jeOtvorene}
        onMouseEnter={() => otvor(p.id)}
        onClick={() => (jeOtvorene ? setOtvorene(null) : otvor(p.id))}
      >
        {p.nazov}
        <Ikona nazov="dole" velkost={10} className="pz-menu__sipka" />
      </button>
    );
  };

  return (
    <>
      <header ref={hlavicka} className={`pz-ostrov${zmensena ? ' is-zmensena' : ''}${otvorene !== null || hladanie ? ' is-otvorena' : ''}`}>
        <div className="pz-ostrov__vnutro" onMouseLeave={zavriSOneskorenim}>
          <Link to="/" className="pz-ostrov__klub" aria-label={`${nastavenia.nazov} - úvodná stránka`}>
            <span className="pz-ostrov__erb">
              <ZnakKlubu />
            </span>
            {u.zapnute('ukazat_nazov') && <strong>{nastavenia.skratka || nastavenia.nazov}</strong>}
          </Link>
          <nav className="pz-menu" aria-label="Hlavné menu">
            {polozky.map(odkazMenu)}
          </nav>
          <div className="pz-ostrov__nastroje">
            {u.zapnute('ukazat_hladanie') && (
              <button type="button" className={`pz-ikona-tl${hladanie ? ' is-aktivne' : ''}`} onClick={prepniHladanie} aria-label="Hľadať" aria-expanded={hladanie}>
                <Ikona nazov={hladanie ? 'zavriet' : 'hladat'} velkost={18} />
              </button>
            )}
            <KosikHlavicky />
            <UcetHlavicky />
            {jePrihlaseny() && u.zapnute('ukazat_admin') && (
              <a href="/admin" className="pz-ostrov__admin">
                Admin
              </a>
            )}
            {tlacidlo && (
              <Odkaz to={tlacidlo.odkaz} className="pz-tlacidlo pz-tlacidlo--akcent pz-ostrov__cta">
                {tlacidlo.text}
              </Odkaz>
            )}
            <button type="button" className="pz-ostrov__hamburger" onClick={() => setMobilneMenu(true)} aria-label="Otvoriť menu" aria-expanded={mobilneMenu}>
              <span />
              <span />
            </button>
          </div>
        </div>
        {aktivnaPolozka && (
          <div className="pz-panel" onMouseEnter={() => window.clearTimeout(casovac.current)} onMouseLeave={zavriSOneskorenim}>
            <PanelMenu polozka={aktivnaPolozka} zavriet={zavri} />
          </div>
        )}
        {hladanie && (
          <div className="pz-panel pz-panel--hladanie">
            <PanelHladania zavriet={() => setHladanie(false)} />
          </div>
        )}
      </header>
      {mobilneMenu && <MobilneMenu zavriet={() => setMobilneMenu(false)} />}
    </>
  );
};

// ===== Mobilné menu (vysúvané sprava) =====

const MobilneMenu: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const [rozbalene, setRozbalene] = useState<PolozkaMenu['id'] | null>(
    () => polozky.find((p) => (p.deti ?? []).some((d) => jeAktivnaPolozka(d, pathname)))?.id ?? null
  );
  const [text, setText] = useState('');
  useZamknutyPosun(true);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && zavriet();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [zavriet]);

  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null };

  return (
    <div className="pz-mmenu" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" className="pz-mmenu__pozadie" onClick={zavriet} aria-label="Zavrieť menu" tabIndex={-1} />
      <div className="pz-mmenu__panel">
        <div className="pz-mmenu__hlava">
          <Logo onClick={zavriet} />
          <strong>{nastavenia.nazov}</strong>
          <button type="button" className="pz-ikona-tl" onClick={zavriet} aria-label="Zavrieť menu">
            <Ikona nazov="zavriet" velkost={22} />
          </button>
        </div>

        {u.zapnute('ukazat_hladanie') && (
          <form
            className="pz-mmenu__hladanie"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              zavriet();
              navigate(`/hladat${text.trim() ? `?q=${encodeURIComponent(text.trim())}` : ''}`);
            }}
          >
            <Ikona nazov="hladat" velkost={18} />
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hľadať na webe" aria-label="Hľadať na webe" />
          </form>
        )}

        <ul className="pz-mmenu__zoznam">
          {polozky.map((p) => {
            const deti = (p.deti ?? []).filter((d) => d.typ !== 'clanky');
            const clankove = (p.deti ?? []).filter((d) => d.typ === 'clanky');
            const maPodmenu = deti.length > 0 || clankove.length > 0;
            const jeRozbalene = rozbalene === p.id;
            const aktivna = jeAktivnaPolozka(p, pathname);
            return (
              <li key={p.id} className={`pz-mmenu__polozka${jeRozbalene ? ' is-rozbalene' : ''}${aktivna ? ' is-aktivna' : ''}`}>
                {maPodmenu ? (
                  <>
                    <button type="button" className="pz-mmenu__odkaz" aria-expanded={jeRozbalene} onClick={() => setRozbalene(jeRozbalene ? null : p.id)}>
                      <span>{p.nazov}</span>
                      <Ikona nazov="dole" velkost={14} className="pz-mmenu__sipka" />
                    </button>
                    {jeRozbalene && (
                      <div className="pz-mmenu__podmenu">
                        {p.odkaz && (
                          <OdkazMenu polozka={{ ...p, deti: [] }} onClick={zavriet} className="pz-mmenu__pododkaz pz-mmenu__pododkaz--hlavny">
                            Prejsť na sekciu
                          </OdkazMenu>
                        )}
                        {deti.filter((d) => !(!d.deti?.length && d.obrazok && d.odkaz)).map((d) =>
                          d.deti?.length ? (
                            <div key={d.id} className="pz-mmenu__skupina">
                              <OdkazMenu polozka={{ ...d, deti: [] }} onClick={zavriet} className="pz-mmenu__kategoria" />
                              {d.deti.map((v) => (
                                <OdkazMenu key={v.id} polozka={v} onClick={zavriet} className={`pz-mmenu__pododkaz${jeAktivny(v.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                              ))}
                            </div>
                          ) : (
                            <OdkazMenu key={d.id} polozka={d} onClick={zavriet} className={`pz-mmenu__pododkaz${jeAktivny(d.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                          )
                        )}
                        {/* Odkazy s fotkou ako karty - rovnako ako v rozbaľovacom menu na počítači */}
                        {deti.some((d) => !d.deti?.length && d.obrazok && d.odkaz) && (
                          <div className="pz-mmenu__karty">
                            {deti
                              .filter((d) => !d.deti?.length && d.obrazok && d.odkaz)
                              .map((d) => (
                                <OdkazMenu key={d.id} polozka={d} onClick={zavriet} className="pz-mmenu__karta">
                                  <span className="pz-mmenu__karta-obrazok">
                                    <img src={obrazokUrl(d.obrazok) ?? ''} alt="" loading="lazy" />
                                  </span>
                                  <span className="pz-mmenu__karta-nazov">{d.nazov}</span>
                                </OdkazMenu>
                              ))}
                          </div>
                        )}
                        {clankove.length > 0 && (
                          <div className="pz-mmenu__clanky">
                            {clankove.map((c) => (
                              <ClankyMenu key={c.id} polozka={c} zavriet={zavriet} trieda="pz-mmenu__clanok" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <OdkazMenu polozka={p} onClick={zavriet} className="pz-mmenu__odkaz">
                    <span>{p.nazov}</span>
                  </OdkazMenu>
                )}
              </li>
            );
          })}
        </ul>

        <div className="pz-mmenu__spodok">
          {tlacidlo && (
            <Odkaz to={tlacidlo.odkaz} className="pz-tlacidlo pz-tlacidlo--akcent pz-mmenu__cta" onClick={zavriet}>
              {tlacidlo.text}
            </Odkaz>
          )}
          {(kontakt.telefon || kontakt.email) && (
            <div className="pz-mmenu__kontakt">
              {kontakt.telefon && <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>{kontakt.telefon}</a>}
              {kontakt.email && <a href={`mailto:${kontakt.email}`}>{kontakt.email}</a>}
            </div>
          )}
          <SocialneSiete />
          {jePrihlaseny() && u.zapnute('ukazat_admin') && (
            <a href="/admin" className="pz-mmenu__admin">
              Administrácia
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== Partneri nad pätičkou =====

/** Partneri ako pyramída podľa úrovní partnerstva - na každej stránke okrem nákupu. */
const PartneriPaticky: React.FC = () => {
  const u = useUpravy();
  const { pathname } = useLocation();
  const zapnute = u.zapnute('ukazat_partnerov') && !['/sponzori', '/kosik', '/pokladna', '/objednavka'].some((c) => pathname.startsWith(c));
  const partneri = useApi<Partner[]>(zapnute ? '/sponsors?limit=500' : null);
  const zoznam = partneri.data ?? [];
  if (!zapnute || zoznam.length === 0) return null;
  return (
    <section className="pz-ppartneri" aria-labelledby="pz-ppartneri-nadpis">
      <div className="pz-kontajner">
        <div className="pz-ppartneri__hlava">
          <span aria-hidden="true" />
          <h2 id="pz-ppartneri-nadpis">{u.text('partneri_nadpis', 'Partneri klubu')}</h2>
          <span aria-hidden="true" />
        </div>
        <RadyPartnerov partneri={zoznam} />
        <Link to="/sponzori" className="pz-ppartneri__vsetci">
          {u.text('text_vsetci_partneri', 'Všetci partneri')}
          <Ikona nazov="sipka" velkost={14} />
        </Link>
      </div>
    </section>
  );
};

// ===== Pätička =====

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  const { polozky } = useMenuWebu();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const gdpr = nastavenia.gdpr ?? {};
  const text = String(u.s.paticka_text || '').trim() || nastavenia.slogan || nastavenia.meta_popis;
  const rok = new Date().getFullYear();
  const zalozeny = u.text('paticka_zalozeny', '');
  const sekcie = polozky.filter((p) => (p.deti ?? []).some((d) => d.odkaz && d.typ !== 'clanky')).slice(0, 3);
  const samostatne = polozky.filter((p) => p.odkaz && !sekcie.includes(p)).slice(0, 7);

  return (
    <footer className="pz-paticka">
      <PartneriPaticky />
      <div className="pz-paticka__panel">
        <div className="pz-paticka__hore">
          <div className="pz-paticka__klub">
            <Logo className="pz-logo pz-paticka__logo" />
            {text && <p>{text}</p>}
            {u.zapnute('ukazat_siete_paticka') && <SocialneSiete />}
          </div>
          <div className="pz-paticka__stlpce">
            {samostatne.length > 0 && (
              <nav className="pz-paticka__stlpec" aria-label="Odkazy v pätičke">
                <h3>{u.text('paticka_menu', 'Klub')}</h3>
                {samostatne.map((p) => (
                  <OdkazMenu key={p.id} polozka={{ ...p, deti: [] }} className="pz-paticka__odkaz" />
                ))}
              </nav>
            )}
            {sekcie.map((p) => (
              <nav key={p.id} className="pz-paticka__stlpec" aria-label={p.nazov}>
                <h3>{p.nazov}</h3>
                {(p.deti ?? [])
                  .filter((d) => d.odkaz && d.typ !== 'clanky')
                  .slice(0, 6)
                  .map((d) => (
                    <OdkazMenu key={d.id} polozka={{ ...d, deti: [] }} className="pz-paticka__odkaz" />
                  ))}
              </nav>
            ))}
            <div className="pz-paticka__stlpec">
              <h3>{u.text('paticka_kontakt', 'Kontakt')}</h3>
              {kontakt.adresa && <span className="pz-paticka__adresa">{kontakt.adresa}</span>}
              {kontakt.telefon && (
                <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`} className="pz-paticka__odkaz">
                  {kontakt.telefon}
                </a>
              )}
              {kontakt.email && (
                <a href={`mailto:${kontakt.email}`} className="pz-paticka__odkaz">
                  {kontakt.email}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="pz-paticka__obri" aria-hidden="true">
          {nastavenia.skratka || nastavenia.nazov}
          {zalozeny && <small>{zalozeny}</small>}
        </div>
        <div className="pz-paticka__spodok">
          <span>
            © {rok} {nastavenia.nazov}. {u.text('paticka_copyright', 'Všetky práva vyhradené.')}
          </span>
          <span className="pz-paticka__pravne">
            {gdpr.odkaz_zasad && <Odkaz to={gdpr.odkaz_zasad}>Ochrana osobných údajov</Odkaz>}
            <button type="button" onClick={otvorNastaveniaCookies}>
              Nastavenia cookies
            </button>
            {jePrihlaseny() && u.zapnute('ukazat_admin') && <a href="/admin">Administrácia</a>}
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Na začiatok ↑
            </button>
          </span>
        </div>
      </div>
    </footer>
  );
};
