// Umiestnenie: sablony/zakladna/src/Rozlozenie.tsx
// Rozloženie základnej šablóny: horná lišta, hlavička s menu, obsah, pätička.
//
// Hlavička a pätička sa vykresľujú cez <Cast>, takže šablóna, ktorá
// nahradí len hlavičku, dostane zvyšok rozloženia odtiaľto. Vzhľad je
// v triedach zk-* (Rozlozenie.css) - šablóna len so štýlom ich môže
// prepísať bez jediného riadku skriptu.
//
// Identita: farba klubu ako pás nad hlavičkou a v pätičke, písmo Barlow
// Condensed na nadpisy a Manrope na text, zaoblené karty s jemným tieňom.

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
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
  useRegistracia,
} from '@clubw/jadro';
import { Ikona } from './ikony';
import './Rozlozenie.css';

/** Prepínač zo šablóny - chýbajúca hodnota znamená zapnuté. */
export const zapnute = (s: Record<string, unknown>, kluc: string) => s[kluc] !== false;

/** Erb klubu: logo, alebo skratka v kruhu farby klubu. */
export const ErbKlubu: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { nastavenia } = useNastavenia();
  return nastavenia.logo ? (
    <img src={souborUrl(nastavenia.logo)} alt="" className={`zk-erb ${className}`} />
  ) : (
    <span className={`zk-erb zk-erb--znak ${className}`} aria-hidden="true">
      {nastavenia.skratka || nastavenia.nazov.slice(0, 2).toUpperCase()}
    </span>
  );
};

/** Sociálne siete klubu v poradí, v akom sa zobrazujú. */
export const useSiete = (): Array<[string, string, string]> => {
  const { nastavenia } = useNastavenia();
  const s = nastavenia.socialne_siete ?? {};
  return (
    [
      ['facebook', 'Facebook', s.facebook],
      ['instagram', 'Instagram', s.instagram],
      ['youtube', 'YouTube', s.youtube],
      ['x', 'X', s.x],
      ['tiktok', 'TikTok', s.tiktok],
    ] as Array<[string, string, string | null | undefined]>
  ).filter((x): x is [string, string, string] => Boolean(x[2]));
};

export const Rozlozenie: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="zk">
    <a href="#zk-obsah" className="zk-preskocit">
      Preskočiť na obsah
    </a>
    <Cast nazov="Hlavicka" />
    <main id="zk-obsah" className="zk-obsah">
      {children}
    </main>
    <Cast nazov="Paticka" />
  </div>
);

export const Hlavicka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony();
  const { polozky } = useMenuWebu();
  const siete = useSiete();
  const [otvorene, setOtvorene] = useState(false);
  // Na mobile je rozbalená najviac jedna skupina podmenu
  const [rozbalene, setRozbalene] = useState<string | number | null>(null);
  const [posunute, setPosunute] = useState(false);
  const hlavickaRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const tlacidloText = String(s.tlacidlo_text || '').trim();
  const tlacidloOdkaz = String(s.tlacidlo_odkaz || '').trim();
  const lista = zapnute(s, 'ukazat_listu') && Boolean(kontakt.email || kontakt.telefon || siete.length);

  // Po prechode na inú stránku sa mobilné menu zavrie
  useEffect(() => setOtvorene(false), [pathname]);

  // Pri otvorenom mobilnom menu sa stránka pod ním neposúva. Hlavička sa
  // najprv prilepí hore (horná lišta odíde), aby menu siahalo po spodok.
  useEffect(() => {
    const lista = hlavickaRef.current?.offsetTop ?? 0;
    if (otvorene && window.scrollY < lista) window.scrollTo({ top: lista });
    document.body.style.overflow = otvorene ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [otvorene]);

  useEffect(() => {
    const naPosun = () => setPosunute(window.scrollY > 12);
    naPosun();
    window.addEventListener('scroll', naPosun, { passive: true });
    return () => window.removeEventListener('scroll', naPosun);
  }, []);

  const aktivny = (odkaz?: string | null) =>
    Boolean(odkaz) && (odkaz === '/' ? pathname === '/' : pathname === odkaz || pathname.startsWith(`${odkaz}/`));

  return (
    <>
      {lista && (
        <div className="zk-lista">
          <div className="zk-lista__vnutro">
            <div className="zk-lista__kontakt">
              {kontakt.email && (
                <a href={`mailto:${kontakt.email}`}>
                  <Ikona nazov="email" />
                  {kontakt.email}
                </a>
              )}
              {kontakt.telefon && (
                <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>
                  <Ikona nazov="telefon" />
                  {kontakt.telefon}
                </a>
              )}
            </div>
            {siete.length > 0 && (
              <div className="zk-lista__siete">
                {siete.map(([kluc, nazov, url]) => (
                  <a key={kluc} href={url} target="_blank" rel="noopener noreferrer" aria-label={nazov}>
                    <Ikona nazov={kluc} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <header ref={hlavickaRef} className={`zk-hlavicka${posunute ? ' is-posunuta' : ''}`}>
        <div className="zk-hlavicka__vnutro">
          <Link to="/" className="zk-logo">
            <ErbKlubu className="zk-logo__erb" />
            <span className="zk-logo__text">
              <span className="zk-logo__nazov">{nastavenia.nazov}</span>
              {nastavenia.slogan && <span className="zk-logo__slogan">{nastavenia.slogan}</span>}
            </span>
          </Link>

          <nav id="zk-menu" className={`zk-menu${otvorene ? ' is-otvorene' : ''}`} aria-label="Hlavné menu">
            {polozky.map((p) => (
              <div key={p.id} className={`zk-menu__polozka${(p.deti?.length ?? 0) > 0 ? ' ma-podmenu' : ''}${rozbalene === p.id ? ' is-rozbalene' : ''}`}>
                {!p.odkaz && (p.deti?.length ?? 0) > 0 ? (
                  // Skupina bez vlastnej stránky - ťuknutie na názov ju na mobile rozbalí
                  <button type="button" className="zk-menu__odkaz zk-menu__odkaz--skupina" onClick={() => setRozbalene((r) => (r === p.id ? null : p.id))}>
                    {p.nazov}
                  </button>
                ) : (
                  <OdkazMenu polozka={p} className={`zk-menu__odkaz${aktivny(p.odkaz) ? ' is-aktivny' : ''}`} />
                )}
                {(p.deti?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    className="zk-menu__rozbalit"
                    aria-expanded={rozbalene === p.id}
                    aria-label={`${rozbalene === p.id ? 'Zbaliť' : 'Rozbaliť'} ${p.nazov}`}
                    onClick={() => setRozbalene((r) => (r === p.id ? null : p.id))}
                  >
                    <Ikona nazov="dole" />
                  </button>
                )}
                {(p.deti?.length ?? 0) > 0 && (
                  <div className="zk-menu__podmenu">
                    {p.deti!.flatMap((d) => [d, ...(d.deti ?? [])]).map((d) => (
                      <OdkazMenu key={d.id} polozka={d} className={d.odkaz ? 'zk-menu__pododkaz' : 'zk-menu__kategoria'} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="zk-menu__mobil">
              <Link to="/moj-klub" className="zk-tlacidlo zk-tlacidlo--obrys">
                <Ikona nazov="ucet" /> Môj klub
              </Link>
              {jePrihlaseny() && (
                <Link to="/admin" className="zk-tlacidlo zk-tlacidlo--obrys">
                  Administrácia
                </Link>
              )}
            </div>
          </nav>

          <div className="zk-akcie">
            <Link to="/hladat" className="zk-akcia" aria-label="Hľadať">
              <Ikona nazov="hladat" />
            </Link>
            {nastavenia.eshop?.zapnuty && <OdkazKosika />}
            <Link to="/moj-klub" className={`zk-akcia zk-akcia--ucet${pathname.startsWith('/moj-klub') ? ' is-aktivny' : ''}`} aria-label="Môj klub">
              <Ikona nazov="ucet" />
            </Link>
            {jePrihlaseny() && (
              <Link to="/admin" className="zk-akcia zk-akcia--admin">
                Admin
              </Link>
            )}
            {tlacidloText && tlacidloOdkaz && (
              <OdkazAleboOdkazVon odkaz={tlacidloOdkaz} className="zk-tlacidlo zk-akcie__tlacidlo">
                {tlacidloText}
              </OdkazAleboOdkazVon>
            )}
            <button
              type="button"
              className="zk-akcia zk-menu-tlacidlo"
              aria-expanded={otvorene}
              aria-controls="zk-menu"
              onClick={() => setOtvorene((o) => !o)}
            >
              <Ikona nazov={otvorene ? 'zavriet' : 'menu'} />
              <span className="zk-skryte">Menu</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

/** Interný odkaz cez router, externý do novej karty. */
export const OdkazAleboOdkazVon: React.FC<{ odkaz: string; className?: string; children: ReactNode }> = ({ odkaz, className, children }) =>
  /^https?:\/\//.test(odkaz) ? (
    <a href={odkaz} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link to={odkaz} className={className}>
      {children}
    </Link>
  );

/** Košík v hlavičke - zobrazí sa, len keď je obchod zapnutý. */
const OdkazKosika: React.FC = () => {
  const { pocet } = useKosik();
  return (
    <Link to="/kosik" className="zk-akcia" aria-label={`Košík${pocet ? ` (${pocet})` : ''}`}>
      <Ikona nazov="kosik" />
      {pocet > 0 && <span className="zk-akcia__pocet">{pocet}</span>}
    </Link>
  );
};

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { polozky } = useMenuWebu();
  const siete = useSiete();
  const reg = useRegistracia();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const udaje = nastavenia.udaje;
  const gdpr = nastavenia.gdpr ?? {};
  const registracia = reg.typy.fanusik || reg.typy.clen;

  return (
    <footer className="zk-paticka">
      <div className="zk-paticka__vnutro">
        <div className="zk-paticka__klub">
          <Link to="/" className="zk-paticka__logo">
            <ErbKlubu />
            <strong>{nastavenia.nazov}</strong>
          </Link>
          {(nastavenia.slogan || nastavenia.meta_popis) && <p>{nastavenia.slogan || nastavenia.meta_popis}</p>}
          {nastavenia.rok_zalozenia && <p className="zk-paticka__rok">Založený v roku {nastavenia.rok_zalozenia}</p>}
          {siete.length > 0 && (
            <div className="zk-paticka__siete">
              {siete.map(([kluc, nazov, url]) => (
                <a key={kluc} href={url} target="_blank" rel="noopener noreferrer" aria-label={nazov}>
                  <Ikona nazov={kluc} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="zk-paticka__nadpis">Menu</h2>
          <div className="zk-paticka__odkazy">
            {polozky.slice(0, 8).map((p) => (
              <OdkazMenu key={p.id} polozka={p} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="zk-paticka__nadpis">Pre fanúšikov</h2>
          <div className="zk-paticka__odkazy">
            <Link to="/moj-klub">Môj klub</Link>
            {registracia && <Link to="/registracia">Registrácia</Link>}
            {nastavenia.eshop?.zapnuty && <Link to="/obchod">Obchod</Link>}
            <Link to="/matches">Zápasy</Link>
            <Link to="/hladat">Hľadať na webe</Link>
          </div>
        </div>

        <div>
          <h2 className="zk-paticka__nadpis">Kontakt</h2>
          <div className="zk-paticka__kontakt">
            {kontakt.email && (
              <a href={`mailto:${kontakt.email}`}>
                <Ikona nazov="email" />
                {kontakt.email}
              </a>
            )}
            {kontakt.telefon && (
              <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>
                <Ikona nazov="telefon" />
                {kontakt.telefon}
              </a>
            )}
            {kontakt.adresa && (
              <span>
                <Ikona nazov="miesto" />
                {kontakt.adresa}
              </span>
            )}
          </div>
          {(udaje?.pravny_nazov || udaje?.ico || udaje?.dic || udaje?.ic_dph || udaje?.iban) && (
            <p className="zk-paticka__udaje">
              {udaje?.pravny_nazov && (
                <>
                  {udaje.pravny_nazov}
                  <br />
                </>
              )}
              {[udaje?.ico && `IČO: ${udaje.ico}`, udaje?.dic && `DIČ: ${udaje.dic}`, udaje?.ic_dph && `IČ DPH: ${udaje.ic_dph}`]
                .filter(Boolean)
                .join(' · ')}
              {udaje?.iban && (
                <>
                  <br />
                  IBAN: {udaje.iban.replace(/(.{4})/g, '$1 ').trim()}
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="zk-paticka__spodok">
        <p>
          &copy; {new Date().getFullYear()} {nastavenia.nazov}. Všetky práva vyhradené.
        </p>
        <p className="zk-paticka__pravne">
          {gdpr.odkaz_zasad && <a href={gdpr.odkaz_zasad}>Ochrana osobných údajov</a>}
          {gdpr.kontakt_zodpovednej_osoby && <span>Zodpovedná osoba: {gdpr.kontakt_zodpovednej_osoby}</span>}
          <button type="button" className="zk-paticka__cookies" onClick={otvorNastaveniaCookies}>
            Nastavenia cookies
          </button>
        </p>
      </div>
    </footer>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="zk-nacitavanie" role="status">
    <span className="zk-nacitavanie__kruh" aria-hidden="true" />
    Načítavam...
  </div>
);
