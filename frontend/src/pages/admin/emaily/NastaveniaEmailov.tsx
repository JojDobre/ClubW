// Umiestnenie: frontend/src/pages/admin/emaily/NastaveniaEmailov.tsx
// E-maily → Nastavenia: SMTP server, odosielateľ, pätička a skúšobný e-mail.
// Skúška pošle e-mail s údajmi z formulára ešte pred uložením, takže sa
// dá skúšať, kým to nefunguje.

import React, { useEffect, useState } from 'react';
import { PageHeader, Button, Card, Input, Select, Textarea, Skeleton, ErrorState, Icon, Modal, useToast } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { useAuth } from '../../../app/AuthContext';
import { emailyApi, type NastaveniaEmailov as Nastavenia, type ZabezpecenieSmtp } from '../../../api/emaily';
import { tr } from '../../../i18n';
import { PasStavu } from './spolocne';
import { NAVOD_HTML, stiahniNavod } from './navod';
import './Emaily.css';

/** Bežní poskytovatelia - vyplnia server, port a zabezpečenie. */
const PREDVOLBY: Array<{ nazov: string; host: string; port: number; zabezpecenie: ZabezpecenieSmtp }> = [
  { nazov: 'Websupport', host: 'smtp.websupport.sk', port: 465, zabezpecenie: 'ssl' },
  { nazov: 'Seznam', host: 'smtp.seznam.cz', port: 465, zabezpecenie: 'ssl' },
  { nazov: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, zabezpecenie: 'starttls' },
  { nazov: 'Microsoft 365', host: 'smtp.office365.com', port: 587, zabezpecenie: 'starttls' },
  { nazov: 'Brevo', host: 'smtp-relay.brevo.com', port: 587, zabezpecenie: 'starttls' },
  { nazov: 'Mailgun (EU)', host: 'smtp.eu.mailgun.org', port: 587, zabezpecenie: 'starttls' },
  { nazov: 'Amazon SES (Frankfurt)', host: 'email-smtp.eu-central-1.amazonaws.com', port: 587, zabezpecenie: 'starttls' },
  { nazov: 'Postmark', host: 'smtp.postmarkapp.com', port: 587, zabezpecenie: 'starttls' },
  { nazov: 'Resend', host: 'smtp.resend.com', port: 465, zabezpecenie: 'ssl' },
];

type Formular = Omit<Nastavenia, 'env' | 'smtp_port' | 'limit_za_minutu'> & { smtp_port: string; limit_za_minutu: string; heslo: string };

