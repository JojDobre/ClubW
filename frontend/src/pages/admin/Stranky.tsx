// Umiestnenie: frontend/src/pages/admin/Stranky.tsx
// Statické stránky webu (O klube, Kontakt, História…).

import React, { useRef, useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, DataTable, Modal, Input, Textarea, Switch, Editor,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { strankyApi } from '../../api/obsah';
import { formatujDatum } from '../../utils/datum';
import type { Stranka } from '../../api/typy';
import { tr } from '../../i18n';
import './Stranky.css';

const PRAZDNA: Partial<Stranka> = {
  nazov: '',
  slug: '',
  obsah: '',
  v_menu: false,
  poradie_menu: 10,
  publikovany: false,
  meta_title: '',
  meta_description: '',
};

/** Prevedie názov na adresu (bez diakritiky, malými písmenami). */
const naAdresu = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Text bez HTML značiek - na kontrolu, či stránka naozaj niečo obsahuje. */
const bezZnaciek = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();

/**
 * Otvorí náhľad stránky v novom okne.
 * Parameter ?nahlad povie webu, aby stránku načítal cez administrátorský
 * endpoint - inak by nepublikovaná stránka skončila na „Stránka nenájdená".
 */
const otvorNahlad = (s: Partial<Stranka>) =>
  window.open(`/${s.slug}?nahlad=${s.id}`, '_blank', 'noopener');

export const Stranky: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovana, setUpravovana] = useState<Partial<Stranka> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Stranka | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);
  /** Kým používateľ adresu neupraví ručne, odvodzuje sa z názvu. */
  const adresaUpravena = useRef(false);

  const stranky = useNacitanie((signal) => strankyApi.vypis(signal));
  const zoznam = stranky.data ?? [];

  const jeNova = upravovana !== null && !upravovana.id;

  /** Otvorí stránku na úpravu — obsah dotiahne zo servera. */
  const otvor = async (s: Stranka) => {
    adresaUpravena.current = true; // existujúca stránka adresu už má
    setUpravovana({ ...s });
    try {
      // Výpis obsah stránky nevracia, načítame ho zvlášť
      const detail = await strankyApi.detail(s.id);
      setUpravovana({ ...s, ...detail });
    } catch {
      hlasChybu(tr('Obsah stránky sa nepodarilo načítať'));
    }
  };

  const novaStranka = () => {
    adresaUpravena.current = false;
    setUpravovana({ ...PRAZDNA });
  };

  /** Zmena názvu - pri novej stránke sa z neho odvodí aj adresa. */
  const zmenNazov = (nazov: string) =>
    setUpravovana((d) => ({
      ...d!,
      nazov,
      slug: adresaUpravena.current ? d!.slug : naAdresu(nazov),
    }));

  const uloz = async () => {
    if (!upravovana) return;

    if (!upravovana.nazov?.trim()) {
      varovanie(tr('Zadajte názov stránky'));
      return;
    }
    // Editor vracia HTML - dĺžku posudzujeme podľa textu bez značiek
    if (bezZnaciek(upravovana.obsah ?? '').length < 10) {
      varovanie(tr('Obsah stránky musí mať aspoň 10 znakov'));
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovana,
        // Prázdna adresa = server ju vygeneruje z názvu
        slug: naAdresu(upravovana.slug ?? ''),
        poradie_menu: Math.max(1, Number(upravovana.poradie_menu) || 10),
        meta_title: upravovana.meta_title?.trim() || null,
        meta_description: upravovana.meta_description?.trim() || null,
      };

      if (jeNova) {
        await strankyApi.vytvor(naUlozenie);
        uspech(tr('Stránka bola vytvorená'));
      } else {
        await strankyApi.uprav(upravovana.id!, naUlozenie);
        uspech(tr('Zmeny boli uložené'));
      }
      setUpravovana(null);
      stranky.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Stránku sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await strankyApi.zmaz(naZmazanie.id);
      uspech(tr('Stránka bola zmazaná'));
      setNaZmazanie(null);
      stranky.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Stránku sa nepodarilo zmazať'));
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Stranka>[] = [
    {
      kluc: 'nazov',
      popis: tr('Stránka'),
      obsah: (s) => <strong>{s.nazov}</strong>,
      hodnotaNaZoradenie: (s) => s.nazov,
    },
    {
      kluc: 'slug',
      popis: tr('Adresa'),
      obsah: (s) => <code className="cw-kat__slug">/{s.slug}</code>,
      sirka: '190px',
      skryTNaMobile: true,
    },
    {
      kluc: 'menu',
      popis: 'V menu',
      obsah: (s) =>
        s.v_menu ? (
          <Badge ton="primary">{s.poradie_menu ?? '—'}{tr('. pozícia')}</Badge>
        ) : (
          <span style={{ color: 'var(--muted)' }}>{tr('nie')}</span>
        ),
      hodnotaNaZoradenie: (s) => (s.v_menu ? s.poradie_menu ?? 999 : 9999),
      sirka: '140px',
    },
    {
      kluc: 'stav',
      popis: tr('Stav'),
      obsah: (s) =>
        s.publikovany ? <Badge ton="success">{tr('Publikovaná')}</Badge> : <Badge>{tr('Koncept')}</Badge>,
      hodnotaNaZoradenie: (s) => (s.publikovany ? 1 : 0),
      sirka: '130px',
    },
    {
      kluc: 'datum',
      popis: tr('Vytvorená'),
      obsah: (s) => <span style={{ color: 'var(--muted)' }}>{formatujDatum(s.vytvoreny)}</span>,
      hodnotaNaZoradenie: (s) => new Date(s.vytvoreny).getTime(),
      sirka: '130px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<Stranka>[] = [
    { popis: tr('Upraviť'), ikona: 'upravit', onKlik: otvor },
    { popis: tr('Náhľad'), ikona: 'oko', onKlik: otvorNahlad },
    {
      popis: tr('Zobraziť na webe'),
      ikona: 'live',
      zobrazit: (s) => s.publikovany,
      onKlik: (s) => window.open(`/${s.slug}`, '_blank', 'noopener'),
    },
    { popis: tr('Zmazať'), ikona: 'zmazat', nebezpecna: true, onKlik: (s) => setNaZmazanie(s) },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Stránky')}
        podnadpis={tr('Statické stránky webu ako O klube, História alebo Kontakt.')}
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={novaStranka}>
            {tr('Nová stránka')}
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
        hladatPlaceholder={tr('Hľadať stránku…')}
        filtre={[
          {
            kluc: 'stav',
            popis: tr('Všetky stavy'),
            moznosti: [
              { hodnota: 'publikovana', popis: tr('Publikované') },
              { hodnota: 'koncept', popis: tr('Koncepty') },
            ],
          },
        ]}
        filtrujZaznam={(s, kluc, hodnota) =>
          kluc === 'stav' ? (hodnota === 'publikovana' ? s.publikovany : !s.publikovany) : true
        }
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={otvor}
        prazdnyNadpis={tr('Zatiaľ žiadne stránky')}
        prazdnyPopis={tr('Vytvorte stránky ako O klube, História alebo Kontakt.')}
        prazdnaAkcia={<Button onClick={novaStranka}>{tr('Vytvoriť stránku')}</Button>}
      />

      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={jeNova ? tr('Nová stránka') : upravovana?.nazov ?? tr('Stránka')}
        sirka="lg"
        pata={
          <>
            {!jeNova && upravovana?.slug && (
              <Button
                variant="ghost"
                ikona={<Icon nazov="oko" velkost={15} />}
                onClick={() => otvorNahlad(upravovana)}
                disabled={uklada}
              >
                {tr('Náhľad')}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNova ? tr('Vytvoriť') : tr('Uložiť')}
            </Button>
          </>
        }
      >
        {upravovana && (
          <>
            <Input
              menovka={tr('Názov stránky')}
              value={upravovana.nazov ?? ''}
              onChange={(e) => zmenNazov(e.target.value)}
              placeholder="O klube"
              povinne
            />

            <Input
              menovka={tr('Adresa stránky')}
              value={upravovana.slug ?? ''}
              onChange={(e) => {
                adresaUpravena.current = true;
                setUpravovana((d) => ({ ...d!, slug: e.target.value }));
              }}
              onBlur={(e) => setUpravovana((d) => ({ ...d!, slug: naAdresu(e.target.value) }))}
              placeholder="o-klube"
              napoveda={tr('Na webe: /{adresa} · prázdne = odvodí sa z názvu', { adresa: naAdresu(upravovana.slug ?? '') || '…' })}
            />

            <div className="cw-field">
              <span className="cw-field__label">{tr('Obsah')}</span>
              <Editor
                hodnota={upravovana.obsah ?? ''}
                onZmena={(html) => setUpravovana((d) => ({ ...d!, obsah: html }))}
                placeholder={tr('Text stránky…')}
              />
            </div>

            <div className="cw-stranka__prepinace">
            <div className="cw-kat__row">
              <Switch
                zapnute={Boolean(upravovana.v_menu)}
                onZmena={(v) => setUpravovana((d) => ({ ...d!, v_menu: v }))}
                menovka={tr('Zobraziť v menu')}
                popis={tr('Stránka sa objaví v hlavnej navigácii')}
              />

              {upravovana.v_menu && (
                <Input
                  menovka={tr('Poradie v menu')}
                  type="number"
                  min={1}
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
              menovka={tr('Publikovaná')}
              popis={tr('Nepublikovanú stránku návštevníci nevidia')}
            />
            </div>

            <Input
              menovka={tr('Titulok pre vyhľadávače')}
              value={upravovana.meta_title ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, meta_title: e.target.value }))}
              placeholder={upravovana.nazov || tr('Ak nevyplníte, použije sa názov')}
              maxLength={70}
              napoveda={tr('Prázdne = doplní sa automaticky z názvu')}
            />

            <Textarea
              menovka={tr('Popis pre vyhľadávače')}
              value={upravovana.meta_description ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, meta_description: e.target.value }))}
              rows={2}
              maxLength={160}
              placeholder={tr('Ak nevyplníte, použije sa začiatok textu stránky')}
              napoveda={tr('{pocet} / 160 znakov · prázdne = doplní sa automaticky', { pocet: (upravovana.meta_description ?? '').length })}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Zmazať stránku?')}
        sprava={tr('Stránka {nazov} bude odstránená aj z menu webu.', { nazov: naZmazanie?.nazov })}
        potvrdit={tr('Zmazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Stranky;
