// Umiestnenie: frontend/src/ui/Field.tsx
// Formulárové prvky: vstupné pole, výberový zoznam, viacriadkový text.
//
// Všetky zdieľajú obal s menovkou a hláškou o chybe, aby formuláre
// v celej administrácii vyzerali rovnako a chyby boli na tom istom mieste.

import React, { useId } from 'react';
import './Field.css';

interface ObalProps {
  /** Menovka nad poľom */
  menovka?: string;
  /** Text chyby — ak je vyplnený, pole sa zvýrazní červeno */
  chyba?: string;
  /** Vysvetľujúci text pod poľom */
  napoveda?: string;
  povinne?: boolean;
  children: (idPola: string, jeChyba: boolean) => React.ReactNode;
}

/** Spoločný obal pre všetky formulárové prvky. */
const Obal: React.FC<ObalProps> = ({ menovka, chyba, napoveda, povinne, children }) => {
  // useId vygeneruje jedinečný identifikátor — bez neho by kliknutie
  // na menovku nefungovalo pri viacerých poliach na jednej stránke
  const id = useId();
  const jeChyba = Boolean(chyba);

  return (
    <div className="cw-field">
      {menovka && (
        <label className="cw-field__label" htmlFor={id}>
          {menovka}
          {povinne && <span className="cw-field__required" aria-hidden="true"> *</span>}
        </label>
      )}

      {children(id, jeChyba)}

      {chyba && (
        // role="alert" zabezpečí, že čítačka obrazovky chybu oznámi
        <div className="cw-field__error" role="alert">
          {chyba}
        </div>
      )}
      {!chyba && napoveda && <div className="cw-field__hint">{napoveda}</div>}
    </div>
  );
};

// ===== Vstupné pole =====

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  menovka?: string;
  chyba?: string;
  napoveda?: string;
  povinne?: boolean;
  /** Ikona vľavo vnútri poľa (napríklad lupa pri vyhľadávaní) */
  ikona?: React.ReactNode;
}

// forwardRef: rodič sa dostane k poľu (napr. vloženie značky na miesto kurzora)
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  menovka, chyba, napoveda, povinne, ikona, className = '', ...zvysok
}, ref) => (
  <Obal menovka={menovka} chyba={chyba} napoveda={napoveda} povinne={povinne}>
    {(id, jeChyba) => (
      <div className={`cw-input-wrap ${ikona ? 'cw-input-wrap--icon' : ''}`}>
        {ikona && <span className="cw-input__icon">{ikona}</span>}
        <input
          ref={ref}
          id={id}
          className={`cw-input ${jeChyba ? 'cw-input--error' : ''} ${className}`}
          aria-invalid={jeChyba}
          {...zvysok}
        />
      </div>
    )}
  </Obal>
));
Input.displayName = 'Input';

// ===== Výberový zoznam =====

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  menovka?: string;
  chyba?: string;
  napoveda?: string;
  povinne?: boolean;
  moznosti: Array<{ hodnota: string | number; popis: string }>;
  /** Text prvej prázdnej položky */
  prazdna?: string;
}

export const Select: React.FC<SelectProps> = ({
  menovka, chyba, napoveda, povinne, moznosti, prazdna, className = '', ...zvysok
}) => (
  <Obal menovka={menovka} chyba={chyba} napoveda={napoveda} povinne={povinne}>
    {(id, jeChyba) => (
      <select
        id={id}
        className={`cw-select ${jeChyba ? 'cw-input--error' : ''} ${className}`}
        aria-invalid={jeChyba}
        {...zvysok}
      >
        {prazdna && <option value="">{prazdna}</option>}
        {moznosti.map((m) => (
          <option key={m.hodnota} value={m.hodnota}>
            {m.popis}
          </option>
        ))}
      </select>
    )}
  </Obal>
);

// ===== Viacriadkový text =====

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  menovka?: string;
  chyba?: string;
  napoveda?: string;
  povinne?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  menovka, chyba, napoveda, povinne, rows = 4, className = '', ...zvysok
}, ref) => (
  <Obal menovka={menovka} chyba={chyba} napoveda={napoveda} povinne={povinne}>
    {(id, jeChyba) => (
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`cw-textarea ${jeChyba ? 'cw-input--error' : ''} ${className}`}
        aria-invalid={jeChyba}
        {...zvysok}
      />
    )}
  </Obal>
));
Textarea.displayName = 'Textarea';

// ===== Prepínač =====

interface SwitchProps {
  zapnute: boolean;
  onZmena: (hodnota: boolean) => void;
  menovka?: string;
  popis?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  zapnute, onZmena, menovka, popis, disabled,
}) => (
  <label className={`cw-switch ${disabled ? 'cw-switch--disabled' : ''}`}>
    <input
      type="checkbox"
      checked={zapnute}
      onChange={(e) => onZmena(e.target.checked)}
      disabled={disabled}
      className="cw-sr-only"
    />
    <span className="cw-switch__track" aria-hidden="true">
      <span className="cw-switch__thumb" />
    </span>
    {(menovka || popis) && (
      <span className="cw-switch__text">
        {menovka && <span className="cw-switch__label">{menovka}</span>}
        {popis && <span className="cw-switch__desc">{popis}</span>}
      </span>
    )}
  </label>
);
