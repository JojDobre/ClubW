// Umiestnenie: sablony/zakladna/src/ikony.tsx
// Drobné ikony základnej šablóny (čiarové SVG, farbu berú z textu).

import React from 'react';

const CESTY: Record<string, React.ReactNode> = {
  hladat: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  kosik: (
    <>
      <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  ucet: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20.5c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  zavriet: <path d="m6 6 12 12M18 6 6 18" />,
  email: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </>
  ),
  telefon: <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" />,
  miesto: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  sipka: <path d="M5 12h14m-5-5 5 5-5 5" />,
  kalendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  facebook: <path d="M14.5 8.5H17V5h-2.5a4 4 0 0 0-4 4v2H8v3.5h2.5V21H14v-6.5h2.6l.4-3.5h-3V9.5a1 1 0 0 1 1-1Z" />,
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17" cy="7" r=".6" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
      <path d="m10.5 9.5 4 2.5-4 2.5Z" />
    </>
  ),
  x: <path d="M5 4.5h3.6L19 19.5h-3.6ZM18.5 4.5 13.4 10.3M10.6 13.7 5.5 19.5" />,
  tiktok: <path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.46M14 4c.5 2.6 2.2 4 5 4.2" />,
};

export type NazovIkony = keyof typeof CESTY;

export const Ikona: React.FC<{ nazov: string; className?: string }> = ({ nazov, className }) => (
  <svg
    className={`zk-ikona${className ? ` ${className}` : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {CESTY[nazov]}
  </svg>
);
