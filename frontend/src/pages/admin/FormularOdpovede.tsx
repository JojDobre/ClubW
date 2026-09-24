// Umiestnenie: frontend/src/pages/admin/FormularOdpovede.tsx
// Vyplnené formuláre: prehľad odpovedí, označenie prečítané/neprečítané,
// zmazanie a stiahnutie do tabuľky (CSV).

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Badge, Icon, FilterChips, Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { formulareApi, oznamZmenuFormularov } from '../../api/formulare';
import { formatujDatumCas } from '../../utils/datum';
import type { OdpovedFormulara, PoleFormulara } from '../../api/typy';
import { tr } from '../../i18n';
import './ClanokEditor.css';
import './ZapasEditor.css';
import './Formulare.css';

type Filter = 'vsetky' | 'nove' | 'precitane';

/** Hodnota odpovede ako text. */
const naText = (h: unknown): string =>
  h === true ? tr('Áno') : h === false ? tr('Nie') : Array.isArray(h) ? h.join(', ') : h == null ? '' : String(h);

/** Stĺpce odpovedí - aktuálne polia a za nimi kódy polí, ktoré už boli odstránené. */
const stlpceOdpovedi = (polia: PoleFormulara[], odpovede: OdpovedFormulara[]) => {
  const znamy = new Set(polia.map((p) => p.kod));
  const stare = new Set<string>();
  odpovede.forEach((o) => Object.keys(o.udaje ?? {}).forEach((k) => !znamy.has(k) && stare.add(k)));
  return [
    ...polia.map((p) => ({ kod: p.kod, nazov: p.nazov })),
    ...[...stare].map((k) => ({ kod: k, nazov: tr('{k} (odstránené pole)', { k }) })),
  ];
};

/** Stiahne odpovede ako CSV - otvorí sa v Exceli aj s diakritikou. */
const stiahniCsv = (nazov: string, stlpce: Array<{ kod: string; nazov: string }>, odpovede: OdpovedFormulara[]) => {
  const bunka = (t: string) => `"${t.replace(/"/g, '""')}"`;
  const riadky = [
    [tr('Odoslané'), tr('Prečítané'), ...stlpce.map((s) => s.nazov)].map(bunka).join(';'),
    ...odpovede.map((o) =>
      [formatujDatumCas(o.vytvorena), o.precitane ? tr('áno') : 'nie', ...stlpce.map((s) => naText(o.udaje?.[s.kod]))]
        .map(bunka)
        .join(';')
    ),
  ];
  const subor = new Blob(['﻿' + riadky.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const odkaz = document.createElement('a');
  odkaz.href = URL.createObjectURL(subor);
  odkaz.download = `${nazov.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'formular'}.csv`;
  odkaz.click();
  URL.revokeObjectURL(odkaz.href);
};

export const FormularOdpovede: React.FC = () => {
  const { id } = useParams();
  const idFormulara = Number(id);
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu } = useToast();

  const [filter, setFilter] = useState<Filter>('vsetky');
  const [otvorena, setOtvorena] = useState<number | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<OdpovedFormulara | null>(null);
  const [maze, setMaze] = useState(false);
  const [hromadne, setHromadne] = useState(false);

  const formular = useNacitanie((signal) => formulareApi.detail(idFormulara, signal), [idFormulara]);
  const odpovede = useNacitanie((signal) => formulareApi.odpovede(idFormulara, signal), [idFormulara]);
  const zoznam = odpovede.data ?? [];
  const polia = formular.data?.polia ?? [];
  const stlpce = useMemo(() => stlpceOdpovedi(polia, zoznam), [polia, zoznam]);

  const pocetNovych = zoznam.filter((o) => !o.precitane).length;
  // Otvorená odpoveď zostane viditeľná, aj keď ju otvorenie presunulo
  // medzi prečítané - inak by vo filtri Neprečítané hneď zmizla
  const zobrazene = zoznam.filter((o) =>
    o.id === otvorena || (filter === 'nove' ? !o.precitane : filter === 'precitane' ? o.precitane : true)
  );

  const oznac = async (o: OdpovedFormulara, precitane: boolean, tichy = false) => {
    try {
      await formulareApi.oznac(o.id, precitane);
      odpovede.obnov();
      oznamZmenuFormularov();
      if (!tichy) uspech(precitane ? tr('Označené ako prečítané') : tr('Označené ako neprečítané'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Stav sa nepodarilo zmeniť'));
    }
  };

  const otvor = (o: OdpovedFormulara) => {
    const otvara = otvorena !== o.id;
    setOtvorena(otvara ? o.id : null);
    // Otvorením si ju človek prečítal
    if (otvara && !o.precitane) oznac(o, true, true);
  };

  const oznacVsetky = async () => {
    setHromadne(true);
    try {
      await Promise.all(zoznam.filter((o) => !o.precitane).map((o) => formulareApi.oznac(o.id, true)));
      odpovede.obnov();
      oznamZmenuFormularov();
      uspech(tr('Všetky odpovede sú prečítané'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Nepodarilo sa označiť všetky odpovede'));
    } finally {
      setHromadne(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await formulareApi.zmazOdpoved(naZmazanie.id);
      uspech(tr('Odpoveď bola zmazaná'));
      setNaZmazanie(null);
      odpovede.obnov();
      oznamZmenuFormularov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Odpoveď sa nepodarilo zmazať'));
    } finally {
      setMaze(false);
    }
  };

  // Krátky súhrn do zatvoreného riadku - prvé dve vyplnené polia
  const suhrn = (o: OdpovedFormulara) =>
    stlpce
      .map((s) => naText(o.udaje?.[s.kod]))
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ') || tr('Bez vyplnených údajov');

  if (formular.chyba) {
    return <ErrorState sprava={tr('Formulár sa nepodarilo načítať')} detail={formular.chyba} onSkusZnova={formular.obnov} />;
  }

  return (
    <div className="cw-form">
      <div className="cw-ced__bar">
        <button className="cw-ced__spat" onClick={() => navigate('/admin/formulare')}>
          <Icon nazov="sipkaVlavo" velkost={15} />
          {tr('Späť')}
        </button>
        <h1 className="cw-zed__nadpis">{formular.data?.nazov ?? tr('Formulár')}</h1>
        {pocetNovych > 0 && <Badge ton="danger">{pocetNovych} {tr('nové')}</Badge>}
        <div className="cw-ced__medzera" />
        <button className="cw-ced__btn" onClick={() => navigate(`/admin/formulare/${idFormulara}`)}>
          <Icon nazov="upravit" velkost={15} />
          {tr('Upraviť formulár')}
        </button>
        <button
          className="cw-ced__btn"
          disabled={zoznam.length === 0}
          onClick={() => stiahniCsv(formular.data?.nazov ?? 'formular', stlpce, zoznam)}
        >
          <Icon nazov="nahrat" velkost={15} />
          {tr('Stiahnuť CSV')}
        </button>
      </div>

      <div className="cw-form__lista">
        <FilterChips
          popisSkupiny={tr('Filter odpovedí')}
          moznosti={[
            { hodnota: 'vsetky', popis: tr('Všetky'), pocet: zoznam.length },
            { hodnota: 'nove', popis: tr('Neprečítané'), pocet: pocetNovych },
            { hodnota: 'precitane', popis: tr('Prečítané'), pocet: zoznam.length - pocetNovych },
          ]}
          zvolena={filter}
          onZmena={(h) => {
            setFilter(h as Filter);
            setOtvorena(null);
          }}
        />
        {pocetNovych > 0 && (
          <Button variant="secondary" velkost="sm" nacitava={hromadne} onClick={oznacVsetky}>
            {tr('Označiť všetky ako prečítané')}
          </Button>
        )}
      </div>

      {odpovede.chyba ? (
        <ErrorState sprava={tr('Odpovede sa nepodarilo načítať')} detail={odpovede.chyba} onSkusZnova={odpovede.obnov} />
      ) : odpovede.nacitava && !odpovede.data ? (
        <div className="cw-zed__panel">
          <Skeleton riadkov={5} />
        </div>
      ) : zobrazene.length === 0 ? (
        <div className="cw-zed__panel">
          <EmptyState
            ikona={<Icon nazov="formular" velkost={36} />}
            nadpis={zoznam.length === 0 ? tr('Zatiaľ nikto formulár nevyplnil') : tr('Žiadne odpovede v tomto filtri')}
            popis={zoznam.length === 0 ? tr('Formulár je na adrese /formular/{hodnota}', { hodnota: formular.data?.slug ?? '' }) : undefined}
          />
        </div>
      ) : (
        <ul className="cw-form__odpovede">
          {zobrazene.map((o) => (
            <li key={o.id} className={`cw-form__odpoved ${o.precitane ? '' : 'is-nova'} ${otvorena === o.id ? 'is-otvorena' : ''}`}>
              <button className="cw-form__odpoved-hlava" onClick={() => otvor(o)} aria-expanded={otvorena === o.id}>
                <span className="cw-form__bodka" aria-label={o.precitane ? tr('Prečítané') : tr('Neprečítané')} />
                <span className="cw-form__suhrn">{suhrn(o)}</span>
                <span className="cw-form__cas">{formatujDatumCas(o.vytvorena)}</span>
                <Icon nazov="sipkaDole" velkost={15} />
              </button>
              {otvorena === o.id && (
                <div className="cw-form__odpoved-telo">
                  <dl>
                    {stlpce.map((s) => (
                      <React.Fragment key={s.kod}>
                        <dt>{s.nazov}</dt>
                        <dd>{naText(o.udaje?.[s.kod]) || <span className="cw-form__prazdne">—</span>}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                  <div className="cw-form__odpoved-akcie">
                    <Button velkost="sm" variant="secondary" onClick={() => oznac(o, !o.precitane)}>
                      {o.precitane ? tr('Označiť ako neprečítané') : tr('Označiť ako prečítané')}
                    </Button>
                    <Button velkost="sm" variant="ghost" onClick={() => setNaZmazanie(o)} ikona={<Icon nazov="zmazat" velkost={14} />}>
                      {tr('Zmazať')}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Zmazať odpoveď?')}
        sprava={tr('Vyplnený formulár bude natrvalo zmazaný.')}
        potvrdit={tr('Zmazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default FormularOdpovede;
