// Umiestnenie: frontend/src/pages/admin/Timy.tsx
// Zoznam tímov s úpravou v modálnom okne.

import React, { useState } from 'react';
import {
  PageHeader, Button, Icon, Modal, Input, Select, Textarea,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { timyApi, hraciApi, stadionyApi } from '../../api/sport';
import { sezonyApi } from '../../api/sprava';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import type { Tim } from '../../api/typy';
import './Timy.css';

const TYPY = [
  { hodnota: 'muzi', popis: 'Dospelí (muži)' },
  { hodnota: 'zeny', popis: 'Ženy' },
  { hodnota: 'mladez', popis: 'Mládež' },
];

const KATEGORIE = [
  'seniori', 'U19', 'U17', 'U15', 'U13', 'U11', 'U9', 'prípravka',
].map((k) => ({ hodnota: k, popis: k }));

const PRAZDNY: Partial<Tim> = {
  nazov: '',
  typ: 'muzi',
  vekova_kategoria: 'seniori',
  popis: '',
  farba_prva: '',
  farba_druha: '',
  logo: null,
  stadion_id: null,
  sezona_id: null,
};

/** Skratka tímu — dve začiatočné písmená významových slov. */
const skratkaTimu = (nazov: string): string => {
  const slova = nazov.split(/\s+/).filter((s) => s.length > 1);
  if (slova.length >= 2) return (slova[0][0] + slova[1][0]).toUpperCase();
  return nazov.slice(0, 2).toUpperCase();
};

export const Timy: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<Tim> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Tim | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const hraci = useNacitanie((signal) => hraciApi.vypis(undefined, signal));
  const stadiony = useNacitanie((signal) => stadionyApi.vypis(signal));
  const sezony = useNacitanie((signal) => sezonyApi.vypis(signal));

  const zoznam = timy.data ?? [];

  /** Počet hráčov v tíme — pomáha pri rozhodovaní o zmazaní. */
  const pocetHracov = (timId: number): number =>
    (hraci.data ?? []).filter((h) => h.tim_id === timId).length;

  const nazovStadiona = (id: number | null | undefined) =>
    id ? (stadiony.data ?? []).find((x) => x.id === id)?.nazov ?? null : null;
  const nazovSezony = (id: number | null | undefined) =>
    id ? (sezony.data ?? []).find((x) => x.id === id)?.nazov ?? null : null;

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.nazov?.trim()) {
      varovanie('Zadajte názov tímu');
      return;
    }

    // Posielame len polia formulára - nie celý záznam zo servera
    const naUlozenie: Partial<Tim> = {
      nazov: upravovany.nazov.trim(),
      typ: upravovany.typ,
      vekova_kategoria: upravovany.vekova_kategoria,
      popis: upravovany.popis?.trim() || null,
      logo: upravovany.logo || null,
      stadion_id: upravovany.stadion_id ?? null,
      sezona_id: upravovany.sezona_id ?? null,
      farba_prva: upravovany.farba_prva?.trim() || null,
      farba_druha: upravovany.farba_druha?.trim() || null,
    };

    setUklada(true);
    try {
      if (jeNovy) {
        await timyApi.vytvor(naUlozenie);
        uspech('Tím bol vytvorený');
      } else {
        await timyApi.uprav(upravovany.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      timy.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Tím sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await timyApi.zmaz(naZmazanie.id);
      uspech('Tím bol presunutý do archívu');
      setNaZmazanie(null);
      timy.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Tím sa nepodarilo archivovať');
    } finally {
      setMaze(false);
    }
  };

  return (
    <>
      <PageHeader
        nadpis="Tímy"
        podnadpis="Mužstvá klubu podľa vekových kategórií."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
            Nový tím
          </Button>
        }
      />

      {timy.chyba ? (
        <ErrorState sprava="Tímy sa nepodarilo načítať" detail={timy.chyba} onSkusZnova={timy.obnov} />
      ) : timy.nacitava ? (
        <div className="cw-timy__mriezka">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="cw-timy__karta">
              <div className="cw-timy__hlavicka cw-skeleton" />
              <div className="cw-timy__telo">
                <Skeleton riadkov={2} />
              </div>
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-timy__prazdne">
          <EmptyState
            ikona={<Icon nazov="timy" velkost={40} />}
            nadpis="Zatiaľ žiadne tímy"
            popis="Vytvorte mužstvá podľa vekových kategórií klubu."
            akcia={<Button onClick={() => setUpravovany({ ...PRAZDNY })}>Vytvoriť prvý tím</Button>}
          />
        </div>
      ) : (
        <div className="cw-timy__mriezka">
          {zoznam.map((t) => (
            <div key={t.id} className="cw-timy__karta">
              {/* Hlavička s prechodom — farby tímu, ak sú zadané,
                  inak farba klubu */}
              <div
                className="cw-timy__hlavicka"
                style={
                  t.farba_prva
                    ? {
                        background: `linear-gradient(135deg, ${t.farba_prva}, ${
                          t.farba_druha || 'rgba(0,0,0,.65)'
                        })`,
                      }
                    : undefined
                }
              >
                {t.logo ? (
                  <img
                    src={souborUrl(t.logo)}
                    alt=""
                    className="cw-timy__logo"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                ) : (
                  <span className="cw-timy__znak">{skratkaTimu(t.nazov)}</span>
                )}
              </div>

              <div className="cw-timy__telo">
                <div className="cw-timy__riadok">
                  <div className="cw-timy__nazvy">
                    <div className="cw-timy__nazov">{t.nazov}</div>
                    <div className="cw-timy__kategoria">
                      {TYPY.find((x) => x.hodnota === t.typ)?.popis ?? t.typ} · {t.vekova_kategoria}
                    </div>
                  </div>
                  <span className="cw-timy__pocet">{pocetHracov(t.id)} hráčov</span>
                </div>

                {(nazovStadiona(t.stadion_id) || nazovSezony(t.sezona_id)) && (
                  <div className="cw-timy__info">
                    {nazovStadiona(t.stadion_id) && (
                      <span><Icon nazov="stadion" velkost={12} /> {nazovStadiona(t.stadion_id)}</span>
                    )}
                    {nazovSezony(t.sezona_id) && (
                      <span><Icon nazov="sezony" velkost={12} /> {nazovSezony(t.sezona_id)}</span>
                    )}
                  </div>
                )}

                {t.popis && <div className="cw-timy__popis">{t.popis}</div>}

                <div className="cw-timy__tlacidla">
                  <button className="cw-timy__upravit" onClick={() => setUpravovany({ ...t })}>
                    Upraviť tím
                  </button>
                  <button
                    className="cw-timy__archiv"
                    onClick={() => setNaZmazanie(t)}
                    aria-label={`Archivovať ${t.nazov}`}
                    title="Presunúť do archívu"
                  >
                    <Icon nazov="archiv" velkost={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový tím' : upravovany?.nazov ?? 'Tím'}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? 'Vytvoriť tím' : 'Uložiť zmeny'}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            <Input
              menovka="Názov tímu"
              value={upravovany.nazov ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="Napríklad: FC Slovan Dolina U15"
              povinne
            />

            <div className="cw-timy__row">
              <Select
                menovka="Kategória"
                value={upravovany.typ ?? 'muzi'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, typ: e.target.value }))}
                moznosti={TYPY}
              />
              <Select
                menovka="Veková kategória"
                value={upravovany.vekova_kategoria ?? 'seniori'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, vekova_kategoria: e.target.value }))}
                moznosti={KATEGORIE}
              />
            </div>

            <div className="cw-timy__row">
              <Input
                menovka="Prvá farba"
                type="color"
                value={upravovany.farba_prva || '#1b5e20'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, farba_prva: e.target.value }))}
              />
              <Input
                menovka="Druhá farba"
                type="color"
                value={upravovany.farba_druha || '#ffffff'}
                onChange={(e) => setUpravovany((d) => ({ ...d!, farba_druha: e.target.value }))}
              />
            </div>

            <div className="cw-timy__row">
              <Select
                menovka="Štadión"
                value={upravovany.stadion_id ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, stadion_id: e.target.value ? Number(e.target.value) : null }))
                }
                prazdna="Bez štadióna"
                moznosti={(stadiony.data ?? []).map((st) => ({ hodnota: st.id, popis: st.nazov }))}
                napoveda="Domáce zápasy dostanú miesto automaticky"
              />
              <Select
                menovka="Sezóna"
                value={upravovany.sezona_id ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, sezona_id: e.target.value ? Number(e.target.value) : null }))
                }
                prazdna="Bez sezóny"
                moznosti={(sezony.data ?? []).map((se) => ({
                  hodnota: se.id,
                  popis: `${se.nazov}${se.aktualna ? ' (aktuálna)' : ''}`,
                }))}
              />
            </div>

            <PoleObrazka
              menovka="Logo tímu"
              hodnota={upravovany.logo}
              onZmena={(cesta) => setUpravovany((d) => ({ ...d!, logo: cesta }))}
            />

            <Textarea
              menovka="Popis"
              value={upravovany.popis ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, popis: e.target.value }))}
              placeholder="Krátky popis tímu pre verejný web…"
              rows={3}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Archivovať tím?"
        sprava={
          naZmazanie && pocetHracov(naZmazanie.id) > 0
            ? `Tím ${naZmazanie.nazov} má ${pocetHracov(naZmazanie.id)} hráčov. Najprv ich presuňte do iného tímu, inak server archiváciu odmietne.`
            : `Tím ${naZmazanie?.nazov} sa presunie do archívu, odkiaľ sa dá obnoviť.`
        }
        potvrdit="Archivovať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </>
  );
};

export default Timy;
