// Umiestnenie: frontend/src/utils/datum.ts
// Formátovanie dátumov a časov pre slovenské používateľské rozhranie.
//
// PREČO: backend ukladá a posiela časy v UTC (ISO 8601 s koncovkou Z).
// Prehliadač by ich formátoval podľa nastavenia počítača používateľa,
// takže návštevník s telefónom nastaveným na iné pásmo by videl nesprávny
// čas začiatku zápasu. Preto prepočet vždy vynucujeme na Europe/Bratislava,
// ktoré samo rieši prechod medzi letným a zimným časom.

// Časové pásmo klubu - jedno miesto pre prípadnú zmenu
const CASOVE_PASMO = 'Europe/Bratislava';

/**
 * Bezpečne prevedie vstup na Date. Vracia null pri neplatnej hodnote.
 */
const naDatum = (hodnota: string | Date | null | undefined): Date | null => {
  if (!hodnota) return null;
  const d = hodnota instanceof Date ? hodnota : new Date(hodnota);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Dátum v tvare 15. 3. 2026
 */
export const formatujDatum = (hodnota: string | Date | null | undefined): string => {
  const d = naDatum(hodnota);
  if (!d) return '';
  return d.toLocaleDateString('sk-SK', { timeZone: CASOVE_PASMO });
};

/**
 * Čas v tvare 15:30
 */
export const formatujCas = (hodnota: string | Date | null | undefined): string => {
  const d = naDatum(hodnota);
  if (!d) return '';
  return d.toLocaleTimeString('sk-SK', {
    timeZone: CASOVE_PASMO,
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Dátum aj čas v tvare 15. 3. 2026, 15:30
 */
export const formatujDatumCas = (hodnota: string | Date | null | undefined): string => {
  const d = naDatum(hodnota);
  if (!d) return '';
  return d.toLocaleString('sk-SK', {
    timeZone: CASOVE_PASMO,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Dlhý tvar s názvom dňa: sobota 15. marca 2026
 */
export const formatujDatumDlho = (hodnota: string | Date | null | undefined): string => {
  const d = naDatum(hodnota);
  if (!d) return '';
  return d.toLocaleDateString('sk-SK', {
    timeZone: CASOVE_PASMO,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Prevedie UTC dátum na hodnotu pre <input type="datetime-local">.
 * Input očakáva miestny čas bez označenia pásma vo formáte YYYY-MM-DDTHH:mm.
 */
export const naVstupDatumCas = (hodnota: string | Date | null | undefined): string => {
  const d = naDatum(hodnota);
  if (!d) return '';

  // Zložky času získame priamo v slovenskom pásme
  const casti = new Intl.DateTimeFormat('sv-SE', {
    timeZone: CASOVE_PASMO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  // Formát 'sv-SE' dáva "2026-03-15 15:30", input potrebuje "2026-03-15T15:30"
  return casti.replace(' ', 'T');
};

/**
 * Opak naVstupDatumCas: hodnotu z formulára ("2026-03-15T15:30") chápe
 * ako čas klubu (Europe/Bratislava) a vráti ISO reťazec v UTC.
 *
 * PREČO: new Date("2026-03-15T15:30") použije pásmo prehliadača. Keď
 * administrátor nie je v slovenskom pásme (dovolenka, server v cloude),
 * zápas zadaný na 17:00 sa uložil na iný čas, než aký sa potom zobrazil.
 */
export const zoVstupuDatumCas = (hodnota: string): string => {
  const zhoda = hodnota.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!zhoda) return new Date(hodnota).toISOString();
  const [, r, m, d, h, min] = zhoda.map(Number) as unknown as number[];
  const cielUtc = Date.UTC(r, m - 1, d, h, min);

  // Posun pásma zistíme z toho, ako daný okamih vyzerá v Bratislave.
  // Dva kroky stačia aj pri prechode letného času.
  let odhad = cielUtc;
  for (let i = 0; i < 2; i++) {
    const casti = new Intl.DateTimeFormat('sv-SE', {
      timeZone: CASOVE_PASMO,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(odhad));
    const [datum, cas] = casti.split(' ');
    const [rr, mm, dd] = datum.split('-').map(Number);
    const [hh, mi] = cas.split(':').map(Number);
    const zobrazeneUtc = Date.UTC(rr, mm - 1, dd, hh === 24 ? 0 : hh, mi);
    odhad += cielUtc - zobrazeneUtc;
  }
  return new Date(odhad).toISOString();
};
