import React from 'react';

export interface SidebarButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'muted';
  className?: string;
  onClick?: () => void;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ 
  children, 
  variant = 'default',
  className = '',
  onClick 
}) => {
  return (
    <button 
      className={`sidebar-button sidebar-button-${variant} ${className}`}
      onClick={onClick}
    >
      <div className="sidebar-button-text-container">
        <span className="sidebar-button-text">{children}</span>
      </div>
    </button>
  );
};

export default SidebarButton;