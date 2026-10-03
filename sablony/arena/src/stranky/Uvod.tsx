// Umiestnenie: sablony/arena/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Aréna - moderný web s výraznou typografiou.
//
//  1. pohlcujúci hero v zaoblenom ráme - fotky hlavných správ, obrovský
//     obrysový nápis klubu, titulok a sklenená karta najbližšieho zápasu,
//  2. naklonený bežiaci pás s výsledkami a programom,
//  3. novinky ako vodorovný karusel vysokých kariet,
//  4. zápasy - prilepený nadpis naľavo a veľké riadky zápasov napravo,
//  5. sezóna v číslach na farebnom paneli,
//  6. káder ako karusel kariet hráčov,
//  7. médiá - video, fotogaléria a fanshop, výzva na členstvo.
// Partneri sú v pätičke. Sekcie bez obsahu sa neukážu.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, souborUrl, useNastavenia, useNastaveniaSablony, type ProduktObchodu } from '@clubw/jadro';
import { podlaCasu, useHlavnyTim } from '../Rozlozenie';
import { Obrazok, embedVidea, useOknoVidea } from '../casti';
import {
  Erb,
  Ikona,
  Odkaz,
  POZICIE,
  cas,
  datum,
  datumKratky,
  denVTyzdni,
  dlzkaVidea,
  dnes,
  logoStrany,
  maVysledok,
  nazovDomacich,
  nazovHosti,
  obrazokUrl,
  pozicia,
  skryObrazok,
  stavZapasu,
  useApi,
  useTitulok,
  useUpravy,
  vysledokKlubu,
  type Clanok,
  type Hrac,
  type Liga,
  type RiadokTabulky,
  type Tim,
  type Video,
  type Zapas,
} from '../spolocne';

type Nastavenia = Record<string, string | number | boolean | null>;

const obmedz = (n: unknown, min: number, max: number, predvolene: number) => {
  const c = n === null || n === undefined || n === '' ? NaN : Number(n);
  return Math.min(Math.max(Number.isFinite(c) ? c : predvolene, min), max);
};
const sutazZapasu = (z: Zapas) => [z.liga_nazov, z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ');

const ErbStrany: React.FC<{ zapas: Zapas; strana: 'domaci' | 'hostia'; velky?: boolean }> = ({ zapas: z, strana, velky }) => {
  const { nastavenia } = useNastavenia();
  const nazov = strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z);
  return <Erb nazov={nazov} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} velky={velky} />;
};

/** Nadpis sekcie: malý štítok, veľký nadpis, voliteľne šípky karuselu a odkaz. */
const HlavaSekcie: React.FC<{ stitok?: string; nadpis: string; odkaz?: string | null; textOdkazu?: string; id: string; svetla?: boolean; children?: React.ReactNode }> = ({
  stitok,
  nadpis,
  odkaz,
  textOdkazu,
  id,
  svetla,
  children,
}) => (
  <div className={`ar-shlava${svetla ? ' ar-shlava--svetla' : ''}`}>
    <div className="ar-shlava__text">
      {stitok && <span className="ar-stitok">{stitok}</span>}
      <h2 id={id}>{nadpis}</h2>
    </div>
    <div className="ar-shlava__akcie">
      {children}
      {odkaz && (
        <Odkaz to={odkaz} className="ar-sipkovy">
          <span>{textOdkazu || 'Zobraziť všetko'}</span>
          <i aria-hidden="true">
            <Ikona nazov="sipka" velkost={14} />
          </i>
        </Odkaz>
      )}
    </div>
  </div>
);

/** Šípky vodorovného karuselu. */
const useKarusel = () => {
  const pas = useRef<HTMLDivElement>(null);
  const posun = (smer: number) => pas.current?.scrollBy({ left: smer * pas.current.clientWidth * 0.8, behavior: 'smooth' });
  const sipky = (
    <span className="ar-sipky">
      <button type="button" onClick={() => posun(-1)} aria-label="Predchádzajúce">
        <Ikona nazov="vlavo" velkost={14} />
      </button>
      <button type="button" onClick={() => posun(1)} aria-label="Ďalšie">
        <Ikona nazov="vpravo" velkost={14} />
      </button>
    </span>
  );
  return { pas, sipky };
};

