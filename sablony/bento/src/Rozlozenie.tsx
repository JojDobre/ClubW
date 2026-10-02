// Umiestnenie: sablony/bento/src/Rozlozenie.tsx
// Kostra šablóny Dynamic Football Bento.
//
// Celý web je jedna „bento" doska: na podklade (plátne) ležia zaoblené
// dlaždice s medzerami. Hlavička je trojica plávajúcich dlaždíc (logo,
// menu, akcie), rozbaľovacie menu je panel dlaždíc, pätička je zhluk
// dlaždíc a na mobile pláva dole kapsula s rýchlymi záložkami.
//
// Karty sa pod myšou jemne zdvihnú a pri posúvaní sa dlaždice postupne
// vynárajú (trieda is-videny).

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
  useNastaveniaSablony,
  type PolozkaMenu,
} from '@clubw/jadro';
import { Ikona, Odkaz, obrazokUrl, useApi, useUpravy, type Clanok } from './spolocne';
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
  const text = u.text('tlacidlo_text', 'Vstupenky');
  const odkaz = String(u.s.tlacidlo_odkaz || '').trim() || (nastavenia.kontakt?.email ? `mailto:${nastavenia.kontakt.email}` : '');
  return text && odkaz ? { text, odkaz } : null;
};

/** Zabráni posúvaniu stránky pod otvoreným panelom. */
const useZamknutyPosun = (zamknuty: boolean) => {
  useEffect(() => {
    if (!zamknuty) return;
    document.body.classList.add('db-bez-posunu');
    return () => document.body.classList.remove('db-bez-posunu');
  }, [zamknuty]);
};

// ===== Vynáranie dlaždíc pri posúvaní =====

const useObjekty = (pathname: string, zapnute: boolean) => {
  // Vynáranie dlaždíc - nové prvky (po načítaní dát) sleduje MutationObserver
  useEffect(() => {
    const koren = document.documentElement;
    if (!zapnute) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    koren.classList.add('db-animuje');
    const pozorovatel = new IntersectionObserver(
      (zaznamy) => {
        for (const z of zaznamy) {
          if (z.isIntersecting) {
            z.target.classList.add('is-videny');
            pozorovatel.unobserve(z.target);
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.04 }
    );
    const sleduj = () => document.querySelectorAll('.db-odhal:not(.is-videny)').forEach((el) => pozorovatel.observe(el));
    sleduj();
    const zmeny = new MutationObserver(sleduj);
    zmeny.observe(document.body, { childList: true, subtree: true });
    // Poistka: po chvíli ukáž všetko, čo je už nad spodkom obrazovky
    const poistka = window.setTimeout(() => {
      document.querySelectorAll('.db-odhal:not(.is-videny)').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-videny');
      });
    }, 1200);
    return () => {
      pozorovatel.disconnect();
      zmeny.disconnect();
      window.clearTimeout(poistka);
      koren.classList.remove('db-animuje');
    };
  }, [pathname, zapnute]);
};

// ===== Rozloženie =====

/** Stránky bez pásu partnerov (nákup má zostať prehľadný). */
const BEZ_PARTNEROV = ['/sponzori', '/kosik', '/pokladna', '/objednavka'];

export const Rozlozenie: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const u = useUpravy();
  const jeUvod = pathname === '/';
  useObjekty(pathname, u.zapnute('animacie'));

  // Nová stránka začína navrchu
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  const zaoblenie = typeof u.s.zaoblenie === 'string' && u.s.zaoblenie ? ` db--zaoblenie-${u.s.zaoblenie}` : '';
  const pismo = typeof u.s.pismo === 'string' && u.s.pismo ? ` db--pismo-${u.s.pismo}` : '';

  return (
    <div className={`db${jeUvod ? ' db--uvod' : ''}${zaoblenie}${pismo}`}>
      <a href="#db-obsah" className="db-preskocit">
        Preskočiť na obsah
      </a>
      <Cast nazov="Hlavicka" />
      <main id="db-obsah" className="db-obsah">
        {children}
        {!jeUvod && !BEZ_PARTNEROV.some((c) => pathname.startsWith(c)) && <PartneriStranky />}
      </main>
      <Cast nazov="Paticka" />
      <SpodnaNavigacia />
    </div>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="db-nacitava" role="status">
    <span aria-hidden="true" />
    Načítavam…
  </div>
);

// ===== Logo =====

const Logo: React.FC<{ className?: string; onClick?: () => void }> = ({ className = 'db-logo', onClick }) => {
  const { nastavenia } = useNastavenia();
  return (
    <Link to="/" className={className} aria-label={`${nastavenia.nazov} - úvodná stránka`} onClick={onClick}>
      {nastavenia.logo ? (
        <img src={souborUrl(nastavenia.logo)} alt="" />
      ) : (
        <span className="db-logo__znak">{(nastavenia.skratka || nastavenia.nazov).slice(0, 3)}</span>
      )}
    </Link>
  );
};

// ===== Rozbaľovacie menu (panel dlaždíc) =====

/** Karty najnovších článkov - položka menu typu „Najnovšie články". */
const ClankyMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void; trieda?: string }> = ({ polozka, zavriet, trieda = 'db-panel__clanok' }) => {
  const pocet = Math.min(6, Math.max(1, Number(polozka.pocet) || 2));
  const rubrika = polozka.rubrika_slug ? `&category=${encodeURIComponent(polozka.rubrika_slug)}` : '';
  const clanky = useApi<Clanok[]>(`/articles?limit=${pocet}${rubrika}`);
  return (
    <>
      {(clanky.data ?? []).map((c) => (
        <Link key={c.id} to={`/clanek/${c.slug}`} className={`${trieda} db-objekt`} onClick={zavriet}>
          <span className="db-panel__obrazok">{c.obrazok ? <img src={obrazokUrl(c.obrazok) ?? ''} alt="" loading="lazy" /> : null}</span>
          <span className="db-panel__titulok">{c.nazov}</span>
        </Link>
      ))}
    </>
  );
};

/**
 * Obsah rozbaľovacieho panela: každá kategória (podmenu) je samostatná
 * dlaždica so zoznamom odkazov, odkazy bez kategórie majú spoločnú
 * dlaždicu, položky s obrázkom a najnovšie články sú obrázkové dlaždice.
 */
const PanelMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void }> = ({ polozka, zavriet }) => {
  const deti = polozka.deti ?? [];
  const clankove = deti.filter((d) => d.typ === 'clanky');
  const ostatne = deti.filter((d) => d.typ !== 'clanky');
  const kategorie = ostatne.filter((d) => (d.deti?.length ?? 0) > 0);
  const karty = ostatne.filter((d) => !d.deti?.length && d.obrazok && d.odkaz);
  const odkazy = ostatne.filter((d) => !d.deti?.length && !(d.obrazok && d.odkaz));

  return (
    <div className="db-panel__mriezka">
      <div className="db-panel__uvod">
        <span className="db-panel__stitok">Menu</span>
        <strong>{polozka.nazov}</strong>
        {polozka.odkaz && (
          <OdkazMenu polozka={{ ...polozka, deti: [] }} className="db-panel__prehlad" onClick={zavriet}>
            Prehľad
            <Ikona nazov="sipka" velkost={14} />
          </OdkazMenu>
        )}
      </div>
      {odkazy.length > 0 && (
        <div className="db-panel__dlazdica">
          {odkazy.map((d) => (
            <OdkazMenu key={d.id} polozka={d} className="db-panel__odkaz" onClick={zavriet} />
          ))}
        </div>
      )}
      {kategorie.map((k) => (
        <div key={k.id} className="db-panel__dlazdica">
          <OdkazMenu polozka={{ ...k, deti: [] }} className="db-panel__nadpis" onClick={zavriet} />
          {(k.deti ?? []).map((v) => (
            <OdkazMenu key={v.id} polozka={v} className="db-panel__odkaz" onClick={zavriet} />
          ))}
        </div>
      ))}
      {karty.slice(0, 3).map((d) => (
        <OdkazMenu key={d.id} polozka={d} className="db-panel__clanok db-objekt" onClick={zavriet}>
          <span className="db-panel__obrazok">
            <img src={obrazokUrl(d.obrazok) ?? ''} alt="" loading="lazy" />
          </span>
          <span className="db-panel__titulok">{d.nazov}</span>
        </OdkazMenu>
      ))}
      {clankove.map((c) => (
        <ClankyMenu key={c.id} polozka={c} zavriet={zavriet} />
      ))}
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
    <div className="db-hpanel" role="dialog" aria-label="Vyhľadávanie">
      <form
        className="db-hladanie__pole"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          vsetky();
        }}
      >
        <Ikona nazov="hladat" velkost={22} />
        <input ref={pole} type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hľadaj hráča, zápas, článok…" aria-label="Hľadať na webe" maxLength={100} />
        <button type="submit">Hľadať</button>
      </form>
      {dotaz.length >= 2 && (
        <div className="db-hladanie__vysledky" aria-live="polite">
          {nacitava && vysledky.length === 0 && <p className="db-hladanie__stav">Hľadám…</p>}
          {chyba && <p className="db-hladanie__stav">{chyba}</p>}
          {!nacitava && !chyba && vysledky.length === 0 && <p className="db-hladanie__stav">Pre „{dotaz}“ sme nič nenašli.</p>}
          {skupiny.map((s) => (
            <div key={s.typ} className="db-hladanie__skupina">
              <span className="db-panel__stitok">{s.nazov}</span>
              {s.polozky.map((v) => (
                <Odkaz key={`${v.typ}-${v.id}`} to={v.odkaz} className="db-hladanie__vysledok" onClick={zavriet}>
                  <span className="db-hladanie__nahlad">{v.obrazok ? <img src={obrazokUrl(v.obrazok) ?? ''} alt="" loading="lazy" /> : <Ikona nazov="hladat" velkost={14} />}</span>
                  <span>
                    <strong>{v.nazov}</strong>
                    {v.popis && <small>{v.popis}</small>}
                  </span>
                </Odkaz>
              ))}
            </div>
          ))}
          {vysledky.length > 0 && (
            <button type="button" className="db-hladanie__vsetky" onClick={vsetky}>
              Všetky výsledky <Ikona nazov="sipka" velkost={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ===== Hlavička =====

/** Košík s počtom kusov - len keď je obchod zapnutý. */
const KosikHlavicky: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { nastavenia } = useNastavenia();
  const { pocet } = useKosik();
  const u = useUpravy();
  if (!nastavenia.eshop?.zapnuty || !u.zapnute('ukazat_kosik')) return null;
  return (
    <Link to="/kosik" className="db-ikona-tl" aria-label={pocet ? `Košík, ${pocet} ks` : 'Košík'} onClick={onClick}>
      <Ikona nazov="kosik" velkost={20} />
      {pocet > 0 && <span className="db-ikona-tl__pocet">{pocet > 99 ? '99+' : pocet}</span>}
    </Link>
  );
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
  const [posunute, setPosunute] = useState(false);
  const hlavicka = useRef<HTMLElement>(null);
  const casovac = useRef<number>();

  useEffect(() => {
    const zmena = () => setPosunute(window.scrollY > 24);
    zmena();
    window.addEventListener('scroll', zmena, { passive: true });
    return () => window.removeEventListener('scroll', zmena);
  }, []);

  useEffect(() => {
    setOtvorene(null);
    setHladanie(false);
    setMobilneMenu(false);
  }, [pathname]);

  // Spodná navigácia otvára to isté menu
  useEffect(() => {
    const otvor = () => setMobilneMenu(true);
    window.addEventListener('db:menu', otvor);
    return () => window.removeEventListener('db:menu', otvor);
  }, []);

  // Panely sa zavrú klávesom Escape alebo kliknutím mimo hlavičky
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
    casovac.current = window.setTimeout(() => setOtvorene(null), 200);
  };
  const zavri = useCallback(() => setOtvorene(null), []);
  const aktivnaPolozka = polozky.find((p) => p.id === otvorene);

  return (
    <>
      <header ref={hlavicka} className={`db-hlavicka${posunute ? ' is-posunuta' : ''}${otvorene !== null || hladanie ? ' is-otvorena' : ''}`}>
        <div className="db-hlavicka__rad">
          <div className="db-hlavicka__logo db-dlazdica">
            <Logo />
            {u.zapnute('ukazat_nazov', true) && (
              <Link to="/" className="db-hlavicka__nazov" tabIndex={-1}>
                {nastavenia.skratka || nastavenia.nazov}
              </Link>
            )}
          </div>

          <nav className="db-hlavicka__menu db-dlazdica" aria-label="Hlavné menu" onMouseLeave={zavriSOneskorenim}>
            {polozky.map((p) => {
              const maDeti = (p.deti?.length ?? 0) > 0;
              const jeOtvorene = otvorene === p.id;
              const aktivna = jeAktivny(p.odkaz, pathname) || (p.deti ?? []).some((d) => jeAktivny(d.odkaz, pathname));
              if (!maDeti) {
                return (
                  <OdkazMenu
                    key={p.id}
                    polozka={p}
                    className={`db-menu__odkaz${aktivna ? ' is-aktivny' : ''}`}
                  />
                );
              }
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`db-menu__odkaz${jeOtvorene ? ' is-otvoreny' : ''}${aktivna ? ' is-aktivny' : ''}`}
                  aria-expanded={jeOtvorene}
                  onMouseEnter={() => otvor(p.id)}
                  onClick={() => (jeOtvorene ? setOtvorene(null) : otvor(p.id))}
                >
                  {p.nazov}
                  <Ikona nazov="dole" velkost={12} className="db-menu__sipka" />
                </button>
              );
            })}
          </nav>

          <div className="db-hlavicka__akcie db-dlazdica">
            {u.zapnute('ukazat_hladanie') && (
              <button
                type="button"
                className={`db-ikona-tl${hladanie ? ' is-aktivne' : ''}`}
                onClick={() => {
                  setOtvorene(null);
                  setHladanie((h) => !h);
                }}
                aria-label={hladanie ? 'Zavrieť vyhľadávanie' : 'Hľadať'}
                aria-expanded={hladanie}
              >
                <Ikona nazov={hladanie ? 'zavriet' : 'hladat'} velkost={19} />
              </button>
            )}
            <KosikHlavicky />
            {jePrihlaseny() && u.zapnute('ukazat_admin') && (
              <a href="/admin" className="db-ikona-tl db-ikona-tl--text" title="Administrácia">
                Admin
              </a>
            )}
            {tlacidlo && (
              <Odkaz to={tlacidlo.odkaz} className="db-tlacidlo-volt db-hlavicka__cta">
                {tlacidlo.text}
                <Ikona nazov="sipka" velkost={14} />
              </Odkaz>
            )}
            <button type="button" className="db-ikona-tl db-hlavicka__hamburger" onClick={() => setMobilneMenu(true)} aria-label="Otvoriť menu" aria-expanded={mobilneMenu}>
              <Ikona nazov="menu" velkost={20} />
            </button>
          </div>
        </div>

        {aktivnaPolozka && (
          <div className="db-panel" onMouseEnter={() => window.clearTimeout(casovac.current)} onMouseLeave={zavriSOneskorenim}>
            <PanelMenu polozka={aktivnaPolozka} zavriet={zavri} />
          </div>
        )}
        {hladanie && (
          <div className="db-panel db-panel--hladanie">
            <PanelHladania zavriet={() => setHladanie(false)} />
          </div>
        )}
      </header>
      {mobilneMenu && <MobilneMenu zavriet={() => setMobilneMenu(false)} />}
    </>
  );
};

// ===== Mobilné menu (bento doska cez celú obrazovku) =====

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
    <div className="db-mmenu" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="db-mmenu__hlava">
        <div className="db-dlazdica db-mmenu__logo">
          <Logo onClick={zavriet} />
        </div>
        <div className="db-dlazdica db-mmenu__akcie">
          <KosikHlavicky onClick={zavriet} />
          <button type="button" className="db-ikona-tl db-ikona-tl--volt" onClick={zavriet} aria-label="Zavrieť menu">
            <Ikona nazov="zavriet" velkost={20} />
          </button>
        </div>
      </div>

      {u.zapnute('ukazat_hladanie') && (
        <form
          className="db-dlazdica db-mmenu__hladanie"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            zavriet();
            navigate(`/hladat${text.trim() ? `?q=${encodeURIComponent(text.trim())}` : ''}`);
          }}
        >
          <Ikona nazov="hladat" velkost={18} />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hľadať na webe…" aria-label="Hľadať na webe" />
        </form>
      )}

      <ul className="db-mmenu__mriezka">
        {polozky.map((p, i) => {
          const deti = (p.deti ?? []).filter((d) => d.typ !== 'clanky');
          const clankove = (p.deti ?? []).filter((d) => d.typ === 'clanky');
          const maPodmenu = deti.length > 0 || clankove.length > 0;
          const jeRozbalene = rozbalene === p.id;
          const aktivna = jeAktivny(p.odkaz, pathname);
          return (
            <li key={p.id} className={`db-mmenu__polozka${jeRozbalene ? ' is-rozbalene' : ''}${aktivna ? ' is-aktivna' : ''}`} style={{ '--db-i': i } as React.CSSProperties}>
              {maPodmenu ? (
                <>
                  <button type="button" className="db-mmenu__dlazdica" aria-expanded={jeRozbalene} onClick={() => setRozbalene(jeRozbalene ? null : p.id)}>
                    <span className="db-mmenu__cislo">{String(i + 1).padStart(2, '0')}</span>
                    <span className="db-mmenu__nazov">{p.nazov}</span>
                    <span className="db-mmenu__plus" aria-hidden="true" />
                  </button>
                  {jeRozbalene && (
                    <div className="db-mmenu__podmenu">
                      {p.odkaz && (
                        <OdkazMenu polozka={{ ...p, deti: [] }} onClick={zavriet} className="db-mmenu__pododkaz db-mmenu__pododkaz--hlavny">
                          {p.nazov} – prehľad
                        </OdkazMenu>
                      )}
                      {deti.map((d) =>
                        d.deti?.length ? (
                          <div key={d.id} className="db-mmenu__skupina">
                            <OdkazMenu polozka={{ ...d, deti: [] }} onClick={zavriet} className="db-mmenu__kategoria" />
                            {d.deti.map((v) => (
                              <OdkazMenu key={v.id} polozka={v} onClick={zavriet} className={`db-mmenu__pododkaz${jeAktivny(v.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                            ))}
                          </div>
                        ) : (
                          <OdkazMenu key={d.id} polozka={d} onClick={zavriet} className={`db-mmenu__pododkaz${jeAktivny(d.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                        )
                      )}
                      {clankove.length > 0 && (
                        <div className="db-mmenu__clanky">
                          {clankove.map((c) => (
                            <ClankyMenu key={c.id} polozka={c} zavriet={zavriet} trieda="db-mmenu__clanok" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <OdkazMenu polozka={p} onClick={zavriet} className="db-mmenu__dlazdica">
                  <span className="db-mmenu__cislo">{String(i + 1).padStart(2, '0')}</span>
                  <span className="db-mmenu__nazov">{p.nazov}</span>
                  <Ikona nazov="sipka" velkost={16} className="db-mmenu__sipka" />
                </OdkazMenu>
              )}
            </li>
          );
        })}
      </ul>

      <div className="db-mmenu__spodok">
        {tlacidlo && (
          <Odkaz to={tlacidlo.odkaz} className="db-dlazdica db-mmenu__cta" onClick={zavriet}>
            <span>{tlacidlo.text}</span>
            <Ikona nazov="sipka" velkost={20} />
          </Odkaz>
        )}
        {(kontakt.telefon || kontakt.email) && (
          <div className="db-dlazdica db-mmenu__kontakt">
            {kontakt.telefon && (
              <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>
                <Ikona nazov="telefon" velkost={16} />
                {kontakt.telefon}
              </a>
            )}
            {kontakt.email && (
              <a href={`mailto:${kontakt.email}`}>
                <Ikona nazov="mail" velkost={16} />
                {kontakt.email}
              </a>
            )}
          </div>
        )}
        {siete.length > 0 && (
          <div className="db-dlazdica db-mmenu__siete">
            {siete.map((s) => (
              <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.nazov}>
                {s.skratka}
              </a>
            ))}
          </div>
        )}
        {jePrihlaseny() && u.zapnute('ukazat_admin') && (
          <a href="/admin" className="db-dlazdica db-mmenu__admin">
            Administrácia
          </a>
        )}
      </div>
    </div>
  );
};

// ===== Spodná navigácia (mobil) =====

/** Plávajúca kapsula so záložkami: Domov a Menu sú pevné, prostredné tri sa dajú nastaviť. */
const ZALOZKY: Array<{ nazov: string; odkaz: string; ikona: string; aj?: string[] }> = [
  { nazov: 'Domov', odkaz: '/', ikona: 'domov' },
  { nazov: 'Správy', odkaz: '/clanky', ikona: 'spravy', aj: ['/clanek'] },
  { nazov: 'Zápasy', odkaz: '/matches', ikona: 'zapasy', aj: ['/leagues', '/calendar'] },
  { nazov: 'Tím', odkaz: '/teams', ikona: 'tim', aj: ['/players', '/staff'] },
];

const SpodnaNavigacia: React.FC = () => {
  const { pathname } = useLocation();
  const u = useUpravy();
  const zalozky = ZALOZKY.map((z, i) => {
    if (i === 0) return z;
    const odkaz = u.text(`zalozka_${i + 1}_odkaz`, z.odkaz);
    return { ...z, nazov: u.text(`zalozka_${i + 1}_nazov`, z.nazov), odkaz, aj: odkaz === z.odkaz ? z.aj : [] };
  });
  const aktivna = (z: (typeof ZALOZKY)[number]) =>
    z.odkaz === '/' ? pathname === '/' : [z.odkaz, ...(z.aj ?? [])].some((o) => pathname === o || pathname.startsWith(`${o}/`));
  return (
    <nav className="db-zalozky" aria-label="Rýchla navigácia">
      {zalozky.map((z) => {
        const obsah = (
          <>
            <Ikona nazov={z.ikona} velkost={20} />
            <span>{z.nazov}</span>
          </>
        );
        return z.odkaz.startsWith('/') ? (
          <Link key={z.nazov + z.odkaz} to={z.odkaz} className={`db-zalozky__polozka${aktivna(z) ? ' is-aktivna' : ''}`} aria-current={aktivna(z) ? 'page' : undefined}>
            {obsah}
          </Link>
        ) : (
          <a key={z.nazov + z.odkaz} href={z.odkaz} className="db-zalozky__polozka">
            {obsah}
          </a>
        );
      })}
      <button type="button" className="db-zalozky__polozka db-zalozky__menu" onClick={() => window.dispatchEvent(new Event('db:menu'))}>
        <Ikona nazov="menu" velkost={20} />
        <span>{u.text('zalozka_menu_nazov', 'Menu')}</span>
      </button>
    </nav>
  );
};

// ===== Sociálne siete =====

export const SIETE = [
  { kluc: 'instagram', nazov: 'Instagram', skratka: 'IG', farba: '#E1306C' },
  { kluc: 'facebook', nazov: 'Facebook', skratka: 'FB', farba: '#1877F2' },
  { kluc: 'x', nazov: 'X', skratka: 'X', farba: '#000000' },
  { kluc: 'youtube', nazov: 'YouTube', skratka: 'YT', farba: '#FF0000' },
  { kluc: 'tiktok', nazov: 'TikTok', skratka: 'TT', farba: '#111111' },
] as const;

export const useSiete = () => {
  const { nastavenia } = useNastavenia();
  const siete = (nastavenia.socialne_siete ?? {}) as Record<string, string | null | undefined>;
  return SIETE.filter((s) => Boolean(siete[s.kluc])).map((s) => ({ ...s, url: siete[s.kluc] as string }));
};

// ===== Pätička (zhluk dlaždíc) =====

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<Record<string, string | null>>();
  const u = useUpravy();
  const { polozky } = useMenuWebu();
  const siete = useSiete();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const gdpr = nastavenia.gdpr ?? {};
  const text = s.paticka_text || nastavenia.slogan || nastavenia.meta_popis;
  const odkazy = polozky.filter((p) => p.odkaz).slice(0, 8);
  const rok = new Date().getFullYear();

  return (
    <footer className="db-paticka">
      <div className="db-doska db-paticka__doska">
        <div className="db-dlazdica db-paticka__klub db-odhal">
          <span className="db-paticka__logo">
            <Logo />
          </span>
          <strong className="db-paticka__obri" aria-hidden="true">
            {nastavenia.skratka || nastavenia.nazov}
          </strong>
          {text && <p>{text}</p>}
        </div>

        {odkazy.length > 0 && (
          <nav className="db-dlazdica db-paticka__menu db-odhal" aria-label="Odkazy v pätičke">
            <span className="db-panel__stitok">{u.text('paticka_menu', 'Navigácia')}</span>
            <div>
              {odkazy.map((p) => (
                <OdkazMenu key={p.id} polozka={{ ...p, deti: [] }} className="db-paticka__odkaz" />
              ))}
            </div>
          </nav>
        )}

        <div className="db-dlazdica db-dlazdica--tmava db-paticka__kontakt db-odhal">
          <span className="db-panel__stitok">{u.text('paticka_kontakt', 'Kontakt')}</span>
          {kontakt.adresa && <span className="db-paticka__adresa">{kontakt.adresa}</span>}
          {kontakt.telefon && <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>{kontakt.telefon}</a>}
          {kontakt.email && <a href={`mailto:${kontakt.email}`}>{kontakt.email}</a>}
        </div>

        {siete.length > 0 && u.zapnute('ukazat_siete_paticka') && (
          <div className="db-dlazdica db-dlazdica--volt db-paticka__siete db-odhal">
            <span className="db-panel__stitok">{u.text('paticka_siete', 'Sleduj nás')}</span>
            <div>
              {siete.map((x) => (
                <a key={x.kluc} href={x.url} target="_blank" rel="noopener noreferrer" aria-label={x.nazov} className="db-objekt">
                  {x.skratka}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="db-dlazdica db-paticka__spodok">
          <span>
            © {rok} {nastavenia.nazov}. {u.text('paticka_copyright', 'Všetky práva vyhradené.')}
          </span>
          <span className="db-paticka__pravne">
            {gdpr.odkaz_zasad && (
              <Odkaz to={gdpr.odkaz_zasad} className="db-paticka__male">
                Ochrana osobných údajov
              </Odkaz>
            )}
            <button type="button" className="db-paticka__male" onClick={otvorNastaveniaCookies}>
              Nastavenia cookies
            </button>
            <button type="button" className="db-paticka__male" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Hore ↑
            </button>
          </span>
        </div>
      </div>
    </footer>
  );
};
