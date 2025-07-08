// EventCard.tsx
import React from 'react';

interface EventCardProps {
  title: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
  attendees?: {
    count: number;
    max?: number;
    avatars?: string[];
  };
  status?: 'upcoming' | 'live' | 'ended' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  onJoin?: () => void;
  onDecline?: () => void;
  variant?: 'default' | 'compact';
}

const EventCard: React.FC<EventCardProps> = ({
  title,
  date,
  time,
  location,
  description,
  attendees,
  status = 'upcoming',
  priority = 'medium',
  onJoin,
  onDecline,
  variant = 'default'
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'live':
        return 'var(--color-error)';
      case 'upcoming':
        return 'var(--color-success)';
      case 'ended':
        return 'var(--color-text-muted)';
      case 'cancelled':
        return 'var(--color-error)';
      default:
        return 'var(--color-text-muted)';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'live':
        return 'Live now';
      case 'upcoming':
        return 'Upcoming';
      case 'ended':
        return 'Ended';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  };

  const getPriorityBorder = () => {
    switch (priority) {
      case 'high':
        return '2px solid var(--color-error)';
      case 'medium':
        return '2px solid var(--secondary-yellow)';
      case 'low':
        return '2px solid var(--color-success)';
      default:
        return '1px solid var(--color-border)';
    }
  };

  return (
    <div 
      className={`event-card event-card-${variant} event-card-${status}`}
      style={{ borderLeft: getPriorityBorder() }}
    >
      {/* Header */}
      <div className="event-card-header">
        <div className="event-card-title-section">
          <div className="event-card-calendar-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M17 3H16V2C16 1.44772 15.5523 1 15 1C14.4477 1 14 1.44772 14 2V3H6V2C6 1.44772 5.55228 1 5 1C4.44772 1 4 1.44772 4 2V3H3C1.89543 3 1 3.89543 1 5V17C1 18.1046 1.89543 19 3 19H17C18.1046 19 19 18.1046 19 17V5C19 3.89543 18.1046 3 17 3Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M1 8H19" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <h3 className="event-card-title">{title}</h3>
        </div>
        
        <div className="event-card-status">
          <span 
            className="event-card-status-badge"
            style={{ color: getStatusColor() }}
          >
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="event-card-content">
        {/* Date & Time */}
        <div className="event-card-datetime">
          <div className="event-card-date-time">
            <span className="event-card-date">{date}</span>
            <span className="event-card-time">{time}</span>
          </div>
          
          {location && (
            <div className="event-card-location">
              <div className="event-card-location-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 8.5C9.10457 8.5 10 7.60457 10 6.5C10 5.39543 9.10457 4.5 8 4.5C6.89543 4.5 6 5.39543 6 6.5C6 7.60457 6.89543 8.5 8 8.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1C10.4853 1 12.5 3.01472 12.5 5.5C12.5 9.5 8 15 8 15C8 15 3.5 9.5 3.5 5.5C3.5 3.01472 5.51472 1 8 1Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <span className="event-card-location-text">{location}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {description && variant === 'default' && (
          <p className="event-card-description">{description}</p>
        )}

        {/* Attendees */}
        {attendees && (
          <div className="event-card-attendees">
            <div className="event-card-attendees-avatars">
              {attendees.avatars && attendees.avatars.slice(0, 3).map((avatar, index) => (
                <div key={index} className="event-card-avatar">
                  <img src={avatar} alt={`Attendee ${index + 1}`} />
                </div>
              ))}
              {attendees.count > 3 && (
                <div className="event-card-avatar-more">
                  +{attendees.count - 3}
                </div>
              )}
            </div>
            
            <span className="event-card-attendees-count">
              {attendees.count}{attendees.max ? `/${attendees.max}` : ''} attending
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {status !== 'ended' && status !== 'cancelled' && (
        <div className="event-card-actions">
          {onJoin && (
            <button 
              className={`event-card-join ${status === 'live' ? 'live' : ''}`}
              onClick={onJoin}
            >
              {status === 'live' ? 'Join Now' : 'Join Event'}
            </button>
          )}
          {onDecline && (
            <button 
              className="event-card-decline"
              onClick={onDecline}
            >
              Decline
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EventCard;