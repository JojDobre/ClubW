import React from 'react';

interface BreadcrumbItem {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface NavbarBreadcrumbProps {
  items: BreadcrumbItem[];
}

const NavbarBreadcrumb: React.FC<NavbarBreadcrumbProps> = ({ items }) => {
  return (
    <div className="navbar-breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <button
            className="navbar-breadcrumb-button"
            onClick={item.onClick}
          >
            <div className="navbar-breadcrumb-text">
              <span className={item.active ? 'active' : 'inactive'}>
                {item.label}
              </span>
            </div>
          </button>
          {index < items.length - 1 && (
            <div className="navbar-breadcrumb-separator">
              <span>/</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default NavbarBreadcrumb;