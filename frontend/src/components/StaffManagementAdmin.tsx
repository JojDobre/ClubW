// frontend/src/components/StaffManagementAdmin.tsx
// Komponenta pre správu realizačného tímu v admin dashboarde

import React, { useState, useEffect,useRef } from 'react';
import { staffApi, teamsApi, Staff, Team } from '../services/teamsApi';
import StatCard from './ui/cards/StatCard';
import '../styles/components/managementPages.css';

import Table from './ui/table/Table';
import type { TableColumn, TableData } from './ui/table/Table';
import '../styles/components/PlayerModal.css';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

// Helper funkcia pre výpočet veku z dátumu narodenia
const calculateAge = (dateOfBirth?: string): number => {
  if (!dateOfBirth) return 0;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

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

interface StaffManagementAdminProps {
  currentUser: User;
}

// Komponenta pre formulár staffa
interface StaffFormProps {
  staff?: Staff | null;
  teams: Team[];
  functions: string[];
  onClose: () => void;
  onSave: () => void;
}

interface StaffManagementAdminProps {
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






////////////////////////////////////////////////////
// Komponenta pre správu realizačného tímu  ////////
////////////////////////////////////////////////////
const StaffManagementAdmin: React.FC<StaffManagementAdminProps> = ({ currentUser }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number>(0);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [showClubStaff, setShowClubStaff] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

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

  // Možné funkcie realizačného tímu
  const functions = [
    'hlavný tréner',
    'asistent trénera',
    'tréner brankárov',
    'fyzioterapeut',
    'lekár',
    'masér',
    'manažer',
    'sekretár',
    'vedúci mužstva',
    'skaut',
    'kondičný tréner',
    'mentálny kouč',
    'predseda klubu',
    'ostatné'
  ];

  // Funkcia na výpočet štatistík
  const calculateStats = (playersData: Staff[]) => {
    const celkovo = playersData.length;
    const aktivni = playersData.filter(p => p.aktivity).length;
    const bez_timu = playersData.filter(p => !p.tim_id).length;
    
    // Výpočet priemerného veku
    const aktualny_rok = new Date().getFullYear();
    const vekove_data = playersData
      .filter(s => s.datum_narodenia)
      .map(s => calculateAge(s.datum_narodenia));
    
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

  // Načítanie členov realizačného tímu
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await staffApi.getStaff({
        tim_id: selectedTeam || undefined,
        funkcia: selectedFunction || undefined,
        search: searchTerm || undefined,
        include_team: true,
        klubovi: showClubStaff ? true : undefined,
      });

      if (response.success) {
        setStaff(response.data);
        calculateStats(response.data); // PRIDAJ TENTO RIADOK
        setError('');
      } else {
        setError('Chyba pri načítaní hráčov');
      }
    } catch (err) {
      console.error('Chyba pri načítaní realizačného tímu:', err);
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
    fetchStaff();
  }, [searchTerm, selectedTeam, selectedFunction, showClubStaff]);

  useEffect(() => {
    fetchTeams();
  }, []);

  // Vymazanie člena realizačného tímu
  const handleDeleteStaff = async (staffId: number) => {
    if (!window.confirm('Naozaj chcete vymazať tohto člena realizačného tímu?')) {
      return;
    }

    try {
      await staffApi.deleteStaff(staffId);
      await fetchStaff(); // Obnovenie zoznamu
    } catch (err) {
      console.error('Chyba pri mazaní člena realizačného tímu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri mazaní člena realizačného tímu');
    }
  };

  // Pridaj definíciu stĺpcov pre tabuľku hneď za useState deklarácie
  const tableColumns: TableColumn[] = [
    { id: 'staff', header: 'Člen', type: 'user', sortable: true },
    { id: 'funkcia', header: 'Funkcia', type: 'text', sortable: true },
    { id: 'tim', header: 'Tím', type: 'text', sortable: true },
    { id: 'kontakt', header: 'Kontakt', type: 'text', sortable: false },
    { id: 'vek', header: 'Vek', type: 'text', sortable: true },
    { id: 'kvalifikacia', header: 'Kvalifikácia', type: 'text', sortable: false },
    { id: 'actions', header: 'Akcie', type: 'actions', width: '100px' }
  ];


  const getAvatarUrl = (fotka?: string | null): string => {
    if (!fotka) return '/uploads/default-avatar.svg';
    if (fotka.startsWith('http://') || fotka.startsWith('https://')) return fotka;
    if (fotka.startsWith('/')) return fotka;
    return `/uploads/${fotka}`;
  };


  // Konverzia Staff dát pre tabuľku
  const tableData: TableData[] = staff.map(member => ({
    id: member.id.toString(),
    staff: {
      name: member.full_name,
      avatar: getAvatarUrl(member.fotka),
      subtitle: `${member.funkcia} • ${member.tim?.nazov || 'Celý klub'}`
    },
    funkcia: member.funkcia,
    tim: member.tim ? `${member.tim.nazov} ${member.tim.vekova_kategoria || ''}`.trim() : 'Celý klub',
    kontakt: member.ma_kontakt ? 
      `${member.kontakt.email ? '📧 ' + member.kontakt.email : ''}${member.kontakt.email && member.kontakt.telefon ? '\n' : ''}${member.kontakt.telefon ? '📞 ' + member.kontakt.telefon : ''}`.trim() 
      : '-',
    vek: member.datum_narodenia ? `${calculateAge(member.datum_narodenia)} r` : '-',
    kvalifikacia: member.kvalifikacia || '-'
  }));

  // Helper funkcia pre formátovanie dátumu
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sk-SK');
  };

  // Handler funkcie pre tabuľku
  const handleAddStaffFromTable = () => {
    setShowAddForm(true);
    setEditingStaff(null);
  };

  const handleEditStaff = (staffId: string) => {
    const member = staff.find(s => s.id.toString() === staffId);
    if (member) {
      setEditingStaff(member);
      setShowAddForm(true);
    }
  };

  const handleDeleteStaffFromTable = (staffId: string) => {
    handleDeleteStaff(Number(staffId));
  };

  const handleBulkDeleteStaff = (selectedIds: string[]) => {
    if (!window.confirm(`Naozaj chcete vymazať ${selectedIds.length} označených členov realizačného tímu?`)) {
      return;
    }
    
    Promise.all(selectedIds.map(id => handleDeleteStaff(Number(id))))
      .then(() => {
        console.log('Bulk delete dokončené');
      })
      .catch(err => {
        console.error('Chyba pri bulk delete:', err);
        setError('Chyba pri mazaní členov realizačného tímu');
      });
  };

  const handleBulkDuplicateStaff = (selectedIds: string[]) => {
    // TODO: Implementovať duplikovanie členov realizačného tímu
    console.log('Duplikovanie členov realizačného tímu:', selectedIds);
  };

  return (
    <div className="management-page">
      {/* Header */}
      <div className="management-header">
        <h1 className="management-title">
          Správa realizačného tímu
        </h1>
      </div>

      {/* ===== ŠTATISTICKÉ KARTY ===== */}
      <div className="management-stats">
        <StatCard
          title="Celkový počet členov"
          value={stats.celkovo}
          icon={<span style={{ fontSize: '20px' }}>👥</span>}
          variant="default"
        />
      
        <StatCard
          title="Počet členov bez priradeného tímu"
          value={stats.bez_timu}
          icon={<span style={{ fontSize: '20px' }}>❓</span>}
          variant="accent"
        />
      </div>


      {/* Akcie a filtrovanie */}
<div className="management-stats">

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>



          {/* Filter tímu */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Tím
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(Number(e.target.value));
                setShowClubStaff(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="0">Všetky tímy</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.nazov} {team.vekova_kategoria}
                </option>
              ))}
            </select>
          </div>

          {/* Filter funkcie */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Funkcia
            </label>
            <select
              value={selectedFunction}
              onChange={(e) => setSelectedFunction(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky funkcie</option>
              {functions.map((func) => (
                <option key={func} value={func}>
                  {func}
                </option>
              ))}
            </select>
          </div>
        </div>
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

      {/* ===== TABUĽKA S REALIZAČNÝM TÍMOM ===== */}
      <div className="management-content">
        <Table
          columns={tableColumns}
          data={tableData}
          showCheckboxes={true}
          itemsPerPage={15}
          onAddTeam={handleAddStaffFromTable} // Použije sa pre pridanie nového člena
          teams={teams}
          onDeleteSelected={handleBulkDeleteStaff}
          onDuplicateSelected={handleBulkDuplicateStaff}
          onEditRow={handleEditStaff}
          onDeleteRow={handleDeleteStaffFromTable}
          enableAdvancedFilters={true}
          filterCustomLabels={{
            categories: 'Funkcie',
            status: 'Tím',
            users: 'Členovia',
            dates: 'Dátumy'
          }}
        />
      </div>

      {/* Formulár pre pridanie/úpravu člena realizačného tímu */}
      {showAddForm && (
        <StaffForm
          staff={editingStaff}
          teams={teams}
          functions={functions}
          onClose={() => {
            setShowAddForm(false);
            setEditingStaff(null);
          }}
          onSave={() => {
            setShowAddForm(false);
            setEditingStaff(null);
            fetchStaff();
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

// Komponenta pre formulár člena realizačného tímu
interface StaffFormProps {
  staff?: Staff | null;
  teams: Team[];
  functions: string[];
  onClose: () => void;
  onSave: () => void;
}

//////////////////////////////////////////////////////////
///// Komponenta pre formulár člena realizačného tímu ///
/////////////////////////////////////////////////////////
const StaffForm: React.FC<StaffFormProps> = ({ staff, teams, functions, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    meno: staff?.meno || '',
    priezvisko: staff?.priezvisko || '',
    funkcia: staff?.funkcia || '',
    email: staff?.email || '',
    telefon: staff?.telefon || '',
    datum_narodenia: staff?.datum_narodenia ? staff.datum_narodenia.split('T')[0] : '',
    kvalifikacia: staff?.kvalifikacia || '',
    tim_id: staff?.tim_id || 0,
    poznamky: staff?.poznamky || '',
    fotka: staff?.fotka || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // ✅ PRIDANÉ
  const [imagePreview, setImagePreview] = useState<string>(staff?.fotka || ''); // ✅ PRIDANÉ

  // ✅ PRIDANÉ - Upload photo funkcia (rovnaká ako v PlayerForm)
  const uploadPhoto = async (file: File, teamId: number): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('tim_id', teamId.toString()); // Aj pre staff pošleme tim_id

    const response = await fetch(apiUrl('/upload/staff-photo'), {
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

  // ✅ PRIDANÉ - Handler pre upload fotky (rovnaký ako v PlayerForm)
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

  // ✅ PRIDANÉ - useEffect pre cleanup (rovnaký ako v PlayerForm)
  useEffect(() => {
    if (staff) {
      setImagePreview(staff.fotka || '');
    }
    
    // Cleanup pri unmount
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let photoUrl = formData.fotka;
      
      if (selectedFile) {
        console.log('🔄 Uploadujem staff fotku:', selectedFile.name);
        const teamIdForUpload = formData.tim_id || 1; // Default team ID
        photoUrl = await uploadPhoto(selectedFile, teamIdForUpload);
        console.log('✅ Staff fotka uploadnutá:', photoUrl);
      }

      const staffData = {
        ...formData,
        tim_id: Number(formData.tim_id) || undefined,
        email: formData.email || undefined,
        telefon: formData.telefon || undefined,
        datum_narodenia: formData.datum_narodenia || undefined,
        kvalifikacia: formData.kvalifikacia || undefined,
        poznamky: formData.poznamky || undefined,
        fotka: photoUrl || undefined, 
      };

      console.log('Odosielajú sa tieto dáta na server:', staffData);

      if (staff) {
        const response = await staffApi.updateStaff(staff.id, staffData);
        console.log('✅ Člen realizačného tímu aktualizovaný:', response);
      } else {
        const response = await staffApi.createStaff(staffData as any);
        console.log('✅ Člen realizačného tímu vytvorený:', response);
      }

      onSave();
    } catch (err) {
      console.error('Chyba pri ukladaní člena realizačného tímu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní člena realizačného tímu');
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ AKTUALIZOVANÉ - použitie CSS tried namiesto inline štýlov
    <div className="modal-overlay">
      <div className="modal-content">
        
        {/* Header modalu */}
        <div className="modal-header">
          <h2 className="modal-title">
            {staff ? 'Upraviť člena realizačného tímu' : 'Nový člen realizačného tímu'}
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

            {/* ✅ PRIDANÉ - Upload fotky (identický ako v PlayerForm) */}
            <div className="avatar-upload-section">
              <div className="avatar-upload">
                <input
                  type="file"
                  id="staff-photo-input"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="avatar-input"
                />
                <label htmlFor="staff-photo-input" className="avatar-label">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
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

            {/* ✅ AKTUALIZOVANÉ - Meno a Priezvisko */}
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

            {/* ✅ AKTUALIZOVANÉ - Funkcia a Tím */}
            <div className="form-row">
              <div className="form-field">
                <select
                  required
                  value={formData.funkcia}
                  onChange={(e) => setFormData({ ...formData, funkcia: e.target.value })}
                  className="form-input"
                >
                  <option value="">Pozícia *</option>
                  {functions.map((funkcia) => (
                    <option key={funkcia} value={funkcia}>
                      {funkcia}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <select
                  value={formData.tim_id}
                  onChange={(e) => setFormData({ ...formData, tim_id: Number(e.target.value) })}
                  className="form-input"
                >
                  <option value="0">Mužstvo</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.nazov} {team.vekova_kategoria}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ✅ AKTUALIZOVANÉ - Email a Telefón */}
            <div className="form-row">
              <div className="form-field">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  placeholder="Email (voliteľné)"
                />
              </div>
              <div className="form-field">
                <input
                  type="tel"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  className="form-input"
                  placeholder="Telefón (voliteľné)"
                />
              </div>
            </div>

            {/* ✅ AKTUALIZOVANÉ - Dátum narodenia a Kvalifikácia */}
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
                  value={formData.kvalifikacia}
                  onChange={(e) => setFormData({ ...formData, kvalifikacia: e.target.value })}
                  className="form-input"
                  placeholder="Kvalifikácia (napr. UEFA A)"
                />
              </div>
            </div>

            {/* ✅ AKTUALIZOVANÉ - Poznámky */}
            <textarea
              rows={3}
              value={formData.poznamky}
              onChange={(e) => setFormData({ ...formData, poznamky: e.target.value })}
              className="form-input"
              placeholder="Poznámky, dodatočné informácie..."
            />

            {/* ✅ AKTUALIZOVANÉ - Tlačidlá */}
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
                className="form-button save-button"
                disabled={loading}
              >
                {loading ? 'Ukladám...' : (staff ? 'Aktualizovať' : 'Pridať člena')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffManagementAdmin;