// Umiestnenie: frontend/src/pages/admin/RealizacnyTim.tsx
// Tréneri, asistenti a ostatní členovia realizačného tímu.

import React, { useState, useMemo } from 'react';
import {
  PageHeader, Button, Badge, Icon, DataTable, Modal, Input, Select,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { realizacnyTimApi } from '../../api/obsah';
import { timyApi } from '../../api/sport';
import type { ClenRealizacnehoTimu, Tim } from '../../api/typy';

const FUNKCIE = [
  { hodnota: 'hlavny_trener', popis: 'Hlavný tréner' },
  { hodnota: 'asistent', popis: 'Asistent trénera' },
  { hodnota: 'trener_brankarov', popis: 'Tréner brankárov' },
  { hodnota: 'kondicny_trener', popis: 'Kondičný tréner' },
  { hodnota: 'veduci_muzstva', popis: 'Vedúci mužstva' },
  { hodnota: 'masér', popis: 'Masér' },
  { hodnota: 'lekar', popis: 'Lekár' },
  { hodnota: 'funkcionar', popis: 'Funkcionár' },
];

const PRAZDNY: Partial<ClenRealizacnehoTimu> = {
  meno: '',
  priezvisko: '',
  funkcia: 'hlavny_trener',
  tim_id: null,
  email: '',
  telefon: '',
  fotka: '',
  poradie: 0,
};

export const RealizacnyTim: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<ClenRealizacnehoTimu> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<ClenRealizacnehoTimu | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const clenovia = useNacitanie((signal) => realizacnyTimApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));

  const zoznam = clenovia.data ?? [];
  const zoznamTimov = timy.data ?? [];

  const timPodlaId = useMemo(() => {
    const mapa = new Map<number, Tim>();
    zoznamTimov.forEach((t) => mapa.set(t.id, t));
    return mapa;
  }, [zoznamTimov]);

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.meno?.trim() || !upravovany.priezvisko?.trim()) {
      varovanie('Zadajte meno aj priezvisko');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovany,
        email: upravovany.email?.trim() || null,
        telefon: upravovany.telefon?.trim() || null,
        fotka: upravovany.fotka?.trim() || null,
      };

      if (jeNovy) {
        await realizacnyTimApi.vytvor(naUlozenie);
        uspech('Člen realizačného tímu bol pridaný');
      } else {
        await realizacnyTimApi.uprav(upravovany.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      clenovia.obnov();
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
      await realizacnyTimApi.zmaz(naZmazanie.id);
      uspech('Člen bol odstránený');
      setNaZmazanie(null);
      clenovia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Záznam sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<ClenRealizacnehoTimu>[] = [
    {
      kluc: 'osoba',
      popis: 'Meno',
      obsah: (c) => (
        <div className="cw-hraci__hrac">
          <div className="cw-hraci__avatar" aria-hidden="true">
            {c.fotka ? (
              <img src={c.fotka} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            ) : (
              <span>{c.priezvisko.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="cw-hraci__meno-text">
            {c.meno} {c.priezvisko}
          </span>
        </div>
      ),
      hodnotaNaZoradenie: (c) => `${c.priezvisko} ${c.meno}`,
    },
    {
      kluc: 'funkcia',
      popis: 'Funkcia',
      obsah: (c) => (
        <Badge ton="primary">
          {FUNKCIE.find((f) => f.hodnota === c.funkcia)?.popis ?? c.funkcia}
        </Badge>
      ),
      hodnotaNaZoradenie: (c) => c.funkcia,
      sirka: '190px',
    },
    {
      kluc: 'tim',
      popis: 'Tím',
      obsah: (c) => {
        const t = c.tim_id !== null ? timPodlaId.get(c.tim_id) : undefined;
        return t ? t.nazov : <span style={{ color: 'var(--muted)' }}>celý klub</span>;
      },
      hodnotaNaZoradenie: (c) => (c.tim_id !== null ? timPodlaId.get(c.tim_id)?.nazov ?? null : null),
      sirka: '170px',
    },
    {
      kluc: 'kontakt',
      popis: 'Kontakt',
      obsah: (c) => (
        <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-xs)' }}>
          {c.email || c.telefon || '—'}
        </span>
      ),
      sirka: '190px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<ClenRealizacnehoTimu>[] = [
    { popis: 'Upraviť', ikona: 'upravit', onKlik: (c) => setUpravovany({ ...c }) },
    { popis: 'Odstrániť', ikona: 'zmazat', nebezpecna: true, onKlik: (c) => setNaZmazanie(c) },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Realizačný tím"
        podnadpis="Tréneri, asistenti a ďalší členovia klubu."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
            Pridať člena
          </Button>
        }
      />

      <DataTable<ClenRealizacnehoTimu>
        data={zoznam}
        idZaznamu={(c) => c.id}
        stlpce={stlpce}
        nacitava={clenovia.nacitava}
        chyba={clenovia.chyba}
        onSkusZnova={clenovia.obnov}
        hladatV={(c) => `${c.meno} ${c.priezvisko} ${c.funkcia}`}
        hladatPlaceholder="Hľadať podľa mena alebo funkcie…"
        filtre={[
          { kluc: 'funkcia', popis: 'Všetky funkcie', moznosti: FUNKCIE },
          {
            kluc: 'tim',
            popis: 'Všetky tímy',
            moznosti: zoznamTimov.map((t) => ({ hodnota: String(t.id), popis: t.nazov })),
          },
        ]}
        filtrujZaznam={(c, kluc, hodnota) => {
          if (kluc === 'funkcia') return c.funkcia === hodnota;
          if (kluc === 'tim') return String(c.tim_id ?? '') === hodnota;
          return true;
        }}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(c) => setUpravovany({ ...c })}
        prazdnyNadpis="Zatiaľ žiadni členovia"
        prazdnyPopis="Pridajte trénerov a ďalších členov realizačného tímu."
        prazdnaAkcia={<Button onClick={() => setUpravovany({ ...PRAZDNY })}>Pridať prvého člena</Button>}
      />

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový člen realizačného tímu' : `${upravovany?.meno} ${upravovany?.priezvisko}`}
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
              <Select
                menovka="Funkcia"
                value={upravovany.funkcia ?? 'hlavny_trener'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, funkcia: e.target.value }))}
                moznosti={FUNKCIE}
              />
              <Select
                menovka="Tím"
                value={upravovany.tim_id ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, tim_id: e.target.value ? Number(e.target.value) : null }))
                }
                prazdna="Celý klub"
                moznosti={zoznamTimov.map((t) => ({
                  hodnota: t.id,
                  popis: `${t.nazov} (${t.vekova_kategoria})`,
                }))}
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka="E-mail"
                type="email"
                value={upravovany.email ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, email: e.target.value }))}
              />
              <Input
                menovka="Telefón"
                value={upravovany.telefon ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, telefon: e.target.value }))}
              />
            </div>

            <Input
              menovka="Adresa fotky"
              value={upravovany.fotka ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, fotka: e.target.value }))}
              placeholder="/uploads/images/staff/…"
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Odstrániť člena?"
        sprava={`${naZmazanie?.meno} ${naZmazanie?.priezvisko} bude odstránený z realizačného tímu.`}
        potvrdit="Odstrániť"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default RealizacnyTim;
