// frontend/src/components/ui/table/AddCategoryModal.tsx
// Modal komponent pre pridávanie kategórií

import React, { useState } from 'react';
import Modal from './Modal';

export interface CategoryFormData {
  nazov: string;
  slug: string;
  popis: string;
  farba: string;
  ikona: string;
}

export interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: CategoryFormData) => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<CategoryFormData>({
    nazov: '',
    slug: '',
    popis: '',
    farba: '#3b82f6',
    ikona: '📁'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prednastavené farby
  const predefinedColors = [
    '#3b82f6', // Modrá
    '#10b981', // Zelená
    '#f59e0b', // Oranžová
    '#ef4444', // Červená
    '#8b5cf6', // Fialová
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#84cc16'  // Lime
  ];

  // Prednastavené ikony
  const predefinedIcons = [
    '📁', '⚽', '🏆', '📰', '🎤', '👶', '📊', '📅', 
    '⭐', '🔥', '💪', '🎯', '📈', '🏟️', '👥', '📝'
  ];

  // Generovanie slug z názvu
  const generateSlug = (nazov: string): string => {
    return nazov
      .toLowerCase()
      .normalize('NFD') // Rozdelí diakritiku
      .replace(/[\u0300-\u036f]/g, '') // Odstráni diakritiku
      .replace(/[^a-z0-9\s-]/g, '') // Odstráni špeciálne znaky
      .trim()
      .replace(/\s+/g, '-') // Nahradí medzery pomlčkami
      .replace(/-+/g, '-') // Odstráni viacnásobné pomlčky
      .replace(/^-+|-+$/g, ''); // Odstráni pomlčky na začiatku a konci
  };

  // Handle input changes
  const handleInputChange = (field: keyof CategoryFormData, value: string) => {
    const updated = {
      ...formData,
      [field]: value
    };
    
    // Auto-generovanie slug pri zmene názvu
    if (field === 'nazov' && value.trim()) {
      updated.slug = generateSlug(value);
    }
    
    setFormData(updated);
    
    // Vymazanie erroru pre dané pole
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Názov je povinný
    if (!formData.nazov.trim()) {
      newErrors.nazov = 'Názov kategórie je povinný';
    } else if (formData.nazov.trim().length < 2) {
      newErrors.nazov = 'Názov musí mať aspoň 2 znaky';
    } else if (formData.nazov.trim().length > 50) {
      newErrors.nazov = 'Názov môže mať maximálne 50 znakov';
    }
    
    // Slug je povinný a musí byť validný
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug je povinný';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug môže obsahovať iba malé písmená, čísla a pomlčky';
    }
    
    // Popis môže byť prázdny, ale ak nie je, max 200 znakov
    if (formData.popis && formData.popis.length > 200) {
      newErrors.popis = 'Popis môže mať maximálne 200 znakov';
    }
    
    // Farba musí byť hex farba
    if (!formData.farba || !/^#[0-9A-Fa-f]{6}$/.test(formData.farba)) {
      newErrors.farba = 'Farba musí byť v hex formáte (#rrggbb)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Príprava dát pre API
      const categoryData = {
        nazov: formData.nazov.trim(),
        slug: formData.slug.trim(),
        popis: formData.popis.trim() || '',
        farba: formData.farba,
        ikona: formData.ikona
      };
      
      await onSave(categoryData);
      handleClose();
    } catch (error) {
      console.error('Chyba pri ukladaní kategórie:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close and reset
  const handleClose = () => {
    setFormData({
      nazov: '',
      slug: '',
      popis: '',
      farba: '#3b82f6',
      ikona: '📁'
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Nová kategória"
      className="add-category-modal"
    >
      <div className="add-category-form">
        
        {/* Základné informácie */}
        <div className="modal-field">
          <label className="modal-label">
            Názov kategórie *
          </label>
          <input
            type="text"
            className={`modal-input ${errors.nazov ? 'error' : ''}`}
            value={formData.nazov}
            onChange={(e) => handleInputChange('nazov', e.target.value)}
            placeholder="Napr. Futbal, Správy, Tréningy..."
            maxLength={50}
          />
          {errors.nazov && (
            <span className="modal-error">{errors.nazov}</span>
          )}
        </div>

        <div className="modal-field">
          <label className="modal-label">
            Slug (URL identifikátor) *
          </label>
          <input
            type="text"
            className={`modal-input ${errors.slug ? 'error' : ''}`}
            value={formData.slug}
            onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase())}
            placeholder="automaticky-generovany-slug"
          />
          {errors.slug && (
            <span className="modal-error">{errors.slug}</span>
          )}
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            Automaticky generovaný z názvu. Môžete upraviť manuálne.
          </small>
        </div>

        <div className="modal-field">
          <label className="modal-label">
            Popis kategórie
          </label>
          <textarea
            className={`modal-textarea ${errors.popis ? 'error' : ''}`}
            value={formData.popis}
            onChange={(e) => handleInputChange('popis', e.target.value)}
            placeholder="Krátky popis kategórie..."
            rows={3}
            maxLength={200}
          />
          {errors.popis && (
            <span className="modal-error">{errors.popis}</span>
          )}
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            {formData.popis.length}/200 znakov
          </small>
        </div>

        {/* Vizuálne nastavenia */}
        <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
          <div className="modal-field" style={{ flex: 1 }}>
            <label className="modal-label">
              Farba kategórie
            </label>
            <div className="color-input-container">
              <input
                type="color"
                className="color-input"
                value={formData.farba}
                onChange={(e) => handleInputChange('farba', e.target.value)}
              />
              <input
                type="text"
                className={`modal-input ${errors.farba ? 'error' : ''}`}
                value={formData.farba}
                onChange={(e) => handleInputChange('farba', e.target.value)}
                placeholder="#3b82f6"
                style={{ paddingLeft: '50px' }}
              />
            </div>
            {errors.farba && (
              <span className="modal-error">{errors.farba}</span>
            )}
            
            {/* Prednastavené farby */}
            <div className="color-presets">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-preset ${formData.farba === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('farba', color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="modal-field" style={{ flex: 1 }}>
            <label className="modal-label">
              Ikona kategórie
            </label>
            <div className="icon-input-container">
              <span className="icon-preview">{formData.ikona}</span>
              <input
                type="text"
                className="modal-input"
                value={formData.ikona}
                onChange={(e) => handleInputChange('ikona', e.target.value)}
                placeholder="📁"
                maxLength={2}
                style={{ paddingLeft: '50px' }}
              />
            </div>
            
            {/* Prednastavené ikony */}
            <div className="icon-presets">
              {predefinedIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-preset ${formData.ikona === icon ? 'selected' : ''}`}
                  onClick={() => handleInputChange('ikona', icon)}
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Náhľad kategórie */}
        <div className="modal-field">
          <label className="modal-label">Náhľad</label>
          <div className="category-preview" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#f9fafb'
          }}>
            <span style={{ fontSize: '18px' }}>{formData.ikona}</span>
            <div>
              <div style={{ fontWeight: '500', color: formData.farba }}>
                {formData.nazov || 'Názov kategórie'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                /{formData.slug || 'slug'}
              </div>
            </div>
          </div>
        </div>

        {/* Akčné tlačidlá */}
        <div className="modal-actions" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Zrušiť
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#3b82f6',
              color: 'white',
              fontSize: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Ukladám...' : 'Vytvoriť kategóriu'}
          </button>
        </div>
      </div>

      {/* CSS štýly pre modal */}
      <style>{`
        .color-input-container {
          position: relative;
        }
        
        .color-input {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .icon-input-container {
          position: relative;
        }
        
        .icon-preview {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          z-index: 1;
        }
        
        .color-presets {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        
        .color-preset {
          width: 28px;
          height: 28px;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .color-preset:hover {
          transform: scale(1.1);
        }
        
        .color-preset.selected {
          border-color: #374151;
          transform: scale(1.1);
        }
        
        .icon-presets {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 6px;
          margin-top: 8px;
        }
        
        .icon-preset {
          width: 32px;
          height: 32px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
        }
        
        .icon-preset:hover {
          border-color: #3b82f6;
          background: #f0f9ff;
        }
        
        .icon-preset.selected {
          border-color: #3b82f6;
          background: #3b82f6;
          color: white;
        }
        
        .form-row {
          display: flex;
          gap: 16px;
        }
        
        .form-row .modal-field {
          flex: 1;
        }
      `}</style>
    </Modal>
  );
};

export default AddCategoryModal;