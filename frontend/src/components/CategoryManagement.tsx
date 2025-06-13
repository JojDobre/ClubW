// frontend/src/components/CategoryManagement.tsx
// Komponenta pre správu rubrík (kategórií článkov) - POKROČILÁ VERZIA

import React, { useState, useEffect } from 'react';

interface Category {
  id: number;
  nazov: string;
  slug: string;
  popis?: string;
  farba?: string;
  ikona?: string;
  poradie: number;
  aktivity: boolean;
  pocet_clankov?: number;
  vytvoreny: string;
  aktualizovany: string;
}

interface CategoryFormData {
  nazov: string;
  slug: string;
  popis: string;
  farba: string;
  ikona: string;
  poradie: number;
}

interface BulkCategory {
  nazov: string;
  popis: string;
  farba: string;
  ikona: string;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Bulk akcie
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Bulk pridávanie
  const [bulkCategories, setBulkCategories] = useState<BulkCategory[]>([
    { nazov: '', popis: '', farba: '#3b82f6', ikona: '' }
  ]);

  // Drag & Drop
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Formulárové dáta
  const [formData, setFormData] = useState<CategoryFormData>({
    nazov: '',
    slug: '',
    popis: '',
    farba: '#3b82f6',
    ikona: '',
    poradie: 0,
  });

