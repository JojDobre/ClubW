// Umiestnenie: sablony/kronika/src/Rozlozenie.tsx
// Kostra šablóny Kronika - editoriálny štýl športového magazínu.
//
// Hlavička je ako titulka novín: tenká horná lišta s dátumom, veľký
// „masthead" s logom a názvom klubu v serifovom písme a pod ním riadok
// navigácie medzi linkami. Navigácia sa pri posúvaní prilepí k hornému
// okraju a ukáže malé logo. Rozbaľovacie menu je panel so stĺpcami
// oddelenými linkami. Na mobile je klasické menu cez celú obrazovku.

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
} from '@clubw/jadro';
import { Ikona, Odkaz, denVTyzdni, datum, obrazokUrl, useApi, useUpravy, type Clanok } from './spolocne';
import { PartneriStranky } from './casti';

const jeAktivny = (odkaz: string | null, pathname: string) => {
  if (!odkaz || !odkaz.startsWith('/')) return false;
  if (odkaz === '/') return pathname === '/';
  return pathname === odkaz || pathname.startsWith(`${odkaz}/`);
};

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
    document.body.classList.add('kr-bez-posunu');
    return () => document.body.classList.remove('kr-bez-posunu');
  }, [zamknuty]);
};

/** „piatok 2. októbra 2026" - dnešný dátum do hornej lišty. */
const MESIACE_GEN = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const dnesnyDatum = () => {
  const d = new Date();
  return `${denVTyzdni(d.toISOString())} ${d.getDate()}. ${MESIACE_GEN[d.getMonth()]} ${d.getFullYear()}`;
};

// ===== Rozloženie =====

/** Stránky bez pásu partnerov (nákup má zostať prehľadný). */
const BEZ_PARTNEROV = ['/sponzori', '/kosik', '/pokladna', '/objednavka'];

export const Rozlozenie: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const u = useUpravy();
  const jeUvod = pathname === '/';

  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  const pismo = typeof u.s.pismo === 'string' && u.s.pismo ? ` kr--pismo-${u.s.pismo}` : '';

  return (
    <div className={`kr${jeUvod ? ' kr--uvod' : ''}${pismo}`}>
      <a href="#kr-obsah" className="kr-preskocit">
        Preskočiť na obsah
      </a>
      <Cast nazov="Hlavicka" />
      <main id="kr-obsah" className="kr-obsah">
        {children}
        {!jeUvod && !BEZ_PARTNEROV.some((c) => pathname.startsWith(c)) && <PartneriStranky />}
      </main>
      <Cast nazov="Paticka" />
    </div>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="kr-nacitava" role="status">
    <span aria-hidden="true" />
    Načítavam…
  </div>
);

// ===== Logo =====

const Logo: React.FC<{ className?: string; onClick?: () => void }> = ({ className = 'kr-logo', onClick }) => {
  const { nastavenia } = useNastavenia();
  return (
    <Link to="/" className={className} aria-label={`${nastavenia.nazov} - úvodná stránka`} onClick={onClick}>
      {nastavenia.logo ? (
        <img src={souborUrl(nastavenia.logo)} alt="" />
      ) : (
        <span className="kr-logo__znak">{(nastavenia.skratka || nastavenia.nazov).slice(0, 3)}</span>
      )}
    </Link>
  );
};

// ===== Rozbaľovacie menu =====

/** Najnovšie články - položka menu typu „Najnovšie články". */
const ClankyMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void; trieda?: string }> = ({ polozka, zavriet, trieda = 'kr-panel__clanok' }) => {
  const pocet = Math.min(6, Math.max(1, Number(polozka.pocet) || 2));
  const rubrika = polozka.rubrika_slug ? `&category=${encodeURIComponent(polozka.rubrika_slug)}` : '';
  const clanky = useApi<Clanok[]>(`/articles?limit=${pocet}${rubrika}`);
  return (
    <>
      {(clanky.data ?? []).map((c) => (
        <Link key={c.id} to={`/clanek/${c.slug}`} className={trieda} onClick={zavriet}>
          <span className="kr-panel__obrazok">{c.obrazok ? <img src={obrazokUrl(c.obrazok) ?? ''} alt="" loading="lazy" /> : null}</span>
          <span className="kr-panel__titulok">{c.nazov}</span>
          <span className="kr-panel__datum">{datum(c.publikovany_datum || c.vytvoreny)}</span>
        </Link>
      ))}
    </>
  );
};

