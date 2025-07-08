// DetailCard.tsx - Extended with season variant
import React from 'react';

interface DetailCardProps {
  title: string;
  subtitle: string;
  headerIcon?: React.ReactNode;
  variant?: 'profile' | 'simple' | 'season';
  
  // Profile variant
  profileImage?: string;
  status?: 'completed' | 'rejected' | 'pending' | 'in-progress';
  
  // Simple & Profile variants
  currentValue?: number;
  totalValue?: number;
  progressLabel?: string;
  progressPercentage?: number;
  
  // Season variant
  seasonData?: {
    matchesPlayed: number;
    totalMatches: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
  };
}

const DetailCard: React.FC<DetailCardProps> = ({
  title,
  subtitle,
  headerIcon,
  variant = 'simple',
  profileImage,
  status,
  currentValue,
  totalValue,
  progressLabel,
  progressPercentage,
  seasonData
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'var(--color-success)';
      case 'rejected':
        return 'var(--color-error)';
      case 'pending':
        return 'var(--secondary-yellow)';
      case 'in-progress':
        return 'var(--primary-blue)';
      default:
        return 'var(--color-text-muted)';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      case 'in-progress':
        return 'In Progress';
      default:
        return '';
    }
  };

  return (
    <div className="detail-card">
      {/* Header */}
      <div className="detail-card-header">
        <div className="detail-card-header-content">
          <h3 className="detail-card-title">{title}</h3>
          <p className="detail-card-subtitle">{subtitle}</p>
        </div>
        {headerIcon && (
          <div className="detail-card-header-icon">
            {headerIcon}
          </div>
        )}
      </div>

      {/* Profile Section - only for profile variant */}
      {variant === 'profile' && (
        <div className="detail-card-profile">
          <div className="detail-card-profile-info">
            {profileImage && (
              <div className="detail-card-avatar">
                <img src={profileImage} alt="Profile" />
              </div>
            )}
            {status && (
              <div className="detail-card-status">
                <span 
                  className="detail-card-status-dot"
                  style={{ backgroundColor: getStatusColor(status) }}
                ></span>
                <span className="detail-card-status-text">
                  {getStatusText(status)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Season Statistics - only for season variant */}
      {variant === 'season' && seasonData && (
        <div className="detail-card-season">
          <div className="detail-card-season-stats">
            <div className="detail-card-stat-item">
              <span className="detail-card-stat-value">{seasonData.wins}</span>
              <span className="detail-card-stat-label">Wins</span>
            </div>
            <div className="detail-card-stat-item">
              <span className="detail-card-stat-value">{seasonData.draws}</span>
              <span className="detail-card-stat-label">Draws</span>
            </div>
            <div className="detail-card-stat-item">
              <span className="detail-card-stat-value">{seasonData.losses}</span>
              <span className="detail-card-stat-label">Losses</span>
            </div>
            <div className="detail-card-stat-item detail-card-points">
              <span className="detail-card-stat-value">{seasonData.points}</span>
              <span className="detail-card-stat-label">Points</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress Section - for simple, profile and season variants */}
      <div className="detail-card-progress">
        <div className="detail-card-progress-header">
          <div className="detail-card-progress-values">
            {variant === 'season' && seasonData ? (
              <>
                <span className="detail-card-current">{seasonData.matchesPlayed}</span>
                <span className="detail-card-separator">/</span>
                <span className="detail-card-total">{seasonData.totalMatches}</span>
                <span className="detail-card-progress-label">Matches Played</span>
              </>
            ) : (
              <>
                <span className="detail-card-current">{currentValue}</span>
                <span className="detail-card-separator">/</span>
                <span className="detail-card-total">{totalValue}</span>
                <span className="detail-card-progress-label">{progressLabel}</span>
              </>
            )}
          </div>
          <span className="detail-card-percentage">
            {variant === 'season' && seasonData 
              ? Math.round((seasonData.matchesPlayed / seasonData.totalMatches) * 100)
              : progressPercentage
            }%
          </span>
        </div>
        
        <div className="detail-card-progress-bar">
          <div 
            className="detail-card-progress-fill"
            style={{ 
              width: `${variant === 'season' && seasonData 
                ? Math.round((seasonData.matchesPlayed / seasonData.totalMatches) * 100)
                : progressPercentage
              }%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default DetailCard;