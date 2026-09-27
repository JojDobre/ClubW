// Umiestnenie: license-server/admin/src/stranky/Prehlad.tsx
// Prehľad: počty licencií, inštalácie online, verzie v teréne,
// aktualizácie, licencie tesne pred koncom a posledné udalosti.

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Licencia, type Udalost } from '../api';
import { ChybaStav, HlavickaStranky, Karta, Nacitava, Prazdne, StatKarta, Stitok, useNacitaj } from '../komponenty';
import { datum, predCasom, porovnajVerzie, sklon } from '../formaty';
import { usePrihlaseny } from '../App';

interface Prehlad {
  licencie: { spolu: number; aktivne: number; vyprsane: number; pozastavene: number; zrusene: number; vyprsia: number; online: number };
  prikazy: Record<string, number>;
  coskoro_vyprsia: Licencia[];
  udalosti: Udalost[];
  produkty: Array<{
    id: number;
    nazov: string;
    kod: string;
    aktualna_verzia: { id: number; verzia: string; balik_stav: string } | null;
    verzie: Array<{ verzia: string | null; pocet: number }>;
  }>;
}

const Prehlad: React.FC = () => {
  const { admin } = usePrihlaseny();
  const navigate = useNavigate();
  const prehlad = useNacitaj((s) => api.get<Prehlad>('/prehlad', s).then((r) => r.data), []);

  if (prehlad.nacitava && !prehlad.data) return <Nacitava />;
  if (prehlad.chyba) return <ChybaStav text={prehlad.chyba} onZnova={prehlad.obnov} />;
  const p = prehlad.data!;
  const l = p.licencie;
  const rozpracovane = (p.prikazy.caka ?? 0) + (p.prikazy.prevzaty ?? 0) + (p.prikazy.prebieha ?? 0);

  return (
    <div className="stranka">
      <HlavickaStranky nadpis={`Dobrý deň, ${admin.meno.split(' ')[0]}`} popis="Stav licencií a inštalácií všetkých produktov." />

      <div className="staty">
        <StatKarta nazov="Aktívne licencie" hodnota={l.aktivne} ton="zelena" popis={`z ${l.spolu} spolu`} onClick={() => navigate('/licencie?stav=aktivna')} />
        <StatKarta nazov="Inštalácie online" hodnota={l.online} ton="modra" popis="ozvali sa za 48 h" onClick={() => navigate('/licencie?stav=online')} />
        <StatKarta nazov="Vyprší do 30 dní" hodnota={l.vyprsia} ton={l.vyprsia ? 'oranzova' : undefined} onClick={() => navigate('/licencie?stav=vyprsi')} />
        <StatKarta nazov="Vypršané" hodnota={l.vyprsane} ton={l.vyprsane ? 'cervena' : undefined} onClick={() => navigate('/licencie?stav=vyprsana')} />
        <StatKarta nazov="Pozastavené" hodnota={l.pozastavene} onClick={() => navigate('/licencie?stav=pozastavena')} />
        <StatKarta
          nazov="Aktualizácie"
          hodnota={rozpracovane}
          ton={p.prikazy.chyba ? 'cervena' : rozpracovane ? 'zlta' : undefined}
          popis={p.prikazy.chyba ? `${p.prikazy.chyba} ${sklon(p.prikazy.chyba, 'zlyhala', 'zlyhali', 'zlyhalo')}` : 'rozpracované'}
          onClick={() => navigate('/aktualizacie')}
        />
      </div>

      <div className="mriezka-2">
        {p.produkty.map((produkt) => {
          const spolu = produkt.verzie.reduce((s, v) => s + v.pocet, 0);
          const zoradene = [...produkt.verzie].sort((a, b) => porovnajVerzie(b.verzia, a.verzia));
          return (
            <Karta
              key={produkt.id}
              nadpis={produkt.nazov}
              akcie={
                <Link to={`/produkty/${produkt.id}`} className="odkaz">
                  Verzie
                </Link>
              }
            >
              <div className="produkt-prehlad">
                <div>
                  <span className="tlmene">Aktuálna verzia</span>
                  <strong className="velka-verzia">{produkt.aktualna_verzia ? produkt.aktualna_verzia.verzia : '—'}</strong>
                  {produkt.aktualna_verzia && produkt.aktualna_verzia.balik_stav !== 'pripraveny' && <Stitok ton="zlta">Balík nie je pripravený</Stitok>}
                </div>
                <div className="verzie-pruh">
                  <span className="tlmene">Inštalácie podľa verzie (30 dní)</span>
                  {spolu === 0 ? (
                    <p className="tlmene">Zatiaľ sa neozvala žiadna inštalácia.</p>
                  ) : (
                    zoradene.map((v) => {
                      const aktualna = produkt.aktualna_verzia && v.verzia && porovnajVerzie(v.verzia, produkt.aktualna_verzia.verzia) === 0;
                      return (
                        <div key={v.verzia ?? 'nezname'} className="verzie-pruh__riadok">
                          <span>{v.verzia ?? 'neznáma'}</span>
                          <span className="verzie-pruh__pruh">
                            <span className={aktualna ? 'is-aktualna' : ''} style={{ width: `${(v.pocet / spolu) * 100}%` }} />
                          </span>
                          <strong>{v.pocet}</strong>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Karta>
          );
        })}
      </div>

      <div className="mriezka-2">
        <Karta nadpis="Vyprší do 30 dní">
          {p.coskoro_vyprsia.length === 0 ? (
            <Prazdne nadpis="Žiadna licencia nekončí" text="V najbližších 30 dňoch nevyprší žiadna aktívna licencia." />
          ) : (
            <ul className="zoznam">
              {p.coskoro_vyprsia.map((x) => (
                <li key={x.id}>
                  <Link to={`/licencie/${x.id}`}>
                    <span>
                      <strong>{x.nazov_klienta}</strong>
                      <small>
                        {x.produkt?.nazov} · {x.plan}
                      </small>
                    </span>
                    <span className="zoznam__vpravo">
                      <Stitok ton={x.dni_do_vyprsania <= 7 ? 'cervena' : 'oranzova'}>
                        o {x.dni_do_vyprsania} {sklon(x.dni_do_vyprsania, 'deň', 'dni', 'dní')}
                      </Stitok>
                      <small>{datum(x.platna_do)}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Karta>
        <Karta
          nadpis="Posledné udalosti"
          akcie={
            <Link to="/udalosti" className="odkaz">
              Všetky
            </Link>
          }
        >
          <ul className="casova-os">
            {p.udalosti.map((u) => (
              <li key={u.id}>
                <span className="casova-os__cas">{predCasom(u.vytvorena)}</span>
                <span>
                  {u.licencia_id ? <Link to={`/licencie/${u.licencia_id}`}>{u.popis}</Link> : u.popis}
                  {u.administrator && <small> · {u.administrator.meno}</small>}
                </span>
              </li>
            ))}
          </ul>
        </Karta>
      </div>
    </div>
  );
};

export default Prehlad;
