// Umiestnenie: sablony/klubova/src/Rozlozenie.tsx
// Kostra šablóny Klubová: hlavička s rozbaľovacím menu cez celú šírku,
// pätička a na mobile aplikačná navigácia (horná lišta + spodné záložky).
//
// Na úvodnej stránke je hlavička priehľadná nad fotkou (s tmavým
// prechodom) a po posunutí alebo otvorení menu dostane tmavé pozadie.

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Cast,
  OdkazMenu,
  jePrihlaseny,
  otvorNastaveniaCookies,
  souborUrl,
  useKosik,
  useMenuWebu,
  useNastavenia,
  useNastaveniaSablony,
  type PolozkaMenu,
} from '@clubw/jadro';
import { Ikona, Odkaz, obrazokUrl, useUpravy } from './spolocne';
import { PartneriStranky } from './casti';

interface NastaveniaRozlozenia extends Record<string, string | number | boolean | null> {
  tlacidlo_text: string | null;
  tlacidlo_odkaz: string | null;
  paticka_text: string | null;
  fanshop_odkaz: string | null;
}

const jeAktivny = (odkaz: string | null, pathname: string) => {
  if (!odkaz || !odkaz.startsWith('/')) return false;
  if (odkaz === '/') return pathname === '/';
  return pathname === odkaz || pathname.startsWith(`${odkaz}/`);
};

/** Tlačidlo v hlavičke: text a odkaz z nastavení, inak e-mail klubu. */
const useTlacidloHlavicky = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<NastaveniaRozlozenia>();
  const text = (s.tlacidlo_text || '').trim();
  const odkaz = (s.tlacidlo_odkaz || '').trim() || (nastavenia.kontakt?.email ? `mailto:${nastavenia.kontakt.email}` : '');
  return text && odkaz ? { text, odkaz } : null;
};

/** Zabráni posúvaniu stránky pod otvoreným menu. */
const useZamknutyPosun = (zamknuty: boolean) => {
  useEffect(() => {
    if (!zamknuty) return;
    document.body.classList.add('kl-bez-posunu');
    return () => document.body.classList.remove('kl-bez-posunu');
  }, [zamknuty]);
};

// ===== Rozloženie =====

/** Stránky bez pásu partnerov (nákup má zostať prehľadný). */
const BEZ_PARTNEROV = ['/sponzori', '/kosik', '/pokladna', '/objednavka'];

/** Košík v hlavičke s počtom kusov - len keď je obchod zapnutý. */
const KosikHlavicky: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { pocet } = useKosik();
  const { pathname } = useLocation();
  const u = useUpravy();
  if (!nastavenia.eshop?.zapnuty || !u.zapnute('ukazat_kosik')) return null;
  return (
    <Link to="/kosik" className={`kl-hlavicka__kosik${pathname === '/kosik' ? ' is-aktivny' : ''}`} aria-label={pocet ? `Košík, ${pocet} ks` : 'Košík'}>
      <Ikona nazov="kosik" velkost={20} />
      {pocet > 0 && <span className="kl-hlavicka__pocet">{pocet > 99 ? '99+' : pocet}</span>}
    </Link>
  );
};

export const Rozlozenie: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { s } = useUpravy();
  const jeUvod = pathname === '/';

  // Nová stránka začína navrchu
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`kl${jeUvod ? ' kl--uvod' : ''}`} data-pismo={typeof s.pismo === 'string' ? s.pismo : undefined}>
      <a href="#kl-obsah" className="kl-preskocit">
        Preskočiť na obsah
      </a>
      <Cast nazov="Hlavicka" />
      <main id="kl-obsah" className="kl-obsah">
        {children}
        {/* Partneri na spodku každej podstránky (úvod ich má vo vlastnom poradí sekcií) */}
        {!jeUvod && !BEZ_PARTNEROV.some((c) => pathname.startsWith(c)) && <PartneriStranky />}
      </main>
      <Cast nazov="Paticka" />
      <SpodnaNavigacia />
    </div>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="kl-nacitava" role="status">
    <span aria-hidden="true" />
    Načítavam…
  </div>
);

// ===== Logo =====

const Logo: React.FC<{ className?: string; onClick?: () => void }> = ({ className = 'kl-logo', onClick }) => {
  const { nastavenia } = useNastavenia();
  return (
    <Link to="/" className={className} aria-label={`${nastavenia.nazov} - úvodná stránka`} onClick={onClick}>
      {nastavenia.logo ? (
        <img src={souborUrl(nastavenia.logo)} alt="" />
      ) : (
        <span className="kl-logo__znak">{(nastavenia.skratka || nastavenia.nazov).slice(0, 3)}</span>
      )}
    </Link>
  );
};

// ===== Hlavička =====

/** Karta s obrázkom v rozbaľovacom menu (položka podmenu s obrázkom). */
const KartaMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void }> = ({ polozka, zavriet }) => (
  <OdkazMenu polozka={polozka} className="kl-panel__karta" onClick={zavriet}>
    <span className="kl-panel__karta-obrazok">
      <img src={obrazokUrl(polozka.obrazok) ?? ''} alt="" loading="lazy" />
    </span>
    <span className="kl-panel__karta-nazov">{polozka.nazov}</span>
  </OdkazMenu>
);

/** Odkazy bez kategórie - dlhý zoznam sa rozdelí do stĺpcov (najviac 5 pod sebou). */
const ZoznamOdkazov: React.FC<{ odkazy: PolozkaMenu[]; zavriet: () => void }> = ({ odkazy, zavriet }) => {
  const stlpcov = Math.min(Math.ceil(odkazy.length / 5), 4);
  const naStlpec = Math.ceil(odkazy.length / stlpcov);
  return (
    <div className="kl-panel__zoznam">
      {Array.from({ length: stlpcov }, (_, i) => (
        <div key={i} className="kl-panel__zoznam-stlpec">
          {odkazy.slice(i * naStlpec, (i + 1) * naStlpec).map((d) => (
            <OdkazMenu key={d.id} polozka={d} className="kl-panel__odkaz" onClick={zavriet} />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Obsah rozbaľovacieho panela podľa návrhu:
 *  - kategórie (položky s vlastným podmenu) = stĺpce s nadpismi cez celú šírku,
 *  - bez kategórií = zoznam odkazov vľavo,
 *  - položky s obrázkom = karty vpravo.
 */
const PanelMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void }> = ({ polozka, zavriet }) => {
  const deti = polozka.deti ?? [];
  const kategorie = deti.filter((d) => (d.deti?.length ?? 0) > 0);
  const karty = deti.filter((d) => !d.deti?.length && d.obrazok && d.odkaz);
  const odkazy = deti.filter((d) => !d.deti?.length && !(d.obrazok && d.odkaz));

  return (
    <>
      {kategorie.length > 0 ? (
        // Mriežka má vždy štyri stĺpce ako v návrhu - pri menej kategóriách ostanú vľavo
        <div className="kl-panel__stlpce" style={{ '--kl-stlpcov': karty.length > 0 ? 3 : 4 } as React.CSSProperties}>
          {odkazy.length > 0 && (
            <div className="kl-panel__stlpec">
              {odkazy.map((d) => (
                <OdkazMenu key={d.id} polozka={d} className="kl-panel__odkaz" onClick={zavriet} />
              ))}
            </div>
          )}
          {kategorie.map((k) => (
            <div key={k.id} className="kl-panel__stlpec">
              <OdkazMenu polozka={k} className="kl-panel__nadpis" onClick={zavriet} />
              {(k.deti ?? []).map((v) => (
                <OdkazMenu key={v.id} polozka={v} className="kl-panel__odkaz" onClick={zavriet} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        odkazy.length > 0 && <ZoznamOdkazov odkazy={odkazy} zavriet={zavriet} />
      )}
      {karty.length > 0 && (
        <div className="kl-panel__karty">
          {karty.slice(0, 3).map((d) => (
            <KartaMenu key={d.id} polozka={d} zavriet={zavriet} />
          ))}
        </div>
      )}
    </>
  );
};

export const Hlavicka: React.FC = () => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const [posunute, setPosunute] = useState(false);
  const [otvorene, setOtvorene] = useState<PolozkaMenu['id'] | null>(null);
  const [mobilneMenu, setMobilneMenu] = useState(false);
  const casovac = useRef<number>();
  const jeUvod = pathname === '/';

  useEffect(() => {
    const zmena = () => setPosunute(window.scrollY > 20);
    zmena();
    window.addEventListener('scroll', zmena, { passive: true });
    return () => window.removeEventListener('scroll', zmena);
  }, []);

  // Po prechode na inú stránku sa menu zatvoria
  useEffect(() => {
    setOtvorene(null);
    setMobilneMenu(false);
  }, [pathname]);

  // Spodná navigácia otvára to isté menu
  useEffect(() => {
    const otvor = () => setMobilneMenu(true);
    window.addEventListener('kl:menu', otvor);
    return () => window.removeEventListener('kl:menu', otvor);
  }, []);

  useEffect(() => () => window.clearTimeout(casovac.current), []);

  const otvor = (id: PolozkaMenu['id']) => {
    window.clearTimeout(casovac.current);
    setOtvorene(id);
  };
  // Krátke oneskorenie, aby sa panel nezavrel pri presune myši z odkazu na panel
  const zavriSOneskorenim = () => {
    window.clearTimeout(casovac.current);
    casovac.current = window.setTimeout(() => setOtvorene(null), 180);
  };
  const zavri = useCallback(() => setOtvorene(null), []);

  useEffect(() => {
    if (otvorene === null) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOtvorene(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [otvorene]);

  const plna = posunute || otvorene !== null || !jeUvod;

  return (
    <>
      <header className={`kl-hlavicka${plna ? ' is-plna' : ''}${jeUvod ? ' kl-hlavicka--uvod' : ''}`}>
        <div className="kl-hlavicka__prechod" aria-hidden="true" />
        <div className="kl-hlavicka__pozadie" aria-hidden="true" />
        <nav className="kl-hlavicka__vnutro" aria-label="Hlavné menu">
          <Logo />
          <Link to="/" className="kl-hlavicka__nazov" tabIndex={-1} aria-hidden="true">
            {nastavenia.nazov}
          </Link>
          <div className="kl-menu">
            {polozky.map((p) => {
              const maDeti = (p.deti?.length ?? 0) > 0;
              const jeOtvorene = otvorene === p.id;
              if (!maDeti) {
                return (
                  <OdkazMenu key={p.id} polozka={p} className={`kl-menu__odkaz${jeAktivny(p.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                );
              }
              return (
                <div
                  key={p.id}
                  className={`kl-menu__polozka${jeOtvorene ? ' is-otvorena' : ''}`}
                  onMouseEnter={() => otvor(p.id)}
                  onMouseLeave={zavriSOneskorenim}
                >
                  {p.odkaz ? (
                    // Položka s vlastnou stránkou: názov je odkaz, šípka otvára panel (klávesnica, dotyk)
                    <span className={`kl-menu__odkaz${jeOtvorene || jeAktivny(p.odkaz, pathname) ? ' is-aktivny' : ''}`}>
                      <button
                        type="button"
                        className="kl-menu__prepinac"
                        aria-expanded={jeOtvorene}
                        aria-label={`${p.nazov} - podmenu`}
                        onClick={() => (jeOtvorene ? setOtvorene(null) : otvor(p.id))}
                      >
                        <Ikona nazov="dole" velkost={16} className="kl-menu__sipka" />
                      </button>
                      <OdkazMenu polozka={p} className="kl-menu__nazov" onClick={zavri} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`kl-menu__odkaz${jeOtvorene ? ' is-aktivny' : ''}`}
                      aria-expanded={jeOtvorene}
                      onClick={() => (jeOtvorene ? setOtvorene(null) : otvor(p.id))}
                    >
                      <Ikona nazov="dole" velkost={16} className="kl-menu__sipka" />
                      <span>{p.nazov}</span>
                    </button>
                  )}
                  <div className="kl-panel">
                    <div className="kl-panel__vnutro">
                      <PanelMenu polozka={p} zavriet={zavri} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {tlacidlo && (
            <Odkaz to={tlacidlo.odkaz} className="kl-hlavicka__tlacidlo">
              {tlacidlo.text}
            </Odkaz>
          )}
          <KosikHlavicky />
          {jePrihlaseny() && u.zapnute('ukazat_admin') && (
            <a href="/admin" className="kl-hlavicka__admin" title="Administrácia">
              Admin
            </a>
          )}
          <button type="button" className="kl-hlavicka__hamburger" onClick={() => setMobilneMenu(true)} aria-label="Otvoriť menu" aria-expanded={mobilneMenu}>
            <Ikona nazov="menu" velkost={22} />
          </button>
        </nav>
      </header>
      {mobilneMenu && <MobilneMenu zavriet={() => setMobilneMenu(false)} />}
    </>
  );
};

// ===== Mobilné menu (celá obrazovka) =====

const MobilneMenu: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const [rozbalene, setRozbalene] = useState<PolozkaMenu['id'] | null>(null);
  useZamknutyPosun(true);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && zavriet();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [zavriet]);

  const vsetkyDeti = (p: PolozkaMenu): PolozkaMenu[] => (p.deti ?? []).flatMap((d) => [d, ...(d.deti ?? [])]);

  return (
    <div className="kl-mmenu" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="kl-mmenu__hlava">
        <Logo className="kl-mmenu__logo" onClick={zavriet} />
        <strong>{nastavenia.nazov}</strong>
        <button type="button" className="kl-mmenu__zavriet" onClick={zavriet} aria-label="Zavrieť menu">
          <Ikona nazov="zavriet" velkost={22} />
        </button>
      </div>
      <ul className="kl-mmenu__zoznam">
        {polozky.map((p) => {
          const deti = vsetkyDeti(p);
          const jeRozbalene = rozbalene === p.id;
          return (
            <li key={p.id}>
              {deti.length > 0 ? (
                <>
                  <button
                    type="button"
                    className={`kl-mmenu__odkaz${jeRozbalene ? ' is-rozbalene' : ''}`}
                    aria-expanded={jeRozbalene}
                    onClick={() => setRozbalene(jeRozbalene ? null : p.id)}
                  >
                    <span>{p.nazov}</span>
                    <Ikona nazov="dole" velkost={18} />
                  </button>
                  {jeRozbalene && (
                    <ul className="kl-mmenu__podmenu">
                      {p.odkaz && (
                        <li>
                          <OdkazMenu polozka={p} onClick={zavriet} className="kl-mmenu__pododkaz">
                            {p.nazov} – prehľad
                          </OdkazMenu>
                        </li>
                      )}
                      {deti.map((d) => (
                        <li key={d.id}>
                          <OdkazMenu
                            polozka={d}
                            onClick={zavriet}
                            className={d.odkaz ? `kl-mmenu__pododkaz${jeAktivny(d.odkaz, pathname) ? ' is-aktivny' : ''}` : 'kl-mmenu__kategoria'}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <OdkazMenu polozka={p} onClick={zavriet} className={`kl-mmenu__odkaz${jeAktivny(p.odkaz, pathname) ? ' is-aktivny' : ''}`}>
                  <span>{p.nazov}</span>
                  <Ikona nazov="vpravo" velkost={18} />
                </OdkazMenu>
              )}
            </li>
          );
        })}
      </ul>
      <div className="kl-mmenu__spodok">
        {tlacidlo && (
          <Odkaz to={tlacidlo.odkaz} className="kl-tlacidlo kl-tlacidlo--akcent" onClick={zavriet}>
            {tlacidlo.text}
          </Odkaz>
        )}
        <SocialneIkony />
        {jePrihlaseny() && u.zapnute('ukazat_admin') && (
          <a href="/admin" className="kl-mmenu__admin">
            Administrácia
          </a>
        )}
      </div>
    </div>
  );
};

// ===== Spodná navigácia (mobil) =====

/** Spodné záložky: Domov a Menu sú pevné, prostredné tri sa dajú nastaviť. */
const ZALOZKY: Array<{ nazov: string; odkaz: string; ikona: string; aj?: string[] }> = [
  { nazov: 'Domov', odkaz: '/', ikona: 'domov' },
  { nazov: 'Správy', odkaz: '/clanky', ikona: 'spravy', aj: ['/clanek'] },
  { nazov: 'Zápasy', odkaz: '/matches', ikona: 'zapasy', aj: ['/leagues', '/calendar'] },
  { nazov: 'Tím', odkaz: '/teams', ikona: 'tim', aj: ['/players', '/staff'] },
];

const SpodnaNavigacia: React.FC = () => {
  const { pathname } = useLocation();
  const u = useUpravy();
  // Vlastný odkaz záložky ruší predvolené podadresy (napr. /clanek pri Správach)
  const zalozky = ZALOZKY.map((z, i) => {
    if (i === 0) return z;
    const odkaz = u.text(`zalozka_${i + 1}_odkaz`, z.odkaz);
    return { ...z, nazov: u.text(`zalozka_${i + 1}_nazov`, z.nazov), odkaz, aj: odkaz === z.odkaz ? z.aj : [] };
  });
  const aktivna = (z: (typeof ZALOZKY)[number]) =>
    z.odkaz === '/' ? pathname === '/' : [z.odkaz, ...(z.aj ?? [])].some((o) => pathname === o || pathname.startsWith(`${o}/`));
  return (
    <nav className="kl-zalozky" aria-label="Rýchla navigácia">
      {zalozky.map((z) =>
        z.odkaz.startsWith('/') ? (
          <Link key={z.nazov + z.odkaz} to={z.odkaz} className={`kl-zalozky__polozka${aktivna(z) ? ' is-aktivna' : ''}`} aria-current={aktivna(z) ? 'page' : undefined}>
            <Ikona nazov={z.ikona} velkost={22} />
            <span>{z.nazov}</span>
          </Link>
        ) : (
          <a key={z.nazov + z.odkaz} href={z.odkaz} className="kl-zalozky__polozka" target="_blank" rel="noopener noreferrer">
            <Ikona nazov={z.ikona} velkost={22} />
            <span>{z.nazov}</span>
          </a>
        )
      )}
      <button type="button" className="kl-zalozky__polozka" onClick={() => window.dispatchEvent(new Event('kl:menu'))}>
        <Ikona nazov="menu" velkost={22} />
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

const SocialneIkony: React.FC = () => {
  const siete = useSiete();
  if (siete.length === 0) return null;
  return (
    <div className="kl-siete">
      {siete.map((s) => (
        <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.nazov} title={s.nazov}>
          {s.skratka}
        </a>
      ))}
    </div>
  );
};

// ===== Pätička =====

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<NastaveniaRozlozenia>();
  const u = useUpravy();
  const { polozky } = useMenuWebu();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const gdpr = nastavenia.gdpr ?? {};
  const text = s.paticka_text || nastavenia.slogan || nastavenia.meta_popis;
  const fanshop = nastavenia.eshop?.zapnuty ? '/obchod' : (s.fanshop_odkaz || '').trim();

  return (
    <footer className="kl-paticka">
      <div className="kl-kontajner">
        <div className="kl-paticka__stlpce">
          <div className="kl-paticka__klub">
            {nastavenia.logo ? (
              <img src={souborUrl(nastavenia.logo)} alt={nastavenia.nazov} className="kl-paticka__logo" />
            ) : (
              <strong className="kl-paticka__nazov">{nastavenia.nazov}</strong>
            )}
            {text && <p>{text}</p>}
            {u.zapnute('ukazat_siete_paticka') && <SocialneIkony />}
          </div>
          <div className="kl-paticka__stlpec">
            <h2>{u.text('paticka_klub', 'Klub')}</h2>
            {polozky.slice(0, 5).map((p) => (
              <OdkazMenu key={p.id} polozka={p} />
            ))}
          </div>
          <div className="kl-paticka__stlpec">
            <h2>{u.text('paticka_obsah', 'Obsah')}</h2>
            <Link to="/matches">Zápasy</Link>
            <Link to="/clanky">Články</Link>
            <Link to="/videa">Videá</Link>
            <Link to="/galleries">Fotogalérie</Link>
            {fanshop && <Odkaz to={fanshop}>Obchod</Odkaz>}
          </div>
          <div className="kl-paticka__stlpec">
            <h2>{u.text('paticka_kontakt', 'Kontakt')}</h2>
            {kontakt.email && <a href={`mailto:${kontakt.email}`}>Napíšte nám</a>}
            {kontakt.telefon && <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>{kontakt.telefon}</a>}
            {kontakt.adresa && <span>{kontakt.adresa}</span>}
            <Link to="/sponzori">Partneri</Link>
            <Link to="/dokumenty">Dokumenty</Link>
          </div>
        </div>
        <div className="kl-paticka__spodok">
          <span>
            © {new Date().getFullYear()} {nastavenia.nazov}. {u.text('paticka_copyright', 'Všetky práva vyhradené.')}
          </span>
          <div className="kl-paticka__pravne">
            {gdpr.odkaz_zasad && <a href={gdpr.odkaz_zasad}>Ochrana osobných údajov</a>}
            <button type="button" onClick={otvorNastaveniaCookies}>
              Nastavenia cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
