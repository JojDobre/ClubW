// frontend/src/pages/Leagues.tsx
// Stránka so zoznamom líg a súťaží

import React, { useState, useEffect } from 'react';

interface League {
  id: number;
  nazov: string;
  sezona: string;
  typ: 'sutaz' | 'pohar' | 'priatelska';
  popis?: string;
  external_widget_url?: string;
  logo?: string;
  farba?: string;
  poradie: number;
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

const Leagues: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTyp, setFilterTyp] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Načítanie líg z API
  const fetchLeagues = async () => {
    try {
      setLoading(true);
      setError(null);

      // Zostavenie URL s filtrami
      const params = new URLSearchParams();
      if (filterTyp) params.append('typ', filterTyp);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const url = params.toString() 
        ? `http://localhost:3000/api/leagues?${params.toString()}`
        : `http://localhost:3000/api/leagues`;

      console.log('📡 Volám leagues API:', url);
      const response = await fetch(url);
      console.log('📡 Leagues response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 Leagues data:', data);
      
      if (data.success) {
        setLeagues(data.data);
        console.log('✅ Leagues nastavené:', data.data.length);
      } else {
        throw new Error(data.message || 'Chyba pri načítaní líg');
      }
    } catch (err) {
      console.error('❌ Chyba pri načítaní líg:', err);
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie pri prvom renderovaní a zmene filtrov
  useEffect(() => {
    fetchLeagues();
  }, [filterTyp, searchTerm]);

  // Funkcie pre formátovanie
  const formatLeagueType = (typ: string): string => {
    const types = {
      'sutaz': 'Súťaž',
      'pohar': 'Pohár',
      'priatelska': 'Priateľská'
    };
    return types[typ as keyof typeof types] || typ;
  };

  const getLeagueEmoji = (typ: string): string => {
    const emojis = {
      'sutaz': '🏆',
      'pohar': '🥇',
      'priatelska': '🤝'
    };
    return emojis[typ as keyof typeof emojis] || '⚽';
  };

  const getLeagueTypeColor = (typ: string): string => {
    const colors = {
      'sutaz': '#3b82f6',
      'pohar': '#f59e0b',
      'priatelska': '#10b981'
    };
    return colors[typ as keyof typeof colors] || '#6b7280';
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
        <div>Načítavam ligy...</div>
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
        <button 
          onClick={fetchLeagues} 
          style={{ 
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
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          🏆 Ligy a súťaže
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#64748b',
          marginBottom: '24px'
        }}>
          Prehľad všetkých súťaží a líg v ktorých náš klub hrá
        </p>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Search */}
          <div style={{ flex: '1', minWidth: '250px' }}>
            <input
              type="text"
              placeholder="Vyhľadať ligu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterTyp}
              onChange={(e) => setFilterTyp(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            >
              <option value="">Všetky typy</option>
              <option value="sutaz">🏆 Súťaže</option>
              <option value="pohar">🥇 Poháre</option>
              <option value="priatelska">🤝 Priateľské</option>
            </select>
          </div>
        </div>

        {/* Count */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ color: '#64748b' }}>
            Zobrazených: <strong>{leagues.length}</strong> líg
          </span>
        </div>
      </div>

      {/* Leagues */}
      {leagues.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#64748b',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ marginBottom: '8px' }}>Žiadne ligy nenájdené</h3>
          <p>Skúste zmeniť vyhľadávanie alebo filter</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {leagues.map((league) => (
            <div
              key={league.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              {/* Header with league color */}
              <div style={{
                height: '8px',
                backgroundColor: league.farba || getLeagueTypeColor(league.typ)
              }} />

              {/* Card Content */}
              <div style={{ padding: '24px' }}>
                {/* League Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  {/* Logo alebo emoji */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    flexShrink: 0
                  }}>
                    {league.logo ? (
                      <img 
                        src={league.logo} 
                        alt={`${league.nazov} logo`}
                        style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: '28px' }}>
                        {getLeagueEmoji(league.typ)}
                      </span>
                    )}
                  </div>

                  {/* League Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '1.375rem',
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: '6px',
                      lineHeight: '1.3'
                    }}>
                      {league.nazov}
                    </h3>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        padding: '3px 10px',
                        backgroundColor: getLeagueTypeColor(league.typ),
                        color: 'white',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        {formatLeagueType(league.typ)}
                      </span>
                      <span style={{
                        fontSize: '13px',
                        color: '#64748b',
                        fontWeight: '500'
                      }}>
                        {league.sezona}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {league.popis && (
                  <p style={{
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: '1.5',
                    marginBottom: '20px'
                  }}>
                    {league.popis.length > 120 
                      ? `${league.popis.substring(0, 120)}...` 
                      : league.popis
                    }
                  </p>
                )}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '16px'
                }}>
                  {/* View League Details */}
                  <a
                    href={`/leagues/${league.id}`}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    📊 Tabuľka
                  </a>

                  {/* External Widget */}
                  {league.external_widget_url && (
                    <a
                      href={league.external_widget_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#059669';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#10b981';
                      }}
                    >
                      🔗 Oficiálne
                    </a>
                  )}
                </div>

                {/* Mock Table Preview */}
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b'
                    }}>
                      AKTUÁLNA TABUĽKA
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: '#64748b'
                    }}>
                      {league.sezona}
                    </span>
                  </div>
                  
                  {/* Mock table data */}
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <span>1. Náš klub</span>
                      <span>25 bodov</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <span>2. Rival FC</span>
                      <span>22 bodov</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0'
                    }}>
                      <span>3. Lokálny tím</span>
                      <span>18 bodov</span>
                    </div>
                    <div style={{
                      textAlign: 'center',
                      marginTop: '8px',
                      fontSize: '11px',
                      color: '#9ca3af'
                    }}>
                      ... a ďalších {Math.floor(Math.random() * 8) + 5} tímov
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {leagues.length > 0 && (
        <div style={{
          marginTop: '48px',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '16px'
          }}>
            📊 Prehľad súťaží
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}>
            {/* Súťaže */}
            <div style={{
              textAlign: 'center',
              padding: '16px',
              backgroundColor: '#dbeafe',
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1e40af'
              }}>
                {leagues.filter(l => l.typ === 'sutaz').length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#1e40af',
                fontWeight: '500'
              }}>
                🏆 Súťaže
              </div>
            </div>

            {/* Poháre */}
            <div style={{
              textAlign: 'center',
              padding: '16px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#92400e'
              }}>
                {leagues.filter(l => l.typ === 'pohar').length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#92400e',
                fontWeight: '500'
              }}>
                🥇 Poháre
              </div>
            </div>

            {/* Priateľské */}
            <div style={{
              textAlign: 'center',
              padding: '16px',
              backgroundColor: '#dcfce7',
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#166534'
              }}>
                {leagues.filter(l => l.typ === 'priatelska').length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#166534',
                fontWeight: '500'
              }}>
                🤝 Priateľské
              </div>
            </div>

            {/* Sezóny */}
            <div style={{
              textAlign: 'center',
              padding: '16px',
              backgroundColor: '#f3e8ff',
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#7c3aed'
              }}>
                {new Set(leagues.map(l => l.sezona)).size}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#7c3aed',
                fontWeight: '500'
              }}>
                📅 Sezóny
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #bae6fd'
      }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#0369a1',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💡 Ako používať
        </h4>
        <ul style={{
          fontSize: '14px',
          color: '#0369a1',
          margin: 0,
          paddingLeft: '20px'
        }}>
          <li>Kliknite na <strong>"📊 Tabuľka"</strong> pre zobrazenie detailnej tabuľky ligy</li>
          <li>Použite <strong>"🔗 Oficiálne"</strong> pre prechod na oficiálnu stránku ligy</li>
          <li>Filtrovanie podľa typu vám pomôže nájsť konkrétne súťaže</li>
          <li>Vyhľadávanie funguje v názvoch a sezónach</li>
        </ul>
      </div>
    </div>
  );
};

export default Leagues;