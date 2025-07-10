// frontend/src/components/NewArticleManagement.tsx
// Stránka pre vytvorenie nového článku - plný layout v štýle ArticleManagement

import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import RichTextEditor from './RichTextEditor';

// Import CSS štýlov
import '../styles/components/managementPages.css';

// ===== INTERFACE DEFINITIONS =====
interface ArticleFormData {
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

interface Category {
  id: number;
  nazov: string;
  slug: string;
  farba?: string;
  ikona?: string;
}

// ===== MAIN COMPONENT =====
const NewArticleManagement: React.FC = () => {
  // ===== ROUTING =====
  const { navigate } = useRouter();
  // ===== STATE MANAGEMENT =====
  const [formData, setFormData] = useState<ArticleFormData>({
    nazov: '',
    slug: '',
    kategoria_id: 0,
    status: 'published', // ZMENENÉ: defaultne publikovaný
    excerpt: '',
    obsah: '',
    publikovany_datum: '',
    featured: false,
    komentare_povolene: true,
    tags: '',
    meta_title: '',
    meta_description: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    console.log('🚀 NewArticleManagement načítaný, načítavam kategórie...');
    loadCategories();
  }, []);

  // ===== API FUNCTIONS =====
  
  // Načítanie kategórií
  const loadCategories = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📂 Načítané kategórie:', data);
        // Backend vracia data.categories
        setCategories(data.data?.categories || []);
      } else {
        console.error('Chyba pri načítavaní kategórií:', response.status);
        // Fallback pre testovanie
        setCategories([
          { id: 1, nazov: 'Aktuality', slug: 'aktuality' },
          { id: 2, nazov: 'Zápasy', slug: 'zapasy' },
          { id: 3, nazov: 'Tréningy', slug: 'treningy' }
        ]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback pre testovanie
      setCategories([
        { id: 1, nazov: 'Aktuality', slug: 'aktuality' },
        { id: 2, nazov: 'Zápasy', slug: 'zapasy' },
        { id: 3, nazov: 'Tréningy', slug: 'treningy' }
      ]);
    } finally {
      setLoading(false);
    }
  };

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

  // Form validation - OPRAVENÉ podľa backend validácie
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    console.log('🔍 Validujem formulár:', formData);
    
    // Názov: 5-200 znakov (podľa backend validácie)
    if (!formData.nazov.trim()) {
      newErrors.nazov = 'Názov článku je povinný';
    } else if (formData.nazov.trim().length < 5) {
      newErrors.nazov = 'Názov musí mať aspoň 5 znakov';
    } else if (formData.nazov.trim().length > 200) {
      newErrors.nazov = 'Názov môže mať maximálne 200 znakov';
    }
    
    // Kategória: povinná
    if (!formData.kategoria_id || formData.kategoria_id === 0) {
      newErrors.kategoria_id = 'Kategória je povinná';
    }
    
    // Obsah: 10-50000 znakov (podľa backend validácie)
    if (!formData.obsah.trim()) {
      newErrors.obsah = 'Obsah článku je povinný';
    } else if (formData.obsah.trim().length < 10) {
      newErrors.obsah = 'Obsah musí mať aspoň 10 znakov';
    } else if (formData.obsah.length > 50000) {
      newErrors.obsah = 'Obsah môže mať maximálne 50 000 znakov';
    }
    
    // Excerpt: max 500 znakov (voliteľný)
    if (formData.excerpt && formData.excerpt.length > 500) {
      newErrors.excerpt = 'Krátky popis môže mať maximálne 500 znakov';
    }
    
    // Meta title: max 70 znakov (voliteľný)
    if (formData.meta_title && formData.meta_title.length > 70) {
      newErrors.meta_title = 'Meta title môže mať maximálne 70 znakov';
    }
    
    // Meta description: max 160 znakov (voliteľný)
    if (formData.meta_description && formData.meta_description.length > 160) {
      newErrors.meta_description = 'Meta description môže mať maximálne 160 znakov';
    }
    
    // Kontrola publikovacieho dátumu pre naplánované články
    if (formData.status === 'scheduled' && !formData.publikovany_datum) {
      newErrors.publikovany_datum = 'Dátum publikovania je povinný pre naplánované články';
    }
    
    console.log('❌ Chyby validácie:', newErrors);
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
      // Príprava dát pre backend - OPRAVENÉ tags handling
      const articleData = {
        nazov: formData.nazov.trim(),
        slug: formData.slug.trim() || undefined, // Nech backend vygeneruje ak je prázdny
        obsah: formData.obsah,
        excerpt: formData.excerpt?.trim() || undefined,
        kategoria_id: Number(formData.kategoria_id),
        status: formData.status,
        publikovany_datum: formData.publikovany_datum || undefined,
        featured: Boolean(formData.featured),
        komentare_povolene: Boolean(formData.komentare_povolene),
        meta_title: formData.meta_title?.trim() || undefined,
        meta_description: formData.meta_description?.trim() || undefined,
        // OPRAVENÉ: tags ako array
        tags: formData.tags 
          ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          : []
      };
      
      console.log('📤 Odosielam článok:', articleData);
      
      const response = await fetch('http://localhost:3000/api/admin/articles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(articleData)
      });
      
      const data = await response.json();
      console.log('📥 Response z backendu:', data);
      
      if (response.ok && data.success) {
        alert(`Článok "${formData.nazov}" bol úspešne ${formData.status === 'published' ? 'publikovaný' : 'uložený ako koncept'}!`);
        
        // Reset formulára
        setFormData({
          nazov: '',
          slug: '',
          kategoria_id: 0,
          status: 'published', // ZMENENÉ: defaultne publikovaný
          excerpt: '',
          obsah: '',
          publikovany_datum: '',
          featured: false,
          komentare_povolene: true,
          tags: '',
          meta_title: '',
          meta_description: ''
        });
        
        // Úspešné uloženie - navigácia späť na zoznam článkov
        navigate('/articles');
        
      } else {
        // Lepšie error handling
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => `${err.path}: ${err.msg}`).join('\n');
          alert(`Chyby validácie:\n${errorMessages}`);
        } else {
          const errorMsg = data.message || 'Neznáma chyba';
          alert(`Chyba pri ukladaní článku: ${errorMsg}`);
        }
        console.error('Backend error:', data);
      }
      
    } catch (err) {
      console.error('Error adding article:', err);
      alert('Chyba pripojenia k serveru. Skúste to znovu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (window.confirm('Naozaj chcete zrušiť vytvorenie článku? Všetky zmeny budú stratené.')) {
      navigate('/articles');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/articles');
  };

  // DEBUG: Test fill form
  const handleTestFill = () => {
    setFormData({
      nazov: 'Test článok ' + new Date().getTime(),
      slug: 'test-clanok-' + new Date().getTime(),
      kategoria_id: categories.length > 0 ? categories[0].id : 1,
      status: 'published', // ZMENENÉ: defaultne publikovaný
      excerpt: 'Toto je testovací excerpt pre článok.',
      obsah: '<p>Toto je testovací obsah článku. Lorem ipsum dolor sit amet.</p>',
      publikovany_datum: '',
      featured: false,
      komentare_povolene: true,
      tags: 'test, článok, demo',
      meta_title: 'Test článok - SEO title',
      meta_description: 'Toto je meta description pre test článok.'
    });
  };

  // ===== RENDER HELPERS =====
  
  // Render kategórie select
  const renderCategorySelect = () => (
    <div className="modal-field">
      <label className="modal-label">
        Rubrika *
      </label>
      <select
        className={`modal-select ${errors.kategoria_id ? 'error' : ''}`}
        value={formData.kategoria_id}
        onChange={(e) => handleInputChange('kategoria_id', parseInt(e.target.value))}
      >
        <option value={0}>Vyberte rubriku</option>
        {categories.map(category => (
          <option key={category.id} value={category.id}>
            {category.nazov}
          </option>
        ))}
      </select>
      {errors.kategoria_id && (
        <span className="modal-error">{errors.kategoria_id}</span>
      )}
    </div>
  );

  // Render status select
  const renderStatusSelect = () => (
    <div className="modal-field">
      <label className="modal-label">
        Status
      </label>
      <select
        className="modal-select"
        value={formData.status}
        onChange={(e) => handleInputChange('status', e.target.value as 'draft' | 'published' | 'scheduled' | 'archived')}
      >
        <option value="published">Publikovaný</option>
        <option value="draft">Koncept</option>
        <option value="scheduled">Naplánovaný</option>
        <option value="archived">Archivovaný</option>
      </select>
    </div>
  );

  // ===== ICONS =====
  const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ArticleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V8L14 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M14 2V8H19" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="management-loading">
        📰 Načítavam formulár...
      </div>
    );
  }

  return (
    <div className="management-page">
      {/* ===== HEADER SEKCIA ===== */}
      <div className="management-header">
        <div className="management-header-main">
          <button 
            className="back-button"
            onClick={handleBack}
            title="Späť na zoznam článkov"
          >
            <BackIcon />
          </button>
          <div className="management-title-section">
            <h1 className="management-title">
              <ArticleIcon />
              Nový článok
            </h1>
            <p className="management-subtitle">
              Vytvorte nový článok pre váš klub
            </p>
          </div>
          {/* DEBUG: Test button */}
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={handleTestFill}
              style={{
                padding: '8px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🧪 Test vyplniť
            </button>
          )}
        </div>
      </div>

      {/* ===== FORMULÁR ===== */}
      <div className="management-content">
        <div className="new-article-form">
          
          {/* Základné informácie */}
          <div className="form-section">
            <h3 className="form-section-title">Základné informácie</h3>
            
            <div className="form-row">
              <div className="modal-field flex-2">
                <input
                  type="text"
                  className={`modal-input ${errors.nazov ? 'error' : ''}`}
                  value={formData.nazov}
                  onChange={(e) => handleInputChange('nazov', e.target.value)}
                  placeholder="Zadajte názov článku"
                />
                {errors.nazov && (
                  <span className="modal-error">{errors.nazov}</span>
                )}
              </div>
              
              <div className="modal-field flex-1">
                <input
                  type="text"
                  className="modal-input"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="url-slug"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="flex-1">
                {renderCategorySelect()}
              </div>
              
              <div className="flex-1">
                {renderStatusSelect()}
              </div>
              
              {formData.status === 'scheduled' && (
                <div className="modal-field flex-1">
                  <label className="modal-label">
                    Dátum publikovania *
                  </label>
                  <input
                    type="datetime-local"
                    className={`modal-input ${errors.publikovany_datum ? 'error' : ''}`}
                    value={formData.publikovany_datum}
                    onChange={(e) => handleInputChange('publikovany_datum', e.target.value)}
                  />
                  {errors.publikovany_datum && (
                    <span className="modal-error">{errors.publikovany_datum}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Obsah článku */}
          <div className="form-section">
            <h3 className="form-section-title">Obsah článku</h3>
            
            <div className="modal-field">
              <label className="modal-label">
                Krátky popis (excerpt)
              </label>
              <textarea
                className={`modal-textarea ${errors.excerpt ? 'error' : ''}`}
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                placeholder="Krátky popis článku pre náhľady..."
                rows={3}
              />
              {errors.excerpt && (
                <span className="modal-error">{errors.excerpt}</span>
              )}
            </div>

            <div className="modal-field">
              <label className="modal-label">
                Obsah článku *
              </label>
              <div className={`rich-editor-container ${errors.obsah ? 'error' : ''}`}>
                <RichTextEditor
                  value={formData.obsah}
                  onChange={handleContentChange}
                  placeholder="Napíšte obsah vašeho článku..."
                />
              </div>
              {errors.obsah && (
                <span className="modal-error">{errors.obsah}</span>
              )}
            </div>
          </div>

          {/* Nastavenia */}
          <div className="form-section">
            <h3 className="form-section-title">Nastavenia</h3>
            
            <div className="form-row">
              <div className="modal-field flex-1">
                <label className="modal-label">
                  Tagy (oddelené čiarkami)
                </label>
                <input
                  type="text"
                  className="modal-input"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="šport, futbal, tím"
                />
              </div>
            </div>

            <div className="form-checkboxes">
              <label className="modal-checkbox">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => handleInputChange('featured', e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                Označiť ako featured článok
              </label>

              <label className="modal-checkbox">
                <input
                  type="checkbox"
                  checked={formData.komentare_povolene}
                  onChange={(e) => handleInputChange('komentare_povolene', e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                Povoliť komentáre
              </label>
            </div>
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
                value={formData.meta_title}
                onChange={(e) => handleInputChange('meta_title', e.target.value)}
                placeholder="SEO title pre vyhľadávače"
              />
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
                value={formData.meta_description}
                onChange={(e) => handleInputChange('meta_description', e.target.value)}
                placeholder="SEO popis pre vyhľadávače"
                rows={3}
              />
              {errors.meta_description && (
                <span className="modal-error">{errors.meta_description}</span>
              )}
            </div>
          </div>

          {/* Akčné tlačidlá */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Zrušiť
            </button>
            
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={isSubmitting}
            >
            {isSubmitting ? 'Ukladám...' : formData.status === 'published' ? 'Publikovať článok' : formData.status === 'archived' ? 'Archivovať článok': formData.status === 'scheduled' ? 'Naplánovať článok' : 'Uložiť koncept'} 
                    
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewArticleManagement;