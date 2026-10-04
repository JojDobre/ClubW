// Umiestnenie: sablony/derby/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Derby - klasický klubový web s bento mriežkami.
// Poradie je opačné ako pri Tribúne: titulka začína mozaikou.
//
//  1. bento titulka - hlavná správa, dve ďalšie správy a najbližší zápas
//     s odpočtom v jednej mozaike,
//  2. klasický pás zápasov - posledné výsledky a program ako rad kariet,
//  3. klasické novinky v stĺpci s bočným panelom (tabuľka, bilancia
//     sezóny, najbližšie zápasy) ako na portáloch klubov,
//  4. klasický pás kádra na farbe klubu s pozíciami,
//  5. bento médiá a komunita - video, fotogaléria, fanshop, členstvo,
//     sociálne siete a úspechy.
// Partneri sú nad pätičkou. Sekcie bez obsahu sa neukážu.

import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, souborUrl, useNastavenia, useNastaveniaSablony, type ProduktObchodu, type VlastnostiHlavickyBloku } from '@clubw/jadro';
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

/** Klasický nadpis sekcie: štítok, nadpis s farebným pruhom, voliteľný obsah a odkaz. */
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
    <div className={`dr-shlava${svetla ? ' dr-shlava--svetla' : ''}`}>
      <div className="dr-shlava__text">
        {stitok && <span className="dr-stitok">{stitok}</span>}
        <h2 id={id}>{nadpis}</h2>
      </div>
      {children}
      {odkaz && (
        <Odkaz to={odkaz} className="dr-shlava__odkaz">
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

const TimZapasu: React.FC<{ zapas: Zapas; strana: 'domaci' | 'hostia'; velky?: boolean; trieda?: string }> = ({ zapas: z, strana, velky, trieda = 'dr-tim' }) => {
  const { nastavenia } = useNastavenia();
  const nazov = strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z);
  return (
    <span className={`${trieda} ${trieda}--${strana}`}>
      <Erb nazov={nazov} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} velky={velky} />
      <strong>{nazov}</strong>
    </span>
  );
};

/** Zápasy hlavného tímu: odohrané (najnovšie posledné) a budúce. */
const useZapasyTimu = (tim: Tim | null, odohranych = 3, buducich = 5) => {
  const odohrane = useApi<Zapas[]>(tim ? `/matches?tim_id=${tim.id}&status=ukonceny&limit=${odohranych}` : null);
  const zive = useApi<Zapas[]>(tim ? `/matches?tim_id=${tim.id}&status=prebieha&limit=1` : null);
  const buduce = useApi<Zapas[]>(tim ? `/matches?tim_id=${tim.id}&status=naplanovany&od_datumu=${dnes()}&poradie=asc&limit=${buducich}` : null);
  return useMemo(() => {
    const minule = [...(odohrane.data ?? [])].sort(podlaCasu);
    const dalsie = [...(buduce.data ?? [])].sort(podlaCasu);
    return { minule, zive: zive.data ?? [], dalsie, najblizsi: zive.data?.[0] ?? dalsie[0] ?? null };
  }, [odohrane.data, zive.data, buduce.data]);
};

// ===== 1. Bento titulka =====

