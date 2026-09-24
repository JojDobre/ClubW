// Umiestnenie: frontend/src/pages/admin/Sablony.tsx
// Šablóny verejného webu - ako témy vo WordPresse.
//
// Správca tu vidí nainštalované šablóny s náhľadom, jednou aktivuje
// vzhľad webu, pred aktiváciou si ju môže pozrieť (náhľad vidí len on),
// upraví jej nastavenia (farby, fotka na úvode...) a nahrá novú šablónu
// ako balík .zip. Ako šablónu vytvoriť, popisuje sablony/README.md.

import React, { useRef, useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Switch,
  Textarea,
  useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { useAuth } from '../../app/AuthContext';
import { souborUrl } from '../../config/api';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { sablonyApi, type HodnotaNastaveniaSablony, type NastavenieSablony, type SablonaWebu } from '../../api/sablony';
import { tr } from '../../i18n';
import './Sablony.css';

/** Jedno pole nastavenia podľa typu z sablona.json. */
const PoleNastavenia: React.FC<{
  n: NastavenieSablony;
  hodnota: HodnotaNastaveniaSablony;
  onZmena: (h: HodnotaNastaveniaSablony) => void;
}> = ({ n, hodnota, onZmena }) => {
  switch (n.typ) {
    case 'farba':
      return (
        <div className="cw-sab__farba">
          <label htmlFor={`sab-${n.kluc}`}>{n.menovka}</label>
          <div className="cw-sab__farba-riadok">
            <input
              id={`sab-${n.kluc}`}
              type="color"
              value={typeof hodnota === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hodnota) ? hodnota : '#000000'}
              onChange={(e) => onZmena(e.target.value.toUpperCase())}
            />
            <input
              type="text"
              className="cw-input"
              value={typeof hodnota === 'string' ? hodnota : ''}
              onChange={(e) => onZmena(e.target.value)}
              maxLength={7}
              placeholder="#RRGGBB"
              aria-label={tr('{menovka} - kód farby', { menovka: n.menovka })}
            />
          </div>
          {n.napoveda && <small>{n.napoveda}</small>}
        </div>
      );
    case 'prepinac':
      return <Switch zapnute={hodnota === true} onZmena={onZmena} menovka={n.menovka} popis={n.napoveda} />;
    case 'vyber':
      return (
        <Select
          menovka={n.menovka}
          napoveda={n.napoveda}
          value={String(hodnota ?? '')}
          onChange={(e) => onZmena(e.target.value)}
          moznosti={n.moznosti ?? []}
        />
      );
    case 'obrazok':
      return (
        <PoleObrazka
          menovka={n.menovka}
          napoveda={n.napoveda}
          hodnota={typeof hodnota === 'string' ? hodnota : null}
          onZmena={(cesta) => onZmena(cesta)}
        />
      );
    case 'dlhy_text':
      return (
        <Textarea
          menovka={n.menovka}
          napoveda={n.napoveda}
          rows={4}
          value={typeof hodnota === 'string' ? hodnota : ''}
          onChange={(e) => onZmena(e.target.value)}
        />
      );
    case 'cislo':
      return (
        <Input
          menovka={n.menovka}
          napoveda={n.napoveda}
          type="number"
          min={n.min}
          max={n.max}
          value={hodnota === null || hodnota === undefined ? '' : String(hodnota)}
          onChange={(e) => onZmena(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
    default:
      return (
        <Input
          menovka={n.menovka}
          napoveda={n.napoveda}
          value={typeof hodnota === 'string' ? hodnota : ''}
          onChange={(e) => onZmena(e.target.value)}
        />
      );
  }
};

/** Otvorí web v novej karte s inou šablónou - vidí ju len správca. */
const otvorNahlad = (slug: string) => {
  window.open(`/?nahlad_sablony=${encodeURIComponent(slug)}`, '_blank', 'noopener');
};

export const Sablony: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const { pouzivatel, smie } = useAuth();
  const sablony = useNacitanie((signal) => sablonyApi.vypis(signal));
  const smieUpravovat = smie('sablony', 'pisat');
  // Kód šablóny beží na webe - nahrávať a mazať smie len správca
  const jeSpravca = pouzivatel?.rola === 'admin';

  const [aktivuje, setAktivuje] = useState<string | null>(null);
  const [upravovana, setUpravovana] = useState<SablonaWebu | null>(null);
  const [hodnoty, setHodnoty] = useState<Record<string, HodnotaNastaveniaSablony>>({});
  const [uklada, setUklada] = useState(false);
  const [naZmazanie, setNaZmazanie] = useState<SablonaWebu | null>(null);
  const [maze, setMaze] = useState(false);
  const [nahrava, setNahrava] = useState(false);
  const [nahravanieOtvorene, setNahravanieOtvorene] = useState(false);
  const [subor, setSubor] = useState<File | null>(null);
  const [tahanie, setTahanie] = useState(false);
  const vstupRef = useRef<HTMLInputElement>(null);

  const zoznam = sablony.data ?? [];
  const aktivna = zoznam.find((s) => s.aktivna);

  const aktivuj = async (s: SablonaWebu) => {
    setAktivuje(s.slug);
    try {
      await sablonyApi.aktivuj(s.slug);
      uspech(tr('Web má teraz vzhľad {nazov}', { nazov: s.nazov }));
      sablony.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Šablónu sa nepodarilo aktivovať'));
    } finally {
      setAktivuje(null);
    }
  };

  const otvorNastavenia = (s: SablonaWebu) => {
    setUpravovana(s);
    setHodnoty({ ...s.hodnoty });
  };

  const obnovPredvolene = () => {
    if (!upravovana) return;
    const predvolene: Record<string, HodnotaNastaveniaSablony> = {};
    for (const n of upravovana.nastavenia) predvolene[n.kluc] = n.predvolene ?? (n.typ === 'prepinac' ? false : null);
    setHodnoty(predvolene);
  };

  const ulozNastavenia = async () => {
    if (!upravovana) return;
    setUklada(true);
    try {
      await sablonyApi.ulozNastavenia(upravovana.slug, hodnoty);
      uspech(tr('Nastavenia šablóny {nazov} boli uložené', { nazov: upravovana.nazov }));
      setUpravovana(null);
      sablony.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Nastavenia sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const vyberSubor = (f: File | null | undefined) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) {
      varovanie(tr('Šablóna sa nahráva ako balík .zip'));
      return;
    }
    setSubor(f);
  };

  const nahraj = async () => {
    if (!subor) return varovanie(tr('Vyberte balík šablóny (.zip)'));
    setNahrava(true);
    try {
      const v = await sablonyApi.nahraj(subor);
      uspech(
        v.predchadzajuca_verzia
          ? tr('Šablóna {nazov} bola aktualizovaná z verzie {predchadzajuca_verzia} na {verzia}', { nazov: v.nazov, predchadzajuca_verzia: v.predchadzajuca_verzia, verzia: v.verzia })
          : tr('Šablóna {nazov} bola nainštalovaná', { nazov: v.nazov })
      );
      setNahravanieOtvorene(false);
      setSubor(null);
      sablony.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Šablónu sa nepodarilo nahrať'));
    } finally {
      setNahrava(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await sablonyApi.zmaz(naZmazanie.slug);
      uspech(tr('Šablóna {nazov} bola zmazaná', { nazov: naZmazanie.nazov }));
      setNaZmazanie(null);
      sablony.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Šablónu sa nepodarilo zmazať'));
    } finally {
      setMaze(false);
    }
  };

  return (
    <div className="cw-screen cw-sab">
      <PageHeader
        nadpis={tr('Šablóny')}
        podnadpis={
          aktivna
            ? tr('Vzhľad verejného webu. Aktívna je šablóna {nazov}.', { nazov: aktivna.nazov })
            : tr('Vzhľad verejného webu - vyberte, ktorá šablóna je aktívna.')
        }
        akcie={
          jeSpravca && (
            <Button ikona={<Icon nazov="nahrat" velkost={16} />} onClick={() => setNahravanieOtvorene(true)}>
              {tr('Pridať šablónu')}
            </Button>
          )
        }
      />

      {sablony.chyba ? (
        <ErrorState sprava={tr('Šablóny sa nepodarilo načítať')} detail={sablony.chyba} onSkusZnova={sablony.obnov} />
      ) : sablony.nacitava && !sablony.data ? (
        <div className="cw-sab__mriezka">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cw-sab__karta">
              <Skeleton riadkov={5} />
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <EmptyState
          ikona={<Icon nazov="sablony" velkost={40} />}
          nadpis={tr('Žiadne šablóny')}
          popis={tr('Priečinok so šablónami je prázdny. Web beží so vstavaným vzhľadom.')}
        />
      ) : (
        <div className="cw-sab__mriezka">
          {zoznam.map((s) => (
            <article key={s.slug} className={`cw-sab__karta${s.aktivna ? ' is-aktivna' : ''}${s.chyba ? ' is-poskodena' : ''}`}>
              <div className="cw-sab__nahlad">
                {s.nahlad ? (
                  <img src={souborUrl(s.nahlad)} alt={tr('Náhľad šablóny {nazov}', { nazov: s.nazov })} loading="lazy" />
                ) : (
                  <span className="cw-sab__bez-nahladu">
                    <Icon nazov="sablony" velkost={36} />
                  </span>
                )}
                {s.aktivna && <span className="cw-sab__aktivna-znacka">{tr('Aktívna')}</span>}
              </div>

              <div className="cw-sab__telo">
                <div className="cw-sab__hlava">
                  <h3>{s.nazov}</h3>
                  {s.verzia && <span className="cw-sab__verzia">v{s.verzia}</span>}
                </div>
                <div className="cw-sab__stitky">
                  {s.vstavana && <Badge>{tr('Dodaná so systémom')}</Badge>}
                  {s.chyba && <Badge ton="danger">{tr('Poškodená')}</Badge>}
                  {!s.chyba && s.nastavenia.length > 0 && <Badge ton="info">{s.nastavenia.length} {tr('nastavení')}</Badge>}
                </div>
                {s.chyba ? (
                  <p className="cw-sab__chyba">{s.chyba}</p>
                ) : (
                  s.popis && <p className="cw-sab__popis">{s.popis}</p>
                )}
                {s.autor && (
                  <p className="cw-sab__autor">
                    {tr('Autor:')}{' '}
                    {s.web_autora ? (
                      <a href={s.web_autora} target="_blank" rel="noopener noreferrer">
                        {s.autor}
                      </a>
                    ) : (
                      s.autor
                    )}
                  </p>
                )}
              </div>

              <div className="cw-sab__akcie">
                {!s.chyba && !s.aktivna && smieUpravovat && (
                  <Button velkost="sm" onClick={() => aktivuj(s)} nacitava={aktivuje === s.slug} disabled={aktivuje !== null}>
                    {tr('Aktivovať')}
                  </Button>
                )}
                {!s.chyba && !s.aktivna && (
                  <Button velkost="sm" variant="secondary" ikona={<Icon nazov="oko" velkost={14} />} onClick={() => otvorNahlad(s.slug)}>
                    {tr('Náhľad')}
                  </Button>
                )}
                {s.aktivna && (
                  <Button velkost="sm" variant="secondary" ikona={<Icon nazov="oko" velkost={14} />} onClick={() => window.open('/', '_blank', 'noopener')}>
                    {tr('Zobraziť web')}
                  </Button>
                )}
                {!s.chyba && s.nastavenia.length > 0 && smieUpravovat && (
                  <Button velkost="sm" variant="secondary" ikona={<Icon nazov="nastavenia" velkost={14} />} onClick={() => otvorNastavenia(s)}>
                    {tr('Prispôsobiť')}
                  </Button>
                )}
                {!s.vstavana && !s.aktivna && jeSpravca && (
                  <Button velkost="sm" variant="ghost" onClick={() => setNaZmazanie(s)} aria-label={tr('Zmazať šablónu {nazov}', { nazov: s.nazov })}>
                    <Icon nazov="zmazat" velkost={14} />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="cw-sab__navod">
        {tr('Novú šablónu nahráte ako balík')} <code>{tr('.zip')}</code> {tr('so súborom')} <code>{tr('sablona.json')}</code>{tr('. Nahratím balíka so šablónou, ktorá už existuje, ju aktualizujete na novšiu verziu. Ako šablónu vytvoriť, popisuje súbor')}{' '}
        <code>{tr('sablony/README.md')}</code>.
      </p>

      {/* ===== Prispôsobenie ===== */}
      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={upravovana ? tr('Prispôsobiť: {nazov}', { nazov: upravovana.nazov }) : ''}
        podnadpis={upravovana?.aktivna ? tr('Zmeny sa na webe prejavia hneď po uložení.') : tr('Šablóna nie je aktívna - zmeny uvidíte v náhľade.')}
        sirka="md"
        pata={
          <>
            <Button variant="ghost" onClick={obnovPredvolene} disabled={uklada}>
              {tr('Predvolené hodnoty')}
            </Button>
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={ulozNastavenia} nacitava={uklada}>
              {tr('Uložiť')}
            </Button>
          </>
        }
      >
        {upravovana && (
          <div className="cw-sab__formular">
            {upravovana.nastavenia.map((n) => (
              <PoleNastavenia key={n.kluc} n={n} hodnota={hodnoty[n.kluc] ?? null} onZmena={(h) => setHodnoty((v) => ({ ...v, [n.kluc]: h }))} />
            ))}
          </div>
        )}
      </Modal>

      {/* ===== Nahranie ===== */}
      <Modal
        otvorene={nahravanieOtvorene}
        onZavri={() => {
          setNahravanieOtvorene(false);
          setSubor(null);
        }}
        nadpis={tr('Pridať šablónu')}
        podnadpis={tr('Balík .zip so šablónou (najviac 15 MB)')}
        pata={
          <>
            <Button variant="secondary" onClick={() => setNahravanieOtvorene(false)} disabled={nahrava}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={nahraj} nacitava={nahrava} disabled={!subor}>
              {tr('Nahrať šablónu')}
            </Button>
          </>
        }
      >
        <div
          className={`cw-sab__upload${tahanie ? ' is-tahanie' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setTahanie(true);
          }}
          onDragLeave={() => setTahanie(false)}
          onDrop={(e) => {
            e.preventDefault();
            setTahanie(false);
            vyberSubor(e.dataTransfer.files?.[0]);
          }}
        >
          <Icon nazov="nahrat" velkost={30} />
          {subor ? (
            <p>
              <strong>{subor.name}</strong> ({(subor.size / 1024).toFixed(0)} kB)
            </p>
          ) : (
            <p>{tr('Pretiahnite sem balík šablóny alebo ho vyberte z počítača.')}</p>
          )}
          <Button variant="secondary" velkost="sm" onClick={() => vstupRef.current?.click()}>
            {tr('Vybrať súbor')}
          </Button>
          <input
            ref={vstupRef}
            type="file"
            accept=".zip,application/zip"
            hidden
            aria-label={tr('Balík šablóny')}
            onChange={(e) => {
              vyberSubor(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <p className="cw-sab__upozornenie">
          {tr('Šablóna môže obsahovať kód, ktorý sa spustí na webe. Nahrávajte len šablóny od autorov, ktorým dôverujete.')}
        </p>
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Zmazať šablónu?')}
        sprava={tr('Šablóna {hodnota} a jej nastavenia budú zmazané. Neskôr ju môžete nahrať znova.', { hodnota: naZmazanie?.nazov ?? '' })}
        potvrdit={tr('Zmazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Sablony;
