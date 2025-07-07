import React from 'react';

interface AvatarProps {
  imageUrl?: string;
  initials: string;
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ 
  imageUrl, 
  initials, 
  size = 32, 
  className = '' 
}) => {
  return (
    <div 
      className={`avatar ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '80px',
        background: imageUrl 
          ? `url(${imageUrl}) lightgray 50% / cover no-repeat`
          : 'lightgray',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {!imageUrl && (
        <span 
          className="avatar-text"
          style={{
            color: '#1C1C1C',
            fontFamily: 'Inter, sans-serif',
            fontSize: `${Math.max(10, size * 0.3)}px`,
            fontWeight: 600,
            lineHeight: 1
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

export default Avatar;