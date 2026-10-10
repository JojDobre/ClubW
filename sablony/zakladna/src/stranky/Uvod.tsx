// Umiestnenie: sablony/zakladna/src/stranky/Uvod.tsx
// Úvodná stránka základnej šablóny: úvodný pás s erbom a najbližším
// (alebo práve hraným) zápasom, aktuality, program a výsledky, anketa,
// produkty z obchodu, výzva na registráciu a vlastné sekcie klubu.

import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AnketaWeb,
  ZivyPrenos,
  cenaText,
  souborUrl,
  useData,
  useNastavenia,
  useNastaveniaSablony,
  useRegistracia,
  useTeraz,
  useZivaObnova,
  zivaMinuta,
  NAZVY_FAZ,
  type ProduktObchodu,
  type VlastnostiHlavickyBloku,
} from '@clubw/jadro';
import { ErbKlubu, OdkazAleboOdkazVon, zapnute } from '../Rozlozenie';
import { Sekcie as SekcieSablony } from '../bloky';
import { Ikona } from '../ikony';
import { ErbTimu, cas, datum, den, denCislo, nazovStrany, nazovSutaze, type ZapasZakladny } from '../zapasy';
import './Uvod.css';

interface ClanokVZozname {
  id: number;
  nazov: string;
  slug: string;
  excerpt?: string | null;
  obrazok?: string | null;
  publikovany_datum?: string | null;
  vytvoreny: string;
  kategoria?: { nazov: string } | null;
}

type ZapasVZozname = ZapasZakladny;

/** Hlavička sekcie - aj pre vlastné sekcie úvodu. */
const HlavickaSekcie: React.FC<VlastnostiHlavickyBloku & { stitok?: string; id?: string }> = ({ nadpis, uvod, odkaz, textOdkazu, stitok, id }) => {
  const vlastneId = useId();
  return (
    <>
      <div className="zk-u-hlava">
        <div>
          {stitok && <span className="zk-u-hlava__stitok">{stitok}</span>}
          <h2 id={id || vlastneId}>{nadpis}</h2>
        </div>
        {odkaz && (
          <Link to={odkaz} className="zk-u-hlava__odkaz">
            {textOdkazu || 'Zobraziť všetky'} <Ikona nazov="sipka" />
          </Link>
        )}
      </div>
      {uvod && <p className="blok__uvod">{uvod}</p>}
    </>
  );
};
/** Vlastné sekcie úvodu - bloky v dizajne podstránok Základnej (bloky.tsx). */
const Sekcie: React.FC<{ p: string }> = ({ p }) => <SekcieSablony p={p} hlavicka={HlavickaSekcie} />;

