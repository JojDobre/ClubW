// ===== CELÝ OPRAVENÝ Table.tsx =====
// Ak chceš, tu je kompletný funkčný Table.tsx:

// Table.tsx
import React, { useState, useRef, useEffect } from 'react';
import AddUserModal, { UserFormData } from './AddUserModal';
import FilterPopup, { ColumnFilterState, AdvancedFilters, StatusFilter, CategoryFilter, DateRangeFilter, UserFilter } from './FilterPopup';
import ActionsPopup, { ActionItem } from './ActionsPopup';
import SortPopup, { SortState } from './SortPopup';

export interface TableColumn {
  id: string;
  header: string;
  type: 'checkbox' | 'user' | 'text' | 'status' | 'date' | 'actions';
  width?: string;
  sortable?: boolean;
}

export interface TableData {
  id: string;
  [key: string]: any;
}

export interface TableProps {
  columns: TableColumn[];
  data: TableData[];
  showCheckboxes?: boolean;
  itemsPerPage?: number;
  className?: string;
  onAddUser?: (userData: UserFormData) => void;

  onAddArticle?: () => void;
  onAddCategory?: () => void;
  onAddPage?: () => void; 
  onAddTeam?: () => void;
  onRowClick?: (rowId: string) => void;

  serverSidePagination?: boolean;
  paginationData?: PaginationData;
  onPageChange?: (page: number) => void;

  onDeleteSelected?: (selectedIds: string[]) => void;
  onDuplicateSelected?: (selectedIds: string[]) => void;

  onSearchChange?: (searchTerm: string) => void;
  searchTerm?: string; 

  onDeleteRow?: (rowId: string) => void;
  onDuplicateRow?: (rowId: string) => void;
  onEditRow?: (rowId: string) => void;

  enableAdvancedFilters?: boolean; 
  onFiltersChange?: (filters: AdvancedFilters) => void; 
  filterCustomLabels?: {  
    categories?: string;
    status?: string;
    users?: string;
    dates?: string;
  };
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  showCheckboxes = true,
  itemsPerPage = 10,
  className = '',
  onAddUser,
  onAddArticle,
  onAddCategory,
  onAddPage,
  onAddTeam,

  serverSidePagination = false,
  paginationData,
  onPageChange,

  onDeleteSelected,
  onDuplicateSelected,
  onDeleteRow,       
  onDuplicateRow,    
  onEditRow,         
  onRowClick, 

  onSearchChange,
  searchTerm: externalSearchTerm,

