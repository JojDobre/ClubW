// Umiestnenie: frontend/src/layout/Sidebar.tsx
// Bočná navigácia administrácie.
//
// Na širokej obrazovke je trvalo viditeľná a dá sa zúžiť na samotné ikony.
// Na mobile sa vysúva sprava cez celý obsah.

import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../ui';
import { dostupneSekcie, jeAktivna, type Rola } from '../app/navigacia';
import { useNastavenia } from '../context/NastaveniaContext';
import { formulareApi, UDALOST_FORMULARE } from '../api/formulare';
import { useAuth } from '../app/AuthContext';
import './Sidebar.css';

interface SidebarProps {
  /** Zúžený režim — zobrazia sa len ikony */
  zuzeny: boolean;
  onPrepniZuzenie: () => void;
  /** Otvorené vysunutie na mobile */
  mobilneOtvorene: boolean;
  onZavriMobilne: () => void;
  rola: Rola | undefined;
  /** Cesta z adresného riadka — určuje zvýraznenú položku */
  aktualnaCesta: string;
}

/**
 * Počet neprečítaných vyplnených formulárov pre odznak v menu.
 * Obnoví sa pri prechode na inú obrazovku, raz za minútu a po zmene
 * na obrazovke Formuláre.
 */
const useNeprecitaneFormulare = (rola: Rola | undefined, cesta: string): number => {
  const [pocet, setPocet] = useState(0);
  const { smie: smieModul } = useAuth();
  const smie = smieModul('formulare');

  useEffect(() => {
    if (!smie) return;
    let zruseny = false;
    const nacitaj = () =>
      formulareApi
        .pocetNeprecitanych()
        .then((n) => !zruseny && setPocet(Number(n) || 0))
        .catch(() => undefined);
    nacitaj();
    const casovac = window.setInterval(nacitaj, 60_000);
    window.addEventListener(UDALOST_FORMULARE, nacitaj);
    return () => {
      zruseny = true;
      window.clearInterval(casovac);
      window.removeEventListener(UDALOST_FORMULARE, nacitaj);
    };
  }, [smie, cesta]);

  return smie ? pocet : 0;
};

export const Sidebar: React.FC<SidebarProps> = ({
  zuzeny, onPrepniZuzenie, mobilneOtvorene, onZavriMobilne, rola, aktualnaCesta,
}) => {
  const { nastavenia } = useNastavenia();
  const { smie } = useAuth();
  const sekcie = dostupneSekcie(rola, smie);
  const neprecitane = useNeprecitaneFormulare(rola, aktualnaCesta);

  // Znak loga: skratka z nastavení klubu, inak prvé písmeno názvu
  const znak = nastavenia.skratka || nastavenia.nazov.charAt(0).toUpperCase();

  return (
    <>
      {/* Stmavenie pozadia pri vysunutom menu na mobile */}
      {mobilneOtvorene && (
        <div className="cw-scrim" onClick={onZavriMobilne} aria-hidden="true" />
      )}

      <aside
        className={[
          'cw-sidebar',
          zuzeny ? 'cw-sidebar--collapsed' : '',
          mobilneOtvorene ? 'cw-sidebar--open' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Hlavná navigácia"
      >
        {/* ===== Značka ===== */}
        <div className="cw-sidebar__brand">
          <div className="cw-sidebar__logo" aria-hidden="true">
            {nastavenia.logo ? (
              <img src={nastavenia.logo} alt="" />
            ) : (
              <span>{znak}</span>
            )}
          </div>
          {!zuzeny && (
            <div className="cw-sidebar__brand-text">
              <div className="cw-sidebar__brand-name">{nastavenia.nazov}</div>
              <div className="cw-sidebar__brand-sub">Redakčný systém klubu</div>
            </div>
          )}
        </div>

        {/* ===== Položky menu ===== */}
        <nav className="cw-sidebar__nav">
          {sekcie.map((sekcia) => (
            <div key={sekcia.nazov} className="cw-sidebar__section">
              {/* V zúženom režime by nadpis sekcie neostal čitateľný */}
              {!zuzeny && (
                <div className="cw-sidebar__section-title">{sekcia.nazov}</div>
              )}

              {sekcia.polozky.map((polozka) => (
                <NavLink
                  key={polozka.cesta}
                  to={polozka.cesta}
                  className={
                    jeAktivna(polozka.cesta, aktualnaCesta)
                      ? 'cw-sidebar__item is-active'
                      : 'cw-sidebar__item'
                  }
                  onClick={onZavriMobilne}
                  // V zúženom režime nahrádza popisok skrytý text
                  title={zuzeny ? polozka.popis : undefined}
                >
                  <Icon nazov={polozka.ikona} velkost={17} />
                  {!zuzeny && <span className="cw-sidebar__item-label">{polozka.popis}</span>}
                  {!zuzeny && polozka.pripravujeSa && (
                    <span className="cw-sidebar__soon">čoskoro</span>
                  )}
                  {polozka.odznak === 'formulare' && neprecitane > 0 && (
                    <span className="cw-sidebar__count" aria-label={`${neprecitane} neprečítaných`}>
                      {neprecitane > 99 ? '99+' : neprecitane}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* ===== Zúženie ===== */}
        <button
          className="cw-sidebar__collapse"
          onClick={onPrepniZuzenie}
          aria-label={zuzeny ? 'Rozšíriť menu' : 'Zúžiť menu'}
        >
          <Icon
            nazov="sipkaVlavo"
            velkost={16}
            className={zuzeny ? 'cw-sidebar__chev is-flipped' : 'cw-sidebar__chev'}
          />
          {!zuzeny && <span>Zúžiť menu</span>}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
