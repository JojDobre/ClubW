// frontend/src/services/teamsApi.ts
// OPRAVENÉ API service pre komunikáciu s backend Teams API

const API_BASE_URL = 'http://localhost:3000/api';

// OPRAVENÉ Interfaces pre Teams API
export interface Team {
  id: number;
  nazov: string;
  slug: string;
  typ: 'muzi' | 'zeny' | 'mladez';
  vekova_kategoria: string;
  popis?: string;
  logo?: string;
  farba_prva?: string;
  farba_druha?: string;
  poradie: number;
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
  
  // Vypočítané hodnoty
  full_name: string;
  
  // OPRAVENÉ: Štatistiky sa vracajú priamo na úrovni objektu (nie vnútri stats)
  pocet_hracov?: number;         // Backend vracia tieto hodnoty priamo
  pocet_realizacny_tim?: number; // Backend vracia tieto hodnoty priamo
  
  // Voliteľné - ak sú includované
  hraci?: Player[];
  realizacny_tim?: Staff[];
}

export interface Player {
  id: number;
  meno: string;
  priezvisko: string;
  datum_narodenia: string;
  cislo_dresu?: number;
  pozicia: string;
  narodnost?: string;
  vaha?: number;
  vyska?: number;
  fotka?: string;
  tim_id: number;
  aktivity: boolean;
  poznamky?: string;
  vytvoreny: string;
  aktualizovany: string;
  // Vypočítané hodnoty
  full_name: string;
  vek: number;
  // Voliteľné - ak je includovaný
  tim?: Team;
}

export interface Staff {
  id: number;
  meno: string;
  priezvisko: string;
  funkcia: string;
  email?: string;
  telefon?: string;
  datum_narodenia?: string;
  kvalifikacia?: string;
  fotka?: string;
  tim_id?: number;
  aktivity: boolean;
  poznamky?: string;
  poradie: number;
  vytvoreny: string;
  aktualizovany: string;
  // Vypočítané hodnoty
  full_name: string;
  vek?: number;
  kontakt: {
    email?: string;
    telefon?: string;
  };
  ma_kontakt: boolean;
  // Voliteľné - ak je includovaný
  tim?: Team;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  errors?: string[];
}

// Helper function pre API requesty s autentifikáciou
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = localStorage.getItem('clubw_token');
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Pridáme autentifikáciu len ak je token dostupný
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// =====  TEAMS API =====

export const teamsApi = {
  // GET /api/teams - Získať zoznam tímov
  getTeams: async (params?: {
    typ?: string;
    search?: string;
    include_stats?: boolean;
  }): Promise<ApiResponse<Team[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.typ) searchParams.append('typ', params.typ);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.include_stats) searchParams.append('include_stats', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/teams?${queryString}` : '/teams';
    
    return apiRequest<Team[]>(endpoint);
  },

  // GET /api/teams/:id - Získať detail tímu
  getTeamById: async (
    id: number,
    includeData?: {
      include_players?: boolean;
      include_staff?: boolean;
    }
  ): Promise<ApiResponse<Team>> => {
    const searchParams = new URLSearchParams();
    if (includeData?.include_players) searchParams.append('include_players', 'true');
    if (includeData?.include_staff) searchParams.append('include_staff', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/teams/${id}?${queryString}` : `/teams/${id}`;
    
    return apiRequest<Team>(endpoint);
  },

  // GET /api/teams/:id/players - Získať hráčov tímu
  getTeamPlayers: async (
    id: number,
    pozicia?: string
  ): Promise<ApiResponse<{ tim: Team; hraci: Player[] }>> => {
    const searchParams = new URLSearchParams();
    if (pozicia) searchParams.append('pozicia', pozicia);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/teams/${id}/players?${queryString}` : `/teams/${id}/players`;
    
    return apiRequest<{ tim: Team; hraci: Player[] }>(endpoint);
  },

  // GET /api/teams/:id/staff - Získať realizačný tím
  getTeamStaff: async (
    id: number,
    funkcia?: string
  ): Promise<ApiResponse<{ tim: Team; realizacny_tim: Staff[] }>> => {
    const searchParams = new URLSearchParams();
    if (funkcia) searchParams.append('funkcia', funkcia);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/teams/${id}/staff?${queryString}` : `/teams/${id}/staff`;
    
    return apiRequest<{ tim: Team; realizacny_tim: Staff[] }>(endpoint);
  },

  // POST /api/teams - Vytvoriť nový tím
  createTeam: async (teamData: {
    nazov: string;
    typ: 'muzi' | 'zeny' | 'mladez';
    vekova_kategoria: string;
    popis?: string;
    logo?: string;
    farba_prva?: string;
    farba_druha?: string;
    poradie?: number;
  }): Promise<ApiResponse<Team>> => {
    return apiRequest<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  },

  // PUT /api/teams/:id - Aktualizovať tím
  updateTeam: async (id: number, teamData: {
    nazov?: string;
    typ?: 'muzi' | 'zeny' | 'mladez';
    vekova_kategoria?: string;
    popis?: string;
    logo?: string;
    farba_prva?: string;
    farba_druha?: string;
    poradie?: number;
  }): Promise<ApiResponse<Team>> => {
    return apiRequest<Team>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });
  },

  // DELETE /api/teams/:id - Vymazať tím
  deleteTeam: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/teams/${id}`, {
      method: 'DELETE',
    });
  },
};

// =====  PLAYERS API =====

export const playersApi = {
  // GET /api/players - Získať zoznam hráčov
  getPlayers: async (params?: {
    tim_id?: number;
    pozicia?: string;
    search?: string;
    include_team?: boolean;
  }): Promise<ApiResponse<Player[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.tim_id) searchParams.append('tim_id', params.tim_id.toString());
    if (params?.pozicia) searchParams.append('pozicia', params.pozicia);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.include_team) searchParams.append('include_team', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/players?${queryString}` : '/players';
    
    return apiRequest<Player[]>(endpoint);
  },

  // GET /api/players/:id - Získať detail hráča
  getPlayerById: async (
    id: number,
    include_team?: boolean
  ): Promise<ApiResponse<Player>> => {
    const searchParams = new URLSearchParams();
    if (include_team) searchParams.append('include_team', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/players/${id}?${queryString}` : `/players/${id}`;
    
    return apiRequest<Player>(endpoint);
  },

  // POST /api/players - Vytvoriť nového hráča
  createPlayer: async (playerData: {
    meno: string;
    priezvisko: string;
    datum_narodenia: string;
    pozicia: string;
    tim_id: number;
    cislo_dresu?: number;
    narodnost?: string;
    vaha?: number;
    vyska?: number;
    fotka?: string;
    poznamky?: string;
  }): Promise<ApiResponse<Player>> => {
    return apiRequest<Player>('/players', {
      method: 'POST',
      body: JSON.stringify(playerData),
    });
  },

  // PUT /api/players/:id - Aktualizovať hráča
  updatePlayer: async (id: number, playerData: {
    meno?: string;
    priezvisko?: string;
    datum_narodenia?: string;
    pozicia?: string;
    tim_id?: number;
    cislo_dresu?: number;
    narodnost?: string;
    vaha?: number;
    vyska?: number;
    fotka?: string;
    poznamky?: string;
  }): Promise<ApiResponse<Player>> => {
    return apiRequest<Player>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(playerData),
    });
  },

  // DELETE /api/players/:id - Vymazať hráča
  deletePlayer: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/players/${id}`, {
      method: 'DELETE',
    });
  },
};

// =====  STAFF API =====

export const staffApi = {
  // GET /api/staff - Získať zoznam realizačného tímu
  getStaff: async (params?: {
    tim_id?: number;
    funkcia?: string;
    search?: string;
    include_team?: boolean;
    klubovi?: boolean;
  }): Promise<ApiResponse<Staff[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.tim_id) searchParams.append('tim_id', params.tim_id.toString());
    if (params?.funkcia) searchParams.append('funkcia', params.funkcia);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.include_team) searchParams.append('include_team', 'true');
    if (params?.klubovi) searchParams.append('klubovi', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/staff?${queryString}` : '/staff';
    
    return apiRequest<Staff[]>(endpoint);
  },

  // GET /api/staff/:id - Získať detail člena realizačného tímu
  getStaffById: async (
    id: number,
    include_team?: boolean
  ): Promise<ApiResponse<Staff>> => {
    const searchParams = new URLSearchParams();
    if (include_team) searchParams.append('include_team', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/staff/${id}?${queryString}` : `/staff/${id}`;
    
    return apiRequest<Staff>(endpoint);
  },

  // POST /api/staff - Vytvoriť nového člena realizačného tímu
  createStaff: async (staffData: {
    meno: string;
    priezvisko: string;
    funkcia: string;
    email?: string;
    telefon?: string;
    datum_narodenia?: string;
    kvalifikacia?: string;
    fotka?: string;
    tim_id?: number;
    poznamky?: string;
    poradie?: number;
  }): Promise<ApiResponse<Staff>> => {
    return apiRequest<Staff>('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  },

  // PUT /api/staff/:id - Aktualizovať člena realizačného tímu
  updateStaff: async (id: number, staffData: {
    meno?: string;
    priezvisko?: string;
    funkcia?: string;
    email?: string;
    telefon?: string;
    datum_narodenia?: string;
    kvalifikacia?: string;
    fotka?: string;
    tim_id?: number;
    poznamky?: string;
    poradie?: number;
  }): Promise<ApiResponse<Staff>> => {
    return apiRequest<Staff>(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    });
  },

  // DELETE /api/staff/:id - Vymazať člena realizačného tímu
  deleteStaff: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/staff/${id}`, {
      method: 'DELETE',
    });
  },
};