// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { API_BASE_URL } from '../config/api';
// frontend/src/services/calendarApi.ts
// API služba pre kalendár zápasov - FÁZA 4


// ===== INTERFACES =====

export interface CalendarMatch {
  id: number;
  nazov: string;
  datum_cas: string;
  miesto?: string;
  kolo?: string;
  status: string;
  vysledok: string;
  vitaz?: 'domaci' | 'hostia' | 'remiza' | 'neukonceny';
  liga?: {
    id: number;
    nazov: string;
    typ: string;
  };
  domaci_tim?: {
    id: number;
    nazov: string;
  };
  hostujuci_tim?: {
    id: number;
    nazov: string;
  };
  cas: string; // Formátovaný čas (HH:MM)
  datum: string; // Formátovaný dátum (DD.MM.YYYY)
  
  // Pre upcoming matches
  match_type?: 'upcoming' | 'without_result';
  actual_status?: string;
  needs_result?: boolean;
}

export interface MonthCalendarData {
  calendar: { [date: string]: CalendarMatch[] };
  month_info: {
    rok: number;
    mesiac: number;
    nazov_mesiaca: string;
    start_date: string;
    end_date: string;
  };
  total_matches: number;
  filters?: {
    liga_id?: string;
    tim_id?: string;
  };
}

export interface WeekCalendarData {
  calendar: { [date: string]: CalendarMatch[] };
  week_info: {
    week_start: string;
    week_end: string;
    week_number: number;
    target_date: string;
    start_date: string;
    end_date: string;
  };
  matches: CalendarMatch[];
  total_matches: number;
  filters?: {
    liga_id?: string;
    tim_id?: string;
  };
}

export interface UpcomingMatchesData {
  data: CalendarMatch[];
  count: number;
  breakdown: {
    upcoming: number;
    without_result: number;
  };
}


export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  /** Rozpad počtov pri nadchádzajúcich zápasoch - chodí vedľa `data`. */
  breakdown?: {
    upcoming: number;
    without_result: number;
  };
}

export interface CalendarFilters {
  liga_id?: number;
  tim_id?: number;
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// ===== CALENDAR API =====

export const calendarApi = {
  // GET /api/calendar/month/:rok/:mesiac - Mesačný kalendár
  getMonthCalendar: async (
    rok: number, 
    mesiac: number, 
    filters?: CalendarFilters
  ): Promise<ApiResponse<MonthCalendarData>> => {
    const searchParams = new URLSearchParams();
    
    if (filters?.liga_id) searchParams.append('liga_id', filters.liga_id.toString());
    if (filters?.tim_id) searchParams.append('tim_id', filters.tim_id.toString());

    const queryString = searchParams.toString();
    const endpoint = `/calendar/month/${rok}/${mesiac}${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<MonthCalendarData>(endpoint);
  },

  // GET /api/calendar/week/:rok/:mesiac/:den - Týždenný kalendár
  getWeekCalendar: async (
    rok: number,
    mesiac: number,
    den: number,
    filters?: CalendarFilters
  ): Promise<ApiResponse<WeekCalendarData>> => {
    const searchParams = new URLSearchParams();
    
    if (filters?.liga_id) searchParams.append('liga_id', filters.liga_id.toString());
    if (filters?.tim_id) searchParams.append('tim_id', filters.tim_id.toString());

    const queryString = searchParams.toString();
    const endpoint = `/calendar/week/${rok}/${mesiac}/${den}${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<WeekCalendarData>(endpoint);
  },

  // GET /api/calendar/upcoming - Nadchádzajúce zápasy
  getUpcomingMatches: async (
    filters?: CalendarFilters
  ): Promise<ApiResponse<UpcomingMatchesData>> => {
    const searchParams = new URLSearchParams();
    
    if (filters?.liga_id) searchParams.append('liga_id', filters.liga_id.toString());
    if (filters?.tim_id) searchParams.append('tim_id', filters.tim_id.toString());
    if (filters?.limit) searchParams.append('limit', filters.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = `/calendar/upcoming${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest<CalendarMatch[]>(endpoint);
    
    // Server vracia zoznam v `data` a rozpad počtov vedľa neho;
    // obrazovka ich chce pokope
    const zapasy = response.data ?? [];

    return {
      success: response.success,
      data: {
        data: zapasy,
        count: zapasy.length,
        breakdown: response.breakdown ?? {
          upcoming: zapasy.filter(m => m.match_type === 'upcoming').length,
          without_result: zapasy.filter(m => m.match_type === 'without_result').length
        }
      },
      message: response.message
    };
  },

  // Helper method pre získanie aktuálneho mesiaca
  getCurrentMonthCalendar: async (
    filters?: CalendarFilters
  ): Promise<ApiResponse<MonthCalendarData>> => {
    const now = new Date();
    return calendarApi.getMonthCalendar(now.getFullYear(), now.getMonth() + 1, filters);
  },

  // Helper method pre získanie aktuálneho týždňa
  getCurrentWeekCalendar: async (
    filters?: CalendarFilters
  ): Promise<ApiResponse<WeekCalendarData>> => {
    const now = new Date();
    return calendarApi.getWeekCalendar(
      now.getFullYear(), 
      now.getMonth() + 1, 
      now.getDate(), 
      filters
    );
  },

  // Helper method pre získanie mesiaca s offsetom
  getMonthWithOffset: async (
    offset: number, // -1 pre predchádzajúci, +1 pre nasledujúci
    filters?: CalendarFilters
  ): Promise<ApiResponse<MonthCalendarData>> => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return calendarApi.getMonthCalendar(
      targetDate.getFullYear(), 
      targetDate.getMonth() + 1, 
      filters
    );
  }
};