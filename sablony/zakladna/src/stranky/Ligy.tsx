// Umiestnenie: sablony/zakladna/src/stranky/Ligy.tsx
// Súťaže základnej šablóny: zoznam (/leagues) s tabuľkou každej súťaže
// a detail (/leagues/:id) s celou tabuľkou. Rešpektuje nastavenia ligy
// z administrácie - režim „len poradie a body" a zobrazenie formy.

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { souborUrl, useData } from '@clubw/jadro';
import './Ligy.css';

interface Liga {
  id: number;
  nazov: string;
  sezona?: string | null;
  typ?: string | null;
  status?: string | null;
  format?: string | null;
  popis?: string | null;
  logo?: string | null;
  tim_id?: number | null;
  external_widget_url?: string | null;
  rezim_tabulky?: 'plna' | 'len_body';
  zobrazit_formu?: boolean;
}

interface Riadok {
  id: number;
  pozicia: number;
  tim_id?: number | null;
  tim_nazov?: string | null;
  custom_tim_nazov?: string | null;
  tim_logo?: string | null;
  custom_tim_logo?: string | null;
  zapasy: number;
  vitazstva: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  body: number;
  forma?: string | null;
}

const TYPY: Record<string, string> = { sutaz: 'Súťaž', pohar: 'Pohár', priatelska: 'Prípravné zápasy' };
const STAVY: Record<string, string> = { active: 'Prebieha', upcoming: 'Pripravuje sa', finished: 'Ukončená' };
const FILTRE: Array<[string, string]> = [['', 'Všetky'], ['sutaz', 'Súťaže'], ['pohar', 'Poháre'], ['priatelska', 'Prípravné']];
/** Forma prichádza ako W/D/L (prepočet zo zápasov) alebo V/R/P (ručne). */
const FORMA: Record<string, { pismeno: string; nazov: string }> = {
  W: { pismeno: 'V', nazov: 'Výhra' },
  D: { pismeno: 'R', nazov: 'Remíza' },
  L: { pismeno: 'P', nazov: 'Prehra' },
};
const ZO_SLOVENCINY: Record<string, string> = { V: 'W', R: 'D', P: 'L' };

const useTitulok = (text: string) => {
  useEffect(() => {
    document.title = text;
  }, [text]);
};

const nazovTimu = (r: Riadok) => r.tim_nazov || r.custom_tim_nazov || 'Tím';

/**
 * Tabuľka súťaže. V režime „len body" ukáže len poradie, tím a body;
 * kompaktná (v zozname súťaží) vynechá výhry, remízy, prehry a formu.
 */
