// Umiestnenie: sablony/bento/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Dynamic Football Bento.
//
// Celá stránka je jedna doska z dlaždíc. Navrchu obrovská hero karta
// (nie obrazovka cez celú šírku) s článkom, otočenou nálepkou a krokovaním
// článkov; vedľa nej dlaždice najbližšieho zápasu, posledného výsledku
// a postavenia v tabuľke. Pod ňou bežiaci pás, asymetrická mriežka
// noviniek, zápasové centrum, karty hráčov ako zberateľské kartičky,
// videá, fanshop, čísla klubu, siete s výzvou a pás partnerov.
// Dlaždice bez obsahu sa neukážu a mriežka sa zaplní ostatnými.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, useNastavenia, useNastaveniaSablony, type ProduktObchodu } from '@clubw/jadro';
import { useSiete } from '../Rozlozenie';
import { Obrazok, embedVidea, useOknoVidea, vyrezTabulky } from '../casti';
import {
  Erb,
  Ikona,
  Odkaz,
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
  zaKolko,
  type Clanok,
  type Hrac,
  type Liga,
  type Partner,
  type RiadokTabulky,
  type StatistikaHraca,
  type Tim,
  type Video,
  type Zapas,
} from '../spolocne';

type Nastavenia = Record<string, string | number | boolean | null>;

const obmedz = (n: unknown, min: number, max: number, predvolene: number) => Math.min(Math.max(Number(n) || predvolene, min), max);
const podlaCasu = (a: Zapas, b: Zapas) => a.datum_cas.localeCompare(b.datum_cas);
const sutazZapasu = (z: Zapas) => [z.liga_nazov, z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ');
const pozadieUrl = (url: string | null) => (url ? `url("${url.replace(/"/g, '%22')}")` : undefined);

/** Nadpis sekcie dosky: veľké slovo, poradové číslo a odkaz ako šípka. */
const HlavaSekcie: React.FC<{ cislo: string; nadpis: string; odkaz?: string | null; id: string; children?: React.ReactNode }> = ({ cislo, nadpis, odkaz, id, children }) => {
  const u = useUpravy();
  return (
    <div className="db-u-hlava">
      <span className="db-u-hlava__cislo" aria-hidden="true">
        {cislo}
      </span>
      <h2 id={id}>{nadpis}</h2>
      {children}
      {odkaz && (
        <Odkaz to={odkaz} className="db-u-hlava__odkaz">
          {u.text('text_zobrazit_vsetky', 'Zobraziť všetky')}
          <Ikona nazov="sipka" velkost={14} />
        </Odkaz>
      )}
    </div>
  );
};

// ===== Hero karta =====

const INTERVAL = 7000;

/** Kruhová nálepka s bežiacim textom - pootočená cez roh hero karty. */
const Nalepka: React.FC<{ text: string }> = ({ text }) => {
  const opakovany = `${text} • ${text} • `;
  return (
    <span className="db-u-nalepka" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <defs>
          <path id="db-nalepka-kruh" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
        </defs>
        <text>
          <textPath href="#db-nalepka-kruh">{opakovany.toUpperCase()}</textPath>
        </text>
      </svg>
      <span className="db-u-nalepka__stred">
        <Ikona nazov="sipka" velkost={26} />
      </span>
    </span>
  );
};

const HeroKarta: React.FC<{ clanky: Clanok[]; stitok: string; nalepka: string; nahradnaFotka: string | null; nacitava: boolean }> = ({
  clanky,
  stitok,
  nalepka,
  nahradnaFotka,
  nacitava,
}) => {
  const { nastavenia } = useNastavenia();
  const u = useUpravy();
  const [aktivny, setAktivny] = useState(0);
  const [pauza, setPauza] = useState(false);
  const dotyk = useRef<number | null>(null);
  const pocet = clanky.length;

  // Ďalší článok prepne koniec animácie ukazovateľa času - pauza pod myšou
  // ju zastaví a pri obmedzenom pohybe sa články neprepínajú samé
  useEffect(() => {
    if (aktivny >= pocet) setAktivny(0);
  }, [aktivny, pocet]);

  const c = clanky[aktivny] ?? null;
  const posun = (smer: 1 | -1) => pocet > 1 && setAktivny((i) => (i + smer + pocet) % pocet);

  return (
    <section
      className={`db-u-hero db-objekt db-odhal${nacitava ? ' is-nacitava' : ''}`}
      aria-roledescription={pocet > 1 ? 'slider' : undefined}
      aria-label={stitok}
      onMouseEnter={() => setPauza(true)}
      onMouseLeave={() => setPauza(false)}
      onTouchStart={(e) => (dotyk.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (dotyk.current === null) return;
        const rozdiel = e.changedTouches[0].clientX - dotyk.current;
        dotyk.current = null;
        if (Math.abs(rozdiel) > 50) posun(rozdiel < 0 ? 1 : -1);
      }}
    >
      <div className="db-u-hero__fotky" aria-hidden="true">
        {(pocet ? clanky : [null]).map((x, i) => {
          const fotka = obrazokUrl(x?.obrazok) ?? obrazokUrl(nahradnaFotka);
          return <span key={x?.id ?? 'prazdna'} className={`db-u-hero__fotka${i === aktivny ? ' is-aktivna' : ''}`} style={{ backgroundImage: pozadieUrl(fotka) }} />;
        })}
        <span className="db-u-hero__mriezka" />
      </div>

      <div className="db-u-hero__hore">
        <span className="db-u-stitok db-u-stitok--volt">{stitok}</span>
        {c?.kategoria && <span className="db-u-stitok db-u-stitok--sklo">{c.kategoria.nazov}</span>}
      </div>

      <div className="db-u-hero__dole">
        {c ? (
          <>
            <h1 className="db-u-hero__nadpis" key={c.id}>
              <Link to={`/clanek/${c.slug}`}>{c.nazov}</Link>
            </h1>
            <div className="db-u-hero__meta">
              <span>{datum(c.publikovany_datum || c.vytvoreny)}</span>
              {c.excerpt && <p>{c.excerpt}</p>}
            </div>
          </>
        ) : (
          <h1 className="db-u-hero__nadpis">{nacitava ? ' ' : nastavenia.slogan || nastavenia.nazov}</h1>
        )}
      </div>

      {c && (
        <Link to={`/clanek/${c.slug}`} className="db-u-hero__citat" aria-label={`${u.text('text_citat_viac', 'Čítať viac')}: ${c.nazov}`} tabIndex={-1}>
          <Nalepka text={nalepka || nastavenia.skratka || nastavenia.nazov} />
        </Link>
      )}

      {pocet > 1 && (
        <div className="db-u-hero__kroky" role="tablist" aria-label="Články">
          {clanky.map((x, i) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={i === aktivny}
              aria-label={x.nazov}
              className={i === aktivny ? `is-aktivny${pauza ? ' is-pauza' : ''}` : ''}
              onClick={() => setAktivny(i)}
              style={{ '--db-interval': `${INTERVAL}ms` } as React.CSSProperties}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <i aria-hidden="true" onAnimationEnd={i === aktivny ? () => posun(1) : undefined} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

// ===== Dlaždice vedľa hero karty =====

const useOdpocet = (cielovy: string | null) => {
  const [teraz, setTeraz] = useState(() => Date.now());
  useEffect(() => {
    if (!cielovy) return;
    const t = window.setInterval(() => setTeraz(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, [cielovy]);
  if (!cielovy) return null;
  const zostava = new Date(cielovy).getTime() - teraz;
  if (!(zostava > 0)) return null;
  return { dni: Math.floor(zostava / 86_400_000), hodiny: Math.floor((zostava % 86_400_000) / 3_600_000), minuty: Math.floor((zostava % 3_600_000) / 60_000) };
};

const DlazdicaZapasu: React.FC<{ zapas: Zapas | null; vstupenky: string | null; nacitava: boolean }> = ({ zapas: z, vstupenky, nacitava }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const stav = z ? stavZapasu(z) : null;
  const odpocet = useOdpocet(z && stav === 'naplanovany' ? z.datum_cas : null);
  if (!z) {
    return (
      <div className="db-dlazdica db-dlazdica--tmava db-u-zapas db-odhal">
        <span className="db-u-mini-stitok">{u.text('zapasy_nadpis', 'Zápasy')}</span>
        <p className="db-u-zapas__prazdne">{nacitava ? 'Načítavam…' : 'Ďalší zápas zatiaľ nie je naplánovaný.'}</p>
        <Link to="/matches" className="db-u-tl db-u-tl--svetle">
          Všetky zápasy <Ikona nazov="sipka" velkost={14} />
        </Link>
      </div>
    );
  }
  const zivy = stav === 'prebieha';
  const skore = maVysledok(z) && stav !== 'naplanovany';
  return (
    <article className={`db-dlazdica db-dlazdica--tmava db-u-zapas db-objekt db-odhal${zivy ? ' is-zivy' : ''}`}>
      <div className="db-u-zapas__hlava">
        <span className="db-u-mini-stitok">{zivy ? 'Práve sa hrá' : 'Najbližší zápas'}</span>
        <span className="db-u-zapas__kedy">{zivy ? 'LIVE' : zaKolko(z.datum_cas) || datumKratky(z.datum_cas)}</span>
      </div>
      <div className="db-u-zapas__timy">
        <div>
          <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} velky />
          <strong>{nazovDomacich(z)}</strong>
        </div>
        <span className="db-u-zapas__vs">{skore ? `${z.goly_domaci}:${z.goly_hostia}` : 'vs'}</span>
        <div>
          <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} ton="akcent" velky />
          <strong>{nazovHosti(z)}</strong>
        </div>
      </div>
      <div className="db-u-zapas__kedy-velke">
        <strong>{cas(z.datum_cas)}</strong>
        <span>
          {denVTyzdni(z.datum_cas)} {datumKratky(z.datum_cas)}
          {z.miesto ? ` · ${z.miesto}` : ''}
        </span>
      </div>
      {odpocet && (
        <div className="db-u-odpocet" aria-label={`Do zápasu zostáva ${odpocet.dni} d ${odpocet.hodiny} h ${odpocet.minuty} min`}>
          {(
            [
              [odpocet.dni, 'dní'],
              [odpocet.hodiny, 'hod'],
              [odpocet.minuty, 'min'],
            ] as Array<[number, string]>
          ).map(([n, t]) => (
            <span key={t}>
              <strong>{String(n).padStart(2, '0')}</strong>
              <small>{t}</small>
            </span>
          ))}
        </div>
      )}
      <div className="db-u-zapas__akcie">
        {stav === 'naplanovany' && vstupenky && (
          <Odkaz to={vstupenky} className="db-u-tl db-u-tl--volt">
            {u.text('vstupenky_text', 'Vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className="db-u-tl db-u-tl--svetle">
          {u.text('text_detail', 'Detail')} <Ikona nazov="sipka" velkost={14} />
        </Link>
      </div>
    </article>
  );
};

const DlazdicaVysledku: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const v = vysledokKlubu(z);
  const text = v === 'V' ? 'Výhra' : v === 'P' ? 'Prehra' : v === 'R' ? 'Remíza' : 'Výsledok';
  const domaci = Boolean(z.domaci_tim_id);
  const super_ = domaci ? nazovHosti(z) : nazovDomacich(z);
  return (
    <Link to={`/matches/${z.id}`} className={`db-dlazdica db-dlazdica--volt db-u-vysledok db-objekt db-odhal is-${(v ?? 'x').toLowerCase()}`}>
      <span className="db-u-mini-stitok">Posledný zápas</span>
      <strong className="db-u-vysledok__skore">
        {z.goly_domaci}
        <i>:</i>
        {z.goly_hostia}
      </strong>
      <span className="db-u-vysledok__text">
        <b>{text}</b> {domaci ? 'doma s' : 'vonku na'} {super_}
      </span>
      <span className="db-u-vysledok__datum">{datumKratky(z.datum_cas)}</span>
    </Link>
  );
};

const DlazdicaTabulky: React.FC<{ liga: Liga; riadky: RiadokTabulky[]; timId: number | null }> = ({ liga, riadky, timId }) => {
  const nas = riadky.find((r) => r.tim_id === timId) ?? null;
  if (!nas) return null;
  const forma = (nas.forma || '').toUpperCase().replace(/[^WDLVRP]/g, '').slice(-5).split('');
  const typ = (z: string) => (z === 'W' || z === 'V' ? 'V' : z === 'D' || z === 'R' ? 'R' : 'P');
  return (
    <Link to={`/leagues/${liga.id}`} className="db-dlazdica db-u-poradie db-objekt db-odhal">
      <span className="db-u-mini-stitok">{liga.nazov}</span>
      <strong className="db-u-poradie__cislo">
        {nas.pozicia}
        <sup>.</sup>
      </strong>
      <span className="db-u-poradie__body">
        <b>{nas.body}</b> bodov · {nas.zapasy} zápasov
      </span>
      {forma.length > 0 && (
        <span className="db-u-forma" aria-label="Forma">
          {forma.map((z, i) => (
            <i key={i} className={`db-u-forma--${typ(z)}`}>
              {typ(z)}
            </i>
          ))}
        </span>
      )}
    </Link>
  );
};

// ===== Bežiaci pás =====

const Pas: React.FC<{ polozky: string[] }> = ({ polozky }) => {
  if (polozky.length === 0) return null;
  const rad = (
    <span className="db-u-pas__rad">
      {polozky.map((p, i) => (
        <span key={i}>
          {p}
          <i aria-hidden="true">✦</i>
        </span>
      ))}
    </span>
  );
  return (
    <div className="db-u-pas db-odhal" aria-label="Aktuality">
      <div className="db-u-pas__stopa">
        {rad}
        <span aria-hidden="true">{rad}</span>
      </div>
    </div>
  );
};

// ===== Novinky =====

const VZORY = ['velka', 'siroka', 'mala', 'textova', 'mala', 'mala'] as const;

const KartaNoviny: React.FC<{ clanok: Clanok; vzor: (typeof VZORY)[number]; index: number }> = ({ clanok: c, vzor, index }) => (
  <Link to={`/clanek/${c.slug}`} className={`db-u-novina db-u-novina--${vzor} db-objekt db-odhal`} style={{ '--db-i': index } as React.CSSProperties}>
    {vzor !== 'textova' && <Obrazok src={c.obrazok} className="db-u-novina__obrazok" />}
    <span className="db-u-novina__text">
      <span className="db-u-novina__meta">
        {c.kategoria && <b>{c.kategoria.nazov}</b>}
        <span>{datumKratky(c.publikovany_datum || c.vytvoreny)}</span>
      </span>
      <strong>{c.nazov}</strong>
      {(vzor === 'siroka' || vzor === 'textova') && c.excerpt && <span className="db-u-novina__perex">{c.excerpt}</span>}
    </span>
    <span className="db-u-novina__sipka" aria-hidden="true">
      <Ikona nazov="sipka" velkost={16} />
    </span>
  </Link>
);

const Novinky: React.FC<{ clanky: Clanok[] }> = ({ clanky }) => {
  const u = useUpravy();
  if (clanky.length === 0) return null;
  return (
    <section className="db-u-sekcia db-u-novinky" aria-labelledby="db-u-novinky">
      <HlavaSekcie cislo="01" nadpis={u.text('clanky_nadpis', 'Novinky')} odkaz="/clanky" id="db-u-novinky" />
      <div className={`db-u-novinky__mriezka db-u-novinky__mriezka--${Math.min(clanky.length, 6)}`}>
        {clanky.slice(0, 6).map((c, i) => (
          <KartaNoviny key={c.id} clanok={c} vzor={VZORY[i]} index={i} />
        ))}
        <Link to="/clanky" className="db-dlazdica db-dlazdica--volt db-u-vsetky db-objekt db-odhal">
          <span>{u.text('text_vsetky_spravy', 'Všetky správy')}</span>
          <Ikona nazov="sipka" velkost={34} />
        </Link>
      </div>
    </section>
  );
};

// ===== Zápasové centrum =====

const RiadokZapasu: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const { nastavenia } = useNastavenia();
  const skore = maVysledok(z) && stavZapasu(z) !== 'naplanovany';
  const v = vysledokKlubu(z);
  const [den, mesiac] = datumKratky(z.datum_cas).split('. ');
  return (
    <Link to={`/matches/${z.id}`} className="db-u-riadok">
      <span className="db-u-riadok__datum">
        <strong>{den}</strong>
        <small>{mesiac}</small>
      </span>
      <span className="db-u-riadok__timy">
        {(['domaci', 'hostia'] as const).map((strana) => (
          <span key={strana}>
            <Erb nazov={strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} />
            <span className="db-u-riadok__nazov">{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</span>
            {skore && <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>}
          </span>
        ))}
      </span>
      <span className={`db-u-riadok__stav${v ? ` is-${v.toLowerCase()}` : ''}`}>{skore ? (v ?? '–') : cas(z.datum_cas)}</span>
    </Link>
  );
};

const ZapasoveCentrum: React.FC<{
  timy: Tim[];
  timId: number | null;
  setTimId: (id: number) => void;
  program: Zapas[];
  vysledky: Zapas[];
  tabulka: { liga: Liga; riadky: RiadokTabulky[] } | null;
  nacitava: boolean;
}> = ({ timy, timId, setTimId, program, vysledky, tabulka, nacitava }) => {
  const u = useUpravy();
  const vyrez = tabulka ? vyrezTabulky(tabulka.riadky, timId, 6) : [];
  return (
    <section className="db-u-sekcia db-u-centrum" aria-labelledby="db-u-centrum">
      <HlavaSekcie cislo="02" nadpis={u.text('zapasy_nadpis', 'Zápasové centrum')} odkaz="/matches" id="db-u-centrum">
        {timy.length > 1 && (
          <div className="db-u-timy" role="tablist" aria-label="Tím">
            {timy.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === timId} className={t.id === timId ? 'is-aktivny' : ''} onClick={() => setTimId(t.id)}>
                {t.nazov}
              </button>
            ))}
          </div>
        )}
      </HlavaSekcie>
      <div className={`db-u-centrum__mriezka${vyrez.length ? '' : ' db-u-centrum__mriezka--bez-tabulky'}`}>
        <div className="db-dlazdica db-u-program db-odhal">
          <div className="db-u-dlazdica-hlava">
            <h3>Program</h3>
            <span>{program.length ? `${program.length} ${program.length === 1 ? 'zápas' : program.length < 5 ? 'zápasy' : 'zápasov'}` : ''}</span>
          </div>
          {program.length ? program.slice(0, 4).map((z) => <RiadokZapasu key={z.id} zapas={z} />) : <p className="db-u-prazdne">{nacitava ? 'Načítavam…' : 'Žiadne naplánované zápasy.'}</p>}
        </div>
        <div className="db-dlazdica db-dlazdica--tmava db-u-vysledky db-odhal">
          <div className="db-u-dlazdica-hlava">
            <h3>Výsledky</h3>
            <Link to="/matches?cast=vysledky">Archív</Link>
          </div>
          {vysledky.length ? vysledky.slice(0, 4).map((z) => <RiadokZapasu key={z.id} zapas={z} />) : <p className="db-u-prazdne">{nacitava ? 'Načítavam…' : 'Zatiaľ bez výsledkov.'}</p>}
        </div>
        {tabulka && vyrez.length > 0 && (
          <Link to={`/leagues/${tabulka.liga.id}`} className="db-dlazdica db-u-tabulka db-objekt db-odhal">
            <div className="db-u-dlazdica-hlava">
              <h3>Tabuľka</h3>
              <span>{tabulka.liga.nazov}</span>
            </div>
            <ol>
              {vyrez.map((r) => (
                <li key={r.id} className={r.tim_id === timId ? 'is-nas' : ''}>
                  <span className="db-u-tabulka__poz">{r.pozicia}</span>
                  <Erb nazov={r.tim_nazov || r.custom_tim_nazov || 'Tím'} logo={r.tim_logo || r.custom_tim_logo} />
                  <span className="db-u-tabulka__nazov">{r.tim_nazov || r.custom_tim_nazov}</span>
                  <span className="db-u-tabulka__z">{r.zapasy}</span>
                  <b>{r.body}</b>
                </li>
              ))}
            </ol>
          </Link>
        )}
      </div>
    </section>
  );
};

// ===== Hráči - zberateľské kartičky =====

const KartickaHraca: React.FC<{ hrac: Hrac; st?: StatistikaHraca; i: number }> = ({ hrac: h, st, i }) => {
  const fotka = obrazokUrl(h.fotka);
  return (
    <Link to={`/players/${h.id}`} className="db-u-karticka db-objekt" style={{ '--db-i': i } as React.CSSProperties}>
      <span className="db-u-karticka__cislo" aria-hidden="true">
        {h.cislo_dresu ?? ''}
      </span>
      {fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="db-hrac__silueta" aria-hidden="true" />}
      <span className="db-u-karticka__spodok">
        <span className="db-u-karticka__pozicia">{pozicia(h.pozicia) || ' '}</span>
        <span className="db-u-karticka__meno">
          <small>{h.meno}</small>
          <strong>{h.priezvisko}</strong>
        </span>
        <span className="db-u-karticka__staty">
          <span>
            <b>{st?.zapasy ?? 0}</b> záp.
          </span>
          <span>
            <b>{st?.goly ?? 0}</b> góly
          </span>
          <span>
            <b>{st?.asistencie ?? 0}</b> asist.
          </span>
        </span>
      </span>
    </Link>
  );
};

const Hraci: React.FC<{ tim: Tim; nadpis: string }> = ({ tim, nadpis }) => {
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const statistiky = useApi<StatistikaHraca[]>(`/teams/${tim.id}/players/stats`);
  const pas = useRef<HTMLDivElement>(null);
  const podlaId = useMemo(() => new Map((statistiky.data ?? []).map((s) => [s.hrac_id, s])), [statistiky.data]);
  const vsetci = hraci.data?.hraci ?? [];
  const vybrani = useMemo(
    () =>
      [...vsetci]
        .sort(
          (a, b) =>
            Number(Boolean(b.fotka)) - Number(Boolean(a.fotka)) ||
            (podlaId.get(b.id)?.goly ?? 0) - (podlaId.get(a.id)?.goly ?? 0) ||
            (a.cislo_dresu ?? 99) - (b.cislo_dresu ?? 99)
        )
        .slice(0, 10),
    [vsetci, podlaId]
  );
  if (vybrani.length === 0) return null;
  const strelec = [...vsetci].sort((a, b) => (podlaId.get(b.id)?.goly ?? 0) - (podlaId.get(a.id)?.goly ?? 0))[0];
  const golyStrelca = strelec ? podlaId.get(strelec.id)?.goly ?? 0 : 0;
  const posun = (smer: 1 | -1) => pas.current?.scrollBy({ left: smer * Math.min(pas.current.clientWidth * 0.8, 640), behavior: 'smooth' });

  return (
    <section className="db-u-sekcia db-u-hraci" aria-labelledby="db-u-hraci">
      <div className="db-u-hraci__mriezka">
        <div className="db-dlazdica db-dlazdica--tmava db-u-kader db-odhal">
          <span className="db-u-hlava__cislo" aria-hidden="true">
            03
          </span>
          <h2 id="db-u-hraci">{nadpis}</h2>
          <div className="db-u-kader__cisla">
            <span>
              <strong>{vsetci.length}</strong>
              <small>hráčov v kádri</small>
            </span>
            {strelec && golyStrelca > 0 && (
              <span>
                <strong>{golyStrelca}</strong>
                <small>
                  gólov · {strelec.meno.charAt(0)}. {strelec.priezvisko}
                </small>
              </span>
            )}
          </div>
          <div className="db-u-kader__akcie">
            <Link to={`/teams/${tim.id}`} className="db-u-tl db-u-tl--volt">
              Celý káder <Ikona nazov="sipka" velkost={14} />
            </Link>
            <span className="db-u-sipky">
              <button type="button" onClick={() => posun(-1)} aria-label="Predchádzajúci hráči">
                <Ikona nazov="vlavo" />
              </button>
              <button type="button" onClick={() => posun(1)} aria-label="Ďalší hráči">
                <Ikona nazov="vpravo" />
              </button>
            </span>
          </div>
        </div>
        <div ref={pas} className="db-u-karticky">
          {vybrani.map((h, i) => (
            <KartickaHraca key={h.id} hrac={h} st={podlaId.get(h.id)} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

// ===== Videá =====

const Videa: React.FC<{ videa: Video[] }> = ({ videa }) => {
  const u = useUpravy();
  const { otvor, okno } = useOknoVidea();
  if (videa.length === 0) return null;
  return (
    <section className="db-u-sekcia db-u-videa" aria-labelledby="db-u-videa">
      <HlavaSekcie cislo="04" nadpis={u.text('videa_nadpis', 'Videá')} odkaz="/videa" id="db-u-videa" />
      <div className={`db-u-videa__mriezka db-u-videa__mriezka--${Math.min(videa.length, 3)}`}>
        {videa.slice(0, 3).map((v, i) => {
          const dlzka = dlzkaVidea(v.dlzka);
          return (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`db-u-video${i === 0 ? ' db-u-video--velke' : ''} db-objekt db-odhal`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || !embedVidea(v)) return;
                e.preventDefault();
                otvor(v);
              }}
            >
              <Obrazok src={v.nahlad_url || v.nahlad} className="db-u-video__obrazok" />
              <span className="db-u-video__play" aria-hidden="true">
                <Ikona nazov="play" velkost={i === 0 ? 28 : 18} />
              </span>
              <span className="db-u-video__text">
                {dlzka && <span className="db-u-stitok db-u-stitok--sklo">{dlzka}</span>}
                <strong>{v.nazov}</strong>
              </span>
            </a>
          );
        })}
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
  const odporucane = useApi<ProduktObchodu[]>(zapnuty ? '/eshop/produkty?odporucane=1&limit=3' : null);
  const bezOdporucanych = zapnuty && !odporucane.nacitava && !odporucane.chyba && odporucane.data?.length === 0;
  const najnovsie = useApi<ProduktObchodu[]>(bezOdporucanych ? '/eshop/produkty?limit=3' : null);
  const mena = nastavenia.eshop?.mena ?? 'EUR';

  const produkty: Array<{ kluc: string; nazov: string; obrazok: string | null; cena: string; odkaz: string | null }> = zapnuty
    ? ((odporucane.data?.length ? odporucane.data : najnovsie.data) ?? []).map((p) => ({
        kluc: String(p.id),
        nazov: p.nazov,
        obrazok: p.obrazok ?? null,
        cena: cenaText(p.cena, mena),
        odkaz: `/obchod/${p.slug}`,
      }))
    : [1, 2, 3]
        .map((i) => ({
          kluc: String(i),
          nazov: '',
          obrazok: (s[`produkt_${i}_obrazok`] as string | null) || null,
          cena: String(s[`produkt_${i}_cena`] || ''),
          odkaz: String(s[`produkt_${i}_odkaz`] || '').trim() || String(s.fanshop_odkaz || '').trim() || null,
        }))
        .filter((p) => p.obrazok);
  if (produkty.length === 0) return null;
  const obchod = zapnuty ? '/obchod' : String(s.fanshop_odkaz || '').trim() || null;

  return (
    <section className="db-u-sekcia db-u-fanshop" aria-labelledby="db-u-fanshop">
      <div className="db-u-fanshop__mriezka">
        <div className="db-dlazdica db-dlazdica--druha db-u-fanshop__uvod db-odhal">
          <span className="db-u-hlava__cislo" aria-hidden="true">
            05
          </span>
          <h2 id="db-u-fanshop">{u.text('fanshop_nadpis', 'Fanshop')}</h2>
          <p>{u.text('fanshop_popis', 'Dresy, šály a doplnky. Podpor klub aj mimo štadióna.')}</p>
          {obchod && (
            <Odkaz to={obchod} className="db-u-tl db-u-tl--tmave">
              {u.text('fanshop_tlacidlo', 'Do obchodu')} <Ikona nazov="sipka" velkost={14} />
            </Odkaz>
          )}
        </div>
        {produkty.map((p, i) => {
          const obsah = (
            <>
              <Obrazok src={p.obrazok} className="db-u-produkt__obrazok" alt={p.nazov} />
              <span className="db-u-produkt__text">
                {p.nazov && <strong>{p.nazov}</strong>}
                {p.cena && <span className="db-u-produkt__cena">{p.cena}</span>}
              </span>
            </>
          );
          return p.odkaz ? (
            <Odkaz key={p.kluc} to={p.odkaz} className={`db-u-produkt db-objekt db-odhal db-u-produkt--${i + 1}`}>
              {obsah}
            </Odkaz>
          ) : (
            <div key={p.kluc} className={`db-u-produkt db-odhal db-u-produkt--${i + 1}`}>
              {obsah}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ===== Čísla, siete a výzva =====

/** „4 Ligový titul", „4× Ligový titul" alebo „4 | Ligový titul" → { pocet, nazov } */
const citajUspechy = (text: string | null) =>
  String(text || '')
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const m = /^(\d+)\s*(?:[×x*|:-]\s*)?(.+)$/i.exec(r);
      return m ? { pocet: m[1], nazov: m[2].trim() } : { pocet: '', nazov: r };
    });

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

const Komunita: React.FC<{ s: Nastavenia; ukazatSiete: boolean }> = ({ s, ukazatSiete }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const siete = useSiete();
  const uspechy = citajUspechy(s.uspechy as string | null).slice(0, 4);
  const vyzva = u.zapnute('ukazat_vyzvu');
  const sieteNaUkazanie = ukazatSiete ? siete : [];
  if (uspechy.length === 0 && sieteNaUkazanie.length === 0 && !vyzva) return null;

  return (
    <section className="db-u-sekcia db-u-komunita" aria-label={u.text('siete_nadpis', 'Komunita')}>
      <div className="db-u-komunita__mriezka">
        {uspechy.length > 0 && (
          <div className="db-dlazdica db-u-uspechy db-odhal">
            <span className="db-u-mini-stitok">{u.text('uspechy_nadpis', 'Úspechy')}</span>
            <ul>
              {uspechy.map((x, i) => (
                <li key={i}>
                  {x.pocet && <strong>{x.pocet}×</strong>}
                  <span>{x.nazov}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {vyzva && (
          <Odkaz to={String(s.vyzva_odkaz || '').trim() || '/registracia'} className="db-dlazdica db-dlazdica--volt db-u-vyzva db-objekt db-odhal">
            <span className="db-u-mini-stitok">{u.text('vyzva_stitok', 'Pridaj sa')}</span>
            <strong>{u.text('vyzva_nadpis', 'Staň sa súčasťou {klub}')}</strong>
            <span className="db-u-vyzva__tl">
              {u.text('vyzva_tlacidlo', 'Registrácia')}
              <Ikona nazov="sipka" velkost={18} />
            </span>
          </Odkaz>
        )}
        {sieteNaUkazanie.map((siet, i) => {
          const pocet = String(s[`sledujuci_${siet.kluc}`] || '').trim();
          return (
            <a key={siet.kluc} href={siet.url} target="_blank" rel="noopener noreferrer" className={`db-dlazdica db-u-siet db-u-siet--${siet.kluc} db-objekt db-odhal`} style={{ '--db-i': i } as React.CSSProperties}>
              <span className="db-u-siet__skratka">{siet.skratka}</span>
              <span className="db-u-siet__text">
                <strong>{pocet || siet.nazov}</strong>
                <small>{pocet ? `sledujúcich · ${siet.nazov}` : menoProfilu(siet.url, siet.kluc, nastavenia.nazov)}</small>
              </span>
              <Ikona nazov="odkaz" velkost={16} className="db-u-siet__sipka" />
            </a>
          );
        })}
      </div>
    </section>
  );
};

// ===== Odkaz klubu (dlaždice z nastavení) =====

const OdkazKlubu: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
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
    <section className="db-u-sekcia db-u-klub" aria-labelledby="db-u-klub">
      <HlavaSekcie cislo="06" nadpis={u.text('odkazy_nadpis', 'Klub')} id="db-u-klub" />
      <div className={`db-u-klub__mriezka db-u-klub__mriezka--${karty.length}`}>
        {karty.map((k) => {
          const obsah = (
            <>
              <Obrazok src={k.obrazok} className="db-u-klub__obrazok" />
              <span className="db-u-klub__text">
                <strong>{k.nazov}</strong>
                {k.odkaz && (
                  <span className="db-u-klub__tl">
                    {u.text('text_objavit', 'Objaviť')} <Ikona nazov="sipka" velkost={14} />
                  </span>
                )}
              </span>
            </>
          );
          return k.odkaz ? (
            <Odkaz key={k.i} to={k.odkaz} className="db-u-klub__karta db-objekt db-odhal">
              {obsah}
            </Odkaz>
          ) : (
            <div key={k.i} className="db-u-klub__karta db-odhal">
              {obsah}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ===== Partneri =====

const Partneri: React.FC<{ partneri: Partner[] }> = ({ partneri }) => {
  const u = useUpravy();
  if (partneri.length === 0) return null;
  const loga = partneri.slice(0, 16);
  const rad = (skryty: boolean) => (
    <span className="db-u-partneri__rad" aria-hidden={skryty || undefined}>
      {loga.map((p) => {
        const logo = obrazokUrl(p.logo);
        const obsah = logo ? <img src={logo} alt={skryty ? '' : p.nazov} loading="lazy" onError={skryObrazok} /> : <span>{p.nazov}</span>;
        return p.web_url ? (
          <a key={p.id} href={p.web_url} target="_blank" rel="noopener noreferrer" className="db-u-partner" tabIndex={skryty ? -1 : undefined} title={p.nazov}>
            {obsah}
          </a>
        ) : (
          <span key={p.id} className="db-u-partner" title={p.nazov}>
            {obsah}
          </span>
        );
      })}
    </span>
  );
  return (
    <section className="db-u-sekcia db-u-partneri db-odhal" aria-label={u.text('partneri_nadpis', 'Partneri')}>
      <div className="db-dlazdica db-u-partneri__doska">
        <div className="db-u-partneri__hlava">
          <span className="db-u-mini-stitok">{u.text('partneri_nadpis', 'Partneri klubu')}</span>
          <Link to="/sponzori" className="db-u-hlava__odkaz">
            {u.text('text_vsetci_partneri', 'Všetci partneri')} <Ikona nazov="sipka" velkost={14} />
          </Link>
        </div>
        <div className={`db-u-partneri__stopa${loga.length < 5 ? ' is-staticka' : ''}`}>
          {rad(false)}
          {loga.length >= 5 && rad(true)}
        </div>
      </div>
    </section>
  );
};

// ===== Stránka =====

const vyberTim = (timy: Tim[], id?: unknown) => (id ? timy.find((t) => t.id === Number(id)) : null) ?? timy.find((t) => t.typ === 'muzi') ?? timy[0] ?? null;
const jeSeniorska = (k?: string | null) => ['seniori', 'muzi'].includes((k || 'seniori').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());

const Uvod: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<Nastavenia>();
  const u = useUpravy();
  useTitulok(nastavenia.nazov);

  const pocetSlidov = obmedz(s.uvod_pocet, 1, 6, 4);
  const zvyraznene = useApi<Clanok[]>(`/articles?featured=true&limit=${pocetSlidov}`);
  const clanky = useApi<Clanok[]>('/articles?limit=12');
  const timy = useApi<Tim[]>('/teams');
  const ligy = useApi<Liga[]>('/leagues');
  const videa = useApi<Video[]>(u.zapnute('ukazat_videa') ? '/videos?limit=3' : null);
  const partneri = useApi<Partner[]>(u.zapnute('ukazat_partnerov_uvod') ? '/sponsors' : null);

  const zoradeneTimy = useMemo(() => [...(timy.data ?? [])].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id), [timy.data]);
  const timyAB = zoradeneTimy.filter((t) => t.typ === 'muzi' && jeSeniorska(t.vekova_kategoria));
  const timyZapasov = (timyAB.length > 0 ? timyAB : zoradeneTimy).slice(0, obmedz(s.zapasy_timov, 1, 4, 2));
  const [timId, setTimId] = useState<number | null>(null);
  const aktivnyTim = timyZapasov.find((t) => t.id === timId) ?? timyZapasov[0] ?? null;
  const tid = aktivnyTim?.id ?? null;
  const timHracov = vyberTim(zoradeneTimy, s.hraci_tim);

  const vysledky = useApi<Zapas[]>(tid ? `/matches?tim_id=${tid}&status=ukonceny&limit=4` : null);
  const zive = useApi<Zapas[]>(tid ? `/matches?tim_id=${tid}&status=prebieha&limit=2` : null);
  const buduce = useApi<Zapas[]>(tid ? `/matches?tim_id=${tid}&status=naplanovany&od_datumu=${dnes()}&limit=20` : null);
  const nacitavaZapasy = timy.nacitava || vysledky.nacitava || zive.nacitava || buduce.nacitava;

  const program = useMemo(() => [...(buduce.data ?? [])].sort(podlaCasu), [buduce.data]);
  const odohrane = useMemo(() => [...(vysledky.data ?? [])].sort(podlaCasu).reverse(), [vysledky.data]);
  const hlavnyZapas = zive.data?.[0] ?? program[0] ?? null;
  const poslednyVysledok = odohrane.find((z) => maVysledok(z)) ?? null;

  const liga = (ligy.data ?? []).find((l) => tid && l.tim_id === tid && l.format !== 'turnaj') ?? null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);
  const dataTabulky = liga && tabulka.data?.length ? { liga, riadky: tabulka.data } : null;
  const maPoradie = Boolean(dataTabulky?.riadky.some((r) => r.tim_id === tid));

  // Hero: zvýraznené články, inak najnovšie; novinky pokračujú ďalšími
  const hero = (zvyraznene.data?.length ? zvyraznene.data : clanky.data ?? []).slice(0, pocetSlidov);
  const nacitavaHero = zvyraznene.nacitava || (clanky.nacitava && !zvyraznene.data?.length);
  const idHero = new Set(hero.map((c) => c.id));
  const novinky = (clanky.data ?? []).filter((c) => !idHero.has(c.id)).slice(0, obmedz(s.pocet_clankov, 3, 6, 6));
  const vstupenky = String(s.vstupenky_odkaz || '').trim() || null;

  const pas = useMemo(() => {
    const p: string[] = [];
    if (hlavnyZapas) p.push(`${stavZapasu(hlavnyZapas) === 'prebieha' ? 'Live' : 'Ďalší zápas'}: ${nazovDomacich(hlavnyZapas)} – ${nazovHosti(hlavnyZapas)}, ${datumKratky(hlavnyZapas.datum_cas)} ${cas(hlavnyZapas.datum_cas)}`);
    if (poslednyVysledok) p.push(`${nazovDomacich(poslednyVysledok)} ${poslednyVysledok.goly_domaci}:${poslednyVysledok.goly_hostia} ${nazovHosti(poslednyVysledok)}`);
    const vlastny = String(s.pas_text || '').trim();
    if (vlastny) p.push(...vlastny.split(/\r?\n/).map((r) => r.trim()).filter(Boolean));
    (clanky.data ?? []).slice(0, 3).forEach((c) => p.push(c.nazov));
    return p;
  }, [hlavnyZapas, poslednyVysledok, clanky.data, s.pas_text]);

  const bocne = [
    u.zapnute('ukazat_zapasy') ? 'zapas' : null,
    u.zapnute('ukazat_zapasy') && poslednyVysledok ? 'vysledok' : null,
    u.zapnute('ukazat_zapasy') && maPoradie ? 'poradie' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="db-uvod db-doska">
      <div className={`db-u-start db-u-start--${bocne.length}${bocne.includes('vysledok') && !bocne.includes('poradie') ? ' db-u-start--bez-poradia' : ''}${!bocne.includes('vysledok') && bocne.includes('poradie') ? ' db-u-start--bez-vysledku' : ''}`}>
        <HeroKarta
          clanky={hero}
          stitok={String(s.uvod_stitok || '').trim() || 'Top story'}
          nalepka={String(s.uvod_nalepka || '').trim()}
          nahradnaFotka={(s.uvod_fotka as string | null) || null}
          nacitava={nacitavaHero}
        />
        {bocne.includes('zapas') && <DlazdicaZapasu zapas={hlavnyZapas} vstupenky={vstupenky} nacitava={nacitavaZapasy} />}
        {poslednyVysledok && bocne.includes('vysledok') && <DlazdicaVysledku zapas={poslednyVysledok} />}
        {dataTabulky && bocne.includes('poradie') && <DlazdicaTabulky liga={dataTabulky.liga} riadky={dataTabulky.riadky} timId={tid} />}
      </div>

      {u.zapnute('ukazat_pas') && <Pas polozky={pas} />}
      {u.zapnute('ukazat_clanky') && <Novinky clanky={novinky} />}
      {u.zapnute('ukazat_zapasy') && timyZapasov.length > 0 && (
        <ZapasoveCentrum
          timy={timyZapasov}
          timId={tid}
          setTimId={setTimId}
          program={program.some((z) => z.id !== hlavnyZapas?.id) ? program.filter((z) => z.id !== hlavnyZapas?.id) : program}
          vysledky={odohrane}
          tabulka={dataTabulky}
          nacitava={nacitavaZapasy}
        />
      )}
      {u.zapnute('ukazat_hracov') && timHracov && <Hraci tim={timHracov} nadpis={String(s.hraci_nadpis || '').trim() || timHracov.nazov} />}
      {u.zapnute('ukazat_videa') && <Videa videa={videa.data ?? []} />}
      {u.zapnute('ukazat_fanshop') && <Fanshop s={s} />}
      <Komunita s={s} ukazatSiete={u.zapnute('ukazat_siete')} />
      {u.zapnute('ukazat_odkazy') && <OdkazKlubu s={s} />}
      <Partneri partneri={partneri.data ?? []} />
    </div>
  );
};

export default Uvod;
