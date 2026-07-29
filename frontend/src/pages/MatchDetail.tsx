// frontend/src/pages/MatchDetail.tsx
// Detail zápasu s podrobnými informáciami, štatistikami a súvisiacimi článkami

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

interface Match {
  id: number;
  nazov: string;
  liga_id?: number;
  liga_nazov?: string;
  liga?: {
    id: number;
    nazov: string;
    sezona: string;
    typ: string;
    logo?: string;
    farba?: string;
  };
  kolo?: string;
  datum_cas: string;
  miesto?: string;
  domaci_tim_id?: number;
  domaci_tim_nazov?: string;
  domaci_tim?: {
    id: number;
    nazov: string;
    logo?: string;
    farba?: string;
  };
  hostujuci_tim_id?: number;
  hostujuci_tim_nazov?: string;
  hostujuci_tim?: {
    id: number;
    nazov: string;
    logo?: string;
    farba?: string;
  };
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

interface MatchStats {
  domaci_golyAttempts?: number;
  hostia_golyAttempts?: number;
  domaci_possessionPercent?: number;
  hostia_possessionPercent?: number;
  domaci_corners?: number;
  hostia_corners?: number;
  domaci_yellowCards?: number;
  hostia_yellowCards?: number;
  domaci_redCards?: number;
  hostia_redCards?: number;
  domaci_offsides?: number;
  hostia_offsides?: number;
}

const MatchDetail: React.FC = () => {
  // Manuálne parsovanie URL pre získanie ID zápasu
  const pathParts = window.location.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  
  console.log('🔍 Match URL parts:', pathParts);
  console.log('🔍 Match ID z URL:', id);

  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<MatchStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načítanie dát zápasu
  const fetchMatchData = async () => {
    if (!id || id === 'matches' || isNaN(Number(id))) {
      console.log('❌ Neplatné ID zápasu:', id);
      setError('Neplatné ID zápasu');
      setLoading(false);
      return;
    }

    console.log('🔍 Načítavam zápas ID:', id);

    try {
      setLoading(true);
      setError(null);

      console.log('📡 Volám API:', apiUrl(`/matches/${id}`));
      const response = await fetch(apiUrl(`/matches/${id}`));
      console.log('📡 Match response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Zápas nenájdený');
        }
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 Match data:', data);
      
      if (data.success) {
        setMatch(data.data);
        console.log('✅ Match nastavený:', data.data);
        
        // Generovanie mock štatistík pre ukončené zápasy
        if (data.data.status === 'ukonceny') {
          generateMockStats();
        }
      } else {
        throw new Error(data.message || 'Chyba pri načítaní zápasu');
      }
    } catch (err) {
      console.error('❌ Chyba pri načítaní zápasu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
    } finally {
      setLoading(false);
    }
  };

  // Generovanie mock štatistík
  const generateMockStats = () => {
    setStats({
      domaci_golyAttempts: Math.floor(Math.random() * 10) + 5,
      hostia_golyAttempts: Math.floor(Math.random() * 10) + 5,
      domaci_possessionPercent: Math.floor(Math.random() * 40) + 30,
      hostia_possessionPercent: Math.floor(Math.random() * 40) + 30,
      domaci_corners: Math.floor(Math.random() * 8) + 2,
      hostia_corners: Math.floor(Math.random() * 8) + 2,
      domaci_yellowCards: Math.floor(Math.random() * 4),
      hostia_yellowCards: Math.floor(Math.random() * 4),
      domaci_redCards: Math.floor(Math.random() * 2),
      hostia_redCards: Math.floor(Math.random() * 2),
      domaci_offsides: Math.floor(Math.random() * 5),
      hostia_offsides: Math.floor(Math.random() * 5),
    });
  };

  useEffect(() => {
    fetchMatchData();
  }, [id]);

  // Helper funkcie
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString('sk-SK', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('sk-SK', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      dayName: date.toLocaleDateString('sk-SK', { weekday: 'long' })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'naplanovany': return '#3b82f6';
      case 'prebieha': return '#ef4444';
      case 'ukonceny': return '#10b981';
      case 'odlozeny': return '#f59e0b';
      case 'zruseny': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'naplanovany': return '📅';
      case 'prebieha': return '⚽';
      case 'ukonceny': return '✅';
      case 'odlozeny': return '⏰';
      case 'zruseny': return '❌';
      default: return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'naplanovany': return 'Naplánovaný';
      case 'prebieha': return 'Prebieha';
      case 'ukonceny': return 'Ukončený';
      case 'odlozeny': return 'Odložený';
      case 'zruseny': return 'Zrušený';
      default: return status;
    }
  };

  const isMatchFinished = () => {
    return match?.status === 'ukonceny';
  };

  const isMatchLive = () => {
    return match?.status === 'prebieha';
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
        <div>Načítavam detail zápasu...</div>
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
          ❌ {error}
        </div>
        <button 
          onClick={fetchMatchData} 
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

  if (!match) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Zápas nenájdený</div>
      </div>
    );
  }

