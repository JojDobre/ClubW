// Umiestnenie: frontend/src/pages/admin/ZapasLive.tsx
// Živé sledovanie zápasu — zapisovanie udalostí počas hry.
//
// AKO SA OBNOVUJE: údaje sa dopytujú každých 10 sekúnd (polling).
// Backend zatiaľ nemá WebSocket, takže toto je najjednoduchšia cesta,
// ktorá funguje hneď a bez zásahu na serveri. Ak by v budúcnosti pribudlo
// spojenie cez WebSocket, mení sa len tento súbor.
//
// Obnovovanie sa zastaví, keď je karta v pozadí — nemá zmysel zaťažovať
// server a batériu telefónu dopytmi, ktoré nikto nevidí.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Input, Select, Badge, Icon, Skeleton, ErrorState, useToast,
} from '../../ui';
import { zapasyApi, hraciApi } from '../../api/sport';
import { formatujCas } from '../../utils/datum';
import { TYPY_UDALOSTI } from './ZapasEditor';
import { udalostNaUlozenie } from '../../api/typy';
import type {
  Zapas, Hrac, UdalostZapasu, TypUdalosti, UdalostNaUlozenie,
} from '../../api/typy';
import { tr } from '../../i18n';
import { zivaMinuta, zivaMinutaCislo } from '../../web/zivaMinuta';
import './ZapasLive.css';

/** Interval automatickej obnovy údajov. */
const INTERVAL_OBNOVY_MS = 10_000;

/** Fázy zápasu v poradí, v akom idú po sebe. */
const FAZY: Array<{ kod: string; nazov: () => string; tlacidlo: () => string }> = [
  { kod: 'prvy_polcas', nazov: () => tr('1. polčas'), tlacidlo: () => tr('Začať 1. polčas') },
  { kod: 'polcas', nazov: () => tr('Polčas'), tlacidlo: () => tr('Ukončiť polčas') },
  { kod: 'druhy_polcas', nazov: () => tr('2. polčas'), tlacidlo: () => tr('Začať 2. polčas') },
  { kod: 'predlzenie', nazov: () => tr('Predĺženie'), tlacidlo: () => tr('Predĺženie') },
  { kod: 'penalty', nazov: () => tr('Penalty'), tlacidlo: () => tr('Penalty') },
];

export const ZapasLive: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const idCislo = Number(id);

  const [zapas, setZapas] = useState<Zapas | null>(null);
  const [udalosti, setUdalosti] = useState<UdalostZapasu[]>([]);
  const [hraci, setHraci] = useState<Hrac[]>([]);
  const [nacitava, setNacitava] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [uklada, setUklada] = useState(false);
  const [poslednaObnova, setPoslednaObnova] = useState<Date | null>(null);

  // Nová udalosť
  const [hracId, setHracId] = useState('');
  const [typ, setTyp] = useState<TypUdalosti>('gol');
  const [minuta, setMinuta] = useState('');

  // Priebeh a prenos
  const [streamUrl, setStreamUrl] = useState('');
  const [dlzkaPolcasu, setDlzkaPolcasu] = useState('');
  const [teraz, setTeraz] = useState(() => Date.now());

  // Zabraňuje zápisu do odpojeného komponentu
  const zivyRef = useRef(true);

  /** Načíta zápas, udalosti a hráčov. */
  const nacitaj = useCallback(
    async (tiche = false) => {
      if (!tiche) setNacitava(true);

      try {
        const [z, s, h] = await Promise.all([
          zapasyApi.detail(idCislo),
          zapasyApi.statistiky(idCislo),
          hraciApi.vypis(),
        ]);

        if (!zivyRef.current) return;

        setZapas(z);
        setUdalosti(s?.vsetky ?? []);
        setHraci(h);
        setChyba(null);
        setPoslednaObnova(new Date());
      } catch (e: any) {
        if (!zivyRef.current) return;
        // Pri tichej obnove chybu nezobrazujeme na celú obrazovku —
        // údaje na displeji sú stále použiteľné
        if (!tiche) setChyba(e?.message || tr('Údaje sa nepodarilo načítať'));
      } finally {
        if (zivyRef.current && !tiche) setNacitava(false);
      }
    },
    [idCislo]
  );

  // Polia prenosu predvyplníme raz - obnova ich nesmie prepísať počas písania
  const predvyplnene = useRef(false);
  useEffect(() => {
    if (!zapas || predvyplnene.current) return;
    predvyplnene.current = true;
    setStreamUrl(zapas.stream_url ?? '');
    setDlzkaPolcasu(zapas.dlzka_polcasu ? String(zapas.dlzka_polcasu) : '');
  }, [zapas]);

  // Bežiaca minúta sa prekresľuje každých 15 sekúnd
  useEffect(() => {
    const t = setInterval(() => setTeraz(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    zivyRef.current = true;
    void nacitaj();
    return () => {
      zivyRef.current = false;
    };
  }, [nacitaj]);

  // Automatická obnova
  useEffect(() => {
    let casovac: ReturnType<typeof setInterval> | null = null;

    const spusti = () => {
      if (casovac) return;
      casovac = setInterval(() => void nacitaj(true), INTERVAL_OBNOVY_MS);
    };

    const zastav = () => {
      if (casovac) {
        clearInterval(casovac);
        casovac = null;
      }
    };

    // Pri prepnutí karty obnovu pozastavíme a po návrate hneď dotiahneme
    const naZmenuVidiltelnosti = () => {
      if (document.hidden) {
        zastav();
      } else {
        void nacitaj(true);
        spusti();
      }
    };

    if (!document.hidden) spusti();
    document.addEventListener('visibilitychange', naZmenuVidiltelnosti);

    return () => {
      zastav();
      document.removeEventListener('visibilitychange', naZmenuVidiltelnosti);
    };
  }, [nacitaj]);

  /**
   * Aktuálna minúta — podľa spustenej fázy, inak odhad podľa času výkopu.
   * Predvyplní pole minúty.
   */
  const odhadniMinutu = useCallback((): string => {
    if (!zapas) return '';
    const podlaFazy = zivaMinutaCislo(zapas);
    if (podlaFazy !== null) return String(podlaFazy);
    if (zapas.live_faza === 'polcas') return String(zapas.dlzka_polcasu || 45);
    if (!zapas.datum_cas) return '';
    const uplynuloMinut = Math.floor(
      (Date.now() - new Date(zapas.datum_cas).getTime()) / 60_000
    );
    if (uplynuloMinut < 0 || uplynuloMinut > 130) return '';
    return String(Math.max(1, uplynuloMinut));
  }, [zapas]);

  /**
   * Uloží zmenený zoznam udalostí.
   * Endpoint nahrádza celý zoznam, preto posielame aj tie doterajšie.
   */
  const ulozUdalosti = async (novy: UdalostNaUlozenie[]) => {
    setUklada(true);
    try {
      await zapasyApi.ulozStatistiky(idCislo, novy);
      await nacitaj(true);
      return true;
    } catch (e: any) {
      hlasChybu(e?.message || tr('Udalosť sa nepodarilo uložiť'));
      return false;
    } finally {
      setUklada(false);
    }
  };

  // Prenesieme všetky polia - aj hosťujúcich hráčov a striedania,
  // inak by pridanie udalosti v živom režime ostatné údaje zmazalo
  const naUlozenie = (): UdalostNaUlozenie[] => udalosti.map(udalostNaUlozenie);

  const pridaj = async () => {
    if (!hracId) {
      varovanie(tr('Vyberte hráča'));
      return;
    }

    const m = minuta ? Number(minuta) : null;
    if (m !== null && (m < 1 || m > 130)) {
      varovanie(tr('Minúta musí byť medzi 1 a 130'));
      return;
    }

    const ok = await ulozUdalosti([
      ...naUlozenie(),
      { hrac_id: Number(hracId), typ, minuta: m },
    ]);

    if (ok) {
      uspech(tr('{popis} zaznamenaný', { popis: TYPY_UDALOSTI[typ].popis }));
      setMinuta('');
    }
  };

  const odober = async (udalost: UdalostZapasu) => {
    const zvysne = udalosti
      .filter((u) => u.id !== udalost.id)
      .map(udalostNaUlozenie);

    const ok = await ulozUdalosti(zvysne);
    if (ok) uspech(tr('Udalosť bola odobratá'));
  };

  /** Zmena skóre priamo z tejto obrazovky. */
  const zmenSkore = async (strana: 'domaci' | 'hostia', posun: number) => {
    if (!zapas) return;

    const doterajsie = strana === 'domaci' ? zapas.goly_domaci : zapas.goly_hostia;
    const nova = Math.max(0, (doterajsie ?? 0) + posun);

    // Stav nastavíme na „prebieha", ak zápas ešte nebol označený —
    // zapisovanie skóre naživo znamená, že sa hrá
    const zmeny =
      strana === 'domaci' ? { goly_domaci: nova } : { goly_hostia: nova };

    try {
      await zapasyApi.uprav(idCislo, {
        ...zmeny,
        ...(zapas.status === 'naplanovany' ? { status: 'prebieha' as const } : {}),
      });
      await nacitaj(true);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Skóre sa nepodarilo zmeniť'));
    }
  };

  /** Spustí fázu zápasu - web od nej počíta minútu. */
  const nastavFazu = async (faza: string) => {
    try {
      await zapasyApi.uprav(idCislo, { live_faza: faza });
      await nacitaj(true);
      setTeraz(Date.now());
    } catch (e: any) {
      hlasChybu(e?.message || tr('Fázu zápasu sa nepodarilo zmeniť'));
    }
  };

  /** Uloží odkaz na prenos a dĺžku polčasu. */
  const ulozPrenos = async () => {
    const url = streamUrl.trim();
    if (url && !/^https:\/\/\S+$/.test(url)) {
      varovanie(tr('Odkaz na prenos musí začínať https://'));
      return;
    }
    const dlzka = dlzkaPolcasu ? Number(dlzkaPolcasu) : null;
    if (dlzka !== null && (dlzka < 5 || dlzka > 60)) {
      varovanie(tr('Dĺžka polčasu musí byť 5 až 60 minút'));
      return;
    }
    try {
      await zapasyApi.uprav(idCislo, { stream_url: url || null, dlzka_polcasu: dlzka });
      await nacitaj(true);
      uspech(tr('Prenos bol uložený'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Prenos sa nepodarilo uložiť'));
    }
  };

  /** Ukončí zápas — tabuľka sa prepočíta na serveri. */
  const ukonci = async () => {
    if (!zapas) return;

    if (zapas.goly_domaci === null || zapas.goly_hostia === null) {
      varovanie(tr('Pred ukončením zadajte výsledok'));
      return;
    }

    try {
      await zapasyApi.uprav(idCislo, { status: 'ukonceny' });
      uspech(tr('Zápas ukončený, tabuľka sa prepočítala'));
      navigate(`/admin/zapasy/${idCislo}`);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Zápas sa nepodarilo ukončiť'));
    }
  };

  const menovkaHraca = (hId: number): string => {
    const h = hraci.find((x) => x.id === hId);
    if (!h) return tr('Hráč #{hId}', { hId });
    return `${h.meno} ${h.priezvisko}${h.cislo_dresu ? ` (${h.cislo_dresu})` : ''}`;
  };

  // ===== Stavy =====

  if (chyba && !zapas) {
    return <ErrorState sprava={tr('Zápas sa nepodarilo načítať')} detail={chyba} onSkusZnova={() => nacitaj()} />;
  }

  if (nacitava) {
    return (
      <Card>
        <Skeleton riadkov={6} vyska="20px" />
      </Card>
    );
  }

  if (!zapas) return null;

  const domaci = zapas.domaci_tim_display_name || zapas.domaci_tim_nazov || '—';
  const hostia = zapas.hostujuci_tim_display_name || zapas.hostujuci_tim_nazov || '—';

  const bezi = zapas.status === 'prebieha';
  const aktualnaFaza = bezi ? FAZY.find((f) => f.kod === zapas.live_faza) : undefined;
  const minutaTeraz = bezi ? zivaMinuta(zapas, teraz) : null;
  const indexFazy = aktualnaFaza ? FAZY.indexOf(aktualnaFaza) : -1;

  // Udalosti od najnovšej — počas zápasu je zaujímavé, čo sa práve stalo
  const zoradene = [...udalosti].sort((a, b) => (b.minuta ?? 0) - (a.minuta ?? 0));

  return (
    <div className="cw-live">
      {/* ===== Lišta ===== */}
      <div className="cw-live__bar">
        <Button
          variant="ghost"
          onClick={() => navigate(`/admin/zapasy/${idCislo}`)}
          ikona={<Icon nazov="sipkaVlavo" velkost={16} />}
        >
          {tr('Späť na zápas')}
        </Button>

        <div className="cw-live__bar-right">
          <span className="cw-live__obnova">
            {poslednaObnova
              ? tr('Obnovené {hodnota}', { hodnota: formatujCas(poslednaObnova) })
              : tr('Načítava sa…')}
          </span>
          <Button
            variant="ghost"
            velkost="sm"
            onClick={() => void nacitaj(true)}
            aria-label={tr('Obnoviť teraz')}
          >
            <Icon nazov="live" velkost={15} />
          </Button>
          <Button variant="danger" onClick={ukonci}>
            {tr('Ukončiť zápas')}
          </Button>
        </div>
      </div>

      {/* ===== Skóre ===== */}
      <Card bezOdsadenia>
        <div className="cw-live__skore">
          <div className="cw-live__tim">
            <div className="cw-live__tim-nazov">{domaci}</div>
            <div className="cw-live__ovladanie">
              <button onClick={() => zmenSkore('domaci', -1)} aria-label={tr('Odobrať gól domácim')}>
                −
              </button>
              <span className="cw-live__goly">{zapas.goly_domaci ?? 0}</span>
              <button onClick={() => zmenSkore('domaci', 1)} aria-label={tr('Pridať gól domácim')}>
                +
              </button>
            </div>
          </div>

          <div className="cw-live__stred">
            {zapas.status === 'prebieha' ? (
              <Badge ton="danger" zivy>{tr('Prebieha')}</Badge>
            ) : (
              <Badge ton="info">
                {zapas.status === 'naplanovany' ? tr('Pred zápasom') : zapas.status}
              </Badge>
            )}
            {minutaTeraz && <span className="cw-live__min">{minutaTeraz}</span>}
            {aktualnaFaza && <span className="cw-live__faza">{aktualnaFaza.nazov()}</span>}
            {zapas.liga_nazov && <span className="cw-live__liga">{zapas.liga_nazov}</span>}
          </div>

          <div className="cw-live__tim">
            <div className="cw-live__tim-nazov">{hostia}</div>
            <div className="cw-live__ovladanie">
              <button onClick={() => zmenSkore('hostia', -1)} aria-label={tr('Odobrať gól hosťom')}>
                −
              </button>
              <span className="cw-live__goly">{zapas.goly_hostia ?? 0}</span>
              <button onClick={() => zmenSkore('hostia', 1)} aria-label={tr('Pridať gól hosťom')}>
                +
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ===== Priebeh zápasu ===== */}
      <Card
        nadpis={tr('Priebeh zápasu')}
        podnadpis={tr('Web podľa fázy zobrazuje bežiacu minútu a návštevníkom sa sám obnovuje.')}
      >
        <div className="cw-live__fazy">
          {FAZY.map((f, i) => (
            <Button
              key={f.kod}
              variant={aktualnaFaza?.kod === f.kod ? 'primary' : i === indexFazy + 1 ? 'secondary' : 'ghost'}
              velkost="sm"
              onClick={() => void nastavFazu(f.kod)}
              aria-pressed={aktualnaFaza?.kod === f.kod}
            >
              {aktualnaFaza?.kod === f.kod ? f.nazov() : f.tlacidlo()}
            </Button>
          ))}
        </div>

        <div className="cw-live__prenos">
          <Input
            menovka={tr('Odkaz na živý prenos')}
            type="url"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            napoveda={tr('YouTube a Facebook sa prehrajú priamo na webe, iné siete sa otvoria odkazom.')}
          />
          <Input
            menovka={tr('Dĺžka polčasu (min)')}
            type="number"
            min={5}
            max={60}
            value={dlzkaPolcasu}
            onChange={(e) => setDlzkaPolcasu(e.target.value)}
            placeholder="45"
          />
          <Button variant="secondary" onClick={ulozPrenos}>
            {tr('Uložiť')}
          </Button>
        </div>
      </Card>

      {/* ===== Zápis udalosti ===== */}
      <Card nadpis={tr('Pridať udalosť')}>
        <div className="cw-live__form">
          <Select
            menovka={tr('Hráč')}
            value={hracId}
            onChange={(e) => setHracId(e.target.value)}
            prazdna={tr('Vyberte hráča')}
            moznosti={hraci.map((h) => ({
              hodnota: h.id,
              popis: `${h.meno} ${h.priezvisko}${h.cislo_dresu ? ` (${h.cislo_dresu})` : ''}`,
            }))}
          />

          <Select
            menovka={tr('Udalosť')}
            value={typ}
            onChange={(e) => setTyp(e.target.value as TypUdalosti)}
            moznosti={(Object.keys(TYPY_UDALOSTI) as TypUdalosti[]).map((t) => ({
              hodnota: t,
              popis: `${TYPY_UDALOSTI[t].symbol} ${TYPY_UDALOSTI[t].popis}`,
            }))}
          />

          <Input
            menovka={tr('Minúta')}
            type="number"
            min={1}
            max={130}
            value={minuta}
            onChange={(e) => setMinuta(e.target.value)}
            // Kliknutie do prázdneho poľa predvyplní odhadnutú minútu
            onFocus={() => {
              if (!minuta) setMinuta(odhadniMinutu());
            }}
            placeholder="—"
          />

          <Button onClick={pridaj} nacitava={uklada} ikona={<Icon nazov="plus" velkost={15} />}>
            {tr('Zapísať')}
          </Button>
        </div>
      </Card>

      {/* ===== Časová os ===== */}
      <Card nadpis={tr('Časová os')} podnadpis={tr('{length} udalostí', { length: udalosti.length })} bezOdsadenia>
        {zoradene.length === 0 ? (
          <p className="cw-live__prazdne">
            {tr('Zatiaľ sa nič nestalo. Zapíšte prvý gól, asistenciu alebo kartu.')}
          </p>
        ) : (
          <ul className="cw-live__os">
            {zoradene.map((u) => (
              <li key={u.id} className="cw-live__udalost">
                <span className="cw-live__minuta">
                  {u.minuta !== null ? `${u.minuta}'` : '—'}
                </span>
                <span className="cw-live__symbol" aria-hidden="true">
                  {TYPY_UDALOSTI[u.typ].symbol}
                </span>
                <span className="cw-live__popis">
                  <strong>{u.hrac
                    ? `${u.hrac.meno} ${u.hrac.priezvisko}`
                    : u.hostujuci_hrac_meno
                      ? `${u.hostujuci_hrac_meno}${u.hostujuci_hrac_cislo != null ? ` (${u.hostujuci_hrac_cislo})` : ''}`
                      : menovkaHraca(u.hrac_id ?? 0)}</strong>
                  <span className="cw-live__typ">{TYPY_UDALOSTI[u.typ].popis}</span>
                </span>
                <button
                  className="cw-live__odobrat"
                  onClick={() => odober(u)}
                  disabled={uklada}
                  aria-label={tr('Odobrať udalosť')}
                >
                  <Icon nazov="zavriet" velkost={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default ZapasLive;