/** Odpočet do výkopu (dni, hodiny, minúty). */
const Odpocet: React.FC<{ kedy: string }> = ({ kedy }) => {
  const [teraz, setTeraz] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setTeraz(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const zostava = new Date(kedy).getTime() - teraz;
  if (zostava <= 0) return null;
  const casti: Array<[number, string]> = [
    [Math.floor(zostava / 86_400_000), 'dní'],
    [Math.floor((zostava % 86_400_000) / 3_600_000), 'hod'],
    [Math.floor((zostava % 3_600_000) / 60_000), 'min'],
  ];
  return (
    <div className="zk-odpocet" role="timer" aria-label="Do výkopu zostáva">
      {casti.map(([n, s]) => (
        <span key={s}>
          <strong>{String(n).padStart(2, '0')}</strong>
          <small>{s}</small>
        </span>
      ))}
    </div>
  );
};

/** Karta zápasu v úvodnom páse - živý zápas so skóre a minútou, inak odpočet. */
const KartaZapasu: React.FC<{ z: ZapasVZozname }> = ({ z }) => {
  const teraz = useTeraz();
  const zivy = z.status === 'prebieha';
  const minuta = zivy ? zivaMinuta(z, teraz) : null;
  return (
    <Link to={`/matches/${z.id}`} className={`zk-hero__zapas${zivy ? ' is-zivy' : ''}`}>
      <div className="zk-hero__zapas-hlava">
        {zivy ? (
          <span className="zk-live">
            <i aria-hidden="true" /> Naživo
          </span>
        ) : (
          <span className="zk-hero__zapas-stitok">Najbližší zápas</span>
        )}
        <span className="zk-hero__zapas-liga">{nazovSutaze(z)}</span>
      </div>
      <div className="zk-hero__timy">
        <div className="zk-hero__tim">
          <ErbTimu z={z} strana="domaci" velky />
          <span>{nazovStrany(z, 'domaci')}</span>
        </div>
        <div className="zk-hero__stred">
          {zivy ? (
            <>
              <strong className="zk-hero__skore">
                {z.goly_domaci ?? 0}
                <i>:</i>
                {z.goly_hostia ?? 0}
              </strong>
              <small>{[minuta, z.live_faza ? NAZVY_FAZ[z.live_faza] : null].filter(Boolean).join(' · ') || 'Prebieha'}</small>
            </>
          ) : (
            <>
              <strong className="zk-hero__cas">{cas(z.datum_cas)}</strong>
              <small>
                {den(z.datum_cas)} {denCislo(z.datum_cas)}
              </small>
            </>
          )}
        </div>
        <div className="zk-hero__tim">
          <ErbTimu z={z} strana="hostia" velky />
          <span>{nazovStrany(z, 'hostia')}</span>
        </div>
      </div>
      {!zivy && <Odpocet kedy={z.datum_cas} />}
      <div className="zk-hero__zapas-pata">
        {z.miesto && (
          <span>
            <Ikona nazov="miesto" /> {z.miesto}
          </span>
        )}
        <span className="zk-hero__zapas-detail">
          {zivy && z.stream_url ? 'Sledovať prenos' : 'Detail zápasu'} <Ikona nazov="sipka" />
        </span>
      </div>
    </Link>
  );
};

/** Riadok programu alebo výsledku v bočnom paneli. */
const RiadokZapasu: React.FC<{ z: ZapasVZozname; vysledok?: boolean }> = ({ z, vysledok }) => (
  <li>
    <Link to={`/matches/${z.id}`} className="zk-riadok">
      <span className="zk-riadok__datum">
        <small>{den(z.datum_cas)}</small>
        <strong>{denCislo(z.datum_cas)}</strong>
      </span>
      <span className="zk-riadok__timy">
        <span>
          <ErbTimu z={z} strana="domaci" />
          {nazovStrany(z, 'domaci')}
        </span>
        <span>
          <ErbTimu z={z} strana="hostia" />
          {nazovStrany(z, 'hostia')}
        </span>
      </span>
      {vysledok ? (
        <span className="zk-riadok__skore">
          <b>{z.goly_domaci ?? '-'}</b>
          <b>{z.goly_hostia ?? '-'}</b>
        </span>
      ) : (
        <span className="zk-riadok__cas">{cas(z.datum_cas)}</span>
      )}
    </Link>
  </li>
);

const Uvod: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony();
  const reg = useRegistracia();
  const fotka = (s.uvod_fotka as string | null) || null;

  // Živý zápas sa počas hry sám obnovuje
  const [zivy, setZivy] = useState(false);
  const tik = useZivaObnova(zivy);
  const prebieha = useData<ZapasVZozname[]>(`/matches?status=prebieha&limit=1${tik ? `&t=${tik}` : ''}`);
  const zivyZapas = prebieha.data?.[0] ?? null;
  useEffect(() => setZivy(Boolean(zivyZapas)), [zivyZapas]);

  const clanky = useData<ClanokVZozname[]>('/articles?limit=5');
  const buduce = useData<ZapasVZozname[]>(`/matches?status=naplanovany&od_datumu=${new Date().toISOString().slice(0, 10)}&poradie=asc&limit=50`);
  const vysledky = useData<ZapasVZozname[]>('/matches?status=ukonceny&limit=4');
  const najblizsie = [...(buduce.data ?? [])]
    .filter((z) => new Date(z.datum_cas).getTime() > Date.now() - 2 * 3_600_000)
    .sort((a, b) => a.datum_cas.localeCompare(b.datum_cas));
  const hlavnyZapas = zivyZapas ?? najblizsie[0] ?? null;

  const obchod = Boolean(nastavenia.eshop?.zapnuty) && zapnute(s, 'ukazat_obchod');
  const odporucane = useData<ProduktObchodu[]>(obchod ? '/eshop/produkty?odporucane=1&limit=4' : null);
  const doplnit = obchod && !odporucane.nacitava && (odporucane.data?.length ?? 0) < 4;
  const najnovsie = useData<ProduktObchodu[]>(doplnit ? '/eshop/produkty?limit=4' : null);
  const produkty = ((najnovsie.data?.length ?? 0) > (odporucane.data?.length ?? 0) ? najnovsie.data : odporucane.data) ?? [];

  const registracia = zapnute(s, 'ukazat_registraciu') && (reg.typy.fanusik || reg.typy.clen);
  const zoznamClankov = clanky.data ?? [];
  const [hlavny, ...ostatne] = zoznamClankov;
  const stitokHero = String(s.hero_stitok || '').trim() || (nastavenia.rok_zalozenia ? `Od roku ${nastavenia.rok_zalozenia}` : 'Oficiálny web klubu');
  const tlacidloText = String(s.tlacidlo_text || '').trim();
  const tlacidloOdkaz = String(s.tlacidlo_odkaz || '').trim();

  return (
    <div className="zk-uvod">
      <section className={`zk-hero${fotka ? ' ma-fotku' : ''}`} aria-labelledby="zk-hero-nadpis">
        {fotka && <img src={souborUrl(fotka)} alt="" className="zk-hero__fotka" />}
        <div className="zk-hero__vnutro">
          <div className="zk-hero__klub">
            <ErbKlubu className="zk-hero__erb" />
            <span className="zk-hero__stitok">{stitokHero}</span>
            <h1 id="zk-hero-nadpis">{nastavenia.nazov}</h1>
            {(nastavenia.slogan || nastavenia.meta_popis) && <p>{nastavenia.slogan || nastavenia.meta_popis}</p>}
            <div className="zk-hero__tlacidla">
              <Link to="/matches" className="zk-tlacidlo zk-tlacidlo--svetle">
                <Ikona nazov="kalendar" /> Zápasy
              </Link>
              {tlacidloText && tlacidloOdkaz ? (
                <OdkazAleboOdkazVon odkaz={tlacidloOdkaz} className="zk-tlacidlo zk-tlacidlo--priehladne">
                  {tlacidloText}
                </OdkazAleboOdkazVon>
              ) : (
                <Link to={registracia ? '/registracia' : '/moj-klub'} className="zk-tlacidlo zk-tlacidlo--priehladne">
                  {registracia ? 'Pridajte sa ku klubu' : 'Môj klub'}
                </Link>
              )}
            </div>
          </div>
          {hlavnyZapas && <KartaZapasu z={hlavnyZapas} />}
        </div>
      </section>

      {zivyZapas && (
        <div className="zk-u-kontajner">
          <ZivyPrenos zapas={zivyZapas} className="zk-zivy-prenos" />
        </div>
      )}

      <Sekcie p="po_uvode" />

      <div className="zk-u-kontajner zk-uvod__mriezka">
        <section className="zk-uvod__clanky" aria-labelledby="zk-aktuality">
          <HlavickaSekcie stitok="Novinky" nadpis="Aktuality" odkaz="/clanky" textOdkazu="Všetky články" id="zk-aktuality" />
          {clanky.nacitava ? (
            <p className="zk-uvod__prazdne">Načítavam...</p>
          ) : !hlavny ? (
            <p className="zk-uvod__prazdne">Zatiaľ žiadne články.</p>
          ) : (
            <div className="zk-clanky">
              <Link to={`/clanek/${hlavny.slug}`} className="zk-clanok zk-clanok--hlavny">
                <span className="zk-clanok__obrazok">
                  {hlavny.obrazok ? <img src={souborUrl(hlavny.obrazok)} alt="" loading="lazy" /> : <span className="zk-clanok__prazdny" aria-hidden="true" />}
                </span>
                <span className="zk-clanok__telo">
                  <span className="zk-clanok__meta">
                    {hlavny.kategoria?.nazov && <b>{hlavny.kategoria.nazov}</b>}
                    {datum(hlavny.publikovany_datum || hlavny.vytvoreny)}
                  </span>
                  <h3>{hlavny.nazov}</h3>
                  {hlavny.excerpt && <p>{hlavny.excerpt}</p>}
                </span>
              </Link>
              {ostatne.map((c) => (
                <Link key={c.id} to={`/clanek/${c.slug}`} className="zk-clanok">
                  <span className="zk-clanok__obrazok">
                    {c.obrazok ? <img src={souborUrl(c.obrazok)} alt="" loading="lazy" /> : <span className="zk-clanok__prazdny" aria-hidden="true" />}
                  </span>
                  <span className="zk-clanok__telo">
                    <span className="zk-clanok__meta">{datum(c.publikovany_datum || c.vytvoreny)}</span>
                    <h3>{c.nazov}</h3>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="zk-uvod__bok">
          <section className="zk-panel" aria-labelledby="zk-program">
            <div className="zk-panel__hlava">
              <h2 id="zk-program">Program</h2>
              <Link to="/matches">Všetky</Link>
            </div>
            {najblizsie.length === 0 ? (
              <p className="zk-uvod__prazdne">{buduce.nacitava ? 'Načítavam...' : 'Žiadne naplánované zápasy.'}</p>
            ) : (
              <ul className="zk-riadky">
                {najblizsie.slice(0, 3).map((z) => (
                  <RiadokZapasu key={z.id} z={z} />
                ))}
              </ul>
            )}
          </section>

          {(vysledky.data ?? []).length > 0 && (
            <section className="zk-panel" aria-labelledby="zk-vysledky">
              <div className="zk-panel__hlava">
                <h2 id="zk-vysledky">Výsledky</h2>
                <Link to="/matches">Všetky</Link>
              </div>
              <ul className="zk-riadky">
                {vysledky.data!.slice(0, 3).map((z) => (
                  <RiadokZapasu key={z.id} z={z} vysledok />
                ))}
              </ul>
            </section>
          )}

          <AnketaWeb najnovsia />
        </aside>
      </div>

      <Sekcie p="po_clankoch" />

      {obchod && produkty.length > 0 && (
        <section className="zk-u-kontajner zk-u-blok" aria-labelledby="zk-obchod">
          <HlavickaSekcie stitok="Fanshop" nadpis="Z klubového obchodu" odkaz="/obchod" textOdkazu="Do obchodu" id="zk-obchod" />
          <div className="zk-produkty">
            {produkty.slice(0, 4).map((p) => (
              <Link key={p.id} to={`/obchod/${p.slug}`} className="zk-produkt">
                <span className="zk-produkt__obrazok">
                  {p.obrazok ? <img src={souborUrl(p.obrazok)} alt="" loading="lazy" /> : <ErbKlubu />}
                </span>
                <span className="zk-produkt__nazov">{p.nazov}</span>
                <span className="zk-produkt__cena">
                  {p.povodna_cena != null && p.povodna_cena > p.cena && <s>{cenaText(p.povodna_cena, nastavenia.eshop?.mena)}</s>}
                  {cenaText(p.cena, nastavenia.eshop?.mena)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {registracia && (
        <section className="zk-u-kontajner zk-u-blok">
          <div className="zk-vyzva">
            <div>
              <span className="zk-u-hlava__stitok">Komunita</span>
              <h2>{reg.texty.nadpis || 'Staňte sa súčasťou klubu'}</h2>
              <p>{reg.texty.uvod || 'Zaregistrujte sa ako fanúšik alebo člen klubu. Získate klubovú kartu, výhody a novinky ako prví.'}</p>
            </div>
            <div className="zk-vyzva__tlacidla">
              <Link to="/registracia" className="zk-tlacidlo zk-tlacidlo--akcent">
                Registrácia
              </Link>
              <Link to="/moj-klub" className="zk-tlacidlo zk-tlacidlo--priehladne">
                Môj klub
              </Link>
            </div>
          </div>
        </section>
      )}

      <Sekcie p="koniec" />
    </div>
  );
};

export default Uvod;
