// Umiestnenie: frontend/src/pages/admin/Pouzivatelia.tsx
// Správa používateľov administrácie.

import React, { useState } from 'react';
import {
  PageHeader, Card, Button, Badge, Icon, DataTable, Modal, Input, Select, Switch,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { pouzivateliaApi, rolyApi } from '../../api/sprava';
import { FilterChips } from '../../ui';
import { RolyOpravnenia } from './RolyOpravnenia';
import { timyApi } from '../../api/sport';
import { formatujDatumCas } from '../../utils/datum';
import { useAuth } from '../../app/AuthContext';
import type { Pouzivatel, RolaSOpravneniami } from '../../api/typy';
import { tr } from '../../i18n';
import './Pouzivatelia.css';

/** Farba štítku podľa kódu roly; vlastné roly sú neutrálne. */
const TON_ROLY: Record<string, TonStitka> = { admin: 'danger', redaktor: 'primary', trener: 'info', uzivatel: 'neutral' };

interface FormularPouzivatela extends Partial<Pouzivatel> {
  heslo?: string;
}

const PRAZDNY: FormularPouzivatela = {
  meno: '',
  priezvisko: '',
  email: '',
  rola_id: null,
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

  const [karta, setKarta] = useState<'pouzivatelia' | 'roly'>('pouzivatelia');
  const pouzivatelia = useNacitanie((signal) => pouzivateliaApi.vypis(signal));
  const roly = useNacitanie((signal) => rolyApi.vypis(signal));
  const zoznamRol: RolaSOpravneniami[] = roly.data?.roly ?? [];
  const jeSpravca = prihlaseny?.rola === 'admin';
  // Rolu Správca smie prideliť len správca
  const ponukaRol = zoznamRol.filter((r) => jeSpravca || r.kod !== 'admin');
  const rolaPouzivatela = (u: Pick<Pouzivatel, 'rola' | 'rola_id'>) =>
    zoznamRol.find((r) => r.id === u.rola_id) ?? zoznamRol.find((r) => r.kod === u.rola);
  const zvolenaRola = upravovany ? zoznamRol.find((r) => r.id === upravovany.rola_id) : undefined;
  // Tím má zmysel pri trénerských roliach (vidia tímy, ale nie všetko)
  const ukazTim = Boolean(zvolenaRola && zvolenaRola.kod !== 'admin' && zvolenaRola.opravnenia?.timy?.citat);
  const timy = useNacitanie((signal) => timyApi.vypis(signal));

  const zoznam = pouzivatelia.data ?? [];
  const zoznamTimov = timy.data ?? [];

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if (!upravovany.meno?.trim()) {
      varovanie(tr('Zadajte meno'));
      return;
    }
    if (!upravovany.rola_id) {
      varovanie(tr('Vyberte rolu'));
      return;
    }
    if (!upravovany.email?.trim()) {
      varovanie(tr('Zadajte e-mail'));
      return;
    }
    // Heslo je povinné len pri novom účte — pri úprave znamená prázdne
    // pole „nemeniť"
    if (jeNovy && !upravovany.heslo) {
      varovanie(tr('Zadajte heslo pre nový účet'));
      return;
    }

    setUklada(true);
    try {
      if (jeNovy) {
        await pouzivateliaApi.vytvor({
          meno: upravovany.meno.trim(),
          priezvisko: upravovany.priezvisko?.trim() || null,
          email: upravovany.email,
          rola_id: upravovany.rola_id,
          tim_id: upravovany.tim_id ?? null,
          heslo: upravovany.heslo!,
        });
        uspech(tr('Používateľ bol vytvorený'));
      } else {
        const zmeny: FormularPouzivatela = {
          meno: upravovany.meno.trim(),
          priezvisko: upravovany.priezvisko?.trim() || null,
          email: upravovany.email,
          rola_id: upravovany.rola_id,
          tim_id: upravovany.tim_id ?? null,
          aktivity: upravovany.aktivity,
        };
        // Heslo pošleme len ak ho správca naozaj zmenil
        if (upravovany.heslo) zmeny.heslo = upravovany.heslo;

        await pouzivateliaApi.uprav(upravovany.id!, zmeny);
        uspech(tr('Zmeny boli uložené'));
      }
      setUpravovany(null);
      pouzivatelia.obnov();
      roly.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Používateľa sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await pouzivateliaApi.zmaz(naZmazanie.id);
      uspech(tr('Používateľ bol vymazaný'));
      setNaZmazanie(null);
      pouzivatelia.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Používateľa sa nepodarilo vymazať'));
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Pouzivatel>[] = [
    {
      kluc: 'meno',
      popis: tr('Používateľ'),
      obsah: (u) => (
        <div className="cw-pouzivatelia__osoba">
          <span className="cw-pouzivatelia__avatar" aria-hidden="true">
            {`${u.meno} ${u.priezvisko ?? ''}`.trim().split(/\s+/).map((c) => c.charAt(0)).slice(0, 2).join('').toUpperCase()}
          </span>
          <span className="cw-pouzivatelia__udaje">
            <span className="cw-pouzivatelia__meno">
              {u.meno} {u.priezvisko ?? ''}
              {/* Vlastný účet zvýrazníme — pomáha vyhnúť sa omylom */}
              {u.id === prihlaseny?.id && <span className="cw-pouzivatelia__ja">{tr('vy')}</span>}
            </span>
            <span className="cw-pouzivatelia__email">{u.email}</span>
          </span>
        </div>
      ),
      hodnotaNaZoradenie: (u) => `${u.priezvisko ?? ''} ${u.meno}`,
    },
    {
      kluc: 'rola',
      popis: tr('Rola'),
      obsah: (u) => {
        const r = rolaPouzivatela(u);
        return <Badge ton={TON_ROLY[r?.kod ?? u.rola] ?? 'neutral'}>{r ? tr(r.nazov) : u.rola}</Badge>;
      },
      hodnotaNaZoradenie: (u) => rolaPouzivatela(u)?.nazov ?? u.rola,
      sirka: '150px',
    },
    {
      kluc: 'tim',
      popis: tr('Tím'),
      obsah: (u) => {
        const t = zoznamTimov.find((x) => x.id === u.tim_id);
        return t ? t.nazov : <span style={{ color: 'var(--muted)' }}>—</span>;
      },
      sirka: '160px',
      skryTNaMobile: true,
    },
    {
      kluc: 'stav',
      popis: tr('Stav'),
      obsah: (u) =>
        u.aktivity ? <Badge ton="success">{tr('Aktívny')}</Badge> : <Badge>{tr('Deaktivovaný')}</Badge>,
      hodnotaNaZoradenie: (u) => (u.aktivity ? 1 : 0),
      sirka: '130px',
    },
    {
      kluc: 'prihlasenie',
      popis: tr('Naposledy prihlásený'),
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
    { popis: tr('Upraviť'), ikona: 'upravit', onKlik: (u) => setUpravovany({ ...u, heslo: '' }) },
    {
      popis: tr('Vymazať'),
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
        nadpis={tr('Používatelia')}
        podnadpis={tr('Účty s prístupom do administrácie a roly s oprávneniami.')}
        akcie={
          karta === 'pouzivatelia' ? (
            <Button
              ikona={<Icon nazov="plus" velkost={15} />}
              onClick={() => setUpravovany({ ...PRAZDNY, rola_id: zoznamRol.find((r) => r.kod === 'redaktor')?.id ?? null })}
            >
              {tr('Nový používateľ')}
            </Button>
          ) : undefined
        }
      />

      <div className="cw-pouzivatelia__karty">
        <FilterChips
          popisSkupiny={tr('Časť obrazovky')}
          moznosti={[
            { hodnota: 'pouzivatelia', popis: tr('Používatelia'), pocet: zoznam.length },
            { hodnota: 'roly', popis: tr('Roly a oprávnenia'), pocet: zoznamRol.length },
          ]}
          zvolena={karta}
          onZmena={(h) => setKarta(h as 'pouzivatelia' | 'roly')}
        />
      </div>

      {karta === 'roly' ? (
        <RolyOpravnenia smieUpravovat={jeSpravca} onZmena={() => { roly.obnov(); pouzivatelia.obnov(); }} />
      ) : (
      <>

      <DataTable<Pouzivatel>
        data={zoznam}
        idZaznamu={(u) => u.id}
        stlpce={stlpce}
        nacitava={pouzivatelia.nacitava}
        chyba={pouzivatelia.chyba}
        onSkusZnova={pouzivatelia.obnov}
        hladatV={(u) => `${u.meno} ${u.priezvisko ?? ''} ${u.email}`}
        hladatPlaceholder={tr('Hľadať podľa mena alebo e-mailu…')}
        filtre={[
          { kluc: 'rola', popis: tr('Všetky roly'), moznosti: zoznamRol.map((r) => ({ hodnota: String(r.id), popis: tr(r.nazov) })) },
          {
            kluc: 'stav',
            popis: tr('Všetky stavy'),
            moznosti: [
              { hodnota: 'aktivny', popis: tr('Aktívni') },
              { hodnota: 'neaktivny', popis: tr('Deaktivovaní') },
            ],
          },
        ]}
        filtrujZaznam={(u, kluc, hodnota) => {
          if (kluc === 'rola') return String(rolaPouzivatela(u)?.id) === hodnota;
          if (kluc === 'stav') return hodnota === 'aktivny' ? u.aktivity : !u.aktivity;
          return true;
        }}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(u) => setUpravovany({ ...u, heslo: '' })}
        prazdnyNadpis={tr('Žiadni používatelia')}
      />
      </>
      )}

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? tr('Nový používateľ') : `${upravovany?.meno ?? ''} ${upravovany?.priezvisko ?? ''}`.trim() || tr('Používateľ')}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? tr('Vytvoriť účet') : tr('Uložiť zmeny')}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            <div className="cw-pouzivatelia__riadok">
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
              />
            </div>

            <Input
              menovka="E-mail"
              type="email"
              value={upravovany.email ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, email: e.target.value }))}
              povinne
              autoComplete="off"
            />

            <Input
              menovka={jeNovy ? tr('Heslo') : tr('Nové heslo')}
              type="password"
              value={upravovany.heslo ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, heslo: e.target.value }))}
              povinne={jeNovy}
              autoComplete="new-password"
              napoveda={
                jeNovy
                  ? tr('Aspoň 10 znakov. Dlhá zapamätateľná fráza je bezpečnejšia než krátka zmes znakov.')
                  : tr('Nechajte prázdne, ak heslo nemeníte')
              }
            />

            <Select
              menovka={tr('Rola')}
              value={upravovany.rola_id ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, rola_id: e.target.value ? Number(e.target.value) : null }))}
              prazdna={tr('Vyberte rolu')}
              moznosti={ponukaRol.map((r) => ({ hodnota: r.id, popis: r.nazov }))}
              napoveda={zvolenaRola?.popis ?? tr('Oprávnenia rolí nastavíte v časti Roly a oprávnenia')}
              povinne
              disabled={!jeSpravca && upravovany.rola === 'admin'}
            />

            {/* Tím má zmysel pri trénerských roliach */}
            {ukazTim && (
              <Select
                menovka={tr('Tím trénera')}
                value={upravovany.tim_id ?? ''}
                onChange={(e) =>
                  setUpravovany((d) => ({ ...d!, tim_id: e.target.value ? Number(e.target.value) : null }))
                }
                prazdna={tr('Bez zaradenia')}
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
                menovka={tr('Aktívny účet')}
                popis={tr('Deaktivovaný používateľ sa nemôže prihlásiť a existujúce relácie sa zrušia')}
                // Vlastný účet nesmie správca deaktivovať
                disabled={upravovany.id === prihlaseny?.id}
              />
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Vymazať používateľa?')}
        sprava={tr('Účet {meno} {hodnota} ({email}) bude odstránený. Články, ktoré napísal, zostanú zachované.', { meno: naZmazanie?.meno, hodnota: naZmazanie?.priezvisko ?? '', email: naZmazanie?.email })}
        potvrdit={tr('Vymazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </>
  );
};

export default Pouzivatelia;
