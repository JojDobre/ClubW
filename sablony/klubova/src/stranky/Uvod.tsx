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
import { KartaHraca, KartaZapasu, MetaClanku, Obrazok, Partneri, embedVidea, useOknoVidea } from '../casti';
import {
  Ikona,
  NadpisSekcie,
  NadpisStredovy,
  Odkaz,
  dlzkaVidea,
  dnes,
  obrazokUrl,
  useApi,
  useTitulok,
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

const ZapasyAVysledky: React.FC<{ timy: Tim[]; vstupenky: string | null }> = ({ timy, vstupenky }) => {
  const [timId, setTimId] = useState<number | null>(timy[0]?.id ?? null);
  const pas = useRef<HTMLDivElement>(null);
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

  const posun = (smer: 1 | -1) => {
    const el = pas.current;
    if (!el) return;
    const karta = el.children[0] as HTMLElement | undefined;
    el.scrollBy({ left: smer * ((karta?.offsetWidth ?? 280) + 20), behavior: 'smooth' });
  };

  return (
    <section className="kl-zapasy" aria-labelledby="kl-zapasy-nadpis">
      <div className="kl-zapasy__pozadie" aria-hidden="true" />
      <div className="kl-kontajner kl-zapasy__vnutro">
        <div className="kl-zapasy__hlava">
          <h2 id="kl-zapasy-nadpis">Zápasy a výsledky</h2>
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
          {zapasy.length > 3 && (
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
  );
};

// ===== Články =====

const NajnovsieClanky: React.FC<{ clanky: Clanok[] }> = ({ clanky }) => {
  const [hlavny, ...ostatne] = clanky;
  const bocne = ostatne.slice(0, 3);
  const spodne = ostatne.slice(3, 7);
  if (!hlavny) return null;
  return (
    <section className="kl-sekcia kl-clanky" aria-labelledby="kl-clanky-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis="Najnovšie články" odkaz="/clanky" id="kl-clanky-nadpis" />
        <div className="kl-clanky__horne">
          <Link to={`/clanek/${hlavny.slug}`} className="kl-clanok-hlavny">
            <Obrazok src={hlavny.obrazok} className="kl-clanok-hlavny__obrazok" />
            <div className="kl-clanok-hlavny__spodok">
              <div>
                <h3>{hlavny.nazov}</h3>
                <MetaClanku clanok={hlavny} />
              </div>
              <span className="kl-tlacidlo-obrys">
                Čítať viac
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
 * Fanshop: so zapnutým obchodom odporúčané produkty (inak najnovšie)
 * s odkazom do obchodu; bez obchodu tri produkty z nastavení šablóny.
 */
const Fanshop: React.FC<{ s: Record<string, string | number | boolean | null> }> = ({ s }) => {
  const { nastavenia } = useNastavenia();
  const zapnuty = Boolean(nastavenia.eshop?.zapnuty);
  const odporucane = useApi<ProduktObchodu[]>(zapnuty ? '/eshop/produkty?odporucane=1&limit=3' : null);
  const bezOdporucanych = zapnuty && !odporucane.nacitava && !odporucane.chyba && odporucane.data?.length === 0;
  const najnovsie = useApi<ProduktObchodu[]>(bezOdporucanych ? '/eshop/produkty?limit=3' : null);
  const zObchodu = (odporucane.data?.length ? odporucane.data : najnovsie.data) ?? [];

  if (zapnuty) {
    if (zObchodu.length === 0) return null;
    const mena = nastavenia.eshop?.mena ?? 'EUR';
    return (
      <section className="kl-sekcia kl-fanshop" aria-labelledby="kl-fanshop-nadpis">
        <div className="kl-kontajner">
          <NadpisSekcie nadpis="Fanshop" odkaz="/obchod" id="kl-fanshop-nadpis" />
          <div className="kl-mriezka-3 kl-pas-mobil">
            {zObchodu.map((p) => (
              <div key={p.id} className="kl-produkt">
                <Link to={`/obchod/${p.slug}`} className="kl-produkt__odkaz" tabIndex={-1} aria-hidden="true">
                  <Obrazok src={p.obrazok} className="kl-produkt__obrazok" alt={p.nazov} />
                </Link>
                <span className="kl-produkt__nazov">{p.nazov}</span>
                <div className="kl-produkt__spodok">
                  <span className="kl-produkt__cena">{cenaText(p.cena, mena)}</span>
                  <Link to={`/obchod/${p.slug}`} className="kl-tlacidlo kl-tlacidlo--tmave" aria-label={`Kúpiť ${p.nazov}`}>
                    Kúpiť
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const obchod = String(s.fanshop_odkaz || '').trim() || null;
  const produkty = [1, 2, 3]
    .map((i) => ({
      i,
      obrazok: s[`produkt_${i}_obrazok`] as string | null,
      cena: (s[`produkt_${i}_cena`] as string | null) || '',
      odkaz: String(s[`produkt_${i}_odkaz`] || '').trim() || obchod,
    }))
    .filter((p) => p.obrazok);
  if (produkty.length === 0) return null;
  return (
    <section className="kl-sekcia kl-fanshop" aria-labelledby="kl-fanshop-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis="Fanshop" odkaz={obchod} id="kl-fanshop-nadpis" />
        <div className="kl-mriezka-3 kl-pas-mobil">
          {produkty.map((p) => (
            <div key={p.i} className="kl-produkt">
              <Obrazok src={p.obrazok} className="kl-produkt__obrazok" alt={p.cena ? `Produkt za ${p.cena}` : 'Produkt'} />
              <div className="kl-produkt__spodok">
                <span className="kl-produkt__cena">{p.cena}</span>
                {p.odkaz && (
                  <Odkaz to={p.odkaz} className="kl-tlacidlo kl-tlacidlo--tmave">
                    Kúpiť
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
        <NadpisSekcie nadpis="Videá" odkaz="/videa" svetly id="kl-videa-nadpis" />
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
  const uspechy = citajUspechy(text);
  if (uspechy.length === 0) return null;
  return (
    <section className="kl-sekcia kl-uspechy" aria-label="Úspechy">
      <div className="kl-kontajner">
        <NadpisStredovy nadpis="Úspechy" />
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
  const { nastavenia } = useNastavenia();
  const siete = useSiete();
  if (siete.length === 0) return null;
  return (
    <section className="kl-sekcia kl-socialne" aria-labelledby="kl-socialne-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis="Sleduj nás" svetly id="kl-socialne-nadpis" />
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
  const { nastavenia } = useNastavenia();
  const karty = [1, 2, 3]
    .map((i) => ({
      i,
      nazov: String(s[`odkaz_${i}_nazov`] || '').trim(),
      obrazok: s[`odkaz_${i}_obrazok`] as string | null,
      odkaz: String(s[`odkaz_${i}_odkaz`] || '').trim(),
    }))
    .filter((k) => k.nazov && k.obrazok);
  if (karty.length === 0) return null;
  return (
    <section className="kl-sekcia kl-odkaz" aria-labelledby="kl-odkaz-nadpis">
      <div className="kl-kontajner">
        <NadpisSekcie nadpis="Odkaz klubu" id="kl-odkaz-nadpis" />
        <div className="kl-mriezka-3 kl-pas-mobil">
          {karty.map((k) => (
            <div key={k.i} className="kl-odkaz-karta">
              <div className="kl-odkaz-karta__obraz">
                <Obrazok src={k.obrazok} className="kl-odkaz-karta__fotka" />
                <span className="kl-odkaz-karta__ton" style={{ background: TONY[(k.i - 1) % TONY.length] }} aria-hidden="true" />
                <span className="kl-odkaz-karta__oval" aria-hidden="true">
                  <small>{nastavenia.skratka || nastavenia.nazov}</small>
                  <strong>{k.nazov}</strong>
                </span>
              </div>
              <div className="kl-odkaz-karta__spodok">
                <span>{k.nazov}</span>
                {k.odkaz && (
                  <Odkaz to={k.odkaz} className="kl-tlacidlo-obrys kl-tlacidlo-obrys--male">
                    Objaviť
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
  const partneri = useApi<Partner[]>(s.ukazat_partnerov ? '/sponsors' : null);

  const zoradeneTimy = useMemo(
    () => [...(timy.data ?? [])].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id),
    [timy.data]
  );
  const timyZapasov = zoradeneTimy.slice(0, obmedz(s.zapasy_timov, 1, 4, 2));
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
      {timyZapasov.length > 0 ? (
        <ZapasyAVysledky timy={timyZapasov} vstupenky={(s.vstupenky_odkaz || '').trim() || null} />
      ) : (
        <div className="kl-zapasy kl-zapasy--prazdne" aria-hidden="true" />
      )}
      <NajnovsieClanky clanky={(clanky.data ?? []).slice(0, pocetClankov)} />
      <Fanshop s={s} />
      <Videa videa={videa.data ?? []} pozadie={s.videa_pozadie} />
      {timHracov && <Hraci tim={timHracov} nadpis={(s.hraci_nadpis || '').trim() || timHracov.nazov} />}
      <Uspechy text={s.uspechy} />
      <SledujNas s={s} />
      <OdkazKlubu s={s} />
      <Partneri partneri={partneri.data ?? []} />
    </div>
  );
};

export default Uvod;
