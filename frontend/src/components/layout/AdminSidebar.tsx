import React, { useState } from 'react';
import NameBadge from '../ui/NameBadge';
import SidebarButton from '../ui/SidebarButton';
import SidebarMenuItem from '../ui/SidebarMenuItem';
import SidebarSection from '../ui/SidebarSection';
import SidebarEmptyPlaceholder from '../ui/SidebarEmptyPlaceholder';
import SidebarLogo from '../ui/SidebarLogo';
import { useRouter } from '../../context/RouterContext';
import { useNavigation } from '../../hooks/useNavigation';
import { useFavorites } from '../../context/FavoritesContext';
import { useLayout } from '../../context/LayoutContext';

const AdminSidebar: React.FC = () => {
  const { currentRoute, navigate } = useNavigation();
  const { favorites, getRecentItems } = useFavorites();
  const { sidebarExpanded } = useLayout();
  
  // Defaultne všetky sekcie zatvorené
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'favorites' | 'recent'>('favorites');

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  // Funkcia pre kontrolu aktívneho stavu
  const isActive = (path: string) => currentRoute === path;

  // Funkcia na klik expandovateľnej položky - kombinuje toggle a navigate
  const handleExpandableClick = (sectionName: string, path: string) => {
    toggleSection(sectionName);
    navigate(path);
  };

  const handleTabClick = (tab: 'favorites' | 'recent') => {
    setActiveTab(tab);
  };

  const recentItems = getRecentItems(3);

  // Simple dot icon for menu items - použije CSS farby
  const DotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 8C11 9.65685 9.65685 11 8 11C6.34315 11 5 9.65685 5 8C5 6.34315 6.34315 5 8 5C9.65685 5 11 6.34315 11 8Z" fill="var(--black-20)"/>
    </svg>
  );

  // Arrow for expandable sections - použije CSS farby
  const ArrowIcon = ({ isExpanded }: { isExpanded: boolean }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none"
      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <path d="M6 12L10 8L6 4" stroke="var(--black-40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Active indicator bar
  const ActiveBar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M0 4C0 2.89543 0.895431 2 2 2C3.10457 2 4 2.89543 4 4V16C4 17.1046 3.10457 18 2 18C0.895431 18 0 17.1046 0 16V4Z" fill="var(--black-100)"/>
    </svg>
  );

  // Dashboard icons - používajú CSS farby
  const DashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7.50002 2.92969V8.55469L2.62502 11.3672C2.29959 9.61066 2.61183 7.79565 3.50554 6.24885C4.39925 4.70205 5.81572 3.52504 7.50002 2.92969Z" fill="var(--black-10)"/>
      <path d="M7.81249 9.09609C7.90753 9.04123 7.98644 8.96231 8.04129 8.86727C8.09615 8.77223 8.12502 8.66442 8.12499 8.55469V2.92969C8.12443 2.83004 8.10006 2.73198 8.0539 2.64367C8.00774 2.55536 7.94113 2.47936 7.85964 2.42202C7.77814 2.36469 7.68412 2.32766 7.5854 2.31405C7.48669 2.30043 7.38616 2.31062 7.29218 2.34375C5.46794 2.98939 3.93383 4.26457 2.96563 5.94005C1.99743 7.61554 1.65863 9.58145 2.01015 11.4844C2.02837 11.5828 2.06995 11.6754 2.1314 11.7544C2.19285 11.8333 2.27237 11.8964 2.36327 11.9383C2.44519 11.9766 2.53456 11.9963 2.62499 11.9961C2.73469 11.9961 2.84247 11.9673 2.93749 11.9125L7.81249 9.09609Z" fill="var(--black-100)"/>
    </svg>
  );

  const EcommerceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 3H5L5.4 5M7 13H15L19 5H6.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H15M15 13V16.5" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ProjectIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 7V17C3 17.5523 3.44772 18 4 18H16C16.5523 18 17 17.5523 17 17V7M3 7L10 2L17 7M3 7V9H17V7" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CoursesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 3H18V17H2V3Z" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 7H14M6 11H10" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M16 17.5C16 14.46 12.84 12 9 12C5.16 12 2 14.46 2 17.5M9 9C10.6569 9 12 7.65685 12 6C12 4.34315 10.6569 3 9 3C7.34315 3 6 4.34315 6 6C6 7.65685 7.34315 9 9 9Z" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div 
      className={`sidebar ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}
      style={{
        left: sidebarExpanded ? '0' : '-212px',
        transition: 'left var(--transition-normal)'
      }}
    >
      <div className="sidebar-content">
        {/* Name Badge */}
        <NameBadge name="ByeWind" />

        {/* Favorites/Recently + Overview/Projects */}
        <SidebarSection>
          <div className="sidebar-favorites-group">
            <SidebarButton 
              variant={activeTab === 'favorites' ? 'default' : 'muted'}
              onClick={() => handleTabClick('favorites')}
            >
              Favorites
            </SidebarButton>
            <SidebarButton 
              variant={activeTab === 'recent' ? 'default' : 'muted'}
              onClick={() => handleTabClick('recent')}
            >
              Recently
            </SidebarButton>
          </div>

          {/* Zobrazenie favorites alebo recent položiek */}
          {activeTab === 'favorites' ? (
            // Favorites content
            <>
              {favorites.length > 0 ? (
                favorites.map((item) => (
                  <SidebarMenuItem
                    key={item.path}
                    icon={<DotIcon />}
                    text={item.name}
                    isSimpleItem={true}
                    onClick={() => navigate(item.path)}
                  />
                ))
              ) : (
                <SidebarEmptyPlaceholder
                  text= "Žiadne topky"
                />
              )}
            </>
          ) : (
            // Recent content
            <>
              {recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <SidebarMenuItem
                    key={`${item.path}-${item.timestamp}`}
                    icon={<DotIcon />}
                    text={item.name}
                    isSimpleItem={true}
                    onClick={() => navigate(item.path)}
                  />
                ))
              ) : (
                <SidebarEmptyPlaceholder
                  text="Prázdno"
                />
              )}
            </>
          )}
          
        </SidebarSection>

      {/* Dashboards */}
      <SidebarSection title="Dashboards">
        <SidebarMenuItem 
          icon={<DashboardIcon />}
          text="Default"
          isActive={isActive('/dashboard')}
          onClick={() => navigate('/dashboard')}
        />
        <SidebarMenuItem 
          icon={<EcommerceIcon />}
          text="eCommerce"
          isActive={isActive('/ecommerce')}
          onClick={() => navigate('/ecommerce')}
        />
        <SidebarMenuItem 
          icon={<ProjectIcon />}
          text="Projects"
          isActive={isActive('/projects')}
          onClick={() => navigate('/projects')}
        />
        <SidebarMenuItem 
          icon={<CoursesIcon />}
          text="Online Courses"
          isActive={isActive('/courses')}
          onClick={() => navigate('/courses')}
        />
      </SidebarSection>

      {/* Pages */}
      <SidebarSection title="Pages">
        <div 
          className="sidebar-expandable-header"
          onClick={() => handleExpandableClick('pages', '/user-profile')}
        >
          <SidebarMenuItem 
            arrow={<ArrowIcon isExpanded={expandedSections.includes('pages')} />}
            icon={<UserIcon />}
            text="User Profile"
            isActive={isActive('/user-profile') || currentRoute.startsWith('/user-profile/')}
          />
        </div>
        
        {expandedSections.includes('pages') && (
          <div className="sidebar-submenu">
            <SidebarMenuItem 
              text="Overview"
              isSubmenu={true}
              isActive={isActive('/user-profile/overview')}
              onClick={() => navigate('/user-profile/overview')}
            />
            <SidebarMenuItem 
              text="Projects"
              isSubmenu={true}
              isActive={isActive('/user-profile/projects')}
              onClick={() => navigate('/user-profile/projects')}
            />
            <SidebarMenuItem 
              text="Campaigns"
              isSubmenu={true}
              isActive={isActive('/user-profile/campaigns')}
              onClick={() => navigate('/user-profile/campaigns')}
            />
            <SidebarMenuItem 
              text="Documents"
              isSubmenu={true}
              isActive={isActive('/user-profile/documents')}
              onClick={() => navigate('/user-profile/documents')}
            />
            <SidebarMenuItem 
              text="Followers"
              isSubmenu={true}
              isActive={isActive('/user-profile/followers')}
              onClick={() => navigate('/user-profile/followers')}
            />
          </div>
        )}
      </SidebarSection>

      {/* Components - PRIDANÉ nová sekcia */}
      <SidebarSection title="Components">
        <SidebarMenuItem 
          icon={<DashboardIcon />}
          text="Cards"
          isActive={isActive('/cards')}
          onClick={() => navigate('/cards')}
        />
        <SidebarMenuItem 
          icon={<DashboardIcon />}
          text="Charts"
          isActive={isActive('/charts')}
          onClick={() => navigate('/charts')}
        />


{/* Charts s rozbaľovacím menu */}
  <div 
    className="sidebar-expandable-header"
    onClick={() => handleExpandableClick('charts', '/charts')}
  >
    <SidebarMenuItem 
      arrow={<ArrowIcon isExpanded={expandedSections.includes('charts')} />}
      icon={<DashboardIcon />}
      text="Charts"
      isActive={isActive('/charts') || currentRoute.startsWith('/charts/')}
    />
  </div>
  
  {expandedSections.includes('charts') && (
    <div className="sidebar-submenu">
      <SidebarMenuItem 
        text="Bar Charts"
        isSubmenu={true}
        isActive={isActive('/charts/bar')}
        onClick={() => navigate('/charts/bar')}
      />
      <SidebarMenuItem 
        text="Line Charts"
        isSubmenu={true}
        isActive={isActive('/charts/line')}
        onClick={() => navigate('/charts/line')}
      />
      <SidebarMenuItem 
        text="Curve Charts"
        isSubmenu={true}
        isActive={isActive('/charts/curve')}
        onClick={() => navigate('/charts/curve')}
      />
      <SidebarMenuItem 
        text="Trend Charts"
        isSubmenu={true}
        isActive={isActive('/charts/trend')}
        onClick={() => navigate('/charts/trend')}
      />
      <SidebarMenuItem 
        text="Pie Charts"
        isSubmenu={true}
        isActive={isActive('/charts/pie')}
        onClick={() => navigate('/charts/pie')}
      />

      <SidebarMenuItem 
        text="Semi Doughnut Charts"
        isSubmenu={true}
        isActive={isActive('/charts/semidoughnut')}
        onClick={() => navigate('/charts/semidoughnut')}
      />
    </div>
  )}


        <SidebarMenuItem 
          icon={<DashboardIcon />}
          text="Tables"
          isActive={isActive('/table')}
          onClick={() => navigate('/table')}
        />
      </SidebarSection>

      {/* Authentication */}
      <SidebarSection title="Authentication">
        <SidebarMenuItem 
          icon={<UserIcon />}
          text="Account"
          isActive={isActive('/account')}
          onClick={() => navigate('/account')}
        />
        <SidebarMenuItem 
          icon={<UserIcon />}
          text="Corporate"
          isActive={isActive('/corporate')}
          onClick={() => navigate('/corporate')}
        />
        <SidebarMenuItem 
          icon={<UserIcon />}
          text="Blog"
          isActive={isActive('/blog')}
          onClick={() => navigate('/blog')}
        />
        <SidebarMenuItem 
          icon={<UserIcon />}
          text="Social"
          isActive={isActive('/social')}
          onClick={() => navigate('/social')}
        />
      </SidebarSection>
      </div>
              
              
        {/* Sidebar Logo */}
        <SidebarLogo>
          <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
            <text x="0" y="15" fill="var(--color-text-primary)" fontSize="14" fontFamily="Inter">DobreUI</text>
          </svg>
        </SidebarLogo>
    </div>
  );
};

export default AdminSidebar;