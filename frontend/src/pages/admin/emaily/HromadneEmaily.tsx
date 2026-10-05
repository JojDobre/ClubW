// Umiestnenie: frontend/src/pages/admin/emaily/HromadneEmaily.tsx
// E-maily → Hromadné e-maily: oznamy fanúšikom a členom. Dostanú ich
// len tí, ktorí súhlasili so zasielaním oznamov; každý e-mail má odkaz
// na odhlásenie. Odchádzajú postupne podľa limitu za minútu.

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  PageHeader, Badge, Button, Card, DataTable, Input, Switch, Skeleton, ErrorState, ConfirmDialog, Icon, useToast,
  type Stlpec, type AkciaRiadku, type TonStitka,
} from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { useAuth } from '../../../app/AuthContext';
import { emailyApi, type AdresatiKampane, type Kampan } from '../../../api/emaily';
import { formatujDatum } from '../../../utils/datum';
import { tr } from '../../../i18n';
import { EditorEmailu, NahladEmailu, PasStavu, useNahlad } from './spolocne';
import './Emaily.css';

const STAVY: Record<Kampan['stav'], { popis: string; ton: TonStitka }> = {
  koncept: { popis: tr('Koncept'), ton: 'neutral' },
  odosiela: { popis: tr('Odosiela sa'), ton: 'warning' },
  odoslana: { popis: tr('Odoslaný'), ton: 'success' },
};

const TYPY = [
  { hodnota: 'fanusik', popis: tr('Fanúšik') },
  { hodnota: 'clen', popis: tr('Člen klubu') },
  { hodnota: 'vip', popis: 'VIP' },
  { hodnota: 'cestny', popis: tr('Čestný člen') },
];

const popisAdresatov = (a: AdresatiKampane) => {
  const typy = a.typy?.length ? a.typy.map((t) => TYPY.find((x) => x.hodnota === t)?.popis ?? t).join(', ') : tr('všetci');
  return a.len_platne ? `${typy} · ${tr('len platné členstvo')}` : typy;
};

export const HromadneEmaily: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu } = useToast();
  const kampane = useNacitanie((signal) => emailyApi.kampane(signal));
  const stav = useNacitanie((signal) => emailyApi.stav(signal));
  const [naZmazanie, setNaZmazanie] = useState<Kampan | null>(null);

  // Kým sa niečo odosiela, priebeh sa obnovuje
  const odosiela = (kampane.data ?? []).some((k) => k.stav === 'odosiela');
  useEffect(() => {
    if (!odosiela) return;
    const t = window.setInterval(() => kampane.obnov(), 5000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odosiela]);

  const kopia = async (k: Kampan) => {
    try {
      const nova = await emailyApi.kopirujKampan(k.id);
      navigate(`/admin/emaily/hromadne/${nova.id}`);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Kópiu sa nepodarilo vytvoriť'));
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    try {
      await emailyApi.zmazKampan(naZmazanie.id);
      uspech(tr('Hromadný e-mail bol odstránený'));
      setNaZmazanie(null);
      kampane.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Záznam sa nepodarilo odstrániť'));
    }
  };

  const stlpce: Stlpec<Kampan>[] = [
    {
      kluc: 'nazov',
      popis: tr('E-mail'),
      obsah: (k) => (
        <div className="cw-hraci__meno">
          <span className="cw-hraci__meno-text">{k.nazov}</span>
          <span className="cw-em-male">{k.predmet}</span>
        </div>
      ),
    },
    { kluc: 'adresati', popis: tr('Komu'), obsah: (k) => <span className="cw-em-tlmene">{popisAdresatov(k.adresati)}</span>, sirka: '220px', skryTNaMobile: true },
    {
      kluc: 'stav',
      popis: tr('Stav'),
      obsah: (k) => (
        <div className="cw-hraci__meno">
          <span>
            <Badge ton={STAVY[k.stav].ton}>{STAVY[k.stav].popis}</Badge>
          </span>
          {k.stav !== 'koncept' && (
            <span className="cw-em-male">
              {tr('{odoslane} z {pocet} odoslaných', { odoslane: k.statistika.odoslane, pocet: k.pocet_adresatov })}
              {k.statistika.chyby > 0 && ` · ${tr('chyby: {pocet}', { pocet: k.statistika.chyby })}`}
            </span>
          )}
        </div>
      ),
      sirka: '220px',
    },
    {
      kluc: 'datum',
      popis: tr('Dátum'),
      obsah: (k) => <span className="cw-em-tlmene">{formatujDatum(k.odoslana ?? k.vytvoreny)}</span>,
      sirka: '120px',
      skryTNaMobile: true,
    },
  ];

  const akcie: AkciaRiadku<Kampan>[] = [
    { popis: tr('Otvoriť'), ikona: 'upravit', onKlik: (k) => navigate(`/admin/emaily/hromadne/${k.id}`) },
    { popis: tr('Kopírovať'), ikona: 'kopirovat', onKlik: kopia },
    { popis: tr('Odstrániť'), ikona: 'zmazat', nebezpecna: true, onKlik: setNaZmazanie, zobrazit: (k) => k.stav !== 'odosiela' },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Hromadné e-maily')}
        podnadpis={tr('Oznamy fanúšikom a členom - pozvánky na zápasy, novinky, výzvy. Dostanú ich len tí, ktorí súhlasili so zasielaním oznamov.')}
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => navigate('/admin/emaily/hromadne/novy')}>
            {tr('Nový e-mail')}
          </Button>
        }
      />
      <PasStavu stav={stav.data} />
      <DataTable<Kampan>
        data={kampane.data ?? []}
        idZaznamu={(k) => k.id}
        stlpce={stlpce}
        nacitava={kampane.nacitava && !kampane.data}
        chyba={kampane.chyba}
        onSkusZnova={kampane.obnov}
        akcieRiadku={akcie}
        onKlikNaRiadok={(k) => navigate(`/admin/emaily/hromadne/${k.id}`)}
        prazdnyNadpis={tr('Zatiaľ žiadne hromadné e-maily')}
        prazdnyPopis={tr('Napíšte prvý oznam fanúšikom - napríklad pozvánku na najbližší domáci zápas.')}
        prazdnaAkcia={<Button onClick={() => navigate('/admin/emaily/hromadne/novy')}>{tr('Nový e-mail')}</Button>}
      />
      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Odstrániť hromadný e-mail?')}
        sprava={tr('„{nazov}“ sa odstráni zo zoznamu. Už odoslané e-maily ostanú v záznamoch.', { nazov: naZmazanie?.nazov })}
        potvrdit={tr('Odstrániť')}
        nebezpecne
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

const PRAZDNA = { nazov: '', predmet: '', obsah: 'Dobrý deň {{meno}},\n\n\n\n[Viac na webe]({{web}})\n\nVáš {{klub}}', adresati: { typy: [], len_platne: false } as AdresatiKampane };

export const HromadnyEmailEditor: React.FC = () => {
  const { id } = useParams();
  const jeNovy = !id || id === 'novy';
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const { pouzivatel } = useAuth();
  const kampan = useNacitanie((signal) => (jeNovy ? Promise.resolve(null) : emailyApi.kampan(Number(id), signal)), [id]);
  const znacky = useNacitanie((signal) => emailyApi.znackyKampane(signal));
  const stav = useNacitanie((signal) => emailyApi.stav(signal));
  const [f, setF] = useState(PRAZDNA);
  const [pocet, setPocet] = useState<number | null>(null);
  const [uklada, setUklada] = useState(false);
  const [odoslat, setOdoslat] = useState(false);
  const [posiela, setPosiela] = useState(false);
  const [prijemca, setPrijemca] = useState(pouzivatel?.email ?? '');
  const [testuje, setTestuje] = useState(false);

  useEffect(() => {
    if (kampan.data) setF({ nazov: kampan.data.nazov, predmet: kampan.data.predmet, obsah: kampan.data.obsah, adresati: { typy: kampan.data.adresati?.typy ?? [], len_platne: Boolean(kampan.data.adresati?.len_platne) } });
  }, [kampan.data]);

  // Počet adresátov podľa výberu
  useEffect(() => {
    const ovladac = new AbortController();
    emailyApi.pocetAdresatov(f.adresati, ovladac.signal).then((r) => setPocet(r.pocet)).catch(() => undefined);
    return () => ovladac.abort();
  }, [f.adresati]);

  const k = kampan.data;
  const uzamknuty = Boolean(k && k.stav !== 'koncept');

  // Priebeh odosielania
  useEffect(() => {
    if (k?.stav !== 'odosiela') return;
    const t = window.setInterval(() => kampan.obnov(), 4000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k?.stav]);

  const nahlad = useNahlad((signal) => emailyApi.nahladKampane({ predmet: f.predmet, obsah: f.obsah }, signal), [f.predmet, f.obsah]);

  const prepniTyp = (typ: string, zapnute: boolean) => {
    const typy = new Set(f.adresati.typy);
    if (zapnute) typy.add(typ);
    else typy.delete(typ);
    setF({ ...f, adresati: { ...f.adresati, typy: TYPY.map((t) => t.hodnota).filter((t) => typy.has(t)) } });
  };

  /** Uloží koncept; vráti id. */
  const uloz = async (tichy = false): Promise<number | null> => {
    if (!f.nazov.trim()) {
      varovanie(tr('Zadajte názov hromadného e-mailu'));
      return null;
    }
    if (!f.predmet.trim() || !f.obsah.trim()) {
      varovanie(tr('Predmet aj text e-mailu musia byť vyplnené'));
      return null;
    }
    setUklada(true);
    try {
      const udaje = { nazov: f.nazov.trim(), predmet: f.predmet.trim(), obsah: f.obsah, adresati: f.adresati };
      const ulozena = jeNovy ? await emailyApi.vytvorKampan(udaje) : await emailyApi.upravKampan(Number(id), udaje);
      if (!tichy) uspech(tr('Hromadný e-mail bol uložený'));
      if (jeNovy) navigate(`/admin/emaily/hromadne/${ulozena.id}`, { replace: true });
      return ulozena.id;
    } catch (e: any) {
      hlasChybu(e?.message || tr('Záznam sa nepodarilo uložiť'));
      return null;
    } finally {
      setUklada(false);
    }
  };

  const otestuj = async () => {
    const idKampane = uzamknuty ? k!.id : await uloz(true);
    if (!idKampane) return;
    setTestuje(true);
    try {
      await emailyApi.testKampane(idKampane, prijemca.trim());
      uspech(tr('Skúšobný e-mail bol odoslaný na {email}', { email: prijemca.trim() }));
    } catch (e: any) {
      hlasChybu(e?.message || tr('E-mail sa nepodarilo odoslať'));
    } finally {
      setTestuje(false);
    }
  };

  const posli = async () => {
    const idKampane = await uloz(true);
    if (!idKampane) return;
    setPosiela(true);
    try {
      const r = await emailyApi.odosliKampan(idKampane);
      uspech(tr('E-mail sa odosiela {pocet} adresátom', { pocet: r.pocet }));
      setOdoslat(false);
      kampan.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('E-mail sa nepodarilo odoslať'));
    } finally {
      setPosiela(false);
    }
  };

  const zastav = async () => {
    try {
      await emailyApi.zastavKampan(k!.id);
      uspech(tr('Odosielanie bolo zastavené'));
      kampan.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Odosielanie sa nepodarilo zastaviť'));
    }
  };

  if (kampan.chyba) {
    return (
      <div className="cw-screen">
        <ErrorState sprava={tr('Hromadný e-mail sa nepodarilo načítať')} detail={kampan.chyba} onSkusZnova={kampan.obnov} />
      </div>
    );
  }
  if (!jeNovy && !k) {
    return (
      <div className="cw-screen">
        <Skeleton vyska="520px" />
      </div>
    );
  }

  const percent = k && k.pocet_adresatov ? Math.round((k.statistika.odoslane / k.pocet_adresatov) * 100) : 0;

  return (
    <div className="cw-screen">
      <Link to="/admin/emaily/hromadne" className="cw-em-spat">
        <Icon nazov="sipkaVlavo" velkost={14} /> {tr('Hromadné e-maily')}
      </Link>
      <PageHeader
        nadpis={jeNovy ? tr('Nový hromadný e-mail') : f.nazov || tr('Hromadný e-mail')}
        podnadpis={k ? `${STAVY[k.stav].popis}${k.odoslana ? ` · ${formatujDatum(k.odoslana)}` : ''}` : undefined}
        akcie={
          uzamknuty ? (
            <div className="cw-em-akcie">
              {k!.stav === 'odosiela' && (
                <Button variant="ghost" onClick={zastav}>
                  {tr('Zastaviť odosielanie')}
                </Button>
              )}
              <Button
                variant="secondary"
                ikona={<Icon nazov="kopirovat" velkost={16} />}
                onClick={async () => {
                  const nova = await emailyApi.kopirujKampan(k!.id);
                  navigate(`/admin/emaily/hromadne/${nova.id}`);
                }}
              >
                {tr('Vytvoriť kópiu')}
              </Button>
            </div>
          ) : (
            <div className="cw-em-akcie">
              <Button variant="secondary" onClick={() => uloz()} nacitava={uklada}>
                {tr('Uložiť koncept')}
              </Button>
              <Button ikona={<Icon nazov="odoslat" velkost={16} />} onClick={() => setOdoslat(true)} disabled={!pocet}>
                {tr('Odoslať')}
              </Button>
            </div>
          )
        }
      />

      {k && k.stav !== 'koncept' && (
        <Card className="cw-em-skupina">
          <div className="cw-em-pocet">
            <strong>{k.statistika.odoslane}</strong>
            <span className="cw-em-tlmene">
              {tr('z {pocet} odoslaných', { pocet: k.pocet_adresatov })}
              {k.statistika.caka > 0 && ` · ${tr('čaká: {pocet}', { pocet: k.statistika.caka })}`}
              {k.statistika.chyby > 0 && ` · ${tr('chyby: {pocet}', { pocet: k.statistika.chyby })}`}
            </span>
          </div>
          <div className="cw-em-priebeh" style={{ marginTop: 10 }} aria-label={tr('Priebeh odosielania')}>
            <span style={{ width: `${percent}%` }} />
          </div>
        </Card>
      )}
      {!uzamknuty && <PasStavu stav={stav.data} />}

      <div className="cw-em-editor-stranka" style={{ marginTop: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <Card nadpis={tr('Komu')}>
            <Input
              menovka={tr('Názov (len pre vás)')}
              value={f.nazov}
              maxLength={150}
              onChange={(e) => setF({ ...f, nazov: e.target.value })}
              placeholder={tr('Napríklad: Pozvánka na derby')}
              disabled={uzamknuty}
            />
            <div>
              <span className="cw-em-editor__menovka">{tr('Typ členstva')}</span>
              <div className="cw-em-adresati" style={{ marginTop: 6 }}>
                {TYPY.map((t) => (
                  <label key={t.hodnota}>
                    <input
                      type="checkbox"
                      checked={f.adresati.typy.includes(t.hodnota)}
                      onChange={(e) => prepniTyp(t.hodnota, e.target.checked)}
                      disabled={uzamknuty}
                    />
                    {t.popis}
                  </label>
                ))}
              </div>
              <p className="cw-em-male" style={{ marginTop: 6 }}>{tr('Nič nezaškrtnuté = všetci.')}</p>
            </div>
            <Switch
              zapnute={f.adresati.len_platne}
              onZmena={(v) => setF({ ...f, adresati: { ...f.adresati, len_platne: v } })}
              menovka={tr('Len s platným členstvom')}
              popis={tr('Vynechá tých, ktorým členstvo vypršalo.')}
              disabled={uzamknuty}
            />
            {!uzamknuty && (
              <div className="cw-em-pocet">
                <strong>{pocet ?? '…'}</strong>
                <span className="cw-em-tlmene">{tr('adresátov so súhlasom so zasielaním oznamov')}</span>
              </div>
            )}
          </Card>
          <Card nadpis={tr('Text')}>
            <EditorEmailu
              predmet={f.predmet}
              obsah={f.obsah}
              onPredmet={(v) => setF({ ...f, predmet: v })}
              onObsah={(v) => setF({ ...f, obsah: v })}
              znacky={znacky.data?.znacky ?? []}
              spolocneZnacky={znacky.data?.spolocne_znacky ?? []}
              zablokovane={uzamknuty}
            />
            <div className="cw-em-heslo">
              <Input menovka={tr('Skúšobný e-mail na')} type="email" value={prijemca} onChange={(e) => setPrijemca(e.target.value)} />
              <Button variant="secondary" ikona={<Icon nazov="odoslat" velkost={16} />} onClick={otestuj} nacitava={testuje} disabled={!prijemca.includes('@')}>
                {tr('Poslať skúšku')}
              </Button>
            </div>
            <p className="cw-em-male">{tr('Odkaz na odhlásenie pridá systém do každého e-mailu sám (vyžaduje to GDPR).')}</p>
          </Card>
        </div>
        <NahladEmailu email={nahlad.email} nacitava={nahlad.nacitava} />
      </div>

      <ConfirmDialog
        otvorene={odoslat}
        nadpis={tr('Odoslať e-mail {pocet} adresátom?', { pocet: pocet ?? 0 })}
        sprava={tr('E-mail „{predmet}“ začne odchádzať hneď. Odoslaný e-mail sa už nedá upraviť ani vziať späť.', { predmet: f.predmet })}
        potvrdit={tr('Odoslať')}
        nacitava={posiela}
        onPotvrd={posli}
        onZrus={() => setOdoslat(false)}
      />
    </div>
  );
};

export default HromadneEmaily;
