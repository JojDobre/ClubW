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

  // Funkcia pre klik na arrow - len toggle submenu bez navigácie
  const handleArrowClick = (sectionName: string) => {
    toggleSection(sectionName);
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
      <path d="M6.81249 8.09609C6.90753 8.04123 6.98644 7.96231 7.04129 7.86727C7.09615 7.77223 7.12502 7.66442 7.12499 7.55469V1.92969C7.12443 1.83004 7.10006 1.73198 7.0539 1.64367C7.00774 1.55536 6.94113 1.47936 6.85964 1.42202C6.77814 1.36469 6.68412 1.32766 6.5854 1.31405C6.48669 1.30043 6.38616 1.31062 6.29218 1.34375C4.46794 1.98939 2.93383 3.26457 1.96563 4.94005C0.997427 6.61554 0.658632 8.58145 1.01015 10.4844C1.02837 10.5828 1.06995 10.6754 1.1314 10.7544C1.19285 10.8333 1.27237 10.8964 1.36327 10.9383C1.44519 10.9766 1.53456 10.9963 1.62499 10.9961C1.73469 10.9961 1.84247 10.9673 1.93749 10.9125L6.81249 8.09609ZM5.87499 2.87656V7.19375L2.13437 9.35234C2.12499 9.23438 2.12499 9.11563 2.12499 9C2.1261 7.73309 2.47678 6.49106 3.13843 5.41066C3.80007 4.33025 4.74701 3.45337 5.87499 2.87656ZM16.0578 4.97812C16.0508 4.96406 16.0437 4.94922 16.0351 4.93516C16.0266 4.92109 16.0195 4.90938 16.0109 4.89688C15.2946 3.67328 14.2706 2.65834 13.0408 1.95282C11.8109 1.24729 10.4179 0.875723 8.99999 0.875C8.83423 0.875 8.67526 0.940848 8.55805 1.05806C8.44084 1.17527 8.37499 1.33424 8.37499 1.5V8.67422L2.21796 12.2602C2.14651 12.3016 2.08398 12.3567 2.03398 12.4225C1.98398 12.4882 1.9475 12.5632 1.92665 12.6431C1.9058 12.723 1.901 12.8062 1.91251 12.888C1.92403 12.9698 1.95164 13.0485 1.99374 13.1195C2.89708 14.6578 4.28156 15.856 5.93353 16.5293C7.58549 17.2025 9.41312 17.3134 11.1344 16.8448C12.8556 16.3762 14.3748 15.3541 15.4575 13.9364C16.5401 12.5186 17.1261 10.7839 17.125 9C17.1268 7.58916 16.7588 6.20247 16.0578 4.97812ZM9.62499 2.15313C10.6162 2.24437 11.5759 2.54965 12.4376 3.04791C13.2994 3.54617 14.0428 4.22552 14.6164 5.03906L9.62499 7.94609V2.15313ZM8.99999 15.875C7.90891 15.8722 6.834 15.6111 5.86323 15.113C4.89247 14.6149 4.05345 13.894 3.41484 13.0094L9.30546 9.57891L9.32265 9.56797L15.2422 6.12031C15.7253 7.16777 15.9372 8.31996 15.8582 9.47078C15.7792 10.6216 15.4119 11.734 14.7902 12.7057C14.1684 13.6773 13.3122 14.4768 12.3003 15.0307C11.2885 15.5845 10.1535 15.8749 8.99999 15.875Z" fill="var(--black-100)"/>
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

        <SidebarMenuItem 
          arrow={<ArrowIcon isExpanded={expandedSections.includes('articles')} />}
          icon={<ArticleIcon />}
          text="Články"
          isActive={isActive('/articles') || currentRoute.startsWith('/articles/')}
          onClick={() => navigate('/articles')} // Klik na hlavný item naviguje
          onArrowClick={() => handleArrowClick('articles')} // Klik na šípku len toggleuje
        />
          {expandedSections.includes('articles') && (
            <div className="sidebar-submenu">
              <SidebarMenuItem 
                text="Prekľad článkov"
                isSubmenu={true}
                isActive={isActive('/articles')}
                onClick={() => navigate('/articles')}
              />
              <SidebarMenuItem 
                text="Pridať článok"
                isSubmenu={true}
                isActive={isActive('/article/new')}
                onClick={() => navigate('/article/new')}
              />
              <SidebarMenuItem 
                text="Rubriky"
                isSubmenu={true}
                isActive={isActive('/article/categories')}
                onClick={() => navigate('/article/categories')}
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
          isActive={isActive('/gallery')}
          onClick={() => navigate('/gallery')}
        />
      </SidebarSection>



      {/* Sprava Timu */}
      <SidebarSection title="Správa klubu">
                   
        {/* Tímy s rozbaľovacím menu */}
        <SidebarMenuItem 
          arrow={<ArrowIcon isExpanded={expandedSections.includes('teams')} />}
          icon={<TeamIcon />}
          text="Tímy"
          isActive={isActive('/teams') || currentRoute.startsWith('/teams/') || 
                  isActive('/players') || isActive('/staff')}
          onClick={() => navigate('/teams')} // Klik na hlavný item naviguje
          onArrowClick={() => handleArrowClick('teams')} // Klik na šípku len toggleuje
        />
          
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

          {/* Ligy */}
          <SidebarMenuItem 
            icon={<LeagueIcon />}
            text="Ligy & Súťaže"
            isActive={isActive('/leagues')}
            onClick={() => navigate('/leagues')}
          />

          {/* Zápasy s rozbaľovacím menu */}
          <SidebarMenuItem 
            arrow={<ArrowIcon isExpanded={expandedSections.includes('matches')} />}
            icon={<MatchIcon />}
            text="Zápasy"
            isActive={isActive('/matches') || currentRoute.startsWith('/matches/')}
            onClick={() => navigate('/matches')} // Klik na hlavný item naviguje
            onArrowClick={() => handleArrowClick('matches')} // Klik na šípku len toggleuje
          />
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

          {/* Kalendar */}
          <SidebarMenuItem 
            icon={<CalendarIcon />}
            text="Kalendár"
            isActive={isActive('/calendar')}
            onClick={() => navigate('/calendar')}
          />

      </SidebarSection>

      {/* Súťaže & Zápasy */}
        <SidebarSection title="Administrácia">

          <SidebarMenuItem 
            icon={<UserIcon />}
            text="Používatelia"
            isActive={isActive('/users')}
            onClick={() => navigate('/users')}
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