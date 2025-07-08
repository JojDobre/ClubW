// StatCard.tsx
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  variant?: 'default' | 'accent';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  variant = 'default'
}) => {
  return (
    <div className={`stat-card stat-card-${variant}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && (
          <div className="stat-card-icon">
            {icon}
          </div>
        )}
      </div>
      
      <div className="stat-card-content">
        <div className="stat-card-value">{value}</div>
        {change && (
          <div className={`stat-card-change stat-card-change-${changeType}`}>
            {change}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stat-card-arrow">
              <path 
                d="M3 6L6 3L9 6" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{
                  transform: changeType === 'negative' ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;