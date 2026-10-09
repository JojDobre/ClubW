// Umiestnenie: frontend/src/web/zivaMinuta.ts
// Výpočty živého prenosu bez React komponentov a štýlov - používa ich
// web (zivyPrenos.tsx) aj administrácia (Živý záznam zápasu).

/** Polia zápasu, ktoré živý prenos potrebuje. */
export interface ZapasPrenosu {
  status?: string | null;
  live_faza?: string | null;
  live_faza_od?: string | null;
  dlzka_polcasu?: number | null;
  stream_url?: string | null;
  datum_cas?: string;
}

export const NAZVY_FAZ: Record<string, string> = {
  prvy_polcas: '1. polčas',
  polcas: 'Polčas',
  druhy_polcas: '2. polčas',
  predlzenie: 'Predĺženie',
  penalty: 'Penalty',
};

/**
 * Bežiaca minúta zápasu, napríklad „23'“ alebo „45+2'“. Počas prestávky
 * a penált null.
 */
export const zivaMinuta = (z: ZapasPrenosu, teraz = Date.now()): string | null => {
  if (!z.live_faza || !z.live_faza_od) return null;
  const dlzka = z.dlzka_polcasu || 45;
  const rozsah: Record<string, [number, number]> = {
    prvy_polcas: [0, dlzka],
    druhy_polcas: [dlzka, 2 * dlzka],
    predlzenie: [2 * dlzka, 2 * dlzka + 30],
  };
  const r = rozsah[z.live_faza];
  if (!r) return null;
  const uplynulo = Math.max(0, Math.floor((teraz - new Date(z.live_faza_od).getTime()) / 60_000)) + 1;
  const minuta = r[0] + uplynulo;
  return minuta > r[1] ? `${r[1]}+${minuta - r[1]}'` : `${minuta}'`;
};

/** Adresa na vloženie prenosu do stránky (YouTube, Facebook), inak null - ostane odkaz. */
export const vlozenieStreamu = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com') id = u.searchParams.get('v') || u.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]+)/)?.[1] || null;
    if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    if (host === 'facebook.com' || host === 'fb.watch') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }
  } catch {
    /* neplatná adresa - nevložíme */
  }
  return null;
};

/** Bežiaca minúta ako číslo (45+2 → 47) - predvyplnenie minúty udalosti. */
export const zivaMinutaCislo = (z: ZapasPrenosu, teraz = Date.now()): number | null => {
  const text = zivaMinuta(z, teraz);
  if (!text) return null;
  return text.replace("'", '').split('+').reduce((sucet, cast) => sucet + Number(cast), 0);
};
