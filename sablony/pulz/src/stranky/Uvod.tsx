// Umiestnenie: sablony/pulz/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Pulz - tmavý web s neónovým svetlom.
//
//  1. výsledková tabuľa - najbližší zápas s odpočtom (počas zápasu skóre,
//     potom posledný výsledok), bez zápasu hlavná správa; pod ňou pás správ,
//  2. bežiaci neónový pás s výsledkami a programom,
//  3. novinky ako vodorovný karusel vysokých kariet,
//  4. zápasy - prilepený nadpis naľavo a veľké riadky zápasov napravo,
//  5. sezóna v číslach na sklenenom paneli so žiarou,
//  6. káder ako karusel kariet hráčov,
//  7. médiá - video, fotogaléria a fanshop, výzva na členstvo.
// Partneri sú v pätičke. Sekcie bez obsahu sa neukážu.

import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, souborUrl, useNastavenia, useNastaveniaSablony, type ProduktObchodu, type VlastnostiHlavickyBloku } from '@clubw/jadro';
import { Sekcie as SekcieSablony } from '../bloky';
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
  <div className={`pz-shlava${svetla ? ' pz-shlava--svetla' : ''}`}>
    <div className="pz-shlava__text">
      {stitok && <span className="pz-stitok">{stitok}</span>}
      <h2 id={id}>{nadpis}</h2>
    </div>
    <span className="pz-shlava__ciara" aria-hidden="true" />
    <div className="pz-shlava__akcie">
      {children}
      {odkaz && (
        <Odkaz to={odkaz} className="pz-sipkovy">
          <span>{textOdkazu || 'Zobraziť všetko'}</span>
          <i aria-hidden="true">
            <Ikona nazov="sipka" velkost={14} />
          </i>
        </Odkaz>
      )}
    </div>
  </div>
);

/** Nadpis vlastnej sekcie úvodu - rovnaký ako pri ostatných sekciách (odkaz „Zobraziť všetky" vedľa názvu). */
const HlavickaSekcie: React.FC<VlastnostiHlavickyBloku> = ({ nadpis, uvod, odkaz, textOdkazu }) => {
  const id = useId();
  return <HlavaSekcie nadpis={nadpis || ''} stitok={uvod} odkaz={odkaz} textOdkazu={textOdkazu || undefined} id={id} />;
};
const Sekcie: React.FC<{ p: string }> = ({ p }) => <SekcieSablony p={p} hlavicka={HlavickaSekcie} />;

