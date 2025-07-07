import React from 'react';

export interface SidebarLogoProps {
  children: React.ReactNode;
  className?: string;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`sidebar-logo ${className}`}>
      {children}
    </div>
  );
};

export default SidebarLogo;