// Umiestnenie: frontend/src/web/MojKlub.tsx
// Stránka Môj klub pre fanúšikov a členov: prihlásenie, členská karta
// s QR kódom, výhody členov, vlastné údaje, heslo a zrušenie účtu.
//
// Šablóna ju vloží do svojej stránky (s vlastnou hlavičkou):
//   <MojKlubObsah />            /moj-klub aj /moj-klub/heslo?token=…
//   <OverenieKartyObsah />      /overenie/:kod (usporiadateľ pri vstupe)
//   <OdkazUctu className="…" /> ikona účtu do hlavičky
// Vzhľad určujú triedy .mk-… (MojKlub.css) a farba klubu --club-primary.

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { souborUrl } from '../config/api';
import { useNastavenia } from '../context/NastaveniaContext';
import {
  NAZVY_CLENSTVA,
  aktualizujProfil,
  apiFanusika,
  odhlasFanusika,
  prevezmiPrihlasenie,
  prihlasFanusika,
  useFanusik,
  type OverenieKarty,
  type ProfilFanusika,
  type VyhodaClena,
} from './fanusik';
import './MojKlub.css';

const datum = (d: string | null | undefined) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('sk-SK') : '');

const IkonaOsoby: React.FC<{ velkost?: number }> = ({ velkost = 20 }) => (
  <svg width={velkost} height={velkost} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);

/** Ikona účtu do hlavičky šablóny - prihlásenému ukáže iniciály. */
export const OdkazUctu: React.FC<{ className?: string; velkost?: number; onClick?: () => void }> = ({ className = '', velkost = 20, onClick }) => {
  const { fanusik } = useFanusik();
  const popis = fanusik ? `Môj klub - ${fanusik.meno} ${fanusik.priezvisko}` : 'Môj klub - prihlásenie';
  return (
    <Link to="/moj-klub" className={`mk-odkaz-uctu ${className}`} aria-label={popis} title={popis} onClick={onClick}>
      {fanusik ? (
        <span className="mk-odkaz-uctu__inicialy" aria-hidden="true">
          {fanusik.meno.charAt(0)}
          {fanusik.priezvisko.charAt(0)}
        </span>
      ) : (
        <IkonaOsoby velkost={velkost} />
      )}
    </Link>
  );
};

// ===== QR kód =====

const QrKod: React.FC<{ text: string; velkost?: number }> = ({ text, velkost = 168 }) => {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let zruseny = false;
    // Knižnica sa načíta až tu - zvyšok webu ju nepotrebuje
    import('qrcode')
      .then((qr) => qr.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } }))
      .then((s) => !zruseny && setSvg(s))
      .catch(() => undefined);
    return () => {
      zruseny = true;
    };
  }, [text]);
  return (
    <div className="mk-qr" style={{ width: velkost, height: velkost }} role="img" aria-label="QR kód členskej karty">
      {svg && <span dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  );
};

// ===== Členská karta =====

export const KartaClena: React.FC<{ fanusik: ProfilFanusika }> = ({ fanusik: f }) => {
  const { nastavenia } = useNastavenia();
  const adresaOverenia = f.overovaci_kod ? `${window.location.origin}/overenie/${f.overovaci_kod}` : null;
  return (
    <div className={`mk-karta${f.platne ? '' : ' is-neplatna'}`}>
      <div className="mk-karta__predok">
        <div className="mk-karta__hlava">
          {nastavenia.logo ? <img src={souborUrl(nastavenia.logo)} alt="" className="mk-karta__logo" /> : <span className="mk-karta__logo mk-karta__logo--znak">{nastavenia.nazov.charAt(0)}</span>}
          <div>
            <span className="mk-karta__klub">{nastavenia.nazov}</span>
            <span className="mk-karta__typ">{NAZVY_CLENSTVA[f.typ_clenstva] ?? f.typ_clenstva}</span>
          </div>
        </div>
        <div className="mk-karta__meno">
          {f.meno} {f.priezvisko}
        </div>
        <dl className="mk-karta__udaje">
          <div>
            <dt>Číslo karty</dt>
            <dd>{f.cislo_karty || '—'}</dd>
          </div>
          <div>
            <dt>Platnosť</dt>
            <dd>{f.clenstvo_do ? `do ${datum(f.clenstvo_do)}` : f.platne ? 'bez obmedzenia' : '—'}</dd>
          </div>
        </dl>
      </div>
      <div className="mk-karta__qr">
        {adresaOverenia ? (
          <>
            <QrKod text={adresaOverenia} />
            <span>Ukážte pri vstupe</span>
          </>
        ) : (
          <span className="mk-karta__bez-qr">{f.stav === 'ziadost' ? 'Karta bude aktívna po schválení' : 'Karta nie je platná'}</span>
        )}
      </div>
    </div>
  );
};

