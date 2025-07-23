// SortPopup.tsx
// Umiestnenie: frontend/src/components/ui/table/SortPopup.tsx
// Popup komponent pre sorting možnosti tabuľky

import React, { useState, useRef, useEffect } from 'react';
import { TableColumn } from './Table';

// Interface pre sorting stav
export interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

// Props pre SortPopup komponent
export interface SortPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  columns: TableColumn[];
  currentSort: SortState | null;
  onApplySort: (sortState: SortState | null) => void;
}

const SortPopup: React.FC<SortPopupProps> = ({
  isOpen,
  onClose,
  position,
  columns,
  currentSort,
  onApplySort
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // Zatvorenie popup-u pri kliknutí mimo neho
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Zatvorenie popup-u pri stlačení ESC
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Filter sortable columns based on search term
  const filteredColumns = columns.filter(column => {
    // Zobrazujeme len sortable stĺpce (nie checkbox a actions)
    if (column.type === 'checkbox' || column.type === 'actions') return false;
    if (column.sortable === false) return false;
    
    if (!searchTerm) return true;

    const columnName = column.header.toLowerCase();
    const searchValue = searchTerm.toLowerCase();
    
    return columnName.includes(searchValue);
  });

  // Handler pre kliknutie na stĺpec pre sorting
  const handleColumnSort = (columnId: string, direction: 'asc' | 'desc') => {
    const newSortState: SortState = {
      columnId,
      direction
    };
    onApplySort(newSortState);
    onClose();
  };

  // Handler pre vymazanie sortingu
  const handleClearSort = () => {
    onApplySort(null);
    onClose();
  };

  // Zistenie, či je stĺpec aktuálne sortovaný
  const isColumnSorted = (columnId: string): { sorted: boolean; direction?: 'asc' | 'desc' } => {
    if (!currentSort || currentSort.columnId !== columnId) {
      return { sorted: false };
    }
    return { sorted: true, direction: currentSort.direction };
  };

  // Ak nie je otvorený, nerenduj nič
  if (!isOpen) return null;

  return (
    <div 
      ref={popupRef}
      className="filter-popup" // Použijeme rovnaké CSS triedy ako FilterPopup
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      {/* Search Input */}
      <div className="filter-popup-header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="search-icon-filter">
          <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 14L10.6 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          type="text"
          placeholder="Hľadať stĺpce..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-popup-search"
          autoFocus
        />
      </div>

      {/* Column List */}
      <div className="filter-popup-results">
        <div className="filter-popup-results-list">
          {/* Clear sort option */}
          {currentSort && (
            <>
              <div 
                className="filter-result-item sort-clear-item"
                onClick={handleClearSort}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="sort-clear-icon">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="filter-result-text">Vymazať sorting</span>
              </div>
              <div className="sort-divider"></div>
            </>
          )}

          {filteredColumns.length > 0 ? (
            filteredColumns.map((column) => {
              const sortState = isColumnSorted(column.id);
              
              return (
                <div key={column.id} className="sort-column-group">
                  {/* Column header */}
                  <div className="sort-column-header">
                    <span className="filter-result-text">{column.header}</span>
                    {sortState.sorted && (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="current-sort-icon">
                        <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  
                  {/* Sort options for this column */}
                  <div className="sort-options">
                    <div 
                      className={`sort-option ${sortState.sorted && sortState.direction === 'asc' ? 'active' : ''}`}
                      onClick={() => handleColumnSort(column.id, 'asc')}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="sort-icon">
                        <path d="M8 4L4 8H12L8 4Z" fill="currentColor"/>
                      </svg>
                      <span className="sort-option-text">Vzostupne (A-Z)</span>
                    </div>
                    
                    <div 
                      className={`sort-option ${sortState.sorted && sortState.direction === 'desc' ? 'active' : ''}`}
                      onClick={() => handleColumnSort(column.id, 'desc')}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="sort-icon">
                        <path d="M8 12L12 8H4L8 12Z" fill="currentColor"/>
                      </svg>
                      <span className="sort-option-text">Zostupne (Z-A)</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="filter-no-results">Žiadne sortovateľné stĺpce</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SortPopup;