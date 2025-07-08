// frontend/src/components/ui/ActionMenu.tsx
// Dropdown menu pre akcie v tabuľke

import React, { useState, useRef, useEffect } from 'react';

interface ActionMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  className?: string;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ items, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Zatvorenie menu pri kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: ActionMenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div className={`action-menu-container ${className}`} style={{ position: 'relative' }}>
      {/* Three dots button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="table-action-button"
        style={{
          padding: '8px',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-background)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="2" r="1" fill="currentColor"/>
          <circle cx="8" cy="8" r="1" fill="currentColor"/>
          <circle cx="8" cy="14" r="1" fill="currentColor"/>
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '8px 0',
            minWidth: '160px',
            zIndex: 1000,
            marginTop: '4px'
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: item.danger ? 'var(--color-error)' : 'var(--color-text-primary)',
                transition: 'background 0.2s ease',
                fontFamily: 'var(--font-family-base)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.danger 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : 'var(--color-background)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: '16px',
                opacity: 0.8
              }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;