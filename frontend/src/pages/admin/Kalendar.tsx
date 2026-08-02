// Umiestnenie: frontend/src/pages/admin/Kalendar.tsx
// Mesačný prehľad zápasov.

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, Badge, Icon, Skeleton, ErrorState } from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { zapasyApi } from '../../api/sport';
import { formatujCas, formatujDatumDlho } from '../../utils/datum';
import type { Zapas, StavZapasu } from '../../api/typy';
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

export const Kalendar: React.FC = () => {
  const navigate = useNavigate();

  // Zobrazený mesiac — začíname aktuálnym
  const [zobrazeny, setZobrazeny] = useState(() => {
    const d = new Date();
    return { rok: d.getFullYear(), mesiac: d.getMonth() };
  });

  const zapasy = useNacitanie((signal) => zapasyApi.vypis(signal));
  const zoznam = zapasy.data ?? [];

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
      <PageHeader nadpis="Kalendár" podnadpis="Mesačný prehľad zápasov klubu." />

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
                  <span className="cw-kalendar__den">{den}</span>

                  {zapasyDna.map((z) => (
                    <button
                      key={z.id}
                      className={`cw-kalendar__zapas is-${z.actual_status ?? z.status}`}
                      onClick={() => navigate(`/admin/zapasy/${z.id}`)}
                      title={`${formatujCas(z.datum_cas)} · ${nazovTimu(z, 'domaci')} — ${nazovTimu(z, 'hostujuci')}`}
                    >
                      <span className="cw-kalendar__zapas-cas">{formatujCas(z.datum_cas)}</span>
                      <span className="cw-kalendar__zapas-tim">{nazovTimu(z, 'hostujuci')}</span>
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
                    {(z.actual_status ?? z.status) === 'ukonceny' ? 'Ukončený' : ''}
                    {(z.actual_status ?? z.status) === 'odlozeny' ? 'Odložený' : ''}
                    {(z.actual_status ?? z.status) === 'zruseny' ? 'Zrušený' : ''}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default Kalendar;
