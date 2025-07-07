// src/components/ui/NotificationPopup.tsx - Finálna verzia
import React from 'react';

interface NotificationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position?: {
    top: number;
    right: number;
  };
}

interface NotificationItemProps {
  icon: React.ReactNode;
  text: string;
  time: string;
  isNew?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ icon, text, time, isNew = false }) => (
  <div className={`notification-popup-item ${isNew ? 'new' : ''}`}>
    <div className={`notification-popup-icon ${isNew ? 'new' : ''}`}>
      {icon}
    </div>
    <div className="notification-popup-content">
      <span className="notification-popup-text">{text}</span>
      <span className="notification-popup-time">{time}</span>
    </div>
  </div>
);

const NotificationPopup: React.FC<NotificationPopupProps> = ({ 
  isOpen, 
  onClose, 
  position = { top: 68, right: 16 }
}) => {
  // Icons pre notifikácie
  const BugIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2C11.1046 2 12 2.89543 12 4V6H8V4C8 2.89543 8.89543 2 10 2Z" fill="var(--black-100)"/>
      <path d="M6 8V10C6 12.2091 7.79086 14 10 14C12.2091 14 14 12.2091 14 10V8H6Z" fill="var(--black-100)"/>
      <path d="M4 10H2M18 10H16M4 6L2 4M16 6L18 4M4 14L2 16M16 14L18 16" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M16 17.5C16 14.46 12.84 12 9 12C5.16 12 2 14.46 2 17.5M9 9C10.6569 9 12 7.65685 12 6C12 4.34315 10.6569 3 9 3C7.34315 3 6 4.34315 6 6C6 7.65685 7.34315 9 9 9Z" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5H17C17.55 5 18 5.45 18 6V14C18 14.55 17.55 15 17 15H3C2.45 15 2 14.55 2 14V6C2 5.45 2.45 5 3 5Z" stroke="var(--black-100)" strokeWidth="1.5"/>
      <path d="M18 6L10 11L2 6" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="var(--black-100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SubscribeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 8L8.5 13L17 4" stroke="var(--black-100)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Overlay background pri kliku zatvorí popup
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="notification-popup-overlay" onClick={handleOverlayClick} />
      
      {/* Popup */}
      <div 
        className="notification-popup"
        style={{
          top: position.top,
          right: position.right,
        }}
      >
        {/* Header */}
        <div className="notification-popup-header">
          <h3 className="notification-popup-title">Notifications</h3>
          <button className="notification-popup-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="var(--black-40)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Notification List */}
        <div className="notification-popup-list">
          <NotificationItem
            icon={<BugIcon />}
            text="You have a bug that needs to be fixed"
            time="Just now"
            isNew={true}
          />
          <NotificationItem
            icon={<UserIcon />}
            text="New user registered to your application"
            time="2 minutes ago"
            isNew={true}
          />
          <NotificationItem
            icon={<EmailIcon />}
            text="You have 3 new messages"
            time="15 minutes ago"
          />
          <NotificationItem
            icon={<WarningIcon />}
            text="Server response time is slow"
            time="1 hour ago"
          />
          <NotificationItem
            icon={<SubscribeIcon />}
            text="Andi Lane subscribed to your updates"
            time="2 hours ago"
          />
          <NotificationItem
            icon={<BugIcon />}
            text="Database backup completed successfully"
            time="Today, 11:59 AM"
          />
          <NotificationItem
            icon={<UserIcon />}
            text="5 new users joined today"
            time="Today, 9:30 AM"
          />
          <NotificationItem
            icon={<EmailIcon />}
            text="Weekly report is ready for download"
            time="Yesterday, 6:00 PM"
          />
        </div>

        {/* Footer */}
        <div className="notification-popup-footer">
          <button className="notification-popup-view-all">
            View All Notifications
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationPopup;