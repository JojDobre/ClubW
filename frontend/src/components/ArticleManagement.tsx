// frontend/src/components/ArticleManagement.tsx
// Komponenta pre správu článkov - VYLEPŠENÁ VERZIA

import React, { useState, useEffect } from 'react';

interface Article {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
  excerpt?: string;
  obrazok?: string;
  autor_id: number;
  kategoria_id: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publikovany_datum?: string;
  views: number;
  meta_title?: string;
  meta_description?: string;
  tags: string[];
  featured: boolean;
  komentare_povolene: boolean;
  vytvoreny: string;
  aktualizovany: string;
  autor: {
    id: number;
    meno: string;
    email: string;
  };
  kategoria: {
    id: number;
    nazov: string;
    slug: string;
  };
}

interface Category {
  id: number;
  nazov: string;
  slug: string;
  farba?: string;
  ikona?: string;
}

interface ArticleFormData {
  nazov: string;
  slug: string;
  obsah: string;
  excerpt: string;
  obrazok: string;
  kategoria_id: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publikovany_datum: string;
  meta_title: string;
  meta_description: string;
  tags: string[];
  featured: boolean;
  komentare_povolene: boolean;
}

interface User {
  id: number;
  meno: string;
  email: string;
  rola: string;
}

interface ArticleManagementProps {
  currentUser: User;
}

const ArticleManagement: React.FC<ArticleManagementProps> = ({ currentUser }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  
  // Filtre
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Paginácia
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);

  // Formulárové dáta
  const [formData, setFormData] = useState<ArticleFormData>({
    nazov: '',
    slug: '',
    obsah: '',
    excerpt: '',
    obrazok: '',
    kategoria_id: 0,
    status: 'draft',
    publikovany_datum: '',
    meta_title: '',
    meta_description: '',
    tags: [],
    featured: false,
    komentare_povolene: true,
  });

  // Tag input
  const [tagInput, setTagInput] = useState('');

  // Limits pre charaktery
  const LIMITS = {
    nazov: 200,
    excerpt: 500,
    obsah: 50000,
    meta_title: 70,
    meta_description: 160,
  };

  // Generovanie slug z názvu
  const generateSlug = (nazov: string): string => {
    return nazov
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Načítanie kategórií
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch (err) {
      console.error('Chyba pri načítavaní kategórií:', err);
    }
  };

  // Načítanie článkov
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('clubw_token');
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '10');
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filterStatus) queryParams.append('status', filterStatus);
      if (filterCategory) queryParams.append('category', filterCategory);

      const response = await fetch(
        `http://localhost:3000/api/admin/articles?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setArticles(data.data.articles);
        setTotalPages(data.data.pagination.totalPages);
        setTotalArticles(data.data.pagination.totalArticles);
      } else {
        setError(data.message || 'Chyba pri načítavaní článkov');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie pri prvom renderovaní a pri zmene filtrov
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [currentPage, searchTerm, filterStatus, filterCategory]);

  // Validácia slug v reálnom čase
  const checkSlugAvailability = async (slug: string, excludeId?: number) => {
    if (!slug.trim()) return true;
    
    const existingArticle = articles.find(article => 
      article.slug === slug && article.id !== excludeId
    );
    return !existingArticle;
  };

  // Spracovanie formulára
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validácia slug
      const isSlugAvailable = await checkSlugAvailability(formData.slug, editingArticle?.id);
      if (!isSlugAvailable) {
        setError('Slug už existuje. Zvoľte iný.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('clubw_token');
      const url = editingArticle 
        ? `http://localhost:3000/api/admin/articles/${editingArticle.id}`
        : 'http://localhost:3000/api/admin/articles';
      
      const method = editingArticle ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        publikovany_datum: formData.publikovany_datum || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchArticles();
        resetForm();
        setShowAddModal(false);
        setEditingArticle(null);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => err.msg || err.message).join(', ');
          setError(errorMessages);
        } else {
          setError(data.message || 'Chyba pri ukladaní článku');
        }
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Reset formulára
  const resetForm = () => {
    setFormData({
      nazov: '',
      slug: '',
      obsah: '',
      excerpt: '',
      obrazok: '',
      kategoria_id: categories.length > 0 ? categories[0].id : 0,
      status: 'draft',
      publikovany_datum: '',
      meta_title: '',
      meta_description: '',
      tags: [],
      featured: false,
      komentare_povolene: true,
    });
    setTagInput('');
    setError('');
  };

  // Vymazanie článku
  const deleteArticle = async (articleId: number) => {
    if (!window.confirm('Naozaj chcete vymazať tento článok?')) {
      return;
    }

    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(`http://localhost:3000/api/admin/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        await fetchArticles();
      } else {
        setError(data.message || 'Chyba pri vymazávaní článku');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    }
  };

  // Otvorenie úpravy článku
  const startEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      nazov: article.nazov,
      slug: article.slug,
      obsah: article.obsah,
      excerpt: article.excerpt || '',
      obrazok: article.obrazok || '',
      kategoria_id: article.kategoria_id,
      status: article.status,
      publikovany_datum: article.publikovany_datum 
        ? new Date(article.publikovany_datum).toISOString().slice(0, 16)
        : '',
      meta_title: article.meta_title || '',
      meta_description: article.meta_description || '',
      tags: article.tags || [],
      featured: article.featured,
      komentare_povolene: article.komentare_povolene,
    });
    setError('');
    setShowAddModal(true);
  };

  // Otvorenie pridávania nového článku
  const startAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Pridanie tagu
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  // Odstránenie tagu
  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Získanie ikony pre status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return '✅';
      case 'draft': return '📝';
      case 'scheduled': return '⏰';
      case 'archived': return '📦';
      default: return '❓';
    }
  };

  // Získanie slovenského názvu statusu
  const getStatusName = (status: string) => {
    switch (status) {
      case 'published': return 'Publikovaný';
      case 'draft': return 'Koncept';
      case 'scheduled': return 'Naplánovaný';
      case 'archived': return 'Archivovaný';
      default: return status;
    }
  };

  // Štýl pre konzistentné inputy
  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  };

  // Komponenta pre počítadlo znakov
  const CharacterCounter: React.FC<{ current: number; limit: number }> = ({ current, limit }) => (
    <div style={{ 
      fontSize: '12px', 
      color: current > limit ? '#dc2626' : '#64748b', 
      marginTop: '4px',
      textAlign: 'right'
    }}>
      {current}/{limit} znakov
      {current > limit && <span style={{ color: '#dc2626', marginLeft: '8px' }}>⚠️ Prekročený limit</span>}
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
          📰 Správa článkov
        </h1>
        <button
          onClick={startAdd}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          ➕ Nový článok
        </button>
      </div>

      {/* Filtre */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Vyhľadávanie
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Názov alebo obsah..."
              style={inputStyle}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={inputStyle}
            >
              <option value="">Všetky statusy</option>
              <option value="published">Publikované</option>
              <option value="draft">Koncepty</option>
              <option value="scheduled">Naplánované</option>
              <option value="archived">Archivované</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Kategória
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="">Všetky kategórie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.ikona} {category.nazov}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Štatistiky */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{totalArticles}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Celkom článkov</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              {articles.filter(a => a.status === 'published').length}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Publikovaných</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
              {articles.filter(a => a.status === 'draft').length}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Konceptov</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
              {articles.reduce((sum, a) => sum + a.views, 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Zobrazení</div>
          </div>
        </div>
      </div>

      {/* Chybová správa */}
      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #dc2626'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabuľka článkov */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            Načítavam články...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Článok
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Kategória
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Autor
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Zobrazenia
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Dátum
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Akcie
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        <div style={{ 
                          fontWeight: '500', 
                          color: '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {article.featured && <span style={{ color: '#f59e0b' }}>⭐</span>}
                          {article.nazov}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 6px', borderRadius: '3px', display: 'inline-block', marginTop: '2px' }}>
                          /{article.slug}
                        </div>
                        {article.excerpt && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#64748b', 
                            marginTop: '4px',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {article.excerpt}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{categories.find(c => c.id === article.kategoria_id)?.ikona}</span>
                        <span style={{ fontSize: '14px', color: '#374151' }}>
                          {article.kategoria.nazov}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: article.status === 'published' ? '#dcfce7' : 
                                   article.status === 'draft' ? '#fef3c7' :
                                   article.status === 'scheduled' ? '#dbeafe' : '#fee2e2',
                        color: article.status === 'published' ? '#166534' : 
                               article.status === 'draft' ? '#92400e' :
                               article.status === 'scheduled' ? '#1e40af' : '#dc2626'
                      }}>
                        {getStatusIcon(article.status)}
                        {getStatusName(article.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                      {article.autor.meno}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                      👁️ {article.views}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>
                      {article.publikovany_datum 
                        ? new Date(article.publikovany_datum).toLocaleDateString('sk-SK')
                        : new Date(article.vytvoreny).toLocaleDateString('sk-SK')
                      }
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => startEdit(article)}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Upraviť
                        </button>
                        
                        {(article.autor_id === currentUser.id || currentUser.rola === 'admin') && (
                          <button
                            onClick={() => deleteArticle(article.id)}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Vymazať
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {articles.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Žiadne články neboli nájdené.
              </div>
            )}
          </div>
        )}

        {/* Paginácia */}
        {totalPages > 1 && (
          <div style={{ 
            padding: '16px 24px', 
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                background: currentPage === 1 ? '#f8fafc' : '#3b82f6',
                color: currentPage === 1 ? '#64748b' : 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Predchádzajúca
            </button>
            
            <span style={{ padding: '0 16px', fontSize: '14px', color: '#64748b' }}>
              Strana {currentPage} z {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                background: currentPage === totalPages ? '#f8fafc' : '#3b82f6',
                color: currentPage === totalPages ? '#64748b' : 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Ďalšia →
            </button>
          </div>
        )}
      </div>

      {/* Modal pre pridanie/úpravu článku */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 'bold' }}>
              {editingArticle ? 'Upraviť článok' : 'Pridať nový článok'}
            </h2>

            {error && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                borderLeft: '4px solid #dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Základné informácie */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Základné informácie
                </h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Názov článku
                  </label>
                  <input
                    type="text"
                    value={formData.nazov}
                    onChange={(e) => {
                      const nazov = e.target.value;
                      setFormData({ 
                        ...formData, 
                        nazov,
                        slug: editingArticle ? formData.slug : generateSlug(nazov)
                      });
                    }}
                    required
                    placeholder="Zadajte názov článku..."
                    style={inputStyle}
                  />
                  <CharacterCounter current={formData.nazov.length} limit={LIMITS.nazov} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Krátky popis (excerpt)
                  </label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={3}
                    placeholder="Krátky popis článku pre náhľady..."
                    style={{
                      ...inputStyle,
                      resize: 'vertical'
                    }}
                  />
                  <CharacterCounter current={formData.excerpt.length} limit={LIMITS.excerpt} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Obsah článku
                  </label>
                  <textarea
                    value={formData.obsah}
                    onChange={(e) => setFormData({ ...formData, obsah: e.target.value })}
                    rows={12}
                    required
                    placeholder="Napíšte obsah článku (môžete použiť HTML tagy)..."
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      fontFamily: 'monospace',
                      fontSize: '13px'
                    }}
                  />
                  <CharacterCounter current={formData.obsah.length} limit={LIMITS.obsah} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    💡 Tip: Môžete použiť HTML tagy ako &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;, atď.
                  </div>
                </div>
              </div>

              {/* Média a kategorizácia */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Média a kategorizácia
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      URL obrázka
                    </label>
                    <input
                      type="url"
                      value={formData.obrazok}
                      onChange={(e) => setFormData({ ...formData, obrazok: e.target.value })}
                      placeholder="https://example.com/obrazok.jpg"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      Kategória
                    </label>
                    <select
                      value={formData.kategoria_id}
                      onChange={(e) => setFormData({ ...formData, kategoria_id: parseInt(e.target.value) })}
                      required
                      style={inputStyle}
                    >
                      <option value={0}>Vyberte kategóriu</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.ikona} {category.nazov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                      Tím (pripravuje sa)
                    </label>
                    <select
                      disabled
                      style={{
                        ...inputStyle,
                        backgroundColor: '#f9fafb',
                        color: '#9ca3af',
                        cursor: 'not-allowed'
                      }}
                    >
                      <option>Bude dostupné neskôr</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Publikovanie */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Publikovanie
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      Dátum publikovania
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.publikovany_datum}
                      onChange={(e) => setFormData({ ...formData, publikovany_datum: e.target.value })}
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Nechajte prázdne pre okamžité publikovanie
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      Status článku
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      style={inputStyle}
                    >
                      <option value="draft">📝 Koncept</option>
                      <option value="published">✅ Publikovaný</option>
                      <option value="scheduled">⏰ Naplánovaný</option>
                      <option value="archived">📦 Archivovaný</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* URL slug */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  URL nastavenia
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    URL slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={async (e) => {
                      const slug = e.target.value;
                      setFormData({ ...formData, slug });
                      
                      // Validácia slug v reálnom čase
                      if (slug.trim()) {
                        const isAvailable = await checkSlugAvailability(slug, editingArticle?.id);
                        if (!isAvailable) {
                          setError('Tento slug už existuje');
                        } else {
                          setError('');
                        }
                      }
                    }}
                    placeholder="automaticky-generovany-slug"
                    pattern="^[a-z0-9-]+$"
                    style={{
                      ...inputStyle,
                      fontFamily: 'monospace',
                      fontSize: '13px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    URL adresa: /{formData.slug || 'slug'}
                  </div>
                </div>
              </div>

              {/* Tagy */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Tagy
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Pridať tagy
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Pridať tag..."
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Pridať
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#e5e7eb',
                          color: '#374151',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            padding: '0',
                            fontSize: '14px'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* SEO možnosti */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  SEO možnosti
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Meta title
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                    placeholder="SEO optimalizovaný názov (max 70 znakov)"
                    maxLength={70}
                    style={inputStyle}
                  />
                  <CharacterCounter current={formData.meta_title.length} limit={LIMITS.meta_title} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Meta description
                  </label>
                  <textarea
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    placeholder="Popis článku pre vyhľadávače (max 160 znakov)"
                    maxLength={160}
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical'
                    }}
                  />
                  <CharacterCounter current={formData.meta_description.length} limit={LIMITS.meta_description} />
                </div>
              </div>

              {/* Nastavenia */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Dodatočné nastavenia
                </h3>

                <div style={{ 
                  background: '#f8fafc', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  display: 'flex', 
                  gap: '24px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>⭐ Vybraný článok</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.komentare_povolene}
                      onChange={(e) => setFormData({ ...formData, komentare_povolene: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>💬 Povoliť komentáre</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingArticle(null);
                    resetForm();
                  }}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Ukladám...' : (editingArticle ? 'Uložiť zmeny' : 'Pridať článok')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleManagement;