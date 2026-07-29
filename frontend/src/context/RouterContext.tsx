//routerContext
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Typy pre routing
export interface Route {
  path: string;
  name: string;
  component: React.ComponentType;
  icon?: React.ReactNode;
}

interface RouterContextType {
  currentRoute: string;
  // Voliteľné ID sa pripojí na koniec cesty (napr. /articles/edit/12)
  navigate: (path: string, articleId?: string) => void;
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
  '/article/categories': 'Rubriky',
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
  // Počiatočnú cestu berieme z adresy v prehliadači, nie z pevnej hodnoty.
  // Bez toho po obnovení stránky (F5) na /articles skočil používateľ
  // späť na dashboard, hoci v adresnom riadku ostalo /articles.
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (typeof window === 'undefined') return initialRoute;
    const cesta = window.location.pathname;
    // Koreňová cesta nie je platná admin obrazovka - použijeme predvolenú
    return cesta && cesta !== '/' ? cesta : initialRoute;
  });

  const [routes, setRoutes] = useState<Route[]>([]);

  /**
   * Zmena obrazovky. Aktualizuje stav aj adresu v prehliadači.
   *
   * @param path - cieľová cesta, napr. '/articles'
   * @param articleId - voliteľné ID pripojené na koniec cesty
   */
  const navigate = useCallback((path: string, articleId?: string) => {
    // OPRAVA: pôvodne sa ID pridávalo do stavu len pri cestách obsahujúcich
    // '/edit', ale do adresy vždy. Pri inej ceste s ID sa tak stav a adresa
    // rozišli a aplikácia zobrazovala niečo iné, než bolo v adresnom riadku.
    const cielovaCesta = articleId ? `${path}/${articleId}` : path;

    setCurrentRoute(cielovaCesta);

    // Rovnakú cestu nepridávame do histórie druhýkrát - inak by používateľ
    // musel tlačidlo Späť stlačiť niekoľkokrát za sebou
    if (window.location.pathname !== cielovaCesta) {
      window.history.pushState({ clubwRoute: cielovaCesta }, '', cielovaCesta);
    }
  }, []);

  // Reakcia na tlačidlá Späť a Dopredu v prehliadači.
  // Pôvodný router tieto udalosti vôbec nepočúval, takže tlačidlo Späť
  // zmenilo adresu, ale zobrazená obrazovka ostala rovnaká.
  useEffect(() => {
    const naZmenuHistorie = () => {
      const cesta = window.location.pathname;
      setCurrentRoute(cesta && cesta !== '/' ? cesta : initialRoute);
    };

    window.addEventListener('popstate', naZmenuHistorie);
    return () => window.removeEventListener('popstate', naZmenuHistorie);
  }, [initialRoute]);

  const addRoute = useCallback((route: Route) => {
    setRoutes(prev => [...prev.filter(r => r.path !== route.path), route]);
  }, []);

  const getPageName = useCallback((path: string): string => {
    return PAGE_NAMES[path] || path.split('/').pop()?.replace('-', ' ') || 'Unknown Page';
  }, []);

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