// Umiestnenie: sablony/kronika/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Kronika - titulná strana športového magazínu.
//
// Navrchu výsledková lišta (posledné výsledky a najbližšie zápasy), pod
// ňou titulný článok s veľkým serifovým nadpisom, dva ďalšie články
// a bočný stĺpec „Najnovšie" s najbližším zápasom. Nasleduje zápasový
// prehľad (program, výsledky, tabuľka), káder, tmavá sekcia videí,
// fanshop, klub v číslach so sieťami a partneri. Sekcie bez obsahu
// sa neukážu.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, useNastavenia, useNastaveniaSablony, type ProduktObchodu } from '@clubw/jadro';
import { Sekcie } from '../bloky';
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

/** Hlavička sekcie: hrubá linka, serifový nadpis a odkaz vpravo. */
const HlavaSekcie: React.FC<{ nadpis: string; odkaz?: string | null; textOdkazu?: string; id: string; children?: React.ReactNode }> = ({
  nadpis,
  odkaz,
  textOdkazu,
  id,
  children,
}) => {
  const u = useUpravy();
  return (
    <div className="kr-sekcia-hlava">
      <h2 id={id}>{nadpis}</h2>
      {children}
      {odkaz && (
        <Odkaz to={odkaz} className="kr-sekcia-hlava__odkaz">
          {textOdkazu || u.text('text_zobrazit_vsetky', 'Zobraziť všetky')}
          <Ikona nazov="sipka" velkost={14} />
        </Odkaz>
      )}
    </div>
  );
};

/** Rubrika a dátum článku. */
const Meta: React.FC<{ clanok: Clanok; autor?: boolean }> = ({ clanok: c, autor = false }) => (
  <span className="kr-u-meta">
    {c.kategoria && <b>{c.kategoria.nazov}</b>}
    <span>{datum(c.publikovany_datum || c.vytvoreny)}</span>
    {autor && c.autor?.meno && <span>{c.autor.meno}</span>}
  </span>
);

// ===== Výsledková lišta =====

