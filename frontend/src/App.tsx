// frontend/src/App.tsx
// Hlavná aplikácia s prihlasovaním a admin rozhraním

import React, { useState, useEffect } from 'react';

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

// Import komponentov - lazy loading aby sme sa vyhli circular deps
const Login = React.lazy(() => import('./components/Login'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('clubw_token');
        const savedUser = localStorage.getItem('clubw_user');

        if (token && savedUser) {
          const response = await fetch('http://localhost:3000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setUser(data.data.user);
            } else {
              localStorage.removeItem('clubw_token');
              localStorage.removeItem('clubw_user');
            }
          } else {
            localStorage.removeItem('clubw_token');
            localStorage.removeItem('clubw_user');
          }
        }
      } catch (error) {
        console.error('Chyba pri kontrole autentifikácie:', error);
        localStorage.removeItem('clubw_token');
        localStorage.removeItem('clubw_user');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('clubw_token');
    localStorage.removeItem('clubw_user');
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Načítavam ClubW...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <React.Suspense fallback={
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          Načítavam...
        </div>
      }>
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
      </React.Suspense>
      
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