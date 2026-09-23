// Umiestnenie: sablony/zakladna/src/stranky/Stranka.tsx
// Komponenta pre zobrazenie statickej stránky podľa slug

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Sanitizácia HTML obsahu stránky - ochrana pred stored XSS
import { sanitizeHtml } from '@clubw/jadro';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '@clubw/jadro';
import { ObsahSFormularmi } from '@clubw/jadro';
import { skusPresmerovat } from '@clubw/jadro';

interface Page {
  id: number;
  nazov: string;
  obsah: string;
  slug: string;
  meta_title?: string;
  meta_description?: string;
  vytvoreny: string;
  aktualizovany: string;
  url: string;
  word_count: number;
  /** Vracia ho aj verejný endpoint; v náhľade podľa neho ukážeme upozornenie. */
  publikovany?: boolean;
}

const PageView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  /**
   * Náhľad z administrácie: ?nahlad=<id> načíta stránku cez administrátorský
   * endpoint, ktorý vracia aj nepublikované. Verejný endpoint by koncept
   * nenašiel a náhľad by skončil na „Stránka nebola nájdená".
   */
  const nahladId = new URLSearchParams(window.location.search).get('nahlad');
  const jeNahlad = Boolean(nahladId);

  // Načítanie stránky z API
  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setError('Neplatný slug stránky');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const token = localStorage.getItem('clubw_token');
        const response = jeNahlad
          ? await fetch(apiUrl(`/admin/pages/${nahladId}/nahlad`), {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: 'include',
            })
          : await fetch(apiUrl(`/pages/${slug}`));
        const data = await response.json();

        if (response.status === 404) {
          // Stará adresa môže mať nastavené presmerovanie
          if (!jeNahlad && (await skusPresmerovat())) return;
          setError('Stránka nebola nájdená');
        } else if (jeNahlad && (response.status === 401 || response.status === 403)) {
          setError('Na náhľad nepublikovanej stránky sa musíte prihlásiť do administrácie.');
        } else if (data.success) {
          const stranka = data.data;
          setPage(stranka);

          // Nastavenie SEO meta tagov
          if (stranka.meta_title) {
            document.title = stranka.meta_title;
          } else {
            document.title = `${stranka.nazov} | ClubW`;
          }

          // Meta description
          if (stranka.meta_description) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
              metaDesc = document.createElement('meta');
              metaDesc.setAttribute('name', 'description');
              document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', stranka.meta_description);
          }
        } else {
          setError(data.message || 'Chyba pri načítavaní stránky');
        }
      } catch (err) {
        console.error('Chyba pri načítavaní stránky:', err);
        setError('Chyba pri načítavaní stránky');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug, jeNahlad, nahladId]);

  // Reset title pri opustení komponenty
  useEffect(() => {
    return () => {
      document.title = 'ClubW';
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
        <h2 style={{ color: '#4a5568', marginBottom: '10px' }}>Načítavam stránku...</h2>
        <p style={{ color: '#718096' }}>Prosím čakajte, načítavam obsah stránky.</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>❌</div>
        <h2 style={{ 
          color: '#e53e3e', 
          marginBottom: '20px',
          fontSize: '1.8rem' 
        }}>
          {error}
        </h2>
        <p style={{ 
          color: '#718096', 
          marginBottom: '30px',
          fontSize: '1.1rem'
        }}>
          {error === 'Stránka nebola nájdená' 
            ? `Stránka s adresou "/${slug}" neexistuje alebo nie je publikovaná.`
            : 'Nastala chyba pri načítavaní obsahu stránky.'
          }
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              background: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              textDecoration: 'none'
            }}
          >
            ← Späť
          </button>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#38a169',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          >
            🏠 Domov
          </a>
        </div>
      </div>
    );
  }

  // Page content
  if (!page) {
    return null;
  }

  return (
    <article style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      {/* Pruh náhľadu - na prvý pohľad jasné, že toto ešte nemusí byť na webe */}
      {jeNahlad && (
        <div style={{
          background: '#92400e',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '20px',
        }}>
          Náhľad stránky — takto bude vyzerať na webe.
          {!page.publikovany ? ' Zatiaľ nie je publikovaná, návštevníci ju nevidia.' : ''}
        </div>
      )}

      {/* Breadcrumb */}
      <nav style={{
        marginBottom: '30px',
        padding: '10px 0',
        fontSize: '14px',
        color: '#718096'
      }}>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>
          Domov
        </a>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{page.nazov}</span>
      </nav>

      {/* Hlavička stránky */}
      <header style={{
        marginBottom: '40px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1a202c',
          marginBottom: '15px',
          lineHeight: '1.2'
        }}>
          {page.nazov}
        </h1>
        
        {/* Meta informácie */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          color: '#718096',
          fontSize: '14px',
          alignItems: 'center'
        }}>
          <span>
            📅 Aktualizované: {new Date(page.aktualizovany).toLocaleDateString('sk-SK', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
          <span>📖 {page.word_count} slov</span>
          <span>🔗 /{page.slug}</span>
        </div>
      </header>

      {/* Obsah stránky */}
      {/* Značka [formular slug] v obsahu vloží formulár */}
      <ObsahSFormularmi
        style={{
          fontSize: '1.1rem',
          lineHeight: '1.7',
          color: '#2d3748'
        }}
        html={sanitizeHtml(page.obsah)}
      />

      {/* Footer informácie */}
      <footer style={{
        marginTop: '60px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0',
        color: '#718096',
        fontSize: '14px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <p>
              <strong>Vytvorené:</strong> {new Date(page.vytvoreny).toLocaleDateString('sk-SK')}
            </p>
            {page.vytvoreny !== page.aktualizovany && (
              <p>
                <strong>Naposledy upravené:</strong> {new Date(page.aktualizovany).toLocaleDateString('sk-SK')}
              </p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: '8px 16px',
                background: '#f7fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#4a5568'
              }}
            >
              🖨️ Tlačiť
            </button>
            
            <button
              onClick={() => {
                navigator.share?.({
                  title: page.nazov,
                  text: page.meta_description || page.nazov,
                  url: window.location.href
                }).catch(() => {
                  // Fallback - skopírovanie do clipboard
                  navigator.clipboard?.writeText(window.location.href);
                  alert('Odkaz skopírovaný do schránky!');
                });
              }}
              style={{
                padding: '8px 16px',
                background: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔗 Zdieľať
            </button>
          </div>
        </div>
      </footer>
    </article>
  );
};

export default PageView;