// frontend/src/components/ui/table/EditCategoryModal.tsx
// Modal komponent pre editáciu kategórií

import React, { useState, useEffect } from 'react';
import Modal from './Modal';

export interface CategoryFormData {
  nazov: string;
  slug: string;
  popis: string;
  farba: string;
  ikona: string;
  aktivity: boolean;
}

export interface Category {
  id: number;
  nazov: string;
  slug: string;
  popis?: string;
  farba?: string;
  ikona?: string;
  poradie: number;
  aktivity: boolean;
  pocet_clankov?: number;
  vytvoreny: string;
  aktualizovany: string;
}

export interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: CategoryFormData) => void;
  category: Category | null; // Kategória na editáciu
  loading?: boolean;
}

const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  category,
  loading = false
}) => {
  const [formData, setFormData] = useState<CategoryFormData>({
    nazov: '',
    slug: '',
    popis: '',
    farba: '#3b82f6',
    ikona: '📁',
    aktivity: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false); // Sleduje, či user upravil slug manuálne

  // Prednastavené farby a ikony
  const predefinedColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
  ];

  const predefinedIcons = [
    '📁', '⚽', '🏆', '📰', '🎤', '👶', '📊', '📅', 
    '⭐', '🔥', '💪', '🎯', '📈', '🏟️', '👥', '📝'
  ];

  // Načítanie údajov kategórie pri otvorení modalu
  useEffect(() => {
    if (isOpen && category) {
      setFormData({
        nazov: category.nazov,
        slug: category.slug,
        popis: category.popis || '',
        farba: category.farba || '#3b82f6',
        ikona: category.ikona || '📁',
        aktivity: category.aktivity
      });
      setSlugEdited(false); // Reset slug edit flag
      setErrors({}); // Vyčistenie chýb
    }
  }, [isOpen, category]);

  // Generovanie slug z názvu
  const generateSlug = (nazov: string): string => {
    return nazov
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Handle input changes
  const handleInputChange = (field: keyof CategoryFormData, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Automatické generovanie slug len ak user neupravoval slug manuálne
      if (field === 'nazov' && !slugEdited) {
        updated.slug = generateSlug(value as string);
      }
      
      return updated;
    });

    // Vyčistenie chyby pre dané pole
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle manual slug edit
  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    handleInputChange('slug', value);
  };

  // Validácia formulára
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nazov.trim()) {
      newErrors.nazov = 'Názov kategórie je povinný';
    } else if (formData.nazov.length < 2) {
      newErrors.nazov = 'Názov musí mať aspoň 2 znaky';
    } else if (formData.nazov.length > 50) {
      newErrors.nazov = 'Názov môže mať maximálne 50 znakov';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug je povinný';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug môže obsahovať len malé písmená, číslice a pomlčky';
    }
    
    if (formData.popis.length > 200) {
      newErrors.popis = 'Popis môže mať maximálne 200 znakov';
    }
    
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
      const categoryData = {
        nazov: formData.nazov.trim(),
        slug: formData.slug.trim(),
        popis: formData.popis.trim() || '',
        farba: formData.farba,
        ikona: formData.ikona,
        aktivity: formData.aktivity
      };
      
      await onSave(categoryData);
      handleClose();
    } catch (error) {
      console.error('Chyba pri editácii kategórie:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setErrors({});
    setIsSubmitting(false);
    setSlugEdited(false);
    onClose();
  };

  // Ak nie je kategória dostupná, nezobrazuj modal
  if (!category) {
    return null;
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Upraviť kategóriu"
      className="edit-category-modal"
    >
      <div className="edit-category-form">
        
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
            onChange={(e) => handleSlugChange(e.target.value.toLowerCase())}
            placeholder="automaticky-generovany-slug"
          />
          {errors.slug && (
            <span className="modal-error">{errors.slug}</span>
          )}
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            {slugEdited ? 'Slug upravený manuálne' : 'Automaticky generovaný z názvu'}
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

        {/* Status checkbox */}
        <div className="modal-field">
          <label className="modal-checkbox">
            <input
              type="checkbox"
              checked={formData.aktivity}
              onChange={(e) => handleInputChange('aktivity', e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            Kategória je aktívna
          </label>
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            Neaktívne kategórie sa nezobrazujú na webe
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
            background: formData.aktivity ? '#f0f9ff' : '#f9fafb',
            opacity: formData.aktivity ? 1 : 0.6
          }}>
            <span style={{ fontSize: '18px' }}>{formData.ikona}</span>
            <div>
              <div style={{ fontWeight: '500', color: formData.farba }}>
                {formData.nazov || 'Názov kategórie'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                /{formData.slug || 'slug'} {!formData.aktivity && '(neaktívna)'}
              </div>
            </div>
          </div>
        </div>

        {/* Akčné tlačidlá */}
        <div className="modal-actions">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="btn-secondary"
          >
            Zrušiť
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || loading}
            className="btn-primary"
          >
            {isSubmitting ? 'Ukladám...' : 'Uložiť zmeny'}
          </button>
        </div>
      </div>

      {/* Zdieľané CSS štýly z AddCategoryModal */}
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

        .modal-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .checkbox-custom {
          width: 16px;
          height: 16px;
          border: 1px solid #d1d5db;
          border-radius: 3px;
          position: relative;
        }

        .modal-checkbox input[type="checkbox"] {
          display: none;
        }

        .modal-checkbox input[type="checkbox"]:checked + .checkbox-custom {
          background: #3b82f6;
          border-color: #3b82f6;
        }

        .modal-checkbox input[type="checkbox"]:checked + .checkbox-custom::after {
          content: '✓';
          position: absolute;
          top: -1px;
          left: 2px;
          color: white;
          font-size: 12px;
        }
      `}</style>
    </Modal>
  );
};

export default EditCategoryModal;