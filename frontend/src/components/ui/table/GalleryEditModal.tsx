// frontend/src/components/ui/table/GalleryEditModal.tsx
// Modal pre editovanie existujúcej galérie s podporou upload a správou obrázkov

import React, { useState, useRef, useEffect } from 'react';

// ===== INTERFACE DEFINITIONS =====
interface Team {
  id: number;
  nazov: string;
  full_name: string;
  vekova_kategoria: string;
  typ: 'muzi' | 'zeny' | 'mladez';
}

interface Article {
  id: number;
  nazov: string;
  slug: string;
  kategoria_nazov?: string;
}

interface Match {
  id: number;
  nazov: string;
  datum_cas: string;
  liga_nazov?: string;
}

interface GalleryImage {
  id: number;
  galeria_id: number;
  nazov: string;
  alt_text?: string | null;
  cesta_suboru: string;
  nahladovy_maly?: string | null;
  nahladovy_stredny?: string | null;
  velkost_suboru: number;
  typ_suboru: string;
  sirka?: number | null;
  vyska?: number | null;
  poradie: number;
  je_nahladovy: boolean;
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

interface Gallery {
  id: number;
  nazov: string;
  popis?: string | null;
  slug: string;
  tim_id?: number | null;
  clanok_id?: number | null;
  zapas_id?: number | null;
  pocet_obrazkov: number;
  nahladovy_obrazok?: string | null;
  typ_priradenia: 'tim' | 'clanok' | 'zapas' | 'volna';
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

interface UploadedImage {
  id: number;
  nazov: string;
  cesta_suboru: string;
  nahladovy_maly?: string;
  nahladovy_stredny?: string;
  poradie: number;
  velkost_suboru: number;
  sirka?: number;
  vyska?: number;
}

interface GalleryEditModalProps {
  isOpen: boolean;
  gallery: Gallery | null; // Galéria na editovanie
  onClose: () => void;
  onGalleryUpdated: () => void;
}

// ===== MAIN COMPONENT =====
const GalleryEditModal: React.FC<GalleryEditModalProps> = ({
  isOpen,
  gallery,
  onClose,
  onGalleryUpdated
}) => {
  // ===== STATE MANAGEMENT =====
  
  // Form dáta - naplní sa z props galérie
  const [formData, setFormData] = useState({
    nazov: '',
    slug: '',
    popis: '',
    typ_priradenia: 'volna' as 'tim' | 'clanok' | 'zapas' | 'volna',
    priradenie_id: '', // ID objektu na ktorý je galéria priradená
    aktivity: true
  });

  // UI stavy
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'basic' | 'assignment' | 'images'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Validácia názvu
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameValidation, setNameValidation] = useState<{
    isValid: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | null;
  }>({
    isValid: true,
    message: '',
    type: null
  });

  // Dáta pre selecty
  const [teams, setTeams] = useState<Team[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Existujúce obrázky galérie
  const [existingImages, setExistingImages] = useState<GalleryImage[]>([]);
  const [loadingExistingImages, setLoadingExistingImages] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

  // Upload nových obrázkov
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slugTimeoutRef = useRef<NodeJS.Timeout>();
  const nameValidationTimeoutRef = useRef<NodeJS.Timeout>();

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    if (isOpen && gallery) {
      console.log('🖼️ Editovanie galérie:', gallery);
      initializeFormWithGallery(gallery);
      loadExistingImages(gallery.id);
      if (gallery.typ_priradenia !== 'volna') {
        loadAssignmentOptions(gallery.typ_priradenia);
      }
    }
  }, [isOpen, gallery]);

  // Auto-generovanie slug z názvu (len ak sa slug zmenil alebo je prázdny)
  useEffect(() => {
    if (formData.nazov && currentStep === 'basic') {
      if (slugTimeoutRef.current) {
        clearTimeout(slugTimeoutRef.current);
      }

      slugTimeoutRef.current = setTimeout(() => {
        // Generujeme slug len ak je prázdny alebo ak používateľ nezmenil originálny
        if (!formData.slug || formData.slug === generateSlug(gallery?.nazov || '')) {
          const newSlug = generateSlug(formData.nazov);
          setFormData(prev => ({ ...prev, slug: newSlug }));
        }
      }, 500);
    }

    return () => {
      if (slugTimeoutRef.current) {
        clearTimeout(slugTimeoutRef.current);
      }
    };
  }, [formData.nazov, currentStep]);