/** Šípky vodorovného karuselu. */
const useKarusel = () => {
  const pas = useRef<HTMLDivElement>(null);
  const posun = (smer: number) => pas.current?.scrollBy({ left: smer * pas.current.clientWidth * 0.8, behavior: 'smooth' });
  const sipky = (
    <span className="pz-sipky">
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

// ===== 1. Hero - výsledková tabuľa =====

const Odpocet: React.FC<{ odpocet: NonNullable<ReturnType<typeof useOdpocet>> }> = ({ odpocet }) => (
  <div className="pz-tabula__odpocet" aria-label="Do výkopu zostáva">
    {(
      [
        ['dni', 'dní'],
        ['hodiny', 'hodín'],
        ['minuty', 'minút'],
        ['sekundy', 'sekúnd'],
      ] as const
    ).map(([k, n], i) => (
      <React.Fragment key={k}>
        {i > 0 && (
          <i className="pz-tabula__dvojbodka" aria-hidden="true">
            :
          </i>
        )}
        <span>
          <strong>{String(odpocet[k]).padStart(2, '0')}</strong>
          <small>{n}</small>
        </span>
      </React.Fragment>
    ))}
  </div>
);

/** Tabuľa zápasu: najbližší (s odpočtom), práve hraný (skóre) alebo posledný odohraný. */
const TabulaZapasu: React.FC<{ zapas: Zapas; vstupenky: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const stav = stavZapasu(z);
  const zivy = stav === 'prebieha';
  const skore = maVysledok(z) && stav !== 'naplanovany';
  const odpocet = useOdpocet(stav === 'naplanovany' ? z.datum_cas : null, u.zapnute('ukazat_odpocet'));
  const nadpis = zivy ? 'Práve sa hrá' : stav === 'naplanovany' ? 'Najbližší zápas' : 'Posledný zápas';
  return (
    <div className="pz-tabula__zapas">
      <div className="pz-tabula__hlava">
        <span className="pz-tabula__stav">
          {zivy ? <b className="pz-live">Live</b> : <i aria-hidden="true" />}
          {nadpis}
        </span>
        <span className="pz-tabula__sutaz">{sutazZapasu(z) || 'Zápas'}</span>
      </div>
      <h1 className="pz-tabula__duel">
        <span className="pz-tabula__tim">
          <span className="pz-tabula__erb">
            <ErbStrany zapas={z} strana="domaci" velky />
          </span>
          <strong>{nazovDomacich(z)}</strong>
          <small>Domáci</small>
        </span>
        <span className="pz-tabula__stred">
          {skore ? (
            <em className="pz-tabula__skore">
              <span>{z.goly_domaci}</span>
              <i>:</i>
              <span>{z.goly_hostia}</span>
            </em>
          ) : (
            <em className="pz-tabula__cas">{cas(z.datum_cas)}</em>
          )}
          <small>
            {denVTyzdni(z.datum_cas)} {datumKratky(z.datum_cas)}
            {z.miesto ? ` · ${z.miesto}` : ''}
          </small>
        </span>
        <span className="pz-tabula__tim">
          <span className="pz-tabula__erb">
            <ErbStrany zapas={z} strana="hostia" velky />
          </span>
          <strong>{nazovHosti(z)}</strong>
          <small>Hostia</small>
        </span>
      </h1>
      {odpocet && <Odpocet odpocet={odpocet} />}
      <div className="pz-tabula__akcie">
        {stav === 'naplanovany' && vstupenky && (
          <Odkaz to={vstupenky} className="pz-tlacidlo pz-tlacidlo--neon">
            {u.text('vstupenky_text', 'Vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className="pz-tlacidlo pz-tlacidlo--sklo">
          {u.text('text_detail', 'Detail zápasu')}
        </Link>
      </div>
    </div>
  );
};

/** Bez zápasu: hlavná správa priamo v ráme tabule. */
const TabulaSpravy: React.FC<{ clanok: Clanok | null }> = ({ clanok: c }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  if (!c) return <h1 className="pz-tabula__titulok">{nastavenia.slogan || nastavenia.nazov}</h1>;
  return (
    <div className="pz-tabula__sprava">
      <span className="pz-tabula__stav">
        <i aria-hidden="true" />
        {c.kategoria?.nazov || 'Správy'}
      </span>
      <h1 className="pz-tabula__titulok">
        <Link to={`/clanek/${c.slug}`}>{c.nazov}</Link>
      </h1>
      <Link to={`/clanek/${c.slug}`} className="pz-sipkovy pz-sipkovy--svetly">
        <span>{u.text('hero_tlacidlo', 'Čítať článok')}</span>
        <i aria-hidden="true">
          <Ikona nazov="sipka" velkost={14} />
        </i>
      </Link>
    </div>
  );
};

const Hero: React.FC<{ clanky: Clanok[]; zapas: Zapas | null; vstupenky: string | null; fotka: string | null }> = ({ clanky, zapas, vstupenky, fotka }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const obrys = u.text('hero_obrys', '') || nastavenia.skratka || nastavenia.nazov;
  // Bez zápasu je prvá správa v ráme tabule, ostatné pod ním
  const spravy = zapas ? clanky : clanky.slice(1);
  const pozadie = obrazokUrl(fotka) || (!zapas ? obrazokUrl(clanky[0]?.obrazok) : null);
  return (
    <section className={`pz-tabula${spravy.length ? ' pz-tabula--so-spravami' : ''}`} aria-label={zapas ? 'Zápas a hlavné správy' : 'Hlavné správy'}>
      <div className={`pz-tabula__ram${zapas ? '' : ' pz-tabula__ram--sprava'}`}>
        {pozadie && (
          <span className="pz-tabula__fotka" aria-hidden="true">
            <img src={pozadie} alt="" onError={skryObrazok} />
          </span>
        )}
        <span className="pz-tabula__mriezka" aria-hidden="true" />
        <span className="pz-tabula__obrys" aria-hidden="true">
          {obrys}
        </span>
        <div className="pz-tabula__obsah">{zapas ? <TabulaZapasu zapas={zapas} vstupenky={vstupenky} /> : <TabulaSpravy clanok={clanky[0] ?? null} />}</div>
      </div>
      {spravy.length > 0 && (
        <div className="pz-tabula__spravy">
          {spravy.map((c, i) => (
            <Link key={c.id} to={`/clanek/${c.slug}`} className="pz-tabula__karta" style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
              <span className="pz-tabula__nahlad">
                {obrazokUrl(c.obrazok) || obrazokUrl(fotka) ? <img src={(obrazokUrl(c.obrazok) || obrazokUrl(fotka))!} alt="" loading="lazy" onError={skryObrazok} /> : null}
              </span>
              <span className="pz-tabula__text">
                <small>
                  {c.kategoria?.nazov || 'Správy'} · {datumKratky(c.publikovany_datum || c.vytvoreny)}
                </small>
                <strong>{c.nazov}</strong>
              </span>
            </Link>
          ))}
        </div>
      )}
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
      <Link key={kluc} to={`/matches/${z.id}`} className="pz-pas__polozka">
        <small>{skore ? `${datumKratky(z.datum_cas)} · koniec` : `${denVTyzdni(z.datum_cas)} ${datumKratky(z.datum_cas)} · ${cas(z.datum_cas)}`}</small>
        <span>
          {nazovDomacich(z)} <b>{skore ? `${z.goly_domaci}:${z.goly_hostia}` : 'vs'}</b> {nazovHosti(z)}
        </span>
        <i aria-hidden="true">✦</i>
      </Link>
    );
  });
  return (
    <div className="pz-pas" aria-label="Výsledky a program">
      <div className="pz-pas__vnutro">
        <div className="pz-pas__rad">{polozky}</div>
        <div className="pz-pas__rad" aria-hidden="true">
          {polozky}
        </div>
      </div>
    </div>
  );
};

// ===== 3. Novinky =====

const Novinky: React.FC<{ clanky: Clanok[] }> = ({ clanky }) => {
  const u = useUpravy();
  if (clanky.length === 0) return null;
  const [hlavna, ...dalsie] = clanky;
  return (
    <section className="pz-u-sekcia" aria-labelledby="pz-u-novinky">
      <div className="pz-kontajner">
        <HlavaSekcie stitok={u.text('novinky_stitok', 'Najnovšie')} nadpis={u.text('novinky_nadpis', 'Novinky')} odkaz="/clanky" textOdkazu="Všetky novinky" id="pz-u-novinky" />
        <div className={`pz-novinky${dalsie.length ? '' : ' pz-novinky--jedna'}`}>
          <Link to={`/clanek/${hlavna.slug}`} className="pz-novinky__hlavna">
            <Obrazok src={hlavna.obrazok} className="pz-novinky__obrazok" />
            <span className="pz-novinky__text">
              <span className="pz-novinky__meta">
                <b>{hlavna.kategoria?.nazov || 'Správy'}</b>
                {datum(hlavna.publikovany_datum || hlavna.vytvoreny)}
              </span>
              <strong>{hlavna.nazov}</strong>
              {hlavna.excerpt && <small>{hlavna.excerpt}</small>}
            </span>
          </Link>
          {dalsie.length > 0 && (
            <ol className="pz-novinky__zoznam">
              {dalsie.slice(0, 5).map((c, i) => (
                <li key={c.id}>
                  <Link to={`/clanek/${c.slug}`} className="pz-novinky__polozka">
                    <span className="pz-novinky__poradie" aria-hidden="true">
                      {String(i + 2).padStart(2, '0')}
                    </span>
                    <span className="pz-novinky__ptext">
                      <span className="pz-novinky__meta">
                        <b>{c.kategoria?.nazov || 'Správy'}</b>
                        {datumKratky(c.publikovany_datum || c.vytvoreny)}
                      </span>
                      <strong>{c.nazov}</strong>
                    </span>
                    <Obrazok src={c.obrazok} className="pz-novinky__nahlad" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
};

// ===== 4. Zápasy =====

/** Odohraný zápas ako malá výsledková tabuľa. */
const MiniTabula: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const v = vysledokKlubu(z);
  return (
    <Link to={`/matches/${z.id}`} className={`pz-mtabula${v ? ` is-${v.toLowerCase()}` : ''}`}>
      <span className="pz-mtabula__hlava">
        <span>{datumKratky(z.datum_cas)}</span>
        <span>{sutazZapasu(z) || 'Zápas'}</span>
      </span>
      <span className="pz-mtabula__duel">
        <span className="pz-mtabula__tim">
          <ErbStrany zapas={z} strana="domaci" />
          <strong>{nazovDomacich(z)}</strong>
        </span>
        <span className="pz-mtabula__skore">
          <b>{z.goly_domaci}</b>
          <i>:</i>
          <b>{z.goly_hostia}</b>
        </span>
        <span className="pz-mtabula__tim">
          <ErbStrany zapas={z} strana="hostia" />
          <strong>{nazovHosti(z)}</strong>
        </span>
      </span>
      {v && <span className="pz-mtabula__vysledok">{v === 'V' ? 'Výhra' : v === 'R' ? 'Remíza' : 'Prehra'}</span>}
    </Link>
  );
};

/** Budúci zápas ako vstupenka - dátum na odtrhávacom kupóne. */
const Vstupenka: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => (
  <Link to={`/matches/${z.id}`} className="pz-vstupenka">
    <span className="pz-vstupenka__kupon">
      <small>{denVTyzdni(z.datum_cas)}</small>
      <strong>{datumKratky(z.datum_cas)}</strong>
      <b>{cas(z.datum_cas)}</b>
    </span>
    <span className="pz-vstupenka__telo">
      <span className="pz-vstupenka__sutaz">{sutazZapasu(z) || 'Zápas'}</span>
      <span className="pz-vstupenka__duel">
        <span className="pz-vstupenka__tim">
          <ErbStrany zapas={z} strana="domaci" />
          <strong>{nazovDomacich(z)}</strong>
        </span>
        <i>vs</i>
        <span className="pz-vstupenka__tim">
          <ErbStrany zapas={z} strana="hostia" />
          <strong>{nazovHosti(z)}</strong>
        </span>
      </span>
    </span>
    <i className="pz-vstupenka__sipka" aria-hidden="true">
      <Ikona nazov="sipka" velkost={15} />
    </i>
  </Link>
);

const Zapasy: React.FC<{ tim: Tim; minule: Zapas[]; dalsie: Zapas[]; riadok: RiadokTabulky | null; liga: Liga | null }> = ({ tim, minule, dalsie, riadok, liga }) => {
  const u = useUpravy();
  if (minule.length === 0 && dalsie.length === 0) return null;
  return (
    <section className="pz-u-sekcia pz-zapasy-u" aria-labelledby="pz-u-zapasy">
      <div className="pz-kontajner">
        <HlavaSekcie stitok={tim.nazov} nadpis={u.text('zapasy_nadpis', 'Zápasy')} odkaz="/matches" textOdkazu="Celý program" id="pz-u-zapasy">
          {riadok && liga && (
            <Link to={`/leagues/${liga.id}`} className="pz-zapasy-u__pozicia" title={liga.nazov}>
              <strong>{riadok.pozicia}.</strong>
              <span>
                miesto
                <small>{riadok.body} bodov</small>
              </span>
            </Link>
          )}
        </HlavaSekcie>
        <div className={`pz-zapasy-u__stlpce${minule.length && dalsie.length ? '' : ' pz-zapasy-u__stlpce--jeden'}`}>
          {minule.length > 0 && (
            <div className="pz-zapasy-u__stlpec">
              <span className="pz-zapasy-u__skupina">Posledné výsledky</span>
              {minule.map((z) => (
                <MiniTabula key={z.id} zapas={z} />
              ))}
            </div>
          )}
          {dalsie.length > 0 && (
            <div className="pz-zapasy-u__stlpec">
              <span className="pz-zapasy-u__skupina">Program</span>
              {dalsie.map((z) => (
                <Vstupenka key={z.id} zapas={z} />
              ))}
            </div>
          )}
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
    <section className="pz-kontajner pz-cisla" aria-labelledby="pz-u-cisla">
      <div className="pz-cisla__hlava">
        <span className="pz-stitok">{tim.nazov}</span>
        <h2 id="pz-u-cisla">{u.text('sezona_nadpis', 'Sezóna v číslach')}</h2>
        <div className="pz-cisla__forma">
          <span>Forma</span>
          {data.forma.map((z) => {
            const x = vysledokKlubu(z)!;
            return (
              <Link key={z.id} to={`/matches/${z.id}`} className={`pz-forma__znak is-${x.toLowerCase()}`} title={`${nazovDomacich(z)} ${z.goly_domaci}:${z.goly_hostia} ${nazovHosti(z)}`}>
                {x}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="pz-cisla__kruh" style={{ '--podiel': `${Math.round((data.V / data.pocet) * 100)}%` } as React.CSSProperties} role="img" aria-label={`Úspešnosť ${Math.round((data.V / data.pocet) * 100)} %`}>
        <strong>{Math.round((data.V / data.pocet) * 100)}%</strong>
        <small>výhier</small>
      </div>
      <dl className="pz-cisla__mriezka">
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
    <section className="pz-u-sekcia" aria-labelledby="pz-u-kader">
      <div className="pz-kontajner">
        <HlavaSekcie stitok={tim.nazov} nadpis={u.text('hraci_nadpis', 'Káder')} odkaz={`/teams/${tim.id}`} textOdkazu="Celý káder" id="pz-u-kader">
          {sipky}
        </HlavaSekcie>
      </div>
      <div className="pz-karusel pz-karusel--hraci" ref={pas}>
        {vsetci.map((h) => {
          const fotka = obrazokUrl(h.fotka);
          return (
            <Link key={h.id} to={`/players/${h.id}`} className="pz-hkarta">
              {h.cislo_dresu !== null && h.cislo_dresu !== undefined && (
                <span className="pz-hkarta__cislo" aria-hidden="true">
                  {h.cislo_dresu}
                </span>
              )}
              <span className="pz-hkarta__foto">{fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="pz-hrac__silueta" aria-hidden="true" />}</span>
              <span className="pz-hkarta__text">
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
    <section className="pz-u-sekcia" aria-labelledby="pz-u-media">
      <div className="pz-kontajner">
        <HlavaSekcie stitok={u.text('media_stitok', 'Médiá')} nadpis={u.text('media_nadpis', 'Za kulisami')} odkaz="/videa" textOdkazu="Klub TV" id="pz-u-media" />
        <div className={`pz-media${video ? '' : ' pz-media--bez-videa'}`}>
          {video && (
            <a href={video.url} target="_blank" rel="noopener noreferrer" className="pz-media__video" onClick={prehraj(video)}>
              <Obrazok src={video.nahlad_url || video.nahlad} className="pz-media__obrazok" />
              <span className="pz-media__play" aria-hidden="true">
                <Ikona nazov="play" velkost={26} />
              </span>
              <span className="pz-media__popis">
                <span className="pz-hero__stitok">{u.text('videa_nadpis', 'Klub TV')}</span>
                <strong>{video.nazov}</strong>
                {dlzkaVidea(video.dlzka) && <small>{dlzkaVidea(video.dlzka)}</small>}
              </span>
            </a>
          )}
          <div className="pz-media__bok">
            {galeria && (
              <Link to={`/galleries/${galeria.id}`} className="pz-media__galeria">
                <span className="pz-media__fotky">
                  {fotky.map((f) => (
                    <img key={f.id} src={souborUrl(f.url_stredny || f.url_original || '')} alt="" loading="lazy" onError={skryObrazok} />
                  ))}
                </span>
                <span className="pz-media__gtext">
                  <small>Fotogaléria · {galeria.pocet_obrazkov} fotiek</small>
                  <strong>{galeria.nazov}</strong>
                </span>
              </Link>
            )}
            {shop && (
              <div className="pz-media__shop">
                <div className="pz-media__shop-hlava">
                  <strong>{u.text('fanshop_nadpis', 'Fanshop')}</strong>
                  {obchod && (
                    <Odkaz to={obchod} className="pz-sipkovy pz-sipkovy--maly">
                      <span>{u.text('fanshop_tlacidlo', 'Do obchodu')}</span>
                      <i aria-hidden="true">
                        <Ikona nazov="sipka" velkost={12} />
                      </i>
                    </Odkaz>
                  )}
                </div>
                <div className="pz-media__produkty">
                  {produkty.slice(0, 3).map((p) =>
                    p.odkaz ? (
                      <Odkaz key={p.kluc} to={p.odkaz} className="pz-media__produkt" ariaLabel={p.nazov}>
                        <Obrazok src={p.obrazok} className="pz-media__pobrazok" alt={p.nazov} />
                        {p.cena && <span>{p.cena}</span>}
                      </Odkaz>
                    ) : (
                      <div key={p.kluc} className="pz-media__produkt">
                        <Obrazok src={p.obrazok} className="pz-media__pobrazok" alt={p.nazov} />
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
    <section className="pz-kontajner pz-vyzva" aria-label="Členstvo">
      <div className="pz-vyzva__text">
        <span className="pz-stitok">{u.text('vyzva_stitok', 'Členstvo')}</span>
        <h2>{u.text('vyzva_nadpis', 'Buď súčasťou {klub}')}</h2>
        <p>{u.text('vyzva_text', 'Pozvánky na zápasy, novinky a akcie klubu ako prví. Registrácia je zadarmo.')}</p>
      </div>
      <Odkaz to={String(s.vyzva_odkaz || '').trim() || '/registracia'} className="pz-vyzva__tlacidlo">
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
    <div className="pz-uvod">
      {u.zapnute('ukazat_clanky') && <Hero clanky={hero} zapas={u.zapnute('ukazat_zapas_hero') ? najblizsi ?? minule[minule.length - 1] ?? null : null} vstupenky={vstupenky} fotka={(s.uvod_fotka as string | null) || null} />}
      <Sekcie p="po_hero" />
      {u.zapnute('ukazat_pas') && <Pas zapasy={[...minule.slice(-3), ...(zive.data ?? []), ...dalsie]} />}
      <Sekcie p="po_pase" />
      {u.zapnute('ukazat_novinky') && <Novinky clanky={novinky} />}
      <Sekcie p="po_novinkach" />
      {u.zapnute('ukazat_zapasy') && hlavny && <Zapasy tim={hlavny} minule={minule.slice(-2).reverse()} dalsie={dalsie.slice(0, 3)} riadok={riadok} liga={liga} />}
      <Sekcie p="po_zapasoch" />
      {u.zapnute('ukazat_sezonu') && hlavny && <Sezona tim={hlavny} />}
      <Sekcie p="po_sezone" />
      {u.zapnute('ukazat_hracov') && timHracov && <Kader tim={timHracov} />}
      <Sekcie p="po_kadri" />
      <Media s={s} videa={videa.data ?? []} />
      <Sekcie p="po_mediach" />
      {u.zapnute('ukazat_vyzvu') && <Vyzva s={s} />}
      <Sekcie p="koniec" />
    </div>
  );
};

export default Uvod;
