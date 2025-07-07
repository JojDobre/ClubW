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
  '/dashboard': 'Dashboard',
  '/ecommerce': 'eCommerce',
  '/projects': 'Projects',
  '/courses': 'Online Courses',
  '/cards': 'Cards', // PRIDANÉ - nová Card stránka
  '/charts': 'Charts', // OPRAVENÉ - hlavná Charts stránka
  '/charts/bar': 'Bar Charts', // PRIDANÉ - Bar Charts stránka
  '/charts/line': 'Line Charts', // PRIDANÉ - Line Charts stránka  
  '/charts/curve': 'Curve Charts', // PRIDANÉ - Curve Charts stránka
  '/charts/trend': 'Trend Charts', // PRIDANÉ - Trend Charts stránka
  '/charts/pie': 'Pie Charts', // PRIDANÉ - Trend Charts stránka
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

  const navigate = (path: string) => {
    setCurrentRoute(path);
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