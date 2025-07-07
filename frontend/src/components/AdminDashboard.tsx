// frontend/src/components/ResponsiveAdminDashboard.tsx
// Responzívny admin dashboard s customizable widgets

import React, { useState, useEffect, lazy, Suspense } from 'react';

// Lazy loading komponentov
const UserManagement = lazy(() => import('./UserManagement'));
const CategoryManagement = lazy(() => import('./CategoryManagement'));
const ArticleManagement = lazy(() => import('./ArticleManagement'));
const TeamsManagement = lazy(() => import('./TeamsManagement'));
const PlayersManagementAdmin = lazy(() => import('./PlayersManagementAdmin'));
const StaffManagementAdmin = lazy(() => import('./StaffManagementAdmin'));
const LigaManagement = lazy(() => import('./LigaManagement'));
const ZapasManagement = lazy(() => import('./ZapasManagement'));
const KalendarManagement = lazy(() => import('./KalendarManagement'));
const PageManagement = lazy(() => import('./PageManagement')); 
const GaleriaManagement = lazy(() => import('./GaleriaManagement'));


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

interface MenuItem {
  id: string;
  name: string;
  icon: string;
  component?: React.ComponentType<any>;
  roles: string[];
  badge?: string | number;
}

interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  icon: string;
  enabled: boolean;
  order: number;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  action: () => void;
  enabled: boolean;
  order: number;
}

interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
  type: 'success' | 'info' | 'warning' | 'error';
  user?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Dashboard customization
  const [showCardSettings, setShowCardSettings] = useState(false);
  const [showActionSettings, setShowActionSettings] = useState(false);
  
  // Data states
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([
    {
      id: 'articles',
      title: 'Články',
      value: 0,
      subtitle: 'Publikované',
      color: '#3b82f6',
      icon: '📄',
      enabled: true,
      order: 1
    },
    {
      id: 'pages', // NOVÉ - FÁZA 5
      title: 'Stránky',
      value: '8',
      subtitle: '3 v menu',
      color: '#10b981',
      icon: '📄',
      enabled: true,
      order: 2
    },
    {
      id: 'views',
      title: 'Zobrazenia (30d)',
      value: 0,
      subtitle: '+12% oproti minulému',
      color: '#10b981',
      icon: '👁',
      enabled: true,
      order: 3
    },
    {
    id: 'teams',
    title: 'Tímy',
    value: 0,
    subtitle: 'Aktívnych tímov',
    color: '#8b5cf6',
    icon: '⚽',
    enabled: true,
    order: 4
  },
  {
    id: 'players',
    title: 'Hráči',
    value: 0,
    subtitle: 'Registrovaných hráčov',
    color: '#f59e0b',
    icon: '🏃',
    enabled: true,
    order: 5
  },
  {
    id: 'staff',
    title: 'Realizačný tím',
    value: 0,
    subtitle: 'Členov realizačného tímu',
    color: '#ef4444',
    icon: '👨‍💼',
    enabled: true,
    order: 6
  },
    {
      id: 'nextMatch',
      title: 'Najbližší zápas',
      value: 'Žiadny',
      subtitle: 'Naplánovaný',
      color: '#f59e0b',
      icon: '⚽',
      enabled: true,
      order: 3
    },
    {
      id: 'visitors',
      title: 'Návštevníci (30d)',
      value: 0,
      subtitle: 'Aktívni používatelia',
      color: '#8b5cf6',
      icon: '👥',
      enabled: true,
      order: 4
    },
    {
      id: 'ligy',
      title: 'Ligy',
      value: 0,
      subtitle: 'Aktívnych súťaží',
      color: '#10b981',
      icon: '🏆',
      enabled: true,
      order: 5
    },
    {
      id: 'zapasy',
      title: 'Zápasy',
      value: 0,
      subtitle: 'V tejto sezóne',
      color: '#6366f1',
      icon: '⚔️',
      enabled: true,
      order: 6
    },
    {
      id: 'next_match',
      title: 'Najbližší zápas',
      value: 'Načítavam...',
      subtitle: '',
      color: '#f97316',
      icon: '📅',
      enabled: true,
      order: 7
    },
    {
      id: 'galerie',
      title: 'Fotogalérie',
      value: 0,
      subtitle: 'Aktívnych galérií',
      color: '#8b5cf6',
      icon: '📸',
      enabled: true,
      order: 8
    }
  ]);

  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    {
      id: 'newArticle',
      title: 'Nový článok',
      icon: '📝',
      action: () => setCurrentPage('articles'),
      enabled: true,
      order: 1
    },
    {
      id: 'newCategory',
      title: 'Nová kategória',
      icon: '🏷',
      action: () => setCurrentPage('categories'),
      enabled: true,
      order: 2
    },
    {
      id: 'newPage', // NOVÉ - FÁZA 5
      title: 'Nová stránka',
      icon: '📄',
      action: () => setCurrentPage('pages'),
      enabled: true,
      order: 3
    },
    {
    id: 'newTeam',
    title: 'Nový tím',
    icon: '⚽',
    action: () => setCurrentPage('teams'),
    enabled: true,
    order: 4
  },
  {
    id: 'newPlayer',
    title: 'Nový hráč',
    icon: '🏃',
    action: () => setCurrentPage('players'),
    enabled: true,
    order: 5
  },
  {
    id: 'newStaff',
    title: 'Nový člen realizačného tímu',
    icon: '👨‍💼',
    action: () => setCurrentPage('staff'),
    enabled: true,
    order: 6
  },
    {
      id: 'viewWebsite2',
      title: 'Zobraziť web',
      icon: '🌐',
      action: () => window.open('/clanky', '_blank'),
      enabled: true,
      order: 3
    },
    {
      id: 'statistics',
      title: 'Štatistiky',
      icon: '📊',
      action: () => alert('Štatistiky - pripravuje sa'),
      enabled: false,
      order: 4
    },
    {
      id: 'newLiga',
      title: 'Nová liga',
      icon: '🏆',
      action: () => setCurrentPage('ligy'),
      enabled: true,
      order: 6
    },
    {
      id: 'newZapas',
      title: 'Nový zápas',
      icon: '⚔️',
      action: () => setCurrentPage('zapasy'),
      enabled: true,
      order: 7
    },
    
    {
      id: 'viewWebsite',
      title: 'Zobraziť web',
      icon: '🌐',
      action: () => window.open('/clanky', '_blank'),
      enabled: true,
      order: 8
    },
    {
      id: 'newGaleria',
      title: 'Nová galéria',
      icon: '📸',
      action: () => setCurrentPage('galerie'),
      enabled: true,
      order: 9
    },
  ]);

  // Menu items
  const menuItems: MenuItem[] = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊', roles: ['admin', 'redaktor', 'trener'] },
    { id: 'articles', name: 'Články', icon: '📄', component: ArticleManagement, roles: ['admin', 'redaktor'] },
    { id: 'categories', name: 'Kategórie', icon: '🏷', component: CategoryManagement, roles: ['admin'] },
    { id: 'pages', name: 'Stránky', icon: '📄', component: PageManagement, roles: ['admin', 'redaktor'] }, // NOVÉ
    { id: 'galerie', name: 'Fotogalérie', icon: '📸', component: GaleriaManagement, roles: ['admin', 'redaktor'] },

    { id: 'users', name: 'Používatelia', icon: '👥', component: UserManagement, roles: ['admin'] },
    { id: 'teams', name: 'Tímy', icon: '⚽', component: TeamsManagement, roles: ['admin', 'trener'] },
    { id: 'players', name: 'Hráči', icon: '🏃', component: PlayersManagementAdmin, roles: ['admin', 'trener'] },
    { id: 'staff', name: 'Realizačný tím', icon: '👨‍💼', component: StaffManagementAdmin, roles: ['admin', 'trener'] },
        
    { id: 'ligy', name: 'Ligy & Súťaže', icon: '🏆', component: LigaManagement, roles: ['admin', 'trener'] },
    { id: 'zapasy', name: 'Zápasy', icon: '⚔️', component: ZapasManagement, roles: ['admin', 'trener'] },
    { id: 'kalendar', name: 'Kalendár', icon: '📅', component: KalendarManagement, roles: ['admin', 'trener', 'redaktor'] }, // PRIDANÉ component
    { id: 'statistiky', name: 'Štatistiky', icon: '📊', roles: ['admin', 'trener'] },
    
    { id: 'settings', name: 'Nastavenia', icon: '⚙', roles: ['admin'] },
  ];

  // Responsive detection
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch real data
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('clubw_token');
      
      // Fetch stats
      const statsResponse = await fetch('http://localhost:3000/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Načítanie tímov
      const teamsResponse = await fetch('http://localhost:3000/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Načítanie hráčov
      const playersResponse = await fetch('http://localhost:3000/api/players', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Načítanie realizačného tímu
      const staffResponse = await fetch('http://localhost:3000/api/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // OPRAVENÉ: Načítanie lig - správny endpoint
      const ligyResponse = await fetch('http://localhost:3000/api/leagues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Načítanie zápasov
      const zapasyResponse = await fetch('http://localhost:3000/api/zapasy/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
          updateDashboardCards(statsData.data);
        }
      }

      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setDashboardCards(prev => prev.map(card => 
          card.id === 'teams' ? { ...card, value: teamsData.count || 0 } : card
        ));
      }

      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        setDashboardCards(prev => prev.map(card => 
          card.id === 'players' ? { ...card, value: playersData.count || 0 } : card
        ));
      }

      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        setDashboardCards(prev => prev.map(card => 
          card.id === 'staff' ? { ...card, value: staffData.count || 0 } : card
        ));
      }

      // OPRAVENÉ: Správne spracovanie odpovede z líg
      if (ligyResponse.ok) {
        const ligyData = await ligyResponse.json();
        setDashboardCards(prev => prev.map(card => 
          card.id === 'ligy' ? { ...card, value: ligyData.count || 0 } : card
        ));
      }

      if (zapasyResponse.ok) {
        const zapasyData = await zapasyResponse.json();
        setDashboardCards(prev => prev.map(card => 
          card.id === 'zapasy' ? { ...card, value: zapasyData.total || 0 } : card
        ));
      }

      // Fetch recent activities (mock for now)
      await fetchRecentActivities();
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchRecentActivities = async () => {
    // Simulácia real activities - neskôr nahradiť skutočným API
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        message: 'Publikovaný nový článok "Víťazstvo v derby"',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        type: 'success',
        user: user.meno
      },
      {
        id: '2',
        message: 'Vytvorená nová kategória "Tréningy"',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        type: 'info',
        user: 'Admin'
      },
      {
        id: '3',
        message: 'Prihlásený nový používateľ',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        type: 'info'
      },
      {
        id: '4',
        message: 'Aktualizované nastavenia webu',
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        type: 'success',
        user: user.meno
      }
    ];
    
    setActivities(mockActivities);
  };

  const updateDashboardCards = (statsData: any) => {
    setDashboardCards(prev => prev.map(card => {
      switch (card.id) {
        case 'articles':
          return { ...card, value: statsData.publishedArticles || 0, subtitle: `z ${statsData.totalArticles || 0} celkovo` };
        case 'views':
          return { ...card, value: (statsData.totalViews || 0).toLocaleString('sk') };
        case 'visitors':
          return { ...card, value: Math.round((statsData.totalViews || 0) / 30) }; // Aproximácia
        default:
          return card;
      }
    }));
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter menu by roles
  const getFilteredMenuItems = () => {
    return menuItems.filter(item => item.roles.includes(user.rola));
  };

  // Get role info
  const getRoleInfo = (rola: string) => {
    const roles: Record<string, { name: string; icon: string }> = {
      admin: { name: 'Administrátor', icon: '👑' },
      redaktor: { name: 'Redaktor', icon: '✏' },
      trener: { name: 'Tréner', icon: '⚽' },
      uzivatel: { name: 'Používateľ', icon: '👤' }
    };
    return roles[rola] || roles.uzivatel;
  };

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Práve teraz';
    if (diffMins < 60) return `Pred ${diffMins} min`;
    if (diffHours < 24) return `Pred ${diffHours} h`;
    return `Pred ${diffDays} d`;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('clubw_token');
      localStorage.removeItem('clubw_user');
      onLogout();
    }
  };

  // Dashboard content
  const renderDashboardContent = () => (
    <div style={{ 
      padding: isMobile ? '16px' : '24px',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Welcome section */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: isMobile ? '1.8rem' : '2.5rem',
          fontWeight: 'bold',
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          Vitajte späť, {user.meno}
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#64748b',
          marginBottom: '0'
        }}>
          {getRoleInfo(user.rola).icon} {getRoleInfo(user.rola).name}
        </p>
      </div>

      {/* Dashboard cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile 
          ? '1fr' 
          : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: isMobile ? '16px' : '20px',
        marginBottom: '32px'
      }}>
        {dashboardCards
          .filter(card => card.enabled)
          .sort((a, b) => a.order - b.order)
          .map((card) => (
            <div
              key={card.id}
              style={{
                background: 'white',
                padding: isMobile ? '20px' : '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: `3px solid ${card.color}15`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 15px -3px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#64748b',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {card.title}
                </h3>
                <span style={{ 
                  fontSize: '24px',
                  filter: 'grayscale(0.3)'
                }}>
                  {card.icon}
                </span>
              </div>
              <div style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 'bold', color: card.color, marginBottom: '8px' }}>
                {card.value}
              </div>
              {card.subtitle && (
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {card.subtitle}
                </div>
              )}
            </div>
          ))}
        
        {/* Add card button */}
        <div
          style={{
            background: '#f8fafc',
            padding: isMobile ? '20px' : '24px',
            borderRadius: '12px',
            border: '2px dashed #d1d5db',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minHeight: '120px'
          }}
          onClick={() => setShowCardSettings(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.background = '#eff6ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.background = '#f8fafc';
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '8px', color: '#64748b' }}>+</div>
          <div style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
            Pridať kartu
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: isMobile ? '20px' : '24px'
      }}>
        {/* Quick actions */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: isMobile ? '20px' : '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              margin: 0,
              color: '#1e293b'
            }}>
              Rýchle akcie
            </h2>
            <button
              onClick={() => setShowActionSettings(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ⚙
            </button>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            {quickActions
              .filter(action => action.enabled)
              .sort((a, b) => a.order - b.order)
              .map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: isMobile ? '12px' : '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3b82f6';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{action.icon}</div>
                  <div>{action.title}</div>
                </button>
              ))}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: isMobile ? '20px' : '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#1e293b'
          }}>
            Posledná aktivita
          </h2>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                style={{
                  padding: '12px 0',
                  borderBottom: index < activities.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}
              >
                <div style={{ 
                  fontSize: '14px', 
                  color: '#374151',
                  marginBottom: '4px',
                  lineHeight: '1.4'
                }}>
                  {activity.message}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                  {activity.user && (
                    <>
                      <span>•</span>
                      <span>{activity.user}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Page content renderer
  const renderPageContent = () => {
    if (currentPage === 'dashboard') {
      return renderDashboardContent();
    }

    const menuItem = getFilteredMenuItems().find(item => item.id === currentPage);
    if (menuItem?.component) {
      const Component = menuItem.component;
      return <Component currentUser={user} />;
    }

    return (
      <div style={{ 
        padding: isMobile ? '20px' : '32px', 
        textAlign: 'center',
        color: '#64748b'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚧</div>
        <h2>Stránka sa pripravuje</h2>
        <p>Funkcia "{menuItem?.name}" bude dostupná v nasledujúcej verzii.</p>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed && !isMobile ? '80px' : '280px',
        background: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        position: isMobile ? 'fixed' : 'relative',
        height: '100vh',
        zIndex: 50,
        transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'all 0.3s ease-in-out',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed && !isMobile ? '20px 12px' : '24px',
          borderBottom: '1px solid #e2e8f0',
          textAlign: sidebarCollapsed && !isMobile ? 'center' : 'left'
        }}>
          {sidebarCollapsed && !isMobile ? (
            <div style={{ fontSize: '24px' }}>⚽</div>
          ) : (
            <>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚽ ClubW
              </div>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                marginTop: '4px'
              }}>
                Admin panel
              </div>
            </>
          )}
        </div>

        {/* Collapse button */}
        {!isMobile && (
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#64748b'
              }}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
        )}

        {/* User info */}
        {(!sidebarCollapsed || isMobile) && (
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                {user.meno.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px' }}>
                  {user.meno}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {getRoleInfo(user.rola).name}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ padding: '16px 0' }}>
          {getFilteredMenuItems().map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                if (isMobile) setSidebarOpen(false);
              }}
              style={{
                width: '100%',
                padding: sidebarCollapsed && !isMobile ? '12px' : '12px 24px',
                border: 'none',
                background: currentPage === item.id ? '#eff6ff' : 'transparent',
                color: currentPage === item.id ? '#3b82f6' : '#64748b',
                textAlign: sidebarCollapsed && !isMobile ? 'center' : 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed && !isMobile ? 'center' : 'flex-start',
                gap: sidebarCollapsed && !isMobile ? '0' : '12px',
                borderLeft: currentPage === item.id ? '3px solid #3b82f6' : '3px solid transparent',
                fontSize: '14px'
              }}
              title={sidebarCollapsed && !isMobile ? item.name : undefined}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.background = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {(!sidebarCollapsed || isMobile) && (
                <span style={{ fontWeight: currentPage === item.id ? '600' : '400' }}>
                  {item.name}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: 'white'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: sidebarCollapsed && !isMobile ? '12px' : '12px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: sidebarCollapsed && !isMobile ? '0' : '8px',
              transition: 'background 0.2s'
            }}
            title={sidebarCollapsed && !isMobile ? 'Odhlásiť sa' : undefined}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            <span>🚪</span>
            {(!sidebarCollapsed || isMobile) && <span>Odhlásiť</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginLeft: isMobile ? '0' : '0'
      }}>
        {/* Top bar */}
        <header style={{
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '64px'
        }}>
          {/* Left side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Mobile menu button */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '8px'
                }}
              >
                ☰
              </button>
            )}

            {/* Breadcrumbs */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: isMobile ? '14px' : '16px'
            }}>
              <span style={{ color: '#64748b' }}>Admin</span>
              <span style={{ color: '#d1d5db' }}>›</span>
              <span style={{ color: '#3b82f6', fontWeight: '500' }}>
                {getFilteredMenuItems().find(item => item.id === currentPage)?.name || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isMobile && (
              <button
                onClick={() => window.open('/clanky', '_blank')}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🌐 Web
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          background: '#f8fafc'
        }}>
          <Suspense fallback={
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          }>
            {renderPageContent()}
          </Suspense>
        </main>
      </div>

      {/* Card settings modal */}
      {showCardSettings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                Nastavenie kariet
              </h3>
              <button
                onClick={() => setShowCardSettings(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                Dostupné karty:
              </h4>
              {dashboardCards.map((card) => (
                <div
                  key={card.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{card.icon}</span>
                    <span style={{ fontSize: '14px' }}>{card.title}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={card.enabled}
                    onChange={(e) => {
                      setDashboardCards(prev => 
                        prev.map(c => 
                          c.id === card.id ? { ...c, enabled: e.target.checked } : c
                        )
                      );
                    }}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
              ))}
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                Nové karty (pripravuje sa):
              </h4>
              {[
                { title: 'Výkonnosť webu', icon: '📈' },
                { title: 'Sociálne siete', icon: '📱' },
                { title: 'Komentáre', icon: '💬' },
                { title: 'Galérie', icon: '📷' }
              ].map((card, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    opacity: 0.5
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{card.icon}</span>
                    <span style={{ fontSize: '14px' }}>{card.title}</span>
                  </div>
                  <input
                    type="checkbox"
                    disabled
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick actions settings modal */}
      {showActionSettings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                Nastavenie akcií
              </h3>
              <button
                onClick={() => setShowActionSettings(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                Dostupné akcie:
              </h4>
              {quickActions.map((action) => (
                <div
                  key={action.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{action.icon}</span>
                    <span style={{ fontSize: '14px' }}>{action.title}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={action.enabled}
                    onChange={(e) => {
                      setQuickActions(prev => 
                        prev.map(a => 
                          a.id === action.id ? { ...a, enabled: e.target.checked } : a
                        )
                      );
                    }}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 767px) {
          .sidebar-collapsed {
            width: 280px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;