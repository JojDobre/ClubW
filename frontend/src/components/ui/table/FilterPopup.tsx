// OPRAVENÝ FilterPopup.tsx - KOMPLETNE FUNKČNÝ
// Umiestnenie: frontend/src/components/ui/table/FilterPopup.tsx

import React, { useState, useRef, useEffect } from 'react';
import { TableColumn, TableData } from './Table';

// ===== INTERFACES =====

export interface ColumnFilterState {
  columnId: string;
  visible: boolean;
}

export interface StatusFilter {
  value: string;
  enabled: boolean;
}

export interface CategoryFilter {
  categoryId: string;
  categoryName: string;
  enabled: boolean;
}

export interface DateRangeFilter {
  enabled: boolean;
  startDate: string;
  endDate: string;
  column: string;
}

export interface UserFilter {
  userId: string;
  userName: string;
  enabled: boolean;
}

export interface AdvancedFilters {
  columnVisibility: ColumnFilterState[];
  statusFilters: StatusFilter[];
  categoryFilters: CategoryFilter[];
  dateRangeFilter: DateRangeFilter | null;
  userFilters: UserFilter[];
}

// OPRAVENÝ interface
export interface FilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  columns: TableColumn[];
  data: TableData[];
  columnVisibility: ColumnFilterState[];
  currentFilters: AdvancedFilters;
  onApplyFilter: (filters: AdvancedFilters) => void;
  enableAdvancedFilters?: boolean; // PRIDANÉ
  customLabels?: {
    categories?: string;
    status?: string;
    users?: string;
    dates?: string;
  };
}

