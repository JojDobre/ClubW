// Umiestnenie: sablony/zakladna/src/zapasy.tsx
// Spoločné pomôcky zápasov základnej šablóny - názvy a erby strán,
// formátovanie dátumu a stav zápasu (úvod, zoznam aj detail zápasu).

import React, { useEffect } from 'react';
import { souborUrl, useNastavenia } from '@clubw/jadro';

export interface TimZapasu {
  id: number;
  nazov: string;
  logo: string | null;
}

export interface ZapasZakladny {
  id: number;
  datum_cas: string;
  status: string;
  actual_status?: string;
  domaci_tim_id?: number | null;
  hostujuci_tim_id?: number | null;
  domaci_tim_nazov?: string | null;
  hostujuci_tim_nazov?: string | null;
  domaci_tim_display_name?: string | null;
  hostujuci_tim_display_name?: string | null;
  domaci_tim?: TimZapasu | null;
  hostujuci_tim?: TimZapasu | null;
  supier_logo?: string | null;
  goly_domaci?: number | null;
  goly_hostia?: number | null;
  liga_id?: number | null;
  liga_nazov?: string | null;
  liga_display_name?: string | null;
  kolo?: string | null;
  miesto?: string | null;
  rozhodca?: string | null;
  pocet_divakov?: number | null;
  live_faza?: string | null;
  live_faza_od?: string | null;
  dlzka_polcasu?: number | null;
  stream_url?: string | null;
}

export const STAVY: Record<string, string> = {
  naplanovany: 'Naplánovaný',
  prebieha: 'Naživo',
  ukonceny: 'Odohraný',
  odlozeny: 'Odložený',
  zruseny: 'Zrušený',
};

/** Stav zápasu - prepočítaný podľa času má prednosť pred uloženým. */
export const stavZapasu = (z: ZapasZakladny) => (z.status === 'prebieha' ? 'prebieha' : z.actual_status || z.status);

export const maVysledok = (z: ZapasZakladny) => z.goly_domaci != null && z.goly_hostia != null;

export const nazovStrany = (z: ZapasZakladny, strana: 'domaci' | 'hostia') =>
  strana === 'domaci'
    ? z.domaci_tim_display_name || z.domaci_tim_nazov || z.domaci_tim?.nazov || 'Domáci'
    : z.hostujuci_tim_display_name || z.hostujuci_tim_nazov || z.hostujuci_tim?.nazov || 'Hostia';

export const nazovSutaze = (z: ZapasZakladny) =>
  [z.liga_display_name || z.liga_nazov, z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ');

/** Logo strany: náš tím má logo tímu alebo klubu, súper svoje logo. */
export const logoStrany = (z: ZapasZakladny, strana: 'domaci' | 'hostia', logoKlubu: string | null) => {
  const nas = strana === 'domaci' ? z.domaci_tim_id : z.hostujuci_tim_id;
  const tim = strana === 'domaci' ? z.domaci_tim : z.hostujuci_tim;
  if (nas) return tim?.logo || logoKlubu;
  return z.supier_logo || null;
};

const skratka = (nazov: string) =>
  nazov
    .split(/\s+/)
    .filter((s) => /^[A-ZÁ-Ž0-9]/.test(s))
    .map((s) => s[0])
    .join('')
    .slice(0, 3) || nazov.slice(0, 2).toUpperCase();

export const ErbTimu: React.FC<{ z: ZapasZakladny; strana: 'domaci' | 'hostia'; velky?: boolean }> = ({ z, strana, velky }) => {
  const { nastavenia } = useNastavenia();
  const logo = logoStrany(z, strana, nastavenia.logo);
  const trieda = `zk-erb-timu${velky ? ' zk-erb-timu--velky' : ''}`;
  return logo ? (
    <img src={souborUrl(logo)} alt="" className={trieda} loading="lazy" />
  ) : (
    <span className={`${trieda} zk-erb-timu--znak`} aria-hidden="true">
      {skratka(nazovStrany(z, strana))}
    </span>
  );
};

export const datum = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
export const den = (d: string) => new Date(d).toLocaleDateString('sk-SK', { weekday: 'short' });
export const denCislo = (d: string) => new Date(d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
export const cas = (d: string) => new Date(d).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

/** Titulok karty prehliadača (s názvom klubu, ak SEO nemá vlastný vzor). */
export const useTitulok = (titulok: string | null | undefined) => {
  const { nastavenia } = useNastavenia();
  useEffect(() => {
    if (!titulok) return;
    const maSablonu = Boolean(nastavenia.seo?.meta_title_sablona?.includes('%s'));
    document.title = maSablonu || titulok === nastavenia.nazov ? titulok : `${titulok} · ${nastavenia.nazov}`;
  }, [titulok, nastavenia.nazov, nastavenia.seo?.meta_title_sablona]);
};
