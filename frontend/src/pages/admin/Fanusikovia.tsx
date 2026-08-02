// Umiestnenie: frontend/src/pages/admin/Fanusikovia.tsx
// Registrovaní fanúšikovia a členovia klubu.

import React, { useState, useMemo } from 'react';
import {
  PageHeader, Button, Badge, Icon, DataTable, FilterChips, Modal, Input, Select, Textarea, Switch,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku, type Chip, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { fanusikoviaApi } from '../../api/klub';
import { formatujDatum } from '../../utils/datum';
import type { Fanusik, TypClenstva } from '../../api/typy';

const TYPY: Array<{ hodnota: TypClenstva; popis: string; ton: TonStitka }> = [
  { hodnota: 'fanusik', popis: 'Fanúšik', ton: 'neutral' },
  { hodnota: 'clen', popis: 'Člen klubu', ton: 'primary' },
  { hodnota: 'vip', popis: 'VIP', ton: 'warning' },
  { hodnota: 'cestny', popis: 'Čestný člen', ton: 'success' },
];

const PRAZDNY: Partial<Fanusik> = {
  meno: '',
  priezvisko: '',
  email: '',
  telefon: '',
  typ_clenstva: 'fanusik',
  cislo_karty: '',
  suhlas_oznamy: false,
  poznamka: '',
  aktivity: true,
};

export const Fanusikovia: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<Fanusik> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Fanusik | null>(null);
  const [filterTypu, setFilterTypu] = useState('');
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const fanusikovia = useNacitanie((signal) => fanusikoviaApi.vypis(signal));
  const zoznam = fanusikovia.data ?? [];

  const chipy: Chip[] = useMemo(
    () => [
      { hodnota: '', popis: 'Všetci', pocet: zoznam.length },
      ...TYPY.map((t) => ({
        hodnota: t.hodnota,
        popis: t.popis,
        pocet: zoznam.filter((f) => f.typ_clenstva === t.hodnota).length,
      })),
    ],
    [zoznam]
  );

  const zobrazeni = useMemo(
    () => (filterTypu ? zoznam.filter((f) => f.typ_clenstva === filterTypu) : zoznam),
    [zoznam, filterTypu]
  );

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.meno?.trim() || !upravovany.priezvisko?.trim()) {
      varovanie('Zadajte meno aj priezvisko');
      return;
    }
    if (!upravovany.email?.trim() || !upravovany.email.includes('@')) {
      varovanie('Zadajte platnú e-mailovú adresu');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovany,
        email: upravovany.email.trim().toLowerCase(),
        telefon: upravovany.telefon?.trim() || null,
        cislo_karty: upravovany.cislo_karty?.trim() || null,
        poznamka: upravovany.poznamka?.trim() || null,
      };

      if (jeNovy) {
        await fanusikoviaApi.vytvor(naUlozenie);
        uspech('Fanúšik bol pridaný');
      } else {
        await fanusikoviaApi.uprav(upravovany.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      fanusikovia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Záznam sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await fanusikoviaApi.zmaz(naZmazanie.id);
      uspech('Záznam bol odstránený');
      setNaZmazanie(null);
      fanusikovia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Záznam sa nepodarilo odstrániť');
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Fanusik>[] = [
    {
      kluc: 'osoba',
      popis: 'Meno',
      obsah: (f) => (
        <div className="cw-hraci__hrac">
          <div className="cw-hraci__avatar" aria-hidden="true">
            <span>{(f.meno[0] + f.priezvisko[0]).toUpperCase()}</span>
          </div>
          <div className="cw-hraci__meno">
            <span className="cw-hraci__meno-text">
              {f.meno} {f.priezvisko}
            </span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}>{f.email}</span>
          </div>
        </div>
      ),
      hodnotaNaZoradenie: (f) => `${f.priezvisko} ${f.meno}`,
    },
    {
      kluc: 'typ',
      popis: 'Členstvo',
      obsah: (f) => {
        const t = TYPY.find((x) => x.hodnota === f.typ_clenstva);
        return <Badge ton={t?.ton ?? 'neutral'}>{t?.popis ?? f.typ_clenstva}</Badge>;
      },
      hodnotaNaZoradenie: (f) => f.typ_clenstva,
      sirka: '150px',
    },
    {
      kluc: 'karta',
      popis: 'Číslo karty',
      obsah: (f) =>
        f.cislo_karty ? (
          <code className="cw-kat__slug">{f.cislo_karty}</code>
        ) : (
          <span style={{ color: 'var(--muted)' }}>—</span>
        ),
      sirka: '140px',
      skryTNaMobile: true,
    },
    {
      kluc: 'platnost',
      popis: 'Členstvo do',
      obsah: (f) => {
        if (!f.clenstvo_do) return <span style={{ color: 'var(--muted)' }}>neobmedzene</span>;
        const vyprsalo = new Date(f.clenstvo_do) < new Date();
        return (
          <span style={{ color: vyprsalo ? 'var(--danger)' : 'var(--muted)' }}>
            {formatujDatum(f.clenstvo_do)}
          </span>
        );
      },
      hodnotaNaZoradenie: (f) => (f.clenstvo_do ? new Date(f.clenstvo_do).getTime() : 0),
      sirka: '140px',
      skryTNaMobile: true,
    },
    {
      kluc: 'oznamy',
      popis: 'Oznamy',
      obsah: (f) =>
        f.suhlas_oznamy ? (
          <Badge ton="success">Súhlas</Badge>
        ) : (
          <span style={{ color: 'var(--muted)' }}>nie</span>
        ),
      hodnotaNaZoradenie: (f) => (f.suhlas_oznamy ? 1 : 0),
      zarovnanie: 'center',
      sirka: '120px',
    },
  ];

  const akcieRiadku: AkciaRiadku<Fanusik>[] = [
    { popis: 'Upraviť', ikona: 'upravit', onKlik: (f) => setUpravovany({ ...f }) },
    { popis: 'Odstrániť', ikona: 'zmazat', nebezpecna: true, onKlik: (f) => setNaZmazanie(f) },
  ];

  // Koľko ľudí súhlasilo so zasielaním oznamov — podklad pre rozposielanie
  const soSuhlasom = zoznam.filter((f) => f.suhlas_oznamy).length;

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Fanúšikovia"
        podnadpis={`Registrovaní priaznivci klubu · ${soSuhlasom} so súhlasom na zasielanie oznamov.`}
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
            Pridať fanúšika
          </Button>
        }
      />

      <FilterChips
        moznosti={chipy}
        zvolena={filterTypu}
        onZmena={setFilterTypu}
        popisSkupiny="Filtrovať podľa typu členstva"
      />

      <DataTable<Fanusik>
        data={zobrazeni}
        idZaznamu={(f) => f.id}
        stlpce={stlpce}
        nacitava={fanusikovia.nacitava}
        chyba={fanusikovia.chyba}
        onSkusZnova={fanusikovia.obnov}
        hladatV={(f) => `${f.meno} ${f.priezvisko} ${f.email} ${f.cislo_karty ?? ''}`}
        hladatPlaceholder="Hľadať podľa mena, e-mailu alebo čísla karty…"
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(f) => setUpravovany({ ...f })}
        prazdnyNadpis="Zatiaľ žiadni fanúšikovia"
        prazdnyPopis="Evidujte členov klubu a priaznivcov, ktorým chcete posielať oznamy."
        prazdnaAkcia={<Button onClick={() => setUpravovany({ ...PRAZDNY })}>Pridať prvého</Button>}
      />

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový fanúšik' : `${upravovany?.meno} ${upravovany?.priezvisko}`}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? 'Pridať' : 'Uložiť'}
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
                menovka="E-mail"
                type="email"
                value={upravovany.email ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, email: e.target.value }))}
                povinne
              />
              <Input
                menovka="Telefón"
                value={upravovany.telefon ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, telefon: e.target.value }))}
              />
            </div>

            <div className="cw-hraci__row">
              <Select
                menovka="Typ členstva"
                value={upravovany.typ_clenstva ?? 'fanusik'}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, typ_clenstva: e.target.value as TypClenstva }))
                }
                moznosti={TYPY.map((t) => ({ hodnota: t.hodnota, popis: t.popis }))}
              />
              <Input
                menovka="Číslo karty"
                value={upravovany.cislo_karty ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, cislo_karty: e.target.value }))}
                placeholder="Napríklad: 2026-0042"
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka="Členstvo od"
                type="date"
                value={upravovany.clenstvo_od?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, clenstvo_od: e.target.value || null }))}
              />
              <Input
                menovka="Členstvo do"
                type="date"
                value={upravovany.clenstvo_do?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, clenstvo_do: e.target.value || null }))}
              />
            </div>

            <Textarea
              menovka="Poznámka"
              value={upravovany.poznamka ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, poznamka: e.target.value }))}
              rows={2}
            />

            <Switch
              zapnute={Boolean(upravovany.suhlas_oznamy)}
              onZmena={(v) => setUpravovany((d) => ({ ...d!, suhlas_oznamy: v }))}
              menovka="Súhlas so zasielaním oznamov"
              popis="Bez súhlasu nesmiete posielať klubové novinky — súhlas sa dá kedykoľvek odvolať"
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Odstrániť záznam?"
        sprava={`${naZmazanie?.meno} ${naZmazanie?.priezvisko} bude odstránený z evidencie fanúšikov.`}
        potvrdit="Odstrániť"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Fanusikovia;
