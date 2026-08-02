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
import { formatujDatum } from '../../utils/datum';
import type { Hrac, Tim } from '../../api/typy';
import './Hraci.css';

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
  fotka: '',
};

export const Hraci: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<Hrac> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Hrac | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);
  // Rýchly filter podľa tímu — v návrhu tlačidlá nad tabuľkou
  const [filterTimu, setFilterTimu] = useState('');

  const hraci = useNacitanie((signal) => hraciApi.vypis(undefined, signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));

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

    // Prázdne textové polia posielame ako null
    const naUlozenie: Partial<Hrac> = {
      ...upravovany,
      narodnost: upravovany.narodnost?.trim() || null,
      fotka: upravovany.fotka?.trim() || null,
    };

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
      uspech('Hráč bol vymazaný');
      setNaZmazanie(null);
      hraci.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Hráča sa nepodarilo vymazať');
    } finally {
      setMaze(false);
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
              <img src={h.fotka} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            ) : (
              <span>{h.cislo_dresu ?? h.priezvisko.charAt(0)}</span>
            )}
          </div>
          <div className="cw-hraci__meno">
            <span className="cw-hraci__meno-text">
              {h.meno} {h.priezvisko}
            </span>
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
    { popis: 'Upraviť', ikona: 'upravit', onKlik: (h) => setUpravovany({ ...h }) },
    {
      popis: 'Súhlasy a údaje',
      ikona: 'gdpr',
      onKlik: (h) => navigate(`/admin/ochrana-udajov?hrac=${h.id}`),
    },
    { popis: 'Vymazať', ikona: 'zmazat', nebezpecna: true, onKlik: (h) => setNaZmazanie(h) },
  ];

  return (
    <>
      <PageHeader
        nadpis="Hráči"
        podnadpis="Súpiska všetkých hráčov klubu naprieč tímami."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
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
        filtre={[{ kluc: 'pozicia', popis: 'Všetky pozície', moznosti: POZICIE }]}
        filtrujZaznam={(h, kluc, hodnota) => (kluc === 'pozicia' ? h.pozicia === hodnota : true)}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(h) => setUpravovany({ ...h })}
        prazdnyNadpis="Zatiaľ žiadni hráči"
        prazdnyPopis="Pridajte hráčov, aby ste mohli zapisovať strelcov a súpisky."
        prazdnaAkcia={<Button onClick={() => setUpravovany({ ...PRAZDNY })}>Pridať prvého hráča</Button>}
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

            <Input
              menovka="Štátna príslušnosť"
              value={upravovany.narodnost ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, narodnost: e.target.value }))}
              placeholder="Slovensko"
            />

            <Input
              menovka="Adresa fotky"
              value={upravovany.fotka ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, fotka: e.target.value }))}
              placeholder="/uploads/images/players/…"
              napoveda="Pri hráčoch do 18 rokov sa fotka zverejní len so súhlasom zákonného zástupcu"
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Vymazať hráča?"
        sprava={`Hráč ${naZmazanie?.meno} ${naZmazanie?.priezvisko} bude odstránený. Ak má zaznamenané góly, zvážte namiesto toho anonymizáciu v sekcii Ochrana údajov.`}
        potvrdit="Vymazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </>
  );
};

export default Hraci;
