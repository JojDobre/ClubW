// FilterPopup.tsx
import React, { useState, useRef, useEffect } from 'react';
import { TableColumn } from './Table';

export interface ColumnFilterState {
  columnId: string;
  visible: boolean;
}

export interface FilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  columns: TableColumn[];
  columnVisibility: ColumnFilterState[];
  onApplyFilter: (columnVisibility: ColumnFilterState[]) => void;
}

const FilterPopup: React.FC<FilterPopupProps> = ({
  isOpen,
  onClose,
  position,
  columns,
  columnVisibility,
  onApplyFilter
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localColumnVisibility, setLocalColumnVisibility] = useState<ColumnFilterState[]>(columnVisibility);
  const popupRef = useRef<HTMLDivElement>(null);

  // Sync with parent state when popup opens
  useEffect(() => {
    if (isOpen) {
      setLocalColumnVisibility(columnVisibility);
    }
  }, [isOpen, columnVisibility]);

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

  // Filter columns based on search term
  const filteredColumns = columns.filter(column => {
    // Skip checkbox and actions columns
    if (column.type === 'checkbox' || column.type === 'actions') return false;
    
    if (!searchTerm) return true;

    const columnName = column.header.toLowerCase();
    const searchValue = searchTerm.toLowerCase();
    
    return columnName.includes(searchValue);
  });

  const handleColumnToggle = (columnId: string) => {
    setLocalColumnVisibility(prev => 
      prev.map(col => 
        col.columnId === columnId 
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  };

  const handleApplyFilter = () => {
    onApplyFilter(localColumnVisibility);
    onClose();
  };

  const isColumnVisible = (columnId: string): boolean => {
    const columnState = localColumnVisibility.find(col => col.columnId === columnId);
    return columnState?.visible ?? true;
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={popupRef}
      className="filter-popup"
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
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-popup-search"
          autoFocus
        />
      </div>

      {/* Column List */}
      <div className="filter-popup-results">
        <div className="filter-popup-results-list">
          {filteredColumns.length > 0 ? (
            filteredColumns.map((column) => (
              <div 
                key={column.id} 
                className="filter-result-item"
                onClick={() => handleColumnToggle(column.id)}
              >

                <span className="filter-result-text">{column.header}</span>
                {isColumnVisible(column.id) && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="check-icon">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            ))
          ) : (
            <div className="filter-no-results">No columns found</div>
          )}
        </div>
      </div>

      {/* Apply Button */}
      <div className="filter-popup-footer">
        <button 
          className="filter-apply-button"
          onClick={handleApplyFilter}
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
};

export default FilterPopup;