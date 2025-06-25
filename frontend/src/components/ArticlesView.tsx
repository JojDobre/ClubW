// frontend/src/components/ArticleView.tsx
// Komponenta pre zobrazenie detailu článku

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ArticleView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
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
        <a href="/clanky" style={{ color: '#3182ce', textDecoration: 'none' }}>
          Články
        </a>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{slug}</span>
      </nav>

      {/* Placeholder pre článok */}
      <div style={{
        background: 'white',
        padding: '60px 40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📰</div>
        <h2 style={{
          fontSize: '1.8rem',
          color: '#2d3748',
          marginBottom: '15px'
        }}>
          Článok "{slug}"
        </h2>
        <p style={{
          color: '#718096',
          marginBottom: '30px'
        }}>
          Systém pre zobrazovanie článkov je pripravený. 
          Implementácia článkov bude dokončená v ďalšej fáze.
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
              fontSize: '16px'
            }}
          >
            ← Späť
          </button>
          <a
            href="/clanky"
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
            📰 Všetky články
          </a>
        </div>
      </div>
    </div>
  );
};

export default ArticleView;