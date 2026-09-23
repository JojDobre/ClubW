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
import './ZapasLive.css';

/** Interval automatickej obnovy údajov. */
const INTERVAL_OBNOVY_MS = 10_000;

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
        if (!tiche) setChyba(e?.message || 'Údaje sa nepodarilo načítať');
      } finally {
        if (zivyRef.current && !tiche) setNacitava(false);
      }
    },
    [idCislo]
  );

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

  /** Odhad aktuálnej minúty podľa času výkopu — predvyplní pole. */
  const odhadniMinutu = useCallback((): string => {
    if (!zapas?.datum_cas) return '';
    const uplynuloMinut = Math.floor(
      (Date.now() - new Date(zapas.datum_cas).getTime()) / 60_000
    );
    if (uplynuloMinut < 0 || uplynuloMinut > 130) return '';
    return String(Math.max(1, uplynuloMinut));
  }, [zapas?.datum_cas]);

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
      hlasChybu(e?.message || 'Udalosť sa nepodarilo uložiť');
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
      varovanie('Vyberte hráča');
      return;
    }

    const m = minuta ? Number(minuta) : null;
    if (m !== null && (m < 1 || m > 130)) {
      varovanie('Minúta musí byť medzi 1 a 130');
      return;
    }

    const ok = await ulozUdalosti([
      ...naUlozenie(),
      { hrac_id: Number(hracId), typ, minuta: m },
    ]);

    if (ok) {
      uspech(`${TYPY_UDALOSTI[typ].popis} zaznamenaný`);
      setMinuta('');
    }
  };

  const odober = async (udalost: UdalostZapasu) => {
    const zvysne = udalosti
      .filter((u) => u.id !== udalost.id)
      .map(udalostNaUlozenie);

    const ok = await ulozUdalosti(zvysne);
    if (ok) uspech('Udalosť bola odobratá');
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
      hlasChybu(e?.message || 'Skóre sa nepodarilo zmeniť');
    }
  };

  /** Ukončí zápas — tabuľka sa prepočíta na serveri. */
  const ukonci = async () => {
    if (!zapas) return;

    if (zapas.goly_domaci === null || zapas.goly_hostia === null) {
      varovanie('Pred ukončením zadajte výsledok');
      return;
    }

    try {
      await zapasyApi.uprav(idCislo, { status: 'ukonceny' });
      uspech('Zápas ukončený, tabuľka sa prepočítala');
      navigate(`/admin/zapasy/${idCislo}`);
    } catch (e: any) {
      hlasChybu(e?.message || 'Zápas sa nepodarilo ukončiť');
    }
  };

  const menovkaHraca = (hId: number): string => {
    const h = hraci.find((x) => x.id === hId);
    if (!h) return `Hráč #${hId}`;
    return `${h.meno} ${h.priezvisko}${h.cislo_dresu ? ` (${h.cislo_dresu})` : ''}`;
  };

  // ===== Stavy =====

  if (chyba && !zapas) {
    return <ErrorState sprava="Zápas sa nepodarilo načítať" detail={chyba} onSkusZnova={() => nacitaj()} />;
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
          Späť na zápas
        </Button>

        <div className="cw-live__bar-right">
          <span className="cw-live__obnova">
            {poslednaObnova
              ? `Obnovené ${formatujCas(poslednaObnova)}`
              : 'Načítava sa…'}
          </span>
          <Button
            variant="ghost"
            velkost="sm"
            onClick={() => void nacitaj(true)}
            aria-label="Obnoviť teraz"
          >
            <Icon nazov="live" velkost={15} />
          </Button>
          <Button variant="danger" onClick={ukonci}>
            Ukončiť zápas
          </Button>
        </div>
      </div>

      {/* ===== Skóre ===== */}
      <Card bezOdsadenia>
        <div className="cw-live__skore">
          <div className="cw-live__tim">
            <div className="cw-live__tim-nazov">{domaci}</div>
            <div className="cw-live__ovladanie">
              <button onClick={() => zmenSkore('domaci', -1)} aria-label="Odobrať gól domácim">
                −
              </button>
              <span className="cw-live__goly">{zapas.goly_domaci ?? 0}</span>
              <button onClick={() => zmenSkore('domaci', 1)} aria-label="Pridať gól domácim">
                +
              </button>
            </div>
          </div>

          <div className="cw-live__stred">
            {zapas.status === 'prebieha' ? (
              <Badge ton="danger" zivy>Prebieha</Badge>
            ) : (
              <Badge ton="info">
                {zapas.status === 'naplanovany' ? 'Pred zápasom' : zapas.status}
              </Badge>
            )}
            {zapas.liga_nazov && <span className="cw-live__liga">{zapas.liga_nazov}</span>}
          </div>

          <div className="cw-live__tim">
            <div className="cw-live__tim-nazov">{hostia}</div>
            <div className="cw-live__ovladanie">
              <button onClick={() => zmenSkore('hostia', -1)} aria-label="Odobrať gól hosťom">
                −
              </button>
              <span className="cw-live__goly">{zapas.goly_hostia ?? 0}</span>
              <button onClick={() => zmenSkore('hostia', 1)} aria-label="Pridať gól hosťom">
                +
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ===== Zápis udalosti ===== */}
      <Card nadpis="Pridať udalosť">
        <div className="cw-live__form">
          <Select
            menovka="Hráč"
            value={hracId}
            onChange={(e) => setHracId(e.target.value)}
            prazdna="Vyberte hráča"
            moznosti={hraci.map((h) => ({
              hodnota: h.id,
              popis: `${h.meno} ${h.priezvisko}${h.cislo_dresu ? ` (${h.cislo_dresu})` : ''}`,
            }))}
          />

          <Select
            menovka="Udalosť"
            value={typ}
            onChange={(e) => setTyp(e.target.value as TypUdalosti)}
            moznosti={(Object.keys(TYPY_UDALOSTI) as TypUdalosti[]).map((t) => ({
              hodnota: t,
              popis: `${TYPY_UDALOSTI[t].symbol} ${TYPY_UDALOSTI[t].popis}`,
            }))}
          />

          <Input
            menovka="Minúta"
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
            Zapísať
          </Button>
        </div>
      </Card>

      {/* ===== Časová os ===== */}
      <Card nadpis="Časová os" podnadpis={`${udalosti.length} udalostí`} bezOdsadenia>
        {zoradene.length === 0 ? (
          <p className="cw-live__prazdne">
            Zatiaľ sa nič nestalo. Zapíšte prvý gól, asistenciu alebo kartu.
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
                  aria-label="Odobrať udalosť"
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
