// frontend/src/components/CategoryManagement.tsx
// Komponenta pre správu rubrík (kategórií článkov)

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
  popis: string;
  farba: string;
  ikona: string;
  poradie: number;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Formulárové dáta
  const [formData, setFormData] = useState<CategoryFormData>({
    nazov: '',
    popis: '',
    farba: '#3b82f6',
    ikona: '',
    poradie: 0,
  });

  // Prednastavené farby
  const predefinedColors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#84cc16', // Lime
  ];

  // Prednastavené ikony
  const predefinedIcons = [
    '⚽', '🏆', '📰', '🎤', '👶', '📊', '📅', '⭐',
    '🔥', '💪', '🎯', '📈', '🏟️', '👥', '📝', '🎮'
  ];

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

  // Načítanie pri prvom renderovaní a pri zmene filtrov
  useEffect(() => {
    fetchCategories();
  }, [searchTerm, filterActive]);

  // Spracovanie formulára
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        await fetchCategories(); // Reload zoznamu
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

  // Reset formulára
  const resetForm = () => {
    setFormData({
      nazov: '',
      popis: '',
      farba: '#3b82f6',
      ikona: '',
      poradie: 0,
    });
    setError('');
  };

  // Prepnutie aktivity rubriky
  const toggleCategoryStatus = async (categoryId: number) => {
    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(
        `http://localhost:3000/api/admin/categories/${categoryId}/toggle-status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        await fetchCategories(); // Reload zoznamu
      } else {
        setError(data.message || 'Chyba pri zmene stavu rubriky');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    }
  };

  // Vymazanie rubriky
  const deleteCategory = async (categoryId: number) => {
    if (!window.confirm('Naozaj chcete vymazať túto rubriku?')) {
      return;
    }

    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(`http://localhost:3000/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        await fetchCategories(); // Reload zoznamu
      } else {
        setError(data.message || 'Chyba pri vymazávaní rubriky');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    }
  };

  // Otvorenie úpravy rubriky
  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nazov: category.nazov,
      popis: category.popis || '',
      farba: category.farba || '#3b82f6',
      ikona: category.ikona || '',
      poradie: category.poradie,
    });
    setError('');
    setShowAddModal(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
          📂 Správa rubrík
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
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
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Stav
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Všetky</option>
              <option value="true">Aktívne</option>
              <option value="false">Neaktívne</option>
            </select>
          </div>
        </div>
      </div>

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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Rubrika
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Farba/Ikona
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Poradie
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
                  <tr key={category.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>{category.nazov}</div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>{category.slug}</div>
                        {category.popis && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {category.popis}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {category.farba && (
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            backgroundColor: category.farba,
                            border: '1px solid #e5e7eb'
                          }}></div>
                        )}
                        {category.ikona && (
                          <span style={{ fontSize: '18px' }}>{category.ikona}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                      {category.poradie}
                    </td>
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
                          ✏️ Upraviť
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
                          {category.aktivity ? '⏸️ Deaktivovať' : '▶️ Aktivovať'}
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
                            🗑️ Vymazať
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
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Názov
                </label>
                <input
                  type="text"
                  value={formData.nazov}
                  onChange={(e) => setFormData({ ...formData, nazov: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Popis
                </label>
                <textarea
                  value={formData.popis}
                  onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Farba
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
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Ikona
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
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Poradie
                </label>
                <input
                  type="number"
                  value={formData.poradie}
                  onChange={(e) => setFormData({ ...formData, poradie: parseInt(e.target.value) || 0 })}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

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
    </div>
  );
};

export default CategoryManagement;