  // Validácia názvu (kontrola duplicity, ale vynechaj aktuálnu galériu)
  useEffect(() => {
    if (formData.nazov && formData.nazov !== gallery?.nazov && currentStep === 'basic') {
      if (nameValidationTimeoutRef.current) {
        clearTimeout(nameValidationTimeoutRef.current);
      }

      nameValidationTimeoutRef.current = setTimeout(() => {
        validateGalleryName(formData.nazov);
      }, 800);
    }

    return () => {
      if (nameValidationTimeoutRef.current) {
        clearTimeout(nameValidationTimeoutRef.current);
      }
    };
  }, [formData.nazov, currentStep]);

  // ===== HELPER FUNCTIONS =====

  // Inicializácia formulára s dátami galérie
  const initializeFormWithGallery = (galleryData: Gallery) => {
    const priradenie_id = galleryData.tim_id || galleryData.clanok_id || galleryData.zapas_id || '';
    
    setFormData({
      nazov: galleryData.nazov,
      slug: galleryData.slug,
      popis: galleryData.popis || '',
      typ_priradenia: galleryData.typ_priradenia,
      priradenie_id: priradenie_id.toString(),
      aktivity: galleryData.aktivity
    });

    // Reset ostatných stavov
    setError(null);
    setSelectedFiles([]);
    setUploadedImages([]);
    setImagesToDelete([]);
    setCurrentStep('basic');
    
    setNameValidation({
      isValid: true,
      message: '',
      type: null
    });
  };

  // Načítanie existujúcich obrázkov galérie
  const loadExistingImages = async (galleryId: number) => {
    try {
      setLoadingExistingImages(true);
      setError(null);

      const response = await fetch(`http://localhost:3000/api/admin/galleries/${galleryId}/images`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Chyba pri načítaní obrázkov');
      }

      setExistingImages(result.data.obrazky || []);
      console.log(`✅ Načítaných ${result.data.obrazky?.length || 0} existujúcich obrázkov`);

    } catch (error: any) {
      console.error('❌ Chyba pri načítaní existujúcich obrázkov:', error);
      setError(`Chyba pri načítaní obrázkov: ${error.message}`);
    } finally {
      setLoadingExistingImages(false);
    }
  };

