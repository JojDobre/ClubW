// frontend/src/components/TeamsManagement.tsx
// Komponenta pre správu tímov v admin dashboarde

import React, { useState, useEffect } from 'react';
import { teamsApi, Team } from '../services/teamsApi';
import PlayersManagementAdmin from './PlayersManagementAdmin';
import StaffManagementAdmin from './StaffManagementAdmin';
import StatCard from './ui/cards/StatCard';
import Table from './ui/table/Table';
import type { TableColumn, TableData } from './ui/table/Table';
import '../styles/components/managementPages.css';

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

interface TeamsManagementProps {
  currentUser: User;
}
// Komponenta pre formulár tímu
interface TeamFormProps {
  team?: Team | null;
  onClose: () => void;
  onSave: () => void;
}

        ///////////////////////////
       /// TEAM  ADD/EDIT  FORM //
      ///////////////////////////

const TeamForm: React.FC<TeamFormProps> = ({ team, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nazov: team?.nazov || '',
    typ: team?.typ || 'mladez' as 'muzi' | 'zeny' | 'mladez',
    vekova_kategoria: team?.vekova_kategoria || '',
    popis: team?.popis || '',
    logo: team?.logo || '',
    farba_prva: team?.farba_prva || '',
    farba_druha: team?.farba_druha || '',
    poradie: team?.poradie || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    // ✅ OPRAVA: Neposielať prázdne stringy pre URL polia
    const teamData = {
      ...formData,
      logo: formData.logo.trim() || undefined,
      farba_prva: formData.farba_prva || undefined,
      farba_druha: formData.farba_druha || undefined,
      popis: formData.popis.trim() || undefined,
    };

    if (team) {
      await teamsApi.updateTeam(team.id, teamData);
    } else {
      await teamsApi.createTeam(teamData);
    }

    onSave();
  } catch (err) {
    console.error('Chyba pri ukladaní tímu:', err);
    setError(err instanceof Error ? err.message : 'Chyba pri ukladaní tímu');
  } finally {
    setLoading(false);
  }
};

  return (
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
    padding: '16px',
    zIndex: 10000
  }}>
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          {team ? 'Upraviť tím' : 'Pridať nový tím'}
        </h3>
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: '#6b7280',
            padding: '4px'
          }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Názov */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Názov tímu *
              </label>
              <input
                type="text"
                minLength={2}
                maxLength={100} 
                required
                value={formData.nazov}
                onChange={(e) => setFormData({ ...formData, nazov: e.target.value })}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: loading ? '#f9fafb' : 'white'
                }}
              />
            </div>

            {/* Typ a kategória */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Typ *
                </label>
                <select
                  required
                  value={formData.typ}
                  onChange={(e) => setFormData({ ...formData, typ: e.target.value as any })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    backgroundColor: loading ? '#f9fafb' : 'white'
                  }}
                >
                  <option value="muzi">Muži</option>
                  <option value="zeny">Ženy</option>
                  <option value="mladez">Mládež</option>
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Veková kategória *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}     
                  maxLength={50} 
                  placeholder="napr. U19, seniori"
                  value={formData.vekova_kategoria}
                  onChange={(e) => setFormData({ ...formData, vekova_kategoria: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    backgroundColor: loading ? '#f9fafb' : 'white'
                  }}
                />
              </div>
            </div>

            {/* Popis */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Popis
              </label>
              <textarea
                rows={3}
                value={formData.popis}
                onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Poradie */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Poradie
              </label>
              <input
                type="number"
                min="0"
                value={formData.poradie}
                onChange={(e) => setFormData({ ...formData, poradie: parseInt(e.target.value) || 0 })}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: loading ? '#f9fafb' : 'white'
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px', 
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {loading ? 'Ukladám...' : (team ? 'Aktualizovať' : 'Pridať tím')}
            </button>
          </div>
        </form>
      </div>
    </div>

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

// Komponenta pre detail tímu
interface TeamDetailProps {
  team: Team;
  onBack: () => void;
  onUpdate: () => void;
}



        ///////////////////////////
       /// TEAM MANAGEMENT PAGE //
      ///////////////////////////

const TeamsManagement: React.FC<TeamsManagementProps> = ({ currentUser }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showDetail, setShowDetail] = useState(false);


  // Formátovanie typu tímu
  const formatTeamType = (typ: string): string => {
    switch (typ) {
      case 'muzi': return 'Muži';
      case 'zeny': return 'Ženy';
      case 'mladez': return 'Mládež';
      default: return typ;
    }
  };

  // Získanie farby pre typ tímu
  const getTypeColor = (typ: string): string => {
    switch (typ) {
      case 'muzi': return '#3b82f6';
      case 'zeny': return '#ec4899';
      case 'mladez': return '#10b981';
      default: return '#6b7280';
    }
  };


  // ===== DEFINÍCIE STĹPCOV PRE TABUĽKU =====
  const tableColumns: TableColumn[] = [
    { id: 'nazov', header: 'Názov', type: 'text', sortable: true, width: '25%' },
    { id: 'typ', header: 'Typ', type: 'text', sortable: true, width: '15%' },
    { id: 'vekova_kategoria', header: 'Kategória', type: 'text', sortable: true, width: '15%' },
    { id: 'pocet_hracov', header: 'Hráči', type: 'text', sortable: true, width: '10%' },
    { id: 'pocet_realizacny_tim', header: 'Realizačný tím', type: 'text', sortable: true, width: '15%' },
    { id: 'actions', header: 'Akcie', type: 'actions', width: '8%' }
  ];

  // ===== TRANSFORMÁCIA DÁT PRE TABUĽKU =====
  const tableData: TableData[] = teams.map(team => ({
    id: team.id.toString(),
    nazov: team.nazov,
    typ: formatTeamType(team.typ),
    vekova_kategoria: team.vekova_kategoria,
    pocet_hracov: (team.pocet_hracov || 0).toString(),
    pocet_realizacny_tim: (team.pocet_realizacny_tim || 0).toString(),

    kategoria: {
      id: team.typ,
      nazov: formatTeamType(team.typ)
    }
    
  }));

  //Komponenta pre štatistiky tímu
  interface TeamStats {
    celkovo: number;
    muzi: number;
    zeny: number;
    mladez: number;
    // Zmeny
    celkovo_zmena?: string;
    celkovo_zmena_typ?: 'positive' | 'negative' | 'neutral';
    muzi_zmena?: string;
    muzi_zmena_typ?: 'positive' | 'negative' | 'neutral';
    zeny_zmena?: string;
    zeny_zmena_typ?: 'positive' | 'negative' | 'neutral';
    mladez_zmena?: string;
    mladez_zmena_typ?: 'positive' | 'negative' | 'neutral';
  }

  // State pre štatistiky 
  const [stats, setStats] = useState<TeamStats>({
    celkovo: 0,
    muzi: 0,
    zeny: 0,
    mladez: 0
  });

  // Výpočet štatistík z načítaných tímov
  const calculateStats = (teamsData: Team[]) => {
    const celkovo = teamsData.length;
    const muzi = teamsData.filter(team => team.typ === 'muzi').length;
    const zeny = teamsData.filter(team => team.typ === 'zeny').length;
    const mladez = teamsData.filter(team => team.typ === 'mladez').length;

    setStats({
      celkovo,
      muzi,
      zeny,
      mladez,
      // TODO: Pridať výpočet zmien oproti predchádzajúcemu obdobiu
      celkovo_zmena: '+5%',
      celkovo_zmena_typ: 'positive',
      muzi_zmena: '+2%',
      muzi_zmena_typ: 'positive',
      zeny_zmena: '0%',
      zeny_zmena_typ: 'neutral',
      mladez_zmena: '+3%',
      mladez_zmena_typ: 'positive'
    });
  };

  // Ikony pre štatistické karty (pridaj sem)
  const TeamIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="m22 21-3-3m0 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );

  const MenIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" stroke="currentColor" strokeWidth="2"/>
      <path d="M19 8v6m3-3h-6" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );

  const WomenIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );

  const YouthIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87m0 0a4 4 0 0 1 8 0M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="9" r="2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );

  // Načítanie tímov z API
  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await teamsApi.getTeams({
        typ: filterType || undefined,
        search: searchTerm || undefined,
        include_stats: true,
      });

      if (response.success) {
        setTeams(response.data);
        calculateStats(response.data);
        setError('');
      } else {
        setError('Chyba pri načítaní tímov');
      }
    } catch (err) {
      console.error('Chyba pri načítaní tímov:', err);
      setError(err instanceof Error ? err.message : 'Neočakávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie pri spustení a zmene filtrov
  useEffect(() => {
    fetchTeams();
  }, [searchTerm, filterType]);

  // ===== EVENT HANDLERS PRE TABUĽKU =====
  const handleAddTeam = () => {
    setShowAddForm(true);
  };

  // Edit tímu
  const handleEditTeam = (teamId: string) => {
    const team = teams.find(t => t.id.toString() === teamId);
    if (team) {
      setEditingTeam(team);
      setShowAddForm(true);
    }
  };

  // Vymazanie tímu
  const handleDeleteTeam = async (teamId: string) => {
    const teamIdNumber = parseInt(teamId);
    if (!window.confirm('Naozaj chcete vymazať tento tím?')) {
      return;
    }

    try {
      await teamsApi.deleteTeam(teamIdNumber);
      await fetchTeams(); // Obnovenie zoznamu
    } catch (err) {
      console.error('Chyba pri mazaní tímu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri mazaní tímu');
    }
  };

  const handleRowClick = (teamId: string) => {
    const team = teams.find(t => t.id.toString() === teamId);
    if (team) {
      handleShowDetail(team);
    }
  };

  const handleBulkDeleteTeams = async (selectedIds: string[]) => {
    if (!window.confirm(`Naozaj chcete vymazať ${selectedIds.length} označených tímov?`)) {
      return;
    }

    try {
      for (const id of selectedIds) {
        await teamsApi.deleteTeam(parseInt(id));
      }
      await fetchTeams();
    } catch (err) {
      console.error('Chyba pri hromadnom mazaní tímov:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri hromadnom mazaní tímov');
    }
  };

  // Zobrazenie detailu tímu
  const handleShowDetail = async (team: Team) => {
    setLoading(true);
    try {
      const response = await teamsApi.getTeamById(team.id, {
        include_players: true,
        include_staff: true,
      });

      if (response.success) {
        setSelectedTeam(response.data);
        setShowDetail(true);
      }
    } catch (err) {
      console.error('Chyba pri načítaní detailu tímu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní detailu');
    } finally {
      setLoading(false);
    }
  };

  if (showDetail && selectedTeam) {
    return <TeamDetail team={selectedTeam} onBack={() => setShowDetail(false)} onUpdate={fetchTeams} />;
  }

  return (
    <div className="management-page">
      {/* ===== HEADER SEKCIA ===== */}
      <div className="management-header">
        <h1 className="management-title">
          Správa tímov
        </h1>
        <p className="management-subtitle">
          Spravujte všetky tímy klubu
        </p>
      </div>


      {/* ===== ŠTATISTIKY KARTY ===== */}
      <div className="management-stats">
        <StatCard
          title="Celkovo tímov"
          value={stats.celkovo}
          icon={<TeamIcon />}
          variant="default"
        />
        
        <StatCard
          title="Muži"
          value={stats.muzi}
          icon={<MenIcon />}
          variant="accent"
        />
        
        <StatCard
          title="Ženy"
          value={stats.zeny}
          icon={<WomenIcon />}
          variant="default"
        />
        
        <StatCard
          title="Mládež"
          value={stats.mladez}
          icon={<YouthIcon />}
          variant="accent"
        />
      </div>

      {/* ===== TABUĽKA S TÍMAMI ===== */}
      <div className="management-content">
        {error && (
          <div className="management-error">
            ❌ Chyba: {error}
          </div>
        )}

        {loading ? (
          <div className="management-loading">
            ⚽ Načítavam tímy...
          </div>
        ) : (
          <Table
            columns={tableColumns}
            data={tableData}
            showCheckboxes={true}
            itemsPerPage={10}
            onAddTeam={handleAddTeam}
            onDeleteSelected={handleBulkDeleteTeams}
            onEditRow={handleEditTeam}
            onDeleteRow={handleDeleteTeam}
            onRowClick={handleRowClick}
            enableAdvancedFilters={true}
            filterCustomLabels={{
              categories: 'Typ' // ✅ Custom label pre teams
            }}
          />
        )}
      </div>

      

      {/* Formulár pre pridanie/úpravu tímu */}
      {showAddForm && (
        <TeamForm
          team={editingTeam}
          onClose={() => {
            setShowAddForm(false);
            setEditingTeam(null);
          }}
          onSave={() => {
            setShowAddForm(false);
            setEditingTeam(null);
            fetchTeams();
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


        ///////////////////////////
       /// TEAM   DETAIL   PAGE //
      ///////////////////////////

const TeamDetail: React.FC<TeamDetailProps> = ({ team, onBack, onUpdate }) => {
const [showAddPlayer, setShowAddPlayer] = useState(false);
const [showAddStaff, setShowAddStaff] = useState(false);
const [showEditTeam, setShowEditTeam] = useState(false);
const [editingPlayer, setEditingPlayer] = useState<any>(null);
const [editingStaff, setEditingStaff] = useState<any>(null);

const handleDeletePlayer = async (playerId: number) => {
  if (!window.confirm('Naozaj chcete vymazať tohto hráča?')) return;
  
  try {
    // Tu by bol API call na vymazanie hráča
    // await playersApi.deletePlayer(playerId);
    console.log('Vymazanie hráča:', playerId);
    onUpdate(); // Obnovenie dát
  } catch (err) {
    console.error('Chyba pri mazaní hráča:', err);
  }
};

const handleDeleteStaff = async (staffId: number) => {
  if (!window.confirm('Naozaj chcete vymazať tohto člena realizačného tímu?')) return;
  
  try {
    // Tu by bol API call na vymazanie staff
    // await staffApi.deleteStaff(staffId);
    console.log('Vymazanie staff:', staffId);
    onUpdate(); // Obnovenie dát
  } catch (err) {
    console.error('Chyba pri mazaní člena realizačného tímu:', err);
  }
};

const handleDeleteTeam = async () => {
  if (!window.confirm('Naozaj chcete vymazať tento tím? Táto akcia je nevratná!')) return;
  
  try {
    // Tu by bol API call na vymazanie tímu
    console.log('Vymazanie tímu:', team.id);
    onBack(); // Návrat na zoznam
  } catch (err) {
    console.error('Chyba pri mazaní tímu:', err);
  }
};

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('sk-SK');
  };

  const formatTeamType = (typ: string): string => {
    switch (typ) {
      case 'muzi': return 'Muži';
      case 'zeny': return 'Ženy';
      case 'mladez': return 'Mládež';
      default: return typ;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Navigácia späť */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          cursor: 'pointer',
          fontSize: '14px',
          marginBottom: '24px'
        }}
      >
        ← Späť na zoznam tímov
      </button>

      {/* Header */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            {team.logo && (
              <img 
                src={team.logo} 
                alt={`${team.nazov} logo`}
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
                {team.nazov}
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '16px' }}>
                {team.vekova_kategoria} • {formatTeamType(team.typ)}
              </p>
              {/* Počítadlá */}
              <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {team.hraci?.length || 0}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>hráčov</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                    {team.realizacny_tim?.length || 0}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>členov realizačného tímu</span>
                </div>
              </div>
            </div>
          </div>

          {team.popis && (
            <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
              {team.popis}
            </p>
          )}
        </div>

        {/* Akcie */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            Rýchle akcie
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddPlayer(true)}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ➕ Pridať hráča
            </button>
            <button
              onClick={() => setShowAddStaff(true)}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ➕ Pridať člena realizačného tímu
            </button>
            <button
              onClick={() => setShowEditTeam(true)}
              style={{
                background: '#fbbf24',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ✏️ Upraviť tím
            </button>
            <button
              onClick={() => handleDeleteTeam()}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🗑️ Vymazať tím
            </button>
          </div>
        </div>


      {/* Hráči a realizačný tím */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
       {/* Hráči */}
<div style={{
  background: 'white',
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
      Hráči ({team.hraci?.length || 0})
    </h3>
    <button
      onClick={() => setShowAddPlayer(true)}
      style={{
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px'
      }}
    >
      ➕ Pridať
    </button>
  </div>
  
  {team.hraci && team.hraci.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {team.hraci.map((player) => (
        <div 
          key={player.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            background: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: player.cislo_dresu ? '#3b82f6' : '#e5e7eb',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {player.cislo_dresu || '?'}
            </div>
            <div>
              <div style={{ fontWeight: '500', color: '#1e293b' }}>
                {player.full_name}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {player.pozicia} • {player.vek} rokov
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => {
                setEditingPlayer(player);
                setShowAddPlayer(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#fbbf24',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px'
              }}
              title="Upraviť hráča"
            >
              ✏️
            </button>
            <button
              onClick={() => handleDeletePlayer(player.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px'
              }}
              title="Vymazať hráča"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div style={{ 
      textAlign: 'center', 
      padding: '20px', 
      color: '#6b7280',
      background: '#f8fafc',
      borderRadius: '6px',
      border: '2px dashed #e2e8f0'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚽</div>
      <p style={{ margin: 0 }}>Žiadni hráči</p>
      <button
        onClick={() => setShowAddPlayer(true)}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          marginTop: '8px'
        }}
      >
        Pridať prvého hráča
      </button>
    </div>
  )}
</div>

      {/* Realizačný tím */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Realizačný tím ({team.realizacny_tim?.length || 0})
          </h3>
          <button
            onClick={() => setShowAddStaff(true)}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ➕ Pridať
          </button>
        </div>
        
        {team.realizacny_tim && team.realizacny_tim.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {team.realizacny_tim.map((staff) => (
              <div 
                key={staff.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: '#f0fdf4',
                  borderRadius: '6px',
                  border: '1px solid #dcfce7'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: '#10b981',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    👤
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>
                      {staff.full_name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {staff.funkcia}
                    </div>
                    {staff.ma_kontakt && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {staff.kontakt.email && (
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>📧</span>
                        )}
                        {staff.kontakt.telefon && (
                          <span style={{
                            background: '#d1fae5',
                            color: '#065f46',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>📞</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setEditingStaff(staff);
                      setShowAddStaff(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fbbf24',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px'
                    }}
                    title="Upraviť člena"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(staff.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px'
                    }}
                    title="Vymazať člena"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            color: '#6b7280',
            background: '#f0fdf4',
            borderRadius: '6px',
            border: '2px dashed #dcfce7'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👨‍💼</div>
            <p style={{ margin: 0 }}>Žiadni členovia realizačného tímu</p>
            <button
              onClick={() => setShowAddStaff(true)}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                marginTop: '8px'
              }}
            >
              Pridať prvého člena
            </button>
          </div>
        )}
      </div>
      </div>
      {/* Modaly pre pridanie/úpravu */}
{showAddPlayer && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000
  }}>
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative'
    }}>
      <button
        onClick={() => {
          setShowAddPlayer(false);
          setEditingPlayer(null);
        }}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          cursor: 'pointer',
          zIndex: 1001
        }}
      >
        ✕
      </button>
      {/* ✅ CELÝ EXISTUJÚCI KOMPONENT */}
      <PlayersManagementAdmin 
        currentUser={{ 
          id: 1, 
          meno: 'Admin', 
          email: 'admin@example.com', 
          rola: 'admin',
          aktivity: true,
          posledne_prihlasenie: null,
          vytvoreny: '',
          aktualizovany: ''
        }} 
      />
    </div>
  </div>
)}

{showAddStaff && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000
  }}>
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative'
    }}>
      <button
        onClick={() => {
          setShowAddStaff(false);
          setEditingStaff(null);
        }}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          cursor: 'pointer',
          zIndex: 1001
        }}
      >
        ✕
      </button>
      {/* ✅ CELÝ EXISTUJÚCI KOMPONENT */}
      <StaffManagementAdmin 
        currentUser={{ 
          id: 1, 
          meno: 'Admin', 
          email: 'admin@example.com', 
          rola: 'admin',
          aktivity: true,
          posledne_prihlasenie: null,
          vytvoreny: '',
          aktualizovany: ''
        }} 
      />
    </div>
  </div>
)}

      {showEditTeam && (
        <TeamForm
          team={team}
          onClose={() => setShowEditTeam(false)}
          onSave={() => {
            setShowEditTeam(false);
            onUpdate();
          }}
        />
      )}
    </div>

    
  );
};

export default TeamsManagement;