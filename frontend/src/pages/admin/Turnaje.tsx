// Umiestnenie: frontend/src/pages/admin/Turnaje.tsx
// Turnaje — pohárové súťaže a mládežnícke turnaje.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Select, Switch,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { turnajeApi } from '../../api/doplnky';
import { ligyApi } from '../../api/sport';
import { formatujDatum } from '../../utils/datum';
import type { Turnaj, TypTurnaja, StavTurnaja } from '../../api/typy';
import './Turnaje.css';

const TYPY: Array<{ hodnota: TypTurnaja; popis: string; vysvetlenie: string }> = [
  {
    hodnota: 'single_elimination',
    popis: 'Vyraďovací (jednoduchý)',
    vysvetlenie: 'Kto prehrá, končí. Najrýchlejší formát.',
  },
  {
    hodnota: 'double_elimination',
    popis: 'Vyraďovací (dvojitý)',
    vysvetlenie: 'Tím vypadne až po druhej prehre.',
  },
  {
    hodnota: 'round_robin',
    popis: 'Každý s každým',
    vysvetlenie: 'Všetci odohrajú so všetkými, rozhoduje tabuľka.',
  },
  {
    hodnota: 'groups_playoff',
    popis: 'Skupiny a play-off',
    vysvetlenie: 'Zo skupín postupujú najlepší do vyraďovacej časti.',
  },
];

const STAVY: Array<{ hodnota: StavTurnaja; popis: string; ton: TonStitka }> = [
  { hodnota: 'pripravuje', popis: 'Pripravuje sa', ton: 'neutral' },
  { hodnota: 'prebiehajuci', popis: 'Prebieha', ton: 'success' },
  { hodnota: 'pozastaveny', popis: 'Pozastavený', ton: 'warning' },
  { hodnota: 'ukonceny', popis: 'Ukončený', ton: 'info' },
];

const PRAZDNY: Partial<Turnaj> = {
  nazov: '',
  typ: 'single_elimination',
  pocet_timov: 8,
  ma_tretie_miesto: false,
  status: 'pripravuje',
  liga_id: undefined,
};

export const Turnaje: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<Turnaj> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Turnaj | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const turnaje = useNacitanie((signal) => turnajeApi.vypis(signal));
  const ligy = useNacitanie((signal) => ligyApi.vypis(signal));

  const zoznam = turnaje.data ?? [];
  const zoznamLig = ligy.data ?? [];

  const jeNovy = upravovany !== null && !upravovany.id;

  /** Počet kôl vo vyraďovacom pavúku. */
  const pocetKol = (pocetTimov: number): number => Math.ceil(Math.log2(Math.max(pocetTimov, 2)));

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.nazov?.trim()) {
      varovanie('Zadajte názov turnaja');
      return;
    }
    if (!upravovany.liga_id) {
      varovanie('Vyberte súťaž, pod ktorú turnaj patrí');
      return;
    }

    const pocet = Number(upravovany.pocet_timov) || 0;
    if (pocet < 2) {
      varovanie('Turnaj musí mať aspoň dva tímy');
      return;
    }

    // Pri skupinovom formáte musí byť počet skupín zmysluplný
    if (upravovany.typ === 'groups_playoff') {
      const skupiny = Number(upravovany.pocet_skupin) || 0;
      if (skupiny < 2) {
        varovanie('Formát so skupinami vyžaduje aspoň dve skupiny');
        return;
      }
      if (skupiny > pocet / 2) {
        varovanie('V každej skupine musia byť aspoň dva tímy');
        return;
      }
    }

    setUklada(true);
    try {
      if (jeNovy) {
        await turnajeApi.vytvor(upravovany);
        uspech('Turnaj bol vytvorený');
      } else {
        await turnajeApi.uprav(upravovany.id!, upravovany);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      turnaje.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Turnaj sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await turnajeApi.zmaz(naZmazanie.id);
      uspech('Turnaj bol zmazaný');
      setNaZmazanie(null);
      turnaje.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Turnaj sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Turnaje"
        podnadpis="Pohárové súťaže a mládežnícke turnaje."
        akcie={
          <Button
            ikona={<Icon nazov="plus" velkost={17} />}
            onClick={() => setUpravovany({ ...PRAZDNY })}
            disabled={zoznamLig.length === 0}
          >
            Nový turnaj
          </Button>
        }
      />

      {turnaje.chyba ? (
        <ErrorState sprava="Turnaje sa nepodarilo načítať" detail={turnaje.chyba} onSkusZnova={turnaje.obnov} />
      ) : turnaje.nacitava ? (
        <div className="cw-tur__mriezka">
          {[0, 1].map((i) => (
            <div key={i} className="cw-tur__karta">
              <Skeleton riadkov={4} />
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-tur__prazdne">
          <EmptyState
            ikona={<Icon nazov="ligy" velkost={40} />}
            nadpis="Zatiaľ žiadne turnaje"
            popis={
              zoznamLig.length === 0
                ? 'Turnaj patrí pod súťaž. Najprv vytvorte súťaž pridaním zápasu.'
                : 'Vytvorte pohárovú súťaž alebo mládežnícky turnaj.'
            }
            akcia={
              zoznamLig.length > 0 ? (
                <Button onClick={() => setUpravovany({ ...PRAZDNY })}>Vytvoriť turnaj</Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="cw-tur__mriezka">
          {zoznam.map((t) => {
            const typ = TYPY.find((x) => x.hodnota === t.typ);
            const stav = STAVY.find((x) => x.hodnota === t.status);

            return (
              <div key={t.id} className="cw-tur__karta">
                <div className="cw-tur__hlava">
                  <div className="cw-tur__nazvy">
                    <div className="cw-tur__nazov">{t.nazov}</div>
                    {t.liga && (
                      <div className="cw-tur__liga">
                        {t.liga.nazov} · {t.liga.sezona}
                      </div>
                    )}
                  </div>

                  <Badge ton={stav?.ton ?? 'neutral'} zivy={t.status === 'prebiehajuci'}>
                    {stav?.popis ?? t.status}
                  </Badge>
                </div>

                <div className="cw-tur__udaje">
                  <div className="cw-tur__udaj">
                    <span className="cw-tur__udaj-cislo">{t.pocet_timov}</span>
                    <span className="cw-tur__udaj-popis">tímov</span>
                  </div>

                  {t.typ === 'groups_playoff' && t.pocet_skupin ? (
                    <div className="cw-tur__udaj">
                      <span className="cw-tur__udaj-cislo">{t.pocet_skupin}</span>
                      <span className="cw-tur__udaj-popis">skupín</span>
                    </div>
                  ) : (
                    <div className="cw-tur__udaj">
                      <span className="cw-tur__udaj-cislo">{pocetKol(t.pocet_timov)}</span>
                      <span className="cw-tur__udaj-popis">kôl</span>
                    </div>
                  )}

                  <div className="cw-tur__udaj">
                    <span className="cw-tur__udaj-cislo">
                      {t.datum_start ? formatujDatum(t.datum_start) : '—'}
                    </span>
                    <span className="cw-tur__udaj-popis">začiatok</span>
                  </div>
                </div>

                <div className="cw-tur__format">
                  <Icon nazov="ligy" velkost={14} />
                  <span>{typ?.popis ?? t.typ}</span>
                  {t.ma_tretie_miesto && <Badge>Aj o 3. miesto</Badge>}
                </div>

                <div className="cw-tur__akcie">
                  <Button variant="secondary" velkost="sm" onClick={() => setUpravovany({ ...t })}>
                    Upraviť
                  </Button>
                  <Button
                    variant="ghost"
                    velkost="sm"
                    onClick={() => setNaZmazanie(t)}
                    aria-label="Zmazať turnaj"
                  >
                    <Icon nazov="zmazat" velkost={15} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový turnaj' : upravovany?.nazov ?? 'Turnaj'}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? 'Vytvoriť' : 'Uložiť'}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            <Input
              menovka="Názov turnaja"
              value={upravovany.nazov ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="Napríklad: Zimný turnaj prípraviek"
              povinne
            />

            <Select
              menovka="Súťaž"
              value={upravovany.liga_id ?? ''}
              onChange={(e) =>
                setUpravovany((d) => ({ ...d!, liga_id: e.target.value ? Number(e.target.value) : undefined }))
              }
              prazdna="Vyberte súťaž"
              moznosti={zoznamLig.map((l) => ({ hodnota: l.id, popis: `${l.nazov} · ${l.sezona}` }))}
              povinne
              napoveda="Turnaj patrí pod súťaž, v ktorej sa hrá"
            />

            <Select
              menovka="Formát"
              value={upravovany.typ ?? 'single_elimination'}
              onChange={(e) => setUpravovany((d) => ({ ...d!, typ: e.target.value as TypTurnaja }))}
              moznosti={TYPY.map((t) => ({ hodnota: t.hodnota, popis: t.popis }))}
              napoveda={TYPY.find((t) => t.hodnota === upravovany.typ)?.vysvetlenie}
            />

            <div className="cw-tur__row">
              <Input
                menovka="Počet tímov"
                type="number"
                min={2}
                max={128}
                value={upravovany.pocet_timov ?? 8}
                onChange={(e) => setUpravovany((d) => ({ ...d!, pocet_timov: Number(e.target.value) }))}
                povinne
              />

              {/* Skupiny majú zmysel len pri skupinovom formáte */}
              {upravovany.typ === 'groups_playoff' && (
                <Input
                  menovka="Počet skupín"
                  type="number"
                  min={2}
                  max={16}
                  value={upravovany.pocet_skupin ?? 2}
                  onChange={(e) => setUpravovany((d) => ({ ...d!, pocet_skupin: Number(e.target.value) }))}
                />
              )}
            </div>

            {upravovany.typ === 'groups_playoff' && (
              <Input
                menovka="Postupujúcich zo skupiny"
                type="number"
                min={1}
                value={upravovany.pocet_postupujucich ?? 2}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, pocet_postupujucich: Number(e.target.value) }))
                }
                napoveda={
                  upravovany.pocet_skupin && upravovany.pocet_postupujucich
                    ? `Do play-off postúpi ${upravovany.pocet_skupin * upravovany.pocet_postupujucich} tímov`
                    : undefined
                }
              />
            )}

            <div className="cw-tur__row">
              <Input
                menovka="Začiatok"
                type="date"
                value={upravovany.datum_start?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, datum_start: e.target.value || null }))}
              />
              <Select
                menovka="Stav"
                value={upravovany.status ?? 'pripravuje'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, status: e.target.value as StavTurnaja }))}
                moznosti={STAVY.map((s) => ({ hodnota: s.hodnota, popis: s.popis }))}
              />
            </div>

            {/* Zápas o tretie miesto sa hrá len vo vyraďovacích formátoch */}
            {upravovany.typ !== 'round_robin' && (
              <Switch
                zapnute={Boolean(upravovany.ma_tretie_miesto)}
                onZmena={(v) => setUpravovany((d) => ({ ...d!, ma_tretie_miesto: v }))}
                menovka="Zápas o tretie miesto"
                popis="Porazení zo semifinále odohrajú zápas o bronz"
              />
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Zmazať turnaj?"
        sprava={`Turnaj ${naZmazanie?.nazov} bude odstránený. Zápasy, ktoré sa v ňom odohrali, zostanú zachované.`}
        potvrdit="Zmazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Turnaje;
