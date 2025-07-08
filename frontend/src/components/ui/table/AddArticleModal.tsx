// frontend/src/components/ui/table/AddArticleModal.tsx
// Modal pre pridanie nového článku - rozšírenie base Modal.tsx komponentu

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import RichTextEditor from '../../RichTextEditor';


// ===== INTERFACE DEFINITIONS =====
export interface ArticleFormData {
  nazov: string;
  slug: string;
  kategoria_id: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  excerpt: string;
  obsah: string;
  publikovany_datum?: string;
  featured: boolean;
  komentare_povolene: boolean;
  tags: string;
  meta_title?: string;
  meta_description?: string;
}

export interface Category {
  id: number;
  nazov: string;
  slug: string;
  farba?: string;
  ikona?: string;
}

export interface AddArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (articleData: ArticleFormData) => void;
  categories: Category[];
  loading?: boolean;
}

// ===== MAIN COMPONENT =====
const AddArticleModal: React.FC<AddArticleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  loading = false
}) => {
  // ===== STATE MANAGEMENT =====
  const [formData, setFormData] = useState<ArticleFormData>({
    nazov: '',
    slug: '',
    kategoria_id: 0,
    status: 'draft',
    excerpt: '',
    obsah: '',
    publikovany_datum: '',
    featured: false,
    komentare_povolene: true,
    tags: '',
    meta_title: '',
    meta_description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== UTILITY FUNCTIONS =====
  
  // Automatické generovanie slug z názvu
  const generateSlug = (nazov: string): string => {
    return nazov
      .toLowerCase()
      .trim()
      .replace(/[áäâà]/g, 'a')
      .replace(/[éëêè]/g, 'e')
      .replace(/[íïîì]/g, 'i')
      .replace(/[óöôò]/g, 'o')
      .replace(/[úüûù]/g, 'u')
      .replace(/[ýÿ]/g, 'y')
      .replace(/[č]/g, 'c')
      .replace(/[ď]/g, 'd')
      .replace(/[ľ]/g, 'l')
      .replace(/[ň]/g, 'n')
      .replace(/[ŕ]/g, 'r')
      .replace(/[š]/g, 's')
      .replace(/[ť]/g, 't')
      .replace(/[ž]/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // ===== EVENT HANDLERS =====
  
  // Handling input changes
  const handleInputChange = (field: keyof ArticleFormData, value: string | number | boolean) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Auto-generovanie slug pri zmene názvu
      if (field === 'nazov' && typeof value === 'string') {
        updated.slug = generateSlug(value);
      }
      
      return updated;
    });
    
    // Vymazanie erroru pre dané pole
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Handling rich text editor change
  const handleContentChange = (content: string) => {
    handleInputChange('obsah', content);
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Povinné polia
    if (!formData.nazov.trim()) {
      newErrors.nazov = 'Názov článku je povinný';
    }
    
    if (!formData.kategoria_id || formData.kategoria_id === 0) {
      newErrors.kategoria_id = 'Kategória je povinná';
    }
    
    if (!formData.obsah.trim()) {
      newErrors.obsah = 'Obsah článku je povinný';
    }
    
    // Kontrola publikovacieho dátumu pre naplánované články
    if (formData.status === 'scheduled' && !formData.publikovany_datum) {
      newErrors.publikovany_datum = 'Dátum publikovania je povinný pre naplánované články';
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
    await onSave(formData);
    handleClose();
  } catch (error) {
    console.error('Chyba pri ukladaní článku:', error);
  } finally {
    setIsSubmitting(false);
  }
};

  // Handle modal close and reset
  const handleClose = () => {
    // Reset formulára
    setFormData({
      nazov: '',
      slug: '',
      kategoria_id: 0,
      status: 'draft',
      excerpt: '',
      obsah: '',
      publikovany_datum: '',
      featured: false,
      komentare_povolene: true,
      tags: '',
      meta_title: '',
      meta_description: ''
    });
    
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  // ===== STATUS OPTIONS =====
  const statusOptions = [
    { value: 'published', label: 'Publikované', color: '#10b981' },
    { value: 'draft', label: 'Koncept', color: '#f59e0b' },
    { value: 'scheduled', label: 'Naplánované', color: '#8b5cf6' },
    { value: 'archived', label: 'Archivované', color: '#ef4444' }
  ];

  // ===== RENDER =====
  return (
    <Modal 
        isOpen={isOpen} 
        onClose={handleClose}
        title="Pridať nový článok"
        className="add-user-modal"  // Použije rovnaké štýly
    >
      <div className="add-user-form">

        {/* Riadok 1: Názov a Slug */}
        <div className="form-row">
            <div className="form-field">
            <input
                type="text"
                value={formData.nazov}
                onChange={(e) => handleInputChange('nazov', e.target.value)}
                className={`form-input ${errors.nazov ? 'error' : ''}`}
                placeholder="Názov článku *"
            />
            {errors.nazov && <span className="form-error">{errors.nazov}</span>}
            </div>
            
            <div className="form-field">
            <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className="form-input"
                placeholder="URL slug"
            />
            </div>
        </div>

        {/* Riadok 2: Kategória a Status */}
        <div className="form-row">
            <div className="form-field">
            <select
                value={formData.kategoria_id}
                onChange={(e) => handleInputChange('kategoria_id', parseInt(e.target.value))}
                className={`form-input ${errors.kategoria_id ? 'error' : ''}`}
                disabled={!Array.isArray(categories) || categories.length === 0}
            >
                <option value={0}>
                {!Array.isArray(categories) || categories.length === 0 
                    ? 'Načítavam kategórie...' 
                    : 'Vyberte kategóriu *'
                }
                </option>
                {Array.isArray(categories) && categories.map(category => (
                <option key={category.id} value={category.id}>
                    {category.nazov}
                </option>
                ))}
            </select>
            {errors.kategoria_id && <span className="form-error">{errors.kategoria_id}</span>}
            </div>

            <div className="form-field">
            <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="form-input"
            >
                {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
                ))}
            </select>
            </div>
        </div>

        {/* Krátky popis */}
        <textarea
            value={formData.excerpt}
            onChange={(e) => handleInputChange('excerpt', e.target.value)}
            className="form-input"
            placeholder="Krátky popis článku..."
            rows={4}
        />

        {/* Obsah článku */}
        <RichTextEditor
            value={formData.obsah}
            onChange={(content) => handleInputChange('obsah', content)}
            height={400}
            placeholder="Napíšte obsah článku..."
        />
        {errors.obsah && <span className="form-error">{errors.obsah}</span>}


        {/* Tags */}
        <div className="form-field">
            <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            className="form-input"
            placeholder="Tags (sport, futbal, zápas...)"
            />
        </div>

        {/* Checkboxy - v jednom riadku */}
        <div className="form-row">
        <div className="form-field">
            <div className="checkbox-wrapper">
            <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => handleInputChange('featured', e.target.checked)}
                className="form-checkbox"
            />
            <label htmlFor="featured" className="checkbox-label">
                Zvýrazniť článok
            </label>
            </div>
        </div>

        <div className="form-field">
            <div className="checkbox-wrapper">
            <input
                type="checkbox"
                id="komentare"
                checked={formData.komentare_povolene}
                onChange={(e) => handleInputChange('komentare_povolene', e.target.checked)}
                className="form-checkbox"
            />
            <label htmlFor="komentare" className="checkbox-label">
                Povoliť komentáre
            </label>
            </div>
        </div>
        </div>

        {/* Publikovací dátum - len pre scheduled */}
        {formData.status === 'scheduled' && (
            <div className="form-field">
            <label className="form-label">Dátum publikovania *</label>
            <div className="date-input-wrapper">
                <input
                type="datetime-local"
                value={formData.publikovany_datum}
                onChange={(e) => handleInputChange('publikovany_datum', e.target.value)}
                className={`form-input date-input ${errors.publikovany_datum ? 'error' : ''}`}
                />
            </div>
            {errors.publikovany_datum && <span className="form-error">{errors.publikovany_datum}</span>}
            </div>
        )}
        
        {/* Akcie - ZMEŇTE tlačidlá */}
        <div className="form-actions">
            <button 
            type="button" 
            onClick={handleClose}
            className="form-button cancel-button"
            disabled={isSubmitting}
            >
            Zrušiť
            </button>
            
            <div style={{ display: 'flex', gap: '8px' }}>
            <button 
                type="button" 
                onClick={() => {
                setFormData(prev => ({ ...prev, status: 'draft' }));
                handleSave();
                }}
                className="form-button cancel-button"
                disabled={isSubmitting || loading}
                style={{ background: '#f59e0b', color: 'white' }}
            >
                {isSubmitting ? 'Ukladám...' : 'Uložiť ako koncept'}
            </button>
            
            <button 
                type="button" 
                onClick={() => {
                setFormData(prev => ({ ...prev, status: 'published' }));
                handleSave();
                }}
                className="form-button save-button"
                disabled={isSubmitting || loading}
            >
                {isSubmitting ? 'Publikujem...' : 'Publikovať'}
            </button>
            </div>
        </div>
    </div>
    </Modal>
  );
};

export default AddArticleModal;