export const TabulkaLigy: React.FC<{ riadky: Riadok[]; liga: Liga; kompaktna?: boolean }> = ({ riadky, liga, kompaktna = false }) => {
  const lenBody = liga.rezim_tabulky === 'len_body';
  const plna = !kompaktna && !lenBody;
  const forma = plna && liga.zobrazit_formu !== false;
  return (
    <div className="lg-tabulka-obal">
      <table className="lg-tabulka">
        <thead>
          <tr>
            <th className="lg-tabulka__poz">#</th>
            <th className="lg-tabulka__tim">Tím</th>
            {!lenBody && <th title="Zápasy">Z</th>}
            {plna && (
              <>
                <th title="Výhry" className="lg-tabulka__volitelne">V</th>
                <th title="Remízy" className="lg-tabulka__volitelne">R</th>
                <th title="Prehry" className="lg-tabulka__volitelne">P</th>
              </>
            )}
            {!lenBody && <th title="Skóre">Skóre</th>}
            <th title="Body">B</th>
            {forma && <th className="lg-tabulka__forma">Forma</th>}
          </tr>
        </thead>
        <tbody>
          {riadky.map((r) => (
            <tr key={r.id} className={liga.tim_id && r.tim_id === liga.tim_id ? 'is-nas' : undefined}>
              <td className="lg-tabulka__poz">{r.pozicia}.</td>
              <td className="lg-tabulka__tim">
                <span className="lg-tabulka__tim-obsah" title={nazovTimu(r)}>
                  {(r.tim_logo || r.custom_tim_logo) && <img src={souborUrl(r.tim_logo || r.custom_tim_logo || '')} alt="" />}
                  <span className="lg-tabulka__nazov">{nazovTimu(r)}</span>
                </span>
              </td>
              {!lenBody && <td>{r.zapasy}</td>}
              {plna && (
                <>
                  <td className="lg-tabulka__volitelne">{r.vitazstva}</td>
                  <td className="lg-tabulka__volitelne">{r.remizy}</td>
                  <td className="lg-tabulka__volitelne">{r.prehry}</td>
                </>
              )}
              {!lenBody && (
                <td>
                  {r.goly_za}:{r.goly_proti}
                </td>
              )}
              <td className="lg-tabulka__body">{r.body}</td>
              {forma && (
                <td className="lg-tabulka__forma">
                  <span className="lg-forma">
                    {String(r.forma || '')
                      .toUpperCase()
                      .split('')
                      .map((z) => ZO_SLOVENCINY[z] ?? z)
                      .filter((z) => FORMA[z])
                      .slice(-5)
                      .map((z, i) => (
                        <span key={i} className={`lg-forma__${z}`} title={FORMA[z].nazov}>
                          {FORMA[z].pismeno}
                        </span>
                      ))}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Výrez tabuľky okolo nášho tímu (v zozname súťaží netreba celú). */
const vyrez = (riadky: Riadok[], timId: number | null | undefined, pocet: number) => {
  if (riadky.length <= pocet) return riadky;
  const nas = riadky.findIndex((r) => timId && r.tim_id === timId);
  const zaciatok = nas < 0 ? 0 : Math.min(Math.max(0, nas - Math.floor(pocet / 2)), riadky.length - pocet);
  return riadky.slice(zaciatok, zaciatok + pocet);
};

const Popis: React.FC<{ liga: Liga }> = ({ liga }) => (
  <p className="lg-karta__popis">
    {[TYPY[liga.typ ?? ''] ?? liga.typ, liga.sezona, STAVY[liga.status ?? '']].filter(Boolean).join(' · ')}
  </p>
);

const Logo: React.FC<{ liga: Liga; velke?: boolean }> = ({ liga, velke }) => (
  <span className={`lg-logo${velke ? ' lg-logo--velke' : ''}`} aria-hidden="true">
    {liga.logo ? <img src={souborUrl(liga.logo)} alt="" /> : liga.typ === 'pohar' ? '🏆' : '⚽'}
  </span>
);

const KartaLigy: React.FC<{ liga: Liga }> = ({ liga }) => {
  const tabulka = useData<Riadok[]>(liga.format !== 'turnaj' ? `/leagues/${liga.id}/table` : null);
  const riadky = tabulka.data ?? [];
  return (
    <article className="lg-karta">
      <div className="lg-karta__hlava">
        <Logo liga={liga} />
        <div className="lg-karta__nazov">
          <h2>{liga.nazov}</h2>
          <Popis liga={liga} />
        </div>
        <Link to={`/leagues/${liga.id}`} className="lg-tlacidlo">
          Detail súťaže
        </Link>
      </div>
      {tabulka.nacitava ? (
        <p className="lg-stav">Načítavam tabuľku…</p>
      ) : riadky.length > 0 ? (
        <TabulkaLigy riadky={vyrez(riadky, liga.tim_id, 6)} liga={liga} kompaktna />
      ) : (
        <p className="lg-stav">{liga.popis || 'Tabuľka zatiaľ nie je k dispozícii.'}</p>
      )}
    </article>
  );
};

// ===== /leagues =====

export const Ligy: React.FC = () => {
  useTitulok('Súťaže');
  const [typ, setTyp] = useState('');
  const ligy = useData<Liga[]>('/leagues');
  const zoznam = (ligy.data ?? []).filter((l) => !typ || l.typ === typ);
  const pouziteTypy = new Set((ligy.data ?? []).map((l) => l.typ));

  return (
    <div className="lg">
      <h1>Súťaže</h1>
      <p className="lg__uvod">Tabuľky súťaží, v ktorých hrajú naše tímy.</p>
      {pouziteTypy.size > 1 && (
        <div className="lg-filtre" role="group" aria-label="Typ súťaže">
          {FILTRE.filter(([k]) => !k || pouziteTypy.has(k)).map(([k, nazov]) => (
            <button key={k || 'vsetky'} type="button" className={typ === k ? 'is-aktivny' : undefined} aria-pressed={typ === k} onClick={() => setTyp(k)}>
              {nazov}
            </button>
          ))}
        </div>
      )}
      {ligy.nacitava ? (
        <p className="lg-stav">Načítavam súťaže…</p>
      ) : ligy.chyba ? (
        <p className="lg-stav lg-stav--chyba">{ligy.chyba}</p>
      ) : zoznam.length === 0 ? (
        <p className="lg-stav">Zatiaľ tu nie sú žiadne súťaže.</p>
      ) : (
        <div className="lg-mriezka">
          {zoznam.map((l) => (
            <KartaLigy key={l.id} liga={l} />
          ))}
        </div>
      )}
    </div>
  );
};

// ===== /leagues/:id =====

export const Liga: React.FC = () => {
  const { id = '' } = useParams();
  const platne = /^\d+$/.test(id);
  const liga = useData<Liga>(platne ? `/leagues/${id}` : null);
  const tabulka = useData<Riadok[]>(platne && liga.data && liga.data.format !== 'turnaj' ? `/leagues/${id}/table` : null);
  useTitulok(liga.data?.nazov ?? 'Súťaž');

  if (!platne || liga.chyba) {
    return (
      <div className="lg">
        <Link to="/leagues" className="lg__spat">← Všetky súťaže</Link>
        <p className="lg-stav lg-stav--chyba">{platne ? liga.chyba : 'Súťaž neexistuje.'}</p>
      </div>
    );
  }
  if (liga.nacitava || !liga.data) {
    return (
      <div className="lg">
        <p className="lg-stav">Načítavam súťaž…</p>
      </div>
    );
  }

  const l = liga.data;
  const riadky = tabulka.data ?? [];
  const lenBody = l.rezim_tabulky === 'len_body';

  return (
    <div className="lg">
      <Link to="/leagues" className="lg__spat">← Všetky súťaže</Link>
      <header className="lg-detail__hlava">
        <Logo liga={l} velke />
        <div>
          <h1>{l.nazov}</h1>
          <Popis liga={l} />
        </div>
        {l.external_widget_url && (
          <a href={l.external_widget_url} target="_blank" rel="noopener noreferrer" className="lg-tlacidlo">
            Oficiálna stránka súťaže
          </a>
        )}
      </header>
      {l.popis && <p className="lg-detail__popis">{l.popis}</p>}

      <section className="lg-karta">
        <h2 className="lg-detail__nadpis">Tabuľka{l.sezona ? ` ${l.sezona}` : ''}</h2>
        {l.format === 'turnaj' ? (
          <p className="lg-stav">Táto súťaž sa hrá turnajovým systémom, tabuľku nemá.</p>
        ) : tabulka.nacitava ? (
          <p className="lg-stav">Načítavam tabuľku…</p>
        ) : riadky.length > 0 ? (
          <>
            <TabulkaLigy riadky={riadky} liga={l} />
            {!lenBody && (
              <p className="lg-legenda">
                Z zápasy · V výhry · R remízy · P prehry · B body{l.zobrazit_formu !== false ? ' · forma = posledných 5 zápasov' : ''}
              </p>
            )}
          </>
        ) : (
          <p className="lg-stav">Tabuľka zatiaľ nie je k dispozícii.</p>
        )}
      </section>
    </div>
  );
};

export default Ligy;
