// Umiestnenie: frontend/src/pages/admin/Ligy.tsx
// Súťaže a ligové tabuľky.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, Button, Badge, Icon, Select, Skeleton,
  EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { ligyApi } from '../../api/sport';
import { tabulkyApi } from '../../api/obsah';
import type { Liga, RiadokTabulky } from '../../api/typy';
import './Ligy.css';

export const Ligy: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu } = useToast();

  const [vybrana, setVybrana] = useState<number | null>(null);
  const [prepocitava, setPrepocitava] = useState(false);
  const [naZmazanie, setNaZmazanie] = useState<Liga | null>(null);
  const [maze, setMaze] = useState(false);

  const ligy = useNacitanie((signal) => ligyApi.vypis(signal));
  const zoznam = ligy.data ?? [];

  // Po načítaní predvolíme prvú súťaž
  useEffect(() => {
    if (vybrana === null && zoznam.length > 0) setVybrana(zoznam[0].id);
  }, [zoznam, vybrana]);

  const tabulka = useNacitanie(
    (signal) => (vybrana !== null ? tabulkyApi.tabulka(vybrana, signal) : Promise.resolve([] as RiadokTabulky[])),
    [vybrana]
  );

  const zvolena = zoznam.find((l) => l.id === vybrana);
  const riadky = tabulka.data ?? [];

  /** Vynúti prepočet tabuľky zo zápasov. */
  const prepocitaj = async () => {
    if (vybrana === null) return;
    setPrepocitava(true);
    try {
      await tabulkyApi.prepocitaj(vybrana);
      uspech('Tabuľka bola prepočítaná');
      tabulka.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Tabuľku sa nepodarilo prepočítať');
    } finally {
      setPrepocitava(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await tabulkyApi.zmazLigu(naZmazanie.id);
      uspech('Súťaž bola zmazaná');
      setNaZmazanie(null);
      setVybrana(null);
      ligy.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Súťaž sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  /** Názov tímu v riadku — databázový alebo zadaný ako text. */
  const nazovTimu = (r: RiadokTabulky): string =>
    r.tim?.nazov || r.custom_tim_nazov || '—';

  if (ligy.chyba) {
    return <ErrorState sprava="Súťaže sa nepodarilo načítať" detail={ligy.chyba} onSkusZnova={ligy.obnov} />;
  }

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Ligy a tabuľky"
        podnadpis="Súťaže klubu a ich priebežné tabuľky."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => navigate('/admin/zapasy/novy')}>
            Pridať zápas
          </Button>
        }
      />

      {ligy.nacitava ? (
        <Card>
          <Skeleton riadkov={5} vyska="18px" />
        </Card>
      ) : zoznam.length === 0 ? (
        <Card>
          <EmptyState
            ikona={<Icon nazov="ligy" velkost={40} />}
            nadpis="Zatiaľ žiadne súťaže"
            popis="Súťaž vzniká pri vytvorení prvého zápasu — vyberte ju alebo zadajte jej názov."
            akcia={<Button onClick={() => navigate('/admin/zapasy/novy')}>Pridať zápas</Button>}
          />
        </Card>
      ) : (
        <>
          {/* ===== Výber súťaže ===== */}
          <div className="cw-ligy__vyber">
            <Select
              menovka="Súťaž"
              value={vybrana ?? ''}
              onChange={(e) => setVybrana(e.target.value ? Number(e.target.value) : null)}
              moznosti={zoznam.map((l) => ({
                hodnota: l.id,
                popis: `${l.nazov} · ${l.sezona}`,
              }))}
            />

            <div className="cw-ligy__akcie">
              <Button
                variant="secondary"
                onClick={prepocitaj}
                nacitava={prepocitava}
                ikona={<Icon nazov="live" velkost={15} />}
              >
                Prepočítať tabuľku
              </Button>
              {zvolena && (
                <Button
                  variant="ghost"
                  onClick={() => setNaZmazanie(zvolena)}
                  ikona={<Icon nazov="zmazat" velkost={15} />}
                >
                  Zmazať súťaž
                </Button>
              )}
            </div>
          </div>

          {/* ===== Údaje o súťaži ===== */}
          {zvolena && (
            <div className="cw-ligy__info">
              <Badge ton="primary">{zvolena.sezona}</Badge>
              <Badge>{zvolena.format === 'tabulka' ? 'Tabuľková' : zvolena.format}</Badge>
              <span className="cw-ligy__pravidla">
                {zvolena.body_za_vitazstvo} b. za výhru · {zvolena.body_za_remizy} b. za remízu
              </span>
              {zvolena.auto_update_tabulka && (
                <Badge ton="success">Automatický prepočet</Badge>
              )}
            </div>
          )}

          {/* ===== Tabuľka ===== */}
          <Card bezOdsadenia>
            {tabulka.nacitava ? (
              <div style={{ padding: 'var(--sp-4)' }}>
                <Skeleton riadkov={6} vyska="18px" />
              </div>
            ) : riadky.length === 0 ? (
              <EmptyState
                ikona={<Icon nazov="ligy" velkost={36} />}
                nadpis="Tabuľka je prázdna"
                popis="Tabuľka sa naplní po zadaní výsledkov zápasov. Môžete ju aj vynútene prepočítať."
                akcia={
                  <Button variant="secondary" onClick={prepocitaj} nacitava={prepocitava}>
                    Prepočítať tabuľku
                  </Button>
                }
              />
            ) : (
              <div className="cw-ligy__wrap">
                <table className="cw-ligy__tabulka">
                  <thead>
                    <tr>
                      <th className="cw-ligy__poz">#</th>
                      <th>Tím</th>
                      <th className="cw-ligy__cislo">Z</th>
                      <th className="cw-ligy__cislo">V</th>
                      <th className="cw-ligy__cislo">R</th>
                      <th className="cw-ligy__cislo">P</th>
                      <th className="cw-ligy__cislo cw-ligy__skryt">Skóre</th>
                      <th className="cw-ligy__cislo cw-ligy__skryt">+/−</th>
                      <th className="cw-ligy__cislo cw-ligy__skryt">Forma</th>
                      <th className="cw-ligy__body">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riadky.map((r) => (
                      <tr key={r.id}>
                        <td className="cw-ligy__poz">{r.pozicia}</td>
                        <td>
                          <div className="cw-ligy__tim">
                            {r.tim?.logo ? (
                              <img
                                src={r.tim.logo}
                                alt=""
                                className="cw-ligy__logo"
                                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                              />
                            ) : (
                              <span className="cw-ligy__znak" aria-hidden="true">
                                {nazovTimu(r).charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="cw-ligy__nazov">{nazovTimu(r)}</span>
                            {/* Ručne upravený riadok označíme — prepočet ho nemení */}
                            {r.manualne_upravene && (
                              <span title="Riadok bol ručne upravený, prepočet ho nemení">
                                <Icon nazov="upravit" velkost={13} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="cw-ligy__cislo">{r.zapasy}</td>
                        <td className="cw-ligy__cislo">{r.vitazstva}</td>
                        <td className="cw-ligy__cislo">{r.remizy}</td>
                        <td className="cw-ligy__cislo">{r.prehry}</td>
                        <td className="cw-ligy__cislo cw-ligy__skryt">
                          {r.goly_za}:{r.goly_proti}
                        </td>
                        <td className="cw-ligy__cislo cw-ligy__skryt">
                          {r.goly_rozdiel > 0 ? '+' : ''}
                          {r.goly_rozdiel}
                        </td>
                        <td className="cw-ligy__cislo cw-ligy__skryt">
                          {r.forma ? (
                            <span className="cw-ligy__forma">
                              {r.forma.split('').map((v, i) => (
                                <span key={i} className={`cw-ligy__vysledok is-${v}`}>
                                  {v}
                                </span>
                              ))}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="cw-ligy__body">
                          {r.body}
                          {r.penalizacne_body !== 0 && (
                            <span className="cw-ligy__penal" title="Penalizačné body">
                              {r.penalizacne_body}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Zmazať súťaž?"
        sprava={`Súťaž ${naZmazanie?.nazov} (${naZmazanie?.sezona}) bude odstránená aj s tabuľkou. Zápasy zostanú zachované.`}
        potvrdit="Zmazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Ligy;
