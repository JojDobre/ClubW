// frontend/src/pages/StaffDetail.tsx
// Detail člena realizačného tímu

import React, { useState, useEffect } from 'react';

interface Staff {
  id: number;
  meno: string;
  priezvisko: string;
  funkcia: string;
  email?: string;
  telefon?: string;
  datum_narodenia?: string;
  kvalifikacia?: string;
  fotka?: string;
  tim_id?: number;
  aktivity: boolean;
  poznamky?: string;
  poradie: number;
  full_name: string;
  vek?: number;
  ma_kontakt: boolean;
  vytvoreny: string;
  aktualizovany: string;
  tim?: Team;
}

interface Team {
  id: number;
  nazov: string;
  typ: string;
  vekova_kategoria: string;
  full_name: string;
  farba_prva?: string;
  farba_druha?: string;
  logo?: string;
}

const StaffDetail: React.FC = () => {
  // Manuálne parsovanie URL
  const pathParts = window.location.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  
  console.log('🔍 Staff URL parts:', pathParts);
  console.log('🔍 Staff ID z URL:', id);

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načítanie dát člena realizačného tímu
  const fetchStaffData = async () => {
    if (!id || id === 'staff' || isNaN(Number(id))) {
      console.log('❌ Neplatné ID člena realizačného tímu:', id);
      setError('Neplatné ID člena realizačného tímu');
      setLoading(false);
      return;
    }

    console.log('🔍 Načítavam člena realizačného tímu ID:', id);

    try {
      setLoading(true);
      setError(null);

      console.log('📡 Volám API:', `http://localhost:3000/api/staff/${id}?include_team=true`);
      const response = await fetch(`http://localhost:3000/api/staff/${id}?include_team=true`);
      console.log('📡 Staff response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Člen realizačného tímu nenájdený');
        }
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 Staff data:', data);
      
      if (data.success) {
        setStaff(data.data);
        console.log('✅ Staff nastavený:', data.data);
      } else {
        throw new Error(data.message || 'Chyba pri načítaní člena realizačného tímu');
      }
    } catch (err) {
      console.error('❌ Chyba pri načítaní člena realizačného tímu:', err);
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [id]);

  // Pomocné funkcie
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFunctionEmoji = (funkcia: string): string => {
    const emojis = {
      'hlavný tréner': '👨‍🏫',
      'asistent trénera': '👨‍💼',
      'brankársky tréner': '🥅',
      'kondičný tréner': '💪',
      'fyzioterapeut': '🏥',
      'masér': '✋',
      'vedúci mužstva': '📋',
      'lekár': '👨‍⚕️',
      'manažér': '💼',
      'skaut': '🔍',
      'koordinátor': '📊'
    };
    return emojis[funkcia.toLowerCase() as keyof typeof emojis] || '👤';
  };

  const getFunctionCategory = (funkcia: string): string => {
    const categories = {
      'hlavný tréner': 'Trénerský štáb',
      'asistent trénera': 'Trénerský štáb',
      'brankársky tréner': 'Trénerský štáb',
      'kondičný tréner': 'Trénerský štáb',
      'fyzioterapeut': 'Zdravotnícky tím',
      'masér': 'Zdravotnícky tím',
      'lekár': 'Zdravotnícky tím',
      'vedúci mužstva': 'Vedenie',
      'manažér': 'Vedenie',
      'skaut': 'Ostatní',
      'koordinátor': 'Ostatní'
    };
    return categories[funkcia.toLowerCase() as keyof typeof categories] || 'Ostatní';
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      'Trénerský štáb': '#3b82f6',
      'Zdravotnícky tím': '#10b981',
      'Vedenie': '#f59e0b',
      'Ostatní': '#6b7280'
    };
    return colors[category as keyof typeof colors] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 15px'
        }}></div>
        <div>Načítavam člena realizačného tímu...</div>
        <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
          ID: {id}
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: 'red', fontSize: '18px', marginBottom: '16px' }}>
          ❌ Chyba: {error}
        </div>
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
          Pokúšam sa načítať člena realizačného tímu s ID: {id}
        </div>
        <button 
          onClick={fetchStaffData} 
          style={{ 
            marginRight: '10px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Skúsiť znovu
        </button>
        <a 
          href="/teams" 
          style={{ 
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          ← Späť na tímy
        </a>
      </div>
    );
  }

  if (!staff) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '16px' }}>
          🔍 Člen realizačného tímu nenájdený
        </div>
        <a 
          href="/teams"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          ← Späť na tímy
        </a>
      </div>
    );
  }

  const category = getFunctionCategory(staff.funkcia);
  const categoryColor = getCategoryColor(category);

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{
        marginBottom: '24px',
        fontSize: '14px',
        color: '#64748b'
      }}>
        <a href="/teams" style={{ color: '#3b82f6', textDecoration: 'none' }}>
          Tímy
        </a>
        {staff.tim && (
          <>
            <span style={{ margin: '0 8px' }}>→</span>
            <a 
              href={`/teams/${staff.tim.id}`} 
              style={{ color: '#3b82f6', textDecoration: 'none' }}
            >
              {staff.tim.nazov}
            </a>
          </>
        )}
        <span style={{ margin: '0 8px' }}>→</span>
        <span>{staff.full_name}</span>
      </div>

      {/* Staff Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '32px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Team Color Header */}
        {staff.tim && (
          <div style={{
            height: '8px',
            background: staff.tim.farba_prva 
              ? `linear-gradient(90deg, ${staff.tim.farba_prva} 0%, ${staff.tim.farba_druha || staff.tim.farba_prva} 100%)`
              : 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
          }} />
        )}

        <div style={{ padding: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '32px',
            flexWrap: 'wrap'
          }}>
            {/* Staff Photo */}
            <div style={{
              width: '160px',
              height: '200px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {staff.fotka ? (
                <img 
                  src={staff.fotka} 
                  alt={staff.full_name}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              ) : (
                <span style={{ fontSize: '64px' }}>
                  {getFunctionEmoji(staff.funkcia)}
                </span>
              )}
            </div>

            {/* Staff Info */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              {/* Name and Function */}
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  marginBottom: '8px',
                  margin: 0
                }}>
                  {staff.full_name}
                </h1>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    fontSize: '18px',
                    padding: '6px 16px',
                    backgroundColor: categoryColor,
                    color: 'white',
                    borderRadius: '20px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {getFunctionEmoji(staff.funkcia)} {staff.funkcia}
                  </span>
                </div>
                
                <div style={{
                  fontSize: '14px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {category}
                  </span>
                  {staff.vek && (
                    <span>{staff.vek} rokov</span>
                  )}
                </div>
              </div>

              {/* Team Info */}
              {staff.tim ? (
                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#64748b',
                    marginBottom: '4px'
                  }}>
                    Pracuje pre:
                  </div>
                  <a
                    href={`/teams/${staff.tim.id}`}
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#3b82f6',
                      textDecoration: 'none'
                    }}
                  >
                    {staff.tim.nazov} ({staff.tim.vekova_kategoria})
                  </a>
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#fef3c7',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#92400e'
                  }}>
                    🏛️ Celý klub
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#92400e'
                  }}>
                    Pracuje pre celý klub, nie pre konkrétny tím
                  </div>
                </div>
              )}

              {/* Status */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: staff.aktivity ? '#dcfce7' : '#fee2e2',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: staff.aktivity ? '#166534' : '#dc2626'
                }}>
                  {staff.aktivity ? '✅ Aktívny' : '❌ Neaktívny'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Personal Information */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '24px'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📋 Osobné údaje
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Meno:</span>
              <span style={{ fontWeight: '500' }}>{staff.meno}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Priezvisko:</span>
              <span style={{ fontWeight: '500' }}>{staff.priezvisko}</span>
            </div>
            
            {staff.vek && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ color: '#64748b' }}>Vek:</span>
                <span style={{ fontWeight: '500' }}>{staff.vek} rokov</span>
              </div>
            )}

            {staff.datum_narodenia && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ color: '#64748b' }}>Dátum narodenia:</span>
                <span style={{ fontWeight: '500' }}>{formatDate(staff.datum_narodenia)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Professional Information */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '24px'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💼 Pracovné údaje
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Funkcia:</span>
              <span style={{ 
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {getFunctionEmoji(staff.funkcia)} {staff.funkcia}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Kategória:</span>
              <span style={{ 
                fontWeight: '500',
                color: categoryColor
              }}>
                {category}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Poradie:</span>
              <span style={{ fontWeight: '500' }}>#{staff.poradie}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Status:</span>
              <span style={{ 
                fontWeight: '500',
                color: staff.aktivity ? '#10b981' : '#ef4444'
              }}>
                {staff.aktivity ? '✅ Aktívny' : '❌ Neaktívny'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        {staff.ma_kontakt && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📞 Kontaktné údaje
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {staff.email && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ color: '#64748b' }}>Email:</span>
                  <a 
                    href={`mailto:${staff.email}`}
                    style={{ 
                      fontWeight: '500',
                      color: '#3b82f6',
                      textDecoration: 'none'
                    }}
                  >
                    📧 {staff.email}
                  </a>
                </div>
              )}
              
              {staff.telefon && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ color: '#64748b' }}>Telefón:</span>
                  <a 
                    href={`tel:${staff.telefon}`}
                    style={{ 
                      fontWeight: '500',
                      color: '#3b82f6',
                      textDecoration: 'none'
                    }}
                  >
                    📞 {staff.telefon}
                  </a>
                </div>
              )}
              
              {!staff.email && !staff.telefon && (
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  color: '#64748b',
                  fontStyle: 'italic'
                }}>
                  Kontaktné údaje nie sú k dispozícii
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Qualifications */}
      {staff.kvalifikacia && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🎓 Kvalifikácia a vzdelanie
          </h3>
          <div style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#374151',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            borderLeft: '4px solid #3b82f6'
          }}>
            {staff.kvalifikacia}
          </div>
        </div>
      )}

      {/* Notes */}
      {staff.poznamky && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📝 Poznámky
          </h3>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#374151',
            margin: 0,
            whiteSpace: 'pre-wrap'
          }}>
            {staff.poznamky}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        marginTop: '32px',
        flexWrap: 'wrap'
      }}>
        {staff.tim && (
          <a
            href={`/teams/${staff.tim.id}`}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            ← Späť na tím
          </a>
        )}
        
        <a
          href="/teams"
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontWeight: '500'
          }}
        >
          Všetky tímy
        </a>
        
        {/* Contact Actions */}
        {staff.ma_kontakt && (
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            {staff.email && (
              <a
                href={`mailto:${staff.email}`}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                📧 Email
              </a>
            )}
            
            {staff.telefon && (
              <a
                href={`tel:${staff.telefon}`}
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                📞 Volať
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '48px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#64748b',
        textAlign: 'center'
      }}>
        <div>Profil vytvorený: {formatDate(staff.vytvoreny)}</div>
        <div>Posledná aktualizácia: {formatDate(staff.aktualizovany)}</div>
        {staff.tim ? (
          <div style={{ marginTop: '4px' }}>
            Pracuje pre tím: <strong>{staff.tim.nazov}</strong>
          </div>
        ) : (
          <div style={{ marginTop: '4px' }}>
            Pracuje pre: <strong>Celý klub</strong>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDetail;