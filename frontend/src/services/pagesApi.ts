// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { API_BASE_URL } from '../config/api';
// frontend/src/services/pagesApi.ts
// API služba pre správu stránok (FÁZA 5)


// ===== INTERFACES =====

export interface Page {
  id: number;
  nazov: string;
  obsah: string;
  slug: string;
  v_menu: boolean;
  poradie_menu: number;
  meta_title?: string;
  meta_description?: string;
  publikovany: boolean;
  vytvoreny: string;
  aktualizovany: string;
  // Helper fields z backendu
  url: string;
  excerpt: string;
  word_count: number;
  is_published: boolean;
  is_in_menu: boolean;
}

export interface PageFormData {
  nazov: string;
  obsah: string;
  slug?: string;
  v_menu: boolean;
  poradie_menu?: number;
  publikovany: boolean;
  meta_title?: string;
  meta_description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PagesListResponse {
  pages: Page[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  filters?: {
    search: string;
    status: string;
    in_menu: string;
    sort_by: string;
    sort_order: string;
  };
}

export interface MenuPagesResponse {
  pages: Array<{
    id: number;
    nazov: string;
    slug: string;
    url: string;
    poradie_menu: number;
  }>;
}

// ===== HELPER FUNCTIONS =====

const getAuthHeaders = () => {
  const token = localStorage.getItem('clubw_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const handleApiError = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const errorData = await response.json();
    throw new Error(errorData.message || `HTTP Error: ${response.status}`);
  } else {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }
};

// ===== PUBLIC API (bez autentifikácie) =====

/**
 * Získanie všetkých publikovaných stránok
 */
export const getPublicPages = async (params?: {
  search?: string;
  in_menu?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<PagesListResponse>> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.search) queryParams.append('search', params.search);
    if (params?.in_menu !== undefined) queryParams.append('in_menu', params.in_menu.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/pages?${queryParams.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri načítavaní stránok: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Získanie stránok pre menu
 */
export const getMenuPages = async (): Promise<ApiResponse<MenuPagesResponse>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pages/menu`, {
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri načítavaní menu stránok: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Získanie stránky podľa slug
 */
export const getPageBySlug = async (slug: string): Promise<ApiResponse<{ page: Page }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pages/${encodeURIComponent(slug)}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Stránka nebola nájdená');
      }
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri načítavaní stránky: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

// ===== ADMIN API (s autentifikáciou) =====

/**
 * Získanie všetkých stránok pre admin
 */
export const getAdminPages = async (params?: {
  search?: string;
  status?: 'published' | 'draft';
  in_menu?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}): Promise<ApiResponse<PagesListResponse>> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.in_menu !== undefined) queryParams.append('in_menu', params.in_menu.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

    const response = await fetch(`${API_BASE_URL}/admin/pages?${queryParams.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri načítavaní admin stránok: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Získanie stránky podľa ID pre admin
 */
export const getAdminPageById = async (id: number): Promise<ApiResponse<{ page: Page }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/pages/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Stránka nebola nájdená');
      }
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri načítavaní stránky: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Vytvorenie novej stránky
 */
export const createPage = async (pageData: PageFormData): Promise<ApiResponse<{ page: Page }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/pages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri vytváraní stránky: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Aktualizácia existujúcej stránky
 */
export const updatePage = async (id: number, pageData: PageFormData): Promise<ApiResponse<{ page: Page }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/pages/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri aktualizácii stránky: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Vymazanie stránky
 */
export const deletePage = async (id: number): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/pages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri mazaní stránky: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Prepnutie publikovania stránky
 */
export const togglePagePublish = async (id: number, publikovany: boolean): Promise<ApiResponse<{ page: Page }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/pages/${id}/toggle-publish`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ publikovany }),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri zmene statusu publikovania: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Prepnutie zobrazenia v menu
 */
export const togglePageMenu = async (id: number, v_menu: boolean): Promise<ApiResponse<{ page: Page }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/pages/${id}/toggle-menu`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ v_menu }),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri zmene zobrazenia v menu: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

/**
 * Zmena poradia stránok v menu
 */
export const reorderPages = async (pages: Array<{ id: number; poradie_menu: number }>): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/pages/reorder`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ pages }),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Chyba pri zmene poradia stránok: ${error instanceof Error ? error.message : 'Neznáma chyba'}`);
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Generovanie slug z názvu (klientská verzia pre preview)
 */
export const generateSlug = (nazov: string): string => {
  return nazov
    .toLowerCase()
    .normalize('NFD') // Rozloží diakritiku
    .replace(/[\u0300-\u036f]/g, '') // Odstráni diakritiku
    .replace(/[^a-z0-9\s-]/g, '') // Ponechá len písmená, číslice, medzery a pomlčky
    .trim()
    .replace(/\s+/g, '-') // Nahradí medzery pomlčkami
    .replace(/-+/g, '-') // Nahradí viacero pomlčiek jednou
    .replace(/^-|-$/g, ''); // Odstráni pomlčky na začiatku a konci
};

/**
 * Skrátenie HTML obsahu pre excerpt
 */
export const getExcerpt = (obsah: string, length: number = 150): string => {
  // Odstráni HTML tagy
  const plainText = obsah.replace(/<[^>]*>/g, '');
  
  if (plainText.length <= length) {
    return plainText;
  }

  return plainText.substring(0, length).trim() + '...';
};

/**
 * Počítanie slov v obsahu
 */
export const getWordCount = (obsah: string): number => {
  const plainText = obsah.replace(/<[^>]*>/g, '');
  return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Formátovanie dátumu pre slovenské prostredie
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Validácia slug
 */
export const validateSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9-]+$/;
  return slug.length >= 2 && slug.length <= 100 && slugRegex.test(slug);
};

/**
 * Validácia formuláru pre stránku
 */
export const validatePageForm = (formData: PageFormData): string[] => {
  const errors: string[] = [];

  // Názov
  if (!formData.nazov || formData.nazov.trim().length < 2) {
    errors.push('Názov musí mať aspoň 2 znaky');
  }
  if (formData.nazov && formData.nazov.length > 200) {
    errors.push('Názov môže mať maximálne 200 znakov');
  }

  // Obsah
  if (!formData.obsah || formData.obsah.trim().length < 10) {
    errors.push('Obsah musí mať aspoň 10 znakov');
  }
  if (formData.obsah && formData.obsah.length > 100000) {
    errors.push('Obsah môže mať maximálne 100 000 znakov');
  }

  // Slug (ak je zadaný)
  if (formData.slug && !validateSlug(formData.slug)) {
    errors.push('Slug môže obsahovať len malé písmená, číslice a pomlčky');
  }

  // Meta fields
  if (formData.meta_title && formData.meta_title.length > 100) {
    errors.push('Meta title môže mať maximálne 100 znakov');
  }
  if (formData.meta_description && formData.meta_description.length > 300) {
    errors.push('Meta description môže mať maximálne 300 znakov');
  }

  // Poradie v menu
  if (formData.poradie_menu && (formData.poradie_menu < 1 || formData.poradie_menu > 9999)) {
    errors.push('Poradie v menu musí byť medzi 1 a 9999');
  }

  return errors;
};