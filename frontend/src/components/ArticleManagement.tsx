// frontend/src/components/ArticleManagement.tsx
// AKTUALIZOVANÁ komponenta s Rich Text Editorom

import React, { useState, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';

// ... všetky existujúce interfaces zostávajú rovnaké ...

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
    farba?: string;
    ikona?: string;
  };
}

interface Category {
  id: number;
  nazov: string;
  slug: string;
  farba?: string;
  ikona?: string;
  poradie?: number;
  aktivity?: boolean;
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

  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Editor stav
  const [editorReady, setEditorReady] = useState(false);

  // Načítanie článkov
  const fetchArticles = async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('clubw_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);

      const response = await fetch(`http://localhost:3000/api/admin/articles?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setArticles(data.data.articles);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalArticles(data.data.pagination.totalArticles);
        setError('');
      } else {
        setError(data.message || 'Chyba pri načítavaní článkov');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie kategórií
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch('http://localhost:3000/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch (err) {
      console.error('Chyba pri načítavaní kategórií:', err);
    }
  };

  useEffect(() => {
    fetchArticles(currentPage);
  }, [currentPage, searchTerm, filterStatus, filterCategory]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Automatické generovanie slug
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
    setEditingArticle(null);
    setError('');
    setEditorReady(false);
  };

  // Submit formulára
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('clubw_token');
      const url = editingArticle 
        ? `http://localhost:3000/api/admin/articles/${editingArticle.id}`
        : 'http://localhost:3000/api/admin/articles';
      
      const method = editingArticle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        await fetchArticles(currentPage);
        setShowAddModal(false);
        resetForm();
      } else {
        setError(data.message || 'Chyba pri ukladaní článku');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    } finally {
      setSubmitting(false);
    }
  };

  // Mazanie článku
  const handleDelete = async (articleId: number) => {
    if (!window.confirm('Naozaj chcete vymazať tento článok?')) return;

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
        await fetchArticles(currentPage);
      } else {
        setError(data.message || 'Chyba pri mazaní článku');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    }
  };

  // Úprava článku
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

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{ 
            margin: '0', 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#1e293b' 
          }}>
            📰 Správa článkov
          </h1>
          <p style={{ 
            margin: '8px 0 0 0', 
            color: '#64748b', 
            fontSize: '16px' 
          }}>
            Vytváranie a upravovanie článkov pre web
          </p>
        </div>
        <button
          onClick={startAdd}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ➕ Nový článok
        </button>
      </div>

      {/* Štatistiky */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {articles.length}
          </div>
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

      {/* Modal pre pridanie/úpravu článku */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Modal header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 10
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {editingArticle ? '✏️ Upraviť článok' : '➕ Nový článok'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal content */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {/* Základné informácie */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1e293b' 
                }}>
                  📝 Základné informácie
                </h3>

                {/* Názov */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    Názov článku *
                  </label>
                  <input
                    type="text"
                    value={formData.nazov}
                    onChange={(e) => {
                      const nazov = e.target.value;
                      setFormData({
                        ...formData,
                        nazov,
                        slug: formData.slug || generateSlug(nazov),
                        meta_title: formData.meta_title || nazov
                      });
                    }}
                    required
                    style={inputStyle}
                    placeholder="Zadajte názov článku"
                  />
                </div>

                {/* Slug */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    URL slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    style={{
                      ...inputStyle,
                      fontFamily: 'monospace',
                      fontSize: '13px'
                    }}
                    placeholder="automaticky-generovany-slug"
                  />
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    URL adresa: /clanek/{formData.slug || 'slug'}
                  </div>
                </div>

                {/* Kategória a Status */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '20px', 
                  marginBottom: '20px' 
                }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '14px', 
                      fontWeight: '500' 
                    }}>
                      Kategória *
                    </label>
                    <select
                      value={formData.kategoria_id}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        kategoria_id: parseInt(e.target.value) 
                      })}
                      required
                      style={inputStyle}
                    >
                      <option value="">Vyberte kategóriu</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.ikona} {category.nazov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '14px', 
                      fontWeight: '500' 
                    }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        status: e.target.value as any 
                      })}
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

              {/* Rich Text Editor pre obsah */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1e293b' 
                }}>
                  📝 Obsah článku
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    Obsah článku *
                  </label>
                  
                  <RichTextEditor
                    value={formData.obsah}
                    onChange={(content) => setFormData({ ...formData, obsah: content })}
                    placeholder="Začnite písať váš článok..."
                    height={400}
                    onInit={() => setEditorReady(true)}
                  />
                  
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                    💡 Tip: Používajte nadpisy (H2, H3) pre lepšiu štruktúru článku
                  </div>
                </div>

                {/* Excerpt */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    Úvodný text (excerpt)
                  </label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={3}
                    style={inputStyle}
                    placeholder="Krátky popis článku, ktorý sa zobrazí v náhľadoch..."
                    maxLength={300}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#64748b', 
                    marginTop: '4px',
                    textAlign: 'right' 
                  }}>
                    {formData.excerpt.length}/300 znakov
                  </div>
                </div>
              </div>

              {/* Médiá a nastavenia */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1e293b' 
                }}>
                  🖼️ Médiá a nastavenia
                </h3>

                {/* Obrázok */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    Hlavný obrázok (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.obrazok}
                    onChange={(e) => setFormData({ ...formData, obrazok: e.target.value })}
                    style={inputStyle}
                    placeholder="https://example.com/obrazok.jpg"
                  />
                  {formData.obrazok && (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={formData.obrazok}
                        alt="Náhľad"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '120px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Dátum publikovania */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    Dátum publikovania
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.publikovany_datum}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      publikovany_datum: e.target.value 
                    })}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Ponechajte prázdne pre okamžité publikovanie
                  </div>
                </div>

                {/* Checkboxy */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '20px' 
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    cursor: 'pointer' 
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        featured: e.target.checked 
                      })}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <span>⭐ Vybraný článok</span>
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    cursor: 'pointer' 
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.komentare_povolene}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        komentare_povolene: e.target.checked 
                      })}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <span>💬 Povoliť komentáre</span>
                  </label>
                </div>
              </div>

              {/* Tagy */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1e293b' 
                }}>
                  🏷️ Tagy
                </h3>

                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
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
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="Pridať tag..."
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
                        cursor: 'pointer'
                      }}
                    >
                      + Pridať
                    </button>
                  </div>

                  {/* Zobrazenie tagov */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '4px 8px',
                          borderRadius: '15px',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0369a1',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* SEO nastavenia */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1e293b' 
                }}>
                  🔍 SEO nastavenia
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    Meta title
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                    style={inputStyle}
                    placeholder="SEO nadpis pre vyhľadávače"
                    maxLength={70}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: formData.meta_title.length > 70 ? '#ef4444' : '#64748b', 
                    marginTop: '4px',
                    textAlign: 'right' 
                  }}>
                    {formData.meta_title.length}/70 znakov
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    Meta description
                  </label>
                  <textarea
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      meta_description: e.target.value 
                    })}
                    rows={3}
                    style={inputStyle}
                    placeholder="Krátky popis pre vyhľadávače a sociálne siete"
                    maxLength={160}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: formData.meta_description.length > 160 ? '#ef4444' : '#64748b', 
                    marginTop: '4px',
                    textAlign: 'right' 
                  }}>
                    {formData.meta_description.length}/160 znakov
                  </div>
                </div>
              </div>

              {/* Error správa */}
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
                </div>
              )}

              {/* Tlačidlá */}
              <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <button
                  type="submit"
                  disabled={submitting || !editorReady}
                  style={{
                    background: submitting ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></span>
                      Ukladám...
                    </>
                  ) : (
                    <>
                      💾 {editingArticle ? 'Aktualizovať' : 'Vytvoriť článok'}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Zrušiť
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabuľka článkov - zjednodušený obsah pre ukážku */}
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
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Článok</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Kategória</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Autor</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Zobrazenia</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Akcie</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500', color: '#1e293b' }}>
                        {article.featured && <span style={{ color: '#f59e0b' }}>⭐ </span>}
                        {article.nazov}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        /{article.slug}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: article.kategoria?.farba || '#6b7280',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {article.kategoria?.ikona && `${article.kategoria.ikona} `}
                        {article.kategoria?.nazov}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '14px' }}>
                        {getStatusIcon(article.status)} {getStatusName(article.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>
                      {article.autor?.meno}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      👁️ {article.views}
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
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✏️ Upraviť
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️ Zmazať
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSS pre animácie */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ArticleManagement;