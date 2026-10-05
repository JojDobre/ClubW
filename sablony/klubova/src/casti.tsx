// Umiestnenie: sablony/klubova/src/casti.tsx
// Časti, ktoré sa opakujú na viacerých stránkach šablóny Klubová:
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
  <header className={`kl-hlava ${className}`}>
    <div className="kl-kontajner">
      {spat && (
        <Link to={spat.odkaz} className="kl-spat">
          <Ikona nazov="vlavo" velkost={14} /> {spat.text}
        </Link>
      )}
      {stitok && <span className="kl-hlava__stitok">{stitok}</span>}
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
  <div className={`kl-filtre ${className}`} role="group" aria-label={popis}>
    {moznosti.map((m) => (
      <button
        key={m.kluc}
        type="button"
        aria-pressed={aktivna === m.kluc}
        className={`kl-filter${aktivna === m.kluc ? ' is-aktivny' : ''}`}
        onClick={() => onZmena(m.kluc)}
      >
        {m.nazov}
      </button>
    ))}
  </div>
);

/** Pás záložiek na červenom podklade (tímy na súpiske a pri zápasoch). */
export const PasZaloziek: React.FC<{ children: ReactNode; popis: string }> = ({ children, popis }) => (
  <nav className="kl-pas-zaloziek" aria-label={popis}>
    <div className="kl-kontajner kl-pas-zaloziek__vnutro">{children}</div>
  </nav>
);

// ===== Stavy =====

export const NacitatDalsie: React.FC<{ onClick: () => void; nacitava: boolean }> = ({ onClick, nacitava }) => (
  <div className="kl-dalsie">
    <button type="button" className="kl-tlacidlo-dalsie" onClick={onClick} disabled={nacitava}>
      {nacitava ? 'Načítavam…' : 'Načítať ďalšie'}
    </button>
  </div>
);

export const Nacitava: React.FC<{ text?: string }> = ({ text = 'Načítavam…' }) => (
  <div className="kl-nacitava" role="status">
    <span aria-hidden="true" />
    {text}
  </div>
);

export const Prazdne: React.FC<{ nadpis: string; text?: string; children?: ReactNode }> = ({ nadpis, text, children }) => (
  <div className="kl-prazdne">
    <strong>{nadpis}</strong>
    {text && <p>{text}</p>}
    {children}
  </div>
);

export const Chyba: React.FC<{ text: string }> = ({ text }) => (
  <div className="kl-prazdne kl-prazdne--chyba" role="alert">
    <strong>Niečo sa pokazilo</strong>
    <p>{text}</p>
    <button type="button" className="kl-tlacidlo-dalsie" onClick={() => window.location.reload()}>
      Skúsiť znova
    </button>
  </div>
);

/** Obsah stránky obalený sekciou s bočnými okrajmi (bez hlavičky). */
export const ChybaStranky: React.FC<{ text: string }> = ({ text }) => (
  <div className="kl-sekcia kl-sekcia--hore">
    <div className="kl-kontajner">
      <Chyba text={text} />
    </div>
  </div>
);

// ===== Obrázok =====

export const Obrazok: React.FC<{ src?: string | null; className: string; alt?: string }> = ({ src, className, alt = '' }) => {
  const url = obrazokUrl(src);
  return (
    <span className={`${className} kl-obrazok${url ? '' : ' kl-obrazok--prazdny'}`}>
      {url && <img src={url} alt={alt} loading="lazy" onError={skryObrazok} />}
    </span>
  );
};

// ===== Články =====

export const MetaClanku: React.FC<{ clanok: Clanok }> = ({ clanok }) => (
  <div className="kl-clanok__meta">
    {clanok.kategoria && <span className="kl-clanok__kategoria">{clanok.kategoria.nazov}</span>}
    <span className="kl-clanok__datum">{datum(clanok.publikovany_datum || clanok.vytvoreny)}</span>
  </div>
);

/** Karta článku v mriežke (Novinky, Súvisiace novinky). */
export const KartaClanku: React.FC<{ clanok: Clanok }> = ({ clanok: c }) => (
  <Link to={`/clanek/${c.slug}`} className="kl-karta">
    <Obrazok src={c.obrazok} className="kl-karta__obrazok" />
    <div className="kl-karta__text">
      <h4>{c.nazov}</h4>
      <MetaClanku clanok={c} />
    </div>
  </Link>
);

/** Veľký článok: fotka vľavo, nadpis a „Čítať viac" vpravo. */
export const HlavnyClanok: React.FC<{ clanok: Clanok }> = ({ clanok: c }) => {
  const u = useUpravy();
  return (
  <Link to={`/clanek/${c.slug}`} className="kl-hlavny-clanok">
    <Obrazok src={c.obrazok} className="kl-hlavny-clanok__obrazok" />
    <div className="kl-hlavny-clanok__text">
      <MetaClanku clanok={c} />
      <h2>{c.nazov}</h2>
      <span className="kl-tlacidlo-obrys">
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
    <button type="button" className="kl-karta kl-karta--video" onClick={() => onPrehrat(v)} aria-label={`Prehrať video ${v.nazov}`}>
      <span className="kl-karta__obrazok kl-karta__obrazok--video">
        <Obrazok src={nahladVidea(v)} className="kl-video__obrazok" />
        <span className="kl-video__prechod" aria-hidden="true" />
        <span className="kl-video__play" aria-hidden="true">
          <Ikona nazov="play" velkost={20} />
        </span>
        {dlzka && <span className="kl-video__dlzka">{dlzka}</span>}
      </span>
      <span className="kl-karta__text">
        <h4>{v.nazov}</h4>
        <span className="kl-clanok__meta">
          {kategoria && <span className="kl-clanok__kategoria">{kategoria}</span>}
          {v.vytvorene && <span className="kl-clanok__datum">{datum(v.vytvorene)}</span>}
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
    <Link to={`/players/${h.id}`} className="kl-hrac">
      {fotka ? <img src={fotka} alt="" loading="lazy" className="kl-hrac__fotka" onError={skryObrazok} /> : <span className="kl-hrac__silueta" aria-hidden="true" />}
      <span className="kl-hrac__prechod" aria-hidden="true" />
      {h.narodnost && <span className="kl-hrac__narodnost">{h.narodnost}</span>}
      <div className="kl-hrac__spodok">
        <div className="kl-hrac__meno">
          {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <span className="kl-hrac__cislo">{h.cislo_dresu}</span>}
          <div>
            <span className="kl-hrac__krstne">{h.meno}</span>
            <span className="kl-hrac__priezvisko">{h.priezvisko}</span>
          </div>
        </div>
        <span className="kl-hrac__pozicia">{pozicia(h.pozicia) || ' '}</span>
        <div className={`kl-hrac__staty${karty ? '' : ' kl-hrac__staty--3'}`}>
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
    <Link to={`/staff/${c.id}`} className="kl-hrac kl-hrac--clen">
      {fotka ? <img src={fotka} alt="" loading="lazy" className="kl-hrac__fotka" onError={skryObrazok} /> : <span className="kl-hrac__silueta" aria-hidden="true" />}
      <span className="kl-hrac__prechod" aria-hidden="true" />
      <div className="kl-hrac__spodok">
        <div className="kl-hrac__meno">
          <div>
            <span className="kl-hrac__krstne">{c.meno}</span>
            <span className="kl-hrac__priezvisko">{c.priezvisko}</span>
          </div>
        </div>
        <span className="kl-hrac__pozicia kl-hrac__pozicia--posledna">{funkcia(c.funkcia)}</span>
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
    <article className="kl-zapas">
      <div className="kl-zapas__hlava">
        <span className={`kl-zapas__tag${doma ? ' is-doma' : ''}`}>{doma ? 'Doma' : 'Vonku'}</span>
        <span className="kl-zapas__datum">{datumKratky(z.datum_cas)}</span>
        {z.miesto && <span className="kl-zapas__miesto">{z.miesto}</span>}
        <span className={`kl-zapas__stav ${stavText.trieda}`}>{stavText.text}</span>
      </div>
      <div className="kl-zapas__timy">
        <div className="kl-zapas__tim">
          <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} ton="tmavy" />
          <span className="kl-zapas__nazov">{nazovDomacich(z)}</span>
          {skore && <span className="kl-zapas__skore">{z.goly_domaci}</span>}
        </div>
        <div className="kl-zapas__tim">
          <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} ton="akcent" />
          <span className="kl-zapas__nazov">{nazovHosti(z)}</span>
          {skore && <span className="kl-zapas__skore">{z.goly_hostia}</span>}
        </div>
        {/* Odohraný zápas bez zadaného výsledku neukazuje čas výkopu (vyzeralo by to ako skóre) */}
        {!skore && <span className="kl-zapas__cas">{stav === 'ukonceny' ? '–:–' : cas(z.datum_cas)}</span>}
      </div>
      <div className="kl-zapas__ciara" />
      <div className="kl-zapas__akcie">
        {z.video_url && (
          <a href={z.video_url} target="_blank" rel="noopener noreferrer" className="kl-zapas__tlacidlo kl-zapas__tlacidlo--tmave">
            Video
          </a>
        )}
        {!odohrany && vstupenky && (
          <Odkaz to={vstupenky} className="kl-zapas__tlacidlo">
            {u.text('vstupenky_text', 'Vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className={`kl-zapas__tlacidlo${!z.video_url && (odohrany || !vstupenky) ? ' kl-zapas__tlacidlo--tmave' : ''}`}>
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
  const trieda = `kl-partner kl-partner--${v}${v === 'velke' ? ' kl-partner--velky' : ''}`;
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
    <div className="kl-partneri__rady">
      {skupiny.map((g) => (
        <div key={g.kluc} className={`kl-partneri__rad kl-partneri__rad--${g.velkost}`}>
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
    <section className="kl-sekcia kl-partneri" aria-label="Partneri">
      <div className="kl-kontajner">
        <NadpisStredovy nadpis={u.text('partneri_nadpis', 'Partneri')} />
        <RadyPartnerov partneri={partneri} />
        <Link to="/sponzori" className="kl-partneri__vsetci">
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
    <span className="kl-forma">
      {znaky.map((z, i) => (
        <span key={i} className={`kl-forma__znak kl-forma__znak--${typ(z)}`} title={popis[typ(z)]}>
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
    <div className="kl-tabulka-obal">
      <table className="kl-tabulka kl-tabulka--sutaz">
        <thead>
          <tr>
            <th className="kl-tabulka__poz">#</th>
            <th className="kl-tabulka__tim">Tím</th>
            {!lenBody && <th title="Zápasy">Z</th>}
            {plna && (
              <>
                <th title="Výhry" className="kl-tabulka__volitelne">V</th>
                <th title="Remízy" className="kl-tabulka__volitelne">R</th>
                <th title="Prehry" className="kl-tabulka__volitelne">P</th>
              </>
            )}
            {!lenBody && <th>Skóre</th>}
            <th title="Body">B</th>
            {plna && forma && <th className="kl-tabulka__forma">Forma</th>}
          </tr>
        </thead>
        <tbody>
          {riadky.map((r) => (
            <tr key={r.id} className={zvyraznitTim && r.tim_id === zvyraznitTim ? 'is-nas' : ''}>
              <td className="kl-tabulka__poz">{r.pozicia}</td>
              <td className="kl-tabulka__tim">
                <span>
                  <Erb nazov={nazov(r)} logo={logo(r)} />
                  <span className="kl-tabulka__nazov">{nazov(r)}</span>
                </span>
              </td>
              {!lenBody && <td>{r.zapasy}</td>}
              {plna && (
                <>
                  <td className="kl-tabulka__volitelne">{r.vitazstva}</td>
                  <td className="kl-tabulka__volitelne">{r.remizy}</td>
                  <td className="kl-tabulka__volitelne">{r.prehry}</td>
                </>
              )}
              {!lenBody && (
                <td>
                  {r.goly_za}:{r.goly_proti}
                </td>
              )}
              <td className="kl-tabulka__body">{r.body}</td>
              {plna && forma && (
                <td className="kl-tabulka__forma">
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
  <section className={`kl-sekcia ${className}`} aria-label={ariaLabel} id={id}>
    <div className="kl-kontajner">{children}</div>
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
    document.body.classList.add('kl-bez-posunu');
    zavriet.current?.focus();
    return () => {
      window.removeEventListener('keydown', klaves);
      document.body.classList.remove('kl-bez-posunu');
      predtym?.focus?.();
    };
  }, [onZavriet]);

  return (
    <div className="kl-okno" role="dialog" aria-modal="true" aria-label={v.nazov} onClick={onZavriet}>
      <div className="kl-okno__box" onClick={(e) => e.stopPropagation()}>
        <button ref={zavriet} type="button" className="kl-okno__zavriet" onClick={onZavriet} aria-label="Zavrieť">
          <Ikona nazov="zavriet" velkost={18} />
        </button>
        <div className="kl-okno__media">
          {url && (
            <iframe
              src={url}
              title={v.nazov}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
        <div className="kl-okno__info">
          <h3>{v.nazov}</h3>
          <div className="kl-clanok__meta">
            {kategoria && <span className="kl-clanok__kategoria">{kategoria}</span>}
            {dlzka && <span className="kl-okno__dlzka">{dlzka}</span>}
            {v.zapas && (
              <Link to={`/matches/${v.zapas.id}`} className="kl-okno__odkaz" onClick={onZavriet}>
                Detail zápasu
              </Link>
            )}
          </div>
          {v.popis && <p className="kl-okno__popis">{v.popis}</p>}
        </div>
      </div>
    </div>
  );
};

// ===== Odkaz klubu (karta s rámom, textom a ikonou) =====

/** Obrysy tvarov, ktoré sa nedajú nakresliť zaoblením rohov. */
const OBRYSY_ODKAZU: Record<string, { viewBox: string; d: string }> = {
  stit: { viewBox: '0 0 100 120', d: 'M50 2 L97 15 V57 C97 88 76 107 50 118 C24 107 3 88 3 57 V15 Z' },
  sestuholnik: { viewBox: '0 0 100 115', d: 'M50 1.5 L98.5 29.5 V85.5 L50 113.5 L1.5 85.5 V29.5 Z' },
};
export const TVARY_ODKAZU = ['oval', 'kruh', 'stvorec', 'stit', 'sestuholnik', 'bez'];

/**
 * Obrázok karty „Odkaz klubu": čiernobiela fotka s farebným tónom
 * a uprostred rám (ovál, kruh, štít…) s malým textom, ikonou a názvom.
 * Tvar, text nad názvom a farbu ikon určujú nastavenia šablóny.
 */
export const ObrazOdkazu: React.FC<{ obrazok: string | null; ton: string; nazov: string; stitok?: string | null; ikona?: string | null }> = ({
  obrazok,
  ton,
  nazov,
  stitok,
  ikona,
}) => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<Record<string, string | number | boolean | null>>();
  const tvar = TVARY_ODKAZU.includes(String(s.odkazy_tvar)) ? String(s.odkazy_tvar) : 'oval';
  const obrys = OBRYSY_ODKAZU[tvar];
  const ukazatStitok = s.odkazy_ukazat_stitok !== false;
  const spolocny = String(s.odkazy_stitok || '').trim().replace(/\{klub\}/g, nastavenia.nazov);
  const text = ukazatStitok ? String(stitok || '').trim() || spolocny || nastavenia.skratka || nastavenia.nazov : '';
  const urlIkony = obrazokUrl(ikona);
  const farbit = s.odkazy_farbit_ikony !== false;
  const farba = String(s.odkazy_farba_ikon || '').trim() || '#ffffff';
  return (
    <div className="kl-odkaz-karta__obraz">
      <Obrazok src={obrazok} className="kl-odkaz-karta__fotka" />
      <span className="kl-odkaz-karta__ton" style={{ background: ton }} aria-hidden="true" />
      <span className={`kl-odkaz-karta__oval kl-odkaz-karta__oval--${tvar}`} aria-hidden="true">
        {obrys && (
          <svg className="kl-odkaz-karta__obrys" viewBox={obrys.viewBox} preserveAspectRatio="none">
            <path d={obrys.d} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {urlIkony &&
          (farbit ? (
            <span
              className="kl-odkaz-karta__ikona"
              style={{ background: farba, WebkitMaskImage: `url("${urlIkony}")`, maskImage: `url("${urlIkony}")` } as React.CSSProperties}
            />
          ) : (
            <img className="kl-odkaz-karta__ikona" src={urlIkony} alt="" loading="lazy" />
          ))}
        {text && <small>{text}</small>}
        <strong>{nazov}</strong>
      </span>
    </div>
  );
};
