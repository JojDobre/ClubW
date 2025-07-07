import React from 'react';

const AdminFooter: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Left side - Website name */}
        <div className="footer-brand">
          <span className="footer-brand-text">© ADAM RENAK</span>
        </div>

        {/* Right side - Footer links */}
        <div className="footer-links">
          <button className="footer-link">
            <span className="footer-link-text">Help</span>
          </button>
          <button className="footer-link">
            <span className="footer-link-text">Support</span>
          </button>
          <button className="footer-link">
            <span className="footer-link-text">Contacts</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default AdminFooter;