/**
 * Obsah rozbaľovacieho panela: nadpis sekcie vľavo, stĺpce odkazov
 * (každá kategória vlastný stĺpec) a vpravo obrázkové karty a najnovšie
 * články. Stĺpce oddeľujú tenké linky.
 */
const PanelMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void }> = ({ polozka, zavriet }) => {
  const deti = polozka.deti ?? [];
  const clankove = deti.filter((d) => d.typ === 'clanky');
  const ostatne = deti.filter((d) => d.typ !== 'clanky');
  const kategorie = ostatne.filter((d) => (d.deti?.length ?? 0) > 0);
  const karty = ostatne.filter((d) => !d.deti?.length && d.obrazok && d.odkaz);
  const odkazy = ostatne.filter((d) => !d.deti?.length && !(d.obrazok && d.odkaz));

  return (
    <div className="kr-panel__vnutro">
      <div className="kr-panel__uvod">
        <span className="kr-stitok">Sekcia</span>
        <strong>{polozka.nazov}</strong>
        {polozka.odkaz && (
          <OdkazMenu polozka={{ ...polozka, deti: [] }} className="kr-panel__prehlad" onClick={zavriet}>
            Celá sekcia
            <Ikona nazov="sipka" velkost={14} />
          </OdkazMenu>
        )}
      </div>
      {odkazy.length > 0 && (
        <div className="kr-panel__stlpec">
          {odkazy.map((d) => (
            <OdkazMenu key={d.id} polozka={d} className="kr-panel__odkaz" onClick={zavriet} />
          ))}
        </div>
      )}
      {kategorie.map((k) => (
        <div key={k.id} className="kr-panel__stlpec">
          <OdkazMenu polozka={{ ...k, deti: [] }} className="kr-panel__nadpis" onClick={zavriet} />
          {(k.deti ?? []).map((v) => (
            <OdkazMenu key={v.id} polozka={v} className="kr-panel__odkaz" onClick={zavriet} />
          ))}
        </div>
      ))}
      {(karty.length > 0 || clankove.length > 0) && (
        <div className="kr-panel__karty">
          {karty.slice(0, 3).map((d) => (
            <OdkazMenu key={d.id} polozka={d} className="kr-panel__clanok" onClick={zavriet}>
              <span className="kr-panel__obrazok">
                <img src={obrazokUrl(d.obrazok) ?? ''} alt="" loading="lazy" />
              </span>
              <span className="kr-panel__titulok">{d.nazov}</span>
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
    <div className="kr-hpanel" role="dialog" aria-label="Vyhľadávanie">
      <form
        className="kr-hpanel__pole"
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
        <div className="kr-hpanel__vysledky" aria-live="polite">
          {nacitava && vysledky.length === 0 && <p className="kr-hpanel__stav">Hľadám…</p>}
          {chyba && <p className="kr-hpanel__stav">{chyba}</p>}
          {!nacitava && !chyba && vysledky.length === 0 && <p className="kr-hpanel__stav">Pre „{dotaz}“ sme nič nenašli.</p>}
          {skupiny.map((s) => (
            <div key={s.typ} className="kr-hpanel__skupina">
              <span className="kr-stitok">{s.nazov}</span>
              {s.polozky.map((v) => (
                <Odkaz key={`${v.typ}-${v.id}`} to={v.odkaz} className="kr-hpanel__vysledok" onClick={zavriet}>
                  <span className="kr-hpanel__nahlad">{v.obrazok ? <img src={obrazokUrl(v.obrazok) ?? ''} alt="" loading="lazy" /> : <Ikona nazov="hladat" velkost={14} />}</span>
                  <span>
                    <strong>{v.nazov}</strong>
                    {v.popis && <small>{v.popis}</small>}
                  </span>
                </Odkaz>
              ))}
            </div>
          ))}
          {vysledky.length > 0 && (
            <button type="button" className="kr-hpanel__vsetky" onClick={vsetky}>
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
    <Link to="/kosik" className="kr-ikona-tl" aria-label={pocet ? `Košík, ${pocet} ks` : 'Košík'} onClick={onClick}>
      <Ikona nazov="kosik" velkost={19} />
      {pocet > 0 && <span className="kr-ikona-tl__pocet">{pocet > 99 ? '99+' : pocet}</span>}
    </Link>
  );
};

export const Hlavicka: React.FC = () => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const siete = useSiete();
  const [otvorene, setOtvorene] = useState<PolozkaMenu['id'] | null>(null);
  const [hladanie, setHladanie] = useState(false);
  const [mobilneMenu, setMobilneMenu] = useState(false);
  const [prilepena, setPrilepena] = useState(false);
  const navigacia = useRef<HTMLDivElement>(null);
  const zarazka = useRef<HTMLDivElement>(null);
  const casovac = useRef<number>();

  // Navigácia je prilepená, keď jej pôvodné miesto odíde nad okraj okna
  useEffect(() => {
    const el = zarazka.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const pozorovatel = new IntersectionObserver(([z]) => setPrilepena(!z.isIntersecting), { threshold: 0 });
    pozorovatel.observe(el);
    return () => pozorovatel.disconnect();
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
      if (navigacia.current && !navigacia.current.contains(e.target as Node)) {
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

  return (
    <>
      <header className="kr-hlavicka">
        {u.zapnute('ukazat_listu') && (
          <div className="kr-lista">
            <div className="kr-kontajner kr-lista__vnutro">
              <span className="kr-lista__datum">{dnesnyDatum()}</span>
              <span className="kr-lista__vpravo">
                {nastavenia.kontakt?.email && (
                  <a href={`mailto:${nastavenia.kontakt.email}`} className="kr-lista__odkaz">
                    {nastavenia.kontakt.email}
                  </a>
                )}
                {siete.map((s) => (
                  <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer" className="kr-lista__odkaz" aria-label={s.nazov}>
                    {s.nazov}
                  </a>
                ))}
                {jePrihlaseny() && u.zapnute('ukazat_admin') && (
                  <a href="/admin" className="kr-lista__odkaz kr-lista__odkaz--admin">
                    Administrácia
                  </a>
                )}
              </span>
            </div>
          </div>
        )}

        <div className="kr-kontajner kr-titulka">
          <div className="kr-titulka__vlavo">
            <button type="button" className="kr-ikona-tl kr-titulka__hamburger" onClick={() => setMobilneMenu(true)} aria-label="Otvoriť menu" aria-expanded={mobilneMenu}>
              <Ikona nazov="menu" velkost={22} />
            </button>
            {u.zapnute('ukazat_hladanie') && (
              <button type="button" className={`kr-ikona-tl kr-titulka__hladat${hladanie ? ' is-aktivne' : ''}`} onClick={prepniHladanie} aria-label="Hľadať" aria-expanded={hladanie}>
                <Ikona nazov="hladat" velkost={19} />
                <span>Hľadať</span>
              </button>
            )}
          </div>
          <Link to="/" className="kr-titulka__stred" aria-label={`${nastavenia.nazov} - úvodná stránka`}>
            {nastavenia.logo ? <img src={souborUrl(nastavenia.logo)} alt="" className="kr-titulka__logo" /> : null}
            <span className="kr-titulka__text">
              <strong>{nastavenia.nazov}</strong>
              {u.zapnute('ukazat_slogan') && nastavenia.slogan && <small>{nastavenia.slogan}</small>}
            </span>
          </Link>
          <div className="kr-titulka__vpravo">
            <KosikHlavicky />
            {tlacidlo && (
              <Odkaz to={tlacidlo.odkaz} className="kr-tlacidlo kr-tlacidlo--akcent kr-titulka__cta">
                {tlacidlo.text}
              </Odkaz>
            )}
            {u.zapnute('ukazat_hladanie') && (
              <button type="button" className="kr-ikona-tl kr-titulka__hladat-mobil" onClick={prepniHladanie} aria-label="Hľadať" aria-expanded={hladanie}>
                <Ikona nazov="hladat" velkost={19} />
              </button>
            )}
          </div>
        </div>
        <div ref={zarazka} className="kr-zarazka" aria-hidden="true" />
      </header>

      <div ref={navigacia} className={`kr-navigacia${prilepena ? ' is-prilepena' : ''}${otvorene !== null || hladanie ? ' is-otvorena' : ''}`}>
        <div className="kr-kontajner kr-navigacia__vnutro">
          <Logo className="kr-logo kr-navigacia__logo" />
          <nav className="kr-menu" aria-label="Hlavné menu" onMouseLeave={zavriSOneskorenim}>
            {polozky.map((p) => {
              const maDeti = (p.deti?.length ?? 0) > 0;
              const jeOtvorene = otvorene === p.id;
              const aktivna = jeAktivny(p.odkaz, pathname) || (p.deti ?? []).some((d) => jeAktivny(d.odkaz, pathname));
              if (!maDeti) return <OdkazMenu key={p.id} polozka={p} className={`kr-menu__odkaz${aktivna ? ' is-aktivny' : ''}`} />;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`kr-menu__odkaz${jeOtvorene ? ' is-otvoreny' : ''}${aktivna ? ' is-aktivny' : ''}`}
                  aria-expanded={jeOtvorene}
                  onMouseEnter={() => otvor(p.id)}
                  onClick={() => (jeOtvorene ? setOtvorene(null) : otvor(p.id))}
                >
                  {p.nazov}
                  <Ikona nazov="dole" velkost={11} className="kr-menu__sipka" />
                </button>
              );
            })}
          </nav>
          {u.zapnute('ukazat_hladanie') && (
            <button type="button" className={`kr-ikona-tl kr-navigacia__hladat${hladanie ? ' is-aktivne' : ''}`} onClick={prepniHladanie} aria-label="Hľadať" aria-expanded={hladanie}>
              <Ikona nazov={hladanie ? 'zavriet' : 'hladat'} velkost={18} />
            </button>
          )}
        </div>
        {aktivnaPolozka && (
          <div className="kr-panel" onMouseEnter={() => window.clearTimeout(casovac.current)} onMouseLeave={zavriSOneskorenim}>
            <div className="kr-kontajner">
              <PanelMenu polozka={aktivnaPolozka} zavriet={zavri} />
            </div>
          </div>
        )}
        {hladanie && (
          <div className="kr-panel kr-panel--hladanie">
            <div className="kr-kontajner">
              <PanelHladania zavriet={() => setHladanie(false)} />
            </div>
          </div>
        )}
      </div>
      {mobilneMenu && <MobilneMenu zavriet={() => setMobilneMenu(false)} />}
    </>
  );
};

// ===== Mobilné menu =====

const MobilneMenu: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const siete = useSiete();
  const [rozbalene, setRozbalene] = useState<PolozkaMenu['id'] | null>(
    () => polozky.find((p) => (p.deti ?? []).some((d) => jeAktivny(d.odkaz, pathname) || (d.deti ?? []).some((v) => jeAktivny(v.odkaz, pathname))))?.id ?? null
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
    <div className="kr-mmenu" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="kr-mmenu__hlava">
        <Logo onClick={zavriet} />
        <strong>{nastavenia.nazov}</strong>
        <button type="button" className="kr-ikona-tl" onClick={zavriet} aria-label="Zavrieť menu">
          <Ikona nazov="zavriet" velkost={22} />
        </button>
      </div>

      {u.zapnute('ukazat_hladanie') && (
        <form
          className="kr-mmenu__hladanie"
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

      <ul className="kr-mmenu__zoznam">
        {polozky.map((p) => {
          const deti = (p.deti ?? []).filter((d) => d.typ !== 'clanky');
          const clankove = (p.deti ?? []).filter((d) => d.typ === 'clanky');
          const maPodmenu = deti.length > 0 || clankove.length > 0;
          const jeRozbalene = rozbalene === p.id;
          const aktivna = jeAktivny(p.odkaz, pathname);
          return (
            <li key={p.id} className={`kr-mmenu__polozka${jeRozbalene ? ' is-rozbalene' : ''}${aktivna ? ' is-aktivna' : ''}`}>
              {maPodmenu ? (
                <>
                  <button type="button" className="kr-mmenu__odkaz" aria-expanded={jeRozbalene} onClick={() => setRozbalene(jeRozbalene ? null : p.id)}>
                    <span>{p.nazov}</span>
                    <span className="kr-mmenu__plus" aria-hidden="true" />
                  </button>
                  {jeRozbalene && (
                    <div className="kr-mmenu__podmenu">
                      {p.odkaz && (
                        <OdkazMenu polozka={{ ...p, deti: [] }} onClick={zavriet} className="kr-mmenu__pododkaz kr-mmenu__pododkaz--hlavny">
                          {p.nazov} – celá sekcia
                        </OdkazMenu>
                      )}
                      {deti.map((d) =>
                        d.deti?.length ? (
                          <div key={d.id} className="kr-mmenu__skupina">
                            <OdkazMenu polozka={{ ...d, deti: [] }} onClick={zavriet} className="kr-mmenu__kategoria" />
                            {d.deti.map((v) => (
                              <OdkazMenu key={v.id} polozka={v} onClick={zavriet} className={`kr-mmenu__pododkaz${jeAktivny(v.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                            ))}
                          </div>
                        ) : (
                          <OdkazMenu key={d.id} polozka={d} onClick={zavriet} className={`kr-mmenu__pododkaz${jeAktivny(d.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                        )
                      )}
                      {clankove.length > 0 && (
                        <div className="kr-mmenu__clanky">
                          {clankove.map((c) => (
                            <ClankyMenu key={c.id} polozka={c} zavriet={zavriet} trieda="kr-mmenu__clanok" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <OdkazMenu polozka={p} onClick={zavriet} className="kr-mmenu__odkaz">
                  <span>{p.nazov}</span>
                </OdkazMenu>
              )}
            </li>
          );
        })}
      </ul>

      <div className="kr-mmenu__spodok">
        {tlacidlo && (
          <Odkaz to={tlacidlo.odkaz} className="kr-tlacidlo kr-tlacidlo--akcent kr-mmenu__cta" onClick={zavriet}>
            {tlacidlo.text}
          </Odkaz>
        )}
        {(kontakt.telefon || kontakt.email) && (
          <div className="kr-mmenu__kontakt">
            {kontakt.telefon && <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>{kontakt.telefon}</a>}
            {kontakt.email && <a href={`mailto:${kontakt.email}`}>{kontakt.email}</a>}
          </div>
        )}
        {siete.length > 0 && (
          <div className="kr-mmenu__siete">
            {siete.map((s) => (
              <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer">
                {s.nazov}
              </a>
            ))}
          </div>
        )}
        {jePrihlaseny() && u.zapnute('ukazat_admin') && (
          <a href="/admin" className="kr-mmenu__admin">
            Administrácia
          </a>
        )}
      </div>
    </div>
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

// ===== Pätička =====

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  const { polozky } = useMenuWebu();
  const siete = useSiete();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const gdpr = nastavenia.gdpr ?? {};
  const text = String(u.s.paticka_text || '').trim() || nastavenia.slogan || nastavenia.meta_popis;
  const odkazy = polozky.filter((p) => p.odkaz).slice(0, 10);
  const rok = new Date().getFullYear();

  return (
    <footer className="kr-paticka">
      <div className="kr-kontajner">
        <div className="kr-paticka__hlava">
          <Logo className="kr-logo kr-paticka__logo" />
          <strong className="kr-paticka__nazov">{nastavenia.nazov}</strong>
          {text && <p>{text}</p>}
        </div>
        <div className="kr-paticka__stlpce">
          {odkazy.length > 0 && (
            <nav className="kr-paticka__stlpec kr-paticka__stlpec--menu" aria-label="Odkazy v pätičke">
              <span className="kr-stitok">{u.text('paticka_menu', 'Klub')}</span>
              <div>
                {odkazy.map((p) => (
                  <OdkazMenu key={p.id} polozka={{ ...p, deti: [] }} className="kr-paticka__odkaz" />
                ))}
              </div>
            </nav>
          )}
          <div className="kr-paticka__stlpec">
            <span className="kr-stitok">{u.text('paticka_kontakt', 'Kontakt')}</span>
            {kontakt.adresa && <span className="kr-paticka__adresa">{kontakt.adresa}</span>}
            {kontakt.telefon && (
              <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`} className="kr-paticka__odkaz">
                {kontakt.telefon}
              </a>
            )}
            {kontakt.email && (
              <a href={`mailto:${kontakt.email}`} className="kr-paticka__odkaz">
                {kontakt.email}
              </a>
            )}
          </div>
          {siete.length > 0 && u.zapnute('ukazat_siete_paticka') && (
            <div className="kr-paticka__stlpec">
              <span className="kr-stitok">{u.text('paticka_siete', 'Sledujte nás')}</span>
              {siete.map((x) => (
                <a key={x.kluc} href={x.url} target="_blank" rel="noopener noreferrer" className="kr-paticka__odkaz">
                  {x.nazov}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="kr-paticka__spodok">
          <span>
            © {rok} {nastavenia.nazov}. {u.text('paticka_copyright', 'Všetky práva vyhradené.')}
          </span>
          <span className="kr-paticka__pravne">
            {gdpr.odkaz_zasad && (
              <Odkaz to={gdpr.odkaz_zasad} className="kr-paticka__male">
                Ochrana osobných údajov
              </Odkaz>
            )}
            <button type="button" className="kr-paticka__male" onClick={otvorNastaveniaCookies}>
              Nastavenia cookies
            </button>
            <button type="button" className="kr-paticka__male" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Na začiatok ↑
            </button>
          </span>
        </div>
      </div>
    </footer>
  );
};
