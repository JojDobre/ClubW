// frontend/src/pages/TeamDetail.tsx
// Detail tímu s hráčmi a realizačným tímom - OPRAVENÝ

import React, { useState, useEffect } from 'react';

interface Team {
  id: number;
  nazov: string;
  typ: string;
  vekova_kategoria: string;
  popis?: string;
  logo?: string;
  farba_prva?: string;
  farba_druha?: string;
}

interface Player {
  id: number;
  meno: string;
  priezvisko: string;
  pozicia: string;
  cislo_dresu?: number;
  vek: number;
  narodnost?: string;
  full_name: string;
}

interface Staff {
  id: number;
  meno: string;
  priezvisko: string;
  funkcia: string;
  email?: string;
  telefon?: string;
  full_name: string;
  poradie: number;
}

const TeamDetail: React.FC = () => {
  // Manuálne parsovanie URL namiesto useParams
  const pathParts = window.location.pathname.split('/');
  const id = pathParts[pathParts.length - 1]; // posledná časť URL
  
  console.log('🔍 Path parts:', pathParts);
  console.log('🔍 ID z URL:', id);

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'players' | 'staff'>('players');

  // Načítanie dát tímu
  const fetchTeamData = async () => {
    if (!id || id === 'teams' || isNaN(Number(id))) {
      console.log('❌ Neplatné ID tímu:', id);
      setError('Neplatné ID tímu');
      setLoading(false);
      return;
    }

    console.log('🔍 Načítavam tím ID:', id);

    try {
      setLoading(true);
      setError(null);

      // Načítanie základných informácií o tíme
      console.log('📡 Volám API:', `http://localhost:3000/api/teams/${id}`);
      const teamResponse = await fetch(`http://localhost:3000/api/teams/${id}`);
      console.log('📡 Team response status:', teamResponse.status);
      
      if (!teamResponse.ok) {
        throw new Error(`Tím nenájdený (${teamResponse.status})`);
      }
      
      const teamData = await teamResponse.json();
      console.log('📡 Team data:', teamData);
      
      if (teamData.success) {
        setTeam(teamData.data);
        console.log('✅ Team nastavený:', teamData.data);
      } else {
        throw new Error('Chyba pri načítaní tímu');
      }

      // Načítanie hráčov
      console.log('📡 Volám players API:', `http://localhost:3000/api/teams/${id}/players`);
      const playersResponse = await fetch(`http://localhost:3000/api/teams/${id}/players`);
      console.log('📡 Players response status:', playersResponse.status);
      
      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        console.log('📡 Players data kompletne:', JSON.stringify(playersData, null, 2));
        if (playersData.success && playersData.data && playersData.data.hraci) {
          setPlayers(playersData.data.hraci);
          console.log('✅ Players nastavené:', playersData.data.hraci.length);
        } else {
          console.log('❌ Players: success je false alebo hraci je undefined');
        }
      }

      // Načítanie realizačného tímu
      console.log('📡 Volám staff API:', `http://localhost:3000/api/teams/${id}/staff`);
      const staffResponse = await fetch(`http://localhost:3000/api/teams/${id}/staff`);
      console.log('📡 Staff response status:', staffResponse.status);
      
      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        console.log('📡 Staff data kompletne:', JSON.stringify(staffData, null, 2));
        if (staffData.success && staffData.data && staffData.data.realizacny_tim) {
          setStaff(staffData.data.realizacny_tim);
          console.log('✅ Staff nastavený:', staffData.data.realizacny_tim.length);
        } else {
          console.log('❌ Staff: success je false alebo realizacny_tim je undefined');
        }
      }

    } catch (err) {
      console.error('❌ Chyba pri načítaní tímu:', err);
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [id]);

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
        <div>Načítavam tím...</div>
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
          Pokúšam sa načítať tím s ID: {id}
        </div>
        <button 
          onClick={fetchTeamData} 
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

  if (!team) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '16px' }}>
          🔍 Tím nenájdený
        </div>
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
          ID: {id}
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
          ← Späť na zoznam tímov
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '20px', fontSize: '14px', color: '#64748b' }}>
        <a 
          href="/teams" 
          style={{ 
            color: '#3b82f6', 
            textDecoration: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#dbeafe'
          }}
        >
          ← Späť na tímy
        </a>
      </div>

      {/* Team Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Color Header */}
        {team.farba_prva && (
          <div style={{
            height: '8px',
            background: `linear-gradient(90deg, ${team.farba_prva} 0%, ${team.farba_druha || team.farba_prva} 100%)`
          }} />
        )}

        <div style={{ padding: '24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            {/* Team Logo */}
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
              {team.logo ? (
                <img 
                  src={team.logo} 
                  alt={`${team.nazov} logo`}
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '40px' }}>⚽</span>
              )}
            </div>

            {/* Team Info */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '8px',
                margin: 0
              }}>
                {team.nazov}
              </h1>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  fontSize: '14px',
                  padding: '4px 12px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '16px',
                  fontWeight: '500'
                }}>
                  {team.typ}
                </span>
                <span style={{ fontSize: '14px', color: '#64748b' }}>
                  {team.vekova_kategoria}
                </span>
              </div>
              
              {team.popis && (
                <p style={{
                  fontSize: '16px',
                  color: '#64748b',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {team.popis}
                </p>
              )}
            </div>

            {/* Statistics */}
            <div style={{ 
              display: 'flex', 
              gap: '20px',
              flexShrink: 0
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#3b82f6'
                }}>
                  {Array.isArray(players) ? players.length : 0}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Hráčov
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#10b981'
                }}>
                  {Array.isArray(staff) ? staff.length : 0}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Realizácia
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px',
        backgroundColor: 'white',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setActiveTab('players')}
          style={{
            padding: '16px 24px',
            backgroundColor: activeTab === 'players' ? '#3b82f6' : 'white',
            color: activeTab === 'players' ? 'white' : '#64748b',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            flex: 1
          }}
        >
          ⚽ Hráči ({Array.isArray(players) ? players.length : 0})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '16px 24px',
            backgroundColor: activeTab === 'staff' ? '#3b82f6' : 'white',
            color: activeTab === 'staff' ? 'white' : '#64748b',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            flex: 1
          }}
        >
          👨‍💼 Realizačný tím ({Array.isArray(staff) ? staff.length : 0})
        </button>
      </div>

      {/* Content */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0 0 8px 8px',
        border: '1px solid #e2e8f0',
        borderTop: 'none',
        padding: '20px'
      }}>
        {activeTab === 'players' ? (
          <div>
            {!Array.isArray(players) || players.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#64748b'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Žiadni hráči</h3>
                <p>V tomto tíme zatiaľ nie sú evidovaní žiadni hráči</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {Array.isArray(players) && players.map(player => (
                  <div
                    key={player.id}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '16px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onClick={() => window.location.href = `/players/${player.id}`}  // pridaj túto čiaru
            >
                  
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      {/* Player Photo */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                      }}>
                        <span style={{ fontSize: '20px' }}>👤</span>
                      </div>

                      {/* Player Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px'
                        }}>
                          {player.cislo_dresu && (
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 'bold',
                              color: '#3b82f6',
                              backgroundColor: '#dbeafe',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              minWidth: '24px',
                              textAlign: 'center'
                            }}>
                              {player.cislo_dresu}
                            </span>
                          )}
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1e293b',
                            margin: 0
                          }}>
                            {player.full_name}
                          </h4>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '12px',
                          color: '#64748b'
                        }}>
                          <span>🎯 {player.pozicia}</span>
                          <span>📅 {player.vek} rokov</span>
                          {player.narodnost && <span>🌍 {player.narodnost}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {!Array.isArray(staff) || staff.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#64748b'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Žiadny realizačný tím</h3>
                <p>V tomto tíme zatiaľ nie je evidovaný realizačný tím</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {Array.isArray(staff) && staff
                  .sort((a, b) => a.poradie - b.poradie)
                  .map(member => (
                  <div
                    key={member.id}
                    onClick={() => window.location.href = `/staff/${member.id}`}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '20px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      {/* Staff Photo */}
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '16px'
                      }}>
                        <span style={{ fontSize: '24px' }}>👤</span>
                      </div>

                      {/* Staff Info */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '4px'
                        }}>
                          {member.full_name}
                        </h4>
                        <div style={{
                          fontSize: '14px',
                          color: '#3b82f6',
                          fontWeight: '500'
                        }}>
                          {member.funkcia}
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    {(member.email || member.telefon) && (
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        paddingTop: '8px',
                        borderTop: '1px solid #e2e8f0'
                      }}>
                        {member.email && (
                          <div style={{ marginBottom: '4px' }}>
                            📧 {member.email}
                          </div>
                        )}
                        {member.telefon && (
                          <div>📞 {member.telefon}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetail;