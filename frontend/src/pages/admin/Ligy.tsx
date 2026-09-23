// Umiestnenie: frontend/src/pages/admin/Ligy.tsx
// Súťaže a ligové tabuľky.
//
// Liga: názov, popis, sezóna, náš tím, logo, bodovanie a režim tabuľky
// (plná tabuľka alebo len body). Tabuľka sa dá upravovať ručne - pridať
// tím (náš alebo súper s vlastným logom), meniť poradie a všetky čísla.
// Liga sa dá duplikovať do novej sezóny - iba s tímami, alebo aj s bodmi.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, Button, Badge, Icon, Select, Input, Textarea, Switch, Modal, Skeleton,
  EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { ligyApi, timyApi } from '../../api/sport';
import { tabulkyApi } from '../../api/obsah';
import { sezonyApi } from '../../api/sprava';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import type { Liga, RiadokTabulky, RiadokNaUlozenie } from '../../api/typy';
import './Ligy.css';

const TYPY_SUTAZE = [
  { hodnota: 'sutaz', popis: 'Ligová súťaž' },
  { hodnota: 'pohar', popis: 'Pohár' },
  { hodnota: 'priatelska', popis: 'Priateľské zápasy' },
];

const REZIMY = [
  { hodnota: 'plna', popis: 'Plná tabuľka (zápasy, výhry, skóre, forma…)' },
  { hodnota: 'len_body', popis: 'Len poradie a body' },
];

const PRAZDNA_LIGA: Partial<Liga> = {
  nazov: '',
  popis: '',
  typ: 'sutaz',
  sezona_id: null,
  tim_id: null,
  logo: null,
  body_za_vitazstvo: 3,
  body_za_remizy: 1,
  body_za_prehru: 0,
  rezim_tabulky: 'plna',
  auto_update_tabulka: true,
  zobrazit_formu: true,
};

/** Forma sa ukladá ako W/D/L, v administrácii ju ukazujeme po slovensky V/R/P. */
const FORMA_NA_SK: Record<string, string> = { W: 'V', D: 'R', L: 'P' };
const FORMA_ZO_SK: Record<string, string> = { V: 'W', R: 'D', P: 'L', W: 'W', D: 'D', L: 'L' };
const formaSk = (f: string | null | undefined) => (f ?? '').split('').map((z) => FORMA_NA_SK[z] ?? z).join('');
const formaNaUlozenie = (f: string) =>
  f.toUpperCase().replace(/\s/g, '').split('').map((z) => FORMA_ZO_SK[z] ?? z).join('');

/** Riadok v režime úprav - čísla ako text, aby sa dali pohodlne písať. */
interface UpravovanyRiadok {
  kluc: string;
  id?: number;
  tim_id: number | null;
  custom_tim_nazov: string;
  custom_tim_logo: string | null;
  nazov: string;
  logo: string | null;
  zapasy: string;
  vitazstva: string;
  remizy: string;
  prehry: string;
  goly_za: string;
  goly_proti: string;
  forma: string;
  body: string;
}

const naUpravu = (r: RiadokTabulky): UpravovanyRiadok => ({
  kluc: `r${r.id}`,
  id: r.id,
  tim_id: r.tim_id,
  custom_tim_nazov: r.custom_tim_nazov ?? '',
  custom_tim_logo: r.custom_tim_logo ?? null,
  nazov: r.tim_nazov || r.tim?.nazov || r.custom_tim_nazov || '—',
  logo: r.tim_logo ?? r.tim?.logo ?? r.custom_tim_logo ?? null,
  zapasy: String(r.zapasy ?? 0),
  vitazstva: String(r.vitazstva ?? 0),
  remizy: String(r.remizy ?? 0),
  prehry: String(r.prehry ?? 0),
  goly_za: String(r.goly_za ?? 0),
  goly_proti: String(r.goly_proti ?? 0),
  forma: formaSk(r.forma),
  body: String(r.body ?? 0),
});

