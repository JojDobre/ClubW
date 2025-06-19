// frontend/src/services/matchesApi.ts
// API služba pre správu zápasov - FÁZA 4

const API_BASE_URL = 'http://localhost:3000/api';

// ===== INTERFACES =====

export interface Zapas {
  id: number;
  nazov: string;
  datum_cas: string;
  miesto?: string;
  kolo?: string;
  status: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  goly_domaci?: number;
  goly_hostia?: number;
  pocet_divakov?: number;
  poznamky?: string;
  video_url?: string;
  clanok_id?: number;
  fotogaleria_id?: number;
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;

  // Computed properties z backendu
  vysledok?: string; // napr. "2:1" alebo "-:-"
  vitaz?: 'domaci' | 'hostia' | 'remiza' | null;

  // Relačné objekty (ak sú includované)
  liga?: {
    id: number;
    nazov: string;
    sezona: string;
    typ: string;
  };
  domaci_tim?: {
    id: number;
    nazov: string;
    vekova_kategoria?: string;
  };
  hostujuci_tim?: {
    id: number;
    nazov: string;
    vekova_kategoria?: string;
  };

  // OPRAVENÉ: Custom properties pre tímy a ligy ktoré nie sú v databáze
  domaci_tim_nazov?: string; // pre custom tímy
  hostujuci_tim_nazov?: string; // pre custom tímy
  liga_nazov?: string; // pre custom ligy
}

export interface Liga {
  id: number;
  nazov: string;
  sezona: string;
  typ: 'sutaz' | 'pohar' | 'priatelska';
  aktivity: boolean;
}

export interface Team {
  id: number;
  nazov: string;
  vekova_kategoria: string;
  aktivity: boolean;
}

export interface ZapasFormData {
  nazov?: string;
  datum_cas: string;
  miesto?: string;
  kolo?: string;
  status: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  goly_domaci?: number;
  goly_hostia?: number;
  pocet_divakov?: number;
  poznamky?: string;
  video_url?: string;
  clanok_id?: number;
  fotogaleria_id?: number;

  // OPRAVENÉ: Tím handling - buď ID alebo custom názov
  domaci_tim_id?: number;
  domaci_tim_nazov?: string; // custom tím
  hostujuci_tim_id?: number; 
  hostujuci_tim_nazov?: string; // custom tím

  // OPRAVENÉ: Liga handling - buď ID alebo custom názov
  liga_id?: number;
  liga_nazov?: string; // custom liga
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  errors?: string[];
}

export interface MatchFilters {
  liga_id?: number;
  tim_id?: number;
  status?: string;
  od_datumu?: string;
  do_datumu?: string;
  search?: string;
  include_details?: boolean;
  page?: number;
  limit?: number;
}

// ===== API HELPERS =====

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = localStorage.getItem('clubw_token');
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  };

  console.log('=== API REQUEST DEBUG ===');
  console.log('Endpoint:', `${API_BASE_URL}${endpoint}`);
  console.log('Method:', config.method || 'GET');
  console.log('Body:', config.body);
  console.log('Headers:', config.headers);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log('=== API ERROR ===');
    console.log('Status:', response.status);
    console.log('Error data:', errorData);
    
    // Lepšie zobrazenie chybových hlášok
    let errorMessage = `HTTP error! status: ${response.status}`;
    if (errorData.message) {
      errorMessage = errorData.message;
    }
    if (errorData.errors && Array.isArray(errorData.errors)) {
      errorMessage += ': ' + errorData.errors.join(', ');
    }
    
    throw new Error(errorMessage);
  }

  const responseData = await response.json();
  console.log('=== API SUCCESS ===');
  console.log('Response:', responseData);
  
  return responseData;
};

// ===== MATCHES API =====

export const matchesApi = {
  // GET /api/matches - Získať zoznam zápasov
  getMatches: async (filters?: MatchFilters): Promise<ApiResponse<Zapas[]>> => {
    const searchParams = new URLSearchParams();
    
    if (filters?.liga_id) searchParams.append('liga_id', filters.liga_id.toString());
    if (filters?.tim_id) searchParams.append('tim_id', filters.tim_id.toString());
    if (filters?.status) searchParams.append('status', filters.status);
    if (filters?.od_datumu) searchParams.append('od_datumu', filters.od_datumu);
    if (filters?.do_datumu) searchParams.append('do_datumu', filters.do_datumu);
    if (filters?.search) searchParams.append('search', filters.search);
    if (filters?.include_details) searchParams.append('include_details', 'true');
    if (filters?.page) searchParams.append('page', filters.page.toString());
    if (filters?.limit) searchParams.append('limit', filters.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/matches?${queryString}` : '/matches';
    
    return apiRequest<Zapas[]>(endpoint);
  },

  // GET /api/matches/:id - Získať detail zápasu
  getMatchById: async (id: number): Promise<ApiResponse<Zapas>> => {
    return apiRequest<Zapas>(`/matches/${id}`);
  },

  // POST /api/matches - Vytvoriť nový zápas
  createMatch: async (matchData: ZapasFormData): Promise<ApiResponse<Zapas>> => {
    return apiRequest<Zapas>('/matches', {
      method: 'POST',
      body: JSON.stringify(matchData),
    });
  },

  // PUT /api/matches/:id - Aktualizovať zápas
  updateMatch: async (id: number, matchData: Partial<ZapasFormData>): Promise<ApiResponse<Zapas>> => {
    return apiRequest<Zapas>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(matchData),
    });
  },

  // DELETE /api/matches/:id - Vymazať zápas
  deleteMatch: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/matches/${id}`, {
      method: 'DELETE',
    });
  },

  // Bulk delete
  deleteMatches: async (ids: number[]): Promise<void> => {
    const promises = ids.map(id => 
      apiRequest<{ message: string }>(`/matches/${id}`, {
        method: 'DELETE',
      })
    );
    await Promise.all(promises);
  },

  // GET /api/calendar/upcoming - Nadchádzajúce zápasy
  getUpcomingMatches: async (limit: number = 3): Promise<ApiResponse<Zapas[]>> => {
    return apiRequest<Zapas[]>(`/calendar/upcoming?limit=${limit}`);
  },

  // Helper method pre získanie zápasov bez výsledku
  getMatchesWithoutResult: async (): Promise<ApiResponse<Zapas[]>> => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    return apiRequest<Zapas[]>('/matches', {
      method: 'GET'
    }).then(response => {
      if (response.success) {
        // Filter zápasov ktoré sú ukončené ale nemajú výsledok
        const filteredMatches = response.data.filter(zapas => {
          const matchDate = new Date(zapas.datum_cas);
          return matchDate < twoHoursAgo && 
                 zapas.status === 'ukonceny' && 
                 (zapas.goly_domaci === null || zapas.goly_hostia === null);
        });
        
        return {
          ...response,
          data: filteredMatches,
          count: filteredMatches.length
        };
      }
      return response;
    });
  },

  // Helper method pre štatistiky tohto mesiaca
  getThisMonthStats: async (): Promise<ApiResponse<{
    total: number;
    naplanovane: number;
    ukoncene: number;
    bez_vysledku: number;
  }>> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const response = await apiRequest<Zapas[]>('/matches', {
      method: 'GET'
    });
    
    if (response.success) {
      const monthMatches = response.data.filter(zapas => {
        const matchDate = new Date(zapas.datum_cas);
        return matchDate >= startOfMonth && matchDate <= endOfMonth;
      });
      
      const stats = {
        total: monthMatches.length,
        naplanovane: monthMatches.filter(z => z.status === 'naplanovany').length,
        ukoncene: monthMatches.filter(z => z.status === 'ukonceny').length,
        bez_vysledku: monthMatches.filter(z => 
          z.status === 'ukonceny' && 
          (z.goly_domaci === null || z.goly_hostia === null)
        ).length
      };
      
      return {
        success: true,
        data: stats,
        message: 'Štatistiky tohto mesiaca'
      };
    }
    
    throw new Error('Chyba pri načítaní štatistík');
  }
};

// ===== LEAGUES API (helper pre zápasy) =====

export const leaguesApi = {
  // GET /api/leagues - Získať zoznam líg pre dropdown
  getLeagues: async (): Promise<ApiResponse<Liga[]>> => {
    return apiRequest<Liga[]>('/leagues?include_stats=false');
  },
};

// ===== TEAMS API (helper pre zápasy) =====

export const teamsApi = {
  // GET /api/teams - Získať zoznam tímov pre dropdown
  getTeams: async (): Promise<ApiResponse<Team[]>> => {
    return apiRequest<Team[]>('/teams?include_stats=false');
  },
};