const useOdpocet = (ciel: string | null, zapnuty: boolean) => {
  const [teraz, setTeraz] = useState(() => Date.now());
  useEffect(() => {
    if (!ciel || !zapnuty) return;
    const t = window.setInterval(() => setTeraz(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [ciel, zapnuty]);
  if (!ciel || !zapnuty) return null;
  const zostava = new Date(ciel.replace(' ', 'T')).getTime() - teraz;
  if (!Number.isFinite(zostava) || zostava <= 0) return null;
  const s = Math.floor(zostava / 1000);
  return { dni: Math.floor(s / 86400), hodiny: Math.floor((s % 86400) / 3600), minuty: Math.floor((s % 3600) / 60), sekundy: s % 60 };
};

// ===== 1. Hero =====

const KartaZapasu: React.FC<{ zapas: Zapas; vstupenky: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const stav = stavZapasu(z);
  const zivy = stav === 'prebieha';
  const odpocet = useOdpocet(zivy ? null : z.datum_cas, u.zapnute('ukazat_odpocet'));
  return (
    <div className="ar-hero__zapas">
      <div className="ar-hero__zhlava">
        <span>{zivy ? 'Práve sa hrá' : 'Najbližší zápas'}</span>
        {zivy ? <b className="ar-live">Live</b> : <span>{sutazZapasu(z) || 'Zápas'}</span>}
      </div>
      <div className="ar-hero__zduel">
        <span className="ar-hero__ztim">
          <ErbStrany zapas={z} strana="domaci" velky />
          <strong>{nazovDomacich(z)}</strong>
        </span>
        <span className="ar-hero__zstred">
          {zivy && maVysledok(z) ? (
            <em>
              {z.goly_domaci}:{z.goly_hostia}
            </em>
          ) : (
            <>
              <em>{cas(z.datum_cas)}</em>
              <small>
                {denVTyzdni(z.datum_cas)} {datumKratky(z.datum_cas)}
              </small>
            </>
          )}
        </span>
        <span className="ar-hero__ztim">
          <ErbStrany zapas={z} strana="hostia" velky />
          <strong>{nazovHosti(z)}</strong>
        </span>
      </div>
      {odpocet && (
        <div className="ar-odpocet" aria-label="Do výkopu zostáva">
          {(
            [
              ['dni', 'dní'],
              ['hodiny', 'hod'],
              ['minuty', 'min'],
              ['sekundy', 'sek'],
            ] as const
          ).map(([k, n]) => (
            <span key={k}>
              <strong>{String(odpocet[k]).padStart(2, '0')}</strong>
              <small>{n}</small>
            </span>
          ))}
        </div>
      )}
      <div className="ar-hero__zakcie">
        {stav === 'naplanovany' && vstupenky && (
          <Odkaz to={vstupenky} className="ar-tlacidlo ar-tlacidlo--akcent">
            {u.text('vstupenky_text', 'Vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className="ar-tlacidlo ar-tlacidlo--sklo">
          {u.text('text_detail', 'Detail zápasu')}
        </Link>
      </div>
    </div>
  );
};

const Hero: React.FC<{ clanky: Clanok[]; zapas: Zapas | null; vstupenky: string | null; nahradnaFotka: string | null }> = ({ clanky, zapas, vstupenky, nahradnaFotka }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const [aktivny, setAktivny] = useState(0);
  const [pauza, setPauza] = useState(false);
  const sekundy = obmedz(u.s.hero_cas, 0, 30, 7);
  const pocet = clanky.length;

  useEffect(() => {
    if (aktivny >= pocet) setAktivny(0);
  }, [aktivny, pocet]);
  useEffect(() => {
    if (pocet < 2 || pauza || sekundy === 0) return;
    const t = window.setTimeout(() => setAktivny((a) => (a + 1) % pocet), sekundy * 1000);
    return () => window.clearTimeout(t);
  }, [aktivny, pocet, pauza, sekundy]);

  const obrys = u.text('hero_obrys', '') || nastavenia.skratka || nastavenia.nazov;
  const c = clanky[aktivny];

  return (
    <section className={`ar-hero${pocet === 0 ? ' ar-hero--prazdny' : ''}`} aria-label="Hlavné správy" onMouseEnter={() => setPauza(true)} onMouseLeave={() => setPauza(false)}>
      <div className="ar-hero__ram">
        <div className="ar-hero__fotky" aria-hidden="true">
          {clanky.map((x, i) => {
            const fotka = obrazokUrl(x.obrazok) || obrazokUrl(nahradnaFotka);
            return <span key={x.id} className={`ar-hero__fotka${i === aktivny ? ' is-aktivna' : ''}`}>{fotka ? <img src={fotka} alt="" onError={skryObrazok} /> : null}</span>;
          })}
        </div>
        <span className="ar-hero__obrys" aria-hidden="true">
          {obrys}
        </span>
        <div className="ar-hero__obsah">
          <div className="ar-hero__text">
            {c ? (
              <div key={c.id} className="ar-hero__clanok">
                <span className="ar-hero__stitok">{c.kategoria?.nazov || 'Správy'}</span>
                <h1>
                  <Link to={`/clanek/${c.slug}`}>{c.nazov}</Link>
                </h1>
                <div className="ar-hero__riadok">
                  <Link to={`/clanek/${c.slug}`} className="ar-sipkovy ar-sipkovy--svetly">
                    <span>{u.text('hero_tlacidlo', 'Čítať článok')}</span>
                    <i aria-hidden="true">
                      <Ikona nazov="sipka" velkost={14} />
                    </i>
                  </Link>
                  {pocet > 1 && (
                    <div className="ar-hero__body" role="tablist" aria-label="Vybrať správu">
                      {clanky.map((x, i) => (
                        <button key={x.id} type="button" role="tab" aria-selected={i === aktivny} aria-label={x.nazov} className={i === aktivny ? 'is-aktivny' : ''} onClick={() => setAktivny(i)}>
                          {i === aktivny && <i key={aktivny} style={{ animationDuration: `${sekundy}s` }} className={pauza || sekundy === 0 ? 'is-pauza' : ''} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <h1>{nastavenia.slogan || nastavenia.nazov}</h1>
            )}
          </div>
          {zapas && <KartaZapasu zapas={zapas} vstupenky={vstupenky} />}
        </div>
      </div>
    </section>
  );
};

// ===== 2. Bežiaci pás =====

const Pas: React.FC<{ zapasy: Zapas[] }> = ({ zapasy }) => {
  if (zapasy.length === 0) return null;
  // Pri malom počte zápasov sa položky zopakujú, aby pás nemal medzery
  const opakovanie = Math.max(1, Math.ceil(8 / zapasy.length));
  const zoznam = Array.from({ length: opakovanie }, (_, i) => zapasy.map((z) => ({ z, kluc: `${z.id}-${i}` }))).flat();
  const polozky = zoznam.map(({ z, kluc }) => {
    const skore = maVysledok(z) && stavZapasu(z) !== 'naplanovany';
    return (
      <Link key={kluc} to={`/matches/${z.id}`} className="ar-pas__polozka">
        <small>{skore ? `${datumKratky(z.datum_cas)} · koniec` : `${denVTyzdni(z.datum_cas)} ${datumKratky(z.datum_cas)} · ${cas(z.datum_cas)}`}</small>
        <span>
          {nazovDomacich(z)} <b>{skore ? `${z.goly_domaci}:${z.goly_hostia}` : 'vs'}</b> {nazovHosti(z)}
        </span>
        <i aria-hidden="true">✦</i>
      </Link>
    );
  });
  return (
    <div className="ar-pas" aria-label="Výsledky a program">
      <div className="ar-pas__vnutro">
        <div className="ar-pas__rad">{polozky}</div>
        <div className="ar-pas__rad" aria-hidden="true">
          {polozky}
        </div>
      </div>
    </div>
  );
};

// ===== 3. Novinky =====

const Novinky: React.FC<{ clanky: Clanok[] }> = ({ clanky }) => {
  const u = useUpravy();
  const { pas, sipky } = useKarusel();
  if (clanky.length === 0) return null;
  return (
    <section className="ar-u-sekcia" aria-labelledby="ar-u-novinky">
      <div className="ar-kontajner">
        <HlavaSekcie stitok={u.text('novinky_stitok', 'Najnovšie')} nadpis={u.text('novinky_nadpis', 'Novinky')} odkaz="/clanky" textOdkazu="Všetky novinky" id="ar-u-novinky">
          {clanky.length > 3 && sipky}
        </HlavaSekcie>
      </div>
      <div className="ar-karusel" ref={pas}>
        {clanky.map((c, i) => (
          <Link key={c.id} to={`/clanek/${c.slug}`} className={`ar-nkarta${i === 0 ? ' ar-nkarta--siroka' : ''}`}>
            <Obrazok src={c.obrazok} className="ar-nkarta__obrazok" />
            <span className="ar-nkarta__text">
              <span className="ar-nkarta__hore">
                <span className="ar-nkarta__rubrika">{c.kategoria?.nazov || 'Správy'}</span>
                <span>{datum(c.publikovany_datum || c.vytvoreny)}</span>
              </span>
              <strong>{c.nazov}</strong>
            </span>
            <i className="ar-nkarta__sipka" aria-hidden="true">
              <Ikona nazov="sipka" velkost={16} />
            </i>
          </Link>
        ))}
      </div>
    </section>
  );
};

// ===== 4. Zápasy =====

const RiadokZapasu: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const stav = stavZapasu(z);
  const skore = maVysledok(z) && stav !== 'naplanovany';
  const v = skore ? vysledokKlubu(z) : null;
  return (
    <Link to={`/matches/${z.id}`} className={`ar-zriadok${skore ? ' is-odohrany' : ''}`}>
      <span className="ar-zriadok__kedy">
        <strong>{datumKratky(z.datum_cas)}</strong>
        <small>{skore ? 'Koniec' : `${denVTyzdni(z.datum_cas)} · ${cas(z.datum_cas)}`}</small>
      </span>
      <span className="ar-zriadok__tim ar-zriadok__tim--domaci">
        <strong>{nazovDomacich(z)}</strong>
        <ErbStrany zapas={z} strana="domaci" />
      </span>
      <span className={`ar-zriadok__skore${v ? ` is-${v.toLowerCase()}` : ''}`}>{skore ? `${z.goly_domaci}:${z.goly_hostia}` : 'vs'}</span>
      <span className="ar-zriadok__tim">
        <ErbStrany zapas={z} strana="hostia" />
        <strong>{nazovHosti(z)}</strong>
      </span>
      <span className="ar-zriadok__sutaz">{sutazZapasu(z) || 'Zápas'}</span>
      <i className="ar-zriadok__sipka" aria-hidden="true">
        <Ikona nazov="sipka" velkost={15} />
      </i>
    </Link>
  );
};

const Zapasy: React.FC<{ tim: Tim; minule: Zapas[]; dalsie: Zapas[]; riadok: RiadokTabulky | null; liga: Liga | null }> = ({ tim, minule, dalsie, riadok, liga }) => {
  const u = useUpravy();
  if (minule.length === 0 && dalsie.length === 0) return null;
  return (
    <section className="ar-u-sekcia ar-zapasy-u" aria-labelledby="ar-u-zapasy">
      <div className="ar-kontajner ar-zapasy-u__mriezka">
        <div className="ar-zapasy-u__bok">
          <span className="ar-stitok">{tim.nazov}</span>
          <h2 id="ar-u-zapasy">{u.text('zapasy_nadpis', 'Zápasy')}</h2>
          {riadok && liga && (
            <Link to={`/leagues/${liga.id}`} className="ar-zapasy-u__tabulka">
              <strong>{riadok.pozicia}.</strong>
              <span>
                miesto v tabuľke
                <small>
                  {liga.nazov} · {riadok.body} bodov
                </small>
              </span>
            </Link>
          )}
          <Link to="/matches" className="ar-sipkovy">
            <span>Celý program</span>
            <i aria-hidden="true">
              <Ikona nazov="sipka" velkost={14} />
            </i>
          </Link>
        </div>
        <div className="ar-zapasy-u__zoznam">
          {minule.length > 0 && <span className="ar-zapasy-u__skupina">Posledné výsledky</span>}
          {minule.map((z) => (
            <RiadokZapasu key={z.id} zapas={z} />
          ))}
          {dalsie.length > 0 && <span className="ar-zapasy-u__skupina">Program</span>}
          {dalsie.map((z) => (
            <RiadokZapasu key={z.id} zapas={z} />
          ))}
        </div>
      </div>
    </section>
  );
};

// ===== 5. Sezóna v číslach =====

const Sezona: React.FC<{ tim: Tim }> = ({ tim }) => {
  const u = useUpravy();
  const zapasy = useApi<Zapas[]>(`/matches?tim_id=${tim.id}&status=ukonceny&limit=100`);
  const data = useMemo(() => {
    const zoznam = [...(zapasy.data ?? [])].filter((z) => maVysledok(z) && vysledokKlubu(z)).sort(podlaCasu);
    let za = 0,
      nula = 0;
    const p = { V: 0, R: 0, P: 0 };
    for (const z of zoznam) {
      const nasDomaci = z.domaci_tim_id === tim.id || (Boolean(z.domaci_tim_id) && z.hostujuci_tim_id !== tim.id);
      za += nasDomaci ? z.goly_domaci! : z.goly_hostia!;
      if ((nasDomaci ? z.goly_hostia : z.goly_domaci) === 0) nula++;
      p[vysledokKlubu(z)!]++;
    }
    return { pocet: zoznam.length, ...p, za, nula, forma: zoznam.slice(-5) };
  }, [zapasy.data, tim.id]);
  if (data.pocet === 0) return null;
  const cisla: Array<[number | string, string]> = [
    [data.pocet, 'odohraných zápasov'],
    [data.V, 'výhier'],
    [data.za, 'strelených gólov'],
    [data.nula, 'čistých kont'],
  ];
  return (
    <section className="ar-kontajner ar-cisla" aria-labelledby="ar-u-cisla">
      <div className="ar-cisla__hlava">
        <span className="ar-stitok">{tim.nazov}</span>
        <h2 id="ar-u-cisla">{u.text('sezona_nadpis', 'Sezóna v číslach')}</h2>
        <div className="ar-cisla__forma">
          <span>Forma</span>
          {data.forma.map((z) => {
            const x = vysledokKlubu(z)!;
            return (
              <Link key={z.id} to={`/matches/${z.id}`} className={`ar-forma__znak is-${x.toLowerCase()}`} title={`${nazovDomacich(z)} ${z.goly_domaci}:${z.goly_hostia} ${nazovHosti(z)}`}>
                {x}
              </Link>
            );
          })}
        </div>
      </div>
      <dl className="ar-cisla__mriezka">
        {cisla.map(([n, popis]) => (
          <div key={popis}>
            <dt>{n}</dt>
            <dd>{popis}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

// ===== 6. Káder =====

const Kader: React.FC<{ tim: Tim }> = ({ tim }) => {
  const u = useUpravy();
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const { pas, sipky } = useKarusel();
  const vsetci = useMemo(
    () =>
      [...(hraci.data?.hraci ?? [])].sort(
        (a, b) => (POZICIE[a.pozicia ?? '']?.poradie ?? 9) - (POZICIE[b.pozicia ?? '']?.poradie ?? 9) || (a.cislo_dresu ?? 99) - (b.cislo_dresu ?? 99)
      ),
    [hraci.data]
  );
  if (vsetci.length === 0) return null;
  return (
    <section className="ar-u-sekcia" aria-labelledby="ar-u-kader">
      <div className="ar-kontajner">
        <HlavaSekcie stitok={tim.nazov} nadpis={u.text('hraci_nadpis', 'Káder')} odkaz={`/teams/${tim.id}`} textOdkazu="Celý káder" id="ar-u-kader">
          {sipky}
        </HlavaSekcie>
      </div>
      <div className="ar-karusel ar-karusel--hraci" ref={pas}>
        {vsetci.map((h) => {
          const fotka = obrazokUrl(h.fotka);
          return (
            <Link key={h.id} to={`/players/${h.id}`} className="ar-hkarta">
              {h.cislo_dresu !== null && h.cislo_dresu !== undefined && (
                <span className="ar-hkarta__cislo" aria-hidden="true">
                  {h.cislo_dresu}
                </span>
              )}
              <span className="ar-hkarta__foto">{fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="ar-hrac__silueta" aria-hidden="true" />}</span>
              <span className="ar-hkarta__text">
                <small>{pozicia(h.pozicia)}</small>
                <strong>
                  {h.meno} <b>{h.priezvisko}</b>
                </strong>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

// ===== 7. Médiá a komunita =====

interface GaleriaUvodu {
  id: number;
  nazov: string;
  pocet_obrazkov?: number;
}

const useProdukty = (s: Nastavenia) => {
  const { nastavenia } = useNastavenia();
  const zapnuty = Boolean(nastavenia.eshop?.zapnuty);
  const odporucane = useApi<ProduktObchodu[]>(zapnuty ? '/eshop/produkty?odporucane=1&limit=3' : null);
  const bezOdporucanych = zapnuty && !odporucane.nacitava && !odporucane.chyba && (odporucane.data?.length ?? 0) < 3;
  const najnovsie = useApi<ProduktObchodu[]>(bezOdporucanych ? '/eshop/produkty?limit=3' : null);
  const mena = nastavenia.eshop?.mena ?? 'EUR';
  const zoznam = zapnuty ? ((najnovsie.data?.length ?? 0) > (odporucane.data?.length ?? 0) ? najnovsie.data : odporucane.data) ?? [] : [];
  const produkty: Array<{ kluc: string; nazov: string; obrazok: string | null; cena: string; odkaz: string | null }> = zapnuty
    ? zoznam.map((p) => ({ kluc: String(p.id), nazov: p.nazov, obrazok: p.obrazok ?? null, cena: cenaText(p.cena, mena), odkaz: `/obchod/${p.slug}` }))
    : [1, 2, 3]
        .map((i) => ({
          kluc: String(i),
          nazov: String(s[`produkt_${i}_nazov`] || ''),
          obrazok: (s[`produkt_${i}_obrazok`] as string | null) || null,
          cena: String(s[`produkt_${i}_cena`] || ''),
          odkaz: String(s[`produkt_${i}_odkaz`] || '').trim() || String(s.fanshop_odkaz || '').trim() || null,
        }))
        .filter((p) => p.obrazok);
  const obchod = zapnuty ? '/obchod' : String(s.fanshop_odkaz || '').trim() || null;
  return { produkty, obchod };
};

const Media: React.FC<{ s: Nastavenia; videa: Video[] }> = ({ s, videa }) => {
  const u = useUpravy();
  const { otvor, okno } = useOknoVidea();
  const galerie = useApi<GaleriaUvodu[]>(u.zapnute('ukazat_galeriu') ? '/galleries?limit=8' : null);
  const galeria = (galerie.data ?? []).find((g) => (g.pocet_obrazkov ?? 0) > 0) ?? null;
  const detail = useApi<{ obrazky?: Array<{ id: number; url_stredny?: string | null; url_original?: string | null }> }>(galeria ? `/galleries/${galeria.id}` : null);
  const fotky = (detail.data?.obrazky ?? []).slice(0, 3);
  const { produkty, obchod } = useProdukty(s);
  const video = u.zapnute('ukazat_videa') ? videa[0] : undefined;
  const shop = u.zapnute('ukazat_fanshop') && produkty.length > 0;
  if (!video && !galeria && !shop) return null;
  const prehraj = (v: Video) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || !embedVidea(v)) return;
    e.preventDefault();
    otvor(v);
  };
  return (
    <section className="ar-u-sekcia" aria-labelledby="ar-u-media">
      <div className="ar-kontajner">
        <HlavaSekcie stitok={u.text('media_stitok', 'Médiá')} nadpis={u.text('media_nadpis', 'Za kulisami')} odkaz="/videa" textOdkazu="Klub TV" id="ar-u-media" />
        <div className={`ar-media${video ? '' : ' ar-media--bez-videa'}`}>
          {video && (
            <a href={video.url} target="_blank" rel="noopener noreferrer" className="ar-media__video" onClick={prehraj(video)}>
              <Obrazok src={video.nahlad_url || video.nahlad} className="ar-media__obrazok" />
              <span className="ar-media__play" aria-hidden="true">
                <Ikona nazov="play" velkost={26} />
              </span>
              <span className="ar-media__popis">
                <span className="ar-hero__stitok">{u.text('videa_nadpis', 'Klub TV')}</span>
                <strong>{video.nazov}</strong>
                {dlzkaVidea(video.dlzka) && <small>{dlzkaVidea(video.dlzka)}</small>}
              </span>
            </a>
          )}
          <div className="ar-media__bok">
            {galeria && (
              <Link to={`/galleries/${galeria.id}`} className="ar-media__galeria">
                <span className="ar-media__fotky">
                  {fotky.map((f) => (
                    <img key={f.id} src={souborUrl(f.url_stredny || f.url_original || '')} alt="" loading="lazy" onError={skryObrazok} />
                  ))}
                </span>
                <span className="ar-media__gtext">
                  <small>Fotogaléria · {galeria.pocet_obrazkov} fotiek</small>
                  <strong>{galeria.nazov}</strong>
                </span>
              </Link>
            )}
            {shop && (
              <div className="ar-media__shop">
                <div className="ar-media__shop-hlava">
                  <strong>{u.text('fanshop_nadpis', 'Fanshop')}</strong>
                  {obchod && (
                    <Odkaz to={obchod} className="ar-sipkovy ar-sipkovy--maly">
                      <span>{u.text('fanshop_tlacidlo', 'Do obchodu')}</span>
                      <i aria-hidden="true">
                        <Ikona nazov="sipka" velkost={12} />
                      </i>
                    </Odkaz>
                  )}
                </div>
                <div className="ar-media__produkty">
                  {produkty.slice(0, 3).map((p) =>
                    p.odkaz ? (
                      <Odkaz key={p.kluc} to={p.odkaz} className="ar-media__produkt" ariaLabel={p.nazov}>
                        <Obrazok src={p.obrazok} className="ar-media__pobrazok" alt={p.nazov} />
                        {p.cena && <span>{p.cena}</span>}
                      </Odkaz>
                    ) : (
                      <div key={p.kluc} className="ar-media__produkt">
                        <Obrazok src={p.obrazok} className="ar-media__pobrazok" alt={p.nazov} />
                        {p.cena && <span>{p.cena}</span>}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {okno}
    </section>
  );
};

const Vyzva: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  return (
    <section className="ar-kontajner ar-vyzva" aria-label="Členstvo">
      <div className="ar-vyzva__text">
        <span className="ar-stitok">{u.text('vyzva_stitok', 'Členstvo')}</span>
        <h2>{u.text('vyzva_nadpis', 'Buď súčasťou {klub}')}</h2>
        <p>{u.text('vyzva_text', 'Pozvánky na zápasy, novinky a akcie klubu ako prví. Registrácia je zadarmo.')}</p>
      </div>
      <Odkaz to={String(s.vyzva_odkaz || '').trim() || '/registracia'} className="ar-vyzva__tlacidlo">
        <span>{u.text('vyzva_tlacidlo', 'Pridať sa')}</span>
        <i aria-hidden="true">
          <Ikona nazov="sipka" velkost={22} />
        </i>
      </Odkaz>
    </section>
  );
};

// ===== Stránka =====

const Uvod: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<Nastavenia>();
  const u = useUpravy();
  useTitulok(nastavenia.nazov);

  const pocetHero = obmedz(s.hero_pocet, 1, 5, 3);
  const zvyraznene = useApi<Clanok[]>(u.zapnute('ukazat_clanky') ? `/articles?featured=true&limit=${pocetHero}` : null);
  const clanky = useApi<Clanok[]>('/articles?limit=14');
  const { timy, hlavny } = useHlavnyTim();
  const ligy = useApi<Liga[]>('/leagues');
  const videa = useApi<Video[]>(u.zapnute('ukazat_videa') ? '/videos?limit=1' : null);
  const odohrane = useApi<Zapas[]>(hlavny ? `/matches?tim_id=${hlavny.id}&status=ukonceny&limit=4` : null);
  const zive = useApi<Zapas[]>(hlavny ? `/matches?tim_id=${hlavny.id}&status=prebieha&limit=1` : null);
  const buduce = useApi<Zapas[]>(hlavny ? `/matches?tim_id=${hlavny.id}&status=naplanovany&od_datumu=${dnes()}&poradie=asc&limit=4` : null);
  const liga = hlavny ? (ligy.data ?? []).find((l) => l.tim_id === hlavny.id && l.format !== 'turnaj') ?? null : null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);

  const vsetky = clanky.data ?? [];
  const hero = useMemo(() => {
    const vybrane = [...(zvyraznene.data ?? [])];
    for (const c of vsetky) {
      if (vybrane.length >= pocetHero) break;
      if (!vybrane.some((x) => x.id === c.id)) vybrane.push(c);
    }
    return vybrane.slice(0, pocetHero);
  }, [zvyraznene.data, vsetky, pocetHero]);
  const mimo = vsetky.filter((c) => !hero.some((h) => h.id === c.id));
  const novinky = (mimo.length >= 3 ? mimo : vsetky).slice(0, obmedz(s.novinky_pocet, 3, 12, 8));

  const minule = [...(odohrane.data ?? [])].sort(podlaCasu);
  const dalsie = [...(buduce.data ?? [])].sort(podlaCasu);
  const najblizsi = zive.data?.[0] ?? dalsie[0] ?? null;
  const riadok = (tabulka.data ?? []).find((r) => r.tim_id === hlavny?.id) ?? null;
  const timHracov = (s.hraci_tim ? timy.find((t) => t.id === Number(s.hraci_tim)) : null) ?? hlavny;
  const vstupenky = String(s.vstupenky_odkaz || '').trim() || null;

  return (
    <div className="ar-uvod">
      {u.zapnute('ukazat_clanky') && <Hero clanky={hero} zapas={u.zapnute('ukazat_zapas_hero') ? najblizsi : null} vstupenky={vstupenky} nahradnaFotka={(s.uvod_fotka as string | null) || null} />}
      {u.zapnute('ukazat_pas') && <Pas zapasy={[...minule.slice(-3), ...(zive.data ?? []), ...dalsie]} />}
      {u.zapnute('ukazat_novinky') && <Novinky clanky={novinky} />}
      {u.zapnute('ukazat_zapasy') && hlavny && <Zapasy tim={hlavny} minule={minule.slice(-2).reverse()} dalsie={dalsie.slice(0, 3)} riadok={riadok} liga={liga} />}
      {u.zapnute('ukazat_sezonu') && hlavny && <Sezona tim={hlavny} />}
      {u.zapnute('ukazat_hracov') && timHracov && <Kader tim={timHracov} />}
      <Media s={s} videa={videa.data ?? []} />
      {u.zapnute('ukazat_vyzvu') && <Vyzva s={s} />}
    </div>
  );
};

export default Uvod;
