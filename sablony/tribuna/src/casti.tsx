// Umiestnenie: sablony/tribuna/src/casti.tsx
// Časti, ktoré sa opakujú na viacerých stránkach šablóny Tribúna:
// tmavá hlavička podstránky, filtre (pilulky), „Načítať ďalšie", stavy
// načítania, karty článku / hráča / zápasu / videa, partneri a tabuľka.
// Rozmery a písma zodpovedajú návrhom z Claude Design (News, Videá,
// Fotogaléria, Súpiska, Profil hráča).

import React, { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useNastavenia, useNastaveniaSablony } from '@clubw/jadro';
import {
  Erb,
  Ikona,
  NadpisStredovy,
  Odkaz,
  cas,
  datum,
  datumKratky,
  dlzkaVidea,
  funkcia,
  hrameDoma,
  logoStrany,
  maVysledok,
  nazovDomacich,
  nazovHosti,
  obrazokUrl,
  pozicia,
  skryObrazok,
  stavZapasu,
  useApi,
  useUpravy,
  type Clanok,
  type ClenTimu,
  type Hrac,
  type Partner,
  type RiadokTabulky,
  type StatistikaHraca,
  type Video,
  type Zapas,
} from './spolocne';

// ===== Hlavička podstránky =====

/** Tmavá hlavička podstránky: červený štítok a veľký biely nadpis. */
export const HlavickaStranky: React.FC<{
  stitok?: ReactNode;
  nadpis: ReactNode;
  spat?: { odkaz: string; text: string };
  children?: ReactNode;
  className?: string;
}> = ({ stitok, nadpis, spat, children, className = '' }) => (
  <header className={`tb-hlava ${className}`}>
    <div className="tb-kontajner">
      {spat && (
        <Link to={spat.odkaz} className="tb-spat">
          <Ikona nazov="vlavo" velkost={14} /> {spat.text}
        </Link>
      )}
      {stitok && <span className="tb-hlava__stitok">{stitok}</span>}
      <h1>{nadpis}</h1>
      {children}
    </div>
  </header>
);

// ===== Filtre (pilulky) =====

export interface MoznostFiltra<K extends string> {
  kluc: K;
  nazov: string;
}

/** Riadok filtrov: aktívny v červenej pilulke, ostatné len text. */
export const Filtre = <K extends string>({
  moznosti,
  aktivna,
  onZmena,
  popis,
  className = '',
}: {
  moznosti: Array<MoznostFiltra<K>>;
  aktivna: K;
  onZmena: (kluc: K) => void;
  popis: string;
  className?: string;
}) => (
  <div className={`tb-filtre ${className}`} role="group" aria-label={popis}>
    {moznosti.map((m) => (
      <button
        key={m.kluc}
        type="button"
        aria-pressed={aktivna === m.kluc}
        className={`tb-filter${aktivna === m.kluc ? ' is-aktivny' : ''}`}
        onClick={() => onZmena(m.kluc)}
      >
        {m.nazov}
      </button>
    ))}
  </div>
);

/** Pás záložiek na červenom podklade (tímy na súpiske a pri zápasoch). */
export const PasZaloziek: React.FC<{ children: ReactNode; popis: string }> = ({ children, popis }) => (
  <nav className="tb-pas-zaloziek" aria-label={popis}>
    <div className="tb-kontajner tb-pas-zaloziek__vnutro">{children}</div>
  </nav>
);

// ===== Stavy =====

export const NacitatDalsie: React.FC<{ onClick: () => void; nacitava: boolean }> = ({ onClick, nacitava }) => (
  <div className="tb-dalsie">
    <button type="button" className="tb-tlacidlo-dalsie" onClick={onClick} disabled={nacitava}>
      {nacitava ? 'Načítavam…' : 'Načítať ďalšie'}
    </button>
  </div>
);

export const Nacitava: React.FC<{ text?: string }> = ({ text = 'Načítavam…' }) => (
  <div className="tb-nacitava" role="status">
    <span aria-hidden="true" />
    {text}
  </div>
);

export const Prazdne: React.FC<{ nadpis: string; text?: string; children?: ReactNode }> = ({ nadpis, text, children }) => (
  <div className="tb-prazdne">
    <strong>{nadpis}</strong>
    {text && <p>{text}</p>}
    {children}
  </div>
);

export const Chyba: React.FC<{ text: string }> = ({ text }) => (
  <div className="tb-prazdne tb-prazdne--chyba" role="alert">
    <strong>Niečo sa pokazilo</strong>
    <p>{text}</p>
    <button type="button" className="tb-tlacidlo-dalsie" onClick={() => window.location.reload()}>
      Skúsiť znova
    </button>
  </div>
);

/** Obsah stránky obalený sekciou s bočnými okrajmi (bez hlavičky). */
export const ChybaStranky: React.FC<{ text: string }> = ({ text }) => (
  <div className="tb-sekcia tb-sekcia--hore">
    <div className="tb-kontajner">
      <Chyba text={text} />
    </div>
  </div>
);

// ===== Obrázok =====

export const Obrazok: React.FC<{ src?: string | null; className: string; alt?: string }> = ({ src, className, alt = '' }) => {
  const url = obrazokUrl(src);
  return (
    <span className={`${className} tb-obrazok${url ? '' : ' tb-obrazok--prazdny'}`}>
      {url && <img src={url} alt={alt} loading="lazy" onError={skryObrazok} />}
    </span>
  );
};

// ===== Články =====

export const MetaClanku: React.FC<{ clanok: Clanok }> = ({ clanok }) => (
  <div className="tb-clanok__meta">
    {clanok.kategoria && <span className="tb-clanok__kategoria">{clanok.kategoria.nazov}</span>}
    <span className="tb-clanok__datum">{datum(clanok.publikovany_datum || clanok.vytvoreny)}</span>
  </div>
);

/** Karta článku v mriežke (Novinky, Súvisiace novinky). */
export const KartaClanku: React.FC<{ clanok: Clanok }> = ({ clanok: c }) => (
  <Link to={`/clanek/${c.slug}`} className="tb-karta">
    <Obrazok src={c.obrazok} className="tb-karta__obrazok" />
    <div className="tb-karta__text">
      <h4>{c.nazov}</h4>
      <MetaClanku clanok={c} />
    </div>
  </Link>
);

/** Veľký článok: fotka vľavo, nadpis a „Čítať viac" vpravo. */
export const HlavnyClanok: React.FC<{ clanok: Clanok }> = ({ clanok: c }) => {
  const u = useUpravy();
  return (
  <Link to={`/clanek/${c.slug}`} className="tb-hlavny-clanok">
    <Obrazok src={c.obrazok} className="tb-hlavny-clanok__obrazok" />
    <div className="tb-hlavny-clanok__text">
      <MetaClanku clanok={c} />
      <h2>{c.nazov}</h2>
      <span className="tb-tlacidlo-obrys">
        {u.text('text_citat_viac', 'Čítať viac')}
        <Ikona nazov="sipka" velkost={14} />
      </span>
    </div>
  </Link>
  );
};

// ===== Videá =====

export const nahladVidea = (v: Video) => v.nahlad_url || v.nahlad || null;
export const kategoriaVidea = (v: Video) => (v.kategoria || v.rubrika?.nazov || '').trim();

