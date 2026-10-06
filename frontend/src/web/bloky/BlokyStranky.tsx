// Umiestnenie: frontend/src/web/bloky/BlokyStranky.tsx
// Zobrazenie blokov stránky (časová os, karty osôb, čísla, galéria…).
//
// Šablóna použije <BlokyStranky bloky={stranka.bloky} />. Predvolený vzhľad
// (bloky.css, trieda .bloky--zakladne) je jednoduchý a neutrálny. Šablóna
// s vlastným dizajnom ho vypne (predvolenyVzhlad={false}) a štýluje
// sémantické triedy .blok, .blok--casova-os, .blok__polozka… sama, prípadne
// jednotlivé typy nahradí vlastnou súčasťou cez `komponenty`.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ObsahSFormularmi } from '../../components/FormularWeb';
import { HlavickaBloku, HlavickaBlokuKontext, Html, Obr, OdkazBloku, obrazokBloku, odkazVsetkychBloku, type VlastnostiHlavickyBloku } from './pomocky';
import { useData } from '../pomocky';
import { kotvaBloku, type BlokStranky, type KomponentBloku } from './typy';
import { ROZSIRENE_BLOKY } from './BlokyRozsirene';
import { BLOKY_KLUBU } from './BlokyKlubu';
import './bloky.css';

export { HlavickaBloku, OdkazBloku, obrazokBloku, odkazVsetkychBloku } from './pomocky';
export type { VlastnostiHlavickyBloku } from './pomocky';

const iniciely = (meno: string) =>
  meno
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

const datumKratky = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// ===== Predvolené bloky =====

const Text: KomponentBloku = ({ blok }) => <Html html={blok.data.html} className="blok__text blok__text--hlavny" />;

const Nadpis: KomponentBloku = ({ blok: { data } }) => (
  <header className={`blok__hlavicka blok__hlavicka--${data.zarovnanie === 'stred' ? 'stred' : 'vlavo'}`}>
    {data.stitok && <span className="blok__stitok">{data.stitok}</span>}
    {data.nadpis && <h2 className="blok__nadpis blok__nadpis--velky">{data.nadpis}</h2>}
    {data.text && <p className="blok__uvod">{data.text}</p>}
  </header>
);

const CasovaOs: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} uvod={data.uvod} />
    <ol className="blok__os">
      {polozky.map((p, i) => (
        <li key={i} className="blok__polozka">
          <span className="blok__rok">{p.rok}</span>
          <div className="blok__obsah">
            {p.nadpis && <h3>{p.nadpis}</h3>}
            {p.text && <p>{p.text}</p>}
            <Obr src={p.obrazok} alt={p.nadpis} className="blok__obrazok" />
          </div>
        </li>
      ))}
    </ol>
  </>
);

