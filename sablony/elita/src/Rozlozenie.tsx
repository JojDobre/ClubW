// Umiestnenie: sablony/elita/src/Rozlozenie.tsx
// Kostra šablóny Elita - v štýle webov veľkých profesionálnych klubov.
//
// Nad hlavičkou je pás zápasov A tímu (posledné výsledky a najbližšie
// zápasy), ako na weboch klubov najvyšších líg. Hlavička je tmavá lišta
// s erbom v strede, ktorý presahuje jej spodný okraj; položky menu sú
// rozdelené naľavo a napravo od erbu. Pri posúvaní sa lišta prilepí
// a erb sa zmenší do nej. Rozbaľovacie menu je panel cez celú šírku.
// Na mobile a tablete je hamburger a menu vysúvané zľava. Partneri sú
// v pätičke na každej stránke.

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
  cas,
  datum,
  datumKratky,
  dnes,
  logoStrany,
  maVysledok,
  nazovDomacich,
  nazovHosti,
  obrazokUrl,
  skryObrazok,
  stavZapasu,
  useApi,
  useUpravy,
  type Clanok,
  type Partner,
  type Tim,
  type Zapas,
} from './spolocne';

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
    document.body.classList.add('el-bez-posunu');
    return () => document.body.classList.remove('el-bez-posunu');
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

  const pismo = typeof u.s.pismo === 'string' && u.s.pismo ? ` el--pismo-${u.s.pismo}` : '';
  const rohy = typeof u.s.zaoblenie === 'string' && u.s.zaoblenie ? ` el--rohy-${u.s.zaoblenie}` : '';

  return (
    <div className={`el${jeUvod ? ' el--uvod' : ''}${pismo}${rohy}`}>
      <a href="#el-obsah" className="el-preskocit">
        Preskočiť na obsah
      </a>
      <Cast nazov="Hlavicka" />
      <main id="el-obsah" className="el-obsah">
        {children}
      </main>
      <Cast nazov="Paticka" />
    </div>
  );
};

export const Nacitavanie: React.FC = () => (
  <div className="el-nacitava" role="status">
    <span aria-hidden="true" />
    Načítavam…
  </div>
);

// ===== Logo =====

