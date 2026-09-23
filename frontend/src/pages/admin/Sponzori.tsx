// Umiestnenie: frontend/src/pages/admin/Sponzori.tsx
// Sponzori a partneri klubu.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Select, Textarea, Switch,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { sponzoriApi } from '../../api/klub';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import { formatujDatum } from '../../utils/datum';
import type { Sponzor, UrovenSponzora } from '../../api/typy';
import './Sponzori.css';

/** Úrovne partnerstva — určujú veľkosť loga na verejnom webe. */
const UROVNE: Array<{ hodnota: UrovenSponzora; popis: string; ton: TonStitka }> = [
  { hodnota: 'generalny', popis: 'Generálny partner', ton: 'danger' },
  { hodnota: 'hlavny', popis: 'Hlavný partner', ton: 'primary' },
  { hodnota: 'partner', popis: 'Partner', ton: 'info' },
  { hodnota: 'dodavatel', popis: 'Dodávateľ', ton: 'neutral' },
];

/** Stav partnerstva podľa dátumov - na webe sa ukážu len platní sponzori. */
export const stavPartnerstva = (s: Pick<Sponzor, 'platny_od' | 'platny_do' | 'aktivity'>) => {
  const dnes = new Date().toISOString().slice(0, 10);
  if (!s.aktivity) return { popis: 'Skrytý', ton: 'neutral' as TonStitka, naWebe: false };
  if (s.platny_do && s.platny_do.slice(0, 10) < dnes) return { popis: 'Partnerstvo skončilo', ton: 'warning' as TonStitka, naWebe: false };
  if (s.platny_od && s.platny_od.slice(0, 10) > dnes) return { popis: 'Začne ' + formatujDatum(s.platny_od), ton: 'info' as TonStitka, naWebe: false };
  return { popis: 'Na webe', ton: 'success' as TonStitka, naWebe: true };
};

const PRAZDNY: Partial<Sponzor> = {
  nazov: '',
  uroven: 'partner',
  logo: '',
  web_url: '',
  popis: '',
  poradie: 0,
  aktivity: true,
};

