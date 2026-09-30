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
import type { Fanusik, StavFanusika, TypClenstva } from '../../api/typy';
import { tr } from '../../i18n';
import './Hraci.css';
import './Fanusikovia.css';

const TYPY: Array<{ hodnota: TypClenstva; popis: string; ton: TonStitka }> = [
  { hodnota: 'fanusik', popis: tr('Fanúšik'), ton: 'neutral' },
  { hodnota: 'clen', popis: tr('Člen klubu'), ton: 'primary' },
  { hodnota: 'vip', popis: 'VIP', ton: 'warning' },
  { hodnota: 'cestny', popis: tr('Čestný člen'), ton: 'success' },
];

const STAVY: Array<{ hodnota: StavFanusika; popis: string; ton: TonStitka }> = [
  { hodnota: 'aktivny', popis: tr('Aktívny'), ton: 'success' },
  { hodnota: 'ziadost', popis: tr('Čaká na schválenie'), ton: 'warning' },
  { hodnota: 'zamietnuty', popis: tr('Zamietnutý'), ton: 'danger' },
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
  stav: 'aktivny',
  datum_narodenia: null,
  adresa: '',
};

/** Filter „Nové žiadosti" - registrácie z webu, ktoré čakajú na schválenie */
const FILTER_ZIADOSTI = 'ziadosti';

