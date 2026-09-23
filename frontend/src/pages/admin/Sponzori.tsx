// Umiestnenie: frontend/src/pages/admin/Sponzori.tsx
// Sponzori a partneri klubu.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Select, Textarea, Switch,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { sponzoriApi, urovneSponzorovApi } from '../../api/klub';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import { formatujDatum } from '../../utils/datum';
import type { Sponzor, UrovenPartnerstva, VelkostLoga } from '../../api/typy';
import './Sponzori.css';

/** 1 sponzor, 2 sponzori, 5 sponzorov */
const pocetSponzorov = (n: number) => `${n} ${n === 1 ? 'sponzor' : n >= 2 && n <= 4 ? 'sponzori' : 'sponzorov'}`;

/** Farby štítkov úrovní - podľa poradia úrovne. */
const TONY: TonStitka[] = ['danger', 'primary', 'info', 'success', 'warning', 'neutral'];

export const VELKOSTI_LOGA: Array<{ hodnota: VelkostLoga; popis: string }> = [
  { hodnota: 'velke', popis: 'Veľké logo' },
  { hodnota: 'stredne', popis: 'Stredné logo' },
  { hodnota: 'male', popis: 'Malé logo' },
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
  uroven_id: null,
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
  const urovne = useNacitanie((signal) => urovneSponzorovApi.vypis(signal));
  const zoznamUrovni = [...(urovne.data ?? [])].sort((a, b) => a.poradie - b.poradie || a.nazov.localeCompare(b.nazov, 'sk'));

  // ===== Správa úrovní =====
  const [urovneOtvorene, setUrovneOtvorene] = useState(false);
  const [upravovanaUroven, setUpravovanaUroven] = useState<UrovenPartnerstva | null>(null);
  const [novaUroven, setNovaUroven] = useState<{ nazov: string; popis: string; velkost_loga: VelkostLoga }>({
    nazov: '',
    popis: '',
    velkost_loga: 'stredne',
  });

  const pocetVUrovni = (id: number) => zoznam.filter((s) => s.uroven_id === id).length;

  const pridajUroven = async () => {
    if (novaUroven.nazov.trim().length < 2) return varovanie('Názov úrovne musí mať aspoň 2 znaky');
    try {
      await urovneSponzorovApi.vytvor({
        nazov: novaUroven.nazov.trim(),
        popis: novaUroven.popis.trim() || null,
        velkost_loga: novaUroven.velkost_loga,
        poradie: (zoznamUrovni[zoznamUrovni.length - 1]?.poradie ?? 0) + 1,
      });
      setNovaUroven({ nazov: '', popis: '', velkost_loga: 'stredne' });
      urovne.obnov();
      uspech('Úroveň bola pridaná');
    } catch (e: any) {
      hlasChybu(e?.status === 409 || /existuje/.test(e?.message) ? 'Úroveň s takým názvom už existuje' : e?.message || 'Úroveň sa nepodarilo pridať');
    }
  };

  const ulozUroven = async () => {
    if (!upravovanaUroven) return;
    if (upravovanaUroven.nazov.trim().length < 2) return varovanie('Názov úrovne musí mať aspoň 2 znaky');
    try {
      await urovneSponzorovApi.uprav(upravovanaUroven.id, {
        nazov: upravovanaUroven.nazov.trim(),
        popis: upravovanaUroven.popis?.trim() || null,
        velkost_loga: upravovanaUroven.velkost_loga,
      });
      setUpravovanaUroven(null);
      urovne.obnov();
      uspech('Úroveň bola uložená');
    } catch (e: any) {
      hlasChybu(e?.message || 'Úroveň sa nepodarilo uložiť');
    }
  };

  const presunUroven = async (index: number, smer: -1 | 1) => {
    const a = zoznamUrovni[index];
    const b = zoznamUrovni[index + smer];
    if (!a || !b) return;
    try {
      // Poradie prečíslujeme celé, aby rovnaké čísla nerobili problém
      const nove = [...zoznamUrovni];
      [nove[index], nove[index + smer]] = [b, a];
      await Promise.all(
        nove.map((u, i) => (u.poradie !== i + 1 ? urovneSponzorovApi.uprav(u.id, { poradie: i + 1 }) : null))
      );
      urovne.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Poradie sa nepodarilo zmeniť');
    }
  };

  const zmazUroven = async (u: UrovenPartnerstva) => {
    const pocet = pocetVUrovni(u.id);
    if (!window.confirm(pocet ? `Úroveň ${u.nazov} má ${pocet} sponzorov - zostanú bez úrovne. Zmazať?` : `Zmazať úroveň ${u.nazov}?`)) return;
    try {
      await urovneSponzorovApi.zmaz(u.id);
      urovne.obnov();
      sponzori.obnov();
      uspech('Úroveň bola zmazaná');
    } catch (e: any) {
      hlasChybu(e?.message || 'Úroveň sa nepodarilo zmazať');
    }
  };

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
  const podlaUrovne = [
    ...zoznamUrovni.map((u, i) => ({
      kluc: String(u.id),
      popis: u.nazov,
      ton: TONY[i % TONY.length],
      sponzori: zoznam.filter((s) => s.uroven_id === u.id),
    })),
    {
      kluc: 'bez',
      popis: 'Bez úrovne',
      ton: 'neutral' as TonStitka,
      sponzori: zoznam.filter((s) => !s.uroven_id || !zoznamUrovni.some((u) => u.id === s.uroven_id)),
    },
  ].filter((sk) => sk.sponzori.length > 0);

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Sponzori"
        podnadpis="Partneri klubu podľa úrovne partnerstva. Na webe sú na adrese /sponzori."
        akcie={
          <>
            <Button variant="secondary" onClick={() => setUrovneOtvorene(true)}>
              Úrovne partnerstva
            </Button>
            <Button
              ikona={<Icon nazov="plus" velkost={17} />}
              onClick={() => setUpravovany({ ...PRAZDNY, uroven_id: zoznamUrovni[zoznamUrovni.length - 1]?.id ?? null })}
            >
              Nový sponzor
            </Button>
          </>
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
        podlaUrovne.map(({ kluc, popis, ton, sponzori: skupina }) => (
          <section key={kluc} className="cw-spon__skupina">
            <div className="cw-spon__skupina-hlava">
              <Badge ton={ton}>{popis}</Badge>
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
              value={upravovany.uroven_id ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, uroven_id: e.target.value ? Number(e.target.value) : null }))}
              prazdna="Bez úrovne"
              moznosti={zoznamUrovni.map((u) => ({ hodnota: u.id, popis: u.nazov }))}
              napoveda="Určuje poradie a veľkosť loga na webe. Úrovne spravujete tlačidlom Úrovne partnerstva."
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

      {/* ===== Úrovne partnerstva ===== */}
      <Modal otvorene={urovneOtvorene} onZavri={() => setUrovneOtvorene(false)} nadpis="Úrovne partnerstva">
        <p className="cw-spon__urovne-popis">Poradie úrovní určuje poradie skupín na webe. Veľkosť loga platí pre všetkých sponzorov úrovne.</p>
        <ul className="cw-spon__urovne">
          {zoznamUrovni.length === 0 && <li className="cw-spon__urovne-prazdne">Zatiaľ žiadne úrovne.</li>}
          {zoznamUrovni.map((u, i) =>
            upravovanaUroven?.id === u.id ? (
              <li key={u.id} className="cw-spon__uroven-uprava">
                <Input menovka="Názov" value={upravovanaUroven.nazov} onChange={(e) => setUpravovanaUroven({ ...upravovanaUroven, nazov: e.target.value })} />
                <Input menovka="Popis" value={upravovanaUroven.popis ?? ''} onChange={(e) => setUpravovanaUroven({ ...upravovanaUroven, popis: e.target.value })} />
                <Select
                  menovka="Veľkosť loga"
                  value={upravovanaUroven.velkost_loga}
                  onChange={(e) => setUpravovanaUroven({ ...upravovanaUroven, velkost_loga: e.target.value as VelkostLoga })}
                  moznosti={VELKOSTI_LOGA}
                />
                <div className="cw-spon__uroven-akcie">
                  <Button velkost="sm" variant="secondary" onClick={() => setUpravovanaUroven(null)}>Zrušiť</Button>
                  <Button velkost="sm" onClick={ulozUroven}>Uložiť</Button>
                </div>
              </li>
            ) : (
              <li key={u.id}>
                <div className="cw-spon__uroven-text">
                  <strong>{u.nazov}</strong>
                  <span>
                    {VELKOSTI_LOGA.find((v) => v.hodnota === u.velkost_loga)?.popis} · {pocetSponzorov(pocetVUrovni(u.id))}
                    {u.popis ? ` · ${u.popis}` : ''}
                  </span>
                </div>
                <div className="cw-spon__uroven-akcie">
                  <Button velkost="sm" variant="ghost" disabled={i === 0} onClick={() => presunUroven(i, -1)} aria-label={`Posunúť ${u.nazov} vyššie`}>↑</Button>
                  <Button velkost="sm" variant="ghost" disabled={i === zoznamUrovni.length - 1} onClick={() => presunUroven(i, 1)} aria-label={`Posunúť ${u.nazov} nižšie`}>↓</Button>
                  <Button velkost="sm" variant="ghost" onClick={() => setUpravovanaUroven({ ...u })} aria-label={`Upraviť ${u.nazov}`}>
                    <Icon nazov="upravit" velkost={14} />
                  </Button>
                  <Button velkost="sm" variant="ghost" onClick={() => zmazUroven(u)} aria-label={`Zmazať ${u.nazov}`}>
                    <Icon nazov="zmazat" velkost={14} />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
        <div className="cw-spon__nova-uroven">
          <Input menovka="Nová úroveň" value={novaUroven.nazov} onChange={(e) => setNovaUroven((n) => ({ ...n, nazov: e.target.value }))} placeholder="Mediálny partner" />
          <Input menovka="Popis úrovne" value={novaUroven.popis} onChange={(e) => setNovaUroven((n) => ({ ...n, popis: e.target.value }))} />
          <Select
            menovka="Veľkosť loga novej úrovne"
            value={novaUroven.velkost_loga}
            onChange={(e) => setNovaUroven((n) => ({ ...n, velkost_loga: e.target.value as VelkostLoga }))}
            moznosti={VELKOSTI_LOGA}
          />
          <Button onClick={pridajUroven} ikona={<Icon nazov="plus" velkost={14} />}>Pridať úroveň</Button>
        </div>
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
