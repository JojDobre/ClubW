import React from 'react';

interface SidebarEmptyPlaceholderProps {
  icon?: React.ReactNode;
  text: string;
}

const SidebarEmptyPlaceholder: React.FC<SidebarEmptyPlaceholderProps> = ({ icon, text }) => {
  return (
    <div className="sidebar-empty-placeholder">
      {icon && (
        <div className="sidebar-empty-placeholder-icon">
          {icon}
        </div>
      )}
      <div className="sidebar-empty-placeholder-text">
        {text}
      </div>
    </div>
  );
};

export default SidebarEmptyPlaceholder;