export const Fanusikovia: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<Fanusik> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Fanusik | null>(null);
  const [filterTypu, setFilterTypu] = useState('');
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);
  const [meniStav, setMeniStav] = useState<number | null>(null);

  const fanusikovia = useNacitanie((signal) => fanusikoviaApi.vypis(signal));
  const zoznam = fanusikovia.data ?? [];
  const ziadosti = zoznam.filter((f) => f.stav === 'ziadost');

  const chipy: Chip[] = useMemo(
    () => [
      { hodnota: '', popis: tr('Všetci'), pocet: zoznam.length },
      ...(ziadosti.length > 0 || filterTypu === FILTER_ZIADOSTI ? [{ hodnota: FILTER_ZIADOSTI, popis: tr('Nové žiadosti'), pocet: ziadosti.length }] : []),
      ...TYPY.map((t) => ({
        hodnota: t.hodnota,
        popis: t.popis,
        pocet: zoznam.filter((f) => f.typ_clenstva === t.hodnota).length,
      })),
    ],
    [zoznam, ziadosti.length, filterTypu]
  );

  const zobrazeni = useMemo(
    () =>
      filterTypu === FILTER_ZIADOSTI
        ? zoznam.filter((f) => f.stav === 'ziadost')
        : filterTypu
          ? zoznam.filter((f) => f.typ_clenstva === filterTypu)
          : zoznam,
    [zoznam, filterTypu]
  );

  // Schválenie alebo zamietnutie registrácie z webu
  const zmenStav = async (f: Fanusik, stav: StavFanusika) => {
    setMeniStav(f.id);
    try {
      await fanusikoviaApi.uprav(f.id, {
        stav,
        ...(stav === 'aktivny' && !f.clenstvo_od ? { clenstvo_od: new Date().toISOString().slice(0, 10) } : {}),
      });
      uspech(stav === 'aktivny' ? tr('Žiadosť bola schválená') : tr('Žiadosť bola zamietnutá'));
      setUpravovany((d) => (d?.id === f.id ? null : d));
      fanusikovia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Záznam sa nepodarilo uložiť'));
    } finally {
      setMeniStav(null);
    }
  };

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.meno?.trim() || !upravovany.priezvisko?.trim()) {
      varovanie(tr('Zadajte meno aj priezvisko'));
      return;
    }
    if (!upravovany.email?.trim() || !upravovany.email.includes('@')) {
      varovanie(tr('Zadajte platnú e-mailovú adresu'));
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovany,
        email: upravovany.email.trim().toLowerCase(),
        telefon: upravovany.telefon?.trim() || null,
        adresa: upravovany.adresa?.trim() || null,
        cislo_karty: upravovany.cislo_karty?.trim() || null,
        poznamka: upravovany.poznamka?.trim() || null,
      };

      if (jeNovy) {
        await fanusikoviaApi.vytvor(naUlozenie);
        uspech(tr('Fanúšik bol pridaný'));
      } else {
        await fanusikoviaApi.uprav(upravovany.id!, naUlozenie);
        uspech(tr('Zmeny boli uložené'));
      }
      setUpravovany(null);
      fanusikovia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Záznam sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await fanusikoviaApi.zmaz(naZmazanie.id);
      uspech(tr('Záznam bol odstránený'));
      setNaZmazanie(null);
      fanusikovia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Záznam sa nepodarilo odstrániť'));
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Fanusik>[] = [
    {
      kluc: 'osoba',
      popis: tr('Meno'),
      obsah: (f) => (
        <div className="cw-hraci__hrac">
          <div className="cw-hraci__avatar" aria-hidden="true">
            <span>{(f.meno[0] + f.priezvisko[0]).toUpperCase()}</span>
          </div>
          <div className="cw-hraci__meno">
            <span className="cw-hraci__meno-text">
              {f.meno} {f.priezvisko}
            </span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}>
              {f.email}
              {f.zdroj === 'web' && ` · ${tr('registrácia z webu')}`}
            </span>
          </div>
        </div>
      ),
      hodnotaNaZoradenie: (f) => `${f.priezvisko} ${f.meno}`,
    },
    {
      kluc: 'typ',
      popis: tr('Členstvo'),
      obsah: (f) => {
        const t = TYPY.find((x) => x.hodnota === f.typ_clenstva);
        return <Badge ton={t?.ton ?? 'neutral'}>{t?.popis ?? f.typ_clenstva}</Badge>;
      },
      hodnotaNaZoradenie: (f) => f.typ_clenstva,
      sirka: '150px',
    },
    {
      kluc: 'stav',
      popis: tr('Stav'),
      obsah: (f) => {
        const s = STAVY.find((x) => x.hodnota === f.stav) ?? STAVY[0];
        if (f.stav !== 'ziadost') return <Badge ton={s.ton}>{s.popis}</Badge>;
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Button velkost="sm" onClick={() => zmenStav(f, 'aktivny')} nacitava={meniStav === f.id}>
              {tr('Schváliť')}
            </Button>
            <Button velkost="sm" variant="ghost" onClick={() => zmenStav(f, 'zamietnuty')} disabled={meniStav === f.id}>
              {tr('Zamietnuť')}
            </Button>
          </div>
        );
      },
      hodnotaNaZoradenie: (f) => (f.stav === 'ziadost' ? 0 : f.stav === 'aktivny' ? 1 : 2),
      sirka: '230px',
    },
    {
      kluc: 'karta',
      popis: tr('Číslo karty'),
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
      popis: tr('Členstvo do'),
      obsah: (f) => {
        if (!f.clenstvo_do) return <span style={{ color: 'var(--muted)' }}>{tr('neobmedzene')}</span>;
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
      popis: tr('Oznamy'),
      obsah: (f) =>
        f.suhlas_oznamy ? (
          <Badge ton="success">{tr('Súhlas')}</Badge>
        ) : (
          <span style={{ color: 'var(--muted)' }}>{tr('nie')}</span>
        ),
      hodnotaNaZoradenie: (f) => (f.suhlas_oznamy ? 1 : 0),
      zarovnanie: 'center',
      sirka: '120px',
    },
  ];

  const akcieRiadku: AkciaRiadku<Fanusik>[] = [
    { popis: tr('Upraviť'), ikona: 'upravit', onKlik: (f) => setUpravovany({ ...f }) },
    { popis: tr('Schváliť'), ikona: 'gdpr', onKlik: (f) => zmenStav(f, 'aktivny'), zobrazit: (f) => f.stav !== 'aktivny' },
    { popis: tr('Odstrániť'), ikona: 'zmazat', nebezpecna: true, onKlik: (f) => setNaZmazanie(f) },
  ];

  // Koľko ľudí súhlasilo so zasielaním oznamov — podklad pre rozposielanie
  const soSuhlasom = zoznam.filter((f) => f.suhlas_oznamy).length;

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Fanúšikovia')}
        podnadpis={
          ziadosti.length > 0
            ? tr('Registrovaní priaznivci klubu · {soSuhlasom} so súhlasom na zasielanie oznamov · nové žiadosti z webu: {pocet}.', { soSuhlasom, pocet: ziadosti.length })
            : tr('Registrovaní priaznivci klubu · {soSuhlasom} so súhlasom na zasielanie oznamov.', { soSuhlasom })
        }
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
            {tr('Pridať fanúšika')}
          </Button>
        }
      />

      <FilterChips
        moznosti={chipy}
        zvolena={filterTypu}
        onZmena={setFilterTypu}
        popisSkupiny={tr('Filtrovať podľa typu členstva')}
      />

      <DataTable<Fanusik>
        data={zobrazeni}
        idZaznamu={(f) => f.id}
        stlpce={stlpce}
        nacitava={fanusikovia.nacitava}
        chyba={fanusikovia.chyba}
        onSkusZnova={fanusikovia.obnov}
        hladatV={(f) => `${f.meno} ${f.priezvisko} ${f.email} ${f.cislo_karty ?? ''}`}
        hladatPlaceholder={tr('Hľadať podľa mena, e-mailu alebo čísla karty…')}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(f) => setUpravovany({ ...f })}
        prazdnyNadpis={tr('Zatiaľ žiadni fanúšikovia')}
        prazdnyPopis={tr('Evidujte členov klubu a priaznivcov, ktorým chcete posielať oznamy.')}
        prazdnaAkcia={<Button onClick={() => setUpravovany({ ...PRAZDNY })}>{tr('Pridať prvého')}</Button>}
      />

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? tr('Nový fanúšik') : `${upravovany?.meno} ${upravovany?.priezvisko}`}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? tr('Pridať') : tr('Uložiť')}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            {upravovany.stav === 'ziadost' && (
              <div className="cw-fanusik__ziadost">
                <strong>{tr('Registrácia z webu čaká na schválenie')}</strong>
                <span>{tr('Prijatá {datum}', { datum: formatujDatum(upravovany.vytvoreny!) })}</span>
                {upravovany.sprava && <blockquote>{upravovany.sprava}</blockquote>}
                <div className="cw-fanusik__ziadost-akcie">
                  <Button velkost="sm" onClick={() => zmenStav(upravovany as Fanusik, 'aktivny')} nacitava={meniStav === upravovany.id}>
                    {tr('Schváliť')}
                  </Button>
                  <Button velkost="sm" variant="secondary" onClick={() => zmenStav(upravovany as Fanusik, 'zamietnuty')} disabled={meniStav === upravovany.id}>
                    {tr('Zamietnuť')}
                  </Button>
                </div>
              </div>
            )}
            {upravovany.stav !== 'ziadost' && upravovany.sprava && (
              <div className="cw-fanusik__ziadost">
                <strong>{tr('Správa z registrácie')}</strong>
                <blockquote>{upravovany.sprava}</blockquote>
              </div>
            )}
            <div className="cw-hraci__row">
              <Input
                menovka={tr('Meno')}
                value={upravovany.meno ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, meno: e.target.value }))}
                povinne
              />
              <Input
                menovka={tr('Priezvisko')}
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
                menovka={tr('Telefón')}
                value={upravovany.telefon ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, telefon: e.target.value }))}
              />
            </div>

            <div className="cw-hraci__row">
              <Select
                menovka={tr('Typ členstva')}
                value={upravovany.typ_clenstva ?? 'fanusik'}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, typ_clenstva: e.target.value as TypClenstva }))
                }
                moznosti={TYPY.map((t) => ({ hodnota: t.hodnota, popis: t.popis }))}
              />
              <Input
                menovka={tr('Číslo karty')}
                value={upravovany.cislo_karty ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, cislo_karty: e.target.value }))}
                placeholder={tr('Napríklad: 2026-0042')}
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka={tr('Členstvo od')}
                type="date"
                value={upravovany.clenstvo_od?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, clenstvo_od: e.target.value || null }))}
              />
              <Input
                menovka={tr('Členstvo do')}
                type="date"
                value={upravovany.clenstvo_do?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, clenstvo_do: e.target.value || null }))}
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka={tr('Dátum narodenia')}
                type="date"
                value={upravovany.datum_narodenia?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, datum_narodenia: e.target.value || null }))}
              />
              <Select
                menovka={tr('Stav')}
                value={upravovany.stav ?? 'aktivny'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, stav: e.target.value as StavFanusika }))}
                moznosti={STAVY.map((s) => ({ hodnota: s.hodnota, popis: s.popis }))}
              />
            </div>

            <Input
              menovka={tr('Adresa')}
              value={upravovany.adresa ?? ''}
              maxLength={255}
              onChange={(e) => setUpravovany((d) => ({ ...d!, adresa: e.target.value }))}
            />

            <Textarea
              menovka={tr('Poznámka')}
              value={upravovany.poznamka ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, poznamka: e.target.value }))}
              rows={2}
            />

            <Switch
              zapnute={Boolean(upravovany.suhlas_oznamy)}
              onZmena={(v) => setUpravovany((d) => ({ ...d!, suhlas_oznamy: v }))}
              menovka={tr('Súhlas so zasielaním oznamov')}
              popis={tr('Bez súhlasu nesmiete posielať klubové novinky — súhlas sa dá kedykoľvek odvolať')}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Odstrániť záznam?')}
        sprava={tr('{meno} {priezvisko} bude odstránený z evidencie fanúšikov.', { meno: naZmazanie?.meno, priezvisko: naZmazanie?.priezvisko })}
        potvrdit={tr('Odstrániť')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Fanusikovia;