  const { date, time, dayName } = formatDateTime(match.datum_cas);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '24px' }}>
        <span 
          onClick={() => window.history.back()} 
          style={{ 
            color: '#3b82f6', 
            cursor: 'pointer',
            textDecoration: 'underline' 
          }}
        >
          ← Späť na zápasy
        </span>
      </div>

      {/* Match Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '32px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Status Banner */}
        {isMatchLive() && (
          <div style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600',
            animation: 'pulse 2s infinite'
          }}>
            🔴 ZÁPAS PREBIEHA NAŽIVO
          </div>
        )}

        <div style={{ padding: '24px' }}>
          {/* League Info */}
          {match.liga_nazov && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '16px' }}>🏆</span>
              <span style={{ fontWeight: '500', color: '#1e293b' }}>
                {match.liga_nazov}
              </span>
              {match.kolo && (
                <span style={{ color: '#64748b', fontSize: '14px' }}>
                  • {match.kolo}
                </span>
              )}
            </div>
          )}

          {/* Main Match Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Domáci tím */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '8px'
              }}>
                {match.domaci_tim_nazov || 'Domáci tím'}
              </div>
              <div style={{ color: '#64748b', fontSize: '14px' }}>
                DOMÁCI
              </div>
            </div>

            {/* Skóre alebo čas */}
            <div style={{ textAlign: 'center' }}>
              {isMatchFinished() ? (
                <div style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  lineHeight: '1'
                }}>
                  {match.goly_domaci ?? 0} : {match.goly_hostia ?? 0}
                </div>
              ) : (
                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '4px'
                  }}>
                    {time}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    {dayName}, {date}
                  </div>
                </div>
              )}
              
              {/* Status badge */}
              <div style={{
                marginTop: '12px',
                padding: '6px 12px',
                backgroundColor: getStatusColor(match.status),
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                display: 'inline-block'
              }}>
                {getStatusIcon(match.status)} {getStatusText(match.status)}
              </div>
            </div>

            {/* Hosťujúci tím */}
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '8px'
              }}>
                {match.hostujuci_tim_nazov || 'Hosťujúci tím'}
              </div>
              <div style={{ color: '#64748b', fontSize: '14px' }}>
                HOSTIA
              </div>
            </div>
          </div>

          {/* Match Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0'
          }}>
            {match.miesto && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                  📍 Miesto
                </div>
                <div style={{ fontWeight: '500', color: '#1e293b' }}>
                  {match.miesto}
                </div>
              </div>
            )}

            {match.pocet_divakov && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                  👥 Diváci
                </div>
                <div style={{ fontWeight: '500', color: '#1e293b' }}>
                  {match.pocet_divakov.toLocaleString()}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                📅 Dátum
              </div>
              <div style={{ fontWeight: '500', color: '#1e293b' }}>
                {dayName}, {date}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                🕐 Čas
              </div>
              <div style={{ fontWeight: '500', color: '#1e293b' }}>
                {time}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Statistics */}
      {isMatchFinished() && Object.keys(stats).length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          marginBottom: '32px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1e293b',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 Štatistiky zápasu
            </h2>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Pokusy na bránu */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {stats.domaci_golyAttempts || 0}
                  </span>
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: '500'
                }}>
                  Pokusy na bránu
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {stats.hostia_golyAttempts || 0}
                  </span>
                </div>
              </div>

              {/* Držanie lopty */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {stats.domaci_possessionPercent || 0}%
                  </span>
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: '500'
                }}>
                  Držanie lopty
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {stats.hostia_possessionPercent || 0}%
                  </span>
                </div>
              </div>

              {/* Rohové kopy */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {stats.domaci_corners || 0}
                  </span>
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: '500'
                }}>
                  Rohové kopy
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {stats.hostia_corners || 0}
                  </span>
                </div>
              </div>

              {/* Karty */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '18px',
                    color: '#f59e0b',
                    marginRight: '8px'
                  }}>
                    🟨 {stats.domaci_yellowCards || 0}
                  </span>
                  <span style={{
                    fontSize: '18px',
                    color: '#ef4444'
                  }}>
                    🟥 {stats.domaci_redCards || 0}
                  </span>
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: '500'
                }}>
                  Karty
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{
                    fontSize: '18px',
                    color: '#f59e0b',
                    marginRight: '8px'
                  }}>
                    🟨 {stats.hostia_yellowCards || 0}
                  </span>
                  <span style={{
                    fontSize: '18px',
                    color: '#ef4444'
                  }}>
                    🟥 {stats.hostia_redCards || 0}
                  </span>
                </div>
              </div>

              {/* Ofsajdy */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {stats.domaci_offsides || 0}
                  </span>
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: '500'
                }}>
                  Ofsajdy
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {stats.hostia_offsides || 0}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        
        {/* Poznámky */}
        {match.poznamky && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
              color: '#374151',
              lineHeight: '1.6',
              margin: 0
            }}>
              {match.poznamky}
            </p>
          </div>
        )}

        {/* Video */}
        {match.video_url && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
              🎥 Video
            </h3>
            <a
              href={match.video_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#ef4444',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
            >
              ▶️ Pozrieť video
            </a>
          </div>
        )}

        {/* Match info */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
            ℹ️ Informácie o zápase
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>ID zápasu:</span>
              <span style={{ fontWeight: '500', color: '#1e293b' }}>#{match.id}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Vytvorený:</span>
              <span style={{ fontWeight: '500', color: '#1e293b' }}>
                {new Date(match.vytvoreny).toLocaleDateString('sk-SK')}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ color: '#64748b' }}>Aktualizovaný:</span>
              <span style={{ fontWeight: '500', color: '#1e293b' }}>
                {new Date(match.aktualizovany).toLocaleDateString('sk-SK')}
              </span>
            </div>
            {match.clanok_id && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: '#64748b' }}>Súvisiaci článok:</span>
                <span style={{ fontWeight: '500', color: '#3b82f6' }}>
                  #{match.clanok_id}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Pulse animation for live matches */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default MatchDetail;