// Umiestnenie: frontend/src/pages/admin/Presmerovania.tsx
// Presmerovanie odkazov: starý odkaz -> nový odkaz.
//
// Pri zmene adresy stránky alebo prechode zo starého webu pošle
// návštevníka (aj vyhľadávač) zo starej adresy na novú.

import React, { useState } from 'react';
import {
  Button, Badge, Icon, Modal, Input, Select, Switch, DataTable, ConfirmDialog, useToast,
  type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { presmerovaniaApi } from '../../api/menu';
import { formatujDatumCas } from '../../utils/datum';
import type { PresmerovanieOdkazu } from '../../api/typy';
import { tr } from '../../i18n';

const KODY = [
  { hodnota: 301, popis: tr('Trvalé (301) - stará adresa už neplatí') },
  { hodnota: 302, popis: tr('Dočasné (302) - stará adresa sa vráti') },
];

const PRAZDNE: Partial<PresmerovanieOdkazu> = { stary_odkaz: '', novy_odkaz: '', kod: 301, poznamka: '', aktivity: true };

/** Zo zadaného odkazu (aj celej adresy starého webu) spraví cestu. */
const naCestu = (odkaz: string): string => {
  const t = odkaz.trim();
  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      // Adresa tohto webu -> len cesta; cudzí web necháme celý
      if (u.host === window.location.host) return u.pathname + u.search;
    }
  } catch {
    /* necháme ako je */
  }
  return t;
};

export const Presmerovania: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const zoznam = useNacitanie((signal) => presmerovaniaApi.vypis(signal));
  const [upravovane, setUpravovane] = useState<Partial<PresmerovanieOdkazu> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<PresmerovanieOdkazu | null>(null);
  const [uklada, setUklada] = useState(false);

  const uloz = async () => {
    if (!upravovane) return;
    const stary = naCestu(upravovane.stary_odkaz ?? '');
    const novy = naCestu(upravovane.novy_odkaz ?? '');
    if (!stary.startsWith('/')) return varovanie(tr('Starý odkaz musí byť adresa na tomto webe, napríklad /stary-clanok'));
    if (!novy) return varovanie(tr('Zadajte nový odkaz'));
    setUklada(true);
    try {
      const telo = { ...upravovane, stary_odkaz: stary, novy_odkaz: novy, poznamka: upravovane.poznamka?.trim() || null };
      if (upravovane.id) {
        await presmerovaniaApi.uprav(upravovane.id, telo);
        uspech(tr('Presmerovanie bolo uložené'));
      } else {
        await presmerovaniaApi.vytvor(telo);
        uspech(tr('Presmerovanie bolo vytvorené'));
      }
      setUpravovane(null);
      zoznam.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Presmerovanie sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    try {
      await presmerovaniaApi.zmaz(naZmazanie.id);
      uspech(tr('Presmerovanie bolo zmazané'));
      setNaZmazanie(null);
      zoznam.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Presmerovanie sa nepodarilo zmazať'));
    }
  };

  const stlpce: Stlpec<PresmerovanieOdkazu>[] = [
    {
      kluc: 'odkazy',
      popis: tr('Starý odkaz → nový odkaz'),
      obsah: (p) => (
        <div className="cw-presm__odkazy">
          <code>{p.stary_odkaz}</code>
          <Icon nazov="sipkaVpravo" velkost={14} />
          <code>{p.novy_odkaz}</code>
          {p.poznamka && <span>{p.poznamka}</span>}
        </div>
      ),
      hodnotaNaZoradenie: (p) => p.stary_odkaz,
    },
    {
      kluc: 'kod',
      popis: tr('Typ'),
      obsah: (p) => (p.aktivity ? <Badge ton={p.kod === 301 || p.kod === 308 ? 'primary' : 'info'}>{p.kod === 301 || p.kod === 308 ? tr('Trvalé') : tr('Dočasné')}</Badge> : <Badge>{tr('Vypnuté')}</Badge>),
      sirka: '120px',
    },
    {
      kluc: 'pouzitia',
      popis: tr('Použité'),
      obsah: (p) => (
        <span className="cw-presm__pouzitie">
          {p.pocet_pouziti}×{p.posledne_pouzite ? <small> {tr('naposledy')} {formatujDatumCas(p.posledne_pouzite)}</small> : null}
        </span>
      ),
      hodnotaNaZoradenie: (p) => p.pocet_pouziti,
      sirka: '220px',
      skryTNaMobile: true,
    },
  ];

  const akcie: AkciaRiadku<PresmerovanieOdkazu>[] = [
    { popis: tr('Upraviť'), ikona: 'upravit', onKlik: (p) => setUpravovane({ ...p }) },
    { popis: tr('Vyskúšať'), ikona: 'oko', onKlik: (p) => window.open(p.stary_odkaz, '_blank', 'noopener') },
    { popis: tr('Zmazať'), ikona: 'zmazat', nebezpecna: true, onKlik: (p) => setNaZmazanie(p) },
  ];

  return (
    <>
      <div className="cw-presm__lista">
        <p>
          {tr('Keď sa zmení adresa stránky alebo článku, alebo prechádzate zo starého webu, návštevník aj vyhľadávač zo starej adresy prejde na novú. Starý odkaz môžete vložiť aj ako celú adresu.')}
        </p>
        <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setUpravovane({ ...PRAZDNE })}>
          {tr('Nové presmerovanie')}
        </Button>
      </div>

      <DataTable<PresmerovanieOdkazu>
        data={zoznam.data ?? []}
        idZaznamu={(p) => p.id}
        stlpce={stlpce}
        nacitava={zoznam.nacitava}
        chyba={zoznam.chyba}
        onSkusZnova={zoznam.obnov}
        hladatV={(p) => `${p.stary_odkaz} ${p.novy_odkaz} ${p.poznamka ?? ''}`}
        hladatPlaceholder={tr('Hľadať odkaz…')}
        akcieRiadku={akcie}
        onKlikNaRiadok={(p) => setUpravovane({ ...p })}
        prazdnyNadpis={tr('Zatiaľ žiadne presmerovania')}
        prazdnyPopis={tr('Pridajte napríklad /stary-web/kontakt → /kontakt.')}
      />

      <Modal
        otvorene={upravovane !== null}
        onZavri={() => setUpravovane(null)}
        nadpis={upravovane?.id ? tr('Upraviť presmerovanie') : tr('Nové presmerovanie')}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovane(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {upravovane?.id ? tr('Uložiť') : tr('Vytvoriť')}
            </Button>
          </>
        }
      >
        {upravovane && (
          <>
            <Input
              menovka={tr('Starý odkaz')}
              value={upravovane.stary_odkaz ?? ''}
              onChange={(e) => setUpravovane({ ...upravovane, stary_odkaz: e.target.value })}
              placeholder="/stary-clanok"
              napoveda={tr('Adresa, ktorá už neexistuje (na tomto webe)')}
              povinne
            />
            <Input
              menovka={tr('Nový odkaz')}
              value={upravovane.novy_odkaz ?? ''}
              onChange={(e) => setUpravovane({ ...upravovane, novy_odkaz: e.target.value })}
              placeholder="/clanek/novy-clanok alebo https://…"
              povinne
            />
            <Select
              menovka={tr('Typ presmerovania')}
              value={upravovane.kod === 302 || upravovane.kod === 307 ? 302 : 301}
              onChange={(e) => setUpravovane({ ...upravovane, kod: Number(e.target.value) })}
              moznosti={KODY}
            />
            <Input
              menovka={tr('Poznámka')}
              value={upravovane.poznamka ?? ''}
              onChange={(e) => setUpravovane({ ...upravovane, poznamka: e.target.value })}
              placeholder={tr('Napríklad: prechod zo starého webu')}
            />
            <Switch
              zapnute={upravovane.aktivity !== false}
              onZmena={(v) => setUpravovane({ ...upravovane, aktivity: v })}
              menovka={tr('Aktívne')}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Zmazať presmerovanie?')}
        sprava={tr('Adresa {hodnota} prestane presmerovávať.', { hodnota: naZmazanie?.stary_odkaz ?? '' })}
        potvrdit={tr('Zmazať')}
        nebezpecne
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </>
  );
};

export default Presmerovania;
