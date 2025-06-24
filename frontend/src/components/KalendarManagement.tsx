// frontend/src/components/KalendarManagement.tsx
// Kalendár s inline štýlmi namiesto Tailwind CSS

import React, { useState, useEffect } from 'react';
import { calendarApi, CalendarMatch, MonthCalendarData, WeekCalendarData, UpcomingMatchesData, CalendarFilters } from '../services/calendarApi';

interface User {
  id: number;
  meno: string;
  email: string;
  rola: 'admin' | 'redaktor' | 'trener' | 'uzivatel';
}

interface KalendarManagementProps {
  user: User;
}

interface Liga {
  id: number;
  nazov: string;
  typ: string;
}

interface Team {
  id: number;
  nazov: string;
}

type CalendarView = 'month' | 'week' | 'upcoming';

// Inline štýly
const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center'
  },
  subtitle: {
    color: '#64748b',
    fontSize: '1rem'
  },
  controlsCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    marginBottom: '24px'
  },
  viewSelector: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    padding: '4px'
  },
  viewButton: (active: boolean) => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.2s',
    backgroundColor: active ? '#3b82f6' : 'transparent',
    color: active ? 'white' : '#64748b'
  }),
  navigationWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '16px'
  },
  navButton: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  dateDisplay: {
    padding: '8px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontWeight: '500',
    minWidth: '200px',
    textAlign: 'center' as const,
    color: '#1e293b'
  },
  todayButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  filtersWrapper: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
    marginTop: '16px'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#374151'
  },
  clearButton: {
    padding: '8px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '14px'
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  loadingWrapper: {
    textAlign: 'center' as const,
    padding: '48px 0'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 8px'
  },
  calendarCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  weekdayHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    backgroundColor: '#f8fafc'
  },
  weekdayCell: {
    padding: '16px',
    textAlign: 'center' as const,
    fontWeight: '600',
    color: '#374151',
    borderRight: '1px solid #e2e8f0',
    fontSize: '14px'
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)'
  },
  dayCell: (isCurrentMonth: boolean, isToday: boolean) => ({
    minHeight: '120px',
    padding: '12px',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: isToday ? '#eff6ff' : isCurrentMonth ? 'white' : '#f8fafc'
  }),
  dayNumber: (isCurrentMonth: boolean, isToday: boolean) => ({
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: isToday ? '#3b82f6' : isCurrentMonth ? '#1e293b' : '#9ca3af'
  }),
  matchCard: (isCompact: boolean = false) => ({
    padding: isCompact ? '4px 8px' : '12px',
    marginBottom: isCompact ? '4px' : '8px',
    borderRadius: '6px',
    borderLeft: '4px solid #3b82f6',
    backgroundColor: 'white',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
    fontSize: isCompact ? '11px' : '14px'
  }),
  matchTime: {
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: '2px'
  },
  matchName: {
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  matchLeague: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px'
  },
  statusBadge: (status: string) => {
    const colors = {
      naplanovany: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
      prebieha: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      ukonceny: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
      odlozeny: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      zruseny: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
    };
    const color = colors[status as keyof typeof colors] || colors.naplanovany;
    
    return {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '500',
      backgroundColor: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`
    };
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)'
  },
  weekDayColumn: {
    borderRight: '1px solid #e2e8f0'
  },
  weekDayHeader: (isToday: boolean) => ({
    padding: '16px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'center' as const,
    fontWeight: '600',
    backgroundColor: isToday ? '#eff6ff' : '#f8fafc',
    color: isToday ? '#3b82f6' : '#374151'
  }),
  weekDayContent: {
    padding: '12px',
    minHeight: '400px'
  },
  upcomingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px'
  },
  upcomingCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    padding: '24px'
  },
  upcomingTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center'
  },
  countBadge: (color: string) => ({
    marginLeft: '8px',
    padding: '4px 8px',
    backgroundColor: color,
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  }),
  matchListItem: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    transition: 'background-color 0.2s',
    cursor: 'pointer'
  },
  summaryCard: {
    marginTop: '24px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '16px'
  }
};

const KalendarManagement: React.FC<KalendarManagementProps> = ({ user }) => {
  // ===== STATE =====
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthData, setMonthData] = useState<MonthCalendarData | null>(null);
  const [weekData, setWeekData] = useState<WeekCalendarData | null>(null);
  const [upcomingData, setUpcomingData] = useState<UpcomingMatchesData | null>(null);
  
  const [ligy, setLigy] = useState<Liga[]>([]);
  const [timy, setTimy] = useState<Team[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // ===== FILTERS =====
  const [filters, setFilters] = useState<CalendarFilters>({});
  
  // ===== LOAD DATA =====
  useEffect(() => {
    loadInitialData();
  }, []);
  
  useEffect(() => {
    loadCalendarData();
  }, [currentView, selectedDate, filters]);
  
  const loadInitialData = async () => {
    try {
      const [ligyResponse, timyResponse] = await Promise.all([
        fetch('http://localhost:3000/api/leagues'),
        fetch('http://localhost:3000/api/teams')
      ]);
      
      if (ligyResponse.ok) {
        const ligyData = await ligyResponse.json();
        setLigy(ligyData.data || []);
      }
      
      if (timyResponse.ok) {
        const timyData = await timyResponse.json();
        setTimy(timyData.data || []);
      }
    } catch (err) {
      console.error('Chyba pri načítaní úvodných dát:', err);
    }
  };
  
  const loadCalendarData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const day = selectedDate.getDate();
      
      switch (currentView) {
        case 'month':
          const monthResponse = await calendarApi.getMonthCalendar(year, month, filters);
          setMonthData(monthResponse.data);
          break;
          
        case 'week':
          const weekResponse = await calendarApi.getWeekCalendar(year, month, day, filters);
          setWeekData(weekResponse.data);
          break;
          
        case 'upcoming':
          const upcomingFilters = { ...filters, limit: 15 };
          const upcomingResponse = await calendarApi.getUpcomingMatches(upcomingFilters);
          setUpcomingData(upcomingResponse.data);
          break;
      }
    } catch (err) {
      setError(`Chyba pri načítaní kalendára: ${err}`);
    } finally {
      setLoading(false);
    }
  };
  
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    
    setSelectedDate(newDate);
  };
  
  const updateFilter = (key: keyof CalendarFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };
  
  const formatDateHeader = () => {
    const monthNames = [
      'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
      'Júl', 'August', 'September', 'Október', 'November', 'December'
    ];
    
    if (currentView === 'month') {
      return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    } else if (currentView === 'week') {
      return `Týždeň ${selectedDate.toLocaleDateString('sk-SK')}`;
    } else {
      return 'Nadchádzajúce zápasy';
    }
  };
  
  const getMonthDays = () => {
    if (!monthData) return [];
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
    
    const days: Array<{ date: Date; isCurrentMonth: boolean; matches: CalendarMatch[] }> = [];
    
    // Pridaj dni z predchádzajúceho mesiaca
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      const date = new Date(year, month, -i + 1);
      days.push({ date, isCurrentMonth: false, matches: [] });
    }
    
    // Pridaj dni aktuálneho mesiaca
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toLocaleDateString('sk-SK');
      const matches = monthData.calendar[dateKey] || [];
      days.push({ date, isCurrentMonth: true, matches });
    }
    
    // Dopĺň do konca týždňa
    while (days.length % 7 !== 0) {
      const lastDate = days[days.length - 1].date;
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      days.push({ date: nextDate, isCurrentMonth: false, matches: [] });
    }
    
    return days;
  };
  
  const formatMatchTime = (match: CalendarMatch) => {
    return match.cas || new Date(match.datum_cas).toLocaleTimeString('sk-SK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const renderMatch = (match: CalendarMatch, isCompact = false) => (
    <div
      key={match.id}
      style={styles.matchCard(isCompact)}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={styles.matchTime}>
            {formatMatchTime(match)}
          </div>
          <div style={styles.matchName}>
            {match.nazov}
          </div>
          {match.liga && (
            <div style={styles.matchLeague}>
              🏆 {match.liga.nazov}
            </div>
          )}
        </div>
        <span style={styles.statusBadge(match.status)}>
          {match.status}
        </span>
      </div>
      
      {match.vysledok && match.vysledok !== 'nezadany' && match.vysledok !== '-:-' && (
        <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: '500', color: '#059669' }}>
          ⚽ {match.vysledok}
        </div>
      )}
      
      {!isCompact && match.miesto && (
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
          📍 {match.miesto}
        </div>
      )}
    </div>
  );
  
  return (
    <div style={styles.container}>
      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          📅 Kalendár zápasov
        </h1>
        <p style={styles.subtitle}>
          Prehľad všetkých zápasov v kalendári s možnosťou filtrovania
        </p>
      </div>
      
      {/* Controls */}
      <div style={styles.controlsCard}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          {/* View Selector */}
          <div style={styles.viewSelector}>
            {(['month', 'week', 'upcoming'] as CalendarView[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                style={styles.viewButton(currentView === view)}
                onMouseEnter={(e) => {
                  if (currentView !== view) {
                    e.currentTarget.style.backgroundColor = '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== view) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {view === 'month' && '📅 Mesiac'}
                {view === 'week' && '📆 Týždeň'}
                {view === 'upcoming' && '⏰ Nadchádzajúce'}
              </button>
            ))}
          </div>
          
          {/* Navigation */}
          {currentView !== 'upcoming' && (
            <div style={styles.navigationWrapper}>
              <button
                onClick={() => navigateDate('prev')}
                style={styles.navButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                ← Predchádzajúci
              </button>
              <div style={styles.dateDisplay}>
                {formatDateHeader()}
              </div>
              <button
                onClick={() => navigateDate('next')}
                style={styles.navButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                Nasledujúci →
              </button>
            </div>
          )}
          
          <button
            onClick={() => setSelectedDate(new Date())}
            style={styles.todayButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            Dnes
          </button>
        </div>
        
        {/* Filters */}
        <div style={styles.filtersWrapper}>
          <select
            value={filters.liga_id || ''}
            onChange={(e) => updateFilter('liga_id', e.target.value ? parseInt(e.target.value) : undefined)}
            style={styles.select}
          >
            <option value="">Všetky ligy</option>
            {ligy.map(liga => (
              <option key={liga.id} value={liga.id}>
                {liga.nazov}
              </option>
            ))}
          </select>
          
          <select
            value={filters.tim_id || ''}
            onChange={(e) => updateFilter('tim_id', e.target.value ? parseInt(e.target.value) : undefined)}
            style={styles.select}
          >
            <option value="">Všetky tímy</option>
            {timy.map(tim => (
              <option key={tim.id} value={tim.id}>
                {tim.nazov}
              </option>
            ))}
          </select>
          
          {(filters.liga_id || filters.tim_id) && (
            <button
              onClick={() => setFilters({})}
              style={styles.clearButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#64748b';
              }}
            >
              ✕ Vyčistiť filtre
            </button>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div style={styles.errorMessage}>
          ❌ {error}
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner}></div>
          <p style={{ color: '#64748b' }}>Načítavam kalendár...</p>
        </div>
      )}
      
      {/* Calendar Content */}
      {!loading && (
        <>
          {/* Month View */}
          {currentView === 'month' && monthData && (
            <div style={styles.calendarCard}>
              {/* Weekday Headers */}
              <div style={styles.weekdayHeader}>
                {['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'].map((day, index) => (
                  <div key={day} style={{
                    ...styles.weekdayCell,
                    borderRight: index === 6 ? 'none' : '1px solid #e2e8f0'
                  }}>
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div style={styles.monthGrid}>
                {getMonthDays().map((day, index) => {
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  return (
                    <div 
                      key={index} 
                      style={{
                        ...styles.dayCell(day.isCurrentMonth, isToday),
                        borderRight: (index + 1) % 7 === 0 ? 'none' : '1px solid #e2e8f0'
                      }}
                    >
                      <div style={styles.dayNumber(day.isCurrentMonth, isToday)}>
                        {day.date.getDate()}
                      </div>
                      
                      <div>
                        {day.matches.slice(0, 2).map(match => renderMatch(match, true))}
                        {day.matches.length > 2 && (
                          <div style={{
                            fontSize: '11px',
                            color: '#64748b',
                            textAlign: 'center',
                            padding: '2px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '4px'
                          }}>
                            +{day.matches.length - 2} ďalších
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Week View */}
          {currentView === 'week' && weekData && (
            <div style={styles.calendarCard}>
              <div style={styles.weekGrid}>
                {['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'].map((dayName, index) => {
                  // Note: Tu by sme potrebovali načítať správne dni týždňa z weekData
                  const isToday = false; // placeholder
                  
                  return (
                    <div key={index} style={{
                      ...styles.weekDayColumn,
                      borderRight: index === 6 ? 'none' : '1px solid #e2e8f0'
                    }}>
                      <div style={styles.weekDayHeader(isToday)}>
                        <div style={{ fontSize: '12px' }}>{dayName.slice(0, 2)}</div>
                        <div style={{ fontSize: '18px' }}>{index + 1}</div>
                      </div>
                      
                      <div style={styles.weekDayContent}>
                        <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
                          Žiadne zápasy
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Upcoming View */}
          {currentView === 'upcoming' && upcomingData && (
            <div style={styles.upcomingGrid}>
              {/* Nadchádzajúce zápasy */}
              <div style={styles.upcomingCard}>
                <h3 style={styles.upcomingTitle}>
                  ⏰ Nadchádzajúce zápasy
                  <span style={styles.countBadge('#3b82f6')}>
                    {upcomingData.breakdown.upcoming}
                  </span>
                </h3>
                
                <div>
                  {upcomingData.data
                    .filter(match => match.match_type === 'upcoming')
                    .slice(0, 10)
                    .map(match => (
                      <div 
                        key={match.id} 
                        style={styles.matchListItem}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontWeight: '500', color: '#1e293b' }}>{match.nazov}</div>
                            <div style={{ fontSize: '14px', color: '#64748b' }}>
                              {new Date(match.datum_cas).toLocaleDateString('sk-SK')} o {formatMatchTime(match)}
                            </div>
                          </div>
                          <span style={styles.statusBadge(match.status)}>
                            {match.status}
                          </span>
                        </div>
                        
                        {match.liga && (
                          <div style={{ fontSize: '14px', color: '#64748b' }}>
                            🏆 {match.liga.nazov}
                          </div>
                        )}
                        
                        {match.miesto && (
                          <div style={{ fontSize: '14px', color: '#64748b' }}>
                            📍 {match.miesto}
                          </div>
                        )}
                      </div>
                    ))}
                  
                  {upcomingData.breakdown.upcoming === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
                      📅 Žiadne nadchádzajúce zápasy
                    </div>
                  )}
                </div>
              </div>
              
              {/* Zápasy bez výsledku */}
              <div style={styles.upcomingCard}>
                <h3 style={styles.upcomingTitle}>
                  ❓ Zápasy bez výsledku
                  <span style={styles.countBadge('#f59e0b')}>
                    {upcomingData.breakdown.without_result}
                  </span>
                </h3>
                
                <div>
                  {upcomingData.data
                    .filter(match => match.match_type === 'without_result')
                    .slice(0, 10)
                    .map(match => (
                      <div 
                        key={match.id} 
                        style={{
                          ...styles.matchListItem,
                          borderLeft: '4px solid #f59e0b'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontWeight: '500', color: '#1e293b' }}>{match.nazov}</div>
                            <div style={{ fontSize: '14px', color: '#64748b' }}>
                              {new Date(match.datum_cas).toLocaleDateString('sk-SK')} o {formatMatchTime(match)}
                            </div>
                          </div>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fcd34d'
                          }}>
                            Bez výsledku
                          </span>
                        </div>
                        
                        {match.liga && (
                          <div style={{ fontSize: '14px', color: '#64748b' }}>
                            🏆 {match.liga.nazov}
                          </div>
                        )}
                        
                        <div style={{ marginTop: '8px' }}>
                          <button style={{
                            fontSize: '14px',
                            color: '#3b82f6',
                            fontWeight: '500',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#1d4ed8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#3b82f6';
                          }}
                          >
                            ✏️ Zadať výsledok
                          </button>
                        </div>
                      </div>
                    ))}
                  
                  {upcomingData.breakdown.without_result === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
                      ✅ Všetky zápasy majú zadané výsledky
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Summary */}
      {!loading && (currentView === 'month' && monthData || currentView === 'week' && weekData) && (
        <div style={styles.summaryCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px' }}>
            <span style={{ color: '#1e40af' }}>
              📊 Celkovo zápasov: <strong>
                {currentView === 'month' ? monthData?.total_matches : weekData?.total_matches}
              </strong>
            </span>
            
            {(filters.liga_id || filters.tim_id) && (
              <span style={{ color: '#1e40af' }}>
                🔍 Aktívne filtre
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KalendarManagement;