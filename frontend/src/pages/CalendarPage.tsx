// frontend/src/pages/Calendar.tsx
// Kalendár zápasov - jednoduchá testovacia stránka pre API

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

interface CalendarMatch {
  id: number;
  nazov: string;
  datum: string;
  cas: string;
  liga: string | { id: number; nazov: string; typ: string };
  domaci: string;
  hostia: string;
  vysledok: string;
  status: string;
}

interface MonthData {
  month_info: {
    rok: number;
    mesiac: number;
    nazov_mesiaca: string;
    pocet_dni: number;
  };
  calendar: { [key: string]: CalendarMatch[] };
  matches: CalendarMatch[];
  total_matches: number;
}

/** Vlastná udalosť klubu (tréning, akcia) - výskyt v danom dni. */
interface KlubovaUdalost {
  id: number;
  nazov: string;
  popis: string | null;
  miesto: string | null;
  cas_od: string | null;
  cas_do: string | null;
  datum_vyskytu: string;
  farba: string | null;
  tim?: { nazov: string } | null;
}

const Calendar: React.FC = () => {
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [udalosti, setUdalosti] = useState<KlubovaUdalost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'upcoming'>('month');

  // Načítanie mesačných dát
  const fetchMonthData = async (date: Date) => {
    try {
      setLoading(true);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      // Vlastné udalosti mesiaca (tréningy…) - opakovanie rozvinie server
      const od = `${year}-${String(month).padStart(2, '0')}-01`;
      const doKedy = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
      fetch(apiUrl(`/calendar/events?od=${od}&do=${doKedy}`))
        .then((r) => r.json())
        .then((json) => setUdalosti(json.success ? json.data ?? [] : []))
        .catch(() => setUdalosti([]));

      const response = await fetch(apiUrl(`/calendar/month/${year}/${month}`));
      
      if (!response.ok) {
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setMonthData(data.data);
      } else {
        throw new Error(data.message || 'Chyba pri načítaní kalendára');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie nadchádzajúcich zápasov
  const fetchUpcomingMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl(`/calendar/upcoming?limit=10`));
      
      if (!response.ok) {
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Endpoint vracia zoznam zápasov priamo v `data`
        const zapasy = Array.isArray(data.data) ? data.data : [];

        // Prekonvertujeme na MonthData formát pre jednoduchosť
        setMonthData({
          month_info: {
            rok: new Date().getFullYear(),
            mesiac: new Date().getMonth() + 1,
            nazov_mesiaca: 'Nadchádzajúce zápasy',
            pocet_dni: 0
          },
          calendar: {},
          matches: zapasy,
          total_matches: zapasy.length
        });
      } else {
        throw new Error(data.message || 'Chyba pri načítaní zápasov');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'month') {
      fetchMonthData(selectedDate);
    } else {
      fetchUpcomingMatches();
    }
  }, [selectedDate, view]);

  // Navigácia medzi mesiacmi
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  // Formátovanie dátumu
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('sk-SK', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Načítavam kalendár...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        ❌ {error}
        <br />
        <button 
          onClick={() => view === 'month' ? fetchMonthData(selectedDate) : fetchUpcomingMatches()} 
          style={{ marginTop: '10px', padding: '5px 10px' }}
        >
          Skúsiť znovu
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hlavička */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>
          📅 Kalendár zápasov
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Prehľad všetkých zápasov a termínov
        </p>
      </div>

      {/* Ovládanie */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* View switcher */}
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          marginBottom: '15px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setView('month')}
            style={{
              padding: '8px 16px',
              backgroundColor: view === 'month' ? '#3b82f6' : '#f5f5f5',
              color: view === 'month' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📅 Mesačný pohľad
          </button>
          <button
            onClick={() => setView('upcoming')}
            style={{
              padding: '8px 16px',
              backgroundColor: view === 'upcoming' ? '#3b82f6' : '#f5f5f5',
              color: view === 'upcoming' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ⏰ Nadchádzajúce
          </button>
        </div>

        {/* Navigácia pre mesačný pohľad */}
        {view === 'month' && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => navigateMonth('prev')}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ← Predchádzajúci
            </button>
            
            <span style={{ 
              fontWeight: 'bold', 
              fontSize: '18px',
              padding: '8px 16px'
            }}>
              {monthData?.month_info.nazov_mesiaca} {monthData?.month_info.rok}
            </span>
            
            <button
              onClick={() => navigateMonth('next')}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Ďalší →
            </button>

            <button
              onClick={() => setSelectedDate(new Date())}
              style={{
                padding: '8px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              📍 Dnes
            </button>
          </div>
        )}
      </div>

      {/* Obsah */}
      {monthData && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px'
        }}>
          {/* Štatistiky */}
          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>
                {monthData.total_matches}
              </div>
              <div style={{ fontSize: '14px', color: '#0369a1' }}>
                Celkovo zápasov
              </div>
            </div>

            {view === 'month' && (
              <div style={{
                padding: '15px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                  {Object.keys(monthData.calendar).length}
                </div>
                <div style={{ fontSize: '14px', color: '#059669' }}>
                  Dní so zápasmi
                </div>
              </div>
            )}
          </div>

          {/* Zoznam zápasov */}
          {view === 'month' && monthData.calendar && Object.keys(monthData.calendar).length > 0 ? (
            <div>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>Zápasy v mesiaci</h3>
              {monthData.calendar && Object.entries(monthData.calendar).map(([datum, zapasy]) => (
                <div key={datum} style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    color: '#666', 
                    marginBottom: '10px',
                    padding: '8px 0',
                    borderBottom: '1px solid #eee'
                  }}>
                    📅 {formatDate(datum)} ({zapasy.length} zápas{zapasy.length !== 1 ? 'ov' : ''})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {zapasy && zapasy.map((zapas) => (
                      <div key={zapas.id} style={{
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.location.href = `/matches/${zapas.id}`}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          <div>
                            <strong>{zapas.nazov || 'Bez názvu'}</strong>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                              {zapas.domaci || 'Domáci'} vs {zapas.hostia || 'Hostia'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold' }}>
                              {zapas.cas || 'Neurčený čas'}
                            </div>
                            {zapas.vysledok && zapas.vysledok !== '-:-' && (
                              <div style={{ fontSize: '14px', color: '#059669' }}>
                                {zapas.vysledok}
                              </div>
                            )}
                          </div>
                        </div>
                        {zapas.liga && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#666',
                            marginTop: '5px'
                          }}>
                            🏆 {typeof zapas.liga === 'string' ? zapas.liga : (zapas.liga as any)?.nazov || 'Neznáma liga'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : view === 'upcoming' && monthData.matches && monthData.matches.length > 0 ? (
            <div>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>Nadchádzajúce zápasy</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {monthData.matches.map((zapas) => (
                  <div key={zapas.id} style={{
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.location.href = `/matches/${zapas.id}`}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div>
                        <strong style={{ fontSize: '16px' }}>{zapas.nazov || 'Bez názvu'}</strong>
                        <div style={{ color: '#666', margin: '5px 0' }}>
                          {zapas.domaci || 'Domáci'} vs {zapas.hostia || 'Hostia'}
                        </div>
                        {zapas.liga && (
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            🏆 {typeof zapas.liga === 'string' ? zapas.liga : (zapas.liga as any)?.nazov || 'Neznáma liga'}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                          {zapas.datum ? formatDate(zapas.datum) : 'Neurčený dátum'}
                        </div>
                        <div style={{ color: '#666' }}>
                          {zapas.cas || 'Neurčený čas'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#666'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📅</div>
              <h3>Žiadne zápasy</h3>
              <p>V tomto období nie su naplánované žiadne zápasy.</p>
            </div>
          )}

          {/* Udalosti klubu (tréningy, akcie) vo farbe tímu */}
          {view === 'month' && udalosti.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 12px' }}>Udalosti klubu</h3>
              {udalosti.map((u) => (
                <div
                  key={`${u.id}-${u.datum_vyskytu}`}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '10px 12px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${u.farba || '#94a3b8'}`,
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ minWidth: '90px', fontWeight: 'bold' }}>
                    {formatDate(u.datum_vyskytu)}
                    {u.cas_od && (
                      <div style={{ fontWeight: 'normal', color: '#666', fontSize: '14px' }}>
                        {u.cas_od.slice(0, 5)}{u.cas_do ? `–${u.cas_do.slice(0, 5)}` : ''}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.nazov}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {[u.tim?.nazov, u.miesto].filter(Boolean).join(' · ')}
                    </div>
                    {u.popis && <div style={{ fontSize: '14px', marginTop: '4px' }}>{u.popis}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;