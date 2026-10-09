// Umiestnenie: sablony/zakladna/src/stranky/Obchod.tsx
// Stránky obchodu základnej šablóny: zoznam produktov (/obchod), produkt
// (/obchod/:slug), košík (/kosik), pokladňa (/pokladna) a stav objednávky
// (/objednavka/:token). Správanie (košík, ceny, odoslanie) je v jadre,
// tu je len jednoduchý vzhľad - iné šablóny ho môžu nahradiť.

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  NAZVY_STAVOV_OBJEDNAVKY,
  infoPlatby,
  kartaStavuObjednavky,
  PlatobnaBrana,
  cenaSVolbami,
  cenaText,
  hodnotaVypredana,
  sanitizedHtmlProps,
  souborUrl,
  useData,
  useKosik,
  useObchod,
  useObjednavka,
  usePokladna,
  type KategoriaObchodu,
  type ProduktObchodu,
} from '@clubw/jadro';
import './Obchod.css';

const useTitulok = (text: string) => {
  useEffect(() => {
    document.title = text;
  }, [text]);
};

/** Obchod je vypnutý - návštevník vidí len oznam. */
const ObchodZatvoreny: React.FC = () => (
  <div className="ob">
    <h1>Obchod</h1>
    <p className="ob__stav">Obchod je momentálne zatvorený.</p>
  </div>
);

const Obrazok: React.FC<{ src: string | null; alt: string }> = ({ src, alt }) =>
  src ? <img src={souborUrl(src)} alt={alt} loading="lazy" /> : <span className="ob__bez-obrazka" aria-hidden="true">🛍</span>;

// ===== /obchod =====

