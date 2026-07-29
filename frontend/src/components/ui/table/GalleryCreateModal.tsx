// frontend/src/components/ui/modals/GalleryCreateModal.tsx
// Modal pre vytváranie novej galérie s podporou upload fotiek a priradenia

import React, { useState, useRef, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl, souborUrl } from '../../../config/api';

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

interface GalleryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGalleryCreated: () => void;
}

// ===== MAIN COMPONENT =====
const GalleryCreateModal: React.FC<GalleryCreateModalProps> = ({
  isOpen,
  onClose,
  onGalleryCreated
}) => {
  // ===== STATE MANAGEMENT =====
  
  // Form dáta
  const [formData, setFormData] = useState({
    nazov: '',
    slug: '',
    popis: '',
    typ_priradenia: 'volna' as 'tim' | 'clanok' | 'zapas' | 'volna',
    priradenie_id: '' // ID objektu na ktorý je galéria priradená
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

  // Upload obrázkov
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slugTimeoutRef = useRef<ReturnType<typeof setTimeout>>()  // browser-safe typ namiesto NodeJS.Timeout;
  const nameValidationTimeoutRef = useRef<ReturnType<typeof setTimeout>>()  // browser-safe typ namiesto NodeJS.Timeout;

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    if (isOpen) {
      resetForm();
      if (formData.typ_priradenia !== 'volna') {
        loadAssignmentOptions(formData.typ_priradenia);
      }
    }
  }, [isOpen]);

  // Auto-generovanie slug z názvu
  useEffect(() => {
    if (formData.nazov && currentStep === 'basic') {
      if (slugTimeoutRef.current) {
        clearTimeout(slugTimeoutRef.current);
      }
      
      slugTimeoutRef.current = setTimeout(() => {
        // Generuj slug iba ak používateľ nezmenil slug manuálne
        if (formData.slug === '' || formData.slug.includes('-')) {
          const generatedSlug = generateSlug(formData.nazov);
          setFormData(prev => ({ ...prev, slug: generatedSlug }));
        }
      }, 800); // Dlhší timeout pre lepší UX
    }
  }, [formData.nazov]);

  // Validácia názvu v reálnom čase
  useEffect(() => {
    if (formData.nazov.trim().length >= 3) {
      if (nameValidationTimeoutRef.current) {
        clearTimeout(nameValidationTimeoutRef.current);
      }
      
      nameValidationTimeoutRef.current = setTimeout(() => {
        checkNameAvailability(formData.nazov.trim());
      }, 1000); // 1 sekunda po prestani písania
    } else {
      setNameValidation({
        isValid: formData.nazov.trim().length === 0, // Prázdny názov je OK (ešte sa nezačalo písať)
        message: formData.nazov.trim().length > 0 ? 'Názov musí mať minimálne 3 znaky' : '',
        type: formData.nazov.trim().length > 0 ? 'error' : null
      });
    }
  }, [formData.nazov]);

  // ===== UTILITY FUNCTIONS =====
  
  // Generovanie slug z názvu
  const generateSlug = (text: string): string => {
    const baseSlug = text
      .toLowerCase()
      .replace(/[áäâàã]/g, 'a')
      .replace(/[éëêè]/g, 'e')
      .replace(/[íïîì]/g, 'i')
      .replace(/[óöôòõ]/g, 'o')
      .replace(/[úüûù]/g, 'u')
      .replace(/[ýÿ]/g, 'y')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[ščžťľň]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Pridaj náhodné číslo a timestamp pre garantovanú unikátnosť
    const randomNum = Math.floor(Math.random() * 9999) + 1000;
    const timestamp = Date.now();
    return `${baseSlug}-${randomNum}-${timestamp}`;
  };

  // Reset formulára
  const resetForm = () => {
    setFormData({
      nazov: '',
      slug: '',
      popis: '',
      typ_priradenia: 'volna',
      priradenie_id: ''
    });
    setSelectedFiles([]);
    setUploadedImages([]);
    setUploadProgress({});
    setCurrentStep('basic');
    setError(null);
    setIsSubmitting(false);
    setNameValidation({
      isValid: true,
      message: '',
      type: null
    });
  };

  // ===== API FUNCTIONS =====
  
  // Kontrola dostupnosti názvu galérie
  const checkNameAvailability = async (nazov: string) => {
    try {
      setIsCheckingName(true);
      
      const response = await fetch(apiUrl(`/admin/galleries`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Chyba pri kontrole názvu');
      }

      const result = await response.json();
      
      if (result.success) {
        const existingGalleries = result.data?.galerie || [];
        
        // Vygeneruj slug pre aktuálny názov
        const currentSlug = generateSlug(nazov);
        const baseSlug = nazov
          .toLowerCase()
          .replace(/[áäâàã]/g, 'a')
          .replace(/[éëêè]/g, 'e')
          .replace(/[íïîì]/g, 'i')
          .replace(/[óöôòõ]/g, 'o')
          .replace(/[úüûù]/g, 'u')
          .replace(/[ýÿ]/g, 'y')
          .replace(/[ñ]/g, 'n')
          .replace(/[ç]/g, 'c')
          .replace(/[ščžťľň]/g, '')
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        // Kontrola názvu (case-insensitive)
        const nameExists = existingGalleries.some((gallery: any) => 
          gallery.nazov.toLowerCase().trim() === nazov.toLowerCase().trim()
        );
        
        // Kontrola slug (podobné slug bez timestamp)
        const slugExists = existingGalleries.some((gallery: any) => {
          // Ak existujúci slug začína našim base slug
          return gallery.slug && gallery.slug.startsWith(baseSlug);
        });
        
        console.log('🔍 Kontrola názvu:', {
          nazov,
          baseSlug,
          nameExists,
          slugExists,
          existingNames: existingGalleries.map((g: any) => g.nazov),
          existingSlugs: existingGalleries.map((g: any) => g.slug)
        });
        
        if (nameExists) {
          setNameValidation({
            isValid: false,
            message: 'Galéria s týmto názvom už existuje',
            type: 'error'
          });
        } else if (slugExists) {
          setNameValidation({
            isValid: false,
            message: 'Galéria s podobným názvom už existuje',
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
      console.error('Chyba pri kontrole názvu:', error);
      setNameValidation({
        isValid: true, // Pri chybe považujeme názov za OK
        message: 'Nepodarilo sa skontrolovať názov',
        type: 'warning'
      });
    } finally {
      setIsCheckingName(false);
    }
  };
  
  // Načítanie možností pre priradenie
  const loadAssignmentOptions = async (typ: 'tim' | 'clanok' | 'zapas') => {
    try {
      setLoadingOptions(true);
      
      let endpoint = '';
      switch (typ) {
        case 'tim':
          endpoint = '/api/teams';
          break;
        case 'clanok':
          endpoint = '/api/admin/articles'; // Admin endpoint pre články
          break;
        case 'zapas':
          endpoint = '/api/matches'; // TODO: implementovať v budúcnosti
          break;
      }

      console.log(`🌐 Volám API: ${apiUrl(endpoint)}`);

      const response = await fetch(souborUrl(endpoint), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 Response status: ${response.status}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📊 API Response pre ${typ}:`, result);
      if (!result.success) {
        throw new Error(result.message || 'Chyba pri načítaní dát');
      }

      console.log(`🔍 Dáta pre ${typ}:`, result.data);
      console.log(`🔍 Je result.data array?`, Array.isArray(result.data));

      if (typ === 'clanok') {
        console.log('🔍 Articles data structure:', {
          data: result.data,
          dataType: typeof result.data,
          isArray: Array.isArray(result.data),
          articles: result.data?.articles,
          articlesType: typeof result.data?.articles,
          articlesIsArray: Array.isArray(result.data?.articles)
        });
      }

      // Nastavenie dát podľa typu - zabezpečujeme že sú to arrays
      switch (typ) {
        case 'tim':
          setTeams(Array.isArray(result.data) ? result.data : []);
          break;
        case 'clanok':
          // Pre články môže byť result.data objekt s articles property
          const articlesData = result.data?.articles || result.data;
          setArticles(Array.isArray(articlesData) ? articlesData : []);
          break;
        case 'zapas':
          setMatches(Array.isArray(result.data) ? result.data : []);
          break;
      }

    } catch (error: any) {
      console.error(`Chyba pri načítaní ${typ}:`, error);
      setError(`Chyba pri načítaní možností: ${error.message}`);
      
      // Reset arrays pri chybe
      switch (typ) {
        case 'tim':
          setTeams([]);
          break;
        case 'clanok':
          setArticles([]);
          break;
        case 'zapas':
          setMatches([]);
          break;
      }
    } finally {
      setLoadingOptions(false);
    }
  };

  // Vytvorenie galérie
  const createGallery = async (): Promise<number | null> => {
    try {
      setLoading(true);
      setError(null);

      // Ak slug nie je unikátny, vygeneruj nový
      let finalSlug = formData.slug.trim();
      if (!finalSlug) {
        finalSlug = generateSlug(formData.nazov);
      }

      const payload: any = {
        nazov: formData.nazov.trim(),
        slug: finalSlug,
        popis: formData.popis.trim() || null,
        typ_priradenia: formData.typ_priradenia
      };

      // Pridanie priradenia ak nie je voľná galéria
      if (formData.typ_priradenia !== 'volna' && formData.priradenie_id) {
        const assignmentId = parseInt(formData.priradenie_id, 10);
        switch (formData.typ_priradenia) {
          case 'tim':
            payload.tim_id = assignmentId;
            break;
          case 'clanok':
            payload.clanok_id = assignmentId;
            break;
          case 'zapas':
            payload.zapas_id = assignmentId;
            break;
        }
      }

      console.log('🖼️ Vytváram galériu:', payload);

      const response = await fetch(apiUrl('/admin/galleries'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Ak je problém s duplicitou, skús s novým slug
        if (response.status === 409 || response.status === 400) {
          console.log('⚠️ Konflikt slug, generujem nový...');
          const newSlug = generateSlug(formData.nazov);
          payload.slug = newSlug;
          
          console.log('🔄 Pokúšam sa s novým slug:', newSlug);
          
          const retryResponse = await fetch(apiUrl('/admin/galleries'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          
          if (!retryResponse.ok) {
            const retryErrorData = await retryResponse.json().catch(() => ({}));
            throw new Error(retryErrorData.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryResult = await retryResponse.json();
          if (!retryResult.success) {
            throw new Error(retryResult.message || 'Chyba pri vytváraní galérie');
          }
          
          console.log('✅ Galéria vytvorená s novým slug:', retryResult.data);
          
          // Backend môže vrátiť buď retryResult.data.id alebo retryResult.data.galeria.id
          const retryGalleryId = retryResult.data?.id || retryResult.data?.galeria?.id;
          
          if (!retryGalleryId) {
            console.error('❌ Nepodarilo sa získať ID galérie z retry response:', retryResult);
            throw new Error('Nepodarilo sa získať ID vytvorenej galérie');
          }
          
          return retryGalleryId;
        }
        
        // Iné chyby
        if (response.status === 400) {
          const errors = errorData.errors;
          if (errors && typeof errors === 'object') {
            const errorMessages = Object.values(errors).flat().join(', ');
            throw new Error(`Neplatné údaje: ${errorMessages}`);
          }
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Chyba pri vytváraní galérie');
      }

      console.log('✅ Galéria vytvorená:', result.data);
      
      // Backend môže vrátiť buď result.data.id alebo result.data.galeria.id
      const galleryId = result.data?.id || result.data?.galeria?.id;
      
      if (!galleryId) {
        console.error('❌ Nepodarilo sa získať ID galérie z response:', result);
        throw new Error('Nepodarilo sa získať ID vytvorenej galérie');
      }
      
      return galleryId;

    } catch (error: any) {
      console.error('❌ Chyba pri vytváraní galérie:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Upload obrázkov do galérie
  const uploadImages = async (galleryId: number) => {
    if (selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setError(null);

      console.log(`📤 Nahrávam ${selectedFiles.length} obrázkov do galérie ID: ${galleryId}`);

      const formDataUpload = new FormData();
      selectedFiles.forEach((file) => {
        formDataUpload.append('images', file);
      });

      const response = await fetch(apiUrl(`/admin/galleries/${galleryId}/images`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`
        },
        body: formDataUpload
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Chyba pri upload obrázkov');
      }

      console.log(`✅ Nahraných ${result.data.uploaded_count} obrázkov`);
      setUploadedImages(result.data.uploaded_images || []);

      if (result.data.errors && result.data.errors.length > 0) {
        console.warn('⚠️ Niektoré obrázky sa nepodarilo nahrať:', result.data.errors);
      }

    } catch (error: any) {
      console.error('❌ Chyba pri upload obrázkov:', error);
      setError(`Chyba pri nahrávaní obrázkov: ${error.message}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // ===== EVENT HANDLERS =====
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Pri zmene typu priradenia načítame možnosti
    if (name === 'typ_priradenia') {
      setFormData(prev => ({ ...prev, priradenie_id: '' }));
      if (value !== 'volna') {
        loadAssignmentOptions(value as 'tim' | 'clanok' | 'zapas');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validácia súborov
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`Súbor "${file.name}" nie je podporovaný. Podporované sú iba obrázky (JPEG, PNG, GIF, WebP).`);
        return;
      }
      
      if (file.size > maxSize) {
        alert(`Súbor "${file.name}" je príliš veľký. Maximálna veľkosť je 10MB.`);
        return;
      }
      
      validFiles.push(file);
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUploadedImage = async (imageId: number) => {
    // TODO: Implementovať API volanie pre vymazanie obrázka
    console.log('🗑️ Removing image ID:', imageId);
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleNextStep = () => {
    if (currentStep === 'basic') {
      setCurrentStep('assignment');
    } else if (currentStep === 'assignment') {
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

  const handleSubmit = async () => {
    // Táto funkcia sa volá LEN pri poslednom kroku (images)
    if (currentStep !== 'images') {
      console.log('⚠️ Submit volaný nie na poslednom kroku, ignorujem...');
      return;
    }
    
    // Ochrana proti viacnásobnému submit
    if (isSubmitting || loading || isUploading) {
      console.log('⚠️ Submit už prebieha, ignorujem...', { isSubmitting, loading, isUploading });
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      console.log('🚀 Začínam vytváranie galérie...');
      
      // 1. Vytvorenie galérie
      const galleryId = await createGallery();
      if (!galleryId) {
        console.log('❌ Galéria sa nevytvorila, ukončujem...');
        return;
      }

      console.log(`✅ Galéria vytvorená s ID: ${galleryId}`);

      // 2. Upload obrázkov ak sú vybrané
      if (selectedFiles.length > 0) {
        console.log(`📤 Nahrávam ${selectedFiles.length} obrázkov...`);
        await uploadImages(galleryId);
      }

      // 3. Úspešné dokončenie
      console.log('🎉 Galéria úspešne vytvorená a dokončená!');
      
      // Najprv zavri modal, potom obnov dáta
      onClose();
      
      // Malé oneskorenie pred obnovením dát
      setTimeout(() => {
        onGalleryCreated();
      }, 100);

    } catch (error: any) {
      console.error('❌ Chyba pri vytváraní galérie:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== VALIDATION =====
  
  const isFormValid = () => {
    if (currentStep === 'basic') {
      return formData.nazov.trim().length >= 3 && 
             formData.slug.trim().length >= 3 && 
             nameValidation.isValid && 
             !isCheckingName;
    }
    if (currentStep === 'assignment') {
      if (formData.typ_priradenia === 'volna') return true;
      return formData.priradenie_id !== '';
    }
    return true; // Images step nemá povinné polia
  };

  // ===== RENDER FUNCTIONS =====
  
  const renderBasicStep = () => (
    <div className="modal-step">
      <h3 className="step-title">Základné informácie</h3>
      
      <div className="form-group">
        <label htmlFor="nazov" className="form-label">
          Názov galérie *
        </label>
        <input
          type="text"
          id="nazov"
          name="nazov"
          value={formData.nazov}
          onChange={handleInputChange}
          placeholder="napr. Tréning A-tímu, Zápas proti Slavia..."
          className={`form-input ${nameValidation.type === 'error' ? 'form-input--error' : ''} ${nameValidation.type === 'success' ? 'form-input--success' : ''}`}
          required
        />
        
        {/* Validačná správa */}
        {(nameValidation.message || isCheckingName) && (
          <div className={`form-validation ${nameValidation.type ? `form-validation--${nameValidation.type}` : ''}`}>
            {isCheckingName ? (
              <span>🔍 Kontrolujem dostupnosť názvu...</span>
            ) : (
              <span>
                {nameValidation.type === 'success' && '✅ '}
                {nameValidation.type === 'error' && '❌ '}
                {nameValidation.type === 'warning' && '⚠️ '}
                {nameValidation.message}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="slug" className="form-label">
          URL slug *
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          value={formData.slug}
          onChange={handleInputChange}
          placeholder="napr. trening-a-timu-2025"
          className="form-input"
          required
        />
        <div className="form-hint">
          URL adresa galérie: /galerie/{formData.slug || 'url-slug'}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="popis" className="form-label">
          Popis galérie
        </label>
        <textarea
          id="popis"
          name="popis"
          value={formData.popis}
          onChange={handleInputChange}
          placeholder="Krátky popis galérie..."
          className="form-textarea"
          rows={3}
        />
      </div>
    </div>
  );

  const renderAssignmentStep = () => (
    <div className="modal-step">
      <h3 className="step-title">Priradenie galérie</h3>
      
      <div className="form-group">
        <label htmlFor="typ_priradenia" className="form-label">
          Typ priradenia *
        </label>
        <select
          id="typ_priradenia"
          name="typ_priradenia"
          value={formData.typ_priradenia}
          onChange={handleInputChange}
          className="form-select"
        >
          <option value="volna">Voľná galéria (nepriradená)</option>
          <option value="tim">Priradená k tímu</option>
          <option value="clanok">Priradená k článku</option>
          <option value="zapas">Priradená k zápasu</option>
        </select>
      </div>

      {formData.typ_priradenia !== 'volna' && (
        <div className="form-group">
          <label htmlFor="priradenie_id" className="form-label">
            Vybrať {
              formData.typ_priradenia === 'tim' ? 'tím' :
              formData.typ_priradenia === 'clanok' ? 'článok' : 'zápas'
            } *
          </label>
          
          {loadingOptions ? (
            <div className="loading-select">Načítavam možnosti...</div>
          ) : (
            <select
              id="priradenie_id"
              name="priradenie_id"
              value={formData.priradenie_id}
              onChange={handleInputChange}
              className="form-select"
              required
            >
              <option value="">
                -- Vybrať {
                  formData.typ_priradenia === 'tim' ? 'tím' :
                  formData.typ_priradenia === 'clanok' ? 'článok' : 'zápas'
                } --
              </option>
              
              {formData.typ_priradenia === 'tim' && teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.full_name || team.nazov}
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
                  {match.nazov}
                  {match.datum_cas && ` - ${new Date(match.datum_cas).toLocaleDateString('sk-SK')}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );

  const renderImagesStep = () => (
    <div className="modal-step">
      <h3 className="step-title">Pridanie fotiek</h3>
      
      <div className="upload-section">
        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
          <div className="upload-icon">📷</div>
          <div className="upload-text">
            <strong>Kliknite sem pre výber fotiek</strong>
            <br />
            alebo ich pretiahnite sem
          </div>
          <div className="upload-hint">
            Podporované: JPEG, PNG, GIF, WebP | Max 10MB na súbor | Max 20 súborov
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="upload-input"
        />
      </div>

      {/* Vybrané súbory */}
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Vybrané súbory ({selectedFiles.length})</h4>
          <div className="files-grid">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-preview">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name}
                    className="file-image"
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

      {/* Nahrané obrázky */}
      {uploadedImages.length > 0 && (
        <div className="uploaded-images">
          <h4>Nahrané obrázky ({uploadedImages.length})</h4>
          <div className="images-grid">
            {uploadedImages.map((image) => (
              <div key={image.id} className="uploaded-item">
                <div className="uploaded-preview">
                  <img 
                    src={souborUrl(image.nahladovy_maly || image.cesta_suboru)}
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
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Vytvoriť novú galériu</h2>
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
            <div className="step-label">Fotky</div>
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
                  ? (isUploading ? 'Nahrávam obrázky...' : 'Vytváram galériu...') 
                  : 'Vytvoriť galériu'
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryCreateModal;