// frontend/src/components/TeamsManagement.tsx
// Komponenta pre správu tímov v admin dashboarde

import React, { useState, useEffect } from 'react';
import { teamsApi, Team } from '../services/teamsApi';

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

  // Vymazanie tímu
  const handleDeleteTeam = async (teamId: number) => {
    if (!window.confirm('Naozaj chcete vymazať tento tím?')) {
      return;
    }

    try {
      await teamsApi.deleteTeam(teamId);
      await fetchTeams(); // Obnovenie zoznamu
    } catch (err) {
      console.error('Chyba pri mazaní tímu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri mazaní tímu');
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

  if (showDetail && selectedTeam) {
    return <TeamDetail team={selectedTeam} onBack={() => setShowDetail(false)} onUpdate={fetchTeams} />;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          Správa tímov
        </h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Spravujte všetky tímy klubu
        </p>
      </div>

      {/* Akcie a filtrovanie */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddForm(true)}
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
            + Pridať tím
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Vyhľadávanie */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Vyhľadávanie
            </label>
            <input
              type="text"
              placeholder="Hľadať tím..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Filter typu */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Typ tímu
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky typy</option>
              <option value="muzi">Muži</option>
              <option value="zeny">Ženy</option>
              <option value="mladez">Mládež</option>
            </select>
          </div>

          {/* Počet tímov */}
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              <strong>{teams.length}</strong> tímov
            </div>
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

      {/* Zoznam tímov */}
      {!loading && (
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {teams.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Tím
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Typ
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Hráči
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Realizačný tím
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Akcie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, index) => (
                    <tr 
                      key={team.id} 
                      style={{ 
                        borderBottom: index < teams.length - 1 ? '1px solid #f1f5f9' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleShowDetail(team)}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {team.logo && (
                            <img 
                              src={team.logo} 
                              alt={`${team.nazov} logo`}
                              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: '500', color: '#1f2937' }}>
                              {team.nazov}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              {team.vekova_kategoria}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: `${getTypeColor(team.typ)}20`,
                          color: getTypeColor(team.typ)
                        }}>
                          {formatTeamType(team.typ)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                        {team.stats?.pocet_hracov || 0}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                        {team.stats?.pocet_realizacneho_timu || 0}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTeam(team);
                              setShowAddForm(true);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#3b82f6',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Upraviť
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeam(team.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Vymazať
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚽</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#374151' }}>Žiadne tímy</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {searchTerm || filterType ? 'Pre zadané kritériá neboli nájdené žiadne tímy.' : 'Zatiaľ nie sú vytvorené žiadne tímy.'}
              </p>
            </div>
          )}
        </div>
      )}

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

// Komponenta pre formulár tímu
interface TeamFormProps {
  team?: Team | null;
  onClose: () => void;
  onSave: () => void;
}

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
      if (team) {
        await teamsApi.updateTeam(team.id, formData);
      } else {
        await teamsApi.createTeam(formData);
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
      zIndex: 1000
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
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {team ? 'Upraviť tím' : 'Pridať nový tím'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
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

          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Názov */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Názov tímu *
              </label>
              <input
                type="text"
                required
                value={formData.nazov}
                onChange={(e) => setFormData({ ...formData, nazov: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Typ a kategória */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Typ *
                </label>
                <select
                  required
                  value={formData.typ}
                  onChange={(e) => setFormData({ ...formData, typ: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="muzi">Muži</option>
                  <option value="zeny">Ženy</option>
                  <option value="mladez">Mládež</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Veková kategória *
                </label>
                <input
                  type="text"
                  required
                  placeholder="napr. U19, seniori"
                  value={formData.vekova_kategoria}
                  onChange={(e) => setFormData({ ...formData, vekova_kategoria: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Popis */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Popis
              </label>
              <textarea
                rows={3}
                value={formData.popis}
                onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Farby */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Prvá farba
                </label>
                <input
                  type="color"
                  value={formData.farba_prva}
                  onChange={(e) => setFormData({ ...formData, farba_prva: e.target.value })}
                  style={{
                    width: '100%',
                    height: '40px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Druhá farba
                </label>
                <input
                  type="color"
                  value={formData.farba_druha}
                  onChange={(e) => setFormData({ ...formData, farba_druha: e.target.value })}
                  style={{
                    width: '100%',
                    height: '40px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tlačidlá */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Ukladám...' : (team ? 'Aktualizovať' : 'Pridať tím')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Komponenta pre detail tímu
interface TeamDetailProps {
  team: Team;
  onBack: () => void;
  onUpdate: () => void;
}

const TeamDetail: React.FC<TeamDetailProps> = ({ team, onBack, onUpdate }) => {
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
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
              {team.nazov}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
              {team.vekova_kategoria} • {formatTeamType(team.typ)}
            </p>
          </div>
        </div>

        {team.popis && (
          <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
            {team.popis}
          </p>
        )}
      </div>

      {/* Štatistiky */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
            {team.hraci?.length || 0}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Hráči</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
            {team.realizacny_tim?.length || 0}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Realizačný tím</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '8px' }}>
            {formatDate(team.vytvoreny)}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Vytvorený</div>
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
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            Hráči ({team.hraci?.length || 0})
          </h3>
          
          {team.hraci && team.hraci.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {team.hraci.map((player) => (
                <div key={player.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                      {player.full_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {player.pozicia} • {player.vek} rokov
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚽</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Žiadni hráči</p>
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
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            Realizačný tím ({team.realizacny_tim?.length || 0})
          </h3>
          
          {team.realizacny_tim && team.realizacny_tim.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {team.realizacny_tim.map((staff) => (
                <div key={staff.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                      {staff.full_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
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
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Žiadny realizačný tím</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamsManagement;