// Umiestnenie: frontend/src/pages/admin/Licencia.tsx
// Stav licencie klubu.

import React, { useEffect, useRef, useState } from 'react';
import { PageHeader, Card, Badge, Button, Icon, Skeleton, ErrorState, StatCard, ConfirmDialog, useToast } from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { licenciaApi, type StavAktualizacii } from '../../api/sprava';
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

          </>
        )}
      </Card>

      <KartaAktualizacii onZmena={verzia.obnov} />

      <p className="cw-licencia__poznamka">
        {tr('Licencia sa overuje automaticky raz za 24 hodín. Overenie prebieha na pozadí a nevyžaduje žiadnu činnosť.')}
      </p>
    </div>
  );
};

/** Záznam aktualizátora - posunutý na koniec, najnovšie riadky sú dole. */
const ZaznamLogu: React.FC<{ text: string }> = ({ text }) => {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const pre = ref.current;
    if (!pre) return;
    const naKoniec = () => (pre.scrollTop = pre.scrollHeight);
    naKoniec();
    // Zatvorený <details> nemá výšku - posunieme aj po jeho otvorení
    const details = pre.closest('details');
    details?.addEventListener('toggle', naKoniec);
    return () => details?.removeEventListener('toggle', naKoniec);
  }, [text]);
  return <pre ref={ref}>{text}</pre>;
};

const NAZVY_KROKOV: Record<string, string> = {
  spustenie: tr('Spúšťa sa'),
  stiahnutie: tr('Sťahovanie balíka'),
  rozbalenie: tr('Kontrola balíka'),
  zaloha: tr('Záloha'),
  subory: tr('Nahrávanie súborov'),
  zavislosti: tr('Inštalácia závislostí'),
  zostavenie: tr('Zostavenie'),
  migracie: tr('Migrácie databázy'),
  hotovo: tr('Hotovo'),
};

/**
 * Aktualizácie z licenčného servera: dostupná verzia, spustenie a priebeh.
 */
const KartaAktualizacii: React.FC<{ onZmena: () => void }> = ({ onZmena }) => {
  const stav = useNacitanie((signal) => licenciaApi.aktualizacie(signal));
  const { uspech, chyba: hlasChybu } = useToast();
  const [potvrdenie, setPotvrdenie] = useState(false);
  const [spusta, setSpusta] = useState(false);
  const [priebeh, setPriebeh] = useState<StavAktualizacii | null>(null);
  const a = priebeh ?? stav.data;
  const bezi = a?.beh?.stav === 'prebieha';

  // Počas aktualizácie priebeh obnovujeme. Backend sa na konci reštartuje,
  // chvíľu preto neodpovedá - chyby spojenia vtedy ticho prečkáme.
  useEffect(() => {
    if (!bezi) return;
    const casovac = window.setInterval(async () => {
      try {
        const novy = await licenciaApi.aktualizacie();
        setPriebeh(novy);
        if (novy.beh?.stav !== 'prebieha') onZmena();
      } catch {
        // backend sa reštartuje
      }
    }, 3000);
    return () => window.clearInterval(casovac);
  }, [bezi, onZmena]);

  const spusti = async () => {
    setSpusta(true);
    try {
      await licenciaApi.aktualizuj();
      setPriebeh(await licenciaApi.aktualizacie());
      uspech(tr('Aktualizácia sa spustila'));
      setPotvrdenie(false);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Aktualizáciu sa nepodarilo spustiť'));
    } finally {
      setSpusta(false);
    }
  };

  if (stav.chyba) {
    return (
      <Card nadpis={tr('Aktualizácie')}>
        <p className="cw-licencia__prazdne">{stav.chyba}</p>
      </Card>
    );
  }
  if (!a) {
    return (
      <Card nadpis={tr('Aktualizácie')}>
        <Skeleton riadkov={3} />
      </Card>
    );
  }

  const beh = a.beh;
  return (
    <Card nadpis={tr('Aktualizácie')} podnadpis={tr('Nové verzie systému z licenčného servera')}>
      {bezi && beh ? (
        <div className="cw-aktualizacia is-bezi">
          <div className="cw-aktualizacia__hlava">
            <Badge ton="info" zivy>
              {tr('Prebieha')}
            </Badge>
            <strong>{tr('Aktualizácia na verziu {verzia}', { verzia: beh.verzia })}</strong>
          </div>
          <p className="cw-aktualizacia__text">
            {NAZVY_KROKOV[beh.krok ?? ''] ?? beh.krok}
            {beh.sprava ? ` · ${beh.sprava}` : ''}
          </p>
          <p className="cw-licencia__prazdne">
            {tr('Trvá to zvyčajne niekoľko minút. Na konci sa server reštartuje a administrácia na chvíľu prestane odpovedať.')}
          </p>
        </div>
      ) : a.dostupna ? (
        <div className="cw-aktualizacia">
          <div className="cw-aktualizacia__hlava">
            {a.dostupna.povinna ? <Badge ton="danger">{tr('Povinná')}</Badge> : <Badge ton="primary">{tr('Nová verzia')}</Badge>}
            <strong>{tr('Dostupná verzia {verzia}', { verzia: a.dostupna.verzia })}</strong>
            <span className="cw-aktualizacia__z">{tr('nainštalovaná {verzia}', { verzia: a.verzia })}</span>
          </div>
          {a.dostupna.povinna && (
            <p className="cw-aktualizacia__text">{tr('Dodávateľ označil túto aktualizáciu ako povinnú (napríklad bezpečnostná oprava).')}</p>
          )}
          {a.dostupna.poznamky && <pre className="cw-aktualizacia__poznamky">{a.dostupna.poznamky}</pre>}
          {a.povolene ? (
            <Button onClick={() => setPotvrdenie(true)} ikona={<Icon nazov="obnovit" velkost={15} />}>
              {tr('Aktualizovať na {verzia}', { verzia: a.dostupna.verzia })}
            </Button>
          ) : (
            <div className="cw-licencia__upozornenie is-warning">
              <Icon nazov="licencia" velkost={16} />
              <span>
                {tr('Automatická inštalácia je na tomto serveri vypnutá. Zapnete ju v súbore backend/.env nastavením')}{' '}
                <code>AKTUALIZACIE_POVOLENE=true</code>
                {tr(' a reštartom backendu. Alebo aktualizujte ručne: stiahnite novú verziu, spustite npm ci, npm run build a npm run db:migrate a reštartujte backend.')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="cw-licencia__aktualne">
          <Badge ton="success">{tr('Aktuálne')}</Badge> {tr('Systém beží na najnovšej verzii {verzia}.', { verzia: a.verzia })}
        </p>
      )}

      {!bezi && beh && (
        <div className={`cw-licencia__upozornenie ${beh.stav === 'chyba' ? 'is-danger' : ''}`}>
          <Icon nazov={beh.stav === 'chyba' ? 'licencia' : 'obnovit'} velkost={16} />
          <span>
            {beh.stav === 'chyba'
              ? tr('Posledná aktualizácia na {verzia} zlyhala: {sprava}', { verzia: beh.verzia, sprava: beh.sprava ?? '' })
              : tr('Posledná aktualizácia na {verzia} je hotová.', { verzia: beh.verzia })}
            {beh.koniec && <> ({formatujDatumCas(new Date(beh.koniec))})</>}
          </span>
        </div>
      )}

      {a.log && (
        <details className="cw-aktualizacia__log" open={bezi || beh?.stav === 'chyba'}>
          <summary>{tr('Záznam aktualizácie')}</summary>
          <ZaznamLogu text={a.log} />
        </details>
      )}

      <ConfirmDialog
        otvorene={potvrdenie}
        nadpis={tr('Spustiť aktualizáciu?')}
        sprava={tr('Systém sa aktualizuje na verziu {verzia}. Pred aktualizáciou sa vytvorí záloha súborov a pri chybe sa pôvodná verzia obnoví. Na konci sa server reštartuje.', {
          verzia: a.dostupna?.verzia ?? '',
        })}
        potvrdit={tr('Aktualizovať')}
        nacitava={spusta}
        onPotvrd={spusti}
        onZrus={() => setPotvrdenie(false)}
      />
    </Card>
  );
};

export default Licencia;
