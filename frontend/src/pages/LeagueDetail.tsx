// frontend/src/pages/LeagueDetail.tsx
// Detail ligy s tabuľkou a štatistikami

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

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
}

// Mock data pre tabuľku (v skutočnosti by sa načítavalo z API)
interface TableTeam {
  id: number;
  nazov: string;
  pozicia: number;
  zapasy: number;
  vitazstva: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  goly_rozdiel: number;
  body: number;
  forma: string[]; // posledných 5 zápasov
}

const LeagueDetail: React.FC = () => {
  // Manuálne parsovanie URL
  const pathParts = window.location.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  
  console.log('🔍 League URL parts:', pathParts);
  console.log('🔍 League ID z URL:', id);

  const [league, setLeague] = useState<League | null>(null);
  const [tableData, setTableData] = useState<TableTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načítanie dát ligy
  const fetchLeagueData = async () => {
    if (!id || id === 'leagues' || isNaN(Number(id))) {
      console.log('❌ Neplatné ID ligy:', id);
      setError('Neplatné ID ligy');
      setLoading(false);
      return;
    }

    console.log('🔍 Načítavam ligu ID:', id);

    try {
      setLoading(true);
      setError(null);

      console.log('📡 Volám API:', apiUrl(`/leagues/${id}`));
      const response = await fetch(apiUrl(`/leagues/${id}`));
      console.log('📡 League response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Liga nenájdená');
        }
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 League data:', data);
      
      if (data.success) {
        setLeague(data.data);
        console.log('✅ League nastavená:', data.data);
        
        // Generovanie mock tabuľky
        generateMockTable();
      } else {
        throw new Error(data.message || 'Chyba pri načítaní ligy');
      }
    } catch (err) {
      console.error('❌ Chyba pri načítaní ligy:', err);
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  // Generovanie mock tabuľky (neskôr nahradíme skutočnými dátami)
  const generateMockTable = () => {
    const mockTeams: TableTeam[] = [
      {
        id: 1,
        nazov: 'Náš klub FC',
        pozicia: 1,
        zapasy: 15,
        vitazstva: 12,
        remizy: 2,
        prehry: 1,
        goly_za: 34,
        goly_proti: 8,
        goly_rozdiel: 26,
        body: 38,
        forma: ['V', 'V', 'R', 'V', 'V']
      },
      {
        id: 2,
        nazov: 'Rival FC',
        pozicia: 2,
        zapasy: 15,
        vitazstva: 10,
        remizy: 3,
        prehry: 2,
        goly_za: 28,
        goly_proti: 12,
        goly_rozdiel: 16,
        body: 33,
        forma: ['V', 'R', 'V', 'P', 'V']
      },
      {
        id: 3,
        nazov: 'Lokálny tím',
        pozicia: 3,
        zapasy: 15,
        vitazstva: 8,
        remizy: 4,
        prehry: 3,
        goly_za: 22,
        goly_proti: 15,
        goly_rozdiel: 7,
        body: 28,
        forma: ['R', 'V', 'P', 'V', 'R']
      },
      {
        id: 4,
        nazov: 'Mestský klub',
        pozicia: 4,
        zapasy: 15,
        vitazstva: 7,
        remizy: 3,
        prehry: 5,
        goly_za: 20,
        goly_proti: 18,
        goly_rozdiel: 2,
        body: 24,
        forma: ['P', 'V', 'V', 'R', 'P']
      },
      {
        id: 5,
        nazov: 'Regionálny FC',
        pozicia: 5,
        zapasy: 15,
        vitazstva: 6,
        remizy: 5,
        prehry: 4,
        goly_za: 18,
        goly_proti: 16,
        goly_rozdiel: 2,
        body: 23,
        forma: ['R', 'P', 'V', 'R', 'V']
      },
      {
        id: 6,
        nazov: 'Susedný klub',
        pozicia: 6,
        zapasy: 15,
        vitazstva: 5,
        remizy: 4,
        prehry: 6,
        goly_za: 16,
        goly_proti: 20,
        goly_rozdiel: -4,
        body: 19,
        forma: ['P', 'R', 'P', 'V', 'P']
      }
    ];
    setTableData(mockTeams);
  };

  useEffect(() => {
    fetchLeagueData();
  }, [id]);

  // Pomocné funkcie
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

  const getFormEmoji = (result: string): string => {
    const emojis = {
      'V': '🟢', // Víťazstvo - zelená
      'R': '🟡', // Remíza - žltá
      'P': '🔴'  // Prehra - červená
    };
    return emojis[result as keyof typeof emojis] || '⚪';
  };

  const getPositionColor = (pozicia: number): string => {
    if (pozicia === 1) return '#ffd700'; // Zlatá pre 1. miesto
    if (pozicia <= 3) return '#c0c0c0'; // Strieborná pre top 3
    if (pozicia <= tableData.length / 2) return '#90EE90'; // Svetlozelená pre hornú polovicu
    return '#FFB6C1'; // Svetločervená pre dolnú polovicu
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
        <div>Načítavam tabuľku ligy...</div>
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
          Pokúšam sa načítať ligu s ID: {id}
        </div>
        <button 
          onClick={fetchLeagueData} 
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
          href="/leagues" 
          style={{ 
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          ← Späť na ligy
        </a>
      </div>
    );
  }

  if (!league) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '16px' }}>
          🔍 Liga nenájdená
        </div>
        <a 
          href="/leagues"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          ← Späť na ligy
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{
        marginBottom: '24px',
        fontSize: '14px',
        color: '#64748b'
      }}>
        <a href="/leagues" style={{ color: '#3b82f6', textDecoration: 'none' }}>
          ← Späť na ligy
        </a>
      </div>

      {/* League Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '32px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Color Header */}
        <div style={{
          height: '8px',
          backgroundColor: league.farba || '#3b82f6'
        }} />

        <div style={{ padding: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            {/* League Logo */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {league.logo ? (
                <img 
                  src={league.logo} 
                  alt={`${league.nazov} logo`}
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '40px' }}>
                  {getLeagueEmoji(league.typ)}
                </span>
              )}
            </div>

            {/* League Info */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '8px',
                margin: 0
              }}>
                {league.nazov}
              </h1>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  fontSize: '16px',
                  padding: '4px 12px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '16px',
                  fontWeight: '500'
                }}>
                  {formatLeagueType(league.typ)}
                </span>
                <span style={{ fontSize: '16px', color: '#64748b', fontWeight: '500' }}>
                  {league.sezona}
                </span>
              </div>
              
              {league.popis && (
                <p style={{
                  fontSize: '16px',
                  color: '#64748b',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {league.popis}
                </p>
              )}
            </div>

            {/* External Link */}
            {league.external_widget_url && (
              <div>
                <a
                  href={league.external_widget_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  🔗 Oficiálna stránka
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* League Table */}
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
            📊 Tabuľka sezóny {league.sezona}
          </h2>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Pos</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Tím</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Z</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>V</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>R</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>P</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>GZ</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>GP</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>+/-</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Body</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Forma</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((team, index) => (
                <tr 
                  key={team.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#fafbfc';
                  }}
                >
                  <td style={{ 
                    padding: '12px 8px', 
                    fontWeight: '600',
                    color: team.pozicia <= 3 ? '#059669' : '#374151'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: getPositionColor(team.pozicia),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: team.pozicia === 1 ? '#000' : '#fff'
                    }}>
                      {team.pozicia}
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    fontWeight: team.nazov.includes('Náš klub') ? '600' : '500',
                    color: team.nazov.includes('Náš klub') ? '#059669' : '#374151'
                  }}>
                    {team.nazov}
                    {team.nazov.includes('Náš klub') && (
                      <span style={{ marginLeft: '8px', fontSize: '12px' }}>🏠</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>{team.zapasy}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#059669', fontWeight: '500' }}>{team.vitazstva}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#d97706', fontWeight: '500' }}>{team.remizy}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#dc2626', fontWeight: '500' }}>{team.prehry}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>{team.goly_za}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>{team.goly_proti}</td>
                  <td style={{ 
                    padding: '12px 8px', 
                    textAlign: 'center',
                    color: team.goly_rozdiel > 0 ? '#059669' : team.goly_rozdiel < 0 ? '#dc2626' : '#374151',
                    fontWeight: '500'
                  }}>
                    {team.goly_rozdiel > 0 ? '+' : ''}{team.goly_rozdiel}
                  </td>
                  <td style={{ 
                    padding: '12px 8px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#1e293b'
                  }}>
                    {team.body}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                      {team.forma.map((result, idx) => (
                        <span key={idx} style={{ fontSize: '12px' }}>
                          {getFormEmoji(result)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Legend */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '32px'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '16px'
        }}>
          📋 Legenda
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          fontSize: '14px'
        }}>
          <div><strong>Z</strong> - Zápasy</div>
          <div><strong>V</strong> - Víťazstvá</div>
          <div><strong>R</strong> - Remízy</div>
          <div><strong>P</strong> - Prehry</div>
          <div><strong>GZ</strong> - Góly za</div>
          <div><strong>GP</strong> - Góly proti</div>
          <div><strong>+/-</strong> - Gólový rozdiel</div>
          <div><strong>Forma</strong> - Posledných 5 zápasov</div>
        </div>

        <div style={{ marginTop: '16px', fontSize: '14px' }}>
          <div style={{ marginBottom: '8px' }}><strong>Farby pozícií:</strong></div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffd700' }}></div>
              <span>1. miesto</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#c0c0c0' }}></div>
              <span>Top 3</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#90EE90' }}></div>
              <span>Horná polovica</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFB6C1' }}></div>
              <span>Dolná polovica</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: '32px'
      }}>
        <a
          href="/leagues"
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontWeight: '500'
          }}
        >
          ← Späť na všetky ligy
        </a>
      </div>
    </div>
  );
};

export default LeagueDetail;