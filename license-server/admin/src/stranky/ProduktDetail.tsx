// Umiestnenie: license-server/admin/src/stranky/ProduktDetail.tsx
// Detail produktu: verzie z GitHubu (aktuálna verzia, balíky, hromadná
// aktualizácia), nastavenia produktu, plány a prehľad funkcií licencie.

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Plan, type Produkt, type Verzia } from '../api';
import { ChybaStav, HlavickaStranky, Ikona, Karta, Kopirovat, Nacitava, Oblast, Okno, Pole, Prazdne, Prepinac, Stitok, Tlacidlo, useInterval, useNacitaj, useOznamenia, usePotvrdenie } from '../komponenty';
import { STAVY_BALIKU, datum, sklon, velkost } from '../formaty';
import { FUNKCIE_LICENCIE } from '../funkcie';

const ProduktDetail: React.FC = () => {
  const { id } = useParams();
  const { uspech, chyba } = useOznamenia();
  const { potvrd, okno } = usePotvrdenie();
  const produkt = useNacitaj((s) => api.get<Produkt[]>('/produkty', s).then((r) => r.data.find((p) => String(p.id) === id) ?? null), [id]);
  const verzie = useNacitaj((s) => api.get<Verzia[]>(`/produkty/${id}/verzie`, s).then((r) => r.data), [id]);
  const [akcia, setAkcia] = useState<string | null>(null);
  const [rucna, setRucna] = useState(false);
  const [poznamky, setPoznamky] = useState<Verzia | null>(null);

  // Kým sa niektorý balík pripravuje, obnovujeme zoznam
  useInterval(verzie.obnov, verzie.data?.some((v) => v.balik_stav === 'pripravuje') ? 2500 : null);

  if (produkt.chyba) return <ChybaStav text={produkt.chyba} onZnova={produkt.obnov} />;
  if (!produkt.data) return produkt.nacitava ? <Nacitava /> : <Prazdne nadpis="Produkt nenájdený" />;
  const p = produkt.data;
  const aktualna = verzie.data?.find((v) => v.aktualna);

  const vykonaj = async (nazov: string, volanie: () => Promise<{ message?: string }>) => {
    setAkcia(nazov);
    try {
      const r = await volanie();
      uspech(r.message ?? 'Hotovo');
      verzie.obnov();
      produkt.obnov();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setAkcia(null);
    }
  };

  const nastavAktualnu = async (v: Verzia) => {
    const text = (
      <>
        Verzia <strong>{v.verzia}</strong> sa stane aktuálnou. Inštalácie ju uvidia ako dostupnú aktualizáciu; tie s automatickými aktualizáciami sa aktualizujú samé.
        {v.predbezna && <p className="text-oranzova">Pozor, ide o predbežnú verziu (beta).</p>}
      </>
    );
    if (await potvrd('Nastaviť aktuálnu verziu?', text, 'Nastaviť ako aktuálnu')) vykonaj(`aktualna-${v.id}`, () => api.post(`/verzie/${v.id}/aktualna`));
  };

  const hromadne = async () => {
    if (!aktualna) return;
    const starsich = (verzie.data ?? []).filter((v) => !v.aktualna).reduce((s, v) => s + (v.instalacii ?? 0), 0);
    if (
      await potvrd(
        'Aktualizovať všetky inštalácie?',
        <>
          Všetky aktívne inštalácie produktu {p.nazov}, ktoré sa ozvali za posledných 48 hodín a majú staršiu verziu (približne {starsich}), dostanú príkaz na aktualizáciu na <strong>{aktualna.verzia}</strong>. Licencie s pripnutou verziou sa preskočia.
        </>,
        'Aktualizovať všetky'
      )
    ) {
      vykonaj('hromadne', () => api.post(`/produkty/${p.id}/aktualizovat`, { verzia_id: aktualna.id }));
    }
  };

  const zmaz = async (v: Verzia) => {
    if (await potvrd('Zmazať verziu?', `Verzia ${v.verzia} a jej balík sa odstránia zo servera (na GitHube ostane).`, 'Zmazať', true)) {
      vykonaj(`zmaz-${v.id}`, () => api.delete(`/verzie/${v.id}`));
    }
  };

  return (
    <div className="stranka">
      <HlavickaStranky
        spat={
          <Link to="/produkty" className="spat">
            <Ikona nazov="spat" velkost={16} /> Produkty
          </Link>
        }
        nadpis={p.nazov}
        popis={
          <>
            <span className="mono">{p.kod}</span>
            {p.github_repo && (
              <>
                {' · '}
                <a href={`https://github.com/${p.github_repo}`} target="_blank" rel="noopener noreferrer">
                  github.com/{p.github_repo}
                </a>
              </>
            )}
          </>
        }
        akcie={
          <>
            <Tlacidlo ikona="github" onClick={() => vykonaj('sync', () => api.post(`/produkty/${p.id}/synchronizovat`))} nacitava={akcia === 'sync'} disabled={!p.github_repo}>
              Načítať verzie z GitHubu
            </Tlacidlo>
            <Tlacidlo variant="primarne" ikona="aktualizacie" onClick={hromadne} nacitava={akcia === 'hromadne'} disabled={!aktualna || aktualna.balik_stav !== 'pripraveny'}>
              Aktualizovať inštalácie
            </Tlacidlo>
          </>
        }
      />

      <Karta
        nadpis="Verzie"
        akcie={
          <Tlacidlo male variant="jemne" ikona="plus" onClick={() => setRucna(true)}>
            Pridať ručne
          </Tlacidlo>
        }
      >
        {verzie.chyba ? (
          <ChybaStav text={verzie.chyba} onZnova={verzie.obnov} />
        ) : !verzie.data ? (
          <Nacitava />
        ) : verzie.data.length === 0 ? (
          <Prazdne
            nadpis="Zatiaľ žiadne verzie"
            text={
              <>
                Na GitHube vytvorte vydanie (Releases → Draft a new release) s tagom v tvare <code>v1.0.0</code> a potom kliknite na Načítať verzie z GitHubu.
              </>
            }
          />
        ) : (
          <div className="tabulka-obal">
            <table className="tabulka">
              <thead>
                <tr>
                  <th>Verzia</th>
                  <th>Vydaná</th>
                  <th>Balík</th>
                  <th>Inštalácie</th>
                  <th aria-label="Akcie" />
                </tr>
              </thead>
              <tbody>
                {verzie.data.map((v) => {
                  const b = STAVY_BALIKU[v.balik_stav];
                  return (
                    <tr key={v.id} className={v.aktualna ? 'is-zvyraznene' : ''}>
                      <td>
                        <strong className="mono">{v.verzia}</strong> {v.aktualna && <Stitok ton="zelena">aktuálna</Stitok>} {v.predbezna && <Stitok ton="oranzova">beta</Stitok>}
                        <small>
                          {v.nazov ?? v.tag} · {v.zdroj === 'release' ? 'vydanie' : v.zdroj === 'tag' ? 'tag' : 'pridaná ručne'}
                        </small>
                      </td>
                      <td>{datum(v.publikovana)}</td>
                      <td>
                        <Stitok ton={b.ton}>{b.nazov}</Stitok>
                        {v.balik_stav === 'pripraveny' && <small>{velkost(v.balik_velkost)}</small>}
                        {v.balik_stav === 'chyba' && <small className="text-cervena">{v.balik_chyba}</small>}
                      </td>
                      <td>{v.instalacii ? `${v.instalacii} ${sklon(v.instalacii, 'inštalácia', 'inštalácie', 'inštalácií')}` : '—'}</td>
                      <td className="tabulka__akcie">
                        {v.poznamky && (
                          <Tlacidlo male variant="jemne" onClick={() => setPoznamky(v)}>
                            Poznámky
                          </Tlacidlo>
                        )}
                        {!v.aktualna && (
                          <Tlacidlo male onClick={() => nastavAktualnu(v)} nacitava={akcia === `aktualna-${v.id}`}>
                            Nastaviť ako aktuálnu
                          </Tlacidlo>
                        )}
                        {(v.balik_stav === 'chyba' || v.balik_stav === 'ziadny') && (
                          <Tlacidlo male variant="jemne" onClick={() => vykonaj(`balik-${v.id}`, () => api.post(`/verzie/${v.id}/balik`))} nacitava={akcia === `balik-${v.id}`}>
                            Pripraviť balík
                          </Tlacidlo>
                        )}
                        {!v.aktualna && (
                          <Tlacidlo male variant="jemne" onClick={() => zmaz(v)} nacitava={akcia === `zmaz-${v.id}`} aria-label={`Zmazať verziu ${v.verzia}`}>
                            Zmazať
                          </Tlacidlo>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Karta>

      <div className="mriezka-2">
        <NastaveniaProduktu produkt={p} onUlozene={produkt.obnov} />
        <PlanyProduktu produkt={p} onUlozene={produkt.obnov} />
      </div>

      <FunkcieLicencie />

      {rucna && (
        <RucnaVerzia
          produktId={p.id}
          onZavriet={() => setRucna(false)}
          onHotovo={() => {
            setRucna(false);
            verzie.obnov();
          }}
        />
      )}
      {poznamky && (
        <Okno nadpis={`Verzia ${poznamky.verzia}`} onZavriet={() => setPoznamky(null)}>
          <pre className="poznamky-verzie">{poznamky.poznamky}</pre>
        </Okno>
      )}
      {okno}
    </div>
  );
};

const NastaveniaProduktu: React.FC<{ produkt: Produkt; onUlozene: () => void }> = ({ produkt, onUlozene }) => {
  const { uspech, chyba } = useOznamenia();
  const [h, setH] = useState({ nazov: produkt.nazov, popis: produkt.popis ?? '', github_repo: produkt.github_repo ?? '', minimalna_verzia: produkt.minimalna_verzia ?? '', aktivny: produkt.aktivny });
  const [uklada, setUklada] = useState(false);
  useEffect(() => setH({ nazov: produkt.nazov, popis: produkt.popis ?? '', github_repo: produkt.github_repo ?? '', minimalna_verzia: produkt.minimalna_verzia ?? '', aktivny: produkt.aktivny }), [produkt]);
  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    setUklada(true);
    try {
      const r = await api.put(`/produkty/${produkt.id}`, h);
      uspech(r.message ?? 'Uložené');
      onUlozene();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setUklada(false);
    }
  };
  return (
    <Karta nadpis="Nastavenia produktu">
      <form className="formular" onSubmit={uloz} noValidate>
        <Pole menovka="Názov" value={h.nazov} onChange={(e) => setH({ ...h, nazov: e.target.value })} />
        <Pole
          menovka="Repozitár na GitHube"
          value={h.github_repo}
          onChange={(e) => setH({ ...h, github_repo: e.target.value })}
          placeholder="vlastnik/repozitar"
          napoveda="Súkromný repozitár vyžaduje na serveri premennú GITHUB_TOKEN."
        />
        <Pole
          menovka="Minimálna verzia"
          value={h.minimalna_verzia}
          onChange={(e) => setH({ ...h, minimalna_verzia: e.target.value })}
          placeholder="napr. 1.2.0"
          napoveda="Inštaláciám so staršou verziou sa aktualizácia zobrazí ako povinná (napr. bezpečnostná oprava)."
        />
        <Oblast menovka="Popis" value={h.popis} onChange={(e) => setH({ ...h, popis: e.target.value })} />
        <Prepinac menovka="Aktívny produkt" napoveda="Neaktívny produkt sa neponúka pri nových licenciách." checked={h.aktivny} onChange={(v) => setH({ ...h, aktivny: v })} />
        <div>
          <Tlacidlo type="submit" variant="primarne" nacitava={uklada}>
            Uložiť
          </Tlacidlo>
        </div>
      </form>
    </Karta>
  );
};

const PlanyProduktu: React.FC<{ produkt: Produkt; onUlozene: () => void }> = ({ produkt, onUlozene }) => {
  const { uspech, chyba } = useOznamenia();
  const zPlanov = (plany: Plan[]) => plany.map((p) => ({ ...p, funkcieText: p.funkcie.join(', ') }));
  const [plany, setPlany] = useState(zPlanov(produkt.plany));
  const [uklada, setUklada] = useState(false);
  useEffect(() => setPlany(zPlanov(produkt.plany)), [produkt]);
  const zmen = (i: number, zmeny: Partial<(typeof plany)[number]>) => setPlany((s) => s.map((p, j) => (j === i ? { ...p, ...zmeny } : p)));
  const uloz = async () => {
    setUklada(true);
    try {
      const r = await api.put(`/produkty/${produkt.id}`, {
        plany: plany.map((p) => ({ kod: p.kod, nazov: p.nazov, mesiacov: Number(p.mesiacov), funkcie: p.funkcieText.split(/[,\s]+/).filter(Boolean) })),
      });
      uspech(r.message ?? 'Uložené');
      onUlozene();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setUklada(false);
    }
  };
  return (
    <Karta
      nadpis="Plány"
      akcie={
        <Tlacidlo male variant="jemne" ikona="plus" onClick={() => setPlany((s) => [...s, { kod: '', nazov: '', mesiacov: 12, funkcie: [], funkcieText: '' }])}>
          Pridať plán
        </Tlacidlo>
      }
    >
      <p className="tlmene">Plán určuje predvolenú dĺžku licencie a funkcie, ktoré dostane web klienta. Zmena plánov neupraví existujúce licencie.</p>
      <div className="plany">
        {plany.map((p, i) => (
          <div key={i} className="plany__riadok">
            <Pole menovka="Kód" value={p.kod} onChange={(e) => zmen(i, { kod: e.target.value.toLowerCase() })} placeholder="pro" />
            <Pole menovka="Názov" value={p.nazov} onChange={(e) => zmen(i, { nazov: e.target.value })} placeholder="Pro" />
            <Pole menovka="Mesiacov" type="number" min={1} max={120} value={p.mesiacov} onChange={(e) => zmen(i, { mesiacov: Number(e.target.value) })} />
            <Pole menovka="Funkcie" value={p.funkcieText} onChange={(e) => zmen(i, { funkcieText: e.target.value })} placeholder="sablony:vsetky" />
            <button type="button" className="ikona-tlacidlo" onClick={() => setPlany((s) => s.filter((_, j) => j !== i))} aria-label={`Odstrániť plán ${p.nazov || p.kod}`}>
              <Ikona nazov="zavriet" />
            </button>
          </div>
        ))}
      </div>
      <Tlacidlo variant="primarne" onClick={uloz} nacitava={uklada}>
        Uložiť plány
      </Tlacidlo>
    </Karta>
  );
};

/** Prehľad všetkých funkcií, ktoré web klubu rozpozná - pomoc pri plánoch a licenciách. */
const FunkcieLicencie: React.FC = () => (
  <Karta nadpis="Funkcie licencie">
    <p className="tlmene">
      Funkcie napíšte do poľa „Funkcie“ plánu (alebo priamo licencie), oddelené čiarkou, napríklad <code>sablona:pulz, sablona:arena</code>. Web klienta ich dostane pri
      najbližšom overení licencie.
    </p>
    {FUNKCIE_LICENCIE.map((skupina) => (
      <section key={skupina.nazov} className="funkcie">
        <h3 className="funkcie__nadpis">{skupina.nazov}</h3>
        <p className="tlmene">{skupina.popis}</p>
        <div className="tabulka-obal">
          <table className="tabulka">
            <thead>
              <tr>
                <th>Funkcia</th>
                <th>Čo povolí</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {skupina.funkcie.map((f) => (
                <tr key={f.kod}>
                  <td>
                    <code className="mono">{f.kod}</code>
                  </td>
                  <td>
                    <strong>{f.nazov}</strong>
                    <div className="tlmene">{f.popis}</div>
                  </td>
                  <td className="funkcie__akcia">
                    <Kopirovat text={f.kod} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    ))}
  </Karta>
);

const RucnaVerzia: React.FC<{ produktId: number; onZavriet: () => void; onHotovo: () => void }> = ({ produktId, onZavriet, onHotovo }) => {
  const { uspech, chyba } = useOznamenia();
  const [h, setH] = useState({ tag: '', nazov: '', poznamky: '' });
  const [uklada, setUklada] = useState(false);
  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    setUklada(true);
    try {
      const r = await api.post(`/produkty/${produktId}/verzie`, h);
      uspech(r.message ?? 'Pridané');
      onHotovo();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setUklada(false);
    }
  };
  return (
    <Okno
      nadpis="Pridať verziu ručne"
      onZavriet={onZavriet}
      paticka={
        <>
          <Tlacidlo onClick={onZavriet}>Zrušiť</Tlacidlo>
          <Tlacidlo variant="primarne" type="submit" form="rucna-verzia" nacitava={uklada}>
            Pridať
          </Tlacidlo>
        </>
      }
    >
      <form id="rucna-verzia" className="formular" onSubmit={uloz} noValidate>
        <Pole menovka="Tag na GitHube" value={h.tag} onChange={(e) => setH({ ...h, tag: e.target.value })} placeholder="v1.3.0" napoveda="Tag musí na GitHube existovať - z neho sa stiahne balík." required />
        <Pole menovka="Názov" value={h.nazov} onChange={(e) => setH({ ...h, nazov: e.target.value })} />
        <Oblast menovka="Poznámky k verzii" value={h.poznamky} onChange={(e) => setH({ ...h, poznamky: e.target.value })} rows={5} />
      </form>
    </Okno>
  );
};

export default ProduktDetail;
