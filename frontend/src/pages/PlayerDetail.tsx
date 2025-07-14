// frontend/src/pages/PlayerDetail.tsx
// Detail hráča s všetkými informáciami

import React, { useState, useEffect } from 'react';

interface Player {
  id: number;
  meno: string;
  priezvisko: string;
  datum_narodenia: string;
  cislo_dresu?: number;
  pozicia: string;
  narodnost?: string;
  vaha?: number;
  vyska?: number;
  fotka?: string;
  full_name: string;
  vek: number;
  aktivity: boolean;
  poznamky?: string;
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

const PlayerDetail: React.FC = () => {
  // Manuálne parsovanie URL
  const pathParts = window.location.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  
  console.log('🔍 Player URL parts:', pathParts);
  console.log('🔍 Player ID z URL:', id);

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načítanie dát hráča
  const fetchPlayerData = async () => {
    if (!id || id === 'players' || isNaN(Number(id))) {
      console.log('❌ Neplatné ID hráča:', id);
      setError('Neplatné ID hráča');
      setLoading(false);
      return;
    }

    console.log('🔍 Načítavam hráča ID:', id);

    try {
      setLoading(true);
      setError(null);

      console.log('📡 Volám API:', `http://localhost:3000/api/players/${id}?include_team=true`);
      const response = await fetch(`http://localhost:3000/api/players/${id}?include_team=true`);
      console.log('📡 Player response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Hráč nenájdený');
        }
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 Player data:', data);
      
      if (data.success) {
        setPlayer(data.data);
        console.log('✅ Player nastavený:', data.data);
      } else {
        throw new Error(data.message || 'Chyba pri načítaní hráča');
      }
    } catch (err) {
      console.error('❌ Chyba pri načítaní hráča:', err);
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerData();
  }, [id]);

  // Pomocné funkcie
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPositionEmoji = (pozicia: string): string => {
    const emojis = {
      'brankár': '🥅',
      'obranca': '🛡️',
      'stredopoliar': '⚽',
      'útočník': '🎯'
    };
    return emojis[pozicia.toLowerCase() as keyof typeof emojis] || '⚽';
  };

  const calculateBMI = (vaha?: number, vyska?: number): number | null => {
    if (!vaha || !vyska) return null;
    const vyskaMeters = vyska / 100;
    return Math.round((vaha / (vyskaMeters * vyskaMeters)) * 10) / 10;
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'Podváha';
    if (bmi < 25) return 'Normálna váha';
    if (bmi < 30) return 'Nadváha';
    return 'Obezita';
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
        <div>Načítavam hráča...</div>
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
          Pokúšam sa načítať hráča s ID: {id}
        </div>
        <button 
          onClick={fetchPlayerData} 
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

  if (!player) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '16px' }}>
          🔍 Hráč nenájdený
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

  const bmi = calculateBMI(player.vaha, player.vyska);

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
        {player.tim && (
          <>
            <span style={{ margin: '0 8px' }}>→</span>
            <a 
              href={`/teams/${player.tim.id}`} 
              style={{ color: '#3b82f6', textDecoration: 'none' }}
            >
              {player.tim.nazov}
            </a>
          </>
        )}
        <span style={{ margin: '0 8px' }}>→</span>
        <span>{player.full_name}</span>
      </div>

      {/* Player Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '32px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Team Color Header */}
        {player.tim && (
          <div style={{
            height: '8px',
            background: player.tim.farba_prva 
              ? `linear-gradient(90deg, ${player.tim.farba_prva} 0%, ${player.tim.farba_druha || player.tim.farba_prva} 100%)`
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
            {/* Player Photo */}
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
              {player.fotka ? (
                <img 
                  src={player.fotka} 
                  alt={player.full_name}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              ) : (
                <span style={{ fontSize: '64px' }}>👤</span>
              )}
            </div>

            {/* Player Info */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              {/* Name and Number */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                {player.cislo_dresu && (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}>
                    {player.cislo_dresu}
                  </div>
                )}
                <div>
                  <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    marginBottom: '4px',
                    margin: 0
                  }}>
                    {player.full_name}
                  </h1>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      fontSize: '16px',
                      padding: '4px 12px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '16px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {getPositionEmoji(player.pozicia)} {player.pozicia}
                    </span>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                      {player.vek} rokov
                    </span>
                    {player.narodnost && (
                      <span style={{ fontSize: '14px', color: '#64748b' }}>
                        🌍 {player.narodnost}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Info */}
              {player.tim && (
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
                    Hrá za:
                  </div>
                  <a
                    href={`/teams/${player.tim.id}`}
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#3b82f6',
                      textDecoration: 'none'
                    }}
                  >
                    {player.tim.nazov} ({player.tim.vekova_kategoria})
                  </a>
                </div>
              )}
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
              <span style={{ fontWeight: '500' }}>{player.meno}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Priezvisko:</span>
              <span style={{ fontWeight: '500' }}>{player.priezvisko}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Vek:</span>
              <span style={{ fontWeight: '500' }}>{player.vek} rokov</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Dátum narodenia:</span>
              <span style={{ fontWeight: '500' }}>{formatDate(player.datum_narodenia)}</span>
            </div>
            
            {player.narodnost && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ color: '#64748b' }}>Národnosť:</span>
                <span style={{ fontWeight: '500' }}>{player.narodnost}</span>
              </div>
            )}
          </div>
        </div>

        {/* Playing Information */}
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
            ⚽ Herné údaje
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Pozícia:</span>
              <span style={{ 
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {getPositionEmoji(player.pozicia)} {player.pozicia}
              </span>
            </div>
            
            {player.cislo_dresu && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ color: '#64748b' }}>Číslo dresu:</span>
                <span style={{ 
                  fontWeight: '500',
                  color: '#3b82f6'
                }}>
                  #{player.cislo_dresu}
                </span>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Status:</span>
              <span style={{ 
                fontWeight: '500',
                color: player.aktivity ? '#10b981' : '#ef4444'
              }}>
                {player.aktivity ? '✅ Aktívny' : '❌ Neaktívny'}
              </span>
            </div>
          </div>
        </div>

        {/* Physical Stats */}
        {(player.vyska || player.vaha) && (
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
              📏 Fyzické parametre
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {player.vyska && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ color: '#64748b' }}>Výška:</span>
                  <span style={{ fontWeight: '500' }}>{player.vyska} cm</span>
                </div>
              )}
              
              {player.vaha && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ color: '#64748b' }}>Váha:</span>
                  <span style={{ fontWeight: '500' }}>{player.vaha} kg</span>
                </div>
              )}
              
              {bmi && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ color: '#64748b' }}>BMI:</span>
                  <span style={{ fontWeight: '500' }}>
                    {bmi} ({getBMICategory(bmi)})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {player.poznamky && (
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
            {player.poznamky}
          </p>
        </div>
      )}

      {/* Statistics Placeholder */}
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
          📊 Štatistiky sezóny
        </h3>
        
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
          <h4 style={{ marginBottom: '8px' }}>Štatistiky budú čoskoro dostupné</h4>
          <p>Pracujeme na implementácii detailných štatistík hráčov</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        marginTop: '32px',
        flexWrap: 'wrap'
      }}>
        {player.tim && (
          <a
            href={`/teams/${player.tim.id}`}
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
        <div>Profil vytvorený: {formatDate(player.vytvoreny)}</div>
        <div>Posledná aktualizácia: {formatDate(player.aktualizovany)}</div>
      </div>
    </div>
  );
};

export default PlayerDetail;