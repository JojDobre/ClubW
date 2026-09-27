// Umiestnenie: license-server/admin/src/formaty.ts
// Formátovanie dátumov, veľkostí a stavov.

const LOKALITA = 'sk-SK';

export const datum = (d?: string | null) => (d ? new Date(d).toLocaleDateString(LOKALITA, { day: 'numeric', month: 'numeric', year: 'numeric' }) : '—');
export const datumCas = (d?: string | null) =>
  d ? new Date(d).toLocaleString(LOKALITA, { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const doInputu = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/** „pred 5 min", „pred 3 dňami" */
export const predCasom = (d?: string | null) => {
  if (!d) return 'nikdy';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'práve teraz';
  if (s < 3600) return `pred ${Math.floor(s / 60)} min`;
  if (s < 86400) return `pred ${Math.floor(s / 3600)} h`;
  const dni = Math.floor(s / 86400);
  return dni === 1 ? 'včera' : `pred ${dni} dňami`;
};

export const sklon = (n: number, jeden: string, dva: string, pat: string) => (n === 1 ? jeden : n >= 2 && n <= 4 ? dva : pat);

export const velkost = (b?: number | null) => (!b ? '—' : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(b / 1024)} kB`);

export const STAVY_LICENCIE: Record<string, { nazov: string; ton: string }> = {
  aktivna: { nazov: 'Aktívna', ton: 'zelena' },
  vyprsana: { nazov: 'Vypršaná', ton: 'oranzova' },
  pozastavena: { nazov: 'Pozastavená', ton: 'zlta' },
  zrusena: { nazov: 'Zrušená', ton: 'seda' },
};

export const STAVY_PRIKAZU: Record<string, { nazov: string; ton: string }> = {
  caka: { nazov: 'Čaká na inštaláciu', ton: 'modra' },
  prevzaty: { nazov: 'Prevzatý', ton: 'modra' },
  prebieha: { nazov: 'Prebieha', ton: 'zlta' },
  hotovo: { nazov: 'Hotovo', ton: 'zelena' },
  chyba: { nazov: 'Chyba', ton: 'cervena' },
  zruseny: { nazov: 'Zrušený', ton: 'seda' },
};

export const STAVY_BALIKU: Record<string, { nazov: string; ton: string }> = {
  ziadny: { nazov: 'Bez balíka', ton: 'seda' },
  pripravuje: { nazov: 'Pripravuje sa…', ton: 'zlta' },
  pripraveny: { nazov: 'Pripravený', ton: 'zelena' },
  chyba: { nazov: 'Chyba', ton: 'cervena' },
};

/** Porovnanie verzií (kladné = a je novšia). */
export const porovnajVerzie = (a?: string | null, b?: string | null) => {
  const n = (v?: string | null) => String(v ?? '').replace(/^v/i, '').split('-')[0].split('.').map((x) => parseInt(x, 10) || 0);
  const pa = n(a);
  const pb = n(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};
