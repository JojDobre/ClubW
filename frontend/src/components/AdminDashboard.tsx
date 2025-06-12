// frontend/src/components/AdminDashboard.tsx
// Hlavný admin dashboard po prihlásení

import React, { useState } from 'react';

// Lazy import UserManagement
const UserManagement = React.lazy(() => import('./UserManagement'));

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

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Chyba pri odhlásení:', error);
    } finally {
      localStorage.removeItem('clubw_token');
      localStorage.removeItem('clubw_user');
      onLogout();
    }
  };

  const getRoleIcon = (rola: string) => {
    switch (rola) {
      case 'admin': return '👑';
      case 'redaktor': return '✍️';
      case 'trener': return '⚽';
      default: return '👤';
    }
  };

  const getRoleName = (rola: string) => {
    switch (rola) {
      case 'admin': return 'Administrátor';
      case 'redaktor': return 'Redaktor';
      case 'trener': return 'Tréner';
      default: return 'Používateľ';
    }
  };

  const getMenuItems = () => {
    const items = [
      { id: 'dashboard', name: 'Dashboard', icon: '📊', roles: ['admin', 'redaktor', 'trener'] },
      { id: 'users', name: 'Správa účtov', icon: '👥', roles: ['admin'] },
      { id: 'articles', name: 'Články', icon: '📰', roles: ['admin', 'redaktor'] },
      { id: 'teams', name: 'Tímy', icon: '⚽', roles: ['admin', 'trener'] },
    ];

    return items.filter(item => item.roles.includes(user.rola));
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div>
            <h1 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
              🏠 Dashboard
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Články</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>12</div>
                <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>Publikované tento mesiac</p>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Tímy</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>3</div>
                <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>Aktívne tímy</p>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Hráči</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>67</div>
                <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>Registrovaní hráči</p>
              </div>
            </div>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>Posledné aktivity</h2>
              <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#475569' }}>📰 Nový článok "Víťazstvo v derby" bol publikovaný</li>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#475569' }}>⚽ Aktualizované údaje A-tímu</li>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#475569' }}>👤 Nový hráč František Novák pridaný do U19</li>
                <li style={{ padding: '12px 0', fontSize: '14px', color: '#475569' }}>🏆 Výsledok zápasu proti FC Trenčín zadaný</li>
              </ul>
            </div>
          </div>
        );
      
      case 'users':
        return (
          <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Načítavam správu používateľov...</div>}>
            <UserManagement currentUser={user} />
          </React.Suspense>
        );
      
      case 'articles':
        return (
          <div>
            <h1 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
              📰 Správa článkov
            </h1>
            <button style={{ 
              padding: '10px 20px', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              marginBottom: '24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              ➕ Nový článok
            </button>
            <p style={{ color: '#64748b' }}>Správa článkov a rubrík bude implementovaná v Fáze 2.</p>
          </div>
        );
      
      case 'teams':
        return (
          <div>
            <h1 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
              ⚽ Správa tímov
            </h1>
            <button style={{ 
              padding: '10px 20px', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              marginBottom: '24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              ➕ Nový tím
            </button>
            <p style={{ color: '#64748b' }}>Správa tímov a hráčov bude implementovaná v Fáze 3.</p>
          </div>
        );
      
      default:
        return <div>Stránka nenájdená</div>;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 'bold' }}>⚽ ClubW</h2>
          <p style={{ margin: '0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>Admin rozhranie</p>
        </div>
        
        <nav style={{ flex: 1, padding: '20px 0' }}>
          {getMenuItems().map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '12px 20px',
                background: currentPage === item.id ? 'rgba(59, 130, 246, 0.2)' : 'none',
                border: 'none',
                color: currentPage === item.id ? 'white' : 'rgba(255, 255, 255, 0.8)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                borderRight: currentPage === item.id ? '3px solid #3b82f6' : 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                }
              }}
            >
              <span style={{ marginRight: '12px', fontSize: '16px' }}>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <header style={{
          background: 'white',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
            ClubW Admin
            {currentPage !== 'dashboard' && (
              <span> / {getMenuItems().find(item => item.id === currentPage)?.name}</span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{getRoleIcon(user.rola)}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{user.meno}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{getRoleName(user.rola)}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              🚪 Odhlásiť
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          {renderPageContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;