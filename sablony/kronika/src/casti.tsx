// Umiestnenie: sablony/kronika/src/casti.tsx
// Časti, ktoré sa opakujú na viacerých stránkach šablóny Kronika�:
// tmavá hlavička podstránky, filtre (pilulky), „Načítať ďalšie", stavy
// načítania, karty článku / hráča / zápasu / videa, partneri a tabuľka.
// Rozmery a písma zodpovedajú návrhom z Claude Design (News, Videá,
// Fotogaléria, Súpiska, Profil hráča).

import React, { type ReactNode } from 'react';
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
  <header className={`kr-hlava ${className}`}>
    <div className="kr-kontajner">
      {spat && (
        <Link to={spat.odkaz} className="kr-spat">
          <Ikona nazov="vlavo" velkost={14} /> {spat.text}
        </Link>
      )}
      {stitok && <span className="kr-hlava__stitok">{stitok}</span>}
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
  <div className={`kr-filtre ${className}`} role="group" aria-label={popis}>
    {moznosti.map((m) => (
      <button
        key={m.kluc}
        type="button"
        aria-pressed={aktivna === m.kluc}
        className={`kr-filter${aktivna === m.kluc ? ' is-aktivny' : ''}`}
        onClick={() => onZmena(m.kluc)}
      >
        {m.nazov}
      </button>
    ))}
  </div>
);

/** Pás záložiek na červenom podklade (tímy na súpiske a pri zápasoch). */
export const PasZaloziek: React.FC<{ children: ReactNode; popis: string }> = ({ children, popis }) => (
  <nav className="kr-pas-zaloziek" aria-label={popis}>
    <div className="kr-kontajner kr-pas-zaloziek__vnutro">{children}</div>
  </nav>
);

// ===== Stavy =====

export const NacitatDalsie: React.FC<{ onClick: () => void; nacitava: boolean }> = ({ onClick, nacitava }) => (
  <div className="kr-dalsie">
    <button type="button" className="kr-tlacidlo-dalsie" onClick={onClick} disabled={nacitava}>
      {nacitava ? 'Načítavam…' : 'Načítať ďalšie'}
    </button>
  </div>
);

export const Nacitava: React.FC<{ text?: string }> = ({ text = 'Načítavam…' }) => (
  <div className="kr-nacitava" role="status">
    <span aria-hidden="true" />
    {text}
  </div>
);

export const Prazdne: React.FC<{ nadpis: string; text?: string; children?: ReactNode }> = ({ nadpis, text, children }) => (
  <div className="kr-prazdne">
    <strong>{nadpis}</strong>
    {text && <p>{text}</p>}
    {children}
  </div>
);

export const Chyba: React.FC<{ text: string }> = ({ text }) => (
  <div className="kr-prazdne kr-prazdne--chyba" role="alert">
    <strong>Niečo sa pokazilo</strong>
    <p>{text}</p>
    <button type="button" className="kr-tlacidlo-dalsie" onClick={() => window.location.reload()}>
      Skúsiť znova
    </button>
  </div>
);

/** Obsah stránky obalený sekciou s bočnými okrajmi (bez hlavičky). */
export const ChybaStranky: React.FC<{ text: string }> = ({ text }) => (
  <div className="kr-sekcia kr-sekcia--hore">
    <div className="kr-kontajner">
      <Chyba text={text} />
    </div>
  </div>
);

// ===== Obrázok =====

export const Obrazok: React.FC<{ src?: string | null; className: string; alt?: string }> = ({ src, className, alt = '' }) => {
  const url = obrazokUrl(src);
  return (
    <span className={`${className} kr-obrazok${url ? '' : ' kr-obrazok--prazdny'}`}>
      {url && <img src={url} alt={alt} loading="lazy" onError={skryObrazok} />}
    </span>
  );
};

// ===== Články =====

export const MetaClanku: React.FC<{ clanok: Clanok }> = ({ clanok }) => (
  <div className="kr-clanok__meta">
    {clanok.kategoria && <span className="kr-clanok__kategoria">{clanok.kategoria.nazov}</span>}
    <span className="kr-clanok__datum">{datum(clanok.publikovany_datum || clanok.vytvoreny)}</span>
  </div>
);

/** Karta článku v mriežke (Novinky, Súvisiace novinky). */
export const KartaClanku: React.FC<{ clanok: Clanok }> = ({ clanok: c }) => (
  <Link to={`/clanek/${c.slug}`} className="kr-karta">
    <Obrazok src={c.obrazok} className="kr-karta__obrazok" />
    <div className="kr-karta__text">
      <h4>{c.nazov}</h4>
      <MetaClanku clanok={c} />
    </div>
  </Link>
);

/** Veľký článok: fotka vľavo, nadpis a „Čítať viac" vpravo. */
export const HlavnyClanok: React.FC<{ clanok: Clanok }> = ({ clanok: c }) => {
  const u = useUpravy();
  return (
  <Link to={`/clanek/${c.slug}`} className="kr-hlavny-clanok">
    <Obrazok src={c.obrazok} className="kr-hlavny-clanok__obrazok" />
    <div className="kr-hlavny-clanok__text">
      <MetaClanku clanok={c} />
      <h2>{c.nazov}</h2>
      <span className="kr-tlacidlo-obrys">
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
    <button type="button" className="kr-karta kr-karta--video" onClick={() => onPrehrat(v)} aria-label={`Prehrať video ${v.nazov}`}>
      <span className="kr-karta__obrazok kr-karta__obrazok--video">
        <Obrazok src={nahladVidea(v)} className="kr-video__obrazok" />
        <span className="kr-video__prechod" aria-hidden="true" />
        <span className="kr-video__play" aria-hidden="true">
          <Ikona nazov="play" velkost={20} />
        </span>
        {dlzka && <span className="kr-video__dlzka">{dlzka}</span>}
      </span>
      <span className="kr-karta__text">
        <h4>{v.nazov}</h4>
        <span className="kr-clanok__meta">
          {kategoria && <span className="kr-clanok__kategoria">{kategoria}</span>}
          {v.vytvorene && <span className="kr-clanok__datum">{datum(v.vytvorene)}</span>}
        </span>
      </span>
    </button>
  );
};

// ===== Hráči =====

