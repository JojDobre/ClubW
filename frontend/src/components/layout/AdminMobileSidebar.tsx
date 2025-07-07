// frontend/src/components/layout/AdminMobileSidebar.tsx
// Mobilný sidebar pre admin dashboard - slide-in z ľava

import React from 'react';
import { useLayout } from '../../context/LayoutContext';
import { useNavigation } from '../../hooks/useNavigation';
import { useFavorites } from '../../context/FavoritesContext';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminMobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  const { currentRoute, navigate } = useNavigation();
  const { favorites, getRecentItems } = useFavorites();

  // Funkcia pre kontrolu aktívneho stavu
  const isActive = (path: string) => currentRoute === path;

  // Handle menu item click
  const handleMenuClick = (path: string) => {
    navigate(path);
    onClose(); // Zatvor sidebar po kliknutí
  };

  // Close icon
  const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  // Menu icons
  const DashboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 4C3 3.44772 3.44772 3 4 3H7C7.55228 3 8 3.44772 8 4V10C8 10.5523 7.55228 11 7 11H4C3.44772 11 3 10.5523 3 10V4Z" fill="currentColor"/>
      <path d="M12 4C12 3.44772 12.4477 3 13 3H16C16.5523 3 17 3.44772 17 4V6C17 6.55228 16.5523 7 16 7H13C12.4477 7 12 6.55228 12 6V4Z" fill="currentColor"/>
      <path d="M3 15C3 14.4477 3.44772 14 4 14H7C7.55228 14 8 14.4477 8 15V16C8 16.5523 7.55228 17 7 17H4C3.44772 17 3 16.5523 3 16V15Z" fill="currentColor"/>
      <path d="M12 10C12 9.44772 12.4477 9 13 9H16C16.5523 9 17 9.44772 17 10V16C17 16.5523 16.5523 17 16 17H13C12.4477 17 12 16.5523 12 16V10Z" fill="currentColor"/>
    </svg>
  );

  const EcommerceIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 1C2.44772 1 2 1.44772 2 2C2 2.55228 2.44772 3 3 3H3.21922L5.78345 12.2236C5.92945 12.7292 6.37267 13.1 6.89443 13.1H15.1056C15.6273 13.1 16.0706 12.7292 16.2166 12.2236L18 5H6M8 17C8 17.5523 7.55228 18 7 18C6.44772 18 6 17.5523 6 17C6 16.4477 6.44772 16 7 16C7.55228 16 8 16.4477 8 17ZM17 17C17 17.5523 16.5523 18 16 18C15.4477 18 15 17.5523 15 17C15 16.4477 15.4477 16 16 16C16.5523 16 17 16.4477 17 17Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );

  const ProjectsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 4C2 2.89543 2.89543 2 4 2H6C7.10457 2 8 2.89543 8 4V6C8 7.10457 7.10457 8 6 8H4C2.89543 8 2 7.10457 2 6V4Z" fill="currentColor"/>
      <path d="M12 4C12 2.89543 12.8954 2 14 2H16C17.1046 2 18 2.89543 18 4V6C18 7.10457 17.1046 8 16 8H14C12.8954 8 12 7.10457 12 6V4Z" fill="currentColor"/>
      <path d="M2 14C2 12.8954 2.89543 12 4 12H6C7.10457 12 8 12.8954 8 14V16C8 17.1046 7.10457 18 6 18H4C2.89543 18 2 17.1046 2 16V14Z" fill="currentColor"/>
      <path d="M12 14C12 12.8954 12.8954 12 14 12H16C17.1046 12 18 12.8954 18 14V16C18 17.1046 17.1046 18 16 18H14C12.8954 18 12 17.1046 12 16V14Z" fill="currentColor"/>
    </svg>
  );

  const CoursesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 6C2 4.89543 2.89543 4 4 4H16C17.1046 4 18 4.89543 18 6V14C18 15.1046 17.1046 16 16 16H4C2.89543 16 2 15.1046 2 14V6Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M8 8L12 10L8 12V8Z" fill="currentColor"/>
    </svg>
  );

  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2C12.2091 2 14 3.79086 14 6C14 8.20914 12.2091 10 10 10C7.79086 10 6 8.20914 6 6C6 3.79086 7.79086 2 10 2Z" fill="currentColor"/>
      <path d="M4 18C4 14.6863 6.68629 12 10 12C13.3137 12 16 14.6863 16 18H4Z" fill="currentColor"/>
    </svg>
  );

  const AccountIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 1L13 7L19 7L14.5 11L16 18L10 14L4 18L5.5 11L1 7L7 7L10 1Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );

  const CorporateIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 3C4 2.44772 4.44772 2 5 2H15C15.5523 2 16 2.44772 16 3V18H13V14C13 13.4477 12.5523 13 12 13H8C7.44772 13 7 13.4477 7 14V18H4V3Z" fill="currentColor"/>
      <path d="M6 6H8V8H6V6Z" fill="var(--color-background)"/>
      <path d="M10 6H12V8H10V6Z" fill="var(--color-background)"/>
      <path d="M6 10H8V12H6V10Z" fill="var(--color-background)"/>
      <path d="M10 10H12V12H10V10Z" fill="var(--color-background)"/>
    </svg>
  );

  const BlogIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 3C3.44772 3 3 3.44772 3 4V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V4C17 3.44772 16.5523 3 16 3H4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M6 7H14M6 10H14M6 13H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  const SocialIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="14" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="15" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M9.5 8.5L12.5 5.5M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  // Logout ikona
  const LogoutIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7 17L2 17C1.44772 17 1 16.5523 1 16L1 4C1 3.44772 1.44772 3 2 3L7 3M13 13L17 9M17 9L13 5M17 9L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Menu items
  const menuItems = [
    { path: '/dashboard', label: 'Overview', icon: DashboardIcon },
    { path: '/ecommerce', label: 'eCommerce', icon: EcommerceIcon },
    { path: '/projects', label: 'Projects', icon: ProjectsIcon },
    { path: '/courses', label: 'Online Courses', icon: CoursesIcon },
    { path: '/user-profile', label: 'User Profile', icon: UserIcon },
    { path: '/account', label: 'Account', icon: AccountIcon },
    { path: '/corporate', label: 'Corporate', icon: CorporateIcon },
    { path: '/blog', label: 'Blog', icon: BlogIcon },
    { path: '/social', label: 'Social', icon: SocialIcon },
  ];

  const handleLogout = () => {
    // TODO: Implementovať logout funkčnosť
    console.log('Logout clicked');
    // Môžeš tu pridať:
    // - Vymazanie token-ov
    // - Redirect na login stránku
    // - Vymazanie localStorage/sessionStorage
    // - API call na logout endpoint
    onClose(); // Zatvor sidebar
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="mobile-sidebar-overlay" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="mobile-sidebar">
        {/* Header */}
        <div className="mobile-sidebar-header">
          <div className="mobile-sidebar-logo">
            <div className="mobile-sidebar-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
            <span className="mobile-sidebar-logo-text">ByeWind</span>
          </div>
          <button className="mobile-sidebar-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Navigation */}
        <div className="mobile-sidebar-content">
          {/* Favorites Section - FIRST */}
          {favorites.length > 0 && (
            <div className="mobile-sidebar-section">
              <div className="mobile-sidebar-section-title">Favorites</div>
              {favorites.slice(0, 5).map((favorite) => (
                <button
                  key={favorite.path}
                  className={`mobile-sidebar-menu-item ${isActive(favorite.path) ? 'active' : ''}`}
                  onClick={() => handleMenuClick(favorite.path)}
                >
                  <div className="mobile-sidebar-menu-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2L10.09 6.26L15 7.27L11.5 10.14L12.18 15.02L8 12.77L3.82 15.02L4.5 10.14L1 7.27L5.91 6.26L8 2Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <span className="mobile-sidebar-menu-text">{favorite.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Dashboards Section - SECOND */}
          <div className="mobile-sidebar-section">
            <div className="mobile-sidebar-section-title">Dashboards</div>
            {menuItems.slice(0, 4).map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.path}
                  className={`mobile-sidebar-menu-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item.path)}
                >
                  <div className="mobile-sidebar-menu-icon">
                    <IconComponent />
                  </div>
                  <span className="mobile-sidebar-menu-text">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Components Section - PRIDANÉ */}
            {/* Components Section - AKTUALIZOVANÁ s Charts submenu */}
            <div className="mobile-sidebar-section">
              <h3 className="mobile-sidebar-section-title">Components</h3>
              
              {/* Cards */}
              <button
                className={`mobile-sidebar-menu-item ${isActive('/cards') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/cards')}
              >
                <div className="mobile-sidebar-menu-icon">
                  <DashboardIcon />
                </div>
                <span className="mobile-sidebar-menu-text">Cards</span>
              </button>
              
              {/* Charts - hlavný item */}
              <button
                className={`mobile-sidebar-menu-item ${isActive('/charts') || currentRoute.startsWith('/charts/') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/charts')}
              >
                <div className="mobile-sidebar-menu-icon">
                  <DashboardIcon />
                </div>
                <span className="mobile-sidebar-menu-text">Charts</span>
              </button>
              
              {/* Charts submenu items - bez ikôn, s odsadením */}
              <button
                className={`mobile-sidebar-menu-item submenu ${isActive('/charts/bar') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/charts/bar')}
              >
                <span className="mobile-sidebar-submenu-text">Bar Charts</span>
              </button>
              
              <button
                className={`mobile-sidebar-menu-item submenu ${isActive('/charts/line') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/charts/line')}
              >
                <span className="mobile-sidebar-submenu-text">Line Charts</span>
              </button>
              
              <button
                className={`mobile-sidebar-menu-item submenu ${isActive('/charts/curve') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/charts/curve')}
              >
                <span className="mobile-sidebar-submenu-text">Curve Charts</span>
              </button>
              
              <button
                className={`mobile-sidebar-menu-item submenu ${isActive('/charts/trend') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/charts/trend')}
              >
                <span className="mobile-sidebar-submenu-text">Trend Charts</span>
              </button>

              <button
                className={`mobile-sidebar-menu-item submenu ${isActive('/charts/pie') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/charts/pie')}
              >
                <span className="mobile-sidebar-submenu-text">Pie Charts</span>
              </button>


              <button
                className={`mobile-sidebar-menu-item submenu ${isActive('/charts/semidoughnut') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/charts/semidoughnut')}
              >
                <span className="mobile-sidebar-submenu-text">Semi Doughnut Charts</span>
              </button>
              
              {/* Tables */}
              <button
                className={`mobile-sidebar-menu-item ${isActive('/table') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/table')}
              >
                <div className="mobile-sidebar-menu-icon">
                  <DashboardIcon />
                </div>
                <span className="mobile-sidebar-menu-text">Tables</span>
              </button>
            </div>

          {/* Pages Section - THIRD */}
          <div className="mobile-sidebar-section">
            <div className="mobile-sidebar-section-title">Pages</div>
            {menuItems.slice(4).map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.path}
                  className={`mobile-sidebar-menu-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item.path)}
                >
                  <div className="mobile-sidebar-menu-icon">
                    <IconComponent />
                  </div>
                  <span className="mobile-sidebar-menu-text">{item.label}</span>
                </button>
              );
            })}
          </div>

            <div className="mobile-sidebar-footer">
              <div className="mobile-sidebar-section-title">Logout</div>

              <button
                className="mobile-sidebar-logout-button"
                onClick={() => {
                  // Tu vlož konkrétnu logout logiku, napr. volanie funkcie logout alebo presmerovanie
                  console.log("Logging out...");
                }}
              >
                <span className="mobile-sidebar-menu-text">Logout</span>
              </button>
            </div>

        </div>
      </div>
    </>
  );
};

export default AdminMobileSidebar;