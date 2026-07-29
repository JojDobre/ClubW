// frontend/src/pages/Matches.tsx
// Stránka so zoznamom zápasov

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

interface Match {
  id: number;
  nazov: string;
  liga_id?: number;
  liga_nazov?: string;
  kolo?: string;
  datum_cas: string;
  miesto?: string;
  domaci_tim_id?: number;
  domaci_tim_nazov?: string;
  hostujuci_tim_id?: number;
  hostujuci_tim_nazov?: string;
  goly_domaci?: number;
  goly_hostia?: number;
  status: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  pocet_divakov?: number;
  poznamky?: string;
  video_url?: string;
  clanok_id?: number;
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

const Matches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLiga, setFilterLiga] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Načítanie zápasov z API
  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // Zostavenie URL s filtrami (bez liga_nazov)
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      // Odstránené: if (filterLiga) params.append('liga_nazov', filterLiga);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const url = params.toString() 
        ? apiUrl(`/matches?${params.toString()}`)
        : apiUrl(`/matches`);

      console.log('📡 Volám matches API:', url);
      const response = await fetch(url);
      console.log('📡 Matches response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 Matches data:', data);
      
      if (data.success) {
        setMatches(data.data);
        console.log('✅ Matches nastavené:', data.data.length);
      } else {
        throw new Error(data.message || 'Chyba pri načítaní zápasov');
      }
    } catch (err) {
      console.error('❌ Chyba pri načítaní zápasov:', err);
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie pri prvom renderovaní a zmene filtrov (bez liga filtra)
  useEffect(() => {
    fetchMatches();
  }, [filterStatus, searchTerm]); // Odstránený filterLiga

  // Client-side filtrovanie pre ligy
  const filteredMatches = matches.filter(match => {
    // Filter podľa ligy
    if (filterLiga && match.liga_nazov !== filterLiga) {
      return false;
    }
    return true;
  });

  // Funkcie pre formátovanie
  const formatMatchStatus = (status: string): string => {
    const statuses = {
      'naplanovany': 'Naplánovaný',
      'prebieha': 'Prebieha',
      'ukonceny': 'Ukončený',
      'odlozeny': 'Odložený',
      'zruseny': 'Zrušený'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStatusEmoji = (status: string): string => {
    const emojis = {
      'naplanovany': '📅',
      'prebieha': '⚽',
      'ukonceny': '✅',
      'odlozeny': '⏰',
      'zruseny': '❌'
    };
    return emojis[status as keyof typeof emojis] || '⚽';
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      'naplanovany': '#3b82f6',
      'prebieha': '#f59e0b',
      'ukonceny': '#10b981',
      'odlozeny': '#6b7280',
      'zruseny': '#ef4444'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const formatDateTime = (dateTimeString: string): { date: string, time: string } => {
    const dt = new Date(dateTimeString);
    return {
      date: dt.toLocaleDateString('sk-SK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      time: dt.toLocaleTimeString('sk-SK', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const isMatchFinished = (status: string): boolean => {
    return status === 'ukonceny';
  };

  const isMatchLive = (status: string): boolean => {
    return status === 'prebieha';
  };

  const isMatchUpcoming = (status: string, dateTime: string): boolean => {
    return status === 'naplanovany' && new Date(dateTime) > new Date();
  };

  // Získanie unikátnych líg pre filter
  const getUniqueLeagues = (): string[] => {
    const leagues = matches
      .map(match => match.liga_nazov)
      .filter((liga): liga is string => liga !== undefined && liga !== null);
    return Array.from(new Set(leagues)).sort();
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
        <div>Načítavam zápasy...</div>
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
          onClick={fetchMatches} 
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
          ⚽ Zápasy
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#64748b',
          marginBottom: '24px'
        }}>
          Prehľad všetkých zápasov - minulých, súčasných a budúcich
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
              placeholder="Vyhľadať zápas..."
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

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
              <option value="">Všetky stavy</option>
              <option value="naplanovany">📅 Naplánované</option>
              <option value="prebieha">⚽ Prebieha</option>
              <option value="ukonceny">✅ Ukončené</option>
              <option value="odlozeny">⏰ Odložené</option>
              <option value="zruseny">❌ Zrušené</option>
            </select>
          </div>

          {/* League Filter */}
          <div>
            <select
              value={filterLiga}
              onChange={(e) => setFilterLiga(e.target.value)}
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
              <option value="">Všetky ligy</option>
              {getUniqueLeagues().map(liga => (
                <option key={liga} value={liga}>{liga}</option>
              ))}
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
            Zobrazených: <strong>{filteredMatches.length}</strong> zápasov
            {filteredMatches.length !== matches.length && (
              <span> (z {matches.length} celkovo)</span>
            )}
          </span>
        </div>
      </div>

      {/* Matches */}
      {filteredMatches.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#64748b',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ marginBottom: '8px' }}>Žiadne zápasy nenájdené</h3>
          <p>Skúste zmeniť vyhľadávanie alebo filter</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMatches.map((match) => {
            const { date, time } = formatDateTime(match.datum_cas);
            const isFinished = isMatchFinished(match.status);
            const isLive = isMatchLive(match.status);
            const isUpcoming = isMatchUpcoming(match.status, match.datum_cas);

            return (
              <div
                key={match.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: `2px solid ${isLive ? '#f59e0b' : '#e2e8f0'}`,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  boxShadow: isLive 
                    ? '0 0 20px rgba(245, 158, 11, 0.3)' 
                    : '0 2px 4px rgba(0,0,0,0.1)',
                  ...(isLive && {
                    animation: 'pulse 2s infinite'
                  })
                }}
                onClick={() => window.location.href = `/matches/${match.id}`}
                onMouseEnter={(e) => {
                  if (!isLive) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLive) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }
                }}
              >
                {/* Live indicator */}
                {isLive && (
                  <div style={{
                    height: '4px',
                    background: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)'
                  }} />
                )}

                <div style={{ padding: '20px' }}>
                  {/* Match Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    {/* Date, Time, Status */}
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '4px'
                      }}>
                        {date} • {time}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          backgroundColor: getStatusColor(match.status),
                          color: 'white',
                          borderRadius: '12px',
                          fontWeight: '500'
                        }}>
                          {getStatusEmoji(match.status)} {formatMatchStatus(match.status)}
                        </span>
                        {match.liga_nazov && (
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            borderRadius: '12px'
                          }}>
                            {match.liga_nazov}
                          </span>
                        )}
                        {match.kolo && (
                          <span style={{
                            fontSize: '12px',
                            color: '#64748b'
                          }}>
                            {match.kolo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Live indicator text */}
                    {isLive && (
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#f59e0b',
                        padding: '4px 8px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '4px'
                      }}>
                        🔴 NAŽIVO
                      </div>
                    )}
                  </div>

                  {/* Teams and Score */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    gap: '16px'
                  }}>
                    {/* Home Team */}
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      minWidth: '120px'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '4px'
                      }}>
                        {match.domaci_tim_nazov || 'Domáci tím'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b'
                      }}>
                        Domáci
                      </div>
                    </div>

                    {/* Score or VS */}
                    <div style={{
                      flex: 0,
                      padding: '0 24px',
                      textAlign: 'center',
                      minWidth: '80px'
                    }}>
                      {isFinished && match.goly_domaci !== null && match.goly_hostia !== null ? (
                        <div style={{
                          fontSize: '32px',
                          fontWeight: 'bold',
                          color: '#1e293b'
                        }}>
                          {match.goly_domaci} : {match.goly_hostia}
                        </div>
                      ) : isLive && match.goly_domaci !== null && match.goly_hostia !== null ? (
                        <div style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: '#f59e0b'
                        }}>
                          {match.goly_domaci} : {match.goly_hostia}
                        </div>
                      ) : (
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: '#64748b'
                        }}>
                          VS
                        </div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      minWidth: '120px'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '4px'
                      }}>
                        {match.hostujuci_tim_nazov || 'Hosťujúci tím'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b'
                      }}>
                        Hosťujúci
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#64748b',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      {match.miesto && (
                        <span>📍 {match.miesto}</span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {match.pocet_divakov && (
                        <span>👥 {match.pocet_divakov}</span>
                      )}
                      {match.video_url && (
                        <a
                          href={match.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#3b82f6',
                            textDecoration: 'none'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          📹 Video
                        </a>
                      )}
                      {match.clanok_id && (
                        <a
                          href={`/articles/${match.clanok_id}`}
                          style={{
                            color: '#3b82f6',
                            textDecoration: 'none'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          📰 Článok
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* CSS for pulse animation */}
                <style>{`
                  @keyframes pulse {
                    0% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.5); }
                    100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
                  }
                `}</style>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      {filteredMatches.length > 0 && (
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
            📊 Prehľad zápasov
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px'
          }}>
            {/* Naplánované */}
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
                {filteredMatches.filter(m => m.status === 'naplanovany').length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#1e40af',
                fontWeight: '500'
              }}>
                📅 Naplánované
              </div>
            </div>

            {/* Ukončené */}
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
                {filteredMatches.filter(m => m.status === 'ukonceny').length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#166534',
                fontWeight: '500'
              }}>
                ✅ Ukončené
              </div>
            </div>

            {/* Prebieha */}
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
                {matches.filter(m => m.status === 'prebieha').length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#92400e',
                fontWeight: '500'
              }}>
                ⚽ Prebieha
              </div>
            </div>

            {/* Celkovo líg */}
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
                {getUniqueLeagues().length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#7c3aed',
                fontWeight: '500'
              }}>
                🏆 Líg
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;