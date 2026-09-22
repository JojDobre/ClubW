// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { API_BASE_URL } from '../config/api';
import type { Strankovanie } from '../api/typy';
// frontend/src/services/ligaApi.ts
// API služba pre správu líg - kompatibilná s backend controllerom

// ===== INTERFACE PRE LIGY (podľa backend modelu) =====

export interface Liga {
  id: number;
  nazov: string;
  sezona: string;
  typ: 'sutaz' | 'pohar' | 'priatelska';
  popis?: string | null;
  external_widget_url?: string | null;
  logo?: string | null;
  farba?: string | null;
  poradie: number;
  aktivity: boolean;
  
  // Rozšírené polia z backend modelu
  datum_start?: string | null;
  datum_koniec?: string | null;
  format: 'tabulka' | 'turnaj' | 'kombinovany';
  pocet_timov?: number | null;
  body_za_vitazstvo: number;
  body_za_remizy: number;
  body_za_prehru: number;
  auto_update_tabulka: boolean;
  zobrazit_formu: boolean;
  min_zapasov: number;
  turnaj_typ?: 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups_playoff' | null;
  turnaj_pocet_postupujucich?: number | null;
  posledny_import?: string | null;
  external_sync: boolean;
  
  // Helper polia z backend modelu
  full_name: string;
  typ_name: string;
  format_name: string;
  turnaj_typ_name?: string;
  has_external_widget: boolean;
  status: 'upcoming' | 'active' | 'finished' | 'inactive';
  is_active_by_date: boolean;
  has_auto_update: boolean;
  has_custom_scoring: boolean;
  
  vytvoreny: string;
  aktualizovany: string;
}

// Interface pre vytvorenie/editáciu ligy
export interface LigaCreateData {
  nazov: string;
  sezona: string;
  typ: 'sutaz' | 'pohar' | 'priatelska';
  popis?: string;
  external_widget_url?: string;
  logo?: string;
  farba?: string;
  poradie?: number;
  
  // Rozšírené polia
  datum_start?: string;
  datum_koniec?: string;
  format?: 'tabulka' | 'turnaj' | 'kombinovany';
  pocet_timov?: number;
  body_za_vitazstvo?: number;
  body_za_remizy?: number;
  body_za_prehru?: number;
  auto_update_tabulka?: boolean;
  zobrazit_formu?: boolean;
  min_zapasov?: number;
  turnaj_typ?: 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups_playoff';
  turnaj_pocet_postupujucich?: number;
  external_sync?: boolean;
  
  // Pre filtrovanie podľa tímu
  tim_id?: number;
}

// Interface pre tímy (pre filtrovanie)
export interface Team {
  id: number;
  nazov: string;
  typ: 'muzi' | 'zeny' | 'mladez';
  vekova_kategoria: string;
  popis?: string;
  logo?: string;
  farba_prva?: string;
  farba_druha?: string;
  poradie: number;
  aktivity: boolean;
}

// Interface pre API response
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  /** Stránkovanie chodí vedľa `data`, nie v ňom. */
  pagination?: Strankovanie;
}

// Interface pre query parametre
interface GetLeaguesParams {
  typ?: 'sutaz' | 'pohar' | 'priatelska';
  format?: 'tabulka' | 'turnaj' | 'kombinovany';
  status?: 'upcoming' | 'active' | 'finished';
  search?: string;
  include_stats?: 'true' | 'false';
  include_table?: 'true' | 'false';
  limit?: number;
  offset?: number;
  tim_id?: number; // Pre filtrovanie podľa tímu
}

// ===== FETCH HELPER =====

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      success: false,
      message: `HTTP Error ${response.status}: ${response.statusText}`
    }));
    throw new Error(errorData.message || `HTTP Error ${response.status}`);
  }
  
  return await response.json();
};

// ===== API ENDPOINTS =====

export const ligaApi = {
  // GET /api/leagues - Zoznam líg s rozšírenými filtrami
  getLeagues: async (params: GetLeaguesParams = {}): Promise<ApiResponse<Liga[]>> => {
    const searchParams = new URLSearchParams();
    
    // Pridanie parametrov do query string
    if (params.typ) searchParams.append('typ', params.typ);
    if (params.format) searchParams.append('format', params.format);
    if (params.status) searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.include_stats) searchParams.append('include_stats', params.include_stats);
    if (params.include_table) searchParams.append('include_table', params.include_table);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    if (params.tim_id) searchParams.append('tim_id', params.tim_id.toString());
    
    const response = await fetch(`${API_BASE_URL}/leagues?${searchParams}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<Liga[]>(response);
  },

  // GET /api/leagues/:id - Detail ligy
  getLeague: async (
    id: number, 
    options: {
      include_table?: boolean;
      include_tournament?: boolean;
      include_stats?: boolean;
      include_matches?: boolean;
    } = {}
  ): Promise<ApiResponse<Liga>> => {
    const searchParams = new URLSearchParams();
    
    if (options.include_table) searchParams.append('include_table', 'true');
    if (options.include_tournament) searchParams.append('include_tournament', 'true'); 
    if (options.include_stats) searchParams.append('include_stats', 'true');
    if (options.include_matches) searchParams.append('include_matches', 'true');
    
    const response = await fetch(`${API_BASE_URL}/leagues/${id}?${searchParams}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<Liga>(response);
  },

  // POST /api/leagues - Vytvorenie novej ligy
  createLeague: async (data: LigaCreateData): Promise<ApiResponse<Liga>> => {
    const response = await fetch(`${API_BASE_URL}/leagues`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse<Liga>(response);
  },

  // PUT /api/leagues/:id - Aktualizácia ligy
  updateLeague: async (id: number, data: Partial<LigaCreateData>): Promise<ApiResponse<Liga>> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse<Liga>(response);
  },

  // DELETE /api/leagues/:id - Soft delete ligy
  deleteLeague: async (id: number): Promise<ApiResponse<{}>> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<{}>(response);
  },

  // ===== ROZŠÍRENÉ ENDPOINTY PRE TABUĽKY A TURNAJE =====

  // GET /api/leagues/:id/table - Tabuľka ligy
  getLeagueTable: async (id: number, includeInactive = false): Promise<ApiResponse<any[]>> => {
    const searchParams = new URLSearchParams();
    if (includeInactive) searchParams.append('include_inactive', 'true');
    
    const response = await fetch(`${API_BASE_URL}/leagues/${id}/table?${searchParams}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<any[]>(response);
  },

  // POST /api/leagues/:id/table/recalculate - Prepočítanie tabuľky
  recalculateLeagueTable: async (id: number): Promise<ApiResponse<any[]>> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}/table/recalculate`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<any[]>(response);
  },

  // PUT /api/leagues/:id/table - Manuálna úprava tabuľky
  updateLeagueTable: async (id: number, tableData: any[]): Promise<ApiResponse<any[]>> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}/table`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tabulka_data: tableData }),
    });

    return handleResponse<any[]>(response);
  },

  // GET /api/leagues/:id/tournament - Turnaj ligy
  getLeagueTournament: async (id: number): Promise<ApiResponse<any>> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}/tournament`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<any>(response);
  },

  // GET /api/leagues/:id/stats - Štatistiky ligy
  getLeagueStats: async (id: number): Promise<ApiResponse<any>> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}/stats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<any>(response);
  },

  // GET /api/leagues/:id/overview - Kompletný prehľad ligy
  getLeagueOverview: async (id: number): Promise<ApiResponse<any>> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}/overview`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<any>(response);
  },

  // ===== IMPORT/EXPORT ENDPOINTY =====

  // GET /api/leagues/:id/export - Export tabuľky
  exportLeagueTable: async (id: number, format: 'json' | 'csv' = 'json'): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}/export?format=${format}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return await response.text();
  },

  // POST /api/leagues/:id/import - Import tabuľky
  importLeagueTable: async (id: number, data: any[], format: 'json' | 'csv' = 'json'): Promise<ApiResponse<any[]>> => {
    const response = await fetch(`${API_BASE_URL}/leagues/${id}/import`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, format }),
    });

    return handleResponse<any[]>(response);
  }
};

// ===== HELPER FUNKCIE =====

// Získanie dostupných sezón z líg
export const getAvailableSeasons = (ligy: Liga[]): string[] => {
  const seasons = Array.from(new Set(ligy.map(liga => liga.sezona)));
  return seasons.sort().reverse(); // Najnovšie sezóny hore
};

// Formátovanie názvu typu ligy
export const formatTypLigy = (typ: string): string => {
  const typy = {
    'sutaz': 'Súťaž',
    'pohar': 'Pohár',
    'priatelska': 'Priateľská'
  };
  return typy[typ as keyof typeof typy] || typ;
};

// Formátovanie názvu formátu ligy
export const formatFormatLigy = (format: string): string => {
  const formaty = {
    'tabulka': 'Liga (tabuľka)',
    'turnaj': 'Turnaj (vyraďovačka)', 
    'kombinovany': 'Kombinovaný (skupiny + playoff)'
  };
  return formaty[format as keyof typeof formaty] || format;
};

// Formátovanie statusu ligy
export const formatStatusLigy = (status: string): { text: string; color: string } => {
  const statusy = {
    'upcoming': { text: 'Pripravuje sa', color: '#f59e0b' },
    'active': { text: 'Prebieha', color: '#10b981' },
    'finished': { text: 'Ukončená', color: '#6b7280' },
    'inactive': { text: 'Neaktívna', color: '#ef4444' }
  };
  return statusy[status as keyof typeof statusy] || { text: status, color: '#6b7280' };
};

// Formátovanie dátumu
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'Neurčené';
  try {
    return new Date(dateString).toLocaleDateString('sk-SK');
  } catch {
    return 'Neplatný dátum';
  }
};

// Formátovanie obdobia (od-do)
export const formatObdobie = (datum_start?: string | null, datum_koniec?: string | null): string => {
  if (!datum_start && !datum_koniec) return 'Neurčené';
  if (!datum_start) return `do ${formatDate(datum_koniec)}`;
  if (!datum_koniec) return `od ${formatDate(datum_start)}`;
  return `${formatDate(datum_start)} - ${formatDate(datum_koniec)}`;
};

export default ligaApi;