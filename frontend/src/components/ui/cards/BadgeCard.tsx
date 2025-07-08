// BadgeCard.tsx
import React from 'react';

interface BadgeCardProps {
  badge: {
    text: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'purple';
  };
  title: string;
  description: string;
  avatar?: {
    src?: string;
    fallback?: string;
    color?: string;
  };
  stats: Array<{
    icon: React.ReactNode;
    value: string | number;
  }>;
  onClick?: () => void;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  title,
  description,
  avatar,
  stats,
  onClick
}) => {
  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'primary':
        return 'var(--primary-blue)';
      case 'secondary':
        return 'var(--secondary-purple)';
      case 'success':
        return 'var(--color-success)';
      case 'warning':
        return 'var(--secondary-yellow)';
      case 'error':
        return 'var(--color-error)';
      case 'purple':
        return 'var(--secondary-purple)';
      default:
        return 'var(--secondary-purple)';
    }
  };

  return (
    <div className="badge-card" onClick={onClick}>
      {/* Badge */}
      <div 
        className="badge-card-badge"
        style={{ backgroundColor: getBadgeColor(badge.color || 'purple') }}
      >
        {badge.text}
      </div>

      {/* Content */}
      <div className="badge-card-content">
        <h3 className="badge-card-title">{title}</h3>
        <p className="badge-card-description">{description}</p>
      </div>

      {/* Footer */}
      <div className="badge-card-footer">
        {/* Avatar */}
        <div className="badge-card-avatar">
          {avatar?.src ? (
            <img src={avatar.src} alt="Avatar" />
          ) : (
            <div 
              className="badge-card-avatar-fallback"
              style={{ 
                backgroundColor: avatar?.color || 'var(--primary-blue)',
                background: avatar?.color || 'linear-gradient(135deg, var(--primary-blue), var(--secondary-purple))'
              }}
            >
              {avatar?.fallback || '?'}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="badge-card-stats">
          {stats.map((stat, index) => (
            <div key={index} className="badge-card-stat">
              <div className="badge-card-stat-icon">
                {stat.icon}
              </div>
              <span className="badge-card-stat-value">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BadgeCard;