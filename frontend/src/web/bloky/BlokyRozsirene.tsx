// Umiestnenie: frontend/src/web/bloky/BlokyRozsirene.tsx
// Ďalšie bloky stránok: tlačidlá, podmenu stránky, tabuľka, stĺpce,
// kroky, výhody, cenník, oddeľovač, kontakt, štadión, registrácia
// a 2 % dane. Zapájajú sa do PREDVOLENE_BLOKY v BlokyStranky.tsx.

import React, { useEffect, useRef, useState } from 'react';
import { useNastavenia } from '../../context/NastaveniaContext';
import { useData } from '../pomocky';
import { FormularRegistracie } from '../FormularRegistracie';
import { HlavickaBloku, Html, Obr, OdkazBloku, obrazokBloku } from './pomocky';
import { kotvaBloku, type KomponentBloku } from './typy';

// ===== Tlačidlá (klasické, obrázkové, veľké) =====

const Tlacidla: KomponentBloku = ({ blok: { data, polozky = [] } }) => {
  const vzhlad = data.vzhlad || 'klasicke';
  const tlacidla = polozky.filter((p) => p.text && p.odkaz);
  if (tlacidla.length === 0) return null;
  const obsahDlazdice = (p: (typeof tlacidla)[number]) => (
    <>
      {vzhlad === 'obrazkove' && (
        <span className="blok__dlazdica-obrazok">
          <Obr src={p.obrazok} alt="" />
        </span>
      )}
      <span className="blok__dlazdica-text">
        <strong>{p.text}</strong>
        {p.popis && <small>{p.popis}</small>}
      </span>
      <span className="blok__dlazdica-sipka" aria-hidden="true">
        →
      </span>
    </>
  );
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} />
      {vzhlad === 'klasicke' ? (
        <div className={`blok__tlacidla blok__tlacidla--${data.zarovnanie === 'stred' ? 'stred' : 'vlavo'}`}>
          {tlacidla.map((p, i) => (
            <OdkazBloku key={i} to={p.odkaz} className={`blok__tlacidlo blok__tlacidlo--${p.styl || 'hlavne'}`} noveOkno={p.nove_okno}>
              {p.text}
            </OdkazBloku>
          ))}
        </div>
      ) : (
        <div className={`blok__mriezka blok__mriezka--${data.stlpce || '3'} blok__dlazdice blok__dlazdice--${vzhlad}`}>
          {tlacidla.map((p, i) => (
            <OdkazBloku key={i} to={p.odkaz} className={`blok__dlazdica blok__dlazdica--${p.styl || 'hlavne'}${vzhlad === 'obrazkove' && !obrazokBloku(p.obrazok) ? ' bez-obrazka' : ''}`} noveOkno={p.nove_okno}>
              {obsahDlazdice(p)}
            </OdkazBloku>
          ))}
        </div>
      )}
    </>
  );
};

// ===== Podmenu stránky =====

/** Voľné miesto nad sekciou, na ktorú sa z podmenu posúva. */
const MEDZERA = 24;

/**
 * Spodný okraj hlavičky šablóny, ktorá je prilepená hore (fixed/sticky).
 * Šablóny majú hlavičky rôzne - plávajúce, zmenšujúce sa pri posune,
 * skrývané - preto ju nehľadáme podľa triedy, ale podľa toho, čo je
 * práve pri hornom okraji okna.
 */
const spodokHlavicky = (vynechat: Element): number => {
  if (typeof document.elementsFromPoint !== 'function') return 0;
  let spodok = 0;
  const preverene = new Set<Element>();
  for (const x of [0.2, 0.5, 0.8].map((k) => window.innerWidth * k)) {
    for (const y of [2, 18, 34]) {
      for (const prvok of document.elementsFromPoint(x, y)) {
        if (vynechat.contains(prvok)) continue;
        for (let e: Element | null = prvok; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
          if (preverene.has(e)) break;
          preverene.add(e);
          const poloha = getComputedStyle(e).position;
          if (poloha !== 'fixed' && poloha !== 'sticky') continue;
          const r = e.getBoundingClientRect();
          // Výsuvné menu a podobné panely cez celú výšku nie sú hlavička
          if (r.top <= y && r.height > 0 && r.height < window.innerHeight * 0.4) spodok = Math.max(spodok, r.bottom);
          break;
        }
      }
    }
  }
  return Math.round(spodok);
};

