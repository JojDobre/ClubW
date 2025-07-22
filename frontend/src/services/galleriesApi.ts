// frontend/src/services/galleriesApi.ts
// API service pre komunikáciu s backend Galleries API

const API_BASE_URL = 'http://localhost:3000/api';

// ===== INTERFACE DEFINITIONS =====
export interface Gallery {
  id: number;
  nazov: string;
  popis?: string | null;
  slug: string;
  tim_id?: number | null;
  clanok_id?: number | null;
  zapas_id?: number | null;
  pocet_obrazkov: number;
  nahladovy_obrazok?: string | null;
  typ_priradenia: 'tim' | 'clanok' | 'zapas' | 'volna';
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

export interface GalleryImage {
  id: number;
  galeria_id: number;
  nazov: string;
  alt_text?: string | null;
  cesta_suboru: string;
  nahladovy_maly?: string | null;
  nahladovy_stredny?: string | null;
  velkost_suboru: number;
  typ_suboru: string;
  sirka?: number | null;
  vyska?: number | null;
  poradie: number;
  je_nahladovy: boolean;
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

export interface Team {
  id: number;
  nazov: string;
  slug: string;
  full_name: string;
  typ: 'muzi' | 'zeny' | 'mladez';
  vekova_kategoria: string;
  popis?: string;
  logo?: string;
  aktivity: boolean;
}

export interface Article {
  id: number;
  nazov: string;
  slug: string;
  kategoria_nazov?: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publikovany_datum?: string;
}

export interface Match {
  id: number;
  nazov: string;
  datum_cas: string;
  liga_nazov?: string;
  domaci_tim_nazov?: string;
  hostujuci_tim_nazov?: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  errors?: string[] | Record<string, string[]>;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ===== HELPER FUNCTIONS =====

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

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error(`API Request failed [${options.method || 'GET'}] ${endpoint}:`, error);
    throw error;
  }
};

// Helper function pre upload súborov
const uploadRequest = async <T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> => {
  const token = localStorage.getItem('clubw_token');
  
  const config: RequestInit = {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: formData,
    credentials: 'include',
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error(`Upload Request failed ${endpoint}:`, error);
    throw error;
  }
};

// ===== GALLERIES API =====

export const galleriesApi = {
  // GET /api/admin/galleries - Získať zoznam galérií pre admin
  getAdminGalleries: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    typ_priradenia?: string;
  }): Promise<ApiResponse<{
    galerie: Gallery[];
    pagination: PaginationData;
  }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.typ_priradenia) searchParams.append('typ_priradenia', params.typ_priradenia);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/admin/galleries?${queryString}` : '/admin/galleries';
    
    return apiRequest<{
      galerie: Gallery[];
      pagination: PaginationData;
    }>(endpoint);
  },

  // GET /api/galleries - Získať verejné galérie
  getPublicGalleries: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    typ_priradenia?: string;
  }): Promise<ApiResponse<{
    galerie: Gallery[];
    pagination: PaginationData;
  }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.typ_priradenia) searchParams.append('typ_priradenia', params.typ_priradenia);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/galleries?${queryString}` : '/galleries';
    
    return apiRequest<{
      galerie: Gallery[];
      pagination: PaginationData;
    }>(endpoint);
  },

  // GET /api/galleries/:id - Získať detail galérie
  getGalleryById: async (id: number): Promise<ApiResponse<{
    galeria: Gallery & { obrazky: GalleryImage[] };
  }>> => {
    return apiRequest<{
      galeria: Gallery & { obrazky: GalleryImage[] };
    }>(`/galleries/${id}`);
  },

  // POST /api/admin/galleries - Vytvoriť novú galériu
  createGallery: async (galleryData: {
    nazov: string;
    slug: string;
    popis?: string;
    typ_priradenia: 'tim' | 'clanok' | 'zapas' | 'volna';
    tim_id?: number;
    clanok_id?: number;
    zapas_id?: number;
  }): Promise<ApiResponse<Gallery>> => {
    return apiRequest<Gallery>('/admin/galleries', {
      method: 'POST',
      body: JSON.stringify(galleryData),
    });
  },

  // PUT /api/admin/galleries/:id - Aktualizovať galériu
  updateGallery: async (id: number, galleryData: {
    nazov?: string;
    slug?: string;
    popis?: string;
    typ_priradenia?: 'tim' | 'clanok' | 'zapas' | 'volna';
    tim_id?: number;
    clanok_id?: number;
    zapas_id?: number;
    aktivity?: boolean;
  }): Promise<ApiResponse<Gallery>> => {
    return apiRequest<Gallery>(`/admin/galleries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(galleryData),
    });
  },

  // DELETE /api/admin/galleries/:id - Vymazať galériu
  deleteGallery: async (id: number): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/admin/galleries/${id}`, {
      method: 'DELETE',
    });
  },

  // POST /api/admin/galleries/:id/images - Upload obrázkov do galérie
  uploadImages: async (galleryId: number, files: File[]): Promise<ApiResponse<{
    galeria_id: number;
    uploaded_images: GalleryImage[];
    uploaded_count: number;
    errors?: any[];
    total_images: number;
  }>> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    return uploadRequest<{
      galeria_id: number;
      uploaded_images: GalleryImage[];
      uploaded_count: number;
      errors?: any[];
      total_images: number;
    }>(`/admin/galleries/${galleryId}/images`, formData);
  },

  // GET /api/admin/galleries/:id/images - Získať obrázky galérie
  getGalleryImages: async (galleryId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    galeria: {
      id: number;
      nazov: string;
      pocet_obrazkov: number;
    };
    obrazky: GalleryImage[];
    pagination: PaginationData;
  }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString 
      ? `/admin/galleries/${galleryId}/images?${queryString}` 
      : `/admin/galleries/${galleryId}/images`;
    
    return apiRequest<{
      galeria: {
        id: number;
        nazov: string;
        pocet_obrazkov: number;
      };
      obrazky: GalleryImage[];
      pagination: PaginationData;
    }>(endpoint);
  },

  // DELETE /api/admin/galleries/:galleryId/images/:imageId - Vymazať obrázok
  deleteImage: async (galleryId: number, imageId: number): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/admin/galleries/${galleryId}/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  // PUT /api/admin/galleries/:galleryId/images/:imageId - Aktualizovať obrázok
  updateImage: async (galleryId: number, imageId: number, imageData: {
    nazov?: string;
    alt_text?: string;
    poradie?: number;
    je_nahladovy?: boolean;
  }): Promise<ApiResponse<GalleryImage>> => {
    return apiRequest<GalleryImage>(`/admin/galleries/${galleryId}/images/${imageId}`, {
      method: 'PUT',
      body: JSON.stringify(imageData),
    });
  }
};

// ===== TEAMS API =====

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
  getTeamById: async (id: number): Promise<ApiResponse<Team>> => {
    return apiRequest<Team>(`/teams/${id}`);
  }
};

// ===== ARTICLES API =====

export const articlesApi = {
  // GET /api/articles - Získať zoznam článkov
  getArticles: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<Article[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/articles?${queryString}` : '/articles';
    
    return apiRequest<Article[]>(endpoint);
  },

  // GET /api/articles/:id - Získať detail článku
  getArticleById: async (id: number): Promise<ApiResponse<Article>> => {
    return apiRequest<Article>(`/articles/${id}`);
  }
};

// ===== MATCHES API (pre budúcnosť) =====

export const matchesApi = {
  // GET /api/matches - Získať zoznam zápasov
  getMatches: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    datum_od?: string;
    datum_do?: string;
  }): Promise<ApiResponse<Match[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.datum_od) searchParams.append('datum_od', params.datum_od);
    if (params?.datum_do) searchParams.append('datum_do', params.datum_do);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/matches?${queryString}` : '/matches';
    
    return apiRequest<Match[]>(endpoint);
  },

  // GET /api/matches/:id - Získať detail zápasu
  getMatchById: async (id: number): Promise<ApiResponse<Match>> => {
    return apiRequest<Match>(`/matches/${id}`);
  }
};

// Export všetkých API services
export default {
  galleries: galleriesApi,
  teams: teamsApi,
  articles: articlesApi,
  matches: matchesApi
};