// Umiestnenie: sablony/arena/src/Rozlozenie.tsx
// Kostra šablóny Aréna - úplne iná kostra ako ostatné šablóny.
//
// Namiesto hlavičky naprieč stránkou je naľavo pevný bočný panel ako
// v športovej aplikácii: erb a názov klubu, vyhľadávanie, navigácia
// s rozbaľovacími skupinami, najbližší zápas s odpočtom dní, tlačidlo
// vstupeniek a siete. Obsah je napravo na svetlom podklade, nad ním
// tenká lišta s dátumom, rýchlymi odkazmi a košíkom. Pätička je
// kompaktná karta s partnermi a kontaktom. Na mobile sa bočný panel
// vysúva zľava, hore je lišta s erbom a tlačidlom menu.

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
} from '@clubw/jadro';
import {
  Erb,
  Ikona,
  Odkaz,
  logoStrany,
  maVysledok,
  stavZapasu,
  cas,
  datum,
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
  const text = u.text('tlacidlo_text', 'Vstupenky');
  const odkaz = String(u.s.tlacidlo_odkaz || '').trim() || (nastavenia.kontakt?.email ? `mailto:${nastavenia.kontakt.email}` : '');
  return text && odkaz ? { text, odkaz } : null;
};

/** Zabráni posúvaniu stránky pod otvoreným panelom. */
const useZamknutyPosun = (zamknuty: boolean) => {
  useEffect(() => {
    if (!zamknuty) return;
    document.body.classList.add('ar-bez-posunu');
    return () => document.body.classList.remove('ar-bez-posunu');
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

  const pismo = typeof u.s.pismo === 'string' && u.s.pismo ? ` ar--pismo-${u.s.pismo}` : '';
  const rohy = typeof u.s.zaoblenie === 'string' && u.s.zaoblenie ? ` ar--rohy-${u.s.zaoblenie}` : '';

  return (
    <div className={`ar${jeUvod ? ' ar--uvod' : ''}${pismo}${rohy}`}>
      <a href="#ar-obsah" className="ar-preskocit">
        Preskočiť na obsah
      </a>
      <Cast nazov="Hlavicka" />
      <main id="ar-obsah" className="ar-obsah">
        {children}
      </main>
      <Cast nazov="Paticka" />
    </div>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="ar-nacitava" role="status">
    <span aria-hidden="true" />
    Načítavam…
  </div>
);

// ===== Erb =====

const ZnakKlubu: React.FC = () => {
  const { nastavenia } = useNastavenia();
  return nastavenia.logo ? <img src={souborUrl(nastavenia.logo)} alt="" /> : <span className="ar-logo__znak">{(nastavenia.skratka || nastavenia.nazov).slice(0, 3)}</span>;
};

const Logo: React.FC<{ className?: string; onClick?: () => void }> = ({ className = 'ar-logo', onClick }) => {
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

export const SocialneSiete: React.FC<{ className?: string; velkost?: number }> = ({ className = 'ar-siete', velkost }) => {
  const siete = useSiete();
  if (siete.length === 0) return null;
  return (
    <div className={className}>
      {siete.map((s) => (
        <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer" className="ar-siete__odkaz" aria-label={s.nazov} title={s.nazov}>
          <IkonaSiete kluc={s.kluc} velkost={velkost} />
        </a>
      ))}
    </div>
  );
};

// ===== Bočný panel =====

/** Najbližší zápas hlavného tímu v bočnom paneli. */
const ZapasPanela: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const { nastavenia } = useNastavenia();
  const { hlavny } = useHlavnyTim();
  const zive = useApi<Zapas[]>(hlavny ? `/matches?tim_id=${hlavny.id}&status=prebieha&limit=1` : null);
  const buduce = useApi<Zapas[]>(hlavny ? `/matches?tim_id=${hlavny.id}&status=naplanovany&od_datumu=${dnes()}&poradie=asc&limit=3` : null);
  const z = zive.data?.[0] ?? [...(buduce.data ?? [])].sort(podlaCasu)[0];
  if (!z) return null;
  const zivy = stavZapasu(z) === 'prebieha';
  const dni = Math.ceil((new Date(z.datum_cas.replace(' ', 'T')).getTime() - Date.now()) / 86400000);
  return (
    <Link to={`/matches/${z.id}`} className="ar-bok__zapas" onClick={zavriet}>
      <span className="ar-bok__zhlava">
        <span>{zivy ? 'Práve sa hrá' : 'Najbližší zápas'}</span>
        {zivy ? <b className="ar-live">Live</b> : dni >= 0 && <b>{dni === 0 ? 'Dnes' : dni === 1 ? 'Zajtra' : `o ${dni} dní`}</b>}
      </span>
      <span className="ar-bok__ztimy">
        {(['domaci', 'hostia'] as const).map((strana) => (
          <span key={strana} className="ar-bok__ztim">
            <Erb nazov={strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} />
            <span>{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</span>
            {zivy && maVysledok(z) && <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>}
          </span>
        ))}
      </span>
      <span className="ar-bok__zkedy">
        {denVTyzdni(z.datum_cas)} {datumKratky(z.datum_cas)} · <strong>{cas(z.datum_cas)}</strong>
      </span>
    </Link>
  );
};

/** Vyhľadávanie v bočnom paneli - výsledky sa ukazujú pod poľom počas písania. */
const HladaniePanela: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const dotaz = text.trim();
  const { vysledky, nacitava } = useHladanie(dotaz.length >= 2 ? text : '', 3);
  const odoslat = () => {
    zavriet();
    setText('');
    navigate(dotaz ? `/hladat?q=${encodeURIComponent(dotaz)}` : '/hladat');
  };
  return (
    <div className="ar-bok__hladanie">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          odoslat();
        }}
      >
        <Ikona nazov="hladat" velkost={16} />
        <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hľadať…" aria-label="Hľadať na webe" maxLength={100} />
        <kbd aria-hidden="true">↵</kbd>
      </form>
      {dotaz.length >= 2 && (
        <div className="ar-bok__vysledky" aria-live="polite">
          {nacitava && vysledky.length === 0 && <span className="ar-bok__stav">Hľadám…</span>}
          {!nacitava && vysledky.length === 0 && <span className="ar-bok__stav">Nič sme nenašli</span>}
          {vysledky.slice(0, 6).map((v) => (
            <Odkaz
              key={`${v.typ}-${v.id}`}
              to={v.odkaz}
              className="ar-bok__vysledok"
              onClick={() => {
                setText('');
                zavriet();
              }}
            >
              <strong>{v.nazov}</strong>
              {v.popis && <small>{v.popis}</small>}
            </Odkaz>
          ))}
          {vysledky.length > 0 && (
            <button type="button" className="ar-bok__vsetky" onClick={odoslat}>
              Všetky výsledky
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/** Navigácia: položky s podmenu sa rozbaľujú priamo v paneli (aj tretia úroveň). */
const Navigacia: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const { polozky } = useMenuWebu();
  const { pathname } = useLocation();
  const [rozbalene, setRozbalene] = useState<PolozkaMenu['id'] | null>(() => polozky.find((p) => (p.deti ?? []).some((d) => jeAktivnaPolozka(d, pathname)))?.id ?? null);
  useEffect(() => {
    const aktivna = polozky.find((p) => (p.deti ?? []).some((d) => jeAktivnaPolozka(d, pathname)));
    if (aktivna) setRozbalene(aktivna.id);
  }, [pathname, polozky]);

  return (
    <nav className="ar-nav" aria-label="Hlavné menu">
      {polozky.map((p) => {
        const deti = (p.deti ?? []).filter((d) => d.typ !== 'clanky');
        const aktivna = jeAktivnaPolozka(p, pathname);
        const jeRozbalene = rozbalene === p.id;
        if (deti.length === 0) {
          return (
            <OdkazMenu key={p.id} polozka={{ ...p, deti: [] }} className={`ar-nav__odkaz${jeAktivny(p.odkaz, pathname) ? ' is-aktivny' : ''}`} onClick={zavriet}>
              <span className="ar-nav__znak" aria-hidden="true">
                {p.nazov.charAt(0)}
              </span>
              <span>{p.nazov}</span>
            </OdkazMenu>
          );
        }
        return (
          <div key={p.id} className={`ar-nav__skupina${jeRozbalene ? ' is-rozbalena' : ''}${aktivna ? ' is-aktivna' : ''}`}>
            <button type="button" className="ar-nav__odkaz" aria-expanded={jeRozbalene} onClick={() => setRozbalene(jeRozbalene ? null : p.id)}>
              <span className="ar-nav__znak" aria-hidden="true">
                {p.nazov.charAt(0)}
              </span>
              <span>{p.nazov}</span>
              <Ikona nazov="dole" velkost={10} className="ar-nav__sipka" />
            </button>
            {jeRozbalene && (
              <div className="ar-nav__podmenu">
                {p.odkaz && (
                  <OdkazMenu polozka={{ ...p, deti: [] }} className={`ar-nav__pododkaz${jeAktivny(p.odkaz, pathname) ? ' is-aktivny' : ''}`} onClick={zavriet}>
                    Prehľad
                  </OdkazMenu>
                )}
                {deti.map((d) =>
                  d.deti?.length ? (
                    <div key={d.id} className="ar-nav__kategoria">
                      <span>{d.nazov}</span>
                      {d.deti.map((v) => (
                        <OdkazMenu key={v.id} polozka={v} className={`ar-nav__pododkaz${jeAktivny(v.odkaz, pathname) ? ' is-aktivny' : ''}`} onClick={zavriet} />
                      ))}
                    </div>
                  ) : (
                    <OdkazMenu key={d.id} polozka={d} className={`ar-nav__pododkaz${jeAktivny(d.odkaz, pathname) ? ' is-aktivny' : ''}`} onClick={zavriet} />
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

const KosikHlavicky: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { nastavenia } = useNastavenia();
  const { pocet } = useKosik();
  const u = useUpravy();
  if (!nastavenia.eshop?.zapnuty || !u.zapnute('ukazat_kosik')) return null;
  return (
    <Link to="/kosik" className="ar-ikona-tl" aria-label={pocet ? `Košík, ${pocet} ks` : 'Košík'} onClick={onClick}>
      <Ikona nazov="kosik" velkost={19} />
      {pocet > 0 && <span className="ar-ikona-tl__pocet">{pocet > 99 ? '99+' : pocet}</span>}
    </Link>
  );
};

const DNI = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];

/** Hlavička šablóny = bočný panel + tenká lišta nad obsahom (na mobile lišta s erbom). */
export const Hlavicka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const [otvoreny, setOtvoreny] = useState(false);
  useZamknutyPosun(otvoreny);
  const zavriet = useCallback(() => setOtvoreny(false), []);
  const podnadpis = u.zapnute('ukazat_podnadpis') ? u.text('hlavicka_podnadpis', '') || nastavenia.slogan || '' : '';
  const odkazy = [1, 2, 3]
    .map((i) => ({ text: u.text(`lista_odkaz_${i}_text`, ''), odkaz: String(u.s[`lista_odkaz_${i}`] || '').trim() }))
    .filter((o) => o.text && o.odkaz);
  const dnesny = new Date();

  useEffect(() => setOtvoreny(false), [pathname]);
  useEffect(() => {
    if (!otvoreny) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOtvoreny(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [otvoreny]);

  return (
    <>
      <aside className={`ar-bok${otvoreny ? ' is-otvoreny' : ''}`} aria-label="Navigácia webu">
        <div className="ar-bok__vnutro">
          <div className="ar-bok__hlava">
            <Link to="/" className="ar-bok__klub" aria-label={`${nastavenia.nazov} - úvodná stránka`} onClick={zavriet}>
              <span className="ar-bok__erb">
                <ZnakKlubu />
              </span>
              <span className="ar-bok__nazov">
                <strong>{nastavenia.nazov}</strong>
                {podnadpis && <small>{podnadpis}</small>}
              </span>
            </Link>
            <button type="button" className="ar-ikona-tl ar-bok__zavriet" onClick={zavriet} aria-label="Zavrieť menu">
              <Ikona nazov="zavriet" velkost={20} />
            </button>
          </div>
          {u.zapnute('ukazat_hladanie') && <HladaniePanela zavriet={zavriet} />}
          <Navigacia zavriet={zavriet} />
          <div className="ar-bok__spodok">
            {u.zapnute('panel_zapas') && <ZapasPanela zavriet={zavriet} />}
            {tlacidlo && (
              <Odkaz to={tlacidlo.odkaz} className="ar-tlacidlo ar-tlacidlo--akcent ar-bok__cta" onClick={zavriet}>
                {tlacidlo.text}
                <Ikona nazov="sipka" velkost={14} />
              </Odkaz>
            )}
            <div className="ar-bok__riadok">
              <SocialneSiete className="ar-siete ar-siete--panel" velkost={15} />
              {jePrihlaseny() && u.zapnute('ukazat_admin') && (
                <a href="/admin" className="ar-bok__admin">
                  Admin
                </a>
              )}
            </div>
          </div>
        </div>
      </aside>
      {otvoreny && <button type="button" className="ar-bok__pozadie" onClick={zavriet} aria-label="Zavrieť menu" tabIndex={-1} />}
      <header className="ar-lista">
        <button type="button" className="ar-ikona-tl ar-lista__menu" onClick={() => setOtvoreny(true)} aria-label="Otvoriť menu" aria-expanded={otvoreny}>
          <Ikona nazov="menu" velkost={22} />
        </button>
        <Link to="/" className="ar-lista__klub" aria-label={`${nastavenia.nazov} - úvodná stránka`}>
          <span className="ar-lista__erb">
            <ZnakKlubu />
          </span>
          <strong>{nastavenia.nazov}</strong>
        </Link>
        <span className="ar-lista__datum">
          <b>{DNI[dnesny.getDay()]}</b> {dnesny.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        {odkazy.length > 0 && (
          <nav className="ar-lista__odkazy" aria-label="Rýchle odkazy">
            {odkazy.map((o) => (
              <Odkaz key={o.odkaz + o.text} to={o.odkaz}>
                {o.text}
              </Odkaz>
            ))}
          </nav>
        )}
        <div className="ar-lista__nastroje">
          <KosikHlavicky />
          {tlacidlo && (
            <Odkaz to={tlacidlo.odkaz} className="ar-tlacidlo ar-tlacidlo--tmave ar-lista__cta">
              {tlacidlo.text}
            </Odkaz>
          )}
        </div>
      </header>
    </>
  );
};

// ===== Pätička =====

/** Partneri ako pyramída podľa úrovní partnerstva - na každej stránke okrem nákupu. */
const PartneriPaticky: React.FC = () => {
  const u = useUpravy();
  const { pathname } = useLocation();
  const zapnute = u.zapnute('ukazat_partnerov') && !['/sponzori', '/kosik', '/pokladna', '/objednavka'].some((c) => pathname.startsWith(c));
  const partneri = useApi<Partner[]>(zapnute ? '/sponsors?limit=500' : null);
  const zoznam = partneri.data ?? [];
  if (!zapnute || zoznam.length === 0) return null;
  return (
    <section className="ar-ppartneri" aria-labelledby="ar-ppartneri-nadpis">
      <div className="ar-ppartneri__hlava">
        <h2 id="ar-ppartneri-nadpis">{u.text('partneri_nadpis', 'Partneri klubu')}</h2>
        <Link to="/sponzori" className="ar-odkaz-sipka">
          {u.text('text_vsetci_partneri', 'Všetci partneri')}
          <Ikona nazov="sipka" velkost={14} />
        </Link>
      </div>
      <RadyPartnerov partneri={zoznam} />
    </section>
  );
};

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const gdpr = nastavenia.gdpr ?? {};
  const text = String(u.s.paticka_text || '').trim() || nastavenia.slogan || nastavenia.meta_popis;
  const rok = new Date().getFullYear();
  const zalozeny = u.text('paticka_zalozeny', '');

  return (
    <footer className="ar-paticka">
      <PartneriPaticky />
      <div className="ar-paticka__karta">
        <div className="ar-paticka__klub">
          <Logo className="ar-logo ar-paticka__logo" />
          <div>
            <strong>{nastavenia.nazov}</strong>
            {(zalozeny || text) && <p>{[zalozeny, text].filter(Boolean).join(' · ')}</p>}
          </div>
        </div>
        <div className="ar-paticka__kontakt">
          {kontakt.adresa && (
            <span>
              <Ikona nazov="miesto" velkost={15} />
              {kontakt.adresa}
            </span>
          )}
          {kontakt.telefon && (
            <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>
              <Ikona nazov="telefon" velkost={15} />
              {kontakt.telefon}
            </a>
          )}
          {kontakt.email && (
            <a href={`mailto:${kontakt.email}`}>
              <Ikona nazov="mail" velkost={15} />
              {kontakt.email}
            </a>
          )}
        </div>
        {u.zapnute('ukazat_siete_paticka') && <SocialneSiete className="ar-siete ar-siete--paticka" velkost={16} />}
      </div>
      <div className="ar-paticka__spodok">
        <span>
          © {rok} {nastavenia.nazov}. {u.text('paticka_copyright', 'Všetky práva vyhradené.')}
        </span>
        <span className="ar-paticka__pravne">
          <Link to="/dokumenty">Dokumenty</Link>
          {gdpr.odkaz_zasad && <Odkaz to={gdpr.odkaz_zasad}>Ochrana osobných údajov</Odkaz>}
          <button type="button" onClick={otvorNastaveniaCookies}>
            Nastavenia cookies
          </button>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Na začiatok ↑
          </button>
        </span>
      </div>
    </footer>
  );
};