// ===== Výhody =====

const KodVyhody: React.FC<{ kod: string }> = ({ kod }) => {
  const [skopirovane, setSkopirovane] = useState(false);
  const kopiruj = async () => {
    try {
      await navigator.clipboard.writeText(kod);
      setSkopirovane(true);
      setTimeout(() => setSkopirovane(false), 2000);
    } catch {
      /* schránka nie je dostupná - kód je aj tak viditeľný */
    }
  };
  return (
    <button type="button" className="mk-kod" onClick={kopiruj} title="Skopírovať kód">
      <code>{kod}</code>
      <span>{skopirovane ? 'Skopírované' : 'Kopírovať'}</span>
    </button>
  );
};

export const VyhodyClena: React.FC<{ fanusik: ProfilFanusika }> = ({ fanusik }) => {
  const [vyhody, setVyhody] = useState<VyhodaClena[] | null>(null);
  useEffect(() => {
    apiFanusika<VyhodaClena[]>('/vyhody')
      .then((o) => setVyhody(o.data))
      .catch(() => setVyhody([]));
  }, [fanusik.id, fanusik.platne, fanusik.typ_clenstva]);

  if (!fanusik.platne) {
    return (
      <p className="mk-prazdne">
        {fanusik.stav === 'ziadost'
          ? 'Výhody pre členov uvidíte hneď, ako klub schváli vašu registráciu.'
          : 'Výhody sú dostupné s platným členstvom. Pre predĺženie kontaktujte klub.'}
      </p>
    );
  }
  if (vyhody === null) return <p className="mk-prazdne">Načítavam výhody…</p>;
  if (!vyhody.length) return <p className="mk-prazdne">Klub zatiaľ nepripravil žiadne výhody. Sledujte túto stránku.</p>;

  return (
    <div className="mk-vyhody">
      {vyhody.map((v) => {
        const obrazok = v.obrazok || v.partner?.logo || null;
        const odkaz = v.odkaz || v.partner?.web || null;
        return (
          <article key={v.id} className="mk-vyhoda">
            <div className={`mk-vyhoda__obrazok${v.obrazok ? '' : ' mk-vyhoda__obrazok--logo'}`}>
              {obrazok ? <img src={souborUrl(obrazok)} alt="" loading="lazy" /> : <span aria-hidden="true">★</span>}
            </div>
            <div className="mk-vyhoda__telo">
              {v.partner && <span className="mk-vyhoda__partner">{v.partner.nazov}</span>}
              <h3>{v.nazov}</h3>
              {v.popis && <p>{v.popis}</p>}
              <div className="mk-vyhoda__akcie">
                {v.kod && <KodVyhody kod={v.kod} />}
                {odkaz && (
                  <a href={odkaz} target={odkaz.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="mk-tlacidlo mk-tlacidlo--obrys">
                    Viac
                  </a>
                )}
              </div>
              {v.platne_do && <small className="mk-vyhoda__platnost">Platí do {datum(v.platne_do)}</small>}
            </div>
          </article>
        );
      })}
    </div>
  );
};

// ===== Formuláre =====

const Sprava: React.FC<{ chyba?: string | null; ok?: string | null }> = ({ chyba, ok }) =>
  chyba ? (
    <p className="mk-sprava mk-sprava--chyba" role="alert">
      {chyba}
    </p>
  ) : ok ? (
    <p className="mk-sprava mk-sprava--ok" role="status">
      {ok}
    </p>
  ) : null;

const Prihlasenie: React.FC = () => {
  const [email, setEmail] = useState('');
  const [heslo, setHeslo] = useState('');
  const [zabudnute, setZabudnute] = useState(false);
  const [odosiela, setOdosiela] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setChyba(null);
    setOk(null);
    setOdosiela(true);
    try {
      if (zabudnute) {
        const o = await apiFanusika('/heslo/vyziadat', 'POST', { email });
        setOk(o.message ?? 'Odkaz sme poslali na váš e-mail.');
      } else {
        await prihlasFanusika(email, heslo);
      }
    } catch (err) {
      setChyba((err as Error).message);
    } finally {
      setOdosiela(false);
    }
  };

  return (
    <div className="mk-prihlasenie">
      <form className="mk-panel mk-formular" onSubmit={odosli}>
        <h2>{zabudnute ? 'Nové heslo' : 'Prihlásenie'}</h2>
        <p className="mk-popis">
          {zabudnute
            ? 'Zadajte e-mail, ktorý ste uviedli pri registrácii. Pošleme vám odkaz na nastavenie hesla.'
            : 'Prihláste sa a nájdete tu svoju členskú kartu a výhody pre členov klubu.'}
        </p>
        <label className="mk-pole">
          <span>E-mail</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {!zabudnute && (
          <label className="mk-pole">
            <span>Heslo</span>
            <input type="password" required autoComplete="current-password" value={heslo} onChange={(e) => setHeslo(e.target.value)} />
          </label>
        )}
        <Sprava chyba={chyba} ok={ok} />
        <button type="submit" className="mk-tlacidlo" disabled={odosiela}>
          {odosiela ? 'Moment…' : zabudnute ? 'Poslať odkaz' : 'Prihlásiť sa'}
        </button>
        <button type="button" className="mk-odkaz" onClick={() => (setZabudnute(!zabudnute), setChyba(null), setOk(null))}>
          {zabudnute ? 'Späť na prihlásenie' : 'Zabudli ste heslo alebo ho ešte nemáte?'}
        </button>
      </form>
      <aside className="mk-panel mk-pozvanka">
        <h2>Ešte nemáte účet?</h2>
        <p>Zaregistrujte sa ako fanúšik alebo člen klubu. Po schválení dostanete digitálnu členskú kartu a prístup k výhodám pre členov.</p>
        <ul className="mk-zoznam">
          <li>Členská karta v mobile s QR kódom</li>
          <li>Zľavy a ponuky od partnerov klubu</li>
          <li>Novinky a pozvánky ako prví</li>
        </ul>
        <Link to="/registracia" className="mk-tlacidlo mk-tlacidlo--obrys">
          Registrovať sa
        </Link>
      </aside>
    </div>
  );
};

const MojeUdaje: React.FC<{ fanusik: ProfilFanusika }> = ({ fanusik }) => {
  const [udaje, setUdaje] = useState({ telefon: fanusik.telefon ?? '', adresa: fanusik.adresa ?? '', suhlas_oznamy: fanusik.suhlas_oznamy });
  const [uklada, setUklada] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    setUklada(true);
    setChyba(null);
    setOk(null);
    try {
      const o = await apiFanusika<ProfilFanusika>('/ja', 'PUT', udaje);
      aktualizujProfil(o.data);
      setOk('Údaje boli uložené.');
    } catch (err) {
      setChyba((err as Error).message);
    } finally {
      setUklada(false);
    }
  };
  return (
    <form className="mk-panel mk-formular" onSubmit={uloz}>
      <h2>Moje údaje</h2>
      <div className="mk-riadok">
        <label className="mk-pole">
          <span>Meno</span>
          <input value={`${fanusik.meno} ${fanusik.priezvisko}`} disabled />
        </label>
        <label className="mk-pole">
          <span>E-mail</span>
          <input value={fanusik.email} disabled />
        </label>
      </div>
      <p className="mk-popis mk-popis--male">Meno a e-mail zmení klub - napíšte mu.</p>
      <div className="mk-riadok">
        <label className="mk-pole">
          <span>Telefón</span>
          <input type="tel" autoComplete="tel" maxLength={40} value={udaje.telefon} onChange={(e) => setUdaje({ ...udaje, telefon: e.target.value })} />
        </label>
        <label className="mk-pole">
          <span>Adresa</span>
          <input autoComplete="street-address" maxLength={255} value={udaje.adresa} onChange={(e) => setUdaje({ ...udaje, adresa: e.target.value })} />
        </label>
      </div>
      <label className="mk-suhlas">
        <input type="checkbox" checked={udaje.suhlas_oznamy} onChange={(e) => setUdaje({ ...udaje, suhlas_oznamy: e.target.checked })} />
        <span>Chcem dostávať klubové novinky a pozvánky e-mailom</span>
      </label>
      <Sprava chyba={chyba} ok={ok} />
      <button type="submit" className="mk-tlacidlo" disabled={uklada}>
        {uklada ? 'Ukladám…' : 'Uložiť'}
      </button>
    </form>
  );
};

const HesloAUcet: React.FC<{ fanusik: ProfilFanusika }> = ({ fanusik }) => {
  const navigate = useNavigate();
  const [stare, setStare] = useState('');
  const [nove, setNove] = useState('');
  const [zrusit, setZrusit] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [chybaZrusenia, setChybaZrusenia] = useState<string | null>(null);
  const zmenHeslo = async (e: React.FormEvent) => {
    e.preventDefault();
    setChyba(null);
    setOk(null);
    try {
      const o = await apiFanusika<{ token: string }>('/ja/heslo', 'PUT', { stare_heslo: stare, nove_heslo: nove });
      prevezmiPrihlasenie(o.data.token, fanusik);
      setStare('');
      setNove('');
      setOk('Heslo bolo zmenené. Na ostatných zariadeniach sa prihláste znova.');
    } catch (err) {
      setChyba((err as Error).message);
    }
  };
  const zrusUcet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Naozaj zrušiť účet? Vaše údaje a členská karta budú zmazané natrvalo.')) return;
    setChybaZrusenia(null);
    try {
      await apiFanusika('/ja', 'DELETE', { heslo: zrusit });
      odhlasFanusika();
      navigate('/');
    } catch (err) {
      setChybaZrusenia((err as Error).message);
    }
  };
  return (
    <div className="mk-stlpce">
      <form className="mk-panel mk-formular" onSubmit={zmenHeslo}>
        <h2>Zmena hesla</h2>
        <label className="mk-pole">
          <span>Súčasné heslo</span>
          <input type="password" required autoComplete="current-password" value={stare} onChange={(e) => setStare(e.target.value)} />
        </label>
        <label className="mk-pole">
          <span>Nové heslo</span>
          <input type="password" required autoComplete="new-password" minLength={12} value={nove} onChange={(e) => setNove(e.target.value)} />
          <small>Aspoň 12 znakov, najlepšie niekoľko slov.</small>
        </label>
        <Sprava chyba={chyba} ok={ok} />
        <button type="submit" className="mk-tlacidlo">
          Zmeniť heslo
        </button>
      </form>
      <form className="mk-panel mk-formular mk-panel--nebezpecne" onSubmit={zrusUcet}>
        <h2>Zrušenie účtu</h2>
        <p className="mk-popis">Zmažeme vaše údaje aj členskú kartu. Tento krok sa nedá vrátiť.</p>
        <label className="mk-pole">
          <span>Heslo na potvrdenie</span>
          <input type="password" required autoComplete="current-password" value={zrusit} onChange={(e) => setZrusit(e.target.value)} />
        </label>
        <Sprava chyba={chybaZrusenia} />
        <button type="submit" className="mk-tlacidlo mk-tlacidlo--nebezpecne">
          Zrušiť účet
        </button>
      </form>
    </div>
  );
};

// ===== Nastavenie hesla z odkazu =====

const NastavenieHesla: React.FC = () => {
  const [parametre] = useSearchParams();
  const navigate = useNavigate();
  const token = parametre.get('token') || '';
  const [heslo, setHeslo] = useState('');
  const [znova, setZnova] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);
  const [odosiela, setOdosiela] = useState(false);
  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (heslo !== znova) {
      setChyba('Heslá sa nezhodujú.');
      return;
    }
    setOdosiela(true);
    setChyba(null);
    try {
      const o = await apiFanusika<{ token: string; fanusik: ProfilFanusika }>('/heslo/nastavit', 'POST', { token, heslo });
      prevezmiPrihlasenie(o.data.token, o.data.fanusik);
      navigate('/moj-klub', { replace: true });
    } catch (err) {
      setChyba((err as Error).message);
    } finally {
      setOdosiela(false);
    }
  };
  return (
    <div className="mk-prihlasenie mk-prihlasenie--sama">
      <form className="mk-panel mk-formular" onSubmit={odosli}>
        <h2>Nastavenie hesla</h2>
        {!token ? (
          <p className="mk-sprava mk-sprava--chyba">Odkaz nie je úplný. Otvorte ho znova z e-mailu.</p>
        ) : (
          <>
            <p className="mk-popis">Zvoľte si heslo k svojmu účtu. Najbezpečnejšie je niekoľko slov, napríklad „zelená lavička pri štadióne“.</p>
            <label className="mk-pole">
              <span>Nové heslo</span>
              <input type="password" required autoComplete="new-password" minLength={12} value={heslo} onChange={(e) => setHeslo(e.target.value)} />
            </label>
            <label className="mk-pole">
              <span>Heslo znova</span>
              <input type="password" required autoComplete="new-password" value={znova} onChange={(e) => setZnova(e.target.value)} />
            </label>
            <Sprava chyba={chyba} />
            <button type="submit" className="mk-tlacidlo" disabled={odosiela}>
              {odosiela ? 'Ukladám…' : 'Nastaviť heslo a prihlásiť sa'}
            </button>
          </>
        )}
      </form>
    </div>
  );
};

// ===== Hlavný obsah stránky =====

const ZALOZKY = [
  ['prehlad', 'Karta a výhody'],
  ['udaje', 'Moje údaje'],
  ['ucet', 'Heslo a účet'],
] as const;

/** Obsah stránky Môj klub (bez hlavičky šablóny). */
export const MojKlubObsah: React.FC = () => {
  const { pathname } = useLocation();
  const { fanusik, prihlaseny, nacitava, odhlas } = useFanusik();
  const [zalozka, setZalozka] = useState<(typeof ZALOZKY)[number][0]>('prehlad');

  if (pathname.startsWith('/moj-klub/heslo')) return <NastavenieHesla />;
  if (!prihlaseny) return <Prihlasenie />;
  if (nacitava || !fanusik) return <p className="mk-prazdne">Načítavam účet…</p>;

  return (
    <div className="mk">
      {fanusik.stav === 'ziadost' && (
        <p className="mk-oznam">Vaša registrácia čaká na schválenie klubom. Potom sa vám tu objaví členská karta a výhody.</p>
      )}
      {fanusik.stav === 'aktivny' && !fanusik.platne && (
        <p className="mk-oznam mk-oznam--varovanie">Platnosť vášho členstva skončila{fanusik.clenstvo_do ? ` ${datum(fanusik.clenstvo_do)}` : ''}. Pre predĺženie kontaktujte klub.</p>
      )}

      <div className="mk-lista">
        <div className="mk-zalozky" role="tablist">
          {ZALOZKY.map(([kluc, nazov]) => (
            <button key={kluc} type="button" role="tab" aria-selected={zalozka === kluc} className={zalozka === kluc ? 'is-aktivna' : undefined} onClick={() => setZalozka(kluc)}>
              {nazov}
            </button>
          ))}
        </div>
        <div className="mk-lista__ucet">
          <span className="mk-lista__email" title={fanusik.email}>
            {fanusik.meno} {fanusik.priezvisko} · {fanusik.email}
          </span>
          <button type="button" className="mk-tlacidlo mk-tlacidlo--obrys mk-tlacidlo--male" onClick={odhlas}>
            Odhlásiť sa
          </button>
        </div>
      </div>

      {zalozka === 'prehlad' && (
        <>
          <section className="mk-sekcia">
            <h2 className="mk-nadpis">Členská karta</h2>
            <KartaClena fanusik={fanusik} />
          </section>
          <section className="mk-sekcia">
            <h2 className="mk-nadpis">Výhody pre vás</h2>
            <VyhodyClena fanusik={fanusik} />
          </section>
        </>
      )}
      {zalozka === 'udaje' && <MojeUdaje fanusik={fanusik} />}
      {zalozka === 'ucet' && <HesloAUcet fanusik={fanusik} />}
    </div>
  );
};

// ===== Overenie karty (QR kód) =====

/** Výsledok overenia členskej karty z QR kódu - pre usporiadateľa pri vstupe. */
export const OverenieKartyObsah: React.FC = () => {
  const { kod = '' } = useParams();
  const [vysledok, setVysledok] = useState<OverenieKarty | null | 'chyba'>(null);
  useEffect(() => {
    apiFanusika<OverenieKarty>(`/overenie/${encodeURIComponent(kod)}`)
      .then((o) => setVysledok(o.data))
      .catch(() => setVysledok('chyba'));
  }, [kod]);
  if (vysledok === null) return <p className="mk-prazdne">Overujem kartu…</p>;
  const platne = vysledok !== 'chyba' && vysledok.platne;
  return (
    <div className={`mk-overenie${platne ? ' is-platna' : ' is-neplatna'}`} role="status">
      <span className="mk-overenie__znak" aria-hidden="true">
        {platne ? '✓' : '✕'}
      </span>
      <strong>{platne ? 'Platná karta' : vysledok === 'chyba' ? 'Karta neexistuje' : 'Karta nie je platná'}</strong>
      {vysledok !== 'chyba' && (
        <dl>
          <div>
            <dt>Meno</dt>
            <dd>{vysledok.meno}</dd>
          </div>
          <div>
            <dt>Členstvo</dt>
            <dd>{NAZVY_CLENSTVA[vysledok.typ_clenstva] ?? vysledok.typ_clenstva}</dd>
          </div>
          <div>
            <dt>Číslo karty</dt>
            <dd>{vysledok.cislo_karty || '—'}</dd>
          </div>
          <div>
            <dt>Platnosť</dt>
            <dd>{vysledok.clenstvo_do ? `do ${datum(vysledok.clenstvo_do)}` : 'bez obmedzenia'}</dd>
          </div>
        </dl>
      )}
    </div>
  );
};