const Logo: React.FC<{ className?: string; onClick?: () => void }> = ({ className = 'el-logo', onClick }) => {
  const { nastavenia } = useNastavenia();
  return (
    <Link to="/" className={className} aria-label={`${nastavenia.nazov} - úvodná stránka`} onClick={onClick}>
      {nastavenia.logo ? (
        <img src={souborUrl(nastavenia.logo)} alt="" />
      ) : (
        <span className="el-logo__znak">{(nastavenia.skratka || nastavenia.nazov).slice(0, 3)}</span>
      )}
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

// ===== Pás zápasov =====

/** Návštevník si pás zápasov môže zavrieť - voľba ostane v prehliadači. */
const KLUC_ZAVRETY_PAS = 'el:pas-zapasov-skryty';
const citajZavretyPas = () => {
  try {
    return window.localStorage.getItem(KLUC_ZAVRETY_PAS) === '1';
  } catch {
    return false;
  }
};

const PasZapasov: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  const { hlavny } = useHlavnyTim();
  const pocet = Math.min(12, Math.max(4, Number(u.s.pas_pocet) || 8));
  const id = hlavny?.id;
  const odohrane = useApi<Zapas[]>(id ? `/matches?tim_id=${id}&status=ukonceny&limit=${Math.ceil(pocet / 2)}` : null);
  const zive = useApi<Zapas[]>(id ? `/matches?tim_id=${id}&status=prebieha&limit=2` : null);
  const buduce = useApi<Zapas[]>(id ? `/matches?tim_id=${id}&status=naplanovany&od_datumu=${dnes()}&poradie=asc&limit=${pocet}` : null);
  const pas = useRef<HTMLDivElement>(null);
  const [kraje, setKraje] = useState({ zaciatok: true, koniec: false });
  const moznoZavriet = u.zapnute('pas_zavriet');
  const [zavrety, setZavrety] = useState(citajZavretyPas);

  const zapasy = useMemo(() => {
    const minule = [...(odohrane.data ?? [])].sort(podlaCasu);
    const dalsie = [...(buduce.data ?? [])].sort(podlaCasu);
    const zoznam = [...minule, ...(zive.data ?? []), ...dalsie];
    // Najviac polovica odohraných, zvyšok budúce
    const odohranych = Math.min(minule.length, Math.max(pocet - dalsie.length - (zive.data?.length ?? 0), Math.ceil(pocet / 3)));
    return zoznam.slice(minule.length - odohranych, minule.length - odohranych + pocet);
  }, [odohrane.data, zive.data, buduce.data, pocet]);
  const prvyBuduci = zapasy.findIndex((z) => stavZapasu(z) !== 'ukonceny');

  const aktualizujKraje = useCallback(() => {
    const el = pas.current;
    if (!el) return;
    setKraje({ zaciatok: el.scrollLeft < 8, koniec: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }, []);

  // Pás začína tesne pred najbližším zápasom - odohrané sú naľavo
  useEffect(() => {
    const el = pas.current;
    if (!el || prvyBuduci < 1) return aktualizujKraje();
    // Vždy na začiatok karty - aj keď pás nejde posunúť až k nej (orezaná je posledná karta vpravo)
    const zaciatky = Array.from(el.children).map((k) => k.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    const ciel = zaciatky[Math.max(0, prvyBuduci - 1)] ?? 0;
    el.scrollLeft = ciel <= max ? ciel : Math.max(0, ...zaciatky.filter((x) => x <= max));
    aktualizujKraje();
  }, [prvyBuduci, zapasy.length, aktualizujKraje]);

  if (zapasy.length === 0 || (moznoZavriet && zavrety)) return null;
  const zavriet = () => {
    setZavrety(true);
    try {
      window.localStorage.setItem(KLUC_ZAVRETY_PAS, '1');
    } catch {
      // Bez úložiska sa pás skryje len do obnovenia stránky
    }
  };
  const posun = (smer: number) => pas.current?.scrollBy({ left: smer * pas.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <div className="el-pas" aria-label="Zápasy">
      <div className="el-pas__vnutro">
        <Link to="/matches" className="el-pas__nadpis">
          <span>Zápasy</span>
          <small>{hlavny?.nazov}</small>
        </Link>
        <button type="button" className="el-pas__sipka" onClick={() => posun(-1)} disabled={kraje.zaciatok} aria-label="Predchádzajúce zápasy">
          <Ikona nazov="vlavo" velkost={14} />
        </button>
        <div className="el-pas__zoznam" ref={pas} onScroll={aktualizujKraje}>
          {zapasy.map((z) => {
            const stav = stavZapasu(z);
            const skore = maVysledok(z) && stav !== 'naplanovany';
            return (
              <Link key={z.id} to={`/matches/${z.id}`} className={`el-pas__zapas${stav === 'prebieha' ? ' is-zivy' : ''}${skore ? ' is-odohrany' : ''}`}>
                <span className="el-pas__info">
                  <span>{z.liga_nazov || 'Zápas'}</span>
                  <b>{stav === 'prebieha' ? 'Live' : skore ? 'Koniec' : `${datumKratky(z.datum_cas)} ${cas(z.datum_cas)}`}</b>
                </span>
                {(['domaci', 'hostia'] as const).map((strana) => (
                  <span key={strana} className="el-pas__tim">
                    <Erb nazov={strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} />
                    <span className="el-pas__nazov">{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</span>
                    {skore && <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>}
                  </span>
                ))}
              </Link>
            );
          })}
        </div>
        <button type="button" className="el-pas__sipka" onClick={() => posun(1)} disabled={kraje.koniec} aria-label="Ďalšie zápasy">
          <Ikona nazov="vpravo" velkost={14} />
        </button>
        {moznoZavriet && (
          <button type="button" className="el-pas__zavriet" onClick={zavriet} aria-label="Skryť pás zápasov" title="Skryť pás zápasov">
            <Ikona nazov="zavriet" velkost={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// ===== Rozbaľovacie menu =====

/** Najnovšie články - položka menu typu „Najnovšie články". */
const ClankyMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void; trieda?: string }> = ({ polozka, zavriet, trieda = 'el-panel__karta' }) => {
  const pocet = Math.min(6, Math.max(1, Number(polozka.pocet) || 2));
  const rubrika = polozka.rubrika_slug ? `&category=${encodeURIComponent(polozka.rubrika_slug)}` : '';
  const clanky = useApi<Clanok[]>(`/articles?limit=${pocet}${rubrika}`);
  return (
    <>
      {(clanky.data ?? []).map((c) => (
        <Link key={c.id} to={`/clanek/${c.slug}`} className={trieda} onClick={zavriet}>
          <span className="el-panel__obrazok">{c.obrazok ? <img src={obrazokUrl(c.obrazok) ?? ''} alt="" loading="lazy" /> : null}</span>
          <span className="el-panel__datum">{datum(c.publikovany_datum || c.vytvoreny)}</span>
          <span className="el-panel__titulok">{c.nazov}</span>
        </Link>
      ))}
    </>
  );
};

/**
 * Mega menu: vľavo farebný blok s názvom sekcie, v strede stĺpce odkazov
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
    <div className="el-kontajner el-panel__vnutro">
      <div className="el-panel__uvod">
        <strong>{polozka.nazov}</strong>
        {polozka.odkaz && (
          <OdkazMenu polozka={{ ...polozka, deti: [] }} className="el-panel__prehlad" onClick={zavriet}>
            Prejsť na sekciu
            <Ikona nazov="sipka" velkost={14} />
          </OdkazMenu>
        )}
      </div>
      <div className="el-panel__stlpce">
        {odkazy.length > 0 && (
          <div className="el-panel__stlpec">
            {odkazy.map((d) => (
              <OdkazMenu key={d.id} polozka={d} className="el-panel__odkaz" onClick={zavriet} />
            ))}
          </div>
        )}
        {kategorie.map((k) => (
          <div key={k.id} className="el-panel__stlpec">
            <OdkazMenu polozka={{ ...k, deti: [] }} className="el-panel__nadpis" onClick={zavriet} />
            {(k.deti ?? []).map((v) => (
              <OdkazMenu key={v.id} polozka={v} className="el-panel__odkaz el-panel__odkaz--maly" onClick={zavriet} />
            ))}
          </div>
        ))}
      </div>
      {(karty.length > 0 || clankove.length > 0) && (
        <div className="el-panel__karty">
          {karty.slice(0, 3).map((d) => (
            <OdkazMenu key={d.id} polozka={d} className="el-panel__karta el-panel__karta--obrazkova" onClick={zavriet}>
              <span className="el-panel__obrazok">
                <img src={obrazokUrl(d.obrazok) ?? ''} alt="" loading="lazy" />
              </span>
              <span className="el-panel__titulok">{d.nazov}</span>
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
    <div className="el-kontajner el-hpanel" role="dialog" aria-label="Vyhľadávanie">
      <form
        className="el-hpanel__pole"
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
        <div className="el-hpanel__vysledky" aria-live="polite">
          {nacitava && vysledky.length === 0 && <p className="el-hpanel__stav">Hľadám…</p>}
          {chyba && <p className="el-hpanel__stav">{chyba}</p>}
          {!nacitava && !chyba && vysledky.length === 0 && <p className="el-hpanel__stav">Pre „{dotaz}“ sme nič nenašli.</p>}
          {skupiny.map((s) => (
            <div key={s.typ} className="el-hpanel__skupina">
              <span className="el-stitok">{s.nazov}</span>
              {s.polozky.map((v) => (
                <Odkaz key={`${v.typ}-${v.id}`} to={v.odkaz} className="el-hpanel__vysledok" onClick={zavriet}>
                  <span className="el-hpanel__nahlad">{v.obrazok ? <img src={obrazokUrl(v.obrazok) ?? ''} alt="" loading="lazy" /> : <Ikona nazov="hladat" velkost={14} />}</span>
                  <span>
                    <strong>{v.nazov}</strong>
                    {v.popis && <small>{v.popis}</small>}
                  </span>
                </Odkaz>
              ))}
            </div>
          ))}
          {vysledky.length > 0 && (
            <button type="button" className="el-hpanel__vsetky" onClick={vsetky}>
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
    <Link to="/kosik" className="el-ikona-tl" aria-label={pocet ? `Košík, ${pocet} ks` : 'Košík'} onClick={onClick}>
      <Ikona nazov="kosik" velkost={19} />
      {pocet > 0 && <span className="el-ikona-tl__pocet">{pocet > 99 ? '99+' : pocet}</span>}
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
  const [zmensena, setZmensena] = useState(false);
  const hlavicka = useRef<HTMLElement>(null);
  const casovac = useRef<number>();
  const velkyErb = u.zapnute('erb_presahuje');

  // Po odrolovaní sa erb zmenší do lišty
  useEffect(() => {
    let ramec = 0;
    const kontrola = () => {
      ramec = 0;
      const hore = hlavicka.current?.getBoundingClientRect().top ?? 1;
      setZmensena(window.scrollY > 40 && hore <= 0);
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

  // Menu rozdelené na dve polovice okolo erbu
  const polovica = Math.ceil(polozky.length / 2);
  const casti = [polozky.slice(0, polovica), polozky.slice(polovica)];

  const odkazMenu = (p: PolozkaMenu) => {
    const maDeti = (p.deti?.length ?? 0) > 0;
    const jeOtvorene = otvorene === p.id;
    const aktivna = jeAktivnaPolozka(p, pathname);
    if (!maDeti) return <OdkazMenu key={p.id} polozka={p} className={`el-menu__odkaz${aktivna ? ' is-aktivny' : ''}`} />;
    return (
      <button
        key={p.id}
        type="button"
        className={`el-menu__odkaz${jeOtvorene ? ' is-otvoreny' : ''}${aktivna ? ' is-aktivny' : ''}`}
        aria-expanded={jeOtvorene}
        onMouseEnter={() => otvor(p.id)}
        onClick={() => (jeOtvorene ? setOtvorene(null) : otvor(p.id))}
      >
        {p.nazov}
        <Ikona nazov="dole" velkost={10} className="el-menu__sipka" />
      </button>
    );
  };

  return (
    <>
      {u.zapnute('ukazat_pas_zapasov') && <PasZapasov />}
      <header
        ref={hlavicka}
        className={`el-hlavicka${zmensena ? ' is-zmensena' : ''}${velkyErb ? ' el-hlavicka--velky-erb' : ''}${otvorene !== null || hladanie ? ' is-otvorena' : ''}`}
      >
        <div className="el-kontajner el-hlavicka__vnutro" onMouseLeave={zavriSOneskorenim}>
          <div className="el-hlavicka__nastroje">
            <button type="button" className="el-ikona-tl el-hlavicka__hamburger" onClick={() => setMobilneMenu(true)} aria-label="Otvoriť menu" aria-expanded={mobilneMenu}>
              <Ikona nazov="menu" velkost={22} />
              <span>Menu</span>
            </button>
            {u.zapnute('ukazat_hladanie') && (
              <button type="button" className={`el-ikona-tl el-hlavicka__hladat${hladanie ? ' is-aktivne' : ''}`} onClick={prepniHladanie} aria-label="Hľadať" aria-expanded={hladanie}>
                <Ikona nazov={hladanie ? 'zavriet' : 'hladat'} velkost={19} />
              </button>
            )}
          </div>
          <nav className="el-menu el-menu--vlavo" aria-label="Hlavné menu">
            {casti[0].map(odkazMenu)}
          </nav>
          <Link to="/" className="el-erb-hlavicky" aria-label={`${nastavenia.nazov} - úvodná stránka`}>
            <span className="el-erb-hlavicky__kruh">
              {nastavenia.logo ? (
                <img src={souborUrl(nastavenia.logo)} alt="" />
              ) : (
                <span className="el-logo__znak">{(nastavenia.skratka || nastavenia.nazov).slice(0, 3)}</span>
              )}
            </span>
            {u.zapnute('ukazat_nazov', false) && <strong className="el-erb-hlavicky__nazov">{nastavenia.nazov}</strong>}
          </Link>
          <nav className="el-menu el-menu--vpravo" aria-label="Hlavné menu - pokračovanie">
            {casti[1].map(odkazMenu)}
          </nav>
          <div className="el-hlavicka__nastroje el-hlavicka__nastroje--vpravo">
            {u.zapnute('ukazat_hladanie') && (
              <button type="button" className="el-ikona-tl el-hlavicka__hladat-mobil" onClick={prepniHladanie} aria-label="Hľadať" aria-expanded={hladanie}>
                <Ikona nazov={hladanie ? 'zavriet' : 'hladat'} velkost={19} />
              </button>
            )}
            <KosikHlavicky />
            {tlacidlo && (
              <Odkaz to={tlacidlo.odkaz} className="el-tlacidlo el-tlacidlo--akcent el-hlavicka__cta">
                {tlacidlo.text}
              </Odkaz>
            )}
          </div>
        </div>
        {aktivnaPolozka && (
          <div className="el-panel" onMouseEnter={() => window.clearTimeout(casovac.current)} onMouseLeave={zavriSOneskorenim}>
            <PanelMenu polozka={aktivnaPolozka} zavriet={zavri} />
          </div>
        )}
        {hladanie && (
          <div className="el-panel el-panel--hladanie">
            <PanelHladania zavriet={() => setHladanie(false)} />
          </div>
        )}
      </header>
      {mobilneMenu && <MobilneMenu zavriet={() => setMobilneMenu(false)} />}
    </>
  );
};

// ===== Mobilné menu (vysúvané zľava) =====

const MobilneMenu: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const siete = useSiete();
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
    <div className="el-mmenu" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" className="el-mmenu__pozadie" onClick={zavriet} aria-label="Zavrieť menu" tabIndex={-1} />
      <div className="el-mmenu__panel">
        <div className="el-mmenu__hlava">
          <Logo onClick={zavriet} />
          <strong>{nastavenia.nazov}</strong>
          <button type="button" className="el-ikona-tl" onClick={zavriet} aria-label="Zavrieť menu">
            <Ikona nazov="zavriet" velkost={22} />
          </button>
        </div>

        {u.zapnute('ukazat_hladanie') && (
          <form
            className="el-mmenu__hladanie"
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

        <ul className="el-mmenu__zoznam">
          {polozky.map((p) => {
            const deti = (p.deti ?? []).filter((d) => d.typ !== 'clanky');
            const clankove = (p.deti ?? []).filter((d) => d.typ === 'clanky');
            const maPodmenu = deti.length > 0 || clankove.length > 0;
            const jeRozbalene = rozbalene === p.id;
            const aktivna = jeAktivnaPolozka(p, pathname);
            return (
              <li key={p.id} className={`el-mmenu__polozka${jeRozbalene ? ' is-rozbalene' : ''}${aktivna ? ' is-aktivna' : ''}`}>
                {maPodmenu ? (
                  <>
                    <button type="button" className="el-mmenu__odkaz" aria-expanded={jeRozbalene} onClick={() => setRozbalene(jeRozbalene ? null : p.id)}>
                      <span>{p.nazov}</span>
                      <Ikona nazov="dole" velkost={14} className="el-mmenu__sipka" />
                    </button>
                    {jeRozbalene && (
                      <div className="el-mmenu__podmenu">
                        {p.odkaz && (
                          <OdkazMenu polozka={{ ...p, deti: [] }} onClick={zavriet} className="el-mmenu__pododkaz el-mmenu__pododkaz--hlavny">
                            Prejsť na sekciu
                          </OdkazMenu>
                        )}
                        {deti.map((d) =>
                          d.deti?.length ? (
                            <div key={d.id} className="el-mmenu__skupina">
                              <OdkazMenu polozka={{ ...d, deti: [] }} onClick={zavriet} className="el-mmenu__kategoria" />
                              {d.deti.map((v) => (
                                <OdkazMenu key={v.id} polozka={v} onClick={zavriet} className={`el-mmenu__pododkaz${jeAktivny(v.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                              ))}
                            </div>
                          ) : (
                            <OdkazMenu key={d.id} polozka={d} onClick={zavriet} className={`el-mmenu__pododkaz${jeAktivny(d.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                          )
                        )}
                        {clankove.length > 0 && (
                          <div className="el-mmenu__clanky">
                            {clankove.map((c) => (
                              <ClankyMenu key={c.id} polozka={c} zavriet={zavriet} trieda="el-mmenu__clanok" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <OdkazMenu polozka={p} onClick={zavriet} className="el-mmenu__odkaz">
                    <span>{p.nazov}</span>
                  </OdkazMenu>
                )}
              </li>
            );
          })}
        </ul>

        <div className="el-mmenu__spodok">
          {tlacidlo && (
            <Odkaz to={tlacidlo.odkaz} className="el-tlacidlo el-tlacidlo--akcent el-mmenu__cta" onClick={zavriet}>
              {tlacidlo.text}
            </Odkaz>
          )}
          {(kontakt.telefon || kontakt.email) && (
            <div className="el-mmenu__kontakt">
              {kontakt.telefon && <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`}>{kontakt.telefon}</a>}
              {kontakt.email && <a href={`mailto:${kontakt.email}`}>{kontakt.email}</a>}
            </div>
          )}
          {siete.length > 0 && (
            <div className="el-siete">
              {siete.map((s) => (
                <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer" className="el-siete__odkaz" aria-label={s.nazov}>
                  <IkonaSiete kluc={s.kluc} />
                </a>
              ))}
            </div>
          )}
          {jePrihlaseny() && u.zapnute('ukazat_admin') && (
            <a href="/admin" className="el-mmenu__admin">
              Administrácia
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== Pätička =====

const HLAVNE_UROVNE = ['generalny', 'hlavny'];

const LogoPartnera: React.FC<{ partner: Partner; velke?: boolean }> = ({ partner: p, velke }) => {
  const logo = obrazokUrl(p.logo);
  const obsah = logo ? <img src={logo} alt={p.nazov} loading="lazy" onError={skryObrazok} /> : <span>{p.nazov}</span>;
  const trieda = `el-ppartner${velke ? ' el-ppartner--velky' : ''}`;
  return p.web_url ? (
    <a href={p.web_url} target="_blank" rel="noopener noreferrer" className={trieda} title={p.nazov}>
      {obsah}
    </a>
  ) : (
    <span className={trieda} title={p.nazov}>
      {obsah}
    </span>
  );
};

/** Partneri nad pätičkou: generálni a hlavní vo väčšom, ostatní v menšom rade. */
const PartneriPaticky: React.FC = () => {
  const u = useUpravy();
  const { pathname } = useLocation();
  const zapnute = u.zapnute('ukazat_partnerov') && !['/sponzori', '/kosik', '/pokladna', '/objednavka'].some((c) => pathname.startsWith(c));
  const partneri = useApi<Partner[]>(zapnute ? '/sponsors' : null);
  const zoznam = partneri.data ?? [];
  if (!zapnute || zoznam.length === 0) return null;
  const hlavni = zoznam.filter((p) => p.uroven && HLAVNE_UROVNE.includes(p.uroven));
  const prvi = (hlavni.length > 0 ? hlavni : zoznam).slice(0, 4);
  const ostatni = zoznam.filter((p) => !prvi.includes(p)).slice(0, 12);
  return (
    <section className="el-ppartneri" aria-label="Partneri">
      <div className="el-kontajner">
        <div className="el-ppartneri__hlava">
          <h2>{u.text('partneri_nadpis', 'Partneri klubu')}</h2>
          <Link to="/sponzori" className="el-ppartneri__vsetci">
            {u.text('text_vsetci_partneri', 'Všetci partneri')}
            <Ikona nazov="sipka" velkost={14} />
          </Link>
        </div>
        <div className="el-ppartneri__rad el-ppartneri__rad--hlavny">
          {prvi.map((p) => (
            <LogoPartnera key={p.id} partner={p} velke />
          ))}
        </div>
        {ostatni.length > 0 && (
          <div className="el-ppartneri__rad">
            {ostatni.map((p) => (
              <LogoPartnera key={p.id} partner={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const Paticka: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  const { polozky } = useMenuWebu();
  const siete = useSiete();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const gdpr = nastavenia.gdpr ?? {};
  const text = String(u.s.paticka_text || '').trim() || nastavenia.slogan || nastavenia.meta_popis;
  const rok = new Date().getFullYear();

  // Stĺpce: sekcie menu s podpoložkami; položky bez podmenu spolu v prvom stĺpci
  const sekcie = polozky.filter((p) => (p.deti ?? []).some((d) => d.odkaz && d.typ !== 'clanky')).slice(0, 3);
  const samostatne = polozky.filter((p) => p.odkaz && !sekcie.includes(p)).slice(0, 8);

  return (
    <footer className="el-paticka">
      <PartneriPaticky />
      <div className="el-paticka__hlavna">
        <div className="el-kontajner">
          <div className="el-paticka__klub">
            <Logo className="el-logo el-paticka__logo" />
            <strong className="el-paticka__nazov">{nastavenia.nazov}</strong>
            {text && <p>{text}</p>}
            {siete.length > 0 && u.zapnute('ukazat_siete_paticka') && (
              <div className="el-siete" aria-label={u.text('paticka_siete', 'Sledujte nás')}>
                {siete.map((x) => (
                  <a key={x.kluc} href={x.url} target="_blank" rel="noopener noreferrer" className="el-siete__odkaz" aria-label={x.nazov}>
                    <IkonaSiete kluc={x.kluc} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="el-paticka__stlpce">
            {samostatne.length > 0 && (
              <nav className="el-paticka__stlpec" aria-label="Odkazy v pätičke">
                <h3>{u.text('paticka_menu', 'Klub')}</h3>
                {samostatne.map((p) => (
                  <OdkazMenu key={p.id} polozka={{ ...p, deti: [] }} className="el-paticka__odkaz" />
                ))}
              </nav>
            )}
            {sekcie.map((p) => (
              <nav key={p.id} className="el-paticka__stlpec" aria-label={p.nazov}>
                <h3>{p.nazov}</h3>
                {(p.deti ?? [])
                  .filter((d) => d.odkaz && d.typ !== 'clanky')
                  .slice(0, 7)
                  .map((d) => (
                    <OdkazMenu key={d.id} polozka={{ ...d, deti: [] }} className="el-paticka__odkaz" />
                  ))}
              </nav>
            ))}
            <div className="el-paticka__stlpec">
              <h3>{u.text('paticka_kontakt', 'Kontakt')}</h3>
              {kontakt.adresa && <span className="el-paticka__adresa">{kontakt.adresa}</span>}
              {kontakt.telefon && (
                <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`} className="el-paticka__odkaz">
                  {kontakt.telefon}
                </a>
              )}
              {kontakt.email && (
                <a href={`mailto:${kontakt.email}`} className="el-paticka__odkaz">
                  {kontakt.email}
                </a>
              )}
            </div>
          </div>
          <div className="el-paticka__spodok">
            <span>
              © {rok} {nastavenia.nazov}. {u.text('paticka_copyright', 'Všetky práva vyhradené.')}
            </span>
            <span className="el-paticka__pravne">
              {gdpr.odkaz_zasad && (
                <Odkaz to={gdpr.odkaz_zasad} className="el-paticka__male">
                  Ochrana osobných údajov
                </Odkaz>
              )}
              <button type="button" className="el-paticka__male" onClick={otvorNastaveniaCookies}>
                Nastavenia cookies
              </button>
              {jePrihlaseny() && u.zapnute('ukazat_admin') && (
                <a href="/admin" className="el-paticka__male">
                  Administrácia
                </a>
              )}
              <button type="button" className="el-paticka__male" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Na začiatok ↑
              </button>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
