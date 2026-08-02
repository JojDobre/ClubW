// Umiestnenie: frontend/src/ui/Button.tsx
// Tlačidlo vo variantoch podľa návrhu administrácie.

import React from 'react';
import './Button.css';

export type VariantTlacidla =
  | 'primary'   // hlavná akcia na obrazovke
  | 'secondary' // vedľajšia akcia, ohraničené tlačidlo
  | 'ghost'     // bez pozadia, do panelov nástrojov
  | 'danger';   // nezvratná akcia (mazanie)

export type VelkostTlacidla = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: VariantTlacidla;
  velkost?: VelkostTlacidla;
  /** Zobrazí točiace sa koliesko a tlačidlo zablokuje */
  nacitava?: boolean;
  /** Ikona pred textom */
  ikona?: React.ReactNode;
  /** Roztiahne tlačidlo na celú šírku rodiča */
  plnaSirka?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  velkost = 'md',
  nacitava = false,
  ikona,
  plnaSirka = false,
  disabled,
  children,
  className = '',
  ...zvysok
}) => {
  const triedy = [
    'cw-btn',
    `cw-btn--${variant}`,
    `cw-btn--${velkost}`,
    plnaSirka ? 'cw-btn--full' : '',
    nacitava ? 'cw-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={triedy}
      // Počas načítania tlačidlo blokujeme, aby sa akcia nespustila dvakrát
      disabled={disabled || nacitava}
      {...zvysok}
    >
      {nacitava && <span className="cw-btn__spinner" aria-hidden="true" />}
      {!nacitava && ikona && <span className="cw-btn__icon">{ikona}</span>}
      <span>{children}</span>
    </button>
  );
};

export default Button;