/** Karta videa: náhľad 16:10, prehrať, dĺžka, nadpis, kategória a dátum. */
export const KartaVidea: React.FC<{ video: Video; onPrehrat: (v: Video) => void }> = ({ video: v, onPrehrat }) => {
  const dlzka = dlzkaVidea(v.dlzka);
  const kategoria = kategoriaVidea(v);
  return (
    <button type="button" className="tb-karta tb-karta--video" onClick={() => onPrehrat(v)} aria-label={`Prehrať video ${v.nazov}`}>
      <span className="tb-karta__obrazok tb-karta__obrazok--video">
        <Obrazok src={nahladVidea(v)} className="tb-video__obrazok" />
        <span className="tb-video__prechod" aria-hidden="true" />
        <span className="tb-video__play" aria-hidden="true">
          <Ikona nazov="play" velkost={20} />
        </span>
        {dlzka && <span className="tb-video__dlzka">{dlzka}</span>}
      </span>
      <span className="tb-karta__text">
        <h4>{v.nazov}</h4>
        <span className="tb-clanok__meta">
          {kategoria && <span className="tb-clanok__kategoria">{kategoria}</span>}
          {v.vytvorene && <span className="tb-clanok__datum">{datum(v.vytvorene)}</span>}
        </span>
      </span>
    </button>
  );
};

// ===== Hráči =====

/** Karta hráča: fotka 3:4, číslo, meno, pozícia a štatistiky. */
/** Štatistiky na karte: brankár má namiesto gólov a asistencií minúty a čisté kontá. */
export const statyHraca = (h: Hrac, st?: StatistikaHraca | null): Array<[number, string]> =>
  h.pozicia === 'brankar'
    ? [
        [st?.zapasy ?? 0, 'Zápasy'],
        [st?.minuty ?? 0, 'Minúty'],
        [st?.ciste_konta ?? 0, 'Č. kontá'],
      ]
    : [
        [st?.zapasy ?? 0, 'Zápasy'],
        [st?.goly ?? 0, 'Góly'],
        [st?.asistencie ?? 0, 'Asist.'],
      ];

