// ActionsPopup.tsx
// Umiestnenie: frontend/src/components/ui/table/ActionsPopup.tsx
// Popup komponent pre rýchle akcie v tabuľke

import React, { useRef, useEffect } from 'react';

// Interface pre jednu akciu v menu
export interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean; // Pre označenie nebezpečných akcií (zmazanie, etc.)
  separator?: boolean; // Pre pridanie oddeľovača za túto akciu
}

// Props pre ActionsPopup komponent
export interface ActionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  actions: ActionItem[];
  className?: string;
}

const ActionsPopup: React.FC<ActionsPopupProps> = ({
  isOpen,
  onClose,
  position,
  actions,
  className = ''
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Zatvorenie popup-u pri kliknutí mimo neho
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Zatvorenie popup-u pri stlačení ESC
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Handler pre kliknutie na akciu
  const handleActionClick = (action: ActionItem) => {
    action.onClick();
    onClose(); // Zatvoríme popup po vykonaní akcie
  };

  // Ak nie je otvorený, nerenduj nič
  if (!isOpen) return null;

  return (
    <div 
      ref={popupRef}
      className={`actions-popup ${className}`}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      <div className="actions-popup-list">
        {actions.map((action, index) => (
          <React.Fragment key={action.id}>
            <button
              className={`actions-popup-item ${action.danger ? 'danger' : ''}`}
              onClick={() => handleActionClick(action)}
              type="button"
            >
              <div className="actions-popup-item-icon">
                {action.icon}
              </div>
              <span className="actions-popup-item-text">
                {action.label}
              </span>
            </button>
            
            {/* Oddeľovač ak je potrebný */}
            {action.separator && index < actions.length - 1 && (
              <div className="actions-popup-separator" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ActionsPopup;