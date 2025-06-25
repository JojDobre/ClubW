//// frontend/src/components/ArticlesList.tsx
// Komponenta pre zobrazenie zoznamu článkov

import React from 'react';

const ArticlesList: React.FC = () => {
  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      <header style={{
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1a202c',
          marginBottom: '15px'
        }}>
          📰 Články a aktuality
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#718096'
        }}>
          Najnovšie správy a informácie zo sveta klubu
        </p>
      </header>

      {/* Placeholder pre články */}
      <div style={{
        background: 'white',
        padding: '60px 40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📝</div>
        <h3 style={{
          fontSize: '1.5rem',
          color: '#2d3748',
          marginBottom: '15px'
        }}>
          Články sa pripravujú
        </h3>
        <p style={{
          color: '#718096',
          marginBottom: '30px'
        }}>
          Systém pre správu článkov je už pripravený v admin rozhraní. 
          Správa článkov bude implementovaná v ďalšej fáze.
        </p>
        <a
          href="/admin"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#3182ce',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '16px'
          }}
        >
          ⚙️ Prejsť do admin rozhrania
        </a>
      </div>
    </div>
  );
};

export default ArticlesList;