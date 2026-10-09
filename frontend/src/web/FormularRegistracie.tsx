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
import { useNastavenia, type NastaveniaRegistracie, type PoleRegistracie } from '../context/NastaveniaContext';

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
  /** Heslo do účtu Môj klub - registrovaný si hneď založí účet */
  heslo: string;
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

/** Predvolené nastavenia - kým sa načítajú nastavenia klubu, alebo pre starší server. */
export const PREDVOLENA_REGISTRACIA: NastaveniaRegistracie = {
  typy: { fanusik: true, clen: true },
  polia: {
    telefon: { rezim: 'volitelne', len_clen: false },
    datum_narodenia: { rezim: 'volitelne', len_clen: true },
    adresa: { rezim: 'volitelne', len_clen: true },
    sprava: { rezim: 'volitelne', len_clen: false },
  },
  texty: {
    nadpis: '', uvod: '', fanusik_nazov: '', fanusik_popis: '', clen_nazov: '', clen_popis: '',
    tlacidlo_fanusik: '', tlacidlo_clen: '', hotovo_fanusik: '', hotovo_clen: '', suhlas_oznamy: '', vyhody_nadpis: '',
  },
  vyhody: [],
};

/**
 * Nastavenia registrácie klubu (Fanúšikovia → Nastavenia registrácie).
 * Šablóna z nich berie nadpis, úvod a výhody na stránke /registracia.
 * Prázdny text = text šablóny.
 */
export const useRegistracia = (): NastaveniaRegistracie => {
  const { nastavenia } = useNastavenia();
  return nastavenia.registracia ?? PREDVOLENA_REGISTRACIA;
};

const PRAZDNE: UdajeRegistracie = { meno: '', priezvisko: '', email: '', telefon: '', typ: 'fanusik', datum_narodenia: '', adresa: '', sprava: '', suhlas_gdpr: false, suhlas_oznamy: false, heslo: '', web: '' };

/**
 * Hotový formulár registrácie (triedy .registracia…, šablóna ich štýluje).
 * Povolené typy, polia a texty určujú nastavenia registrácie klubu.
 * @param typ pevný typ (fanúšik / člen), bez neho si návštevník vyberie sám
 * @param odkazGdpr adresa stránky o ochrane osobných údajov
 */
export const FormularRegistracie: React.FC<{ typ?: TypRegistracie | 'vyber'; odkazGdpr?: string | null; className?: string }> = ({
  typ = 'vyber',
  odkazGdpr = null,
  className = '',
}) => {
  const reg = useRegistracia();
  const t = reg.texty;
  // Povolené typy - pevný typ, ktorý klub vypol, nahradí povolený
  const povolene = (['fanusik', 'clen'] as const).filter((x) => reg.typy[x]);
  const pevny: TypRegistracie | null = typ !== 'vyber' && reg.typy[typ] ? typ : povolene.length === 1 ? povolene[0] : null;
  const [udaje, setUdaje] = useState<UdajeRegistracie>({ ...PRAZDNE, typ: pevny ?? (typ === 'clen' && reg.typy.clen ? 'clen' : povolene[0] ?? 'fanusik') });
  const [odosiela, setOdosiela] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hesloZnova, setHesloZnova] = useState('');
  const zmen = (zmena: Partial<UdajeRegistracie>) => setUdaje((u) => ({ ...u, ...zmena }));
  const aktualnyTyp: TypRegistracie = pevny ?? (reg.typy[udaje.typ] ? udaje.typ : povolene[0] ?? 'fanusik');
  const clen = aktualnyTyp === 'clen';

  /** Pole sa ukáže, ak nie je vypnuté a hodí sa k typu registrácie. */
  const aktivne = (pole: PoleRegistracie) => reg.polia[pole].rezim !== 'vypnute' && (!reg.polia[pole].len_clen || clen);
  const povinne = (pole: PoleRegistracie) => aktivne(pole) && reg.polia[pole].rezim === 'povinne';
  const menovka = (pole: PoleRegistracie, text: string) => `${text}${povinne(pole) ? ' *' : ''}`;

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setChyba(null);
    if (!udaje.suhlas_gdpr) {
      setChyba('Na registráciu je potrebný súhlas so spracovaním osobných údajov.');
      return;
    }
    if (!udaje.heslo) {
      setChyba('Zadajte heslo do účtu Môj klub.');
      return;
    }
    if (udaje.heslo !== hesloZnova) {
      setChyba('Heslá sa nezhodujú.');
      return;
    }
    setOdosiela(true);
    try {
      setHotovo(
        await registrujFanusika({
          ...udaje,
          typ: aktualnyTyp,
          telefon: aktivne('telefon') ? udaje.telefon : undefined,
          datum_narodenia: aktivne('datum_narodenia') ? udaje.datum_narodenia || undefined : undefined,
          adresa: aktivne('adresa') ? udaje.adresa : undefined,
          sprava: aktivne('sprava') ? udaje.sprava : undefined,
        })
      );
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
        <p>
          Do svojho účtu sa môžete prihlásiť na stránke <Link to="/moj-klub">Môj klub</Link>. Členskú kartu a výhody uvidíte po schválení klubom.
        </p>
      </div>
    );
  }

  return (
    <form className={`registracia ${className}`} onSubmit={odosli} noValidate>
      {!pevny && (
        <div className="registracia__typy" role="radiogroup" aria-label="Chcem sa registrovať ako">
          {([
            ['fanusik', t.fanusik_nazov || 'Fanúšik', t.fanusik_popis || 'Novinky, pozvánky a výhody pre fanúšikov'],
            ['clen', t.clen_nazov || 'Člen klubu', t.clen_popis || 'Členstvo s preukazom a hlasovacím právom'],
          ] as const).map(([hodnota, nazov, popis]) => (
            <label key={hodnota} className={`registracia__typ${aktualnyTyp === hodnota ? ' is-zvoleny' : ''}`}>
              <input type="radio" name="typ" value={hodnota} checked={aktualnyTyp === hodnota} onChange={() => zmen({ typ: hodnota })} />
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
        {aktivne('telefon') && (
          <label className="registracia__pole">
            <span>{menovka('telefon', 'Telefón')}</span>
            <input type="tel" autoComplete="tel" required={povinne('telefon')} value={udaje.telefon} onChange={(e) => zmen({ telefon: e.target.value })} maxLength={40} />
          </label>
        )}
      </div>
      {(aktivne('datum_narodenia') || aktivne('adresa')) && (
        <div className="registracia__riadok">
          {aktivne('datum_narodenia') && (
            <label className="registracia__pole">
              <span>{menovka('datum_narodenia', 'Dátum narodenia')}</span>
              <input type="date" required={povinne('datum_narodenia')} value={udaje.datum_narodenia} onChange={(e) => zmen({ datum_narodenia: e.target.value })} />
            </label>
          )}
          {aktivne('adresa') && (
            <label className="registracia__pole">
              <span>{menovka('adresa', 'Adresa')}</span>
              <input autoComplete="street-address" required={povinne('adresa')} value={udaje.adresa} onChange={(e) => zmen({ adresa: e.target.value })} maxLength={255} />
            </label>
          )}
        </div>
      )}
      <div className="registracia__riadok">
        <label className="registracia__pole">
          <span>Heslo do účtu Môj klub *</span>
          <input type="password" required autoComplete="new-password" value={udaje.heslo} onChange={(e) => zmen({ heslo: e.target.value })} maxLength={72} />
        </label>
        <label className="registracia__pole">
          <span>Heslo znova *</span>
          <input type="password" required autoComplete="new-password" value={hesloZnova} onChange={(e) => setHesloZnova(e.target.value)} maxLength={72} />
        </label>
      </div>
      <p className="registracia__napoveda">S heslom sa prihlásite na stránke Môj klub, po schválení tam nájdete členskú kartu a výhody. Aspoň 12 znakov, najlepšie niekoľko slov.</p>
      {aktivne('sprava') && (
        <label className="registracia__pole">
          <span>{menovka('sprava', 'Správa pre klub')}</span>
          <textarea rows={3} required={povinne('sprava')} value={udaje.sprava} onChange={(e) => zmen({ sprava: e.target.value })} maxLength={2000} />
        </label>
      )}
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
        <span>{t.suhlas_oznamy || 'Chcem dostávať klubové novinky a pozvánky e-mailom'}</span>
      </label>
      {chyba && (
        <p className="registracia__chyba" role="alert">
          {chyba}
        </p>
      )}
      <button type="submit" className="registracia__tlacidlo" disabled={odosiela}>
        {odosiela ? 'Odosielam…' : clen ? t.tlacidlo_clen || 'Odoslať žiadosť o členstvo' : t.tlacidlo_fanusik || 'Registrovať sa'}
      </button>
    </form>
  );
};

export default FormularRegistracie;
