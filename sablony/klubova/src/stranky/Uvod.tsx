// Umiestnenie: sablony/klubova/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Klubová (podľa návrhu Homepage z Claude Design).
//
// Poradie sekcií: slider najnovších článkov cez celú obrazovku, zápasy
// a výsledky podľa tímov, najnovšie články, fanshop, videá, hráči so
// štatistikami, úspechy, sociálne siete, odkaz klubu a partneri.
// Sekcie bez obsahu (žiadne videá, produkty, úspechy...) sa neukážu.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, useNastavenia, useNastaveniaSablony, type ProduktObchodu } from '@clubw/jadro';
import { SIETE, useSiete } from '../Rozlozenie';
import { KartaHraca, KartaZapasu, MetaClanku, ObrazOdkazu, Obrazok, Partneri, embedVidea, useOknoVidea } from '../casti';
import {
  Ikona,
  NadpisSekcie,
  NadpisStredovy,
  Odkaz,
  dlzkaVidea,
  Erb,
  cas,
  datumKratky,
  dnes,
  hrameDoma,
  logoStrany,
  maVysledok,
  nazovDomacich,
  nazovHosti,
  obrazokUrl,
  stavZapasu,
  useApi,
  useTitulok,
  useUpravy,
  type Clanok,
  type Hrac,
  type Partner,
  type StatistikaHraca,
  type Tim,
  type Video,
  type Zapas,
} from '../spolocne';

interface Nastavenia extends Record<string, string | number | boolean | null> {
  uvod_stitok: string | null;
  uvod_pocet: number | null;
  uvod_fotka: string | null;
  zapasy_timov: number | null;
  vstupenky_odkaz: string | null;
  pocet_clankov: number | null;
  fanshop_odkaz: string | null;
  videa_pozadie: string | null;
  hraci_tim: number | null;
  hraci_nadpis: string | null;
  uspechy: string | null;
  ukazat_partnerov: boolean;
}

const obmedz = (n: unknown, min: number, max: number, predvolene: number) => Math.min(Math.max(Number(n) || predvolene, min), max);

// ===== Úvod: slider článkov =====

const INTERVAL_SLIDERA = 6000;

