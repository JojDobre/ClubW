// Umiestnenie: frontend/src/web/FormularRegistracie.tsx
// Registrácia fanúšika alebo člena klubu na webe (stránka /registracia
// aj blok stránky „Registrácia"). Žiadosť čaká na schválenie v
// administrácii (Fanúšikovia → Nové žiadosti).
//
// Šablóna ho môže použiť celý (<FormularRegistracie />), alebo si nakresliť
// vlastný formulár a odoslať ho cez registrujFanusika().

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../config/api';

export type TypRegistracie = 'fanusik' | 'clen';

export interface UdajeRegistracie {
  meno: string;
  priezvisko: string;
  email: string;
  telefon?: string;
  typ: TypRegistracie;
  datum_narodenia?: string;
  adresa?: string;
  sprava?: string;
  suhlas_gdpr: boolean;
  suhlas_oznamy?: boolean;
  /** Voliteľné heslo - registrovaný si hneď založí účet (Môj klub) */
  heslo?: string;
  /** Skryté pole proti robotom - musí zostať prázdne */
  web?: string;
}

/** Odošle registráciu. Vráti správu pre návštevníka, pri chybe vyhodí Error. */
export const registrujFanusika = async (udaje: UdajeRegistracie): Promise<string> => {
  const odpoved = await fetch(apiUrl('/fans/registracia'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(udaje),
  });
  const telo = await odpoved.json().catch(() => null);
  if (!odpoved.ok || !telo?.success) throw new Error(telo?.message || 'Registráciu sa nepodarilo odoslať.');
  return telo.message as string;
};

const PRAZDNE: UdajeRegistracie = { meno: '', priezvisko: '', email: '', telefon: '', typ: 'fanusik', datum_narodenia: '', adresa: '', sprava: '', suhlas_gdpr: false, suhlas_oznamy: false, heslo: '', web: '' };

/**
 * Hotový formulár registrácie (triedy .registracia…, šablóna ich štýluje).
 * @param typ pevný typ (fanúšik / člen), bez neho si návštevník vyberie sám
 * @param odkazGdpr adresa stránky o ochrane osobných údajov
 */
