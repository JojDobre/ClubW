// frontend/src/pages/Galleries.tsx
// Fotogalérie - testovacia stránka pre API

import React, { useState, useEffect } from 'react';

interface Gallery {
  id: number;
  nazov: string;
  popis?: string;
  pocet_obrazkov: number;
  nahladovy_obrazok?: string;
  tim_id?: number;
  tim_nazov?: string;
  clanok_id?: number;
  clanok_nazov?: string;
  zapas_id?: number;
  zapas_nazov?: string;
  typ_priradenia: 'tim' | 'clanok' | 'zapas' | 'volna';
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    galerie: Gallery[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message: string;
}

const Galleries: React.FC = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<any>(null);

  // Načítanie galérií z API
  const fetchGalleries = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Zostavenie URL s filtrami
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filterType) params.append('typ', filterType);
      params.append('page', page.toString());
      params.append('limit', '12');

      const url = params.toString() 
        ? `http://localhost:3000/api/galleries?${params.toString()}`
        : `http://localhost:3000/api/galleries?page=${page}&limit=12`;

      console.log('📡 Volám galleries API:', url);
      const response = await fetch(url);
      console.log('📡 Galleries response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('📡 Galleries data:', data);
      
      if (data.success) {
        let filteredGalleries = data.data.galerie;
        
        // DOČASNÉ: Frontend filtrovanie ak backend nefiltruje správne
        if (filterType) {
          filteredGalleries = data.data.galerie.filter(gallery => {
            const assignment = getAssignmentTypeRaw(gallery);
            switch (filterType) {
              case 'tim':
                return assignment === 'tim';
              case 'clanok':
                return assignment === 'clanok';
              case 'zapas':
                return assignment === 'zapas';
              case 'volna':
                return assignment === 'volna';
              default:
                return true;
            }
          });
          console.log(`🔍 Frontend filter ${filterType}: ${filteredGalleries.length} z ${data.data.galerie.length} galérií`);
        }
        
        setGalleries(filteredGalleries);
        setPagination({
          ...data.data.pagination,
          total: filteredGalleries.length // Aktualizujeme počet pre frontend filter
        });
        setCurrentPage(page);
        console.log('✅ Galleries nastavené:', filteredGalleries.length);
      } else {
        throw new Error(data.message || 'Chyba pri načítaní galérií');
      }
    } catch (err) {
      console.error('❌ Chyba pri načítaní galérií:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries(1);
  }, [searchTerm, filterType]);

  // Formátovanie dátumu
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Helper funkcia pre určenie typu priradenia (raw)
  const getAssignmentTypeRaw = (gallery: Gallery) => {
    if (gallery.typ_priradenia) {
      return gallery.typ_priradenia;
    }
    // Fallback logika
    if (gallery.tim_id) return 'tim';
    if (gallery.clanok_id) return 'clanok';
    if (gallery.zapas_id) return 'zapas';
    return 'volna';
  };

  // Získanie typu priradenia
  const getAssignmentType = (gallery: Gallery) => {
    // Kontrolujeme typ_priradenia z API alebo logicky určujeme
    if (gallery.typ_priradenia === 'tim' || gallery.tim_id) {
      return { type: 'Tím', name: gallery.tim_nazov || 'Neznámy tím' };
    }
    if (gallery.typ_priradenia === 'clanok' || gallery.clanok_id) {
      return { type: 'Článok', name: gallery.clanok_nazov || 'Neznámy článok' };
    }
    if (gallery.typ_priradenia === 'zapas' || gallery.zapas_id) {
      return { type: 'Zápas', name: gallery.zapas_nazov || 'Neznámy zápas' };
    }
    // Voľná galéria - nie je priradená nikam
    return { type: 'Voľná', name: 'Nepriradená' };
  };

  // Získanie ikony pre typ
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Tím': return '👥';
      case 'Článok': return '📰';
      case 'Zápas': return '⚽';
      case 'Voľná': return '📁';
      default: return '📷';
    }
  };

  // Načítanie stránky
  const handlePageChange = (page: number) => {
    if (page !== currentPage) {
      fetchGalleries(page);
    }
  };

  if (loading && galleries.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Načítavam galérie...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        ❌ {error}
        <br />
        <button onClick={() => fetchGalleries(currentPage)} style={{ marginTop: '10px', padding: '5px 10px' }}>
          Skúsiť znovu
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hlavička */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>
          📷 Fotogalérie
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Prehľad všetkých fotogalérií klubu
        </p>
      </div>

      {/* Filtre a vyhľadávanie */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '15px'
        }}>
          {/* Vyhľadávanie */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              🔍 Vyhľadávanie
            </label>
            <input
              type="text"
              placeholder="Názov galérie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Filter typu */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              📂 Typ priradenia
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Všetky typy</option>
              <option value="tim">👥 Tímové galérie</option>
              <option value="clanok">📰 Články</option>
              <option value="zapas">⚽ Zápasy</option>
              <option value="volna">📁 Voľné galérie</option>
            </select>
          </div>
        </div>

        {/* Štatistiky */}
        {pagination && (
          <div style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            flexWrap: 'wrap',
            paddingTop: '15px',
            borderTop: '1px solid #eee'
          }}>
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              📊 Celkovo: <strong>{pagination.total}</strong> galérií
            </div>
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              📷 Obrázkov: <strong>{galleries.reduce((sum, g) => sum + g.pocet_obrazkov, 0)}</strong>
            </div>
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              📄 Stránka: <strong>{pagination.page}</strong> z <strong>{pagination.pages}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Galérie */}
      {galleries.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📷</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Žiadne galérie</h3>
          <p style={{ color: '#666', margin: 0 }}>
            {searchTerm || filterType ? 'Skúste zmeniť vyhľadávanie alebo filter' : 'Zatiaľ nie sú vytvorené žiadne galérie'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {galleries.map((gallery) => {
            const assignment = getAssignmentType(gallery);
            return (
              <div
                key={gallery.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={() => window.location.href = `/galleries/${gallery.id}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Náhľadový obrázok */}
                <div style={{
                  height: '200px',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  backgroundImage: gallery.nahladovy_obrazok ? `url(${gallery.nahladovy_obrazok})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                  {!gallery.nahladovy_obrazok && (
                    <div style={{ textAlign: 'center', color: '#999' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
                      <div>Bez náhľadu</div>
                    </div>
                  )}
                  
                  {/* Počet obrázkov badge */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    📷 {gallery.pocet_obrazkov}
                  </div>

                  {/* Typ priradenia badge */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    color: '#333',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {getTypeIcon(assignment.type)} {assignment.type}
                  </div>
                </div>

                {/* Obsah */}
                <div style={{ padding: '15px' }}>
                  {/* Názov */}
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333',
                    lineHeight: '1.3'
                  }}>
                    {gallery.nazov}
                  </h3>

                  {/* Popis */}
                  {gallery.popis && (
                    <p style={{
                      margin: '0 0 12px 0',
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {gallery.popis}
                    </p>
                  )}

                  {/* Priradenie */}
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                      Priradená k:
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
                      {getTypeIcon(assignment.type)} {assignment.name}
                    </div>
                  </div>

                  {/* Meta informácie */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#999',
                    paddingTop: '12px',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <div>
                      📅 {formatDate(gallery.vytvoreny)}
                    </div>
                    <div>
                      🆔 #{gallery.id}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{
                    marginTop: '8px',
                    textAlign: 'center'
                  }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '500',
                      backgroundColor: gallery.aktivity ? '#d1fae5' : '#fee2e2',
                      color: gallery.aktivity ? '#065f46' : '#991b1b'
                    }}>
                      {gallery.aktivity ? '✅ Aktívna' : '❌ Neaktívna'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginácia */}
      {pagination && pagination.pages > 1 && (
        <div style={{
          marginTop: '40px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {/* Predchádzajúca */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPrev || loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: pagination.hasPrev && !loading ? 'white' : '#f5f5f5',
              color: pagination.hasPrev && !loading ? '#333' : '#999',
              cursor: pagination.hasPrev && !loading ? 'pointer' : 'not-allowed'
            }}
          >
            ← Predchádzajúca
          </button>

          {/* Čísla stránok */}
          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
            const pageNum = Math.max(1, currentPage - 2) + i;
            if (pageNum > pagination.pages) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                disabled={loading}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: pageNum === currentPage ? '#3b82f6' : 'white',
                  color: pageNum === currentPage ? 'white' : '#333',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: pageNum === currentPage ? '600' : 'normal'
                }}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Ďalšia */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.hasNext || loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: pagination.hasNext && !loading ? 'white' : '#f5f5f5',
              color: pagination.hasNext && !loading ? '#333' : '#999',
              cursor: pagination.hasNext && !loading ? 'pointer' : 'not-allowed'
            }}
          >
            Ďalšia →
          </button>
        </div>
      )}

      {/* Loading overlay pre pagináciu */}
      {loading && galleries.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }}></div>
            <div>Načítavam galérie...</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Galleries;