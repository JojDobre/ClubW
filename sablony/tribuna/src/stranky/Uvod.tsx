// Umiestnenie: sablony/tribuna/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Tribúna - klasický klubový web striedaný s bento
// mriežkami (po vzore webov tradičných klubov, ktoré skladajú titulku
// z celých pásov a mozaiky dlaždíc).
//
//  1. klasický hero - fotka hlavnej správy cez celú šírku, vpravo zoznam
//     ďalších hlavných správ s priebehom,
//  2. bento „Zápasový deň" - najbližší zápas s odpočtom, posledný výsledok,
//     výrez tabuľky a dlaždica s odkazom,
//  3. klasické novinky - hlavný článok, zoznam titulkov a rad kariet,
//  4. bento „Klub" - hráč v popredí (prepínanie kádra) a sezóna v číslach,
//  5. klasický pás Klub TV na farbe klubu,
//  6. bento „Komunita" - fanshop, sociálne siete, úspechy a členstvo.
// Partneri sú nad pätičkou. Sekcie bez obsahu sa neukážu.

import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, useNastavenia, useNastaveniaSablony, type ProduktObchodu, type VlastnostiHlavickyBloku } from '@clubw/jadro';
import { Sekcie as SekcieSablony } from '../bloky';
import { IkonaSiete, podlaCasu, useHlavnyTim, useSiete } from '../Rozlozenie';
import { Obrazok, embedVidea, useOknoVidea, vyrezTabulky } from '../casti';
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
const VYSLEDKY: Record<string, string> = { V: 'Výhra', R: 'Remíza', P: 'Prehra' };

/** Klasický nadpis sekcie: štítok, nadpis medzi linkami, voliteľné záložky a odkaz. */
const HlavaSekcie: React.FC<{ nadpis: string; stitok?: string | null; odkaz?: string | null; textOdkazu?: string; id: string; svetla?: boolean; children?: React.ReactNode }> = ({
  nadpis,
  stitok,
  odkaz,
  textOdkazu,
  id,
  svetla,
  children,
}) => {
  const u = useUpravy();
  return (
    <div className={`tb-shlava${svetla ? ' tb-shlava--svetla' : ''}`}>
      <div className="tb-shlava__text">
        {stitok && <span className="tb-stitok">{stitok}</span>}
        <h2 id={id}>{nadpis}</h2>
      </div>
      {children}
      {odkaz && (
        <Odkaz to={odkaz} className="tb-shlava__odkaz">
          {textOdkazu || u.text('text_zobrazit_vsetky', 'Zobraziť všetky')}
          <Ikona nazov="sipka" velkost={14} />
        </Odkaz>
      )}
    </div>
  );
};

/** Nadpis vlastnej sekcie úvodu - rovnaký ako pri ostatných sekciách (odkaz „Zobraziť všetky" vedľa názvu). */
const HlavickaSekcie: React.FC<VlastnostiHlavickyBloku> = ({ nadpis, uvod, odkaz, textOdkazu }) => {
  const id = useId();
  return <HlavaSekcie nadpis={nadpis || ''} stitok={uvod} odkaz={odkaz} textOdkazu={textOdkazu || undefined} id={id} />;
};
const Sekcie: React.FC<{ p: string }> = ({ p }) => <SekcieSablony p={p} hlavicka={HlavickaSekcie} />;

// ===== 1. Hero =====