export const NastaveniaEmailov: React.FC = () => {
  const { uspech, chyba: hlasChybu } = useToast();
  const { pouzivatel } = useAuth();
  const nastavenia = useNacitanie((signal) => emailyApi.nastavenia(signal));
  const stav = useNacitanie((signal) => emailyApi.stav(signal));
  const [f, setF] = useState<Formular | null>(null);
  const [uklada, setUklada] = useState(false);
  const [prijemca, setPrijemca] = useState(pouzivatel?.email ?? '');
  const [testuje, setTestuje] = useState(false);
  const [vysledok, setVysledok] = useState<{ ok: boolean; text: string } | null>(null);
  const [navod, setNavod] = useState(false);

  useEffect(() => {
    const n = nastavenia.data;
    if (n) setF({ ...n, smtp_port: n.smtp_port ? String(n.smtp_port) : '', limit_za_minutu: String(n.limit_za_minutu), heslo: '' });
  }, [nastavenia.data]);

  const zmen = (zmena: Partial<Formular>) => setF((d) => (d ? { ...d, ...zmena } : d));

  const udaje = (formular: Formular) => ({
    smtp_host: formular.smtp_host?.trim() || null,
    smtp_port: formular.smtp_port ? Number(formular.smtp_port) : null,
    smtp_zabezpecenie: formular.smtp_zabezpecenie,
    smtp_pouzivatel: formular.smtp_pouzivatel?.trim() || null,
    odosielatel_meno: formular.odosielatel_meno?.trim() || null,
    odosielatel_email: formular.odosielatel_email?.trim() || null,
    odpovedat_na: formular.odpovedat_na?.trim() || null,
    pata: formular.pata?.trim() || null,
    limit_za_minutu: Number(formular.limit_za_minutu) || 30,
    ...(formular.heslo ? { heslo: formular.heslo } : {}),
  });

  const uloz = async () => {
    if (!f) return;
    setUklada(true);
    try {
      const ulozene = await emailyApi.ulozNastavenia(udaje(f));
      nastavenia.nastavData({ ...ulozene, env: nastavenia.data?.env ?? null });
      stav.obnov();
      uspech(tr('Nastavenia e-mailov boli uložené'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Nastavenia sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmazHeslo = async () => {
    try {
      const ulozene = await emailyApi.ulozNastavenia({ zmazat_heslo: true });
      nastavenia.nastavData({ ...ulozene, env: nastavenia.data?.env ?? null });
      uspech(tr('Uložené heslo bolo odstránené'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Nastavenia sa nepodarilo uložiť'));
    }
  };

  const otestuj = async () => {
    if (!f) return;
    setTestuje(true);
    setVysledok(null);
    try {
      // Prázdny formulár = otestujú sa nastavenia zo súboru .env
      await emailyApi.testNastaveni(prijemca.trim(), f.smtp_host?.trim() ? udaje(f) : undefined);
      setVysledok({ ok: true, text: tr('Skúšobný e-mail odišiel na {email}. Skontrolujte schránku (aj priečinok nevyžiadanej pošty).', { email: prijemca.trim() }) });
      stav.obnov();
    } catch (e: any) {
      setVysledok({ ok: false, text: e?.message || tr('E-mail sa nepodarilo odoslať') });
    } finally {
      setTestuje(false);
    }
  };

  if (nastavenia.chyba) {
    return (
      <div className="cw-screen">
        <ErrorState sprava={tr('Nastavenia sa nepodarilo načítať')} detail={nastavenia.chyba} onSkusZnova={nastavenia.obnov} />
      </div>
    );
  }
  if (!f) {
    return (
      <div className="cw-screen">
        <Skeleton vyska="420px" />
      </div>
    );
  }

  const env = nastavenia.data?.env;
  // Prázdny odosielateľ = prihlasovacia schránka (ak je to e-mailová adresa)
  const jeAdresa = (t?: string | null) => !!t && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.trim());
  const prihlasenie = f.smtp_pouzivatel?.trim() ?? '';
  const odosielatelEmail = f.odosielatel_email?.trim() ?? '';
  const ineAkoPrihlasenie = jeAdresa(prihlasenie) && jeAdresa(odosielatelEmail) && prihlasenie.toLowerCase() !== odosielatelEmail.toLowerCase();

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Nastavenia e-mailov')}
        podnadpis={tr('Cez aký server odchádzajú e-maily z webu - potvrdenia objednávok, odkazy na heslo, upozornenia aj hromadné e-maily.')}
        akcie={
          <Button onClick={uloz} nacitava={uklada}>
            {tr('Uložiť')}
          </Button>
        }
      />
      <PasStavu stav={stav.data} naNastaveniach />

      <div className="cw-em-navod-pas">
        <Icon nazov="stranky" velkost={20} />
        <div>
          <strong>{tr('Návod na nastavenie e-mailov')}</strong>
          <span>{tr('Krok za krokom: vytvorenie schránky na hostingu, výber e-mailovej služby, DNS záznamy proti spamu, šablóny a riešenie problémov.')}</span>
        </div>
        <div className="cw-em-akcie">
          <Button variant="secondary" velkost="sm" ikona={<Icon nazov="oko" velkost={15} />} onClick={() => setNavod(true)}>
            {tr('Zobraziť návod')}
          </Button>
          <Button variant="secondary" velkost="sm" ikona={<Icon nazov="stiahnut" velkost={15} />} onClick={stiahniNavod}>
            {tr('Stiahnuť návod')}
          </Button>
        </div>
      </div>

      <div className="cw-em-dva">
        <Card nadpis={tr('SMTP server')} podnadpis={tr('Údaje nájdete u poskytovateľa e-mailu (webhosting, Brevo, Mailgun…).')}>
          <div>
            <span className="cw-em-editor__menovka">{tr('Rýchle vyplnenie')}</span>
            <div className="cw-em-predvolby" style={{ marginTop: 6 }}>
              {PREDVOLBY.map((p) => (
                <button key={p.nazov} type="button" onClick={() => zmen({ smtp_host: p.host, smtp_port: String(p.port), smtp_zabezpecenie: p.zabezpecenie })}>
                  {p.nazov}
                </button>
              ))}
            </div>
          </div>
          <div className="cw-em-riadok cw-em-riadok--3">
            <Input
              menovka={tr('Server (SMTP host)')}
              value={f.smtp_host ?? ''}
              onChange={(e) => zmen({ smtp_host: e.target.value })}
              placeholder="smtp.vasposkytovatel.sk"
              autoComplete="off"
            />
            <Input menovka={tr('Port')} type="number" value={f.smtp_port} onChange={(e) => zmen({ smtp_port: e.target.value })} placeholder="587" />
            <Select
              menovka={tr('Zabezpečenie')}
              value={f.smtp_zabezpecenie}
              onChange={(e) => zmen({ smtp_zabezpecenie: e.target.value as ZabezpecenieSmtp })}
              moznosti={[
                { hodnota: 'auto', popis: tr('Automaticky') },
                { hodnota: 'ssl', popis: 'SSL/TLS (465)' },
                { hodnota: 'starttls', popis: 'STARTTLS (587)' },
                { hodnota: 'ziadne', popis: tr('Bez šifrovania') },
              ]}
            />
          </div>
          <Input
            menovka={tr('Používateľské meno')}
            value={f.smtp_pouzivatel ?? ''}
            onChange={(e) => zmen({ smtp_pouzivatel: e.target.value })}
            placeholder="schranka@domena.sk"
            napoveda={tr('Pri schránke na hostingu je to celá e-mailová adresa, pri službách ako Brevo prihlasovacie meno zo sekcie SMTP.')}
            autoComplete="off"
          />
          <div className="cw-em-heslo">
            <Input
              menovka={tr('Heslo')}
              type="password"
              value={f.heslo}
              onChange={(e) => zmen({ heslo: e.target.value })}
              placeholder={f.ma_heslo ? tr('•••••••• (uložené - nechajte prázdne)') : ''}
              autoComplete="new-password"
            />
            {f.ma_heslo && (
              <Button variant="ghost" velkost="sm" onClick={zmazHeslo}>
                {tr('Odstrániť heslo')}
              </Button>
            )}
          </div>
          <p className="cw-em-male">{tr('Heslo sa ukladá zašifrované a do prehliadača sa už nikdy nepošle.')}</p>
          {env && !f.smtp_host && (
            <p className="cw-em-male">
              {tr('Kým je server prázdny, používa sa SMTP zo súboru .env na serveri: {server}.', { server: `${env.host}:${env.port}` })}
            </p>
          )}
        </Card>

        <Card nadpis={tr('Odosielateľ')}>
          <div className="cw-em-riadok">
            <Input
              menovka={tr('Meno odosielateľa')}
              value={f.odosielatel_meno ?? ''}
              onChange={(e) => zmen({ odosielatel_meno: e.target.value })}
              placeholder={tr('Názov klubu')}
              napoveda={tr('Prázdne = názov klubu.')}
            />
            <Input
              menovka={tr('E-mail odosielateľa')}
              type="email"
              value={f.odosielatel_email ?? ''}
              onChange={(e) => zmen({ odosielatel_email: e.target.value })}
              placeholder={jeAdresa(prihlasenie) ? prihlasenie : ''}
              napoveda={tr('Prázdne = prihlasovacia schránka. Doména môže byť akákoľvek, adresa však musí patriť k schránke, do ktorej sa prihlasujete, alebo k doméne overenej v e-mailovej službe.')}
              chyba={
                ineAkoPrihlasenie
                  ? tr('Líši sa od prihlasovacej schránky {email}. Schránka na hostingu ani Gmail taký e-mail väčšinou neodošlú - ak to nie je alias tejto schránky, pole nechajte prázdne.', { email: prihlasenie })
                  : undefined
              }
            />
          </div>
          <Input
            menovka={tr('Odpovede posielať na')}
            type="email"
            value={f.odpovedat_na ?? ''}
            onChange={(e) => zmen({ odpovedat_na: e.target.value })}
            placeholder="info@domena.sk"
            napoveda={tr('Kam príde odpoveď, keď človek na e-mail odpovie. Prázdne = e-mail klubu z Nastavení.')}
          />
          <Textarea
            menovka={tr('Pätička e-mailov')}
            value={f.pata ?? ''}
            rows={3}
            onChange={(e) => zmen({ pata: e.target.value })}
            placeholder={tr('Napríklad: Ďakujeme, že podporujete {{klub}}!')}
            napoveda={tr('Zobrazí sa pod každým e-mailom nad kontaktmi klubu. Môžete použiť {{klub}} a {{web}}.')}
          />
          <Input
            menovka={tr('Hromadné e-maily: koľko za minútu')}
            type="number"
            min={1}
            max={1000}
            value={f.limit_za_minutu}
            onChange={(e) => zmen({ limit_za_minutu: e.target.value })}
            napoveda={tr('Poskytovatelia obmedzujú počet e-mailov. Schránka na hostingu zvládne približne 20-50 za minútu, služby ako Brevo viac.')}
          />
        </Card>
      </div>

      <Card nadpis={tr('Skúšobný e-mail')} podnadpis={tr('Overí spojenie so serverom a pošle krátku správu. Použijú sa údaje z formulára, aj keď ešte nie sú uložené.')} className="cw-em-test">
        <div className="cw-em-heslo">
          <Input menovka={tr('Poslať na')} type="email" value={prijemca} onChange={(e) => setPrijemca(e.target.value)} />
          <Button ikona={<Icon nazov="odoslat" velkost={16} />} onClick={otestuj} nacitava={testuje} disabled={!prijemca.includes('@')}>
            {tr('Poslať skúšobný e-mail')}
          </Button>
        </div>
        {vysledok && (
          <div className={`cw-em-pas ${vysledok.ok ? 'cw-em-pas--ok' : 'cw-em-pas--varovanie'}`} style={{ marginTop: 12, marginBottom: 0 }} role="status">
            <Icon nazov={vysledok.ok ? 'gdpr' : 'zvonik'} velkost={18} />
            <div>
              <strong>{vysledok.ok ? tr('Funguje') : tr('Nefunguje')}</strong>
              <span>{vysledok.text}</span>
            </div>
          </div>
        )}
      </Card>

      <Modal
        otvorene={navod}
        onZavri={() => setNavod(false)}
        nadpis={tr('Návod na nastavenie e-mailov')}
        sirka="lg"
        pata={
          <>
            <Button variant="secondary" ikona={<Icon nazov="stiahnut" velkost={16} />} onClick={stiahniNavod}>
              {tr('Stiahnuť návod')}
            </Button>
            <Button onClick={() => setNavod(false)}>{tr('Zavrieť')}</Button>
          </>
        }
      >
        <div className="cw-em-navod" dangerouslySetInnerHTML={{ __html: NAVOD_HTML }} />
      </Modal>
    </div>
  );
};

export default NastaveniaEmailov;
