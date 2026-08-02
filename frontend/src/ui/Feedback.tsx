// Umiestnenie: frontend/src/ui/Feedback.tsx
// Prvky spätnej väzby: štítok stavu, skeleton, prázdny stav, chybový stav.

import React from 'react';
import './Feedback.css';

// ===== Štítok stavu =====

export type TonStitka = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

interface BadgeProps {
  ton?: TonStitka;
  /** Zobrazí pulzujúci bod — pre stavy typu „práve prebieha" */
  zivy?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ ton = 'neutral', zivy, children }) => (
  <span className={`cw-badge cw-badge--${ton}`}>
    {zivy && <span className="cw-badge__dot" aria-hidden="true" />}
    {children}
  </span>
);

// ===== Skeleton =====

interface SkeletonProps {
  sirka?: string;
  vyska?: string;
  /** Počet riadkov pod sebou */
  riadkov?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  sirka = '100%', vyska = '14px', riadkov = 1, className = '',
}) => (
  <>
    {Array.from({ length: riadkov }).map((_, i) => (
      <div
        key={i}
        className={`cw-skeleton ${className}`}
        style={{
          width: sirka,
          height: vyska,
          // Posledný riadok kratší — text zriedka končí presne na okraji
          maxWidth: riadkov > 1 && i === riadkov - 1 ? '70%' : undefined,
          marginBottom: riadkov > 1 && i < riadkov - 1 ? 'var(--sp-2)' : undefined,
        }}
        aria-hidden="true"
      />
    ))}
  </>
);

// ===== Prázdny stav =====

interface EmptyStateProps {
  ikona?: React.ReactNode;
  nadpis: string;
  popis?: string;
  akcia?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ ikona, nadpis, popis, akcia }) => (
  <div className="cw-empty">
    {ikona && <div className="cw-empty__icon">{ikona}</div>}
    <h3 className="cw-empty__title">{nadpis}</h3>
    {popis && <p className="cw-empty__desc">{popis}</p>}
    {akcia && <div className="cw-empty__action">{akcia}</div>}
  </div>
);

// ===== Chybový stav =====

interface ErrorStateProps {
  /** Zrozumiteľný popis toho, čo sa nepodarilo */
  sprava: string;
  /** Technický detail — zobrazí sa menším písmom */
  detail?: string;
  onSkusZnova?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ sprava, detail, onSkusZnova }) => (
  <div className="cw-error-state" role="alert">
    <div className="cw-error-state__icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
    </div>
    <div className="cw-error-state__text">
      <div className="cw-error-state__msg">{sprava}</div>
      {detail && <div className="cw-error-state__detail">{detail}</div>}
    </div>
    {onSkusZnova && (
      <button className="cw-error-state__retry" onClick={onSkusZnova}>
        Skúsiť znova
      </button>
    )}
  </div>
);
