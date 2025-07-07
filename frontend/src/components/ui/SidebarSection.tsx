import React from 'react';

export interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ 
  title, 
  children, 
  className = '' 
}) => {
  return (
    <div className={`sidebar-section ${className}`}>
      {title && (
        <div className="sidebar-section-title-container">
          <span className="sidebar-section-title">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
};

export default SidebarSection;