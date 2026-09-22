// Umiestnenie: frontend/src/api/prehlad.ts
// Volania API pre úvodnú obrazovku.

import api from '../app/apiKlient';
import type { Statistiky, ClanokVoVypise, ZapasVoVypise } from './typy';

export const prehladApi = {
  /** Počty záznamov z databázy. */
  statistiky: (signal?: AbortSignal) =>
    api.ziskaj<Statistiky>('/stats', { signal, bezTokenu: true }),

  /** Najnovšie články pre panel na úvodnej obrazovke. */
  najnovsieClanky: (limit = 5, signal?: AbortSignal) =>
    api.ziskaj<ClanokVoVypise[]>('/articles', {
      parametre: { limit, page: 1 },
      signal,
      bezTokenu: true,
    }),

  /** Nadchádzajúce zápasy. */
  najblizsieZapasy: (limit = 4, signal?: AbortSignal) =>
    api.ziskaj<ZapasVoVypise[]>('/calendar/upcoming', {
      parametre: { limit },
      signal,
      bezTokenu: true,
    }),
};
