// Umiestnenie: frontend/src/layout/Topbar.tsx
// Horná lišta: názov obrazovky, prepínač režimu, ponuka používateľa.

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui';
import { useAuth } from '../app/AuthContext';
import { useRezim } from '../app/RezimContext';
import { tr } from '../i18n';
import './Topbar.css';

interface TopbarProps {
  nadpis: string;
  onOtvorMobilneMenu: () => void;
}

/** Popisné názvy rolí pre zobrazenie. */
const NAZVY_ROLI: Record<string, string> = {
  admin: tr('Administrátor'),
  redaktor: tr('Redaktor'),
  trener: tr('Tréner'),
  uzivatel: tr('Používateľ'),
};

export const Topbar: React.FC<TopbarProps> = ({ nadpis, onOtvorMobilneMenu }) => {
  const { pouzivatel, odhlas } = useAuth();
  const { jeTmavy, prepni } = useRezim();
  const navigate = useNavigate();

  const [ponukaOtvorena, setPonukaOtvorena] = useState(false);
  const ponukaRef = useRef<HTMLDivElement>(null);

  // Zatvorenie ponuky pri kliknutí inam alebo klávese Escape
  useEffect(() => {
    if (!ponukaOtvorena) return;

    const naKlik = (e: MouseEvent) => {
      if (ponukaRef.current && !ponukaRef.current.contains(e.target as Node)) {
        setPonukaOtvorena(false);
      }
    };
    const naKlaves = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPonukaOtvorena(false);
    };

    document.addEventListener('mousedown', naKlik);
    document.addEventListener('keydown', naKlaves);
    return () => {
      document.removeEventListener('mousedown', naKlik);
      document.removeEventListener('keydown', naKlaves);
    };
  }, [ponukaOtvorena]);

  const odhlasSa = async () => {
    setPonukaOtvorena(false);
    await odhlas();
    navigate('/prihlasenie', { replace: true });
  };

  // Iniciály do kolieska pri mene
  const iniciály = (pouzivatel?.meno || '?')
    .split(' ')
    .map((c) => c.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="cw-topbar">
      <div className="cw-topbar__left">
        <button
          className="cw-topbar__burger"
          onClick={onOtvorMobilneMenu}
          aria-label={tr('Otvoriť menu')}
        >
          <Icon nazov="menu" velkost={20} />
        </button>
        {/* Názov obrazovky je v hlavičke stránky (PageHeader).
            V lište ho zobrazujeme len na mobile, kde sa hlavička
            pri posúvaní stratí z dohľadu. */}
        <span className="cw-topbar__title">{nadpis}</span>
      </div>

      <div className="cw-topbar__right">
        <button
          className="cw-topbar__icon-btn"
          onClick={prepni}
          aria-label={jeTmavy ? tr('Prepnúť na svetlý režim') : tr('Prepnúť na tmavý režim')}
          title={jeTmavy ? tr('Svetlý režim') : tr('Tmavý režim')}
        >
          <Icon nazov={jeTmavy ? 'slnko' : 'mesiac'} velkost={18} />
        </button>

        <div className="cw-topbar__user" ref={ponukaRef}>
          <button
            className="cw-topbar__user-btn"
            onClick={() => setPonukaOtvorena((o) => !o)}
            aria-expanded={ponukaOtvorena}
            aria-haspopup="menu"
          >
            <span className="cw-topbar__avatar" aria-hidden="true">{iniciály}</span>
            <span className="cw-topbar__user-text">
              <span className="cw-topbar__user-name">{pouzivatel?.meno}</span>
              <span className="cw-topbar__user-role">
                {NAZVY_ROLI[pouzivatel?.rola ?? ''] ?? pouzivatel?.rola}
              </span>
            </span>
            <Icon nazov="sipkaDole" velkost={14} />
          </button>

          {ponukaOtvorena && (
            <div className="cw-topbar__menu" role="menu">
              <div className="cw-topbar__menu-head">
                <div className="cw-topbar__menu-name">{pouzivatel?.meno}</div>
                <div className="cw-topbar__menu-mail">{pouzivatel?.email}</div>
              </div>

              <button
                className="cw-topbar__menu-item"
                role="menuitem"
                onClick={() => {
                  setPonukaOtvorena(false);
                  navigate('/admin/profil');
                }}
              >
                <Icon nazov="pouzivatelia" velkost={15} />
                {tr('Môj profil')}
              </button>

              <button
                className="cw-topbar__menu-item cw-topbar__menu-item--danger"
                role="menuitem"
                onClick={odhlasSa}
              >
                <Icon nazov="odhlasit" velkost={15} />
                {tr('Odhlásiť sa')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
