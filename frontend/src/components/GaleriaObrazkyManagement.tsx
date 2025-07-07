import React, { useState, useEffect } from 'react';

// Typy pre TypeScript
interface GaleriaObrazok {
  id: number;
  galeria_id: number;
  nazov?: string;
  popis?: string;
  originalny_nazov: string;
  velkost_suboru: number;
  velkost_formatovane: string;
  mime_typ: string;
  sirka?: number;
  vyska?: number;
  poradie: number;
  je_nahladovy: boolean;
  zobrazenia: number;
  url_original: string;
  url_maly: string;
  url_stredny: string;
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

interface Galeria {
  id: number;
  nazov: string;
  pocet_obrazkov: number;
}

interface Props {
  galeriaId: number;
  galeriaNazov: string;
  onClose: () => void;
}

const GaleriaObrazkyManagement: React.FC<Props> = ({ galeriaId, galeriaNazov, onClose }) => {
  const [obrazky, setObrazky] = useState<GaleriaObrazok[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingObrazok, setEditingObrazok] = useState<GaleriaObrazok | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Form data pre úpravu obrázka
  const [editForm, setEditForm] = useState({
    nazov: '',
    popis: '',
    je_nahladovy: false
  });

  // Načítanie obrázkov
  const fetchObrazky = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(`http://localhost:3000/api/admin/galleries/${galeriaId}/images?page=${page}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Chyba pri načítaní obrázkov');
      }

      const data = await response.json();
      setObrazky(data.data.obrazky);
      setTotalPages(data.data.pagination.pages);
      setCurrentPage(data.data.pagination.page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObrazky();
  }, [galeriaId]);

  // Upload obrázkov
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('Vyberte obrázky na upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('images', selectedFiles[i]);
      }

      const token = localStorage.getItem('clubw_token');
      const response = await fetch(`http://localhost:3000/api/admin/galleries/${galeriaId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Chyba pri upload');
      }

      const data = await response.json();
      alert(`Úspešne nahraných ${data.data.uploaded_count} obrázkov!`);
      
      // Reset file input
      setSelectedFiles(null);
      const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Refresh obrázky
      fetchObrazky(currentPage);
    } catch (err: any) {
      alert(`Chyba pri upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Otvorenie edit modalu
  const handleEditObrazok = (obrazok: GaleriaObrazok) => {
    setEditingObrazok(obrazok);
    setEditForm({
      nazov: obrazok.nazov || '',
      popis: obrazok.popis || '',
      je_nahladovy: obrazok.je_nahladovy
    });
    setShowEditModal(true);
  };

  // Uloženie úprav obrázka
  const handleSaveEdit = async () => {
    if (!editingObrazok) return;

    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(`http://localhost:3000/api/admin/galleries/${galeriaId}/images/${editingObrazok.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        throw new Error('Chyba pri ukladaní úprav');
      }

      setShowEditModal(false);
      setEditingObrazok(null);
      fetchObrazky(currentPage);
    } catch (err: any) {
      alert(`Chyba: ${err.message}`);
    }
  };

  // Vymazanie obrázka
  const handleDeleteObrazok = async (obrazokId: number) => {
    if (!window.confirm('Naozaj chcete vymazať tento obrázok?')) {
      return;
    }

    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(`http://localhost:3000/api/admin/galleries/${galeriaId}/images/${obrazokId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Chyba pri vymazávaní obrázka');
      }

      fetchObrazky(currentPage);
    } catch (err: any) {
      alert(`Chyba: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span>Načítavam obrázky...</span>
        </div>
      </div>
    );
  }

  return (
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
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1e293b',
              margin: 0,
              marginBottom: '4px'
            }}>
              📸 {galeriaNazov}
            </h2>
            <p style={{
              color: '#64748b',
              margin: 0,
              fontSize: '14px'
            }}>
              Správa obrázkov v galérii • {obrazky.length} obrázkov
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕ Zavrieť
          </button>
        </div>

        {/* Upload Section */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                id="imageUpload"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setSelectedFiles(e.target.files)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
              }}>
                Podporované formáty: JPG, PNG, GIF, WebP. Max veľkosť: 10MB na súbor.
              </div>
            </div>
            <button
              onClick={handleUpload}
              disabled={!selectedFiles || selectedFiles.length === 0 || uploading}
              style={{
                background: (!selectedFiles || selectedFiles.length === 0 || uploading) ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (!selectedFiles || selectedFiles.length === 0 || uploading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {uploading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Nahrávam...
                </>
              ) : (
                <>📤 Nahrať obrázky</>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 24px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Images Grid */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {obrazky.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
              <h3 style={{ margin: 0, marginBottom: '8px' }}>Žiadne obrázky</h3>
              <p style={{ margin: 0, textAlign: 'center' }}>
                Nahrajte prvé obrázky do tejto galérie pomocou formulára vyššie.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {obrazky.map((obrazok: GaleriaObrazok) => (
                <div
                  key={obrazok.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Image */}
                  <div style={{
                    position: 'relative',
                    height: '150px',
                    background: `url(${obrazok.url_stredny}) center/cover`,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-end',
                    padding: '8px'
                  }}>
                    {obrazok.je_nahladovy && (
                      <span style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500'
                      }}>
                        ⭐ Náhľad
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {obrazok.nazov || obrazok.originalny_nazov}
                    </div>
                    
                    <div style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginBottom: '8px'
                    }}>
                      {obrazok.velkost_formatovane} • {obrazok.sirka}×{obrazok.vyska}
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '4px'
                    }}>
                      <button
                        onClick={() => handleEditObrazok(obrazok)}
                        style={{
                          flex: 1,
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      >
                        ✏️ Upraviť
                      </button>
                      
                      <button
                        onClick={() => window.open(obrazok.url_original, '_blank')}
                        style={{
                          flex: 1,
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
                      >
                        👁️ Zobraziť
                      </button>

                      <button
                        onClick={() => handleDeleteObrazok(obrazok.id)}
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          fontSize: '10px',
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
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button
              disabled={currentPage === 1}
              onClick={() => fetchObrazky(currentPage - 1)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                background: currentPage === 1 ? '#f9fafb' : 'white',
                color: currentPage === 1 ? '#9ca3af' : '#374151',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              ‹ Predchádzajúca
            </button>

            <span style={{ padding: '0 12px', fontSize: '12px', color: '#6b7280' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => fetchObrazky(currentPage + 1)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                background: currentPage === totalPages ? '#f9fafb' : 'white',
                color: currentPage === totalPages ? '#9ca3af' : '#374151',
                borderRadius: '4px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Ďalšia ›
            </button>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingObrazok && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '16px',
                color: '#1e293b'
              }}>
                Upraviť obrázok
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Názov
                </label>
                <input
                  type="text"
                  value={editForm.nazov}
                  onChange={(e) => setEditForm({...editForm, nazov: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder={editingObrazok.originalny_nazov}
                />
              </div>

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
                  value={editForm.popis}
                  onChange={(e) => setEditForm({...editForm, popis: e.target.value})}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  placeholder="Voliteľný popis obrázka..."
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={editForm.je_nahladovy}
                    onChange={(e) => setEditForm({...editForm, je_nahladovy: e.target.checked})}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    Nastaviť ako náhľadový obrázok galérie
                  </span>
                </label>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Uložiť
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GaleriaObrazkyManagement;