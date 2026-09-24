// Umiestnenie: sablony/moderna/src/Rozlozenie.tsx
// Kostra šablóny Moderná: hlavička s menu a vyhľadávaním, pätička
// a na mobile spodná navigácia ako v športovej aplikácii.
//
// Na úvodnej stránke je hlavička priehľadná nad tmavým úvodom a po
// posunutí stránky sa zmení na svetlý „sklenený" pás.

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Cast,
  OdkazMenu,
  apiUrl,
  jePrihlaseny,
  otvorNastaveniaCookies,
  souborUrl,
  useMenuWebu,
  useNastavenia,
  type PolozkaMenu,
} from '@clubw/jadro';
import { Erb, Ikona, datumKratky, pozicia, type Clanok, type Hrac, type Tim, type Zapas } from './spolocne';

// ===== Rozloženie =====

export const Rozlozenie: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const jeUvod = pathname === '/';

  // Nová stránka začína navrchu (odkazy v aplikácii inak ostanú dole)
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`md${jeUvod ? ' md--uvod' : ''}`}>
      <a href="#md-obsah" className="md-preskocit">
        Preskočiť na obsah
      </a>
      <Cast nazov="Hlavicka" />
      <main id="md-obsah" className="md-obsah">
        {children}
      </main>
      <Cast nazov="Paticka" />
      <MobilnaNavigacia />
    </div>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="md-stav md-stav--stranka" role="status">
    <span className="md-stav__kruh" aria-hidden="true" />
    Načítavam…
  </div>
);

// ===== Logo klubu =====

const Logo: React.FC = () => {
  const { nastavenia } = useNastavenia();
  return (
    <Link to="/" className="md-logo" aria-label={`${nastavenia.nazov} - úvodná stránka`}>
      {nastavenia.logo ? (
        <img src={souborUrl(nastavenia.logo)} alt="" className="md-logo__erb" />
      ) : (
        <Erb nazov={nastavenia.skratka || nastavenia.nazov} velkost="sm" klub />
      )}
      <span className="md-logo__text">
        <strong>{nastavenia.nazov}</strong>
        {nastavenia.rok_zalozenia && <small>Od roku {nastavenia.rok_zalozenia}</small>}
      </span>
    </Link>
  );
};

/** Je odkaz menu aktívny pre aktuálnu adresu? */
const jeAktivny = (odkaz: string | null, pathname: string) => {
  if (!odkaz || !odkaz.startsWith('/')) return false;
  if (odkaz === '/') return pathname === '/';
  return pathname === odkaz || pathname.startsWith(`${odkaz}/`);
};

// ===== Hlavička =====

