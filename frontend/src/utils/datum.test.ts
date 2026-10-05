// Umiestnenie: frontend/src/utils/datum.test.ts
// Časy zápasov sa ukladajú v UTC a zobrazujú v čase klubu (Bratislava)
// bez ohľadu na pásmo prehliadača - aj cez prechod letného času.

import { describe, it, expect } from 'vitest';
import { formatujCas, naVstupDatumCas, zoVstupuDatumCas } from './datum';

describe('čas klubu', () => {
  it('UTC v zime posunie o hodinu, v lete o dve', () => {
    expect(naVstupDatumCas('2026-01-15T14:30:00Z')).toBe('2026-01-15T15:30');
    expect(naVstupDatumCas('2026-07-01T15:00:00Z')).toBe('2026-07-01T17:00');
    expect(formatujCas('2026-07-01T15:00:00Z')).toBe('17:00');
  });

  it('formulár → UTC → formulár vráti rovnaký čas', () => {
    for (const vstup of ['2026-01-15T17:00', '2026-07-01T09:45', '2026-03-28T23:30', '2026-10-25T12:00']) {
      expect(naVstupDatumCas(zoVstupuDatumCas(vstup))).toBe(vstup);
    }
    expect(zoVstupuDatumCas('2026-01-15T17:00')).toBe('2026-01-15T16:00:00.000Z');
  });

  it('prázdna a neplatná hodnota dá prázdny text', () => {
    expect(naVstupDatumCas(null)).toBe('');
    expect(naVstupDatumCas('nezmysel')).toBe('');
    expect(formatujCas(undefined)).toBe('');
  });
});
