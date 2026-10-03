// Umiestnenie: sablony/arena/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Aréna - prehľad klubu ako nástenka (dashboard)
// športovej aplikácie. Žiadne pásy cez celú šírku: obsah tvoria widgety
// v mriežke s 12 stĺpcami.
//
//  - hlavička prehľadu s pozdravom a rýchlymi údajmi (najbližší zápas,
//    pozícia v tabuľke, forma),
//  - zápasový widget s odpočtom a widget tabuľky,
//  - novinky (hlavná správa a zoznam), posledné výsledky a program,
//  - strelci, sezóna v číslach a káder,
//  - videá a fotogaléria, fanshop a členstvo.
// Widget bez dát sa neukáže a ostatné sa roztiahnu.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cenaText, souborUrl, useNastavenia, useNastaveniaSablony, type ProduktObchodu } from '@clubw/jadro';
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

const sutazZapasu = (z: Zapas) => [z.liga_nazov, z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ');

/** Widget nástenky: karta s hlavičkou (nadpis, voliteľný odkaz) a obsahom. */
const Widget: React.FC<{ nadpis: string; odkaz?: string | null; textOdkazu?: string; trieda?: string; tmavy?: boolean; children: React.ReactNode }> = ({
  nadpis,
  odkaz,
  textOdkazu,
  trieda = '',
  tmavy,
  children,
}) => (
  <section className={`ar-widget${tmavy ? ' ar-widget--tmavy' : ''} ${trieda}`}>
    <div className="ar-widget__hlava">
      <h2>{nadpis}</h2>
      {odkaz && (
        <Odkaz to={odkaz} className="ar-widget__odkaz">
          {textOdkazu || 'Všetko'}
          <Ikona nazov="vpravo" velkost={12} />
        </Odkaz>
      )}
    </div>
    {children}
  </section>
);

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

const ErbStrany: React.FC<{ zapas: Zapas; strana: 'domaci' | 'hostia'; velky?: boolean }> = ({ zapas: z, strana, velky }) => {
  const { nastavenia } = useNastavenia();
  const nazov = strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z);
  return <Erb nazov={nazov} logo={logoStrany(z, strana, nastavenia.logo)} ton={strana === 'domaci' ? 'tmavy' : 'akcent'} velky={velky} />;
};

// ===== Hlavička prehľadu =====

const HlavickaPrehladu: React.FC<{ najblizsi: Zapas | null; pozicia: number | null; forma: Zapas[] }> = ({ najblizsi, pozicia: poz, forma }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const hodina = new Date().getHours();
  const pozdrav = hodina < 10 ? 'Dobré ráno' : hodina < 18 ? 'Dobrý deň' : 'Dobrý večer';
  const dni = najblizsi ? Math.ceil((new Date(najblizsi.datum_cas.replace(' ', 'T')).getTime() - Date.now()) / 86400000) : null;
  return (
    <div className="ar-prehlad">
      <div className="ar-prehlad__text">
        <span className="ar-stitok">{u.text('prehlad_stitok', 'Prehľad klubu')}</span>
        <h1>{u.text('prehlad_nadpis', `${pozdrav}, fanúšik ${nastavenia.skratka || nastavenia.nazov}`)}</h1>
        {nastavenia.slogan && <p>{nastavenia.slogan}</p>}
      </div>
      <div className="ar-prehlad__cipy">
        {najblizsi && dni !== null && dni >= 0 && (
          <Link to={`/matches/${najblizsi.id}`} className="ar-cip">
            <span>Ďalší zápas</span>
            <strong>{dni === 0 ? 'Dnes' : dni === 1 ? 'Zajtra' : `o ${dni} dní`}</strong>
          </Link>
        )}
        {poz && (
          <Link to="/leagues" className="ar-cip">
            <span>Tabuľka</span>
            <strong>{poz}. miesto</strong>
          </Link>
        )}
        {forma.length > 0 && (
          <span className="ar-cip">
            <span>Forma</span>
            <span className="ar-forma">
              {forma.map((z) => {
                const x = vysledokKlubu(z)!;
                return (
                  <i key={z.id} className={`ar-forma__znak is-${x.toLowerCase()}`} title={`${nazovDomacich(z)} ${z.goly_domaci}:${z.goly_hostia} ${nazovHosti(z)}`}>
                    {x}
                  </i>
                );
              })}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};

// ===== Zápas a tabuľka =====

const ZapasWidget: React.FC<{ zapas: Zapas; vstupenky: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const stav = stavZapasu(z);
  const zivy = stav === 'prebieha';
  const odpocet = useOdpocet(zivy ? null : z.datum_cas, u.zapnute('ukazat_odpocet'));
  return (
    <Widget nadpis={zivy ? 'Práve sa hrá' : 'Najbližší zápas'} odkaz="/matches" textOdkazu="Program" trieda="ar-w-zapas" tmavy>
      <span className="ar-w-zapas__sutaz">
        {sutazZapasu(z) || 'Zápas'}
        {zivy && <b className="ar-live">Live</b>}
      </span>
      <div className="ar-w-zapas__duel">
        {(['domaci', 'hostia'] as const).map((strana, i) => (
          <React.Fragment key={strana}>
            {i === 1 && (
              <span className="ar-w-zapas__stred">
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
            )}
            <span className="ar-w-zapas__tim">
              <ErbStrany zapas={z} strana={strana} velky />
              <strong>{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</strong>
              <small>{strana === 'domaci' ? 'Domáci' : 'Hostia'}</small>
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="ar-w-zapas__spodok">
        {odpocet ? (
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
        ) : (
          <span />
        )}
        <div className="ar-w-zapas__akcie">
          {z.miesto && (
            <span className="ar-w-zapas__miesto">
              <Ikona nazov="miesto" velkost={14} /> {z.miesto}
            </span>
          )}
          {stav === 'naplanovany' && vstupenky && (
            <Odkaz to={vstupenky} className="ar-tlacidlo ar-tlacidlo--akcent">
              {u.text('vstupenky_text', 'Kúpiť vstupenky')}
            </Odkaz>
          )}
          <Link to={`/matches/${z.id}`} className="ar-tlacidlo ar-tlacidlo--obrys-svetle">
            {u.text('text_detail', 'Detail zápasu')}
          </Link>
        </div>
      </div>
    </Widget>
  );
};

const TabulkaWidget: React.FC<{ liga: Liga; riadky: RiadokTabulky[]; timId: number }> = ({ liga, riadky, timId }) => (
  <Widget nadpis="Tabuľka" odkaz={`/leagues/${liga.id}`} textOdkazu="Celá" trieda="ar-w-tabulka">
    <span className="ar-widget__podnadpis">{liga.nazov}</span>
    <table className="ar-mtabulka">
      <thead>
        <tr>
          <th>#</th>
          <th className="ar-mtabulka__tim">Tím</th>
          <th>Z</th>
          <th>+/−</th>
          <th>B</th>
        </tr>
      </thead>
      <tbody>
        {vyrezTabulky(riadky, timId, 8).map((r) => (
          <tr key={r.id} className={r.tim_id === timId ? 'is-nas' : ''}>
            <td>{r.pozicia}</td>
            <td className="ar-mtabulka__tim">
              <span>
                <Erb nazov={r.tim_nazov || r.custom_tim_nazov || 'Tím'} logo={r.tim_logo || r.custom_tim_logo} />
                <span>{r.tim_nazov || r.custom_tim_nazov}</span>
              </span>
            </td>
            <td>{r.zapasy}</td>
            <td>{r.goly_rozdiel > 0 ? `+${r.goly_rozdiel}` : r.goly_rozdiel}</td>
            <td>
              <b>{r.body}</b>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Widget>
);

// ===== Novinky, výsledky, program =====

const NovinkyWidget: React.FC<{ clanky: Clanok[]; nahradnaFotka: string | null }> = ({ clanky, nahradnaFotka }) => {
  const u = useUpravy();
  const [hlavny, ...ostatne] = clanky;
  if (!hlavny) return null;
  const fotka = obrazokUrl(hlavny.obrazok) || obrazokUrl(nahradnaFotka);
  return (
    <Widget nadpis={u.text('novinky_nadpis', 'Novinky')} odkaz="/clanky" textOdkazu="Všetky" trieda="ar-w-novinky">
      <Link to={`/clanek/${hlavny.slug}`} className="ar-w-novinky__hlavny">
        <span className="ar-w-novinky__fotka">{fotka ? <img src={fotka} alt="" onError={skryObrazok} /> : null}</span>
        <span className="ar-w-novinky__text">
          <span className="ar-znacka">{hlavny.kategoria?.nazov || 'Správy'}</span>
          <strong>{hlavny.nazov}</strong>
          {hlavny.excerpt && <span className="ar-w-novinky__perex">{hlavny.excerpt}</span>}
          <small>{datum(hlavny.publikovany_datum || hlavny.vytvoreny)}</small>
        </span>
      </Link>
      {ostatne.length > 0 && (
        <ul className="ar-w-novinky__zoznam">
          {ostatne.slice(0, 4).map((c) => (
            <li key={c.id}>
              <Link to={`/clanek/${c.slug}`}>
                <Obrazok src={c.obrazok} className="ar-w-novinky__nahlad" />
                <span>
                  <strong>{c.nazov}</strong>
                  <small>
                    {c.kategoria?.nazov || 'Správy'} · {datum(c.publikovany_datum || c.vytvoreny)}
                  </small>
                </span>
                <Ikona nazov="vpravo" velkost={12} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
};

const RiadokZapasu: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const skore = maVysledok(z) && stavZapasu(z) !== 'naplanovany';
  const v = skore ? vysledokKlubu(z) : null;
  return (
    <li>
      <Link to={`/matches/${z.id}`} className="ar-rzapas">
        <span className="ar-rzapas__datum">
          <strong>{datumKratky(z.datum_cas).replace(/\s.*$/, '')}</strong>
          <small>{skore ? datumKratky(z.datum_cas).replace(/^\S+\s/, '') : cas(z.datum_cas)}</small>
        </span>
        <span className="ar-rzapas__timy">
          {(['domaci', 'hostia'] as const).map((strana) => (
            <span key={strana}>
              <ErbStrany zapas={z} strana={strana} />
              <span>{strana === 'domaci' ? nazovDomacich(z) : nazovHosti(z)}</span>
              {skore && <b>{strana === 'domaci' ? z.goly_domaci : z.goly_hostia}</b>}
            </span>
          ))}
        </span>
        {v && <i className={`ar-forma__znak is-${v.toLowerCase()}`}>{v}</i>}
      </Link>
    </li>
  );
};

// ===== Strelci, sezóna, káder =====

interface Strelec {
  poradie: number;
  hrac: { id: number; meno: string; priezvisko: string; cislo_dresu: number | null };
  pocet: number;
}

const StrelciWidget: React.FC<{ liga: Liga }> = ({ liga }) => {
  const strelci = useApi<Strelec[]>(`/leagues/${liga.id}/top-scorers?typ=gol&limit=5`);
  const zoznam = (strelci.data ?? []).filter((s) => s.pocet > 0);
  if (zoznam.length === 0) return null;
  const max = Math.max(...zoznam.map((s) => s.pocet));
  return (
    <Widget nadpis="Strelci" odkaz="/stats" textOdkazu="Štatistiky" trieda="ar-w-strelci">
      <ol className="ar-rebricek">
        {zoznam.map((s) => (
          <li key={s.hrac.id}>
            <Link to={`/players/${s.hrac.id}`}>
              <span className="ar-rebricek__poradie">{s.poradie}</span>
              <span className="ar-rebricek__meno">
                <strong>
                  {s.hrac.meno.charAt(0)}. {s.hrac.priezvisko}
                </strong>
                <span className="ar-rebricek__pruh">
                  <i style={{ width: `${(s.pocet / max) * 100}%` }} />
                </span>
              </span>
              <b>{s.pocet}</b>
            </Link>
          </li>
        ))}
      </ol>
    </Widget>
  );
};

const useSezona = (tim: Tim) => {
  const zapasy = useApi<Zapas[]>(`/matches?tim_id=${tim.id}&status=ukonceny&limit=100`);
  return useMemo(() => {
    const zoznam = [...(zapasy.data ?? [])].filter((z) => maVysledok(z) && vysledokKlubu(z)).sort(podlaCasu);
    let za = 0,
      proti = 0;
    const p = { V: 0, R: 0, P: 0 };
    for (const z of zoznam) {
      const nasDomaci = z.domaci_tim_id === tim.id || (Boolean(z.domaci_tim_id) && z.hostujuci_tim_id !== tim.id);
      za += nasDomaci ? z.goly_domaci! : z.goly_hostia!;
      proti += nasDomaci ? z.goly_hostia! : z.goly_domaci!;
      p[vysledokKlubu(z)!]++;
    }
    return { pocet: zoznam.length, ...p, za, proti, forma: zoznam.slice(-5) };
  }, [zapasy.data, tim.id]);
};

const SezonaWidget: React.FC<{ data: ReturnType<typeof useSezona> }> = ({ data }) => {
  const u = useUpravy();
  if (data.pocet === 0) return null;
  const uspesnost = Math.round((data.V / data.pocet) * 100);
  return (
    <Widget nadpis={u.text('sezona_nadpis', 'Sezóna v číslach')} odkaz="/stats" textOdkazu="Viac" trieda="ar-w-sezona">
      <div className="ar-w-sezona__hore">
        <span className="ar-kruh-graf" style={{ '--ar-podiel': `${uspesnost}%` } as React.CSSProperties}>
          <strong>{uspesnost} %</strong>
          <small>výhier</small>
        </span>
        <dl className="ar-w-sezona__vrd">
          {(
            [
              ['V', 'Výhry'],
              ['R', 'Remízy'],
              ['P', 'Prehry'],
            ] as const
          ).map(([k, n]) => (
            <div key={k} className={`is-${k.toLowerCase()}`}>
              <dt>{n}</dt>
              <dd>{data[k]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="ar-w-sezona__goly">
        <div>
          <strong>{data.za}</strong>
          <small>strelených</small>
        </div>
        <div>
          <strong>{data.proti}</strong>
          <small>inkasovaných</small>
        </div>
        <div>
          <strong>{(data.za / data.pocet).toFixed(1).replace('.', ',')}</strong>
          <small>gólov na zápas</small>
        </div>
      </div>
    </Widget>
  );
};

const KaderWidget: React.FC<{ tim: Tim }> = ({ tim }) => {
  const u = useUpravy();
  const hraci = useApi<{ hraci: Hrac[] }>(`/teams/${tim.id}/players`);
  const vsetci = useMemo(
    () =>
      [...(hraci.data?.hraci ?? [])].sort(
        (a, b) => (POZICIE[a.pozicia ?? '']?.poradie ?? 9) - (POZICIE[b.pozicia ?? '']?.poradie ?? 9) || (a.cislo_dresu ?? 99) - (b.cislo_dresu ?? 99)
      ),
    [hraci.data]
  );
  if (vsetci.length === 0) return null;
  return (
    <Widget nadpis={u.text('hraci_nadpis', 'Káder')} odkaz={`/teams/${tim.id}`} textOdkazu={`Všetci (${vsetci.length})`} trieda="ar-w-kader">
      <ul className="ar-w-kader__zoznam">
        {vsetci.slice(0, 6).map((h) => {
          const fotka = obrazokUrl(h.fotka);
          return (
            <li key={h.id}>
              <Link to={`/players/${h.id}`}>
                <span className="ar-avatar">{fotka ? <img src={fotka} alt="" loading="lazy" onError={skryObrazok} /> : <span>{h.priezvisko.charAt(0)}</span>}</span>
                <span className="ar-w-kader__meno">
                  <strong>
                    {h.meno} {h.priezvisko}
                  </strong>
                  <small>{pozicia(h.pozicia)}</small>
                </span>
                {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <b>{h.cislo_dresu}</b>}
              </Link>
            </li>
          );
        })}
      </ul>
    </Widget>
  );
};

// ===== Médiá, obchod, členstvo =====

const VideaWidget: React.FC<{ videa: Video[] }> = ({ videa }) => {
  const u = useUpravy();
  const { otvor, okno } = useOknoVidea();
  if (videa.length === 0) return null;
  const prehraj = (v: Video) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || !embedVidea(v)) return;
    e.preventDefault();
    otvor(v);
  };
  return (
    <Widget nadpis={u.text('videa_nadpis', 'Klub TV')} odkaz="/videa" textOdkazu="Všetky videá" trieda="ar-w-videa">
      <div className="ar-w-videa__mriezka">
        {videa.slice(0, 3).map((v) => (
          <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="ar-vkarta" onClick={prehraj(v)}>
            <span className="ar-vkarta__nahlad">
              <Obrazok src={v.nahlad_url || v.nahlad} className="ar-vkarta__obrazok" />
              <span className="ar-vkarta__play" aria-hidden="true">
                <Ikona nazov="play" velkost={14} />
              </span>
              {dlzkaVidea(v.dlzka) && <small>{dlzkaVidea(v.dlzka)}</small>}
            </span>
            <strong>{v.nazov}</strong>
          </a>
        ))}
      </div>
      {okno}
    </Widget>
  );
};

interface GaleriaUvodu {
  id: number;
  nazov: string;
  pocet_obrazkov?: number;
  nahladovy_obrazok?: string | null;
}

const GaleriaWidget: React.FC<{ galeria: GaleriaUvodu }> = ({ galeria }) => {
  const detail = useApi<{ obrazky?: Array<{ id: number; url_stredny?: string | null; url_original?: string | null }> }>(`/galleries/${galeria.id}`);
  const fotky = (detail.data?.obrazky ?? []).slice(0, 4);
  return (
    <Widget nadpis="Fotogaléria" odkaz="/galleries" textOdkazu="Všetky" trieda="ar-w-galeria">
      <Link to={`/galleries/${galeria.id}`} className="ar-w-galeria__odkaz">
        <span className="ar-w-galeria__fotky">
          {fotky.map((f) => (
            <img key={f.id} src={souborUrl(f.url_stredny || f.url_original || '')} alt="" loading="lazy" onError={skryObrazok} />
          ))}
        </span>
        <span className="ar-w-galeria__popis">
          <strong>{galeria.nazov}</strong>
          <small>
            <Ikona nazov="foto" velkost={13} /> {galeria.pocet_obrazkov ?? fotky.length} fotiek
          </small>
        </span>
      </Link>
    </Widget>
  );
};

const useProdukty = (s: Nastavenia) => {
  const { nastavenia } = useNastavenia();
  const zapnuty = Boolean(nastavenia.eshop?.zapnuty);
  const odporucane = useApi<ProduktObchodu[]>(zapnuty ? '/eshop/produkty?odporucane=1&limit=4' : null);
  const bezOdporucanych = zapnuty && !odporucane.nacitava && !odporucane.chyba && (odporucane.data?.length ?? 0) < 4;
  const najnovsie = useApi<ProduktObchodu[]>(bezOdporucanych ? '/eshop/produkty?limit=4' : null);
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

const ObchodWidget: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  const { produkty, obchod } = useProdukty(s);
  if (produkty.length === 0) return null;
  return (
    <Widget nadpis={u.text('fanshop_nadpis', 'Fanshop')} odkaz={obchod} textOdkazu={u.text('fanshop_tlacidlo', 'Do obchodu')} trieda="ar-w-obchod">
      <div className="ar-w-obchod__mriezka">
        {produkty.slice(0, 4).map((p) => {
          const obsah = (
            <>
              <Obrazok src={p.obrazok} className="ar-w-obchod__obrazok" alt={p.nazov} />
              <span className="ar-w-obchod__info">
                {p.nazov && <strong>{p.nazov}</strong>}
                {p.cena && <span>{p.cena}</span>}
              </span>
            </>
          );
          return p.odkaz ? (
            <Odkaz key={p.kluc} to={p.odkaz} className="ar-w-obchod__produkt">
              {obsah}
            </Odkaz>
          ) : (
            <div key={p.kluc} className="ar-w-obchod__produkt">
              {obsah}
            </div>
          );
        })}
      </div>
    </Widget>
  );
};

const ClenstvoWidget: React.FC<{ s: Nastavenia }> = ({ s }) => {
  const u = useUpravy();
  const siete = useSiete();
  return (
    <section className="ar-widget ar-widget--akcent ar-w-clenstvo">
      <span className="ar-stitok">{u.text('vyzva_stitok', 'Členstvo')}</span>
      <h2>{u.text('vyzva_nadpis', 'Staňte sa súčasťou {klub}')}</h2>
      <p>{u.text('vyzva_text', 'Pozvánky na zápasy, novinky a akcie klubu ako prví. Registrácia je zadarmo.')}</p>
      <div className="ar-w-clenstvo__akcie">
        <Odkaz to={String(s.vyzva_odkaz || '').trim() || '/registracia'} className="ar-tlacidlo ar-tlacidlo--tmave">
          {u.text('vyzva_tlacidlo', 'Registrácia')}
          <Ikona nazov="sipka" velkost={14} />
        </Odkaz>
        {u.zapnute('ukazat_siete') && siete.length > 0 && (
          <div className="ar-w-clenstvo__siete">
            {siete.map((x) => (
              <a key={x.kluc} href={x.url} target="_blank" rel="noopener noreferrer" aria-label={x.nazov} title={x.nazov}>
                <IkonaSiete kluc={x.kluc} velkost={17} />
              </a>
            ))}
          </div>
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

  const { timy, hlavny } = useHlavnyTim();
  const clanky = useApi<Clanok[]>(u.zapnute('ukazat_novinky') ? '/articles?limit=5' : null);
  const ligy = useApi<Liga[]>('/leagues');
  const videa = useApi<Video[]>(u.zapnute('ukazat_videa') ? '/videos?limit=3' : null);
  const galerie = useApi<GaleriaUvodu[]>(u.zapnute('ukazat_galeriu') ? '/galleries?limit=8' : null);
  const odohrane = useApi<Zapas[]>(hlavny ? `/matches?tim_id=${hlavny.id}&status=ukonceny&limit=5` : null);
  const zive = useApi<Zapas[]>(hlavny ? `/matches?tim_id=${hlavny.id}&status=prebieha&limit=1` : null);
  const buduce = useApi<Zapas[]>(hlavny ? `/matches?tim_id=${hlavny.id}&status=naplanovany&od_datumu=${dnes()}&poradie=asc&limit=4` : null);
  const liga = hlavny ? (ligy.data ?? []).find((l) => l.tim_id === hlavny.id && l.format !== 'turnaj') ?? null : null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);
  const sezona = useSezona(hlavny ?? ({ id: 0 } as Tim));

  const minule = [...(odohrane.data ?? [])].sort(podlaCasu).reverse();
  const dalsie = [...(buduce.data ?? [])].sort(podlaCasu);
  const najblizsi = zive.data?.[0] ?? dalsie[0] ?? null;
  const nasRiadok = (tabulka.data ?? []).find((r) => r.tim_id === hlavny?.id);
  const galeria = (galerie.data ?? []).find((g) => (g.pocet_obrazkov ?? 0) > 0) ?? null;
  const timHracov = (s.hraci_tim ? timy.find((t) => t.id === Number(s.hraci_tim)) : null) ?? hlavny;
  const vstupenky = String(s.vstupenky_odkaz || '').trim() || null;
  const maTabulku = Boolean(liga && hlavny && tabulka.data?.length && u.zapnute('ukazat_tabulku'));
  const zapas = u.zapnute('ukazat_zapasy') ? najblizsi : null;

  return (
    <div className="ar-uvod">
      {u.zapnute('ukazat_prehlad') && <HlavickaPrehladu najblizsi={najblizsi} pozicia={nasRiadok?.pozicia ?? null} forma={sezona.forma} />}
      <div className="ar-nastenka">
        {zapas && <ZapasWidget zapas={zapas} vstupenky={vstupenky} />}
        {maTabulku && liga && hlavny && <TabulkaWidget liga={liga} riadky={tabulka.data ?? []} timId={hlavny.id} />}
        {u.zapnute('ukazat_novinky') && <NovinkyWidget clanky={clanky.data ?? []} nahradnaFotka={(s.uvod_fotka as string | null) || null} />}
        {u.zapnute('ukazat_zapasy') && (minule.length > 0 || dalsie.length > 0) && (
          <div className="ar-w-stlpec">
            {minule.length > 0 && (
              <Widget nadpis="Výsledky" odkaz="/matches?zobrazenie=vysledky" textOdkazu="Všetky" trieda="ar-w-vysledky">
                <ul className="ar-rzapasy">
                  {minule.slice(0, 3).map((z) => (
                    <RiadokZapasu key={z.id} zapas={z} />
                  ))}
                </ul>
              </Widget>
            )}
            {dalsie.length > 0 && (
              <Widget nadpis="Program" odkaz="/calendar" textOdkazu="Kalendár" trieda="ar-w-program">
                <ul className="ar-rzapasy">
                  {dalsie.slice(zapas && !zive.data?.length ? 1 : 0, (zapas && !zive.data?.length ? 1 : 0) + 3).map((z) => (
                    <RiadokZapasu key={z.id} zapas={z} />
                  ))}
                </ul>
              </Widget>
            )}
          </div>
        )}
        {u.zapnute('ukazat_strelcov') && liga && <StrelciWidget liga={liga} />}
        {u.zapnute('ukazat_sezonu') && hlavny && <SezonaWidget data={sezona} />}
        {u.zapnute('ukazat_hracov') && timHracov && <KaderWidget tim={timHracov} />}
        {u.zapnute('ukazat_videa') && <VideaWidget videa={videa.data ?? []} />}
        {galeria && <GaleriaWidget galeria={galeria} />}
        {u.zapnute('ukazat_fanshop') && <ObchodWidget s={s} />}
        {u.zapnute('ukazat_vyzvu') && <ClenstvoWidget s={s} />}
      </div>
    </div>
  );
};

export default Uvod;