  // Prednastavené farby
  const predefinedColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
  ];

  // Prednastavené ikony
  const predefinedIcons = [
    '⚽', '🏆', '📰', '🎤', '👶', '📊', '📅', '⭐',
    '🔥', '💪', '🎯', '📈', '🏟️', '👥', '📝', '🎮'
  ];

  // Generovanie slug z názvu
  const generateSlug = (nazov: string): string => {
    return nazov
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Načítanie rubrík
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('clubw_token');
      
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filterActive) queryParams.append('active', filterActive);

      const response = await fetch(
        `http://localhost:3000/api/admin/categories?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setCategories(data.data.categories);
      } else {
        setError(data.message || 'Chyba pri načítavaní rubrík');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [searchTerm, filterActive]);

  // Validácia slug v reálnom čase
  const checkSlugAvailability = async (slug: string, excludeId?: number) => {
    if (!slug.trim()) return true;
    
    const existingCategory = categories.find(cat => 
      cat.slug === slug && cat.id !== excludeId
    );
    return !existingCategory;
  };

  // Spracovanie formulára
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validácia slug
      const isSlugAvailable = await checkSlugAvailability(formData.slug, editingCategory?.id);
      if (!isSlugAvailable) {
        setError('Slug už existuje. Zvoľte iný.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('clubw_token');
      const url = editingCategory 
        ? `http://localhost:3000/api/admin/categories/${editingCategory.id}`
        : 'http://localhost:3000/api/admin/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchCategories();
        resetForm();
        setShowAddModal(false);
        setEditingCategory(null);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => err.msg || err.message).join(', ');
          setError(errorMessages);
        } else {
          setError(data.message || 'Chyba pri ukladaní rubriky');
        }
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Bulk pridávanie
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('clubw_token');
      const maxPoradie = categories.length > 0 ? Math.max(...categories.map(c => c.poradie)) : 0;
      
      const promises = bulkCategories
        .filter(cat => cat.nazov.trim())
        .map(async (cat, index) => {
          const categoryData = {
            ...cat,
            nazov: cat.nazov.trim(),
            slug: generateSlug(cat.nazov.trim()),
            popis: cat.popis.trim() || null,
            poradie: maxPoradie + index + 1,
          };

          return fetch('http://localhost:3000/api/admin/categories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(categoryData),
          });
        });

      await Promise.all(promises);
      await fetchCategories();
      setShowBulkModal(false);
      setBulkCategories([{ nazov: '', popis: '', farba: '#3b82f6', ikona: '' }]);
    } catch (err) {
      setError('Chyba pri hromadnom pridávaní rubrík');
    } finally {
      setLoading(false);
    }
  };

  // Bulk akcie
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedCategories.length === 0) return;

    const confirmMessage = action === 'delete' 
      ? `Naozaj chcete vymazať ${selectedCategories.length} rubrík? Táto akcia je nevratná.`
      : `Naozaj chcete ${action === 'activate' ? 'aktivovať' : 'deaktivovať'} ${selectedCategories.length} rubrík?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('clubw_token');
      
      const promises = selectedCategories.map(async (categoryId) => {
        if (action === 'delete') {
          return fetch(`http://localhost:3000/api/admin/categories/${categoryId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
        } else {
          return fetch(`http://localhost:3000/api/admin/categories/${categoryId}/toggle-status`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` },
          });
        }
      });

      await Promise.all(promises);
      await fetchCategories();
      setSelectedCategories([]);
      setShowBulkActions(false);
    } catch (err) {
      setError('Chyba pri hromadnej akcii');
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, categoryId: number) => {
    setDraggedItem(categoryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === targetId) return;

    const draggedCategory = categories.find(c => c.id === draggedItem);
    const targetCategory = categories.find(c => c.id === targetId);
    
    if (!draggedCategory || !targetCategory) return;

    try {
      const token = localStorage.getItem('clubw_token');
      
      // Swap poradie
      await Promise.all([
        fetch(`http://localhost:3000/api/admin/categories/${draggedItem}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ poradie: targetCategory.poradie }),
        }),
        fetch(`http://localhost:3000/api/admin/categories/${targetId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ poradie: draggedCategory.poradie }),
        })
      ]);

      await fetchCategories();
    } catch (err) {
      setError('Chyba pri zmene poradia');
    }
    
    setDraggedItem(null);
  };

  // Reset formulára
  const resetForm = () => {
    const maxPoradie = categories.length > 0 ? Math.max(...categories.map(c => c.poradie)) : 0;
    setFormData({
      nazov: '',
      slug: '',
      popis: '',
      farba: '#3b82f6',
      ikona: '',
      poradie: maxPoradie + 1,
    });
    setError('');
    setShowAdvanced(false);
  };

  // Ostatné funkcie (toggleCategoryStatus, deleteCategory, startEdit, atď.)
  const toggleCategoryStatus = async (categoryId: number) => {
    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(
        `http://localhost:3000/api/admin/categories/${categoryId}/toggle-status`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        await fetchCategories();
      } else {
        setError(data.message || 'Chyba pri zmene stavu rubriky');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    }
  };

  const deleteCategory = async (categoryId: number) => {
    if (!window.confirm('Naozaj chcete vymazať túto rubriku?')) return;

    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(`http://localhost:3000/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        await fetchCategories();
      } else {
        setError(data.message || 'Chyba pri vymazávaní rubriky');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nazov: category.nazov,
      slug: category.slug,
      popis: category.popis || '',
      farba: category.farba || '#3b82f6',
      ikona: category.ikona || '',
      poradie: category.poradie,
    });
    setError('');
    setShowAdvanced(true);
    setShowAddModal(true);
  };

  const startAdd = () => {
    resetForm();
    setShowAdvanced(false);
    setShowAddModal(true);
  };

  // Štýly
  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  };

  // CSS pre responsívny text v tlačidlách
  const responsiveButtonStyle = `
    @media (max-width: 768px) {
      .responsive-button-text {
        display: none;
      }
    }
    @media (min-width: 769px) {
      .responsive-button-text {
        display: inline;
      }
    }
  `;

  // Pridanie CSS do stránky
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = responsiveButtonStyle;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
          📂 Správa rubrík
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowBulkModal(true)}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            📝 Pridať viacero
          </button>
          <button
            onClick={startAdd}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            ➕ Pridať rubriku
          </button>
        </div>
      </div>

      {/* Filtre */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Vyhľadávanie
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Názov alebo popis..."
              style={inputStyle}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Stav
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              style={inputStyle}
            >
              <option value="">Všetky</option>
              <option value="true">Aktívne</option>
              <option value="false">Neaktívne</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk akcie panel */}
      {selectedCategories.length > 0 && (
        <div style={{
          background: '#fef3c7',
          padding: '16px 20px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #fde68a'
        }}>
          <span style={{ fontSize: '14px', color: '#92400e' }}>
            Vybraných {selectedCategories.length} rubrík
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleBulkAction('activate')}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ▶️ Aktivovať
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ⏸️ Deaktivovať
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🗑️ Vymazať
            </button>
            <button
              onClick={() => setSelectedCategories([])}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✕ Zrušiť
            </button>
          </div>
        </div>
      )}

      {/* Chybová správa */}
      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #dc2626'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabuľka rubrík */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            Načítavam rubriky...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>

                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151', width: '20px' }}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.length === categories.length && categories.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories(categories.map(c => c.id));
                        } else {
                          setSelectedCategories([]);
                        }
                      }}
                    />
                  </th>

                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151', width: '20px' }}>
                    #
                  </th>

                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Rubrika
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Farba/Ikona
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Články
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Stav
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Akcie
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr 
                    key={category.id} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: draggedItem === category.id ? '#f8fafc' : 'white'
                    }}
                  >

                   {/* Checkbox */}
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, category.id]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          }
                        }}
                      />
                    </td>

                    {/* Poradie */}
                    <td style={{ padding: '2px 8px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        borderRadius: '8px',
                      }}>
                        {category.poradie}
                      </span>
                    </td>


                    {/* Rubrika */}
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '2px' }}>
                          {category.nazov}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#9ca3af',
                          fontFamily: 'monospace',
                          background: '#f3f4f6',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          display: 'inline-block'
                        }}>
                          /{category.slug}
                        </div>
                        {category.popis && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {category.popis}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Farba/Ikona */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {category.farba && (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            backgroundColor: category.farba,
                            border: '2px solid #fff',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                          }}></div>
                        )}
                        {category.ikona && (
                          <span style={{ fontSize: '20px' }}>{category.ikona}</span>
                        )}
                      </div>
                    </td>

                    {/* Články */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: '#f1f5f9',
                        color: '#475569'
                      }}>
                        {category.pocet_clankov || 0} článkov
                      </span>
                    </td>

                    {/* Stav */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: category.aktivity ? '#dcfce7' : '#fee2e2',
                        color: category.aktivity ? '#166534' : '#dc2626'
                      }}>
                        {category.aktivity ? 'Aktívna' : 'Neaktívna'}
                      </span>
                    </td>

                    {/* Akcie */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => startEdit(category)}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          <span>✏️</span>
                          <span className="responsive-button-text"> Upraviť</span>
                        </button>
                        
                        <button
                          onClick={() => toggleCategoryStatus(category.id)}
                          style={{
                            background: category.aktivity ? '#f59e0b' : '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{category.aktivity ? '⏸️' : '▶️'}</span>
                          <span className="responsive-button-text">
                            {category.aktivity ? ' Deaktivovať' : ' Aktivovať'}
                          </span>
                        </button>
                        
                        {(!category.pocet_clankov || category.pocet_clankov === 0) && (
                          <button
                            onClick={() => deleteCategory(category.id)}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <span>🗑️</span>
                            <span className="responsive-button-text"> Vymazať</span>
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
            
            {categories.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Žiadne rubriky neboli nájdené.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal pre pridanie/úpravu rubriky */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 'bold' }}>
              {editingCategory ? 'Upraviť rubriku' : 'Pridať novú rubriku'}
            </h2>

            {error && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                borderLeft: '4px solid #dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Základné polia - vždy viditeľné */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Názov rubriky
                </label>
                <input
                  type="text"
                  value={formData.nazov}
                  onChange={(e) => {
                    const nazov = e.target.value;
                    setFormData({ 
                      ...formData, 
                      nazov,
                      slug: editingCategory ? formData.slug : generateSlug(nazov) // Auto-generuj slug len pri pridávaní
                    });
                  }}
                  required
                  placeholder="Napr. Aktuálne, Rozhovory, Mládež..."
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Popis rubriky
                </label>
                <textarea
                  value={formData.popis}
                  onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
                  rows={3}
                  placeholder="Krátky popis rubriky (voliteľné)..."
                  style={{
                    ...inputStyle,
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Pokročilé nastavenia - rozbaľovacie */}
              <div style={{ marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'none',
                    border: '1px solid #d1d5db',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#374151',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <span>{showAdvanced ? '▲' : '▼'}</span>
                  {showAdvanced ? 'Skryť pokročilé nastavenia' : 'Zobraziť pokročilé nastavenia'}
                </button>
              </div>

              {/* Pokročilé nastavenia - iba ak sú rozbalené */}
              {showAdvanced && (
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  marginBottom: '24px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                    Pokročilé nastavenia
                  </h3>

                  {/* Slug úprava */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      URL slug
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={async (e) => {
                        const slug = e.target.value;
                        setFormData({ ...formData, slug });
                        
                        // Validácia slug v reálnom čase
                        if (slug.trim()) {
                          const isAvailable = await checkSlugAvailability(slug, editingCategory?.id);
                          if (!isAvailable) {
                            setError('Tento slug už existuje');
                          } else {
                            setError('');
                          }
                        }
                      }}
                      placeholder="automaticky-generovany-slug"
                      pattern="^[a-z0-9-]+$"
                      style={{
                        ...inputStyle,
                        fontFamily: 'monospace',
                        fontSize: '13px'
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      URL adresa: /{formData.slug || 'slug'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                        Farba rubriky
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        {predefinedColors.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, farba: color })}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              backgroundColor: color,
                              border: formData.farba === color ? '3px solid #1e293b' : '1px solid #e5e7eb',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={formData.farba}
                        onChange={(e) => setFormData({ ...formData, farba: e.target.value })}
                        style={{
                          width: '100%',
                          height: '40px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                        Ikona rubriky
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        {predefinedIcons.map(icon => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setFormData({ ...formData, ikona: icon })}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              backgroundColor: formData.ikona === icon ? '#e5e7eb' : 'transparent',
                              border: '1px solid #d1d5db',
                              cursor: 'pointer',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={formData.ikona}
                        onChange={(e) => setFormData({ ...formData, ikona: e.target.value })}
                        placeholder="Vlastná ikona/emoji"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      Poradie v menu
                    </label>
                    <input
                      type="number"
                      value={formData.poradie}
                      onChange={(e) => setFormData({ ...formData, poradie: parseInt(e.target.value) || 0 })}
                      min="1"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Nižšie číslo = vyššie v menu (1 = prvé miesto)
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                    resetForm();
                  }}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Ukladám...' : (editingCategory ? 'Uložiť zmeny' : 'Pridať rubriku')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pre hromadné pridávanie */}
      {showBulkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 'bold' }}>
              📝 Pridať viacero rubrík naraz
            </h2>

            <div style={{ marginBottom: '20px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <p style={{ margin: '0', fontSize: '14px', color: '#0369a1' }}>
                💡 Tip: Vyplňte názvy rubrík, ktoré chcete pridať. Slug sa vygeneruje automaticky.
              </p>
            </div>

            <form onSubmit={handleBulkSubmit}>
              {bulkCategories.map((category, index) => (
                <div key={index} style={{ 
                  marginBottom: '20px', 
                  padding: '16px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  background: '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#374151' }}>
                      Rubrika #{index + 1}
                    </h4>
                    {bulkCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkCategories(bulkCategories.filter((_, i) => i !== index));
                        }}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                        Názov
                      </label>
                      <input
                        type="text"
                        value={category.nazov}
                        onChange={(e) => {
                          const newCategories = [...bulkCategories];
                          newCategories[index].nazov = e.target.value;
                          setBulkCategories(newCategories);
                        }}
                        placeholder="Názov rubriky..."
                        style={{
                          ...inputStyle,
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                        Ikona
                      </label>
                      <input
                        type="text"
                        value={category.ikona}
                        onChange={(e) => {
                          const newCategories = [...bulkCategories];
                          newCategories[index].ikona = e.target.value;
                          setBulkCategories(newCategories);
                        }}
                        placeholder="📰"
                        style={{
                          ...inputStyle,
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                        Popis
                      </label>
                      <input
                        type="text"
                        value={category.popis}
                        onChange={(e) => {
                          const newCategories = [...bulkCategories];
                          newCategories[index].popis = e.target.value;
                          setBulkCategories(newCategories);
                        }}
                        placeholder="Popis rubriky..."
                        style={{
                          ...inputStyle,
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                        Farba
                      </label>
                      <input
                        type="color"
                        value={category.farba}
                        onChange={(e) => {
                          const newCategories = [...bulkCategories];
                          newCategories[index].farba = e.target.value;
                          setBulkCategories(newCategories);
                        }}
                        style={{
                          width: '100%',
                          height: '32px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setBulkCategories([
                      ...bulkCategories,
                      { nazov: '', popis: '', farba: '#3b82f6', ikona: '' }
                    ]);
                  }}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Pridať ďalšiu rubriku
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkCategories([{ nazov: '', popis: '', farba: '#3b82f6', ikona: '' }]);
                  }}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={loading || !bulkCategories.some(cat => cat.nazov.trim())}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading || !bulkCategories.some(cat => cat.nazov.trim()) ? 0.6 : 1
                  }}
                >
                  {loading ? 'Ukladám...' : `Pridať ${bulkCategories.filter(cat => cat.nazov.trim()).length} rubrík`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;