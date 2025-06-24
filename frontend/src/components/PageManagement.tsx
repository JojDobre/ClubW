// frontend/src/components/PageManagement.tsx
// Komponenta pre správu statických stránok (FÁZA 5)

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
        setFormErrors(data.errors || [data.message || 'Chyba pri vytváraní stránky']);
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
        setFormErrors(data.errors || [data.message || 'Chyba pri aktualizácii stránky']);
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

  const deletePage = async (id: number) => {
    if (!confirm('Naozaj chcete vymazať túto stránku? Táto akcia sa nedá vrátiť.')) {
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
      } else {
        alert('Chyba pri mazaní stránky: ' + data.message);
      }
    } catch (error) {
      console.error('Chyba pri mazaní stránky:', error);
      alert('Chyba pri mazaní stránky');
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
      } else {
        alert('Chyba pri zmene statusu: ' + data.message);
      }
    } catch (error) {
      console.error('Chyba pri zmene statusu:', error);
      alert('Chyba pri zmene statusu');
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
      } else {
        alert('Chyba pri zmene menu: ' + data.message);
      }
    } catch (error) {
      console.error('Chyba pri zmene menu:', error);
      alert('Chyba pri zmene menu');
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
    
    if (currentView === 'create') {
      await createPage(formData);
    } else if (currentView === 'edit' && selectedPage) {
      await updatePage(selectedPage.id, formData);
    }
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch = !searchTerm || 
      page.nazov.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.obsah.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'published' && page.publikovany) ||
      (statusFilter === 'draft' && !page.publikovany);
    
    const matchesMenu = menuFilter === 'all' ||
      (menuFilter === 'in_menu' && page.v_menu) ||
      (menuFilter === 'not_in_menu' && !page.v_menu);

    return matchesSearch && matchesStatus && matchesMenu;
  });

  // ===== EFFECTS =====

  useEffect(() => {
    fetchPages();
  }, [searchTerm, statusFilter, menuFilter]);

  // ===== RENDER =====

  // Loading state
  if (loading && pages.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p>Načítavam stránky...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#1a202c' }}>
            📄 Správa stránok
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>
            Správa statického obsahu webu
          </p>
        </div>
        
        {currentView === 'list' && (
          <button
            onClick={() => {
              resetForm();
              setCurrentView('create');
            }}
            style={{
              padding: '12px 24px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ➕ Nová stránka
          </button>
        )}

        {currentView !== 'list' && (
          <button
            onClick={() => {
              resetForm();
              setCurrentView('list');
            }}
            style={{
              padding: '12px 24px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Späť na zoznam
          </button>
        )}
      </div>

      {/* Content based on current view */}
      {currentView === 'list' && (
        <>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              alignItems: 'end'
            }}>
              {/* Search */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  🔍 Vyhľadávanie
                </label>
                <input
                  type="text"
                  placeholder="Hľadať v názve alebo obsahu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Status filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  📋 Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">Všetky stránky</option>
                  <option value="published">Publikované</option>
                  <option value="draft">Koncepty</option>
                </select>
              </div>

              {/* Menu filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  🎛️ Menu
                </label>
                <select
                  value={menuFilter}
                  onChange={(e) => setMenuFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">Všetky stránky</option>
                  <option value="in_menu">V menu</option>
                  <option value="not_in_menu">Nie v menu</option>
                </select>
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

          {/* Pages List */}
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
              <button
                onClick={() => {
                  if (searchTerm || statusFilter !== 'all' || menuFilter !== 'all') {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setMenuFilter('all');
                  } else {
                    resetForm();
                    setCurrentView('create');
                  }
                }}
                style={{
                  padding: '12px 24px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {searchTerm || statusFilter !== 'all' || menuFilter !== 'all'
                  ? 'Vyčistiť filtre'
                  : '➕ Vytvoriť prvú stránku'
                }
              </button>
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
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#374151'
              }}>
                <div>Stránka</div>
                <div style={{ textAlign: 'center' }}>Status</div>
                <div style={{ textAlign: 'center' }}>Menu</div>
                <div style={{ textAlign: 'center' }}>Slová</div>
                <div style={{ textAlign: 'center' }}>Akcie</div>
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
                        background: page.v_menu ? '#3b82f6' : '#e2e8f0',
                        color: page.v_menu ? 'white' : '#6b7280'
                      }}
                    >
                      {page.v_menu ? '🎛️ Áno' : '➖ Nie'}
                    </button>
                  </div>

                  {/* Word Count */}
                  <div style={{ textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                    {page.word_count}
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => handleEdit(page)}
                      style={{
                        padding: '8px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Upraviť
                    </button>
                    
                    <button
                      onClick={() => window.open(page.url, '_blank')}
                      style={{
                        padding: '8px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      👁️ Zobraziť
                    </button>
                    
                    <button
                      onClick={() => deletePage(page.id)}
                      style={{
                        padding: '8px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Vymazať
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Form */}
      {(currentView === 'create' || currentView === 'edit') && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>
            {currentView === 'create' ? '➕ Nová stránka' : '✏️ Úprava stránky'}
          </h2>

          {/* Form Errors */}
          {formErrors.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              {formErrors.map((error, index) => (
                <div key={index} style={{ color: '#dc2626', fontSize: '14px' }}>
                  ❌ {error}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gap: '20px'
            }}>
              {/* Názov */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  📝 Názov stránky *
                </label>
                <input
                  type="text"
                  value={formData.nazov}
                  onChange={(e) => setFormData({ ...formData, nazov: e.target.value })}
                  placeholder="Napríklad: História klubu"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                  Z názvu sa automaticky vygeneruje URL slug
                </div>
              </div>

              {/* Slug (voliteľný) */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  🔗 URL slug (voliteľné)
                </label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="historia-klubu"
                  pattern="^[a-z0-9-]+$"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                  Môže obsahovať len malé písmená, číslice a pomlčky. Ak nevyplníte, vygeneruje sa automaticky.
                </div>
              </div>

              {/* Obsah */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  📄 Obsah stránky *
                </label>
                <textarea
                  value={formData.obsah}
                  onChange={(e) => setFormData({ ...formData, obsah: e.target.value })}
                  placeholder="Zadajte obsah stránky. Môžete použiť HTML tagy pre formátovanie."
                  required
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                  Podporované sú HTML tagy: &lt;h1&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;a&gt;, &lt;img&gt;, atď.
                </div>
              </div>

              {/* Dve stĺpce pre settings */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px'
              }}>
                {/* Meta Title */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                    color: '#374151'
                  }}>
                    🏷️ SEO Title (voliteľné)
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title || ''}
                    onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                    placeholder="SEO optimalizovaný title"
                    maxLength={100}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                    Max. 100 znakov pre optimálne SEO
                  </div>
                </div>

                {/* Poradie v menu */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                    color: '#374151'
                  }}>
                    📍 Poradie v menu (voliteľné)
                  </label>
                  <input
                    type="number"
                    value={formData.poradie_menu || ''}
                    onChange={(e) => setFormData({ ...formData, poradie_menu: parseInt(e.target.value) || undefined })}
                    placeholder="10"
                    min="1"
                    max="9999"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                    Nižšie číslo = vyššie v menu. Ak nevyplníte, nastaví sa automaticky.
                  </div>
                </div>
              </div>

              {/* Meta Description */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  📝 SEO Description (voliteľné)
                </label>
                <textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  placeholder="Krátky popis stránky pre vyhľadávače"
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                  Max. 300 znakov. Zobrazuje sa vo vyhľadávačoch.
                </div>
              </div>

              {/* Checkboxy */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                {/* Publikovanie */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <input
                    type="checkbox"
                    id="publikovany"
                    checked={formData.publikovany}
                    onChange={(e) => setFormData({ ...formData, publikovany: e.target.checked })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <label htmlFor="publikovany" style={{
                    fontWeight: 'bold',
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    ✅ Publikovať stránku
                  </label>
                </div>

                {/* Menu */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <input
                    type="checkbox"
                    id="v_menu"
                    checked={formData.v_menu}
                    onChange={(e) => setFormData({ ...formData, v_menu: e.target.checked })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <label htmlFor="v_menu" style={{
                    fontWeight: 'bold',
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    🎛️ Zobraziť v menu
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'flex-end',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setCurrentView('list');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Zrušiť
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '12px 24px',
                    background: submitting ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Ukladám...
                    </>
                  ) : (
                    <>
                      💾 {currentView === 'create' ? 'Vytvoriť stránku' : 'Uložiť zmeny'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .page-management-grid {
            grid-template-columns: 1fr;
          }
          
          .page-management-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default PageManagement;