// frontend/src/components/layout/AdminMobileRightbar.tsx
// Pravý mobilný sidebar pre notifikácie, aktivity a rýchle akcie

//mobilerightbar.tsx

import React from 'react';
import Avatar from '../ui/Avatar';

interface MobileRightbarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationItemProps {
  icon: React.ReactNode;
  text: string;
  time: string;
  isNew?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ icon, text, time, isNew = false }) => (
  <div className="mobile-rightbar-notification-item">
    <div className={`mobile-rightbar-notification-icon ${isNew ? 'new' : ''}`}>
      {icon}
    </div>
    <div className="mobile-rightbar-notification-content">
      <span className="mobile-rightbar-notification-text">{text}</span>
      <span className="mobile-rightbar-notification-time">{time}</span>
    </div>
  </div>
);

interface ActivityItemProps {
  avatar: React.ReactNode;
  text: string;
  time: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ avatar, text, time }) => (
  <div className="mobile-rightbar-activity-item">
    <div className="mobile-rightbar-activity-avatar">
      {avatar}
    </div>
    <div className="mobile-rightbar-activity-content">
      <span className="mobile-rightbar-activity-text">{text}</span>
      <span className="mobile-rightbar-activity-time">{time}</span>
    </div>
  </div>
);

interface ContactItemProps {
  avatar: React.ReactNode;
  name: string;
}

const ContactItem: React.FC<ContactItemProps> = ({ avatar, name }) => (
  <div className="mobile-rightbar-contact-item">
    <div className="mobile-rightbar-contact-avatar">
      {avatar}
    </div>
    <span className="mobile-rightbar-contact-name">{name}</span>
  </div>
);

const AdminMobileRightbar: React.FC<MobileRightbarProps> = ({ isOpen, onClose }) => {
  // Icons for notifications
  const BugIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2C11.1046 2 12 2.89543 12 4V6H8V4C8 2.89543 8.89543 2 10 2Z" fill="currentColor"/>
      <path d="M6 8V10C6 12.2091 7.79086 14 10 14C12.2091 14 14 12.2091 14 10V8H6Z" fill="currentColor"/>
      <path d="M4 10H2M18 10H16M4 6L2 4M16 6L18 4M4 14L2 16M16 14L18 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M16 17.5C16 14.46 12.84 12 9 12C5.16 12 2 14.46 2 17.5M9 9C10.6569 9 12 7.65685 12 6C12 4.34315 10.6569 3 9 3C7.34315 3 6 4.34315 6 6C6 7.65685 7.34315 9 9 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SubscribeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 8L8.5 13L17 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Close icon
  const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="mobile-rightbar-overlay" onClick={onClose} />
      
      {/* Rightbar */}
      <div className="mobile-rightbar">
        {/* Header */}
        <div className="mobile-rightbar-header">
          <h2 className="mobile-rightbar-title">Activity</h2>
          <button className="mobile-rightbar-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="mobile-rightbar-content">
          {/* Notifications Section */}
          <div className="mobile-rightbar-section">
            <h3 className="mobile-rightbar-section-title">Notifications</h3>
            <div className="mobile-rightbar-section-content">
              <NotificationItem
                icon={<BugIcon />}
                text="You have a bug that needs..."
                time="Just now"
                isNew={true}
              />
              <NotificationItem
                icon={<UserIcon />}
                text="New user registered"
                time="59 minutes ago"
              />
              <NotificationItem
                icon={<BugIcon />}
                text="You have a bug that needs..."
                time="12 hours ago"
              />
              <NotificationItem
                icon={<SubscribeIcon />}
                text="Andi Lane subscribed to you"
                time="Today, 11:59 AM"
              />
            </div>
          </div>

          {/* Activities Section */}
          <div className="mobile-rightbar-section">
            <h3 className="mobile-rightbar-section-title">Activities</h3>
            <div className="mobile-rightbar-section-content">
              <ActivityItem
                avatar={<Avatar initials="YB" size={32} />}
                text="You have a bug that needs..."
                time="Just now"
              />
              <ActivityItem
                avatar={<Avatar initials="RV" size={32} />}
                text="Released a new version"
                time="59 minutes ago"
              />
              <ActivityItem
                avatar={<Avatar initials="SB" size={32} />}
                text="Submitted a bug"
                time="12 hours ago"
              />
              <ActivityItem
                avatar={<Avatar initials="MD" size={32} />}
                text="Modified A data in Page X"
                time="Today, 11:59 AM"
              />
              <ActivityItem
                avatar={<Avatar initials="DP" size={32} />}
                text="Deleted a page in Project X"
                time="Feb 2, 2025"
              />
            </div>
          </div>

          {/* Contacts Section */}
          <div className="mobile-rightbar-section">
            <h3 className="mobile-rightbar-section-title">Contacts</h3>
            <div className="mobile-rightbar-section-content">
              <ContactItem
                avatar={<Avatar initials="NC" size={32} />}
                name="Natali Craig"
              />
              <ContactItem
                avatar={<Avatar initials="DC" size={32} />}
                name="Drew Cano"
              />
              <ContactItem
                avatar={<Avatar initials="OD" size={32} />}
                name="Orlando Diggs"
              />
              <ContactItem
                avatar={<Avatar initials="AL" size={32} />}
                name="Andi Lane"
              />
              <ContactItem
                avatar={<Avatar initials="KM" size={32} />}
                name="Kate Morrison"
              />
              <ContactItem
                avatar={<Avatar initials="KO" size={32} />}
                name="Koray Okumus"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminMobileRightbar;