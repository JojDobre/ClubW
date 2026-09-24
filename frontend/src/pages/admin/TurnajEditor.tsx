// Umiestnenie: frontend/src/pages/admin/TurnajEditor.tsx
// Editor turnaja: údaje, skupiny (každý s každým, tabuľka) a pavúk.
//
// Postup: nastaviť údaje → pridať tímy do skupín (alebo rovno do pavúka)
// → zapisovať výsledky → z postupujúcich zo skupín vytvoriť pavúk →
// zapisovať výsledky pavúka, víťaz postupuje sám. Zápas nášho tímu sa
// dá prepojiť so zápasom zo sekcie Zápasy - výsledok sa potom berie odtiaľ.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Badge, Icon, Input, Select, Textarea, Switch, Skeleton, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { turnajeApi } from '../../api/doplnky';
import { timyApi, zapasyApi } from '../../api/sport';
import { sezonyApi } from '../../api/sprava';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import { formatujDatumCas } from '../../utils/datum';
import { FORMATY, STAVY_TURNAJA } from './Turnaje';
import type { TurnajDetail, TimTurnaja, ZapasPavuka, Turnaj, TypTurnaja, StavTurnaja } from '../../api/typy';
import { tr } from '../../i18n';
import './Turnaje.css';

/** Zoznam tímov na úpravu - pre skupinu aj pre pavúk. */
const ZoznamTimov: React.FC<{
  timy: TimTurnaja[];
  onZmena: (timy: TimTurnaja[]) => void;
  nase: Array<{ id: number; nazov: string; logo: string | null }>;
  menovka: string;
  cislovat?: boolean;
}> = ({ timy, onZmena, nase, menovka, cislovat }) => {
  const { varovanie } = useToast();
  const [typ, setTyp] = useState<'klub' | 'nas'>('klub');
  const [nazov, setNazov] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [nasId, setNasId] = useState('');

  const pridaj = () => {
    let novy: TimTurnaja;
    if (typ === 'nas') {
      const t = nase.find((x) => String(x.id) === nasId);
      if (!t) return varovanie(tr('Vyberte náš tím'));
      novy = { nazov: t.nazov, tim_id: t.id, logo: t.logo };
    } else {
      if (nazov.trim().length < 2) return varovanie(tr('Zadajte názov klubu'));
      novy = { nazov: nazov.trim(), tim_id: null, logo };
    }
    const kluc = (t: TimTurnaja) => (t.tim_id ? `id${t.tim_id}` : t.nazov.toLowerCase());
    if (timy.some((t) => kluc(t) === kluc(novy))) return varovanie(tr('{nazov} už v zozname je', { nazov: novy.nazov }));
    onZmena([...timy, novy]);
    setNazov('');
    setLogo(null);
    setNasId('');
  };

  const posun = (i: number, o: number) => {
    const n = [...timy];
    if (i + o < 0 || i + o >= n.length) return;
    [n[i], n[i + o]] = [n[i + o], n[i]];
    onZmena(n);
  };

  return (
    <div className="cw-turn__timy">
      <div className="cw-turn__timy-nadpis">{menovka}</div>
      {timy.length === 0 ? (
        <p className="cw-turn__prazdny-text">{tr('Zatiaľ žiadne tímy.')}</p>
      ) : (
        <ol className="cw-turn__timy-zoznam">
          {timy.map((t, i) => (
            <li key={`${t.tim_id ?? t.nazov}-${i}`}>
              {cislovat && <span className="cw-turn__nasadenie">{i + 1}.</span>}
              <span className="cw-turn__mini-logo">
                {t.logo ? <img src={souborUrl(t.logo)} alt="" /> : t.nazov.charAt(0)}
              </span>
              <span className="cw-turn__tim-meno">
                {t.nazov} {t.tim_id && <Badge ton="info">{tr('náš')}</Badge>}
              </span>
              <button onClick={() => posun(i, -1)} disabled={i === 0} aria-label={tr('{nazov} vyššie', { nazov: t.nazov })}>▲</button>
              <button onClick={() => posun(i, 1)} disabled={i === timy.length - 1} aria-label={tr('{nazov} nižšie', { nazov: t.nazov })}>▼</button>
              <button onClick={() => onZmena(timy.filter((_, j) => j !== i))} aria-label={tr('Odobrať {nazov}', { nazov: t.nazov })}>
                <Icon nazov="zavriet" velkost={13} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="cw-turn__pridat">
        <select className="cw-turn__mini" value={typ} onChange={(e) => setTyp(e.target.value as 'klub' | 'nas')} aria-label={tr('{menovka} – typ tímu', { menovka })}>
          <option value="klub">{tr('Klub')}</option>
          <option value="nas">{tr('Náš tím')}</option>
        </select>
        {typ === 'nas' ? (
          <select className="cw-turn__mini cw-turn__mini--siroke" value={nasId} onChange={(e) => setNasId(e.target.value)} aria-label={tr('{menovka} – náš tím', { menovka })}>
            <option value="">{tr('Vyberte tím')}</option>
            {nase.map((t) => (
              <option key={t.id} value={t.id}>{t.nazov}</option>
            ))}
          </select>
        ) : (
          <input
            className="cw-turn__mini cw-turn__mini--siroke"
            value={nazov}
            onChange={(e) => setNazov(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && pridaj()}
            placeholder={tr('Názov klubu')}
            aria-label={tr('{menovka} – názov klubu', { menovka })}
          />
        )}
        <Button variant="secondary" velkost="sm" onClick={pridaj} ikona={<Icon nazov="plus" velkost={13} />}>
          {tr('Pridať')}
        </Button>
      </div>
      {typ === 'klub' && (
        <PoleObrazka menovka={tr('Logo klubu (nepovinné)')} hodnota={logo} onZmena={setLogo} />
      )}
    </div>
  );
};

/** Jeden zápas (skupiny alebo pavúka) s výsledkom a prepojením. */
const RiadokZapasu: React.FC<{
  kod: string;
  domaci: TimTurnaja | null;
  hostia: TimTurnaja | null;
  skoreDomaci: number | null;
  skoreHostia: number | null;
  vitaz?: 'domaci' | 'hostia' | null;
  zapasId?: number | null;
  pavuk?: boolean;
  moznostiZapasov: Array<{ hodnota: number; popis: string }>;
  onUloz: (udaje: { skore_domaci: number | null; skore_hostia: number | null; vitaz?: 'domaci' | 'hostia' | null; zapas_id?: number | null }) => Promise<void>;
}> = ({ kod, domaci, hostia, skoreDomaci, skoreHostia, vitaz, zapasId, pavuk, moznostiZapasov, onUloz }) => {
  const [d, setD] = useState(skoreDomaci ?? '');
  const [h, setH] = useState(skoreHostia ?? '');
  const [postup, setPostup] = useState<'domaci' | 'hostia' | ''>(vitaz ?? '');
  const [uklada, setUklada] = useState(false);

  useEffect(() => {
    setD(skoreDomaci ?? '');
    setH(skoreHostia ?? '');
    setPostup(vitaz ?? '');
  }, [skoreDomaci, skoreHostia, vitaz]);

  const ma = Boolean(domaci && hostia);
  const nas = Boolean(domaci?.tim_id || hostia?.tim_id);
  const remiza = pavuk && d !== '' && h !== '' && Number(d) === Number(h);
  const zmenene = String(d) !== String(skoreDomaci ?? '') || String(h) !== String(skoreHostia ?? '') || (remiza && postup !== (vitaz ?? ''));

  const uloz = async (extra: { zapas_id?: number | null } = {}) => {
    setUklada(true);
    try {
      await onUloz({
        skore_domaci: d === '' ? null : Number(d),
        skore_hostia: h === '' ? null : Number(h),
        ...(pavuk && remiza ? { vitaz: (postup || null) as 'domaci' | 'hostia' | null } : {}),
        ...extra,
      });
    } finally {
      setUklada(false);
    }
  };

  const tim = (t: TimTurnaja | null, strana: 'domaci' | 'hostia') => (
    <span className={`cw-turn__z-tim ${vitaz === strana ? 'is-vitaz' : ''}`}>
      {t ? (
        <>
          {t.logo && <img src={souborUrl(t.logo)} alt="" />}
          {t.nazov}
        </>
      ) : (
        <em>{tr('čaká sa')}</em>
      )}
    </span>
  );

  return (
    <div className="cw-turn__zapas" data-kod={kod}>
      <div className="cw-turn__z-riadok">
        {tim(domaci, 'domaci')}
        <input
          className="cw-turn__skore"
          inputMode="numeric"
          value={d}
          disabled={!ma || Boolean(zapasId)}
          onChange={(e) => setD(e.target.value.replace(/\D/g, ''))}
          aria-label={tr('Skóre {hodnota} ({kod})', { hodnota: domaci?.nazov ?? '', kod })}
        />
        <span>:</span>
        <input
          className="cw-turn__skore"
          inputMode="numeric"
          value={h}
          disabled={!ma || Boolean(zapasId)}
          onChange={(e) => setH(e.target.value.replace(/\D/g, ''))}
          aria-label={tr('Skóre {hodnota} ({kod})', { hodnota: hostia?.nazov ?? '', kod })}
        />
        {tim(hostia, 'hostia')}
        {ma && !zapasId && zmenene && (
          <Button velkost="sm" onClick={() => uloz()} nacitava={uklada}>
            {tr('Uložiť')}
          </Button>
        )}
      </div>
      {remiza && !zapasId && (
        <select className="cw-turn__mini" value={postup} onChange={(e) => setPostup(e.target.value as 'domaci' | 'hostia' | '')} aria-label={tr('Postupuje ({kod})', { kod })}>
          <option value="">{tr('Kto postupuje (penalty)?')}</option>
          <option value="domaci">{domaci?.nazov}</option>
          <option value="hostia">{hostia?.nazov}</option>
        </select>
      )}
      {ma && nas && (
        <select
          className="cw-turn__mini cw-turn__prepojenie"
          value={zapasId ?? ''}
          onChange={(e) => uloz({ zapas_id: e.target.value ? Number(e.target.value) : null })}
          aria-label={tr('Prepojený zápas ({kod})', { kod })}
          title={tr('Výsledok sa prevezme zo zápasu v sekcii Zápasy')}
        >
          <option value="">{tr('Bez prepojenia so Zápasmi')}</option>
          {moznostiZapasov.map((m) => (
            <option key={m.hodnota} value={m.hodnota}>🔗 {m.popis}</option>
          ))}
        </select>
      )}
    </div>
  );
};

export const TurnajEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const idCislo = Number(id);
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [udaje, setUdaje] = useState<Partial<Turnaj> | null>(null);
  const [turnaj, setTurnaj] = useState<TurnajDetail | null>(null);
  const [skupiny, setSkupiny] = useState<Array<{ nazov: string; timy: TimTurnaja[] }>>([]);
  const [postupuju, setPostupuju] = useState(2);
  const [timyPavuka, setTimyPavuka] = useState<TimTurnaja[]>([]);
  const [uklada, setUklada] = useState('');
  const [archivovat, setArchivovat] = useState(false);
  const [zrusitPavuka, setZrusitPavuka] = useState(false);

  const detail = useNacitanie((signal) => turnajeApi.detail(idCislo, signal), [idCislo]);
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const sezony = useNacitanie((signal) => sezonyApi.vypis(signal));
  const zapasy = useNacitanie((signal) => zapasyApi.vypis(signal));

  const nacitaj = (t: TurnajDetail) => {
    setTurnaj(t);
    setUdaje({ ...t });
    setSkupiny(t.skupiny.skupiny.map((s) => ({ nazov: s.nazov, timy: s.timy })));
    setPostupuju(t.skupiny.postupuju ?? 2);
  };

  useEffect(() => {
    if (detail.data) nacitaj(detail.data);
  }, [detail.data]);

  const nase = (timy.data ?? []).map((t) => ({ id: t.id, nazov: t.nazov, logo: t.logo }));
  const moznostiZapasov = useMemo(
    () =>
      [...(zapasy.data ?? [])]
        .sort((a, b) => new Date(b.datum_cas).getTime() - new Date(a.datum_cas).getTime())
        .map((z) => ({ hodnota: z.id, popis: `${formatujDatumCas(z.datum_cas)} · ${z.nazov}` })),
    [zapasy.data]
  );

  const akcia = async (kluc: string, uloha: () => Promise<TurnajDetail | void>, sprava: string) => {
    setUklada(kluc);
    try {
      const vysledok = await uloha();
      if (vysledok) nacitaj(vysledok);
      uspech(sprava);
      return true;
    } catch (e: any) {
      hlasChybu(e?.message || tr('Akcia sa nepodarila'));
      return false;
    } finally {
      setUklada('');
    }
  };

  if (detail.chyba) {
    return <ErrorState sprava={tr('Turnaj sa nepodarilo načítať')} detail={detail.chyba} onSkusZnova={detail.obnov} />;
  }
  if (!turnaj || !udaje) {
    return <Skeleton riadkov={8} vyska="20px" />;
  }

  const sSkupinami = turnaj.typ === 'groups_playoff' || turnaj.typ === 'round_robin';
  const sPavukom = turnaj.typ === 'groups_playoff' || turnaj.typ === 'single_elimination';
  const pavuk = turnaj.pavuk;
  const maPavuka = pavuk.kola.length > 0;

  // ===== Uloženie údajov =====
  const ulozUdaje = () => {
    if ((udaje.nazov ?? '').trim().length < 2) return varovanie(tr('Názov turnaja musí mať aspoň 2 znaky'));
    if (udaje.datum_start && udaje.datum_koniec && udaje.datum_koniec < udaje.datum_start) {
      return varovanie(tr('Koniec turnaja nemôže byť pred začiatkom'));
    }
    void akcia(
      'udaje',
      async () => {
        await turnajeApi.uprav(turnaj.id, {
          nazov: udaje.nazov!.trim(),
          popis: udaje.popis?.trim() || null,
          typ: udaje.typ,
          sezona_id: udaje.sezona_id ?? null,
          tim_id: udaje.tim_id ?? null,
          logo: udaje.logo || null,
          datum_start: udaje.datum_start || null,
          datum_koniec: udaje.datum_koniec || null,
          status: udaje.status,
          zobrazit_na_webe: Boolean(udaje.zobrazit_na_webe),
          ma_tretie_miesto: Boolean(udaje.ma_tretie_miesto),
        });
        return turnajeApi.detail(turnaj.id);
      },
      tr('Údaje turnaja boli uložené')
    );
  };

  // ===== Skupiny =====
  const ulozSkupiny = () => {
    if (skupiny.length === 0) return varovanie(tr('Pridajte aspoň jednu skupinu'));
    const mala = skupiny.find((s) => s.timy.length < 2);
    if (mala) return varovanie(tr('Skupina {nazov} musí mať aspoň dva tímy', { nazov: mala.nazov }));
    void akcia(
      'skupiny',
      () =>
        turnajeApi.ulozSkupiny(turnaj.id, {
          postupuju: turnaj.typ === 'round_robin' ? 0 : postupuju,
          skupiny: skupiny.map((s) => ({
            nazov: s.nazov,
            timy: s.timy.map((t) => (t.tim_id ? { tim_id: t.tim_id } : { nazov: t.nazov, logo: t.logo })),
          })),
        }),
      tr('Skupiny a rozpis zápasov boli uložené')
    );
  };

  const pridajSkupinu = () =>
    setSkupiny((s) => [...s, { nazov: String.fromCharCode(65 + s.length), timy: [] }]);

  // ===== Pavúk =====
  const generujZoZoznamu = (zamiesat: boolean) => {
    if (timyPavuka.length < 2) return varovanie(tr('Pridajte do pavúka aspoň dva tímy'));
    const zoznam = [...timyPavuka];
    if (zamiesat) {
      for (let i = zoznam.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [zoznam[i], zoznam[j]] = [zoznam[j], zoznam[i]];
      }
    }
    void akcia(
      'pavuk',
      () =>
        turnajeApi.generujPavuka(
          turnaj.id,
          zoznam.map((t) => (t.tim_id ? { tim_id: t.tim_id } : { nazov: t.nazov, logo: t.logo })),
          Boolean(udaje.ma_tretie_miesto)
        ),
      tr('Pavúk bol vytvorený')
    );
  };

  const pavukZoSkupin = async () => {
    setUklada('pavuk');
    try {
      nacitaj(await turnajeApi.pavukZoSkupin(turnaj.id));
      uspech(tr('Pavúk bol vytvorený z postupujúcich'));
    } catch (e: any) {
      if (/bez výsledku/.test(e?.message ?? '') && window.confirm(tr('{message}\n\nVytvoriť pavúk podľa aktuálneho poradia?', { message: e.message }))) {
        try {
          nacitaj(await turnajeApi.pavukZoSkupin(turnaj.id, true));
          uspech(tr('Pavúk bol vytvorený z postupujúcich'));
        } catch (e2: any) {
          hlasChybu(e2?.message || tr('Pavúk sa nepodarilo vytvoriť'));
        }
      } else {
        hlasChybu(e?.message || tr('Pavúk sa nepodarilo vytvoriť'));
      }
    } finally {
      setUklada('');
    }
  };

  const vysledokPavuka = (z: ZapasPavuka) => async (u: Parameters<typeof turnajeApi.vysledokPavuka>[2]) => {
    await akcia('', () => turnajeApi.vysledokPavuka(turnaj.id, z.kod, u), tr('Výsledok uložený'));
  };

  const stav = STAVY_TURNAJA.find((s) => s.hodnota === turnaj.status);

  return (
    <div className="cw-turn">
      {/* ===== Lišta ===== */}
      <div className="cw-ced__bar">
        <button className="cw-ced__spat" onClick={() => navigate('/admin/turnaje')}>
          <Icon nazov="sipkaVlavo" velkost={15} />
          {tr('Späť')}
        </button>
        <h1 className="cw-zed__nadpis">{turnaj.nazov}</h1>
        <Badge ton={stav?.ton ?? 'neutral'}>{stav?.popis ?? turnaj.status}</Badge>
        {turnaj.vitaz_nazov && <Badge ton="warning">🏆 {turnaj.vitaz_nazov}</Badge>}
        <div className="cw-ced__medzera" />
        {turnaj.zobrazit_na_webe && (
          <button className="cw-ced__btn" onClick={() => window.open(`/turnaje/${turnaj.id}`, '_blank')}>
            <Icon nazov="oko" velkost={15} />
            {tr('Na webe')}
          </button>
        )}
        <button className="cw-ced__btn cw-ced__btn--nebezpecne" onClick={() => setArchivovat(true)} aria-label={tr('Archivovať turnaj')}>
          <Icon nazov="archiv" velkost={15} />
        </button>
      </div>

      <div className="cw-turn__grid">
        <div className="cw-turn__hlavne">
          {/* ===== Skupiny ===== */}
          {sSkupinami && (
            <section className="cw-zed__panel">
              <div className="cw-zed__panel-nadpis">{tr('Skupiny')}</div>
              <p className="cw-zed__panel-popis">
                {tr('V skupine hrá každý s každým (3 body výhra, 1 remíza). Po uložení sa vytvorí rozpis zápasov - výsledky už zapísaných dvojíc zostanú.')}
              </p>

              <div className="cw-turn__skupiny-edit">
                {skupiny.map((s, i) => (
                  <div key={i} className="cw-turn__skupina-edit">
                    <div className="cw-turn__skupina-hlava">
                      <input
                        className="cw-turn__mini"
                        value={s.nazov}
                        onChange={(e) => setSkupiny((sk) => sk.map((x, j) => (j === i ? { ...x, nazov: e.target.value } : x)))}
                        aria-label={tr('Názov skupiny {hodnota}', { hodnota: i + 1 })}
                      />
                      <button onClick={() => setSkupiny((sk) => sk.filter((_, j) => j !== i))} aria-label={tr('Odstrániť skupinu {nazov}', { nazov: s.nazov })}>
                        <Icon nazov="zmazat" velkost={14} />
                      </button>
                    </div>
                    <ZoznamTimov
                      menovka={tr('Skupina {nazov}', { nazov: s.nazov })}
                      timy={s.timy}
                      nase={nase}
                      onZmena={(t) => setSkupiny((sk) => sk.map((x, j) => (j === i ? { ...x, timy: t } : x)))}
                    />
                  </div>
                ))}
              </div>

              <div className="cw-turn__akcie">
                <Button variant="secondary" onClick={pridajSkupinu} ikona={<Icon nazov="plus" velkost={14} />}>
                  {tr('Pridať skupinu')}
                </Button>
                {turnaj.typ === 'groups_playoff' && (
                  <label className="cw-turn__postup">
                    {tr('Postupujú zo skupiny')}
                    <input
                      className="cw-turn__mini cw-turn__mini--cislo"
                      type="number"
                      min={1}
                      max={8}
                      value={postupuju}
                      onChange={(e) => setPostupuju(Number(e.target.value) || 1)}
                      aria-label={tr('Počet postupujúcich zo skupiny')}
                    />
                  </label>
                )}
                <Button onClick={ulozSkupiny} nacitava={uklada === 'skupiny'}>
                  {tr('Uložiť skupiny a rozpis')}
                </Button>
              </div>

              {/* Tabuľky a zápasy uložených skupín */}
              {turnaj.skupiny.skupiny.map((s) => (
                <div key={s.nazov} className="cw-turn__skupina">
                  <h3>{tr('Skupina')} {s.nazov}</h3>
                  <table className="cw-turn__tabulka">
                    <thead>
                      <tr>
                        <th>#</th><th>{tr('Tím')}</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>{tr('Skóre')}</th><th>B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.tabulka.map((r) => (
                        <tr key={r.tim.tim_id ?? r.tim.nazov} className={r.postupuje ? 'is-postup' : ''}>
                          <td>{r.poradie}</td>
                          <td>{r.tim.nazov}</td>
                          <td>{r.zapasy}</td><td>{r.vyhry}</td><td>{r.remizy}</td><td>{r.prehry}</td>
                          <td>{r.goly_za}:{r.goly_proti}</td>
                          <td><strong>{r.body}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="cw-turn__zapasy">
                    {s.zapasy.map((z) => (
                      <RiadokZapasu
                        key={z.kod}
                        kod={z.kod}
                        domaci={s.timy[z.domaci]}
                        hostia={s.timy[z.hostia]}
                        skoreDomaci={z.skore_domaci}
                        skoreHostia={z.skore_hostia}
                        zapasId={z.zapas_id}
                        moznostiZapasov={moznostiZapasov}
                        onUloz={async (u) => {
                          await akcia('', () => turnajeApi.vysledokSkupiny(turnaj.id, z.kod, u), tr('Výsledok uložený'));
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ===== Pavúk ===== */}
          {sPavukom && (
            <section className="cw-zed__panel">
              <div className="cw-zed__panel-nadpis">
                {tr('Pavúk')}
                {maPavuka && (
                  <Button variant="ghost" velkost="sm" onClick={() => setZrusitPavuka(true)}>
                    {tr('Zrušiť pavúk')}
                  </Button>
                )}
              </div>

              {!maPavuka ? (
                turnaj.typ === 'groups_playoff' ? (
                  <div className="cw-turn__prazdny">
                    <p>
                      {tr('Pavúk sa vytvorí z postupujúcich zo skupín (')}{turnaj.skupiny.postupuju} {tr('z každej). Víťazi skupín nehrajú v prvom kole proti tímu z vlastnej skupiny.')}
                    </p>
                    <Button onClick={pavukZoSkupin} nacitava={uklada === 'pavuk'} disabled={turnaj.skupiny.skupiny.length === 0}>
                      {tr('Vytvoriť pavúk zo skupín')}
                    </Button>
                  </div>
                ) : (
                  <div className="cw-turn__prazdny">
                    <ZoznamTimov menovka={tr('Tímy v pavúku (poradie = nasadenie)')} timy={timyPavuka} nase={nase} onZmena={setTimyPavuka} cislovat />
                    <div className="cw-turn__akcie">
                      <Button onClick={() => generujZoZoznamu(false)} nacitava={uklada === 'pavuk'}>
                        {tr('Vytvoriť pavúk podľa nasadenia')}
                      </Button>
                      <Button variant="secondary" onClick={() => generujZoZoznamu(true)} disabled={uklada === 'pavuk'}>
                        {tr('Vytvoriť náhodným žrebom')}
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="cw-turn__pavuk">
                  {pavuk.kola.map((kolo) => (
                    <div key={kolo.poradie} className="cw-turn__kolo">
                      <div className="cw-turn__kolo-nazov">{kolo.nazov}</div>
                      {kolo.zapasy.map((z) => (
                        <RiadokZapasu
                          key={z.kod}
                          kod={z.kod}
                          pavuk
                          domaci={z.domaci}
                          hostia={z.hostia}
                          skoreDomaci={z.skore_domaci}
                          skoreHostia={z.skore_hostia}
                          vitaz={z.vitaz}
                          zapasId={z.zapas_id}
                          moznostiZapasov={moznostiZapasov}
                          onUloz={vysledokPavuka(z)}
                        />
                      ))}
                    </div>
                  ))}
                  {pavuk.o_tretie && (
                    <div className="cw-turn__kolo">
                      <div className="cw-turn__kolo-nazov">{tr('O 3. miesto')}</div>
                      <RiadokZapasu
                        kod={pavuk.o_tretie.kod}
                        pavuk
                        domaci={pavuk.o_tretie.domaci}
                        hostia={pavuk.o_tretie.hostia}
                        skoreDomaci={pavuk.o_tretie.skore_domaci}
                        skoreHostia={pavuk.o_tretie.skore_hostia}
                        vitaz={pavuk.o_tretie.vitaz}
                        zapasId={pavuk.o_tretie.zapas_id}
                        moznostiZapasov={moznostiZapasov}
                        onUloz={vysledokPavuka(pavuk.o_tretie)}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ===== Údaje turnaja ===== */}
        <aside className="cw-zed__panel cw-turn__bok">
          <div className="cw-zed__panel-nadpis">{tr('Údaje turnaja')}</div>
          <Input menovka={tr('Názov')} value={udaje.nazov ?? ''} onChange={(e) => setUdaje((u) => ({ ...u!, nazov: e.target.value }))} povinne />
          <Textarea menovka={tr('Popis')} rows={3} value={udaje.popis ?? ''} onChange={(e) => setUdaje((u) => ({ ...u!, popis: e.target.value }))} />
          <Select
            menovka={tr('Formát')}
            value={udaje.typ ?? 'single_elimination'}
            onChange={(e) => setUdaje((u) => ({ ...u!, typ: e.target.value as TypTurnaja }))}
            moznosti={FORMATY.map((f) => ({ hodnota: f.hodnota, popis: f.popis }))}
          />
          <Select
            menovka={tr('Sezóna')}
            value={udaje.sezona_id ?? ''}
            onChange={(e) => setUdaje((u) => ({ ...u!, sezona_id: e.target.value ? Number(e.target.value) : null }))}
            prazdna={tr('Bez sezóny')}
            moznosti={(sezony.data ?? []).map((s) => ({ hodnota: s.id, popis: s.nazov }))}
          />
          <Select
            menovka={tr('Náš tím')}
            value={udaje.tim_id ?? ''}
            onChange={(e) => setUdaje((u) => ({ ...u!, tim_id: e.target.value ? Number(e.target.value) : null }))}
            prazdna={tr('Neurčený')}
            moznosti={nase.map((t) => ({ hodnota: t.id, popis: t.nazov }))}
          />
          <div className="cw-turn__dva">
            <Input menovka={tr('Začiatok')} type="date" value={udaje.datum_start ?? ''} onChange={(e) => setUdaje((u) => ({ ...u!, datum_start: e.target.value }))} />
            <Input menovka={tr('Koniec')} type="date" value={udaje.datum_koniec ?? ''} onChange={(e) => setUdaje((u) => ({ ...u!, datum_koniec: e.target.value }))} />
          </div>
          <Select
            menovka={tr('Stav')}
            value={udaje.status ?? 'pripravuje'}
            onChange={(e) => setUdaje((u) => ({ ...u!, status: e.target.value as StavTurnaja }))}
            moznosti={STAVY_TURNAJA.map((s) => ({ hodnota: s.hodnota, popis: s.popis }))}
          />
          <PoleObrazka menovka={tr('Logo turnaja')} hodnota={udaje.logo} onZmena={(c) => setUdaje((u) => ({ ...u!, logo: c }))} />
          <Switch zapnute={Boolean(udaje.ma_tretie_miesto)} onZmena={(v) => setUdaje((u) => ({ ...u!, ma_tretie_miesto: v }))} menovka={tr('Zápas o 3. miesto')} />
          <Switch zapnute={Boolean(udaje.zobrazit_na_webe)} onZmena={(v) => setUdaje((u) => ({ ...u!, zobrazit_na_webe: v }))} menovka={tr('Zobraziť na webe')} />
          <Button onClick={ulozUdaje} nacitava={uklada === 'udaje'}>
            {tr('Uložiť údaje')}
          </Button>
        </aside>
      </div>

      <ConfirmDialog
        otvorene={archivovat}
        nadpis={tr('Archivovať turnaj?')}
        sprava={tr('Turnaj {nazov} sa presunie do archívu, odkiaľ ho môžete obnoviť.', { nazov: turnaj.nazov })}
        potvrdit={tr('Archivovať')}
        nebezpecne
        onPotvrd={async () => {
          if (await akcia('archiv', () => turnajeApi.zmaz(turnaj.id) as Promise<void>, tr('Turnaj bol archivovaný'))) {
            navigate('/admin/turnaje');
          }
        }}
        onZrus={() => setArchivovat(false)}
      />
      <ConfirmDialog
        otvorene={zrusitPavuka}
        nadpis={tr('Zrušiť pavúk?')}
        sprava={tr('Pavúk aj jeho výsledky sa zmažú. Skupiny zostanú. Pavúk potom môžete vytvoriť znova.')}
        potvrdit={tr('Zrušiť pavúk')}
        nebezpecne
        onPotvrd={async () => {
          await akcia('pavuk', () => turnajeApi.zrusPavuka(turnaj.id), tr('Pavúk bol zrušený'));
          setZrusitPavuka(false);
        }}
        onZrus={() => setZrusitPavuka(false)}
      />
    </div>
  );
};

export default TurnajEditor;