export const Obchod: React.FC = () => {
  useTitulok('Obchod');
  const { obchod, nacitava } = useObchod();
  const [parametre, setParametre] = useSearchParams();
  const kategoria = parametre.get('kategoria') || '';
  const kategorie = useData<KategoriaObchodu[]>('/eshop/kategorie');
  const produkty = useData<ProduktObchodu[]>(`/eshop/produkty?limit=60${kategoria ? `&kategoria=${encodeURIComponent(kategoria)}` : ''}`);
  const mena = obchod?.mena ?? 'EUR';

  if (!nacitava && !obchod?.zapnuty && !produkty.data?.length) return <ObchodZatvoreny />;

  return (
    <div className="ob">
      <div className="ob__hlava">
        <h1>Obchod</h1>
        <OdkazKosika />
      </div>
      {(kategorie.data?.length ?? 0) > 0 && (
        <div className="ob__kategorie">
          <button type="button" className={!kategoria ? 'is-aktivna' : ''} onClick={() => setParametre({})}>
            Všetko
          </button>
          {kategorie.data!.map((k) => (
            <button key={k.id} type="button" className={kategoria === k.slug ? 'is-aktivna' : ''} onClick={() => setParametre({ kategoria: k.slug })}>
              {k.nazov}
            </button>
          ))}
        </div>
      )}
      {produkty.chyba ? (
        <p className="ob__stav">{produkty.chyba}</p>
      ) : produkty.nacitava && !produkty.data ? (
        <p className="ob__stav">Načítavam produkty...</p>
      ) : !produkty.data?.length ? (
        <p className="ob__stav">Zatiaľ tu nie sú žiadne produkty.</p>
      ) : (
        <div className="ob__mriezka">
          {produkty.data.map((p) => (
            <Link key={p.id} to={`/obchod/${p.slug}`} className="ob__karta">
              <span className="ob__foto">
                <Obrazok src={p.obrazok} alt={p.nazov} />
                {p.vypredany && <span className="ob__stitok">Vypredané</span>}
              </span>
              <span className="ob__nazov">{p.nazov}</span>
              <span className="ob__cena">
                {cenaText(p.cena, mena)}
                {p.povodna_cena && p.povodna_cena > p.cena && <s>{cenaText(p.povodna_cena, mena)}</s>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const OdkazKosika: React.FC = () => {
  const { pocet } = useKosik();
  return (
    <Link to="/kosik" className="ob__odkaz-kosika">
      Košík{pocet > 0 ? ` (${pocet})` : ''}
    </Link>
  );
};

// ===== /obchod/:slug =====

export const Produkt: React.FC = () => {
  const { slug = '' } = useParams();
  const { obchod } = useObchod();
  const { data: produkt, nacitava, chyba } = useData<ProduktObchodu>(`/eshop/produkty/${encodeURIComponent(slug)}`);
  const { pridaj } = useKosik();
  const [volby, setVolby] = useState<Record<string, string>>({});
  const [pocet, setPocet] = useState(1);
  const [foto, setFoto] = useState(0);
  const [pridane, setPridane] = useState(false);
  const [skusilPridat, setSkusilPridat] = useState(false);
  useTitulok(produkt?.nazov ?? 'Obchod');
  const mena = obchod?.mena ?? 'EUR';

  if (chyba) {
    return (
      <div className="ob">
        <p className="ob__stav">{chyba}</p>
        <p className="ob__stav">
          <Link to="/obchod">Späť do obchodu</Link>
        </p>
      </div>
    );
  }
  if (nacitava || !produkt) return <div className="ob"><p className="ob__stav">Načítavam...</p></div>;

  const fotky = [produkt.obrazok, ...(produkt.obrazky || [])].filter((x): x is string => Boolean(x));
  const { cena, chybajuce } = cenaSVolbami(produkt, volby);
  const moze = !produkt.vypredany && chybajuce.length === 0;

  const doKosika = () => {
    setSkusilPridat(true);
    if (!moze) return;
    pridaj(produkt, volby, pocet);
    setPridane(true);
  };

  return (
    <div className="ob">
      <p className="ob__drobcek">
        <Link to="/obchod">Obchod</Link>
        {produkt.kategoria && (
          <>
            {' / '}
            <Link to={`/obchod?kategoria=${produkt.kategoria.slug}`}>{produkt.kategoria.nazov}</Link>
          </>
        )}
      </p>
      <div className="ob__produkt">
        <div>
          <div className="ob__hlavne-foto">
            <Obrazok src={fotky[foto] ?? null} alt={produkt.nazov} />
          </div>
          {fotky.length > 1 && (
            <div className="ob__nahlady">
              {fotky.map((f, i) => (
                <button key={f + i} type="button" className={i === foto ? 'is-aktivny' : ''} onClick={() => setFoto(i)} aria-label={`Fotografia ${i + 1}`}>
                  <img src={souborUrl(f)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <h1>{produkt.nazov}</h1>
          <p className="ob__cena ob__cena--velka">
            {cenaText(cena, mena)}
            {produkt.povodna_cena && produkt.povodna_cena > produkt.cena && <s>{cenaText(produkt.povodna_cena, mena)}</s>}
          </p>
          {produkt.kratky_popis && <p className="ob__kratky">{produkt.kratky_popis}</p>}

          {produkt.vlastnosti.map((v) => (
            <div key={v.id} className="ob__vlastnost">
              <span className="ob__menovka">
                {v.nazov}
                {v.povinna && ' *'}
                {v.typ === 'text' && v.priplatok > 0 && <small> +{cenaText(v.priplatok, mena)}</small>}
              </span>
              {v.typ === 'vyber' ? (
                <div className="ob__hodnoty">
                  {v.hodnoty.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      disabled={hodnotaVypredana(h)}
                      className={volby[v.id] === h.id ? 'is-zvolena' : ''}
                      onClick={() => setVolby({ ...volby, [v.id]: h.id })}
                    >
                      {h.nazov}
                      {h.priplatok > 0 && <small> +{cenaText(h.priplatok, mena)}</small>}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={volby[v.id] ?? ''}
                  maxLength={v.max_dlzka ?? 60}
                  onChange={(e) => setVolby({ ...volby, [v.id]: e.target.value })}
                />
              )}
            </div>
          ))}

          {produkt.vypredany ? (
            <p className="ob__chyba">Produkt je vypredaný.</p>
          ) : (
            <div className="ob__pridat">
              <input type="number" min={1} max={99} value={pocet} onChange={(e) => setPocet(Math.min(99, Math.max(1, Number(e.target.value) || 1)))} aria-label="Počet kusov" />
              <button type="button" className="ob__tlacidlo" onClick={doKosika}>
                Pridať do košíka
              </button>
            </div>
          )}
          {skusilPridat && chybajuce.length > 0 && <p className="ob__chyba">Vyberte: {chybajuce.join(', ')}</p>}
          {pridane && (
            <p className="ob__ok">
              Pridané do košíka. <Link to="/kosik">Zobraziť košík</Link>
            </p>
          )}
          {produkt.sklad !== null && produkt.sklad > 0 && produkt.sklad <= 5 && <p className="ob__tlmene">Posledné kusy na sklade ({produkt.sklad})</p>}
          {produkt.popis && <div className="ob__popis" {...sanitizedHtmlProps(produkt.popis)} />}
        </div>
      </div>
    </div>
  );
};

// ===== /kosik =====

export const Kosik: React.FC = () => {
  useTitulok('Košík');
  const { obchod } = useObchod();
  const { polozky, medzisucet, zmenPocet, odstran } = useKosik();
  const mena = obchod?.mena ?? 'EUR';

  return (
    <div className="ob ob--uzke">
      <h1>Košík</h1>
      {polozky.length === 0 ? (
        <p className="ob__stav">
          Košík je prázdny. <Link to="/obchod">Pokračovať v nákupe</Link>
        </p>
      ) : (
        <>
          <ul className="ob__polozky">
            {polozky.map((p) => (
              <li key={p.kluc}>
                <span className="ob__mini-foto">
                  <Obrazok src={p.obrazok} alt="" />
                </span>
                <span className="ob__polozka-text">
                  <Link to={`/obchod/${p.slug}`}>{p.nazov}</Link>
                  {p.popis_volieb.length > 0 && <small>{p.popis_volieb.join(' · ')}</small>}
                  <small>{cenaText(p.cena_za_kus, mena)} / ks</small>
                </span>
                <span className="ob__pocet">
                  <button type="button" onClick={() => zmenPocet(p.kluc, p.pocet - 1)} aria-label="Menej">
                    −
                  </button>
                  <span>{p.pocet}</span>
                  <button type="button" onClick={() => zmenPocet(p.kluc, p.pocet + 1)} aria-label="Viac">
                    +
                  </button>
                </span>
                <strong>{cenaText(p.cena_za_kus * p.pocet, mena)}</strong>
                <button type="button" className="ob__odstranit" onClick={() => odstran(p.kluc)} aria-label="Odstrániť">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="ob__suhrn">
            <span>Medzisúčet</span>
            <strong>{cenaText(medzisucet, mena)}</strong>
          </div>
          <div className="ob__akcie">
            <Link to="/obchod">Pokračovať v nákupe</Link>
            <Link to="/pokladna" className="ob__tlacidlo">
              Pokračovať k objednávke
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

// ===== /pokladna =====

export const Pokladna: React.FC = () => {
  useTitulok('Objednávka');
  const p = usePokladna();
  const navigate = useNavigate();
  const mena = p.obchod?.mena ?? 'EUR';

  if (!p.nacitava && !p.obchod?.zapnuty) return <ObchodZatvoreny />;
  if (p.kosik.polozky.length === 0) {
    return (
      <div className="ob ob--uzke">
        <h1>Objednávka</h1>
        <p className="ob__stav">
          Košík je prázdny. <Link to="/obchod">Späť do obchodu</Link>
        </p>
      </div>
    );
  }

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await p.odosli();
    if (token) navigate(`/objednavka/${token}`);
  };

  const pole = (kluc: keyof typeof p.udaje, menovka: string, typ = 'text', povinne = false) => (
    <label className="ob__pole">
      <span>
        {menovka}
        {povinne && ' *'}
      </span>
      <input type={typ} value={p.udaje[kluc]} required={povinne} onChange={(e) => p.nastav({ [kluc]: e.target.value })} />
    </label>
  );

  return (
    <form className="ob ob__pokladna" onSubmit={odosli}>
      <div>
        <h1>Objednávka</h1>
        <fieldset>
          <legend>Kontaktné údaje</legend>
          {pole('meno', 'Meno a priezvisko', 'text', true)}
          <div className="ob__dve">
            {pole('email', 'E-mail', 'email', true)}
            {pole('telefon', 'Telefón', 'tel', p.potrebnaAdresa)}
          </div>
        </fieldset>
        <fieldset>
          <legend>Doručenie</legend>
          {p.dorucenia.map((d) => (
            <label key={d.id} className={`ob__volba${p.dorucenie?.id === d.id ? ' is-zvolena' : ''}`}>
              <input type="radio" name="dorucenie" checked={p.dorucenie?.id === d.id} onChange={() => p.setDorucenieId(d.id)} />
              <span>
                <strong>{d.nazov}</strong>
                {d.popis && <small>{d.popis}</small>}
                {d.zadarmo_od !== null && <small>Zadarmo od {cenaText(d.zadarmo_od, mena)}</small>}
              </span>
              <em>{d.cena > 0 && !(d.zadarmo_od !== null && p.kosik.medzisucet >= d.zadarmo_od) ? cenaText(d.cena, mena) : 'Zadarmo'}</em>
            </label>
          ))}
        </fieldset>
        {p.potrebnaAdresa && (
          <fieldset>
            <legend>Adresa doručenia</legend>
            {pole('ulica', 'Ulica a číslo', 'text', true)}
            <div className="ob__dve">
              {pole('mesto', 'Mesto', 'text', true)}
              {pole('psc', 'PSČ', 'text', true)}
            </div>
            {pole('krajina', 'Krajina')}
          </fieldset>
        )}
        <fieldset>
          <legend>Platba</legend>
          {p.platby.map((pl) => (
            <label key={pl.id} className={`ob__volba${p.platba?.id === pl.id ? ' is-zvolena' : ''}`}>
              <input type="radio" name="platba" checked={p.platba?.id === pl.id} onChange={() => p.setPlatbaId(pl.id)} />
              <span>
                <strong>{pl.nazov}</strong>
                {pl.popis && <small>{pl.popis}</small>}
              </span>
              <em>{pl.poplatok > 0 ? `+${cenaText(pl.poplatok, mena)}` : ''}</em>
            </label>
          ))}
          {p.platby.length === 0 && <p className="ob__tlmene">K zvolenému doručeniu nie je dostupná žiadna platba.</p>}
        </fieldset>
        <label className="ob__pole">
          <span>Poznámka</span>
          <textarea rows={3} value={p.udaje.poznamka} onChange={(e) => p.nastav({ poznamka: e.target.value })} />
        </label>
      </div>

      <aside className="ob__zhrnutie">
        <h2>Zhrnutie</h2>
        <ul>
          {p.kosik.polozky.map((x) => (
            <li key={x.kluc}>
              <span>
                {x.pocet}× {x.nazov}
                {x.popis_volieb.length > 0 && <small>{x.popis_volieb.join(' · ')}</small>}
              </span>
              <span>{cenaText(x.cena_za_kus * x.pocet, mena)}</span>
            </li>
          ))}
          <li>
            <span>Doručenie</span>
            <span>{cenaText(p.cenaDorucenia, mena)}</span>
          </li>
          {p.poplatok > 0 && (
            <li>
              <span>Poplatok za platbu</span>
              <span>{cenaText(p.poplatok, mena)}</span>
            </li>
          )}
        </ul>
        <p className="ob__spolu">
          <span>Spolu</span>
          <strong>{cenaText(p.spolu, mena)}</strong>
        </p>
        {p.obchod?.podmienky_url && (
          <label className="ob__suhlas">
            <input type="checkbox" checked={p.suhlas} onChange={(e) => p.setSuhlas(e.target.checked)} />
            <span>
              Súhlasím s{' '}
              <a href={p.obchod.podmienky_url} target="_blank" rel="noopener noreferrer">
                obchodnými podmienkami
              </a>
            </span>
          </label>
        )}
        {p.chybaMinimum !== null && <p className="ob__chyba">Najnižšia objednávka je {cenaText(p.chybaMinimum, mena)}.</p>}
        {p.chyba && <p className="ob__chyba">{p.chyba}</p>}
        <button type="submit" className="ob__tlacidlo" disabled={p.odosiela || p.chybaMinimum !== null}>
          {p.odosiela ? 'Odosielam...' : 'Odoslať objednávku'}
        </button>
      </aside>
    </form>
  );
};

// ===== /objednavka/:token =====

export const Objednavka: React.FC = () => {
  const { token = '' } = useParams();
  const { objednavka: o, chyba, overuje } = useObjednavka(token);
  useTitulok(o ? `Objednávka ${o.cislo}` : 'Objednávka');

  if (chyba) return <div className="ob ob--uzke"><p className="ob__stav">{chyba}</p></div>;
  if (!o) return <div className="ob ob--uzke"><p className="ob__stav">Načítavam objednávku...</p></div>;

  return (
    <div className="ob ob--uzke">
      <h1>Objednávka {o.cislo}</h1>
      <p className="ob__stavy">
        <span className={`ob__odznak ob__odznak--${o.stav}`}>{NAZVY_STAVOV_OBJEDNAVKY[o.stav] ?? o.stav}</span>
        <span className={`ob__odznak ob__odznak--${infoPlatby(o).ton}`}>{infoPlatby(o).odznak}</span>
      </p>
      {infoPlatby(o).text && <p className="ob__tlmene">{infoPlatby(o).text}</p>}
      {kartaStavuObjednavky(o) && <p className="ob__ok">{kartaStavuObjednavky(o)!.nadpis}. {kartaStavuObjednavky(o)!.text}</p>}
      {o.stav !== 'zrusena' && <p className="ob__ok">{o.text_potvrdenia || `Ďakujeme za objednávku. Potvrdenie sme poslali na ${o.email}.`}</p>}
      {overuje && <p className="ob__tlmene">Overujeme platbu...</p>}
      {o.pokyny && <div className="ob__pokyny">{o.pokyny}</div>}
      {o.brana_html && (
        <div className="ob__brana">
          <PlatobnaBrana html={o.brana_html} />
        </div>
      )}
      <ul className="ob__polozky ob__polozky--suhrn">
        {o.polozky.map((x) => (
          <li key={x.id}>
            <span className="ob__polozka-text">
              {x.pocet}× {x.nazov}
              {x.vlastnosti.length > 0 && <small>{x.vlastnosti.map((v) => `${v.nazov}: ${v.hodnota}`).join(' · ')}</small>}
            </span>
            <strong>{cenaText(x.spolu, o.mena)}</strong>
          </li>
        ))}
        <li>
          <span className="ob__polozka-text">{o.dorucenie_nazov}</span>
          <strong>{cenaText(o.dorucenie_cena, o.mena)}</strong>
        </li>
        <li>
          <span className="ob__polozka-text">{o.platba_nazov}</span>
          <strong>{cenaText(o.platba_poplatok, o.mena)}</strong>
        </li>
      </ul>
      <div className="ob__suhrn">
        <span>Spolu</span>
        <strong>{cenaText(o.spolu, o.mena)}</strong>
      </div>
      <p className="ob__tlmene">
        {o.meno} · {o.email}
        {o.telefon && ` · ${o.telefon}`}
        {o.ulica && <><br />{o.ulica}, {o.psc} {o.mesto}{o.krajina ? `, ${o.krajina}` : ''}</>}
      </p>
      <p>
        <Link to="/obchod">Späť do obchodu</Link>
      </p>
    </div>
  );
};
