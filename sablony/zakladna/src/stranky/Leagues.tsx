// Umiestnenie: sablony/zakladna/src/stranky/Leagues.tsx
// Aktualizovaná stránka so zoznamom líg a súťaží s databázovými údajmi

import React, { useState, useEffect } from 'react';
import { ligaApi, Liga } from '@clubw/jadro';

// Interface pre tabuľku ligy
interface TableTeam {
  id: number;
  pozicia: number;
  tim_nazov: string;
  body: number;
  zapasy: number;
  vitazstva: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  goly_rozdiel: number;
  forma?: string;
}

const Leagues: React.FC = () => {
  const [leagues, setLeagues] = useState<Liga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTyp, setFilterTyp] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<Liga | null>(null);
  const [leagueTable, setLeagueTable] = useState<TableTeam[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  // Načítanie líg z API
  const fetchLeagues = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📡 Načítavam ligy...');
      const response = await ligaApi.getLeagues({
        typ: filterTyp as any,
        search: searchTerm.trim() || undefined,
        include_stats: 'true'
      });

      setLeagues(response.data);
      console.log('✅ Načítaných líg:', response.data.length);
    } catch (err) {
      console.error('❌ Chyba pri načítaní líg:', err);
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie tabuľky konkrétnej ligy
  const fetchLeagueTable = async (league: Liga) => {
    if (league.format !== 'tabulka' && league.format !== 'kombinovany') {
      // Pre turnajové ligy zobrazíme prázdnu tabuľku
      setLeagueTable([]);
      return;
    }

    try {
      setTableLoading(true);
      console.log('📊 Načítavam tabuľku pre ligu:', league.nazov);
      
      const response = await ligaApi.getLeagueTable(league.id);
      const tableData = response.data.map((item: any) => ({
        id: item.id,
        pozicia: item.pozicia,
        tim_nazov: item.tim_nazov || item.custom_tim_nazov || 'Neznámy tím',
        body: item.skutocne_body || item.body || 0,
        zapasy: item.zapasy || 0,
        vitazstva: item.vitazstva || 0,
        remizy: item.remizy || 0,
        prehry: item.prehry || 0,
        goly_za: item.goly_za || 0,
        goly_proti: item.goly_proti || 0,
        goly_rozdiel: item.goly_rozdiel || 0,
        forma: item.forma
      }));

      // Zoradenie podľa pozície
      tableData.sort((a, b) => a.pozicia - b.pozicia);
      setLeagueTable(tableData);
      
      console.log('✅ Tabuľka načítaná:', tableData.length, 'tímov');
    } catch (err) {
      console.error('❌ Chyba pri načítaní tabuľky:', err);
      // Ak sa nepodarí načítať tabuľku, zobrazíme prázdnu
      setLeagueTable([]);
    } finally {
      setTableLoading(false);
    }
  };

  // Načítanie pri prvom otvorení a pri zmene filtrov
  useEffect(() => {
    fetchLeagues();
  }, [filterTyp, searchTerm]);

  // Handler pre zobrazenie detailu ligy
  const handleShowLeagueDetails = async (league: Liga) => {
    setSelectedLeague(league);
    await fetchLeagueTable(league);
  };

  // Formátovanie typu ligy
  const formatLeagueType = (typ: string): { text: string; color: string } => {
    const types = {
      'sutaz': { text: 'Súťaž', color: '#3b82f6' },
      'pohar': { text: 'Pohár', color: '#8b5cf6' },
      'priatelska': { text: 'Priateľská', color: '#10b981' }
    };
    return types[typ as keyof typeof types] || { text: typ, color: '#6b7280' };
  };

  // Formátovanie statusu ligy
  const formatLeagueStatus = (status: string): { text: string; color: string } => {
    const statuses = {
      'active': { text: 'Prebieha', color: '#10b981' },
      'upcoming': { text: 'Pripravuje sa', color: '#f59e0b' },
      'finished': { text: 'Ukončená', color: '#6b7280' },
      'inactive': { text: 'Neaktívna', color: '#ef4444' }
    };
    return statuses[status as keyof typeof statuses] || { text: status, color: '#6b7280' };
  };

  // Formátovanie formy tímu
  const renderFormaBadges = (forma?: string) => {
    if (!forma) return null;
    
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {forma.split('').map((result, index) => {
          const color = result === 'W' ? '#10b981' : result === 'D' ? '#f59e0b' : '#ef4444';
          return (
            <span
              key={index}
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: color,
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={result === 'W' ? 'Víťazstvo' : result === 'D' ? 'Remíza' : 'Prehra'}
            >
              {result}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      
      {/* Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          🏆 Ligy a súťaže
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#64748b',
          margin: 0
        }}>
          Prehľad všetkých ligových súťaží a pohárov
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '32px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Hľadať ligy..."
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            minWidth: '200px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />

        {/* Type Filter */}
        <select
          value={filterTyp}
          onChange={(e) => setFilterTyp(e.target.value)}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            outline: 'none',
            minWidth: '150px'
          }}
        >
          <option value="">Všetky typy</option>
          <option value="sutaz">Súťaže</option>
          <option value="pohar">Pohary</option>
          <option value="priatelska">Priateľské</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '64px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b', fontSize: '16px' }}>Načítavam ligy...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#dc2626', fontSize: '16px', margin: 0 }}>
            ❌ {error}
          </p>
          <button
            onClick={fetchLeagues}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Skúsiť znovu
          </button>
        </div>
      )}

      {/* League List */}
      {!loading && !error && (
        <>
          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#0369a1'
              }}>
                {leagues.length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#0369a1',
                fontWeight: '500'
              }}>
                🏆 Celkovo líg
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#15803d'
              }}>
                {leagues.filter(l => l.status === 'active').length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#15803d',
                fontWeight: '500'
              }}>
                🟢 Aktívnych
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#d97706'
              }}>
                {leagues.filter(l => l.typ === 'sutaz').length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#d97706',
                fontWeight: '500'
              }}>
                🥇 Súťaží
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#f3e8ff',
              borderRadius: '8px',
              textAlign: 'center'
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
                📅 Sezón
              </div>
            </div>
          </div>

          {/* Leagues Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {leagues.map((league) => {
              const typeInfo = formatLeagueType(league.typ);
              const statusInfo = formatLeagueStatus(league.status);

              return (
                <div
                  key={league.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: `2px solid ${league.farba || '#e2e8f0'}20`,
                    padding: '20px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
                  }}
                  onClick={() => handleShowLeagueDetails(league)}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    {/* Logo */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundColor: league.farba || '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {league.logo ? (
                        <img 
                          src={league.logo} 
                          alt={league.nazov}
                          style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '20px', color: 'white' }}>
                          {league.typ === 'pohar' ? '🏆' : league.typ === 'priatelska' ? '🤝' : '🥇'}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1e293b',
                        margin: '0 0 4px 0',
                        lineHeight: '1.3'
                      }}>
                        {league.nazov}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: '#64748b',
                        margin: '0 0 8px 0'
                      }}>
                        {league.sezona}
                      </p>

                      {/* Badges */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: typeInfo.color,
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '500',
                          borderRadius: '12px'
                        }}>
                          {typeInfo.text}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: statusInfo.color,
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '500',
                          borderRadius: '12px'
                        }}>
                          {statusInfo.text}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: '500',
                          borderRadius: '12px'
                        }}>
                          {league.format_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {league.popis && (
                    <p style={{
                      fontSize: '14px',
                      color: '#475569',
                      lineHeight: '1.4',
                      margin: '0 0 16px 0',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {league.popis}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '16px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowLeagueDetails(league);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: league.farba || '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      📊 Zobraz tabuľku
                    </button>

                    {league.external_widget_url && (
                      <a
                        href={league.external_widget_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        🔗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* League Detail Modal/Overlay */}
          {selectedLeague && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
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
                      fontWeight: '700',
                      color: '#1e293b',
                      margin: '0 0 4px 0'
                    }}>
                      {selectedLeague.nazov}
                    </h2>
                    <p style={{
                      fontSize: '16px',
                      color: '#64748b',
                      margin: 0
                    }}>
                      Sezóna {selectedLeague.sezona} • {selectedLeague.format_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLeague(null)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Table */}
                <div style={{ padding: '24px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1e293b',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📊 Tabuľka
                    {tableLoading && (
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #f3f4f6',
                        borderTop: '2px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    )}
                  </h3>

                  {leagueTable.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Pos.</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Tím</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Z</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>V</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>R</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>P</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>GZ</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>GP</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>+/-</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Body</th>
                            {selectedLeague.zobrazit_formu && (
                              <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Forma</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {leagueTable.map((team, index) => (
                            <tr key={team.id} style={{
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc'
                            }}>
                              <td style={{
                                padding: '12px 8px',
                                fontWeight: '600',
                                color: index < 3 ? '#10b981' : '#1e293b'
                              }}>
                                {team.pozicia}
                              </td>
                              <td style={{
                                padding: '12px 8px',
                                fontWeight: '500',
                                color: '#1e293b'
                              }}>
                                {team.tim_nazov}
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }}>{team.zapasy}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'center', color: '#10b981' }}>{team.vitazstva}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'center', color: '#f59e0b' }}>{team.remizy}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'center', color: '#ef4444' }}>{team.prehry}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }}>{team.goly_za}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }}>{team.goly_proti}</td>
                              <td style={{
                                padding: '12px 8px',
                                textAlign: 'center',
                                color: team.goly_rozdiel > 0 ? '#10b981' : team.goly_rozdiel < 0 ? '#ef4444' : '#64748b',
                                fontWeight: '500'
                              }}>
                                {team.goly_rozdiel > 0 ? '+' : ''}{team.goly_rozdiel}
                              </td>
                              <td style={{
                                padding: '12px 8px',
                                textAlign: 'center',
                                fontWeight: '700',
                                color: '#1e293b'
                              }}>
                                {team.body}
                              </td>
                              {selectedLeague.zobrazit_formu && (
                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                  {renderFormaBadges(team.forma)}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '48px 20px',
                      color: '#64748b'
                    }}>
                      {tableLoading ? (
                        <>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid #f3f4f6',
                            borderTop: '3px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 16px'
                          }} />
                          <p>Načítavam tabuľku...</p>
                        </>
                      ) : selectedLeague.format === 'turnaj' ? (
                        <>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
                          <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Turnajová súťaž</h4>
                          <p style={{ margin: 0 }}>Táto súťaž používa turnajový formát namiesto tabuľky.</p>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                          <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Tabuľka nie je dostupná</h4>
                          <p style={{ margin: 0 }}>Pre túto ligu zatiaľ nie sú k dispozícii údaje tabuľky.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {leagues.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '64px 20px',
              color: '#64748b'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                Žiadne ligy nenájdené
              </h3>
              <p style={{ fontSize: '16px', margin: 0 }}>
                {searchTerm || filterTyp 
                  ? 'Skúste zmeniť filter alebo vyhľadávací výraz.'
                  : 'Zatiaľ nie sú vytvorené žiadne ligy.'
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* Help Section */}
      <div style={{
        marginTop: '48px',
        padding: '24px',
        backgroundColor: '#f0f9ff',
        borderRadius: '12px',
        border: '1px solid #bae6fd'
      }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#0369a1',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💡 Ako používať ligy
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          fontSize: '14px',
          color: '#0369a1'
        }}>
          <div>
            <strong>📊 Zobrazenie tabuľky:</strong><br />
            Kliknite na kartu ligy alebo tlačidlo "Zobraz tabuľku" pre detailnú tabuľku s pozíciami, bodmi a formou tímov.
          </div>
          <div>
            <strong>🔍 Filtrovanie:</strong><br />
            Použite vyhľadávanie pre nájdenie konkrétnej ligy a filter typu pre zobrazenie len súťaží, pohárov alebo priateľských zápasov.
          </div>
          <div>
            <strong>🏆 Typy súťaží:</strong><br />
            <span style={{ color: '#3b82f6' }}>●</span> Súťaže - ligové formáty<br />
            <span style={{ color: '#8b5cf6' }}>●</span> Pohary - vyraďovacie turnaje<br />
            <span style={{ color: '#10b981' }}>●</span> Priateľské - neoficiálne stretnutia
          </div>
          <div>
            <strong>📈 Status líg:</strong><br />
            <span style={{ color: '#10b981' }}>●</span> Prebieha - aktívna súťaž<br />
            <span style={{ color: '#f59e0b' }}>●</span> Pripravuje sa - pred začiatkom<br />
            <span style={{ color: '#6b7280' }}>●</span> Ukončená - po skončení
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Leagues;