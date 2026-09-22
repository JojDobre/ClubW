// frontend/src/pages/ArticleDetailPage.tsx
// Stránka pre zobrazenie detailu konkrétneho článku

import React, { useState, useEffect } from 'react';
// Sanitizácia HTML obsahu článku - ochrana pred stored XSS
import { sanitizeHtml } from '../utils/sanitize';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

// Interface pre článok z backend API
interface Article {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
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
  komentare_povolene: boolean;
  meta_title?: string;
  meta_description?: string;
  vytvoreny: string;
}

// Interface pre API response
interface ArticleResponse {
  success: boolean;
  data: Article;
  message?: string;
}

const ArticleDetailPage: React.FC = () => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

  // Získanie slug z URL
  const getSlugFromUrl = (): string => {
    const path = window.location.pathname;
    const matches = path.match(/\/clanek\/(.+)/);
    return matches ? matches[1] : '';
  };

  const slug = getSlugFromUrl();

  // Načítanie článku z API
  const fetchArticle = async () => {
    if (!slug) {
      setError('Neplatný odkaz na článok');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/articles/${slug}`));
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Článok nebol nájdený');
        } else {
          throw new Error(`HTTP chyba: ${response.status}`);
        }
        return;
      }

      const data: ArticleResponse = await response.json();
      
      if (data.success) {
        setArticle(data.data);
        setError('');
        
        // Načítanie podobných článkov z tej istej kategórie
        fetchRelatedArticles(data.data.kategoria.slug, data.data.id);
      } else {
        setError(data.message || 'Chyba pri načítavaní článku');
      }
    } catch (err) {
      console.error('Chyba pri načítavaní článku:', err);
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie podobných článkov
  const fetchRelatedArticles = async (categorySlug: string, currentArticleId: number) => {
    try {
      const response = await fetch(apiUrl(`/articles?category=${categorySlug}&limit=3`));
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filtrovanie aktuálneho článku
          const related = data.data.filter((a: Article) => a.id !== currentArticleId);
          setRelatedArticles(related.slice(0, 3));
        }
      }
    } catch (err) {
      console.error('Chyba pri načítavaní podobných článkov:', err);
    }
  };

  // Načítanie pri prvom zobrazení alebo zmene URL
  useEffect(() => {
    fetchArticle();
  }, [slug]);

  // Aktualizácia title stránky
  useEffect(() => {
    if (article) {
      document.title = article.meta_title || article.nazov + ' | ClubW';
      
      // Meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', article.meta_description || article.excerpt || '');
      }
    }

    // Cleanup pri odchode zo stránky
    return () => {
      document.title = 'ClubW - Správa športového klubu';
    };
  }, [article]);

  // Formátovanie dátumu
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Navigácia späť na zoznam článkov
  const goBackToArticles = () => {
    window.location.href = '/clanky';
  };

  // Zdieľanie článku
  const shareArticle = () => {
    if (navigator.share && article) {
      navigator.share({
        title: article.nazov,
        text: article.excerpt || '',
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback - kopírovanie do schránky
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Odkaz bol skopírovaný do schránky!');
      }).catch(() => {
        alert('Odkaz: ' + window.location.href);
      });
    }
  };

  // Loading stav
  if (loading) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
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
        <p style={{ color: '#64748b', fontSize: '16px' }}>
          Načítavam článok...
        </p>
      </div>
    );
  }

  // Error stav
  if (error) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>😞</div>
        <h1 style={{ fontSize: '2rem', marginBottom: '15px', color: '#dc2626' }}>
          {error}
        </h1>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>
          Článok sa nepodarilo načítať. Skontrolujte prosím URL adresu.
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={goBackToArticles}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ← Späť na články
          </button>
          <button
            onClick={fetchArticle}
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
            🔄 Skúsiť znovu
          </button>
        </div>
      </div>
    );
  }

  // Hlavný obsah článku
  if (!article) {
    return null;
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6',
      color: '#1e293b'
    }}>
      {/* Navigačná lišta */}
      <nav style={{
        background: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '15px 0',
        marginBottom: '0',
        position: 'sticky',
        top: '0',
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={goBackToArticles}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Späť na články
          </button>
          
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#3b82f6'
          }}>
            ⚽ ClubW
          </div>

          <button
            onClick={shareArticle}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              color: '#374151',
              padding: '8px 15px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📤 Zdieľať
          </button>
        </div>
      </nav>

      {/* Hlavný obsah */}
      <article style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Header článku */}
        <header style={{ marginBottom: '40px' }}>
          {/* Kategória */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{
              background: article.kategoria.farba || '#3b82f6',
              color: 'white',
              padding: '6px 15px',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-block'
            }}>
              {article.kategoria.ikona} {article.kategoria.nazov}
            </span>
            {article.featured && (
              <span style={{
                background: '#f59e0b',
                color: 'white',
                padding: '6px 15px',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: '500',
                marginLeft: '10px'
              }}>
                ⭐ VYBRANÉ
              </span>
            )}
          </div>

          {/* Názov */}
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '20px',
            lineHeight: '1.2'
          }}>
            {article.nazov}
          </h1>

          {/* Meta informácie */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 0',
            borderTop: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            color: '#64748b',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span>✍️ {article.autor.meno}</span>
              <span>📅 {formatDate(article.publikovany_datum || article.vytvoreny)}</span>
            </div>
            <span>👁️ {article.views} zobrazení</span>
          </div>

          {/* Excerpt */}
          {article.excerpt && (
            <div style={{
              fontSize: '1.2rem',
              color: '#64748b',
              fontStyle: 'italic',
              marginTop: '20px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6'
            }}>
              {article.excerpt}
            </div>
          )}
        </header>

        {/* Hlavný obrázok */}
        {article.obrazok && (
          <div style={{
            marginBottom: '40px',
            textAlign: 'center'
          }}>
            <img
              src={article.obrazok}
              alt={article.nazov}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Obsah článku */}
        <div 
          style={{
            fontSize: '1.1rem',
            lineHeight: '1.8',
            marginBottom: '40px'
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.obsah) }}
        />

        {/* Tagy */}
        {article.tags && article.tags.length > 0 && (
          <div style={{
            padding: '20px 0',
            borderTop: '1px solid #e2e8f0',
            marginBottom: '40px'
          }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              marginBottom: '15px',
              color: '#374151'
            }}>
              🏷️ Tagy:
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {article.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    padding: '4px 12px',
                    borderRadius: '15px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db'
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Akcie */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          padding: '30px 0',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <button
            onClick={shareArticle}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📤 Zdieľať článok
          </button>
          <button
            onClick={goBackToArticles}
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
            📰 Všetky články
          </button>
        </div>
      </article>

      {/* Podobné články */}
      {relatedArticles.length > 0 && (
        <section style={{
          background: '#f8fafc',
          padding: '60px 20px'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '40px',
              color: '#1e293b'
            }}>
              📖 Podobné články
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '25px'
            }}>
              {relatedArticles.map((relatedArticle) => (
                <div
                  key={relatedArticle.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onClick={() => {
                    window.location.href = `/clanek/${relatedArticle.slug}`;
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {relatedArticle.obrazok && (
                    <img
                      src={relatedArticle.obrazok}
                      alt={relatedArticle.nazov}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <div style={{ padding: '20px' }}>
                    <div style={{
                      background: relatedArticle.kategoria.farba || '#3b82f6',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      marginBottom: '10px',
                      display: 'inline-block'
                    }}>
                      {relatedArticle.kategoria.ikona} {relatedArticle.kategoria.nazov}
                    </div>
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      lineHeight: '1.3'
                    }}>
                      {relatedArticle.nazov}
                    </h3>
                    {relatedArticle.excerpt && (
                      <p style={{
                        color: '#64748b',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {relatedArticle.excerpt.length > 100 
                          ? relatedArticle.excerpt.substring(0, 100) + '...'
                          : relatedArticle.excerpt
                        }
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CSS animácie */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Štýly pre obsah článku */
        article h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 30px 0 15px 0;
          color: #1e293b;
        }
        
        article h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 25px 0 10px 0;
          color: #374151;
        }
        
        article p {
          margin-bottom: 15px;
        }
        
        article ul, article ol {
          margin: 15px 0;
          padding-left: 30px;
        }
        
        article li {
          margin-bottom: 5px;
        }
        
        article blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 20px;
          margin: 20px 0;
          font-style: italic;
          color: #64748b;
        }
        
        article img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        article a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        article a:hover {
          color: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default ArticleDetailPage;