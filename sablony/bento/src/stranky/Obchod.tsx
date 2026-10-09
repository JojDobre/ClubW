// Umiestnenie: sablony/bento/src/stranky/Obchod.tsx
// Fanshop: zoznam produktov s kategóriami, detail produktu s výberom
// vlastností (veľkosť, meno na dres...), košík, pokladňa a stav
// objednávky s pokynmi k platbe alebo platobnou bránou.
//
// Košík, ceny a odoslanie objednávky rieši jadro (useKosik, usePokladna),
// tu je len vzhľad. Na mobile sa obchod správa ako aplikácia: mriežka
// po dvoch, lišta „Do košíka" nad spodnými záložkami.

import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  PlatobnaBrana,
  cenaSVolbami,
  cenaText,
  hodnotaVypredana,
  sanitizeHtml,
  useKosik,
  useObchod,
  useObjednavka,
  krokyObjednavky,
  infoPlatby,
  kartaStavuObjednavky,
  usePokladna,
  type KategoriaObchodu,
  type ObjednavkaZakaznika,
  type ProduktObchodu,
  type UdajeZakaznika,
} from '@clubw/jadro';
import { Chyba, ChybaStranky, Filtre, HlavickaStranky, Nacitava, Obrazok, Prazdne, Sekcia } from '../casti';
import { Ikona, obrazokUrl, useApi, useTitulok, useUpravy } from '../spolocne';

// ===== Spoločné =====

const Cena: React.FC<{ cena: number; povodna?: number | null; mena: string; className?: string }> = ({ cena, povodna, mena, className = '' }) => (
  <span className={`db-cena ${className}`}>
    <strong>{cenaText(cena, mena)}</strong>
    {povodna && povodna > cena && <s>{cenaText(povodna, mena)}</s>}
  </span>
);

/** Plus/mínus s počtom kusov. */
const Pocitadlo: React.FC<{ pocet: number; onZmena: (n: number) => void; min?: number; male?: boolean }> = ({ pocet, onZmena, min = 1, male = false }) => (
  <span className={`db-pocitadlo${male ? ' db-pocitadlo--male' : ''}`}>
    <button type="button" onClick={() => onZmena(pocet - 1)} disabled={pocet <= min} aria-label="Menej kusov">
      −
    </button>
    <span aria-live="polite">{pocet}</span>
    <button type="button" onClick={() => onZmena(Math.min(99, pocet + 1))} disabled={pocet >= 99} aria-label="Viac kusov">
      +
    </button>
  </span>
);

const Zatvorene: React.FC = () => (
  <div className="db-stranka">
    <HlavickaStranky stitok="Fanshop" nadpis="Obchod" />
    <Sekcia className="db-sekcia--hore db-sekcia--mriezka">
      <Prazdne nadpis="Obchod je momentálne zatvorený" text="Skúste to prosím neskôr." />
    </Sekcia>
  </div>
);

// ===== Karta produktu =====

/** Karta produktu - rovnaká ako vo Fanshope na úvode, namiesto tlačidla šípka. */
export const KartaProduktu: React.FC<{ produkt: ProduktObchodu; mena: string }> = ({ produkt: p, mena }) => (
  <Link to={`/obchod/${p.slug}`} className={`db-produkt db-tovar${p.vypredany ? ' is-vypredany' : ''}`}>
    <span className="db-tovar__foto">
      <Obrazok src={p.obrazok} className="db-produkt__obrazok db-tovar__obrazok" alt={p.nazov} />
      {p.vypredany ? (
        <span className="db-tovar__stitok db-tovar__stitok--tmavy">Vypredané</span>
      ) : p.povodna_cena && p.povodna_cena > p.cena ? (
        <span className="db-tovar__stitok">−{Math.round((1 - p.cena / p.povodna_cena) * 100)} %</span>
      ) : null}
    </span>
    <span className="db-produkt__nazov">{p.nazov}</span>
    <span className="db-produkt__spodok">
      <Cena cena={p.cena} povodna={p.povodna_cena} mena={mena} className="db-produkt__cena" />
      <span className="db-tovar__sipka" aria-hidden="true">
        <Ikona nazov="sipka" velkost={16} />
      </span>
    </span>
  </Link>
);

// ===== /obchod =====

export const Obchod: React.FC = () => {
  const u = useUpravy();
  useTitulok('Fanshop');
  const { obchod, nacitava: nacitavaObchod } = useObchod();
  const [parametre, setParametre] = useSearchParams();
  const kategoria = parametre.get('kategoria') || '';
  const kategorie = useApi<KategoriaObchodu[]>('/eshop/kategorie');
  const produkty = useApi<ProduktObchodu[]>(`/eshop/produkty?limit=60${kategoria ? `&kategoria=${encodeURIComponent(kategoria)}` : ''}`);
  const mena = obchod?.mena ?? 'EUR';

  // Správca vidí obchod aj pred zapnutím (náhľad), návštevník oznam
  if (!nacitavaObchod && !obchod?.zapnuty && !produkty.nacitava && !produkty.data?.length) return <Zatvorene />;

  const aktivna = kategorie.data?.find((k) => k.slug === kategoria);

  return (
    <div className="db-stranka db-obchod">
      <HlavickaStranky stitok={u.text('stranka_obchod_stitok', 'Fanshop')} nadpis={aktivna?.nazov ?? u.text('stranka_obchod_nadpis', 'Oficiálny fanshop')}>
        <p className="db-hlava__popis">{aktivna?.popis || u.text('stranka_obchod_popis', 'Dresy, šály a doplnky pre všetkých fanúšikov. Každým nákupom podporujete klub.')}</p>
      </HlavickaStranky>

      {(kategorie.data?.length ?? 0) > 1 && (
        <Sekcia className="db-sekcia--filtre">
          <Filtre
            popis="Kategórie produktov"
            aktivna={kategoria}
            onZmena={(k) => setParametre(k ? { kategoria: k } : {})}
            moznosti={[{ kluc: '', nazov: 'Všetko' }, ...kategorie.data!.map((k) => ({ kluc: k.slug, nazov: k.nazov }))]}
          />
        </Sekcia>
      )}

      <Sekcia className={`db-sekcia--mriezka${(kategorie.data?.length ?? 0) > 1 ? '' : ' db-sekcia--hore'}`}>
        {produkty.nacitava && !produkty.data ? (
          <Nacitava text="Načítavam produkty…" />
        ) : produkty.chyba ? (
          <Chyba text={produkty.chyba} />
        ) : !produkty.data?.length ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne produkty" text="Nové produkty pripravujeme." />
        ) : (
          <div className="db-obchod__mriezka">
            {produkty.data.map((p) => (
              <KartaProduktu key={p.id} produkt={p} mena={mena} />
            ))}
          </div>
        )}
      </Sekcia>
    </div>
  );
};

// ===== /obchod/:slug =====

