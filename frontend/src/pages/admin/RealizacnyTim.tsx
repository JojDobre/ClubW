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
import { sezonyApi } from '../../api/sprava';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import type { ClenRealizacnehoTimu, Tim } from '../../api/typy';
import { tr } from '../../i18n';

/**
 * Funkcie ukladáme čitateľne (rovnako ich pozná backend aj verejný web).
 * Staršie záznamy s kódom (hlavny_trener) sa zobrazia cez STARE_KODY.
 */
const FUNKCIE = [
  'hlavný tréner', 'asistent trénera', 'tréner brankárov', 'kondičný tréner',
  'vedúci mužstva', 'fyzioterapeut', 'lekár', 'masér', 'manažér', 'sekretár',
  'skaut', 'mentálny kouč', 'funkcionár', 'ostatné',
].map((f) => ({ hodnota: f, popis: tr(f.charAt(0).toUpperCase() + f.slice(1)) }));

const STARE_KODY: Record<string, string> = {
  hlavny_trener: 'hlavný tréner',
  asistent: 'asistent trénera',
  trener_brankarov: 'tréner brankárov',
  kondicny_trener: 'kondičný tréner',
  veduci_muzstva: 'vedúci mužstva',
  'masér': 'masér',
  lekar: 'lekár',
  funkcionar: 'funkcionár',
};

/** Normalizovaná funkcia - starý kód prevedie na text. */
const funkciaText = (f: string | null | undefined): string => (f ? STARE_KODY[f] ?? f : '');
const funkciaPopis = (f: string | null | undefined): string => {
  const text = funkciaText(f);
  return text ? tr(text.charAt(0).toUpperCase() + text.slice(1)) : '';
};

/** Člen vo formulári - dátumy ako text pre pole typu date. */
type FormularClena = Partial<ClenRealizacnehoTimu>;

const PRAZDNY: FormularClena = {
  meno: '',
  priezvisko: '',
  funkcia: 'hlavný tréner',
  tim_id: null,
  email: '',
  telefon: '',
  fotka: null,
  datum_narodenia: '',
  narodnost: '',
  datum_pripojenia: '',
  datum_odpojenia: '',
  sezona_id: null,
  poradie: 0,
};

