// Umiestnenie: frontend/src/pages/admin/Kalendar.tsx
// Mesačný prehľad zápasov a vlastných udalostí klubu.
//
// Vlastné udalosti (tréning U12, schôdza výboru…) majú názov, popis, tím,
// dátum, čas, miesto a opakovanie. V kalendári sa zobrazujú vo farbe tímu.

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, Button, Badge, Icon, Skeleton, ErrorState, Modal, Input, Textarea, Select,
  ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { zapasyApi, timyApi, kalendarApi } from '../../api/sport';
import { formatujCas, formatujDatumDlho } from '../../utils/datum';
import type { Zapas, StavZapasu, UdalostKalendara, TypOpakovania } from '../../api/typy';
import './Kalendar.css';

const MESIACE = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December',
];

/** Skratky dní — týždeň začína pondelkom, ako je zvykom na Slovensku. */
const DNI = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

const TON_STAVU: Record<StavZapasu, 'info' | 'danger' | 'success' | 'warning' | 'neutral'> = {
  naplanovany: 'info',
  prebieha: 'danger',
  ukonceny: 'success',
  odlozeny: 'warning',
  zruseny: 'neutral',
};

const OPAKOVANIA: Array<{ hodnota: TypOpakovania; popis: string }> = [
  { hodnota: 'ziadne', popis: 'Neopakuje sa' },
  { hodnota: 'denne', popis: 'Každý deň' },
  { hodnota: 'tyzdenne', popis: 'Každý týždeň' },
  { hodnota: 'dvojtyzdenne', popis: 'Každé dva týždne' },
  { hodnota: 'mesacne', popis: 'Každý mesiac' },
];

const naKluc = (rok: number, mesiac: number, den: number) =>
  `${rok}-${String(mesiac + 1).padStart(2, '0')}-${String(den).padStart(2, '0')}`;

/** Čas z databázy (15:30:00) skrátime na 15:30. */
const kratkyCas = (cas: string | null | undefined) => (cas ? cas.slice(0, 5) : '');

interface FormularUdalosti {
  id?: number;
  nazov: string;
  popis: string;
  tim_id: number | null;
  datum: string;
  cas_od: string;
  cas_do: string;
  miesto: string;
  opakovanie: TypOpakovania;
  opakovanie_do: string;
}

export const Kalendar: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const [udalost, setUdalost] = useState<FormularUdalosti | null>(null);
  const [uklada, setUklada] = useState(false);
  const [naZmazanie, setNaZmazanie] = useState(false);
  const [maze, setMaze] = useState(false);

  // Zobrazený mesiac — začíname aktuálnym
  const [zobrazeny, setZobrazeny] = useState(() => {
    const d = new Date();
    return { rok: d.getFullYear(), mesiac: d.getMonth() };
  });

  const zapasy = useNacitanie((signal) => zapasyApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const zoznam = zapasy.data ?? [];

  // Výskyty udalostí v zobrazenom mesiaci (opakovanie rozvinie server)
  const rozsah = useMemo(() => {
    const { rok, mesiac } = zobrazeny;
    return { od: naKluc(rok, mesiac, 1), do: naKluc(rok, mesiac, new Date(rok, mesiac + 1, 0).getDate()) };
  }, [zobrazeny]);
  const udalosti = useNacitanie((signal) => kalendarApi.udalosti(rozsah.od, rozsah.do, signal), [rozsah.od, rozsah.do]);

  const udalostiPodlaDna = useMemo(() => {
    const mapa = new Map<string, UdalostKalendara[]>();
    for (const u of udalosti.data ?? []) {
      const kluc = u.datum_vyskytu ?? u.datum;
      if (!mapa.has(kluc)) mapa.set(kluc, []);
      mapa.get(kluc)!.push(u);
    }
    return mapa;
  }, [udalosti.data]);

  const farbaTimu = (u: UdalostKalendara) =>
    u.farba || u.tim?.farba || (timy.data ?? []).find((t) => t.id === u.tim_id)?.farba_prva || null;

  // ===== Udalosti: formulár =====

  const novaUdalost = (datum?: string) =>
    setUdalost({
      nazov: '', popis: '', tim_id: null, datum: datum ?? naKluc(zobrazeny.rok, zobrazeny.mesiac, 1),
      cas_od: '', cas_do: '', miesto: '', opakovanie: 'ziadne', opakovanie_do: '',
    });

  const otvorUdalost = async (u: UdalostKalendara) => {
    try {
      // Z výpisu máme výskyt; na úpravu treba pôvodné pravidlo celej série
      const plna = await kalendarApi.detail(u.id);
      setUdalost({
        id: plna.id,
        nazov: plna.nazov,
        popis: plna.popis ?? '',
        tim_id: plna.tim_id,
        datum: plna.datum,
        cas_od: kratkyCas(plna.cas_od),
        cas_do: kratkyCas(plna.cas_do),
        miesto: plna.miesto ?? '',
        opakovanie: plna.opakovanie,
        opakovanie_do: plna.opakovanie_do ?? '',
      });
    } catch (e: any) {
      hlasChybu(e?.message || 'Udalosť sa nepodarilo načítať');
    }
  };

  const ulozUdalost = async () => {
    if (!udalost) return;
    if (udalost.nazov.trim().length < 2) return varovanie('Názov udalosti musí mať aspoň 2 znaky');
    if (!udalost.datum) return varovanie('Zadajte dátum');
    if (udalost.cas_od && udalost.cas_do && udalost.cas_do < udalost.cas_od) return varovanie('Koniec nemôže byť skôr než začiatok');
    if (udalost.opakovanie !== 'ziadne' && udalost.opakovanie_do && udalost.opakovanie_do < udalost.datum) {
      return varovanie('Koniec opakovania nemôže byť skôr než dátum udalosti');
    }

    const udaje: Partial<UdalostKalendara> = {
      nazov: udalost.nazov.trim(),
      popis: udalost.popis.trim() || null,
      tim_id: udalost.tim_id,
      datum: udalost.datum,
      cas_od: udalost.cas_od || null,
      cas_do: udalost.cas_do || null,
      miesto: udalost.miesto.trim() || null,
      opakovanie: udalost.opakovanie,
      opakovanie_do: udalost.opakovanie === 'ziadne' ? null : udalost.opakovanie_do || null,
    };

    setUklada(true);
    try {
      if (udalost.id) await kalendarApi.uprav(udalost.id, udaje);
      else await kalendarApi.vytvor(udaje);
      uspech(udalost.id ? 'Udalosť bola uložená' : 'Udalosť bola pridaná');
      setUdalost(null);
      udalosti.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Udalosť sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmazUdalost = async () => {
    if (!udalost?.id) return;
    setMaze(true);
    try {
      await kalendarApi.zmaz(udalost.id);
      uspech('Udalosť bola zmazaná');
      setNaZmazanie(false);
      setUdalost(null);
      udalosti.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Udalosť sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  /** Zápasy zoskupené podľa dňa (kľúč vo tvare 2026-03-15). */
  const podlaDna = useMemo(() => {
    const mapa = new Map<string, Zapas[]>();

    for (const z of zoznam) {
      if (!z.datum_cas) continue;

      // Kľúč skladáme z miestneho času, nie z UTC — inak by zápas
      // o 23:30 spadol do nasledujúceho dňa
      const d = new Date(z.datum_cas);
      const kluc = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!mapa.has(kluc)) mapa.set(kluc, []);
      mapa.get(kluc)!.push(z);
    }

    // V rámci dňa zoradíme podľa času
    for (const zoznamDna of mapa.values()) {
      zoznamDna.sort((a, b) => new Date(a.datum_cas).getTime() - new Date(b.datum_cas).getTime());
    }

    return mapa;
  }, [zoznam]);

  /** Bunky mriežky vrátane prázdnych na začiatku a konci mesiaca. */
  const bunky = useMemo(() => {
    const { rok, mesiac } = zobrazeny;
    const prvyDen = new Date(rok, mesiac, 1);
    const pocetDni = new Date(rok, mesiac + 1, 0).getDate();

    // getDay() vracia 0 pre nedeľu — prepočítame na pondelok = 0
    const posun = (prvyDen.getDay() + 6) % 7;

    const vysledok: Array<{ den: number | null; kluc: string }> = [];

    for (let i = 0; i < posun; i++) {
      vysledok.push({ den: null, kluc: `prazdna-${i}` });
    }

    for (let den = 1; den <= pocetDni; den++) {
      vysledok.push({
        den,
        kluc: `${rok}-${String(mesiac + 1).padStart(2, '0')}-${String(den).padStart(2, '0')}`,
      });
    }

    return vysledok;
  }, [zobrazeny]);

  const dnesKluc = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const posunMesiac = (o: number) => {
    setZobrazeny(({ rok, mesiac }) => {
      const novy = new Date(rok, mesiac + o, 1);
      return { rok: novy.getFullYear(), mesiac: novy.getMonth() };
    });
  };

  const naDnes = () => {
    const d = new Date();
    setZobrazeny({ rok: d.getFullYear(), mesiac: d.getMonth() });
  };

  /** Zápasy zobrazeného mesiaca pre zoznam pod kalendárom. */
  const zapasyMesiaca = useMemo(
    () =>
      zoznam
        .filter((z) => {
          if (!z.datum_cas) return false;
          const d = new Date(z.datum_cas);
          return d.getFullYear() === zobrazeny.rok && d.getMonth() === zobrazeny.mesiac;
        })
        .sort((a, b) => new Date(a.datum_cas).getTime() - new Date(b.datum_cas).getTime()),
    [zoznam, zobrazeny]
  );

  const nazovTimu = (z: Zapas, strana: 'domaci' | 'hostujuci'): string =>
    (strana === 'domaci'
      ? z.domaci_tim_display_name || z.domaci_tim_nazov
      : z.hostujuci_tim_display_name || z.hostujuci_tim_nazov) || '—';

  if (zapasy.chyba) {
    return <ErrorState sprava="Zápasy sa nepodarilo načítať" detail={zapasy.chyba} onSkusZnova={zapasy.obnov} />;
  }

  return (
    <div className="cw-kalendar">
      <PageHeader
        nadpis="Kalendár"
        podnadpis="Zápasy a udalosti klubu - tréningy, stretnutia, akcie."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => novaUdalost()}>
            Nová udalosť
          </Button>
        }
      />

      <Card
        nadpis={`${MESIACE[zobrazeny.mesiac]} ${zobrazeny.rok}`}
        akcie={
          <div className="cw-kalendar__ovladanie">
            <Button variant="secondary" velkost="sm" onClick={() => posunMesiac(-1)} aria-label="Predošlý mesiac">
              <Icon nazov="sipkaVlavo" velkost={15} />
            </Button>
            <Button variant="secondary" velkost="sm" onClick={naDnes}>
              Dnes
            </Button>
            <Button variant="secondary" velkost="sm" onClick={() => posunMesiac(1)} aria-label="Ďalší mesiac">
              <Icon nazov="sipkaVpravo" velkost={15} />
            </Button>
            <Button velkost="sm" ikona={<Icon nazov="plus" velkost={14} />} onClick={() => navigate('/admin/zapasy/novy')}>
              Nový zápas
            </Button>
          </div>
        }
      >
        {zapasy.nacitava ? (
          <Skeleton riadkov={6} vyska="40px" />
        ) : (
          <div className="cw-kalendar__mriezka" role="grid" aria-label="Kalendár zápasov">
            {DNI.map((d) => (
              <div key={d} className="cw-kalendar__hlavicka" role="columnheader">
                {d}
              </div>
            ))}

            {bunky.map(({ den, kluc }) => {
              if (den === null) {
                return <div key={kluc} className="cw-kalendar__bunka cw-kalendar__bunka--prazdna" />;
              }

              const zapasyDna = podlaDna.get(kluc) ?? [];
              const jeDnes = kluc === dnesKluc;

              return (
                <div
                  key={kluc}
                  className={`cw-kalendar__bunka ${jeDnes ? 'is-dnes' : ''}`}
                  role="gridcell"
                >
                  <button
                    className="cw-kalendar__den"
                    onClick={() => novaUdalost(kluc)}
                    title="Pridať udalosť v tento deň"
                    aria-label={`Pridať udalosť ${den}.`}
                  >
                    {den}
                  </button>

                  {(udalostiPodlaDna.get(kluc) ?? []).map((u) => {
                    const farba = farbaTimu(u);
                    return (
                      <button
                        key={`u${u.id}-${kluc}`}
                        className="cw-kalendar__udalost"
                        style={farba ? { borderLeftColor: farba, background: `color-mix(in srgb, ${farba} 14%, transparent)` } : undefined}
                        onClick={() => otvorUdalost(u)}
                        title={`${kratkyCas(u.cas_od)} ${u.nazov}${u.tim ? ` · ${u.tim.nazov}` : ''}`}
                      >
                        {u.cas_od && <span className="cw-kalendar__zapas-cas">{kratkyCas(u.cas_od)}</span>}
                        <span className="cw-kalendar__zapas-tim">{u.nazov}</span>
                      </button>
                    );
                  })}

                  {zapasyDna.map((z) => (
                    <button
                      key={z.id}
                      className={`cw-kalendar__zapas is-${z.actual_status ?? z.status}`}
                      onClick={() => navigate(`/admin/zapasy/${z.id}`)}
                      title={`${formatujCas(z.datum_cas)} · ${nazovTimu(z, 'domaci')} — ${nazovTimu(z, 'hostujuci')}`}
                    >
                      <span className="cw-kalendar__zapas-cas">{formatujCas(z.datum_cas)}</span>
                      {/* V bunke je dôležitý súper - pri zápase vonku je to domáci tím */}
                      <span className="cw-kalendar__zapas-tim">
                        {z.typ_zapasu === 'vonku' ? `@ ${nazovTimu(z, 'domaci')}` : nazovTimu(z, 'hostujuci')}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ===== Zoznam pod kalendárom ===== */}
      <Card nadpis="Zápasy v mesiaci" podnadpis={`${zapasyMesiaca.length} zápasov`} bezOdsadenia>
        {zapasyMesiaca.length === 0 ? (
          <p className="cw-kalendar__prazdne">
            V {MESIACE[zobrazeny.mesiac].toLowerCase()}i {zobrazeny.rok} nie sú naplánované žiadne zápasy.
          </p>
        ) : (
          <ul className="cw-kalendar__zoznam">
            {zapasyMesiaca.map((z) => (
              <li key={z.id}>
                <button className="cw-kalendar__polozka" onClick={() => navigate(`/admin/zapasy/${z.id}`)}>
                  <span className="cw-kalendar__polozka-datum">
                    {formatujDatumDlho(z.datum_cas)} · {formatujCas(z.datum_cas)}
                  </span>
                  <span className="cw-kalendar__polozka-tim">
                    {nazovTimu(z, 'domaci')} — {nazovTimu(z, 'hostujuci')}
                    {z.goly_domaci !== null && z.goly_hostia !== null && (
                      <strong> {z.goly_domaci}:{z.goly_hostia}</strong>
                    )}
                  </span>
                  <Badge ton={TON_STAVU[z.actual_status ?? z.status]} zivy={(z.actual_status ?? z.status) === 'prebieha'}>
                    {(z.actual_status ?? z.status) === 'prebieha' ? 'Prebieha' : ''}
                    {(z.actual_status ?? z.status) === 'naplanovany' ? 'Naplánovaný' : ''}
                    {(z.actual_status ?? z.status) === 'ukonceny' ? 'Odohraný' : ''}
                    {(z.actual_status ?? z.status) === 'odlozeny' ? 'Odložený' : ''}
                    {(z.actual_status ?? z.status) === 'zruseny' ? 'Zrušený' : ''}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ===== Udalosti mesiaca ===== */}
      <Card nadpis="Udalosti v mesiaci" podnadpis={`${(udalosti.data ?? []).length} výskytov`} bezOdsadenia>
        {(udalosti.data ?? []).length === 0 ? (
          <p className="cw-kalendar__prazdne">V tomto mesiaci nie sú žiadne udalosti. Pridajte napríklad pravidelný tréning.</p>
        ) : (
          <ul className="cw-kalendar__zoznam">
            {(udalosti.data ?? []).map((u) => (
              <li key={`${u.id}-${u.datum_vyskytu}`}>
                <button className="cw-kalendar__polozka" onClick={() => otvorUdalost(u)}>
                  <span className="cw-kalendar__polozka-datum">
                    {formatujDatumDlho(`${u.datum_vyskytu ?? u.datum}T12:00:00`)}
                    {u.cas_od ? ` · ${kratkyCas(u.cas_od)}${u.cas_do ? `–${kratkyCas(u.cas_do)}` : ''}` : ''}
                  </span>
                  <span className="cw-kalendar__polozka-tim">
                    <span className="cw-kalendar__farba" style={{ background: farbaTimu(u) ?? 'var(--muted)' }} aria-hidden="true" />
                    {u.nazov}
                    {u.miesto ? <span className="cw-kalendar__miesto"> · {u.miesto}</span> : null}
                  </span>
                  {u.tim ? <Badge>{u.tim.nazov}</Badge> : <Badge ton="neutral">Celý klub</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        otvorene={udalost !== null}
        onZavri={() => setUdalost(null)}
        nadpis={udalost?.id ? 'Upraviť udalosť' : 'Nová udalosť'}
        pata={
          <>
            {udalost?.id && (
              <Button variant="ghost" onClick={() => setNaZmazanie(true)} ikona={<Icon nazov="zmazat" velkost={15} />}>
                Zmazať
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="secondary" onClick={() => setUdalost(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={ulozUdalost} nacitava={uklada}>
              {udalost?.id ? 'Uložiť' : 'Pridať udalosť'}
            </Button>
          </>
        }
      >
        {udalost && (
          <>
            <Input
              menovka="Názov"
              value={udalost.nazov}
              onChange={(e) => setUdalost((u) => ({ ...u!, nazov: e.target.value }))}
              placeholder="Tréning U12"
              povinne
            />
            <Textarea
              menovka="Popis"
              value={udalost.popis}
              onChange={(e) => setUdalost((u) => ({ ...u!, popis: e.target.value }))}
              rows={2}
            />
            <div className="cw-kalendar__riadok">
              <Select
                menovka="Tím"
                value={udalost.tim_id ?? ''}
                onChange={(e) => setUdalost((u) => ({ ...u!, tim_id: e.target.value ? Number(e.target.value) : null }))}
                prazdna="Celý klub"
                moznosti={(timy.data ?? []).map((t) => ({ hodnota: t.id, popis: t.nazov }))}
                napoveda="Udalosť sa zobrazí vo farbe tímu"
              />
              <Input
                menovka="Miesto"
                value={udalost.miesto}
                onChange={(e) => setUdalost((u) => ({ ...u!, miesto: e.target.value }))}
                placeholder="Tréningové ihrisko"
              />
            </div>
            <div className="cw-kalendar__riadok cw-kalendar__riadok--3">
              <Input
                menovka="Dátum"
                type="date"
                value={udalost.datum}
                onChange={(e) => setUdalost((u) => ({ ...u!, datum: e.target.value }))}
                povinne
              />
              <Input
                menovka="Od"
                type="time"
                value={udalost.cas_od}
                onChange={(e) => setUdalost((u) => ({ ...u!, cas_od: e.target.value }))}
              />
              <Input
                menovka="Do"
                type="time"
                value={udalost.cas_do}
                onChange={(e) => setUdalost((u) => ({ ...u!, cas_do: e.target.value }))}
              />
            </div>
            <div className="cw-kalendar__riadok">
              <Select
                menovka="Opakovanie"
                value={udalost.opakovanie}
                onChange={(e) => setUdalost((u) => ({ ...u!, opakovanie: e.target.value as TypOpakovania }))}
                moznosti={OPAKOVANIA}
              />
              {udalost.opakovanie !== 'ziadne' && (
                <Input
                  menovka="Opakovať do"
                  type="date"
                  value={udalost.opakovanie_do}
                  onChange={(e) => setUdalost((u) => ({ ...u!, opakovanie_do: e.target.value }))}
                  napoveda="Prázdne = bez konca"
                />
              )}
            </div>
            {udalost.id && udalost.opakovanie !== 'ziadne' && (
              <p className="cw-kalendar__pozn">Úprava a zmazanie sa týka celej série opakovaní.</p>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie}
        nadpis="Zmazať udalosť?"
        sprava={
          udalost?.opakovanie && udalost.opakovanie !== 'ziadne'
            ? `Udalosť ${udalost.nazov} sa zmaže aj so všetkými opakovaniami.`
            : `Udalosť ${udalost?.nazov ?? ''} bude zmazaná.`
        }
        potvrdit="Zmazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmazUdalost}
        onZrus={() => setNaZmazanie(false)}
      />
    </div>
  );
};

export default Kalendar;
