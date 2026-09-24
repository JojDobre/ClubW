// Umiestnenie: frontend/src/pages/admin/Logy.tsx
// Logy - všetky udalosti v administrácii (kto, čo, kedy) s filtrovaním.

import React, { useEffect, useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Input, Select, Skeleton, EmptyState, ErrorState, useToast,
  type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { logyApi, NAZVY_AKCII, opisZaznamu, type FiltreLogov, type ZaznamLogu } from '../../api/logy';
import { formatujDatumCas } from '../../utils/datum';
import { tr } from '../../i18n';
import './Logy.css';

const NA_STRANU = 100;

const TON_AKCIE: Record<string, TonStitka> = {
  vytvorenie: 'success',
  uprava: 'info',
  zmazanie: 'danger',
  prihlasenie: 'neutral',
  zmena_hesla: 'warning',
  anonymizacia: 'warning',
  export_udajov: 'primary',
  zmena_suhlasu: 'primary',
};

const PRAZDNE: FiltreLogov = { akcia: '', entita: '', pouzivatel_id: undefined, od: '', do: '', hladat: '' };

export const Logy: React.FC = () => {
  const { chyba: hlasChybu } = useToast();
  const [filtre, setFiltre] = useState<FiltreLogov>(PRAZDNE);
  const [hladat, setHladat] = useState('');
  const [zaznamy, setZaznamy] = useState<ZaznamLogu[]>([]);
  const [celkom, setCelkom] = useState(0);
  const [nacitava, setNacitava] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [obnovit, setObnovit] = useState(0);

  const moznosti = useNacitanie((signal) => logyApi.moznosti(signal));

  // Hľadanie s oneskorením
  useEffect(() => {
    const casovac = setTimeout(() => setFiltre((f) => ({ ...f, hladat: hladat.trim() })), 350);
    return () => clearTimeout(casovac);
  }, [hladat]);

  const parametre = (offset: number): FiltreLogov => ({
    akcia: filtre.akcia || undefined,
    entita: filtre.entita || undefined,
    pouzivatel_id: filtre.pouzivatel_id || undefined,
    od: filtre.od || undefined,
    do: filtre.do || undefined,
    hladat: filtre.hladat || undefined,
    limit: NA_STRANU,
    offset,
  });

  useEffect(() => {
    const ovladac = new AbortController();
    setNacitava(true);
    setChyba(null);
    logyApi
      .vypis(parametre(0), ovladac.signal)
      .then((z) => {
        setZaznamy(z.polozky);
        setCelkom(z.strankovanie?.total ?? z.polozky.length);
      })
      .catch((e) => e?.name !== 'AbortError' && setChyba(e?.message || tr('Logy sa nepodarilo načítať')))
      .finally(() => !ovladac.signal.aborted && setNacitava(false));
    return () => ovladac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtre, obnovit]);

  const nacitajDalsie = async () => {
    setNacitava(true);
    try {
      const z = await logyApi.vypis(parametre(zaznamy.length));
      setZaznamy((s) => [...s, ...z.polozky.filter((n) => !s.some((x) => x.id === n.id))]);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Ďalšie záznamy sa nepodarilo načítať'));
    } finally {
      setNacitava(false);
    }
  };

  const nastav = (zmena: Partial<FiltreLogov>) => setFiltre((f) => ({ ...f, ...zmena }));
  const maFilter =
    Boolean(filtre.akcia || filtre.entita || filtre.pouzivatel_id || filtre.od || filtre.do) || hladat.trim() !== '';

  const zrusFiltre = () => {
    setHladat('');
    setFiltre(PRAZDNE);
  };

  const kto = (z: ZaznamLogu) => z.pouzivatel?.meno ?? z.pouzivatel_email ?? tr('Neznámy');

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Logy')}
        podnadpis={tr('Všetky zmeny v administrácii - kto, čo a kedy urobil. Čítanie sa nezaznamenáva.')}
        akcie={
          <Button variant="secondary" ikona={<Icon nazov="obnovit" velkost={15} />} onClick={() => setObnovit((x) => x + 1)}>
            {tr('Obnoviť')}
          </Button>
        }
      />

      <div className="cw-logy__filtre">
        <Select
          menovka={tr('Akcia')}
          value={filtre.akcia ?? ''}
          onChange={(e) => nastav({ akcia: e.target.value })}
          prazdna={tr('Všetky akcie')}
          moznosti={(moznosti.data?.akcie ?? Object.keys(NAZVY_AKCII)).map((a) => ({ hodnota: a, popis: NAZVY_AKCII[a] ?? a }))}
        />
        <Select
          menovka={tr('Sekcia')}
          value={filtre.entita ?? ''}
          onChange={(e) => nastav({ entita: e.target.value })}
          prazdna={tr('Všetky sekcie')}
          moznosti={(moznosti.data?.entity ?? []).map((e) => ({ hodnota: e, popis: tr(e) }))}
        />
        <Select
          menovka={tr('Používateľ')}
          value={filtre.pouzivatel_id ?? ''}
          onChange={(e) => nastav({ pouzivatel_id: e.target.value ? Number(e.target.value) : undefined })}
          prazdna={tr('Všetci používatelia')}
          moznosti={(moznosti.data?.pouzivatelia ?? []).map((p) => ({ hodnota: p.id, popis: p.meno }))}
        />
        <Input menovka={tr('Od')} type="date" value={filtre.od ?? ''} onChange={(e) => nastav({ od: e.target.value })} />
        <Input menovka={tr('Do')} type="date" value={filtre.do ?? ''} onChange={(e) => nastav({ do: e.target.value })} />
        <Input
          menovka={tr('Hľadať')}
          value={hladat}
          onChange={(e) => setHladat(e.target.value)}
          placeholder="E-mail, sekcia, adresa…"
          ikona={<Icon nazov="hladat" velkost={15} />}
        />
      </div>

      <div className="cw-logy__lista">
        <span>
          {nacitava && zaznamy.length === 0 ? tr('Načítavam…') : tr('Zobrazené {length} z {celkom} záznamov', { length: zaznamy.length, celkom })}
        </span>
        {maFilter && (
          <Button variant="ghost" velkost="sm" onClick={zrusFiltre}>
            {tr('Zrušiť filtre')}
          </Button>
        )}
      </div>

      {chyba ? (
        <ErrorState sprava={tr('Logy sa nepodarilo načítať')} detail={chyba} onSkusZnova={() => setObnovit((x) => x + 1)} />
      ) : nacitava && zaznamy.length === 0 ? (
        <div className="cw-logy__tabulka">
          <Skeleton riadkov={8} />
        </div>
      ) : zaznamy.length === 0 ? (
        <div className="cw-logy__tabulka">
          <EmptyState
            ikona={<Icon nazov="hodiny" velkost={36} />}
            nadpis={maFilter ? tr('Žiadne záznamy pre tento filter') : tr('Zatiaľ žiadne udalosti')}
            akcia={maFilter ? <Button onClick={zrusFiltre}>{tr('Zrušiť filtre')}</Button> : undefined}
          />
        </div>
      ) : (
        <>
          <div className="cw-logy__tabulka">
            <table>
              <thead>
                <tr>
                  <th>{tr('Čas')}</th>
                  <th>{tr('Používateľ')}</th>
                  <th>{tr('Akcia')}</th>
                  <th>{tr('Záznam')}</th>
                  <th className="cw-logy__detail-hlava">{tr('Detail')}</th>
                </tr>
              </thead>
              <tbody>
                {zaznamy.map((z) => (
                  <tr key={z.id}>
                    <td className="cw-logy__cas">{formatujDatumCas(z.vytvoreny)}</td>
                    <td>
                      <button
                        className="cw-logy__odkaz"
                        disabled={!z.pouzivatel_id}
                        onClick={() => z.pouzivatel_id && nastav({ pouzivatel_id: z.pouzivatel_id })}
                        title={z.pouzivatel_email ?? undefined}
                      >
                        {kto(z)}
                      </button>
                    </td>
                    <td>
                      <Badge ton={TON_AKCIE[z.akcia] ?? 'neutral'}>{NAZVY_AKCII[z.akcia] ?? z.akcia}</Badge>
                    </td>
                    <td>
                      <button className="cw-logy__odkaz" onClick={() => nastav({ entita: z.entita })}>
                        {opisZaznamu(z)}
                      </button>
                    </td>
                    <td className="cw-logy__detail">
                      {z.popis ? tr(z.popis) : null}
                      {z.ip_adresa && <span> {tr('· IP')} {z.ip_adresa}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {zaznamy.length < celkom && (
            <div className="cw-logy__dalsie">
              <Button variant="secondary" nacitava={nacitava} onClick={nacitajDalsie}>
                {tr('Načítať ďalšie')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Logy;
