// Umiestnenie: sablony/elita/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Elita - po vzore webov veľkých klubov.
//
// Celoobrazovkový slider článkov so záložkami a priebehom (ako „stories"),
// zápasová karta prekrývajúca spodok slidera (posledný zápas, najbližší
// zápas s odpočtom, výrez tabuľky), novinky s rubrikami ako záložkami,
// káder ako posúvateľný pás kariet na tmavom podklade, sezóna v číslach
// počítaná z odohraných zápasov, Klub TV, fanshop a pás členstva.
// Partneri sú v pätičke. Sekcie bez obsahu sa neukážu.

import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, useNastavenia, useNastaveniaSablony, type ProduktObchodu, type VlastnostiHlavickyBloku } from '@clubw/jadro';
import { Sekcie as SekcieSablony } from '../bloky';
import { podlaCasu, useHlavnyTim } from '../Rozlozenie';
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

/** Hlavička sekcie: štítok, veľký nadpis, voliteľný obsah (záložky) a odkaz. */
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
    <div className={`el-shlava${svetla ? ' el-shlava--svetla' : ''}`}>
      <div className="el-shlava__text">
        {stitok && <span className="el-stitok">{stitok}</span>}
        <h2 id={id}>{nadpis}</h2>
      </div>
      {children}
      {odkaz && (
        <Odkaz to={odkaz} className="el-shlava__odkaz">
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

// ===== Hlavný slider =====

const Slider: React.FC<{ clanky: Clanok[]; nacitava: boolean; nahradnaFotka: string | null }> = ({ clanky, nacitava, nahradnaFotka }) => {
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
      <section className="el-hero el-hero--prazdny" aria-busy={nacitava}>
        <div className="el-kontajner el-hero__obsah">
          {!nacitava && <h1 className="el-hero__nadpis">{nastavenia.slogan || nastavenia.nazov}</h1>}
        </div>
      </section>
    );
  }

  const dalsi = () => setAktivny((a) => (a + 1) % pocet);
  const predosly = () => setAktivny((a) => (a - 1 + pocet) % pocet);
  const tlacidlo = u.text('hero_tlacidlo', 'Čítať článok');

  return (
    <section
      className={`el-hero${pauza ? ' is-pauza' : ''}`}
      aria-roledescription="slider"
      aria-label="Hlavné správy"
      style={{ '--el-cas': `${sekundy}s` } as React.CSSProperties}
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
      <div className="el-hero__snimky">
        {clanky.map((c, i) => {
          const fotka = obrazokUrl(c.obrazok) || obrazokUrl(nahradnaFotka);
          return (
            <div key={c.id} className={`el-hero__snimka${i === aktivny ? ' is-aktivna' : ''}`} aria-hidden={i !== aktivny}>
              <span className="el-hero__fotka">{fotka ? <img src={fotka} alt="" onError={skryObrazok} loading={i === 0 ? 'eager' : 'lazy'} /> : null}</span>
              <div className="el-kontajner el-hero__obsah">
                <span className="el-hero__stitok">{c.kategoria?.nazov || 'Správy'}</span>
                {i === 0 ? <h1 className="el-hero__nadpis">{c.nazov}</h1> : <h2 className="el-hero__nadpis">{c.nazov}</h2>}
                {c.excerpt && <p className="el-hero__perex">{c.excerpt}</p>}
                <Link to={`/clanek/${c.slug}`} className="el-tlacidlo el-tlacidlo--akcent" tabIndex={i === aktivny ? 0 : -1}>
                  {tlacidlo}
                  <Ikona nazov="sipka" velkost={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      {pocet > 1 && (
        <div className="el-kontajner el-hero__zalozky" role="tablist" aria-label="Vybrať správu">
          {clanky.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={i === aktivny}
              className={`el-hero__zalozka${i === aktivny ? ' is-aktivna' : ''}`}
              onClick={() => setAktivny(i)}
            >
              <span className="el-hero__priebeh">
                {i === aktivny && <i key={aktivny} className={sekundy > 0 ? 'is-bezi' : ''} onAnimationEnd={dalsi} />}
              </span>
              <span className="el-hero__cislo">{String(i + 1).padStart(2, '0')}</span>
              <span className="el-hero__ztext">
                <small>{c.kategoria?.nazov || datum(c.publikovany_datum || c.vytvoreny)}</small>
                <strong>{c.nazov}</strong>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

// ===== Zápasová karta =====

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
    <span className={`el-mc__tim el-mc__tim--${strana}`}>
      <Erb nazov={nazov} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} velky={velky} />
      <strong>{nazov}</strong>
    </span>
  );
};

const PoslednyZapas: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const v = vysledokKlubu(z);
  return (
    <Link to={`/matches/${z.id}`} className="el-mc__blok el-mc__posledny">
      <span className="el-mc__nadpis">
        Posledný zápas
        {v && <b className={`el-mc__vysledok is-${v.toLowerCase()}`}>{VYSLEDKY[v]}</b>}
      </span>
      <span className="el-mc__sutaz">
        {sutazZapasu(z) || 'Zápas'} · {datumKratky(z.datum_cas)}
      </span>
      <span className="el-mc__riadky">
        {(['domaci', 'hostia'] as const).map((strana) => (
          <span key={strana} className="el-mc__riadok">
            <TimZapasu zapas={z} strana={strana} />
            <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>
          </span>
        ))}
      </span>
      <span className="el-mc__viac">
        Zápis zo zápasu <Ikona nazov="sipka" velkost={13} />
      </span>
    </Link>
  );
};

const NajblizsiZapas: React.FC<{ zapas: Zapas; vstupenky: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const stav = stavZapasu(z);
  const zivy = stav === 'prebieha';
  const odpocet = useOdpocet(zivy ? null : z.datum_cas, u.zapnute('ukazat_odpocet'));
  return (
    <div className="el-mc__blok el-mc__najblizsi">
      <span className="el-mc__nadpis">
        {zivy ? 'Práve sa hrá' : 'Najbližší zápas'}
        {zivy && <b className="el-mc__live">Live</b>}
      </span>
      <span className="el-mc__sutaz">{sutazZapasu(z) || 'Zápas'}</span>
      <div className="el-mc__duel">
        <TimZapasu zapas={z} strana="domaci" velky />
        <span className="el-mc__stred">
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
        <span className="el-mc__miesto">
          <Ikona nazov="miesto" velkost={14} /> {z.miesto}
        </span>
      )}
      {odpocet && (
        <div className="el-mc__odpocet" aria-label="Do výkopu zostáva">
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
      <div className="el-mc__akcie">
        {stav === 'naplanovany' && vstupenky && (
          <Odkaz to={vstupenky} className="el-tlacidlo el-tlacidlo--akcent">
            {u.text('vstupenky_text', 'Kúpiť vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className="el-tlacidlo el-tlacidlo--obrys-svetle">
          {u.text('text_detail', 'Detail zápasu')}
        </Link>
      </div>
    </div>
  );
};

const TabulkaKarty: React.FC<{ liga: Liga; riadky: RiadokTabulky[]; timId: number | null }> = ({ liga, riadky, timId }) => {
  const vyrez = vyrezTabulky(riadky, timId, 5);
  return (
    <div className="el-mc__blok el-mc__tabulka">
      <span className="el-mc__nadpis">
        Tabuľka
        <Link to={`/leagues/${liga.id}`}>Celá</Link>
      </span>
      <span className="el-mc__sutaz">{liga.nazov}</span>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="el-mc__ttim">Tím</th>
            {liga.rezim_tabulky !== 'len_body' && <th>Z</th>}
            <th>B</th>
          </tr>
        </thead>
        <tbody>
          {vyrez.map((r) => (
            <tr key={r.id} className={r.tim_id === timId ? 'is-nas' : ''}>
              <td>{r.pozicia}</td>
              <td className="el-mc__ttim">
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

const ZapasovaKarta: React.FC<{ tim: Tim; ligy: Liga[]; vstupenky: string | null; prekryva: boolean }> = ({ tim, ligy, vstupenky, prekryva }) => {
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

  return (
    <section className={`el-kontajner el-mc${prekryva ? ' el-mc--prekryva' : ''}`} aria-label="Zápasy">
      <div className={`el-mc__karta el-mc__karta--${[posledny, najblizsi, maTabulku].filter(Boolean).length}`}>
        {posledny && <PoslednyZapas zapas={posledny} />}
        {najblizsi && <NajblizsiZapas zapas={najblizsi} vstupenky={vstupenky} />}
        {liga && maTabulku && <TabulkaKarty liga={liga} riadky={tabulka.data ?? []} timId={tim.id} />}
      </div>
    </section>
  );
};

// ===== Novinky =====

const KartaNoviny: React.FC<{ clanok: Clanok }> = ({ clanok: c }) => (
  <Link to={`/clanek/${c.slug}`} className="el-nkarta">
    <Obrazok src={c.obrazok} className="el-nkarta__obrazok" />
    <span className="el-nkarta__text">
      <span className="el-nkarta__rubrika">{c.kategoria?.nazov || 'Správy'}</span>
      <strong>{c.nazov}</strong>
      <small>{datum(c.publikovany_datum || c.vytvoreny)}</small>
    </span>
  </Link>
);

const Novinky: React.FC<{ clanky: Clanok[] }> = ({ clanky }) => {
  const u = useUpravy();
  const [rubrika, setRubrika] = useState<string>('');
  const pocet = obmedz(u.s.novinky_pocet, 4, 12, 8);
  const rubriky = useMemo(() => {
    const m = new Map<string, string>();
    clanky.forEach((c) => c.kategoria && m.set(c.kategoria.slug, c.kategoria.nazov));
    return [...m.entries()].slice(0, 5);
  }, [clanky]);
  if (clanky.length === 0) return null;
  const zobrazene = clanky.filter((c) => !rubrika || c.kategoria?.slug === rubrika).slice(0, pocet);
  return (
    <section className="el-kontajner el-u-sekcia el-novinky-u" aria-labelledby="el-u-novinky">
      <HlavaSekcie nadpis={u.text('novinky_nadpis', 'Novinky')} odkaz={rubrika ? `/clanky?rubrika=${encodeURIComponent(rubrika)}` : '/clanky'} textOdkazu="Všetky novinky" id="el-u-novinky">
        {u.zapnute('novinky_rubriky') && rubriky.length > 1 && (
          <div className="el-zalozky" role="tablist" aria-label="Rubriky">
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
      <div className="el-novinky-u__mriezka">
        {zobrazene.map((c) => (
          <KartaNoviny key={c.id} clanok={c} />
        ))}
      </div>
    </section>
  );
};

// ===== Káder =====

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
    <section className="el-kader" aria-labelledby="el-u-kader">
      <span className="el-kader__vodoznak" aria-hidden="true">
        {nadpis}
      </span>
      <div className="el-kontajner">
        <HlavaSekcie nadpis={nadpis} stitok={tim.nazov} odkaz={`/teams/${tim.id}`} textOdkazu="Celý káder" id="el-u-kader" svetla>
          <div className="el-kader__ovladanie">
            {pozicie.length > 1 && (
              <div className="el-zalozky el-zalozky--svetle" role="tablist" aria-label="Pozície">
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
            <span className="el-kader__sipky">
              <button type="button" className="el-kruh" onClick={() => posun(-1)} aria-label="Predchádzajúci hráči">
                <Ikona nazov="vlavo" velkost={16} />
              </button>
              <button type="button" className="el-kruh" onClick={() => posun(1)} aria-label="Ďalší hráči">
                <Ikona nazov="vpravo" velkost={16} />
              </button>
            </span>
          </div>
        </HlavaSekcie>
      </div>
      <div className="el-kader__pas" ref={pas}>
        {zobrazeni.map((h) => {
          const fotka = obrazokUrl(h.fotka);
          return (
            <Link key={h.id} to={`/players/${h.id}`} className="el-hkarta">
              <span className="el-hkarta__foto">{fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="el-hrac__silueta" aria-hidden="true" />}</span>
              {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <span className="el-hkarta__cislo">{h.cislo_dresu}</span>}
              <span className="el-hkarta__text">
                <small>{h.meno}</small>
                <strong>{h.priezvisko}</strong>
                <span>{pozicia(h.pozicia)}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

// ===== Sezóna v číslach =====

const Sezona: React.FC<{ tim: Tim; nadpis: string }> = ({ tim, nadpis }) => {
  const zapasy = useApi<Zapas[]>(`/matches?tim_id=${tim.id}&status=ukonceny&limit=100`);
  const data = useMemo(() => {
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
  if (data.pocet === 0) return null;
  const percento = (n: number) => `${(n / data.pocet) * 100}%`;
  const cisla: Array<[number | string, string]> = [
    [data.pocet, 'Odohraných zápasov'],
    [data.za, 'Strelených gólov'],
    [data.proti, 'Inkasovaných gólov'],
    [(data.za / data.pocet).toFixed(1).replace('.', ','), 'Gólov na zápas'],
    [data.nula, 'Zápasov bez inkasovaného gólu'],
    [`${Math.round((data.v / data.pocet) * 100)} %`, 'Úspešnosť'],
  ];
  return (
    <section className="el-sezona" aria-labelledby="el-u-sezona">
      <div className="el-kontajner">
        <HlavaSekcie nadpis={nadpis} stitok={tim.nazov} odkaz="/stats" textOdkazu="Štatistiky" id="el-u-sezona" />
        <div className="el-sezona__mriezka">
          <div className="el-sezona__bilancia">
            <div className="el-sezona__vrd">
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
            <div className="el-sezona__pruh" aria-hidden="true">
              <i className="is-v" style={{ width: percento(data.v) }} />
              <i className="is-r" style={{ width: percento(data.r) }} />
              <i className="is-p" style={{ width: percento(data.p) }} />
            </div>
            <div className="el-sezona__forma">
              <span>Forma</span>
              {data.forma.map((z) => {
                const x = vysledokKlubu(z)!;
                return (
                  <Link key={z.id} to={`/matches/${z.id}`} className={`el-forma-znak is-${x.toLowerCase()}`} title={`${nazovDomacich(z)} ${z.goly_domaci}:${z.goly_hostia} ${nazovHosti(z)}`}>
                    {x}
                  </Link>
                );
              })}
            </div>
          </div>
          <dl className="el-sezona__cisla">
            {cisla.map(([n, popis]) => (
              <div key={popis}>
                <dt>{n}</dt>
                <dd>{popis}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

// ===== Klub TV =====

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
    <section className="el-tv" aria-labelledby="el-u-tv">
      <div className="el-kontajner">
        <HlavaSekcie nadpis={u.text('videa_nadpis', 'Klub TV')} stitok="Video" odkaz="/videa" textOdkazu="Všetky videá" id="el-u-tv" svetla />
        <a href={hlavne.url} target="_blank" rel="noopener noreferrer" className="el-tv__hlavne" onClick={prehraj(hlavne)}>
          <Obrazok src={hlavne.nahlad_url || hlavne.nahlad} className="el-tv__obrazok" />
          <span className="el-tv__prechod" aria-hidden="true" />
          <span className="el-tv__play" aria-hidden="true">
            <Ikona nazov="play" velkost={30} />
          </span>
          <span className="el-tv__popis">
            {dlzkaVidea(hlavne.dlzka) && <small>{dlzkaVidea(hlavne.dlzka)}</small>}
            <strong>{hlavne.nazov}</strong>
          </span>
        </a>
        {ostatne.length > 0 && (
          <div className="el-tv__rad">
            {ostatne.slice(0, 3).map((v) => (
              <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="el-tv__video" onClick={prehraj(v)}>
                <span className="el-tv__nahlad">
                  <Obrazok src={v.nahlad_url || v.nahlad} className="el-tv__obrazok" />
                  <span className="el-tv__play el-tv__play--maly" aria-hidden="true">
                    <Ikona nazov="play" velkost={16} />
                  </span>
                  {dlzkaVidea(v.dlzka) && <small>{dlzkaVidea(v.dlzka)}</small>}
                </span>
                <strong>{v.nazov}</strong>
              </a>
            ))}
          </div>
        )}
      </div>
      {okno}
    </section>
  );
};

// ===== Fanshop =====

const Fanshop: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  const zapnuty = Boolean(nastavenia.eshop?.zapnuty);
  const odporucane = useApi<ProduktObchodu[]>(zapnuty ? '/eshop/produkty?odporucane=1&limit=4' : null);
  const bezOdporucanych = zapnuty && !odporucane.nacitava && !odporucane.chyba && (odporucane.data?.length ?? 0) < 4;
  const najnovsie = useApi<ProduktObchodu[]>(bezOdporucanych ? '/eshop/produkty?limit=4' : null);
  const mena = nastavenia.eshop?.mena ?? 'EUR';
  const zoznam = zapnuty ? ((najnovsie.data?.length ?? 0) > (odporucane.data?.length ?? 0) ? najnovsie.data : odporucane.data) ?? [] : [];
  const produkty: Array<{ kluc: string; nazov: string; obrazok: string | null; cena: string; odkaz: string | null }> = zapnuty
    ? zoznam.map((p) => ({ kluc: String(p.id), nazov: p.nazov, obrazok: p.obrazok ?? null, cena: cenaText(p.cena, mena), odkaz: `/obchod/${p.slug}` }))
    : [1, 2, 3, 4]
        .map((i) => ({
          kluc: String(i),
          nazov: String(s[`produkt_${i}_nazov`] || ''),
          obrazok: (s[`produkt_${i}_obrazok`] as string | null) || null,
          cena: String(s[`produkt_${i}_cena`] || ''),
          odkaz: String(s[`produkt_${i}_odkaz`] || '').trim() || String(s.fanshop_odkaz || '').trim() || null,
        }))
        .filter((p) => p.obrazok);
  if (produkty.length === 0) return null;
  const obchod = zapnuty ? '/obchod' : String(s.fanshop_odkaz || '').trim() || null;
  const vlastnyObrazok = obrazokUrl((s.fanshop_obrazok as string | null) || null);
  const promo = vlastnyObrazok || obrazokUrl(produkty[0].obrazok);
  const text = u.text('fanshop_text', 'Dresy, šály a doplnky pre každého fanúšika.');

  return (
    <section className="el-kontajner el-u-sekcia el-shop" aria-labelledby="el-u-fanshop">
      <div className={`el-shop__promo${vlastnyObrazok ? '' : ' el-shop__promo--produkt'}`}>
        {promo && <img src={promo} alt="" loading="lazy" onError={skryObrazok} />}
        <span className="el-shop__prechod" aria-hidden="true" />
        <div className="el-shop__text">
          <span className="el-stitok">Fanshop</span>
          <h2 id="el-u-fanshop">{u.text('fanshop_nadpis', 'Oficiálny fanshop')}</h2>
          {text && <p>{text}</p>}
          {obchod && (
            <Odkaz to={obchod} className="el-tlacidlo el-tlacidlo--akcent">
              {u.text('fanshop_tlacidlo', 'Do obchodu')}
              <Ikona nazov="sipka" velkost={14} />
            </Odkaz>
          )}
        </div>
      </div>
      <div className="el-shop__produkty">
        {produkty.slice(0, 4).map((p) => {
          const obsah = (
            <>
              <Obrazok src={p.obrazok} className="el-shop__obrazok" alt={p.nazov} />
              <span className="el-shop__info">
                {p.nazov && <strong>{p.nazov}</strong>}
                {p.cena && <span>{p.cena}</span>}
              </span>
            </>
          );
          return p.odkaz ? (
            <Odkaz key={p.kluc} to={p.odkaz} className="el-shop__produkt">
              {obsah}
            </Odkaz>
          ) : (
            <div key={p.kluc} className="el-shop__produkt">
              {obsah}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ===== Členstvo a úspechy =====

const citajUspechy = (text: unknown) =>
  String(text || '')
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const m = /^(\d+)\s*(?:[×x*|:-]\s*)?(.+)$/i.exec(r);
      return m ? { pocet: m[1], nazov: m[2].trim() } : { pocet: '', nazov: r };
    });

const Clenstvo: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  const uspechy = citajUspechy(s.uspechy).slice(0, 4);
  const vyzva = u.zapnute('ukazat_vyzvu');
  const vyhody = vyzva && uspechy.length === 0 ? u.text('vyzva_vyhody', 'Prednostný predaj vstupeniek\nPozvánky na zápasy a akcie klubu\nZľavy v oficiálnom fanshope\nNovinky z kabíny ako prví').split(/\r?\n/).map((r) => r.trim()).filter(Boolean).slice(0, 6) : [];
  if (!vyzva && uspechy.length === 0) return null;
  const fotka = obrazokUrl((s.vyzva_obrazok as string | null) || null);
  return (
    <section className={`el-clenstvo${fotka ? ' el-clenstvo--fotka' : ''}`} aria-label="Členstvo">
      {fotka && <img className="el-clenstvo__fotka" src={fotka} alt="" loading="lazy" onError={skryObrazok} />}
      <div className={`el-kontajner el-clenstvo__vnutro${(uspechy.length || vyhody.length) && vyzva ? '' : ' el-clenstvo__vnutro--1'}`}>
        {vyzva && (
          <div className="el-clenstvo__vyzva">
            <span className="el-stitok">{u.text('vyzva_stitok', 'Členstvo')}</span>
            <h2>{u.text('vyzva_nadpis', 'Staňte sa súčasťou {klub}')}</h2>
            <p>{u.text('vyzva_text', 'Pozvánky na zápasy, novinky a akcie klubu ako prví. Registrácia je zadarmo.')}</p>
            <Odkaz to={String(s.vyzva_odkaz || '').trim() || '/registracia'} className="el-tlacidlo el-tlacidlo--akcent">
              {u.text('vyzva_tlacidlo', 'Registrácia')}
              <Ikona nazov="sipka" velkost={14} />
            </Odkaz>
          </div>
        )}
        {uspechy.length > 0 && (
          <div className="el-clenstvo__uspechy">
            <h3>{u.text('uspechy_nadpis', 'Klub v číslach')}</h3>
            <ul>
              {uspechy.map((x, i) => (
                <li key={i}>
                  {x.pocet && <strong>{x.pocet}</strong>}
                  <span>{x.nazov}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {vyhody.length > 0 && (
          <ul className="el-clenstvo__vyhody">
            {vyhody.map((v, i) => (
              <li key={i}>
                <span aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {v}
              </li>
            ))}
          </ul>
        )}
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
  const clanky = useApi<Clanok[]>('/articles?limit=16');
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
  const novinky = mimoHero.length >= 4 ? mimoHero : vsetky;

  const timHracov = (s.hraci_tim ? timy.find((t) => t.id === Number(s.hraci_tim)) : null) ?? hlavny;
  const vstupenky = String(s.vstupenky_odkaz || '').trim() || null;
  const sHero = u.zapnute('ukazat_clanky');

  return (
    <div className="el-uvod">
      {sHero && <Slider clanky={hero} nacitava={zvyraznene.nacitava || clanky.nacitava} nahradnaFotka={(s.uvod_fotka as string | null) || null} />}
      <Sekcie p="po_slideri" />
      {u.zapnute('ukazat_zapasy') && hlavny && <ZapasovaKarta tim={hlavny} ligy={ligy.data ?? []} vstupenky={vstupenky} prekryva={sHero} />}
      <Sekcie p="po_zapase" />
      {u.zapnute('ukazat_novinky') && <Novinky clanky={novinky} />}
      <Sekcie p="po_novinkach" />
      {u.zapnute('ukazat_hracov') && timHracov && <Kader tim={timHracov} nadpis={u.text('hraci_nadpis', 'Prvý tím')} />}
      <Sekcie p="po_kadri" />
      {u.zapnute('ukazat_sezonu') && hlavny && <Sezona tim={hlavny} nadpis={u.text('sezona_nadpis', 'Sezóna v číslach')} />}
      <Sekcie p="po_sezone" />
      {u.zapnute('ukazat_videa') && <KlubTV videa={videa.data ?? []} />}
      <Sekcie p="po_videach" />
      {u.zapnute('ukazat_fanshop') && <Fanshop s={s} />}
      <Sekcie p="po_fanshope" />
      <Clenstvo s={s} />
      <Sekcie p="koniec" />
    </div>
  );
};

export default Uvod;
