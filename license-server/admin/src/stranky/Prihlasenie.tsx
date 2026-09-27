// Umiestnenie: license-server/admin/src/stranky/Prihlasenie.tsx
// Prihlásenie do administrácie (e-mail, heslo, prípadne kód z aplikácie).

import React, { useState } from 'react';
import { api, ChybaApi, type Administrator } from '../api';
import { Ikona, Pole, Tlacidlo } from '../komponenty';

const Prihlasenie: React.FC<{ onPrihlaseny: (a: Administrator) => void }> = ({ onPrihlaseny }) => {
  const [email, setEmail] = useState('');
  const [heslo, setHeslo] = useState('');
  const [kod, setKod] = useState('');
  const [vyzadujeKod, setVyzadujeKod] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [odosiela, setOdosiela] = useState(false);

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setOdosiela(true);
    setChyba(null);
    try {
      const r = await api.post<Administrator>('/prihlasenie', { email, heslo, kod: vyzadujeKod ? kod : undefined });
      onPrihlaseny(r.data);
    } catch (e) {
      if (e instanceof ChybaApi && e.telo?.vyzaduje_kod) {
        if (vyzadujeKod) setChyba(e.message);
        setVyzadujeKod(true);
      } else {
        setChyba((e as Error).message);
      }
    } finally {
      setOdosiela(false);
    }
  };

  return (
    <div className="prihlasenie">
      <form className="prihlasenie__karta" onSubmit={odosli} noValidate>
        <div className="prihlasenie__logo">
          <span className="bocny__znak" aria-hidden="true">
            <Ikona nazov="stit" velkost={22} />
          </span>
          <div>
            <h1>Licenčný server</h1>
            <p>ClubW · správa licencií a aktualizácií</p>
          </div>
        </div>
        {!vyzadujeKod ? (
          <>
            <Pole menovka="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            <Pole menovka="Heslo" type="password" autoComplete="current-password" value={heslo} onChange={(e) => setHeslo(e.target.value)} required />
          </>
        ) : (
          <Pole
            menovka="Kód z overovacej aplikácie"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={kod}
            onChange={(e) => setKod(e.target.value.replace(/\D/g, ''))}
            autoFocus
            napoveda="Šesťmiestny kód z aplikácie Google Authenticator, Microsoft Authenticator a podobne."
          />
        )}
        {chyba && (
          <p className="prihlasenie__chyba" role="alert">
            {chyba}
          </p>
        )}
        <Tlacidlo type="submit" variant="primarne" nacitava={odosiela} className="tlacidlo--plne">
          {vyzadujeKod ? 'Overiť kód' : 'Prihlásiť sa'}
        </Tlacidlo>
        {vyzadujeKod && (
          <button type="button" className="odkaz-tlacidlo" onClick={() => { setVyzadujeKod(false); setKod(''); setChyba(null); }}>
            Späť na e-mail a heslo
          </button>
        )}
      </form>
    </div>
  );
};

export default Prihlasenie;