// ===== MAIN COMPONENT =====
const FilterPopup: React.FC<FilterPopupProps> = ({
  isOpen,
  onClose,
  position,
  columns,
  data,
  columnVisibility,
  currentFilters,
  onApplyFilter,
  enableAdvancedFilters = false, // PRIDANÉ s default hodnotou
  customLabels = {}
}) => {
  // ===== STATE =====
  const [activeTab, setActiveTab] = useState<'columns' | 'status' | 'categories' | 'dates' | 'users'>('columns');
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(currentFilters);
  const popupRef = useRef<HTMLDivElement>(null);

  // ===== LIFECYCLE =====
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(currentFilters);
      setSearchTerm('');
      // Nastav default tab na prvý dostupný
      const availableTabs = getAvailableFilterTabs();
      if (availableTabs.length > 0) {
        setActiveTab(availableTabs[0].id);
      }
    }
  }, [isOpen, currentFilters]);

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

  // ===== DATA ANALYSIS =====
  
  const getAvailableStatuses = (): StatusFilter[] => {
    const statusValues = new Set<string>();
    
    columns.forEach(column => {
      if (column.type === 'status') {
        data.forEach(row => {
          const value = row[column.id];
          if (value && typeof value === 'string') {
            statusValues.add(value);
          }
        });
      }
    });

    return Array.from(statusValues).map(status => ({
      value: status,
      enabled: localFilters.statusFilters.find(f => f.value === status)?.enabled || false
    }));
  };

  const getAvailableCategories = (): CategoryFilter[] => {
    const categories = new Map<string, { id: string; name: string }>();
    
    data.forEach(row => {
      if (row.kategoria && typeof row.kategoria === 'object') {
        const id = row.kategoria.id?.toString() || row.kategoria_id?.toString() || '';
        const name = row.kategoria.nazov || row.kategoria_nazov || '';
        
        if (id && name) {
          categories.set(id, { id, name }); // ✅ Set automaticky deduplikuje podľa kľúča
        }
      }
      if (row.kategoria_nazov && row.kategoria_id) {
        const id = row.kategoria_id?.toString() || '';
        const name = row.kategoria_nazov;
        
        if (id && name) {
          categories.set(id, { id, name });
        }
      }
    });

    return Array.from(categories.values()).map(cat => ({
      categoryId: cat.id,
      categoryName: cat.name,
      enabled: localFilters.categoryFilters.find(f => f.categoryId === cat.id)?.enabled || false
    }));
  };

  const getAvailableUsers = (): UserFilter[] => {
    const users = new Set<{ id: string; name: string }>();
    
    data.forEach(row => {
      if (row.autor && typeof row.autor === 'object') {
        users.add({
          id: row.autor.id?.toString() || '',
          name: row.autor.meno || row.autor.name || ''
        });
      }
    });

    return Array.from(users).filter(user => user.name).map(user => ({
      userId: user.id,
      userName: user.name,
      enabled: localFilters.userFilters.find(f => f.userId === user.id)?.enabled || false
    }));
  };

  const getDateColumns = () => {
    return columns.filter(col => col.type === 'date' || 
      col.id.includes('datum') || 
      col.id.includes('vytvoreny') || 
      col.id.includes('aktualizovany')
    );
  };

  // ===== HANDLERS =====

  const handleColumnToggle = (columnId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      columnVisibility: prev.columnVisibility.map(col => 
        col.columnId === columnId 
          ? { ...col, visible: !col.visible }
          : col
      )
    }));
  };

  const handleStatusToggle = (statusValue: string) => {
    const currentStatuses = getAvailableStatuses();
    const updatedStatuses = currentStatuses.map(status =>
      status.value === statusValue
        ? { ...status, enabled: !status.enabled }
        : status
    );
    
    setLocalFilters(prev => ({
      ...prev,
      statusFilters: updatedStatuses
    }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    const currentCategories = getAvailableCategories();
    const updatedCategories = currentCategories.map(category =>
      category.categoryId === categoryId
        ? { ...category, enabled: !category.enabled }
        : category
    );
    
    setLocalFilters(prev => ({
      ...prev,
      categoryFilters: updatedCategories
    }));
  };

  const handleUserToggle = (userId: string) => {
    const currentUsers = getAvailableUsers();
    const updatedUsers = currentUsers.map(user =>
      user.userId === userId
        ? { ...user, enabled: !user.enabled }
        : user
    );
    
    setLocalFilters(prev => ({
      ...prev,
      userFilters: updatedUsers
    }));
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate' | 'column', value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      dateRangeFilter: prev.dateRangeFilter 
        ? { ...prev.dateRangeFilter, [field]: value }
        : { enabled: true, startDate: '', endDate: '', column: '', [field]: value }
    }));
  };

  const handleDateRangeToggle = () => {
    setLocalFilters(prev => ({
      ...prev,
      dateRangeFilter: prev.dateRangeFilter 
        ? { ...prev.dateRangeFilter, enabled: !prev.dateRangeFilter.enabled }
        : { enabled: true, startDate: '', endDate: '', column: getDateColumns()[0]?.id || '' }
    }));
  };

  // OPRAVENÁ handleApplyFilter funkcia
  const handleApplyFilter = () => {
    if (enableAdvancedFilters) {
      // Advanced mode - pošli kompletné filtre
      onApplyFilter(localFilters);
    } else {
      // Simple mode - pošli len column visibility ako súčasť AdvancedFilters
      const simpleFilters: AdvancedFilters = {
        ...currentFilters,
        columnVisibility: localFilters.columnVisibility
      };
      onApplyFilter(simpleFilters);
    }
    
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters: AdvancedFilters = {
      columnVisibility: columns.map(col => ({ columnId: col.id, visible: true })),
      statusFilters: [],
      categoryFilters: [],
      userFilters: [],
      dateRangeFilter: null
    };
    setLocalFilters(clearedFilters);
  };


  // ===== DYNAMICKÁ DETEKCIA DOSTUPNÝCH FILTROV =====
  const getAvailableFilterTabs = () => {
    const availableTabs: Array<{
      id: 'columns' | 'status' | 'categories' | 'dates' | 'users',
      label: string,
      icon: React.ReactNode,
      hasData: boolean
    }> = [
      {
        id: 'columns',
        label: 'Stĺpce',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H2V14H6V2Z" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M14 2H10V14H14V2Z" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        ),
        hasData: true // stĺpce má vždy
      }
    ];

    // Kontrola či má tabuľka status stĺpce
    const hasStatusColumns = columns.some(col => col.type === 'status');
    if (hasStatusColumns) {
      availableTabs.push({
        id: 'status',
        label: customLabels.status || 'Status',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="8" cy="8" r="2" fill="currentColor"/>
          </svg>
        ),
        hasData: getAvailableStatuses().length > 0
      });
    }

    // Kontrola či má tabuľka kategórie (v dátach)
    const hasCategories = data.some(row => 
      row.kategoria || row.kategoria_nazov || row.kategoria_id
    );
    if (hasCategories) {

      // Dynamicky zisti label z prvej kategórie alebo použij default
      const firstCategoryRow = data.find(row => row.kategoria?.nazov || row.kategoria_nazov);
      const categoryType = firstCategoryRow?.kategoria?.nazov || firstCategoryRow?.kategoria_nazov || '';
      
      // Ak je to typ tímu, použi "Typ", inak "Kategórie"
      const isTeamType = ['Muži', 'Ženy', 'Mládež', 'muzi', 'zeny', 'mladez'].some(type => 
        categoryType.toLowerCase().includes(type.toLowerCase())
      );

      availableTabs.push({
        id: 'categories',
        label: customLabels.categories || 'Kategórie',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 3H14V13H2V3Z" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M2 7H14" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        ),
        hasData: getAvailableCategories().length > 0
      });
    }

    // Kontrola či má tabuľka dátumové stĺpce
    const hasDateColumns = columns.some(col => 
      col.type === 'date' || 
      col.id.includes('datum') || 
      col.id.includes('vytvoreny') || 
      col.id.includes('aktualizovany')
    );
    if (hasDateColumns) {
      availableTabs.push({
        id: 'dates',
        label: customLabels.dates || 'Dátumy',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M5 1V5M11 1V5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        ),
        hasData: getDateColumns().length > 0
      });
    }

    // Kontrola či má tabuľka používateľov/autorov
    const hasUsers = data.some(row => 
      row.autor || row.uzivatel || row.user
    );
    if (hasUsers) {
      availableTabs.push({
        id: 'users',
        label: customLabels.users || 'Autori',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M2 13C2 10.7909 4.79086 9 8 9C11.2091 9 14 10.7909 14 13" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        ),
        hasData: getAvailableUsers().length > 0
      });
    }

    return availableTabs;
};

  // ===== RENDER HELPERS =====

  const renderTabButton = (tabId: typeof activeTab, label: string, icon: React.ReactNode) => (
    <button
      className={`filter-tab-button ${activeTab === tabId ? 'active' : ''}`}
      onClick={() => setActiveTab(tabId)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const renderColumnsTab = () => {
    const filteredColumns = columns.filter(column => {
      if (column.type === 'checkbox' || column.type === 'actions') return false;
      if (!searchTerm) return true;
      return column.header.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
      <div className="filter-tab-content">
        {filteredColumns.map((column) => (
          <div 
            key={column.id} 
            className="filter-result-item"
            onClick={() => handleColumnToggle(column.id)}
          >
            <span className="filter-result-text">{column.header}</span>
            {localFilters.columnVisibility.find(col => col.columnId === column.id)?.visible && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="check-icon">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStatusTab = () => {
    const statuses = getAvailableStatuses();
    
    if (statuses.length === 0) {
      return (
        <div className="filter-tab-content">
          <div className="filter-no-results">Žiadne status hodnoty</div>
        </div>
      );
    }

    return (
      <div className="filter-tab-content">
        {statuses.map((status) => (
          <div 
            key={status.value} 
            className="filter-result-item"
            onClick={() => handleStatusToggle(status.value)}
          >
            <span className="filter-result-text">{status.value}</span>
            {status.enabled && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="check-icon">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderCategoriesTab = () => {
    const categories = getAvailableCategories();
    
    if (categories.length === 0) {
      return (
        <div className="filter-tab-content">
          <div className="filter-no-results">Žiadne kategórie</div>
        </div>
      );
    }

    return (
      <div className="filter-tab-content">
        {categories.map((category) => (
          <div 
            key={category.categoryId} 
            className="filter-result-item"
            onClick={() => handleCategoryToggle(category.categoryId)}
          >
            <span className="filter-result-text">{category.categoryName}</span>
            {category.enabled && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="check-icon">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderDatesTab = () => {
    const dateColumns = getDateColumns();
    
    if (dateColumns.length === 0) {
      return (
        <div className="filter-tab-content">
          <div className="filter-no-results">Žiadne dátumové stĺpce</div>
        </div>
      );
    }

    return (
      <div className="filter-tab-content">
        <div className="filter-section">
          <div className="filter-section-header">
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={localFilters.dateRangeFilter?.enabled || false}
                onChange={handleDateRangeToggle}
              />
              <span>Filtrovať podľa dátumu</span>
            </label>
          </div>
          
          {localFilters.dateRangeFilter?.enabled && (
            <div className="filter-section-content">
              <div className="date-filter-group">
                <label>Stĺpec:</label>
                <select
                  value={localFilters.dateRangeFilter.column}
                  onChange={(e) => handleDateRangeChange('column', e.target.value)}
                  className="date-filter-select"
                >
                  {dateColumns.map(col => (
                    <option key={col.id} value={col.id}>{col.header}</option>
                  ))}
                </select>
              </div>
              
              <div className="date-filter-group">
                <label>Od:</label>
                <input
                  type="date"
                  value={localFilters.dateRangeFilter.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  className="date-filter-input"
                />
              </div>
              
              <div className="date-filter-group">
                <label>Do:</label>
                <input
                  type="date"
                  value={localFilters.dateRangeFilter.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  className="date-filter-input"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderUsersTab = () => {
    const users = getAvailableUsers();
    
    if (users.length === 0) {
      return (
        <div className="filter-tab-content">
          <div className="filter-no-results">Žiadni používatelia</div>
        </div>
      );
    }

    return (
      <div className="filter-tab-content">
        {users.map((user) => (
          <div 
            key={user.userId} 
            className="filter-result-item"
            onClick={() => handleUserToggle(user.userId)}
          >
            <span className="filter-result-text">{user.userName}</span>
            {user.enabled && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="check-icon">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={popupRef}
      className={`filter-popup ${enableAdvancedFilters ? 'advanced-filter-popup' : ''}`}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      {/* Header s vyhľadávaním */}
      <div className="filter-popup-header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="search-icon-filter">
          <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 14L10.6 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          type="text"
          placeholder="Hľadať..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-popup-search"
          autoFocus
        />
      </div>

      {/* Tabs - len ak je advanced mode */}
      {enableAdvancedFilters && (
        <div className="filter-tabs">
          {getAvailableFilterTabs().map(tab => (
            <button
              key={tab.id}
              className={`filter-tab-button ${activeTab === tab.id ? 'active' : ''} ${!tab.hasData ? 'disabled' : ''}`}
              onClick={() => tab.hasData && setActiveTab(tab.id)}
              disabled={!tab.hasData}
              title={!tab.hasData ? 'Nie sú dostupné dáta pre tento filter' : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="filter-popup-results">
        {enableAdvancedFilters ? (
          // Advanced mode - zobraz tabs
          <>
            {activeTab === 'columns' && renderColumnsTab()}
            {activeTab === 'status' && renderStatusTab()}
            {activeTab === 'categories' && renderCategoriesTab()}
            {activeTab === 'dates' && renderDatesTab()}
            {activeTab === 'users' && renderUsersTab()}
          </>
        ) : (
          // Simple mode - len columns
          renderColumnsTab()
        )}
      </div>

      {/* Footer */}
      <div className="filter-popup-footer">
        {enableAdvancedFilters && (
          <button 
            className="filter-clear-button"
            onClick={handleClearFilters}
          >
            Vymazať všetko
          </button>
        )}
        <button 
          className="filter-apply-button"
          onClick={handleApplyFilter}
        >
          {enableAdvancedFilters ? 'Aplikovať filtre' : 'Apply Filter'}
        </button>
      </div>
    </div>
  );
};

export default FilterPopup;