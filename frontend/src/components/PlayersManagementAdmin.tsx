// frontend/src/components/PlayersManagementAdmin.tsx
// Komponenta pre správu hráčov v admin dashboarde

import React, { useState, useEffect, useRef } from 'react';
import { playersApi, teamsApi, Player, Team } from '../services/teamsApi';
import StatCard from './ui/cards/StatCard';
import '../styles/components/managementPages.css';
import '../styles/components/PlayerModal.css';


import Table from './ui/table/Table';
import type { TableColumn, TableData } from './ui/table/Table';
import { useRouter } from '../context/RouterContext';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

interface User {
  id: number;
  meno: string;
  email: string;
  rola: 'admin' | 'redaktor' | 'trener' | 'uzivatel';
  tim_id?: number;
  aktivity: boolean;
  posledne_prihlasenie: string | null;
  vytvoreny: string;
  aktualizovany: string;
}

// Komponenta pre formulár hráča
interface PlayerFormProps {
  player?: Player | null;
  teams: Team[];
  onClose: () => void;
  onSave: () => void;
}

interface PlayersManagementAdminProps {
  currentUser: User;
}

/////////////////////////////////////////////////
// Komponenta pre dátumový vstup ///////////////
/////////////////////////////////////////////////

// DateInput komponent - krásny dátumový selektor
interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const DateInput: React.FC<DateInputProps> = ({ value, onChange, placeholder }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [yearInput, setYearInput] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Formátovanie dátumu pre zobrazenie
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Názvy mesiacov v slovenčine
  const monthNames = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December'
  ];

  // Názvy dní v slovenčine
  const dayNames = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

  // Generovanie rokov pre quick select
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1900; year--) {
      years.push(year);
    }
    return years;
  };

  // Handler pre klik na rok
  const handleYearClick = () => {
    setShowYearPicker(true);
    setYearInput(currentMonth.getFullYear().toString());
  };

  // Handler pre zmenu roku
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Povoliť iba čísla a maximálne 4 znaky
    if (/^\d{0,4}$/.test(value)) {
      setYearInput(value);
    }
  };

  // Handler pre potvrdenie roku
  const handleYearSubmit = () => {
    const year = parseInt(yearInput);
    if (year >= 1900 && year <= 2100) {
      const newDate = new Date(currentMonth);
      newDate.setFullYear(year);
      setCurrentMonth(newDate);
    }
    setShowYearPicker(false);
    setYearInput('');
  };

  // Handler pre stlačenie Enter v roku
  const handleYearKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleYearSubmit();
    } else if (e.key === 'Escape') {
      setShowYearPicker(false);
      setYearInput('');
    }
  };

  // Handler pre výber roku zo selectu
  const handleYearSelect = (year: number) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setCurrentMonth(newDate);
    setShowYearPicker(false);
  };

  // Získanie dní v mesiaci
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Správny výpočet pre pondelok ako prvý deň (0)
    let startDay = firstDay.getDay();
    // Nedeľa = 0, chceme ju ako 6 (posledný deň)
    // Pondelok = 1, chceme ho ako 0 (prvý deň)
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];
    
    // Prázdne miesta na začiatku
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Dni v mesiaci
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  // Handler pre klik na deň
  const handleDayClick = (date: Date) => {
    // Správne formátovanie dátumu do ISO formátu
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    onChange(dateStr);
    setShowPicker(false);
  };

  // Handler pre zmenu mesiaca
  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Handler pre klik na ikonu kalendára
  const handleCalendarClick = () => {
    setShowPicker(!showPicker);
    if (value) {
      setCurrentMonth(new Date(value));
    }
  };

  // Zatvorenie pickera pri kliknutí mimo
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  // Kontrola či je deň vybratý
  const isSelectedDay = (date: Date) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return date.toDateString() === selectedDate.toDateString();
  };

  // Kontrola či je deň dnes
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="date-input-container" ref={pickerRef}>
      <div className="date-input-wrapper">
        <input
          type="text"
          value={formatDisplayDate(value)}
          readOnly
          className="form-input date-display"
          placeholder={placeholder}
          onClick={handleCalendarClick}
        />
        <button
          type="button"
          onClick={handleCalendarClick}
          className="date-calendar-icon"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
      </div>

      {/* Custom Calendar Picker */}
      {showPicker && (
        <div className="calendar-picker">
          {/* Header kalendára */}
          <div className="calendar-header">
            <button
              type="button"
              onClick={() => handleMonthChange('prev')}
              className="calendar-nav-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>
            
            <div className="calendar-month-year">
              <span className="calendar-month">{monthNames[currentMonth.getMonth()]} </span>
              <button 
                type="button"
                onClick={handleYearClick}
                className="calendar-year-button"
              >
                {currentMonth.getFullYear()}
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => handleMonthChange('next')}
              className="calendar-nav-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </div>

          {/* Year Picker */}
          {showYearPicker && (
            <div className="year-picker">
              <div className="year-picker-header">
                <span>Vyberte rok:</span>
                <button
                  type="button"
                  onClick={() => setShowYearPicker(false)}
                  className="year-picker-close"
                >
                  ✕
                </button>
              </div>
              
              <div className="year-input-section">
                <input
                  type="text"
                  value={yearInput}
                  onChange={handleYearChange}
                  onKeyDown={handleYearKeyPress}
                  placeholder="Zadajte rok (1900-2100)"
                  className="year-input"
                  autoFocus
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={handleYearSubmit}
                  className="year-submit-button"
                  disabled={!yearInput || parseInt(yearInput) < 1900 || parseInt(yearInput) > 2100}
                >
                  ✓
                </button>
              </div>

              <div className="year-quick-select">
                <div className="year-quick-title">Rýchly výber:</div>
                <div className="year-options">
                  {generateYearOptions().slice(0, 8).map(year => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearSelect(year)}
                      className={`year-option ${year === currentMonth.getFullYear() ? 'active' : ''}`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
                
                {generateYearOptions().length > 8 && (
                  <div className="year-scroll-hint">
                    Posuňte sa pre ďalšie roky alebo zadajte rok priamo
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dni v týždni */}
          <div className="calendar-weekdays">
            {dayNames.map(day => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          {/* Dni v mesiaci */}
          <div className="calendar-days">
            {getDaysInMonth(currentMonth).map((date, index) => (
              <div key={index} className="calendar-day-cell">
                {date && (
                  <button
                    type="button"
                    onClick={() => handleDayClick(date)}
                    className={`calendar-day ${isSelectedDay(date) ? 'selected' : ''} ${isToday(date) ? 'today' : ''}`}
                  >
                    {date.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Footer s dnešným dátumom */}
          <div className="calendar-footer">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;
                onChange(todayStr);
                setShowPicker(false);
              }}
              className="calendar-today-button"
            >
              Dnes ({new Date().toLocaleDateString('sk-SK')})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};





/////////////////////////////////////////////
// HLAVNÁ FUNKCIA PRE SPRÁVU HRÁČOV/////////
///////////////////////////////////////////


const PlayersManagementAdmin: React.FC<PlayersManagementAdminProps> = ({ currentUser }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number>(0);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const { navigate } = useRouter();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  // Možné pozície hráčov
  const positions = [
    'Brankár',
    'Obranca', 
    'Stredopoliar',
    'Útočník',
    'Libero',
    'Stoper',
    'Wingback',
    'Defenzívny stredopoliar',
    'Ofenzívny stredopoliar',
    'Krídelník',
    'Druhý útočník'
  ];

  //Stats
  const [stats, setStats] = useState({
    celkovo: 0,
    aktivni: 0,
    priemerny_vek: 0,
    bez_timu: 0,
    celkovo_zmena: '+5%',
    celkovo_zmena_typ: 'positive' as 'positive' | 'negative' | 'neutral',
    aktivni_zmena: '+2%', 
    aktivni_zmena_typ: 'positive' as 'positive' | 'negative' | 'neutral',
    vek_zmena: '-0.5',
    vek_zmena_typ: 'positive' as 'positive' | 'negative' | 'neutral',
    bez_timu_zmena: '0',
    bez_timu_zmena_typ: 'neutral' as 'positive' | 'negative' | 'neutral'
  });

  const getAvatarUrl = (fotka?: string | null): string => {
    if (!fotka) return '/uploads/default-avatar.svg';
    if (fotka.startsWith('http://') || fotka.startsWith('https://')) return fotka;
    if (fotka.startsWith('/')) return fotka;
    return `/uploads/${fotka}`;
  };

  // Načítanie hráčov
  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await playersApi.getPlayers({
        tim_id: selectedTeam || undefined,
        pozicia: selectedPosition || undefined,
        search: searchTerm || undefined,
        include_team: true,
      });

      if (response.success) {
        setPlayers(response.data);
        calculateStats(response.data);
        setError('');
      } else {
        setError('Chyba pri načítaní hráčov');
      }
    } catch (err) {
      console.error('Chyba pri načítaní hráčov:', err);
      setError(err instanceof Error ? err.message : 'Neočakávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie tímov pre filter
  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getTeams();
      if (response.success) {
        setTeams(response.data);
      }
    } catch (err) {
      console.error('Chyba pri načítaní tímov:', err);
    }
  };

  // Načítanie dát pri spustení a zmene filtrov
  useEffect(() => {
    fetchPlayers();
  }, [searchTerm, selectedTeam, selectedPosition]);

  useEffect(() => {
    fetchTeams();
  }, []);

  

  // Vymazanie hráča
  const handleDeletePlayer = async (playerId: number) => {
    if (!window.confirm('Naozaj chcete vymazať tohto hráča?')) {
      return;
    }

    try {
      await playersApi.deletePlayer(playerId);
      await fetchPlayers(); // Obnovenie zoznamu
    } catch (err) {
      console.error('Chyba pri mazaní hráča:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri mazaní hráča');
    }
  };

  // Formátovanie dátumu
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('sk-SK');
  };

  //Funkcia na výpočet štatistík
  const calculateStats = (playersData: Player[]) => {
    const celkovo = playersData.length;
    const aktivni = playersData.filter(p => p.aktivity).length;
    const bez_timu = playersData.filter(p => !p.tim_id).length;
    
    // Výpočet priemerného veku
    const aktualny_rok = new Date().getFullYear();
    const vekove_data = playersData
      .filter(p => p.datum_narodenia)
      .map(p => aktualny_rok - new Date(p.datum_narodenia!).getFullYear());
    
    const priemerny_vek = vekove_data.length > 0 
      ? Math.round(vekove_data.reduce((sum, vek) => sum + vek, 0) / vekove_data.length)
      : 0;

    setStats(prev => ({
      ...prev,
      celkovo,
      aktivni,
      priemerny_vek,
      bez_timu
    }));
  };

  // Table columns definícia
  const tableColumns: TableColumn[] = [
    { id: 'player', header: 'Hráč', type: 'user', sortable: true },
    { id: 'tim', header: 'Tím', type: 'text', sortable: true },
    { id: 'pozicia', header: 'Pozícia', type: 'text', sortable: true },
    { id: 'vek', header: 'Vek', type: 'text', sortable: true },
    { id: 'cislo', header: 'Číslo', type: 'text', sortable: true },
    { id: 'datum_narodenia', header: 'Dátum narodenia', type: 'date', sortable: true }, 
    { id: 'narodnost', header: 'Národnosť', type: 'text', sortable: true },
    { id: 'info', header: 'Info', type: 'text', sortable: false },
    { id: 'actions', header: 'Akcie', type: 'actions', width: '100px' }
  ];

  // Konverzia dát pre tabuľku
  const tableData: TableData[] = players.map(player => ({
    id: player.id.toString(),
    player: {
      name: player.full_name,
      avatar: getAvatarUrl(player.fotka),
      subtitle: `${player.narodnost || ''} • ${formatDate(player.datum_narodenia)}`
    },
    tim: player.tim ? `${player.tim.nazov} ${player.tim.vekova_kategoria || ''}` : '-',
    pozicia: player.pozicia,
    vek: `${player.vek} rokov`,
    cislo: player.cislo_dresu?.toString() || '-',
    datum_narodenia: formatDate(player.datum_narodenia), // PRIDANÉ
    narodnost: player.narodnost || '-', // PRIDANÉ
    info: 
    `${player.vyska ? `📏 ${player.vyska} cm` : ''}
    ${player.vyska && player.vaha ? '\n' : ''}
    ${player.vaha ? `⚖️ ${player.vaha} kg` : ''}`.trim() || '-'
  }));

  //state pre column visibility 
  const [columnVisibility, setColumnVisibility] = useState([
    { columnId: 'player', visible: true },
    { columnId: 'tim', visible: true },
    { columnId: 'pozicia', visible: true },
    { columnId: 'vek', visible: true },
    { columnId: 'cislo', visible: true },
    { columnId: 'datum_narodenia', visible: false }, 
    { columnId: 'narodnost', visible: false }, 
    { columnId: 'info', visible: true },
    { columnId: 'actions', visible: true }
  ]);

  // Handler pre kliknutie na riadok
  const handleRowClick = (playerId: string) => {
    // TODO: Navigácia na detail hráča
    console.log('Navigácia na detail hráča:', playerId);
  };

  //handler pre zmenu visibility
  const handleColumnVisibilityChange = (filters: any) => {
      console.log('Filtre sa zmenili:', filters); // DEBUG
    if (filters.columnVisibility) {
      console.log('Nová viditeľnosť stĺpcov:', filters.columnVisibility); // DEBUG
      setColumnVisibility(filters.columnVisibility);
    }
  };

  // Handler pre úpravu hráča
  const handleEditPlayer = (playerId: string) => {
    const player = players.find(p => p.id.toString() === playerId);
    if (player) {
      setEditingPlayer(player);
      setShowAddForm(true);
    }
  };

  // Handler pre vymazanie hráča
  const handleDeletePlayerFromTable = (playerId: string) => {
    handleDeletePlayer(Number(playerId));
  };

  // Handler pre bulk delete
  const handleBulkDeletePlayers = (selectedIds: string[]) => {
    if (!window.confirm(`Naozaj chcete vymazať ${selectedIds.length} označených hráčov?`)) {
      return;
    }
    
    Promise.all(selectedIds.map(id => playersApi.deletePlayer(Number(id))))
      .then(() => {
        fetchPlayers();
        setSelectedPlayers([]);
      })
      .catch(err => {
        console.error('Chyba pri mazaní hráčov:', err);
        setError('Chyba pri mazaní hráčov');
      });
  };

  // Handler pre bulk duplicate
  const handleBulkDuplicatePlayers = (selectedIds: string[]) => {
    // TODO: Implementovať duplikovanie hráčov
    console.log('Duplikovanie hráčov:', selectedIds);
  };

  // Handler pre pridanie hráča z table
  const handleAddPlayerFromTable = () => {
    setShowAddForm(true);  // Zobraz existujúci PlayerForm modal
    setEditingPlayer(null); // Nastav ako pridávanie nového hráča
  };

  return (
    <div className="management-page">
      {/* Header */}
      <div className="management-header">
        <h1 className="management-title">
          Správa hráčov
        </h1>
      </div>


      {/* ===== ŠTATISTICKÉ KARTY ===== */}
      <div className="management-stats">
        <StatCard
          title="Celkovo hráčov"
          value={stats.celkovo}

          icon={<span style={{ fontSize: '20px' }}>👥</span>}
          variant="default"
        />
        
        <StatCard
          title="Aktívni hráči"
          value={stats.aktivni}
          icon={<span style={{ fontSize: '20px' }}>✅</span>}
          variant="accent"
        />
        
        <StatCard
          title="Priemerný vek"
          value={`${stats.priemerny_vek} rokov`}
          icon={<span style={{ fontSize: '20px' }}>📅</span>}
          variant="default"
        />
        
        <StatCard
          title="Bez tímu"
          value={stats.bez_timu}
          icon={<span style={{ fontSize: '20px' }}>❓</span>}
          variant="accent"
        />
      </div>

      

      {/* Chybové hlásenie */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f4f6', 
            borderTop: '4px solid #3b82f6', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      )}

      {/* ===== TABUĽKA S HRÁČMI ===== */}
      <div className="management-content">
        <Table
          columns={tableColumns}
          data={tableData}
          showCheckboxes={true}
          itemsPerPage={15}
          onAddTeam={handleAddPlayerFromTable}
          teams={teams}
          onDeleteSelected={handleBulkDeletePlayers}
          onDuplicateSelected={handleBulkDuplicatePlayers}
          onEditRow={handleEditPlayer}
          onDeleteRow={handleDeletePlayerFromTable}
          onRowClick={handleRowClick}
          onSearchChange={(term) => setSearchTerm(term)}
          searchTerm={searchTerm}
          
          // Advanced filters
          enableAdvancedFilters={true}
          onFiltersChange={handleColumnVisibilityChange}
          columnVisibility={columnVisibility} 
          filterCustomLabels={{
            users: 'Meno',
            dates: 'Dátum narodenia'
          }}
        />
      </div>

      {/* Formulár pre pridanie/úpravu hráča */}
      {showAddForm && (
        <PlayerForm
          player={editingPlayer}
          teams={teams}
          onClose={() => {
            setShowAddForm(false);
            setEditingPlayer(null);
          }}
          onSave={() => {
            setShowAddForm(false);
            setEditingPlayer(null);
            fetchPlayers();
          }}
        />
      )}

      {/* CSS pre animácie */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};



/////////////////////////////////////////////
// HLAVNA FUNCCIA PRE FORMULÁR HRAČA ////////
/////////////////////////////////////////////

const PlayerForm: React.FC<PlayerFormProps> = ({ player, teams, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    meno: player?.meno || '',
    priezvisko: player?.priezvisko || '',
    datum_narodenia: player?.datum_narodenia ? player.datum_narodenia.split('T')[0] : '',
    pozicia: player?.pozicia || '',
    tim_id: player?.tim_id || 0,
    cislo_dresu: player?.cislo_dresu || '',
    narodnost: player?.narodnost || '',
    vaha: player?.vaha || '',
    vyska: player?.vyska || '',
    poznamky: player?.poznamky || '',
    fotka: player?.fotka || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(player?.fotka || '');

  const positions = [
    'Brankár', 'Obranca', 'Stredopoliar', 'Útočník', 'Libero', 'Stoper',
    'Wingback', 'Defenzívny stredopoliar', 'Ofenzívny stredopoliar', 'Krídelník', 'Druhý útočník'
  ];
  

  const uploadPhoto = async (file: File, teamId: number): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('tim_id', teamId.toString());

    const response = await fetch(apiUrl('/upload/player-photo'), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      return result.data.url;
    } else {
      throw new Error(result.message);
    }
  };

  // Handler pre upload fotky
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Vytvor preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Nastav URL do formData (môže byť dočasné)
      setFormData({ ...formData, fotka: previewUrl });
    }
  };

  useEffect(() => {
    if (player) {
      setImagePreview(player.fotka || '');
    }
    
    // Cleanup pri unmount
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [player]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let photoUrl = formData.fotka;
      
      // Ak je vybraný nový súbor, najprv ho uploadni
      if (selectedFile && formData.tim_id) {
        console.log('🔄 Uploadujem fotku:', selectedFile.name);
        photoUrl = await uploadPhoto(selectedFile, Number(formData.tim_id));
        console.log('✅ Fotka uploadnutá:', photoUrl);
      }

      const playerData = {
        ...formData,
        tim_id: Number(formData.tim_id),
        cislo_dresu: formData.cislo_dresu ? Number(formData.cislo_dresu) : undefined,
        vaha: formData.vaha ? Number(formData.vaha) : undefined,
        vyska: formData.vyska ? Number(formData.vyska) : undefined,
        fotka: photoUrl || undefined,
      };

      console.log('Odosielajú sa tieto dáta na server:', playerData);

      if (player) {
        const response = await playersApi.updatePlayer(player.id, playerData);
        console.log('✅ Hráč aktualizovaný:', response);
      } else {
        const response = await playersApi.createPlayer(playerData as any);
        console.log('✅ Hráč vytvorený:', response);
      }

      onSave();
    } catch (err) {
      console.error('Chyba pri ukladaní hráča:', err);
      console.error('Detaily chyby:', err); // PRIDAJ ďalší debug
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní hráča');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Hlavný kontajner s CSS triedami namiesto inline štýlov
    <div className="modal-overlay">
      <div className="modal-content">
        
        {/* Header modalu */}
        <div className="modal-header">
          <h2 className="modal-title">
            {player ? 'Upraviť hráča' : 'Nový hráč'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-button"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Telo modalu */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="add-user-form">
            
            {/* Chybová správa */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            {/* Upload fotky */}
            <div className="avatar-upload-section">
              <div className="avatar-upload">
                <input
                  type="file"
                  id="player-photo-input"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="avatar-input"
                />
                <label htmlFor="player-photo-input" className="avatar-label">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Náhľad fotky hráča" 
                      className="avatar-preview"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path 
                          d="M16 16C19.3137 16 22 13.3137 22 10C22 6.68629 19.3137 4 16 4C12.6863 4 10 6.68629 10 10C10 13.3137 12.6863 16 16 16Z" 
                          fill="currentColor"
                        />
                        <path 
                          d="M16 18C10.477 18 6 22.477 6 28H26C26 22.477 21.523 18 16 18Z" 
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Základné informácie - meno a priezvisko */}
            <div className="form-row">
              <div className="form-field">
                <input
                  type="text"
                  required
                  value={formData.meno}
                  onChange={(e) => setFormData({ ...formData, meno: e.target.value })}
                  className="form-input"
                  placeholder="Meno *"
                />
              </div>
              
              <div className="form-field">
                <input
                  type="text"
                  required
                  value={formData.priezvisko}
                  onChange={(e) => setFormData({ ...formData, priezvisko: e.target.value })}
                  className="form-input"
                  placeholder="Priezvisko *"
                />
              </div>
            </div>

            {/* Dátum narodenia a národnosť */}
            <div className="form-row">
              <div className="form-field">
                <DateInput
                  value={formData.datum_narodenia}
                  onChange={(value) => setFormData({ ...formData, datum_narodenia: value })}
                  placeholder="Dátum narodenia"
                />
              </div>
              
              <div className="form-field">
                <input
                  type="text"
                  value={formData.narodnost}
                  onChange={(e) => setFormData({ ...formData, narodnost: e.target.value })}
                  className="form-input"
                  placeholder="Národnosť"
                />
              </div>
            </div>

            {/* Pozícia a tím */}
            <div className="form-row">
              <div className="form-field">
                <select
                  required
                  value={formData.pozicia}
                  onChange={(e) => setFormData({ ...formData, pozicia: e.target.value })}
                  className="form-input"
                >
                  <option value="">Pozícia</option>
                  {positions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-field">
                <select
                  required
                  value={formData.tim_id}
                  onChange={(e) => setFormData({ ...formData, tim_id: Number(e.target.value) })}
                  className="form-input"
                >
                  <option value={0}>Tím *</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.nazov} {team.vekova_kategoria}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Číslo dresu, váha a výška */}
            <div className="form-row">
              <div className="form-field">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={formData.cislo_dresu}
                  onChange={(e) => setFormData({ ...formData, cislo_dresu: e.target.value })}
                  className="form-input"
                  placeholder="Číslo dresu (1-99)"
                />
              </div>
              
              <div className="form-field">
                <input
                  type="number"
                  min="30"
                  max="200"
                  step="0.1"
                  value={formData.vaha}
                  onChange={(e) => setFormData({ ...formData, vaha: e.target.value })}
                  className="form-input"
                  placeholder="Váha v kg"
                />
              </div>
              
              <div className="form-field">
                <input
                  type="number"
                  min="120"
                  max="250"
                  value={formData.vyska}
                  onChange={(e) => setFormData({ ...formData, vyska: e.target.value })}
                  className="form-input"
                  placeholder="Výška v cm"
                />
              </div>
            </div>

            {/* Poznámky */}
            <div className="form-field">
              <textarea
                rows={3}
                value={formData.poznamky}
                onChange={(e) => setFormData({ ...formData, poznamky: e.target.value })}
                className="form-input"
                placeholder="Voliteľné poznámky o hráčovi"
              />
            </div>

            {/* Tlačidlá */}
            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="form-button cancel-button"
                disabled={loading}
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={loading}
                className="form-button save-button"
              >
                {loading ? 'Ukladám...' : (player ? 'Aktualizovať' : 'Pridať hráča')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlayersManagementAdmin;