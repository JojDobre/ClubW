//routerContext
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Typy pre routing
export interface Route {
  path: string;
  name: string;
  component: React.ComponentType;
  icon?: React.ReactNode;
}

interface RouterContextType {
  currentRoute: string;
  navigate: (path: string) => void;
  routes: Route[];
  addRoute: (route: Route) => void;
  getPageName: (path: string) => string;

}

// Context
const RouterContext = createContext<RouterContextType | undefined>(undefined);

// Hook pre použitie routingu
export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

// Mapovanie ciest na názvy stránok
const PAGE_NAMES: Record<string, string> = {
  '/articles': 'Články',
  '/article': 'Články',
  '/categories': 'Rubriky',
  '/pages': 'Stránky',
  '/galleries': 'FotoGaléria',
  '/users': 'Používatelia',
  '/teams': 'Prehľad Tímov', 
  '/players': 'Hráči', 
  '/staff': 'Realizačný Tím', 
  '/leagues': 'Súťaže', 
  '/matches': 'Zápasy', 
  '/calendar': 'Kalendar', 
  '/article/new': 'Nový článok',

  
  '/charts/semidoughnut': 'Semi Doughnut Chart',
  '/table': 'Tables', // PRIDANÉ - nová Table stránka
  '/user-profile': 'User Profile',
  '/user-profile/overview': 'Profile Overview',
  '/user-profile/projects': 'Projects',
  '/user-profile/campaigns': 'Campaigns',
  '/user-profile/documents': 'Documents', 
  '/user-profile/followers': 'Followers',
  '/account': 'Account',
  '/corporate': 'Corporate',
  '/blog': 'Blog',
  '/social': 'Social',
};

// Provider komponenta
interface RouterProviderProps {
  children: ReactNode;
  initialRoute?: string;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({ 
  children, 
  initialRoute = '/dashboard' 
}) => {
  const [currentRoute, setCurrentRoute] = useState(initialRoute);
  const [routes, setRoutes] = useState<Route[]>([]);

  const navigate = (path: string, articleId?: string) => {
    // Ak ide o edit route a máme articleId, pridaj ho do cesty
    if (path.includes('/edit') && articleId) {
      setCurrentRoute(`${path}/${articleId}`);
    } else {
      setCurrentRoute(path);
    }
    
    // Update URL in browser
    window.history.pushState({}, '', path + (articleId ? `/${articleId}` : ''));
  };

  const addRoute = (route: Route) => {
    setRoutes(prev => [...prev.filter(r => r.path !== route.path), route]);
  };

  const getPageName = (path: string): string => {
    return PAGE_NAMES[path] || path.split('/').pop()?.replace('-', ' ') || 'Unknown Page';
  };

  return (
    <RouterContext.Provider value={{
      currentRoute,
      navigate,
      routes,
      addRoute,
      getPageName
    }}>
      {children}
    </RouterContext.Provider>
  );
};