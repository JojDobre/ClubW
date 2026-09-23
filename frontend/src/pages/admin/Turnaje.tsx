// Umiestnenie: frontend/src/pages/admin/Turnaje.tsx
// Zoznam turnajov. Nový turnaj sa založí s názvom a formátom, skupiny
// a pavúk sa potom nastavujú v editore turnaja.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Select,
  Skeleton, EmptyState, ErrorState, useToast, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { turnajeApi } from '../../api/doplnky';
import { sezonyApi } from '../../api/sprava';
import { souborUrl } from '../../config/api';
import { formatujDatum } from '../../utils/datum';
import type { TypTurnaja, StavTurnaja, Turnaj } from '../../api/typy';
import './Turnaje.css';

export const FORMATY: Array<{ hodnota: TypTurnaja; popis: string; vysvetlenie: string }> = [
  { hodnota: 'single_elimination', popis: 'Vyraďovací pavúk', vysvetlenie: 'Štvrťfinále, semifinále, finále - víťaz postupuje.' },
  { hodnota: 'groups_playoff', popis: 'Skupiny + pavúk', vysvetlenie: 'Skupiny každý s každým, najlepší zo skupín postupujú do pavúka.' },
  { hodnota: 'round_robin', popis: 'Každý s každým', vysvetlenie: 'Jedna alebo viac skupín s tabuľkou, bez pavúka.' },
];

export const STAVY_TURNAJA: Array<{ hodnota: StavTurnaja; popis: string; ton: TonStitka }> = [
  { hodnota: 'pripravuje', popis: 'Pripravuje sa', ton: 'neutral' },
  { hodnota: 'prebiehajuci', popis: 'Prebieha', ton: 'success' },
  { hodnota: 'pozastaveny', popis: 'Pozastavený', ton: 'warning' },
  { hodnota: 'ukonceny', popis: 'Ukončený', ton: 'info' },
];

export const Turnaje: React.FC = () => {
  const navigate = useNavigate();
  const { chyba: hlasChybu, varovanie } = useToast();

  const [novy, setNovy] = useState<{ nazov: string; typ: TypTurnaja; sezona_id: number | null; datum_start: string } | null>(null);
  const [uklada, setUklada] = useState(false);

  const turnaje = useNacitanie((signal) => turnajeApi.vypis(signal));
  const sezony = useNacitanie((signal) => sezonyApi.vypis(signal));
  const zoznam = turnaje.data ?? [];

  const zaloz = async () => {
    if (!novy) return;
    if (novy.nazov.trim().length < 2) {
      varovanie('Názov turnaja musí mať aspoň 2 znaky');
      return;
    }
    setUklada(true);
    try {
      const vytvoreny = await turnajeApi.vytvor({
        nazov: novy.nazov.trim(),
        typ: novy.typ,
        sezona_id: novy.sezona_id,
        datum_start: novy.datum_start || null,
      });
      navigate(`/admin/turnaje/${vytvoreny.id}`);
    } catch (e: any) {
      hlasChybu(e?.message || 'Turnaj sa nepodarilo založiť');
    } finally {
      setUklada(false);
    }
  };

  const otvorNovy = () =>
    setNovy({
      nazov: '',
      typ: 'groups_playoff',
      sezona_id: (sezony.data ?? []).find((s) => s.aktualna)?.id ?? null,
      datum_start: '',
    });

  const stav = (t: Turnaj) => STAVY_TURNAJA.find((s) => s.hodnota === t.status);

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Turnaje"
        podnadpis="Pohárové súťaže a mládežnícke turnaje - skupiny, pavúk a výsledky."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={otvorNovy}>
            Nový turnaj
          </Button>
        }
      />

      {turnaje.chyba ? (
        <ErrorState sprava="Turnaje sa nepodarilo načítať" detail={turnaje.chyba} onSkusZnova={turnaje.obnov} />
      ) : turnaje.nacitava ? (
        <div className="cw-turn__mriezka">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cw-turn__karta">
              <Skeleton riadkov={3} />
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-turn__prazdne">
          <EmptyState
            ikona={<Icon nazov="ligy" velkost={40} />}
            nadpis="Zatiaľ žiadne turnaje"
            popis="Založte turnaj, pridajte tímy do skupín alebo priamo do pavúka a zapisujte výsledky."
            akcia={<Button onClick={otvorNovy}>Založiť turnaj</Button>}
          />
        </div>
      ) : (
        <div className="cw-turn__mriezka">
          {zoznam.map((t) => (
            <button key={t.id} className="cw-turn__karta" onClick={() => navigate(`/admin/turnaje/${t.id}`)}>
              <div className="cw-turn__hlava">
                <span className="cw-turn__logo">
                  {t.logo ? <img src={souborUrl(t.logo)} alt="" /> : <Icon nazov="ligy" velkost={22} />}
                </span>
                <div className="cw-turn__nazvy">
                  <span className="cw-turn__nazov">{t.nazov}</span>
                  <span className="cw-turn__format">
                    {FORMATY.find((f) => f.hodnota === t.typ)?.popis ?? t.typ}
                    {t.datum_start ? ` · ${formatujDatum(t.datum_start)}` : ''}
                  </span>
                </div>
              </div>
              <div className="cw-turn__stitky">
                <Badge ton={stav(t)?.ton ?? 'neutral'}>{stav(t)?.popis ?? t.status}</Badge>
                {!t.zobrazit_na_webe && <Badge>Skrytý</Badge>}
                {t.vitaz_nazov && <Badge ton="warning">🏆 {t.vitaz_nazov}</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        otvorene={novy !== null}
        onZavri={() => setNovy(null)}
        nadpis="Nový turnaj"
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setNovy(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={zaloz} nacitava={uklada}>
              Založiť a pokračovať
            </Button>
          </>
        }
      >
        {novy && (
          <>
            <Input
              menovka="Názov turnaja"
              value={novy.nazov}
              onChange={(e) => setNovy((n) => ({ ...n!, nazov: e.target.value }))}
              placeholder="Letný turnaj U11"
              povinne
            />
            <Select
              menovka="Formát"
              value={novy.typ}
              onChange={(e) => setNovy((n) => ({ ...n!, typ: e.target.value as TypTurnaja }))}
              moznosti={FORMATY.map((f) => ({ hodnota: f.hodnota, popis: f.popis }))}
              napoveda={FORMATY.find((f) => f.hodnota === novy.typ)?.vysvetlenie}
            />
            <Select
              menovka="Sezóna"
              value={novy.sezona_id ?? ''}
              onChange={(e) => setNovy((n) => ({ ...n!, sezona_id: e.target.value ? Number(e.target.value) : null }))}
              prazdna="Bez sezóny"
              moznosti={(sezony.data ?? []).map((s) => ({ hodnota: s.id, popis: s.nazov }))}
            />
            <Input
              menovka="Začiatok"
              type="date"
              value={novy.datum_start}
              onChange={(e) => setNovy((n) => ({ ...n!, datum_start: e.target.value }))}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default Turnaje;