  // Generovanie slug z názvu
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Odstránenie diakritiky
      .replace(/[^a-z0-9\s-]/g, '') // Len písmená, číslice, medzery a pomlčky
      .trim()
      .replace(/\s+/g, '-') // Medzery na pomlčky
      .replace(/-+/g, '-') // Viacnásobné pomlčky na jednu
      .replace(/^-|-$/g, ''); // Odstránenie pomlčiek na začiatku/konci
  };

  // Validácia názvu galérie
  const validateGalleryName = async (nazov: string) => {
    if (!nazov.trim()) {
      setNameValidation({
        isValid: false,
        message: 'Názov galérie je povinný',
        type: 'error'
      });
      return;
    }

    if (nazov.length < 3) {
      setNameValidation({
        isValid: false,
        message: 'Názov musí mať aspoň 3 znaky',
        type: 'error'
      });
      return;
    }

    try {
      setIsCheckingName(true);

      // Kontrola duplicity (vynechaj aktuálnu galériu)
      const params = new URLSearchParams({
        search: nazov.trim(),
        exact: 'true'
      });

      const response = await fetch(`http://localhost:3000/api/admin/galleries?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Skontroluj, či existuje galéria s rovnakým názvom (okrem aktuálnej)
        const duplicateGallery = result.data?.galerie?.find((g: Gallery) => 
          g.nazov.toLowerCase() === nazov.toLowerCase() && g.id !== gallery?.id
        );

        if (duplicateGallery) {
          setNameValidation({
            isValid: false,
            message: 'Galéria s týmto názvom už existuje',
            type: 'error'
          });
        } else {
          setNameValidation({
            isValid: true,
            message: 'Názov je dostupný',
            type: 'success'
          });
        }
      }

    } catch (error: any) {
      console.error('Chyba pri validácii názvu:', error);
      setNameValidation({
        isValid: true,
        message: 'Nepodarilo sa overiť názov',
        type: 'warning'
      });
    } finally {
      setIsCheckingName(false);
    }
  };

  // Reset formulára
  const resetForm = () => {
    setFormData({
      nazov: '',
      slug: '',
      popis: '',
      typ_priradenia: 'volna',
      priradenie_id: '',
      aktivity: true
    });

    setError(null);
    setSelectedFiles([]);
    setUploadedImages([]);
    setExistingImages([]);
    setImagesToDelete([]);
    setCurrentStep('basic');
    
    setNameValidation({
      isValid: true,
      message: '',
      type: null
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ===== ASSIGNMENT OPTIONS LOADING =====
  
  const loadAssignmentOptions = async (type: 'tim' | 'clanok' | 'zapas') => {
    try {
      setLoadingOptions(true);

      let endpoint = '';
      switch (type) {
        case 'tim':
          endpoint = '/api/teams';
          break;
        case 'clanok':
          endpoint = '/api/articles';
          break;
        case 'zapas':
          endpoint = '/api/matches';
          break;
      }

      const response = await fetch(`http://localhost:3000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        switch (type) {
          case 'tim':
            setTeams(result.data?.teams || result.data || []);
            break;
          case 'clanok':
            setArticles(result.data?.articles || result.data || []);
            break;
          case 'zapas':
            setMatches(result.data?.matches || result.data || []);
            break;
        }
      }

    } catch (error: any) {
      console.error(`Chyba pri načítaní ${type}:`, error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // ===== FILE HANDLING =====

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    Array.from(files).forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`Súbor ${file.name} nie je podporovaný. Podporované formáty: JPG, PNG, WebP`);
        return;
      }

      if (file.size > maxSize) {
        alert(`Súbor ${file.name} je príliš veľký. Maximálna veľkosť: 10MB`);
        return;
      }

      validFiles.push(file);
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUploadedImage = (imageId: number) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Označenie existujúceho obrázka na vymazanie
  const handleMarkImageForDeletion = (imageId: number) => {
    setImagesToDelete(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  // ===== STEP NAVIGATION =====

  const handleNextStep = () => {
    if (currentStep === 'basic' && isBasicStepValid()) {
      setCurrentStep('assignment');
    } else if (currentStep === 'assignment' && isAssignmentStepValid()) {
      setCurrentStep('images');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'assignment') {
      setCurrentStep('basic');
    } else if (currentStep === 'images') {
      setCurrentStep('assignment');
    }
  };

  // ===== VALIDATION =====

  const isBasicStepValid = (): boolean => {
    return !!(
      formData.nazov.trim() &&
      formData.slug.trim() &&
      nameValidation.isValid &&
      !isCheckingName
    );
  };

  const isAssignmentStepValid = (): boolean => {
    if (formData.typ_priradenia === 'volna') {
      return true;
    }
    return !!formData.priradenie_id;
  };

  const isFormValid = (): boolean => {
    switch (currentStep) {
      case 'basic':
        return isBasicStepValid();
      case 'assignment':
        return isAssignmentStepValid();
      case 'images':
        return isAssignmentStepValid(); // Obrázky nie sú povinné pri editovaní
      default:
        return false;
    }
  };

  // ===== FORM SUBMISSION =====

  const handleSubmit = async () => {
    if (!gallery || !isFormValid()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. Aktualizovanie základných údajov galérie
      const updateData = {
        nazov: formData.nazov.trim(),
        slug: formData.slug.trim(),
        popis: formData.popis.trim() || null,
        typ_priradenia: formData.typ_priradenia,
        tim_id: formData.typ_priradenia === 'tim' ? parseInt(formData.priradenie_id) : null,
        clanok_id: formData.typ_priradenia === 'clanok' ? parseInt(formData.priradenie_id) : null,
        zapas_id: formData.typ_priradenia === 'zapas' ? parseInt(formData.priradenie_id) : null,
        aktivity: formData.aktivity
      };

      const updateResponse = await fetch(`http://localhost:3000/api/admin/galleries/${gallery.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Chyba pri aktualizácii galérie');
      }

      // 2. Vymazanie označených obrázkov
      if (imagesToDelete.length > 0) {
        console.log(`🗑️ Mazám ${imagesToDelete.length} obrázkov...`);
        
        for (const imageId of imagesToDelete) {
          try {
            const deleteResponse = await fetch(
              `http://localhost:3000/api/admin/galleries/${gallery.id}/images/${imageId}`, 
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
                }
              }
            );

            if (!deleteResponse.ok) {
              console.warn(`Nepodarilo sa vymazať obrázok ${imageId}`);
            }
          } catch (deleteError) {
            console.warn(`Chyba pri mazaní obrázka ${imageId}:`, deleteError);
          }
        }
      }

      // 3. Upload nových obrázkov (ak sú vybrané)
      if (selectedFiles.length > 0) {
        console.log(`📤 Nahrávam ${selectedFiles.length} nových obrázkov...`);
        setIsUploading(true);

        const formData = new FormData();
        selectedFiles.forEach((file, index) => {
          formData.append('images', file);
        });

        const uploadResponse = await fetch(
          `http://localhost:3000/api/admin/galleries/${gallery.id}/images`, 
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
            },
            body: formData
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Chyba pri upload obrázkov');
        }

        const uploadResult = await uploadResponse.json();
        console.log(`✅ Upload dokončený: ${uploadResult.data?.uploaded_images?.length || 0} obrázkov`);
      }

      console.log('✅ Galéria úspešne aktualizovaná');
      onGalleryUpdated();
      onClose();

    } catch (error: any) {
      console.error('❌ Chyba pri aktualizácii galérie:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  // ===== RENDER METHODS =====

  // Render základného kroku
  const renderBasicStep = () => (
    <div className="step-content">
      <h3 className="step-title">Základné informácie</h3>
      
      <div className="form-field">
        <label className="form-label">
          Názov galérie *
          {isCheckingName && <span className="checking-indicator">⏳</span>}
        </label>
        <input
          type="text"
          className={`form-input ${nameValidation.type === 'error' ? 'error' : nameValidation.type === 'success' ? 'success' : ''}`}
          value={formData.nazov}
          onChange={(e) => setFormData(prev => ({ ...prev, nazov: e.target.value }))}
          placeholder="Zadajte názov galérie..."
          disabled={loading || isSubmitting}
        />
        {nameValidation.message && (
          <div className={`form-message ${nameValidation.type}`}>
            {nameValidation.type === 'success' && '✅ '}
            {nameValidation.type === 'error' && '❌ '}
            {nameValidation.type === 'warning' && '⚠️ '}
            {nameValidation.message}
          </div>
        )}
      </div>

      <div className="form-field">
        <label className="form-label">URL slug *</label>
        <input
          type="text"
          className="form-input"
          value={formData.slug}
          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
          placeholder="url-galérie"
          disabled={loading || isSubmitting}
        />
        <div className="form-hint">
          URL adresa: /galerie/{formData.slug || 'url-galerie'}
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Popis galérie</label>
        <textarea
          className="form-textarea"
          value={formData.popis}
          onChange={(e) => setFormData(prev => ({ ...prev, popis: e.target.value }))}
          placeholder="Voliteľný popis galérie..."
          rows={3}
          disabled={loading || isSubmitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Stav</label>
        <select
          className="form-select"
          value={formData.aktivity ? 'true' : 'false'}
          onChange={(e) => setFormData(prev => ({ ...prev, aktivity: e.target.value === 'true' }))}
          disabled={loading || isSubmitting}
        >
          <option value="true">Aktívna (publikovaná)</option>
          <option value="false">Neaktívna (skrytá)</option>
        </select>
      </div>
    </div>
  );

  // Render kroku priradenia
  const renderAssignmentStep = () => (
    <div className="step-content">
      <h3 className="step-title">Priradenie galérie</h3>
      
      <div className="form-field">
        <label className="form-label">Typ priradenia *</label>
        <select
          className="form-select"
          value={formData.typ_priradenia}
          onChange={(e) => {
            const newType = e.target.value as 'tim' | 'clanok' | 'zapas' | 'volna';
            setFormData(prev => ({ 
              ...prev, 
              typ_priradenia: newType,
              priradenie_id: '' // Reset pri zmene typu
            }));
            
            if (newType !== 'volna') {
              loadAssignmentOptions(newType);
            }
          }}
          disabled={loading || isSubmitting}
        >
          <option value="volna">Voľná galéria (nezaradená)</option>
          <option value="tim">Priradená k tímu</option>
          <option value="clanok">Priradená k článku</option>
          <option value="zapas">Priradená k zápasu</option>
        </select>
      </div>

      {formData.typ_priradenia !== 'volna' && (
        <div className="form-field">
          <label className="form-label">
            {formData.typ_priradenia === 'tim' && 'Vyberte tím *'}
            {formData.typ_priradenia === 'clanok' && 'Vyberte článok *'}
            {formData.typ_priradenia === 'zapas' && 'Vyberte zápas *'}
          </label>
          
          {loadingOptions ? (
            <div className="loading-select">Načítavam možnosti...</div>
          ) : (
            <select
              className="form-select"
              value={formData.priradenie_id}
              onChange={(e) => setFormData(prev => ({ ...prev, priradenie_id: e.target.value }))}
              disabled={loading || isSubmitting}
            >
              <option value="">-- Vyberte možnosť --</option>
              
              {formData.typ_priradenia === 'tim' && teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.full_name} ({team.nazov})
                </option>
              ))}
              
              {formData.typ_priradenia === 'clanok' && articles.map(article => (
                <option key={article.id} value={article.id}>
                  {article.nazov}
                  {article.kategoria_nazov && ` (${article.kategoria_nazov})`}
                </option>
              ))}
              
              {formData.typ_priradenia === 'zapas' && matches.map(match => (
                <option key={match.id} value={match.id}>
                  {match.nazov} - {new Date(match.datum_cas).toLocaleDateString('sk-SK')}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );

  // Render kroku obrázkov
  const renderImagesStep = () => (
    <div className="step-content">
      <h3 className="step-title">Správa obrázkov</h3>
      
      {/* Existujúce obrázky */}
      {loadingExistingImages ? (
        <div className="loading-images">Načítavam existujúce obrázky...</div>
      ) : existingImages.length > 0 ? (
        <div className="existing-images">
          <h4>Existujúce obrázky ({existingImages.length})</h4>
          <div className="images-grid">
            {existingImages.map(image => (
              <div 
                key={image.id} 
                className={`existing-image-item ${imagesToDelete.includes(image.id) ? 'marked-for-deletion' : ''}`}
              >
                <div className="image-preview">
                  <img 
                    src={`http://localhost:3000${image.nahladovy_maly || image.cesta_suboru}`}
                    alt={image.nazov || 'Obrázok galérie'}
                    className="existing-image"
                  />
                  {imagesToDelete.includes(image.id) && (
                    <div className="deletion-overlay">
                      <span>Označený na vymazanie</span>
                    </div>
                  )}
                </div>
                <div className="image-info">
                  <div className="image-name">{image.nazov || 'Bez názvu'}</div>
                  <div className="image-details">
                    {(image.velkost_suboru / 1024 / 1024).toFixed(2)} MB
                    {image.sirka && image.vyska && ` • ${image.sirka}×${image.vyska}`}
                  </div>
                  {image.je_nahladovy && (
                    <div className="thumbnail-badge">Náhľadový obrázok</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleMarkImageForDeletion(image.id)}
                  className={`image-action-btn ${imagesToDelete.includes(image.id) ? 'restore-btn' : 'delete-btn'}`}
                  title={imagesToDelete.includes(image.id) ? 'Zrušiť vymazanie' : 'Označiť na vymazanie'}
                >
                  {imagesToDelete.includes(image.id) ? '↺' : '🗑️'}
                </button>
              </div>
            ))}
          </div>
          
          {imagesToDelete.length > 0 && (
            <div className="deletion-warning">
              ⚠️ {imagesToDelete.length} obrázok(ov) bude vymazaný pri uložení zmien.
            </div>
          )}
        </div>
      ) : (
        <div className="no-existing-images">
          <p>Táto galéria zatiaľ nemá žiadne obrázky.</p>
        </div>
      )}

      {/* Upload nových obrázkov */}
      <div className="upload-section">
        <h4>Pridať nové obrázky</h4>
        
        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
          <div className="upload-content">
            <div className="upload-icon">📷</div>
            <div className="upload-text">
              <strong>Kliknite pre výber obrázkov</strong> alebo sem pretiahnite súbory
            </div>
            <div className="upload-hint">
              Podporované formáty: JPG, PNG, WebP • Maximálna veľkosť: 10MB na súbor
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="upload-input"
            disabled={loading || isUploading || isSubmitting}
          />
        </div>
      </div>

      {/* Vybrané súbory na upload */}
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Vybrané súbory ({selectedFiles.length})</h4>
          <div className="files-grid">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="file-item">
                <div className="file-preview">
                  <img 
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="file-image"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                </div>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="file-remove"
                  title="Odstrániť súbor"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Úspešne nahrané obrázky */}
      {uploadedImages.length > 0 && (
        <div className="uploaded-images">
          <h4>Nahrané obrázky ({uploadedImages.length})</h4>
          <div className="images-grid">
            {uploadedImages.map(image => (
              <div key={image.id} className="uploaded-item">
                <div className="uploaded-preview">
                  <img 
                    src={`http://localhost:3000${image.nahladovy_maly || image.cesta_suboru}`}
                    alt={image.nazov}
                    className="uploaded-image"
                  />
                </div>
                <div className="uploaded-info">
                  <div className="uploaded-name">{image.nazov}</div>
                  <div className="uploaded-size">
                    {(image.velkost_suboru / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveUploadedImage(image.id)}
                  className="uploaded-remove"
                  title="Odstrániť obrázok"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ===== MAIN RENDER =====
  if (!isOpen || !gallery) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editovať galériu: {gallery.nazov}</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close"
            disabled={loading || isUploading || isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Progress steps */}
        <div className="modal-steps">
          <div className={`step ${currentStep === 'basic' ? 'active' : ''} ${currentStep !== 'basic' ? 'completed' : ''}`}>
            <div className="step-circle">1</div>
            <div className="step-label">Základné info</div>
          </div>
          <div className={`step ${currentStep === 'assignment' ? 'active' : ''} ${currentStep === 'images' ? 'completed' : ''}`}>
            <div className="step-circle">2</div>
            <div className="step-label">Priradenie</div>
          </div>
          <div className={`step ${currentStep === 'images' ? 'active' : ''}`}>
            <div className="step-circle">3</div>
            <div className="step-label">Obrázky</div>
          </div>
        </div>

        <div className="modal-form">
          <div className="modal-body">
            {/* Error message */}
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            {/* Step content */}
            {currentStep === 'basic' && renderBasicStep()}
            {currentStep === 'assignment' && renderAssignmentStep()}
            {currentStep === 'images' && renderImagesStep()}
          </div>

          <div className="modal-footer">
            {/* Back button */}
            {currentStep !== 'basic' && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="btn btn-secondary"
                disabled={loading || isUploading || isSubmitting}
              >
                ← Späť
              </button>
            )}

            {/* Next/Submit button */}
            {currentStep !== 'images' ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn btn-primary"
                disabled={!isFormValid() || loading || isSubmitting}
              >
                Ďalej →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="btn btn-success"
                disabled={!isFormValid() || loading || isUploading || isSubmitting}
              >
                {loading || isUploading || isSubmitting
                  ? (isUploading ? 'Nahrávam obrázky...' : 'Ukladám zmeny...') 
                  : 'Uložiť zmeny'
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryEditModal;