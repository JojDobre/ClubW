// Umiestnenie: license-server/src/utils/verzie.ts
// Porovnávanie čísel verzií (1.2.0, v1.10.3, 2.0.0-beta.1).

/** Verzia bez predpony v a medzier. */
export const normalizujVerziu = (v: string | null | undefined): string => String(v ?? '').trim().replace(/^v/i, '');

/** Vyzerá tag ako verzia? (v1.2, 1.2.3, v2.0.0-rc.1) */
export const jeVerzia = (tag: string): boolean => /^v?\d+(\.\d+){0,3}(-[0-9A-Za-z.-]+)?$/.test(tag.trim());

/**
 * Porovná dve verzie. Vráti kladné číslo, ak je a novšia než b.
 * Predbežná verzia (1.0.0-beta) je staršia než vydaná (1.0.0).
 */
export const porovnajVerzie = (a: string | null | undefined, b: string | null | undefined): number => {
  const [cislaA, predA] = normalizujVerziu(a).split('-', 2);
  const [cislaB, predB] = normalizujVerziu(b).split('-', 2);
  const casti = (s: string) => s.split('.').map((x) => Number.parseInt(x, 10) || 0);
  const pa = casti(cislaA || '0');
  const pb = casti(cislaB || '0');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const rozdiel = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (rozdiel !== 0) return rozdiel;
  }
  if (predA && !predB) return -1;
  if (!predA && predB) return 1;
  if (predA && predB) return predA.localeCompare(predB, 'en', { numeric: true });
  return 0;
};