  enableAdvancedFilters = false,
  onFiltersChange,
  filterCustomLabels,

}) => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filteredData, setFilteredData] = useState<TableData[]>(data);
  const [internalSearchTerm, setInternalSearchTerm] = useState(''); 
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionsPopupOpen, setActionsPopupOpen] = useState(false);
  const [actionsPopupPosition, setActionsPopupPosition] = useState({ top: 0, left: 0 });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const [isSortPopupOpen, setIsSortPopupOpen] = useState(false);
  const [sortPopupPosition, setSortPopupPosition] = useState({ top: 0, left: 0 });
  const [currentSort, setCurrentSort] = useState<SortState | null>(null);

  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const isServerSideSearch = externalSearchTerm !== undefined;

  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [filterPopupPosition, setFilterPopupPosition] = useState({ top: 0, left: 0 });
  
  const [columnVisibility, setColumnVisibility] = useState<ColumnFilterState[]>(
    columns.map(column => ({
      columnId: column.id,
      visible: true
    }))
  );

  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    columnVisibility: columns.map(column => ({
      columnId: column.id,
      visible: true
    })),
    statusFilters: [],
    categoryFilters: [],
    dateRangeFilter: null,
    userFilters: []
  });
  
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  // Get visible columns
  const visibleColumns = columns.filter(column => {
    if (column.type === 'checkbox' || column.type === 'actions') return true;
    const columnState = columnVisibility.find(col => col.columnId === column.id);
    return columnState?.visible ?? true;
  });

  // Calculations
  const dataToUse = serverSidePagination ? data : filteredData;
  const totalPages = serverSidePagination && paginationData 
    ? paginationData.totalPages 
    : Math.ceil(dataToUse.length / itemsPerPage);
  const currentPageNumber = serverSidePagination && paginationData 
    ? paginationData.currentPage 
    : currentPage;
  const currentData = serverSidePagination ? data : dataToUse.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  const totalItems = serverSidePagination && paginationData 
    ? paginationData.totalItems 
    : dataToUse.length;
  const startIndex = serverSidePagination && paginationData 
    ? (paginationData.currentPage - 1) * itemsPerPage
    : (currentPage - 1) * itemsPerPage;
  const endIndex = serverSidePagination && paginationData 
    ? Math.min(startIndex + data.length, totalItems)
    : Math.min(startIndex + itemsPerPage, totalItems);

  // Handlers
  const handleRowClick = (rowId: string, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.closest('.table-cell-checkbox') ||
      target.closest('.checkbox-cell') || 
      target.closest('.table-checkbox') ||
      target.closest('input[type="checkbox"]') ||

      target.closest('.table-cell-actions') ||
      target.closest('.table-action-button') ||
      target.closest('.actions-popup') ||
      target.closest('.actions-popup-item') ||

      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||

      // Špecifické triedy pre akcie
      target.classList.contains('table-action-button') ||
      target.classList.contains('table-checkbox') ||
      target.classList.contains('checkbox-cell') ||
      
      // Ak má element onclick handler (pravdepodobne je to interaktívny element)
      target.onclick !== null ||
      
      // Ak má element cursor: pointer (pravdepodobne je to klikateľný element)
      window.getComputedStyle(target).cursor === 'pointer' 
    ) {
      return;
    }
    if (onRowClick) {
      onRowClick(rowId);
    }
  };

  const handleActionsClick = (event: React.MouseEvent, rowId: string) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setActionsPopupPosition({
      top: rect.bottom + 4,
      left: rect.left - 180
    });
    setSelectedRowId(rowId);
    setActionsPopupOpen(true);
  };

  const handleEditRow = (rowId: string) => {
    if (onEditRow) {
      onEditRow(rowId);
    }
    setActionsPopupOpen(false);
  };

  const handleDuplicateRow = async (rowId: string) => {
    if (onDuplicateRow) {
      onDuplicateRow(rowId);
    } else if (onDuplicateSelected) {
      setIsDuplicating(true);
      try {
        await onDuplicateSelected([rowId]);
      } catch (error) {
        console.error('Chyba pri duplikovaní riadku:', error);
      } finally {
        setIsDuplicating(false);
      }
    }
    setActionsPopupOpen(false);
  };

  const handleDeleteRow = async (rowId: string) => {
    if (onDeleteRow) {
      onDeleteRow(rowId);
    } else if (onDeleteSelected) {
      setIsDeleting(true);
      try {
        await onDeleteSelected([rowId]);
      } catch (error) {
        console.error('Chyba pri mazaní riadku:', error);
      } finally {
        setIsDeleting(false);
      }
    }
    setActionsPopupOpen(false);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === currentData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentData.map(row => row.id));
    }
  };

  const handleSelectRow = (rowId: string) => {
    setSelectedRows(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId)
        : [...prev, rowId]
    );
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    if (serverSidePagination && onPageChange) {
      onPageChange(page);
    } else {
      setCurrentPage(page);
    }
  };

  const handleDeleteSelected = async () => {
    if (!onDeleteSelected || selectedRows.length === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteSelected(selectedRows);
      setSelectedRows([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Chyba pri mazaní:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateSelected = async () => {
    if (!onDuplicateSelected || selectedRows.length === 0) return;
    setIsDuplicating(true);
    try {
      await onDuplicateSelected(selectedRows);
      setSelectedRows([]);
    } catch (error) {
      console.error('Chyba pri duplikovaní:', error);
    } finally {
      setIsDuplicating(false);
    }
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(true);
  };

  const filterData = (data: TableData[], searchTerm: string): TableData[] => {
    if (!searchTerm.trim()) {
      return data;
    }
    const lowercaseSearch = searchTerm.toLowerCase();
    return data.filter(row => {
      return columns.some(column => {
        const value = row[column.id];
        if (value === null || value === undefined) return false;
        if (column.type === 'user' && value.name) {
          return value.name.toLowerCase().includes(lowercaseSearch);
        }
        return String(value).toLowerCase().includes(lowercaseSearch);
      });
    });
  };

  const handleAddUser = (userData: UserFormData) => {
    if (onAddUser) {
      onAddUser(userData);
    }
    setIsAddModalOpen(false);
  };

  const handleAddArticle = () => {
    if (onAddArticle) {
      onAddArticle();
    }
  };

  const handleAddPage = () => {
    if (onAddPage) {
      onAddPage();
    }
  };

  const detectModalType = () => {
    if (onAddUser) return 'user';
    if (onAddCategory) return 'category';
    if (onAddTeam) return 'team';
    return null;
  };

  const handleSortClick = () => {
    if (sortButtonRef.current) {
      const rect = sortButtonRef.current.getBoundingClientRect();
      setSortPopupPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setIsSortPopupOpen(true);
  };

  const handleApplySort = (sortState: SortState | null) => {
    setCurrentSort(sortState);
    if (sortState) {
      setSortColumn(sortState.columnId);
      setSortDirection(sortState.direction);
    } else {
      setSortColumn(null);
      setSortDirection('asc');
    }
  };

  const handleFilterClick = () => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setFilterPopupPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setIsFilterPopupOpen(true);
  };

  // OPRAVENÁ handleApplyAdvancedFilter funkcia
  const handleApplyAdvancedFilter = (newFilters: AdvancedFilters) => {
    console.log('Aplikujem filtre:', newFilters); // Debug log
    setAdvancedFilters(newFilters);
    setColumnVisibility(newFilters.columnVisibility);
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
    
    applyAdvancedFilters(newFilters);
  };

  const handleResetFilter = () => {
    const resetFilters: AdvancedFilters = {
      columnVisibility: columns.map(column => ({
        columnId: column.id,
        visible: true
      })),
      statusFilters: [],
      categoryFilters: [],
      dateRangeFilter: null,
      userFilters: []
    };
    setAdvancedFilters(resetFilters);
    setColumnVisibility(resetFilters.columnVisibility);
    if (onFiltersChange) {
      onFiltersChange(resetFilters);
    }
  };

  const sortData = (data: TableData[], sortCol: string | null, sortDir: 'asc' | 'desc'): TableData[] => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];

      if (typeof aVal === 'object' && aVal?.name && typeof bVal === 'object' && bVal?.name) {
        const comparison = aVal.name.localeCompare(bVal.name, 'sk', { numeric: true });
        return sortDir === 'asc' ? comparison : -comparison;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const aDate = new Date(aVal);
        const bDate = new Date(bVal);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          const comparison = aDate.getTime() - bDate.getTime();
          return sortDir === 'asc' ? comparison : -comparison;
        }
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        const comparison = aVal - bVal;
        return sortDir === 'asc' ? comparison : -comparison;
      }

      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      const comparison = aStr.localeCompare(bStr, 'sk', { numeric: true });
      return sortDir === 'asc' ? comparison : -comparison;
    });
  };

  const applyAdvancedFilters = (filters: AdvancedFilters) => {
    console.log('ApplyAdvancedFilters called with:', filters); // Debug log
    let filteredData = [...data];
    
    if (searchTerm) {
      filteredData = filterData(filteredData, searchTerm);
    }
    
    const enabledStatusFilters = filters.statusFilters.filter(f => f.enabled);
    console.log('Enabled status filters:', enabledStatusFilters); // Debug log
    if (enabledStatusFilters.length > 0) {
      filteredData = filteredData.filter(row => {
        return columns.some(column => {
          if (column.type === 'status') {
            const value = row[column.id];
            return enabledStatusFilters.some(filter => filter.value === value);
          }
          return false;
        });
      });
    }
    
    const enabledCategoryFilters = filters.categoryFilters.filter(f => f.enabled);
    if (enabledCategoryFilters.length > 0) {
      filteredData = filteredData.filter(row => {
        const categoryId = row.kategoria?.id?.toString() || row.kategoria_id?.toString();
        return enabledCategoryFilters.some(filter => filter.categoryId === categoryId);
      });
    }
    
    if (filters.dateRangeFilter?.enabled && filters.dateRangeFilter.column) {
      const { startDate, endDate, column } = filters.dateRangeFilter;
      filteredData = filteredData.filter(row => {
        const rowDate = new Date(row[column]);
        if (isNaN(rowDate.getTime())) return true;
        let isValid = true;
        if (startDate) {
          const start = new Date(startDate);
          isValid = isValid && rowDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          isValid = isValid && rowDate <= end;
        }
        return isValid;
      });
    }
    
    const enabledUserFilters = filters.userFilters.filter(f => f.enabled);
    if (enabledUserFilters.length > 0) {
      filteredData = filteredData.filter(row => {
        const authorId = row.autor?.id?.toString();
        return enabledUserFilters.some(filter => filter.userId === authorId);
      });
    }
    
    if (sortColumn && sortDirection) {
      filteredData = sortData(filteredData, sortColumn, sortDirection);
    }
    
    console.log('Final filtered data:', filteredData); // Debug log
    setFilteredData(filteredData);
    
    if (!serverSidePagination) {
      setCurrentPage(1);
    }
  };

  useEffect(() => {
    if (serverSidePagination && onSearchChange && isServerSideSearch) {
      return;
    } else {
      applyAdvancedFilters(advancedFilters);
    }
  }, [data, searchTerm, serverSidePagination, sortColumn, sortDirection, advancedFilters]);

  const getActiveFiltersCount = () => {
    let count = 0;
    count += advancedFilters.columnVisibility.filter(col => !col.visible).length;
    count += advancedFilters.statusFilters.filter(f => f.enabled).length;
    count += advancedFilters.categoryFilters.filter(f => f.enabled).length;
    if (advancedFilters.dateRangeFilter?.enabled) count += 1;
    count += advancedFilters.userFilters.filter(f => f.enabled).length;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const getActionItems = (rowId: string): ActionItem[] => [
    {
      id: 'edit',
      label: 'Upraviť',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M11.334 2.00004C11.7018 1.6322 12.1686 1.42908 12.6537 1.42908C13.1387 1.42908 13.6055 1.6322 13.9733 2.00004C14.3412 2.36787 14.5443 2.83469 14.5443 3.31971C14.5443 3.80473 14.3412 4.27155 13.9733 4.63938L5.00001 13.6127L1.33334 14.6661L2.38668 10.9994L11.334 2.00004Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      onClick: () => handleEditRow(rowId)
    },
    {
      id: 'duplicate',
      label: 'Duplikovať',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.333 6H7.33301C6.59662 6 5.99967 6.59695 5.99967 7.33333V13.3333C5.99967 14.0697 6.59662 14.6667 7.33301 14.6667H13.333C14.0694 14.6667 14.6663 14.0697 14.6663 13.3333V7.33333C14.6663 6.59695 14.0694 6 13.333 6Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.33301 10H2.66634C2.31272 10 1.97358 9.85952 1.72353 9.60948C1.47348 9.35943 1.33301 9.02029 1.33301 8.66667V2.66667C1.33301 2.31305 1.47348 1.97391 1.72353 1.72386C1.97358 1.47381 2.31272 1.33333 2.66634 1.33333H8.66634C9.01996 1.33333 9.3591 1.47381 9.60915 1.72386C9.8592 1.97391 9.99967 2.31305 9.99967 2.66667V3.33333" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      onClick: () => handleDuplicateRow(rowId),
      separator: true
    },
    {
      id: 'delete',
      label: 'Zmazať',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4H14" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12.6667 4V13.3333C12.6667 14.0697 12.0697 14.6667 11.3333 14.6667H4.66667C3.93029 14.6667 3.33333 14.0697 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 1.93029 5.93029 1.33333 6.66667 1.33333H9.33333C10.0697 1.33333 10.6667 1.93029 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      onClick: () => handleDeleteRow(rowId),
      danger: true
    }
  ];

  const renderCell = (column: TableColumn, row: TableData) => {
    const value = row[column.id];

    if (column.id === 'nazov' && row.farba && row.ikona) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{row.ikona}</span>
          <strong style={{ color: row.farba }}>{value}</strong>
        </div>
      );
    }

    if (column.id === 'nazov') {
      return <span className="table-cell-title-nazov">{value}</span>;
    }

    if (column.id === 'views') {
      return <span className="table-cell-title-views">{value}</span>;
    }

    switch (column.type) {
      case 'user':
        return (
          <div className="table-cell-user">
            <div className="table-user-avatar">
              <img src={value.avatar || '/default-avatar.png'} alt={value.name} />
            </div>
            <span className="table-user-name">{value.name}</span>
          </div>
        );
      
      case 'status':
        return (
          <div className={`table-cell-status status-${value.toLowerCase().replace(' ', '-')}`}>
            <span className="status-dot"></span>
            <span className="status-text">{value}</span>
          </div>
        );
      
      case 'date':
        return <span className="table-cell-date">{value}</span>;
      
      case 'actions':
        return (
          <div className="table-cell-actions">
            <button className="table-action-button"
              onClick={(e) => handleActionsClick(e, row.id)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="2" r="1" fill="currentColor"/>
                <circle cx="8" cy="8" r="1" fill="currentColor"/>
                <circle cx="8" cy="14" r="1" fill="currentColor"/>
              </svg>
            </button>
          </div>
        );
      
      default:
        return <span className="table-cell-text">{value}</span>;
    }
  };

  const getPageNumbers = () => {
    const maxVisiblePages = 5;
    const pages: number[] = [];
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const current = currentPageNumber;
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
      } else if (current >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = current - 2; i <= current + 2; i++) {
          pages.push(i);
        }
      }
    }
    return pages;
  };

  return (
    <div className={`management-table-container ${className}`}>
      {/* Filter Menu */}
      <div className="table-filter-menu">
        <div className="table-filter-left">
          <button 
            className="filter-action-item" 
            title="Add Data" 
            onClick={() => {
              if (onAddUser) {
                setIsAddModalOpen(true);
              } else if (onAddCategory) {
                onAddCategory();
              } else if (onAddPage) {
                onAddPage();
              } else if (onAddTeam) {
                onAddTeam();
              } else if (onAddArticle) {
                onAddArticle();
              }
            }}
          >
            <svg width="22" height="22" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="10"/>
              <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="10"/>
            </svg>
          </button>
          
          <button 
            ref={filterButtonRef}
            className="filter-action-item" 
            title="Filter"
            onClick={handleFilterClick}
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="M2.5 3H13.5L10 7.5V12L6 10V7.5L2.5 3Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button 
            ref={sortButtonRef}
            className={`filter-action-item ${currentSort ? 'active-sort' : ''}`}
            title={currentSort ? `Sortované: ${currentSort.columnId} (${currentSort.direction === 'asc' ? 'vzostupne' : 'zostupne'})` : 'Sort'}
            onClick={handleSortClick}
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="M3 6L5 4L7 6M5 4V12M13 10L11 12L9 10M11 12V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {currentSort && (
              <div className="sort-indicator">
                <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" fill="var(--color-primary)"/>
                </svg>
              </div>
            )}
          </button>
          
          {searchTerm && (
            <>
              <div className="filter-divider"></div>
              <span className="search-results-info">
                {filteredData.length} výsledkov pre "{searchTerm}"
              </span>
              <button 
                className="filter-action-item" 
                title="Vymazať vyhľadávanie"
                onClick={() => onSearchChange && onSearchChange('')} 
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}

          {selectedRows.length > 0 && (
            <>
              <div className="filter-divider"></div>
              <span className="selected-count">{selectedRows.length} Selected</span>
              
              <button 
                className={`filter-action-item ${isDeleting ? 'loading' : ''}`} 
                title="Vymazať označené"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4H14M5.5 4V3C5.5 2.44772 5.94772 2 6.5 2H9.5C10.0523 2 10.5 2.44772 10.5 3V4M6.5 7V12M9.5 7V12M4 4V13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
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
            </>
          )}

          {activeFiltersCount > 0 && (
            <>
              <div className="filter-divider"></div>
              <span className="selected-count">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} aktívnych
              </span>
              <button 
                className="filter-action-item" 
                title="Vymazať všetky filtre"
                onClick={handleResetFilter}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
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
              placeholder="Hľadať..."
              className="table-search-input"
              value={searchTerm}
              onChange={(e) => {
                if (isServerSideSearch && onSearchChange) {
                  onSearchChange(e.target.value);
                } else {
                  setInternalSearchTerm(e.target.value);
                }
              }}
            />
            {searchTerm && (
              <button
                className="search-clear-button"
                onClick={() => {
                  if (isServerSideSearch && onSearchChange) {
                    onSearchChange('');
                  } else {
                    setInternalSearchTerm('');
                  }
                }}
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

      {/* Table Wrapper */}
      <div className="table-wrapper">
        <table className="table">
          <thead className="table-header">
            <tr>
              {showCheckboxes && (
                <th className="table-header-cell checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === currentData.length && currentData.length > 0}
                    onChange={handleSelectAll}
                    className="table-checkbox"
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th 
                  key={column.id} 
                  className="table-header-cell"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (showCheckboxes ? 1 : 0)} className="no-search-results">
                  {searchTerm ? (
                    <div>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>Žiadne výsledky pre "{searchTerm}"</div>
                      <button onClick={() => onSearchChange && onSearchChange('')} style={{ marginTop: '8px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Vymazať filter
                      </button>
                    </div>
                  ) : (
                    <div>Žiadne dáta na zobrazenie</div>
                  )}
                </td>
              </tr>
            ) : (
              currentData.map((row) => (
                <tr 
                  key={row.id} 
                  className={`table-row ${selectedRows.includes(row.id) ? 'selected' : ''}`}
                  onClick={(e) => handleRowClick(row.id, e)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {showCheckboxes && (
                    <td className="table-cell checkbox-cell" style={{ cursor: 'default' }}>
                      
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="table-checkbox"
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  {visibleColumns.map((column) => (
                    <td key={column.id} className="table-cell">
                      {renderCell(column, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginácia */}
      <div className="table-pagination">
        <div className="pagination-info">
          <span>
            Zobrazené {startIndex + 1} až {endIndex} z {totalItems} záznamov
          </span>
        </div>
        
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(currentPageNumber - 1)}
            className="pagination-arrow"
            disabled={currentPage === 1}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`pagination-button ${page === currentPageNumber ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(currentPageNumber + 1)}
            className="pagination-arrow"
            disabled={currentPageNumber === totalPages}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Modals */}
      {detectModalType() === 'user' && (
        <AddUserModal 
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddUser}
        />
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content confirmation-modal">
            <h3>Potvrdiť vymazanie</h3>
            <p>
              Naozaj chcete vymazať {selectedRows.length} označených položiek? 
              Táto akcia sa nedá vrátiť späť.
            </p>
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Zrušiť
              </button>
              <button 
                className="btn-danger"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? 'Mazanie...' : 'Vymazať'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPRAVENÝ Filter Popup */}
      <FilterPopup
        isOpen={isFilterPopupOpen}
        onClose={() => setIsFilterPopupOpen(false)}
        position={filterPopupPosition}
        columns={columns}
        data={data}
        columnVisibility={advancedFilters.columnVisibility}
        currentFilters={advancedFilters}
        onApplyFilter={handleApplyAdvancedFilter}
        enableAdvancedFilters={enableAdvancedFilters}
        customLabels={filterCustomLabels}
      />

      {/* Sort Popup */}
      <SortPopup
        isOpen={isSortPopupOpen}
        onClose={() => setIsSortPopupOpen(false)}
        position={sortPopupPosition}
        columns={columns}
        currentSort={currentSort}
        onApplySort={handleApplySort}
      />

      {/* Actions Popup */}
      <ActionsPopup
        isOpen={actionsPopupOpen}
        onClose={() => setActionsPopupOpen(false)}
        position={actionsPopupPosition}
        actions={selectedRowId ? getActionItems(selectedRowId) : []}
      />
    </div>
  );
};

export default Table;