const Slider: React.FC<{ clanky: Clanok[]; stitok: string; nahradnaFotka: string | null }> = ({ clanky, stitok, nahradnaFotka }) => {
  const { nastavenia } = useNastavenia();
  const [aktivny, setAktivny] = useState(0);
  const casovac = useRef<number>();
  const dotyk = useRef<number | null>(null);
  const pocet = clanky.length;

  const spustiCasovac = useCallback(() => {
    window.clearInterval(casovac.current);
    if (pocet > 1) casovac.current = window.setInterval(() => setAktivny((i) => (i + 1) % pocet), INTERVAL_SLIDERA);
  }, [pocet]);

  useEffect(() => {
    spustiCasovac();
    return () => window.clearInterval(casovac.current);
  }, [spustiCasovac]);

  useEffect(() => {
    if (aktivny >= pocet) setAktivny(0);
  }, [aktivny, pocet]);

  const posun = (smer: 1 | -1) => {
    setAktivny((i) => (i + smer + pocet) % pocet);
    spustiCasovac();
  };

  const slidy = pocet > 0 ? clanky : [null];
  const aktualny = clanky[aktivny] ?? null;
  const nadpis = aktualny?.nazov ?? nastavenia.slogan ?? nastavenia.nazov;

  return (
    <section
      className="kl-hero"
      aria-roledescription="slider"
      aria-label={stitok}
      onTouchStart={(e) => (dotyk.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (dotyk.current === null || pocet < 2) return;
        const rozdiel = e.changedTouches[0].clientX - dotyk.current;
        dotyk.current = null;
        if (Math.abs(rozdiel) > 50) posun(rozdiel < 0 ? 1 : -1);
      }}
    >
      {slidy.map((c, i) => {
        const fotka = obrazokUrl(c?.obrazok) ?? obrazokUrl(nahradnaFotka);
        return (
          <div
            key={c?.id ?? 'prazdny'}
            className={`kl-hero__slide${i === aktivny ? ' is-aktivny' : ''}`}
            style={fotka ? ({ '--kl-hero-fotka': `url("${fotka.replace(/"/g, '%22')}")` } as React.CSSProperties) : undefined}
            aria-hidden={i !== aktivny}
          />
        );
      })}

      <div className="kl-hero__obsah">
        {pocet > 0 && <span className="kl-hero__stitok">{stitok}</span>}
        {aktualny ? (
          <h1>
            <Link to={`/clanek/${aktualny.slug}`} key={aktualny.id} className="kl-hero__nadpis">
              {nadpis}
            </Link>
          </h1>
        ) : (
          <h1 className="kl-hero__nadpis">{nadpis}</h1>
        )}
        {pocet > 1 && (
          <div className="kl-hero__ovladanie">
            <button type="button" className="kl-kruh-tlacidlo" onClick={() => posun(-1)} aria-label="Predchádzajúci článok">
              <Ikona nazov="vlavo" />
            </button>
            <span className="kl-hero__pocitadlo" aria-live="polite">
              {String(aktivny + 1).padStart(2, '0')} / {String(pocet).padStart(2, '0')}
            </span>
            <button type="button" className="kl-kruh-tlacidlo" onClick={() => posun(1)} aria-label="Ďalší článok">
              <Ikona nazov="vpravo" />
            </button>
          </div>
        )}
        {pocet > 1 && (
          <div className="kl-hero__bodky" aria-hidden="true">
            {clanky.map((c, i) => (
              <span key={c.id} className={i === aktivny ? 'is-aktivna' : ''} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ===== Zápasy a výsledky =====

/** Popis súťaže zápasu - „5. liga Západ · 9. kolo". */
const sutazZapasu = (z: Zapas) => [z.liga_nazov, z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ');

/** Mobil: hlavný zápas (prebiehajúci, najbližší alebo posledný) vo veľkej karte. */
const HlavnyZapasMobil: React.FC<{ zapas: Zapas; vstupenky: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const stav = stavZapasu(z);
  const skore = maVysledok(z) && stav !== 'naplanovany';
  const stitok = stav === 'prebieha' ? 'Práve sa hrá' : stav === 'ukonceny' ? 'Posledný výsledok' : 'Najbližší zápas';
  return (
    <article className={`kl-zapas-hlavny${stav === 'prebieha' ? ' is-zivy' : ''}`}>
      <div className="kl-zapas-hlavny__hlava">
        <span className="kl-zapas-hlavny__stitok">{stitok}</span>
        {sutazZapasu(z) && <span className="kl-zapas-hlavny__sutaz">{sutazZapasu(z)}</span>}
      </div>
      <div className="kl-zapas-hlavny__timy">
        <div className="kl-zapas-hlavny__tim">
          <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} ton="tmavy" velky />
          <span>{nazovDomacich(z)}</span>
        </div>
        <div className="kl-zapas-hlavny__stred">
          <strong>{skore ? `${z.goly_domaci}:${z.goly_hostia}` : cas(z.datum_cas)}</strong>
          <small>{datumKratky(z.datum_cas)}</small>
        </div>
        <div className="kl-zapas-hlavny__tim">
          <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} ton="akcent" velky />
          <span>{nazovHosti(z)}</span>
        </div>
      </div>
      {z.miesto && (
        <div className="kl-zapas-hlavny__miesto">
          <Ikona nazov="miesto" velkost={14} />
          {z.miesto}
        </div>
      )}
      <div className="kl-zapas-hlavny__akcie">
        {stav === 'naplanovany' && vstupenky && (
          <Odkaz to={vstupenky} className="kl-zapas-hlavny__tlacidlo kl-zapas-hlavny__tlacidlo--akcent">
            {u.text('vstupenky_text', 'Vstupenky')}
          </Odkaz>
        )}
        {z.video_url && stav !== 'naplanovany' && (
          <a href={z.video_url} target="_blank" rel="noopener noreferrer" className="kl-zapas-hlavny__tlacidlo kl-zapas-hlavny__tlacidlo--akcent">
            Video
          </a>
        )}
        <Link to={`/matches/${z.id}`} className="kl-zapas-hlavny__tlacidlo">
          {u.text('text_detail', 'Detail')}
        </Link>
      </div>
    </article>
  );
};

/** Mobil: riadok zápasu v zozname - dátum, tímy so skóre alebo časom. */
const RiadokZapasuMobil: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const { nastavenia } = useNastavenia();
  const skore = maVysledok(z) && stavZapasu(z) !== 'naplanovany';
  const [den, mesiac] = datumKratky(z.datum_cas).split('. ');
  const vyhra = skore && (hrameDoma(z) ? Number(z.goly_domaci) > Number(z.goly_hostia) : Number(z.goly_hostia) > Number(z.goly_domaci));
  const prehra = skore && (hrameDoma(z) ? Number(z.goly_domaci) < Number(z.goly_hostia) : Number(z.goly_hostia) < Number(z.goly_domaci));
  return (
    <Link to={`/matches/${z.id}`} className="kl-riadok-zapasu">
      <span className="kl-riadok-zapasu__datum">
        <strong>{den}</strong>
        <small>{mesiac}</small>
      </span>
      <span className="kl-riadok-zapasu__timy">
        {(['domaci', 'hostia'] as const).map((strana) => (
          <span key={strana} className="kl-riadok-zapasu__tim">
            <Erb nazov={strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} />
            <span className="kl-riadok-zapasu__nazov">{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</span>
            {skore && <strong>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</strong>}
          </span>
        ))}
      </span>
      <span className={`kl-riadok-zapasu__vysledok${vyhra ? ' is-vyhra' : prehra ? ' is-prehra' : skore ? ' is-remiza' : ''}`}>
        {skore ? (vyhra ? 'V' : prehra ? 'P' : 'R') : cas(z.datum_cas)}
      </span>
    </Link>
  );
};

/**
 * Zápasy a výsledky na mobile: nadpis ako ostatné sekcie, výber tímu,
 * jeden veľký zápas a pod ním prehľadný zoznam ďalších (program aj výsledky).
 */
const ZapasyMobil: React.FC<{
  timy: Tim[];
  timId: number | null;
  setTimId: (id: number) => void;
  vysledky: Zapas[];
  zive: Zapas[];
  buduce: Zapas[];
  vstupenky: string | null;
  nacitava: boolean;
}> = ({ timy, timId, setTimId, vysledky, zive, buduce, vstupenky, nacitava }) => {
  const u = useUpravy();
  const podlaCasu = (a: Zapas, b: Zapas) => a.datum_cas.localeCompare(b.datum_cas);
  const program = [...buduce].sort(podlaCasu);
  const odohrane = [...vysledky].sort(podlaCasu).reverse();
  const hlavny = zive[0] ?? program[0] ?? odohrane[0] ?? null;
  const dalsie = [...program.filter((z) => z.id !== hlavny?.id).slice(0, 2), ...odohrane.filter((z) => z.id !== hlavny?.id).slice(0, 2)];
  return (
    <section className="kl-sekcia kl-zapasy-mobil" aria-labelledby="kl-zapasy-mobil-nadpis">
      <NadpisSekcie nadpis={u.text('zapasy_nadpis', 'Zápasy a výsledky')} odkaz="/matches" id="kl-zapasy-mobil-nadpis" />
      {timy.length > 1 && (
        <div className="kl-zapasy-mobil__timy" role="tablist" aria-label="Tím">
          {timy.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === timId} className={t.id === timId ? 'is-aktivny' : ''} onClick={() => setTimId(t.id)}>
              {t.nazov}
            </button>
          ))}
        </div>
      )}
      {hlavny ? (
        <HlavnyZapasMobil zapas={hlavny} vstupenky={vstupenky} />
      ) : (
        !nacitava && <p className="kl-zapasy-mobil__prazdne">Tím zatiaľ nemá žiadne zápasy.</p>
      )}
      {dalsie.length > 0 && (
        <div className="kl-zapasy-mobil__zoznam">
          {dalsie.map((z) => (
            <RiadokZapasuMobil key={z.id} zapas={z} />
          ))}
        </div>
      )}
    </section>
  );
};


const ZapasyAVysledky: React.FC<{ timy: Tim[]; vstupenky: string | null }> = ({ timy, vstupenky }) => {
  const u = useUpravy();
  const [timId, setTimId] = useState<number | null>(timy[0]?.id ?? null);
  const pas = useRef<HTMLDivElement>(null);
  const [pretekaPas, setPretekaPas] = useState(false);
  useEffect(() => {
    if (!timy.some((t) => t.id === timId)) setTimId(timy[0]?.id ?? null);
  }, [timy, timId]);

  const vysledky = useApi<Zapas[]>(timId ? `/matches?tim_id=${timId}&status=ukonceny&limit=3` : null);
  const zive = useApi<Zapas[]>(timId ? `/matches?tim_id=${timId}&status=prebieha&limit=3` : null);
  const buduce = useApi<Zapas[]>(timId ? `/matches?tim_id=${timId}&status=naplanovany&od_datumu=${dnes()}&limit=50` : null);
  const nacitava = vysledky.nacitava || zive.nacitava || buduce.nacitava;

  const zapasy = useMemo(() => {
    const podlaCasu = (a: Zapas, b: Zapas) => a.datum_cas.localeCompare(b.datum_cas);
    return [
      ...[...(vysledky.data ?? [])].sort(podlaCasu),
      ...[...(zive.data ?? [])].sort(podlaCasu),
      ...[...(buduce.data ?? [])].sort(podlaCasu).slice(0, 6),
    ];
  }, [vysledky.data, zive.data, buduce.data]);
  const pocetOdohranych = (vysledky.data ?? []).length;

  // Pás začína posledným výsledkom, za ním nasledujú najbližšie zápasy
  useEffect(() => {
    const el = pas.current;
    if (!el || nacitava) return;
    const prva = el.children[0] as HTMLElement | undefined;
    const karta = el.children[Math.max(pocetOdohranych - 1, 0)] as HTMLElement | undefined;
    el.scrollTo({ left: prva && karta ? karta.offsetLeft - prva.offsetLeft : 0 });
  }, [nacitava, pocetOdohranych, timId]);

  // Šípky len keď sa karty do pásu nezmestia (na tablete sú po dvoch, na desktope po troch)
  useEffect(() => {
    const el = pas.current;
    if (!el) return;
    const over = () => setPretekaPas(el.scrollWidth > el.clientWidth + 4);
    over();
    if (!('ResizeObserver' in window)) return;
    const pozorovatel = new ResizeObserver(over);
    pozorovatel.observe(el);
    return () => pozorovatel.disconnect();
  }, [zapasy.length]);

  const posun = (smer: 1 | -1) => {
    const el = pas.current;
    if (!el) return;
    const karta = el.children[0] as HTMLElement | undefined;
    el.scrollBy({ left: smer * ((karta?.offsetWidth ?? 280) + 20), behavior: 'smooth' });
  };

  return (
    <>
    <ZapasyMobil
      timy={timy}
      timId={timId}
      setTimId={setTimId}
      vysledky={vysledky.data ?? []}
      zive={zive.data ?? []}
      buduce={buduce.data ?? []}
      vstupenky={vstupenky}
      nacitava={nacitava}
    />
    <section className="kl-zapasy kl-zapasy--pc" aria-labelledby="kl-zapasy-nadpis">
      <div className="kl-zapasy__pozadie" aria-hidden="true" />
      <div className="kl-kontajner kl-zapasy__vnutro">
        <div className="kl-zapasy__hlava">
          <h2 id="kl-zapasy-nadpis">{u.text('zapasy_nadpis', 'Zápasy a výsledky')}</h2>
          {timy.length > 1 && (
            <div className="kl-zapasy__timy" role="tablist" aria-label="Tím">
              {timy.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={t.id === timId}
                  className={`kl-pill${t.id === timId ? ' is-aktivna' : ''}`}
                  onClick={() => setTimId(t.id)}
                >
                  {t.nazov}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="kl-zapasy__ram">
          <div ref={pas} className="kl-zapasy__pas" aria-busy={nacitava}>
            {zapasy.map((z) => (
              <KartaZapasu key={z.id} zapas={z} vstupenky={vstupenky} />
            ))}
            {!nacitava && zapasy.length === 0 && (
              <div className="kl-zapasy__prazdne">
                Tím zatiaľ nemá žiadne zápasy. <Link to="/matches">Všetky zápasy</Link>
              </div>
            )}
          </div>
          {pretekaPas && (
            <>
              <button type="button" className="kl-kruh-tlacidlo kl-kruh-tlacidlo--pas kl-kruh-tlacidlo--vlavo" onClick={() => posun(-1)} aria-label="Predchádzajúce zápasy">
                <Ikona nazov="vlavo" />
              </button>
              <button type="button" className="kl-kruh-tlacidlo kl-kruh-tlacidlo--pas kl-kruh-tlacidlo--vpravo" onClick={() => posun(1)} aria-label="Ďalšie zápasy">
                <Ikona nazov="vpravo" />
              </button>
            </>
          )}
        </div>
        <Link to="/matches" className="kl-zapasy__vsetky">
          Všetky zápasy
          <Ikona nazov="sipka" velkost={14} />
        </Link>
      </div>
    </section>
    </>
  );
};

// ===== Články =====

const NajnovsieClanky: React.FC<{ clanky: Clanok[] }> = ({ clanky }) => {
  const u = useUpravy();
  const [hlavny, ...ostatne] = clanky;
  const bocne = ostatne.slice(0, 3);
  const spodne = ostatne.slice(3, 7);
  if (!hlavny) return null;
  return (
    <section className="kl-sekcia kl-clanky" aria-labelledby="kl-clanky-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis={u.text('clanky_nadpis', 'Najnovšie články')} odkaz="/clanky" id="kl-clanky-nadpis" />
        <div className="kl-clanky__horne">
          <Link to={`/clanek/${hlavny.slug}`} className="kl-clanok-hlavny">
            <Obrazok src={hlavny.obrazok} className="kl-clanok-hlavny__obrazok" />
            <div className="kl-clanok-hlavny__spodok">
              <div>
                <h3>{hlavny.nazov}</h3>
                <MetaClanku clanok={hlavny} />
              </div>
              <span className="kl-tlacidlo-obrys">
                {u.text('text_citat_viac', 'Čítať viac')}
                <Ikona nazov="sipka" velkost={14} />
              </span>
            </div>
          </Link>
          {bocne.length > 0 && (
            <div className="kl-clanky__bocne">
              {bocne.map((c) => (
                <Link key={c.id} to={`/clanek/${c.slug}`} className="kl-clanok-bocny">
                  <Obrazok src={c.obrazok} className="kl-clanok-bocny__obrazok" />
                  <div>
                    <h4>{c.nazov}</h4>
                    <MetaClanku clanok={c} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        {spodne.length > 0 && (
          <div className="kl-clanky__spodne">
            {spodne.map((c) => (
              <Link key={c.id} to={`/clanek/${c.slug}`} className="kl-clanok-karta">
                <Obrazok src={c.obrazok} className="kl-clanok-karta__obrazok" />
                <h4>{c.nazov}</h4>
                <MetaClanku clanok={c} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ===== Fanshop =====

/**
 * Fanshop: produkty z obchodu (odporúčané, doplnené najnovšími do troch)
 * alebo tri produkty z nastavení šablóny. Zdroj sa volí v nastaveniach -
 * „automaticky" berie obchod, keď je zapnutý, inak produkty z nastavení.
 */
const Fanshop: React.FC<{ s: Record<string, string | number | boolean | null> }> = ({ s }) => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  const nadpis = u.text('fanshop_nadpis', 'Fanshop');
  const kupit = u.text('fanshop_tlacidlo', 'Kúpiť');
  const obchodZapnuty = Boolean(nastavenia.eshop?.zapnuty);
  const zdroj = String(s.fanshop_zdroj || 'auto');
  const zObchodu = zdroj === 'obchod' ? obchodZapnuty : zdroj === 'nastavenia' ? false : obchodZapnuty;
  const odporucane = useApi<ProduktObchodu[]>(zObchodu ? '/eshop/produkty?odporucane=1&limit=3' : null);
  const najnovsie = useApi<ProduktObchodu[]>(zObchodu ? '/eshop/produkty?limit=6' : null);
  // Odporúčané produkty majú prednosť, do troch ich doplnia najnovšie
  const produktyObchodu = useMemo(() => {
    const zoznam = [...(odporucane.data ?? [])];
    for (const p of najnovsie.data ?? []) {
      if (zoznam.length >= 3) break;
      if (!zoznam.some((x) => x.id === p.id)) zoznam.push(p);
    }
    return zoznam.slice(0, 3);
  }, [odporucane.data, najnovsie.data]);

  if (zObchodu) {
    if (produktyObchodu.length === 0) return null;
    const mena = nastavenia.eshop?.mena ?? 'EUR';
    return (
      <section className="kl-sekcia kl-fanshop" aria-labelledby="kl-fanshop-nadpis">
        <div className="kl-kontajner">
          <NadpisSekcie nadpis={nadpis} odkaz="/obchod" id="kl-fanshop-nadpis" />
          <div className="kl-mriezka-3 kl-pas-mobil">
            {produktyObchodu.map((p) => (
              <div key={p.id} className="kl-produkt">
                <Link to={`/obchod/${p.slug}`} className="kl-produkt__odkaz" tabIndex={-1} aria-hidden="true">
                  <Obrazok src={p.obrazok} className="kl-produkt__obrazok" alt={p.nazov} />
                </Link>
                <span className="kl-produkt__nazov">{p.nazov}</span>
                <div className="kl-produkt__spodok">
                  <span className="kl-produkt__cena">{cenaText(p.cena, mena)}</span>
                  <Link to={`/obchod/${p.slug}`} className="kl-tlacidlo kl-tlacidlo--tmave" aria-label={`${kupit} ${p.nazov}`}>
                    {kupit}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const obchod = String(s.fanshop_odkaz || '').trim() || (obchodZapnuty ? '/obchod' : null);
  const produkty = [1, 2, 3]
    .map((i) => ({
      i,
      obrazok: s[`produkt_${i}_obrazok`] as string | null,
      nazov: String(s[`produkt_${i}_nazov`] || '').trim(),
      cena: (s[`produkt_${i}_cena`] as string | null) || '',
      odkaz: String(s[`produkt_${i}_odkaz`] || '').trim() || obchod,
    }))
    .filter((p) => p.obrazok);
  if (produkty.length === 0) return null;
  return (
    <section className="kl-sekcia kl-fanshop" aria-labelledby="kl-fanshop-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis={nadpis} odkaz={obchod} id="kl-fanshop-nadpis" />
        <div className="kl-mriezka-3 kl-pas-mobil">
          {produkty.map((p) => (
            <div key={p.i} className="kl-produkt">
              <Obrazok src={p.obrazok} className="kl-produkt__obrazok" alt={p.nazov || (p.cena ? `Produkt za ${p.cena}` : 'Produkt')} />
              {p.nazov && <span className="kl-produkt__nazov">{p.nazov}</span>}
              <div className="kl-produkt__spodok">
                <span className="kl-produkt__cena">{p.cena}</span>
                {p.odkaz && (
                  <Odkaz to={p.odkaz} className="kl-tlacidlo kl-tlacidlo--tmave">
                    {kupit}
                  </Odkaz>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===== Videá =====

const Videa: React.FC<{ videa: Video[]; pozadie: string | null }> = ({ videa, pozadie }) => {
  const u = useUpravy();
  const { otvor, okno } = useOknoVidea();
  if (videa.length === 0) return null;
  const vlastne = obrazokUrl(pozadie);
  return (
    <section
      className="kl-sekcia kl-videa"
      aria-labelledby="kl-videa-nadpis"
      style={vlastne ? ({ '--kl-videa-pozadie': `url("${vlastne.replace(/"/g, '%22')}")` } as React.CSSProperties) : undefined}
    >
      <div className="kl-kontajner">
        <NadpisSekcie nadpis={u.text('videa_nadpis', 'Videá')} odkaz="/videa" svetly id="kl-videa-nadpis" />
        <div className="kl-mriezka-3 kl-pas-mobil">
          {videa.map((v) => {
            const dlzka = dlzkaVidea(v.dlzka);
            return (
              <a
                key={v.id}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="kl-video"
                onClick={(e) => {
                  // Video z YouTube / Vimeo sa prehrá v okne priamo na stránke
                  if (e.metaKey || e.ctrlKey || e.shiftKey || !embedVidea(v)) return;
                  e.preventDefault();
                  otvor(v);
                }}
              >
                <span className="kl-video__nahlad">
                  <Obrazok src={v.nahlad_url || v.nahlad} className="kl-video__obrazok" />
                  <span className="kl-video__prechod" aria-hidden="true" />
                  <span className="kl-video__play" aria-hidden="true">
                    <Ikona nazov="play" velkost={20} />
                  </span>
                  {dlzka && <span className="kl-video__dlzka">{dlzka}</span>}
                </span>
                <h4>{v.nazov}</h4>
              </a>
            );
          })}
        </div>
      </div>
      {okno}
    </section>
  );
};

// ===== Hráči =====

const Hraci: React.FC<{ tim: Tim; nadpis: string }> = ({ tim, nadpis }) => {
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const statistiky = useApi<StatistikaHraca[]>(`/teams/${tim.id}/players/stats`);
  const podlaId = useMemo(() => new Map((statistiky.data ?? []).map((s) => [s.hrac_id, s])), [statistiky.data]);
  const vybrani = useMemo(
    () =>
      [...(hraci.data?.hraci ?? [])]
        .sort(
          (a, b) =>
            Number(Boolean(b.fotka)) - Number(Boolean(a.fotka)) ||
            (podlaId.get(b.id)?.goly ?? 0) - (podlaId.get(a.id)?.goly ?? 0) ||
            (a.cislo_dresu ?? 99) - (b.cislo_dresu ?? 99)
        )
        .slice(0, 3),
    [hraci.data, podlaId]
  );
  if (vybrani.length === 0) return null;

  return (
    <section className="kl-sekcia kl-hraci" aria-labelledby="kl-hraci-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis={nadpis} odkaz={`/teams/${tim.id}`} id="kl-hraci-nadpis" />
        <div className="kl-mriezka-3 kl-pas-mobil">
          {vybrani.map((h) => (
            <KartaHraca key={h.id} hrac={h} statistika={podlaId.get(h.id)} karty />
          ))}
        </div>
      </div>
    </section>
  );
};

// ===== Úspechy =====

/** „4 Ligový titul", „4× Ligový titul" alebo „4 | Ligový titul" → { pocet, nazov } */
const citajUspechy = (text: string | null) =>
  (text || '')
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const m = /^(\d+)\s*(?:[×x*|:-]\s*)?(.+)$/i.exec(r);
      return m ? { pocet: m[1], nazov: m[2].trim() } : { pocet: '', nazov: r };
    });

const Uspechy: React.FC<{ text: string | null }> = ({ text }) => {
  const u = useUpravy();
  const uspechy = citajUspechy(text);
  if (uspechy.length === 0) return null;
  return (
    <section className="kl-sekcia kl-uspechy" aria-label="Úspechy">
      <div className="kl-kontajner">
        <NadpisStredovy nadpis={u.text('uspechy_nadpis', 'Úspechy')} />
        <div className="kl-uspechy__zoznam">
          {uspechy.map((u, i) => (
            <div key={i} className="kl-uspech">
              {u.pocet && <span className="kl-uspech__pocet">{u.pocet}×</span>}
              <span className="kl-uspech__nazov">{u.nazov}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===== Sleduj nás =====

/** @nasklub z adresy profilu (posledná časť cesty). */
const menoProfilu = (url: string, siet: string, nazovKlubu: string) => {
  try {
    const cast = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    if (!cast) return nazovKlubu;
    const meno = decodeURIComponent(cast).replace(/^@/, '');
    return siet === 'facebook' ? meno : `@${meno}`;
  } catch {
    return nazovKlubu;
  }
};

const SledujNas: React.FC<{ s: Record<string, string | number | boolean | null> }> = ({ s }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const siete = useSiete();
  if (siete.length === 0) return null;
  return (
    <section className="kl-sekcia kl-socialne" aria-labelledby="kl-socialne-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis={u.text('siete_nadpis', 'Sleduj nás')} svetly id="kl-socialne-nadpis" />
        <div className="kl-socialne__mriezka">
          {siete.map((siet) => {
            const pocet = String(s[`sledujuci_${siet.kluc}`] || '').trim();
            return (
              <a key={siet.kluc} href={siet.url} target="_blank" rel="noopener noreferrer" className="kl-kanal">
                <div className="kl-kanal__hlava">
                  <span className="kl-kanal__nazov">{siet.nazov}</span>
                  <span className="kl-kanal__ikona" style={{ background: SIETE.find((x) => x.kluc === siet.kluc)?.farba }}>
                    {siet.skratka}
                  </span>
                </div>
                <div>
                  <div className={`kl-kanal__pocet${pocet ? '' : ' kl-kanal__pocet--text'}`}>{pocet || 'Sledovať'}</div>
                  <div className="kl-kanal__meno">{menoProfilu(siet.url, siet.kluc, nastavenia.nazov)}</div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ===== Odkaz klubu =====

const TONY = ['var(--kl-tmava)', 'var(--kl-akcent)', '#c8862a'];

const OdkazKlubu: React.FC<{ s: Record<string, string | number | boolean | null> }> = ({ s }) => {
  const u = useUpravy();
  const karty = [1, 2, 3]
    .map((i) => ({
      i,
      nazov: String(s[`odkaz_${i}_nazov`] || '').trim(),
      obrazok: s[`odkaz_${i}_obrazok`] as string | null,
      odkaz: String(s[`odkaz_${i}_odkaz`] || '').trim(),
      stitok: String(s[`odkaz_${i}_stitok`] || '').trim(),
      ikona: (s[`odkaz_${i}_ikona`] as string | null) || null,
    }))
    .filter((k) => k.nazov && k.obrazok);
  if (karty.length === 0) return null;
  return (
    <section className="kl-sekcia kl-odkaz" aria-labelledby="kl-odkaz-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis={u.text('odkazy_nadpis', 'Odkaz klubu')} id="kl-odkaz-nadpis" />
        <div className="kl-mriezka-3 kl-pas-mobil">
          {karty.map((k) => (
            <div key={k.i} className="kl-odkaz-karta">
              <ObrazOdkazu obrazok={k.obrazok} ton={TONY[(k.i - 1) % TONY.length]} nazov={k.nazov} stitok={k.stitok} ikona={k.ikona} />
              <div className="kl-odkaz-karta__spodok">
                <span>{k.nazov}</span>
                {k.odkaz && (
                  <Odkaz to={k.odkaz} className="kl-tlacidlo-obrys kl-tlacidlo-obrys--male">
                    {u.text('text_objavit', 'Objaviť')}
                    <Ikona nazov="sipka" velkost={12} />
                  </Odkaz>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===== Stránka =====

const vyberTim = (timy: Tim[], id?: number | null) =>
  (id ? timy.find((t) => t.id === Number(id)) : null) ?? timy.find((t) => t.typ === 'muzi') ?? timy[0] ?? null;

const Uvod: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<Nastavenia>();
  useTitulok(nastavenia.nazov);

  const pocetSlidov = obmedz(s.uvod_pocet, 1, 6, 3);
  const pocetClankov = obmedz(s.pocet_clankov, 4, 8, 8);

  const zvyraznene = useApi<Clanok[]>(`/articles?featured=true&limit=${pocetSlidov}`);
  const clanky = useApi<Clanok[]>(`/articles?limit=${Math.max(pocetClankov, pocetSlidov)}`);
  const timy = useApi<Tim[]>('/teams');
  const videa = useApi<Video[]>('/videos?limit=3');
  const u = useUpravy();
  const partneri = useApi<Partner[]>(u.zapnute('ukazat_partnerov_uvod') ? '/sponsors?limit=500' : null);

  const zoradeneTimy = useMemo(
    () => [...(timy.data ?? [])].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id),
    [timy.data]
  );
  // Zápasy na úvode: len A a B tím (dospelí muži, seniori); ak klub taký tím nemá, všetky tímy
  // (staršie tímy môžu mať namiesto „seniori" kategóriu „Muži")
  const jeSeniorska = (k?: string | null) => ['seniori', 'muzi'].includes((k || 'seniori').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  const timyAB = zoradeneTimy.filter((t) => t.typ === 'muzi' && jeSeniorska(t.vekova_kategoria));
  const timyZapasov = (timyAB.length > 0 ? timyAB : zoradeneTimy).slice(0, obmedz(s.zapasy_timov, 1, 4, 2));
  const timHracov = vyberTim(zoradeneTimy, s.hraci_tim);

  // Slider: zvýraznené články, inak najnovšie
  const slidy = (zvyraznene.data?.length ? zvyraznene.data : clanky.data ?? []).slice(0, pocetSlidov);
  const nacitavaSlider = zvyraznene.nacitava || (clanky.nacitava && !zvyraznene.data?.length);

  return (
    <div className="kl-uvod">
      {nacitavaSlider ? (
        <section className="kl-hero" aria-busy="true" />
      ) : (
        <Slider clanky={slidy} stitok={s.uvod_stitok || 'Najnovšie články'} nahradnaFotka={s.uvod_fotka} />
      )}
      {u.zapnute('ukazat_zapasy') &&
        (timyZapasov.length > 0 ? (
          <ZapasyAVysledky timy={timyZapasov} vstupenky={(s.vstupenky_odkaz || '').trim() || null} />
        ) : (
          <div className="kl-zapasy kl-zapasy--prazdne" aria-hidden="true" />
        ))}
      {u.zapnute('ukazat_clanky') && <NajnovsieClanky clanky={(clanky.data ?? []).slice(0, pocetClankov)} />}
      {u.zapnute('ukazat_fanshop') && <Fanshop s={s} />}
      {u.zapnute('ukazat_videa') && <Videa videa={videa.data ?? []} pozadie={s.videa_pozadie} />}
      {u.zapnute('ukazat_hracov') && timHracov && <Hraci tim={timHracov} nadpis={(s.hraci_nadpis || '').trim() || timHracov.nazov} />}
      <Uspechy text={s.uspechy} />
      {u.zapnute('ukazat_siete') && <SledujNas s={s} />}
      {u.zapnute('ukazat_odkazy') && <OdkazKlubu s={s} />}
      <Partneri partneri={partneri.data ?? []} />
    </div>
  );
};

export default Uvod;