export const FormularRegistracie: React.FC<{ typ?: TypRegistracie | 'vyber'; odkazGdpr?: string | null; className?: string }> = ({
  typ = 'vyber',
  odkazGdpr = null,
  className = '',
}) => {
  const [udaje, setUdaje] = useState<UdajeRegistracie>({ ...PRAZDNE, typ: typ === 'clen' ? 'clen' : 'fanusik' });
  const [odosiela, setOdosiela] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hesloZnova, setHesloZnova] = useState('');
  const zmen = (zmena: Partial<UdajeRegistracie>) => setUdaje((u) => ({ ...u, ...zmena }));
  const clen = udaje.typ === 'clen';

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setChyba(null);
    if (!udaje.suhlas_gdpr) {
      setChyba('Na registráciu je potrebný súhlas so spracovaním osobných údajov.');
      return;
    }
    if (udaje.heslo && udaje.heslo !== hesloZnova) {
      setChyba('Heslá sa nezhodujú.');
      return;
    }
    setOdosiela(true);
    try {
      setHotovo(await registrujFanusika({ ...udaje, datum_narodenia: udaje.datum_narodenia || undefined, heslo: udaje.heslo || undefined }));
    } catch (err) {
      setChyba((err as Error).message);
    } finally {
      setOdosiela(false);
    }
  };

  if (hotovo) {
    return (
      <div className={`registracia registracia--hotovo ${className}`} role="status">
        <strong>{hotovo}</strong>
        <p>Potvrdenie a ďalšie informácie vám pošleme na {udaje.email}.</p>
        {udaje.heslo && (
          <p>
            Do svojho účtu sa môžete prihlásiť na stránke <Link to="/moj-klub">Môj klub</Link>. Členskú kartu a výhody uvidíte po schválení klubom.
          </p>
        )}
      </div>
    );
  }

  return (
    <form className={`registracia ${className}`} onSubmit={odosli} noValidate>
      {typ === 'vyber' && (
        <div className="registracia__typy" role="radiogroup" aria-label="Chcem sa registrovať ako">
          {([
            ['fanusik', 'Fanúšik', 'Novinky, pozvánky a výhody pre fanúšikov'],
            ['clen', 'Člen klubu', 'Členstvo s preukazom a hlasovacím právom'],
          ] as const).map(([hodnota, nazov, popis]) => (
            <label key={hodnota} className={`registracia__typ${udaje.typ === hodnota ? ' is-zvoleny' : ''}`}>
              <input type="radio" name="typ" value={hodnota} checked={udaje.typ === hodnota} onChange={() => zmen({ typ: hodnota })} />
              <strong>{nazov}</strong>
              <small>{popis}</small>
            </label>
          ))}
        </div>
      )}
      <div className="registracia__riadok">
        <label className="registracia__pole">
          <span>Meno *</span>
          <input required autoComplete="given-name" value={udaje.meno} onChange={(e) => zmen({ meno: e.target.value })} maxLength={80} />
        </label>
        <label className="registracia__pole">
          <span>Priezvisko *</span>
          <input required autoComplete="family-name" value={udaje.priezvisko} onChange={(e) => zmen({ priezvisko: e.target.value })} maxLength={80} />
        </label>
      </div>
      <div className="registracia__riadok">
        <label className="registracia__pole">
          <span>E-mail *</span>
          <input required type="email" autoComplete="email" value={udaje.email} onChange={(e) => zmen({ email: e.target.value })} maxLength={150} />
        </label>
        <label className="registracia__pole">
          <span>Telefón</span>
          <input type="tel" autoComplete="tel" value={udaje.telefon} onChange={(e) => zmen({ telefon: e.target.value })} maxLength={40} />
        </label>
      </div>
      {clen && (
        <div className="registracia__riadok">
          <label className="registracia__pole">
            <span>Dátum narodenia</span>
            <input type="date" value={udaje.datum_narodenia} onChange={(e) => zmen({ datum_narodenia: e.target.value })} />
          </label>
          <label className="registracia__pole">
            <span>Adresa</span>
            <input autoComplete="street-address" value={udaje.adresa} onChange={(e) => zmen({ adresa: e.target.value })} maxLength={255} />
          </label>
        </div>
      )}
      <div className="registracia__riadok">
        <label className="registracia__pole">
          <span>Heslo do účtu Môj klub (nepovinné)</span>
          <input type="password" autoComplete="new-password" value={udaje.heslo} onChange={(e) => zmen({ heslo: e.target.value })} maxLength={72} />
        </label>
        {udaje.heslo ? (
          <label className="registracia__pole">
            <span>Heslo znova</span>
            <input type="password" autoComplete="new-password" value={hesloZnova} onChange={(e) => setHesloZnova(e.target.value)} maxLength={72} />
          </label>
        ) : (
          <p className="registracia__napoveda">S heslom sa hneď prihlásite a po schválení tam nájdete členskú kartu a výhody. Aspoň 12 znakov, najlepšie niekoľko slov.</p>
        )}
      </div>
      <label className="registracia__pole">
        <span>Správa pre klub</span>
        <textarea rows={3} value={udaje.sprava} onChange={(e) => zmen({ sprava: e.target.value })} maxLength={2000} />
      </label>
      {/* Skryté pole - vyplní ho len robot */}
      <input className="registracia__skryte" tabIndex={-1} autoComplete="off" aria-hidden="true" value={udaje.web} onChange={(e) => zmen({ web: e.target.value })} name="web" />
      <label className="registracia__suhlas">
        <input type="checkbox" checked={udaje.suhlas_gdpr} onChange={(e) => zmen({ suhlas_gdpr: e.target.checked })} />
        <span>
          Súhlasím so spracovaním osobných údajov na účely evidencie {clen ? 'členov' : 'fanúšikov'} klubu *
          {odkazGdpr && (
            <>
              {' '}
              (<a href={odkazGdpr} target="_blank" rel="noopener noreferrer">viac informácií</a>)
            </>
          )}
        </span>
      </label>
      <label className="registracia__suhlas">
        <input type="checkbox" checked={Boolean(udaje.suhlas_oznamy)} onChange={(e) => zmen({ suhlas_oznamy: e.target.checked })} />
        <span>Chcem dostávať klubové novinky a pozvánky e-mailom</span>
      </label>
      {chyba && (
        <p className="registracia__chyba" role="alert">
          {chyba}
        </p>
      )}
      <button type="submit" className="registracia__tlacidlo" disabled={odosiela}>
        {odosiela ? 'Odosielam…' : clen ? 'Odoslať žiadosť o členstvo' : 'Registrovať sa'}
      </button>
    </form>
  );
};

export default FormularRegistracie;
