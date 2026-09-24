// Umiestnenie: frontend/src/pages/admin/Licencia.tsx
// Stav licencie klubu.

import React, { useState } from 'react';
import { PageHeader, Card, Badge, Button, Icon, Skeleton, ErrorState, StatCard, useToast } from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { licenciaApi } from '../../api/sprava';
import { formatujDatum, formatujDatumCas } from '../../utils/datum';
import { tr, trn } from '../../i18n';
import './Licencia.css';

/** Zrozumiteľné vysvetlenie stavu licencie. */
const VYSVETLENIE: Record<string, { popis: string; ton: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  platna: { popis: tr('Licencia je platná'), ton: 'success' },
  vypnuta_kontrola: { popis: tr('Kontrola licencie je vypnutá (vývojový režim)'), ton: 'neutral' },
  ochranna_lehota: { popis: tr('Licenčný server je nedostupný — beží ochranná lehota'), ton: 'warning' },
  neexistujuca_licencia: { popis: tr('Licenčný kľúč nebol rozpoznaný'), ton: 'danger' },
  vyprsana_licencia: { popis: tr('Platnosť licencie vypršala'), ton: 'danger' },
  licencia_pozastavena: { popis: tr('Licencia bola pozastavená'), ton: 'danger' },
  nespravna_domena: { popis: tr('Licencia je vydaná na inú doménu'), ton: 'danger' },
  nezistene: { popis: tr('Stav licencie sa zisťuje'), ton: 'neutral' },
  chyba_ochranna_lehota_vyprsala: { popis: tr('Ochranná lehota vypršala — spojte sa s dodávateľom'), ton: 'danger' },
  ochranna_lehota_vyprsala: { popis: tr('Ochranná lehota vypršala — spojte sa s dodávateľom'), ton: 'danger' },
  licencia_zrusena: { popis: tr('Licencia bola zrušená'), ton: 'danger' },
  chybajuca_konfiguracia: {
    popis: tr('Chýba licenčný kľúč alebo adresa licenčného servera (LICENSE_KEY, LICENSE_SERVER_URL v .env)'),
    ton: 'danger',
  },
};

/** Popisné názvy funkcií podľa plánu. */
const NAZVY_FUNKCII: Record<string, string> = {
  clanky: tr('Články a novinky'),
  zapasy: tr('Zápasy a výsledky'),
  tabulky: tr('Ligové tabuľky'),
  galerie: tr('Fotogalérie'),
  hraci: tr('Databáza hráčov'),
  turnaje: tr('Turnaje a pavúky'),
  live: tr('Živé sledovanie'),
  export: tr('Export údajov'),
  api: tr('Prístup k API'),
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
      uspech(tr('Licencia bola overená'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Licenciu sa nepodarilo overiť'));
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
        sprava={tr('Stav licencie sa nepodarilo načítať')}
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
    ? { popis: tr('Licenčný server je nedostupný — ochranná lehota ešte {trvanie}', { trvanie: trn(Number(lehota[1]), '{n} deň', '{n} dni', '{n} dní') }), ton: 'warning' as const }
    : VYSVETLENIE[dovod] ?? { popis: l.dovod, ton: 'neutral' as const };

  return (
    <div className="cw-licencia">
      <PageHeader nadpis={tr('Licencia')} podnadpis={tr('Stav licencie a dostupné funkcie.')} />

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
                <Badge ton="success">{tr('Aktívna')}</Badge>
              ) : (
                <Badge ton="danger">{tr('Neaktívna')}</Badge>
              )}
              {l.plan && <Badge ton="primary">{tr('Plán')} {l.plan}</Badge>}
            </div>
            <p className="cw-licencia__popis">{stav.popis}</p>
          </div>

          <Button variant="secondary" onClick={overTeraz} nacitava={overuje} ikona={<Icon nazov="live" velkost={15} />}>
            {tr('Overiť teraz')}
          </Button>
        </div>

        {/* Upozornenie, keď sa licencia blíži ku koncu */}
        {l.dniDoVyprsania !== null && l.dniDoVyprsania <= 30 && l.dniDoVyprsania > 0 && (
          <div className="cw-licencia__upozornenie">
            <Icon nazov="hodiny" velkost={16} />
            <span>
              {tr('Licencia vyprší za {trvanie}. Spojte sa s dodávateľom kvôli obnove.', {
                trvanie: trn(l.dniDoVyprsania, '{n} deň', '{n} dni', '{n} dní'),
              })}
            </span>
          </div>
        )}

        {/* Vysvetlenie ochrannej lehoty — používateľ musí vedieť, že
            systém funguje, ale spojenie so serverom chýba */}
        {dovod === 'ochranna_lehota' && (
          <div className="cw-licencia__upozornenie is-warning">
            <Icon nazov="hodiny" velkost={16} />
            <span>
              {tr('Licenčný server je nedostupný. Systém funguje ďalej v ochrannej lehote, ktorá trvá 7 dní od posledného úspešného overenia. Po jej uplynutí sa zablokujú úpravy obsahu — verejný web zostane dostupný.')}
            </span>
          </div>
        )}

        {!l.povolene && dovod !== 'ochranna_lehota' && (
          <div className="cw-licencia__upozornenie is-danger">
            <Icon nazov="licencia" velkost={16} />
            <span>
              {tr('Úpravy obsahu sú zablokované. Verejný web klubu aj prihlásenie fungujú ďalej, aby ste videli toto upozornenie.')}
            </span>
          </div>
        )}
      </Card>

      {/* ===== Údaje ===== */}
      <div className="cw-licencia__karty">
        <StatCard
          menovka={tr('Platná do')}
          hodnota={l.platnaDo ? formatujDatum(l.platnaDo) : tr('neurčito')}
          ikona={<Icon nazov="kalendar" velkost={16} />}
        />
        <StatCard
          menovka={tr('Zostáva dní')}
          hodnota={l.dniDoVyprsania !== null ? l.dniDoVyprsania : '—'}
          ikona={<Icon nazov="hodiny" velkost={16} />}
        />
        <StatCard
          menovka={tr('Posledné overenie')}
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
        nadpis={tr('Dostupné funkcie')}
        podnadpis={
          l.funkcie.length > 0
            ? tr('Plán {hodnota} obsahuje {length} funkcií', { hodnota: l.plan ?? '—', length: l.funkcie.length })
            : tr('Zoznam funkcií nie je dostupný')
        }
      >
        {l.funkcie.length === 0 ? (
          <p className="cw-licencia__prazdne">
            {tr('Licenčný server nevrátil zoznam funkcií. Ak je kontrola licencie vypnutá, sú dostupné všetky funkcie.')}
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
      <Card nadpis={tr('Verzia systému')} podnadpis={tr('Aplikácia a stav databázy')}>
        {verzia.chyba ? (
          <p className="cw-licencia__prazdne">{verzia.chyba}</p>
        ) : !v ? (
          <Skeleton riadkov={3} />
        ) : (
          <>
            <dl className="cw-licencia__verzia">
              <dt>{tr('Verzia aplikácie')}</dt>
              <dd>{v.verzia_aplikacie}</dd>
              <dt>{tr('Databáza')}</dt>
              <dd>
                {v.schema.pocet_migracii} {tr('migrácií')}
                {v.schema.posledna_migracia && <span> {tr('· posledná')} {v.schema.posledna_migracia.replace(/\.js$/, '')}</span>}
              </dd>
              <dt>{tr('Prostredie')}</dt>
              <dd>
                {v.prostredie === 'production' ? tr('Produkcia') : tr('Vývoj')} {tr('· Node')} {v.node}
              </dd>
              <dt>{tr('Server beží')}</dt>
              <dd>{behDni(v.bezi_sekund)}</dd>
            </dl>
            {v.schema.cakajuce_migracie.length > 0 ? (
              <div className="cw-licencia__upozornenie is-warning">
                <Icon nazov="obnovit" velkost={16} />
                <span>
                  {tr('Databáza nie je aktuálna - čaká')} {v.schema.cakajuce_migracie.length} {tr('migrácií (')}{v.schema.cakajuce_migracie.map((m) => m.replace(/\.js$/, '')).join(', ')}{tr('). Spustite v priečinku backend príkaz')} <code>{tr('npm run db:migrate')}</code> {tr('a reštartujte server.')}
                </span>
              </div>
            ) : (
              <p className="cw-licencia__aktualne">
                <Badge ton="success">{tr('Aktuálne')}</Badge> {tr('Databáza zodpovedá verzii aplikácie.')}
              </p>
            )}
            <p className="cw-licencia__poznamka">
              {tr('Aktualizácia systému: stiahnite novú verziu (git pull), spustite')} <code>{tr('npm install')}</code> a{' '}
              <code>{tr('npm run db:migrate')}</code>{tr(', potom reštartujte backend.')}
            </p>
          </>
        )}
      </Card>

      <p className="cw-licencia__poznamka">
        {tr('Licencia sa overuje automaticky raz za 24 hodín. Overenie prebieha na pozadí a nevyžaduje žiadnu činnosť.')}
      </p>
    </div>
  );
};

export default Licencia;
