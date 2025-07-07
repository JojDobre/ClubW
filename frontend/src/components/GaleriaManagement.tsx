import React, { useState, useEffect } from 'react';
import GaleriaObrazkyManagement from './GaleriaObrazkyManagement';

// Typy pre TypeScript
interface Galeria {
  id: number;
  nazov: string;
  popis?: string;
  slug: string;
  tim_id?: number;
  clanok_id?: number;
  zapas_id?: number;
  pocet_obrazkov: number;
  nahladovy_obrazok?: string;
  typ_priradenia: 'tim' | 'clanok' | 'zapas' | 'volna';
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

interface GaleriaFormData {
  nazov: string;
  popis: string;
  tim_id: string;
  clanok_id: string;
  zapas_id: string;
}

const GaleriaManagement: React.FC = () => {
  const [galerie, setGalerie] = useState<Galeria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGaleria, setEditingGaleria] = useState<Galeria | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showObrazkyModal, setShowObrazkyModal] = useState(false);
  const [selectedGaleriaForObrazky, setSelectedGaleriaForObrazky] = useState<Galeria | null>(null);

  // Form data
  const [formData, setFormData] = useState<GaleriaFormData>({
    nazov: '',
    popis: '',
    tim_id: '',
    clanok_id: '',
    zapas_id: ''
  });

  // Načítanie galérií
  const fetchGalerie = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'all') params.append('typ', filterType);

      const token = localStorage.getItem('clubw_token');
      const response = await fetch(`http://localhost:3000/api/admin/galleries?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Chyba pri načítaní galérií');
      }

      const data = await response.json();
      setGalerie(data.data.galerie);
      setTotalPages(data.data.pagination.pages);
      setCurrentPage(data.data.pagination.page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Úvodné načítanie
  useEffect(() => {
    fetchGalerie();
  }, []);

  // Efekt pre vyhľadávanie a filtrovanie
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchGalerie(1);
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filterType]);

  // Otvorenie modalu pre novú galériu
  const handleNewGaleria = () => {
    setEditingGaleria(null);
    setFormData({
      nazov: '',
      popis: '',
      tim_id: '',
      clanok_id: '',
      zapas_id: ''
    });
    setShowModal(true);
  };

  // Otvorenie modalu pre úpravu
  const handleEditGaleria = (galeria: Galeria) => {
    setEditingGaleria(galeria);
    setFormData({
      nazov: galeria.nazov,
      popis: galeria.popis || '',
      tim_id: galeria.tim_id?.toString() || '',
      clanok_id: galeria.clanok_id?.toString() || '',
      zapas_id: galeria.zapas_id?.toString() || ''
    });
    setShowModal(true);
  };

  // Otvorenie správy obrázkov
  const handleOpenObrazky = (galeria: Galeria) => {
    setSelectedGaleriaForObrazky(galeria);
    setShowObrazkyModal(true);
  };

  // Zatvorenie správy obrázkov
  const handleCloseObrazky = () => {
    setShowObrazkyModal(false);
    setSelectedGaleriaForObrazky(null);
    // Refresh galérie pre aktualizáciu počtu obrázkov
    fetchGalerie(currentPage);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGaleria(null);
    setFormData({
      nazov: '',
      popis: '',
      tim_id: '',
      clanok_id: '',
      zapas_id: ''
    });
  };

  // Aktualizácia form dát
  const updateFormData = (field: keyof GaleriaFormData, value: string) => {
    setFormData((prev: GaleriaFormData) => ({
      ...prev,
      [field]: value
    }));
  };

  // Odoslanie formulára
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validácia priradenia - len jedno môže byť nastavené
      const assignments = [formData.tim_id, formData.clanok_id, formData.zapas_id].filter(id => id && id.trim() !== '');
      if (assignments.length > 1) {
        alert('Galéria môže byť priradená len k jednému objektu (tím, článok alebo zápas)');
        return;
      }

      const submitData: any = {
        nazov: formData.nazov.trim(),
        popis: formData.popis.trim() || null
      };

      // Pridanie priradenia ak je zadané
      if (formData.tim_id && formData.tim_id.trim() !== '') {
        submitData.tim_id = parseInt(formData.tim_id);
      }
      if (formData.clanok_id && formData.clanok_id.trim() !== '') {
        submitData.clanok_id = parseInt(formData.clanok_id);
      }
      if (formData.zapas_id && formData.zapas_id.trim() !== '') {
        submitData.zapas_id = parseInt(formData.zapas_id);
      }

      const token = localStorage.getItem('clubw_token');
      const url = editingGaleria 
        ? `http://localhost:3000/api/admin/galleries/${editingGaleria.id}`
        : 'http://localhost:3000/api/admin/galleries';
      
      const method = editingGaleria ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Chyba pri ukladaní galérie');
      }

      handleCloseModal();
      fetchGalerie(currentPage);
    } catch (err: any) {
      alert(`Chyba: ${err.message}`);
    }
  };

  // Vymazanie galérie
  const handleDelete = async (id: number) => {
    console.log('🗑️ handleDelete volané s ID:', id); // DEBUG
    
    if (!window.confirm('Naozaj chcete vymazať túto galériu? Táto akcia sa nedá vrátiť späť.')) {
      console.log('❌ Používateľ zrušil vymazávanie'); // DEBUG
      return;
    }

    try {
      const token = localStorage.getItem('clubw_token');
      console.log('🔑 Token:', token ? 'existuje' : 'neexistuje'); // DEBUG
      
      console.log('📡 Volám DELETE API...'); // DEBUG
      const response = await fetch(`http://localhost:3000/api/admin/galleries/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Response status:', response.status); // DEBUG
      console.log('📡 Response:', response); // DEBUG

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Response error text:', errorText); // DEBUG
        throw new Error('Chyba pri vymazávaní galérie');
      }

      const data = await response.json();
      console.log('✅ Response data:', data); // DEBUG
      
      alert('Galéria bola úspešne vymazaná!'); // Temporary feedback
      fetchGalerie(currentPage);
    } catch (err: any) {
      console.error('❌ Chyba pri delete:', err); // DEBUG
      alert(`Chyba: ${err.message}`);
    }
  };

  // Formátovanie typu priradenia
  const formatTypPriradenia = (galeria: Galeria) => {
    switch (galeria.typ_priradenia) {
      case 'tim': return '👥 Tím';
      case 'clanok': return '📄 Článok';
      case 'zapas': return '⚔️ Zápas';
      case 'volna': return '🆓 Voľná';
      default: return '❓ Neznámy';
    }
  };

  // Formátovanie dátumu
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          📸 Fotogalérie
        </h1>
        <p style={{ color: '#64748b', fontSize: '16px' }}>
          Správa fotografických albumov pre články, zápasy a tímy
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          gap: '16px',
          alignItems: window.innerWidth < 768 ? 'stretch' : 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search and Filter */}
          <div style={{
            display: 'flex',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            gap: '12px',
            flex: 1
          }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Hľadať galérie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            />

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '150px'
              }}
            >
              <option value="all">Všetky typy</option>
              <option value="volna">🆓 Voľné</option>
              <option value="tim">👥 Tímy</option>
              <option value="clanok">📄 Články</option>
              <option value="zapas">⚔️ Zápasy</option>
            </select>
          </div>

          {/* New Gallery Button */}
          <button
            onClick={handleNewGaleria}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            ➕ Nová galéria
          </button>
        </div>
      </div>

      {/* Galleries Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {galerie.map((galeria: Galeria) => (
          <div
            key={galeria.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            {/* Gallery Image */}
            <div style={{
              height: '180px',
              background: galeria.nahladovy_obrazok 
                ? `url(http://localhost:3000${galeria.nahladovy_obrazok}) center/cover`
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '48px'
            }}>
              {!galeria.nahladovy_obrazok && '📷'}
            </div>

            {/* Gallery Info */}
            <div style={{ padding: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1e293b',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {galeria.nazov}
                </h3>
                <span style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  marginLeft: '8px'
                }}>
                  {formatTypPriradenia(galeria)}
                </span>
              </div>

              {galeria.popis && (
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 12px 0',
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {galeria.popis}
                </p>
              )}

              {/* Stats */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                <span>📸 {galeria.pocet_obrazkov} obrázkov</span>
                <span>{formatDate(galeria.aktualizovany)}</span>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={() => handleEditGaleria(galeria)}
                  style={{
                    flex: 1,
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
                >
                  ✏️ Upraviť
                </button>
                
                <button
                  onClick={() => handleOpenObrazky(galeria)}
                  style={{
                    flex: 1,
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
                >
                  🖼️ Obrázky
                </button>

                <button
                  onClick={() => handleDelete(galeria.id)}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.borderColor = '#fca5a5';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#fef2f2';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '24px'
        }}>
          <button
            disabled={currentPage === 1}
            onClick={() => fetchGalerie(currentPage - 1)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              background: currentPage === 1 ? '#f9fafb' : 'white',
              color: currentPage === 1 ? '#9ca3af' : '#374151',
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ‹ Predchádzajúca
          </button>

          <span style={{ padding: '0 16px', fontSize: '14px', color: '#6b7280' }}>
            Strana {currentPage} z {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => fetchGalerie(currentPage + 1)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              background: currentPage === totalPages ? '#f9fafb' : 'white',
              color: currentPage === totalPages ? '#9ca3af' : '#374151',
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Ďalšia ›
          </button>
        </div>
      )}

      {/* Modal for creating/editing gallery */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '20px'
            }}>
              {editingGaleria ? 'Upraviť galériu' : 'Nová galéria'}
            </h2>

            <div>
              {/* Názov */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Názov galérie *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nazov}
                  onChange={(e) => updateFormData('nazov', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Napríklad: Zápas proti Spartaku Trnava"
                />
              </div>

              {/* Popis */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Popis
                </label>
                <textarea
                  value={formData.popis}
                  onChange={(e) => updateFormData('popis', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  placeholder="Voliteľný popis galérie..."
                />
              </div>

              {/* Priradenie */}
              <div style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Priradenie (voliteľné - len jedno)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {/* Tím */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      👥 ID tímu
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.tim_id}
                      onChange={(e) => updateFormData('tim_id', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      placeholder="ID"
                    />
                  </div>

                  {/* Článok */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      📄 ID článku
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.clanok_id}
                      onChange={(e) => updateFormData('clanok_id', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      placeholder="ID"
                    />
                  </div>

                  {/* Zápas */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      ⚔️ ID zápasu
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.zapas_id}
                      onChange={(e) => updateFormData('zapas_id', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      placeholder="ID"
                    />
                  </div>
                </div>

                <div style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  marginTop: '8px'
                }}>
                  💡 Galéria môže byť priradená len k jednému objektu alebo zostať voľná
                </div>
              </div>

              {/* Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Zrušiť
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {editingGaleria ? 'Uložiť zmeny' : 'Vytvoriť galériu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre správu obrázkov */}
      {showObrazkyModal && selectedGaleriaForObrazky && (
        <GaleriaObrazkyManagement
          galeriaId={selectedGaleriaForObrazky.id}
          galeriaNazov={selectedGaleriaForObrazky.nazov}
          onClose={handleCloseObrazky}
        />
      )}
    </div>
  );
};

export default GaleriaManagement;