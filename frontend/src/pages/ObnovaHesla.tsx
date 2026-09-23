// Umiestnenie: frontend/src/pages/ObnovaHesla.tsx
// Zabudnuté heslo (/zabudnute-heslo) a nastavenie nového hesla
// z odkazu v e-maile (/obnova-hesla?token=...).
//
// Obe adresy boli v prihlásení aj v e-maile, ale stránky chýbali -
// obnova hesla sa nedala dokončiť.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Icon } from '../ui';
import { apiUrl } from '../config/api';
import { useNastavenia } from '../context/NastaveniaContext';
import './Prihlasenie.css';

const Obal: React.FC<{ nadpis: string; uvod: string; children: React.ReactNode }> = ({ nadpis, uvod, children }) => {
  const { nastavenia } = useNastavenia();
  const znak = nastavenia.skratka || nastavenia.nazov.charAt(0).toUpperCase();
  return (
    <div className="cw-login">
      <div className="cw-login__panel">
        <div className="cw-login__box">
          <div className="cw-login__brand">
            <div className="cw-login__logo" aria-hidden="true">
              {nastavenia.logo ? <img src={nastavenia.logo} alt="" /> : <span>{znak}</span>}
            </div>
            <div>
              <div className="cw-login__brand-name">{nastavenia.nazov}</div>
              <div className="cw-login__brand-sub">Redakčný systém klubu</div>
            </div>
          </div>
          <h1 className="cw-login__title">{nadpis}</h1>
          <p className="cw-login__lead">{uvod}</p>
          {children}
          <Link to="/prihlasenie" className="cw-login__forgot">
            Späť na prihlásenie
          </Link>
        </div>
      </div>
    </div>
  );
};

const posli = async (cesta: string, telo: unknown) => {
  const odpoved = await fetch(apiUrl(cesta), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(telo),
  });
  const obsah = await odpoved.json().catch(() => null);
  if (!odpoved.ok || !obsah?.success) {
    const detail = Array.isArray(obsah?.errors) ? ` ${obsah.errors.join(' ')}` : '';
    throw new Error((obsah?.message || 'Požiadavka zlyhala') + detail);
  }
  return obsah;
};

export const ZabudnuteHeslo: React.FC = () => {
  const [email, setEmail] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [odosiela, setOdosiela] = useState(false);

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setChyba(null);
    if (!email.includes('@')) return setChyba('Zadajte e-mail, ktorým sa prihlasujete');
    setOdosiela(true);
    try {
      const obsah = await posli('/auth/zabudnute-heslo', { email: email.trim() });
      setHotovo(obsah.message || 'Ak je e-mail registrovaný, poslali sme naň odkaz na obnovu hesla.');
    } catch (e: any) {
      setChyba(e?.message || 'Odkaz sa nepodarilo odoslať');
    } finally {
      setOdosiela(false);
    }
  };

  return (
    <Obal nadpis="Zabudnuté heslo" uvod="Pošleme vám e-mail s odkazom na nastavenie nového hesla.">
      {hotovo ? (
        <div className="cw-login__ok" role="status">
          <Icon nazov="licencia" velkost={16} />
          <span>{hotovo}</span>
        </div>
      ) : (
        <form onSubmit={odosli} noValidate>
          <Input menovka="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
          {chyba && (
            <div className="cw-login__error" role="alert">
              <Icon nazov="zavriet" velkost={15} />
              <span>{chyba}</span>
            </div>
          )}
          <Button type="submit" plnaSirka nacitava={odosiela}>
            Poslať odkaz
          </Button>
        </form>
      )}
    </Obal>
  );
};

export const ObnovaHesla: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [heslo, setHeslo] = useState('');
  const [znova, setZnova] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState(false);
  const [odosiela, setOdosiela] = useState(false);

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setChyba(null);
    if (heslo.length < 10) return setChyba('Heslo musí mať aspoň 10 znakov');
    if (heslo !== znova) return setChyba('Heslá sa nezhodujú');
    setOdosiela(true);
    try {
      await posli('/auth/obnova-hesla', { token, heslo });
      setHotovo(true);
    } catch (e: any) {
      setChyba(e?.message || 'Heslo sa nepodarilo nastaviť');
    } finally {
      setOdosiela(false);
    }
  };

  if (!token) {
    return (
      <Obal nadpis="Obnova hesla" uvod="Odkaz je neúplný.">
        <p className="cw-login__lead">
          Otvorte celý odkaz z e-mailu, alebo si <Link to="/zabudnute-heslo">vyžiadajte nový</Link>.
        </p>
      </Obal>
    );
  }

  return (
    <Obal nadpis="Nové heslo" uvod="Zvoľte si nové heslo. Dlhá zapamätateľná fráza je bezpečnejšia než krátka zmes znakov.">
      {hotovo ? (
        <div className="cw-login__ok" role="status">
          <Icon nazov="licencia" velkost={16} />
          <span>Heslo bolo zmenené. Teraz sa môžete prihlásiť.</span>
        </div>
      ) : (
        <form onSubmit={odosli} noValidate>
          <Input menovka="Nové heslo" type="password" value={heslo} onChange={(e) => setHeslo(e.target.value)} autoComplete="new-password" autoFocus />
          <Input menovka="Nové heslo znova" type="password" value={znova} onChange={(e) => setZnova(e.target.value)} autoComplete="new-password" />
          {chyba && (
            <div className="cw-login__error" role="alert">
              <Icon nazov="zavriet" velkost={15} />
              <span>{chyba}</span>
            </div>
          )}
          <Button type="submit" plnaSirka nacitava={odosiela}>
            Nastaviť heslo
          </Button>
        </form>
      )}
    </Obal>
  );
};