/**
 * Prilepené podmenu sa drží pod hlavičkou šablóny a sekcie po kliknutí
 * zastanú pod ním (scroll-margin-top všetkých blokov), nie schované za ním.
 */
const usePolohaPodmenu = (nav: React.RefObject<HTMLElement>, prilepene: boolean) => {
  useEffect(() => {
    const prvok = nav.current;
    const sekcia = prvok?.closest('.blok') as HTMLElement | null;
    if (!prvok || !sekcia) return;
    const koren = document.documentElement;
    let snimka = 0;
    const prepocitaj = () => {
      snimka = 0;
      const hlavicka = spodokHlavicky(sekcia);
      // Šablóna si k tomu môže pridať medzeru (plávajúce podmenu): top: calc(var(--podmenu-hore) + 12px)
      sekcia.style.setProperty('--podmenu-hore', `${hlavicka}px`);
      const odsadenie = prilepene ? (parseFloat(getComputedStyle(sekcia).top) || 0) + sekcia.getBoundingClientRect().height : hlavicka;
      koren.style.setProperty('--clubw-odsadenie-kotvy', `${Math.round(odsadenie + MEDZERA)}px`);
    };
    const naplanuj = () => {
      if (!snimka) snimka = requestAnimationFrame(prepocitaj);
    };
    prepocitaj();
    window.addEventListener('scroll', naplanuj, { passive: true });
    window.addEventListener('resize', naplanuj);
    // Písma a obrázky v hlavičke sa dočítajú neskôr
    const neskor = window.setTimeout(prepocitaj, 600);
    return () => {
      window.removeEventListener('scroll', naplanuj);
      window.removeEventListener('resize', naplanuj);
      window.clearTimeout(neskor);
      if (snimka) cancelAnimationFrame(snimka);
      koren.style.removeProperty('--clubw-odsadenie-kotvy');
    };
  }, [nav, prilepene]);
};

/**
 * Posun na sekciu. Hlavička šablóny sa pri posune môže zmeniť (prilepí sa,
 * zmenší, skryje), preto sa po dobehnutí posunu poloha ešte raz overí
 * a prípadne doladí - nadpis sekcie nesmie ostať schovaný pod menu.
 */
const posunNaSekciu = (ciel: HTMLElement) => {
  ciel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  let hotovo = false;
  const dolad = () => {
    if (hotovo) return;
    hotovo = true;
    window.removeEventListener('scrollend', dolad);
    requestAnimationFrame(() => {
      const odsadenie = parseFloat(getComputedStyle(ciel).scrollMarginTop) || 0;
      const rozdiel = ciel.getBoundingClientRect().top - odsadenie;
      if (Math.abs(rozdiel) > 4) window.scrollBy({ top: rozdiel, behavior: 'smooth' });
    });
  };
  window.addEventListener('scrollend', dolad);
  window.setTimeout(dolad, 900);
};

