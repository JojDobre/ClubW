// Umiestnenie: frontend/src/ui/Card.tsx
// Karta — základný obal obsahu v administrácii.

import React from 'react';
import './Card.css';

interface CardProps {
  /** Nadpis v hlavičke karty */
  nadpis?: string;
  /** Doplňujúci text pod nadpisom */
  podnadpis?: string;
  /** Obsah vpravo v hlavičke (tlačidlá, odkazy) */
  akcie?: React.ReactNode;
  /** Vypne vnútorné odsadenie — pre tabuľky, ktoré idú po okraj */
  bezOdsadenia?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  nadpis, podnadpis, akcie, bezOdsadenia = false, children, className = '',
}) => (
  <section className={`cw-card ${className}`}>
    {(nadpis || akcie) && (
      <header className="cw-card__head">
        <div className="cw-card__titles">
          {nadpis && <h3 className="cw-card__title">{nadpis}</h3>}
          {podnadpis && <p className="cw-card__subtitle">{podnadpis}</p>}
        </div>
        {akcie && <div className="cw-card__actions">{akcie}</div>}
      </header>
    )}
    <div className={bezOdsadenia ? '' : 'cw-card__body'}>{children}</div>
  </section>
);

// ===== Karta so štatistikou =====

interface StatCardProps {
  menovka: string;
  hodnota: string | number;
  /** Zmena oproti minulému obdobiu, napríklad "+12 %" */
  zmena?: string;
  /** true = zmena je pozitívna (zelená), false = negatívna (červená) */
  zmenaKladna?: boolean;
  ikona?: React.ReactNode;
  /** Zobrazí skeleton namiesto hodnoty */
  nacitava?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  menovka, hodnota, zmena, zmenaKladna = true, ikona, nacitava, onClick,
}) => {
  const klikatelna = Boolean(onClick);

  return (
    <div
      className={`cw-stat ${klikatelna ? 'cw-stat--clickable' : ''}`}
      onClick={onClick}
      // Klikateľná karta musí byť dosiahnuteľná aj klávesnicou
      role={klikatelna ? 'button' : undefined}
      tabIndex={klikatelna ? 0 : undefined}
      onKeyDown={
        klikatelna
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
    >
      {/* Horný riadok: ikona v zaoblenom boxe vľavo, zmena vpravo */}
      <div className="cw-stat__row">
        <span className="cw-stat__icon">{ikona}</span>
        {zmena && !nacitava && (
          <span className={`cw-stat__delta ${zmenaKladna ? 'is-up' : 'is-down'}`}>
            {zmena}
          </span>
        )}
      </div>

      {nacitava ? (
        <div className="cw-skeleton cw-stat__skeleton" />
      ) : (
        <div className="cw-stat__value">{hodnota}</div>
      )}

      <div className="cw-stat__label">{menovka}</div>
    </div>
  );
};

export default Card;
