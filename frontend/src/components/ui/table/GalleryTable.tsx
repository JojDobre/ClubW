// frontend/src/components/ui/table/GalleryTable.tsx
// Komponent pre zobrazenie galérií v grid formáte s filter menu - OPRAVENÝ

import React, { useState, useRef, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { souborUrl } from '../../../config/api';

// ===== INTERFACE DEFINITIONS =====
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

interface GalleryStats {
  celkovo_zobrazeni: number;
  zobrazenia_tyzden: number;
  zobrazenia_mesiac: number;
}

interface GalleryWithStats extends Gallery {
  stats?: GalleryStats;
}

interface GalleryTableProps {
  galleries: GalleryWithStats[];
  loading?: boolean;
  error?: string | null;
  selectedGalleries?: string[];
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  onAddGallery?: () => void;
  onEditGallery?: (galleryId: string) => void;
  onDeleteGallery?: (galleryId: string) => void;
  onDeleteSelected?: (selectedIds: string[]) => void;
  onDuplicateSelected?: (selectedIds: string[]) => void;
  onGallerySelect?: (galleryId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  className?: string;
}

// ===== MAIN COMPONENT =====
const GalleryTable: React.FC<GalleryTableProps> = ({
  galleries = [],
  loading = false,
  error = null,
  selectedGalleries = [],
  searchTerm = '',
  onSearchChange,
  onAddGallery,
  onEditGallery,
  onDeleteGallery,
  onDeleteSelected,
  onDuplicateSelected,
  onGallerySelect,
  onSelectAll,
  className = ''
}) => {
  // ===== STATE MANAGEMENT =====
  const [internalSearchTerm, setInternalSearchTerm] = useState(searchTerm);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // ===== REFS =====
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    setInternalSearchTerm(searchTerm);
  }, [searchTerm]);

  // ===== COMPUTED VALUES =====
  const displaySearchTerm = onSearchChange ? searchTerm : internalSearchTerm;
  const selectedCount = selectedGalleries.length;
  
  // Filtrovanie galérií podľa vyhľadávacieho termu
  const filteredGalleries = displaySearchTerm 
    ? galleries.filter(gallery =>
        gallery.nazov.toLowerCase().includes(displaySearchTerm.toLowerCase()) ||
        (gallery.popis && gallery.popis.toLowerCase().includes(displaySearchTerm.toLowerCase()))
      )
    : galleries;

  // ===== EVENT HANDLERS =====
  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearchTerm(value);
    }
  };

  const handleDeleteSelected = async () => {
    if (!onDeleteSelected || selectedGalleries.length === 0) return;
    
    const confirmMessage = `Naozaj chcete vymazať ${selectedGalleries.length} ${
      selectedGalleries.length === 1 ? 'galériu' : 'galérií'
    }?`;
    
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      await onDeleteSelected(selectedGalleries);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateSelected = async () => {
    if (!onDuplicateSelected || selectedGalleries.length === 0) return;

    setIsDuplicating(true);
    try {
      await onDuplicateSelected(selectedGalleries);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleGalleryClick = (galleryId: string) => {
    if (onEditGallery) {
      onEditGallery(galleryId);
    }
  };

  const handleGallerySelect = (galleryId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Zastavíme propagáciu aby sa neotvárala galéria
    if (onGallerySelect) {
      const isSelected = selectedGalleries.includes(galleryId);
      onGallerySelect(galleryId, !isSelected);
    }
  };

  // ===== UTILITY FUNCTIONS =====
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  const getImageUrl = (gallery: Gallery): string => {
    if (gallery.nahladovy_obrazok) {
      // Ak cesta začína s http, použijeme ju priamo
      if (gallery.nahladovy_obrazok.startsWith('http')) {
        return gallery.nahladovy_obrazok;
      }
      // Ak cesta začína s /, pridáme len backend URL
      if (gallery.nahladovy_obrazok.startsWith('/')) {
        return souborUrl(gallery.nahladovy_obrazok);
      }
      // Inak pridáme celú cestu
      return souborUrl(gallery.nahladovy_obrazok);
    }
    
    // Fallback placeholder - použijeme jednoduchý SVG bez textu
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="#f3f4f6"/>
        <g transform="translate(200,200)">
          <g transform="translate(-50,-50)">
            <rect x="10" y="10" width="80" height="60" fill="#d1d5db" rx="4"/>
            <circle cx="25" cy="25" r="5" fill="#9ca3af"/>
            <path d="M15 45 L35 25 L50 40 L65 30 L85 50 L85 60 L15 60 Z" fill="#9ca3af"/>
          </g>
        </g>
      </svg>
    `;
    
    // Použijeme URL encoding - bezpečnejšie pre všetky znaky
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  };

  // ===== RENDER FUNCTIONS =====
  const renderGalleryCard = (gallery: GalleryWithStats) => {
    const isSelected = selectedGalleries.includes(gallery.id.toString());
    const imageUrl = getImageUrl(gallery);
    const totalViews = gallery.stats?.celkovo_zobrazeni || 0;

    return (
      <div
        key={gallery.id}
        className={`GalleryTableCard ${isSelected ? 'GalleryTableCard--selected' : ''}`}
        onClick={() => handleGalleryClick(gallery.id.toString())}
      >
        {/* Checkbox pre výber */}
        {onGallerySelect && (
          <div className="GalleryTableCard__checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleGallerySelect(gallery.id.toString(), e as any)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Náhľadový obrázok s gradientom */}
        <div 
          className="GalleryTableCard__image"
          style={{
            backgroundImage: `
              linear-gradient(180deg, rgba(0, 0, 0, 0.00) 0%, rgba(230, 241, 253, 0.95) 100%), 
              url(${imageUrl})
            `
          }}
        >
          {/* Obsah karty */}
          <div className="GalleryTableCard__content">
            {/* Počet zobrazení - teraz hore */}
            <div className="GalleryTableCard__views">
              <div className="GalleryTableCard__viewsIcon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="GalleryTableCard__viewsText">
                {formatNumber(totalViews)}
              </span>
            </div>

            {/* Názov galérie */}
            <div className="GalleryTableCard__title">
              <h3>{gallery.nazov}</h3>
            </div>

            {/* Počet fotiek - teraz s veľkým fontom */}
            <div className="GalleryTableCard__photos">
              <div className="GalleryTableCard__photosIcon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 13 13" fill="none">
                  <path d="M10.5469 1.95312H3.51562C3.30842 1.95313 3.10971 2.03543 2.9632 2.18195C2.81668 2.32846 2.73438 2.52717 2.73438 2.73438V3.51562H1.95312C1.74592 3.51562 1.54721 3.59794 1.4007 3.74445C1.25418 3.89096 1.17188 4.08967 1.17188 4.29688V9.76562C1.17188 9.97283 1.25418 10.1715 1.4007 10.3181C1.54721 10.4646 1.74592 10.5469 1.95312 10.5469H8.98438C9.19158 10.5469 9.39029 10.4646 9.5368 10.3181C9.68332 10.1715 9.76562 9.97283 9.76562 9.76562V8.98438H10.5469C10.7541 8.98438 10.9528 8.90206 11.0993 8.75555C11.2458 8.60904 11.3281 8.41033 11.3281 8.20312V2.73438C11.3281 2.52717 11.2458 2.32846 11.0993 2.18195C10.9528 2.03543 10.7541 1.95313 10.5469 1.95312ZM3.51562 2.73438H10.5469V5.79834L10.0552 5.30713C9.98263 5.23456 9.8965 5.177 9.8017 5.13773C9.7069 5.09846 9.6053 5.07824 9.50269 5.07824C9.40008 5.07824 9.29847 5.09846 9.20367 5.13773C9.10888 5.177 9.02274 5.23456 8.9502 5.30713L7.97363 6.28369L5.8252 4.13525C5.6787 3.98885 5.48006 3.90661 5.27295 3.90661C5.06584 3.90661 4.8672 3.98885 4.7207 4.13525L3.51562 5.34033V2.73438ZM8.98438 9.76562H1.95312V4.29688H2.73438V8.20312C2.73438 8.41033 2.81668 8.60904 2.9632 8.75555C3.10971 8.90206 3.30842 8.98438 3.51562 8.98438H8.98438V9.76562ZM10.5469 8.20312H3.51562V6.44531L5.27344 4.6875L7.69824 7.1123C7.77149 7.18551 7.87081 7.22663 7.97437 7.22663C8.07792 7.22663 8.17724 7.18551 8.25049 7.1123L9.50342 5.85938L10.5469 6.90332V8.20312ZM7.8125 4.10156C7.8125 3.98568 7.84686 3.87239 7.91125 3.77603C7.97563 3.67968 8.06714 3.60458 8.17421 3.56023C8.28128 3.51588 8.39909 3.50428 8.51275 3.52688C8.62641 3.54949 8.73081 3.6053 8.81276 3.68724C8.8947 3.76919 8.95051 3.87359 8.97312 3.98725C8.99573 4.10091 8.98412 4.21872 8.93977 4.32579C8.89542 4.43286 8.82032 4.52437 8.72397 4.58875C8.62761 4.65314 8.51433 4.6875 8.39844 4.6875C8.24304 4.6875 8.094 4.62577 7.98412 4.51588C7.87423 4.406 7.8125 4.25696 7.8125 4.10156Z" fill="#1C1C1C"/>
                </svg>
              </div>
              <span className="GalleryTableCard__photosCount">
                {gallery.pocet_obrazkov}
              </span>
              <span className="GalleryTableCard__photosLabel">fotiek</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <div className={`GalleryTableContainer ${className}`}>
        <div className="GalleryTableLoading">
          🖼️ Načítavam galérie...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`GalleryTableContainer ${className}`}>
        <div className="GalleryTableError">
          ❌ Chyba: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`GalleryTableContainer ${className}`}>
      {/* Filter Menu - použitá štruktúra z Table.tsx */}
      <div className="table-filter-menu">
        <div className="table-filter-left">
          {/* Add Gallery Button */}
          {onAddGallery && (
            <button 
              className="filter-action-item" 
              title="Pridať Galériu" 
              onClick={onAddGallery}
            >
              <svg width="22" height="22" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="10"/>
                <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="10"/>
              </svg>
            </button>
          )}

          {/* Info o vyhľadávaní */}
          {displaySearchTerm && (
            <>
              <div className="filter-divider"></div>
              <span className="search-results-info">
                {filteredGalleries.length} výsledkov pre "{displaySearchTerm}"
              </span>
              <button 
                className="filter-action-item" 
                title="Vymazať vyhľadávanie"
                onClick={() => handleSearchChange('')} 
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}

          {/* Selected Actions */}
          {selectedCount > 0 && (
            <>
              <div className="filter-divider"></div>
              <span className="selected-count">{selectedCount} označených</span>
              
              {onDeleteSelected && (
                <button 
                  className={`filter-action-item ${isDeleting ? 'loading' : ''}`} 
                  title="Vymazať označené"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4H14M5.5 4V3C5.5 2.44772 5.94772 2 6.5 2H9.5C10.0523 2 10.5 2.44772 10.5 3V4M6.5 7V12M9.5 7V12M4 4V13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              
              {onDuplicateSelected && (
                <button 
                  className={`filter-action-item ${isDuplicating ? 'loading' : ''}`} 
                  title="Duplikovať označené"
                  onClick={handleDuplicateSelected}
                  disabled={isDuplicating}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 9H3C2.44772 9 2 8.55228 2 8V3C2 2.44772 2.44772 2 3 2H8C8.55228 2 9 2.44772 9 3V4M8 7H13C13.5523 7 14 7.44772 14 8V13C14 13.5523 13.5523 14 13 14H8C7.44772 14 7 13.5523 7 13V8C7 7.44772 7.44772 7 8 7Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
        
        <div className="table-filter-right">
          <div className="table-search-container">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="search-icon">
              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 14L10.6 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Hľadať galérie..."
              className="table-search-input"
              value={displaySearchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {displaySearchTerm && (
              <button
                className="search-clear-button"
                onClick={() => handleSearchChange('')}
                title="Vymazać vyhľadávanie"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="GalleryTableGrid">
        {filteredGalleries.length === 0 ? (
          <div className="GalleryTableEmpty">
            {displaySearchTerm ? (
              <>
                <p>Nenašli sa žiadne galérie pre "{displaySearchTerm}"</p>
                <button onClick={() => handleSearchChange('')}>
                  Vymazať vyhľadávanie
                </button>
              </>
            ) : (
              <p>Žiadne galérie neboli nájdené.</p>
            )}
          </div>
        ) : (
          filteredGalleries.map(renderGalleryCard)
        )}
      </div>
    </div>
  );
};

export default GalleryTable;