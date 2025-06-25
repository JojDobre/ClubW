// frontend/src/App.tsx
// Hlavná aplikácia s prihlasovaním a admin rozhraním

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import PageView from './components/PageView';

// Lazy loading komponentov
const ResponsiveAdminDashboard = lazy(() => import('./components/AdminDashboard'));
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

// ✅ PRIDANÉ: Nová komponenta pre routing logiku
const AppContent: React.FC<{
  user: User | null;
  onLoginSuccess: (userData: User) => void;
  onLogout: () => void;
}> = ({ user, onLoginSuccess, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isArticlesPage = currentPath === '/clanky';
  const isArticleDetailPage = currentPath.startsWith('/clanek/');
  const isAdminPath = currentPath.startsWith('/admin');
  const isHomePage = currentPath === '/';

  // Pre domovskú stránku - zobraz verejný layout
  if (isHomePage) {
    return (
      <PublicLayout>
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a202c' }}>
            🏆 Vitajte v ClubW
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#4a5568', marginBottom: '30px' }}>
            Moderná platforma pre správu športových klubov
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginTop: '40px'
          }}>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#2d3748', marginBottom: '15px' }}>📰 Aktuality</h3>
              <p style={{ color: '#718096' }}>Najnovšie správy zo sveta klubu</p>
              <a href="/clanky" style={{
                display: 'inline-block',
                marginTop: '15px',
                padding: '8px 16px',
                background: '#3182ce',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px'
              }}>
                Zobraziť články
              </a>
            </div>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#2d3748', marginBottom: '15px' }}>⚙️ Správa</h3>
              <p style={{ color: '#718096' }}>Admin rozhranie pre správu obsahu</p>
              <a href="/admin" style={{
                display: 'inline-block',
                marginTop: '15px',
                padding: '8px 16px',
                background: '#38a169',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px'
              }}>
                Admin panel
              </a>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Ak je stránka /clanky, zobraz len ArticlesPage
  if (isArticlesPage) {
    return (
      <Suspense
        fallback={
          <PublicLayout>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '400px',
              background: '#f8fafc'
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
                <p style={{ color: '#64748b', fontWeight: '500' }}>Načítavam články...</p>
              </div>
            </div>
          </PublicLayout>
        }
      >
        <PublicLayout>
          <ArticlesPage />
        </PublicLayout>
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
          <PublicLayout>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '400px',
              background: '#f8fafc'
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
                <p style={{ color: '#64748b', fontWeight: '500' }}>Načítavam článok...</p>
              </div>
            </div>
          </PublicLayout>
        }
      >
        <PublicLayout>
          <ArticleDetailPage />
        </PublicLayout>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Suspense>
    );
  }

  // ✅ UPRAVENÉ: Pre admin cesty - kontrola prihlásenia
  if (isAdminPath) {
    if (!user) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '20px',
          background: '#f8fafc'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '400px'
          }}>
            <Login onLoginSuccess={onLoginSuccess} />
          </div>
        </div>
      );
    }

    return (
      <Suspense
        fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#f8fafc'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid #e2e8f0',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 24px'
              }}></div>
              <div style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#1e293b',
                marginBottom: '8px'
              }}>
                Načítavam administráciu...
              </div>
              <div style={{
                fontSize: '14px',
                color: '#64748b'
              }}>
                Pripravujem admin panel
              </div>
            </div>
          </div>
        }
      >
        <ResponsiveAdminDashboard 
          user={user} 
          onLogout={onLogout} 
        />
      </Suspense>
    );
  }

  // ✅ PRIDANÉ: Pre ostatné cesty - dynamické stránky z databázy
  return (
    <Routes>
      <Route path="/:slug" element={
        <PublicLayout>
          <PageView />
        </PublicLayout>
      } />
      <Route path="*" element={
        <PublicLayout>
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>🔍</h1>
            <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#2d3748' }}>
              Stránka nenájdená
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#718096', marginBottom: '30px' }}>
              Ľutujeme, ale stránka ktorú hľadáte neexistuje alebo bola presunutá.
            </p>
            <a 
              href="/" 
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
              ← Späť na domovskú stránku
            </a>
          </div>
        </PublicLayout>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }}></div>
          <div style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#1e293b',
            marginBottom: '8px'
          }}>
            Načítavam ClubW...
          </div>
          <div style={{
            fontSize: '14px',
            color: '#64748b'
          }}>
            Správa športového klubu
          </div>
        </div>
      </div>
    );
  }

  // ✅ UPRAVENÉ: Hlavný return s Router wrapper
  return (
    <Router>
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <AppContent
          user={user}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
        />
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </Router>
  );
}

export default App;