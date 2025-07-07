import React from 'react';

interface ActivityPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position?: {
    top: number;
    right: number;
  };
}

interface ActivityItemProps {
  avatar: React.ReactNode;
  text: string;
  time: string;
  type: 'user' | 'system' | 'file' | 'security' | 'update';
}

const ActivityItem: React.FC<ActivityItemProps> = ({ avatar, text, time, type }) => {
  const getTypeColor = () => {
    switch (type) {
      case 'user': return '#10B981'; // green
      case 'system': return '#3B82F6'; // blue  
      case 'file': return '#F59E0B'; // orange
      case 'security': return '#EF4444'; // red
      case 'update': return '#8B5CF6'; // purple
      default: return '#6B7280'; // gray
    }
  };

  return (
    <div className="activity-popup-item">
      <div className="activity-popup-avatar">
        {avatar}
      </div>
      <div className="activity-popup-content">
        <div className="activity-popup-text">{text}</div>
        <div className="activity-popup-time">{time}</div>
      </div>
      <div 
        className="activity-popup-type-indicator"
        style={{ background: getTypeColor() }}
      />
    </div>
  );
};

const ActivityPopup: React.FC<ActivityPopupProps> = ({ 
  isOpen, 
  onClose, 
  position = { top: 68, right: 16 }
}) => {
  // Avatar komponenty
  const Avatar: React.FC<{ initials: string; color?: string }> = ({ initials, color = '#3B82F6' }) => (
    <div className="activity-avatar" style={{ background: color }}>
      {initials}
    </div>
  );

  // System ikony
  const SystemIcon = () => (
    <div className="activity-icon" style={{ background: '#F3F4F6' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L10 6H15L11 9L13 14L8 11L3 14L5 9L1 6H6L8 1Z" fill="#6B7280"/>
      </svg>
    </div>
  );

  const FileIcon = () => (
    <div className="activity-icon" style={{ background: '#FEF3C7' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2H9L13 6V14H3V2Z" stroke="#F59E0B" strokeWidth="1.5" fill="none"/>
        <path d="M9 2V6H13" stroke="#F59E0B" strokeWidth="1.5" fill="none"/>
      </svg>
    </div>
  );

  const SecurityIcon = () => (
    <div className="activity-icon" style={{ background: '#FEE2E2' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L13 3V7C13 10 8 15 8 15S3 10 3 7V3L8 1Z" stroke="#EF4444" strokeWidth="1.5" fill="none"/>
        <path d="M8 5V9M8 11H8.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  );

  const UpdateIcon = () => (
    <div className="activity-icon" style={{ background: '#EDE9FE' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M13 8C13 10.7614 10.7614 13 8 13C5.23858 13 3 10.7614 3 8C3 5.23858 5.23858 3 8 3C9.30622 3 10.5 3.57946 11.3536 4.46447" stroke="#8B5CF6" strokeWidth="1.5" fill="none"/>
        <path d="M13 3V6H10" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="activity-popup-overlay" onClick={handleOverlayClick} />
      
      {/* Popup */}
      <div 
        className="activity-popup"
        style={{
          top: position.top,
          right: position.right,
        }}
      >
        {/* Header */}
        <div className="activity-popup-header">
          <div className="activity-popup-header-content">
            <h3>Recent Activity</h3>
            <p>Latest actions and updates</p>
          </div>
          <button className="activity-popup-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="var(--black-40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Activity List */}
        <div className="activity-popup-list">
          <ActivityItem
            avatar={<Avatar initials="YB" color="#10B981" />}
            text="You updated your profile settings"
            time="2 minutes ago"
            type="user"
          />
          <ActivityItem
            avatar={<Avatar initials="JS" color="#3B82F6" />}
            text="John Smith created a new project"
            time="5 minutes ago"
            type="user"
          />
          <ActivityItem
            avatar={<SystemIcon />}
            text="System backup completed successfully"
            time="15 minutes ago"
            type="system"
          />
          <ActivityItem
            avatar={<Avatar initials="MK" color="#8B5CF6" />}
            text="Maria Klein uploaded 3 new files"
            time="1 hour ago"
            type="file"
          />
          <ActivityItem
            avatar={<FileIcon />}
            text="Weekly report has been generated"
            time="2 hours ago"
            type="file"
          />
          <ActivityItem
            avatar={<SecurityIcon />}
            text="Failed login attempt detected"
            time="3 hours ago"
            type="security"
          />
          <ActivityItem
            avatar={<Avatar initials="RW" color="#F59E0B" />}
            text="Robert Wilson left a comment"
            time="4 hours ago"
            type="user"
          />
          <ActivityItem
            avatar={<UpdateIcon />}
            text="Database optimization completed"
            time="Today, 9:30 AM"
            type="update"
          />
          <ActivityItem
            avatar={<Avatar initials="AL" color="#EF4444" />}
            text="Anna Lee shared a document"
            time="Yesterday, 6:45 PM"
            type="file"
          />
          <ActivityItem
            avatar={<Avatar initials="DM" color="#06B6D4" />}
            text="David Miller completed a task"
            time="Yesterday, 2:15 PM"
            type="user"
          />
        </div>

        {/* Footer */}
        <div className="activity-popup-footer">
          <button className="activity-popup-view-all">
            View Full Activity Log
          </button>
        </div>
      </div>
    </>
  );
};

export default ActivityPopup;