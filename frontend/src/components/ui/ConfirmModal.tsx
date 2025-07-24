// frontend/src/components/ui/ConfirmationModal.tsx
// Znovu použiteľná komponenta pre potvrdzovacie dialógy - používa štýly z table.css

import React from 'react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isDangerous?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Potvrdiť',
  cancelText = 'Zrušiť',
  isLoading = false,
  isDangerous = true
}) => {
  // Ak nie je otvorený, nerenduj nič
  if (!isOpen) return null;

  // Presne rovnaký JSX ako v Table.tsx
  return (
    <div className="modal-overlay">
      <div className="modal-content confirmation-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button 
            className="btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className="btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Spracováva sa...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;