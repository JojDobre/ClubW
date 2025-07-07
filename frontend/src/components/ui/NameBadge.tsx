import React from 'react';

export interface NameBadgeProps {
  avatarUrl?: string;
  name: string;
  className?: string;
}

const NameBadge: React.FC<NameBadgeProps> = ({ 
  avatarUrl, 
  name, 
  className = '' 
}) => {
  return (
    <div className={`name-badge ${className}`}>
      <div className="name-badge-icon-text">
        <div className="name-badge-icon-set">
          <div 
            className="name-badge-icon"
            style={{ 
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
              backgroundColor: avatarUrl ? 'transparent' : 'var(--black-20)'
            }}
          />
        </div>
        <div className="name-badge-text-container">
          <span className="name-badge-text">{name}</span>
        </div>
      </div>
    </div>
  );
};

export default NameBadge;