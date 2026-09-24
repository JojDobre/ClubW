// Umiestnenie: frontend/src/pages/admin/FormularEditor.tsx
// Vytvorenie a úprava formulára: základné údaje, polia s popismi
// a živý náhľad, ako formulár uvidí návštevník.

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Badge, Icon, Input, Select, Textarea, Switch, Skeleton, ErrorState, useToast,
} from '../../ui';
import { formulareApi } from '../../api/formulare';
import { FormularWeb } from '../../components/FormularWeb';
import { znackaFormulara, kopiruj } from './Formulare';
import type { Formular, PoleFormulara, TypPolaFormulara } from '../../api/typy';
import { tr } from '../../i18n';
import './ClanokEditor.css';
import './ZapasEditor.css';
import './Formulare.css';

export const TYPY_POLI: Array<{ hodnota: TypPolaFormulara; popis: string }> = [
  { hodnota: 'text', popis: tr('Krátky text') },
  { hodnota: 'textarea', popis: tr('Dlhý text') },
  { hodnota: 'email', popis: 'E-mail' },
  { hodnota: 'telefon', popis: tr('Telefón') },
  { hodnota: 'cislo', popis: tr('Číslo') },
  { hodnota: 'datum', popis: tr('Dátum') },
  { hodnota: 'vyber', popis: tr('Výber z možností') },
  { hodnota: 'zaskrtavacie', popis: tr('Zaškrtávacie možnosti') },
  { hodnota: 'suhlas', popis: tr('Súhlas (zaškrtnutie)') },
];

const sMoznostami = (typ: TypPolaFormulara) => typ === 'vyber' || typ === 'zaskrtavacie';

/** Pole v editore - možnosti sa píšu ako text, každá na riadok. */
interface PoleVEditore extends PoleFormulara {
  /** Interný kľúč pre React - nové pole ešte nemá kód */
  _id: string;
  _moznostiText: string;
}

let pocitadlo = 0;
const noveId = () => `p${Date.now()}-${++pocitadlo}`;

const doEditora = (p: PoleFormulara): PoleVEditore => ({
  ...p,
  _id: noveId(),
  _moznostiText: (p.moznosti ?? []).join('\n'),
});

const zEditora = (p: PoleVEditore): PoleFormulara => ({
  kod: p.kod,
  nazov: p.nazov.trim(),
  typ: p.typ,
  popis: p.popis?.trim() || null,
  povinne: Boolean(p.povinne),
  ...(sMoznostami(p.typ)
    ? { moznosti: p._moznostiText.split('\n').map((m) => m.trim()).filter(Boolean) }
    : {}),
});

/** Predvolené polia nového formulára - najčastejší prípad je prihláška. */
const ZAKLADNE_POLIA: PoleFormulara[] = [
  { kod: '', nazov: tr('Meno a priezvisko'), typ: 'text', povinne: true },
  { kod: '', nazov: 'E-mail', typ: 'email', povinne: true, popis: tr('Odpovieme vám na tento e-mail') },
  { kod: '', nazov: tr('Správa'), typ: 'textarea', povinne: false },
];

type Udaje = Pick<Formular, 'nazov' | 'slug' | 'popis' | 'sprava_po_odoslani' | 'email_pre_notifikacie' | 'aktivny'>;

