// frontend/src/pages/ArticlesPage.tsx
// Stránka pre zobrazenie všetkých článkov v grid formáte

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

// Interface pre článok z backend API
interface Article {
  id: number;
  nazov: string;
  slug: string;
  excerpt?: string;
  obrazok?: string;
  publikovany_datum?: string;
  views: number;
  featured: boolean;
  autor: {
    id: number;
    meno: string;
  };
  kategoria: {
    id: number;
    nazov: string;
    slug: string;
    farba?: string;
    ikona?: string;
  };
  tags: string[];
  vytvoreny: string;
}

// Interface pre pagination z backend
interface Pagination {
  currentPage: number;
  totalPages: number;
  totalArticles: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Interface pre API response
interface ArticlesResponse {
  success: boolean;
  data: {
    articles: Article[];
    pagination: Pagination;
  };
  message?: string;
}

const ArticlesPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Filtre
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Načítanie článkov z API
  const fetchArticles = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12', // 12 článkov na stránku pre pekný grid
      });

      // Pridanie filtrov ak sú nastavené
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      if (showFeaturedOnly) {
        params.append('featured', 'true');
      }

      const response = await fetch(apiUrl(`/articles?${params.toString()}`));
      
      if (!response.ok) {
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data: ArticlesResponse = await response.json();
      
      if (data.success) {
        setArticles(data.data.articles);
        setPagination(data.data.pagination);
        setError('');
      } else {
        setError(data.message || 'Chyba pri načítavaní článkov');
      }
    } catch (err) {
      console.error('Chyba pri načítavaní článkov:', err);
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie pri prvom zobrazení
  useEffect(() => {
    fetchArticles(currentPage);
  }, [currentPage, searchTerm, selectedCategory, showFeaturedOnly]);

  // Formátovanie dátumu
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Skrátenie textu
  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Obsluha stránkovania
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll na vrch stránky
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Obsluha vyhľadávania
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset na prvú stránku pri vyhľadávaní
  };

  // Obsluha resetovania filtrov
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setShowFeaturedOnly(false);
    setCurrentPage(1);
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header sekcia */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#1e293b',
          marginBottom: '10px'
        }}>
          📰 Všetky články
        </h1>
        <p style={{ 
          fontSize: '1.1rem', 
          color: '#64748b',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Prečítajte si najnovšie správy, reporty a rozhovory z nášho klubu
        </p>
      </div>

      {/* Filtre a vyhľadávanie */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        marginBottom: '30px'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ 
          display: 'flex', 
          gap: '15px', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Vyhľadávanie */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Vyhľadať články..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Filter featured článkov */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="featured"
              checked={showFeaturedOnly}
              onChange={(e) => setShowFeaturedOnly(e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            <label htmlFor="featured" style={{ fontSize: '14px', color: '#374151' }}>
              ⭐ Len vybrané
            </label>
          </div>

          {/* Tlačidlá */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🔍 Hľadať
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              ↻ Reset
            </button>
          </div>
        </form>
      </div>

      {/* Chybová správa */}
      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #dc2626'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Loading indikátor */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#64748b'
        }}>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '15px'
          }}></div>
          <p>Načítavam články...</p>
        </div>
      )}

      {/* Zobrazenie počtu výsledkov */}
      {!loading && pagination && (
        <div style={{
          marginBottom: '20px',
          color: '#64748b',
          fontSize: '14px'
        }}>
          Zobrazených {articles.length} z {pagination.totalArticles} článkov
          {searchTerm && ` pre "${searchTerm}"`}
        </div>
      )}

      {/* Grid článkov */}
      {!loading && articles.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '25px',
          marginBottom: '40px'
        }}>
          {articles.map((article) => (
            <div
              key={article.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => {
                // Navigácia na detail článku
                window.location.href = `/clanek/${article.slug}`;
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
            >
              {/* Obrázok článku */}
              <div style={{ position: 'relative' }}>
                {article.obrazok ? (
                  <img
                    src={article.obrazok}
                    alt={article.nazov}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      // Fallback pri chybe načítania obrázka
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '3rem'
                  }}>
                    📰
                  </div>
                )}
                
                {/* Featured badge */}
                {article.featured && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#f59e0b',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    ⭐ VYBRANÉ
                  </div>
                )}
              </div>

              {/* Obsah článku */}
              <div style={{ padding: '20px' }}>
                {/* Kategória a dátum */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    background: article.kategoria.farba || '#3b82f6',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {article.kategoria.ikona} {article.kategoria.nazov}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af' 
                  }}>
                    {formatDate(article.publikovany_datum || article.vytvoreny)}
                  </span>
                </div>

                {/* Názov článku */}
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  marginBottom: '10px',
                  lineHeight: '1.4'
                }}>
                  {article.nazov}
                </h3>

                {/* Excerpt */}
                {article.excerpt && (
                  <p style={{
                    color: '#64748b',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    marginBottom: '15px'
                  }}>
                    {truncateText(article.excerpt)}
                  </p>
                )}

                {/* Meta informácie */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#9ca3af'
                }}>
                  <span>✍️ {article.autor.meno}</span>
                  <span>👁️ {article.views} zobrazení</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Žiadne výsledky */}
      {!loading && articles.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📝</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
            Žiadne články nenájdené
          </h3>
          <p>
            {searchTerm 
              ? `Pre vyhľadávací výraz "${searchTerm}" neboli nájdené žiadne články.`
              : 'Momentálne nie sú publikované žiadne články.'
            }
          </p>
          {(searchTerm || selectedCategory || showFeaturedOnly) && (
            <button
              onClick={handleResetFilters}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Zobraziť všetky články
            </button>
          )}
        </div>
      )}

      {/* Stránkovanie */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          marginTop: '40px'
        }}>
          {/* Predchádzajúca stránka */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: pagination.hasPrevPage ? 'white' : '#f3f4f6',
              color: pagination.hasPrevPage ? '#374151' : '#9ca3af',
              cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed'
            }}
          >
            ← Predchádzajúca
          </button>

          {/* Čísla stránok */}
          {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
            let pageNumber: number;
            if (pagination.totalPages <= 5) {
              pageNumber = i + 1;
            } else if (currentPage <= 3) {
              pageNumber = i + 1;
            } else if (currentPage >= pagination.totalPages - 2) {
              pageNumber = pagination.totalPages - 4 + i;
            } else {
              pageNumber = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: pageNumber === currentPage ? '#3b82f6' : 'white',
                  color: pageNumber === currentPage ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontWeight: pageNumber === currentPage ? 'bold' : 'normal'
                }}
              >
                {pageNumber}
              </button>
            );
          })}

          {/* Nasledujúca stránka */}
          <button
            onClick={() => handlePageChange(currentPage)}
            disabled={!pagination.hasNextPage}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: pagination.hasNextPage ? 'white' : '#f3f4f6',
              color: pagination.hasNextPage ? '#374151' : '#9ca3af',
              cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed'
            }}
          >
            Nasledujúca →
          </button>
        </div>
      )}

      {/* CSS animácie */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ArticlesPage;