const DlazdicaZapasu: React.FC<{ zapas: Zapas; vstupenky: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const stav = stavZapasu(z);
  const zivy = stav === 'prebieha';
  const odpocet = useOdpocet(zivy ? null : z.datum_cas, u.zapnute('ukazat_odpocet'));
  return (
    <div className="dr-dlazdica dr-dlazdica--tmava dr-titulka__zapas">
      <span className="dr-dlazdica__nadpis">
        {zivy ? 'Práve sa hrá' : 'Najbližší zápas'}
        {zivy && <b className="dr-live">Live</b>}
      </span>
      <span className="dr-titulka__sutaz">{sutazZapasu(z) || 'Zápas'}</span>
      <div className="dr-titulka__timy">
        <TimZapasu zapas={z} strana="domaci" velky />
        <span className="dr-titulka__vs">{zivy && maVysledok(z) ? `${z.goly_domaci}:${z.goly_hostia}` : 'vs'}</span>
        <TimZapasu zapas={z} strana="hostia" velky />
      </div>
      <div className="dr-titulka__kedy">
        <strong>{cas(z.datum_cas)}</strong>
        <span>
          {denVTyzdni(z.datum_cas)} {datumKratky(z.datum_cas)}
          {z.miesto ? ` · ${z.miesto}` : ''}
        </span>
      </div>
      {odpocet && (
        <div className="dr-odpocet" aria-label="Do výkopu zostáva">
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
      <div className="dr-titulka__akcie">
        {stav === 'naplanovany' && vstupenky && (
          <Odkaz to={vstupenky} className="dr-tlacidlo dr-tlacidlo--akcent">
            {u.text('vstupenky_text', 'Kúpiť vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className="dr-tlacidlo dr-tlacidlo--obrys-svetle">
          {u.text('text_detail', 'Detail zápasu')}
        </Link>
      </div>
    </div>
  );
};

const Titulka: React.FC<{ clanky: Clanok[]; nacitava: boolean; zapas: Zapas | null; vstupenky: string | null; nahradnaFotka: string | null }> = ({
  clanky,
  nacitava,
  zapas,
  vstupenky,
  nahradnaFotka,
}) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const [hlavny, ...ostatne] = clanky;
  const vedlajsie = ostatne.slice(0, zapas ? 2 : 3);
  if (!hlavny) {
    return (
      <section className="dr-titulka dr-titulka--prazdna" aria-busy={nacitava}>
        <div className="dr-kontajner">{!nacitava && <h1 className="dr-titulka__prazdny-nadpis">{nastavenia.slogan || nastavenia.nazov}</h1>}</div>
      </section>
    );
  }
  const fotka = obrazokUrl(hlavny.obrazok) || obrazokUrl(nahradnaFotka);
  return (
    <section className="dr-titulka" aria-label="Hlavné správy">
      <div className={`dr-kontajner dr-bento dr-titulka__mriezka dr-titulka__mriezka--${vedlajsie.length}${zapas ? ' dr-titulka__mriezka--zapas' : ''}`}>
        <Link to={`/clanek/${hlavny.slug}`} className="dr-dlazdica dr-titulka__hlavna">
          <span className="dr-titulka__fotka">{fotka ? <img src={fotka} alt="" onError={skryObrazok} /> : null}</span>
          <span className="dr-titulka__text">
            <span className="dr-titulka__stitok">{hlavny.kategoria?.nazov || 'Správy'}</span>
            <h1>{hlavny.nazov}</h1>
            {hlavny.excerpt && <span className="dr-titulka__perex">{hlavny.excerpt}</span>}
            <span className="dr-titulka__viac">
              {u.text('hero_tlacidlo', 'Čítať článok')} <Ikona nazov="sipka" velkost={14} />
            </span>
          </span>
        </Link>
        {vedlajsie.map((c, i) => (
          <Link key={c.id} to={`/clanek/${c.slug}`} className={`dr-dlazdica dr-titulka__vedlajsia dr-titulka__v${i + 1}`}>
            <Obrazok src={c.obrazok} className="dr-titulka__obrazok" />
            <span className="dr-titulka__vtext">
              <span className="dr-titulka__rubrika">{c.kategoria?.nazov || 'Správy'}</span>
              <strong>{c.nazov}</strong>
              <small>{datum(c.publikovany_datum || c.vytvoreny)}</small>
            </span>
          </Link>
        ))}
        {zapas && <DlazdicaZapasu zapas={zapas} vstupenky={vstupenky} />}
      </div>
    </section>
  );
};

// ===== 2. Pás zápasov =====

const PasZapasov: React.FC<{ tim: Tim; minule: Zapas[]; zive: Zapas[]; dalsie: Zapas[] }> = ({ tim, minule, zive, dalsie }) => {
  const u = useUpravy();
  const pas = useRef<HTMLDivElement>(null);
  const zapasy = [...minule, ...zive, ...dalsie];
  const prvyBuduci = minule.length;
  const [kraje, setKraje] = useState({ zaciatok: true, koniec: false });
  const aktualizuj = () => {
    const el = pas.current;
    if (!el) return;
    setKraje({ zaciatok: el.scrollLeft < 8, koniec: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  // Pás začína pri poslednom odohranom zápase - staršie sú naľavo
  useEffect(() => {
    const el = pas.current;
    if (!el) return;
    const karta = el.children[Math.max(0, prvyBuduci - 1)] as HTMLElement | undefined;
    if (karta) el.scrollLeft = karta.offsetLeft - el.offsetLeft;
    aktualizuj();
  }, [prvyBuduci, zapasy.length]);
  if (zapasy.length === 0) return null;
  const posun = (smer: number) => pas.current?.scrollBy({ left: smer * pas.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="dr-u-sekcia dr-zapasy-u" aria-labelledby="dr-u-zapasy">
      <div className="dr-kontajner">
        <HlavaSekcie nadpis={u.text('zapasy_nadpis', 'Zápasy a výsledky')} stitok={tim.nazov} odkaz="/matches" textOdkazu="Všetky zápasy" id="dr-u-zapasy">
          <span className="dr-zapasy-u__sipky">
            <button type="button" className="dr-kruh" onClick={() => posun(-1)} disabled={kraje.zaciatok} aria-label="Staršie zápasy">
              <Ikona nazov="vlavo" velkost={14} />
            </button>
            <button type="button" className="dr-kruh" onClick={() => posun(1)} disabled={kraje.koniec} aria-label="Ďalšie zápasy">
              <Ikona nazov="vpravo" velkost={14} />
            </button>
          </span>
        </HlavaSekcie>
      </div>
      <div className="dr-zapasy-u__pas" ref={pas} onScroll={aktualizuj}>
        {zapasy.map((z) => {
          const stav = stavZapasu(z);
          const skore = maVysledok(z) && stav !== 'naplanovany';
          const v = skore ? vysledokKlubu(z) : null;
          return (
            <Link key={z.id} to={`/matches/${z.id}`} className={`dr-zkarta${skore ? ' is-odohrany' : ''}${stav === 'prebieha' ? ' is-zivy' : ''}`}>
              <span className="dr-zkarta__hlava">
                <span>{sutazZapasu(z) || 'Zápas'}</span>
                {v ? <b className={`dr-zkarta__vysledok is-${v.toLowerCase()}`}>{v}</b> : stav === 'prebieha' ? <b className="dr-live">Live</b> : null}
              </span>
              {(['domaci', 'hostia'] as const).map((strana) => (
                <span key={strana} className="dr-zkarta__riadok">
                  <TimZapasu zapas={z} strana={strana} trieda="dr-zkarta__tim" />
                  {skore && <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>}
                </span>
              ))}
              <span className="dr-zkarta__pata">
                {skore ? (
                  <>Koniec · {datumKratky(z.datum_cas)}</>
                ) : (
                  <>
                    <strong>{cas(z.datum_cas)}</strong> {denVTyzdni(z.datum_cas)} {datumKratky(z.datum_cas)}
                  </>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

// ===== 3. Novinky s bočným panelom =====

const TabulkaPanelu: React.FC<{ liga: Liga; riadky: RiadokTabulky[]; timId: number }> = ({ liga, riadky, timId }) => (
  <div className="dr-panel-karta">
    <div className="dr-panel-karta__hlava">
      <h3>Tabuľka</h3>
      <Link to={`/leagues/${liga.id}`}>Celá</Link>
    </div>
    <span className="dr-panel-karta__sutaz">{liga.nazov}</span>
    <table className="dr-mtabulka">
      <thead>
        <tr>
          <th>#</th>
          <th className="dr-mtabulka__tim">Tím</th>
          <th>Z</th>
          <th>S</th>
          <th>B</th>
        </tr>
      </thead>
      <tbody>
        {vyrezTabulky(riadky, timId, 8).map((r) => (
          <tr key={r.id} className={r.tim_id === timId ? 'is-nas' : ''}>
            <td>{r.pozicia}</td>
            <td className="dr-mtabulka__tim">
              <span>
                <Erb nazov={r.tim_nazov || r.custom_tim_nazov || 'Tím'} logo={r.tim_logo || r.custom_tim_logo} />
                <span>{r.tim_nazov || r.custom_tim_nazov}</span>
              </span>
            </td>
            <td>{r.zapasy}</td>
            <td>
              {r.goly_za}:{r.goly_proti}
            </td>
            <td>
              <b>{r.body}</b>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BilanciaPanelu: React.FC<{ tim: Tim }> = ({ tim }) => {
  const zapasy = useApi<Zapas[]>(`/matches?tim_id=${tim.id}&status=ukonceny&limit=100`);
  const data = useMemo(() => {
    const zoznam = [...(zapasy.data ?? [])].filter((z) => maVysledok(z) && vysledokKlubu(z)).sort(podlaCasu);
    const pocty = { V: 0, R: 0, P: 0 };
    zoznam.forEach((z) => pocty[vysledokKlubu(z)!]++);
    return { pocet: zoznam.length, ...pocty, forma: zoznam.slice(-5) };
  }, [zapasy.data]);
  if (data.pocet === 0) return null;
  return (
    <div className="dr-panel-karta dr-panel-karta--tmava">
      <div className="dr-panel-karta__hlava">
        <h3>Bilancia sezóny</h3>
        <Link to="/stats">Štatistiky</Link>
      </div>
      <div className="dr-bilancia-u">
        {(
          [
            ['V', 'Výhry'],
            ['R', 'Remízy'],
            ['P', 'Prehry'],
          ] as const
        ).map(([k, n]) => (
          <span key={k} className={`is-${k.toLowerCase()}`}>
            <strong>{data[k]}</strong>
            <small>{n}</small>
          </span>
        ))}
      </div>
      <div className="dr-bilancia-u__forma">
        <span>Forma</span>
        {data.forma.map((z) => {
          const x = vysledokKlubu(z)!;
          return (
            <Link key={z.id} to={`/matches/${z.id}`} className={`dr-forma-znak is-${x.toLowerCase()}`} title={`${nazovDomacich(z)} ${z.goly_domaci}:${z.goly_hostia} ${nazovHosti(z)}`}>
              {x}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const NajblizsiePanelu: React.FC<{ zapasy: Zapas[] }> = ({ zapasy }) => {
  if (zapasy.length === 0) return null;
  return (
    <div className="dr-panel-karta">
      <div className="dr-panel-karta__hlava">
        <h3>Program</h3>
        <Link to="/calendar">Kalendár</Link>
      </div>
      <ul className="dr-program">
        {zapasy.slice(0, 4).map((z) => (
          <li key={z.id}>
            <Link to={`/matches/${z.id}`}>
              <span className="dr-program__datum">
                <strong>{datumKratky(z.datum_cas).replace(/\s.*$/, '')}</strong>
                <small>{denVTyzdni(z.datum_cas)}</small>
              </span>
              <span className="dr-program__text">
                <strong>
                  {nazovDomacich(z)} – {nazovHosti(z)}
                </strong>
                <small>
                  {cas(z.datum_cas)} · {z.liga_nazov || 'Zápas'}
                </small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Novinky: React.FC<{ clanky: Clanok[]; tim: Tim | null; ligy: Liga[]; dalsie: Zapas[] }> = ({ clanky, tim, ligy, dalsie }) => {
  const u = useUpravy();
  const pocet = obmedz(u.s.novinky_pocet, 3, 10, 6);
  const liga = tim && u.zapnute('ukazat_tabulku') ? ligy.find((l) => l.tim_id === tim.id && l.format !== 'turnaj') ?? null : null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);
  const panel = u.zapnute('ukazat_panel') && tim;
  if (clanky.length === 0) return null;
  return (
    <section className="dr-u-sekcia dr-novinky-u" aria-labelledby="dr-u-novinky">
      <div className={`dr-kontajner dr-novinky-u__mriezka${panel ? '' : ' dr-novinky-u__mriezka--bez-panela'}`}>
        <div className="dr-novinky-u__hlavny">
          <HlavaSekcie nadpis={u.text('novinky_nadpis', 'Novinky')} stitok={u.text('novinky_stitok', 'Z diania v klube')} odkaz="/clanky" textOdkazu="Všetky novinky" id="dr-u-novinky" />
          <div className="dr-novinky-u__zoznam">
            {clanky.slice(0, pocet).map((c) => (
              <Link key={c.id} to={`/clanek/${c.slug}`} className="dr-riadok-clanku">
                <Obrazok src={c.obrazok} className="dr-riadok-clanku__obrazok" />
                <span className="dr-riadok-clanku__text">
                  <span className="dr-riadok-clanku__meta">
                    <b>{c.kategoria?.nazov || 'Správy'}</b>
                    {datum(c.publikovany_datum || c.vytvoreny)}
                  </span>
                  <strong>{c.nazov}</strong>
                  {c.excerpt && <span className="dr-riadok-clanku__perex">{c.excerpt}</span>}
                </span>
              </Link>
            ))}
          </div>
        </div>
        {panel && (
          <aside className="dr-novinky-u__panel" aria-label="Sezóna">
            {liga && tabulka.data?.length ? <TabulkaPanelu liga={liga} riadky={tabulka.data} timId={tim.id} /> : null}
            {u.zapnute('ukazat_sezonu') && <BilanciaPanelu tim={tim} />}
            <NajblizsiePanelu zapasy={dalsie} />
          </aside>
        )}
      </div>
    </section>
  );
};

// ===== 4. Káder =====

const Kader: React.FC<{ tim: Tim; nadpis: string }> = ({ tim, nadpis }) => {
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const [poz, setPoz] = useState('');
  const pas = useRef<HTMLDivElement>(null);
  const vsetci = useMemo(
    () =>
      [...(hraci.data?.hraci ?? [])].sort(
        (a, b) => (POZICIE[a.pozicia ?? '']?.poradie ?? 9) - (POZICIE[b.pozicia ?? '']?.poradie ?? 9) || (a.cislo_dresu ?? 99) - (b.cislo_dresu ?? 99)
      ),
    [hraci.data]
  );
  const pozicie = useMemo(() => Object.entries(POZICIE).filter(([k]) => vsetci.some((h) => h.pozicia === k)), [vsetci]);
  if (vsetci.length === 0) return null;
  const zobrazeni = vsetci.filter((h) => !poz || h.pozicia === poz);
  const posun = (smer: number) => pas.current?.scrollBy({ left: smer * pas.current.clientWidth * 0.75, behavior: 'smooth' });

  return (
    <section className="dr-kader" aria-labelledby="dr-u-kader">
      <div className="dr-kader__pruhy" aria-hidden="true" />
      <div className="dr-kontajner">
        <HlavaSekcie nadpis={nadpis} stitok={tim.nazov} odkaz={`/teams/${tim.id}`} textOdkazu="Celý káder" id="dr-u-kader" svetla>
          <div className="dr-kader__ovladanie">
            {pozicie.length > 1 && (
              <div className="dr-zalozky dr-zalozky--svetle" role="tablist" aria-label="Pozície">
                <button type="button" role="tab" aria-selected={!poz} className={!poz ? 'is-aktivna' : ''} onClick={() => setPoz('')}>
                  Všetci
                </button>
                {pozicie.map(([k, p]) => (
                  <button key={k} type="button" role="tab" aria-selected={poz === k} className={poz === k ? 'is-aktivna' : ''} onClick={() => setPoz(k)}>
                    {p.mnozne}
                  </button>
                ))}
              </div>
            )}
            <span className="dr-kader__sipky">
              <button type="button" className="dr-kruh" onClick={() => posun(-1)} aria-label="Predchádzajúci hráči">
                <Ikona nazov="vlavo" velkost={14} />
              </button>
              <button type="button" className="dr-kruh" onClick={() => posun(1)} aria-label="Ďalší hráči">
                <Ikona nazov="vpravo" velkost={14} />
              </button>
            </span>
          </div>
        </HlavaSekcie>
      </div>
      <div className="dr-kader__pas" ref={pas}>
        {zobrazeni.map((h) => {
          const fotka = obrazokUrl(h.fotka);
          return (
            <Link key={h.id} to={`/players/${h.id}`} className="dr-hkarta">
              <span className="dr-hkarta__foto">{fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="dr-hrac__silueta" aria-hidden="true" />}</span>
              <span className="dr-hkarta__text">
                {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <span className="dr-hkarta__cislo">{h.cislo_dresu}</span>}
                <span className="dr-hkarta__meno">
                  <small>{h.meno}</small>
                  <strong>{h.priezvisko}</strong>
                </span>
                <span className="dr-hkarta__pozicia">{pozicia(h.pozicia)}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

// ===== 5. Bento médiá a komunita =====

interface GaleriaUvodu {
  id: number;
  nazov: string;
  pocet_obrazkov?: number;
  nahladovy_obrazok?: string | null;
  vytvoreny?: string;
}
interface FotkaGalerie {
  id: number;
  url_stredny?: string | null;
  url_original?: string | null;
}

const VideoDlazdica: React.FC<{ videa: Video[] }> = ({ videa }) => {
  const u = useUpravy();
  const { otvor, okno } = useOknoVidea();
  const [hlavne, ...ostatne] = videa;
  const prehraj = (v: Video) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || !embedVidea(v)) return;
    e.preventDefault();
    otvor(v);
  };
  return (
    <div className="dr-dlazdica dr-dlazdica--tmava dr-media__video">
      <a href={hlavne.url} target="_blank" rel="noopener noreferrer" className="dr-media__hlavne" onClick={prehraj(hlavne)}>
        <Obrazok src={hlavne.nahlad_url || hlavne.nahlad} className="dr-media__nahlad" />
        <span className="dr-media__prechod" aria-hidden="true" />
        <span className="dr-media__play" aria-hidden="true">
          <Ikona nazov="play" velkost={26} />
        </span>
        <span className="dr-media__popis">
          <span className="dr-dlazdica__nadpis">{u.text('videa_nadpis', 'Klub TV')}</span>
          <strong>{hlavne.nazov}</strong>
          {dlzkaVidea(hlavne.dlzka) && <small>{dlzkaVidea(hlavne.dlzka)}</small>}
        </span>
      </a>
      {ostatne.length > 0 && (
        <div className="dr-media__dalsie">
          {ostatne.slice(0, 2).map((v) => (
            <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" onClick={prehraj(v)}>
              <span className="dr-media__mini-play" aria-hidden="true">
                <Ikona nazov="play" velkost={11} />
              </span>
              <span>{v.nazov}</span>
              {dlzkaVidea(v.dlzka) && <small>{dlzkaVidea(v.dlzka)}</small>}
            </a>
          ))}
          <Link to="/videa" className="dr-media__vsetky">
            Všetky videá <Ikona nazov="sipka" velkost={13} />
          </Link>
        </div>
      )}
      {okno}
    </div>
  );
};

const GaleriaDlazdica: React.FC<{ galeria: GaleriaUvodu }> = ({ galeria }) => {
  const detail = useApi<{ obrazky?: FotkaGalerie[] }>(`/galleries/${galeria.id}`);
  const fotky = (detail.data?.obrazky ?? []).slice(0, 4);
  return (
    <Link to={`/galleries/${galeria.id}`} className="dr-dlazdica dr-media__galeria">
      <span className={`dr-media__fotky dr-media__fotky--${Math.max(1, fotky.length)}`}>
        {fotky.length > 0 ? (
          fotky.map((f) => <img key={f.id} src={souborUrl(f.url_stredny || f.url_original || '')} alt="" loading="lazy" onError={skryObrazok} />)
        ) : galeria.nahladovy_obrazok ? (
          <img src={obrazokUrl(galeria.nahladovy_obrazok) ?? ''} alt="" loading="lazy" onError={skryObrazok} />
        ) : null}
      </span>
      <span className="dr-media__gtext">
        <span className="dr-dlazdica__nadpis">Fotogaléria</span>
        <strong>{galeria.nazov}</strong>
        <small>
          <Ikona nazov="foto" velkost={14} /> {galeria.pocet_obrazkov ?? fotky.length} fotiek
        </small>
      </span>
    </Link>
  );
};

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
  return (
    <div className="dr-dlazdica dr-media__shop">
      <div className="dr-media__shop-text">
        <span className="dr-dlazdica__nadpis">Fanshop</span>
        <h3>{u.text('fanshop_nadpis', 'Oficiálny fanshop')}</h3>
        {obchod && (
          <Odkaz to={obchod} className="dr-dlazdica__viac">
            {u.text('fanshop_tlacidlo', 'Do obchodu')} <Ikona nazov="sipka" velkost={13} />
          </Odkaz>
        )}
      </div>
      <div className="dr-media__produkty">
        {produkty.slice(0, 3).map((p) => {
          const obsah = (
            <>
              <Obrazok src={p.obrazok} className="dr-media__pobrazok" alt={p.nazov} />
              {p.cena && <span className="dr-media__cena">{p.cena}</span>}
            </>
          );
          return p.odkaz ? (
            <Odkaz key={p.kluc} to={p.odkaz} className="dr-media__produkt" ariaLabel={p.nazov}>
              {obsah}
            </Odkaz>
          ) : (
            <div key={p.kluc} className="dr-media__produkt">
              {obsah}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ClenstvoDlazdica: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  return (
    <Odkaz to={String(s.vyzva_odkaz || '').trim() || '/registracia'} className="dr-dlazdica dr-dlazdica--akcent dr-media__clenstvo">
      <span className="dr-dlazdica__nadpis">{u.text('vyzva_stitok', 'Členstvo')}</span>
      <strong>{u.text('vyzva_nadpis', 'Staňte sa súčasťou {klub}')}</strong>
      <small>{u.text('vyzva_text', 'Pozvánky na zápasy, novinky a akcie klubu ako prví. Registrácia je zadarmo.')}</small>
      <span className="dr-media__sipka" aria-hidden="true">
        <Ikona nazov="sipka" velkost={18} />
      </span>
    </Odkaz>
  );
};

const SieteDlazdica: React.FC = () => {
  const u = useUpravy();
  const siete = useSiete();
  return (
    <div className="dr-dlazdica dr-dlazdica--tmava dr-media__siete">
      <span className="dr-dlazdica__nadpis">{u.text('siete_nadpis', 'Sledujte nás')}</span>
      <div className="dr-media__ikony">
        {siete.map((x) => (
          <a key={x.kluc} href={x.url} target="_blank" rel="noopener noreferrer" aria-label={x.nazov} title={x.nazov}>
            <IkonaSiete kluc={x.kluc} velkost={20} />
          </a>
        ))}
      </div>
      <small>{u.text('siete_text', 'Zákulisie, góly a novinky z kabíny každý deň.')}</small>
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

const UspechyDlazdica: React.FC<{ uspechy: Array<{ pocet: string; nazov: string }> }> = ({ uspechy }) => {
  const u = useUpravy();
  return (
    <div className="dr-dlazdica dr-media__uspechy">
      <span className="dr-dlazdica__nadpis">
        <Ikona nazov="pohar" velkost={16} /> {u.text('uspechy_nadpis', 'Klub v číslach')}
      </span>
      <ul>
        {uspechy.slice(0, 4).map((x, i) => (
          <li key={i}>
            {x.pocet && <strong>{x.pocet}</strong>}
            <span>{x.nazov}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Media: React.FC<{ s: Nastavenia; videa: Video[] }> = ({ s, videa }) => {
  const u = useUpravy();
  const siete = useSiete();
  const galerie = useApi<GaleriaUvodu[]>(u.zapnute('ukazat_galeriu') ? '/galleries?limit=8' : null);
  const galeria = (galerie.data ?? []).find((g) => (g.pocet_obrazkov ?? 0) > 0) ?? null;
  const { produkty } = useProdukty(s);
  const uspechy = citajUspechy(s.uspechy);
  const tile = {
    video: u.zapnute('ukazat_videa') && videa.length > 0,
    galeria: Boolean(galeria),
    shop: u.zapnute('ukazat_fanshop') && produkty.length > 0,
    clenstvo: u.zapnute('ukazat_vyzvu'),
    siete: u.zapnute('ukazat_siete') && siete.length > 0,
    uspechy: uspechy.length > 0,
  };
  if (!Object.values(tile).some(Boolean)) return null;
  // Malé dlaždice (členstvo, siete) vyplnia posledný rad: s úspechmi po jednom stĺpci, bez nich po dvoch
  const malych = Number(tile.clenstvo) + Number(tile.siete);
  const sirkaMalych = tile.uspechy ? (malych === 1 ? 2 : 1) : malych === 1 ? 4 : 2;
  return (
    <section className="dr-u-sekcia dr-u-sekcia--plocha" aria-labelledby="dr-u-media">
      <div className="dr-kontajner">
        <HlavaSekcie nadpis={u.text('media_nadpis', 'Médiá a komunita')} stitok={u.text('media_stitok', 'Pre fanúšikov')} id="dr-u-media" />
        <div className={`dr-bento dr-media${tile.video ? '' : ' dr-media--bez-videa'}`}>
          {tile.video && <VideoDlazdica videa={videa} />}
          {tile.galeria && galeria && (
            <div className={`dr-media__bunka dr-media__bunka--2${tile.video && !tile.shop ? ' dr-media__bunka--vysoka' : ''}`}>
              <GaleriaDlazdica galeria={galeria} />
            </div>
          )}
          {tile.shop && (
            <div className={`dr-media__bunka dr-media__bunka--2${tile.video && !tile.galeria ? ' dr-media__bunka--vysoka' : ''}`}>
              <FanshopDlazdica s={s} />
            </div>
          )}
          {tile.clenstvo && (
            <div className={`dr-media__bunka dr-media__bunka--${sirkaMalych}`}>
              <ClenstvoDlazdica s={s} />
            </div>
          )}
          {tile.siete && (
            <div className={`dr-media__bunka dr-media__bunka--${sirkaMalych}`}>
              <SieteDlazdica />
            </div>
          )}
          {tile.uspechy && (
            <div className={`dr-media__bunka dr-media__bunka--${malych ? 2 : 4}`}>
              <UspechyDlazdica uspechy={uspechy} />
            </div>
          )}
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

  const zvyraznene = useApi<Clanok[]>(u.zapnute('ukazat_clanky') ? '/articles?featured=true&limit=3' : null);
  const clanky = useApi<Clanok[]>('/articles?limit=16');
  const { timy, hlavny } = useHlavnyTim();
  const ligy = useApi<Liga[]>('/leagues');
  const videa = useApi<Video[]>(u.zapnute('ukazat_videa') ? '/videos?limit=3' : null);
  const zapasy = useZapasyTimu(hlavny, 3, 5);

  const vsetky = clanky.data ?? [];
  const titulka = useMemo(() => {
    const vybrane = [...(zvyraznene.data ?? [])];
    for (const c of vsetky) {
      if (vybrane.length >= 4) break;
      if (!vybrane.some((x) => x.id === c.id)) vybrane.push(c);
    }
    return vybrane.slice(0, 4);
  }, [zvyraznene.data, vsetky]);
  const pouzite = u.zapnute('ukazat_clanky') ? titulka.slice(0, zapasy.najblizsi && u.zapnute('ukazat_zapas_titulka') ? 3 : 4) : [];
  const mimo = vsetky.filter((c) => !pouzite.some((h) => h.id === c.id));
  const novinky = mimo.length >= 3 ? mimo : vsetky;

  const timHracov = (s.hraci_tim ? timy.find((t) => t.id === Number(s.hraci_tim)) : null) ?? hlavny;
  const vstupenky = String(s.vstupenky_odkaz || '').trim() || null;

  return (
    <div className="dr-uvod">
      {u.zapnute('ukazat_clanky') && (
        <Titulka
          clanky={titulka}
          nacitava={zvyraznene.nacitava || clanky.nacitava}
          zapas={u.zapnute('ukazat_zapas_titulka') ? zapasy.najblizsi : null}
          vstupenky={vstupenky}
          nahradnaFotka={(s.uvod_fotka as string | null) || null}
        />
      )}
      <Sekcie p="po_titulke" />
      {u.zapnute('ukazat_zapasy') && hlavny && <PasZapasov tim={hlavny} minule={zapasy.minule} zive={zapasy.zive} dalsie={zapasy.dalsie} />}
      <Sekcie p="po_zapasoch" />
      {u.zapnute('ukazat_novinky') && <Novinky clanky={novinky} tim={hlavny} ligy={ligy.data ?? []} dalsie={zapasy.dalsie} />}
      <Sekcie p="po_novinkach" />
      {u.zapnute('ukazat_hracov') && timHracov && <Kader tim={timHracov} nadpis={u.text('hraci_nadpis', 'Prvý tím')} />}
      <Sekcie p="po_kadri" />
      <Media s={s} videa={videa.data ?? []} />
      <Sekcie p="koniec" />
    </div>
  );
};

export default Uvod;
