// Umiestnenie: frontend/src/pages/admin/Pouzivatelia.tsx
// Správa používateľov administrácie.

import React, { useState } from 'react';
import {
  PageHeader, Card, Button, Badge, Icon, DataTable, Modal, Input, Select, Switch,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { pouzivateliaApi } from '../../api/sprava';
import { timyApi } from '../../api/sport';
import { formatujDatumCas } from '../../utils/datum';
import { useAuth } from '../../app/AuthContext';
import type { Pouzivatel, RolaPouzivatela } from '../../api/typy';
import './Pouzivatelia.css';

const ROLE: Array<{ hodnota: RolaPouzivatela; popis: string; ton: TonStitka; vysvetlenie: string }> = [
  { hodnota: 'admin', popis: 'Administrátor', ton: 'danger', vysvetlenie: 'Plný prístup vrátane nastavení a používateľov' },
  { hodnota: 'redaktor', popis: 'Redaktor', ton: 'primary', vysvetlenie: 'Články, zápasy, hráči a tímy' },
  { hodnota: 'trener', popis: 'Tréner', ton: 'info', vysvetlenie: 'Zápasy a súpiska vlastného tímu' },
  { hodnota: 'uzivatel', popis: 'Používateľ', ton: 'neutral', vysvetlenie: 'Iba čítanie' },
];

interface FormularPouzivatela extends Partial<Pouzivatel> {
  heslo?: string;
}

const PRAZDNY: FormularPouzivatela = {
  meno: '',
  email: '',
  rola: 'redaktor',
  tim_id: null,
  aktivity: true,
  heslo: '',
};

export const Pouzivatelia: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const { pouzivatel: prihlaseny } = useAuth();

  const [upravovany, setUpravovany] = useState<FormularPouzivatela | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Pouzivatel | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const pouzivatelia = useNacitanie((signal) => pouzivateliaApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));

  const zoznam = pouzivatelia.data ?? [];
  const zoznamTimov = timy.data ?? [];

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.meno?.trim()) {
      varovanie('Zadajte meno');
      return;
    }
    if (!upravovany.email?.trim()) {
      varovanie('Zadajte e-mail');
      return;
    }
    // Heslo je povinné len pri novom účte — pri úprave znamená prázdne
    // pole „nemeniť"
    if (jeNovy && !upravovany.heslo) {
      varovanie('Zadajte heslo pre nový účet');
      return;
    }

    setUklada(true);
    try {
      if (jeNovy) {
        await pouzivateliaApi.vytvor({
          meno: upravovany.meno,
          email: upravovany.email,
          rola: upravovany.rola,
          tim_id: upravovany.tim_id ?? null,
          heslo: upravovany.heslo!,
        });
        uspech('Používateľ bol vytvorený');
      } else {
        const zmeny: FormularPouzivatela = {
          meno: upravovany.meno,
          email: upravovany.email,
          rola: upravovany.rola,
          tim_id: upravovany.tim_id ?? null,
          aktivity: upravovany.aktivity,
        };
        // Heslo pošleme len ak ho správca naozaj zmenil
        if (upravovany.heslo) zmeny.heslo = upravovany.heslo;

        await pouzivateliaApi.uprav(upravovany.id!, zmeny);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      pouzivatelia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Používateľa sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await pouzivateliaApi.zmaz(naZmazanie.id);
      uspech('Používateľ bol vymazaný');
      setNaZmazanie(null);
      pouzivatelia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Používateľa sa nepodarilo vymazať');
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Pouzivatel>[] = [
    {
      kluc: 'meno',
      popis: 'Používateľ',
      obsah: (u) => (
        <div className="cw-pouzivatelia__osoba">
          <span className="cw-pouzivatelia__avatar" aria-hidden="true">
            {u.meno.split(' ').map((c) => c.charAt(0)).slice(0, 2).join('').toUpperCase()}
          </span>
          <span className="cw-pouzivatelia__udaje">
            <span className="cw-pouzivatelia__meno">
              {u.meno}
              {/* Vlastný účet zvýrazníme — pomáha vyhnúť sa omylom */}
              {u.id === prihlaseny?.id && <span className="cw-pouzivatelia__ja">vy</span>}
            </span>
            <span className="cw-pouzivatelia__email">{u.email}</span>
          </span>
        </div>
      ),
      hodnotaNaZoradenie: (u) => u.meno,
    },
    {
      kluc: 'rola',
      popis: 'Rola',
      obsah: (u) => {
        const r = ROLE.find((x) => x.hodnota === u.rola);
        return <Badge ton={r?.ton ?? 'neutral'}>{r?.popis ?? u.rola}</Badge>;
      },
      hodnotaNaZoradenie: (u) => u.rola,
      sirka: '150px',
    },
    {
      kluc: 'tim',
      popis: 'Tím',
      obsah: (u) => {
        const t = zoznamTimov.find((x) => x.id === u.tim_id);
        return t ? t.nazov : <span style={{ color: 'var(--muted)' }}>—</span>;
      },
      sirka: '160px',
      skryTNaMobile: true,
    },
    {
      kluc: 'stav',
      popis: 'Stav',
      obsah: (u) =>
        u.aktivity ? <Badge ton="success">Aktívny</Badge> : <Badge>Deaktivovaný</Badge>,
      hodnotaNaZoradenie: (u) => (u.aktivity ? 1 : 0),
      sirka: '130px',
    },
    {
      kluc: 'prihlasenie',
      popis: 'Naposledy prihlásený',
      obsah: (u) => (
        <span style={{ color: 'var(--muted)' }}>
          {u.posledne_prihlasenie ? formatujDatumCas(u.posledne_prihlasenie) : 'nikdy'}
        </span>
      ),
      hodnotaNaZoradenie: (u) =>
        u.posledne_prihlasenie ? new Date(u.posledne_prihlasenie).getTime() : 0,
      sirka: '180px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<Pouzivatel>[] = [
    { popis: 'Upraviť', ikona: 'upravit', onKlik: (u) => setUpravovany({ ...u, heslo: '' }) },
    {
      popis: 'Vymazať',
      ikona: 'zmazat',
      nebezpecna: true,
      // Vlastný účet sa zmazať nedá — správca by sa odstrihol od systému
      zobrazit: (u) => u.id !== prihlaseny?.id,
      onKlik: (u) => setNaZmazanie(u),
    },
  ];

  return (
    <>
      <PageHeader
        nadpis="Používatelia"
        podnadpis="Účty s prístupom do administrácie."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
            Nový používateľ
          </Button>
        }
      />

      <DataTable<Pouzivatel>
        data={zoznam}
        idZaznamu={(u) => u.id}
        stlpce={stlpce}
        nacitava={pouzivatelia.nacitava}
        chyba={pouzivatelia.chyba}
        onSkusZnova={pouzivatelia.obnov}
        hladatV={(u) => `${u.meno} ${u.email}`}
        hladatPlaceholder="Hľadať podľa mena alebo e-mailu…"
        filtre={[
          { kluc: 'rola', popis: 'Všetky role', moznosti: ROLE.map((r) => ({ hodnota: r.hodnota, popis: r.popis })) },
          {
            kluc: 'stav',
            popis: 'Všetky stavy',
            moznosti: [
              { hodnota: 'aktivny', popis: 'Aktívni' },
              { hodnota: 'neaktivny', popis: 'Deaktivovaní' },
            ],
          },
        ]}
        filtrujZaznam={(u, kluc, hodnota) => {
          if (kluc === 'rola') return u.rola === hodnota;
          if (kluc === 'stav') return hodnota === 'aktivny' ? u.aktivity : !u.aktivity;
          return true;
        }}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(u) => setUpravovany({ ...u, heslo: '' })}
        prazdnyNadpis="Žiadni používatelia"
      />

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový používateľ' : upravovany?.meno ?? 'Používateľ'}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? 'Vytvoriť účet' : 'Uložiť zmeny'}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            <Input
              menovka="Meno a priezvisko"
              value={upravovany.meno ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, meno: e.target.value }))}
              povinne
            />

            <Input
              menovka="E-mail"
              type="email"
              value={upravovany.email ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, email: e.target.value }))}
              povinne
              autoComplete="off"
            />

            <Input
              menovka={jeNovy ? 'Heslo' : 'Nové heslo'}
              type="password"
              value={upravovany.heslo ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, heslo: e.target.value }))}
              povinne={jeNovy}
              autoComplete="new-password"
              napoveda={
                jeNovy
                  ? 'Aspoň 10 znakov. Dlhá zapamätateľná fráza je bezpečnejšia než krátka zmes znakov.'
                  : 'Nechajte prázdne, ak heslo nemeníte'
              }
            />

            <Select
              menovka="Rola"
              value={upravovany.rola ?? 'redaktor'}
              onChange={(e) => setUpravovany((d) => ({ ...d!, rola: e.target.value as RolaPouzivatela }))}
              moznosti={ROLE.map((r) => ({ hodnota: r.hodnota, popis: r.popis }))}
              napoveda={ROLE.find((r) => r.hodnota === upravovany.rola)?.vysvetlenie}
            />

            {/* Tím má zmysel len pri trénerovi */}
            {upravovany.rola === 'trener' && (
              <Select
                menovka="Tím trénera"
                value={upravovany.tim_id ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, tim_id: e.target.value ? Number(e.target.value) : null }))
                }
                prazdna="Bez zaradenia"
                moznosti={zoznamTimov.map((t) => ({
                  hodnota: t.id,
                  popis: `${t.nazov} (${t.vekova_kategoria})`,
                }))}
              />
            )}

            {!jeNovy && (
              <Switch
                zapnute={Boolean(upravovany.aktivity)}
                onZmena={(v) => setUpravovany((d) => ({ ...d!, aktivity: v }))}
                menovka="Aktívny účet"
                popis="Deaktivovaný používateľ sa nemôže prihlásiť a existujúce relácie sa zrušia"
                // Vlastný účet nesmie správca deaktivovať
                disabled={upravovany.id === prihlaseny?.id}
              />
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Vymazať používateľa?"
        sprava={`Účet ${naZmazanie?.meno} (${naZmazanie?.email}) bude odstránený. Články, ktoré napísal, zostanú zachované.`}
        potvrdit="Vymazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </>
  );
};

export default Pouzivatelia;
