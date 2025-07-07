import { useRouter } from '../context/RouterContext';
import { useFavorites } from '../context/FavoritesContext';

export const useNavigation = () => {
  const { navigate: routerNavigate, getPageName, currentRoute } = useRouter();
  const { addToRecent, isFavorite, toggleFavorite } = useFavorites();

  // Rozšírená navigate funkcia, ktorá automaticky pridá stránku do recent
  const navigate = (path: string) => {
    const pageName = getPageName(path);
    
    // Pridaj do recent pred navigáciou
    addToRecent(path, pageName);
    
    // Vykonaj navigáciu
    routerNavigate(path);
  };

  // Funkcia pre toggle favorite aktuálnej stránky
  const toggleCurrentPageFavorite = () => {
    const pageName = getPageName(currentRoute);
    toggleFavorite(currentRoute, pageName);
  };

  // Kontrola či je aktuálna stránka favorite
  const isCurrentPageFavorite = () => {
    return isFavorite(currentRoute);
  };

  return {
    navigate,
    currentRoute,
    getPageName,
    toggleCurrentPageFavorite,
    isCurrentPageFavorite
  };
};