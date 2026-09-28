// Umiestnenie: frontend/src/pages/admin/eshop/Objednavky.tsx
// Objednávky e-shopu: prehľad mesiaca, filter podľa stavu, hľadanie
// a stránkovanie. Kliknutie otvorí detail objednávky.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Badge, Button, Icon, FilterChips, Skeleton, EmptyState, ErrorState, StatCard } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { cenaText, eshopObjednavkyApi } from '../../../api/eshop';
import { formatujDatumCas } from '../../../utils/datum';
import { tr } from '../../../i18n';
import { STAVY_OBJEDNAVKY, stavObjednavky, stavPlatby } from './spolocne';
import './Eshop.css';

const NA_STRANU = 25;

export const Objednavky: React.FC = () => {
  const navigate = useNavigate();
  const [stav, setStav] = useState('');
  const [hladat, setHladat] = useState('');
  const [dotaz, setDotaz] = useState('');
  const [strana, setStrana] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDotaz(hladat.trim()), 350);
    return () => clearTimeout(t);
  }, [hladat]);
  useEffect(() => setStrana(1), [stav, dotaz]);

  const zoznam = useNacitanie((signal) => eshopObjednavkyApi.vypis({ stav, hladat: dotaz, page: strana, limit: NA_STRANU }, signal), [stav, dotaz, strana]);
  const data = zoznam.data;
  const pocty = data?.pocty ?? {};
  const vsetky = Object.values(pocty).reduce((s, n) => s + (n ?? 0), 0);
  const strankovanie = data?.strankovanie;

  return (
    <div className="cw-screen cw-es">
      <PageHeader
        nadpis={tr('Objednávky')}
        podnadpis={tr('Objednávky z obchodu na webe. Nové objednávky prídu aj e-mailom.')}
        akcie={
          <Button variant="secondary" onClick={() => navigate('/admin/eshop/produkty')} ikona={<Icon nazov="balik" velkost={16} />}>
            {tr('Produkty')}
          </Button>
        }
      />

      <div className="cw-es__staty">
        <StatCard menovka={tr('Nové objednávky')} hodnota={String(pocty.nova ?? 0)} ikona={<Icon nazov="kosik" />} onClick={() => setStav('nova')} />
        <StatCard menovka={tr('Na vybavenie')} hodnota={String((pocty.potvrdena ?? 0) + (pocty.pripravena ?? 0))} ikona={<Icon nazov="balik" />} />
        <StatCard menovka={tr('Tento mesiac')} hodnota={cenaText(data?.tentoMesiac.spolu ?? 0)} ikona={<Icon nazov="platba" />} />
        <StatCard menovka={tr('Objednávok tento mesiac')} hodnota={String(data?.tentoMesiac.pocet ?? 0)} ikona={<Icon nazov="doprava" />} />
      </div>

      <div className="cw-es__filtre">
        <FilterChips
          popisSkupiny={tr('Stav objednávky')}
          zvolena={stav}
          onZmena={setStav}
          moznosti={[
            { hodnota: '', popis: tr('Všetky'), pocet: vsetky },
            ...STAVY_OBJEDNAVKY.map((s) => ({ hodnota: s.hodnota, popis: s.popis, pocet: pocty[s.hodnota] ?? 0 })),
          ]}
        />
        <label className="cw-es__hladat">
          <Icon nazov="hladat" velkost={16} />
          <input
            type="search"
            value={hladat}
            onChange={(e) => setHladat(e.target.value)}
            placeholder={tr('Číslo, meno alebo e-mail')}
            aria-label={tr('Hľadať objednávku')}
          />
        </label>
      </div>

      {zoznam.chyba ? (
        <ErrorState sprava={tr('Objednávky sa nepodarilo načítať')} detail={zoznam.chyba} onSkusZnova={zoznam.obnov} />
      ) : zoznam.nacitava && !data ? (
        <div className="cw-es__tabulka">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} vyska="52px" />
          ))}
        </div>
      ) : (data?.polozky.length ?? 0) === 0 ? (
        <EmptyState
          ikona={<Icon nazov="kosik" velkost={40} />}
          nadpis={stav || dotaz ? tr('Žiadne objednávky nezodpovedajú filtru') : tr('Zatiaľ žiadne objednávky')}
          popis={stav || dotaz ? undefined : tr('Keď zákazník odošle objednávku z webu, objaví sa tu.')}
        />
      ) : (
        <>
          <div className="cw-es__tabulka" role="table" aria-label={tr('Objednávky')}>
            <div className="cw-es__riadok cw-es__riadok--hlava" role="row">
              <span role="columnheader">{tr('Číslo')}</span>
              <span role="columnheader">{tr('Zákazník')}</span>
              <span role="columnheader">{tr('Dátum')}</span>
              <span role="columnheader">{tr('Doručenie a platba')}</span>
              <span role="columnheader" className="cw-es__vpravo">{tr('Spolu')}</span>
              <span role="columnheader">{tr('Stav')}</span>
            </div>
            {data!.polozky.map((o) => (
              <button key={o.id} type="button" className="cw-es__riadok" role="row" onClick={() => navigate(`/admin/eshop/objednavky/${o.id}`)}>
                <span role="cell" className="cw-es__cislo">
                  {o.cislo}
                </span>
                <span role="cell" className="cw-es__zakaznik">
                  <strong>{o.meno}</strong>
                  <small>{o.email}</small>
                </span>
                <span role="cell" className="cw-es__tlmene">
                  {formatujDatumCas(o.vytvorena)}
                </span>
                <span role="cell" className="cw-es__zakaznik">
                  <span>{o.dorucenie_nazov}</span>
                  <small>{o.platba_nazov}</small>
                </span>
                <span role="cell" className="cw-es__vpravo cw-es__suma">
                  {cenaText(o.spolu, o.mena)}
                </span>
                <span role="cell" className="cw-es__stavy">
                  <Badge ton={stavObjednavky(o.stav).ton}>{stavObjednavky(o.stav).popis}</Badge>
                  <Badge ton={stavPlatby(o.stav_platby).ton}>{stavPlatby(o.stav_platby).popis}</Badge>
                </span>
              </button>
            ))}
          </div>
          {strankovanie && strankovanie.pages > 1 && (
            <div className="cw-es__strany">
              <Button variant="secondary" velkost="sm" disabled={strana <= 1} onClick={() => setStrana((s) => s - 1)}>
                {tr('Predchádzajúce')}
              </Button>
              <span>
                {strana} / {strankovanie.pages}
              </span>
              <Button variant="secondary" velkost="sm" disabled={!strankovanie.has_next} onClick={() => setStrana((s) => s + 1)}>
                {tr('Ďalšie')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Objednavky;
