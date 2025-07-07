import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Typy
export interface FavoriteItem {
  path: string;
  name: string;
  timestamp: number;
}

export interface RecentItem {
  path: string;
  name: string;
  timestamp: number;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  recentlyVisited: RecentItem[];
  isFavorite: (path: string) => boolean;
  addToFavorites: (path: string, name: string) => void;
  removeFromFavorites: (path: string) => void;
  toggleFavorite: (path: string, name: string) => void;
  addToRecent: (path: string, name: string) => void;
  getRecentItems: (limit?: number) => RecentItem[];
}

// Context
const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

// Hook pre použitie favorites
export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

// Provider komponenta
interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recentlyVisited, setRecentlyVisited] = useState<RecentItem[]>([]);

  // Načítanie z localStorage pri spustení
  useEffect(() => {
    const savedFavorites = localStorage.getItem('app-favorites');
    const savedRecent = localStorage.getItem('app-recent');
    
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error parsing favorites from localStorage:', error);
      }
    }
    
    if (savedRecent) {
      try {
        setRecentlyVisited(JSON.parse(savedRecent));
      } catch (error) {
        console.error('Error parsing recent items from localStorage:', error);
      }
    }
  }, []);

  // Uloženie favorites do localStorage
  useEffect(() => {
    localStorage.setItem('app-favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Uloženie recent do localStorage
  useEffect(() => {
    localStorage.setItem('app-recent', JSON.stringify(recentlyVisited));
  }, [recentlyVisited]);

  // Kontrola či je stránka v favorites
  const isFavorite = (path: string): boolean => {
    return favorites.some(fav => fav.path === path);
  };

  // Pridanie do favorites
  const addToFavorites = (path: string, name: string) => {
    const newFavorite: FavoriteItem = {
      path,
      name,
      timestamp: Date.now()
    };
    
    setFavorites(prev => {
      // Skontroluj či už nie je v favorites
      if (prev.some(fav => fav.path === path)) {
        return prev;
      }
      return [...prev, newFavorite];
    });
  };

  // Odstránenie z favorites
  const removeFromFavorites = (path: string) => {
    setFavorites(prev => prev.filter(fav => fav.path !== path));
  };

  // Toggle favorite (pridaj/odstráň)
  const toggleFavorite = (path: string, name: string) => {
    if (isFavorite(path)) {
      removeFromFavorites(path);
    } else {
      addToFavorites(path, name);
    }
  };

  // Pridanie do recent (automaticky sa volá pri navigácii)
  const addToRecent = (path: string, name: string) => {
    const newRecentItem: RecentItem = {
      path,
      name,
      timestamp: Date.now()
    };

    setRecentlyVisited(prev => {
      // Odstráň existujúcu položku ak už existuje
      const filtered = prev.filter(item => item.path !== path);
      // Pridaj na začiatok a ponechaj len posledných 10 položiek
      return [newRecentItem, ...filtered].slice(0, 10);
    });
  };

  // Získanie recent items s limitom
  const getRecentItems = (limit: number = 3): RecentItem[] => {
    return recentlyVisited.slice(0, limit);
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      recentlyVisited,
      isFavorite,
      addToFavorites,
      removeFromFavorites,
      toggleFavorite,
      addToRecent,
      getRecentItems
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};