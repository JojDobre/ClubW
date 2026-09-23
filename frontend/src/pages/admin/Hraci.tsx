// Umiestnenie: frontend/src/pages/admin/Hraci.tsx
// Zoznam hráčov s úpravou v modálnom okne.

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Button, Badge, Icon, DataTable, FilterChips, Modal, Input, Select,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku, type Chip,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { hraciApi, timyApi } from '../../api/sport';
import { sezonyApi } from '../../api/sprava';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import { formatujDatum } from '../../utils/datum';
import type { Hrac, Tim } from '../../api/typy';
import './Hraci.css';

const STAVY = [
  { hodnota: 'aktivny', popis: 'Aktívny' },
  { hodnota: 'neaktivny', popis: 'Neaktívny' },
];

/** Hráč vo formulári - navyše sezóna, na ktorej súpisku sa zapíše. */
type FormularHraca = Partial<Hrac> & { sezona_id?: number | null };

const POZICIE = [
  { hodnota: 'brankar', popis: 'Brankár' },
  { hodnota: 'obranca', popis: 'Obranca' },
  { hodnota: 'zaloznik', popis: 'Záložník' },
  { hodnota: 'utocnik', popis: 'Útočník' },
];

/** Prázdny hráč pre nový záznam. */
const PRAZDNY: Partial<Hrac> = {
  meno: '',
  priezvisko: '',
  datum_narodenia: '',
  cislo_dresu: null,
  pozicia: 'zaloznik',
  tim_id: undefined,
  narodnost: '',
  vyska: null,
  vaha: null,
  fotka: null,
  datum_pripojenia: '',
  datum_odpojenia: '',
  stav: 'aktivny',
  poznamky: '',
};

