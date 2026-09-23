// Umiestnenie: frontend/src/web/pomocky.tsx
// Pomôcky pre šablóny: menu webu, načítanie dát, súhlas s cookies.
// Každá šablóna ich dostane cez @clubw/jadro, aby nemusela opakovať
// rovnakú logiku (a aby sa menu z administrácie správalo všade rovnako).

import React, { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../config/api';

/** Položka menu webu (Menu a odkazy v administrácii). */
export interface PolozkaMenu {
  id: number | string;
  nazov: string;
  odkaz: string | null;
  otvorit_v_novom: boolean;
  deti?: PolozkaMenu[];
}

/** Predvolené menu, kým si klub nenastaví vlastné. */
const PREDVOLENE_MENU: PolozkaMenu[] = [
  { id: 'domov', nazov: 'Domov', odkaz: '/', otvorit_v_novom: false },
  { id: 'clanky', nazov: 'Články', odkaz: '/clanky', otvorit_v_novom: false },
  { id: 'zapasy', nazov: 'Zápasy', odkaz: '/matches', otvorit_v_novom: false },
  { id: 'timy', nazov: 'Tímy', odkaz: '/teams', otvorit_v_novom: false },
  { id: 'turnaje', nazov: 'Turnaje', odkaz: '/turnaje', otvorit_v_novom: false },
  { id: 'dokumenty', nazov: 'Dokumenty', odkaz: '/dokumenty', otvorit_v_novom: false },
  { id: 'partneri', nazov: 'Partneri', odkaz: '/sponzori', otvorit_v_novom: false },
];

let pamatMenu: Promise<PolozkaMenu[]> | null = null;

const nacitajMenu = (): Promise<PolozkaMenu[]> => {
  // Hlavička aj pätička menu potrebujú - načíta sa raz za návštevu
  if (!pamatMenu) {
    pamatMenu = (async () => {
      try {
        const menu = await (await fetch(apiUrl('/menu'))).json();
        if (menu?.success && Array.isArray(menu.data) && menu.data.length > 0) return menu.data as PolozkaMenu[];
      } catch {
        /* predvolené menu */
      }
      // Bez vlastného menu: predvolené odkazy + stránky označené „v menu"
      try {
        const stranky = await (await fetch(apiUrl('/pages/menu'))).json();
        if (stranky?.success && Array.isArray(stranky.data)) {
          return [
            ...PREDVOLENE_MENU,
            ...stranky.data.map((s: { id: number; nazov: string; slug: string }) => ({
              id: `stranka-${s.id}`,
              nazov: s.nazov,
              odkaz: `/${s.slug}`,
              otvorit_v_novom: false,
            })),
          ];
        }
      } catch {
        /* len predvolené */
      }
      return PREDVOLENE_MENU;
    })();
  }
  return pamatMenu;
};

/**
 * Menu webu: nastavené v administrácii, inak predvolené odkazy.
 * Položky môžu mať podmenu (deti).
 */
export const useMenuWebu = (): { polozky: PolozkaMenu[]; nacitava: boolean } => {
  const [polozky, setPolozky] = useState<PolozkaMenu[]>([]);
  const [nacitava, setNacitava] = useState(true);
  useEffect(() => {
    let zruseny = false;
    nacitajMenu().then((m) => {
      if (zruseny) return;
      setPolozky(m);
      setNacitava(false);
    });
    return () => {
      zruseny = true;
    };
  }, []);
  return { polozky, nacitava };
};

/** Odkaz z menu - interný bez znovunačítania stránky, externý cez <a>. */
export const OdkazMenu: React.FC<{
  polozka: PolozkaMenu;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}> = ({ polozka, className, onClick, children }) => {
  const adresa = polozka.odkaz || '#';
  if (adresa.startsWith('/') && !adresa.startsWith('//') && !polozka.otvorit_v_novom) {
    return (
      <Link to={adresa} className={className} onClick={onClick}>
        {children ?? polozka.nazov}
      </Link>
    );
  }
  return (
    <a
      href={adresa}
      className={className}
      onClick={onClick}
      {...(polozka.otvorit_v_novom ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children ?? polozka.nazov}
    </a>
  );
};

/** Znovu otvorí lištu súhlasu s cookies (odkaz „Nastavenia cookies" v pätičke). */
export const otvorNastaveniaCookies = (): void => {
  try {
    localStorage.removeItem('clubw_cookies');
  } catch {
    /* súkromné okno */
  }
  window.location.reload();
};

/** Je návštevník prihlásený do administrácie? (napr. pre odkaz „Administrácia") */
export const jePrihlaseny = (): boolean => {
  try {
    return Boolean(localStorage.getItem('clubw_token'));
  } catch {
    return false;
  }
};

/**
 * Načítanie dát z verejného API.
 *
 * @example
 *   const { data } = useData<Clanok[]>('/articles?limit=3');
 */
export const useData = <T,>(cesta: string | null): { data: T | null; nacitava: boolean; chyba: string | null } => {
  const [stav, setStav] = useState<{ data: T | null; nacitava: boolean; chyba: string | null }>({
    data: null,
    nacitava: Boolean(cesta),
    chyba: null,
  });
  useEffect(() => {
    if (!cesta) return;
    const ovladac = new AbortController();
    setStav((s) => ({ ...s, nacitava: true, chyba: null }));
    fetch(apiUrl(cesta), { signal: ovladac.signal })
      .then(async (r) => {
        const telo = await r.json().catch(() => null);
        if (!r.ok || !telo?.success) throw new Error(telo?.message || `Chyba ${r.status}`);
        setStav({ data: telo.data as T, nacitava: false, chyba: null });
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setStav({ data: null, nacitava: false, chyba: e.message });
      });
    return () => ovladac.abort();
  }, [cesta]);
  return stav;
};
