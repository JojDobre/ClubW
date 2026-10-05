// Umiestnenie: sablony/klubova/src/Rozlozenie.tsx
// Kostra šablóny Klubová: hlavička s rozbaľovacím menu cez celú šírku,
// pätička a na mobile aplikačná navigácia (horná lišta + spodné záložky).
//
// Na úvodnej stránke je hlavička priehľadná nad fotkou (s tmavým
// prechodom) a po posunutí alebo otvorení menu dostane tmavé pozadie.

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Cast,
  OdkazMenu,
  SKUPINY_HLADANIA,
  jePrihlaseny,
  otvorNastaveniaCookies,
  souborUrl,
  useKosik,
  useMenuWebu,
  useNastavenia,
  useHladanie,
  useNastaveniaSablony,
  type PolozkaMenu,
  OdkazUctu,
} from '@clubw/jadro';
import { Ikona, Odkaz, obrazokUrl, useApi, useUpravy, type Clanok } from './spolocne';
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

/** Účet fanúšika (Môj klub) - prihlásenému ukáže iniciály. */
const UcetHlavicky: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const u = useUpravy();
  if (!u.zapnute('ukazat_ucet')) return null;
  return <OdkazUctu className="kl-hlavicka__kosik kl-hlavicka__ucet" onClick={onClick} />;
};

/** Lupa v hlavičke - otvorí vyhľadávací panel pod hlavičkou. */
const HladanieHlavicky: React.FC<{ otvorene: boolean; prepni: () => void }> = ({ otvorene, prepni }) => {
  const u = useUpravy();
  if (!u.zapnute('ukazat_hladanie')) return null;
  return (
    <button
      type="button"
      className={`kl-hlavicka__kosik kl-hlavicka__hladat${otvorene ? ' is-aktivny' : ''}`}
      onClick={prepni}
      aria-label={otvorene ? 'Zavrieť vyhľadávanie' : 'Hľadať na webe'}
      aria-expanded={otvorene}
      aria-controls="kl-hladanie-panel"
    >
      <Ikona nazov={otvorene ? 'zavriet' : 'hladat'} velkost={19} />
    </button>
  );
};