const Osoby: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} uvod={data.uvod} />
    <div className={`blok__mriezka blok__mriezka--${data.stlpce || '3'} blok__osoby--${data.vzhlad || 'karty'}`}>
      {polozky.map((p, i) => (
        <article key={i} className="blok__polozka blok__osoba">
          <div className="blok__foto">
            {obrazokBloku(p.foto) ? <Obr src={p.foto} alt={p.meno} /> : <span className="blok__iniciely">{iniciely(p.meno || '?')}</span>}
          </div>
          <div className="blok__obsah">
            {p.funkcia && <span className="blok__funkcia">{p.funkcia}</span>}
            {p.meno && <h3>{p.meno}</h3>}
            {p.text && <p>{p.text}</p>}
            {(p.email || p.telefon) && (
              <div className="blok__kontakt">
                {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
                {p.telefon && <a href={`tel:${String(p.telefon).replace(/\s+/g, '')}`}>{p.telefon}</a>}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  </>
);

const Karty: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} uvod={data.uvod} />
    <div className={`blok__mriezka blok__mriezka--${data.stlpce || '3'} blok__karty--${data.vzhlad || 'klasicke'}`}>
      {polozky.map((p, i) => {
        const obsah = (
          <>
            {obrazokBloku(p.obrazok) && (
              <div className="blok__karta-obrazok">
                <Obr src={p.obrazok} alt={p.nadpis} />
              </div>
            )}
            <div className="blok__obsah">
              {p.nadpis && <h3>{p.nadpis}</h3>}
              {p.text && <p>{p.text}</p>}
              {p.odkaz && <span className="blok__odkaz">{p.tlacidlo || 'Viac'} →</span>}
            </div>
          </>
        );
        return p.odkaz ? (
          <OdkazBloku key={i} to={p.odkaz} className="blok__polozka blok__karta">
            {obsah}
          </OdkazBloku>
        ) : (
          <article key={i} className="blok__polozka blok__karta">
            {obsah}
          </article>
        );
      })}
    </div>
  </>
);

const Cisla: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} />
    <dl className="blok__cisla">
      {polozky.map((p, i) => (
        <div key={i} className="blok__polozka">
          <dt>{p.hodnota}</dt>
          <dd>{p.popis}</dd>
        </div>
      ))}
    </dl>
  </>
);

const ObrazokText: KomponentBloku = ({ blok: { data } }) => (
  <div className={`blok__dvojica blok__dvojica--${data.strana === 'vpravo' ? 'vpravo' : 'vlavo'}`}>
    <div className="blok__dvojica-obrazok">
      <Obr src={data.obrazok} alt={data.nadpis} />
    </div>
    <div className="blok__dvojica-text">
      {data.stitok && <span className="blok__stitok">{data.stitok}</span>}
      {data.nadpis && <h2 className="blok__nadpis">{data.nadpis}</h2>}
      <Html html={data.html} />
      {data.odkaz && (
        <OdkazBloku to={data.odkaz} className="blok__tlacidlo">
          {data.tlacidlo || 'Viac'}
        </OdkazBloku>
      )}
    </div>
  </div>
);

/** Jeden obrázok - v šírke obsahu, užší alebo cez celú šírku stránky. */
const Obrazok: KomponentBloku = ({ blok: { data } }) => {
  if (!obrazokBloku(data.obrazok)) return null;
  const sirka = data.sirka === 'uzka' || data.sirka === 'plna' ? data.sirka : 'obsah';
  const pomer = ['16-9', '4-3', '1-1', '21-9'].includes(data.pomer) ? data.pomer : 'povodny';
  const obrazok = <Obr src={data.obrazok} alt={data.alt || data.popis || ''} />;
  return (
    <figure className={`blok__snimka blok__snimka--${sirka} blok__snimka--${pomer}`}>
      {data.odkaz ? (
        <OdkazBloku to={data.odkaz} noveOkno={data.nove_okno} className="blok__snimka-odkaz">
          {obrazok}
        </OdkazBloku>
      ) : (
        obrazok
      )}
      {data.popis && <figcaption className="blok__snimka-popis">{data.popis}</figcaption>}
    </figure>
  );
};

const Galeria: KomponentBloku = ({ blok: { data, polozky = [] } }) => {
  const [otvorena, setOtvorena] = useState<number | null>(null);
  const obrazky = polozky.filter((p) => obrazokBloku(p.obrazok));
  const aktualny = otvorena !== null ? obrazky[otvorena] : null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} />
      <div className={`blok__mriezka blok__mriezka--${data.stlpce || '3'} blok__galeria`}>
        {obrazky.map((p, i) => (
          <button key={i} type="button" className="blok__polozka blok__fotka" onClick={() => setOtvorena(i)} aria-label={p.popis || `Fotka ${i + 1}`}>
            <Obr src={p.obrazok} alt={p.popis} />
            {p.popis && <span className="blok__popis">{p.popis}</span>}
          </button>
        ))}
      </div>
      {aktualny && (
        <div className="blok__lightbox" role="dialog" aria-modal="true" onClick={() => setOtvorena(null)}>
          <button type="button" className="blok__lightbox-zavriet" aria-label="Zavrieť" onClick={() => setOtvorena(null)}>
            ×
          </button>
          {obrazky.length > 1 && (
            <button
              type="button"
              className="blok__lightbox-sipka blok__lightbox-sipka--vlavo"
              aria-label="Predchádzajúca"
              onClick={(e) => {
                e.stopPropagation();
                setOtvorena((otvorena! - 1 + obrazky.length) % obrazky.length);
              }}
            >
              ‹
            </button>
          )}
          <figure onClick={(e) => e.stopPropagation()}>
            <Obr src={aktualny.obrazok} alt={aktualny.popis} />
            {aktualny.popis && <figcaption>{aktualny.popis}</figcaption>}
          </figure>
          {obrazky.length > 1 && (
            <button
              type="button"
              className="blok__lightbox-sipka blok__lightbox-sipka--vpravo"
              aria-label="Ďalšia"
              onClick={(e) => {
                e.stopPropagation();
                setOtvorena((otvorena! + 1) % obrazky.length);
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
};

const Citat: KomponentBloku = ({ blok: { data } }) => (
  <figure className="blok__citat">
    <blockquote>{data.text}</blockquote>
    {(data.autor || data.funkcia) && (
      <figcaption>
        {obrazokBloku(data.foto) && <Obr src={data.foto} alt={data.autor} className="blok__citat-foto" />}
        <span>
          {data.autor && <strong>{data.autor}</strong>}
          {data.funkcia && <small>{data.funkcia}</small>}
        </span>
      </figcaption>
    )}
  </figure>
);

const Vyzva: KomponentBloku = ({ blok: { data } }) => {
  const pozadie = obrazokBloku(data.obrazok);
  return (
    <div className={`blok__vyzva${pozadie ? ' blok__vyzva--obrazok' : ''}`} style={pozadie ? ({ '--blok-pozadie': `url("${pozadie.replace(/"/g, '%22')}")` } as React.CSSProperties) : undefined}>
      <div className="blok__vyzva-text">
        {data.nadpis && <h2 className="blok__nadpis">{data.nadpis}</h2>}
        {data.text && <p>{data.text}</p>}
      </div>
      {data.odkaz && (
        <OdkazBloku to={data.odkaz} className="blok__tlacidlo">
          {data.tlacidlo || 'Viac'}
        </OdkazBloku>
      )}
    </div>
  );
};

const Faq: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} />
    <div className="blok__faq">
      {polozky.map((p, i) => (
        <details key={i} className="blok__polozka">
          <summary>{p.otazka}</summary>
          <p>{p.odpoved}</p>
        </details>
      ))}
    </div>
  </>
);

const Uspechy: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} />
    <ul className="blok__uspechy">
      {polozky.map((p, i) => (
        <li key={i} className="blok__polozka">
          <span className="blok__pohar" aria-hidden="true">
            🏆
          </span>
          <span className="blok__rok">{p.rok}</span>
          <span className="blok__obsah">
            <strong>{p.nazov}</strong>
            {p.popis && <small>{p.popis}</small>}
          </span>
        </li>
      ))}
    </ul>
  </>
);

const Video: KomponentBloku = ({ blok: { data } }) => {
  const adresa =
    data.platforma === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.video_id)}`
      : data.platforma === 'vimeo'
        ? `https://player.vimeo.com/video/${encodeURIComponent(data.video_id)}`
        : null;
  if (!adresa) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} />
      <div className="blok__video">
        <iframe src={adresa} title={data.nadpis || 'Video'} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
      </div>
      {data.popis && <p className="blok__popis-videa">{data.popis}</p>}
    </>
  );
};

const Mapa: KomponentBloku = ({ blok: { data } }) =>
  data.adresa ? (
    <>
      <HlavickaBloku nadpis={data.nadpis} />
      <div className="blok__mapa">
        <iframe
          src={`https://www.google.com/maps?q=${encodeURIComponent(data.adresa)}&output=embed`}
          title={`Mapa: ${data.adresa}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="blok__adresa">{data.adresa}</p>
    </>
  ) : null;

const Formular: KomponentBloku = ({ blok: { data } }) =>
  data.slug ? <ObsahSFormularmi html={`<p>[formular ${String(data.slug).replace(/[^a-z0-9-]/gi, '')}]</p>`} className="blok__formular" /> : null;

interface ClanokBloku {
  id: number;
  nazov: string;
  slug: string;
  excerpt?: string | null;
  obrazok?: string | null;
  publikovany_datum?: string | null;
  vytvoreny: string;
}

const Clanky: KomponentBloku = ({ blok: { data } }) => {
  const pocet = Number(data.pocet) || 3;
  const clanky = useData<ClanokBloku[]>(`/articles?limit=${pocet}${data.rubrika ? `&category=${encodeURIComponent(data.rubrika)}` : ''}`);
  if (!clanky.data?.length) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} odkaz={odkazVsetkychBloku('clanky', data)} textOdkazu={data.text_odkazu} />
      <div className={data.vzhlad === 'zoznam' ? 'blok__mriezka blok__mriezka--2 blok__karty--vodorovne' : 'blok__mriezka blok__mriezka--3'}>
        {clanky.data.map((c) => (
          <Link key={c.id} to={`/clanek/${c.slug}`} className="blok__polozka blok__karta">
            {obrazokBloku(c.obrazok) && (
              <div className="blok__karta-obrazok">
                <Obr src={c.obrazok} alt={c.nazov} />
              </div>
            )}
            <div className="blok__obsah">
              <small>{datumKratky(c.publikovany_datum || c.vytvoreny)}</small>
              <h3>{c.nazov}</h3>
              {c.excerpt && <p>{c.excerpt}</p>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
};

interface ZapasBloku {
  id: number;
  datum_cas: string;
  domaci_tim_nazov?: string | null;
  hostujuci_tim_nazov?: string | null;
  goly_domaci: number | null;
  goly_hostia: number | null;
  liga_nazov?: string | null;
}

/** Adresa zoznamu zápasov pre blok (aj pre šablóny s vlastným vzhľadom). */
export const adresaZapasovBloku = (data: BlokStranky['data']) => {
  const pocet = Number(data.pocet) || 3;
  const tim = Number(data.tim_id) > 0 ? `&tim_id=${Number(data.tim_id)}` : '';
  const dnes = new Date().toISOString().slice(0, 10);
  return data.rezim === 'vysledky'
    ? `/matches?status=ukonceny&limit=${pocet}${tim}`
    : `/matches?status=naplanovany&od_datumu=${dnes}&poradie=asc&limit=50${tim}`;
};

const Zapasy: KomponentBloku = ({ blok: { data } }) => {
  const zapasy = useData<ZapasBloku[]>(adresaZapasovBloku(data));
  const pocet = Number(data.pocet) || 3;
  const zoznam = [...(zapasy.data ?? [])]
    .sort((a, b) => (data.rezim === 'vysledky' ? b.datum_cas.localeCompare(a.datum_cas) : a.datum_cas.localeCompare(b.datum_cas)))
    .slice(0, pocet);
  if (zoznam.length === 0) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} odkaz={odkazVsetkychBloku('zapasy', data)} textOdkazu={data.text_odkazu} />
      <ul className="blok__zapasy">
        {zoznam.map((z) => (
          <li key={z.id} className="blok__polozka">
            <Link to={`/matches/${z.id}`}>
              <small>{datumKratky(z.datum_cas)}</small>
              <strong>
                {z.domaci_tim_nazov} {z.goly_domaci !== null && z.goly_hostia !== null ? `${z.goly_domaci} : ${z.goly_hostia}` : '–'} {z.hostujuci_tim_nazov}
              </strong>
              {z.liga_nazov && <small>{z.liga_nazov}</small>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

interface PartnerBloku {
  id: number;
  nazov: string;
  logo: string | null;
  web_url: string | null;
}

const Partneri: KomponentBloku = ({ blok: { data } }) => {
  const partneri = useData<PartnerBloku[]>('/sponsors?limit=500');
  if (!partneri.data?.length) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} odkaz={odkazVsetkychBloku('partneri', data)} textOdkazu={data.text_odkazu} />
      <div className="blok__partneri">
        {partneri.data.map((p) => {
          const obsah = obrazokBloku(p.logo) ? <Obr src={p.logo} alt={p.nazov} /> : <span>{p.nazov}</span>;
          return p.web_url ? (
            <a key={p.id} href={p.web_url} target="_blank" rel="noopener noreferrer" className="blok__polozka" title={p.nazov}>
              {obsah}
            </a>
          ) : (
            <span key={p.id} className="blok__polozka" title={p.nazov}>
              {obsah}
            </span>
          );
        })}
      </div>
    </>
  );
};

/** Predvolené zobrazenie každého typu bloku. */
export const PREDVOLENE_BLOKY: Record<string, KomponentBloku> = {
  text: Text,
  nadpis: Nadpis,
  casova_os: CasovaOs,
  osoby: Osoby,
  karty: Karty,
  cisla: Cisla,
  obrazok_text: ObrazokText,
  obrazok: Obrazok,
  galeria: Galeria,
  citat: Citat,
  vyzva: Vyzva,
  faq: Faq,
  uspechy: Uspechy,
  video: Video,
  mapa: Mapa,
  formular: Formular,
  clanky: Clanky,
  zapasy: Zapasy,
  partneri: Partneri,
  ...ROZSIRENE_BLOKY,
  ...BLOKY_KLUBU,
};

/**
 * Bloky stránky v poradí z administrácie (skryté sa vynechajú).
 * @param komponenty vlastné zobrazenie niektorých typov (napr. zápasy v dizajne šablóny)
 * @param predvolenyVzhlad false = bez predvolených štýlov, šablóna štýluje triedy .blok… sama
 */
export const BlokyStranky: React.FC<{
  bloky?: BlokStranky[] | null;
  className?: string;
  predvolenyVzhlad?: boolean;
  komponenty?: Partial<Record<string, KomponentBloku>>;
  /** Vlastná hlavička blokov (nadpis + odkaz) v dizajne šablóny */
  hlavicka?: React.ComponentType<VlastnostiHlavickyBloku>;
}> = ({ bloky, className = '', predvolenyVzhlad = true, komponenty = {}, hlavicka }) => {
  const viditelne = (bloky ?? []).filter((b) => b && !b.skryty && (komponenty[b.typ] || PREDVOLENE_BLOKY[b.typ]));
  if (viditelne.length === 0) return null;
  const obsah = (
    <div className={`bloky${predvolenyVzhlad ? ' bloky--zakladne' : ''}${className ? ` ${className}` : ''}`}>
      {viditelne.map((b) => {
        const Komponent = (komponenty[b.typ] || PREDVOLENE_BLOKY[b.typ])!;
        return (
          <section
            key={b.id}
            id={kotvaBloku(b)}
            className={`blok blok--${b.typ.replace(/_/g, '-')} blok--pozadie-${b.pozadie || 'biele'}${b.typ === 'podmenu' && b.data?.prilepene ? ' blok--prilepene' : ''}${
              b.typ === 'obrazok' && b.data?.sirka === 'plna' ? ' blok--na-sirku' : ''
            }`}
          >
            <div className="blok__vnutro">
              <Komponent blok={b} bloky={viditelne} />
            </div>
          </section>
        );
      })}
    </div>
  );
  return hlavicka ? <HlavickaBlokuKontext.Provider value={hlavicka}>{obsah}</HlavickaBlokuKontext.Provider> : obsah;
};

export default BlokyStranky;
