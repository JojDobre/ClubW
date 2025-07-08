// AddUserModal.tsx
import React, { useState } from 'react';
import Modal from './Modal';

export interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: UserFormData) => void;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  date: string;
  avatar?: string;
}

const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    date: '',
    avatar: ''
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Handle input changes
  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        avatar: previewUrl
      }));
    }
  };

  // Handle form submit
  const handleSave = () => {
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    onSave(formData);
    handleClose();
  };

  // Handle close and reset
  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      date: '',
      avatar: ''
    });
    setAvatarFile(null);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="New User"
      className="add-user-modal"
    >
      <div className="add-user-form">
        {/* Avatar Upload */}
        <div className="avatar-upload-section">
          <div className="avatar-upload">
            <input
              type="file"
              id="avatar-input"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="avatar-input"
            />
            <label htmlFor="avatar-input" className="avatar-label">
              {formData.avatar ? (
                <img 
                  src={formData.avatar} 
                  alt="Avatar preview" 
                  className="avatar-preview"
                />
              ) : (
                <div className="avatar-placeholder">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path 
                      d="M16 16C19.3137 16 22 13.3137 22 10C22 6.68629 19.3137 4 16 4C12.6863 4 10 6.68629 10 10C10 13.3137 12.6863 16 16 16Z" 
                      fill="currentColor"
                    />
                    <path 
                      d="M16 18C10.477 18 6 22.477 6 28H26C26 22.477 21.523 18 16 18Z" 
                      fill="currentColor"
                    />
                  </svg>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Form Fields */}
        <div className="form-row">
          <div className="form-field">
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="form-input"
              placeholder="First Name"
            />
          </div>
          
          <div className="form-field">
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="form-input"
              placeholder="Last Name"
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="form-input"
            placeholder="Please enter your email address."
          />
        </div>

        <div className="form-field">
          <label className="form-label">Date</label>
          <div className="date-input-wrapper">
            <input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="form-input date-input"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="button" 
            onClick={handleClose}
            className="form-button cancel-button"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            className="form-button save-button"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddUserModal;