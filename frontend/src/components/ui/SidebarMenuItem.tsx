import React from 'react';

export interface SidebarMenuItemProps {
  activeIndicator?: React.ReactNode;
  arrow?: React.ReactNode;
  icon?: React.ReactNode;
  text: string;
  isActive?: boolean;
  isSubmenu?: boolean;
  isSimpleItem?: boolean;
  expandIcon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({ 
  activeIndicator,
  arrow,
  icon, 
  text, 
  isActive = false,
  isSubmenu = false,
  isSimpleItem = false,
  expandIcon,
  className = '',
  onClick 
}) => {
  return (
    <div 
      className={`sidebar-menu-item ${isActive ? 'active' : ''} ${isSubmenu ? 'submenu' : ''} ${isSimpleItem ? 'simple' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="sidebar-menu-item-icon-text">
        {/* Simple items (Overview, Projects v prvej sekcii) - IGNORUJE všetko ostatné */}
        {isSimpleItem && (
          <>
            {icon && (
              <div className="sidebar-menu-item-icon-set simple">
                {icon}
              </div>
            )}
            <div className="sidebar-menu-item-text-container">
              <span className="sidebar-menu-item-text">{text}</span>
            </div>
          </>
        )}
        
        {/* Dashboard/Pages items */}
        {!isSimpleItem && !isSubmenu && (
          <>
            {/* Arrow - zobrazuje sa len ak existuje */}
            {arrow && (
              <div className="sidebar-menu-item-arrow">
                {arrow}
              </div>
            )}
            
            {/* Spacer - len ak nie je arrow */}
            {!arrow && (
              <div className="sidebar-menu-item-spacer"></div>
            )}
            
            {/* Hlavná ikona */}
            {icon && (
              <div className="sidebar-menu-item-icon-set">
                {icon}
              </div>
            )}
            
            {/* Text */}
            <div className="sidebar-menu-item-text-container">
              <span className="sidebar-menu-item-text">{text}</span>
            </div>
          </>
        )}
        
        {/* Submenu items - centrovaný text bez čiarky */}
        {isSubmenu && (
          <div className="sidebar-menu-item-text-container">
            <span className="sidebar-menu-item-text">{text}</span>
          </div>
        )}
        
        {/* Expand ikona (pre starý systém) */}
        {expandIcon && (
          <div className="sidebar-menu-item-expand-icon">
            {expandIcon}
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarMenuItem;