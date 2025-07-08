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

  const ArticleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 3C3.44772 3 3 3.44772 3 4V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V4C17 3.44772 16.5523 3 16 3H4Z" stroke="var(--black-100)" strokeWidth="1.5" fill="none"/>
    <path d="M6 7H14M6 9H14M6 11H14M6 13H10" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const TeamIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="7" cy="6" r="2.5" stroke="var(--black-100)" strokeWidth="1.5"/>
    <circle cx="13" cy="6" r="2.5" stroke="var(--black-100)" strokeWidth="1.5"/>
    <path d="M2 16V14C2 12.3431 3.34315 11 5 11H9C9.55228 11 10.0522 11.1671 10.4649 11.4649" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M18 16V14C18 12.3431 16.6569 11 15 11H11C10.4477 11 9.94775 11.1671 9.53505 11.4649" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

 const PlayerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="5" r="2" stroke="var(--black-100)" strokeWidth="1.5"/>
    <path d="M8 9H12C13.1046 9 14 9.89543 14 11V11C14 11.5523 13.5523 12 13 12H12V17C12 17.5523 11.5523 18 11 18H9C8.44772 18 8 17.5523 8 17V12H7C6.44772 12 6 11.5523 6 11V11C6 9.89543 6.89543 9 8 9Z" stroke="var(--black-100)" strokeWidth="1.5"/>
    <circle cx="10" cy="10" r="8" stroke="var(--black-10)" strokeWidth="1"/>
  </svg>
);

const StaffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="6" r="2.5" stroke="var(--black-100)" strokeWidth="1.5"/>
    <path d="M6 17V15C6 12.7909 7.79086 11 10 11V11C12.2091 11 14 12.7909 14 15V17" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 11V8M8 9L12 9" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3 4L5 3L6 5L4 6L3 4Z" fill="var(--black-100)"/>
    <path d="M17 4L15 3L14 5L16 6L17 4Z" fill="var(--black-100)"/>
  </svg>
);

const LeagueIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2L12.09 6.26L17 7.27L13.5 10.14L14.18 15.02L10 12.77L5.82 15.02L6.5 10.14L3 7.27L7.91 6.26L10 2Z" stroke="var(--black-100)" strokeWidth="1.5" fill="var(--black-10)"/>
    <circle cx="10" cy="10" r="8" stroke="var(--black-10)" strokeWidth="1"/>
  </svg>
);

 const MatchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="5" width="16" height="10" rx="2" stroke="var(--black-100)" strokeWidth="1.5"/>
    <circle cx="10" cy="10" r="2.5" stroke="var(--black-100)" strokeWidth="1.5"/>
    <path d="M10 5V15M2 10H18" stroke="var(--black-100)" strokeWidth="1.5"/>
    <circle cx="5" cy="7" r="1" fill="var(--black-100)"/>
    <circle cx="15" cy="7" r="1" fill="var(--black-100)"/>
    <path d="M6 3H7M13 3H14" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="3" y="4" width="14" height="13" rx="2" stroke="var(--black-100)" strokeWidth="1.5"/>
    <path d="M6 2V6M14 2V6M3 8H17" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="12" r="1" fill="var(--black-100)"/>
    <circle cx="12" cy="12" r="1" fill="var(--black-100)"/>
    <circle cx="8" cy="15" r="1" fill="var(--black-100)"/>
  </svg>
);
 const StatsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 16V13C3 12.4477 3.44772 12 4 12H6C6.55228 12 7 12.4477 7 13V16" stroke="var(--black-100)" strokeWidth="1.5"/>
    <path d="M8.5 16V9C8.5 8.44772 8.94772 8 9.5 8H11.5C12.0523 8 12.5 8.44772 12.5 9V16" stroke="var(--black-100)" strokeWidth="1.5"/>
    <path d="M14 16V5C14 4.44772 14.4477 4 15 4H17C17.5523 4 18 4.44772 18 5V16" stroke="var(--black-100)" strokeWidth="1.5"/>
    <path d="M2 17H18" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
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
        <NameBadge name="User123" />

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
          text="Domov"
          isActive={isActive('/dashboard')}
          onClick={() => navigate('/dashboard')}
        />
        <div 
          className="sidebar-expandable-header"
          onClick={() => handleExpandableClick('articles', '/articles')}
        >
          <SidebarMenuItem 
            arrow={<ArrowIcon isExpanded={expandedSections.includes('articles')} />}
            icon={<ArticleIcon />}
            text="Články"
            isActive={isActive('/articles') || currentRoute.startsWith('/articles/')}
          />
        </div>

          {expandedSections.includes('articles') && (
            <div className="sidebar-submenu">
              <SidebarMenuItem 
                text="Prekľad článkov"
                isSubmenu={true}
                isActive={isActive('/articles')}
                onClick={() => navigate('/articles')}
              />
              <SidebarMenuItem 
                text="Rubriky"
                isSubmenu={true}
                isActive={isActive('/categories')}
                onClick={() => navigate('/categories')}
              />
            </div>
          )}
        <SidebarMenuItem 
          icon={<ProjectIcon />}
          text="Stránky"
          isActive={isActive('/pages')}
          onClick={() => navigate('/pages')}
        />
        <SidebarMenuItem 
          icon={<CoursesIcon />}
          text="Fotogaléria"
          isActive={isActive('/galleries')}
          onClick={() => navigate('/galleries')}
        />
      </SidebarSection>



      {/* Sprava Timu */}
      <SidebarSection title="Správa klubu">
          <SidebarMenuItem 
            icon={<UserIcon />}
            text="Používatelia"
            isActive={isActive('/users')}
            onClick={() => navigate('/users')}
          />
          
          {/* Tímy s rozbaľovacím menu */}
          <div 
            className="sidebar-expandable-header"
            onClick={() => handleExpandableClick('teams', '/teams')}
          >
            <SidebarMenuItem 
              arrow={<ArrowIcon isExpanded={expandedSections.includes('teams')} />}
              icon={<TeamIcon />}
              text="Tímy"
              isActive={isActive('/teams') || currentRoute.startsWith('/teams/') || 
                      isActive('/players') || isActive('/staff')}
            />
          </div>
          
          {expandedSections.includes('teams') && (
            <div className="sidebar-submenu">
              <SidebarMenuItem 
                text="Prehľad tímov"
                isSubmenu={true}
                isActive={isActive('/teams')}
                onClick={() => navigate('/teams')}
              />
              <SidebarMenuItem 
                text="Hráči"
                isSubmenu={true}
                isActive={isActive('/players')}
                onClick={() => navigate('/players')}
              />
              <SidebarMenuItem 
                text="Realizačný tím"
                isSubmenu={true}
                isActive={isActive('/staff')}
                onClick={() => navigate('/staff')}
              />
            </div>
          )}
        </SidebarSection>

      {/* Súťaže & Zápasy */}
        <SidebarSection title="Súťaže">
          <SidebarMenuItem 
            icon={<LeagueIcon />}
            text="Ligy & Súťaže"
            isActive={isActive('/leagues')}
            onClick={() => navigate('/leagues')}
          />
          
          {/* Zápasy s rozbaľovacím menu */}
          <div 
            className="sidebar-expandable-header"
            onClick={() => handleExpandableClick('matches', '/matches')}
          >
            <SidebarMenuItem 
              arrow={<ArrowIcon isExpanded={expandedSections.includes('matches')} />}
              icon={<MatchIcon />}
              text="Zápasy"
              isActive={isActive('/matches') || currentRoute.startsWith('/matches/')}
            />
          </div>
          
          {expandedSections.includes('matches') && (
            <div className="sidebar-submenu">
              <SidebarMenuItem 
                text="Všetky zápasy"
                isSubmenu={true}
                isActive={isActive('/matches')}
                onClick={() => navigate('/matches')}
              />
              <SidebarMenuItem 
                text="Nový zápas"
                isSubmenu={true}
                isActive={isActive('/matches/new')}
                onClick={() => navigate('/matches/new')}
              />
              <SidebarMenuItem 
                text="Výsledky"
                isSubmenu={true}
                isActive={isActive('/matches/results')}
                onClick={() => navigate('/matches/results')}
              />
            </div>
          )}
          
          <SidebarMenuItem 
            icon={<CalendarIcon />}
            text="Kalendár"
            isActive={isActive('/calendar')}
            onClick={() => navigate('/calendar')}
          />
          <SidebarMenuItem 
            icon={<StatsIcon />}
            text="Štatistiky"
            isActive={isActive('/statistics')}
            onClick={() => navigate('/statistics')}
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