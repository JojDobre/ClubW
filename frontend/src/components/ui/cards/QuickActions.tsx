// QuickActionCard.tsx
import React from 'react';

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'purple' | 'cyan';
  size?: 'default' | 'large';
  onClick?: () => void;
  disabled?: boolean;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  title,
  description,
  color = 'primary',
  size = 'default',
  onClick,
  disabled = false
}) => {
  return (
    <div 
      className={`quick-action-card quick-action-card-${color} quick-action-card-${size} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="quick-action-card-icon">
        {icon}
      </div>
      
      <div className="quick-action-card-content">
        <h3 className="quick-action-card-title">{title}</h3>
        {description && (
          <p className="quick-action-card-description">{description}</p>
        )}
      </div>
    </div>
  );
};

export default QuickActionCard;