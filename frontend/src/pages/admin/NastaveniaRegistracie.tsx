// Umiestnenie: frontend/src/pages/admin/NastaveniaRegistracie.tsx
// Okno „Nastavenia registrácie" na stránke Fanúšikovia: ktoré typy
// registrácie web ponúka, ktoré polia formulára sú vypnuté, nepovinné
// alebo povinné, a texty stránky /registracia (prázdne = text šablóny).

import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, Select, Switch, Textarea, useToast } from '../../ui';
import { nastaveniaApi } from '../../api/sprava';
import type { NastaveniaRegistracie } from '../../api/typy';
import type { PoleRegistracie, TextRegistracie } from '../../context/NastaveniaContext';
import { PREDVOLENA_REGISTRACIA } from '../../web/FormularRegistracie';
import { tr } from '../../i18n';

const POLIA: Array<{ pole: PoleRegistracie; nazov: string }> = [
  { pole: 'telefon', nazov: tr('Telefón') },
  { pole: 'datum_narodenia', nazov: tr('Dátum narodenia') },
  { pole: 'adresa', nazov: tr('Adresa') },
  { pole: 'sprava', nazov: tr('Správa pre klub') },
];

const REZIMY = [
  { hodnota: 'vypnute', popis: tr('Vypnuté') },
  { hodnota: 'volitelne', popis: tr('Nepovinné') },
  { hodnota: 'povinne', popis: tr('Povinné') },
];

/** Texty stránky a formulára - placeholder ukazuje predvolený text. */
const TEXTY: Array<{ kluc: TextRegistracie; menovka: string; predvolene: string; dlhy?: boolean }> = [
  { kluc: 'nadpis', menovka: tr('Nadpis stránky'), predvolene: 'Staňte sa súčasťou klubu' },
  { kluc: 'uvod', menovka: tr('Úvodný text pod nadpisom'), predvolene: '', dlhy: true },
  { kluc: 'fanusik_nazov', menovka: tr('Názov voľby Fanúšik'), predvolene: 'Fanúšik' },
  { kluc: 'fanusik_popis', menovka: tr('Popis voľby Fanúšik'), predvolene: 'Novinky, pozvánky a výhody pre fanúšikov' },
  { kluc: 'clen_nazov', menovka: tr('Názov voľby Člen klubu'), predvolene: 'Člen klubu' },
  { kluc: 'clen_popis', menovka: tr('Popis voľby Člen klubu'), predvolene: 'Členstvo s preukazom a hlasovacím právom' },
  { kluc: 'tlacidlo_fanusik', menovka: tr('Tlačidlo pri registrácii fanúšika'), predvolene: 'Registrovať sa' },
  { kluc: 'tlacidlo_clen', menovka: tr('Tlačidlo pri žiadosti o členstvo'), predvolene: 'Odoslať žiadosť o členstvo' },
  { kluc: 'hotovo_fanusik', menovka: tr('Poďakovanie po registrácii fanúšika'), predvolene: 'Ďakujeme za registráciu. Vitajte medzi fanúšikmi!', dlhy: true },
  { kluc: 'hotovo_clen', menovka: tr('Poďakovanie po žiadosti o členstvo'), predvolene: 'Ďakujeme, žiadosť o členstvo sme prijali. Klub sa vám ozve.', dlhy: true },
  { kluc: 'suhlas_oznamy', menovka: tr('Text súhlasu s novinkami e-mailom'), predvolene: 'Chcem dostávať klubové novinky a pozvánky e-mailom' },
  { kluc: 'vyhody_nadpis', menovka: tr('Nadpis výhod vedľa formulára'), predvolene: 'Prečo sa registrovať' },
];