export const Hraci: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<FormularHraca | null>(null);
  const [presuvany, setPresuvany] = useState<Hrac | null>(null);
  const [presun, setPresun] = useState<{ tim_id: number | null; cislo_dresu: number | null }>({ tim_id: null, cislo_dresu: null });
  const [presuva, setPresuva] = useState(false);
  const [naZmazanie, setNaZmazanie] = useState<Hrac | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);
  // Rýchly filter podľa tímu — v návrhu tlačidlá nad tabuľkou
  const [filterTimu, setFilterTimu] = useState('');

  const hraci = useNacitanie((signal) => hraciApi.vypis(undefined, signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const sezony = useNacitanie((signal) => sezonyApi.vypis(signal));
  const aktualnaSezona = (sezony.data ?? []).find((se) => se.aktualna) ?? null;

  const zoznam = hraci.data ?? [];
  const zoznamTimov = timy.data ?? [];

  /** Vyhľadanie tímu podľa identifikátora. */
  const timPodlaId = useMemo(() => {
    const mapa = new Map<number, Tim>();
    zoznamTimov.forEach((t) => mapa.set(t.id, t));
    return mapa;
  }, [zoznamTimov]);

  /** Možnosti rýchleho filtra s počtom hráčov v každom tíme. */
  const chipyTimov: Chip[] = useMemo(
    () => [
      { hodnota: '', popis: 'Všetci', pocet: zoznam.length },
      ...zoznamTimov.map((t) => ({
        hodnota: String(t.id),
        popis: t.nazov,
        pocet: zoznam.filter((h) => h.tim_id === t.id).length,
      })),
    ],
    [zoznam, zoznamTimov]
  );

  // Hráči po uplatnení rýchleho filtra
  const zobrazeni = useMemo(
    () => (filterTimu ? zoznam.filter((h) => String(h.tim_id) === filterTimu) : zoznam),
    [zoznam, filterTimu]
  );

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.meno?.trim() || !upravovany.priezvisko?.trim()) {
      varovanie('Zadajte meno aj priezvisko');
      return;
    }
    if (!upravovany.datum_narodenia) {
      varovanie('Zadajte dátum narodenia');
      return;
    }
    if (!upravovany.tim_id) {
      varovanie('Vyberte tím');
      return;
    }

    if (
      upravovany.datum_pripojenia && upravovany.datum_odpojenia &&
      upravovany.datum_odpojenia < upravovany.datum_pripojenia
    ) {
      varovanie('Dátum odchodu nemôže byť skôr než dátum príchodu');
      return;
    }

    // Posielame len polia formulára, prázdne ako null
    const naUlozenie: FormularHraca = {
      meno: upravovany.meno.trim(),
      priezvisko: upravovany.priezvisko.trim(),
      datum_narodenia: upravovany.datum_narodenia,
      cislo_dresu: upravovany.cislo_dresu ?? null,
      pozicia: upravovany.pozicia,
      tim_id: upravovany.tim_id,
      narodnost: upravovany.narodnost?.trim() || null,
      vyska: upravovany.vyska ?? null,
      vaha: upravovany.vaha ?? null,
      fotka: upravovany.fotka || null,
      datum_pripojenia: upravovany.datum_pripojenia || null,
      datum_odpojenia: upravovany.datum_odpojenia || null,
      stav: upravovany.stav || 'aktivny',
      poznamky: upravovany.poznamky?.trim() || null,
    };
    if (upravovany.sezona_id) naUlozenie.sezona_id = upravovany.sezona_id;

    setUklada(true);
    try {
      if (jeNovy) {
        await hraciApi.vytvor(naUlozenie);
        uspech('Hráč bol pridaný');
      } else {
        await hraciApi.uprav(upravovany.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      hraci.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Hráča sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await hraciApi.zmaz(naZmazanie.id);
      uspech('Hráč bol presunutý do archívu');
      setNaZmazanie(null);
      hraci.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Hráča sa nepodarilo archivovať');
    } finally {
      setMaze(false);
    }
  };

  /** Otvorí formulár - dátumy skrátime na tvar pre pole typu date. */
  const otvor = (h: Partial<Hrac>) =>
    setUpravovany({
      ...h,
      datum_pripojenia: h.datum_pripojenia?.slice(0, 10) ?? '',
      datum_odpojenia: h.datum_odpojenia?.slice(0, 10) ?? '',
      sezona_id: null,
    });

  const otvorPresun = (h: Hrac) => {
    setPresuvany(h);
    setPresun({ tim_id: null, cislo_dresu: h.cislo_dresu });
  };

  /** Presun hráča do iného tímu - súpiska aktuálnej sezóny sa upraví na serveri. */
  const presunHraca = async () => {
    if (!presuvany) return;
    if (!presun.tim_id) {
      varovanie('Vyberte tím, do ktorého hráča presúvate');
      return;
    }
    setPresuva(true);
    try {
      await hraciApi.uprav(presuvany.id, { tim_id: presun.tim_id, cislo_dresu: presun.cislo_dresu });
      uspech(`${presuvany.meno} ${presuvany.priezvisko} bol presunutý do tímu ${timPodlaId.get(presun.tim_id)?.nazov ?? ''}`);
      setPresuvany(null);
      hraci.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Presun sa nepodaril');
    } finally {
      setPresuva(false);
    }
  };

  const stlpce: Stlpec<Hrac>[] = [
    {
      kluc: 'hrac',
      popis: 'Hráč',
      obsah: (h) => (
        <div className="cw-hraci__hrac">
          <div className="cw-hraci__avatar" aria-hidden="true">
            {h.fotka ? (
              <img src={souborUrl(h.fotka)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            ) : (
              <span>{h.cislo_dresu ?? h.priezvisko.charAt(0)}</span>
            )}
          </div>
          <div className="cw-hraci__meno">
            <span className="cw-hraci__meno-text">
              {h.meno} {h.priezvisko}
            </span>
            {h.stav === 'neaktivny' && <Badge ton="neutral">Neaktívny</Badge>}
            {/* Príznak z filtrovania osobných údajov detí */}
            {h.fotka_skryta_bez_suhlasu && (
              <span className="cw-hraci__bez-suhlasu" title="Fotka je skrytá — chýba súhlas zákonného zástupcu">
                bez súhlasu
              </span>
            )}
          </div>
        </div>
      ),
      hodnotaNaZoradenie: (h) => `${h.priezvisko} ${h.meno}`,
    },
    {
      kluc: 'cislo',
      popis: 'Číslo',
      obsah: (h) => (h.cislo_dresu !== null ? h.cislo_dresu : '—'),
      hodnotaNaZoradenie: (h) => h.cislo_dresu,
      zarovnanie: 'center',
      sirka: '80px',
    },
    {
      kluc: 'tim',
      popis: 'Tím',
      obsah: (h) => {
        const t = timPodlaId.get(h.tim_id);
        return t ? <Badge>{t.nazov}</Badge> : <span style={{ color: 'var(--muted)' }}>—</span>;
      },
      hodnotaNaZoradenie: (h) => timPodlaId.get(h.tim_id)?.nazov ?? null,
      sirka: '170px',
    },
    {
      kluc: 'pozicia',
      popis: 'Pozícia',
      obsah: (h) => POZICIE.find((p) => p.hodnota === h.pozicia)?.popis ?? h.pozicia,
      hodnotaNaZoradenie: (h) => h.pozicia,
      sirka: '120px',
    },
    {
      kluc: 'vek',
      popis: 'Vek',
      obsah: (h) => {
        // Pri maloletých backend presný dátum nevracia, len rok
        if (h.vek !== undefined) return `${h.vek} r.`;
        if (h.rok_narodenia) return `~${new Date().getFullYear() - h.rok_narodenia} r.`;
        if (h.datum_narodenia) return formatujDatum(h.datum_narodenia);
        return '—';
      },
      hodnotaNaZoradenie: (h) => h.vek ?? h.rok_narodenia ?? null,
      zarovnanie: 'center',
      sirka: '90px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<Hrac>[] = [
    { popis: 'Upraviť', ikona: 'upravit', onKlik: (h) => otvor(h) },
    { popis: 'Presunúť do iného tímu', ikona: 'presunut', onKlik: (h) => otvorPresun(h) },
    {
      popis: 'Súhlasy a údaje',
      ikona: 'gdpr',
      onKlik: (h) => navigate(`/admin/ochrana-udajov?hrac=${h.id}`),
    },
    { popis: 'Archivovať', ikona: 'archiv', nebezpecna: true, onKlik: (h) => setNaZmazanie(h) },
  ];

  return (
    <>
      <PageHeader
        nadpis="Hráči"
        podnadpis="Súpiska všetkých hráčov klubu naprieč tímami."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => otvor(PRAZDNY)}>
            Pridať hráča
          </Button>
        }
      />

      <FilterChips
        moznosti={chipyTimov}
        zvolena={filterTimu}
        onZmena={setFilterTimu}
        popisSkupiny="Filtrovať podľa tímu"
      />

      <DataTable<Hrac>
        data={zobrazeni}
        idZaznamu={(h) => h.id}
        stlpce={stlpce}
        nacitava={hraci.nacitava}
        chyba={hraci.chyba}
        onSkusZnova={hraci.obnov}
        hladatV={(h) => `${h.meno} ${h.priezvisko} ${timPodlaId.get(h.tim_id)?.nazov ?? ''}`}
        hladatPlaceholder="Hľadať podľa mena alebo tímu…"
        filtre={[
          { kluc: 'pozicia', popis: 'Všetky pozície', moznosti: POZICIE },
          { kluc: 'stav', popis: 'Aktívni aj neaktívni', moznosti: STAVY },
        ]}
        filtrujZaznam={(h, kluc, hodnota) =>
          kluc === 'pozicia' ? h.pozicia === hodnota : kluc === 'stav' ? (h.stav || 'aktivny') === hodnota : true
        }
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(h) => otvor(h)}
        prazdnyNadpis="Zatiaľ žiadni hráči"
        prazdnyPopis="Pridajte hráčov, aby ste mohli zapisovať strelcov a súpisky."
        prazdnaAkcia={<Button onClick={() => otvor(PRAZDNY)}>Pridať prvého hráča</Button>}
      />

      {/* ===== Okno úpravy ===== */}
      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový hráč' : `${upravovany?.meno} ${upravovany?.priezvisko}`}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? 'Pridať hráča' : 'Uložiť zmeny'}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            <div className="cw-hraci__row">
              <Input
                menovka="Meno"
                value={upravovany.meno ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, meno: e.target.value }))}
                povinne
              />
              <Input
                menovka="Priezvisko"
                value={upravovany.priezvisko ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, priezvisko: e.target.value }))}
                povinne
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka="Dátum narodenia"
                type="date"
                value={upravovany.datum_narodenia?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, datum_narodenia: e.target.value }))}
                povinne
                napoveda="Pri hráčoch do 18 rokov sa na webe zobrazí len rok"
              />
              <Input
                menovka="Číslo dresu"
                type="number"
                min={1}
                max={99}
                value={upravovany.cislo_dresu ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({
                    ...d!,
                    cislo_dresu: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="cw-hraci__row">
              <Select
                menovka="Tím"
                value={upravovany.tim_id ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, tim_id: e.target.value ? Number(e.target.value) : undefined }))
                }
                prazdna="Vyberte tím"
                moznosti={zoznamTimov.map((t) => ({
                  hodnota: t.id,
                  popis: `${t.nazov} (${t.vekova_kategoria})`,
                }))}
                povinne
              />
              <Select
                menovka="Pozícia"
                value={upravovany.pozicia ?? 'zaloznik'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, pozicia: e.target.value }))}
                moznosti={POZICIE}
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka="Výška (cm)"
                type="number"
                min={100}
                max={230}
                value={upravovany.vyska ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, vyska: e.target.value === '' ? null : Number(e.target.value) }))
                }
              />
              <Input
                menovka="Hmotnosť (kg)"
                type="number"
                min={20}
                max={200}
                value={upravovany.vaha ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, vaha: e.target.value === '' ? null : Number(e.target.value) }))
                }
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka="Štátna príslušnosť"
                value={upravovany.narodnost ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, narodnost: e.target.value }))}
                placeholder="Slovensko"
              />
              <Select
                menovka="Stav"
                value={upravovany.stav ?? 'aktivny'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, stav: e.target.value as Hrac['stav'] }))}
                moznosti={STAVY}
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka="V klube od"
                type="date"
                value={upravovany.datum_pripojenia?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, datum_pripojenia: e.target.value }))}
              />
              <Input
                menovka="Odchod z klubu"
                type="date"
                value={upravovany.datum_odpojenia?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, datum_odpojenia: e.target.value }))}
                napoveda="Vyplňte, keď hráč klub opustil"
              />
            </div>

            <Select
              menovka={jeNovy ? 'Sezóna (súpiska)' : 'Zapísať aj na súpisku sezóny'}
              value={upravovany.sezona_id ?? ''}
              onChange={(e) =>
                setUpravovany((d) => ({ ...d!, sezona_id: e.target.value ? Number(e.target.value) : null }))
              }
              prazdna={
                jeNovy
                  ? aktualnaSezona ? `Aktuálna sezóna (${aktualnaSezona.nazov})` : 'Bez sezóny'
                  : 'Nemeniť'
              }
              moznosti={(sezony.data ?? [])
                .filter((se) => !se.uzavreta)
                .map((se) => ({ hodnota: se.id, popis: se.nazov }))}
              napoveda="Hráč sa zapíše na súpisku tímu v danej sezóne"
            />

            <PoleObrazka
              menovka="Fotka hráča"
              tvar="kruh"
              hodnota={upravovany.fotka}
              onZmena={(cesta) => setUpravovany((d) => ({ ...d!, fotka: cesta }))}
              napoveda="Pri hráčoch do 18 rokov sa fotka zverejní len so súhlasom zákonného zástupcu"
            />
          </>
        )}
      </Modal>

      {/* ===== Presun do iného tímu ===== */}
      <Modal
        otvorene={presuvany !== null}
        onZavri={() => setPresuvany(null)}
        nadpis={`Presunúť: ${presuvany?.meno ?? ''} ${presuvany?.priezvisko ?? ''}`}
        podnadpis={presuvany ? `Teraz hrá za ${timPodlaId.get(presuvany.tim_id)?.nazov ?? '—'}` : undefined}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setPresuvany(null)} disabled={presuva}>
              Zrušiť
            </Button>
            <Button onClick={presunHraca} nacitava={presuva}>
              Presunúť hráča
            </Button>
          </>
        }
      >
        {presuvany && (
          <>
            <Select
              menovka="Nový tím"
              value={presun.tim_id ?? ''}
              onChange={(e) => setPresun((p) => ({ ...p, tim_id: e.target.value ? Number(e.target.value) : null }))}
              prazdna="Vyberte tím"
              moznosti={zoznamTimov
                .filter((t) => t.id !== presuvany.tim_id)
                .map((t) => ({ hodnota: t.id, popis: `${t.nazov} (${t.vekova_kategoria})` }))}
              povinne
            />
            <Input
              menovka="Číslo dresu v novom tíme"
              type="number"
              min={1}
              max={99}
              value={presun.cislo_dresu ?? ''}
              onChange={(e) =>
                setPresun((p) => ({ ...p, cislo_dresu: e.target.value === '' ? null : Number(e.target.value) }))
              }
              napoveda={
                aktualnaSezona
                  ? `V súpiske sezóny ${aktualnaSezona.nazov} zostane pôvodný tím ako história.`
                  : 'Súpiska sa upraví, keď bude nastavená aktuálna sezóna.'
              }
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Archivovať hráča?"
        sprava={`Hráč ${naZmazanie?.meno} ${naZmazanie?.priezvisko} sa presunie do archívu. Góly a súpisky zostanú zachované a hráča môžete obnoviť. Ak hráč len odišiel, stačí mu nastaviť stav Neaktívny a dátum odchodu.`}
        potvrdit="Archivovať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </>
  );
};

export default Hraci;
