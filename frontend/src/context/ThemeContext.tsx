import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Typy pre témy
type Theme = 'light' | 'dark' | 'dark-bright';

interface ThemeContextType {
  currentTheme: Theme;
  nextTheme: Theme;
  cycleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook pre použitie theme contextu
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Provider komponenta
interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialTheme = 'light' 
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(initialTheme);

  // Cyklus tém: light → light-bright → dark → dark-bright → light
  const themeOrder: Theme[] = ['light', 'dark', 'dark-bright'];

  // Určenie ďalšej témy v cykle
  const getNextTheme = (theme: Theme): Theme => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    return themeOrder[nextIndex];
  };

  const nextTheme = getNextTheme(currentTheme);

  // Funkcia na cyklovanie tém
  const cycleTheme = () => {
    const next = getNextTheme(currentTheme);
    setTheme(next);
  };

  // Funkcia na nastavenie konkrétnej témy s smooth transition
  const setTheme = (theme: Theme) => {
    // Pridáme transition overlay pre smooth effect
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay active';
    document.body.appendChild(overlay);
    
    // Pridáme CSS triedu pre theme change animáciu
    const themeButton = document.querySelector('.navbar-icon-button');
    themeButton?.classList.add('theme-changing');
    
    // Krátke delay pre smooth transition
    setTimeout(() => {
      setCurrentTheme(theme);
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      
      // Odstránime overlay a animačnú triedu
      setTimeout(() => {
        overlay.remove();
        themeButton?.classList.remove('theme-changing');
      }, 150);
    }, 100);
  };

  // Načítanie témy z localStorage pri inicializácii
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && themeOrder.includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      setTheme(initialTheme);
    }
  }, [initialTheme]);

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      nextTheme,
      cycleTheme,
      setTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};