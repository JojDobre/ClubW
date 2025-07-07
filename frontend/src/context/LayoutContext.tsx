import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Typy pre layout state
interface LayoutState {
  sidebarExpanded: boolean;
  rightbarExpanded: boolean;
}

interface LayoutContextType {
  // State
  sidebarExpanded: boolean;
  rightbarExpanded: boolean;
  isMobile: boolean;
  
  // Actions
  toggleSidebar: () => void;
  toggleRightbar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setRightbarExpanded: (expanded: boolean) => void;
  
  // Layout calculations
  getMainContentMargins: () => {
    marginLeft: number;
    marginRight: number;
  };
  
  getNavbarMargins: () => {
    left: number;
    right: number;
    width: string;
  };
}

// Context
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// Hook pre použitie layout contextu
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

// Hook pre detekciu mobile zariadení
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

// Provider komponenta
interface LayoutProviderProps {
  children: ReactNode;
  initialSidebarExpanded?: boolean;
  initialRightbarExpanded?: boolean;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ 
  children, 
  initialSidebarExpanded = true,  // Sidebar defaultne roztiahnutý
  initialRightbarExpanded = false // Rightbar defaultne zatiahnutý
}) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(initialSidebarExpanded);
  const [rightbarExpanded, setRightbarExpanded] = useState(initialRightbarExpanded);
  const isMobile = useIsMobile();

  // Toggle funkcie
  const toggleSidebar = () => {
    setSidebarExpanded(prev => !prev);
  };

  const toggleRightbar = () => {
    setRightbarExpanded(prev => !prev);
  };

  // Výpočet margínov pre main content - na mobile vždy 0
  const getMainContentMargins = () => {
    if (isMobile) {
      return {
        marginLeft: 0,
        marginRight: 0
      };
    }
    
    return {
      marginLeft: sidebarExpanded ? 212 : 0,  // Desktop sidebar margin
      marginRight: rightbarExpanded ? 320 : 0  // Desktop rightbar margin
    };
  };

  // Výpočet pozície a šírky pre navbar - na mobile nie je potrebné
  const getNavbarMargins = () => {
    if (isMobile) {
      return {
        left: 0,
        right: 0,
        width: '100%'
      };
    }
    
    const leftMargin = sidebarExpanded ? 212 : 0;
    const rightMargin = rightbarExpanded ? 320 : 0;
    
    return {
      left: leftMargin,
      right: rightMargin,
      width: `calc(100% - ${leftMargin + rightMargin}px)`
    };
  };

  return (
    <LayoutContext.Provider value={{
      sidebarExpanded,
      rightbarExpanded,
      isMobile,
      toggleSidebar,
      toggleRightbar,
      setSidebarExpanded,
      setRightbarExpanded,
      getMainContentMargins,
      getNavbarMargins
    }}>
      {children}
    </LayoutContext.Provider>
  );
};