/** Kotvy na bloky s nadpisom (automaticky) alebo vlastné odkazy. */
const Podmenu: KomponentBloku = ({ blok, bloky }) => {
  const { data, polozky = [] } = blok;
  const [aktivna, setAktivna] = useState<string | null>(null);
  const nav = useRef<HTMLElement>(null);
  usePolohaPodmenu(nav, !!data.prilepene);
  const odkazy =
    data.rezim === 'vlastne'
      ? polozky.filter((p) => p.text && p.odkaz).map((p) => ({ text: p.text as string, odkaz: p.odkaz as string }))
      : bloky
          .filter((b) => b.id !== blok.id && b.typ !== 'podmenu' && typeof b.data?.nadpis === 'string' && b.data.nadpis.trim())
          .map((b) => ({ text: b.data.nadpis as string, odkaz: `#${kotvaBloku(b)}` }));

  // Zvýraznenie sekcie, ktorá je práve na obrazovke
  useEffect(() => {
    const kotvy = odkazy.filter((o) => o.odkaz.startsWith('#')).map((o) => document.getElementById(o.odkaz.slice(1))).filter(Boolean) as HTMLElement[];
    if (kotvy.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const pozorovatel = new IntersectionObserver(
      (zaznamy) => {
        const viditelny = zaznamy.filter((z) => z.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (viditelny) setAktivna(`#${viditelny.target.id}`);
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    kotvy.forEach((k) => pozorovatel.observe(k));
    return () => pozorovatel.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odkazy.map((o) => o.odkaz).join('|')]);

  // Na mobile je podmenu posuvné do strany - aktívna položka nech je vidno
  useEffect(() => {
    const zoznam = nav.current;
    const odkaz = zoznam?.querySelector<HTMLElement>('.is-aktivny');
    if (!zoznam || !odkaz || zoznam.scrollWidth <= zoznam.clientWidth) return;
    const vlavo = odkaz.offsetLeft - (zoznam.clientWidth - odkaz.offsetWidth) / 2;
    zoznam.scrollTo({ left: Math.max(0, vlavo), behavior: 'smooth' });
  }, [aktivna]);

  if (odkazy.length === 0) return null;
  return (
    <nav ref={nav} className="blok__podmenu" aria-label="Obsah stránky">
      {odkazy.map((o) =>
        o.odkaz.startsWith('#') ? (
          <a
            key={o.odkaz}
            href={o.odkaz}
            className={aktivna === o.odkaz ? 'is-aktivny' : undefined}
            onClick={(e) => {
              const ciel = document.getElementById(o.odkaz.slice(1));
              if (!ciel) return;
              e.preventDefault();
              // Odsadenie pod hlavičkou a podmenu rieši scroll-margin-top bloku
              posunNaSekciu(ciel);
              setAktivna(o.odkaz);
              history.replaceState(null, '', o.odkaz);
            }}
          >
            {o.text}
          </a>
        ) : (
          <OdkazBloku key={o.odkaz} to={o.odkaz} className={window.location.pathname === o.odkaz ? 'is-aktivny' : undefined}>
            {o.text}
          </OdkazBloku>
        )
      )}
    </nav>
  );
};

// ===== Tabuľka =====

const Tabulka: KomponentBloku = ({ blok: { data } }) => {
  const hlavicka: string[] = data.tabulka?.hlavicka ?? [];
  const riadky: string[][] = data.tabulka?.riadky ?? [];
  if (riadky.length === 0 && !hlavicka.some(Boolean)) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} uvod={data.popis} />
      <div className="blok__tabulka-obal">
        <table className={`blok__tabulka${data.pruhovana ? ' blok__tabulka--pruhovana' : ''}`}>
          {hlavicka.some(Boolean) && (
            <thead>
              <tr>
                {hlavicka.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {riadky.map((r, i) => (
              <tr key={i}>
                {r.map((bunka, j) => (
                  <td key={j} data-stlpec={hlavicka[j] || undefined}>
                    {bunka}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ===== Stĺpce textu =====

const Stlpce: KomponentBloku = ({ blok: { data } }) => {
  const pocet = data.pocet === '3' ? 3 : 2;
  return (
    <div className={`blok__stlpce blok__stlpce--${pocet}`}>
      {Array.from({ length: pocet }, (_, i) => (
        <div key={i} className="blok__stlpec">
          <Html html={data[`html${i + 1}`]} />
        </div>
      ))}
    </div>
  );
};

// ===== Kroky a výhody =====

const Kroky: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} uvod={data.uvod} />
    <ol className="blok__kroky">
      {polozky.map((p, i) => (
        <li key={i} className="blok__polozka">
          <span className="blok__cislo-kroku">{i + 1}</span>
          <div className="blok__obsah">
            {p.nadpis && <h3>{p.nadpis}</h3>}
            {p.text && <p>{p.text}</p>}
          </div>
        </li>
      ))}
    </ol>
  </>
);

const Vyhody: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} uvod={data.uvod} />
    <ul className={`blok__mriezka blok__mriezka--${data.stlpce || '3'} blok__vyhody`}>
      {polozky.map((p, i) => (
        <li key={i} className="blok__polozka">
          <span className="blok__fajka" aria-hidden="true">
            ✓
          </span>
          <div className="blok__obsah">
            {p.nadpis && <h3>{p.nadpis}</h3>}
            {p.text && <p>{p.text}</p>}
          </div>
        </li>
      ))}
    </ul>
  </>
);

// ===== Cenník (členstvo, permanentky…) =====

const Cennik: KomponentBloku = ({ blok: { data, polozky = [] } }) => (
  <>
    <HlavickaBloku nadpis={data.nadpis} uvod={data.uvod} />
    <div className="blok__cennik">
      {polozky.map((p, i) => (
        <article key={i} className={`blok__polozka blok__balik${p.zvyraznene ? ' is-zvyraznene' : ''}`}>
          {p.nazov && <h3>{p.nazov}</h3>}
          {p.cena && (
            <p className="blok__cena">
              <strong>{p.cena}</strong>
              {p.obdobie && <small> / {p.obdobie}</small>}
            </p>
          )}
          {p.vyhody && (
            <ul>
              {String(p.vyhody)
                .split('\n')
                .map((r) => r.trim())
                .filter(Boolean)
                .map((r, j) => (
                  <li key={j}>{r}</li>
                ))}
            </ul>
          )}
          {p.odkaz && (
            <OdkazBloku to={p.odkaz} className={`blok__tlacidlo blok__tlacidlo--${p.zvyraznene ? 'hlavne' : 'obrys'}`}>
              {p.tlacidlo || 'Mám záujem'}
            </OdkazBloku>
          )}
        </article>
      ))}
    </div>
  </>
);

// ===== Oddeľovač =====

const Oddelovac: KomponentBloku = ({ blok: { data } }) => (
  <div className={`blok__oddelovac blok__oddelovac--${data.styl || 'ciara'} blok__oddelovac--${data.velkost || 'stredna'}`} aria-hidden="true">
    {data.styl !== 'medzera' && <hr />}
  </div>
);

// ===== Kontakt (údaje z nastavení klubu) =====

const Mapa: React.FC<{ adresa: string }> = ({ adresa }) => (
  <div className="blok__mapa">
    <iframe src={`https://www.google.com/maps?q=${encodeURIComponent(adresa)}&output=embed`} title={`Mapa: ${adresa}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
  </div>
);

const Kontakt: KomponentBloku = ({ blok: { data } }) => {
  const { nastavenia } = useNastavenia();
  const k = nastavenia.kontakt ?? {};
  const u = (nastavenia as { udaje?: Record<string, string | null> }).udaje ?? {};
  const siete = Object.entries(nastavenia.socialne_siete ?? {}).filter(([, url]) => url) as Array<[string, string]>;
  const NAZVY_SIETI: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', x: 'X', tiktok: 'TikTok' };
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} uvod={data.text} />
      <div className={`blok__kontakt-mriezka${data.mapa && k.adresa ? ' s-mapou' : ''}`}>
        <div className="blok__kontakt-udaje">
          {k.adresa && (
            <div className="blok__kontakt-riadok">
              <span className="blok__kontakt-ikona" aria-hidden="true">📍</span>
              <div>
                <small>Adresa</small>
                <strong>{k.adresa}</strong>
              </div>
            </div>
          )}
          {k.email && (
            <div className="blok__kontakt-riadok">
              <span className="blok__kontakt-ikona" aria-hidden="true">✉</span>
              <div>
                <small>E-mail</small>
                <a href={`mailto:${k.email}`}>{k.email}</a>
              </div>
            </div>
          )}
          {k.telefon && (
            <div className="blok__kontakt-riadok">
              <span className="blok__kontakt-ikona" aria-hidden="true">☎</span>
              <div>
                <small>Telefón</small>
                <a href={`tel:${k.telefon.replace(/\s+/g, '')}`}>{k.telefon}</a>
              </div>
            </div>
          )}
          {siete.length > 0 && (
            <div className="blok__kontakt-siete">
              {siete.map(([siet, url]) => (
                <a key={siet} href={url} target="_blank" rel="noopener noreferrer">
                  {NAZVY_SIETI[siet] ?? siet}
                </a>
              ))}
            </div>
          )}
          {data.fakturacne && (u.pravny_nazov || u.ico) && (
            <dl className="blok__fakturacne">
              {u.pravny_nazov && (
                <div>
                  <dt>Názov</dt>
                  <dd>{u.pravny_nazov}</dd>
                </div>
              )}
              {u.ico && (
                <div>
                  <dt>IČO</dt>
                  <dd>{u.ico}</dd>
                </div>
              )}
              {u.dic && (
                <div>
                  <dt>DIČ</dt>
                  <dd>{u.dic}</dd>
                </div>
              )}
              {u.iban && (
                <div>
                  <dt>IBAN</dt>
                  <dd>{u.iban}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
        {data.mapa && k.adresa && <Mapa adresa={k.adresa} />}
      </div>
    </>
  );
};

// ===== Štadión (z časti Štadióny) =====

interface StadionBloku {
  id: number;
  nazov: string;
  adresa: string | null;
  fotka: string | null;
  kapacita: number | null;
  poznamka: string | null;
}

const Stadion: KomponentBloku = ({ blok: { data } }) => {
  const stadiony = useData<StadionBloku[]>('/stadiums');
  const zoznam = stadiony.data ?? [];
  const s = zoznam.find((x) => x.id === Number(data.stadion_id)) ?? zoznam[0];
  if (!s) return null;
  return (
    <>
      <div className={`blok__stadion${obrazokBloku(s.fotka) ? ' s-fotkou' : ''}`}>
        {obrazokBloku(s.fotka) && (
          <div className="blok__stadion-fotka">
            <Obr src={s.fotka} alt={s.nazov} />
          </div>
        )}
        <div className="blok__stadion-text">
          <h2 className="blok__nadpis">{s.nazov}</h2>
          <dl className="blok__stadion-udaje">
            {s.adresa && (
              <div>
                <dt>Adresa</dt>
                <dd>{s.adresa}</dd>
              </div>
            )}
            {s.kapacita && (
              <div>
                <dt>Kapacita</dt>
                <dd>{s.kapacita.toLocaleString('sk-SK')} miest</dd>
              </div>
            )}
          </dl>
          {s.poznamka && <p className="blok__stadion-poznamka">{s.poznamka}</p>}
          <Html html={data.text} />
        </div>
      </div>
      {data.mapa && s.adresa && <Mapa adresa={s.adresa} />}
    </>
  );
};

// ===== Registrácia fanúšika / člena =====

const Registracia: KomponentBloku = ({ blok: { data } }) => (
  <div className="blok__registracia">
    <HlavickaBloku nadpis={data.nadpis} uvod={data.text} />
    <FormularRegistracie typ={data.typ || 'vyber'} />
  </div>
);

// ===== 2 % z dane =====

const Kopirovat: React.FC<{ hodnota: string }> = ({ hodnota }) => {
  const [skopirovane, setSkopirovane] = useState(false);
  return (
    <button
      type="button"
      className="blok__kopirovat"
      onClick={() => {
        navigator.clipboard?.writeText(hodnota).then(() => {
          setSkopirovane(true);
          window.setTimeout(() => setSkopirovane(false), 1600);
        });
      }}
    >
      {skopirovane ? 'Skopírované ✓' : 'Kopírovať'}
    </button>
  );
};

const DvePercenta: KomponentBloku = ({ blok: { data } }) => {
  const { nastavenia } = useNastavenia();
  const u = (nastavenia as { udaje?: Record<string, string | null> }).udaje ?? {};
  // Prázdne polia bloku sa doplnia z nastavení klubu
  const riadky = [
    ['Obchodné meno / názov', data.prijimatel || u.pravny_nazov || nastavenia.nazov],
    ['IČO', data.ico || u.ico],
    ['Právna forma', data.pravna_forma],
    ['Sídlo', data.sidlo || nastavenia.kontakt?.adresa],
  ].filter(([, h]) => h) as Array<[string, string]>;
  return (
    <div className="blok__dane">
      <HlavickaBloku nadpis={data.nadpis} uvod={data.text} />
      <dl className="blok__dane-udaje">
        {riadky.map(([popis, hodnota]) => (
          <div key={popis}>
            <dt>{popis}</dt>
            <dd>
              <strong>{hodnota}</strong>
              <Kopirovat hodnota={hodnota} />
            </dd>
          </div>
        ))}
      </dl>
      {(data.termin || data.tlacivo) && (
        <div className="blok__dane-spodok">
          {data.termin && (
            <p className="blok__dane-termin">
              Termín: <strong>{data.termin}</strong>
            </p>
          )}
          {data.tlacivo && (
            <OdkazBloku to={data.tlacivo} className="blok__tlacidlo blok__tlacidlo--hlavne">
              Stiahnuť vyhlásenie
            </OdkazBloku>
          )}
        </div>
      )}
      {data.poznamka && <p className="blok__dane-poznamka">{data.poznamka}</p>}
    </div>
  );
};

export const ROZSIRENE_BLOKY: Record<string, KomponentBloku> = {
  tlacidla: Tlacidla,
  podmenu: Podmenu,
  tabulka: Tabulka,
  stlpce: Stlpce,
  kroky: Kroky,
  vyhody: Vyhody,
  cennik: Cennik,
  oddelovac: Oddelovac,
  kontakt: Kontakt,
  stadion: Stadion,
  registracia: Registracia,
  dve_percenta: DvePercenta,
};
