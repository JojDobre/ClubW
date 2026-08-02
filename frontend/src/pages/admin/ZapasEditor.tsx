// Umiestnenie: frontend/src/pages/admin/ZapasEditor.tsx
// Vytvorenie a úprava zápasu vrátane góloch, asistencií a kariet.

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Input, Select, Textarea, Icon, Badge,
  Skeleton, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { zapasyApi, timyApi, ligyApi, hraciApi } from '../../api/sport';
import { ApiChyba } from '../../app/apiKlient';
import { naVstupDatumCas } from '../../utils/datum';
import type {
  Zapas, ZapasNaUlozenie, StavZapasu, UdalostZapasu, UdalostNaUlozenie, TypUdalosti,
} from '../../api/typy';
import './ZapasEditor.css';

const STAVY: Array<{ hodnota: StavZapasu; popis: string }> = [
  { hodnota: 'naplanovany', popis: 'Naplánovaný' },
  { hodnota: 'prebieha', popis: 'Prebieha' },
  { hodnota: 'ukonceny', popis: 'Ukončený' },
  { hodnota: 'odlozeny', popis: 'Odložený' },
  { hodnota: 'zruseny', popis: 'Zrušený' },
];

/** Popisy a symboly typov udalostí. */
export const TYPY_UDALOSTI: Record<TypUdalosti, { popis: string; symbol: string }> = {
  gol: { popis: 'Gól', symbol: '⚽' },
  vlastny_gol: { popis: 'Vlastný gól', symbol: '⚽' },
  asistencia: { popis: 'Asistencia', symbol: '👟' },
  zlta_karta: { popis: 'Žltá karta', symbol: '🟨' },
  cervena_karta: { popis: 'Červená karta', symbol: '🟥' },
};

const PRAZDNY: ZapasNaUlozenie = {
  nazov: '',
  datum_cas: '',
  status: 'naplanovany',
  kolo: null,
  miesto: '',
  liga_id: null,
  domaci_tim_id: null,
  hostujuci_tim_id: null,
  goly_domaci: null,
  goly_hostia: null,
  pocet_divakov: null,
  poznamky: '',
};

export const ZapasEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const jeNovy = id === 'novy' || id === undefined;
  const idCislo = jeNovy ? null : Number(id);

  const [formular, setFormular] = useState<ZapasNaUlozenie>(PRAZDNY);
  const [udalosti, setUdalosti] = useState<UdalostNaUlozenie[]>([]);
  const [chybyPoli, setChybyPoli] = useState<string[]>([]);
  const [uklada, setUklada] = useState(false);
  const [zmazatOtvorene, setZmazatOtvorene] = useState(false);
  const [maze, setMaze] = useState(false);

  // Nová udalosť pred pridaním do zoznamu
  const [novaUdalost, setNovaUdalost] = useState<{ hrac_id: string; typ: TypUdalosti; minuta: string }>({
    hrac_id: '',
    typ: 'gol',
    minuta: '',
  });

  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const ligy = useNacitanie((signal) => ligyApi.vypis(signal));
  const hraci = useNacitanie((signal) => hraciApi.vypis(undefined, signal));

  const zapas = useNacitanie(
    (signal) => (idCislo !== null ? zapasyApi.detail(idCislo, signal) : Promise.resolve(null)),
    [idCislo]
  );

  const statistiky = useNacitanie(
    (signal) => (idCislo !== null ? zapasyApi.statistiky(idCislo, signal) : Promise.resolve(null)),
    [idCislo]
  );

  // Naplnenie formulára po načítaní zápasu
  useEffect(() => {
    const z = zapas.data as Zapas | null;
    if (!z) return;

    setFormular({
      nazov: z.nazov ?? '',
      datum_cas: z.datum_cas ?? '',
      status: z.status ?? 'naplanovany',
      kolo: z.kolo,
      miesto: z.miesto ?? '',
      liga_id: z.liga_id,
      liga_nazov: z.liga_nazov ?? undefined,
      domaci_tim_id: z.domaci_tim_id,
      domaci_tim_nazov: z.domaci_tim_nazov ?? undefined,
      hostujuci_tim_id: z.hostujuci_tim_id,
      hostujuci_tim_nazov: z.hostujuci_tim_nazov ?? undefined,
      goly_domaci: z.goly_domaci,
      goly_hostia: z.goly_hostia,
      pocet_divakov: z.pocet_divakov,
      poznamky: z.poznamky ?? '',
    });
  }, [zapas.data]);

  // Naplnenie udalostí
  useEffect(() => {
    const s = statistiky.data;
    if (!s?.vsetky) return;

    setUdalosti(
      s.vsetky.map((u: UdalostZapasu) => ({
        hrac_id: u.hrac_id,
        typ: u.typ,
        minuta: u.minuta,
        poznamka: u.poznamka,
      }))
    );
  }, [statistiky.data]);

  const zmen = <K extends keyof ZapasNaUlozenie>(pole: K, hodnota: ZapasNaUlozenie[K]) => {
    setFormular((d) => ({ ...d, [pole]: hodnota }));
  };

  const zoznamHracov = hraci.data ?? [];

  /** Menovka hráča vo výberovom zozname. */
  const menovkaHraca = (hracId: number): string => {
    const h = zoznamHracov.find((x) => x.id === hracId);
    if (!h) return `Hráč #${hracId}`;
    const cislo = h.cislo_dresu ? ` (${h.cislo_dresu})` : '';
    return `${h.meno} ${h.priezvisko}${cislo}`;
  };

  // Udalosti zoradené podľa minúty; tie bez minúty idú na koniec
  const zoradeneUdalosti = useMemo(
    () =>
      [...udalosti].sort((a, b) => {
        if (a.minuta == null && b.minuta == null) return 0;
        if (a.minuta == null) return 1;
        if (b.minuta == null) return -1;
        return a.minuta - b.minuta;
      }),
    [udalosti]
  );

  const pridajUdalost = () => {
    if (!novaUdalost.hrac_id) {
      varovanie('Vyberte hráča');
      return;
    }

    const minuta = novaUdalost.minuta ? Number(novaUdalost.minuta) : null;
    if (minuta !== null && (minuta < 1 || minuta > 130)) {
      varovanie('Minúta musí byť medzi 1 a 130');
      return;
    }

    setUdalosti((d) => [
      ...d,
      { hrac_id: Number(novaUdalost.hrac_id), typ: novaUdalost.typ, minuta },
    ]);

    // Hráča a typ necháme — pri zapisovaní viacerých udalostí toho istého
    // typu sa tak nemusí vyberať znova
    setNovaUdalost((d) => ({ ...d, minuta: '' }));
  };

  const zmazUdalost = (index: number) => {
    // Mažeme podľa zoradeného zoznamu, preto hľadáme pôvodný index
    const cielova = zoradeneUdalosti[index];
    setUdalosti((d) => {
      const kopia = [...d];
      const i = kopia.findIndex(
        (u) => u.hrac_id === cielova.hrac_id && u.typ === cielova.typ && u.minuta === cielova.minuta
      );
      if (i >= 0) kopia.splice(i, 1);
      return kopia;
    });
  };

  // ===== Uloženie =====

  const uloz = async () => {
    setChybyPoli([]);

    if (!formular.datum_cas) {
      varovanie('Zadajte dátum a čas zápasu');
      return;
    }
    if (!formular.liga_id && !formular.liga_nazov?.trim()) {
      varovanie('Vyberte súťaž alebo zadajte jej názov');
      return;
    }
    if (!formular.domaci_tim_id && !formular.domaci_tim_nazov?.trim()) {
      varovanie('Vyberte domáci tím alebo zadajte jeho názov');
      return;
    }
    if (!formular.hostujuci_tim_id && !formular.hostujuci_tim_nazov?.trim()) {
      varovanie('Vyberte hosťujúci tím alebo zadajte jeho názov');
      return;
    }
    if (
      formular.domaci_tim_id &&
      formular.domaci_tim_id === formular.hostujuci_tim_id
    ) {
      varovanie('Domáci a hosťujúci tím nemôžu byť rovnaké');
      return;
    }

    // Ukončený zápas bez výsledku by vypadol z tabuľky ako neodohraný
    if (
      formular.status === 'ukonceny' &&
      (formular.goly_domaci === null || formular.goly_hostia === null)
    ) {
      varovanie('Ukončený zápas musí mať zadaný výsledok');
      return;
    }

    setUklada(true);
    try {
      let zapasId = idCislo;

      if (jeNovy) {
        const vytvoreny = await zapasyApi.vytvor(formular);
        zapasId = (vytvoreny as any).id;
        uspech('Zápas bol vytvorený');
      } else {
        await zapasyApi.uprav(idCislo!, formular);
        uspech('Zmeny boli uložené');
      }

      // Štatistiky ukladáme samostatne, aby chyba v nich nezhodila
      // uloženie samotného zápasu
      if (zapasId) {
        try {
          await zapasyApi.ulozStatistiky(zapasId, udalosti);
        } catch (e: any) {
          hlasChybu(`Zápas uložený, ale udalosti nie: ${e?.message ?? 'neznáma chyba'}`);
        }
      }

      if (jeNovy && zapasId) {
        navigate(`/admin/zapasy/${zapasId}`, { replace: true });
      } else {
        zapas.obnov();
        statistiky.obnov();
      }
    } catch (e: unknown) {
      if (e instanceof ApiChyba) {
        hlasChybu(e.message);
        if (e.chybyPoli) setChybyPoli(e.chybyPoli);
      } else {
        hlasChybu('Zápas sa nepodarilo uložiť');
      }
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    setMaze(true);
    try {
      await zapasyApi.zmaz(idCislo!);
      uspech('Zápas bol vymazaný');
      navigate('/admin/zapasy', { replace: true });
    } catch (e: any) {
      hlasChybu(e?.message || 'Zápas sa nepodarilo vymazať');
      setMaze(false);
    }
  };

  if (zapas.chyba) {
    return <ErrorState sprava="Zápas sa nepodarilo načítať" detail={zapas.chyba} onSkusZnova={zapas.obnov} />;
  }

  if (!jeNovy && zapas.nacitava) {
    return (
      <div className="cw-zed__panel">
        <Skeleton riadkov={8} vyska="18px" />
      </div>
    );
  }

  const zoznamTimov = timy.data ?? [];
  const zoznamLig = ligy.data ?? [];

  return (
    <div className="cw-zed">
      {/* ===== Lišta akcií ===== */}
      <div className="cw-ced__bar">
        <button className="cw-ced__spat" onClick={() => navigate('/admin/zapasy')}>
          <Icon nazov="sipkaVlavo" velkost={15} />
          Späť
        </button>

        <h1 className="cw-zed__nadpis">
          {jeNovy ? 'Nový zápas' : 'Úprava zápasu'}
        </h1>

        {formular.status === 'prebieha' && <Badge ton="danger" zivy>Prebieha</Badge>}

        <div className="cw-ced__medzera" />

        {!jeNovy && (
          <button
            className="cw-ced__btn cw-ced__btn--nebezpecne"
            onClick={() => setZmazatOtvorene(true)}
            aria-label="Vymazať zápas"
          >
            <Icon nazov="zmazat" velkost={15} />
          </button>
        )}

        <button className="cw-ced__btn cw-ced__btn--hlavne" onClick={uloz} disabled={uklada}>
          <Icon nazov="ulozit" velkost={15} />
          Uložiť zápas
        </button>
      </div>

      {chybyPoli.length > 0 && (
        <div className="cw-ced__chyby" role="alert">
          <strong>Server odmietol uloženie:</strong>
          <ul>
            {chybyPoli.map((ch, i) => (
              <li key={i}>{ch}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="cw-zed__grid">
        <div className="cw-zed__hlavne">
          {/* ===== Základné údaje ===== */}
          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Zápas</div>
            <div className="cw-zed__row">
              <Select
                menovka="Domáci tím"
                value={formular.domaci_tim_id ?? ''}
                onChange={(e) =>
                  zmen('domaci_tim_id', e.target.value ? Number(e.target.value) : null)
                }
                prazdna="Súper mimo databázy →"
                moznosti={zoznamTimov.map((t) => ({
                  hodnota: t.id,
                  popis: `${t.nazov} (${t.vekova_kategoria})`,
                }))}
              />

              <Select
                menovka="Hosťujúci tím"
                value={formular.hostujuci_tim_id ?? ''}
                onChange={(e) =>
                  zmen('hostujuci_tim_id', e.target.value ? Number(e.target.value) : null)
                }
                prazdna="Súper mimo databázy →"
                moznosti={zoznamTimov.map((t) => ({
                  hodnota: t.id,
                  popis: `${t.nazov} (${t.vekova_kategoria})`,
                }))}
              />
            </div>

            {/* Textové názvy pre súperov, ktorí nie sú v databáze.
                Zobrazíme len vtedy, keď nie je vybraný tím zo zoznamu. */}
            <div className="cw-zed__row">
              {!formular.domaci_tim_id && (
                <Input
                  menovka="Názov domáceho tímu"
                  value={formular.domaci_tim_nazov ?? ''}
                  onChange={(e) => zmen('domaci_tim_nazov', e.target.value)}
                  placeholder="Napríklad: FK Rača"
                  napoveda="Súper, ktorý nie je v databáze klubu"
                />
              )}
              {!formular.hostujuci_tim_id && (
                <Input
                  menovka="Názov hosťujúceho tímu"
                  value={formular.hostujuci_tim_nazov ?? ''}
                  onChange={(e) => zmen('hostujuci_tim_nazov', e.target.value)}
                  placeholder="Napríklad: Tatran Modra"
                  napoveda="Súper, ktorý nie je v databáze klubu"
                />
              )}
            </div>

            <div className="cw-zed__row">
              <Input
                menovka="Dátum a čas"
                type="datetime-local"
                value={naVstupDatumCas(formular.datum_cas)}
                onChange={(e) =>
                  zmen('datum_cas', e.target.value ? new Date(e.target.value).toISOString() : '')
                }
                povinne
              />
              <Input
                menovka="Miesto"
                value={formular.miesto ?? ''}
                onChange={(e) => zmen('miesto', e.target.value)}
                placeholder="Napríklad: Štadión Dolina"
              />
            </div>
          </div>

          {/* ===== Udalosti zápasu ===== */}
          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Priebeh zápasu</div>
            <p className="cw-zed__panel-popis">Góly, asistencie a karty. Zobrazia sa na verejnom webe a v poradí strelcov.</p>
            {/* Pridanie novej udalosti */}
            <div className="cw-zed__udalost-form">
              <Select
                menovka="Hráč"
                value={novaUdalost.hrac_id}
                onChange={(e) => setNovaUdalost((d) => ({ ...d, hrac_id: e.target.value }))}
                prazdna="Vyberte hráča"
                moznosti={zoznamHracov.map((h) => ({
                  hodnota: h.id,
                  popis: `${h.meno} ${h.priezvisko}${h.cislo_dresu ? ` (${h.cislo_dresu})` : ''}`,
                }))}
              />

              <Select
                menovka="Udalosť"
                value={novaUdalost.typ}
                onChange={(e) =>
                  setNovaUdalost((d) => ({ ...d, typ: e.target.value as TypUdalosti }))
                }
                moznosti={(Object.keys(TYPY_UDALOSTI) as TypUdalosti[]).map((t) => ({
                  hodnota: t,
                  popis: `${TYPY_UDALOSTI[t].symbol} ${TYPY_UDALOSTI[t].popis}`,
                }))}
              />

              <Input
                menovka="Minúta"
                type="number"
                min={1}
                max={130}
                value={novaUdalost.minuta}
                onChange={(e) => setNovaUdalost((d) => ({ ...d, minuta: e.target.value }))}
                placeholder="—"
              />

              <Button
                variant="secondary"
                onClick={pridajUdalost}
                ikona={<Icon nazov="plus" velkost={15} />}
              >
                Pridať
              </Button>
            </div>

            {/* Zoznam udalostí */}
            {statistiky.nacitava ? (
              <Skeleton riadkov={3} />
            ) : zoradeneUdalosti.length === 0 ? (
              <p className="cw-zed__prazdne">
                Zatiaľ žiadne udalosti. Pridajte gól, asistenciu alebo kartu.
              </p>
            ) : (
              <ul className="cw-zed__udalosti">
                {zoradeneUdalosti.map((u, i) => (
                  <li key={`${u.hrac_id}-${u.typ}-${u.minuta}-${i}`} className="cw-zed__udalost">
                    <span className="cw-zed__minuta">
                      {u.minuta !== null && u.minuta !== undefined ? `${u.minuta}'` : '—'}
                    </span>
                    <span className="cw-zed__symbol" aria-hidden="true">
                      {TYPY_UDALOSTI[u.typ].symbol}
                    </span>
                    <span className="cw-zed__typ">{TYPY_UDALOSTI[u.typ].popis}</span>
                    <span className="cw-zed__hrac">{menovkaHraca(u.hrac_id)}</span>
                    <button
                      className="cw-zed__odobrat"
                      onClick={() => zmazUdalost(i)}
                      aria-label="Odobrať udalosť"
                    >
                      <Icon nazov="zavriet" velkost={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== Bočný panel ===== */}
        <div className="cw-zed__bok">
          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Výsledok</div>
            <div className="cw-zed__skore">
              <Input
                menovka="Domáci"
                type="number"
                min={0}
                value={formular.goly_domaci ?? ''}
                onChange={(e) =>
                  zmen('goly_domaci', e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="—"
              />
              <span className="cw-zed__dvojbodka">:</span>
              <Input
                menovka="Hostia"
                type="number"
                min={0}
                value={formular.goly_hostia ?? ''}
                onChange={(e) =>
                  zmen('goly_hostia', e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="—"
              />
            </div>

            <Select
              menovka="Stav zápasu"
              value={formular.status ?? 'naplanovany'}
              onChange={(e) => zmen('status', e.target.value as StavZapasu)}
              moznosti={STAVY.map((s) => ({ hodnota: s.hodnota, popis: s.popis }))}
              napoveda="Po označení ako ukončený sa prepočíta ligová tabuľka"
            />
          </div>

          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Zaradenie</div>
            <Select
              menovka="Súťaž"
              value={formular.liga_id ?? ''}
              onChange={(e) => zmen('liga_id', e.target.value ? Number(e.target.value) : null)}
              prazdna="Súťaž mimo databázy →"
              moznosti={zoznamLig.map((l) => ({
                hodnota: l.id,
                popis: `${l.nazov} (${l.sezona})`,
              }))}
            />

            {!formular.liga_id && (
              <Input
                menovka="Názov súťaže"
                value={formular.liga_nazov ?? ''}
                onChange={(e) => zmen('liga_nazov', e.target.value)}
                placeholder="Napríklad: Priateľský zápas"
              />
            )}

            <Input
              menovka="Kolo"
              type="number"
              min={1}
              value={formular.kolo ?? ''}
              onChange={(e) => zmen('kolo', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="—"
            />

            <Input
              menovka="Počet divákov"
              type="number"
              min={0}
              value={formular.pocet_divakov ?? ''}
              onChange={(e) =>
                zmen('pocet_divakov', e.target.value === '' ? null : Number(e.target.value))
              }
              placeholder="—"
            />
          </div>

          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Doplňujúce</div>
            <Textarea
              menovka="Poznámky"
              value={formular.poznamky ?? ''}
              onChange={(e) => zmen('poznamky', e.target.value)}
              placeholder="Interná poznámka k zápasu…"
              rows={3}
            />

            <Input
              menovka="Odkaz na video"
              value={formular.video_url ?? ''}
              onChange={(e) => zmen('video_url', e.target.value)}
              placeholder="https://youtube.com/…"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        otvorene={zmazatOtvorene}
        nadpis="Vymazať zápas?"
        sprava="Zápas bude odstránený. Ak patrí do ligy, tabuľka sa automaticky prepočíta."
        potvrdit="Vymazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setZmazatOtvorene(false)}
      />
    </div>
  );
};

export default ZapasEditor;
