import React, { forwardRef } from 'react';

interface NavbarIconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string; // Pridané pre tooltip
}

const NavbarIconButton = forwardRef<HTMLButtonElement, NavbarIconButtonProps>(({ 
  children, 
  onClick, 
  className = '',
  title
}, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`navbar-icon-button ${className}`}
      title={title}
    >
      <div className="navbar-icon-set">
        {children}
      </div>
    </button>
  );
});

export default NavbarIconButton;