// Umiestnenie: frontend/src/pages/admin/MenuWebu.tsx
// Menu verejného webu - položky, poradie a podmenu.
//
// Položka vedie na stránku, rubriku článkov, sekciu webu (zápasy,
// turnaje...) alebo vlastnú adresu. Menu má dve úrovne.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Select, Switch, Skeleton, ErrorState, EmptyState,
  ConfirmDialog, FilterChips, useToast,
} from '../../ui';
import { Presmerovania } from './Presmerovania';
import { useNacitanie } from '../../app/useNacitanie';
import { menuApi } from '../../api/menu';
import { strankyApi, kategorieSpravaApi } from '../../api/obsah';
import type { PolozkaMenuWebu } from '../../api/typy';
import { tr } from '../../i18n';
import './MenuWebu.css';

/** Sekcie webu, ktoré nie sú stránkou z databázy. */
export const SEKCIE_WEBU: Array<{ url: string; nazov: string }> = [
  { url: '/', nazov: tr('Domov') },
  { url: '/clanky', nazov: tr('Články') },
  { url: '/matches', nazov: tr('Zápasy') },
  { url: '/leagues', nazov: tr('Ligy a tabuľky') },
  { url: '/teams', nazov: tr('Tímy') },
  { url: '/turnaje', nazov: tr('Turnaje') },
  { url: '/calendar', nazov: tr('Kalendár') },
  { url: '/galleries', nazov: tr('Galérie') },
  { url: '/videa', nazov: tr('Videá') },
  { url: '/dokumenty', nazov: tr('Dokumenty') },
  { url: '/sponzori', nazov: tr('Partneri') },
];

/** Odporúčané menu pre prázdny web. */
const ODPORUCANE = ['/', '/clanky', '/matches', '/teams', '/turnaje', '/sponzori'];

type Druh = 'sekcia' | 'stranka' | 'rubrika' | 'url';

interface Formular {
  id?: number;
  nazov: string;
  druh: Druh;
  sekcia: string;
  stranka_id: number | null;
  rubrika_id: number | null;
  url: string;
  rodic_id: number | null;
  otvorit_v_novom: boolean;
  aktivity: boolean;
  /** Názov napísal používateľ - výber cieľa ho už neprepíše */
  nazovRucne: boolean;
}

const PRAZDNY: Formular = {
  nazov: '',
  druh: 'sekcia',
  sekcia: '/clanky',
  stranka_id: null,
  rubrika_id: null,
  url: '',
  rodic_id: null,
  otvorit_v_novom: false,
  aktivity: true,
  nazovRucne: false,
};

/** Formulár z uloženej položky - sekcia webu je v DB ako adresa. */
const doFormulara = (p: PolozkaMenuWebu): Formular => {
  const jeSekcia = p.typ === 'url' && SEKCIE_WEBU.some((s) => s.url === p.url);
  return {
    id: p.id,
    nazov: p.nazov,
    druh: jeSekcia ? 'sekcia' : p.typ,
    sekcia: jeSekcia ? p.url! : '/clanky',
    stranka_id: p.stranka_id,
    rubrika_id: p.rubrika_id,
    url: jeSekcia ? '' : p.url ?? '',
    rodic_id: p.rodic_id,
    otvorit_v_novom: p.otvorit_v_novom,
    aktivity: p.aktivity,
    nazovRucne: true,
  };
};

