// frontend/src/components/NewPageManagement.tsx
// Stránka pre vytvorenie/úpravu stránky - unifikovaný komponent pre oba módy

import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import RichTextEditor from './RichTextEditor';

// Import CSS štýlov
import '../styles/components/managementPages.css';
import '../styles/pages/NewArticleManagement.css';

// ===== INTERFACE DEFINITIONS =====
interface PageFormData {
  nazov: string;
  slug: string;
  obsah: string;
  v_menu: boolean;
  poradie_menu?: number;
  publikovany: boolean;
  meta_title?: string;
  meta_description?: string;
}

interface Page {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
  v_menu: boolean;
  poradie_menu: number;
  publikovany: boolean;
  meta_title?: string;
  meta_description?: string;
  vytvoreny: string;
  aktualizovany: string;
}

interface NewPageManagementProps {
  pageId?: string; // Pre editáciu - ak je undefined, vytvára nová stránka
}

// ===== MAIN COMPONENT =====
const NewPageManagement: React.FC<NewPageManagementProps> = ({ pageId }) => {
  // ===== ROUTING =====
  const { navigate } = useRouter();
  
  // ===== STATE MANAGEMENT =====
  const [formData, setFormData] = useState<PageFormData>({
    nazov: '',
    slug: '',
    obsah: '',
    v_menu: false,
    poradie_menu: undefined,
    publikovany: false,
    meta_title: '',
    meta_description: ''
  });

  const [originalPage, setOriginalPage] = useState<Page | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  // Určenie módu: edit alebo create
  const isEditMode = !!pageId;

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    if (isEditMode && pageId) {
      console.log('🚀 NewPageManagement načítaný v edit móde, načítavam stránku...', pageId);
      loadPage(pageId);
    } else {
      console.log('🚀 NewPageManagement načítaný v create móde');
      setLoading(false);
    }
  }, [pageId]);

  // ===== API FUNCTIONS =====
  
  // Helper funkcia pre auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('clubw_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // Načítanie stránky pre editáciu
  const loadPage = async (id: string) => {
    try {
      setLoading(true);
      setErrors({}); // Vyčistenie chýb
      
      const response = await fetch(`http://localhost:3000/api/admin/pages/${id}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Stránka nebola nájdená');
        } else if (response.status === 403) {
          throw new Error('Nemáte oprávnenie na úpravu tejto stránky');
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const page = data.data.page;
        setOriginalPage(page);
        
        // Naplnenie formulára údajmi
        setFormData({
          nazov: page.nazov,
          slug: page.slug,
          obsah: page.obsah,
          v_menu: page.v_menu,
          poradie_menu: page.poradie_menu || undefined,
          publikovany: page.publikovany,
          meta_title: page.meta_title || '',
          meta_description: page.meta_description || ''
        });

        setSlugEdited(true); // V edit móde považujeme slug za editovaný

        console.log('✅ Stránka načítaná pre editáciu:', page.nazov);
      } else {
        throw new Error(data.message || 'Nepodarilo sa načítať stránku');
      }
    } catch (err) {
      console.error('Chyba pri načítavaní stránky:', err);
      const errorMessage = err instanceof Error ? err.message : 'Neznáma chyba pri načítavaní stránky';
      alert('Chyba pri načítavaní stránky: ' + errorMessage);
      navigate('/pages'); // Návrat na zoznam
    } finally {
      setLoading(false);
    }
  };

  // ===== HELPER FUNCTIONS =====

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

  // Validácia formulára
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Povinné polia
    if (!formData.nazov.trim()) {
      newErrors.nazov = 'Názov je povinný';
    } else if (formData.nazov.trim().length < 3) {
      newErrors.nazov = 'Názov musí mať aspoň 3 znaky';
    } else if (formData.nazov.trim().length > 200) {
      newErrors.nazov = 'Názov môže mať maximálne 200 znakov';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug je povinný';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug môže obsahovať len malé písmená, číslice a pomlčky';
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Slug musí mať aspoň 3 znaky';
    } else if (formData.slug.length > 100) {
      newErrors.slug = 'Slug môže mať maximálne 100 znakov';
    }

    if (!formData.obsah.trim()) {
      newErrors.obsah = 'Obsah je povinný';
    } else if (formData.obsah.trim().length < 10) {
      newErrors.obsah = 'Obsah musí mať aspoň 10 znakov';
    }

    // Validácia poradia v menu
    if (formData.v_menu && formData.poradie_menu !== undefined) {
      if (formData.poradie_menu < 1) {
        newErrors.poradie_menu = 'Poradie v menu musí byť kladné číslo';
      } else if (formData.poradie_menu > 1000) {
        newErrors.poradie_menu = 'Poradie v menu môže byť maximálne 1000';
      }
    }

    // Validácia meta údajov
    if (formData.meta_title && formData.meta_title.length > 60) {
      newErrors.meta_title = 'Meta title môže mať maximálne 60 znakov';
    }

    if (formData.meta_description && formData.meta_description.length > 160) {
      newErrors.meta_description = 'Meta description môže mať maximálne 160 znakov';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Kontrola či boli vykonané zmeny (len v edit móde)
  const hasChanges = (): boolean => {
    if (!isEditMode || !originalPage) return true;
    
    return (
      formData.nazov !== originalPage.nazov ||
      formData.slug !== originalPage.slug ||
      formData.obsah !== originalPage.obsah ||
      formData.v_menu !== originalPage.v_menu ||
      formData.poradie_menu !== (originalPage.poradie_menu || undefined) ||
      formData.publikovany !== originalPage.publikovany ||
      formData.meta_title !== (originalPage.meta_title || '') ||
      formData.meta_description !== (originalPage.meta_description || '')
    );
  };

  // ===== EVENT HANDLERS =====

  // Generická zmena input hodnôt
  const handleInputChange = (field: keyof PageFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Automatické generovanie slug z názvu (len ak nebol editovaný manuálne)
    if (field === 'nazov' && !slugEdited && !isEditMode) {
      const newSlug = generateSlug(value);
      setFormData(prev => ({
        ...prev,
        slug: newSlug
      }));
    }

    // Vymazanie chyby pre toto pole
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Manuálna úprava slug
  const handleSlugChange = (value: string) => {
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugEdited(true);
    handleInputChange('slug', cleanSlug);
  };

  // Zmena obsahu z RichTextEditor
  const handleContentChange = (content: string) => {
    handleInputChange('obsah', content);
  };

  // Zmena checkbox pre menu
  const handleMenuChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      v_menu: checked,
      // Ak sa vypne menu, vymaž poradie
      poradie_menu: checked ? prev.poradie_menu : undefined
    }));

    // Vyčistenie chyby pre poradie menu
    if (errors.poradie_menu) {
      setErrors(prev => ({
        ...prev,
        poradie_menu: ''
      }));
    }
  };

  // Submit formulára
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log('❌ Validácia formulára zlyhala');
      // Scroll na prvú chybu
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditMode 
        ? `http://localhost:3000/api/admin/pages/${pageId}`
        : 'http://localhost:3000/api/admin/pages';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Stránka s týmto slug už existuje');
        } else if (response.status === 403) {
          throw new Error('Nemáte oprávnenie na túto operáciu');
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Stránka ${isEditMode ? 'aktualizovaná' : 'vytvorená'}`);
        
        // Zobrazenie success notifikácie
        const message = isEditMode 
          ? `Stránka "${formData.nazov}" bola úspešne aktualizovaná`
          : `Stránka "${formData.nazov}" bola úspešne vytvorená`;
        
        // Môžete pridať toast notifikáciu tu
        console.log('✅', message);
        
        navigate('/pages');
      } else {
        // Spracovanie chýb z backendu
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages: Record<string, string> = {};
          data.errors.forEach((error: any) => {
            if (error.path) {
              errorMessages[error.path] = error.msg || error.message;
            }
          });
          setErrors(errorMessages);
        } else {
          throw new Error(data.message || `Chyba pri ${isEditMode ? 'aktualizácii' : 'vytváraní'} stránky`);
        }
      }
    } catch (err) {
      console.error(`Chyba pri ${isEditMode ? 'aktualizácii' : 'vytváraní'} stránky:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Neznáma chyba';
      alert(`Chyba pri ${isEditMode ? 'aktualizácii' : 'vytváraní'} stránky: ` + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Návrat na zoznam s kontrolou zmien
  const handleBack = () => {
    if (isEditMode && hasChanges()) {
      if (window.confirm('Máte neuložené zmeny. Naozaj chcete odísť? Zmeny sa stratia.')) {
        navigate('/pages');
      }
    } else if (!isEditMode && (formData.nazov || formData.obsah)) {
      if (window.confirm('Máte rozpracovanú stránku. Naozaj chcete odísť? Práca sa stratí.')) {
        navigate('/pages');
      }
    } else {
      navigate('/pages');
    }
  };

  // Reset formulára (len v create móde)
  const handleReset = () => {
    if (window.confirm('Naozaj chcete vymazať všetky údaje?')) {
      setFormData({
        nazov: '',
        slug: '',
        obsah: '',
        v_menu: false,
        poradie_menu: undefined,
        publikovany: false,
        meta_title: '',
        meta_description: ''
      });
      setErrors({});
      setSlugEdited(false);
    }
  };

  // ===== RENDER HELPERS =====

  // Render back button
  const renderBackButton = () => (
    <button 
      type="button" 
      className="back-button"
      onClick={handleBack}
      title="Späť na zoznam stránok"
      disabled={isSubmitting}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );

  // Render save button
  const renderSaveButton = () => (
    <button
      type="submit"
      className="btn-primary"
      disabled={isSubmitting || (isEditMode && !hasChanges())}
    >
      {isSubmitting ? (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="37.7" strokeDashoffset="37.7">
              <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1s" from="0 8 8" to="360 8 8" repeatCount="indefinite"/>
            </circle>
          </svg>
          {isEditMode ? 'Aktualizujem...' : 'Vytváram...'}
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12.5 2H3.5C2.94772 2 2.5 2.44772 2.5 3V13C2.5 13.5523 2.94772 14 3.5 14H12.5C13.0523 14 13.5 13.5523 13.5 13V5L10.5 2Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 2V5H13.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6.5 8L7.5 9L9.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isEditMode ? 'Aktualizovať stránku' : 'Vytvoriť stránku'}
        </>
      )}
    </button>
  );

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="management-loading">
        <div className="loading-spinner">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="100">
              <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1.5s" from="0 20 20" to="360 20 20" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        📄 Načítavam stránku...
      </div>
    );
  }

  return (
    <div className="management-page">
      {/* ===== HEADER SEKCIA ===== */}
      <div className="management-header">
        <div className="management-header-main">
          {renderBackButton()}
          <div className="management-title-section">
            <h1 className="management-title">
              {isEditMode ? (
                <>
                  Úprava stránky
                  {originalPage && (
                    <span className="title-subtitle">: {originalPage.nazov}</span>
                  )}
                </>
              ) : (
                'Vytvorenie novej stránky'
              )}
            </h1>
          </div>
          {/* Status indikátor pre edit mód */}
          {isEditMode && originalPage && (
            <div className="page-status-indicators">
              <span className={`status-badge ${originalPage.publikovany ? 'published' : 'draft'}`}>
                {originalPage.publikovany ? '✅ Publikované' : '📝 Koncept'}
              </span>
              {originalPage.v_menu && (
                <span className="status-badge menu">📍 V menu</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== FORMULÁR ===== */}
      <form onSubmit={handleSubmit} className="new-article-form">
        {/* Základné informácie */}
        <div className="form-section">
          <h3 className="form-section-title">Základné informácie</h3>
          
          <div className="form-row">
            <div className="modal-field flex-2">
              <label className="modal-label">
                Názov stránky *
              </label>
              <input
                type="text"
                name="nazov"
                className={`modal-input ${errors.nazov ? 'error' : ''}`}
                value={formData.nazov}
                onChange={(e) => handleInputChange('nazov', e.target.value)}
                placeholder="Zadajte názov stránky..."
                disabled={isSubmitting}
                maxLength={200}
              />
              {errors.nazov && (
                <span className="modal-error">{errors.nazov}</span>
              )}
              <small className="field-hint">
                {formData.nazov.length}/200 znakov
              </small>
            </div>

            <div className="modal-field flex-1">
              <label className="modal-label">
                URL Slug *
              </label>
              <input
                type="text"
                name="slug"
                className={`modal-input ${errors.slug ? 'error' : ''}`}
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="url-stranky"
                disabled={isSubmitting}
                maxLength={100}
              />
              <small className="field-hint">
                {slugEdited ? 'Slug upravený manuálne' : 'Automaticky generovaný z názvu'} ({formData.slug.length}/100)
              </small>
              {errors.slug && (
                <span className="modal-error">{errors.slug}</span>
              )}
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">
              Obsah stránky *
            </label>
            <div className={`rich-editor-container ${errors.obsah ? 'error' : ''}`}>
              <RichTextEditor
                value={formData.obsah}
                onChange={handleContentChange}
                placeholder="Napíšte obsah vašej stránky..."
                height={500}
              />
            </div>
            {errors.obsah && (
              <span className="modal-error">{errors.obsah}</span>
            )}
            <small className="field-hint">
              Približne {Math.round(formData.obsah.replace(/<[^>]*>/g, '').length / 5)} slov
            </small>
          </div>
        </div>

        {/* Nastavenia */}
        <div className="form-section">
          <h3 className="form-section-title">Nastavenia publikovania</h3>
          
          <div className="form-checkboxes">
            <label className="modal-checkbox">
              <input
                type="checkbox"
                checked={formData.publikovany}
                onChange={(e) => handleInputChange('publikovany', e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="checkbox-custom"></span>
              <div className="checkbox-text">
                <span>Publikovaná stránka</span>
                <small>Stránka bude viditeľná pre návštevníkov webu</small>
              </div>
            </label>

            <label className="modal-checkbox">
              <input
                type="checkbox"
                checked={formData.v_menu}
                onChange={(e) => handleMenuChange(e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="checkbox-custom"></span>
              <div className="checkbox-text">
                <span>Zobraziť v hlavnom menu</span>
                <small>Stránka sa zobrazí v navigácii webu</small>
              </div>
            </label>
          </div>

          {formData.v_menu && (
            <div className="modal-field">
              <label className="modal-label">
                Poradie v menu
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                className={`modal-input ${errors.poradie_menu ? 'error' : ''}`}
                value={formData.poradie_menu || ''}
                onChange={(e) => handleInputChange('poradie_menu', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1"
                disabled={isSubmitting}
              />
              <small className="field-hint">
                Nižšie číslo = vyššie v menu (1-1000)
              </small>
              {errors.poradie_menu && (
                <span className="modal-error">{errors.poradie_menu}</span>
              )}
            </div>
          )}
        </div>

        {/* SEO */}
        <div className="form-section">
          <h3 className="form-section-title">SEO nastavenia</h3>
          
          <div className="modal-field">
            <label className="modal-label">
              Meta title
            </label>
            <input
              type="text"
              className={`modal-input ${errors.meta_title ? 'error' : ''}`}
              value={formData.meta_title || ''}
              onChange={(e) => handleInputChange('meta_title', e.target.value)}
              placeholder="SEO optimalizovaný názov stránky"
              disabled={isSubmitting}
              maxLength={60}
            />
            <small className="field-hint">
              Odporúčaná dĺžka: 50-60 znakov ({(formData.meta_title || '').length}/60)
            </small>
            {errors.meta_title && (
              <span className="modal-error">{errors.meta_title}</span>
            )}
          </div>

          <div className="modal-field">
            <label className="modal-label">
              Meta description
            </label>
            <textarea
              className={`modal-textarea ${errors.meta_description ? 'error' : ''}`}
              value={formData.meta_description || ''}
              onChange={(e) => handleInputChange('meta_description', e.target.value)}
              placeholder="Krátky popis stránky pre vyhľadávače"
              rows={3}
              disabled={isSubmitting}
              maxLength={160}
            />
            <small className="field-hint">
              Odporúčaná dĺžka: 150-160 znakov ({(formData.meta_description || '').length}/160)
            </small>
            {errors.meta_description && (
              <span className="modal-error">{errors.meta_description}</span>
            )}
          </div>
        </div>

        {/* Akčné tlačidlá */}
        <div className="form-actions">
          <div className="form-actions-left">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Zrušiť
            </button>
            
            {!isEditMode && (
              <button
                type="button"
                className="btn-tertiary"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1.5 8A6.5 6.5 0 1 1 8 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M4 6L1.5 8L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Resetovať
              </button>
            )}
          </div>
          
          <div className="form-actions-right">
            {renderSaveButton()}
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewPageManagement;