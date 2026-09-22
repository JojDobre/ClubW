// frontend/src/components/EditArticleManagement.tsx
// Stránka pre editáciu článku - plný layout v štýle NewArticleManagement

import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import RichTextEditor from './RichTextEditor';

// Import CSS štýlov
import '../styles/components/managementPages.css';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

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
  obrazok?: string;
}

interface Category {
  id: number;
  nazov: string;
  slug: string;
  farba?: string;
  ikona?: string;
}

interface Article {
  id: number;
  nazov: string;
  slug: string;
  kategoria_id: number;
  status: string;
  excerpt: string;
  obsah: string;
  publikovany_datum?: string;
  featured: boolean;
  komentare_povolene: boolean;
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  obrazok?: string;
  autor_id: number;
  vytvoreny: string;
  aktualizovany: string;
}

interface EditArticleManagementProps {
  articleId: string;
}

// ===== MAIN COMPONENT =====
const EditArticleManagement: React.FC<EditArticleManagementProps> = ({ articleId }) => {
  // ===== ROUTING =====
  const { navigate } = useRouter();
  
  // ===== STATE MANAGEMENT =====
  const [formData, setFormData] = useState<ArticleFormData>({
    nazov: '',
    slug: '',
    kategoria_id: 0,
    status: 'published',
    excerpt: '',
    obsah: '',
    publikovany_datum: '',
    featured: false,
    komentare_povolene: true,
    tags: '',
    meta_title: '',
    meta_description: '',
    obrazok: ''
  });

  const [originalArticle, setOriginalArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slugEdited, setSlugEdited] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    console.log('🚀 EditArticleManagement načítaný, načítavam článok a kategórie...');
    loadArticleAndCategories();
  }, [articleId]);

  // ===== API FUNCTIONS =====
  
  // Načítanie článku a kategórií
  const loadArticleAndCategories = async () => {
    try {
      setLoading(true);
      
      // Paralelné načítanie článku a kategórií
      const [articleResponse, categoriesResponse] = await Promise.all([
        fetch(apiUrl(`/admin/articles/${articleId}`), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(apiUrl('/admin/categories'), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!articleResponse.ok) {
        throw new Error('Článok sa nepodarilo načítať');
      }

      if (!categoriesResponse.ok) {
        throw new Error('Kategórie sa nepodarilo načítať');
      }

      const articleData = await articleResponse.json();
      const categoriesData = await categoriesResponse.json();

      if (articleData.success && articleData.data) {
        const article = articleData.data;
        setOriginalArticle(article);
        
        // Predvyplnenie formulára údajmi článku
        setFormData({
          nazov: article.nazov,
          slug: article.slug,
          kategoria_id: article.kategoria_id,
          status: article.status,
          excerpt: article.excerpt || '',
          obsah: article.obsah || '',
          publikovany_datum: article.publikovany_datum || '',
          featured: article.featured || false,
          komentare_povolene: article.komentare_povolene !== false,
          tags: Array.isArray(article.tags) ? article.tags.join(', ') : '',
          meta_title: article.meta_title || '',
          meta_description: article.meta_description || '',
          obrazok: article.obrazok || ''
        });

        // Nastavenie image preview ak existuje obrázok
        if (article.obrazok) {
          setImagePreview(article.obrazok);
        }
      }

      if (categoriesData.success) {
        setCategories(categoriesData.data || []);
      }

    } catch (error) {
      console.error('Chyba pri načítavaní článku:', error);
      alert('Chyba pri načítavaní článku');
      navigate('/articles');
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

  // Handle content change (Rich Text Editor)
  const handleContentChange = (content: string) => {
    handleInputChange('obsah', content);
  };

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Vytvorenie preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch(apiUrl('/admin/articles/upload-image'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data.imageUrl;
      } else {
        console.error('Chyba pri uploade obrázka:', data.message);
        return null;
      }
    } catch (error) {
      console.error('Chyba pri uploade obrázka:', error);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ===== FORM VALIDATION =====
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nazov.trim()) {
      newErrors.nazov = 'Názov článku je povinný';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug je povinný';
    }
    
    if (!formData.kategoria_id || formData.kategoria_id === 0) {
      newErrors.kategoria_id = 'Kategória je povinná';
    }
    
    if (!formData.excerpt.trim()) {
      newErrors.excerpt = 'Excerpt je povinný';
    }
    
    if (!formData.obsah.trim()) {
      newErrors.obsah = 'Obsah článku je povinný';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== FORM SUBMISSION =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload obrázka ak bol vybratý nový
      let imageUrl = formData.obrazok;
      if (selectedImage) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      
      // Príprava dát pre API
      const articleData = {
        nazov: formData.nazov.trim(),
        slug: formData.slug.trim(),
        kategoria_id: formData.kategoria_id,
        status: formData.status,
        excerpt: formData.excerpt.trim(),
        obsah: formData.obsah.trim(),
        publikovany_datum: formData.publikovany_datum || null,
        featured: formData.featured,
        komentare_povolene: formData.komentare_povolene,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        meta_title: formData.meta_title?.trim() || null,
        meta_description: formData.meta_description?.trim() || null,
        obrazok: imageUrl
      };
      
      console.log('Odosielam článok:', articleData);
      
      const response = await fetch(apiUrl(`/admin/articles/${articleId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(articleData)
      });
      
      const data = await response.json();
      console.log('Server response:', data);
      
      if (data.success) {
        alert(`Článok úspešne ${formData.status === 'published' ? 'aktualizovaný a publikovaný' : 'aktualizovaný'}!`);
        
        // Navigácia späť na zoznam článkov
        navigate('/articles');
        
      } else {
        // Lepšie error handling
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => `${err.path}: ${err.msg}`).join('\n');
          alert(`Chyby validácie:\n${errorMessages}`);
        } else {
          const errorMsg = data.message || 'Neznáma chyba';
          alert(`Chyba pri aktualizácii článku: ${errorMsg}`);
        }
        console.error('Backend error:', data);
      }
      
    } catch (err) {
      console.error('Error updating article:', err);
      alert('Chyba pripojenia k serveru. Skúste to znovu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (window.confirm('Naozaj chcete zrušiť editáciu článku? Všetky zmeny budú stratené.')) {
      navigate('/articles');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/articles');
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

  const SaveIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M19 21H5C4.44772 21 4 20.5523 4 20V4C4 3.44772 4.44772 3 5 3H16L20 7V20C20 20.5523 19.5523 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="management-container">
        <div className="management-header">
          <div className="management-header-main">
            <button onClick={handleBack} className="back-button">
              <BackIcon />
            </button>
            <div className="management-title-section">
              <h1 className="management-title">Načítavam článok...</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="management-container">
      
      {/* ===== HEADER SEKCIA ===== */}
      <div className="management-header">
        <div className="management-header-main">
          <button onClick={handleBack} className="back-button">
            <BackIcon />
          </button>
          <div className="management-title-section">
            <h1 className="management-title">
              ✏️ Upraviť článok
            </h1>
            <p className="management-subtitle">
              Editácia existujúceho článku pre web
            </p>
          </div>
        </div>
      </div>

      {/* ===== FORMULÁR ===== */}
      <div className="management-content">
        <form onSubmit={handleSubmit} className="new-article-form">
          
          {/* Základné informácie */}
          <div className="form-section">
            <h3 className="form-section-title">Základné informácie</h3>
            
            <div className="form-row">
              <div className="modal-field flex-2">
                <label className="modal-label">
                  Názov článku *
                </label>
                <input
                  type="text"
                  className={`modal-input ${errors.nazov ? 'error' : ''}`}
                  value={formData.nazov}
                  onChange={(e) => handleInputChange('nazov', e.target.value)}
                  placeholder="Zadajte názov článku..."
                />
                {errors.nazov && (
                  <span className="modal-error">{errors.nazov}</span>
                )}
              </div>
              
              <div className="modal-field flex-1">
                {renderStatusSelect()}
              </div>
            </div>

            <div className="form-row">
              <div className="modal-field flex-2">
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
              
              <div className="modal-field flex-1">
                {renderCategorySelect()}
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">
                Excerpt (krátky popis) *
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

          {/* Obrázok článku */}
          <div className="form-section">
            <h3 className="form-section-title">Hlavný obrázok</h3>
            
            <div className="modal-field">
              <label className="modal-label">
                Vybrať obrázok
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="modal-input"
              />
              {isUploadingImage && (
                <p style={{ color: '#3b82f6', fontSize: '14px', marginTop: '8px' }}>
                  Nahráváam obrázok...
                </p>
              )}
            </div>

            {imagePreview && (
              <div className="image-preview" style={{ marginTop: '16px' }}>
                <img 
                  src={imagePreview} 
                  alt="Náhľad" 
                  style={{ 
                    maxWidth: '300px', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }} 
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview('');
                    setSelectedImage(null);
                    setFormData(prev => ({ ...prev, obrazok: '' }));
                  }}
                  style={{
                    marginLeft: '16px',
                    padding: '8px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Odstrániť
                </button>
              </div>
            )}
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
                className="modal-input"
                value={formData.meta_title}
                onChange={(e) => handleInputChange('meta_title', e.target.value)}
                placeholder="SEO názov článku..."
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">
                Meta description
              </label>
              <textarea
                className="modal-textarea"
                value={formData.meta_description}
                onChange={(e) => handleInputChange('meta_description', e.target.value)}
                placeholder="SEO popis článku..."
                rows={3}
              />
            </div>
          </div>

          {/* Akčné tlačidlá */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Zrušiť
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              <SaveIcon />
              {isSubmitting ? 'Ukladám...' : 'Uložiť článok'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditArticleManagement;