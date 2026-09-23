// Umiestnenie: frontend/src/pages/admin/Licencia.tsx
// Stav licencie klubu.

import React, { useState } from 'react';
import { PageHeader, Card, Badge, Button, Icon, Skeleton, ErrorState, StatCard, useToast } from '../../ui';
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
  ochranna_lehota_vyprsala: { popis: 'Ochranná lehota vypršala — spojte sa s dodávateľom', ton: 'danger' },
  licencia_zrusena: { popis: 'Licencia bola zrušená', ton: 'danger' },
  chybajuca_konfiguracia: {
    popis: 'Chýba licenčný kľúč alebo adresa licenčného servera (LICENSE_KEY, LICENSE_SERVER_URL v .env)',
    ton: 'danger',
  },
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
  const verzia = useNacitanie((signal) => licenciaApi.verzia(signal));
  const { uspech, chyba: hlasChybu } = useToast();
  const [overuje, setOveruje] = useState(false);
  const l = licencia.data;
  const v = verzia.data;

  const overTeraz = async () => {
    setOveruje(true);
    try {
      await licenciaApi.over();
      licencia.obnov();
      verzia.obnov();
      uspech('Licencia bola overená');
    } catch (e: any) {
      hlasChybu(e?.message || 'Licenciu sa nepodarilo overiť');
    } finally {
      setOveruje(false);
    }
  };

  const behDni = (sekundy: number) => {
    const dni = Math.floor(sekundy / 86400);
    const hodiny = Math.floor((sekundy % 86400) / 3600);
    return dni > 0 ? `${dni} d ${hodiny} h` : `${hodiny} h ${Math.floor((sekundy % 3600) / 60)} min`;
  };

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

  // Server posiela ochrannú lehotu aj so zostávajúcimi dňami (ochranna_lehota_3_dni)
  const lehota = /^ochranna_lehota_(\d+)_dni$/.exec(l.dovod);
  const dovod = lehota ? 'ochranna_lehota' : l.dovod;
  const stav = lehota
    ? { popis: `Licenčný server je nedostupný — ochranná lehota ešte ${lehota[1]} ${Number(lehota[1]) === 1 ? 'deň' : Number(lehota[1]) < 5 ? 'dni' : 'dní'}`, ton: 'warning' as const }
    : VYSVETLENIE[dovod] ?? { popis: l.dovod, ton: 'neutral' as const };

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

          <Button variant="secondary" onClick={overTeraz} nacitava={overuje} ikona={<Icon nazov="live" velkost={15} />}>
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
        {dovod === 'ochranna_lehota' && (
          <div className="cw-licencia__upozornenie is-warning">
            <Icon nazov="hodiny" velkost={16} />
            <span>
              Licenčný server je nedostupný. Systém funguje ďalej v ochrannej lehote,
              ktorá trvá 7 dní od posledného úspešného overenia. Po jej uplynutí sa
              zablokujú úpravy obsahu — verejný web zostane dostupný.
            </span>
          </div>
        )}

        {!l.povolene && dovod !== 'ochranna_lehota' && (
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

      {/* ===== Verzia systému a aktualizácie ===== */}
      <Card nadpis="Verzia systému" podnadpis="Aplikácia a stav databázy">
        {verzia.chyba ? (
          <p className="cw-licencia__prazdne">{verzia.chyba}</p>
        ) : !v ? (
          <Skeleton riadkov={3} />
        ) : (
          <>
            <dl className="cw-licencia__verzia">
              <dt>Verzia aplikácie</dt>
              <dd>{v.verzia_aplikacie}</dd>
              <dt>Databáza</dt>
              <dd>
                {v.schema.pocet_migracii} migrácií
                {v.schema.posledna_migracia && <span> · posledná {v.schema.posledna_migracia.replace(/\.js$/, '')}</span>}
              </dd>
              <dt>Prostredie</dt>
              <dd>
                {v.prostredie === 'production' ? 'Produkcia' : 'Vývoj'} · Node {v.node}
              </dd>
              <dt>Server beží</dt>
              <dd>{behDni(v.bezi_sekund)}</dd>
            </dl>
            {v.schema.cakajuce_migracie.length > 0 ? (
              <div className="cw-licencia__upozornenie is-warning">
                <Icon nazov="obnovit" velkost={16} />
                <span>
                  Databáza nie je aktuálna - čaká {v.schema.cakajuce_migracie.length} migrácií
                  ({v.schema.cakajuce_migracie.map((m) => m.replace(/\.js$/, '')).join(', ')}). Spustite v priečinku backend
                  príkaz <code>npm run db:migrate</code> a reštartujte server.
                </span>
              </div>
            ) : (
              <p className="cw-licencia__aktualne">
                <Badge ton="success">Aktuálne</Badge> Databáza zodpovedá verzii aplikácie.
              </p>
            )}
            <p className="cw-licencia__poznamka">
              Aktualizácia systému: stiahnite novú verziu (git pull), spustite <code>npm install</code> a{' '}
              <code>npm run db:migrate</code>, potom reštartujte backend.
            </p>
          </>
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
