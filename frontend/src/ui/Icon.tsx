// Umiestnenie: frontend/src/ui/Icon.tsx
// Ikony z návrhu administrácie.
//
// Vlastný komponent namiesto knižnice: návrh používa konkrétnu sadu
// (obrysové ikony, hrúbka čiary 2), a takto sa do balíka nedostane
// celá knižnica kvôli dvom desiatkam ikon.

import React from 'react';

// Každá ikona je zoznam ciest v súradniciach 24×24
const CESTY: Record<string, string[]> = {
  dashboard: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  clanky: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8'],
  kategorie: ['M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z', 'M7.5 7.5h.01'],
  komentare: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  stranky: ['M4 4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M14 2v6h6'],
  galerie: ['M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z', 'M8.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z', 'M21 15l-5-5L5 21'],
  videa: ['M23 7l-7 5 7 5z', 'M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z'],
  timy: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  hraci: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  zapasy: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 2v20', 'M2 12h20'],
  ligy: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.7V17a2 2 0 0 1-1.1 1.8L7 20h10l-1.9-1.2A2 2 0 0 1 14 17v-2.3', 'M18 2H6v7a6 6 0 0 0 12 0z'],
  kalendar: ['M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  sezony: ['M12 2v20', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20', 'M12 2a15 15 0 0 0 0 20'],
  pouzivatelia: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.9'],
  licencia: ['M9 12l2 2 4-4', 'M21 12c0 5-3.5 7.4-8.4 9.1a1 1 0 0 1-.7 0C7 19.4 3.5 17 3.5 12V6a1 1 0 0 1 .6-.9l7.5-3a1 1 0 0 1 .8 0l7.5 3a1 1 0 0 1 .6.9z'],
  nastavenia: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  gdpr: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  plus: ['M12 5v14', 'M5 12h14'],
  hladat: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  filter: ['M22 3H2l8 9.5V19l4 2v-8.5z'],
  upravit: ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z'],
  zmazat: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  kopirovat: ['M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  viac: ['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  zvonik: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'],
  odhlasit: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  sipkaVlavo: ['M19 12H5', 'M12 19l-7-7 7-7'],
  sipkaVpravo: ['M5 12h14', 'M12 5l7 7-7 7'],
  sipkaDole: ['M6 9l6 6 6-6'],
  mesiac: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  slnko: ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'],
  menu: ['M3 12h18', 'M3 6h18', 'M3 18h18'],
  zavriet: ['M18 6L6 18', 'M6 6l12 12'],
  ulozit: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'],
  oko: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  live: ['M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M16.2 7.8a6 6 0 0 1 0 8.5', 'M7.8 16.2a6 6 0 0 1 0-8.5', 'M19.1 4.9a10 10 0 0 1 0 14.2', 'M4.9 19.1a10 10 0 0 1 0-14.2'],
  stadion: ['M3 21h18', 'M5 21V8l7-5 7 5v13', 'M9 21v-6h6v6'],
  archiv: ['M21 8v13H3V8', 'M1 3h22v5H1z', 'M10 12h4'],
  obnovit: ['M1 4v6h6', 'M3.5 15a9 9 0 1 0 2.1-9.4L1 10'],
  presunut: ['M5 12h14', 'M15 8l4 4-4 4', 'M9 4l-4 4 4 4'],
  nahrat: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  hodiny: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  formular: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6v4H9z', 'M9 12h6', 'M9 16h6'],
  media: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
  sablony: [
    'M4 3h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
    'M4 14h7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z',
    'M16 14h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z',
  ],
  odkaz: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7'],
};

export type NazovIkony = keyof typeof CESTY;

interface IconProps {
  nazov: NazovIkony | string;
  velkost?: number;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ nazov, velkost = 18, className = '' }) => {
  const cesty = CESTY[nazov];

  // Neznámy názov nesmie zhodiť obrazovku — vrátime prázdne miesto
  if (!cesty) {
    if (import.meta.env.DEV) {
      console.warn(`Ikona "${nazov}" neexistuje`);
    }
    return <span style={{ width: velkost, height: velkost, display: 'inline-block' }} />;
  }

  return (
    <svg
      width={velkost}
      height={velkost}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      // Ikony sú dekoratívne, význam nesie sprievodný text
      aria-hidden="true"
      focusable="false"
    >
      {cesty.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
};

export default Icon;
