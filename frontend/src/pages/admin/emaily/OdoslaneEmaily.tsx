// Umiestnenie: frontend/src/pages/admin/emaily/OdoslaneEmaily.tsx
// E-maily → Odoslané: záznam všetkých e-mailov (odoslané, čakajúce,
// chyby) s detailom, náhľadom a opätovným odoslaním. Záznamy sa po
// 180 dňoch mažú.

import React, { useEffect, useState } from 'react';
import { PageHeader, Badge, Button, Card, DataTable, FilterChips, Input, Modal, Icon, useToast, type Stlpec, type AkciaRiadku, type TonStitka } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { emailyApi, type ZaznamEmailu, type StavZaznamu } from '../../../api/emaily';
import { tr } from '../../../i18n';
import { NahladEmailu, PasStavu, POPIS_SABLON } from './spolocne';
import './Emaily.css';

const STAVY: Record<StavZaznamu, { popis: string; ton: TonStitka }> = {
  odoslany: { popis: tr('Odoslaný'), ton: 'success' },
  konzola: { popis: tr('Len v konzole'), ton: 'neutral' },
  caka: { popis: tr('Čaká'), ton: 'warning' },
  odosiela: { popis: tr('Odosiela sa'), ton: 'warning' },
  chyba: { popis: tr('Chyba'), ton: 'danger' },
};

const cas = (d: string | null) => (d ? new Date(d).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const nazovSablony = (s: string | null) =>
  !s ? tr('Bez šablóny') : s === 'kampan' ? tr('Hromadný e-mail') : s === 'test' ? tr('Skúšobný e-mail') : POPIS_SABLON[s]?.nazov ?? s;

export const OdoslaneEmaily: React.FC = () => {
  const { uspech, chyba: hlasChybu } = useToast();
  const [stav, setStav] = useState('');
  const [hladat, setHladat] = useState('');
  const [dotaz, setDotaz] = useState('');
  const [strana, setStrana] = useState(1);
  const [polozky, setPolozky] = useState<ZaznamEmailu[]>([]);
  const [detail, setDetail] = useState<ZaznamEmailu | null>(null);
  const [posiela, setPosiela] = useState<number | null>(null);
  const [spracuva, setSpracuva] = useState(false);

  const stavEmailov = useNacitanie((signal) => emailyApi.stav(signal));
  const zoznam = useNacitanie((signal) => emailyApi.odoslane({ stav, hladat: dotaz, strana }, signal), [stav, dotaz, strana]);

  useEffect(() => {
    if (!zoznam.data) return;
    setPolozky((p) => (strana === 1 ? zoznam.data!.polozky : [...p, ...zoznam.data!.polozky]));
  }, [zoznam.data, strana]);

  // Hľadanie sa spustí chvíľu po písaní
  useEffect(() => {
    const t = window.setTimeout(() => {
      setStrana(1);
      setDotaz(hladat.trim());
    }, 350);
    return () => window.clearTimeout(t);
  }, [hladat]);

  const obnov = () => {
    setStrana(1);
    zoznam.obnov();
    stavEmailov.obnov();
  };

  const otvor = async (z: ZaznamEmailu) => {
    try {
      setDetail(await emailyApi.detailEmailu(z.id));
    } catch (e: any) {
      hlasChybu(e?.message || tr('E-mail sa nepodarilo načítať'));
    }
  };

  const posliZnova = async (z: ZaznamEmailu) => {
    setPosiela(z.id);
    try {
      const novy = await emailyApi.posliZnova(z.id);
      uspech(tr('E-mail bol odoslaný'));
      if (detail?.id === z.id) setDetail({ ...detail, ...novy });
      obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('E-mail sa nepodarilo odoslať'));
      obnov();
    } finally {
      setPosiela(null);
    }
  };

  const spracuj = async () => {
    setSpracuva(true);
    try {
      const { odoslane } = await emailyApi.spracujFrontu();
      uspech(tr('Odoslané e-maily: {pocet}', { pocet: odoslane }));
      obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('E-maily sa nepodarilo odoslať'));
    } finally {
      setSpracuva(false);
    }
  };

  const pocty = zoznam.data?.pocty;
  const celkom = zoznam.data?.celkom ?? 0;

  const stlpce: Stlpec<ZaznamEmailu>[] = [
    {
      kluc: 'prijemca',
      popis: tr('E-mail'),
      obsah: (z) => (
        <div className="cw-hraci__meno">
          <span className="cw-hraci__meno-text">{z.predmet}</span>
          <span className="cw-em-male">
            {z.prijemca} · {nazovSablony(z.sablona)}
          </span>
        </div>
      ),
    },
    {
      kluc: 'cas',
      popis: tr('Čas'),
      obsah: (z) => <span className="cw-em-tlmene">{cas(z.odoslany ?? z.vytvoreny)}</span>,
      sirka: '170px',
      skryTNaMobile: true,
    },
    {
      kluc: 'stav',
      popis: tr('Stav'),
      obsah: (z) => (
        <div className="cw-hraci__meno">
          <span>
            <Badge ton={STAVY[z.stav]?.ton ?? 'neutral'}>{STAVY[z.stav]?.popis ?? z.stav}</Badge>
          </span>
          {z.posledna_chyba && z.stav !== 'odoslany' && <span className="cw-em-male cw-em-chyba">{z.posledna_chyba}</span>}
        </div>
      ),
      sirka: '280px',
    },
  ];

  const akcie: AkciaRiadku<ZaznamEmailu>[] = [
    { popis: tr('Zobraziť'), ikona: 'oko', onKlik: otvor },
    { popis: tr('Poslať znova'), ikona: 'odoslat', onKlik: posliZnova, zobrazit: (z) => z.stav !== 'odosiela' },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Odoslané e-maily')}
        podnadpis={tr('Všetky e-maily z webu za posledných 180 dní. E-mail, ktorý sa nepodarilo poslať, systém skúsi znova po 1, 5, 15 a 60 minútach.')}
        akcie={
          (pocty?.caka ?? 0) > 0 ? (
            <Button variant="secondary" ikona={<Icon nazov="odoslat" velkost={16} />} onClick={spracuj} nacitava={spracuva}>
              {tr('Poslať čakajúce teraz')}
            </Button>
          ) : undefined
        }
      />
      <PasStavu stav={stavEmailov.data} />
      <FilterChips
        moznosti={[
          { hodnota: '', popis: tr('Všetky') },
          { hodnota: 'odoslany', popis: tr('Odoslané'), pocet: pocty?.odoslany },
          { hodnota: 'caka', popis: tr('Čakajú'), pocet: pocty?.caka },
          { hodnota: 'chyba', popis: tr('Chyby'), pocet: pocty?.chyba },
        ]}
        zvolena={stav}
        onZmena={(s) => {
          setStav(s);
          setStrana(1);
        }}
        popisSkupiny={tr('Filtrovať podľa stavu')}
      />
      <Card bezOdsadenia>
        <div style={{ padding: 'var(--sp-3) var(--sp-4) 0' }}>
          <Input
            value={hladat}
            onChange={(e) => setHladat(e.target.value)}
            placeholder={tr('Hľadať podľa príjemcu alebo predmetu…')}
            ikona={<Icon nazov="hladat" velkost={16} />}
            aria-label={tr('Hľadať')}
          />
        </div>
        <DataTable<ZaznamEmailu>
          data={polozky}
          idZaznamu={(z) => z.id}
          stlpce={stlpce}
          nacitava={zoznam.nacitava && strana === 1}
          chyba={zoznam.chyba}
          onSkusZnova={zoznam.obnov}
          akcieRiadku={akcie}
          onKlikNaRiadok={otvor}
          naStranu={1000}
          prazdnyNadpis={tr('Zatiaľ žiadne e-maily')}
          prazdnyPopis={tr('Keď web pošle prvý e-mail (objednávka, heslo, formulár), uvidíte ho tu.')}
        />
        {polozky.length < celkom && (
          <div style={{ padding: 'var(--sp-3)', textAlign: 'center' }}>
            <Button variant="secondary" onClick={() => setStrana((s) => s + 1)} nacitava={zoznam.nacitava}>
              {tr('Načítať ďalšie ({pocet})', { pocet: celkom - polozky.length })}
            </Button>
          </div>
        )}
      </Card>

      <Modal
        otvorene={detail !== null}
        onZavri={() => setDetail(null)}
        nadpis={detail?.predmet ?? ''}
        sirka="lg"
        pata={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              {tr('Zavrieť')}
            </Button>
            {detail && detail.stav !== 'odosiela' && (
              <Button ikona={<Icon nazov="odoslat" velkost={16} />} onClick={() => posliZnova(detail)} nacitava={posiela === detail.id}>
                {tr('Poslať znova')}
              </Button>
            )}
          </>
        }
      >
        {detail && (
          <div className="cw-em-detail">
            <dl>
              <dt>{tr('Komu')}</dt>
              <dd>{detail.prijemca}</dd>
              <dt>{tr('E-mail')}</dt>
              <dd>{nazovSablony(detail.sablona)}</dd>
              <dt>{tr('Stav')}</dt>
              <dd>
                <Badge ton={STAVY[detail.stav]?.ton ?? 'neutral'}>{STAVY[detail.stav]?.popis ?? detail.stav}</Badge>
                {detail.pokusy > 0 && <span className="cw-em-male"> · {tr('pokusy: {pocet}', { pocet: detail.pokusy })}</span>}
              </dd>
              <dt>{tr('Vytvorený')}</dt>
              <dd>{cas(detail.vytvoreny)}</dd>
              {detail.odoslany && (
                <>
                  <dt>{tr('Odoslaný')}</dt>
                  <dd>{cas(detail.odoslany)}</dd>
                </>
              )}
              {detail.stav === 'caka' && (
                <>
                  <dt>{tr('Ďalší pokus')}</dt>
                  <dd>{cas(detail.odoslat_po)}</dd>
                </>
              )}
              {detail.posledna_chyba && (
                <>
                  <dt>{tr('Chyba')}</dt>
                  <dd className="cw-em-chyba">{detail.posledna_chyba}</dd>
                </>
              )}
            </dl>
            <NahladEmailu email={{ predmet: detail.predmet, text: detail.text ?? '', html: detail.html ?? `<pre>${(detail.text ?? '').replace(/</g, '&lt;')}</pre>` }} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OdoslaneEmaily;
