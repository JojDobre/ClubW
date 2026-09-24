// Umiestnenie: frontend/src/pages/Prihlasenie.tsx
// Prihlasovacia obrazovka.

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, Input, Icon } from '../ui';
import { useAuth } from '../app/AuthContext';
import { useNastavenia } from '../context/NastaveniaContext';
import { tr, JAZYKY, jazyk, zmenJazyk } from '../i18n';
import './Prihlasenie.css';

export const Prihlasenie: React.FC = () => {
  const { prihlas, prihlaseny, nacitava } = useAuth();
  const { nastavenia } = useNastavenia();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [heslo, setHeslo] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);
  const [odosielam, setOdosielam] = useState(false);

  // Cesta, na ktorú sa používateľ pôvodne pokúšal dostať
  const kamPotom = (location.state as { odkial?: string } | null)?.odkial || '/admin';

  // Prihlásený používateľ nemá čo robiť na prihlasovacej obrazovke
  useEffect(() => {
    if (!nacitava && prihlaseny) {
      navigate(kamPotom, { replace: true });
    }
  }, [prihlaseny, nacitava, navigate, kamPotom]);

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setChyba(null);

    if (!email.trim() || !heslo) {
      setChyba(tr('Vyplňte e-mail aj heslo'));
      return;
    }

    setOdosielam(true);
    try {
      await prihlas(email.trim(), heslo);
      navigate(kamPotom, { replace: true });
    } catch (e: any) {
      setChyba(e?.message || tr('Prihlásenie zlyhalo'));
      // Heslo po neúspechu vyprázdnime, e-mail necháme
      setHeslo('');
    } finally {
      setOdosielam(false);
    }
  };

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
              <div className="cw-login__brand-sub">{tr('Redakčný systém klubu')}</div>
            </div>
          </div>

          <h1 className="cw-login__title">{tr('Prihláste sa')}</h1>
          <p className="cw-login__lead">{tr('Vitajte späť. Zadajte svoje prihlasovacie údaje.')}</p>

          <form onSubmit={odosli} noValidate>
            <Input
              menovka="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.sk"
              autoComplete="username"
              // Kurzor skočí do prvého poľa hneď po načítaní
              autoFocus
              disabled={odosielam}
            />

            <Input
              menovka={tr('Heslo')}
              type="password"
              value={heslo}
              onChange={(e) => setHeslo(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={odosielam}
            />

            {chyba && (
              <div className="cw-login__error" role="alert">
                <Icon nazov="zavriet" velkost={15} />
                <span>{chyba}</span>
              </div>
            )}

            <Button type="submit" plnaSirka nacitava={odosielam}>
              {tr('Prihlásiť sa')}
            </Button>
          </form>

          <Link to="/zabudnute-heslo" className="cw-login__forgot">
            {tr('Zabudli ste heslo?')}
          </Link>

          {/* Jazyk sa dá zvoliť ešte pred prihlásením */}
          <div className="cw-login__jazyky" role="group" aria-label={tr('Jazyk')}>
            {JAZYKY.map((j) => (
              <button
                key={j.kod}
                type="button"
                className={j.kod === jazyk() ? 'is-aktivny' : undefined}
                aria-pressed={j.kod === jazyk()}
                onClick={() => zmenJazyk(j.kod)}
                lang={j.kod}
              >
                {j.nazov}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ozdobná polovica obrazovky — na mobile sa skryje */}
      <div className="cw-login__aside" aria-hidden="true">
        <div className="cw-login__aside-inner">
          <div className="cw-login__aside-mark">{znak}</div>
          <div className="cw-login__aside-name">{nastavenia.nazov}</div>
          {nastavenia.slogan && (
            <div className="cw-login__aside-slogan">{nastavenia.slogan}</div>
          )}
          {nastavenia.rok_zalozenia && (
            <div className="cw-login__aside-year">{tr('od')} {nastavenia.rok_zalozenia}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prihlasenie;
