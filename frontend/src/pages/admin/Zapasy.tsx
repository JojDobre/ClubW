// Umiestnenie: frontend/src/pages/admin/Zapasy.tsx
// Zoznam zápasov.

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, Button, Badge, Icon, DataTable, ConfirmDialog, useToast,
  type Stlpec, type AkciaRiadku, type HromadnaAkcia, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { zapasyApi, ligyApi } from '../../api/sport';
import { formatujDatumCas } from '../../utils/datum';
import type { Zapas, StavZapasu } from '../../api/typy';
import { tr } from '../../i18n';
import './Zapasy.css';

/** Popisné názvy stavov zápasu a ich farebné tóny. */
const STAVY: Record<StavZapasu, { popis: string; ton: TonStitka; zivy?: boolean }> = {
  naplanovany: { popis: tr('Naplánovaný'), ton: 'info' },
  prebieha: { popis: tr('Prebieha'), ton: 'danger', zivy: true },
  ukonceny: { popis: tr('Odohraný'), ton: 'success' },
  odlozeny: { popis: tr('Odložený'), ton: 'warning' },
  zruseny: { popis: tr('Zrušený'), ton: 'neutral' },
};

export const Zapasy: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu } = useToast();

  const [naZmazanie, setNaZmazanie] = useState<Zapas | null>(null);
  const [hromadneNaZmazanie, setHromadneNaZmazanie] = useState<number[] | null>(null);
  const [maze, setMaze] = useState(false);

  const zapasy = useNacitanie((signal) => zapasyApi.vypis(signal));
  const ligy = useNacitanie((signal) => ligyApi.vypis(signal));

  const zoznam = zapasy.data ?? [];
  const zoznamLig = ligy.data ?? [];

  /** Názov tímu — databázový alebo zadaný ako text. */
  const nazovTimu = (z: Zapas, strana: 'domaci' | 'hostujuci'): string =>
    (strana === 'domaci'
      ? z.domaci_tim_display_name || z.domaci_tim_nazov
      : z.hostujuci_tim_display_name || z.hostujuci_tim_nazov) || '—';

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await zapasyApi.zmaz(naZmazanie.id);
      uspech(tr('Zápas bol vymazaný'));
      setNaZmazanie(null);
      zapasy.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Zápas sa nepodarilo vymazať'));
    } finally {
      setMaze(false);
    }
  };

  const zmazHromadne = async () => {
    if (!hromadneNaZmazanie) return;
    setMaze(true);

    const vysledky = await Promise.allSettled(
      hromadneNaZmazanie.map((id) => zapasyApi.zmaz(id))
    );
    const uspesne = vysledky.filter((v) => v.status === 'fulfilled').length;
    const zlyhane = vysledky.length - uspesne;

    if (uspesne > 0) uspech(tr('Vymazaných zápasov: {uspesne}', { uspesne }));
    if (zlyhane > 0) hlasChybu(tr('Nepodarilo sa vymazať: {zlyhane}', { zlyhane }));

    setHromadneNaZmazanie(null);
    setMaze(false);
    zapasy.obnov();
  };

  const stlpce: Stlpec<Zapas>[] = useMemo(() => [
    {
      kluc: 'datum',
      popis: tr('Dátum a čas'),
      obsah: (z) => (
        <span className="cw-zapasy__datum">{formatujDatumCas(z.datum_cas)}</span>
      ),
      hodnotaNaZoradenie: (z) => new Date(z.datum_cas).getTime(),
      sirka: '160px',
    },
    {
      kluc: 'zapas',
      popis: tr('Zápas'),
      obsah: (z) => (
        <div className="cw-zapasy__tim">
          <span className="cw-zapasy__tim-nazov">{nazovTimu(z, 'domaci')}</span>
          <span className="cw-zapasy__vs">—</span>
          <span className="cw-zapasy__tim-nazov">{nazovTimu(z, 'hostujuci')}</span>
        </div>
      ),
      hodnotaNaZoradenie: (z) => nazovTimu(z, 'domaci'),
    },
    {
      kluc: 'vysledok',
      popis: tr('Výsledok'),
      obsah: (z) =>
        z.goly_domaci !== null && z.goly_hostia !== null ? (
          <strong className="cw-zapasy__skore">
            {z.goly_domaci} : {z.goly_hostia}
          </strong>
        ) : (
          <span style={{ color: 'var(--muted)' }}>—</span>
        ),
      zarovnanie: 'center',
      sirka: '100px',
    },
    {
      kluc: 'liga',
      popis: tr('Súťaž'),
      obsah: (z) =>
        z.liga_display_name || z.liga_nazov ? (
          <Badge>{z.liga_display_name || z.liga_nazov}</Badge>
        ) : (
          <span style={{ color: 'var(--muted)' }}>—</span>
        ),
      hodnotaNaZoradenie: (z) => z.liga_nazov ?? null,
      sirka: '170px',
      skryTNaMobile: true,
    },
    {
      kluc: 'kolo',
      popis: tr('Kolo'),
      obsah: (z) => (z.kolo !== null ? `${z.kolo}.` : '—'),
      hodnotaNaZoradenie: (z) => z.kolo,
      zarovnanie: 'center',
      sirka: '70px',
      skryTNaMobile: true,
    },
    {
      kluc: 'status',
      popis: tr('Stav'),
      obsah: (z) => {
        // Backend dopočítava stav podľa času — ten má prednosť
        const stav = STAVY[z.actual_status ?? z.status] ?? STAVY.naplanovany;
        return (
          <Badge ton={stav.ton} zivy={stav.zivy}>
            {stav.popis}
          </Badge>
        );
      },
      hodnotaNaZoradenie: (z) => z.actual_status ?? z.status,
      sirka: '130px',
    },
  ], []);

  const akcieRiadku: AkciaRiadku<Zapas>[] = [
    {
      popis: tr('Upraviť'),
      ikona: 'upravit',
      onKlik: (z) => navigate(`/admin/zapasy/${z.id}`),
    },
    {
      popis: tr('Živé sledovanie'),
      ikona: 'live',
      // Živé sledovanie má zmysel len pri zápase, ktorý ešte neskončil
      zobrazit: (z) => (z.actual_status ?? z.status) !== 'ukonceny',
      onKlik: (z) => navigate(`/admin/zapasy/${z.id}/live`),
    },
    {
      popis: tr('Vymazať'),
      ikona: 'zmazat',
      nebezpecna: true,
      onKlik: (z) => setNaZmazanie(z),
    },
  ];

  const hromadneAkcie: HromadnaAkcia[] = [
    {
      popis: tr('Vymazať'),
      ikona: 'zmazat',
      nebezpecna: true,
      onKlik: (ids) => setHromadneNaZmazanie(ids),
    },
  ];

  return (
    <>
      <PageHeader
        nadpis={tr('Zápasy')}
        podnadpis={tr('Výsledky, súpisky a priebeh zápasov klubu.')}
        akcie={
          <Button
            ikona={<Icon nazov="plus" velkost={15} />}
            onClick={() => navigate('/admin/zapasy/novy')}
          >
            {tr('Nový zápas')}
          </Button>
        }
      />

      <DataTable<Zapas>
        data={zoznam}
        idZaznamu={(z) => z.id}
        stlpce={stlpce}
        nacitava={zapasy.nacitava}
        chyba={zapasy.chyba}
        onSkusZnova={zapasy.obnov}
        hladatV={(z) =>
          `${nazovTimu(z, 'domaci')} ${nazovTimu(z, 'hostujuci')} ${z.liga_nazov ?? ''} ${z.miesto ?? ''}`
        }
        hladatPlaceholder={tr('Hľadať podľa tímu, súťaže alebo miesta…')}
        filtre={[
          {
            kluc: 'status',
            popis: tr('Všetky stavy'),
            moznosti: (Object.keys(STAVY) as StavZapasu[]).map((k) => ({
              hodnota: k,
              popis: STAVY[k].popis,
            })),
          },
          {
            kluc: 'liga',
            popis: tr('Všetky súťaže'),
            moznosti: zoznamLig.map((l) => ({
              hodnota: String(l.id),
              popis: `${l.nazov} (${l.sezona})`,
            })),
          },
        ]}
        filtrujZaznam={(z, kluc, hodnota) => {
          if (kluc === 'status') return (z.actual_status ?? z.status) === hodnota;
          if (kluc === 'liga') return String(z.liga_id ?? '') === hodnota;
          return true;
        }}
        akcieRiadku={akcieRiadku}
        hromadneAkcie={hromadneAkcie}
        onKlikNaRiadok={(z) => navigate(`/admin/zapasy/${z.id}`)}
        prazdnyNadpis={tr('Zatiaľ žiadne zápasy')}
        prazdnyPopis={tr('Pridajte prvý zápas a začnite budovať kalendár klubu.')}
        prazdnaAkcia={
          <Button onClick={() => navigate('/admin/zapasy/novy')}>{tr('Pridať zápas')}</Button>
        }
      />

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Vymazať zápas?')}
        sprava={
          naZmazanie
            ? tr('Zápas {hodnota} — {hodnota2} bude odstránený. Ak patrí do ligy, tabuľka sa automaticky prepočíta.', { hodnota: nazovTimu(naZmazanie, 'domaci'), hodnota2: nazovTimu(naZmazanie, 'hostujuci') })
            : ''
        }
        potvrdit={tr('Vymazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />

      <ConfirmDialog
        otvorene={hromadneNaZmazanie !== null}
        nadpis={tr('Vymazať označené zápasy?')}
        sprava={tr('Bude odstránených {hodnota} zápasov. Tabuľky dotknutých líg sa prepočítajú.', { hodnota: hromadneNaZmazanie?.length ?? 0 })}
        potvrdit={tr('Vymazať všetky')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmazHromadne}
        onZrus={() => setHromadneNaZmazanie(null)}
      />
    </>
  );
};

export default Zapasy;