export const Sponzori: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<Sponzor> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Sponzor | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const sponzori = useNacitanie((signal) => sponzoriApi.vypis(signal));
  const zoznam = sponzori.data ?? [];

  const jeNovy = upravovany !== null && !upravovany.id;

  const uloz = async () => {
    if (!upravovany) return;

    if ((upravovany.nazov?.trim().length ?? 0) < 2) {
      varovanie('Názov sponzora musí mať aspoň 2 znaky');
      return;
    }
    if (upravovany.platny_od && upravovany.platny_do && upravovany.platny_od > upravovany.platny_do) {
      varovanie('Partnerstvo nemôže skončiť skôr, ako začalo');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovany,
        logo: upravovany.logo?.trim() || null,
        web_url: upravovany.web_url?.trim() || null,
        popis: upravovany.popis?.trim() || null,
      };

      if (jeNovy) {
        await sponzoriApi.vytvor(naUlozenie);
        uspech('Sponzor bol pridaný');
      } else {
        await sponzoriApi.uprav(upravovany.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      sponzori.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Sponzora sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await sponzoriApi.zmaz(naZmazanie.id);
      uspech('Sponzor bol odstránený');
      setNaZmazanie(null);
      sponzori.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Sponzora sa nepodarilo odstrániť');
    } finally {
      setMaze(false);
    }
  };

  // Sponzorov zoskupíme podľa úrovne — tak sa zobrazujú aj na webe
  const podlaUrovne = UROVNE.map((u) => ({
    uroven: u,
    sponzori: zoznam.filter((s) => s.uroven === u.hodnota),
  })).filter((sk) => sk.sponzori.length > 0);

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Sponzori"
        podnadpis="Partneri klubu podľa úrovne partnerstva. Na webe sú na adrese /sponzori."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
            Nový sponzor
          </Button>
        }
      />

      {sponzori.chyba ? (
        <ErrorState sprava="Sponzorov sa nepodarilo načítať" detail={sponzori.chyba} onSkusZnova={sponzori.obnov} />
      ) : sponzori.nacitava ? (
        <div className="cw-spon__mriezka">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="cw-spon__karta">
              <Skeleton vyska="80px" />
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-spon__prazdne">
          <EmptyState
            ikona={<Icon nazov="licencia" velkost={40} />}
            nadpis="Zatiaľ žiadni sponzori"
            popis="Pridajte partnerov klubu — na webe sa zobrazia podľa úrovne partnerstva."
            akcia={<Button onClick={() => setUpravovany({ ...PRAZDNY })}>Pridať sponzora</Button>}
          />
        </div>
      ) : (
        podlaUrovne.map(({ uroven, sponzori: skupina }) => (
          <section key={uroven.hodnota} className="cw-spon__skupina">
            <div className="cw-spon__skupina-hlava">
              <Badge ton={uroven.ton}>{uroven.popis}</Badge>
              <span className="cw-spon__pocet">{skupina.length}</span>
            </div>

            <div className="cw-spon__mriezka">
              {skupina.map((s) => (
                <div key={s.id} className={`cw-spon__karta ${!stavPartnerstva(s).naWebe ? 'is-neaktivny' : ''}`}>
                  <div className="cw-spon__logo">
                    {s.logo ? (
                      <img
                        src={souborUrl(s.logo)}
                        alt=""
                        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                      />
                    ) : (
                      <span className="cw-spon__znak">{s.nazov.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="cw-spon__telo">
                    <div className="cw-spon__nazov">{s.nazov}</div>
                    {s.web_url && (
                      <a
                        href={s.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cw-spon__web"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.web_url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    <div className="cw-spon__stav">
                      <Badge ton={stavPartnerstva(s).ton}>{stavPartnerstva(s).popis}</Badge>
                      {(s.platny_od || s.platny_do) && (
                        <span>
                          {s.platny_od ? formatujDatum(s.platny_od) : '…'} – {s.platny_do ? formatujDatum(s.platny_do) : '…'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="cw-spon__akcie">
                    <button onClick={() => setUpravovany({ ...s })} aria-label={`Upraviť ${s.nazov}`}>
                      <Icon nazov="upravit" velkost={15} />
                    </button>
                    <button className="is-danger" onClick={() => setNaZmazanie(s)} aria-label={`Odstrániť ${s.nazov}`}>
                      <Icon nazov="zmazat" velkost={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový sponzor' : upravovany?.nazov ?? 'Sponzor'}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? 'Pridať' : 'Uložiť'}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            <Input
              menovka="Názov"
              value={upravovany.nazov ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="Napríklad: Tatra banka"
              povinne
            />

            <Select
              menovka="Úroveň partnerstva"
              value={upravovany.uroven ?? 'partner'}
              onChange={(e) => setUpravovany((d) => ({ ...d!, uroven: e.target.value as UrovenSponzora }))}
              moznosti={UROVNE.map((u) => ({ hodnota: u.hodnota, popis: u.popis }))}
              napoveda="Určuje veľkosť loga na verejnom webe"
            />

            <PoleObrazka
              menovka="Logo"
              hodnota={upravovany.logo}
              onZmena={(cesta) => setUpravovany((d) => ({ ...d!, logo: cesta }))}
              napoveda="Nahrajte nové alebo vyberte z knižnice médií"
            />

            <Input
              menovka="Webová stránka"
              value={upravovany.web_url ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, web_url: e.target.value }))}
              placeholder="https://firma.sk"
              napoveda="Stačí aj firma.sk - https:// sa doplní"
            />

            <Textarea
              menovka="Popis"
              value={upravovany.popis ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, popis: e.target.value }))}
              rows={2}
            />

            <div className="cw-spon__row">
              <Input
                menovka="Partnerstvo od"
                type="date"
                value={upravovany.platny_od?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, platny_od: e.target.value || null }))}
              />
              <Input
                menovka="Partnerstvo do"
                type="date"
                value={upravovany.platny_do?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovany((d) => ({ ...d!, platny_do: e.target.value || null }))}
              />
            </div>

            <Input
              menovka="Poradie"
              type="number"
              min={0}
              value={upravovany.poradie ?? 0}
              onChange={(e) => setUpravovany((d) => ({ ...d!, poradie: Number(e.target.value) }))}
              napoveda="Nižšie číslo = skôr v zozname"
            />

            <Switch
              zapnute={Boolean(upravovany.aktivity)}
              onZmena={(v) => setUpravovany((d) => ({ ...d!, aktivity: v }))}
              menovka="Zobraziť na webe"
              popis="Na webe sa zobrazí len počas obdobia partnerstva"
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Odstrániť sponzora?"
        sprava={`${naZmazanie?.nazov} bude odstránený zo zoznamu partnerov.`}
        potvrdit="Odstrániť"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Sponzori;