const Skore: React.FC<{ zapasy: Zapas[] }> = ({ zapasy }) => {
  const { nastavenia } = useNastavenia();
  if (zapasy.length === 0) return null;
  return (
    <div className="kr-u-skore" aria-label="Zápasy">
      <div className="kr-kontajner kr-u-skore__vnutro">
        <Link to="/matches" className="kr-u-skore__nadpis">
          Zápasy
          <Ikona nazov="sipka" velkost={12} />
        </Link>
        <div className="kr-u-skore__pas">
          {zapasy.map((z) => {
            const stav = stavZapasu(z);
            const skore = maVysledok(z) && stav !== 'naplanovany';
            return (
              <Link key={z.id} to={`/matches/${z.id}`} className={`kr-u-skore__zapas${stav === 'prebieha' ? ' is-zivy' : ''}`}>
                <span className="kr-u-skore__kedy">{stav === 'prebieha' ? 'Live' : skore ? `Koniec · ${datumKratky(z.datum_cas)}` : `${datumKratky(z.datum_cas)} · ${cas(z.datum_cas)}`}</span>
                {(['domaci', 'hostia'] as const).map((strana) => (
                  <span key={strana} className="kr-u-skore__tim">
                    <Erb nazov={strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} />
                    <span className="kr-u-skore__nazov">{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</span>
                    {skore && <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>}
                  </span>
                ))}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ===== Titulná strana =====

const NajblizsiZapas: React.FC<{ zapas: Zapas; vstupenky: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const stav = stavZapasu(z);
  const skore = maVysledok(z) && stav !== 'naplanovany';
  return (
    <div className="kr-u-zapas">
      <span className="kr-stitok">{stav === 'prebieha' ? 'Práve sa hrá' : 'Najbližší zápas'}</span>
      {sutazZapasu(z) && <span className="kr-u-zapas__sutaz">{sutazZapasu(z)}</span>}
      <div className="kr-u-zapas__timy">
        <span>
          <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} velky />
          <strong>{nazovDomacich(z)}</strong>
        </span>
        <em>{skore ? `${z.goly_domaci}:${z.goly_hostia}` : 'vs.'}</em>
        <span>
          <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} ton="akcent" velky />
          <strong>{nazovHosti(z)}</strong>
        </span>
      </div>
      <dl className="kr-u-zapas__udaje">
        <div>
          <dt>Dátum</dt>
          <dd>
            {denVTyzdni(z.datum_cas)} {datumKratky(z.datum_cas)}
          </dd>
        </div>
        <div>
          <dt>Výkop</dt>
          <dd>{cas(z.datum_cas)}</dd>
        </div>
        {z.miesto && (
          <div>
            <dt>Miesto</dt>
            <dd>{z.miesto}</dd>
          </div>
        )}
      </dl>
      <div className="kr-u-zapas__akcie">
        {stav === 'naplanovany' && vstupenky && (
          <Odkaz to={vstupenky} className="kr-tlacidlo kr-tlacidlo--akcent">
            {u.text('vstupenky_text', 'Vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className="kr-tlacidlo kr-tlacidlo--obrys">
          {u.text('text_detail', 'Detail zápasu')}
        </Link>
      </div>
    </div>
  );
};

const Titulka: React.FC<{ hlavny: Clanok | null; dalsie: Clanok[]; najnovsie: Clanok[]; zapas: Zapas | null; vstupenky: string | null; nacitava: boolean; nahradnaFotka: string | null }> = ({
  hlavny,
  dalsie,
  najnovsie,
  zapas,
  vstupenky,
  nacitava,
  nahradnaFotka,
}) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  if (!hlavny) {
    return (
      <section className="kr-kontajner kr-u-titul kr-u-titul--prazdny" aria-busy={nacitava}>
        <h1 className="kr-u-titul__nadpis">{nacitava ? ' ' : nastavenia.slogan || nastavenia.nazov}</h1>
      </section>
    );
  }
  return (
    <section className="kr-kontajner kr-u-titul" aria-label="Titulná strana">
      <div className="kr-u-titul__hlavny">
        <Link to={`/clanek/${hlavny.slug}`} className="kr-u-hlavny">
          <span className="kr-u-hlavny__obrazok kr-obrazok">
            {obrazokUrl(hlavny.obrazok) || obrazokUrl(nahradnaFotka) ? <img src={obrazokUrl(hlavny.obrazok) || obrazokUrl(nahradnaFotka) || ''} alt="" onError={skryObrazok} /> : null}
          </span>
          <span className="kr-u-hlavny__text">
            <span className="kr-u-hlavny__stitok">{String(u.s.uvod_stitok || '').trim() || hlavny.kategoria?.nazov || 'Hlavná správa'}</span>
            <h1 className="kr-u-titul__nadpis">{hlavny.nazov}</h1>
            {hlavny.excerpt && <p className="kr-u-hlavny__perex">{hlavny.excerpt}</p>}
            <Meta clanok={hlavny} autor />
          </span>
        </Link>
        {dalsie.length > 0 && (
          <div className="kr-u-dalsie">
            {dalsie.map((c) => (
              <Link key={c.id} to={`/clanek/${c.slug}`} className="kr-u-clanok">
                <Obrazok src={c.obrazok} className="kr-u-clanok__obrazok" />
                <Meta clanok={c} />
                <h3>{c.nazov}</h3>
                {c.excerpt && <p>{c.excerpt}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
      <aside className="kr-u-titul__bok" aria-label="Najnovšie">
        {najnovsie.length > 0 && (
          <div className="kr-u-najnovsie">
            <div className="kr-u-bok-hlava">
              <h2>{u.text('najnovsie_nadpis', 'Najnovšie')}</h2>
              <Link to="/clanky">Všetky</Link>
            </div>
            <ol>
              {najnovsie.map((c) => (
                <li key={c.id}>
                  <Link to={`/clanek/${c.slug}`}>
                    <Meta clanok={c} />
                    <strong>{c.nazov}</strong>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
        {zapas && u.zapnute('ukazat_zapasy') && <NajblizsiZapas zapas={zapas} vstupenky={vstupenky} />}
      </aside>
    </section>
  );
};

// ===== Zápasy a tabuľka =====

const RiadokZapasu: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const { nastavenia } = useNastavenia();
  const skore = maVysledok(z) && stavZapasu(z) !== 'naplanovany';
  const v = vysledokKlubu(z);
  return (
    <Link to={`/matches/${z.id}`} className="kr-u-riadok">
      <span className="kr-u-riadok__datum">
        <strong>{datumKratky(z.datum_cas)}</strong>
        <small>{skore ? 'Koniec' : cas(z.datum_cas)}</small>
      </span>
      <span className="kr-u-riadok__timy">
        {(['domaci', 'hostia'] as const).map((strana) => (
          <span key={strana}>
            <Erb nazov={strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} />
            <span className="kr-u-riadok__nazov">{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</span>
            {skore && <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>}
          </span>
        ))}
      </span>
      {v && <span className={`kr-u-riadok__vysledok is-${v.toLowerCase()}`}>{v}</span>}
    </Link>
  );
};

const PrehladZapasov: React.FC<{
  timy: Tim[];
  timId: number | null;
  setTimId: (id: number) => void;
  program: Zapas[];
  vysledky: Zapas[];
  tabulka: { liga: Liga; riadky: RiadokTabulky[] } | null;
  nacitava: boolean;
}> = ({ timy, timId, setTimId, program, vysledky, tabulka, nacitava }) => {
  const u = useUpravy();
  const vyrez = tabulka ? vyrezTabulky(tabulka.riadky, timId, 7) : [];
  return (
    <section className="kr-kontajner kr-u-sekcia kr-u-zapasy" aria-labelledby="kr-u-zapasy">
      <HlavaSekcie nadpis={u.text('zapasy_nadpis', 'Zápasy a tabuľka')} odkaz="/matches" textOdkazu="Všetky zápasy" id="kr-u-zapasy">
        {timy.length > 1 && (
          <div className="kr-u-timy" role="tablist" aria-label="Tím">
            {timy.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === timId} className={t.id === timId ? 'is-aktivny' : ''} onClick={() => setTimId(t.id)}>
                {t.nazov}
              </button>
            ))}
          </div>
        )}
      </HlavaSekcie>
      <div className={`kr-u-zapasy__stlpce${vyrez.length ? '' : ' kr-u-zapasy__stlpce--2'}`}>
        <div className="kr-u-stlpec">
          <h3>Program</h3>
          {program.length ? program.slice(0, 4).map((z) => <RiadokZapasu key={z.id} zapas={z} />) : <p className="kr-u-prazdne">{nacitava ? 'Načítavam…' : 'Žiadne naplánované zápasy.'}</p>}
        </div>
        <div className="kr-u-stlpec">
          <h3>Výsledky</h3>
          {vysledky.length ? vysledky.slice(0, 4).map((z) => <RiadokZapasu key={z.id} zapas={z} />) : <p className="kr-u-prazdne">{nacitava ? 'Načítavam…' : 'Zatiaľ bez výsledkov.'}</p>}
        </div>
        {tabulka && vyrez.length > 0 && (
          <div className="kr-u-stlpec kr-u-tabulka">
            <h3>
              <Link to={`/leagues/${tabulka.liga.id}`}>{tabulka.liga.nazov}</Link>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="kr-u-tabulka__tim">Tím</th>
                  <th>Z</th>
                  <th>Skóre</th>
                  <th>B</th>
                </tr>
              </thead>
              <tbody>
                {vyrez.map((r) => (
                  <tr key={r.id} className={r.tim_id === timId ? 'is-nas' : ''}>
                    <td>{r.pozicia}</td>
                    <td className="kr-u-tabulka__tim">
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
        )}
      </div>
    </section>
  );
};

// ===== Káder =====

const Kader: React.FC<{ tim: Tim; nadpis: string }> = ({ tim, nadpis }) => {
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
        .slice(0, 5),
    [hraci.data, podlaId]
  );
  if (vybrani.length === 0) return null;
  return (
    <section className="kr-kontajner kr-u-sekcia" aria-labelledby="kr-u-kader">
      <HlavaSekcie nadpis={nadpis} odkaz={`/teams/${tim.id}`} textOdkazu="Celý káder" id="kr-u-kader" />
      <div className="kr-u-kader">
        {vybrani.map((h) => {
          const fotka = obrazokUrl(h.fotka);
          const st = podlaId.get(h.id);
          return (
            <Link key={h.id} to={`/players/${h.id}`} className="kr-u-hrac">
              <span className="kr-u-hrac__foto">
                {fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span className="kr-hrac__silueta" aria-hidden="true" />}
              </span>
              <span className="kr-u-hrac__text">
                {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <span className="kr-u-hrac__cislo">{h.cislo_dresu}</span>}
                <span>
                  <strong>
                    {h.meno} {h.priezvisko}
                  </strong>
                  <small>
                    {pozicia(h.pozicia)}
                    {st ? ` · ${st.zapasy} záp. · ${st.goly} gólov` : ''}
                  </small>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

// ===== Videá =====

const Videa: React.FC<{ videa: Video[] }> = ({ videa }) => {
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
    <section className="kr-u-videa" aria-labelledby="kr-u-videa">
      <div className="kr-kontajner">
        <HlavaSekcie nadpis={u.text('videa_nadpis', 'Videá')} odkaz="/videa" id="kr-u-videa" />
        <div className={`kr-u-videa__mriezka${ostatne.length ? '' : ' kr-u-videa__mriezka--1'}`}>
          <a href={hlavne.url} target="_blank" rel="noopener noreferrer" className="kr-u-video kr-u-video--hlavne" onClick={prehraj(hlavne)}>
            <span className="kr-u-video__nahlad">
              <Obrazok src={hlavne.nahlad_url || hlavne.nahlad} className="kr-u-video__obrazok" />
              <span className="kr-u-video__play" aria-hidden="true">
                <Ikona nazov="play" velkost={26} />
              </span>
              {dlzkaVidea(hlavne.dlzka) && <span className="kr-u-video__dlzka">{dlzkaVidea(hlavne.dlzka)}</span>}
            </span>
            <strong>{hlavne.nazov}</strong>
          </a>
          {ostatne.length > 0 && (
            <div className="kr-u-videa__zoznam">
              {ostatne.map((v) => (
                <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="kr-u-video" onClick={prehraj(v)}>
                  <span className="kr-u-video__nahlad">
                    <Obrazok src={v.nahlad_url || v.nahlad} className="kr-u-video__obrazok" />
                    <span className="kr-u-video__play" aria-hidden="true">
                      <Ikona nazov="play" velkost={16} />
                    </span>
                  </span>
                  <span>
                    <strong>{v.nazov}</strong>
                    {dlzkaVidea(v.dlzka) && <small>{dlzkaVidea(v.dlzka)}</small>}
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
    <section className="kr-kontajner kr-u-sekcia" aria-labelledby="kr-u-fanshop">
      <HlavaSekcie nadpis={u.text('fanshop_nadpis', 'Fanshop')} odkaz={obchod} textOdkazu={u.text('fanshop_tlacidlo', 'Do obchodu')} id="kr-u-fanshop" />
      <div className="kr-u-produkty">
        {produkty.map((p) => {
          const obsah = (
            <>
              <Obrazok src={p.obrazok} className="kr-u-produkt__obrazok" alt={p.nazov} />
              <span className="kr-u-produkt__text">
                {p.nazov && <strong>{p.nazov}</strong>}
                {p.cena && <span>{p.cena}</span>}
              </span>
            </>
          );
          return p.odkaz ? (
            <Odkaz key={p.kluc} to={p.odkaz} className="kr-u-produkt">
              {obsah}
            </Odkaz>
          ) : (
            <div key={p.kluc} className="kr-u-produkt">
              {obsah}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ===== Klub v číslach, siete, výzva =====

const citajUspechy = (text: unknown) =>
  String(text || '')
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const m = /^(\d+)\s*(?:[×x*|:-]\s*)?(.+)$/i.exec(r);
      return m ? { pocet: m[1], nazov: m[2].trim() } : { pocet: '', nazov: r };
    });

const Klub: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  const siete = useSiete();
  const uspechy = citajUspechy(s.uspechy).slice(0, 4);
  const ukazatSiete = u.zapnute('ukazat_siete') && siete.length > 0;
  const vyzva = u.zapnute('ukazat_vyzvu');
  if (uspechy.length === 0 && !ukazatSiete && !vyzva) return null;
  return (
    <section className="kr-kontajner kr-u-sekcia" aria-label="Klub">
      <div className="kr-u-klub">
        {uspechy.length > 0 && (
          <div className="kr-u-klub__stlpec">
            <h3>{u.text('uspechy_nadpis', 'Klub v číslach')}</h3>
            <ul className="kr-u-uspechy">
              {uspechy.map((x, i) => (
                <li key={i}>
                  {x.pocet && <strong>{x.pocet}</strong>}
                  <span>{x.nazov}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {ukazatSiete && (
          <div className="kr-u-klub__stlpec">
            <h3>{u.text('siete_nadpis', 'Sledujte nás')}</h3>
            <ul className="kr-u-siete">
              {siete.map((x) => {
                const pocet = String(s[`sledujuci_${x.kluc}`] || '').trim();
                return (
                  <li key={x.kluc}>
                    <a href={x.url} target="_blank" rel="noopener noreferrer">
                      <span>{x.nazov}</span>
                      {pocet && <small>{pocet} sledujúcich</small>}
                      <Ikona nazov="odkaz" velkost={14} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {vyzva && (
          <div className="kr-u-klub__stlpec kr-u-vyzva">
            <span className="kr-stitok">{u.text('vyzva_stitok', 'Pridajte sa')}</span>
            <strong>{u.text('vyzva_nadpis', 'Staňte sa súčasťou {klub}')}</strong>
            <p>{u.text('vyzva_text', 'Fanúšikovia a členovia dostávajú pozvánky na zápasy a novinky klubu ako prví.')}</p>
            <Odkaz to={String(s.vyzva_odkaz || '').trim() || '/registracia'} className="kr-tlacidlo kr-tlacidlo--akcent">
              {u.text('vyzva_tlacidlo', 'Registrácia')}
            </Odkaz>
          </div>
        )}
      </div>
    </section>
  );
};

// ===== Partneri =====

const Partneri: React.FC<{ partneri: Partner[] }> = ({ partneri }) => {
  const u = useUpravy();
  if (partneri.length === 0) return null;
  return (
    <section className="kr-kontajner kr-u-sekcia kr-u-partneri" aria-labelledby="kr-u-partneri">
      <HlavaSekcie nadpis={u.text('partneri_nadpis', 'Partneri klubu')} odkaz="/sponzori" textOdkazu={u.text('text_vsetci_partneri', 'Všetci partneri')} id="kr-u-partneri" />
      <div className="kr-u-partneri__rad">
        {partneri.slice(0, 12).map((p) => {
          const logo = obrazokUrl(p.logo);
          const obsah = logo ? <img src={logo} alt={p.nazov} loading="lazy" onError={skryObrazok} /> : <span>{p.nazov}</span>;
          return p.web_url ? (
            <a key={p.id} href={p.web_url} target="_blank" rel="noopener noreferrer" className="kr-u-partner" title={p.nazov}>
              {obsah}
            </a>
          ) : (
            <span key={p.id} className="kr-u-partner" title={p.nazov}>
              {obsah}
            </span>
          );
        })}
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

  const zvyraznene = useApi<Clanok[]>('/articles?featured=true&limit=1');
  const clanky = useApi<Clanok[]>('/articles?limit=12');
  const timy = useApi<Tim[]>('/teams');
  const ligy = useApi<Liga[]>('/leagues');
  const videa = useApi<Video[]>(u.zapnute('ukazat_videa') ? '/videos?limit=4' : null);
  const partneri = useApi<Partner[]>(u.zapnute('ukazat_partnerov_uvod') ? '/sponsors' : null);

  const zoradeneTimy = useMemo(() => [...(timy.data ?? [])].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id), [timy.data]);
  const timyAB = zoradeneTimy.filter((t) => t.typ === 'muzi' && jeSeniorska(t.vekova_kategoria));
  const timyZapasov = (timyAB.length > 0 ? timyAB : zoradeneTimy).slice(0, obmedz(s.zapasy_timov, 1, 4, 2));
  const [timId, setTimId] = useState<number | null>(null);
  const tid = (timyZapasov.find((t) => t.id === timId) ?? timyZapasov[0])?.id ?? null;
  const prvyTim = timyZapasov[0]?.id ?? null;
  const timHracov = vyberTim(zoradeneTimy, s.hraci_tim);

  // Zápasy vybraného tímu (prehľad) a hlavného tímu (lišta, najbližší zápas)
  const vysledky = useApi<Zapas[]>(tid ? `/matches?tim_id=${tid}&status=ukonceny&limit=4` : null);
  const buduce = useApi<Zapas[]>(tid ? `/matches?tim_id=${tid}&status=naplanovany&od_datumu=${dnes()}&poradie=asc&limit=10` : null);
  const zive = useApi<Zapas[]>(prvyTim ? `/matches?tim_id=${prvyTim}&status=prebieha&limit=2` : null);
  const listaVysledky = useApi<Zapas[]>(prvyTim ? `/matches?tim_id=${prvyTim}&status=ukonceny&limit=3` : null);
  const listaBuduce = useApi<Zapas[]>(prvyTim ? `/matches?tim_id=${prvyTim}&status=naplanovany&od_datumu=${dnes()}&poradie=asc&limit=4` : null);
  const nacitavaZapasy = timy.nacitava || vysledky.nacitava || buduce.nacitava;

  const program = useMemo(() => [...(buduce.data ?? [])].sort(podlaCasu), [buduce.data]);
  const odohrane = useMemo(() => [...(vysledky.data ?? [])].sort(podlaCasu).reverse(), [vysledky.data]);
  const lista = useMemo(
    () => [...[...(listaVysledky.data ?? [])].sort(podlaCasu), ...(zive.data ?? []), ...[...(listaBuduce.data ?? [])].sort(podlaCasu)],
    [listaVysledky.data, zive.data, listaBuduce.data]
  );
  const najblizsi = zive.data?.[0] ?? [...(listaBuduce.data ?? [])].sort(podlaCasu)[0] ?? null;

  const liga = (ligy.data ?? []).find((l) => tid && l.tim_id === tid && l.format !== 'turnaj') ?? null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);
  const dataTabulky = liga && tabulka.data?.length ? { liga, riadky: tabulka.data } : null;

  // Titulný článok: zvýraznený, inak najnovší; ďalej dva ďalšie a zoznam najnovších
  const vsetky = clanky.data ?? [];
  const hlavny = zvyraznene.data?.[0] ?? vsetky[0] ?? null;
  const ostatne = vsetky.filter((c) => c.id !== hlavny?.id);
  const dalsie = ostatne.slice(0, 2);
  const najnovsie = ostatne.slice(2, 2 + obmedz(s.pocet_najnovsich, 3, 8, 5));
  const nacitavaTitul = zvyraznene.nacitava || clanky.nacitava;
  const vstupenky = String(s.vstupenky_odkaz || '').trim() || null;

  return (
    <div className="kr-uvod">
      {u.zapnute('ukazat_zapasy') && u.zapnute('ukazat_listu_zapasov') && <Skore zapasy={lista} />}
      <Sekcie p="po_skore" />
      {u.zapnute('ukazat_clanky') && (
        <Titulka
          hlavny={hlavny}
          dalsie={dalsie}
          najnovsie={najnovsie}
          zapas={najblizsi}
          vstupenky={vstupenky}
          nacitava={nacitavaTitul}
          nahradnaFotka={(s.uvod_fotka as string | null) || null}
        />
      )}
      <Sekcie p="po_titulke" />
      {u.zapnute('ukazat_zapasy') && timyZapasov.length > 0 && (
        <PrehladZapasov timy={timyZapasov} timId={tid} setTimId={setTimId} program={program} vysledky={odohrane} tabulka={dataTabulky} nacitava={nacitavaZapasy} />
      )}
      <Sekcie p="po_zapasoch" />
      {u.zapnute('ukazat_hracov') && timHracov && <Kader tim={timHracov} nadpis={String(s.hraci_nadpis || '').trim() || `Káder · ${timHracov.nazov}`} />}
      <Sekcie p="po_kadri" />
      {u.zapnute('ukazat_videa') && <Videa videa={videa.data ?? []} />}
      <Sekcie p="po_videach" />
      {u.zapnute('ukazat_fanshop') && <Fanshop s={s} />}
      <Sekcie p="po_fanshope" />
      <Klub s={s} />
      <Sekcie p="po_klube" />
      <Partneri partneri={partneri.data ?? []} />
      <Sekcie p="koniec" />
    </div>
  );
};

export default Uvod;
