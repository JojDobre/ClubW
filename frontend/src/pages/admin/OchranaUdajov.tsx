// Umiestnenie: frontend/src/pages/admin/OchranaUdajov.tsx
// Súhlasy so spracovaním osobných údajov, export, anonymizácia a audit.
//
// Obrazovka je určená správcovi klubu, ktorý musí vedieť preukázať,
// že má na zverejnenie údajov detí súhlas zákonného zástupcu.

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader, Card, Button, Badge, Icon, Select, Input, Switch, Modal,
  Skeleton, EmptyState, ConfirmDialog, useToast, StatCard,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { gdprApi } from '../../api/sprava';
import { hraciApi } from '../../api/sport';
import { formatujDatum, formatujDatumCas } from '../../utils/datum';
import type { DruhSuhlasu, Suhlas } from '../../api/typy';
import { tr } from '../../i18n';
import './OchranaUdajov.css';

/** Popisy druhov súhlasu a vysvetlenie, čo znamenajú. */
const DRUHY: Record<DruhSuhlasu, { popis: string; vysvetlenie: string }> = {
  zverejnenie_fotky: {
    popis: tr('Zverejnenie fotky'),
    vysvetlenie: tr('Fotka hráča sa môže zobraziť na verejnom webe'),
  },
  zverejnenie_mena: {
    popis: tr('Zverejnenie mena'),
    vysvetlenie: tr('Celé meno sa môže zobraziť na verejnom webe'),
  },
  spracovanie_udajov: {
    popis: tr('Vedenie evidencie'),
    vysvetlenie: tr('Základný súhlas s vedením údajov v klube'),
  },
  kontaktne_udaje: {
    popis: tr('Kontaktné údaje'),
    vysvetlenie: tr('Telefón a e-mail zákonného zástupcu'),
  },
  marketing: {
    popis: tr('Oznamy a newsletter'),
    vysvetlenie: tr('Zasielanie klubových oznamov'),
  },
};

const VZTAHY = [
  { hodnota: 'matka', popis: tr('Matka') },
  { hodnota: 'otec', popis: tr('Otec') },
  { hodnota: 'zakonny_zastupca', popis: tr('Iný zákonný zástupca') },
  { hodnota: 'hrac', popis: tr('Hráč sám (dospelý)') },
];

export const OchranaUdajov: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const [parametre, setParametre] = useSearchParams();

  // Hráč z adresy — obrazovka sa dá otvoriť priamo zo zoznamu hráčov
  const hracZAdresy = parametre.get('hrac');
  const [vybranyHrac, setVybranyHrac] = useState<number | null>(
    hracZAdresy ? Number(hracZAdresy) : null
  );

  const [udelovany, setUdelovany] = useState<{
    druh: DruhSuhlasu;
    udelil_meno: string;
    udelil_vztah: string;
    zdroj: string;
  } | null>(null);

  const [anonymizovat, setAnonymizovat] = useState(false);
  const [uklada, setUklada] = useState(false);

  const hraci = useNacitanie((signal) => hraciApi.vypis(undefined, signal));
  const retencia = useNacitanie((signal) => gdprApi.retencia(signal));
  const audit = useNacitanie((signal) => gdprApi.audit({ limit: 30 }, signal));

  const suhlasy = useNacitanie(
    (signal) => (vybranyHrac !== null ? gdprApi.suhlasy(vybranyHrac, signal) : Promise.resolve(null)),
    [vybranyHrac]
  );

  // Zmenu hráča držíme aj v adrese, aby sa dala poslať odkazom
  useEffect(() => {
    if (vybranyHrac !== null) {
      setParametre({ hrac: String(vybranyHrac) }, { replace: true });
    }
  }, [vybranyHrac, setParametre]);

  const zoznamHracov = hraci.data ?? [];
  const prehlad = suhlasy.data;
  const jeMaloletý = prehlad?.['maloletý'] ?? false;

  /** Udelí alebo odvolá súhlas. */
  const nastavSuhlas = async (druh: DruhSuhlasu, udeleny: boolean, detaily?: {
    udelil_meno?: string;
    udelil_vztah?: string;
    zdroj?: string;
  }) => {
    if (vybranyHrac === null) return;

    setUklada(true);
    try {
      await gdprApi.nastavSuhlas(vybranyHrac, { druh, udeleny, ...detaily });
      uspech(udeleny ? tr('Súhlas bol zaznamenaný') : tr('Súhlas bol odvolaný'));
      setUdelovany(null);
      suhlasy.obnov();
      audit.obnov();
      // Zoznam hráčov obnovíme, aby sa premietlo skrytie alebo
      // zobrazenie fotky na verejnom webe
      hraci.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Súhlas sa nepodarilo zmeniť'));
    } finally {
      setUklada(false);
    }
  };

  /** Kliknutie na prepínač súhlasu. */
  const prepniSuhlas = (s: Suhlas) => {
    if (s.platny) {
      // Odvolanie nepotrebuje ďalšie údaje
      void nastavSuhlas(s.druh, false);
      return;
    }

    // Pri maloletom musíme zaznamenať, kto súhlas udelil
    if (jeMaloletý) {
      setUdelovany({
        druh: s.druh,
        udelil_meno: s.udelil_meno ?? '',
        udelil_vztah: s.udelil_vztah ?? 'matka',
        zdroj: s.zdroj ?? 'papierový formulár',
      });
    } else {
      void nastavSuhlas(s.druh, true);
    }
  };

  const potvrdUdelenie = () => {
    if (!udelovany) return;

    if (!udelovany.udelil_meno.trim()) {
      varovanie(tr('Zadajte meno zákonného zástupcu'));
      return;
    }

    void nastavSuhlas(udelovany.druh, true, {
      udelil_meno: udelovany.udelil_meno.trim(),
      udelil_vztah: udelovany.udelil_vztah,
      zdroj: udelovany.zdroj.trim() || undefined,
    });
  };

  /** Stiahnutie exportu ako súbor JSON. */
  const exportuj = async () => {
    if (vybranyHrac === null) return;

    try {
      const data = await gdprApi.export(vybranyHrac);
      const hrac = zoznamHracov.find((h) => h.id === vybranyHrac);

      // Vytvoríme súbor v prehliadači a spustíme stiahnutie
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const odkaz = document.createElement('a');
      odkaz.href = url;
      odkaz.download = `osobne-udaje-${hrac?.priezvisko ?? vybranyHrac}.json`;
      odkaz.click();
      URL.revokeObjectURL(url);

      uspech(tr('Export bol stiahnutý. Odovzdajte ho dotknutej osobe.'));
      audit.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Export sa nepodarilo vytvoriť'));
    }
  };

  const anonymizuj = async () => {
    if (vybranyHrac === null) return;

    setUklada(true);
    try {
      await gdprApi.anonymizuj(vybranyHrac);
      uspech(tr('Osobné údaje boli odstránené. Športová história zostala zachovaná.'));
      setAnonymizovat(false);
      suhlasy.obnov();
      hraci.obnov();
      audit.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Anonymizáciu sa nepodarilo vykonať'));
    } finally {
      setUklada(false);
    }
  };

  const r = retencia.data;

  return (
    <div className="cw-gdpr">
      <PageHeader nadpis={tr('Ochrana údajov')} podnadpis={tr('Súhlasy, práva dotknutých osôb a záznam o spracovaní.')} />

      {/* ===== Prehľad ===== */}
      <div className="cw-gdpr__karty">
        <StatCard
          menovka={tr('Doba uchovávania')}
          hodnota={r ? `${r.doba_uchovavania_rokov} r.` : '—'}
          ikona={<Icon nazov="hodiny" velkost={16} />}
          nacitava={retencia.nacitava}
        />
        <StatCard
          menovka={tr('Na posúdenie')}
          hodnota={r?.pocet_na_posudenie ?? '—'}
          zmena={r && r.pocet_na_posudenie > 0 ? tr('presiahli dobu uchovávania') : undefined}
          zmenaKladna={false}
          ikona={<Icon nazov="gdpr" velkost={16} />}
          nacitava={retencia.nacitava}
        />
        <StatCard
          menovka={tr('Vypršané súhlasy')}
          hodnota={r?.vyprsane_suhlasy ?? '—'}
          ikona={<Icon nazov="licencia" velkost={16} />}
          nacitava={retencia.nacitava}
        />
      </div>

      {/* ===== Súhlasy hráča ===== */}
      <Card
        nadpis={tr('Súhlasy so spracovaním údajov')}
        podnadpis={tr('Pri hráčoch do 18 rokov je na zverejnenie potrebný súhlas zákonného zástupcu')}
      >
        <Select
          menovka={tr('Hráč')}
          value={vybranyHrac ?? ''}
          onChange={(e) => setVybranyHrac(e.target.value ? Number(e.target.value) : null)}
          prazdna={tr('Vyberte hráča')}
          moznosti={zoznamHracov.map((h) => ({
            hodnota: h.id,
            popis: `${h.meno} ${h.priezvisko}`,
          }))}
        />

        {vybranyHrac === null ? (
          <EmptyState
            ikona={<Icon nazov="gdpr" velkost={36} />}
            nadpis={tr('Vyberte hráča')}
            popis={tr('Po výbere hráča uvidíte prehľad jeho súhlasov a možnosti spracovania údajov.')}
          />
        ) : suhlasy.nacitava ? (
          <Skeleton riadkov={5} vyska="20px" />
        ) : prehlad ? (
          <>
            <div className="cw-gdpr__hrac">
              <span className="cw-gdpr__hrac-meno">
                {prehlad.hrac.meno} {prehlad.hrac.priezvisko}
              </span>
              {jeMaloletý ? (
                <Badge ton="warning">{tr('Maloletý — vyžaduje súhlas zástupcu')}</Badge>
              ) : (
                <Badge ton="neutral">{tr('Dospelý')}</Badge>
              )}
            </div>

            <ul className="cw-gdpr__suhlasy">
              {prehlad.suhlasy.map((s) => (
                <li key={s.druh} className="cw-gdpr__suhlas">
                  <div className="cw-gdpr__suhlas-text">
                    <span className="cw-gdpr__suhlas-nazov">{DRUHY[s.druh]?.popis ?? s.druh}</span>
                    <span className="cw-gdpr__suhlas-popis">
                      {DRUHY[s.druh]?.vysvetlenie}
                    </span>
                    {s.platny && s.udelil_meno && (
                      <span className="cw-gdpr__suhlas-udelil">
                        {tr('Udelil:')} {s.udelil_meno}
                        {s.udelil_vztah && ` (${VZTAHY.find((v) => v.hodnota === s.udelil_vztah)?.popis ?? s.udelil_vztah})`}
                        {s.datum_udelenia && ` · ${formatujDatum(s.datum_udelenia)}`}
                        {s.zdroj && ` · ${s.zdroj}`}
                      </span>
                    )}
                    {!s.platny && s.datum_odvolania && (
                      <span className="cw-gdpr__suhlas-udelil">
                        {tr('Odvolaný')} {formatujDatum(s.datum_odvolania)}
                      </span>
                    )}
                  </div>

                  <Switch
                    zapnute={s.platny}
                    onZmena={() => prepniSuhlas(s)}
                    disabled={uklada}
                  />
                </li>
              ))}
            </ul>

            {/* ===== Práva dotknutej osoby ===== */}
            <div className="cw-gdpr__prava">
              <div className="cw-gdpr__pravo">
                <div>
                  <strong>{tr('Právo na prístup')}</strong>
                  <p>{tr('Stiahnutie všetkých údajov, ktoré o hráčovi vedieme.')}</p>
                </div>
                <Button variant="secondary" velkost="sm" onClick={exportuj} ikona={<Icon nazov="ulozit" velkost={14} />}>
                  {tr('Stiahnuť údaje')}
                </Button>
              </div>

              <div className="cw-gdpr__pravo">
                <div>
                  <strong>{tr('Právo na výmaz')}</strong>
                  <p>
                    {tr('Odstráni osobné údaje. Štatistiky odohraných zápasov zostanú zachované pod anonymným označením, aby sa nerozpadli výsledky minulých sezón.')}
                  </p>
                </div>
                <Button variant="danger" velkost="sm" onClick={() => setAnonymizovat(true)}>
                  {tr('Anonymizovať')}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </Card>

      {/* ===== Retencia ===== */}
      {r && r.pocet_na_posudenie > 0 && (
        <Card
          nadpis={tr('Údaje po dobe uchovávania')}
          podnadpis={tr('Neaktívni hráči bez zmeny od {hranica}. Posúďte, či ich údaje ešte potrebujete.', { hranica: r.hranica })}
        >
          <ul className="cw-gdpr__retencia">
            {r.na_posudenie.map((h) => (
              <li key={h.id}>
                <button className="cw-gdpr__retencia-hrac" onClick={() => setVybranyHrac(h.id)}>
                  {h.meno} {h.priezvisko}
                  <Icon nazov="sipkaVpravo" velkost={14} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ===== Audit ===== */}
      <Card
        nadpis={tr('Záznam o spracovaní')}
        podnadpis={tr('Kto a kedy pracoval s osobnými údajmi')}
        bezOdsadenia
      >
        {audit.nacitava ? (
          <div style={{ padding: 'var(--sp-4)' }}>
            <Skeleton riadkov={4} vyska="16px" />
          </div>
        ) : (audit.data ?? []).length === 0 ? (
          <p className="cw-gdpr__prazdne">{tr('Zatiaľ žiadne záznamy.')}</p>
        ) : (
          <ul className="cw-gdpr__audit">
            {(audit.data ?? []).map((z) => (
              <li key={z.id} className="cw-gdpr__audit-zaznam">
                <span className="cw-gdpr__audit-cas">{formatujDatumCas(z.vytvoreny)}</span>
                <Badge
                  ton={
                    z.akcia === 'anonymizacia' ? 'danger'
                      : z.akcia === 'export_udajov' ? 'warning'
                        : 'neutral'
                  }
                >
                  {z.akcia.replace(/_/g, ' ')}
                </Badge>
                <span className="cw-gdpr__audit-popis">{z.popis ? tr(z.popis) : `${tr(z.entita)} #${z.entita_id}`}</span>
                <span className="cw-gdpr__audit-kto">{z.pouzivatel_email ?? tr('systém')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ===== Okno udelenia súhlasu ===== */}
      <Modal
        otvorene={udelovany !== null}
        onZavri={() => setUdelovany(null)}
        nadpis={tr('Zaznamenať súhlas')}
        podnadpis={udelovany ? DRUHY[udelovany.druh]?.popis : undefined}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUdelovany(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={potvrdUdelenie} nacitava={uklada}>
              {tr('Zaznamenať')}
            </Button>
          </>
        }
      >
        {udelovany && (
          <>
            <p className="cw-gdpr__vysvetlenie">
              {tr('Hráč je maloletý. Zaznamenajte, kto súhlas udelil — bez tejto informácie nie je možné jeho platnosť preukázať.')}
            </p>

            <Input
              menovka={tr('Meno zákonného zástupcu')}
              value={udelovany.udelil_meno}
              onChange={(e) => setUdelovany((d) => ({ ...d!, udelil_meno: e.target.value }))}
              placeholder={tr('Anna Nováková')}
              povinne
            />

            <Select
              menovka={tr('Vzťah k dieťaťu')}
              value={udelovany.udelil_vztah}
              onChange={(e) => setUdelovany((d) => ({ ...d!, udelil_vztah: e.target.value }))}
              moznosti={VZTAHY}
              povinne
            />

            <Input
              menovka={tr('Podklad')}
              value={udelovany.zdroj}
              onChange={(e) => setUdelovany((d) => ({ ...d!, zdroj: e.target.value }))}
              placeholder={tr('papierový formulár')}
              napoveda={tr('Na základe čoho súhlas zaznamenávate — formulár, e-mail, prihláška')}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={anonymizovat}
        nadpis={tr('Anonymizovať údaje hráča?')}
        sprava={tr('Meno, dátum narodenia, fotka a telesné údaje budú nezvratne odstránené. Góly a súpisky zostanú pod anonymným označením, aby sa nerozpadli výsledky minulých sezón. Túto akciu nemožno vrátiť späť.')}
        potvrdit={tr('Anonymizovať')}
        nebezpecne
        nacitava={uklada}
        onPotvrd={anonymizuj}
        onZrus={() => setAnonymizovat(false)}
      />
    </div>
  );
};

export default OchranaUdajov;