export const Produkt: React.FC = () => {
  const { slug = '' } = useParams();
  const { obchod } = useObchod();
  const { data: produkt, nacitava, chyba } = useApi<ProduktObchodu>(`/eshop/produkty/${encodeURIComponent(slug)}`);
  const { pridaj } = useKosik();
  const [volby, setVolby] = useState<Record<string, string>>({});
  const [pocet, setPocet] = useState(1);
  const [foto, setFoto] = useState(0);
  const [pridane, setPridane] = useState(false);
  const [skusil, setSkusil] = useState(false);
  useTitulok(produkt?.nazov ?? 'Fanshop');
  const mena = obchod?.mena ?? 'EUR';

  if (nacitava) return <Nacitava />;
  if (chyba || !produkt) {
    return (
      <div className="db-stranka">
        <HlavickaStranky stitok="Fanshop" nadpis="Produkt sa nenašiel" spat={{ odkaz: '/obchod', text: 'Späť do obchodu' }} />
        <ChybaStranky text={chyba || 'Produkt neexistuje alebo už nie je v predaji.'} />
      </div>
    );
  }

  const fotky = [produkt.obrazok, ...(produkt.obrazky || [])].filter((x): x is string => Boolean(x));
  const { cena, chybajuce } = cenaSVolbami(produkt, volby);
  const dorucenia = obchod?.dorucenia ?? [];
  const najlacnejsia = dorucenia.length ? Math.min(...dorucenia.map((d) => d.cena)) : null;
  const zadarmoOd = dorucenia.map((d) => d.zadarmo_od).filter((x): x is number => x !== null);

  const zvol = (id: string, hodnota: string) => {
    setVolby((v) => ({ ...v, [id]: hodnota }));
    setPridane(false);
  };

  const doKosika = () => {
    setSkusil(true);
    if (produkt.vypredany || chybajuce.length) return;
    pridaj(produkt, volby, pocet);
    setPridane(true);
  };

  return (
    <div className="db-stranka db-produkt-stranka">
      <Sekcia className="db-sekcia--produkt">
        <nav className="db-drobceky" aria-label="Umiestnenie">
          <Link to="/obchod">Fanshop</Link>
          {produkt.kategoria && (
            <>
              <Ikona nazov="vpravo" velkost={12} />
              <Link to={`/obchod?kategoria=${produkt.kategoria.slug}`}>{produkt.kategoria.nazov}</Link>
            </>
          )}
        </nav>

        <div className="db-produkt-detail">
          <div className="db-galeria-produktu">
            <div className="db-galeria-produktu__hlavna">
              <Obrazok src={fotky[foto] ?? null} className="db-galeria-produktu__obrazok" alt={produkt.nazov} />
            </div>
            {fotky.length > 1 && (
              <div className="db-galeria-produktu__nahlady">
                {fotky.map((f, i) => (
                  <button key={f + i} type="button" className={i === foto ? 'is-aktivny' : ''} onClick={() => setFoto(i)} aria-label={`Fotografia ${i + 1}`}>
                    <img src={obrazokUrl(f) ?? ''} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="db-produkt-info">
            {produkt.kategoria && <span className="db-hlava__stitok">{produkt.kategoria.nazov}</span>}
            <h1>{produkt.nazov}</h1>
            <Cena cena={cena} povodna={produkt.povodna_cena && produkt.povodna_cena > produkt.cena ? produkt.povodna_cena + (cena - produkt.cena) : null} mena={mena} className="db-cena--velka" />
            {produkt.kratky_popis && <p className="db-produkt-info__popis">{produkt.kratky_popis}</p>}

            {produkt.vlastnosti.map((v) => {
              const chyba = skusil && chybajuce.includes(v.nazov);
              return (
                <div key={v.id} className={`db-vlastnost${chyba ? ' is-chyba' : ''}`}>
                  <span className="db-vlastnost__nazov">
                    {v.nazov}
                    {!v.povinna && v.typ === 'text' && <small> (nepovinné)</small>}
                    {v.typ === 'text' && v.priplatok > 0 && <small> +{cenaText(v.priplatok, mena)}</small>}
                  </span>
                  {v.typ === 'vyber' ? (
                    <div className="db-vlastnost__hodnoty" role="radiogroup" aria-label={v.nazov}>
                      {v.hodnoty.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          role="radio"
                          aria-checked={volby[v.id] === h.id}
                          disabled={hodnotaVypredana(h)}
                          className={`db-volba${volby[v.id] === h.id ? ' is-zvolena' : ''}`}
                          onClick={() => zvol(v.id, h.id)}
                          title={hodnotaVypredana(h) ? 'Vypredané' : undefined}
                        >
                          {h.nazov}
                          {h.priplatok > 0 && <small>+{cenaText(h.priplatok, mena)}</small>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="db-pole__vstup"
                      type="text"
                      value={volby[v.id] ?? ''}
                      maxLength={v.max_dlzka ?? 60}
                      onChange={(e) => zvol(v.id, e.target.value)}
                      aria-label={v.nazov}
                    />
                  )}
                  {chyba && <span className="db-vlastnost__chyba">{v.typ === 'vyber' ? 'Vyberte možnosť' : 'Vyplňte pole'}</span>}
                </div>
              );
            })}

            {produkt.vypredany ? (
              <p className="db-produkt-info__vypredane">Produkt je momentálne vypredaný.</p>
            ) : (
              <div className="db-produkt-info__kupit">
                <Pocitadlo pocet={pocet} onZmena={setPocet} />
                <button type="button" className="db-tlacidlo db-tlacidlo--akcent db-produkt-info__tlacidlo" onClick={doKosika}>
                  Pridať do košíka
                </button>
              </div>
            )}
            {pridane && (
              <div className="db-pridane" role="status">
                <span>
                  <Ikona nazov="kosik" velkost={18} /> Pridané do košíka
                </span>
                <Link to="/kosik" className="db-tlacidlo db-tlacidlo--tmave">
                  Do košíka
                </Link>
              </div>
            )}

            <ul className="db-produkt-info__vyhody">
              {produkt.sklad !== null && produkt.sklad > 0 && produkt.sklad <= 5 && (
                <li>
                  <Ikona nazov="hodiny" /> Posledné kusy na sklade
                </li>
              )}
              {najlacnejsia !== null && (
                <li>
                  <Ikona nazov="doprava" /> {najlacnejsia === 0 ? 'Doprava od 0 € (osobný odber)' : `Doprava od ${cenaText(najlacnejsia, mena)}`}
                  {zadarmoOd.length > 0 && `, zadarmo od ${cenaText(Math.min(...zadarmoOd), mena)}`}
                </li>
              )}
              <li>
                <Ikona nazov="srdce" /> Nákupom podporujete klub
              </li>
            </ul>
          </div>
        </div>

        {produkt.popis && (
          <div className="db-produkt-popis">
            <h2>Popis produktu</h2>
            <div className="db-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(produkt.popis) }} />
          </div>
        )}
      </Sekcia>

      {/* Mobil: cena a tlačidlo stále po ruke nad spodnými záložkami */}
      {!produkt.vypredany && (
        <div className="db-lista-kupit">
          <Cena cena={cena * pocet} mena={mena} />
          {pridane ? (
            <Link to="/kosik" className="db-tlacidlo db-tlacidlo--tmave">
              Do košíka
            </Link>
          ) : (
            <button type="button" className="db-tlacidlo db-tlacidlo--akcent" onClick={doKosika}>
              Pridať do košíka
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ===== /kosik =====

export const Kosik: React.FC = () => {
  useTitulok('Košík');
  const { obchod } = useObchod();
  const { polozky, pocet, medzisucet, zmenPocet, odstran } = useKosik();
  const mena = obchod?.mena ?? 'EUR';
  const dorucenia = obchod?.dorucenia ?? [];
  const zadarmoOd = dorucenia.map((d) => d.zadarmo_od).filter((x): x is number => x !== null);
  const doZadarmo = zadarmoOd.length ? Math.min(...zadarmoOd) - medzisucet : null;

  return (
    <div className="db-stranka db-kosik-stranka">
      <HlavickaStranky stitok="Fanshop" nadpis="Košík">
        {pocet > 0 && <p className="db-hlava__popis">{pocet === 1 ? '1 kus' : pocet < 5 ? `${pocet} kusy` : `${pocet} kusov`}</p>}
      </HlavickaStranky>
      <Sekcia className="db-sekcia--hore db-sekcia--mriezka">
        {polozky.length === 0 ? (
          <Prazdne nadpis="Košík je prázdny" text="Vyberte si niečo z nášho fanshopu.">
            <Link to="/obchod" className="db-tlacidlo-dalsie">
              Do obchodu
            </Link>
          </Prazdne>
        ) : (
          <div className="db-pokladna">
            <div>
              <ul className="db-kosik">
                {polozky.map((p) => (
                  <li key={p.kluc} className="db-kosik__polozka">
                    <Link to={`/obchod/${p.slug}`} className="db-kosik__foto" tabIndex={-1} aria-hidden="true">
                      <Obrazok src={p.obrazok} className="db-kosik__obrazok" />
                    </Link>
                    <div className="db-kosik__text">
                      <Link to={`/obchod/${p.slug}`}>{p.nazov}</Link>
                      {p.popis_volieb.map((x) => (
                        <small key={x}>{x}</small>
                      ))}
                      <small>{cenaText(p.cena_za_kus, mena)} / ks</small>
                    </div>
                    <Pocitadlo pocet={p.pocet} onZmena={(n) => zmenPocet(p.kluc, n)} min={1} male />
                    <strong className="db-kosik__spolu">{cenaText(p.cena_za_kus * p.pocet, mena)}</strong>
                    <button type="button" className="db-kosik__odstranit" onClick={() => odstran(p.kluc)} aria-label={`Odstrániť ${p.nazov}`}>
                      <Ikona nazov="zavriet" velkost={16} />
                    </button>
                  </li>
                ))}
              </ul>
              <Link to="/obchod" className="db-spat db-spat--tmava">
                <Ikona nazov="vlavo" velkost={14} /> Pokračovať v nákupe
              </Link>
            </div>
            <aside className="db-suhrn">
              <h2>Súhrn</h2>
              <div className="db-suhrn__riadok">
                <span>Tovar</span>
                <span>{cenaText(medzisucet, mena)}</span>
              </div>
              <div className="db-suhrn__riadok db-suhrn__riadok--tlmeny">
                <span>Doprava</span>
                <span>vyberiete v ďalšom kroku</span>
              </div>
              {doZadarmo !== null && doZadarmo > 0 && (
                <p className="db-suhrn__tip">
                  Nakúpte ešte za <strong>{cenaText(doZadarmo, mena)}</strong> a doprava je zadarmo.
                </p>
              )}
              <div className="db-suhrn__spolu">
                <span>Spolu</span>
                <strong>{cenaText(medzisucet, mena)}</strong>
              </div>
              <Link to="/pokladna" className="db-tlacidlo db-tlacidlo--akcent db-suhrn__tlacidlo">
                Pokračovať k objednávke
              </Link>
            </aside>
          </div>
        )}
      </Sekcia>
    </div>
  );
};

// ===== /pokladna =====

export const Pokladna: React.FC = () => {
  useTitulok('Objednávka');
  const p = usePokladna();
  const navigate = useNavigate();
  const mena = p.obchod?.mena ?? 'EUR';

  if (p.nacitava) return <Nacitava />;
  if (!p.obchod?.zapnuty) return <Zatvorene />;
  if (p.kosik.polozky.length === 0) {
    return (
      <div className="db-stranka">
        <HlavickaStranky stitok="Fanshop" nadpis="Objednávka" />
        <Sekcia className="db-sekcia--hore db-sekcia--mriezka">
          <Prazdne nadpis="Košík je prázdny" text="Najprv si vyberte tovar.">
            <Link to="/obchod" className="db-tlacidlo-dalsie">
              Do obchodu
            </Link>
          </Prazdne>
        </Sekcia>
      </div>
    );
  }

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await p.odosli();
    if (token) navigate(`/objednavka/${token}`);
  };

  const pole = (kluc: keyof UdajeZakaznika, menovka: string, vlastnosti: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="db-pole">
      <span className="db-pole__menovka">
        {menovka}
        {vlastnosti.required && <em aria-hidden="true"> *</em>}
      </span>
      <input className="db-pole__vstup" value={p.udaje[kluc]} onChange={(e) => p.nastav({ [kluc]: e.target.value })} {...vlastnosti} />
    </label>
  );

  let krok = 0;
  const cislo = () => ++krok;

  return (
    <div className="db-stranka db-pokladna-stranka">
      <HlavickaStranky stitok="Fanshop" nadpis="Objednávka" spat={{ odkaz: '/kosik', text: 'Späť do košíka' }} />
      <Sekcia className="db-sekcia--hore db-sekcia--mriezka">
        <form className="db-pokladna" onSubmit={odosli} noValidate>
          <div className="db-pokladna__kroky">
            <fieldset className="db-krok">
              <legend>
                <span>{cislo()}</span> Kontaktné údaje
              </legend>
              {pole('meno', 'Meno a priezvisko', { required: true, autoComplete: 'name' })}
              <div className="db-pole__dve">
                {pole('email', 'E-mail', { required: true, type: 'email', autoComplete: 'email', inputMode: 'email' })}
                {pole('telefon', 'Telefón', { required: p.potrebnaAdresa, type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
              </div>
            </fieldset>

            <fieldset className="db-krok">
              <legend>
                <span>{cislo()}</span> Doručenie
              </legend>
              <div className="db-moznosti">
                {p.dorucenia.map((d) => {
                  const zadarmo = d.cena === 0 || (d.zadarmo_od !== null && p.kosik.medzisucet >= d.zadarmo_od);
                  return (
                    <label key={d.id} className={`db-moznost${p.dorucenie?.id === d.id ? ' is-zvolena' : ''}`}>
                      <input type="radio" name="dorucenie" checked={p.dorucenie?.id === d.id} onChange={() => p.setDorucenieId(d.id)} />
                      <span className="db-moznost__text">
                        <strong>{d.nazov}</strong>
                        {d.popis && <small>{d.popis}</small>}
                        {!zadarmo && d.zadarmo_od !== null && <small>Zadarmo od {cenaText(d.zadarmo_od, mena)}</small>}
                      </span>
                      <span className="db-moznost__cena">{zadarmo ? 'Zadarmo' : cenaText(d.cena, mena)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {p.potrebnaAdresa && (
              <fieldset className="db-krok">
                <legend>
                  <span>{cislo()}</span> Adresa doručenia
                </legend>
                {pole('ulica', 'Ulica a číslo', { required: true, autoComplete: 'street-address' })}
                <div className="db-pole__dve db-pole__dve--psc">
                  {pole('psc', 'PSČ', { required: true, autoComplete: 'postal-code', inputMode: 'numeric' })}
                  {pole('mesto', 'Mesto', { required: true, autoComplete: 'address-level2' })}
                </div>
                {pole('krajina', 'Krajina', { autoComplete: 'country-name' })}
              </fieldset>
            )}

            <fieldset className="db-krok">
              <legend>
                <span>{cislo()}</span> Platba
              </legend>
              {p.platby.length === 0 ? (
                <p className="db-krok__pozn">K zvolenému doručeniu nie je dostupná žiadna platba.</p>
              ) : (
                <div className="db-moznosti">
                  {p.platby.map((pl) => (
                    <label key={pl.id} className={`db-moznost${p.platba?.id === pl.id ? ' is-zvolena' : ''}`}>
                      <input type="radio" name="platba" checked={p.platba?.id === pl.id} onChange={() => p.setPlatbaId(pl.id)} />
                      <span className="db-moznost__text">
                        <strong>{pl.nazov}</strong>
                        {pl.popis && <small>{pl.popis}</small>}
                      </span>
                      <span className="db-moznost__cena">{pl.poplatok > 0 ? `+${cenaText(pl.poplatok, mena)}` : ''}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <label className="db-pole">
              <span className="db-pole__menovka">Poznámka k objednávke</span>
              <textarea className="db-pole__vstup" rows={3} value={p.udaje.poznamka} onChange={(e) => p.nastav({ poznamka: e.target.value })} />
            </label>
          </div>

          <aside className="db-suhrn">
            <h2>Vaša objednávka</h2>
            <ul className="db-suhrn__polozky">
              {p.kosik.polozky.map((x) => (
                <li key={x.kluc}>
                  <Obrazok src={x.obrazok} className="db-suhrn__obrazok" />
                  <span>
                    <strong>{x.nazov}</strong>
                    <small>{[`${x.pocet} ks`, ...x.popis_volieb].join(' · ')}</small>
                  </span>
                  <span>{cenaText(x.cena_za_kus * x.pocet, mena)}</span>
                </li>
              ))}
            </ul>
            <div className="db-suhrn__riadok">
              <span>Tovar</span>
              <span>{cenaText(p.kosik.medzisucet, mena)}</span>
            </div>
            <div className="db-suhrn__riadok">
              <span>Doručenie</span>
              <span>{p.cenaDorucenia ? cenaText(p.cenaDorucenia, mena) : 'Zadarmo'}</span>
            </div>
            {p.poplatok > 0 && (
              <div className="db-suhrn__riadok">
                <span>Platba</span>
                <span>{cenaText(p.poplatok, mena)}</span>
              </div>
            )}
            <div className="db-suhrn__spolu">
              <span>Spolu</span>
              <strong>{cenaText(p.spolu, mena)}</strong>
            </div>
            {p.obchod.podmienky_url && (
              <label className="db-suhlas">
                <input type="checkbox" checked={p.suhlas} onChange={(e) => p.setSuhlas(e.target.checked)} />
                <span>
                  Súhlasím s{' '}
                  <a href={p.obchod.podmienky_url} target="_blank" rel="noopener noreferrer">
                    obchodnými podmienkami
                  </a>
                </span>
              </label>
            )}
            {p.chybaMinimum !== null && <p className="db-suhrn__chyba">Najnižšia objednávka je {cenaText(p.chybaMinimum, mena)}.</p>}
            {p.chyba && (
              <p className="db-suhrn__chyba" role="alert">
                {p.chyba}
              </p>
            )}
            <button type="submit" className="db-tlacidlo db-tlacidlo--akcent db-suhrn__tlacidlo" disabled={p.odosiela || p.chybaMinimum !== null}>
              {p.odosiela ? 'Odosielam…' : `Objednať za ${cenaText(p.spolu, mena)}`}
            </button>
            <p className="db-suhrn__pozn">Potvrdenie objednávky vám pošleme e-mailom.</p>
          </aside>
        </form>
      </Sekcia>
    </div>
  );
};

// ===== /objednavka/:token =====

const PriebehObjednavky: React.FC<{ o: ObjednavkaZakaznika }> = ({ o }) => {
  const kroky = krokyObjednavky(o);
  if (!kroky.length) return null;
  return (
    <ol className="db-postup-objednavky">
      {kroky.map((k, i) => (
        <li key={k.kluc} className={k.stav === 'hotovy' ? 'is-hotovy' : k.stav === 'aktualny' ? 'is-aktualny' : ''}>
          <span aria-hidden="true">{i + 1}</span>
          {k.nazov}
        </li>
      ))}
    </ol>
  );
};

export const Objednavka: React.FC = () => {
  const { token = '' } = useParams();
  const { objednavka: o, chyba, overuje } = useObjednavka(token);
  useTitulok(o ? `Objednávka ${o.cislo}` : 'Objednávka');

  if (chyba) {
    return (
      <div className="db-stranka">
        <HlavickaStranky stitok="Fanshop" nadpis="Objednávka sa nenašla" />
        <ChybaStranky text={chyba} />
      </div>
    );
  }
  if (!o) return <Nacitava text="Načítavam objednávku…" />;

  const zrusena = o.stav === 'zrusena';
  const uhradena = o.stav_platby === 'uhradena';
  const platba = infoPlatby(o);
  const stavKarta = kartaStavuObjednavky(o);

  return (
    <div className="db-stranka db-objednavka-stranka">
      <HlavickaStranky stitok={`Objednávka č. ${o.cislo}`} nadpis={zrusena ? 'Objednávka bola zrušená' : 'Ďakujeme za objednávku'}>
        {!zrusena && <p className="db-hlava__popis">{o.text_potvrdenia || `Potvrdenie sme poslali na ${o.email}. O ďalšom postupe vás budeme informovať.`}</p>}
      </HlavickaStranky>
      <Sekcia className="db-sekcia--hore db-sekcia--mriezka">
        <PriebehObjednavky o={o} />
        <div className="db-pokladna">
          <div className="db-pokladna__kroky">
            {!zrusena && (
              <div className={`db-platba-box${uhradena ? ' is-uhradena' : ''}`}>
                <div className="db-platba-box__hlava">
                  <Ikona nazov="platba" velkost={20} />
                  <strong>{platba.nadpis}</strong>
                  <span className={`db-odznak db-odznak--${platba.ton}`}>{platba.odznak}</span>
                </div>
                {platba.text && <p className="db-platba-box__text">{platba.text}</p>}
                {overuje && !uhradena && <p className="db-platba-box__text">Overujeme platbu…</p>}
                {o.pokyny && <p className="db-platba-box__text db-platba-box__pokyny">{o.pokyny}</p>}
                {o.brana_html && <PlatobnaBrana html={o.brana_html} className="db-platba-box__brana" />}
                {platba.udajeNaPlatbu && (
                  <dl className="db-platba-box__udaje">
                    <div>
                      <dt>Suma</dt>
                      <dd>{cenaText(o.spolu, o.mena)}</dd>
                    </div>
                    <div>
                      <dt>Variabilný symbol</dt>
                      <dd>{o.variabilny_symbol}</dd>
                    </div>
                  </dl>
                )}
              </div>
            )}
            {!zrusena && stavKarta && (
              <div className="db-platba-box is-uhradena db-platba-box--stav">
                <div className="db-platba-box__hlava">
                  <Ikona nazov="doprava" velkost={20} />
                  <strong>{stavKarta.nadpis}</strong>
                  <span className="db-odznak db-odznak--uhradena">{stavKarta.odznak}</span>
                </div>
                <p className="db-platba-box__text">{stavKarta.text}</p>
              </div>
            )}

            <div className="db-krok">
              <h2 className="db-krok__nadpis">Doručenie</h2>
              <p className="db-krok__pozn">
                <strong>{o.dorucenie_nazov}</strong>
                <br />
                {o.meno} · {o.email}
                {o.telefon && ` · ${o.telefon}`}
                {o.ulica && (
                  <>
                    <br />
                    {o.ulica}, {o.psc} {o.mesto}
                    {o.krajina ? `, ${o.krajina}` : ''}
                  </>
                )}
              </p>
              {o.poznamka && <p className="db-krok__pozn">Poznámka: {o.poznamka}</p>}
            </div>
          </div>

          <aside className="db-suhrn">
            <h2>Položky</h2>
            <ul className="db-suhrn__polozky db-suhrn__polozky--bez-foto">
              {o.polozky.map((x) => (
                <li key={x.id}>
                  <span>
                    <strong>{x.nazov}</strong>
                    <small>{[`${x.pocet} ks`, ...x.vlastnosti.map((v) => `${v.nazov}: ${v.hodnota}`)].join(' · ')}</small>
                  </span>
                  <span>{cenaText(x.spolu, o.mena)}</span>
                </li>
              ))}
            </ul>
            <div className="db-suhrn__riadok">
              <span>Tovar</span>
              <span>{cenaText(o.medzisucet, o.mena)}</span>
            </div>
            <div className="db-suhrn__riadok">
              <span>{o.dorucenie_nazov}</span>
              <span>{o.dorucenie_cena ? cenaText(o.dorucenie_cena, o.mena) : 'Zadarmo'}</span>
            </div>
            {o.platba_poplatok > 0 && (
              <div className="db-suhrn__riadok">
                <span>{o.platba_nazov}</span>
                <span>{cenaText(o.platba_poplatok, o.mena)}</span>
              </div>
            )}
            <div className="db-suhrn__spolu">
              <span>Spolu</span>
              <strong>{cenaText(o.spolu, o.mena)}</strong>
            </div>
            <Link to="/obchod" className="db-tlacidlo db-tlacidlo--tmave db-suhrn__tlacidlo">
              Späť do obchodu
            </Link>
          </aside>
        </div>
      </Sekcia>
    </div>
  );
};