export const NastaveniaRegistracieOkno: React.FC<{ otvorene: boolean; onZavri: () => void }> = ({ otvorene, onZavri }) => {
  const { uspech, chyba: hlasChybu } = useToast();
  const [n, setN] = useState<NastaveniaRegistracie | null>(null);
  const [uklada, setUklada] = useState(false);

  useEffect(() => {
    if (!otvorene) return;
    const ovladac = new AbortController();
    setN(null);
    nastaveniaApi
      .detail(ovladac.signal)
      .then((d) => setN(d.nastavenia_registracie ?? PREDVOLENA_REGISTRACIA))
      .catch((e) => !ovladac.signal.aborted && hlasChybu(e?.message || tr('Nastavenia sa nepodarilo načítať')));
    return () => ovladac.abort();
  }, [otvorene, hlasChybu]);

  const uloz = async () => {
    if (!n) return;
    if (!n.typy.fanusik && !n.typy.clen) return hlasChybu(tr('Povoľte aspoň jeden typ registrácie (fanúšik alebo člen klubu)'));
    setUklada(true);
    try {
      await nastaveniaApi.uloz({ nastavenia_registracie: n });
      uspech(tr('Nastavenia registrácie boli uložené'));
      onZavri();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Nastavenia sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmenPole = (pole: PoleRegistracie, zmena: Partial<NastaveniaRegistracie['polia'][PoleRegistracie]>) =>
    setN((x) => (x ? { ...x, polia: { ...x.polia, [pole]: { ...x.polia[pole], ...zmena } } } : x));
  const zmenText = (kluc: TextRegistracie, hodnota: string) => setN((x) => (x ? { ...x, texty: { ...x.texty, [kluc]: hodnota } } : x));
  const zmenVyhodu = (i: number, zmena: Partial<{ nadpis: string; text: string }>) =>
    setN((x) => (x ? { ...x, vyhody: x.vyhody.map((v, j) => (j === i ? { ...v, ...zmena } : v)) } : x));

  return (
    <Modal
      otvorene={otvorene}
      onZavri={onZavri}
      sirka="lg"
      nadpis={tr('Nastavenia registrácie')}
      podnadpis={tr('Formulár na stránke /registracia a v bloku Registrácia. Žiadosti schvaľujete v zozname fanúšikov.')}
      pata={
        <>
          <Button variant="secondary" onClick={onZavri}>
            {tr('Zrušiť')}
          </Button>
          <Button onClick={uloz} nacitava={uklada} disabled={!n}>
            {tr('Uložiť')}
          </Button>
        </>
      }
    >
      {!n ? (
        <p className="cw-reg__info">{tr('Načítavam…')}</p>
      ) : (
        <div className="cw-reg">
          <section className="cw-reg__sekcia">
            <h3>{tr('Typy registrácie')}</h3>
            <div className="cw-reg__prepinace">
              <Switch zapnute={n.typy.fanusik} onZmena={(v) => setN({ ...n, typy: { ...n.typy, fanusik: v } })} menovka={tr('Fanúšik')} popis={tr('Registrácia priaznivca klubu')} />
              <Switch zapnute={n.typy.clen} onZmena={(v) => setN({ ...n, typy: { ...n.typy, clen: v } })} menovka={tr('Člen klubu')} popis={tr('Žiadosť o členstvo')} />
            </div>
          </section>

          <section className="cw-reg__sekcia">
            <h3>{tr('Polia formulára')}</h3>
            <p className="cw-reg__info">{tr('Meno, priezvisko, e-mail, heslo do účtu Môj klub a súhlas so spracovaním údajov sú vždy povinné.')}</p>
            <div className="cw-reg__polia">
              {POLIA.map(({ pole, nazov }) => (
                <div key={pole} className="cw-reg__pole">
                  <strong>{nazov}</strong>
                  <Select aria-label={nazov} moznosti={REZIMY} value={n.polia[pole].rezim} onChange={(e) => zmenPole(pole, { rezim: e.target.value as NastaveniaRegistracie['polia'][PoleRegistracie]['rezim'] })} />
                  <Switch zapnute={n.polia[pole].len_clen} onZmena={(v) => zmenPole(pole, { len_clen: v })} menovka={tr('Len pri členstve')} disabled={n.polia[pole].rezim === 'vypnute'} />
                </div>
              ))}
            </div>
          </section>

          <section className="cw-reg__sekcia">
            <h3>{tr('Texty stránky')}</h3>
            <p className="cw-reg__info">{tr('Prázdne pole = predvolený text šablóny (v sivom).')}</p>
            <div className="cw-reg__texty">
              {TEXTY.map((t) =>
                t.dlhy ? (
                  <Textarea key={t.kluc} rows={2} menovka={t.menovka} placeholder={t.predvolene} value={n.texty[t.kluc]} onChange={(e) => zmenText(t.kluc, e.target.value)} />
                ) : (
                  <Input key={t.kluc} menovka={t.menovka} placeholder={t.predvolene} value={n.texty[t.kluc]} onChange={(e) => zmenText(t.kluc, e.target.value)} />
                )
              )}
            </div>
          </section>

          <section className="cw-reg__sekcia">
            <h3>{tr('Výhody vedľa formulára')}</h3>
            <p className="cw-reg__info">{tr('Bez vlastných výhod šablóna ukáže svoje predvolené. Najviac 6.')}</p>
            {n.vyhody.map((v, i) => (
              <div key={i} className="cw-reg__vyhoda">
                <Input menovka={tr('Nadpis')} value={v.nadpis} onChange={(e) => zmenVyhodu(i, { nadpis: e.target.value })} maxLength={80} />
                <Input menovka={tr('Text')} value={v.text} onChange={(e) => zmenVyhodu(i, { text: e.target.value })} maxLength={240} />
                <Button variant="ghost" velkost="sm" onClick={() => setN({ ...n, vyhody: n.vyhody.filter((_, j) => j !== i) })}>
                  {tr('Odstrániť')}
                </Button>
              </div>
            ))}
            {n.vyhody.length < 6 && (
              <Button variant="secondary" velkost="sm" onClick={() => setN({ ...n, vyhody: [...n.vyhody, { nadpis: '', text: '' }] })}>
                {tr('Pridať výhodu')}
              </Button>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
};
