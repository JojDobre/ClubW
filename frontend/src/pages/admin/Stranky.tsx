// Umiestnenie: frontend/src/pages/admin/Stranky.tsx
// Statické stránky webu (O klube, Kontakt, História…).

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, DataTable, Modal, Input, Textarea, Switch,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { strankyApi } from '../../api/obsah';
import { formatujDatum } from '../../utils/datum';
import type { Stranka } from '../../api/typy';

const PRAZDNA: Partial<Stranka> = {
  nazov: '',
  obsah: '',
  v_menu: false,
  poradie_menu: 10,
  publikovany: false,
  meta_title: '',
  meta_description: '',
};

export const Stranky: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovana, setUpravovana] = useState<Partial<Stranka> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Stranka | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const stranky = useNacitanie((signal) => strankyApi.vypis(signal));
  const zoznam = stranky.data ?? [];

  const jeNova = upravovana !== null && !upravovana.id;

  /** Otvorí stránku na úpravu — obsah dotiahne zo servera. */
  const otvor = async (s: Stranka) => {
    setUpravovana({ ...s });
    try {
      // Výpis obsah stránky nevracia, načítame ho zvlášť
      const detail = await strankyApi.detail(s.id);
      setUpravovana({ ...s, ...detail });
    } catch {
      hlasChybu('Obsah stránky sa nepodarilo načítať');
    }
  };

  const uloz = async () => {
    if (!upravovana) return;

    if (!upravovana.nazov?.trim()) {
      varovanie('Zadajte názov stránky');
      return;
    }
    if (!upravovana.obsah || upravovana.obsah.trim().length < 10) {
      varovanie('Obsah stránky musí mať aspoň 10 znakov');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovana,
        meta_title: upravovana.meta_title?.trim() || null,
        meta_description: upravovana.meta_description?.trim() || null,
      };

      if (jeNova) {
        await strankyApi.vytvor(naUlozenie);
        uspech('Stránka bola vytvorená');
      } else {
        await strankyApi.uprav(upravovana.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovana(null);
      stranky.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Stránku sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await strankyApi.zmaz(naZmazanie.id);
      uspech('Stránka bola zmazaná');
      setNaZmazanie(null);
      stranky.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Stránku sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Stranka>[] = [
    {
      kluc: 'nazov',
      popis: 'Stránka',
      obsah: (s) => <strong>{s.nazov}</strong>,
      hodnotaNaZoradenie: (s) => s.nazov,
    },
    {
      kluc: 'slug',
      popis: 'Adresa',
      obsah: (s) => <code className="cw-kat__slug">/{s.slug}</code>,
      sirka: '190px',
      skryTNaMobile: true,
    },
    {
      kluc: 'menu',
      popis: 'V menu',
      obsah: (s) =>
        s.v_menu ? (
          <Badge ton="primary">{s.poradie_menu ?? '—'}. pozícia</Badge>
        ) : (
          <span style={{ color: 'var(--muted)' }}>nie</span>
        ),
      hodnotaNaZoradenie: (s) => (s.v_menu ? s.poradie_menu ?? 999 : 9999),
      sirka: '140px',
    },
    {
      kluc: 'stav',
      popis: 'Stav',
      obsah: (s) =>
        s.publikovany ? <Badge ton="success">Publikovaná</Badge> : <Badge>Koncept</Badge>,
      hodnotaNaZoradenie: (s) => (s.publikovany ? 1 : 0),
      sirka: '130px',
    },
    {
      kluc: 'datum',
      popis: 'Vytvorená',
      obsah: (s) => <span style={{ color: 'var(--muted)' }}>{formatujDatum(s.vytvoreny)}</span>,
      hodnotaNaZoradenie: (s) => new Date(s.vytvoreny).getTime(),
      sirka: '130px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<Stranka>[] = [
    { popis: 'Upraviť', ikona: 'upravit', onKlik: otvor },
    {
      popis: 'Zobraziť na webe',
      ikona: 'oko',
      zobrazit: (s) => s.publikovany,
      onKlik: (s) => window.open(`/${s.slug}`, '_blank', 'noopener'),
    },
    { popis: 'Zmazať', ikona: 'zmazat', nebezpecna: true, onKlik: (s) => setNaZmazanie(s) },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Stránky"
        podnadpis="Statické stránky webu ako O klube, História alebo Kontakt."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setUpravovana({ ...PRAZDNA })}>
            Nová stránka
          </Button>
        }
      />

      <DataTable<Stranka>
        data={zoznam}
        idZaznamu={(s) => s.id}
        stlpce={stlpce}
        nacitava={stranky.nacitava}
        chyba={stranky.chyba}
        onSkusZnova={stranky.obnov}
        hladatV={(s) => `${s.nazov} ${s.slug}`}
        hladatPlaceholder="Hľadať stránku…"
        filtre={[
          {
            kluc: 'stav',
            popis: 'Všetky stavy',
            moznosti: [
              { hodnota: 'publikovana', popis: 'Publikované' },
              { hodnota: 'koncept', popis: 'Koncepty' },
            ],
          },
        ]}
        filtrujZaznam={(s, kluc, hodnota) =>
          kluc === 'stav' ? (hodnota === 'publikovana' ? s.publikovany : !s.publikovany) : true
        }
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={otvor}
        prazdnyNadpis="Zatiaľ žiadne stránky"
        prazdnyPopis="Vytvorte stránky ako O klube, História alebo Kontakt."
        prazdnaAkcia={<Button onClick={() => setUpravovana({ ...PRAZDNA })}>Vytvoriť stránku</Button>}
      />

      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={jeNova ? 'Nová stránka' : upravovana?.nazov ?? 'Stránka'}
        sirka="lg"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNova ? 'Vytvoriť' : 'Uložiť'}
            </Button>
          </>
        }
      >
        {upravovana && (
          <>
            <Input
              menovka="Názov stránky"
              value={upravovana.nazov ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="O klube"
              povinne
            />

            <Textarea
              menovka="Obsah"
              value={upravovana.obsah ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, obsah: e.target.value }))}
              placeholder="Text stránky. Môžete použiť HTML značky…"
              rows={12}
              povinne
            />

            <div className="cw-kat__row">
              <Switch
                zapnute={Boolean(upravovana.v_menu)}
                onZmena={(v) => setUpravovana((d) => ({ ...d!, v_menu: v }))}
                menovka="Zobraziť v menu"
                popis="Stránka sa objaví v hlavnej navigácii"
              />

              {upravovana.v_menu && (
                <Input
                  menovka="Poradie v menu"
                  type="number"
                  min={0}
                  value={upravovana.poradie_menu ?? 10}
                  onChange={(e) =>
                    setUpravovana((d) => ({ ...d!, poradie_menu: Number(e.target.value) }))
                  }
                />
              )}
            </div>

            <Switch
              zapnute={Boolean(upravovana.publikovany)}
              onZmena={(v) => setUpravovana((d) => ({ ...d!, publikovany: v }))}
              menovka="Publikovaná"
              popis="Nepublikovanú stránku návštevníci nevidia"
            />

            <Input
              menovka="Titulok pre vyhľadávače"
              value={upravovana.meta_title ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, meta_title: e.target.value }))}
              placeholder={upravovana.nazov || 'Ak nevyplníte, použije sa názov'}
              maxLength={70}
            />

            <Textarea
              menovka="Popis pre vyhľadávače"
              value={upravovana.meta_description ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, meta_description: e.target.value }))}
              rows={2}
              maxLength={160}
              napoveda={`${(upravovana.meta_description ?? '').length} / 160 znakov`}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Zmazať stránku?"
        sprava={`Stránka ${naZmazanie?.nazov} bude odstránená aj z menu webu.`}
        potvrdit="Zmazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Stranky;