/** Karta hráča: fotka 3:4, číslo, meno, pozícia a štatistiky. */
export const KartaHraca: React.FC<{ hrac: Hrac; statistika?: StatistikaHraca | null; karty?: boolean }> = ({ hrac: h, statistika: st, karty = false }) => {
  const fotka = obrazokUrl(h.fotka);
  const staty: Array<[number, string]> = [
    [st?.zapasy ?? 0, 'Zápasy'],
    [st?.goly ?? 0, 'Góly'],
    [st?.asistencie ?? 0, 'Asist.'],
    ...(karty ? ([[st?.zlte_karty ?? 0, 'Karty']] as Array<[number, string]>) : []),
  ];
  return (
    <Link to={`/players/${h.id}`} className="kr-hrac">
      {fotka ? <img src={fotka} alt="" loading="lazy" className="kr-hrac__fotka" onError={skryObrazok} /> : <span className="kr-hrac__silueta" aria-hidden="true" />}
      <span className="kr-hrac__prechod" aria-hidden="true" />
      {h.narodnost && <span className="kr-hrac__narodnost">{h.narodnost}</span>}
      <div className="kr-hrac__spodok">
        <div className="kr-hrac__meno">
          {h.cislo_dresu !== null && h.cislo_dresu !== undefined && <span className="kr-hrac__cislo">{h.cislo_dresu}</span>}
          <div>
            <span className="kr-hrac__krstne">{h.meno}</span>
            <span className="kr-hrac__priezvisko">{h.priezvisko}</span>
          </div>
        </div>
        <span className="kr-hrac__pozicia">{pozicia(h.pozicia) || ' '}</span>
        <div className={`kr-hrac__staty${karty ? '' : ' kr-hrac__staty--3'}`}>
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
    <Link to={`/staff/${c.id}`} className="kr-hrac kr-hrac--clen">
      {fotka ? <img src={fotka} alt="" loading="lazy" className="kr-hrac__fotka" onError={skryObrazok} /> : <span className="kr-hrac__silueta" aria-hidden="true" />}
      <span className="kr-hrac__prechod" aria-hidden="true" />
      <div className="kr-hrac__spodok">
        <div className="kr-hrac__meno">
          <div>
            <span className="kr-hrac__krstne">{c.meno}</span>
            <span className="kr-hrac__priezvisko">{c.priezvisko}</span>
          </div>
        </div>
        <span className="kr-hrac__pozicia kr-hrac__pozicia--posledna">{funkcia(c.funkcia)}</span>
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
    <article className="kr-zapas">
      <div className="kr-zapas__hlava">
        <span className={`kr-zapas__tag${doma ? ' is-doma' : ''}`}>{doma ? 'Doma' : 'Vonku'}</span>
        <span className="kr-zapas__datum">{datumKratky(z.datum_cas)}</span>
        {z.miesto && <span className="kr-zapas__miesto">{z.miesto}</span>}
        <span className={`kr-zapas__stav ${stavText.trieda}`}>{stavText.text}</span>
      </div>
      <div className="kr-zapas__timy">
        <div className="kr-zapas__tim">
          <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} ton="tmavy" />
          <span className="kr-zapas__nazov">{nazovDomacich(z)}</span>
          {skore && <span className="kr-zapas__skore">{z.goly_domaci}</span>}
        </div>
        <div className="kr-zapas__tim">
          <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} ton="akcent" />
          <span className="kr-zapas__nazov">{nazovHosti(z)}</span>
          {skore && <span className="kr-zapas__skore">{z.goly_hostia}</span>}
        </div>
        {!skore && <span className="kr-zapas__cas">{cas(z.datum_cas)}</span>}
      </div>
      <div className="kr-zapas__ciara" />
      <div className="kr-zapas__akcie">
        {z.video_url && (
          <a href={z.video_url} target="_blank" rel="noopener noreferrer" className="kr-zapas__tlacidlo kr-zapas__tlacidlo--tmave">
            Video
          </a>
        )}
        {!odohrany && vstupenky && (
          <Odkaz to={vstupenky} className="kr-zapas__tlacidlo">
            {u.text('vstupenky_text', 'Vstupenky')}
          </Odkaz>
        )}
        <Link to={`/matches/${z.id}`} className={`kr-zapas__tlacidlo${!z.video_url && (odohrany || !vstupenky) ? ' kr-zapas__tlacidlo--tmave' : ''}`}>
          {u.text('text_detail', 'Detail')}
        </Link>
      </div>
    </article>
  );
};

// ===== Partneri =====

const HLAVNE_UROVNE = ['generalny', 'hlavny'];

export const LogoPartnera: React.FC<{ partner: Partner; velke?: boolean }> = ({ partner: p, velke = false }) => {
  const logo = obrazokUrl(p.logo);
  const obsah = logo ? <img src={logo} alt={p.nazov} loading="lazy" onError={skryObrazok} /> : <span>{p.nazov}</span>;
  const trieda = `kr-partner${velke ? ' kr-partner--velky' : ''}`;
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

/** Partneri: hlavní vo veľkom rade, ostatní v menšom (spodok každej stránky). */
export const Partneri: React.FC<{ partneri: Partner[] }> = ({ partneri }) => {
  const u = useUpravy();
  if (partneri.length === 0) return null;
  const hlavni = partneri.filter((p) => p.uroven && HLAVNE_UROVNE.includes(p.uroven));
  const prvi = (hlavni.length > 0 ? hlavni : partneri).slice(0, 4);
  const ostatni = partneri.filter((p) => !prvi.includes(p)).slice(0, 6);
  return (
    <section className="kr-sekcia kr-partneri" aria-label="Partneri">
      <div className="kr-kontajner">
        <NadpisStredovy nadpis={u.text('partneri_nadpis', 'Partneri')} />
        <div className="kr-partneri__rad kr-partneri__rad--hlavny">
          {prvi.map((p) => (
            <LogoPartnera key={p.id} partner={p} velke />
          ))}
        </div>
        {ostatni.length > 0 && (
          <div className="kr-partneri__rad">
            {ostatni.map((p) => (
              <LogoPartnera key={p.id} partner={p} />
            ))}
          </div>
        )}
        <Link to="/sponzori" className="kr-partneri__vsetci">
          {u.text('text_vsetci_partneri', 'Všetci partneri')}
        </Link>
      </div>
    </section>
  );
};

/** Partneri na spodku podstránky - riadi ich nastavenie „Ukázať partnerov". */
export const PartneriStranky: React.FC = () => {
  const s = useNastaveniaSablony<{ ukazat_partnerov: boolean }>();
  const partneri = useApi<Partner[]>(s.ukazat_partnerov === false ? null : '/sponsors');
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
    <span className="kr-forma">
      {znaky.map((z, i) => (
        <span key={i} className={`kr-forma__znak kr-forma__znak--${typ(z)}`} title={popis[typ(z)]}>
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
    <div className="kr-tabulka-obal">
      <table className="kr-tabulka kr-tabulka--sutaz">
        <thead>
          <tr>
            <th className="kr-tabulka__poz">#</th>
            <th className="kr-tabulka__tim">Tím</th>
            <th title="Zápasy">Z</th>
            {plna && (
              <>
                <th title="Výhry" className="kr-tabulka__volitelne">V</th>
                <th title="Remízy" className="kr-tabulka__volitelne">R</th>
                <th title="Prehry" className="kr-tabulka__volitelne">P</th>
              </>
            )}
            {!lenBody && <th>Skóre</th>}
            <th title="Body">B</th>
            {plna && forma && <th className="kr-tabulka__forma">Forma</th>}
          </tr>
        </thead>
        <tbody>
          {riadky.map((r) => (
            <tr key={r.id} className={zvyraznitTim && r.tim_id === zvyraznitTim ? 'is-nas' : ''}>
              <td className="kr-tabulka__poz">{r.pozicia}</td>
              <td className="kr-tabulka__tim">
                <span>
                  <Erb nazov={nazov(r)} logo={logo(r)} />
                  <span className="kr-tabulka__nazov">{nazov(r)}</span>
                </span>
              </td>
              <td>{r.zapasy}</td>
              {plna && (
                <>
                  <td className="kr-tabulka__volitelne">{r.vitazstva}</td>
                  <td className="kr-tabulka__volitelne">{r.remizy}</td>
                  <td className="kr-tabulka__volitelne">{r.prehry}</td>
                </>
              )}
              {!lenBody && (
                <td>
                  {r.goly_za}:{r.goly_proti}
                </td>
              )}
              <td className="kr-tabulka__body">{r.body}</td>
              {plna && forma && (
                <td className="kr-tabulka__forma">
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
  <section className={`kr-sekcia ${className}`} aria-label={ariaLabel} id={id}>
    <div className="kr-kontajner">{children}</div>
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
    document.body.classList.add('kr-bez-posunu');
    zavriet.current?.focus();
    return () => {
      window.removeEventListener('keydown', klaves);
      document.body.classList.remove('kr-bez-posunu');
      predtym?.focus?.();
    };
  }, [onZavriet]);

  return (
    <div className="kr-okno" role="dialog" aria-modal="true" aria-label={v.nazov} onClick={onZavriet}>
      <div className="kr-okno__box" onClick={(e) => e.stopPropagation()}>
        <button ref={zavriet} type="button" className="kr-okno__zavriet" onClick={onZavriet} aria-label="Zavrieť">
          <Ikona nazov="zavriet" velkost={18} />
        </button>
        <div className="kr-okno__media">
          {url && (
            <iframe
              src={url}
              title={v.nazov}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
        <div className="kr-okno__info">
          <h3>{v.nazov}</h3>
          <div className="kr-clanok__meta">
            {kategoria && <span className="kr-clanok__kategoria">{kategoria}</span>}
            {dlzka && <span className="kr-okno__dlzka">{dlzka}</span>}
            {v.zapas && (
              <Link to={`/matches/${v.zapas.id}`} className="kr-okno__odkaz" onClick={onZavriet}>
                Detail zápasu
              </Link>
            )}
          </div>
          {v.popis && <p className="kr-okno__popis">{v.popis}</p>}
        </div>
      </div>
    </div>
  );
};