export const KartaHraca: React.FC<{ hrac: Hrac; statistika?: StatistikaHraca | null; karty?: boolean }> = ({ hrac: h, statistika: st, karty = false }) => {
  const fotka = obrazokUrl(h.fotka);
  const staty: Array<[number, string]> = [
    ...statyHraca(h, st),
    ...(karty ? ([[st?.zlte_karty ?? 0, 'Karty']] as Array<[number, string]>) : []),
  ];
  return (
    <Link to={`/players/${h.id}`} className="tb-hrac">
      {fotka ? <img src={fotka} alt="" loading="lazy" className="tb-hrac__fotka" onError={skryObrazok} /> : <span className="tb-hrac__silueta" aria-hidden="true" />}
      <span className="tb-hrac__prechod" aria-hidden="true" />
      {h.narodnost && <span className="tb-hrac__narodnost">{h.narodnost}</span>}
      <div className="tb-hrac__spodok">
        <div className="tb-hrac__meno">
          {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <span className="tb-hrac__cislo">{h.cislo_dresu}</span>}
          <div>
            <span className="tb-hrac__krstne">{h.meno}</span>
            <span className="tb-hrac__priezvisko">{h.priezvisko}</span>
          </div>
        </div>
        <span className="tb-hrac__pozicia">{pozicia(h.pozicia) || ' '}</span>
        <div className={`tb-hrac__staty${karty ? '' : ' tb-hrac__staty--3'}`}>
          {staty.map(([hodnota, nazov]) => (
            <div key={nazov}>
              <strong>{hodnota}</strong>
              <span>{nazov}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
};

export const KartaClena: React.FC<{ clen: ClenTimu }> = ({ clen: c }) => {
  const fotka = obrazokUrl(c.fotka);
  return (
    <Link to={`/staff/${c.id}`} className="tb-hrac tb-hrac--clen">
      {fotka ? <img src={fotka} alt="" loading="lazy" className="tb-hrac__fotka" onError={skryObrazok} /> : <span className="tb-hrac__silueta" aria-hidden="true" />}
      <span className="tb-hrac__prechod" aria-hidden="true" />
      <div className="tb-hrac__spodok">
        <div className="tb-hrac__meno">
          <div>
            <span className="tb-hrac__krstne">{c.meno}</span>
            <span className="tb-hrac__priezvisko">{c.priezvisko}</span>
          </div>
        </div>
        <span className="tb-hrac__pozicia tb-hrac__pozicia--posledna">{funkcia(c.funkcia)}</span>
      </div>
    </Link>
  );
};

// ===== Zápas =====

const STAV_KARTY: Record<string, { text: string; trieda: string }> = {
  ukonceny: { text: 'Odohraný', trieda: 'is-odohrany' },
  prebieha: { text: 'Prebieha', trieda: 'is-zivy' },
  odlozeny: { text: 'Odložený', trieda: '' },
  zruseny: { text: 'Zrušený', trieda: '' },
  naplanovany: { text: 'Nadchádzajúci', trieda: '' },
};

/** Karta zápasu (z úvodnej stránky): doma/vonku, dátum, tímy, skóre alebo čas. */
export const KartaZapasu: React.FC<{ zapas: Zapas; vstupenky?: string | null }> = ({ zapas: z, vstupenky }) => {
  const u = useUpravy();
  const { nastavenia } = useNastavenia();
  const stav = stavZapasu(z);
  const odohrany = stav === 'ukonceny' || (stav === 'prebieha' && maVysledok(z));
  const skore = maVysledok(z) && stav !== 'naplanovany';
  const doma = hrameDoma(z);
  const stavText = STAV_KARTY[stav] ?? STAV_KARTY.naplanovany;

  return (
    <article className="tb-zapas">
      <div className="tb-zapas__hlava">
        <span className={`tb-zapas__tag${doma ? ' is-doma' : ''}`}>{doma ? 'Doma' : 'Vonku'}</span>
        <span className="tb-zapas__datum">{datumKratky(z.datum_cas)}</span>
        {z.miesto && <span className="tb-zapas__miesto">{z.miesto}</span>}
        <span className={`tb-zapas__stav ${stavText.trieda}`}>{stavText.text}</span>
      </div>
      <div className="tb-zapas__timy">
        <div className="tb-zapas__tim">
          <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} ton="tmavy" />
          <span className="tb-zapas__nazov">{nazovDomacich(z)}</span>
          {skore && <span className="tb-zapas__skore">{z.goly_domaci}</span>}
        </div>
        <div className="tb-zapas__tim">
          <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} ton="akcent" />
          <span className="tb-zapas__nazov">{nazovHosti(z)}</span>
          {skore && <span className="tb-zapas__skore">{z.goly_hostia}</span>}
        </div>
        {!skore && <span className="tb-zapas__cas">{cas(z.datum_cas)}</span>}
      </div>
      <div className="tb-zapas__ciara" />
      <div className="tb-zapas__akcie">
        {z.video_url && (
          <a href={z.video_url} target="_blank" rel="noopener noreferrer" className="tb-zapas__tlacidlo tb-zapas__tlacidlo--tmave">
            Video
          </a>
        )}
        {!odohrany && vstupenky && (
          <Odkaz to={vstupenky} className="tb-zapas__tlacidlo">
            {u.text('vstupenky_text', 'Vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className={`tb-zapas__tlacidlo${!z.video_url && (odohrany || !vstupenky) ? ' tb-zapas__tlacidlo--tmave' : ''}`}>
          {u.text('text_detail', 'Detail')}
        </Link>
      </div>
    </article>
  );
};

// ===== Partneri =====

export type VelkostLoga = 'velke' | 'stredne' | 'male';

interface UrovenPartnerov {
  id: number;
  nazov: string;
  poradie: number;
  velkost_loga: VelkostLoga;
}

export interface SkupinaPartnerov {
  kluc: string;
  nazov: string | null;
  velkost: VelkostLoga;
  polozky: Partner[];
}

const VELKOSTI: VelkostLoga[] = ['velke', 'stredne', 'male'];
/** Staršie pevné úrovne partnerov (bez úrovne z administrácie). */
const STARE_UROVNE: Record<string, VelkostLoga> = { generalny: 'velke', hlavny: 'velke', partner: 'stredne', dodavatel: 'male' };

/**
 * Partneri zoskupení podľa úrovní z administrácie (Sponzori → Úrovne):
 * v poradí úrovní, každá úroveň vlastný rad s veľkosťou loga podľa
 * nastavenia úrovne. Partneri bez úrovne sú na konci.
 */
export const useSkupinyPartnerov = (partneri: Partner[]): SkupinaPartnerov[] => {
  const urovne = useApi<UrovenPartnerov[]>(partneri.length ? '/sponsor-levels' : null);
  return useMemo(() => {
    const zoradene = [...(urovne.data ?? [])].sort((a, b) => a.poradie - b.poradie || a.id - b.id);
    const skupiny: SkupinaPartnerov[] = zoradene.map((u) => ({
      kluc: `u${u.id}`,
      nazov: u.nazov,
      velkost: VELKOSTI.includes(u.velkost_loga) ? u.velkost_loga : 'stredne',
      polozky: partneri.filter((p) => p.uroven_id === u.id),
    }));
    // Bez úrovne: podľa staršieho označenia (generálny/hlavný = veľké logo), inak stredné
    const bezUrovne = partneri.filter((p) => !p.uroven_id || !zoradene.some((u) => u.id === p.uroven_id));
    for (const velkost of VELKOSTI) {
      const polozky = bezUrovne.filter((p) => (STARE_UROVNE[p.uroven ?? ''] ?? 'stredne') === velkost);
      if (polozky.length) skupiny.push({ kluc: `bez-${velkost}`, nazov: null, velkost, polozky });
    }
    return skupiny.filter((g) => g.polozky.length > 0);
  }, [partneri, urovne.data]);
};

export const LogoPartnera: React.FC<{ partner: Partner; velke?: boolean; velkost?: VelkostLoga }> = ({ partner: p, velke = false, velkost }) => {
  const logo = obrazokUrl(p.logo);
  const obsah = logo ? <img src={logo} alt={p.nazov} loading="lazy" onError={skryObrazok} /> : <span>{p.nazov}</span>;
  const v = velkost ?? (velke ? 'velke' : 'stredne');
  const trieda = `tb-partner tb-partner--${v}${v === 'velke' ? ' tb-partner--velky' : ''}`;
  return p.web_url ? (
    <a href={p.web_url} target="_blank" rel="noopener noreferrer" className={trieda} title={p.nazov}>
      {obsah}
    </a>
  ) : (
    <span className={trieda} title={p.nazov}>
      {obsah}
    </span>
  );
};

/** Rady partnerov po úrovniach (pyramída bez nadpisov) - na úvode, na spodku podstránok aj v bloku stránky. */
export const RadyPartnerov: React.FC<{ partneri: Partner[] }> = ({ partneri }) => {
  const skupiny = useSkupinyPartnerov(partneri);
  return (
    <div className="tb-partneri__rady">
      {skupiny.map((g) => (
        <div key={g.kluc} className={`tb-partneri__rad tb-partneri__rad--${g.velkost}`}>
          {g.polozky.map((p) => (
            <LogoPartnera key={p.id} partner={p} velkost={g.velkost} />
          ))}
        </div>
      ))}
    </div>
  );
};

/** Partneri: rad za radom podľa úrovní partnerstva a veľkosti loga z administrácie. */
export const Partneri: React.FC<{ partneri: Partner[] }> = ({ partneri }) => {
  const u = useUpravy();
  if (partneri.length === 0) return null;
  return (
    <section className="tb-sekcia tb-partneri" aria-label="Partneri">
      <div className="tb-kontajner">
        <NadpisStredovy nadpis={u.text('partneri_nadpis', 'Partneri')} />
        <RadyPartnerov partneri={partneri} />
        <Link to="/sponzori" className="tb-partneri__vsetci">
          {u.text('text_vsetci_partneri', 'Všetci partneri')}
        </Link>
      </div>
    </section>
  );
};

/** Partneri na spodku podstránky - riadi ich nastavenie „Ukázať partnerov". */
export const PartneriStranky: React.FC = () => {
  const s = useNastaveniaSablony<{ ukazat_partnerov: boolean }>();
  const partneri = useApi<Partner[]>(s.ukazat_partnerov === false ? null : '/sponsors?limit=500');
  return <Partneri partneri={partneri.data ?? []} />;
};

// ===== Tabuľka súťaže =====

/** Forma tímu: posledné zápasy ako farebné štvorčeky (W/D/L alebo V/R/P). */
export const Forma: React.FC<{ forma?: string | null }> = ({ forma }) => {
  if (!forma) return null;
  const znaky = forma.toUpperCase().replace(/[^WDLVRP]/g, '').slice(-5).split('');
  const typ = (z: string) => (z === 'W' || z === 'V' ? 'V' : z === 'D' || z === 'R' ? 'R' : 'P');
  const popis: Record<string, string> = { V: 'Výhra', R: 'Remíza', P: 'Prehra' };
  return (
    <span className="tb-forma">
      {znaky.map((z, i) => (
        <span key={i} className={`tb-forma__znak tb-forma__znak--${typ(z)}`} title={popis[typ(z)]}>
          {typ(z)}
        </span>
      ))}
    </span>
  );
};

/** Tabuľka súťaže v štýle tabuľky sezóny z profilu hráča (tmavá hlavička). */
export const TabulkaSutaze: React.FC<{
  riadky: RiadokTabulky[];
  zvyraznitTim?: number | null;
  kompaktna?: boolean;
  forma?: boolean;
  lenBody?: boolean;
}> = ({ riadky, zvyraznitTim, kompaktna = false, forma = true, lenBody = false }) => {
  const nazov = (r: RiadokTabulky) => r.tim_nazov || r.custom_tim_nazov || 'Tím';
  const logo = (r: RiadokTabulky) => r.tim_logo || r.custom_tim_logo || null;
  const plna = !kompaktna && !lenBody;
  return (
    <div className="tb-tabulka-obal">
      <table className="tb-tabulka tb-tabulka--sutaz">
        <thead>
          <tr>
            <th className="tb-tabulka__poz">#</th>
            <th className="tb-tabulka__tim">Tím</th>
            <th title="Zápasy">Z</th>
            {plna && (
              <>
                <th title="Výhry" className="tb-tabulka__volitelne">V</th>
                <th title="Remízy" className="tb-tabulka__volitelne">R</th>
                <th title="Prehry" className="tb-tabulka__volitelne">P</th>
              </>
            )}
            {!lenBody && <th>Skóre</th>}
            <th title="Body">B</th>
            {plna && forma && <th className="tb-tabulka__forma">Forma</th>}
          </tr>
        </thead>
        <tbody>
          {riadky.map((r) => (
            <tr key={r.id} className={zvyraznitTim && r.tim_id === zvyraznitTim ? 'is-nas' : ''}>
              <td className="tb-tabulka__poz">{r.pozicia}</td>
              <td className="tb-tabulka__tim">
                <span>
                  <Erb nazov={nazov(r)} logo={logo(r)} />
                  <span className="tb-tabulka__nazov">{nazov(r)}</span>
                </span>
              </td>
              <td>{r.zapasy}</td>
              {plna && (
                <>
                  <td className="tb-tabulka__volitelne">{r.vitazstva}</td>
                  <td className="tb-tabulka__volitelne">{r.remizy}</td>
                  <td className="tb-tabulka__volitelne">{r.prehry}</td>
                </>
              )}
              {!lenBody && (
                <td>
                  {r.goly_za}:{r.goly_proti}
                </td>
              )}
              <td className="tb-tabulka__body">{r.body}</td>
              {plna && forma && (
                <td className="tb-tabulka__forma">
                  <Forma forma={r.forma} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Výrez tabuľky okolo nášho tímu - najviac `pocet` riadkov. */
export const vyrezTabulky = (riadky: RiadokTabulky[], timId: number | null | undefined, pocet = 6) => {
  if (riadky.length <= pocet) return riadky;
  const index = timId ? riadky.findIndex((r) => r.tim_id === timId) : -1;
  if (index < 0) return riadky.slice(0, pocet);
  const zaciatok = Math.max(0, Math.min(index - Math.floor(pocet / 2), riadky.length - pocet));
  return riadky.slice(zaciatok, zaciatok + pocet);
};

/** Mriežka kariet s bočnými okrajmi stránky. */
export const Sekcia: React.FC<{ children: ReactNode; className?: string; ariaLabel?: string; id?: string }> = ({ children, className = '', ariaLabel, id }) => (
  <section className={`tb-sekcia ${className}`} aria-label={ariaLabel} id={id}>
    <div className="tb-kontajner">{children}</div>
  </section>
);

// ===== Prehrávač videa (okno) =====

/** Adresa prehrávača YouTube (bez cookies) alebo Vimeo; iné zdroje sa otvoria v novom okne. */
export const embedVidea = (v: Video) => {
  if (v.zdroj === 'youtube' && v.video_id) return `https://www.youtube-nocookie.com/embed/${v.video_id}?autoplay=1&rel=0`;
  if (v.zdroj === 'vimeo' && v.video_id) return `https://player.vimeo.com/video/${v.video_id}?autoplay=1`;
  return null;
};

/** Otvorí video: vložiteľné v okne, ostatné na stránke zdroja. */
export const useOknoVidea = () => {
  const [video, setVideo] = React.useState<Video | null>(null);
  const otvor = React.useCallback((v: Video) => {
    if (!embedVidea(v)) {
      window.open(v.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setVideo(v);
  }, []);
  const okno = video ? <OknoVidea video={video} onZavriet={() => setVideo(null)} /> : null;
  return { otvor, okno };
};

/** Okno s prehrávačom (podľa návrhu Videá): tmavé pozadie, 16:9, nadpis a kategória. */
export const OknoVidea: React.FC<{ video: Video; onZavriet: () => void }> = ({ video: v, onZavriet }) => {
  const zavriet = React.useRef<HTMLButtonElement>(null);
  const url = embedVidea(v);
  const dlzka = dlzkaVidea(v.dlzka);
  const kategoria = kategoriaVidea(v);

  React.useEffect(() => {
    const predtym = document.activeElement as HTMLElement | null;
    const klaves = (e: KeyboardEvent) => e.key === 'Escape' && onZavriet();
    window.addEventListener('keydown', klaves);
    document.body.classList.add('tb-bez-posunu');
    zavriet.current?.focus();
    return () => {
      window.removeEventListener('keydown', klaves);
      document.body.classList.remove('tb-bez-posunu');
      predtym?.focus?.();
    };
  }, [onZavriet]);

  return (
    <div className="tb-okno" role="dialog" aria-modal="true" aria-label={v.nazov} onClick={onZavriet}>
      <div className="tb-okno__box" onClick={(e) => e.stopPropagation()}>
        <button ref={zavriet} type="button" className="tb-okno__zavriet" onClick={onZavriet} aria-label="Zavrieť">
          <Ikona nazov="zavriet" velkost={18} />
        </button>
        <div className="tb-okno__media">
          {url && (
            <iframe
              src={url}
              title={v.nazov}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
        <div className="tb-okno__info">
          <h3>{v.nazov}</h3>
          <div className="tb-clanok__meta">
            {kategoria && <span className="tb-clanok__kategoria">{kategoria}</span>}
            {dlzka && <span className="tb-okno__dlzka">{dlzka}</span>}
            {v.zapas && (
              <Link to={`/matches/${v.zapas.id}`} className="tb-okno__odkaz" onClick={onZavriet}>
                Detail zápasu
              </Link>
            )}
          </div>
          {v.popis && <p className="tb-okno__popis">{v.popis}</p>}
        </div>
      </div>
    </div>
  );
};
