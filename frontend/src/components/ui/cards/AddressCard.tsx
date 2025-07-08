// AddressCard.tsx
import React from 'react';

interface AddressCardProps {
  title: string;
  status?: {
    text: string;
    type: 'active' | 'inactive' | 'pending';
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  editButton?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  variant?: 'default' | 'accent';
}

const AddressCard: React.FC<AddressCardProps> = ({
  title,
  status,
  address,
  editButton = true,
  onClick,
  onEdit,
  variant = 'default'
}) => {
  return (
    <div 
      className={`address-card address-card-${variant}`}
      onClick={onClick}
    >
      <div className="address-card-header">
        <div className="address-card-title-section">
          <h3 className="address-card-title">{title}</h3>
          {status && (
            <span className={`address-card-status address-card-status-${status.type}`}>
              {status.text}
            </span>
          )}
        </div>
        {editButton && (
          <button className="address-card-edit" onClick={onEdit}>
            Edit
          </button>
        )}
      </div>

      <div className="address-card-content">
        <div className="address-card-address">
          <div className="address-card-street">{address.street}</div>
          <div className="address-card-location">
            {address.city}, {address.state} {address.zipCode}
          </div>
          <div className="address-card-country">{address.country}</div>
        </div>
      </div>
    </div>
  );
};

export default AddressCard;