/** Vyhľadávanie v rozbaľovacom paneli - výsledky sa ukazujú počas písania. */
const PanelHladania: React.FC<{ otvorene: boolean; zavriet: () => void }> = ({ otvorene, zavriet }) => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const pole = useRef<HTMLInputElement>(null);
  const { vysledky, nacitava, chyba } = useHladanie(otvorene ? text : '', 4);
  const dotaz = text.trim();

  useEffect(() => {
    if (otvorene) window.setTimeout(() => pole.current?.focus(), 60);
  }, [otvorene]);

  const skupiny = SKUPINY_HLADANIA.map((s) => ({ ...s, polozky: vysledky.filter((v) => v.typ === s.typ) })).filter((s) => s.polozky.length > 0);
  const vsetky = () => {
    zavriet();
    navigate(dotaz ? `/hladat?q=${encodeURIComponent(dotaz)}` : '/hladat');
  };

  return (
    <div id="kl-hladanie-panel" className={`kl-panel kl-hladanie-panel${otvorene ? ' is-otvoreny' : ''}`} aria-hidden={!otvorene}>
      <div className="kl-panel__vnutro kl-hladanie-panel__vnutro">
        <form
          className="kl-hladanie-panel__pole"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            vsetky();
          }}
        >
          <Ikona nazov="hladat" velkost={22} />
          <input
            ref={pole}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hľadať články, hráčov, zápasy, stránky…"
            aria-label="Hľadať na webe"
            maxLength={100}
            tabIndex={otvorene ? 0 : -1}
          />
          <button type="submit" className="kl-hladanie-panel__tlacidlo" tabIndex={otvorene ? 0 : -1}>
            Hľadať
          </button>
        </form>
        {dotaz.length >= 2 && (
          <div className="kl-hladanie-panel__vysledky" aria-live="polite">
            {nacitava && vysledky.length === 0 && <p className="kl-hladanie-panel__stav">Hľadám…</p>}
            {chyba && <p className="kl-hladanie-panel__stav">{chyba}</p>}
            {!nacitava && !chyba && vysledky.length === 0 && <p className="kl-hladanie-panel__stav">Pre „{dotaz}“ sme nič nenašli.</p>}
            {skupiny.length > 0 && (
              <div className="kl-hladanie-panel__skupiny">
                {skupiny.map((s) => (
                  <div key={s.typ} className="kl-hladanie-panel__skupina">
                    <span className="kl-panel__nadpis">{s.nazov}</span>
                    {s.polozky.map((v) => (
                      <Odkaz key={`${v.typ}-${v.id}`} to={v.odkaz} className="kl-hladanie-panel__vysledok" onClick={zavriet}>
                        {v.obrazok ? (
                          <img src={obrazokUrl(v.obrazok) ?? ''} alt="" loading="lazy" />
                        ) : (
                          <span className="kl-hladanie-panel__ikona" aria-hidden="true">
                            <Ikona nazov="hladat" velkost={14} />
                          </span>
                        )}
                        <span>
                          <strong>{v.nazov}</strong>
                          {v.popis && <small>{v.popis}</small>}
                        </span>
                      </Odkaz>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {vysledky.length > 0 && (
              <button type="button" className="kl-hladanie-panel__vsetky" onClick={vsetky}>
                Zobraziť všetky výsledky
                <Ikona nazov="vpravo" velkost={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Horná lišta =====

/** Horná lišta je zapnutá a má čo zobraziť. */
const useHornaLista = () => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const siete = useSiete();
  const retazec = (kluc: string) => String(u.s[kluc] ?? '').trim();
  const odkazy = [1, 2, 3, 4]
    .map((k) => ({
      text: u.text(`horna_lista_odkaz_${k}_text`, ''),
      odkaz: retazec(`horna_lista_odkaz_${k}`),
      obrazok: obrazokUrl(retazec(`horna_lista_odkaz_${k}_obrazok`) || null),
    }))
    .filter((o) => (o.text || o.obrazok) && o.odkaz);
  const text = u.text('horna_lista_text', '');
  const obrazok = obrazokUrl(retazec('horna_lista_obrazok') || null);
  const obrazokOdkaz = retazec('horna_lista_obrazok_odkaz');
  const kontakt = u.zapnute('horna_lista_kontakt') ? (nastavenia.kontakt ?? {}) : {};
  const telefon = (kontakt as { telefon?: string | null }).telefon || null;
  const email = (kontakt as { email?: string | null }).email || null;
  const hladanie = u.zapnute('horna_lista_hladanie');
  const zobrazSiete = u.zapnute('horna_lista_siete') && siete.length > 0;
  const zapnuta = u.zapnute('horna_lista', false) && Boolean(text || obrazok || telefon || email || odkazy.length || hladanie || zobrazSiete);
  // Na mobile sa ukážu len odkazy a siete - bez nich lištu nezobrazíme
  const mobil = zapnuta && u.zapnute('horna_lista_mobil', false) && (odkazy.length > 0 || zobrazSiete);
  const farba = typeof u.s.horna_lista_farba === 'string' ? u.s.horna_lista_farba : 'tmava';
  const stranaInfo = u.s.horna_lista_strana_info === 'vpravo' ? 'vpravo' : 'vlavo';
  const stranaOdkazov = u.s.horna_lista_strana_odkazov === 'vlavo' ? 'vlavo' : 'vpravo';
  return { zapnuta, mobil, farba, text, obrazok, obrazokOdkaz, telefon, email, odkazy, hladanie, stranaInfo, stranaOdkazov, siete: zobrazSiete ? siete : [] };
};

/** Malé vyhľadávacie pole v hornej lište - odošle na stránku /hladat. */
const HladanieListy: React.FC = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  return (
    <form
      className="kl-lista__hladanie"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = text.trim();
        navigate(q ? `/hladat?q=${encodeURIComponent(q)}` : '/hladat');
        setText('');
      }}
    >
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hľadať…" aria-label="Hľadať na webe" maxLength={100} />
      <button type="submit" aria-label="Hľadať">
        <Ikona nazov="hladat" velkost={13} />
      </button>
    </form>
  );
};

/** Tenký pás navrchu stránky - text, kontakt, odkazy (zväzy…), hľadanie, sociálne siete. */
const HornaLista: React.FC = () => {
  const l = useHornaLista();
  if (!l.zapnuta) return null;
  const obrazok = l.obrazok ? <img src={l.obrazok} alt="" className="kl-lista__logo" /> : null;
  const info = (l.text || obrazok || l.telefon || l.email) && (
    <div className="kl-lista__info">
      {obrazok && (l.obrazokOdkaz ? <Odkaz to={l.obrazokOdkaz} className="kl-lista__logo-odkaz">{obrazok}</Odkaz> : obrazok)}
      {l.text && <span className="kl-lista__text">{l.text}</span>}
      {l.telefon && (
        <a href={`tel:${l.telefon.replace(/\s+/g, '')}`} className="kl-lista__kontakt">
          <Ikona nazov="telefon" velkost={13} />
          {l.telefon}
        </a>
      )}
      {l.email && (
        <a href={`mailto:${l.email}`} className="kl-lista__kontakt">
          <Ikona nazov="mail" velkost={13} />
          {l.email}
        </a>
      )}
    </div>
  );
  const odkazy = l.odkazy.length > 0 && (
    <nav className="kl-lista__odkazy" aria-label="Užitočné odkazy">
      {l.odkazy.map((o, i) => (
        <Odkaz key={i} to={o.odkaz} ariaLabel={o.text ? undefined : o.odkaz}>
          {o.obrazok && <img src={o.obrazok} alt="" className="kl-lista__odkaz-obrazok" />}
          {o.text && <span>{o.text}</span>}
        </Odkaz>
      ))}
    </nav>
  );
  return (
    <div className={`kl-lista kl-lista--${l.farba}${l.mobil ? ' kl-lista--mobil' : ''}`}>
      <div className="kl-lista__vnutro">
        <div className="kl-lista__vlavo">
          {l.stranaInfo === 'vlavo' && info}
          {l.stranaOdkazov === 'vlavo' && odkazy}
        </div>
        <div className="kl-lista__vpravo">
          {l.stranaInfo === 'vpravo' && info}
          {l.stranaOdkazov === 'vpravo' && odkazy}
          {l.hladanie && <HladanieListy />}
          {l.siete.length > 0 && (
            <div className="kl-lista__siete">
              {l.siete.map((s) => (
                <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.nazov} title={s.nazov}>
                  {s.skratka}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Rozlozenie: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { s } = useUpravy();
  const lista = useHornaLista();
  const jeUvod = pathname === '/';

  // Nová stránka začína navrchu
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`kl${jeUvod ? ' kl--uvod' : ''}${lista.zapnuta ? ' kl--lista' : ''}${lista.mobil ? ' kl--lista-mobil' : ''}`} data-pismo={typeof s.pismo === 'string' ? s.pismo : undefined}>
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

/** Karty najnovších článkov - položka menu typu „Najnovšie články" (voliteľne z jednej rubriky). */
const ClankyMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void }> = ({ polozka, zavriet }) => {
  const pocet = Math.min(6, Math.max(1, Number(polozka.pocet) || 2));
  const rubrika = polozka.rubrika_slug ? `&category=${encodeURIComponent(polozka.rubrika_slug)}` : '';
  const clanky = useApi<Clanok[]>(`/articles?limit=${pocet}${rubrika}`);
  return (
    <>
      {(clanky.data ?? []).map((c) => (
        <Link key={c.id} to={`/clanek/${c.slug}`} className="kl-panel__karta kl-panel__karta--clanok" onClick={zavriet}>
          <span className="kl-panel__karta-obrazok">
            {c.obrazok ? <img src={obrazokUrl(c.obrazok) ?? ''} alt="" loading="lazy" /> : <span className="kl-obrazok--prazdny" />}
          </span>
          <span className="kl-panel__karta-nazov">{c.nazov}</span>
        </Link>
      ))}
    </>
  );
};

/**
 * Obsah rozbaľovacieho panela podľa návrhu:
 *  - kategórie (položky s vlastným podmenu) = stĺpce s nadpismi cez celú šírku,
 *  - bez kategórií = zoznam odkazov vľavo,
 *  - položky s obrázkom a „Najnovšie články" = karty vpravo.
 */
const PanelMenu: React.FC<{ polozka: PolozkaMenu; zavriet: () => void }> = ({ polozka, zavriet }) => {
  const vsetkyDeti = polozka.deti ?? [];
  const clankove = vsetkyDeti.filter((d) => d.typ === 'clanky');
  const deti = vsetkyDeti.filter((d) => d.typ !== 'clanky');
  const kategorie = deti.filter((d) => (d.deti?.length ?? 0) > 0);
  const karty = deti.filter((d) => !d.deti?.length && d.obrazok && d.odkaz);
  const odkazy = deti.filter((d) => !d.deti?.length && !(d.obrazok && d.odkaz));
  const maKarty = karty.length > 0 || clankove.length > 0;

  return (
    <>
      {kategorie.length > 0 ? (
        // Mriežka má štyri stĺpce ako v návrhu - pri kartách vpravo menej, pri menej kategóriách ostanú vľavo
        <div className="kl-panel__stlpce" style={{ '--kl-stlpcov': maKarty ? 2 : 4 } as React.CSSProperties}>
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
      ) : odkazy.length > 0 ? (
        <ZoznamOdkazov odkazy={odkazy} zavriet={zavriet} />
      ) : (
        // Len články: vľavo nadpis a odkaz na všetky články, nech panel nie je prázdny
        clankove.length > 0 && (
          <div className="kl-panel__stlpec kl-panel__uvod-clankov">
            <span className="kl-panel__nadpis">{clankove[0].nazov}</span>
            {clankove[0].odkaz && (
              <OdkazMenu polozka={{ ...clankove[0], deti: [] }} className="kl-panel__vsetky" onClick={zavriet}>
                Všetky články
                <Ikona nazov="vpravo" velkost={16} />
              </OdkazMenu>
            )}
          </div>
        )
      )}
      {maKarty && (
        <div className="kl-panel__karty">
          {karty.slice(0, clankove.length > 0 ? 1 : 3).map((d) => (
            <KartaMenu key={d.id} polozka={d} zavriet={zavriet} />
          ))}
          {clankove.map((c) => (
            <ClankyMenu key={c.id} polozka={c} zavriet={zavriet} />
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
  const [hladanie, setHladanie] = useState(false);
  const hlavicka = useRef<HTMLElement>(null);
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
    setHladanie(false);
  }, [pathname]);

  // Vyhľadávanie sa zavrie klávesom Escape alebo kliknutím mimo hlavičky
  useEffect(() => {
    if (!hladanie) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setHladanie(false);
    const klik = (e: MouseEvent) => {
      if (hlavicka.current && !hlavicka.current.contains(e.target as Node)) setHladanie(false);
    };
    window.addEventListener('keydown', esc);
    document.addEventListener('mousedown', klik);
    return () => {
      window.removeEventListener('keydown', esc);
      document.removeEventListener('mousedown', klik);
    };
  }, [hladanie]);

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
    setHladanie(false);
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

  const plna = posunute || otvorene !== null || hladanie || !jeUvod;
  const zmensena = posunute && u.zapnute('hlavicka_zmensit');

  return (
    <>
      <header ref={hlavicka} className={`kl-hlavicka${plna ? ' is-plna' : ''}${zmensena ? ' is-zmensena' : ''}${jeUvod ? ' kl-hlavicka--uvod' : ''}`}>
        <div className="kl-hlavicka__prechod" aria-hidden="true" />
        <div className="kl-hlavicka__pozadie" aria-hidden="true" />
        <HornaLista />
        <nav className="kl-hlavicka__vnutro" aria-label="Hlavné menu">
          <Logo />
          {/* Na mobile a tablete zároveň odsúva ikony doprava - preto zostáva aj bez textu */}
          <Link to="/" className="kl-hlavicka__nazov" tabIndex={-1} aria-hidden="true">
            {u.zapnute('ukazat_nazov', false) ? nastavenia.nazov : ''}
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
          <HladanieHlavicky
            otvorene={hladanie}
            prepni={() => {
              setOtvorene(null);
              setHladanie((h) => !h);
            }}
          />
          <KosikHlavicky />
          <UcetHlavicky />
          {jePrihlaseny() && u.zapnute('ukazat_admin') && (
            <a href="/admin" className="kl-hlavicka__admin" title="Administrácia">
              Admin
            </a>
          )}
          <button type="button" className="kl-hlavicka__hamburger" onClick={() => setMobilneMenu(true)} aria-label="Otvoriť menu" aria-expanded={mobilneMenu}>
            <Ikona nazov="menu" velkost={22} />
          </button>
        </nav>
        {u.zapnute('ukazat_hladanie') && <PanelHladania otvorene={hladanie} zavriet={() => setHladanie(false)} />}
      </header>
      {mobilneMenu && <MobilneMenu zavriet={() => setMobilneMenu(false)} />}
    </>
  );
};

// ===== Mobilné menu (celá obrazovka) =====

/** Vyhľadávacie pole v mobilnom menu. */
const HladanieMenu: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  return (
    <form
      className="kl-mmenu__hladanie"
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
  );
};

/** Mobilné menu: karty najnovších článkov (položka menu typu „Najnovšie články"). */
const ClankyMobil: React.FC<{ polozka: PolozkaMenu; zavriet: () => void }> = ({ polozka, zavriet }) => {
  const pocet = Math.min(6, Math.max(1, Number(polozka.pocet) || 2));
  const rubrika = polozka.rubrika_slug ? `&category=${encodeURIComponent(polozka.rubrika_slug)}` : '';
  const clanky = useApi<Clanok[]>(`/articles?limit=${pocet}${rubrika}`);
  if (!clanky.data?.length) return null;
  return (
    <div className="kl-mmenu__clanky">
      {clanky.data.map((c) => (
        <Link key={c.id} to={`/clanek/${c.slug}`} className="kl-mmenu__clanok" onClick={zavriet}>
          <span className="kl-mmenu__clanok-obrazok">{c.obrazok ? <img src={obrazokUrl(c.obrazok) ?? ''} alt="" loading="lazy" /> : null}</span>
          <span className="kl-mmenu__clanok-nazov">{c.nazov}</span>
        </Link>
      ))}
    </div>
  );
};

const MobilneMenu: React.FC<{ zavriet: () => void }> = ({ zavriet }) => {
  const { polozky } = useMenuWebu();
  const { nastavenia } = useNastavenia();
  const { pocet: vKosiku } = useKosik();
  const { pathname } = useLocation();
  const tlacidlo = useTlacidloHlavicky();
  const u = useUpravy();
  const siete = useSiete();
  // Rozbalená je položka, v ktorej podmenu je aktuálna stránka
  const [rozbalene, setRozbalene] = useState<PolozkaMenu['id'] | null>(
    () => polozky.find((p) => (p.deti ?? []).some((d) => jeAktivny(d.odkaz, pathname) || (d.deti ?? []).some((v) => jeAktivny(v.odkaz, pathname))))?.id ?? null
  );
  const [hladanie, setHladanie] = useState(false);
  useZamknutyPosun(true);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && zavriet();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [zavriet]);

  const pozadie = obrazokUrl(String(u.s.mmenu_pozadie || u.s.uvod_fotka || '') || null);
  const kosik = Boolean(nastavenia.eshop?.zapnuty) && u.zapnute('ukazat_kosik');

  return (
    <div className="kl-mmenu" role="dialog" aria-modal="true" aria-label="Menu" style={pozadie ? ({ '--kl-mmenu-pozadie': `url("${pozadie}")` } as React.CSSProperties) : undefined}>
      <div className="kl-mmenu__hlava">
        <Logo className="kl-mmenu__logo" onClick={zavriet} />
        <span className="kl-mmenu__predel" aria-hidden="true" />
        <button type="button" className="kl-mmenu__zavriet" onClick={zavriet} aria-label="Zavrieť menu">
          <Ikona nazov="zavriet" velkost={30} />
        </button>
        {u.zapnute('ukazat_nazov', false) && <strong>{nastavenia.nazov}</strong>}
        {tlacidlo && (
          <Odkaz to={tlacidlo.odkaz} className="kl-mmenu__ikona kl-mmenu__ikona--prva" onClick={zavriet} ariaLabel={tlacidlo.text}>
            <Ikona nazov="mail" velkost={24} />
          </Odkaz>
        )}
        {kosik && (
          <Link to="/kosik" className={`kl-mmenu__ikona${tlacidlo ? '' : ' kl-mmenu__ikona--prva'}`} onClick={zavriet} aria-label={vKosiku ? `Košík, ${vKosiku} ks` : 'Košík'}>
            <Ikona nazov="kosik" velkost={26} />
            {vKosiku > 0 && <span className="kl-mmenu__pocet">{vKosiku > 99 ? '99+' : vKosiku}</span>}
          </Link>
        )}
      </div>

      <div className="kl-mmenu__telo">
        {u.zapnute('ukazat_hladanie') && (
          <div className="kl-mmenu__akcie">
            {(
              <button type="button" className={`kl-mmenu__akcia${hladanie ? ' is-aktivna' : ''}`} onClick={() => setHladanie((h) => !h)} aria-expanded={hladanie}>
                <Ikona nazov="hladat" velkost={22} />
                Hľadať
              </button>
            )}
          </div>
        )}
        {hladanie && <HladanieMenu zavriet={zavriet} />}

        <ul className="kl-mmenu__zoznam">
          {polozky.map((p) => {
            const deti = (p.deti ?? []).filter((d) => d.typ !== 'clanky');
            const clankove = (p.deti ?? []).filter((d) => d.typ === 'clanky');
            const maPodmenu = deti.length > 0 || clankove.length > 0;
            const jeRozbalene = rozbalene === p.id;
            const aktivna = jeAktivny(p.odkaz, pathname);
            return (
              <li key={p.id} className={`kl-mmenu__polozka${jeRozbalene ? ' is-rozbalene' : ''}${aktivna ? ' is-aktivna' : ''}`}>
                {maPodmenu ? (
                  <>
                    <button type="button" className="kl-mmenu__odkaz" aria-expanded={jeRozbalene} onClick={() => setRozbalene(jeRozbalene ? null : p.id)}>
                      <span>{p.nazov}</span>
                      <span className="kl-mmenu__trojuholnik" aria-hidden="true" />
                    </button>
                    {jeRozbalene && (
                      <div className="kl-mmenu__podmenu">
                        {p.odkaz && (
                          <OdkazMenu polozka={{ ...p, deti: [] }} onClick={zavriet} className={`kl-mmenu__pododkaz${aktivna ? ' is-aktivny' : ''}`}>
                            {p.nazov}
                          </OdkazMenu>
                        )}
                        {deti.map((d) =>
                          d.deti?.length ? (
                            <div key={d.id} className="kl-mmenu__skupina">
                              <OdkazMenu polozka={{ ...d, deti: [] }} onClick={zavriet} className="kl-mmenu__kategoria" />
                              {d.deti.map((v) => (
                                <OdkazMenu key={v.id} polozka={v} onClick={zavriet} className={`kl-mmenu__pododkaz${jeAktivny(v.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                              ))}
                            </div>
                          ) : (
                            <OdkazMenu key={d.id} polozka={d} onClick={zavriet} className={`kl-mmenu__pododkaz${jeAktivny(d.odkaz, pathname) ? ' is-aktivny' : ''}`} />
                          )
                        )}
                        {clankove.map((c) => (
                          <ClankyMobil key={c.id} polozka={c} zavriet={zavriet} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <OdkazMenu polozka={p} onClick={zavriet} className="kl-mmenu__odkaz">
                    <span>{p.nazov}</span>
                  </OdkazMenu>
                )}
              </li>
            );
          })}
        </ul>

        {(siete.length > 0 || (jePrihlaseny() && u.zapnute('ukazat_admin'))) && (
          <div className="kl-mmenu__spodok">
            {siete.length > 0 && (
              <div className="kl-mmenu__siete">
                {siete.map((s) => (
                  <a key={s.kluc} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.nazov} title={s.nazov}>
                    {s.skratka}
                  </a>
                ))}
              </div>
            )}
            {jePrihlaseny() && u.zapnute('ukazat_admin') && (
              <a href="/admin" className="kl-mmenu__admin">
                Administrácia
              </a>
            )}
          </div>
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
        {/* Horný riadok: logo, text vedľa neho a siete vpravo - pätička ostane nízka */}
        <div className="kl-paticka__klub">
          {nastavenia.logo ? (
            <img src={souborUrl(nastavenia.logo)} alt={nastavenia.nazov} className="kl-paticka__logo" />
          ) : (
            <strong className="kl-paticka__nazov">{nastavenia.nazov}</strong>
          )}
          {text && <p>{text}</p>}
          {u.zapnute('ukazat_siete_paticka') && <SocialneIkony />}
        </div>
        <div className="kl-paticka__stlpce">
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
