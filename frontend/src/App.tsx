// frontend/src/App.tsx
// Hlavná aplikácia s prihlasovaním a admin rozhraním

import React, { useState, useEffect, Suspense, lazy } from 'react';

// Lazy loading komponentov
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const Login = lazy(() => import('./components/Login'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));

interface User {
  id: number;
  meno: string;
  email: string;
  rola: 'admin' | 'redaktor' | 'trener' | 'uzivatel';
  tim_id?: number;
  aktivity: boolean;
  posledne_prihlasenie: string | null;
  vytvoreny: string;
  aktualizovany: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Kontrola aktuálnej stránky na základe URL
  const currentPath = window.location.pathname;
  const isArticlesPage = currentPath === '/clanky';
  const isArticleDetailPage = currentPath.startsWith('/clanek/');

  // Inicializácia - kontrola či je používateľ prihlásený
  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('clubw_token');
      const savedUser = localStorage.getItem('clubw_user');

      if (token && savedUser) {
        try {
          // Overenie tokenu na serveri
          const response = await fetch('http://localhost:3000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setUser(JSON.parse(savedUser));
            } else {
              // Token je neplatný
              localStorage.removeItem('clubw_token');
              localStorage.removeItem('clubw_user');
            }
          }
        } catch (error) {
          console.error('Chyba pri overovaní tokenu:', error);
          localStorage.removeItem('clubw_token');
          localStorage.removeItem('clubw_user');
        }
      }

      setLoading(false);
    };

    initializeApp();
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('clubw_token');
    localStorage.removeItem('clubw_user');
  };

  // Loading obrazovka
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#64748b', fontSize: '16px' }}>
            Načítavam ClubW...
          </p>
        </div>
      </div>
    );
  }

  // Ak je stránka /clanky, zobraz len ArticlesPage
  if (isArticlesPage) {
    return (
      <Suspense
        fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 15px'
              }}></div>
              <p style={{ color: '#64748b' }}>Načítavam články...</p>
            </div>
          </div>
        }
      >
        <ArticlesPage />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Suspense>
    );
  }

  // Ak je stránka /clanek/:slug, zobraz detail článku
  if (isArticleDetailPage) {
    return (
      <Suspense
        fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 15px'
              }}></div>
              <p style={{ color: '#64748b' }}>Načítavam článok...</p>
            </div>
          </div>
        }
      >
        <ArticleDetailPage />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Suspense>
    );
  }

  // Pôvodná logika pre admin/login stránky
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Suspense
        fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p style={{ color: '#64748b', fontSize: '16px' }}>
                Načítavam...
              </p>
            </div>
          </div>
        }
      >
        {user ? (
          <AdminDashboard 
            user={user} 
            onLogout={handleLogout} 
          />
        ) : (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
          />
        )}
      </Suspense>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;   