export const Ligy: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [vybrana, setVybrana] = useState<number | null>(null);
  const [prepocitava, setPrepocitava] = useState(false);
  const [naZmazanie, setNaZmazanie] = useState<Liga | null>(null);
  const [maze, setMaze] = useState(false);

  // Formulár ligy
  const [upravovana, setUpravovana] = useState<Partial<Liga> | null>(null);
  const [ukladaLigu, setUkladaLigu] = useState(false);

  // Úprava tabuľky
  const [riadkyUprav, setRiadkyUprav] = useState<UpravovanyRiadok[] | null>(null);
  const [naOdstranenie, setNaOdstranenie] = useState<number[]>([]);
  const [ukladaTabulku, setUkladaTabulku] = useState(false);
  const [novyTim, setNovyTim] = useState<{ typ: 'nas' | 'super'; tim_id: number | null; nazov: string; logo: string | null }>(
    { typ: 'super', tim_id: null, nazov: '', logo: null }
  );

  // Duplikácia
  const [duplikovat, setDuplikovat] = useState<{ sezona_id: number | null; zachovat_body: boolean } | null>(null);
  const [duplikuje, setDuplikuje] = useState(false);

  const ligy = useNacitanie((signal) => ligyApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const sezony = useNacitanie((signal) => sezonyApi.vypis(signal));
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
  const lenBody = zvolena?.rezim_tabulky === 'len_body';
  const riadky = tabulka.data ?? [];
  const nasTim = (id: number | null | undefined) => (timy.data ?? []).find((t) => t.id === id);

  // Pri zmene ligy zrušíme rozrobenú úpravu tabuľky
  useEffect(() => {
    setRiadkyUprav(null);
    setNaOdstranenie([]);
  }, [vybrana]);

  const moznostiSezon = useMemo(
    () =>
      (sezony.data ?? []).map((s) => ({
        hodnota: s.id,
        popis: `${s.nazov}${s.aktualna ? ' (aktuálna)' : ''}`,
      })),
    [sezony.data]
  );

  // ===== Liga =====

  const otvorLigu = (liga: Partial<Liga>) => {
    // Staršia liga má len textovú sezónu - skúsime ju spárovať so zoznamom
    const sezonaId =
      liga.sezona_id ?? (sezony.data ?? []).find((s) => s.nazov === liga.sezona)?.id ??
      (!liga.id ? (sezony.data ?? []).find((s) => s.aktualna)?.id ?? null : null);
    setUpravovana({ ...liga, sezona_id: sezonaId });
  };

  const ulozLigu = async () => {
    if (!upravovana) return;
    if ((upravovana.nazov ?? '').trim().length < 2) {
      varovanie('Názov súťaže musí mať aspoň 2 znaky');
      return;
    }
    if (!upravovana.sezona_id && !upravovana.sezona) {
      varovanie('Vyberte sezónu');
      return;
    }
    const cisla = [upravovana.body_za_vitazstvo, upravovana.body_za_remizy, upravovana.body_za_prehru];
    if (cisla.some((c) => c === undefined || c === null || Number.isNaN(Number(c)) || Number(c) < 0 || Number(c) > 10)) {
      varovanie('Body za výsledok musia byť čísla 0 – 10');
      return;
    }

    const sezona = (sezony.data ?? []).find((s) => s.id === upravovana.sezona_id);
    const udaje: Partial<Liga> = {
      nazov: upravovana.nazov!.trim(),
      popis: upravovana.popis?.trim() || null,
      typ: upravovana.typ || 'sutaz',
      sezona_id: upravovana.sezona_id ?? null,
      sezona: sezona?.nazov ?? upravovana.sezona,
      tim_id: upravovana.tim_id ?? null,
      logo: upravovana.logo || null,
      body_za_vitazstvo: Number(upravovana.body_za_vitazstvo),
      body_za_remizy: Number(upravovana.body_za_remizy),
      body_za_prehru: Number(upravovana.body_za_prehru),
      rezim_tabulky: upravovana.rezim_tabulky || 'plna',
      auto_update_tabulka: Boolean(upravovana.auto_update_tabulka),
      zobrazit_formu: Boolean(upravovana.zobrazit_formu),
    };

    setUkladaLigu(true);
    try {
      if (upravovana.id) {
        await tabulkyApi.upravLigu(upravovana.id, udaje);
        uspech('Súťaž bola uložená');
      } else {
        const nova = await tabulkyApi.vytvorLigu(udaje);
        uspech('Súťaž bola vytvorená');
        setVybrana(nova.id);
      }
      setUpravovana(null);
      ligy.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Súťaž sa nepodarilo uložiť');
    } finally {
      setUkladaLigu(false);
    }
  };

  /** Vynúti prepočet tabuľky zo zápasov. */
  const prepocitaj = async () => {
    if (vybrana === null) return;
    setPrepocitava(true);
    try {
      await tabulkyApi.prepocitaj(vybrana);
      uspech('Tabuľka bola prepočítaná zo zápasov');
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
      uspech('Súťaž bola presunutá do archívu');
      setNaZmazanie(null);
      setVybrana(null);
      ligy.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Súťaž sa nepodarilo archivovať');
    } finally {
      setMaze(false);
    }
  };

  const duplikuj = async () => {
    if (!zvolena || !duplikovat) return;
    if (!duplikovat.sezona_id) {
      varovanie('Vyberte sezónu, do ktorej sa liga skopíruje');
      return;
    }
    setDuplikuje(true);
    try {
      const vysledok = await tabulkyApi.duplikuj(zvolena.id, { sezona_id: duplikovat.sezona_id, zachovat_body: duplikovat.zachovat_body });
      uspech(`Liga bola skopírovaná do sezóny ${vysledok.liga.sezona}`);
      setDuplikovat(null);
      await ligy.obnov();
      setVybrana(vysledok.liga.id);
    } catch (e: any) {
      hlasChybu(e?.message || 'Ligu sa nepodarilo duplikovať');
    } finally {
      setDuplikuje(false);
    }
  };

  // ===== Úprava tabuľky =====

  const zacniUpravu = () => {
    setRiadkyUprav(riadky.map(naUpravu));
    setNaOdstranenie([]);
  };

  const zmenRiadok = (kluc: string, pole: keyof UpravovanyRiadok, hodnota: string) =>
    setRiadkyUprav((r) => r!.map((x) => (x.kluc === kluc ? { ...x, [pole]: hodnota } : x)));

  const posun = (index: number, smer: -1 | 1) =>
    setRiadkyUprav((r) => {
      const nove = [...r!];
      const ciel = index + smer;
      if (ciel < 0 || ciel >= nove.length) return nove;
      [nove[index], nove[ciel]] = [nove[ciel], nove[index]];
      return nove;
    });

  const odstranRiadok = (riadok: UpravovanyRiadok) => {
    setRiadkyUprav((r) => r!.filter((x) => x.kluc !== riadok.kluc));
    if (riadok.id) setNaOdstranenie((ids) => [...ids, riadok.id!]);
  };

  const pridajTim = () => {
    if (!riadkyUprav) return;
    let novy: UpravovanyRiadok;
    const zaklad = {
      kluc: `novy-${Date.now()}`,
      zapasy: '0', vitazstva: '0', remizy: '0', prehry: '0', goly_za: '0', goly_proti: '0', forma: '', body: '0',
    };

    if (novyTim.typ === 'nas') {
      const tim = nasTim(novyTim.tim_id);
      if (!tim) {
        varovanie('Vyberte náš tím');
        return;
      }
      if (riadkyUprav.some((r) => r.tim_id === tim.id)) {
        varovanie(`Tím ${tim.nazov} už v tabuľke je`);
        return;
      }
      novy = { ...zaklad, tim_id: tim.id, custom_tim_nazov: '', custom_tim_logo: null, nazov: tim.nazov, logo: tim.logo };
    } else {
      const nazov = novyTim.nazov.trim();
      if (nazov.length < 2) {
        varovanie('Zadajte názov tímu');
        return;
      }
      if (riadkyUprav.some((r) => !r.tim_id && r.custom_tim_nazov.toLowerCase() === nazov.toLowerCase())) {
        varovanie(`Tím ${nazov} už v tabuľke je`);
        return;
      }
      novy = { ...zaklad, tim_id: null, custom_tim_nazov: nazov, custom_tim_logo: novyTim.logo, nazov, logo: novyTim.logo };
    }

    setRiadkyUprav([...riadkyUprav, novy]);
    setNovyTim({ typ: novyTim.typ, tim_id: null, nazov: '', logo: null });
  };

  const ulozTabulku = async () => {
    if (!zvolena || !riadkyUprav) return;

    const cislo = (t: string, popis: string, nazov: string) => {
      const n = t.trim() === '' ? 0 : Number(t);
      if (!Number.isInteger(n)) throw new Error(`${nazov}: ${popis} musí byť celé číslo`);
      return n;
    };

    let data: RiadokNaUlozenie[];
    try {
      data = riadkyUprav.map((r, i) => {
        const riadok: RiadokNaUlozenie = {
          id: r.id ?? `temp-${i}`,
          pozicia: i + 1,
          body: cislo(r.body, 'body', r.nazov),
        };
        if (r.tim_id) riadok.tim_id = r.tim_id;
        else {
          riadok.custom_tim_nazov = r.custom_tim_nazov.trim() || r.nazov;
          riadok.custom_tim_logo = r.custom_tim_logo;
        }
        if (!lenBody) {
          riadok.zapasy = cislo(r.zapasy, 'zápasy', r.nazov);
          riadok.vitazstva = cislo(r.vitazstva, 'výhry', r.nazov);
          riadok.remizy = cislo(r.remizy, 'remízy', r.nazov);
          riadok.prehry = cislo(r.prehry, 'prehry', r.nazov);
          riadok.goly_za = cislo(r.goly_za, 'strelené góly', r.nazov);
          riadok.goly_proti = cislo(r.goly_proti, 'inkasované góly', r.nazov);
          const forma = formaNaUlozenie(r.forma);
          if (forma && !/^[WDL]{1,10}$/.test(forma)) {
            throw new Error(`${r.nazov}: forma smie obsahovať len V (výhra), R (remíza), P (prehra), najviac 10 znakov`);
          }
          riadok.forma = forma || null;
        }
        return riadok;
      });
    } catch (e: any) {
      varovanie(e.message);
      return;
    }

    setUkladaTabulku(true);
    try {
      for (const id of naOdstranenie) {
        await tabulkyApi.zmazRiadok(zvolena.id, id);
      }
      if (data.length > 0) await tabulkyApi.ulozTabulku(zvolena.id, data);
      uspech('Tabuľka bola uložená');
      setRiadkyUprav(null);
      setNaOdstranenie([]);
      tabulka.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Tabuľku sa nepodarilo uložiť');
      tabulka.obnov();
    } finally {
      setUkladaTabulku(false);
    }
  };

  // ===== Vykreslenie =====

  const logoRiadku = (logo: string | null | undefined, nazov: string) =>
    logo ? (
      <img
        src={souborUrl(logo)}
        alt=""
        className="cw-ligy__logo"
        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
      />
    ) : (
      <span className="cw-ligy__znak" aria-hidden="true">
        {nazov.charAt(0).toUpperCase()}
      </span>
    );

  if (ligy.chyba) {
    return <ErrorState sprava="Súťaže sa nepodarilo načítať" detail={ligy.chyba} onSkusZnova={ligy.obnov} />;
  }

  const bunkaCisla = (r: UpravovanyRiadok, pole: keyof UpravovanyRiadok, popis: string) => (
    <td className="cw-ligy__cislo">
      <input
        className="cw-ligy__vstup"
        inputMode="numeric"
        value={r[pole] as string}
        onChange={(e) => zmenRiadok(r.kluc, pole, e.target.value)}
        aria-label={`${popis} – ${r.nazov}`}
      />
    </td>
  );

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Ligy a tabuľky"
        podnadpis="Súťaže klubu a ich tabuľky."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => otvorLigu(PRAZDNA_LIGA)}>
            Nová súťaž
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
            popis="Vytvorte ligu, pridajte do nej tímy a tabuľku môžete viesť ručne alebo ju počítať zo zápasov."
            akcia={<Button onClick={() => otvorLigu(PRAZDNA_LIGA)}>Vytvoriť súťaž</Button>}
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
              moznosti={zoznam.map((l) => ({ hodnota: l.id, popis: `${l.nazov} · ${l.sezona}` }))}
            />

            {zvolena && (
              <div className="cw-ligy__akcie">
                <Button variant="secondary" ikona={<Icon nazov="upravit" velkost={15} />} onClick={() => otvorLigu(zvolena)}>
                  Upraviť súťaž
                </Button>
                <Button
                  variant="secondary"
                  ikona={<Icon nazov="kopirovat" velkost={15} />}
                  onClick={() => setDuplikovat({ sezona_id: null, zachovat_body: false })}
                >
                  Do novej sezóny
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setNaZmazanie(zvolena)}
                  ikona={<Icon nazov="archiv" velkost={15} />}
                >
                  Archivovať
                </Button>
              </div>
            )}
          </div>

          {/* ===== Údaje o súťaži ===== */}
          {zvolena && (
            <div className="cw-ligy__info">
              {zvolena.logo && <img src={souborUrl(zvolena.logo)} alt="" className="cw-ligy__logo-ligy" />}
              <Badge ton="primary">{zvolena.sezona}</Badge>
              <Badge>{TYPY_SUTAZE.find((t) => t.hodnota === zvolena.typ)?.popis ?? zvolena.typ}</Badge>
              {nasTim(zvolena.tim_id) && <Badge ton="info">{nasTim(zvolena.tim_id)!.nazov}</Badge>}
              {lenBody ? (
                <Badge>Len body</Badge>
              ) : (
                <span className="cw-ligy__pravidla">
                  {zvolena.body_za_vitazstvo} b. za výhru · {zvolena.body_za_remizy} b. za remízu
                </span>
              )}
              {zvolena.auto_update_tabulka && <Badge ton="success">Prepočet zo zápasov</Badge>}
              {zvolena.popis && <p className="cw-ligy__popis">{zvolena.popis}</p>}
            </div>
          )}

          {/* ===== Tabuľka ===== */}
          <Card
            bezOdsadenia
            nadpis="Tabuľka"
            akcie={
              riadkyUprav ? (
                <div className="cw-ligy__akcie">
                  <Button variant="secondary" velkost="sm" onClick={() => setRiadkyUprav(null)} disabled={ukladaTabulku}>
                    Zrušiť
                  </Button>
                  <Button velkost="sm" onClick={ulozTabulku} nacitava={ukladaTabulku}>
                    Uložiť tabuľku
                  </Button>
                </div>
              ) : (
                <div className="cw-ligy__akcie">
                  {zvolena?.auto_update_tabulka && (
                    <Button variant="ghost" velkost="sm" onClick={prepocitaj} nacitava={prepocitava}>
                      Prepočítať zo zápasov
                    </Button>
                  )}
                  <Button variant="secondary" velkost="sm" ikona={<Icon nazov="upravit" velkost={14} />} onClick={zacniUpravu}>
                    Upraviť tabuľku
                  </Button>
                </div>
              )
            }
          >
            {tabulka.nacitava ? (
              <div style={{ padding: 'var(--sp-4)' }}>
                <Skeleton riadkov={6} vyska="18px" />
              </div>
            ) : riadkyUprav ? (
              /* ===== Režim úprav ===== */
              <>
                <div className="cw-ligy__wrap">
                  <table className="cw-ligy__tabulka cw-ligy__tabulka--uprava">
                    <thead>
                      <tr>
                        <th className="cw-ligy__poz">#</th>
                        <th>Tím</th>
                        {!lenBody && (
                          <>
                            <th className="cw-ligy__cislo" title="Zápasy">Z</th>
                            <th className="cw-ligy__cislo" title="Výhry">V</th>
                            <th className="cw-ligy__cislo" title="Remízy">R</th>
                            <th className="cw-ligy__cislo" title="Prehry">P</th>
                            <th className="cw-ligy__cislo" title="Strelené góly">Góly +</th>
                            <th className="cw-ligy__cislo" title="Inkasované góly">Góly −</th>
                            <th title="Forma, napr. VVRPV">Forma</th>
                          </>
                        )}
                        <th className="cw-ligy__body">Body</th>
                        <th aria-label="Akcie" />
                      </tr>
                    </thead>
                    <tbody>
                      {riadkyUprav.map((r, i) => (
                        <tr key={r.kluc}>
                          <td className="cw-ligy__poz">
                            <div className="cw-ligy__poradie">
                              <span>{i + 1}</span>
                              <span className="cw-ligy__sipky">
                                <button onClick={() => posun(i, -1)} disabled={i === 0} aria-label={`Posunúť ${r.nazov} vyššie`}>▲</button>
                                <button onClick={() => posun(i, 1)} disabled={i === riadkyUprav.length - 1} aria-label={`Posunúť ${r.nazov} nižšie`}>▼</button>
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="cw-ligy__tim">
                              {logoRiadku(r.logo, r.nazov)}
                              {r.tim_id ? (
                                <span className="cw-ligy__nazov">{r.nazov}</span>
                              ) : (
                                <input
                                  className="cw-ligy__vstup cw-ligy__vstup--nazov"
                                  value={r.custom_tim_nazov}
                                  onChange={(e) => {
                                    zmenRiadok(r.kluc, 'custom_tim_nazov', e.target.value);
                                    zmenRiadok(r.kluc, 'nazov', e.target.value);
                                  }}
                                  aria-label={`Názov tímu ${r.nazov}`}
                                />
                              )}
                            </div>
                          </td>
                          {!lenBody && (
                            <>
                              {bunkaCisla(r, 'zapasy', 'Zápasy')}
                              {bunkaCisla(r, 'vitazstva', 'Výhry')}
                              {bunkaCisla(r, 'remizy', 'Remízy')}
                              {bunkaCisla(r, 'prehry', 'Prehry')}
                              {bunkaCisla(r, 'goly_za', 'Strelené góly')}
                              {bunkaCisla(r, 'goly_proti', 'Inkasované góly')}
                              <td>
                                <input
                                  className="cw-ligy__vstup cw-ligy__vstup--forma"
                                  value={r.forma}
                                  maxLength={10}
                                  placeholder="—"
                                  onChange={(e) => zmenRiadok(r.kluc, 'forma', e.target.value.toUpperCase())}
                                  aria-label={`Forma – ${r.nazov}`}
                                />
                              </td>
                            </>
                          )}
                          <td className="cw-ligy__body">
                            <input
                              className="cw-ligy__vstup"
                              inputMode="numeric"
                              value={r.body}
                              onChange={(e) => zmenRiadok(r.kluc, 'body', e.target.value)}
                              aria-label={`Body – ${r.nazov}`}
                            />
                          </td>
                          <td>
                            <button className="cw-ligy__odstranit" onClick={() => odstranRiadok(r)} aria-label={`Odstrániť ${r.nazov} z tabuľky`}>
                              <Icon nazov="zmazat" velkost={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ===== Pridanie tímu ===== */}
                <div className="cw-ligy__pridat">
                  <div className="cw-ligy__pridat-riadok">
                    <Select
                      menovka="Pridať tím"
                      value={novyTim.typ}
                      onChange={(e) => setNovyTim({ typ: e.target.value as 'nas' | 'super', tim_id: null, nazov: '', logo: null })}
                      moznosti={[
                        { hodnota: 'super', popis: 'Iný klub (súper)' },
                        { hodnota: 'nas', popis: 'Náš tím' },
                      ]}
                    />
                    {novyTim.typ === 'nas' ? (
                      <Select
                        menovka="Náš tím"
                        value={novyTim.tim_id ?? ''}
                        onChange={(e) => setNovyTim((n) => ({ ...n, tim_id: e.target.value ? Number(e.target.value) : null }))}
                        prazdna="Vyberte tím"
                        moznosti={(timy.data ?? []).map((t) => ({ hodnota: t.id, popis: t.nazov }))}
                      />
                    ) : (
                      <Input
                        menovka="Názov klubu"
                        value={novyTim.nazov}
                        onChange={(e) => setNovyTim((n) => ({ ...n, nazov: e.target.value }))}
                        placeholder="FK Rača"
                        onKeyDown={(e) => e.key === 'Enter' && pridajTim()}
                      />
                    )}
                  </div>
                  {novyTim.typ === 'super' && (
                    <PoleObrazka
                      menovka="Logo klubu"
                      hodnota={novyTim.logo}
                      onZmena={(cesta) => setNovyTim((n) => ({ ...n, logo: cesta }))}
                    />
                  )}
                  <Button variant="secondary" ikona={<Icon nazov="plus" velkost={14} />} onClick={pridajTim}>
                    Pridať do tabuľky
                  </Button>
                  <p className="cw-ligy__napoveda">
                    Poradie meníte šípkami. {lenBody ? '' : 'Formu zadávajte písmenami V (výhra), R (remíza), P (prehra). '}
                    Ručne upravené riadky prepočet zo zápasov nemení.
                  </p>
                </div>
              </>
            ) : riadky.length === 0 ? (
              <EmptyState
                ikona={<Icon nazov="ligy" velkost={36} />}
                nadpis="Tabuľka je prázdna"
                popis="Pridajte tímy do tabuľky. Pri zapnutom prepočte sa naplní aj z výsledkov zápasov."
                akcia={<Button onClick={zacniUpravu}>Pridať tímy</Button>}
              />
            ) : (
              <div className="cw-ligy__wrap">
                <table className="cw-ligy__tabulka">
                  <thead>
                    <tr>
                      <th className="cw-ligy__poz">#</th>
                      <th>Tím</th>
                      {!lenBody && (
                        <>
                          <th className="cw-ligy__cislo">Z</th>
                          <th className="cw-ligy__cislo">V</th>
                          <th className="cw-ligy__cislo">R</th>
                          <th className="cw-ligy__cislo">P</th>
                          <th className="cw-ligy__cislo cw-ligy__skryt">Skóre</th>
                          <th className="cw-ligy__cislo cw-ligy__skryt">+/−</th>
                          {zvolena?.zobrazit_formu !== false && <th className="cw-ligy__cislo cw-ligy__skryt">Forma</th>}
                        </>
                      )}
                      <th className="cw-ligy__body">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riadky.map((r) => {
                      const nazov = r.tim_nazov || r.tim?.nazov || r.custom_tim_nazov || '—';
                      return (
                        <tr key={r.id} className={nasTim(r.tim_id) ? 'is-nas' : ''}>
                          <td className="cw-ligy__poz">{r.pozicia}</td>
                          <td>
                            <div className="cw-ligy__tim">
                              {logoRiadku(r.tim_logo ?? r.tim?.logo ?? r.custom_tim_logo, nazov)}
                              <span className="cw-ligy__nazov">{nazov}</span>
                              {r.manualne_upravene && zvolena?.auto_update_tabulka && (
                                <span title="Riadok bol ručne upravený, prepočet ho nemení">
                                  <Icon nazov="upravit" velkost={13} />
                                </span>
                              )}
                            </div>
                          </td>
                          {!lenBody && (
                            <>
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
                              {zvolena?.zobrazit_formu !== false && (
                                <td className="cw-ligy__cislo cw-ligy__skryt">
                                  {r.forma ? (
                                    <span className="cw-ligy__forma">
                                      {r.forma.split('').map((v, i) => (
                                        <span key={i} className={`cw-ligy__vysledok is-${v}`}>
                                          {FORMA_NA_SK[v] ?? v}
                                        </span>
                                      ))}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              )}
                            </>
                          )}
                          <td className="cw-ligy__body">
                            {r.body}
                            {r.penalizacne_body !== 0 && (
                              <span className="cw-ligy__penal" title="Penalizačné body">
                                {r.penalizacne_body}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="cw-ligy__zapasy">
            <Button variant="ghost" ikona={<Icon nazov="zapasy" velkost={15} />} onClick={() => navigate('/admin/zapasy')}>
              Zápasy klubu
            </Button>
          </div>
        </>
      )}

      {/* ===== Formulár súťaže ===== */}
      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={upravovana?.id ? `Upraviť: ${upravovana.nazov}` : 'Nová súťaž'}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={ukladaLigu}>
              Zrušiť
            </Button>
            <Button onClick={ulozLigu} nacitava={ukladaLigu}>
              {upravovana?.id ? 'Uložiť súťaž' : 'Vytvoriť súťaž'}
            </Button>
          </>
        }
      >
        {upravovana && (
          <>
            <Input
              menovka="Názov súťaže"
              value={upravovana.nazov ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="III. liga Bratislava"
              povinne
            />
            <Textarea
              menovka="Popis"
              value={upravovana.popis ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, popis: e.target.value }))}
              rows={2}
            />
            <div className="cw-ligy__riadok">
              <Select
                menovka="Sezóna"
                value={upravovana.sezona_id ?? ''}
                onChange={(e) => setUpravovana((d) => ({ ...d!, sezona_id: e.target.value ? Number(e.target.value) : null }))}
                prazdna={upravovana.sezona && !upravovana.sezona_id ? upravovana.sezona : 'Vyberte sezónu'}
                moznosti={moznostiSezon}
                povinne
              />
              <Select
                menovka="Náš tím v súťaži"
                value={upravovana.tim_id ?? ''}
                onChange={(e) => setUpravovana((d) => ({ ...d!, tim_id: e.target.value ? Number(e.target.value) : null }))}
                prazdna="Neurčený"
                moznosti={(timy.data ?? []).map((t) => ({ hodnota: t.id, popis: t.nazov }))}
              />
            </div>
            <div className="cw-ligy__riadok">
              <Select
                menovka="Typ súťaže"
                value={upravovana.typ ?? 'sutaz'}
                onChange={(e) => setUpravovana((d) => ({ ...d!, typ: e.target.value }))}
                moznosti={TYPY_SUTAZE}
              />
              <Select
                menovka="Tabuľka"
                value={upravovana.rezim_tabulky ?? 'plna'}
                onChange={(e) => setUpravovana((d) => ({ ...d!, rezim_tabulky: e.target.value as Liga['rezim_tabulky'] }))}
                moznosti={REZIMY}
              />
            </div>
            <PoleObrazka
              menovka="Logo súťaže"
              hodnota={upravovana.logo}
              onZmena={(cesta) => setUpravovana((d) => ({ ...d!, logo: cesta }))}
            />
            {upravovana.rezim_tabulky !== 'len_body' && (
              <div className="cw-ligy__riadok cw-ligy__riadok--3">
                <Input
                  menovka="Body za výhru"
                  type="number"
                  min={0}
                  max={10}
                  value={upravovana.body_za_vitazstvo ?? ''}
                  onChange={(e) => setUpravovana((d) => ({ ...d!, body_za_vitazstvo: e.target.value === '' ? (undefined as any) : Number(e.target.value) }))}
                />
                <Input
                  menovka="Body za remízu"
                  type="number"
                  min={0}
                  max={10}
                  value={upravovana.body_za_remizy ?? ''}
                  onChange={(e) => setUpravovana((d) => ({ ...d!, body_za_remizy: e.target.value === '' ? (undefined as any) : Number(e.target.value) }))}
                />
                <Input
                  menovka="Body za prehru"
                  type="number"
                  min={0}
                  max={10}
                  value={upravovana.body_za_prehru ?? ''}
                  onChange={(e) => setUpravovana((d) => ({ ...d!, body_za_prehru: e.target.value === '' ? (undefined as any) : Number(e.target.value) }))}
                />
              </div>
            )}
            <Switch
              zapnute={Boolean(upravovana.auto_update_tabulka)}
              onZmena={(v) => setUpravovana((d) => ({ ...d!, auto_update_tabulka: v }))}
              menovka="Počítať tabuľku zo zápasov"
              popis="Po zadaní výsledku zápasu sa riadky tímov prepočítajú. Ručne upravené riadky zostanú."
            />
            {upravovana.rezim_tabulky !== 'len_body' && (
              <Switch
                zapnute={upravovana.zobrazit_formu !== false}
                onZmena={(v) => setUpravovana((d) => ({ ...d!, zobrazit_formu: v }))}
                menovka="Zobrazovať formu tímov"
              />
            )}
          </>
        )}
      </Modal>

      {/* ===== Duplikácia do novej sezóny ===== */}
      <Modal
        otvorene={duplikovat !== null}
        onZavri={() => setDuplikovat(null)}
        nadpis="Skopírovať súťaž do novej sezóny"
        podnadpis={zvolena ? `${zvolena.nazov} · ${zvolena.sezona}` : undefined}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setDuplikovat(null)} disabled={duplikuje}>
              Zrušiť
            </Button>
            <Button onClick={duplikuj} nacitava={duplikuje}>
              Skopírovať
            </Button>
          </>
        }
      >
        {duplikovat && (
          <>
            <Select
              menovka="Nová sezóna"
              value={duplikovat.sezona_id ?? ''}
              onChange={(e) => setDuplikovat((d) => ({ ...d!, sezona_id: e.target.value ? Number(e.target.value) : null }))}
              prazdna="Vyberte sezónu"
              moznosti={moznostiSezon.filter((m) => m.hodnota !== zvolena?.sezona_id)}
              povinne
            />
            <Select
              menovka="Čo sa má preniesť"
              value={duplikovat.zachovat_body ? 'body' : 'timy'}
              onChange={(e) => setDuplikovat((d) => ({ ...d!, zachovat_body: e.target.value === 'body' }))}
              moznosti={[
                { hodnota: 'timy', popis: 'Iba tímy (body a štatistiky od nuly)' },
                { hodnota: 'body', popis: 'Tímy aj body a štatistiky' },
              ]}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Archivovať súťaž?"
        sprava={`Súťaž ${naZmazanie?.nazov} (${naZmazanie?.sezona}) sa presunie do archívu aj s tabuľkou. Zápasy zostanú zachované a súťaž môžete obnoviť.`}
        potvrdit="Archivovať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Ligy;
