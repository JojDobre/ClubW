// Table.tsx - Updated with Column Visibility Filter
import React, { useState, useRef } from 'react';
import AddUserModal, { UserFormData } from './AddUserModal';
import FilterPopup, { ColumnFilterState } from './FilterPopup';

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
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  showCheckboxes = true,
  itemsPerPage = 10,
  className = '',
  onAddUser
}) => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Filter popup state
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [filterPopupPosition, setFilterPopupPosition] = useState({ top: 0, left: 0 });
  
  // Column visibility state - inicializujeme všetky stĺpce ako viditeľné
  const [columnVisibility, setColumnVisibility] = useState<ColumnFilterState[]>(
    columns.map(column => ({
      columnId: column.id,
      visible: true
    }))
  );
  
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Get visible columns
  const visibleColumns = columns.filter(column => {
    if (column.type === 'checkbox' || column.type === 'actions') return true; // Always show these
    const columnState = columnVisibility.find(col => col.columnId === column.id);
    return columnState?.visible ?? true;
  });

  // Počítanie stránok
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  // Funkcia pre označenie všetkých riadkov
  const handleSelectAll = () => {
    if (selectedRows.length === currentData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentData.map(row => row.id));
    }
  };

  // Funkcia pre označenie jednotlivého riadku
  const handleSelectRow = (rowId: string) => {
    setSelectedRows(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId)
        : [...prev, rowId]
    );
  };

  // Funkcia pre zmenu stránky
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle add user
  const handleAddUser = (userData: UserFormData) => {
    if (onAddUser) {
      onAddUser(userData);
    }
    setIsAddModalOpen(false);
  };

  // Handle filter button click
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

  // Handle column visibility filter apply
  const handleApplyColumnFilter = (newColumnVisibility: ColumnFilterState[]) => {
    setColumnVisibility(newColumnVisibility);
  };

  // Reset filter
  const handleResetFilter = () => {
    setColumnVisibility(columns.map(column => ({
      columnId: column.id,
      visible: true
    })));
  };

  // Count hidden columns
  const hiddenColumnsCount = columnVisibility.filter(col => !col.visible).length;

  // Renderovanie bunky podľa typu stĺpca
  const renderCell = (column: TableColumn, row: TableData) => {
    const value = row[column.id];

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
            <button className="table-action-button">
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

  return (
    <div className={`table-container ${className}`}>
      {/* Filter Menu */}
      <div className="table-filter-menu">
        <div className="table-filter-left">
          {/* Pôvodné menu - vždy zobrazené */}
          <button className="filter-action-item" title="Add Data" onClick={() => setIsAddModalOpen(true)}>
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
          
          <button className="filter-action-item" title="Sort">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="M3 6L5 4L7 6M5 4V12M13 10L11 12L9 10M11 12V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Akčné možnosti - zobrazujú sa len keď sú vybrané riadky */}
          {selectedRows.length > 0 && (
            <>
              <div className="filter-divider"></div>
              
              <span className="selected-count">{selectedRows.length} Selected</span>
              
              <button className="filter-action-item" title="Delete">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4H14M5.5 4V3C5.5 2.44772 5.94772 2 6.5 2H9.5C10.0523 2 10.5 2.44772 10.5 3V4M6.5 7V12M9.5 7V12M4 4V13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button className="filter-action-item" title="Duplicate">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 9H3C2.44772 9 2 8.55228 2 8V3C2 2.44772 2.44772 2 3 2H8C8.55228 2 9 2.44772 9 3V4M8 7H13C13.5523 7 14 7.44772 14 8V13C14 13.5523 13.5523 14 13 14H8C7.44772 14 7 13.5523 7 13V8C7 7.44772 7.44772 7 8 7Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}

          {/* Show filter info */}
          {hiddenColumnsCount > 0 && (
            <>
              <div className="filter-divider"></div>
              <span className="selected-count">
                {hiddenColumnsCount} column{hiddenColumnsCount > 1 ? 's' : ''} hidden
              </span>
              <button 
                className="filter-action-item" 
                title="Reset Filter"
                onClick={handleResetFilter}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8L5 12L15 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
              placeholder="Search..."
              className="table-search-input"
            />
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
            {currentData.map((row) => (
              <tr 
                key={row.id} 
                className={`table-row ${selectedRows.includes(row.id) ? 'selected' : ''}`}
              >
                {showCheckboxes && (
                  <td className="table-cell checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      className="table-checkbox"
                    />
                  </td>
                )}
                {visibleColumns.map((column) => (
                  <td key={column.id} className="table-cell">
                    {renderCell(column, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginácia */}
      <div className="table-pagination">
        <div className="pagination-info">
          <span>Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries</span>
        </div>
        
        <div className="pagination-controls">
          {/* Šípka doľava */}
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            className="pagination-arrow"
            disabled={currentPage === 1}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Čísla stránok */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`pagination-button ${page === currentPage ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
          
          {/* Šípka doprava */}
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            className="pagination-arrow"
            disabled={currentPage === totalPages}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Add User Modal */}
      <AddUserModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddUser}
      />

      {/* Filter Popup */}
      <FilterPopup
        isOpen={isFilterPopupOpen}
        onClose={() => setIsFilterPopupOpen(false)}
        position={filterPopupPosition}
        columns={columns}
        columnVisibility={columnVisibility}
        onApplyFilter={handleApplyColumnFilter}
      />

    </div>
  );
};

export default Table;