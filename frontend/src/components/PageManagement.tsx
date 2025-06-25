// frontend/src/components/PageManagement.tsx
// Komponenta pre správu statických stránok (FÁZA 5) - OPRAVENÉ

import React, { useState, useEffect } from 'react';

// ===== INTERFACES =====

interface Page {
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

interface PageFormData {
  nazov: string;
  obsah: string;
  slug?: string;
  v_menu: boolean;
  poradie_menu?: number;
  publikovany: boolean;
  meta_title?: string;
  meta_description?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// ===== MAIN COMPONENT =====

const PageManagement: React.FC = () => {
  // State
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [menuFilter, setMenuFilter] = useState<'all' | 'in_menu' | 'not_in_menu'>('all');

  // State pre chybové hlásenia
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<PageFormData>({
    nazov: '',
    obsah: '',
    v_menu: false,
    publikovany: false,
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ===== API FUNCTIONS =====

  const API_BASE = 'http://localhost:3000/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('clubw_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchPages = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') {
        params.append('status', statusFilter === 'published' ? 'published' : 'draft');
      }
      if (menuFilter !== 'all') {
        params.append('in_menu', menuFilter === 'in_menu' ? 'true' : 'false');
      }

      const response = await fetch(`${API_BASE}/admin/pages?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const data: ApiResponse<{ pages: Page[] }> = await response.json();

      if (data.success) {
        setPages(data.data.pages);
      } else {
        console.error('Chyba pri načítavaní stránok:', data.message);
      }
    } catch (error) {
      console.error('Chyba pri načítavaní stránok:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPage = async (pageData: PageFormData) => {
    try {
      setSubmitting(true);
      setFormErrors([]);

      const response = await fetch(`${API_BASE}/admin/pages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(pageData),
      });

      const data: ApiResponse<{ page: Page }> = await response.json();

      if (data.success) {
        await fetchPages(); // Refresh list
        setCurrentView('list');
        resetForm();
        return true;
      } else {
        // ✅ OPRAVENÉ: Spracovanie chýb z backendu
        const errorMessages: string[] = [];
        
        if (data.errors && Array.isArray(data.errors)) {
          // Express-validator errors sú objekty s msg property
          data.errors.forEach((error: any) => {
            if (typeof error === 'string') {
              errorMessages.push(error);
            } else if (error && error.msg) {
              errorMessages.push(error.msg);
            } else if (error && error.message) {
              errorMessages.push(error.message);
            } else {
              errorMessages.push('Neznáma chyba validácie');
            }
          });
        } else if (data.message) {
          errorMessages.push(data.message);
        } else {
          errorMessages.push('Chyba pri vytváraní stránky');
        }
        
        setFormErrors(errorMessages);
        return false;
      }
    } catch (error) {
      console.error('Chyba pri vytváraní stránky:', error);
      setFormErrors(['Chyba pri vytváraní stránky']);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updatePage = async (id: number, pageData: PageFormData) => {
    try {
      setSubmitting(true);
      setFormErrors([]);

      const response = await fetch(`${API_BASE}/admin/pages/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(pageData),
      });

      const data: ApiResponse<{ page: Page }> = await response.json();

      if (data.success) {
        await fetchPages(); // Refresh list
        setCurrentView('list');
        resetForm();
        return true;
      } else {
        // ✅ OPRAVENÉ: Spracovanie chýb z backendu
        const errorMessages: string[] = [];
        
        if (data.errors && Array.isArray(data.errors)) {
          // Express-validator errors sú objekty s msg property
          data.errors.forEach((error: any) => {
            if (typeof error === 'string') {
              errorMessages.push(error);
            } else if (error && error.msg) {
              errorMessages.push(error.msg);
            } else if (error && error.message) {
              errorMessages.push(error.message);
            } else {
              errorMessages.push('Neznáma chyba validácie');
            }
          });
        } else if (data.message) {
          errorMessages.push(data.message);
        } else {
          errorMessages.push('Chyba pri aktualizácii stránky');
        }
        
        setFormErrors(errorMessages);
        return false;
      }
    } catch (error) {
      console.error('Chyba pri aktualizácii stránky:', error);
      setFormErrors(['Chyba pri aktualizácii stránky']);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // ===== FIXED: Používame window.confirm namiesto globalnej confirm funkcie =====
  const deletePage = async (id: number) => {
    // ✅ OPRAVENÉ: Používame window.confirm namiesto confirm
    if (!window.confirm('Naozaj chcete vymazať túto stránku? Táto akcia sa nedá vrátiť.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/pages/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const data: ApiResponse<any> = await response.json();

      if (data.success) {
        await fetchPages(); // Refresh list
        setSuccessMessage('Stránka bola úspešne vymazaná');
        setErrorMessage('');
        // Vyčistenie správy po 3 sekundách
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Chyba pri mazaní stránky: ' + data.message);
        setSuccessMessage('');
      }
    } catch (error) {
      console.error('Chyba pri mazaní stránky:', error);
      setErrorMessage('Chyba pri mazaní stránky');
      setSuccessMessage('');
    }
  };

  const togglePublish = async (id: number, publikovany: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/admin/pages/${id}/toggle-publish`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ publikovany }),
      });

      const data: ApiResponse<{ page: Page }> = await response.json();

      if (data.success) {
        await fetchPages(); // Refresh list
        setSuccessMessage(`Status stránky bol zmenený na: ${publikovany ? 'publikované' : 'koncept'}`);
        setErrorMessage('');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Chyba pri zmene statusu: ' + data.message);
        setSuccessMessage('');
      }
    } catch (error) {
      console.error('Chyba pri zmene statusu:', error);
      setErrorMessage('Chyba pri zmene statusu');
      setSuccessMessage('');
    }
  };

  const toggleMenu = async (id: number, v_menu: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/admin/pages/${id}/toggle-menu`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ v_menu }),
      });

      const data: ApiResponse<{ page: Page }> = await response.json();

      if (data.success) {
        await fetchPages(); // Refresh list
        setSuccessMessage(`Stránka bola ${v_menu ? 'pridaná do' : 'odstránená z'} menu`);
        setErrorMessage('');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Chyba pri zmene menu: ' + data.message);
        setSuccessMessage('');
      }
    } catch (error) {
      console.error('Chyba pri zmene menu:', error);
      setErrorMessage('Chyba pri zmene menu');
      setSuccessMessage('');
    }
  };

  // ===== HELPER FUNCTIONS =====

  const resetForm = () => {
    setFormData({
      nazov: '',
      obsah: '',
      v_menu: false,
      publikovany: false,
    });
    setFormErrors([]);
    setErrorMessage('');
    setSuccessMessage('');
    setSelectedPage(null);
  };

  const handleEdit = (page: Page) => {
    setSelectedPage(page);
    setFormData({
      nazov: page.nazov,
      obsah: page.obsah,
      slug: page.slug,
      v_menu: page.v_menu,
      poradie_menu: page.poradie_menu,
      publikovany: page.publikovany,
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
    });
    setCurrentView('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentView === 'edit' && selectedPage) {
      await updatePage(selectedPage.id, formData);
    } else {
      await createPage(formData);
    }
  };

  // Filter pages based on current filters
  const filteredPages = pages.filter(page => {
    // Search filter
    if (searchTerm && !page.nazov.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !page.obsah.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Status filter
    if (statusFilter === 'published' && !page.publikovany) return false;
    if (statusFilter === 'draft' && page.publikovany) return false;

    // Menu filter
    if (menuFilter === 'in_menu' && !page.v_menu) return false;
    if (menuFilter === 'not_in_menu' && page.v_menu) return false;

    return true;
  });

  // Load pages on component mount
  useEffect(() => {
    fetchPages();
  }, []);

  // Reload pages when filters change
  useEffect(() => {
    fetchPages();
  }, [searchTerm, statusFilter, menuFilter]);

  // ===== RENDER =====

  // Form view (create/edit)
  if (currentView === 'create' || currentView === 'edit') {
    return (
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
            📄 {currentView === 'edit' ? 'Úprava stránky' : 'Nová stránka'}
          </h2>
          <button
            onClick={() => {
              setCurrentView('list');
              resetForm();
            }}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Späť na zoznam
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px',
            color: '#0369a1'
          }}>
            ✅ {successMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px',
            color: '#dc2626'
          }}>
            ❌ {errorMessage}
          </div>
        )}

        {/* Error Messages */}
        {formErrors.length > 0 && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            {formErrors.map((error, index) => (
              <div key={index} style={{ color: '#dc2626', fontSize: '14px' }}>
                ❌ {error}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {/* Basic Fields */}
          <div style={{ display: 'grid', gap: '20px', marginBottom: '30px' }}>
            {/* Názov */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                Názov stránky *
              </label>
              <input
                type="text"
                value={formData.nazov}
                onChange={(e) => setFormData({ ...formData, nazov: e.target.value })}
                placeholder="Napríklad: História klubu"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Slug */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                URL Slug (voliteľné)
              </label>
              <input
                type="text"
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="historia-klubu (automaticky sa vygeneruje z názvu)"
                pattern="^[a-z0-9-]*$"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Používaj len malé písmená, číslice a pomlčky. Nech prázdne pre automatické generovanie.
              </small>
            </div>

            {/* Obsah */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                Obsah stránky *
              </label>
              <textarea
                value={formData.obsah}
                onChange={(e) => setFormData({ ...formData, obsah: e.target.value })}
                placeholder="Zadajte obsah stránky (môžete použiť základné HTML tagy)"
                required
                rows={12}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Môžete používať HTML tagy: &lt;h1&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, atď.
              </small>
            </div>
          </div>

          {/* Settings */}
          <div style={{
            background: '#f9fafb',
            padding: '20px',
            borderRadius: '6px',
            marginBottom: '30px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>
              ⚙️ Nastavenia
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Publikovanie */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.publikovany}
                    onChange={(e) => setFormData({ ...formData, publikovany: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    🌐 Publikovať stránku
                  </span>
                </label>
                <small style={{ color: '#6b7280', fontSize: '12px', marginLeft: '26px' }}>
                  Zverejniť stránku na webovej stránke
                </small>
              </div>

              {/* Menu */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.v_menu}
                    onChange={(e) => setFormData({ ...formData, v_menu: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    📍 Zobrazovať v menu
                  </span>
                </label>
                <small style={{ color: '#6b7280', fontSize: '12px', marginLeft: '26px' }}>
                  Pridať odkaz do hlavného menu
                </small>
              </div>
            </div>

            {/* Poradie v menu */}
            {formData.v_menu && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                  Poradie v menu
                </label>
                <input
                  type="number"
                  value={formData.poradie_menu || ''}
                  onChange={(e) => setFormData({ ...formData, poradie_menu: parseInt(e.target.value) || undefined })}
                  placeholder="10"
                  min="1"
                  max="9999"
                  style={{
                    width: '100px',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginLeft: '10px' }}>
                  Nižšie číslo = vyššie v menu. Prázdne = automaticky na koniec.
                </small>
              </div>
            )}
          </div>

          {/* SEO Settings */}
          <div style={{
            background: '#f0f9ff',
            padding: '20px',
            borderRadius: '6px',
            marginBottom: '30px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>
              🔍 SEO nastavenia (voliteľné)
            </h3>

            <div style={{ display: 'grid', gap: '15px' }}>
              {/* Meta Title */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder="Názov pre vyhľadávače (max 60 znakov)"
                  maxLength={100}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Aktuálne: {(formData.meta_title || '').length}/100 znakov
                </small>
              </div>

              {/* Meta Description */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                  Meta Description
                </label>
                <textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  placeholder="Krátky popis stránky pre vyhľadávače (max 160 znakov)"
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Aktuálne: {(formData.meta_description || '').length}/300 znakov
                </small>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setCurrentView('list');
                resetForm();
              }}
              style={{
                padding: '12px 24px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Zrušiť
            </button>
            
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 24px',
                background: submitting ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {submitting
                ? (currentView === 'edit' ? 'Ukladám...' : 'Vytváram...')
                : (currentView === 'edit' ? '✅ Aktualizovať' : '✅ Vytvoriť stránku')
              }
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
          📄 Správa stránok
        </h1>
        <button
          onClick={() => setCurrentView('create')}
          style={{
            padding: '12px 20px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ➕ Nová stránka
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px',
          color: '#0369a1'
        }}>
          ✅ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px',
          color: '#dc2626'
        }}>
          ❌ {errorMessage}
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: '15px',
          alignItems: 'end'
        }}>
          {/* Search */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
              🔍 Vyhľadávanie
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Hľadať v názvoch a obsahu..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="all">Všetky</option>
              <option value="published">Publikované</option>
              <option value="draft">Koncepty</option>
            </select>
          </div>

          {/* Menu Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
              Menu
            </label>
            <select
              value={menuFilter}
              onChange={(e) => setMenuFilter(e.target.value as 'all' | 'in_menu' | 'not_in_menu')}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="all">Všetky</option>
              <option value="in_menu">V menu</option>
              <option value="not_in_menu">Nie v menu</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setMenuFilter('all');
              }}
              style={{
                padding: '8px 12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🗑️ Vyčistiť
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', color: '#3b82f6' }}>{pages.length}</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Celkom stránok</div>
        </div>
        
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', color: '#10b981' }}>
            {pages.filter(p => p.publikovany).length}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Publikované</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', color: '#f59e0b' }}>
            {pages.filter(p => p.v_menu).length}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>V menu</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', color: '#6b7280' }}>
            {pages.filter(p => !p.publikovany).length}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Koncepty</div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          background: 'white',
          padding: '60px 20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <div>Načítavam stránky...</div>
        </div>
      )}

      {/* Pages List */}
      {!loading && (
        <>
          {filteredPages.length === 0 ? (
            <div style={{
              background: 'white',
              padding: '60px 20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📄</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                Žiadne stránky nenájdené
              </h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                {searchTerm || statusFilter !== 'all' || menuFilter !== 'all'
                  ? 'Skúste zmeniť kritériá filtrovania.'
                  : 'Zatiaľ nemáte žiadne stránky. Vytvorte svoju prvú stránku!'
                }
              </p>
              {(!searchTerm && statusFilter === 'all' && menuFilter === 'all') && (
                <button
                  onClick={() => setCurrentView('create')}
                  style={{
                    padding: '12px 20px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  ➕ Vytvoriť prvú stránku
                </button>
              )}
            </div>
          ) : (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto auto',
                gap: '15px',
                padding: '20px',
                background: '#f9fafb',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#374151'
              }}>
                <div>📄 Stránka</div>
                <div style={{ textAlign: 'center' }}>🌐 Status</div>
                <div style={{ textAlign: 'center' }}>📍 Menu</div>
                <div style={{ textAlign: 'center' }}>👁️ Náhľad</div>
                <div style={{ textAlign: 'center' }}>⚙️ Akcie</div>
              </div>

              {/* Table Body */}
              {filteredPages.map((page) => (
                <div
                  key={page.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto auto',
                    gap: '15px',
                    padding: '20px',
                    borderBottom: '1px solid #e2e8f0',
                    alignItems: 'center'
                  }}
                >
                  {/* Page Info */}
                  <div>
                    <h3 style={{
                      margin: '0 0 5px 0',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#1a202c'
                    }}>
                      {page.nazov}
                    </h3>
                    <p style={{
                      margin: '0 0 5px 0',
                      fontSize: '14px',
                      color: '#64748b'
                    }}>
                      {page.excerpt || 'Žiadny excerpt dostupný'}
                    </p>
                    <div style={{
                      display: 'flex',
                      gap: '15px',
                      fontSize: '12px',
                      color: '#9ca3af'
                    }}>
                      <span>🔗 /{page.slug}</span>
                      <span>📅 {new Date(page.aktualizovany).toLocaleDateString('sk-SK')}</span>
                      {page.v_menu && (
                        <span>📍 Poradie: {page.poradie_menu}</span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => togglePublish(page.id, !page.publikovany)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        background: page.publikovany ? '#10b981' : '#f59e0b',
                        color: 'white'
                      }}
                    >
                      {page.publikovany ? '✅ Publikované' : '📝 Koncept'}
                    </button>
                  </div>

                  {/* Menu */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => toggleMenu(page.id, !page.v_menu)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        background: page.v_menu ? '#3b82f6' : '#9ca3af',
                        color: 'white'
                      }}
                    >
                      {page.v_menu ? '📍 V menu' : '➖ Nie v menu'}
                    </button>
                  </div>

                  {/* Preview */}
                  <div style={{ textAlign: 'center' }}>
                    <a
                      href={`/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 12px',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: '#374151',
                        fontSize: '12px'
                      }}
                    >
                      👁️ Zobraziť
                    </a>
                  </div>

                  {/* Actions */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEdit(page)}
                        style={{
                          padding: '6px 10px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✏️ Upraviť
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        style={{
                          padding: '6px 10px',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Zmazať
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Results Count */}
      {!loading && filteredPages.length > 0 && (
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          Zobrazených {filteredPages.length} z {pages.length} stránok
          {(searchTerm || statusFilter !== 'all' || menuFilter !== 'all') && (
            <span style={{ marginLeft: '10px' }}>
              • <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setMenuFilter('all');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Zobraziť všetky
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PageManagement;