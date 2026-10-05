// Umiestnenie: frontend/src/pages/admin/VyhodyFanusikov.tsx
// Výhody pre členov klubu - zľavy u partnerov, kódy do fanshopu,
// prednostný predaj... Prihlásený fanúšik ich vidí na webe v sekcii
// Môj klub, ale len tie pre svoj typ členstva a len pri platnom členstve.

import React, { useMemo, useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, DataTable, Modal, Input, Select, Textarea, Switch,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { sponzoriApi, vyhodyFanusikovApi } from '../../api/klub';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import { formatujDatum } from '../../utils/datum';
import type { TypClenstva, VyhodaFanusika } from '../../api/typy';
import { tr } from '../../i18n';
import './Hraci.css';
import './VyhodyFanusikov.css';

const TYPY: Array<{ hodnota: TypClenstva; popis: string }> = [
  { hodnota: 'fanusik', popis: tr('Fanúšik') },
  { hodnota: 'clen', popis: tr('Člen klubu') },
  { hodnota: 'vip', popis: 'VIP' },
  { hodnota: 'cestny', popis: tr('Čestný člen') },
];

const PRAZDNA: Partial<VyhodaFanusika> = {
  nazov: '',
  popis: '',
  obrazok: null,
  typy_clenstva: [],
  sponzor_id: null,
  kod: '',
  odkaz: '',
  platne_od: null,
  platne_do: null,
  poradie: 0,
  aktivity: true,
};

const dnes = () => new Date().toISOString().slice(0, 10);

/** Beží výhoda práve teraz? (aktívna a v rozsahu dátumov) */
const stavVyhody = (v: VyhodaFanusika): { popis: string; ton: 'success' | 'neutral' | 'warning' } => {
  if (!v.aktivity) return { popis: tr('Skrytá'), ton: 'neutral' };
  if (v.platne_od && v.platne_od.slice(0, 10) > dnes()) return { popis: tr('Pripravená'), ton: 'warning' };
  if (v.platne_do && v.platne_do.slice(0, 10) < dnes()) return { popis: tr('Skončená'), ton: 'neutral' };
  return { popis: tr('Platí'), ton: 'success' };
};

export const VyhodyFanusikov: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const [upravovana, setUpravovana] = useState<Partial<VyhodaFanusika> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<VyhodaFanusika | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const vyhody = useNacitanie((signal) => vyhodyFanusikovApi.vypis(signal));
  const sponzori = useNacitanie((signal) => sponzoriApi.vypis(signal));
  const zoznam = vyhody.data ?? [];
  const moznostiPartnerov = useMemo(
    () => [{ hodnota: '', popis: tr('— bez partnera —') }, ...(sponzori.data ?? []).map((s) => ({ hodnota: String(s.id), popis: s.nazov }))],
    [sponzori.data]
  );

  const jeNova = upravovana !== null && !upravovana.id;
  const zmen = (zmena: Partial<VyhodaFanusika>) => setUpravovana((d) => ({ ...d!, ...zmena }));

  const prepniTyp = (typ: TypClenstva, zapnute: boolean) => {
    const typy = new Set(upravovana?.typy_clenstva ?? []);
    if (zapnute) typy.add(typ);
    else typy.delete(typ);
    zmen({ typy_clenstva: TYPY.map((t) => t.hodnota).filter((t) => typy.has(t)) });
  };

  const uloz = async () => {
    if (!upravovana) return;
    if (!upravovana.nazov?.trim()) {
      varovanie(tr('Zadajte názov výhody'));
      return;
    }
    const odkaz = upravovana.odkaz?.trim() || '';
    if (odkaz && !/^(\/|https?:\/\/)/i.test(odkaz)) {
      varovanie(tr('Odkaz musí začínať / (stránka webu) alebo https://'));
      return;
    }
    if (upravovana.platne_od && upravovana.platne_do && upravovana.platne_od > upravovana.platne_do) {
      varovanie(tr('Dátum „platí do“ musí byť po dátume „platí od“'));
      return;
    }
    setUklada(true);
    try {
      const udaje = {
        ...upravovana,
        nazov: upravovana.nazov.trim(),
        popis: upravovana.popis?.trim() || null,
        kod: upravovana.kod?.trim() || null,
        odkaz: odkaz || null,
      };
      delete (udaje as Partial<VyhodaFanusika>).sponzor;
      if (jeNova) {
        await vyhodyFanusikovApi.vytvor(udaje);
        uspech(tr('Výhoda bola pridaná'));
      } else {
        await vyhodyFanusikovApi.uprav(upravovana.id!, udaje);
        uspech(tr('Zmeny boli uložené'));
      }
      setUpravovana(null);
      vyhody.obnov();
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
      await vyhodyFanusikovApi.zmaz(naZmazanie.id);
      uspech(tr('Záznam bol odstránený'));
      setNaZmazanie(null);
      vyhody.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Záznam sa nepodarilo odstrániť'));
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<VyhodaFanusika>[] = [
    {
      kluc: 'nazov',
      popis: tr('Výhoda'),
      obsah: (v) => {
        const obrazok = v.obrazok || v.sponzor?.logo;
        return (
          <div className="cw-hraci__hrac">
            <div className="cw-vyhody__nahlad" aria-hidden="true">
              {obrazok ? <img src={souborUrl(obrazok)} alt="" /> : <Icon nazov="licencia" velkost={18} />}
            </div>
            <div className="cw-hraci__meno">
              <span className="cw-hraci__meno-text">{v.nazov}</span>
              {v.sponzor && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}>{v.sponzor.nazov}</span>}
            </div>
          </div>
        );
      },
      hodnotaNaZoradenie: (v) => v.nazov,
    },
    {
      kluc: 'typy',
      popis: tr('Pre koho'),
      obsah: (v) =>
        v.typy_clenstva?.length ? (
          <div className="cw-vyhody__typy">
            {v.typy_clenstva.map((t) => (
              <Badge key={t} ton="primary">
                {TYPY.find((x) => x.hodnota === t)?.popis ?? t}
              </Badge>
            ))}
          </div>
        ) : (
          <span style={{ color: 'var(--muted)' }}>{tr('všetci členovia')}</span>
        ),
      sirka: '220px',
      skryTNaMobile: true,
    },
    {
      kluc: 'kod',
      popis: tr('Kód'),
      obsah: (v) => (v.kod ? <code className="cw-kat__slug">{v.kod}</code> : <span style={{ color: 'var(--muted)' }}>—</span>),
      sirka: '130px',
      skryTNaMobile: true,
    },
    {
      kluc: 'platnost',
      popis: tr('Platnosť'),
      obsah: (v) => (
        <span style={{ color: 'var(--muted)' }}>
          {v.platne_od || v.platne_do
            ? `${v.platne_od ? formatujDatum(v.platne_od) : '…'} – ${v.platne_do ? formatujDatum(v.platne_do) : '…'}`
            : tr('bez obmedzenia')}
        </span>
      ),
      hodnotaNaZoradenie: (v) => v.platne_do ?? '9999',
      sirka: '200px',
      skryTNaMobile: true,
    },
    {
      kluc: 'stav',
      popis: tr('Stav'),
      obsah: (v) => {
        const s = stavVyhody(v);
        return <Badge ton={s.ton}>{s.popis}</Badge>;
      },
      sirka: '120px',
    },
  ];

  const akcieRiadku: AkciaRiadku<VyhodaFanusika>[] = [
    { popis: tr('Upraviť'), ikona: 'upravit', onKlik: (v) => setUpravovana({ ...v }) },
    { popis: tr('Odstrániť'), ikona: 'zmazat', nebezpecna: true, onKlik: (v) => setNaZmazanie(v) },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Výhody pre členov')}
        podnadpis={tr('Zľavy a ponuky, ktoré fanúšikovia vidia po prihlásení na webe v sekcii Môj klub.')}
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovana({ ...PRAZDNA })}>
            {tr('Pridať výhodu')}
          </Button>
        }
      />

      <DataTable<VyhodaFanusika>
        data={zoznam}
        idZaznamu={(v) => v.id}
        stlpce={stlpce}
        nacitava={vyhody.nacitava}
        chyba={vyhody.chyba}
        onSkusZnova={vyhody.obnov}
        hladatV={(v) => `${v.nazov} ${v.sponzor?.nazov ?? ''} ${v.kod ?? ''}`}
        hladatPlaceholder={tr('Hľadať výhodu, partnera alebo kód…')}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(v) => setUpravovana({ ...v })}
        prazdnyNadpis={tr('Zatiaľ žiadne výhody')}
        prazdnyPopis={tr('Pridajte zľavu u partnera, kód do fanshopu alebo inú ponuku pre členov klubu.')}
        prazdnaAkcia={<Button onClick={() => setUpravovana({ ...PRAZDNA })}>{tr('Pridať prvú výhodu')}</Button>}
      />

      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={jeNova ? tr('Nová výhoda') : upravovana?.nazov || tr('Výhoda')}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNova ? tr('Pridať') : tr('Uložiť')}
            </Button>
          </>
        }
      >
        {upravovana && (
          <>
            <Input
              menovka={tr('Názov')}
              value={upravovana.nazov ?? ''}
              maxLength={150}
              onChange={(e) => zmen({ nazov: e.target.value })}
              placeholder={tr('Napríklad: 10 % zľava na kávu')}
              povinne
            />
            <Textarea
              menovka={tr('Popis')}
              value={upravovana.popis ?? ''}
              onChange={(e) => zmen({ popis: e.target.value })}
              rows={3}
              placeholder={tr('Ako výhodu uplatniť - napríklad stačí ukázať členskú kartu pri pokladni.')}
            />

            <fieldset className="cw-vyhody__pre">
              <legend>{tr('Pre koho')}</legend>
              <div className="cw-vyhody__volby">
                {TYPY.map((t) => (
                  <label key={t.hodnota}>
                    <input
                      type="checkbox"
                      checked={upravovana.typy_clenstva?.includes(t.hodnota) ?? false}
                      onChange={(e) => prepniTyp(t.hodnota, e.target.checked)}
                    />
                    {t.popis}
                  </label>
                ))}
              </div>
              <small>{tr('Nič nezaškrtnuté = výhodu vidia všetci s platným členstvom.')}</small>
            </fieldset>

            <div className="cw-hraci__row">
              <Select
                menovka={tr('Partner')}
                value={upravovana.sponzor_id ? String(upravovana.sponzor_id) : ''}
                onChange={(e) => zmen({ sponzor_id: e.target.value ? Number(e.target.value) : null })}
                moznosti={moznostiPartnerov}
              />
              <Input
                menovka={tr('Zľavový kód')}
                value={upravovana.kod ?? ''}
                maxLength={60}
                onChange={(e) => zmen({ kod: e.target.value })}
                placeholder={tr('Napríklad: CLEN15')}
              />
            </div>

            <Input
              menovka={tr('Odkaz')}
              value={upravovana.odkaz ?? ''}
              maxLength={500}
              onChange={(e) => zmen({ odkaz: e.target.value })}
              placeholder="/obchod alebo https://…"
              napoveda={tr('Kam vedie tlačidlo „Viac“ - stránka webu alebo web partnera.')}
            />

            <PoleObrazka
              menovka={tr('Obrázok')}
              hodnota={upravovana.obrazok}
              onZmena={(cesta) => zmen({ obrazok: cesta })}
              tvar="siroky"
              napoveda={tr('Bez obrázka sa zobrazí logo partnera.')}
            />

            <div className="cw-hraci__row">
              <Input
                menovka={tr('Platí od')}
                type="date"
                value={upravovana.platne_od?.slice(0, 10) ?? ''}
                onChange={(e) => zmen({ platne_od: e.target.value || null })}
              />
              <Input
                menovka={tr('Platí do')}
                type="date"
                value={upravovana.platne_do?.slice(0, 10) ?? ''}
                onChange={(e) => zmen({ platne_do: e.target.value || null })}
              />
            </div>

            <div className="cw-hraci__row">
              <Input
                menovka={tr('Poradie')}
                type="number"
                value={String(upravovana.poradie ?? 0)}
                onChange={(e) => zmen({ poradie: Number(e.target.value) || 0 })}
                napoveda={tr('Menšie číslo = vyššie v zozname.')}
              />
              <div />
            </div>

            <Switch
              zapnute={upravovana.aktivity !== false}
              onZmena={(v) => zmen({ aktivity: v })}
              menovka={tr('Zobrazovať členom')}
              popis={tr('Vypnutá výhoda zostane uložená, ale fanúšikovia ju neuvidia.')}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Odstrániť výhodu?')}
        sprava={tr('Výhoda „{nazov}“ zmizne fanúšikom zo sekcie Môj klub.', { nazov: naZmazanie?.nazov })}
        potvrdit={tr('Odstrániť')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default VyhodyFanusikov;
