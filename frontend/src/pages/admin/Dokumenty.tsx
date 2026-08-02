// Umiestnenie: frontend/src/pages/admin/Dokumenty.tsx
// Dokumenty na stiahnutie — stanovy, prihlášky, tlačivá.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, DataTable, Modal, Input, Textarea, Select, Switch,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { dokumentyApi } from '../../api/klub';
import { formatujDatum } from '../../utils/datum';
import type { Dokument } from '../../api/typy';

const KATEGORIE = [
  { hodnota: 'stanovy', popis: 'Stanovy a smernice' },
  { hodnota: 'prihlasky', popis: 'Prihlášky a tlačivá' },
  { hodnota: 'vysledky', popis: 'Výsledky a súpisky' },
  { hodnota: 'financie', popis: 'Financie a rozpočet' },
  { hodnota: 'ine', popis: 'Ostatné' },
];

const PRAZDNY: Partial<Dokument> = {
  nazov: '',
  popis: '',
  subor_url: '',
  typ_suboru: 'pdf',
  kategoria: 'ine',
  verejny: true,
  poradie: 0,
  aktivity: true,
};

/** Veľkosť súboru v čitateľnom tvare. */
const velkost = (kb: number | null): string => {
  if (!kb) return '—';
  if (kb < 1024) return `${kb} kB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const Dokumenty: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<Dokument> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Dokument | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const dokumenty = useNacitanie((signal) => dokumentyApi.vypis(signal));
  const zoznam = dokumenty.data ?? [];

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.nazov?.trim()) {
      varovanie('Zadajte názov dokumentu');
      return;
    }
    if (!upravovany.subor_url?.trim()) {
      varovanie('Zadajte adresu súboru');
      return;
    }

    setUklada(true);
    try {
      // Príponu odvodíme z adresy, ak ju používateľ nezadal
      const pripona =
        upravovany.typ_suboru?.trim() ||
        upravovany.subor_url.split('.').pop()?.toLowerCase().slice(0, 10) ||
        null;

      const naUlozenie = { ...upravovany, typ_suboru: pripona, popis: upravovany.popis?.trim() || null };

      if (jeNovy) {
        await dokumentyApi.vytvor(naUlozenie);
        uspech('Dokument bol pridaný');
      } else {
        await dokumentyApi.uprav(upravovany.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      dokumenty.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Dokument sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await dokumentyApi.zmaz(naZmazanie.id);
      uspech('Dokument bol odstránený');
      setNaZmazanie(null);
      dokumenty.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Dokument sa nepodarilo odstrániť');
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Dokument>[] = [
    {
      kluc: 'nazov',
      popis: 'Dokument',
      obsah: (d) => (
        <div className="cw-hraci__hrac">
          <div className="cw-hraci__avatar" aria-hidden="true">
            <span style={{ fontSize: 10 }}>{(d.typ_suboru ?? '?').toUpperCase()}</span>
          </div>
          <div className="cw-hraci__meno">
            <span className="cw-hraci__meno-text">{d.nazov}</span>
            {d.popis && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}>{d.popis}</span>}
          </div>
        </div>
      ),
      hodnotaNaZoradenie: (d) => d.nazov,
    },
    {
      kluc: 'kategoria',
      popis: 'Kategória',
      obsah: (d) =>
        d.kategoria ? (
          <Badge>{KATEGORIE.find((k) => k.hodnota === d.kategoria)?.popis ?? d.kategoria}</Badge>
        ) : (
          <span style={{ color: 'var(--muted)' }}>—</span>
        ),
      hodnotaNaZoradenie: (d) => d.kategoria,
      sirka: '190px',
    },
    {
      kluc: 'velkost',
      popis: 'Veľkosť',
      obsah: (d) => <span style={{ color: 'var(--muted)' }}>{velkost(d.velkost_kb)}</span>,
      hodnotaNaZoradenie: (d) => d.velkost_kb,
      zarovnanie: 'right',
      sirka: '100px',
      skryTNaMobile: true,
    },
    {
      kluc: 'pristup',
      popis: 'Prístup',
      obsah: (d) => (d.verejny ? <Badge ton="success">Verejný</Badge> : <Badge ton="warning">Interný</Badge>),
      hodnotaNaZoradenie: (d) => (d.verejny ? 1 : 0),
      sirka: '120px',
    },
    {
      kluc: 'stiahnutia',
      popis: 'Stiahnutí',
      obsah: (d) => d.pocet_stiahnuti,
      hodnotaNaZoradenie: (d) => d.pocet_stiahnuti,
      zarovnanie: 'center',
      sirka: '110px',
      skryTNaMobile: true,
    },
    {
      kluc: 'datum',
      popis: 'Pridaný',
      obsah: (d) => <span style={{ color: 'var(--muted)' }}>{formatujDatum(d.vytvoreny)}</span>,
      hodnotaNaZoradenie: (d) => new Date(d.vytvoreny).getTime(),
      sirka: '120px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<Dokument>[] = [
    { popis: 'Upraviť', ikona: 'upravit', onKlik: (d) => setUpravovany({ ...d }) },
    {
      popis: 'Otvoriť súbor',
      ikona: 'oko',
      onKlik: (d) => window.open(d.subor_url, '_blank', 'noopener'),
    },
    { popis: 'Odstrániť', ikona: 'zmazat', nebezpecna: true, onKlik: (d) => setNaZmazanie(d) },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Dokumenty"
        podnadpis="Stanovy, prihlášky a tlačivá na stiahnutie."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
            Nový dokument
          </Button>
        }
      />

      <DataTable<Dokument>
        data={zoznam}
        idZaznamu={(d) => d.id}
        stlpce={stlpce}
        nacitava={dokumenty.nacitava}
        chyba={dokumenty.chyba}
        onSkusZnova={dokumenty.obnov}
        hladatV={(d) => `${d.nazov} ${d.popis ?? ''}`}
        hladatPlaceholder="Hľadať dokument…"
        filtre={[
          { kluc: 'kategoria', popis: 'Všetky kategórie', moznosti: KATEGORIE },
          {
            kluc: 'pristup',
            popis: 'Verejné aj interné',
            moznosti: [
              { hodnota: 'verejny', popis: 'Verejné' },
              { hodnota: 'interny', popis: 'Interné' },
            ],
          },
        ]}
        filtrujZaznam={(d, kluc, hodnota) => {
          if (kluc === 'kategoria') return d.kategoria === hodnota;
          if (kluc === 'pristup') return hodnota === 'verejny' ? d.verejny : !d.verejny;
          return true;
        }}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(d) => setUpravovany({ ...d })}
        prazdnyNadpis="Zatiaľ žiadne dokumenty"
        prazdnyPopis="Pridajte stanovy, prihlášky alebo iné tlačivá na stiahnutie."
        prazdnaAkcia={<Button onClick={() => setUpravovany({ ...PRAZDNY })}>Pridať dokument</Button>}
      />

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový dokument' : upravovany?.nazov ?? 'Dokument'}
        sirka="sm"
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
            <Input
              menovka="Názov"
              value={upravovany.nazov ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="Napríklad: Stanovy klubu"
              povinne
            />

            <Textarea
              menovka="Popis"
              value={upravovany.popis ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, popis: e.target.value }))}
              rows={2}
            />

            <Input
              menovka="Adresa súboru"
              value={upravovany.subor_url ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, subor_url: e.target.value }))}
              placeholder="/uploads/dokumenty/stanovy.pdf"
              povinne
              napoveda="Nahrávanie súborov pribudne v ďalšej fáze"
            />

            <Select
              menovka="Kategória"
              value={upravovany.kategoria ?? 'ine'}
              onChange={(e) => setUpravovany((d) => ({ ...d!, kategoria: e.target.value }))}
              moznosti={KATEGORIE}
            />

            <Input
              menovka="Veľkosť (kB)"
              type="number"
              min={0}
              value={upravovany.velkost_kb ?? ''}
              onChange={(e) =>
                setUpravovany((d) => ({
                  ...d!,
                  velkost_kb: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              napoveda="Voliteľné — zobrazí sa pri odkaze na stiahnutie"
            />

            <Switch
              zapnute={Boolean(upravovany.verejny)}
              onZmena={(v) => setUpravovany((d) => ({ ...d!, verejny: v }))}
              menovka="Verejný dokument"
              popis="Interný dokument uvidia len prihlásení používatelia"
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Odstrániť dokument?"
        sprava={`Dokument ${naZmazanie?.nazov} bude odstránený zo zoznamu. Samotný súbor na serveri zostane.`}
        potvrdit="Odstrániť"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Dokumenty;
