// Umiestnenie: frontend/src/pages/admin/Licencia.tsx
// Stav licencie klubu.

import React from 'react';
import { PageHeader, Card, Badge, Button, Icon, Skeleton, ErrorState, StatCard } from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { licenciaApi } from '../../api/sprava';
import { formatujDatum, formatujDatumCas } from '../../utils/datum';
import './Licencia.css';

/** Zrozumiteľné vysvetlenie stavu licencie. */
const VYSVETLENIE: Record<string, { popis: string; ton: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  platna: { popis: 'Licencia je platná', ton: 'success' },
  vypnuta_kontrola: { popis: 'Kontrola licencie je vypnutá (vývojový režim)', ton: 'neutral' },
  ochranna_lehota: { popis: 'Licenčný server je nedostupný — beží ochranná lehota', ton: 'warning' },
  neexistujuca_licencia: { popis: 'Licenčný kľúč nebol rozpoznaný', ton: 'danger' },
  vyprsana_licencia: { popis: 'Platnosť licencie vypršala', ton: 'danger' },
  licencia_pozastavena: { popis: 'Licencia bola pozastavená', ton: 'danger' },
  nespravna_domena: { popis: 'Licencia je vydaná na inú doménu', ton: 'danger' },
  nezistene: { popis: 'Stav licencie sa zisťuje', ton: 'neutral' },
  chyba_ochranna_lehota_vyprsala: { popis: 'Ochranná lehota vypršala — spojte sa s dodávateľom', ton: 'danger' },
};

/** Popisné názvy funkcií podľa plánu. */
const NAZVY_FUNKCII: Record<string, string> = {
  clanky: 'Články a novinky',
  zapasy: 'Zápasy a výsledky',
  tabulky: 'Ligové tabuľky',
  galerie: 'Fotogalérie',
  hraci: 'Databáza hráčov',
  turnaje: 'Turnaje a pavúky',
  live: 'Živé sledovanie',
  export: 'Export údajov',
  api: 'Prístup k API',
};

export const Licencia: React.FC = () => {
  const licencia = useNacitanie((signal) => licenciaApi.stav(signal));
  const l = licencia.data;

  if (licencia.chyba) {
    return (
      <ErrorState
        sprava="Stav licencie sa nepodarilo načítať"
        detail={licencia.chyba}
        onSkusZnova={licencia.obnov}
      />
    );
  }

  if (licencia.nacitava) {
    return (
      <Card>
        <Skeleton riadkov={5} vyska="20px" />
      </Card>
    );
  }

  if (!l) return null;

  const stav = VYSVETLENIE[l.dovod] ?? { popis: l.dovod, ton: 'neutral' as const };

  return (
    <div className="cw-licencia">
      <PageHeader nadpis="Licencia" podnadpis="Stav licencie a dostupné funkcie." />

      {/* ===== Hlavný stav ===== */}
      <Card>
        <div className="cw-licencia__hlava">
          <div
            className={`cw-licencia__znak is-${stav.ton}`}
            aria-hidden="true"
          >
            <Icon nazov="licencia" velkost={26} />
          </div>

          <div className="cw-licencia__text">
            <div className="cw-licencia__stav">
              {l.povolene ? (
                <Badge ton="success">Aktívna</Badge>
              ) : (
                <Badge ton="danger">Neaktívna</Badge>
              )}
              {l.plan && <Badge ton="primary">Plán {l.plan}</Badge>}
            </div>
            <p className="cw-licencia__popis">{stav.popis}</p>
          </div>

          <Button variant="secondary" onClick={licencia.obnov} ikona={<Icon nazov="live" velkost={15} />}>
            Overiť teraz
          </Button>
        </div>

        {/* Upozornenie, keď sa licencia blíži ku koncu */}
        {l.dniDoVyprsania !== null && l.dniDoVyprsania <= 30 && l.dniDoVyprsania > 0 && (
          <div className="cw-licencia__upozornenie">
            <Icon nazov="hodiny" velkost={16} />
            <span>
              Licencia vyprší za {l.dniDoVyprsania}{' '}
              {l.dniDoVyprsania === 1 ? 'deň' : l.dniDoVyprsania < 5 ? 'dni' : 'dní'}.
              Spojte sa s dodávateľom kvôli obnove.
            </span>
          </div>
        )}

        {/* Vysvetlenie ochrannej lehoty — používateľ musí vedieť, že
            systém funguje, ale spojenie so serverom chýba */}
        {l.dovod === 'ochranna_lehota' && (
          <div className="cw-licencia__upozornenie is-warning">
            <Icon nazov="hodiny" velkost={16} />
            <span>
              Licenčný server je nedostupný. Systém funguje ďalej v ochrannej lehote,
              ktorá trvá 7 dní od posledného úspešného overenia. Po jej uplynutí sa
              zablokujú úpravy obsahu — verejný web zostane dostupný.
            </span>
          </div>
        )}

        {!l.povolene && l.dovod !== 'ochranna_lehota' && (
          <div className="cw-licencia__upozornenie is-danger">
            <Icon nazov="licencia" velkost={16} />
            <span>
              Úpravy obsahu sú zablokované. Verejný web klubu aj prihlásenie
              fungujú ďalej, aby ste videli toto upozornenie.
            </span>
          </div>
        )}
      </Card>

      {/* ===== Údaje ===== */}
      <div className="cw-licencia__karty">
        <StatCard
          menovka="Platná do"
          hodnota={l.platnaDo ? formatujDatum(l.platnaDo) : 'neurčito'}
          ikona={<Icon nazov="kalendar" velkost={16} />}
        />
        <StatCard
          menovka="Zostáva dní"
          hodnota={l.dniDoVyprsania !== null ? l.dniDoVyprsania : '—'}
          ikona={<Icon nazov="hodiny" velkost={16} />}
        />
        <StatCard
          menovka="Posledné overenie"
          hodnota={
            l.poslednyUspesnyKontakt
              ? formatujDatumCas(new Date(l.poslednyUspesnyKontakt))
              : 'nikdy'
          }
          ikona={<Icon nazov="live" velkost={16} />}
        />
      </div>

      {/* ===== Funkcie plánu ===== */}
      <Card
        nadpis="Dostupné funkcie"
        podnadpis={
          l.funkcie.length > 0
            ? `Plán ${l.plan ?? '—'} obsahuje ${l.funkcie.length} funkcií`
            : 'Zoznam funkcií nie je dostupný'
        }
      >
        {l.funkcie.length === 0 ? (
          <p className="cw-licencia__prazdne">
            Licenčný server nevrátil zoznam funkcií. Ak je kontrola licencie vypnutá,
            sú dostupné všetky funkcie.
          </p>
        ) : (
          <ul className="cw-licencia__funkcie">
            {l.funkcie.map((f) => (
              <li key={f} className="cw-licencia__funkcia">
                <Icon nazov="licencia" velkost={15} />
                <span>{NAZVY_FUNKCII[f] ?? f}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="cw-licencia__poznamka">
        Licencia sa overuje automaticky raz za 24 hodín. Overenie prebieha na pozadí
        a nevyžaduje žiadnu činnosť.
      </p>
    </div>
  );
};

export default Licencia;