export const Hlavicka: React.FC = () => {
  const { polozky } = useMenuWebu();
  const { pathname } = useLocation();
  const [posunute, setPosunute] = useState(false);
  const [hladanie, setHladanie] = useState(false);
  const jeUvod = pathname === '/';

  useEffect(() => {
    const zmena = () => setPosunute(window.scrollY > 24);
    zmena();
    window.addEventListener('scroll', zmena, { passive: true });
    return () => window.removeEventListener('scroll', zmena);
  }, []);

  // Ctrl+K / Cmd+K otvorí vyhľadávanie, ako v aplikáciách
  useEffect(() => {
    const klaves = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setHladanie(true);
      }
    };
    window.addEventListener('keydown', klaves);
    return () => window.removeEventListener('keydown', klaves);
  }, []);

  useEffect(() => setHladanie(false), [pathname]);

  // Nad tmavým úvodom a tmavou hlavičkou detailu tímu či zápasu je lišta priehľadná
  const tmavyZaciatok = jeUvod || /^\/(teams|matches)\/[^/]+\/?$/.test(pathname);
  const priehladna = tmavyZaciatok && !posunute;

  return (
    <>
      <header className={`md-hlavicka${priehladna ? ' md-hlavicka--priehladna' : ''}${posunute ? ' is-posunuta' : ''}`}>
        <div className="md-hlavicka__vnutro md-kontajner">
          <Logo />
          <nav className="md-menu" aria-label="Hlavné menu">
            {polozky.map((p) => (
              <div key={p.id} className="md-menu__polozka">
                <OdkazMenu polozka={p} className={`md-menu__odkaz${jeAktivny(p.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                {(p.deti?.length ?? 0) > 0 && (
                  <div className="md-menu__podmenu">
                    {p.deti!.map((d) => (
                      <OdkazMenu key={d.id} polozka={d} className="md-menu__pododkaz" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="md-hlavicka__akcie">
            <button type="button" className="md-ikona-tlacidlo" onClick={() => setHladanie(true)} aria-label="Hľadať (Ctrl+K)">
              <Ikona nazov="hladat" velkost={20} />
            </button>
            {jePrihlaseny() && (
              <a href="/admin" className="md-hlavicka__admin">
                Administrácia
              </a>
            )}
          </div>
        </div>
      </header>
      {hladanie && <Hladanie zavriet={() => setHladanie(false)} />}
    </>
  );
};

// ===== Vyhľadávanie =====

interface Vysledky {
  clanky: Clanok[];
  hraci: Hrac[];
  zapasy: Zapas[];
  timy: Tim[];
  stranky: Array<{ id: number; nazov: string; slug: string }>;
}

const nacitajJson = async <T,>(cesta: string, signal: AbortSignal): Promise<T[]> => {
  try {
    const r = await fetch(apiUrl(cesta), { signal });
    const telo = await r.json();
    return telo?.success && Array.isArray(telo.data) ? telo.data : [];
  } catch {
    return [];
  }
};

const bezDiakritiky = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Hladanie: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const [dotaz, setDotaz] = useState('');
  const [vysledky, setVysledky] = useState<Vysledky | null>(null);
  const [hlada, setHlada] = useState(false);
  const pole = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    pole.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && zavriet();
    window.addEventListener('keydown', esc);
    document.body.classList.add('md-bez-posunu');
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.classList.remove('md-bez-posunu');
    };
  }, [zavriet]);

  useEffect(() => {
    const text = dotaz.trim();
    if (text.length < 2) {
      setVysledky(null);
      return;
    }
    const ovladac = new AbortController();
    const casovac = setTimeout(async () => {
      setHlada(true);
      const q = encodeURIComponent(text);
      const [clanky, hraci, zapasy, timy, stranky] = await Promise.all([
        nacitajJson<Clanok>(`/articles?search=${q}&limit=5`, ovladac.signal),
        nacitajJson<Hrac>(`/players?search=${q}&limit=6`, ovladac.signal),
        nacitajJson<Zapas>(`/matches?search=${q}&limit=5`, ovladac.signal),
        nacitajJson<Tim>('/teams', ovladac.signal),
        nacitajJson<{ id: number; nazov: string; slug: string }>('/pages/menu', ovladac.signal),
      ]);
      if (ovladac.signal.aborted) return;
      const hladane = bezDiakritiky(text);
      setVysledky({
        clanky,
        hraci: hraci.slice(0, 6),
        zapasy,
        timy: timy.filter((t) => bezDiakritiky(`${t.nazov} ${t.vekova_kategoria ?? ''}`).includes(hladane)).slice(0, 4),
        stranky: stranky.filter((s) => bezDiakritiky(s.nazov).includes(hladane)).slice(0, 4),
      });
      setHlada(false);
    }, 250);
    return () => {
      clearTimeout(casovac);
      ovladac.abort();
    };
  }, [dotaz]);

  const pocet = vysledky
    ? vysledky.clanky.length + vysledky.hraci.length + vysledky.zapasy.length + vysledky.timy.length + vysledky.stranky.length
    : 0;

  const prejdi = (adresa: string) => {
    zavriet();
    navigate(adresa);
  };

  return (
    <div className="md-hladanie" role="dialog" aria-modal="true" aria-label="Vyhľadávanie" onMouseDown={(e) => e.target === e.currentTarget && zavriet()}>
      <div className="md-hladanie__okno">
        <div className="md-hladanie__pole">
          <Ikona nazov="hladat" velkost={20} />
          <input
            ref={pole}
            type="search"
            value={dotaz}
            onChange={(e) => setDotaz(e.target.value)}
            placeholder="Hľadať správy, hráčov, zápasy…"
            aria-label="Hľadaný výraz"
          />
          <button type="button" className="md-ikona-tlacidlo" onClick={zavriet} aria-label="Zavrieť vyhľadávanie">
            <Ikona nazov="zavriet" velkost={20} />
          </button>
        </div>

        <div className="md-hladanie__vysledky" aria-live="polite">
          {dotaz.trim().length < 2 ? (
            <p className="md-hladanie__tip">Zadajte aspoň dva znaky. Vyhľadávanie otvoríte kedykoľvek skratkou Ctrl+K.</p>
          ) : hlada && !vysledky ? (
            <p className="md-hladanie__tip">Hľadám…</p>
          ) : pocet === 0 ? (
            <p className="md-hladanie__tip">Pre „{dotaz.trim()}" sme nič nenašli.</p>
          ) : (
            vysledky && (
              <>
                {vysledky.hraci.length > 0 && (
                  <SkupinaVysledkov nazov="Hráči">
                    {vysledky.hraci.map((h) => (
                      <button key={h.id} type="button" onClick={() => prejdi(`/players/${h.id}`)}>
                        <span className="md-hladanie__cislo">{h.cislo_dresu ?? '–'}</span>
                        <span>
                          <strong>
                            {h.meno} {h.priezvisko}
                          </strong>
                          <small>{pozicia(h.pozicia)}</small>
                        </span>
                      </button>
                    ))}
                  </SkupinaVysledkov>
                )}
                {vysledky.clanky.length > 0 && (
                  <SkupinaVysledkov nazov="Správy">
                    {vysledky.clanky.map((c) => (
                      <button key={c.id} type="button" onClick={() => prejdi(`/clanek/${c.slug}`)}>
                        <Ikona nazov="spravy" />
                        <span>
                          <strong>{c.nazov}</strong>
                          <small>{datumKratky(c.publikovany_datum || c.vytvoreny)}</small>
                        </span>
                      </button>
                    ))}
                  </SkupinaVysledkov>
                )}
                {vysledky.zapasy.length > 0 && (
                  <SkupinaVysledkov nazov="Zápasy">
                    {vysledky.zapasy.map((z) => (
                      <button key={z.id} type="button" onClick={() => prejdi(`/matches/${z.id}`)}>
                        <Ikona nazov="zapasy" />
                        <span>
                          <strong>
                            {z.domaci_tim_nazov} – {z.hostujuci_tim_nazov}
                            {z.goly_domaci !== null && z.goly_hostia !== null ? ` ${z.goly_domaci}:${z.goly_hostia}` : ''}
                          </strong>
                          <small>{datumKratky(z.datum_cas)}</small>
                        </span>
                      </button>
                    ))}
                  </SkupinaVysledkov>
                )}
                {vysledky.timy.length > 0 && (
                  <SkupinaVysledkov nazov="Tímy">
                    {vysledky.timy.map((t) => (
                      <button key={t.id} type="button" onClick={() => prejdi(`/teams/${t.id}`)}>
                        <Ikona nazov="timy" />
                        <span>
                          <strong>{t.nazov}</strong>
                          <small>{t.vekova_kategoria}</small>
                        </span>
                      </button>
                    ))}
                  </SkupinaVysledkov>
                )}
                {vysledky.stranky.length > 0 && (
                  <SkupinaVysledkov nazov="Stránky">
                    {vysledky.stranky.map((s) => (
                      <button key={s.id} type="button" onClick={() => prejdi(`/${s.slug}`)}>
                        <Ikona nazov="dokument" />
                        <span>
                          <strong>{s.nazov}</strong>
                        </span>
                      </button>
                    ))}
                  </SkupinaVysledkov>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const SkupinaVysledkov: React.FC<{ nazov: string; children: ReactNode }> = ({ nazov, children }) => (
  <section className="md-hladanie__skupina">
    <h3>{nazov}</h3>
    <div className="md-hladanie__polozky">{children}</div>
  </section>
);

// ===== Mobilná navigácia =====

const MobilnaNavigacia: React.FC = () => {
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);

  useEffect(() => setMenu(false), [pathname]);

  const polozky: Array<{ odkaz: string; nazov: string; ikona: string }> = [
    { odkaz: '/', nazov: 'Domov', ikona: 'domov' },
    { odkaz: '/clanky', nazov: 'Správy', ikona: 'spravy' },
    { odkaz: '/matches', nazov: 'Zápasy', ikona: 'zapasy' },
    { odkaz: '/teams', nazov: 'Tímy', ikona: 'timy' },
  ];
  const aktivna = (odkaz: string) =>
    odkaz === '/' ? pathname === '/' : pathname.startsWith(odkaz) || (odkaz === '/clanky' && pathname.startsWith('/clanek'));

  return (
    <>
      <nav className="md-spodna-nav" aria-label="Rýchla navigácia">
        {polozky.map((p) => (
          <Link key={p.odkaz} to={p.odkaz} className={aktivna(p.odkaz) && !menu ? 'is-aktivna' : ''} aria-current={aktivna(p.odkaz) ? 'page' : undefined}>
            <Ikona nazov={p.ikona} velkost={22} />
            <span>{p.nazov}</span>
          </Link>
        ))}
        <button type="button" className={menu ? 'is-aktivna' : ''} onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="md-mobilne-menu">
          <Ikona nazov={menu ? 'zavriet' : 'menu'} velkost={22} />
          <span>Menu</span>
        </button>
      </nav>
      {menu && <MobilneMenu zavriet={() => setMenu(false)} />}
    </>
  );
};

const MobilneMenu: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();

  useEffect(() => {
    document.body.classList.add('md-bez-posunu');
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && zavriet();
    window.addEventListener('keydown', esc);
    return () => {
      document.body.classList.remove('md-bez-posunu');
      window.removeEventListener('keydown', esc);
    };
  }, [zavriet]);

  const vykresli = (p: PolozkaMenu, dieta = false) => (
    <li key={p.id}>
      <OdkazMenu
        polozka={p}
        onClick={zavriet}
        className={`md-mobilne-menu__odkaz${dieta ? ' md-mobilne-menu__odkaz--dieta' : ''}${jeAktivny(p.odkaz, pathname) ? ' is-aktivny' : ''}`}
      >
        <span>{p.nazov}</span>
        {!dieta && <Ikona nazov="vpravo" />}
      </OdkazMenu>
      {(p.deti?.length ?? 0) > 0 && <ul>{p.deti!.map((d) => vykresli(d, true))}</ul>}
    </li>
  );

  return (
    <div className="md-mobilne-menu" id="md-mobilne-menu" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="md-mobilne-menu__hlava">
        <Logo />
      </div>
      <ul className="md-mobilne-menu__zoznam">{polozky.map((p) => vykresli(p))}</ul>
      <div className="md-mobilne-menu__spodok">
        <Siete />
        {jePrihlaseny() && (
          <a href="/admin" className="md-tlacidlo md-tlacidlo--sekundarne">
            Administrácia
          </a>
        )}
        <small>{nastavenia.nazov}</small>
      </div>
    </div>
  );
};

// ===== Pätička =====

const Siete: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const siete = Object.entries({
    Facebook: nastavenia.socialne_siete?.facebook,
    Instagram: nastavenia.socialne_siete?.instagram,
    YouTube: nastavenia.socialne_siete?.youtube,
    X: nastavenia.socialne_siete?.x,
    TikTok: nastavenia.socialne_siete?.tiktok,
  }).filter(([, url]) => Boolean(url)) as Array<[string, string]>;
  if (siete.length === 0) return null;
  return (
    <div className="md-siete">
      {siete.map(([nazov, url]) => (
        <a key={nazov} href={url} target="_blank" rel="noopener noreferrer">
          {nazov}
          <Ikona nazov="sipka_hore" velkost={14} />
        </a>
      ))}
    </div>
  );
};

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { polozky } = useMenuWebu();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const udaje = nastavenia.udaje;
  const gdpr = nastavenia.gdpr ?? {};

  return (
    <footer className="md-paticka">
      <div className="md-kontajner">
        <div className="md-paticka__stlpce">
          <div className="md-paticka__klub">
            <div className="md-paticka__logo">
              {nastavenia.logo ? (
                <img src={souborUrl(nastavenia.logo)} alt="" />
              ) : (
                <Erb nazov={nastavenia.skratka || nastavenia.nazov} velkost="md" klub />
              )}
              <strong>{nastavenia.nazov}</strong>
            </div>
            {(nastavenia.slogan || nastavenia.meta_popis) && <p>{nastavenia.slogan || nastavenia.meta_popis}</p>}
            <Siete />
          </div>

          {polozky.length > 0 && (
            <div>
              <h2>Klub</h2>
              <ul className="md-paticka__odkazy">
                {polozky.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <OdkazMenu polozka={p} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2>Rýchle odkazy</h2>
            <ul className="md-paticka__odkazy">
              <li>
                <Link to="/matches">Zápasy a výsledky</Link>
              </li>
              <li>
                <Link to="/leagues">Tabuľky</Link>
              </li>
              <li>
                <Link to="/galleries">Fotogalérie</Link>
              </li>
              <li>
                <Link to="/videa">Videá</Link>
              </li>
              <li>
                <Link to="/dokumenty">Dokumenty</Link>
              </li>
              <li>
                <Link to="/sponzori">Partneri</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Kontakt</h2>
            <ul className="md-paticka__kontakt">
              {kontakt.adresa && (
                <li>
                  <Ikona nazov="miesto" velkost={16} />
                  <span>{kontakt.adresa}</span>
                </li>
              )}
              {kontakt.email && (
                <li>
                  <Ikona nazov="mail" velkost={16} />
                  <a href={`mailto:${kontakt.email}`}>{kontakt.email}</a>
                </li>
              )}
              {kontakt.telefon && (
                <li>
                  <Ikona nazov="telefon" velkost={16} />
                  <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>{kontakt.telefon}</a>
                </li>
              )}
            </ul>
            {(udaje?.pravny_nazov || udaje?.ico || udaje?.iban) && (
              <p className="md-paticka__udaje">
                {[
                  udaje?.pravny_nazov,
                  udaje?.ico && `IČO ${udaje.ico}`,
                  udaje?.dic && `DIČ ${udaje.dic}`,
                  udaje?.ic_dph && `IČ DPH ${udaje.ic_dph}`,
                  udaje?.iban && `IBAN ${udaje.iban.replace(/(.{4})/g, '$1 ').trim()}`,
                ]
                  .filter(Boolean)
                  .map((riadok) => (
                    <span key={riadok as string}>{riadok}</span>
                  ))}
              </p>
            )}
          </div>
        </div>

        <div className="md-paticka__spodok">
          <span>
            © {new Date().getFullYear()} {nastavenia.nazov}
          </span>
          <div className="md-paticka__pravne">
            {gdpr.odkaz_zasad && <a href={gdpr.odkaz_zasad}>Ochrana osobných údajov</a>}
            {gdpr.kontakt_zodpovednej_osoby && <span>Zodpovedná osoba: {gdpr.kontakt_zodpovednej_osoby}</span>}
            <button type="button" onClick={otvorNastaveniaCookies}>
              Nastavenia cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