export const RealizacnyTim: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<FormularClena | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<ClenRealizacnehoTimu | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const clenovia = useNacitanie((signal) => realizacnyTimApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const sezony = useNacitanie((signal) => sezonyApi.vypis(signal));

  const zoznam = clenovia.data ?? [];
  const zoznamTimov = timy.data ?? [];

  const timPodlaId = useMemo(() => {
    const mapa = new Map<number, Tim>();
    zoznamTimov.forEach((t) => mapa.set(t.id, t));
    return mapa;
  }, [zoznamTimov]);

  const jeNovy = upravovany !== null && !upravovany.id;

  const otvor = (c: FormularClena) =>
    setUpravovany({
      ...c,
      funkcia: funkciaText(c.funkcia) || 'hlavný tréner',
      datum_narodenia: c.datum_narodenia?.slice(0, 10) ?? '',
      datum_pripojenia: c.datum_pripojenia?.slice(0, 10) ?? '',
      datum_odpojenia: c.datum_odpojenia?.slice(0, 10) ?? '',
    });

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.meno?.trim() || !upravovany.priezvisko?.trim()) {
      varovanie(tr('Zadajte meno aj priezvisko'));
      return;
    }

    if (
      upravovany.datum_pripojenia && upravovany.datum_odpojenia &&
      upravovany.datum_odpojenia < upravovany.datum_pripojenia
    ) {
      varovanie(tr('Dátum odchodu nemôže byť skôr než dátum príchodu'));
      return;
    }

    setUklada(true);
    try {
      // Len polia formulára, prázdne ako null
      const naUlozenie: FormularClena = {
        meno: upravovany.meno.trim(),
        priezvisko: upravovany.priezvisko.trim(),
        funkcia: funkciaText(upravovany.funkcia) || 'ostatné',
        tim_id: upravovany.tim_id ?? null,
        email: upravovany.email?.trim() || null,
        telefon: upravovany.telefon?.trim() || null,
        fotka: upravovany.fotka || null,
        datum_narodenia: upravovany.datum_narodenia || null,
        narodnost: upravovany.narodnost?.trim() || null,
        datum_pripojenia: upravovany.datum_pripojenia || null,
        datum_odpojenia: upravovany.datum_odpojenia || null,
        sezona_id: upravovany.sezona_id ?? null,
      };

      if (jeNovy) {
        await realizacnyTimApi.vytvor(naUlozenie);
        uspech(tr('Člen realizačného tímu bol pridaný'));
      } else {
        await realizacnyTimApi.uprav(upravovany.id!, naUlozenie);
        uspech(tr('Zmeny boli uložené'));
      }
      setUpravovany(null);
      clenovia.obnov();
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
      await realizacnyTimApi.zmaz(naZmazanie.id);
      uspech(tr('Člen bol presunutý do archívu'));
      setNaZmazanie(null);
      clenovia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Záznam sa nepodarilo zmazať'));
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<ClenRealizacnehoTimu>[] = [
    {
      kluc: 'osoba',
      popis: tr('Meno'),
      obsah: (c) => (
        <div className="cw-hraci__hrac">
          <div className="cw-hraci__avatar" aria-hidden="true">
            {c.fotka ? (
              <img src={souborUrl(c.fotka)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
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
      popis: tr('Funkcia'),
      obsah: (c) => (
        <Badge ton="primary">
          {funkciaPopis(c.funkcia)}
        </Badge>
      ),
      hodnotaNaZoradenie: (c) => c.funkcia,
      sirka: '190px',
    },
    {
      kluc: 'tim',
      popis: tr('Tím'),
      obsah: (c) => {
        const t = c.tim_id !== null ? timPodlaId.get(c.tim_id) : undefined;
        return t ? t.nazov : <span style={{ color: 'var(--muted)' }}>{tr('celý klub')}</span>;
      },
      hodnotaNaZoradenie: (c) => (c.tim_id !== null ? timPodlaId.get(c.tim_id)?.nazov ?? null : null),
      sirka: '170px',
    },
    {
      kluc: 'kontakt',
      popis: tr('Kontakt'),
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
    { popis: tr('Upraviť'), ikona: 'upravit', onKlik: (c) => otvor(c) },
    { popis: tr('Archivovať'), ikona: 'archiv', nebezpecna: true, onKlik: (c) => setNaZmazanie(c) },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Realizačný tím')}
        podnadpis={tr('Tréneri, asistenti a ďalší členovia klubu.')}
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => otvor(PRAZDNY)}>
            {tr('Pridať člena')}
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
        hladatPlaceholder={tr('Hľadať podľa mena alebo funkcie…')}
        filtre={[
          { kluc: 'funkcia', popis: tr('Všetky funkcie'), moznosti: FUNKCIE },
          {
            kluc: 'tim',
            popis: tr('Všetky tímy'),
            moznosti: zoznamTimov.map((t) => ({ hodnota: String(t.id), popis: t.nazov })),
          },
        ]}
        filtrujZaznam={(c, kluc, hodnota) => {
          if (kluc === 'funkcia') return funkciaText(c.funkcia) === hodnota;
          if (kluc === 'tim') return String(c.tim_id ?? '') === hodnota;
          return true;
        }}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(c) => otvor(c)}
        prazdnyNadpis={tr('Zatiaľ žiadni členovia')}
        prazdnyPopis={tr('Pridajte trénerov a ďalších členov realizačného tímu.')}
        prazdnaAkcia={<Button onClick={() => otvor(PRAZDNY)}>{tr('Pridať prvého člena')}</Button>}
      />

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? tr('Nový člen realizačného tímu') : `${upravovany?.meno} ${upravovany?.priezvisko}`}
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
              <Select
                menovka={tr('Funkcia')}
                value={funkciaText(upravovany.funkcia) || 'hlavný tréner'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, funkcia: e.target.value }))}
                moznosti={FUNKCIE}
              />
              <Select
                menovka={tr('Tím')}
                value={upravovany.tim_id ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, tim_id: e.target.value ? Number(e.target.value) : null }))
                }
                prazdna={tr('Celý klub')}
                moznosti={zoznamTimov.map((t) => ({
                  hodnota: t.id,
                  popis: `${t.nazov} (${t.vekova_kategoria})`,
                }))}
                napoveda={tr('Zmenou tímu člena presuniete k inému mužstvu')}
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka={tr('Dátum narodenia')}
                type="date"
                value={upravovany.datum_narodenia?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, datum_narodenia: e.target.value }))}
              />
              <Input
                menovka={tr('Národnosť')}
                value={upravovany.narodnost ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, narodnost: e.target.value }))}
                placeholder={tr('Slovensko')}
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka={tr('V klube od')}
                type="date"
                value={upravovany.datum_pripojenia?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, datum_pripojenia: e.target.value }))}
              />
              <Input
                menovka={tr('Odchod z klubu')}
                type="date"
                value={upravovany.datum_odpojenia?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, datum_odpojenia: e.target.value }))}
              />
            </div>

            <Select
              menovka={tr('Sezóna')}
              value={upravovany.sezona_id ?? ''}
              onChange={(e) =>
                setUpravovany((d) => ({ ...d!, sezona_id: e.target.value ? Number(e.target.value) : null }))
              }
              prazdna={tr('Bez sezóny')}
              moznosti={(sezony.data ?? []).map((se) => ({
                hodnota: se.id,
                popis: `${se.nazov}${se.aktualna ? tr(' (aktuálna)') : ''}`,
              }))}
            />

            <div className="cw-hraci__row">
              <Input
                menovka="E-mail"
                type="email"
                value={upravovany.email ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, email: e.target.value }))}
              />
              <Input
                menovka={tr('Telefón')}
                value={upravovany.telefon ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, telefon: e.target.value }))}
              />
            </div>

            <PoleObrazka
              menovka={tr('Fotka')}
              tvar="kruh"
              hodnota={upravovany.fotka}
              onZmena={(cesta) => setUpravovany((d) => ({ ...d!, fotka: cesta }))}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Archivovať člena?')}
        sprava={tr('{meno} {priezvisko} sa presunie do archívu, odkiaľ ho môžete obnoviť.', { meno: naZmazanie?.meno, priezvisko: naZmazanie?.priezvisko })}
        potvrdit={tr('Archivovať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default RealizacnyTim;