const Hero: React.FC<{ clanky: Clanok[]; nacitava: boolean; nahradnaFotka: string | null }> = ({ clanky, nacitava, nahradnaFotka }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const [aktivny, setAktivny] = useState(0);
  const [pauza, setPauza] = useState(false);
  const dotyk = useRef<number | null>(null);
  const sekundy = obmedz(u.s.hero_cas, 0, 30, 8);
  const pocet = clanky.length;

  useEffect(() => {
    if (aktivny >= pocet) setAktivny(0);
  }, [aktivny, pocet]);

  if (pocet === 0) {
    return (
      <section className="tb-hero tb-hero--prazdny" aria-busy={nacitava}>
        <div className="tb-kontajner tb-hero__obsah">{!nacitava && <h1 className="tb-hero__nadpis">{nastavenia.slogan || nastavenia.nazov}</h1>}</div>
      </section>
    );
  }

  const dalsi = () => setAktivny((a) => (a + 1) % pocet);
  const predosly = () => setAktivny((a) => (a - 1 + pocet) % pocet);
  const tlacidlo = u.text('hero_tlacidlo', 'Čítať článok');

  return (
    <section
      className={`tb-hero${pauza ? ' is-pauza' : ''}${pocet > 1 ? ' tb-hero--zoznam' : ''}`}
      aria-roledescription="slider"
      aria-label="Hlavné správy"
      style={{ '--tb-cas': `${sekundy}s` } as React.CSSProperties}
      onMouseEnter={() => setPauza(true)}
      onMouseLeave={() => setPauza(false)}
      onTouchStart={(e) => (dotyk.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (dotyk.current === null) return;
        const dx = e.changedTouches[0].clientX - dotyk.current;
        dotyk.current = null;
        if (Math.abs(dx) > 50) (dx < 0 ? dalsi : predosly)();
      }}
    >
      <div className="tb-hero__snimky">
        {clanky.map((c, i) => {
          const fotka = obrazokUrl(c.obrazok) || obrazokUrl(nahradnaFotka);
          return (
            <div key={c.id} className={`tb-hero__snimka${i === aktivny ? ' is-aktivna' : ''}`} aria-hidden={i !== aktivny}>
              <span className="tb-hero__fotka">{fotka ? <img src={fotka} alt="" onError={skryObrazok} loading={i === 0 ? 'eager' : 'lazy'} /> : null}</span>
            </div>
          );
        })}
      </div>
      <div className="tb-kontajner tb-hero__mriezka">
        <div className="tb-hero__obsah">
          {clanky.map((c, i) => (
            <div key={c.id} className={`tb-hero__text${i === aktivny ? ' is-aktivny' : ''}`} aria-hidden={i !== aktivny}>
              <span className="tb-hero__stitok">{c.kategoria?.nazov || 'Správy'}</span>
              {i === 0 ? <h1 className="tb-hero__nadpis">{c.nazov}</h1> : <h2 className="tb-hero__nadpis">{c.nazov}</h2>}
              {c.excerpt && <p className="tb-hero__perex">{c.excerpt}</p>}
              <div className="tb-hero__akcie">
                <Link to={`/clanek/${c.slug}`} className="tb-tlacidlo tb-tlacidlo--akcent" tabIndex={i === aktivny ? 0 : -1}>
                  {tlacidlo}
                  <Ikona nazov="sipka" velkost={14} />
                </Link>
                <span className="tb-hero__datum">{datum(c.publikovany_datum || c.vytvoreny)}</span>
              </div>
            </div>
          ))}
        </div>
        {pocet > 1 && (
          <div className="tb-hero__zoznam" role="tablist" aria-label="Hlavné správy">
            <span className="tb-hero__zoznam-nadpis">{u.text('hero_zoznam_nadpis', 'Hlavné správy')}</span>
            {clanky.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === aktivny}
                className={`tb-hero__polozka${i === aktivny ? ' is-aktivna' : ''}`}
                onClick={() => setAktivny(i)}
              >
                <span className="tb-hero__cislo">{String(i + 1).padStart(2, '0')}</span>
                <span className="tb-hero__ptext">
                  <small>{c.kategoria?.nazov || datum(c.publikovany_datum || c.vytvoreny)}</small>
                  <strong>{c.nazov}</strong>
                </span>
                <span className="tb-hero__priebeh">{i === aktivny && <i key={aktivny} className={sekundy > 0 ? 'is-bezi' : ''} onAnimationEnd={dalsi} />}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ===== 2. Bento: zápasový deň =====

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

const TimZapasu: React.FC<{ zapas: Zapas; strana: 'domaci' | 'hostia'; velky?: boolean }> = ({ zapas: z, strana, velky }) => {
  const { nastavenia } = useNastavenia();
  const nazov = strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z);
  return (
    <span className={`tb-zd__tim tb-zd__tim--${strana}`}>
      <Erb nazov={nazov} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} velky={velky} />
      <strong>{nazov}</strong>
    </span>
  );
};

const NajblizsiZapas: React.FC<{ zapas: Zapas; vstupenky: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const stav = stavZapasu(z);
  const zivy = stav === 'prebieha';
  const odpocet = useOdpocet(zivy ? null : z.datum_cas, u.zapnute('ukazat_odpocet'));
  return (
    <div className="tb-dlazdica tb-dlazdica--tmava tb-zd__najblizsi">
      <span className="tb-dlazdica__nadpis">
        {zivy ? 'Práve sa hrá' : 'Najbližší zápas'}
        {zivy && <b className="tb-zd__live">Live</b>}
      </span>
      <span className="tb-zd__sutaz">{sutazZapasu(z) || 'Zápas'}</span>
      <div className="tb-zd__duel">
        <TimZapasu zapas={z} strana="domaci" velky />
        <span className="tb-zd__stred">
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
        <TimZapasu zapas={z} strana="hostia" velky />
      </div>
      {z.miesto && (
        <span className="tb-zd__miesto">
          <Ikona nazov="miesto" velkost={14} /> {z.miesto}
        </span>
      )}
      {odpocet && (
        <div className="tb-zd__odpocet" aria-label="Do výkopu zostáva">
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
      <div className="tb-zd__akcie">
        {stav === 'naplanovany' && vstupenky && (
          <Odkaz to={vstupenky} className="tb-tlacidlo tb-tlacidlo--akcent">
            {u.text('vstupenky_text', 'Kúpiť vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className="tb-tlacidlo tb-tlacidlo--obrys-svetle">
          {u.text('text_detail', 'Detail zápasu')}
        </Link>
      </div>
    </div>
  );
};

const PoslednyZapas: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const v = vysledokKlubu(z);
  return (
    <Link to={`/matches/${z.id}`} className="tb-dlazdica tb-zd__posledny">
      <span className="tb-dlazdica__nadpis">
        Posledný zápas
        {v && <b className={`tb-zd__vysledok is-${v.toLowerCase()}`}>{VYSLEDKY[v]}</b>}
      </span>
      <span className="tb-zd__sutaz">
        {sutazZapasu(z) || 'Zápas'} · {datumKratky(z.datum_cas)}
      </span>
      <span className="tb-zd__riadky">
        {(['domaci', 'hostia'] as const).map((strana) => (
          <span key={strana} className="tb-zd__riadok">
            <TimZapasu zapas={z} strana={strana} />
            <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>
          </span>
        ))}
      </span>
      <span className="tb-dlazdica__viac">
        Zápis zo zápasu <Ikona nazov="sipka" velkost={13} />
      </span>
    </Link>
  );
};

const TabulkaDlazdice: React.FC<{ liga: Liga; riadky: RiadokTabulky[]; timId: number | null }> = ({ liga, riadky, timId }) => {
  const vyrez = vyrezTabulky(riadky, timId, 6);
  return (
    <div className="tb-dlazdica tb-zd__tabulka">
      <span className="tb-dlazdica__nadpis">
        Tabuľka
        <Link to={`/leagues/${liga.id}`}>Celá tabuľka</Link>
      </span>
      <span className="tb-zd__sutaz">{liga.nazov}</span>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="tb-zd__ttim">Tím</th>
            {liga.rezim_tabulky !== 'len_body' && <th>Z</th>}
            <th>B</th>
          </tr>
        </thead>
        <tbody>
          {vyrez.map((r) => (
            <tr key={r.id} className={r.tim_id === timId ? 'is-nas' : ''}>
              <td>{r.pozicia}</td>
              <td className="tb-zd__ttim">
                <span>
                  <Erb nazov={r.tim_nazov || r.custom_tim_nazov || 'Tím'} logo={r.tim_logo || r.custom_tim_logo} />
                  <span>{r.tim_nazov || r.custom_tim_nazov}</span>
                </span>
              </td>
              {liga.rezim_tabulky !== 'len_body' && <td>{r.zapasy}</td>}
              <td>
                <b>{r.body}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Zlatá dlaždica s odkazom (program zápasov, permanentky…). */
const OdkazovaDlazdica: React.FC = () => {
  const u = useUpravy();
  const odkaz = String(u.s.dlazdica_odkaz || '').trim() || '/matches';
  return (
    <Odkaz to={odkaz} className="tb-dlazdica tb-dlazdica--akcent tb-zd__odkaz">
      <Ikona nazov="zapasy" velkost={30} />
      <span className="tb-zd__odkaz-text">
        <strong>{u.text('dlazdica_nadpis', 'Program zápasov')}</strong>
        <small>{u.text('dlazdica_text', 'Všetky zápasy sezóny, výsledky a tabuľky')}</small>
      </span>
      <span className="tb-zd__odkaz-sipka" aria-hidden="true">
        <Ikona nazov="sipka" velkost={18} />
      </span>
    </Odkaz>
  );
};

const ZapasovyDen: React.FC<{ tim: Tim; ligy: Liga[]; vstupenky: string | null }> = ({ tim, ligy, vstupenky }) => {
  const u = useUpravy();
  const odohrane = useApi<Zapas[]>(`/matches?tim_id=${tim.id}&status=ukonceny&limit=3`);
  const zive = useApi<Zapas[]>(`/matches?tim_id=${tim.id}&status=prebieha&limit=1`);
  const buduce = useApi<Zapas[]>(`/matches?tim_id=${tim.id}&status=naplanovany&od_datumu=${dnes()}&poradie=asc&limit=3`);
  const liga = u.zapnute('ukazat_tabulku') ? ligy.find((l) => l.tim_id === tim.id && l.format !== 'turnaj') ?? null : null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);

  const posledny = [...(odohrane.data ?? [])].sort(podlaCasu).reverse()[0] ?? null;
  const najblizsi = zive.data?.[0] ?? [...(buduce.data ?? [])].sort(podlaCasu)[0] ?? null;
  const maTabulku = Boolean(liga && tabulka.data?.length);
  if (!posledny && !najblizsi && !maTabulku) return null;
  const trieda = [najblizsi ? 'n' : '', posledny ? 'p' : '', maTabulku ? 't' : ''].join('');

  return (
    <section className="tb-u-sekcia tb-u-sekcia--plocha" aria-labelledby="tb-u-zapasy">
      <div className="tb-kontajner">
        <HlavaSekcie nadpis={u.text('zapasy_nadpis', 'Zápasový deň')} stitok={tim.nazov} odkaz="/matches" textOdkazu="Všetky zápasy" id="tb-u-zapasy" />
        <div className={`tb-bento tb-zd tb-zd--${trieda}`}>
          {najblizsi && <NajblizsiZapas zapas={najblizsi} vstupenky={vstupenky} />}
          {posledny && <PoslednyZapas zapas={posledny} />}
          {liga && maTabulku && <TabulkaDlazdice liga={liga} riadky={tabulka.data ?? []} timId={tim.id} />}
          <OdkazovaDlazdica />
        </div>
      </div>
    </section>
  );
};

// ===== 3. Novinky (klasické) =====

const Novinky: React.FC<{ clanky: Clanok[] }> = ({ clanky }) => {
  const u = useUpravy();
  const [rubrika, setRubrika] = useState<string>('');
  const pocet = obmedz(u.s.novinky_pocet, 5, 12, 9);
  const rubriky = useMemo(() => {
    const m = new Map<string, string>();
    clanky.forEach((c) => c.kategoria && m.set(c.kategoria.slug, c.kategoria.nazov));
    return [...m.entries()].slice(0, 5);
  }, [clanky]);
  if (clanky.length === 0) return null;
  const zobrazene = clanky.filter((c) => !rubrika || c.kategoria?.slug === rubrika).slice(0, pocet);
  const [hlavny, ...ostatne] = zobrazene;
  const zoznam = ostatne.slice(0, 4);
  const rad = ostatne.slice(4);

  return (
    <section className="tb-u-sekcia tb-novinky" aria-labelledby="tb-u-novinky">
      <div className="tb-kontajner">
        <HlavaSekcie nadpis={u.text('novinky_nadpis', 'Novinky')} odkaz={rubrika ? `/clanky?rubrika=${encodeURIComponent(rubrika)}` : '/clanky'} textOdkazu="Všetky novinky" id="tb-u-novinky">
          {u.zapnute('novinky_rubriky') && rubriky.length > 1 && (
            <div className="tb-zalozky" role="tablist" aria-label="Rubriky">
              <button type="button" role="tab" aria-selected={!rubrika} className={!rubrika ? 'is-aktivna' : ''} onClick={() => setRubrika('')}>
                Všetko
              </button>
              {rubriky.map(([slug, nazov]) => (
                <button key={slug} type="button" role="tab" aria-selected={rubrika === slug} className={rubrika === slug ? 'is-aktivna' : ''} onClick={() => setRubrika(slug)}>
                  {nazov}
                </button>
              ))}
            </div>
          )}
        </HlavaSekcie>
        {hlavny && (
          <div className={`tb-novinky__hore${zoznam.length ? '' : ' tb-novinky__hore--sam'}`}>
            <Link to={`/clanek/${hlavny.slug}`} className="tb-novinky__hlavny">
              <Obrazok src={hlavny.obrazok} className="tb-novinky__obrazok" />
              <span className="tb-novinky__text">
                <span className="tb-novinky__rubrika">{hlavny.kategoria?.nazov || 'Správy'}</span>
                <strong>{hlavny.nazov}</strong>
                {hlavny.excerpt && <span className="tb-novinky__perex">{hlavny.excerpt}</span>}
                <small>{datum(hlavny.publikovany_datum || hlavny.vytvoreny)}</small>
              </span>
            </Link>
            {zoznam.length > 0 && (
              <ol className="tb-novinky__zoznam">
                {zoznam.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clanek/${c.slug}`} className="tb-novinky__polozka">
                      <Obrazok src={c.obrazok} className="tb-novinky__nahlad" />
                      <span>
                        <span className="tb-novinky__rubrika">{c.kategoria?.nazov || 'Správy'}</span>
                        <strong>{c.nazov}</strong>
                        <small>{datum(c.publikovany_datum || c.vytvoreny)}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        {rad.length > 0 && (
          <div className="tb-novinky__rad" style={{ '--tb-stlpce': Math.max(3, Math.min(4, rad.length)) } as React.CSSProperties}>
            {rad.slice(0, 4).map((c) => (
              <Link key={c.id} to={`/clanek/${c.slug}`} className="tb-novinky__karta">
                <Obrazok src={c.obrazok} className="tb-novinky__obrazok" />
                <span className="tb-novinky__rubrika">{c.kategoria?.nazov || 'Správy'}</span>
                <strong>{c.nazov}</strong>
                <small>{datum(c.publikovany_datum || c.vytvoreny)}</small>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ===== 4. Bento: klub (hráč v popredí, sezóna v číslach) =====

const HracVPopredi: React.FC<{ tim: Tim }> = ({ tim }) => {
  const u = useUpravy();
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const [index, setIndex] = useState(0);
  const vsetci = useMemo(
    () =>
      [...(hraci.data?.hraci ?? [])].sort(
        (a, b) => (POZICIE[a.pozicia ?? '']?.poradie ?? 9) - (POZICIE[b.pozicia ?? '']?.poradie ?? 9) || (a.cislo_dresu ?? 99) - (b.cislo_dresu ?? 99)
      ),
    [hraci.data]
  );
  if (vsetci.length === 0) return null;
  const h = vsetci[index % vsetci.length];
  const fotka = obrazokUrl(h.fotka);
  const posun = (smer: number) => setIndex((i) => (i + smer + vsetci.length) % vsetci.length);
  const udaje: Array<[string, string | number]> = [];
  udaje.push(['Pozícia', pozicia(h.pozicia) || '–']);
  if (h.vek) udaje.push(['Vek', h.vek]);
  if (h.narodnost) udaje.push(['Národnosť', h.narodnost]);
  if (h.vyska && udaje.length < 3) udaje.push(['Výška', `${h.vyska} cm`]);

  return (
    <div className="tb-dlazdica tb-dlazdica--tmava tb-klub__hrac">
      <span className="tb-klub__fotka">{fotka ? <img key={h.id} src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="tb-hrac__silueta" aria-hidden="true" />}</span>
      <span className="tb-klub__prechod" aria-hidden="true" />
      {h.cislo_dresu !== null && h.cislo_dresu !== undefined && (
        <span className="tb-klub__cislo" aria-hidden="true">
          {h.cislo_dresu}
        </span>
      )}
      <div className="tb-klub__hlava">
        <span className="tb-dlazdica__nadpis">{u.text('hraci_nadpis', 'Prvý tím')}</span>
        <span className="tb-klub__sipky">
          <button type="button" className="tb-kruh" onClick={() => posun(-1)} aria-label="Predchádzajúci hráč">
            <Ikona nazov="vlavo" velkost={14} />
          </button>
          <button type="button" className="tb-kruh" onClick={() => posun(1)} aria-label="Ďalší hráč">
            <Ikona nazov="vpravo" velkost={14} />
          </button>
        </span>
      </div>
      <Link to={`/players/${h.id}`} className="tb-klub__meno">
        <small>{h.meno}</small>
        <strong>{h.priezvisko}</strong>
      </Link>
      <dl className="tb-klub__udaje">
        {udaje.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <Link to={`/teams/${tim.id}`} className="tb-dlazdica__viac tb-klub__kader">
        Celý káder ({vsetci.length}) <Ikona nazov="sipka" velkost={13} />
      </Link>
    </div>
  );
};

const useSezona = (tim: Tim) => {
  const zapasy = useApi<Zapas[]>(`/matches?tim_id=${tim.id}&status=ukonceny&limit=100`);
  return useMemo(() => {
    const zoznam = [...(zapasy.data ?? [])].filter((z) => maVysledok(z) && vysledokKlubu(z)).sort(podlaCasu);
    let v = 0,
      r = 0,
      p = 0,
      za = 0,
      proti = 0,
      nula = 0;
    for (const z of zoznam) {
      const nasDomaci = z.domaci_tim_id === tim.id || (Boolean(z.domaci_tim_id) && z.hostujuci_tim_id !== tim.id);
      const my = nasDomaci ? z.goly_domaci! : z.goly_hostia!;
      const oni = nasDomaci ? z.goly_hostia! : z.goly_domaci!;
      za += my;
      proti += oni;
      if (oni === 0) nula++;
      const x = vysledokKlubu(z);
      if (x === 'V') v++;
      else if (x === 'R') r++;
      else p++;
    }
    return { pocet: zoznam.length, v, r, p, za, proti, nula, forma: zoznam.slice(-5) };
  }, [zapasy.data, tim.id]);
};

const Klub: React.FC<{ tim: Tim; hraciTim: Tim | null }> = ({ tim, hraciTim }) => {
  const u = useUpravy();
  const data = useSezona(tim);
  const sezona = u.zapnute('ukazat_sezonu') && data.pocet > 0;
  const hraci = u.zapnute('ukazat_hracov') && hraciTim;
  if (!sezona && !hraci) return null;
  const percento = (n: number) => `${(n / data.pocet) * 100}%`;
  const cisla: Array<[number | string, string]> = [
    [data.za, 'Strelených gólov'],
    [data.proti, 'Inkasovaných gólov'],
    [data.nula, 'Zápasov bez inkasovaného gólu'],
  ];

  return (
    <section className="tb-u-sekcia tb-u-sekcia--plocha" aria-labelledby="tb-u-klub">
      <div className="tb-kontajner">
        <HlavaSekcie nadpis={u.text('sezona_nadpis', 'Sezóna v číslach')} stitok={tim.nazov} odkaz="/stats" textOdkazu="Štatistiky" id="tb-u-klub" />
        <div className={`tb-bento tb-klub${hraci ? '' : ' tb-klub--bez-hraca'}${sezona ? '' : ' tb-klub--bez-sezony'}`}>
          {hraci && <HracVPopredi tim={hraciTim} />}
          {sezona && (
            <>
              <div className="tb-dlazdica tb-klub__bilancia">
                <span className="tb-dlazdica__nadpis">
                  Bilancia
                  <small>{data.pocet} zápasov</small>
                </span>
                <div className="tb-klub__vrd">
                  {(
                    [
                      ['v', data.v, 'Výhry'],
                      ['r', data.r, 'Remízy'],
                      ['p', data.p, 'Prehry'],
                    ] as const
                  ).map(([k, n, popis]) => (
                    <span key={k} className={`is-${k}`}>
                      <strong>{n}</strong>
                      <small>{popis}</small>
                    </span>
                  ))}
                </div>
                <div className="tb-klub__pruh" aria-hidden="true">
                  <i className="is-v" style={{ width: percento(data.v) }} />
                  <i className="is-r" style={{ width: percento(data.r) }} />
                  <i className="is-p" style={{ width: percento(data.p) }} />
                </div>
                <div className="tb-klub__forma">
                  <span>Forma</span>
                  {data.forma.map((z) => {
                    const x = vysledokKlubu(z)!;
                    return (
                      <Link key={z.id} to={`/matches/${z.id}`} className={`tb-forma-znak is-${x.toLowerCase()}`} title={`${nazovDomacich(z)} ${z.goly_domaci}:${z.goly_hostia} ${nazovHosti(z)}`}>
                        {x}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="tb-dlazdica tb-dlazdica--akcent tb-klub__uspesnost">
                <span className="tb-dlazdica__nadpis">Úspešnosť</span>
                <strong>{Math.round((data.v / data.pocet) * 100)} %</strong>
                <small>víťazných zápasov</small>
              </div>
              {cisla.slice(0, 3).map(([n, popis], i) => (
                <div key={popis} className={`tb-dlazdica tb-klub__cislo-dlazdica tb-klub__c${i + 1}`}>
                  <strong>{n}</strong>
                  <small>{popis}</small>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

// ===== 5. Klub TV (klasický pás) =====

const KlubTV: React.FC<{ videa: Video[] }> = ({ videa }) => {
  const u = useUpravy();
  const { otvor, okno } = useOknoVidea();
  if (videa.length === 0) return null;
  const [hlavne, ...ostatne] = videa;
  const prehraj = (v: Video) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || !embedVidea(v)) return;
    e.preventDefault();
    otvor(v);
  };
  return (
    <section className="tb-tv" aria-labelledby="tb-u-tv">
      <div className="tb-tv__pruhy" aria-hidden="true" />
      <div className="tb-kontajner">
        <HlavaSekcie nadpis={u.text('videa_nadpis', 'Klub TV')} stitok="Video" odkaz="/videa" textOdkazu="Všetky videá" id="tb-u-tv" svetla />
        <div className={`tb-tv__mriezka${ostatne.length ? '' : ' tb-tv__mriezka--1'}`}>
          <a href={hlavne.url} target="_blank" rel="noopener noreferrer" className="tb-tv__hlavne" onClick={prehraj(hlavne)}>
            <Obrazok src={hlavne.nahlad_url || hlavne.nahlad} className="tb-tv__obrazok" />
            <span className="tb-tv__prechod" aria-hidden="true" />
            <span className="tb-tv__play" aria-hidden="true">
              <Ikona nazov="play" velkost={30} />
            </span>
            <span className="tb-tv__popis">
              {dlzkaVidea(hlavne.dlzka) && <small>{dlzkaVidea(hlavne.dlzka)}</small>}
              <strong>{hlavne.nazov}</strong>
            </span>
          </a>
          {ostatne.length > 0 && (
            <div className="tb-tv__zoznam">
              {ostatne.slice(0, 3).map((v) => (
                <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="tb-tv__video" onClick={prehraj(v)}>
                  <span className="tb-tv__nahlad">
                    <Obrazok src={v.nahlad_url || v.nahlad} className="tb-tv__obrazok" />
                    <span className="tb-tv__play tb-tv__play--maly" aria-hidden="true">
                      <Ikona nazov="play" velkost={14} />
                    </span>
                  </span>
                  <span className="tb-tv__vtext">
                    {dlzkaVidea(v.dlzka) && <small>{dlzkaVidea(v.dlzka)}</small>}
                    <strong>{v.nazov}</strong>
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      {okno}
    </section>
  );
};

// ===== 6. Bento: komunita (fanshop, siete, úspechy, členstvo) =====

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

const FanshopDlazdica: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  const { produkty, obchod } = useProdukty(s);
  if (produkty.length === 0) return null;
  const text = u.text('fanshop_text', 'Dresy, šály a doplnky pre každého fanúšika.');
  return (
    <div className="tb-dlazdica tb-kom__shop">
      <div className="tb-kom__shop-hlava">
        <div>
          <span className="tb-stitok">Fanshop</span>
          <h3>{u.text('fanshop_nadpis', 'Oficiálny fanshop')}</h3>
          {text && <p>{text}</p>}
        </div>
        {obchod && (
          <Odkaz to={obchod} className="tb-tlacidlo tb-tlacidlo--tmave">
            {u.text('fanshop_tlacidlo', 'Do obchodu')}
          </Odkaz>
        )}
      </div>
      <div className="tb-kom__produkty">
        {produkty.slice(0, 3).map((p) => {
          const obsah = (
            <>
              <Obrazok src={p.obrazok} className="tb-kom__obrazok" alt={p.nazov} />
              <span className="tb-kom__pinfo">
                {p.nazov && <strong>{p.nazov}</strong>}
                {p.cena && <span>{p.cena}</span>}
              </span>
            </>
          );
          return p.odkaz ? (
            <Odkaz key={p.kluc} to={p.odkaz} className="tb-kom__produkt">
              {obsah}
            </Odkaz>
          ) : (
            <div key={p.kluc} className="tb-kom__produkt">
              {obsah}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const menoProfilu = (url: string) => {
  try {
    const cesta = new URL(url).pathname.split('/').filter(Boolean);
    const meno = cesta[cesta.length - 1] || '';
    return meno ? (meno.startsWith('@') ? meno : `@${meno}`) : new URL(url).hostname;
  } catch {
    return url;
  }
};

const SieteDlazdica: React.FC = () => {
  const u = useUpravy();
  const siete = useSiete();
  if (siete.length === 0) return null;
  return (
    <div className="tb-dlazdica tb-dlazdica--akcent tb-kom__siete">
      <span className="tb-dlazdica__nadpis">{u.text('siete_nadpis', 'Sledujte nás')}</span>
      <ul>
        {siete.slice(0, 4).map((x) => (
          <li key={x.kluc}>
            <a href={x.url} target="_blank" rel="noopener noreferrer">
              <span className="tb-kom__ikona">
                <IkonaSiete kluc={x.kluc} velkost={18} />
              </span>
              <span>
                <strong>{x.nazov}</strong>
                <small>{menoProfilu(x.url)}</small>
              </span>
              <Ikona nazov="von" velkost={14} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

const citajUspechy = (text: unknown) =>
  String(text || '')
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const m = /^(\d+)\s*(?:[×x*|:-]\s*)?(.+)$/i.exec(r);
      return m ? { pocet: m[1], nazov: m[2].trim() } : { pocet: '', nazov: r };
    });

const UspechyDlazdica: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  const uspechy = citajUspechy(s.uspechy).slice(0, 4);
  if (uspechy.length === 0) return null;
  return (
    <div className="tb-dlazdica tb-dlazdica--tmava tb-kom__uspechy">
      <span className="tb-dlazdica__nadpis">
        <Ikona nazov="pohar" velkost={16} />
        {u.text('uspechy_nadpis', 'Klub v číslach')}
      </span>
      <ul>
        {uspechy.map((x, i) => (
          <li key={i}>
            {x.pocet && <strong>{x.pocet}</strong>}
            <span>{x.nazov}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ClenstvoDlazdica: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  if (!u.zapnute('ukazat_vyzvu')) return null;
  const fotka = obrazokUrl((s.vyzva_obrazok as string | null) || null);
  const vyhody = u
    .text('vyzva_vyhody', 'Prednostný predaj vstupeniek\nPozvánky na zápasy a akcie klubu\nZľavy v oficiálnom fanshope')
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 4);
  return (
    <div className={`tb-dlazdica tb-kom__clenstvo${fotka ? ' tb-kom__clenstvo--fotka' : ''}`}>
      {fotka && <img className="tb-kom__fotka" src={fotka} alt="" loading="lazy" onError={skryObrazok} />}
      <div className="tb-kom__ctext">
        <span className="tb-stitok">{u.text('vyzva_stitok', 'Členstvo')}</span>
        <h3>{u.text('vyzva_nadpis', 'Staňte sa súčasťou {klub}')}</h3>
        <p>{u.text('vyzva_text', 'Pozvánky na zápasy, novinky a akcie klubu ako prví. Registrácia je zadarmo.')}</p>
      </div>
      {vyhody.length > 0 && (
        <ul className="tb-kom__vyhody">
          {vyhody.map((v, i) => (
            <li key={i}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {v}
            </li>
          ))}
        </ul>
      )}
      <Odkaz to={String(s.vyzva_odkaz || '').trim() || '/registracia'} className="tb-tlacidlo tb-tlacidlo--akcent">
        {u.text('vyzva_tlacidlo', 'Registrácia')}
        <Ikona nazov="sipka" velkost={14} />
      </Odkaz>
    </div>
  );
};

const Komunita: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  const siete = useSiete();
  const { produkty } = useProdukty(s);
  const shop = u.zapnute('ukazat_fanshop') && produkty.length > 0;
  const maSiete = u.zapnute('ukazat_siete') && siete.length > 0;
  const uspechy = citajUspechy(s.uspechy).length > 0;
  const clenstvo = u.zapnute('ukazat_vyzvu');
  if (!shop && !maSiete && !uspechy && !clenstvo) return null;
  const trieda = [shop ? 'f' : '', maSiete ? 's' : '', uspechy ? 'u' : '', clenstvo ? 'c' : ''].join('');
  return (
    <section className="tb-u-sekcia" aria-labelledby="tb-u-komunita">
      <div className="tb-kontajner">
        <HlavaSekcie nadpis={u.text('komunita_nadpis', 'Pre fanúšikov')} stitok={u.text('komunita_stitok', 'Komunita')} id="tb-u-komunita" />
        <div className={`tb-bento tb-kom tb-kom--${trieda}`}>
          {shop && <FanshopDlazdica s={s} />}
          {maSiete && <SieteDlazdica />}
          {uspechy && <UspechyDlazdica s={s} />}
          {clenstvo && <ClenstvoDlazdica s={s} />}
        </div>
      </div>
    </section>
  );
};

// ===== Stránka =====

const Uvod: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<Nastavenia>();
  const u = useUpravy();
  useTitulok(nastavenia.nazov);

  const pocetHero = obmedz(s.hero_pocet, 1, 5, 4);
  const zvyraznene = useApi<Clanok[]>(u.zapnute('ukazat_clanky') ? `/articles?featured=true&limit=${pocetHero}` : null);
  const clanky = useApi<Clanok[]>('/articles?limit=18');
  const { timy, hlavny } = useHlavnyTim();
  const ligy = useApi<Liga[]>(u.zapnute('ukazat_zapasy') ? '/leagues' : null);
  const videa = useApi<Video[]>(u.zapnute('ukazat_videa') ? '/videos?limit=4' : null);

  const vsetky = clanky.data ?? [];
  const hero = useMemo(() => {
    const vybrane = [...(zvyraznene.data ?? [])];
    for (const c of vsetky) {
      if (vybrane.length >= pocetHero) break;
      if (!vybrane.some((x) => x.id === c.id)) vybrane.push(c);
    }
    return vybrane.slice(0, pocetHero);
  }, [zvyraznene.data, vsetky, pocetHero]);
  const mimoHero = vsetky.filter((c) => !hero.some((h) => h.id === c.id));
  const novinky = mimoHero.length >= 3 ? mimoHero : vsetky;

  const timHracov = (s.hraci_tim ? timy.find((t) => t.id === Number(s.hraci_tim)) : null) ?? hlavny;
  const vstupenky = String(s.vstupenky_odkaz || '').trim() || null;

  return (
    <div className="tb-uvod">
      {u.zapnute('ukazat_clanky') && <Hero clanky={hero} nacitava={zvyraznene.nacitava || clanky.nacitava} nahradnaFotka={(s.uvod_fotka as string | null) || null} />}
      <Sekcie p="po_hero" />
      {u.zapnute('ukazat_zapasy') && hlavny && <ZapasovyDen tim={hlavny} ligy={ligy.data ?? []} vstupenky={vstupenky} />}
      <Sekcie p="po_zapasoch" />
      {u.zapnute('ukazat_novinky') && <Novinky clanky={novinky} />}
      <Sekcie p="po_novinkach" />
      {hlavny && <Klub tim={hlavny} hraciTim={timHracov} />}
      <Sekcie p="po_klube" />
      {u.zapnute('ukazat_videa') && <KlubTV videa={videa.data ?? []} />}
      <Sekcie p="po_videach" />
      <Komunita s={s} />
      <Sekcie p="koniec" />
    </div>
  );
};

export default Uvod;