export const FormularEditor: React.FC = () => {
  const { id } = useParams();
  const jeNovy = !id || id === 'novy';
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [udaje, setUdaje] = useState<Udaje>({
    nazov: '',
    slug: '',
    popis: '',
    sprava_po_odoslani: '',
    email_pre_notifikacie: '',
    aktivny: true,
  });
  const [polia, setPolia] = useState<PoleVEditore[]>(() => (jeNovy ? ZAKLADNE_POLIA.map(doEditora) : []));
  const [nacitava, setNacitava] = useState(!jeNovy);
  const [chybaNacitania, setChybaNacitania] = useState<string | null>(null);
  const [uklada, setUklada] = useState(false);
  const [chybyPoli, setChybyPoli] = useState<string[]>([]);
  const [pocetOdpovedi, setPocetOdpovedi] = useState(0);

  useEffect(() => {
    if (jeNovy) return;
    const ovladac = new AbortController();
    formulareApi
      .detail(Number(id), ovladac.signal)
      .then((f) => {
        setUdaje({
          nazov: f.nazov,
          slug: f.slug,
          popis: f.popis ?? '',
          sprava_po_odoslani: f.sprava_po_odoslani ?? '',
          email_pre_notifikacie: f.email_pre_notifikacie ?? '',
          aktivny: f.aktivny,
        });
        setPolia(f.polia.map(doEditora));
        setPocetOdpovedi(f.pocet_odpovedi ?? 0);
        setNacitava(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setChybaNacitania(e?.message || tr('Formulár sa nepodarilo načítať'));
        setNacitava(false);
      });
    return () => ovladac.abort();
  }, [id, jeNovy]);

  const zmenPole = (i: number, zmena: Partial<PoleVEditore>) =>
    setPolia((p) => p.map((x, j) => (j === i ? { ...x, ...zmena } : x)));

  const presun = (i: number, smer: -1 | 1) =>
    setPolia((p) => {
      const ciel = i + smer;
      if (ciel < 0 || ciel >= p.length) return p;
      const kopia = [...p];
      [kopia[i], kopia[ciel]] = [kopia[ciel], kopia[i]];
      return kopia;
    });

  const pridajPole = () =>
    setPolia((p) => [...p, doEditora({ kod: '', nazov: '', typ: 'text', povinne: false })]);

  const uloz = async () => {
    if (udaje.nazov.trim().length < 2) return varovanie(tr('Názov formulára musí mať aspoň 2 znaky'));
    if (polia.length === 0) return varovanie(tr('Pridajte aspoň jedno pole'));
    const bezNazvu = polia.findIndex((p) => !p.nazov.trim());
    if (bezNazvu >= 0) return varovanie(tr('Pole {hodnota} nemá názov', { hodnota: bezNazvu + 1 }));
    const bezMoznosti = polia.findIndex((p) => sMoznostami(p.typ) && !p._moznostiText.trim());
    if (bezMoznosti >= 0) return varovanie(tr('Pole {hodnota} potrebuje aspoň jednu možnosť', { hodnota: bezMoznosti + 1 }));

    setUklada(true);
    setChybyPoli([]);
    try {
      const telo: Partial<Formular> = {
        nazov: udaje.nazov.trim(),
        popis: udaje.popis?.trim() || null,
        sprava_po_odoslani: udaje.sprava_po_odoslani?.trim() || null,
        email_pre_notifikacie: udaje.email_pre_notifikacie?.trim() || null,
        aktivny: udaje.aktivny,
        polia: polia.map(zEditora),
      };
      if (udaje.slug.trim()) telo.slug = udaje.slug.trim();

      if (jeNovy) {
        const novy = await formulareApi.vytvor(telo);
        uspech(tr('Formulár bol vytvorený'));
        navigate(`/admin/formulare/${novy.id}`, { replace: true });
      } else {
        const ulozeny = await formulareApi.uprav(Number(id), telo);
        setUdaje((u) => ({ ...u, slug: ulozeny.slug }));
        // Kódy nových polí doplní server - bez nich by ďalšie uloženie
        // vytvorilo nové kódy a staré odpovede by stratili popisky
        setPolia(ulozeny.polia.map(doEditora));
        uspech(tr('Zmeny boli uložené'));
      }
    } catch (e: any) {
      if (Array.isArray(e?.chybyPoli) && e.chybyPoli.length) setChybyPoli(e.chybyPoli);
      hlasChybu(e?.message || tr('Formulár sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  if (nacitava) {
    return (
      <div className="cw-screen">
        <Skeleton riadkov={8} />
      </div>
    );
  }
  if (chybaNacitania) {
    return <ErrorState sprava={tr('Formulár sa nepodarilo načítať')} detail={chybaNacitania} onSkusZnova={() => window.location.reload()} />;
  }

  const nahlad = {
    nazov: udaje.nazov || tr('Názov formulára'),
    popis: udaje.popis || null,
    aktivny: udaje.aktivny,
    sprava_po_odoslani: null,
    polia: polia
      .filter((p) => p.nazov.trim())
      .map((p, i) => ({ ...zEditora(p), kod: p.kod || `nahlad-${i}` })),
  };

  return (
    <div className="cw-form">
      {/* ===== Lišta ===== */}
      <div className="cw-ced__bar">
        <button className="cw-ced__spat" onClick={() => navigate('/admin/formulare')}>
          <Icon nazov="sipkaVlavo" velkost={15} />
          {tr('Späť')}
        </button>
        <h1 className="cw-zed__nadpis">{jeNovy ? tr('Nový formulár') : udaje.nazov || tr('Formulár')}</h1>
        {!jeNovy && (udaje.aktivny ? <Badge ton="success">{tr('Prijíma')}</Badge> : <Badge>{tr('Vypnutý')}</Badge>)}
        <div className="cw-ced__medzera" />
        {!jeNovy && (
          <>
            <button className="cw-ced__btn" onClick={() => navigate(`/admin/formulare/${id}/odpovede`)}>
              <Icon nazov="komentare" velkost={15} />
              {tr('Odpovede (')}{pocetOdpovedi})
            </button>
            <button className="cw-ced__btn" onClick={() => window.open(`/formular/${udaje.slug}`, '_blank', 'noopener')}>
              <Icon nazov="oko" velkost={15} />
              {tr('Na webe')}
            </button>
          </>
        )}
        <Button onClick={uloz} nacitava={uklada} ikona={<Icon nazov="ulozit" velkost={15} />}>
          {jeNovy ? tr('Vytvoriť') : tr('Uložiť')}
        </Button>
      </div>

      <div className="cw-form__grid">
        <div className="cw-form__hlavne">
          {/* ===== Základné údaje ===== */}
          <section className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">{tr('Základné údaje')}</div>
            <Input
              menovka={tr('Názov formulára')}
              value={udaje.nazov}
              onChange={(e) => setUdaje((u) => ({ ...u, nazov: e.target.value }))}
              placeholder={tr('Prihláška do klubu')}
              povinne
            />
            <Textarea
              menovka={tr('Popis')}
              value={udaje.popis ?? ''}
              onChange={(e) => setUdaje((u) => ({ ...u, popis: e.target.value }))}
              rows={2}
              napoveda={tr('Zobrazí sa nad formulárom')}
            />
            <Textarea
              menovka={tr('Správa po odoslaní')}
              value={udaje.sprava_po_odoslani ?? ''}
              onChange={(e) => setUdaje((u) => ({ ...u, sprava_po_odoslani: e.target.value }))}
              rows={2}
              placeholder={tr('Ďakujeme, formulár bol odoslaný.')}
            />
          </section>

          {/* ===== Polia ===== */}
          <section className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">
              {tr('Polia formulára')}
              <span className="cw-form__pocet">{polia.length}</span>
            </div>
            <p className="cw-zed__panel-popis">
              {tr('Každé pole má názov, typ a voliteľný popis (nápovedu pod názvom). Pri výbere z možností napíšte každú možnosť na samostatný riadok.')}
            </p>

            {chybyPoli.length > 0 && (
              <ul className="cw-form__chyby" role="alert">
                {chybyPoli.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}

            <ol className="cw-form__polia">
              {polia.map((p, i) => (
                <li key={p._id} className="cw-form__pole">
                  <div className="cw-form__pole-hlava">
                    <span className="cw-form__cislo">{i + 1}</span>
                    <div className="cw-form__pole-akcie">
                      <Button velkost="sm" variant="ghost" onClick={() => presun(i, -1)} disabled={i === 0} aria-label={tr('Posunúť pole {hodnota} vyššie', { hodnota: i + 1 })}>
                        ↑
                      </Button>
                      <Button velkost="sm" variant="ghost" onClick={() => presun(i, 1)} disabled={i === polia.length - 1} aria-label={tr('Posunúť pole {hodnota} nižšie', { hodnota: i + 1 })}>
                        ↓
                      </Button>
                      <Button velkost="sm" variant="ghost" onClick={() => setPolia((x) => x.filter((_, j) => j !== i))} aria-label={tr('Odstrániť pole {hodnota}', { hodnota: i + 1 })}>
                        <Icon nazov="zmazat" velkost={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="cw-zed__row">
                    <Input
                      menovka={tr('Názov poľa')}
                      value={p.nazov}
                      onChange={(e) => zmenPole(i, { nazov: e.target.value })}
                      placeholder={tr('Napríklad: Dátum narodenia')}
                      povinne
                    />
                    <Select
                      menovka={tr('Typ')}
                      value={p.typ}
                      onChange={(e) => zmenPole(i, { typ: e.target.value as TypPolaFormulara })}
                      moznosti={TYPY_POLI}
                    />
                  </div>
                  <Input
                    menovka={tr('Popis poľa')}
                    value={p.popis ?? ''}
                    onChange={(e) => zmenPole(i, { popis: e.target.value })}
                    placeholder={tr('Nápoveda pre vypĺňajúceho (voliteľné)')}
                  />
                  {sMoznostami(p.typ) && (
                    <Textarea
                      menovka={tr('Možnosti')}
                      value={p._moznostiText}
                      onChange={(e) => zmenPole(i, { _moznostiText: e.target.value })}
                      rows={3}
                      placeholder={'U9\nU11\nU13'}
                      napoveda={tr('Každá možnosť na samostatnom riadku')}
                      povinne
                    />
                  )}
                  <Switch
                    zapnute={Boolean(p.povinne)}
                    onZmena={(v) => zmenPole(i, { povinne: v })}
                    menovka={p.typ === 'suhlas' ? tr('Povinné potvrdiť') : tr('Povinné pole')}
                  />
                </li>
              ))}
            </ol>
            <Button variant="secondary" ikona={<Icon nazov="plus" velkost={14} />} onClick={pridajPole}>
              {tr('Pridať pole')}
            </Button>
          </section>
        </div>

        {/* ===== Bočný panel ===== */}
        <aside className="cw-form__bok">
          <section className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">{tr('Zverejnenie')}</div>
            <Switch
              zapnute={udaje.aktivny}
              onZmena={(v) => setUdaje((u) => ({ ...u, aktivny: v }))}
              menovka={tr('Prijíma odpovede')}
              popis={udaje.aktivny ? tr('Návštevníci môžu formulár odoslať') : tr('Formulár sa zobrazí, ale nedá sa odoslať')}
            />
            <Input
              menovka={tr('Adresa na webe')}
              value={udaje.slug}
              onChange={(e) => setUdaje((u) => ({ ...u, slug: e.target.value.toLowerCase() }))}
              placeholder={jeNovy ? tr('vytvorí sa z názvu') : ''}
              napoveda={`/formular/${udaje.slug || '…'}`}
            />
            {!jeNovy && (
              <div className="cw-form__znacka">
                <span>{tr('Vloženie do stránky')}</span>
                <code>{znackaFormulara(udaje)}</code>
                <Button
                  velkost="sm"
                  variant="secondary"
                  ikona={<Icon nazov="kopirovat" velkost={13} />}
                  onClick={async () => {
                    if (await kopiruj(znackaFormulara(udaje))) uspech(tr('Značka skopírovaná - vložte ju do textu stránky'));
                  }}
                >
                  {tr('Kopírovať')}
                </Button>
                <small>{tr('Vložte značku do obsahu stránky (Stránky → úprava). Na jej mieste sa zobrazí formulár.')}</small>
              </div>
            )}
          </section>

          <section className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">{tr('Upozornenie e-mailom')}</div>
            <Input
              menovka={tr('E-mail pre upozornenia')}
              type="email"
              value={udaje.email_pre_notifikacie ?? ''}
              onChange={(e) => setUdaje((u) => ({ ...u, email_pre_notifikacie: e.target.value }))}
              placeholder="sekretar@klub.sk"
              napoveda={tr('Po každom odoslaní príde e-mail s vyplnenými údajmi (ak je nastavené odosielanie e-mailov)')}
            />
          </section>

          <section className="cw-zed__panel cw-form__nahlad">
            <div className="cw-zed__panel-nadpis">{tr('Náhľad')}</div>
            <FormularWeb formular={nahlad} nahlad />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default FormularEditor;
