// frontend/src/pages/GalleryDetail.tsx
// Detail fotogalérie s obrázkami - testovacia stránka pre API

import React, { useState, useEffect } from 'react';

interface GalleryImage {
  id: number;
  nazov?: string;
  popis?: string;
  cesta_suboru: string;
  nahladovy_maly?: string;
  nahladovy_velky?: string;
  poradie: number;
  aktivity: boolean;
  vytvoreny: string;
}

interface Gallery {
  id: number;
  nazov: string;
  popis?: string;
  pocet_obrazkov: number;
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
  obrazky?: GalleryImage[];
}

interface ApiResponse {
  success: boolean;
  data: {
    galeria: Gallery;
  };
  message: string;
}

const GalleryDetail: React.FC = () => {
  // Získanie ID z URL
  const pathParts = window.location.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState<{ [key: number]: boolean }>({});

  // Načítanie galérie z API
  const fetchGallery = async () => {
    if (!id || isNaN(Number(id))) {
      setError('Neplatné ID galérie');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/galleries/${id}`);
      
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Galéria nenájdená' : `HTTP chyba: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      if (data.success) {
        setGallery(data.data.galeria);
        console.log('✅ Gallery nastavená:', data.data.galeria);
      } else {
        throw new Error(data.message || 'Chyba pri načítaní galérie');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [id]);

  // Formátovanie dátumu
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Získanie typu priradenia
  const getAssignmentInfo = (gallery: Gallery) => {
    if (gallery.tim_id) return { type: 'Tím', name: gallery.tim_nazov || 'Neznámy tím', icon: '👥' };
    if (gallery.clanok_id) return { type: 'Článok', name: gallery.clanok_nazov || 'Neznámy článok', icon: '📰' };
    if (gallery.zapas_id) return { type: 'Zápas', name: gallery.zapas_nazov || 'Neznámy zápas', icon: '⚽' };
    return { type: 'Voľná galéria', name: 'Nepriradená', icon: '📁' };
  };

  // Obsluha kliknutia na obrázok
  const handleImageClick = (imageIndex: number) => {
    setSelectedImage(imageIndex);
  };

  // Zatvorenie modalu
  const closeModal = () => {
    setSelectedImage(null);
  };

  // Navigácia v modale
  const navigateImage = (direction: 'prev' | 'next') => {
    if (!gallery?.obrazky || selectedImage === null) return;
    
    const currentIndex = selectedImage;
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : gallery.obrazky.length - 1;
    } else {
      newIndex = currentIndex < gallery.obrazky.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedImage(newIndex);
  };

  // Obsluha načítania obrázka
  const handleImageLoad = (imageId: number) => {
    setImageLoading(prev => ({ ...prev, [imageId]: false }));
  };

  const handleImageLoadStart = (imageId: number) => {
    setImageLoading(prev => ({ ...prev, [imageId]: true }));
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Načítavam galériu...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        ❌ {error}
        <br />
        <button onClick={fetchGallery} style={{ marginTop: '10px', padding: '5px 10px' }}>
          Skúsiť znovu
        </button>
      </div>
    );
  }

  if (!gallery) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Galéria nenájdená</div>;
  }

  const assignment = getAssignmentInfo(gallery);
  const images = gallery.obrazky || [];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '20px' }}>
        <span 
          onClick={() => window.history.back()} 
          style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
        >
          ← Späť na galérie
        </span>
      </div>

      {/* Hlavička galérie */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '28px' }}>
              📷 {gallery.nazov}
            </h1>
            
            {gallery.popis && (
              <p style={{ 
                color: '#666', 
                margin: '0 0 15px 0',
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                {gallery.popis}
              </p>
            )}
          </div>

          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: gallery.aktivity ? '#d1fae5' : '#fee2e2',
            color: gallery.aktivity ? '#065f46' : '#991b1b'
          }}>
            {gallery.aktivity ? '✅ Aktívna' : '❌ Neaktívna'}
          </div>
        </div>

        {/* Info riadky */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              📊 Počet obrázkov
            </div>
            <div style={{ fontWeight: '600', color: '#333' }}>
              {gallery.pocet_obrazkov}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              📂 Priradenie
            </div>
            <div style={{ fontWeight: '600', color: '#333' }}>
              {assignment.icon} {assignment.type}
            </div>
            {assignment.name !== 'Nepriradená' && (
              <div style={{ fontSize: '14px', color: '#666' }}>
                {assignment.name}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              📅 Vytvorená
            </div>
            <div style={{ fontWeight: '600', color: '#333' }}>
              {formatDate(gallery.vytvoreny)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              🆔 ID galérie
            </div>
            <div style={{ fontWeight: '600', color: '#333' }}>
              #{gallery.id}
            </div>
          </div>
        </div>
      </div>

      {/* Obrázky */}
      {images.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📷</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Žiadne obrázky</h3>
          <p style={{ color: '#666', margin: 0 }}>
            Táto galéria zatiaľ neobsahuje žiadne obrázky.
          </p>
        </div>
      ) : (
        <div>
          <h2 style={{ 
            margin: '0 0 20px 0', 
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🖼️ Obrázky ({images.length})
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            {images.map((image, index) => (
              <div
                key={image.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={() => handleImageClick(index)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Obrázok */}
                <div style={{
                  height: '200px',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {imageLoading[image.id] && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 2
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        border: '2px solid #e2e8f0',
                        borderTop: '2px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                    </div>
                  )}
                  
                  <img
                    src={image.nahladovy_maly || image.cesta_suboru}
                    alt={image.nazov || `Obrázok ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onLoadStart={() => handleImageLoadStart(image.id)}
                    onLoad={() => handleImageLoad(image.id)}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #999;">
                          <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
                          <div>Obrázok sa nepodarilo načítať</div>
                        </div>
                      `;
                    }}
                  />

                  {/* Poradie badge */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    #{image.poradie}
                  </div>
                </div>

                {/* Info */}
                {(image.nazov || image.popis) && (
                  <div style={{ padding: '12px' }}>
                    {image.nazov && (
                      <h4 style={{
                        margin: '0 0 6px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        {image.nazov}
                      </h4>
                    )}
                    
                    {image.popis && (
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#666',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {image.popis}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal pre zobrazenie obrázka */}
      {selectedImage !== null && images[selectedImage] && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Zatvoriť tlačidlo */}
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px'
              }}
            >
              ✕
            </button>

            {/* Navigačné tlačidlá */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => navigateImage('prev')}
                  style={{
                    position: 'absolute',
                    left: '-50px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '12px',
                    borderRadius: '50%'
                  }}
                >
                  ←
                </button>
                
                <button
                  onClick={() => navigateImage('next')}
                  style={{
                    position: 'absolute',
                    right: '-50px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '12px',
                    borderRadius: '50%'
                  }}
                >
                  →
                </button>
              </>
            )}

            {/* Obrázok */}
            <img
              src={images[selectedImage].nahladovy_velky || images[selectedImage].cesta_suboru}
              alt={images[selectedImage].nazov || `Obrázok ${selectedImage + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 60px)',
                objectFit: 'contain',
                borderRadius: '4px'
              }}
            />

            {/* Info pod obrázkom */}
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '4px',
              marginTop: '12px',
              textAlign: 'center',
              maxWidth: '100%'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {images[selectedImage].nazov || `Obrázok ${selectedImage + 1}`}
              </div>
              {images[selectedImage].popis && (
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  {images[selectedImage].popis}
                </div>
              )}
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '6px' }}>
                {selectedImage + 1} / {images.length}
              </div>
            </div>
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

export default GalleryDetail;