export const MenuWebu: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const menu = useNacitanie((signal) => menuApi.vypis(signal));
  const stranky = useNacitanie((signal) => strankyApi.vypis(signal));
  const rubriky = useNacitanie((signal) => kategorieSpravaApi.vypis(signal));

  const [karta, setKarta] = useState<'menu' | 'presmerovania'>(
    () => (window.location.hash === '#presmerovania' ? 'presmerovania' : 'menu')
  );
  const [upravovana, setUpravovana] = useState<Formular | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<PolozkaMenuWebu | null>(null);
  const [uklada, setUklada] = useState(false);

  const strom = menu.data?.strom ?? [];
  const zoznamStranok = stranky.data ?? [];
  const zoznamRubrik = rubriky.data ?? [];

  /** Kam položka vedie - text do zoznamu. */
  const ciel = (p: PolozkaMenuWebu): string => {
    if (p.typ === 'stranka') {
      const s = zoznamStranok.find((x) => x.id === p.stranka_id);
      return s ? tr('Stránka: {nazov}{hodnota}', { nazov: s.nazov, hodnota: s.publikovany ? '' : tr(' (nepublikovaná - na webe sa neukáže)') }) : tr('Stránka bola zmazaná');
    }
    if (p.typ === 'rubrika') {
      const r = zoznamRubrik.find((x) => x.id === p.rubrika_id);
      return r ? tr('Rubrika: {nazov}', { nazov: r.nazov }) : tr('Rubrika bola zmazaná');
    }
    const sekcia = SEKCIE_WEBU.find((s) => s.url === p.url);
    return sekcia ? tr('Sekcia webu: {nazov}', { nazov: sekcia.nazov }) : tr('Adresa: {url}', { url: p.url });
  };

  // ===== Poradie =====
  const presun = async (uroven: PolozkaMenuWebu[], index: number, smer: -1 | 1) => {
    const ciel = index + smer;
    if (ciel < 0 || ciel >= uroven.length) return;
    const nove = [...uroven];
    [nove[index], nove[ciel]] = [nove[ciel], nove[index]];
    try {
      await menuApi.poradie(nove.map((p, i) => ({ id: p.id, poradie: i + 1, rodic_id: p.rodic_id })));
      menu.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Poradie sa nepodarilo zmeniť'));
    }
  };

  // ===== Uloženie =====
  const uloz = async () => {
    if (!upravovana) return;
    const f = upravovana;
    if (!f.nazov.trim()) return varovanie(tr('Zadajte názov položky'));
    if (f.druh === 'stranka' && !f.stranka_id) return varovanie(tr('Vyberte stránku'));
    if (f.druh === 'rubrika' && !f.rubrika_id) return varovanie(tr('Vyberte rubriku'));
    if (f.druh === 'url' && !/^(\/(?!\/)|https?:\/\/)/i.test(f.url.trim())) {
      return varovanie(tr('Adresa musí začínať / (stránka webu) alebo https://'));
    }

    const telo: Partial<PolozkaMenuWebu> = {
      nazov: f.nazov.trim(),
      typ: f.druh === 'sekcia' ? 'url' : f.druh,
      stranka_id: f.druh === 'stranka' ? f.stranka_id : null,
      rubrika_id: f.druh === 'rubrika' ? f.rubrika_id : null,
      url: f.druh === 'sekcia' ? f.sekcia : f.druh === 'url' ? f.url.trim() : null,
      rodic_id: f.rodic_id,
      otvorit_v_novom: f.otvorit_v_novom,
      aktivity: f.aktivity,
    };

    setUklada(true);
    try {
      if (f.id) {
        await menuApi.uprav(f.id, telo);
        uspech(tr('Položka bola uložená'));
      } else {
        await menuApi.vytvor(telo);
        uspech(tr('Položka bola pridaná do menu'));
      }
      setUpravovana(null);
      menu.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Položku sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    try {
      await menuApi.zmaz(naZmazanie.id);
      uspech(tr('Položka bola odstránená'));
      setNaZmazanie(null);
      menu.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Položku sa nepodarilo odstrániť'));
    }
  };

  const vytvorOdporucane = async () => {
    try {
      for (const url of ODPORUCANE) {
        const s = SEKCIE_WEBU.find((x) => x.url === url)!;
        await menuApi.vytvor({ nazov: s.nazov, typ: 'url', url });
      }
      uspech(tr('Odporúčané menu bolo vytvorené'));
      menu.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Menu sa nepodarilo vytvoriť'));
    }
  };

  // Pri výbere cieľa predvyplníme názov, kým ho používateľ neprepíše sám
  const zmenCiel = (zmena: Partial<Formular>, navrhNazvu?: string) =>
    setUpravovana((f) => {
      if (!f) return f;
      const novy = { ...f, ...zmena };
      if (navrhNazvu && !f.nazovRucne) novy.nazov = navrhNazvu;
      return novy;
    });

  const Riadok: React.FC<{ p: PolozkaMenuWebu; uroven: PolozkaMenuWebu[]; index: number; vnorena?: boolean }> = ({
    p, uroven, index, vnorena,
  }) => (
    <li className={`cw-menu__polozka ${vnorena ? 'is-vnorena' : ''} ${p.aktivity ? '' : 'is-skryta'}`}>
      <div className="cw-menu__riadok">
        <div className="cw-menu__text">
          <strong>{p.nazov}</strong>
          <span>{ciel(p)}</span>
        </div>
        <div className="cw-menu__stitky">
          {!p.aktivity && <Badge>{tr('Skrytá')}</Badge>}
          {p.otvorit_v_novom && <Badge ton="info">{tr('Nové okno')}</Badge>}
        </div>
        <div className="cw-menu__akcie">
          <Button velkost="sm" variant="ghost" disabled={index === 0} onClick={() => presun(uroven, index, -1)} aria-label={tr('Posunúť {nazov} vyššie', { nazov: p.nazov })}>
            ↑
          </Button>
          <Button velkost="sm" variant="ghost" disabled={index === uroven.length - 1} onClick={() => presun(uroven, index, 1)} aria-label={tr('Posunúť {nazov} nižšie', { nazov: p.nazov })}>
            ↓
          </Button>
          <Button velkost="sm" variant="ghost" onClick={() => setUpravovana(doFormulara(p))} aria-label={tr('Upraviť {nazov}', { nazov: p.nazov })}>
            <Icon nazov="upravit" velkost={14} />
          </Button>
          <Button velkost="sm" variant="ghost" onClick={() => setNaZmazanie(p)} aria-label={tr('Odstrániť {nazov}', { nazov: p.nazov })}>
            <Icon nazov="zmazat" velkost={14} />
          </Button>
        </div>
      </div>
      {!vnorena && (p.deti?.length ?? 0) > 0 && (
        <ul className="cw-menu__deti">
          {p.deti!.map((d, i) => (
            <Riadok key={d.id} p={d} uroven={p.deti!} index={i} vnorena />
          ))}
        </ul>
      )}
    </li>
  );

  // Rodičom môže byť len položka prvej úrovne (a nie ona sama)
  const moznyRodic = strom.filter((p) => p.id !== upravovana?.id);
  const maDeti = Boolean(upravovana?.id && strom.find((p) => p.id === upravovana.id)?.deti?.length);

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Menu a odkazy')}
        podnadpis={tr('Hlavné menu verejného webu a presmerovanie starých odkazov.')}
        akcie={
          karta === 'menu' ? (
            <Button ikona={<Icon nazov="plus" velkost={16} />} onClick={() => setUpravovana({ ...PRAZDNY, nazov: tr('Články') })}>
              {tr('Pridať položku')}
            </Button>
          ) : undefined
        }
      />

      <div className="cw-menu__karty">
        <FilterChips
          popisSkupiny={tr('Časť obrazovky')}
          moznosti={[
            { hodnota: 'menu', popis: tr('Menu webu') },
            { hodnota: 'presmerovania', popis: tr('Presmerovania') },
          ]}
          zvolena={karta}
          onZmena={(h) => setKarta(h as 'menu' | 'presmerovania')}
        />
      </div>

      {karta === 'presmerovania' ? (
        <Presmerovania />
      ) : (
      <>

      {menu.chyba ? (
        <ErrorState sprava={tr('Menu sa nepodarilo načítať')} detail={menu.chyba} onSkusZnova={menu.obnov} />
      ) : menu.nacitava && !menu.data ? (
        <div className="cw-menu__panel">
          <Skeleton riadkov={5} />
        </div>
      ) : strom.length === 0 ? (
        <div className="cw-menu__panel">
          <EmptyState
            ikona={<Icon nazov="menu" velkost={36} />}
            nadpis={tr('Menu zatiaľ nie je nastavené')}
            popis={tr('Kým ho nenastavíte, web ukazuje predvolené odkazy (Domov, Články, Turnaje, Dokumenty, Partneri) a stránky označené Zobraziť v menu.')}
            akcia={<Button onClick={vytvorOdporucane}>{tr('Vytvoriť odporúčané menu')}</Button>}
          />
        </div>
      ) : (
        <ul className="cw-menu__zoznam">
          {strom.map((p, i) => (
            <Riadok key={p.id} p={p} uroven={strom} index={i} />
          ))}
        </ul>
      )}

      </>
      )}

      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={upravovana?.id ? tr('Upraviť položku menu') : tr('Nová položka menu')}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {upravovana?.id ? tr('Uložiť') : tr('Pridať')}
            </Button>
          </>
        }
      >
        {upravovana && (
          <>
            <Select
              menovka={tr('Kam položka vedie')}
              value={upravovana.druh}
              onChange={(e) => setUpravovana({ ...upravovana, druh: e.target.value as Druh })}
              moznosti={[
                { hodnota: 'sekcia', popis: tr('Sekcia webu (zápasy, turnaje…)') },
                { hodnota: 'stranka', popis: tr('Stránka') },
                { hodnota: 'rubrika', popis: tr('Rubrika článkov') },
                { hodnota: 'url', popis: tr('Vlastná adresa') },
              ]}
            />
            {upravovana.druh === 'sekcia' && (
              <Select
                menovka={tr('Sekcia')}
                value={upravovana.sekcia}
                onChange={(e) =>
                  zmenCiel({ sekcia: e.target.value }, SEKCIE_WEBU.find((s) => s.url === e.target.value)?.nazov)
                }
                moznosti={SEKCIE_WEBU.map((s) => ({ hodnota: s.url, popis: `${s.nazov} (${s.url})` }))}
              />
            )}
            {upravovana.druh === 'stranka' && (
              <Select
                menovka={tr('Stránka')}
                value={upravovana.stranka_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  zmenCiel({ stranka_id: id }, zoznamStranok.find((s) => s.id === id)?.nazov);
                }}
                prazdna={tr('Vyberte stránku')}
                moznosti={zoznamStranok.map((s) => ({ hodnota: s.id, popis: s.publikovany ? s.nazov : tr('{nazov} (nepublikovaná)', { nazov: s.nazov }) }))}
              />
            )}
            {upravovana.druh === 'rubrika' && (
              <Select
                menovka={tr('Rubrika')}
                value={upravovana.rubrika_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  zmenCiel({ rubrika_id: id }, zoznamRubrik.find((r) => r.id === id)?.nazov);
                }}
                prazdna={tr('Vyberte rubriku')}
                moznosti={zoznamRubrik.map((r) => ({ hodnota: r.id, popis: r.nazov }))}
              />
            )}
            {upravovana.druh === 'url' && (
              <Input
                menovka={tr('Adresa')}
                value={upravovana.url}
                onChange={(e) => setUpravovana({ ...upravovana, url: e.target.value })}
                placeholder="/formular/prihlaska alebo https://…"
                napoveda={tr('Začína / (stránka tohto webu) alebo https:// (iný web)')}
              />
            )}
            <Input
              menovka={tr('Názov v menu')}
              value={upravovana.nazov}
              onChange={(e) => setUpravovana({ ...upravovana, nazov: e.target.value, nazovRucne: true })}
              povinne
            />
            <Select
              menovka={tr('Umiestnenie')}
              value={upravovana.rodic_id ?? ''}
              onChange={(e) => setUpravovana({ ...upravovana, rodic_id: e.target.value ? Number(e.target.value) : null })}
              prazdna={tr('Hlavné menu')}
              moznosti={moznyRodic.map((p) => ({ hodnota: p.id, popis: tr('Podmenu: {nazov}', { nazov: p.nazov }) }))}
              disabled={maDeti}
              napoveda={maDeti ? tr('Položka má vlastné podmenu, preto zostáva v hlavnom menu') : undefined}
            />
            <Switch
              zapnute={upravovana.otvorit_v_novom}
              onZmena={(v) => setUpravovana({ ...upravovana, otvorit_v_novom: v })}
              menovka={tr('Otvoriť v novom okne')}
            />
            <Switch
              zapnute={upravovana.aktivity}
              onZmena={(v) => setUpravovana({ ...upravovana, aktivity: v })}
              menovka={tr('Zobraziť na webe')}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Odstrániť položku menu?')}
        sprava={
          naZmazanie?.deti?.length
            ? tr('Položka {nazov} bude odstránená aj s podmenu ({length}). Stránky samotné zostanú.', { nazov: naZmazanie.nazov, length: naZmazanie.deti.length })
            : tr('Položka {hodnota} bude odstránená z menu. Stránka alebo sekcia zostane.', { hodnota: naZmazanie?.nazov ?? '' })
        }
        potvrdit={tr('Odstrániť')}
        nebezpecne
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default MenuWebu;
