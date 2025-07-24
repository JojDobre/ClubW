// frontend/src/components/PlayersManagementAdmin.tsx
// Komponenta pre správu hráčov v admin dashboarde

import React, { useState, useEffect } from 'react';
import { playersApi, teamsApi, Player, Team } from '../services/teamsApi';
import StatCard from './ui/cards/StatCard';
import '../styles/components/managementPages.css';


import Table from './ui/table/Table';
import type { TableColumn, TableData } from './ui/table/Table';
import { useRouter } from '../context/RouterContext';

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
    info: `${player.vyska ? `📏 ${player.vyska} cm` : ''}${player.vyska && player.vaha ? '\n' : ''}${player.vaha ? `⚖️ ${player.vaha} kg` : ''}`.trim() || '-'
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
// HLAVNA FUNCCIA PRE FORMULÁR HÁRAČA
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
    'brankár', 'obranca', 'stredopoliar', 'útočník', 'libero', 'stoper',
    'wingback', 'defenzívny stredopoliar', 'ofenzívny stredopoliar', 'krídelník', 'druhý útočník'
  ];

  const uploadPhoto = async (file: File, teamId: number): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('tim_id', teamId.toString());

    const response = await fetch('http://localhost:3000/api/upload/player-photo', {
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
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {player ? 'Upraviť hráča' : 'Nový hráč'}
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

          {/* Fotka hráča */}
<div style={{ marginTop: '16px' }}>
  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
    Fotka hráča
  </label>
  
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
    {/* Preview fotky */}
    <div style={{
      width: '80px',
      height: '80px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: '#f9fafb'
    }}>
      {imagePreview ? (
        <img 
          src={imagePreview} 
          alt="Preview" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }}
        />
      ) : (
        <span style={{ fontSize: '24px', color: '#9ca3af' }}>👤</span>
      )}
    </div>
    
      {/* Upload button */}
      <div style={{ flex: 1 }}>
        <input
          type="file"
          id="player-photo"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <label 
          htmlFor="player-photo"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151'
          }}
        >
          📁 Vybrať fotku
        </label>
        
        {selectedFile && (
          <div style={{ 
            marginTop: '4px', 
            fontSize: '12px', 
            color: '#6b7280' 
          }}>
            {selectedFile.name}
          </div>
        )}
        
        {imagePreview && (
          <button
            type="button"
            onClick={() => {
              setImagePreview('');
              setSelectedFile(null);
              setFormData({ ...formData, fotka: '' });
            }}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ✕ Odstrániť
          </button>
        )}
      </div>
    </div>
    
    <div style={{ 
      marginTop: '4px', 
      fontSize: '12px', 
      color: '#6b7280' 
    }}>
      Podporované formáty: JPG, PNG, WebP (max. 5MB)
    </div>
  </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Meno */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Meno *
              </label>
              <input
                type="text"
                required
                value={formData.meno}
                onChange={(e) => setFormData({ ...formData, meno: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Priezvisko */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Priezvisko *
              </label>
              <input
                type="text"
                required
                value={formData.priezvisko}
                onChange={(e) => setFormData({ ...formData, priezvisko: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Dátum narodenia */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Dátum narodenia *
              </label>
              <input
                type="date"
                required
                value={formData.datum_narodenia}
                onChange={(e) => setFormData({ ...formData, datum_narodenia: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Pozícia */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Pozícia *
              </label>
              <select
                required
                value={formData.pozicia}
                onChange={(e) => setFormData({ ...formData, pozicia: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Vyberte pozíciu</option>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>

            {/* Tím */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Tím *
              </label>
              <select
                required
                value={formData.tim_id}
                onChange={(e) => setFormData({ ...formData, tim_id: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value={0}>Vyberte tím</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.nazov} {team.vekova_kategoria}
                  </option>
                ))}
              </select>
            </div>

            {/* Číslo dresu */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Číslo dresu
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={formData.cislo_dresu}
                onChange={(e) => setFormData({ ...formData, cislo_dresu: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Národnosť */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Národnosť
              </label>
              <input
                type="text"
                value={formData.narodnost}
                onChange={(e) => setFormData({ ...formData, narodnost: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Váha */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Váha (kg)
              </label>
              <input
                type="number"
                min="30"
                max="200"
                step="0.1"
                value={formData.vaha}
                onChange={(e) => setFormData({ ...formData, vaha: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Výška */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Výška (cm)
              </label>
              <input
                type="number"
                min="120"
                max="250"
                value={formData.vyska}
                onChange={(e) => setFormData({ ...formData, vyska: e.target.value })}
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

          {/* Poznámky */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Poznámky
            </label>
            <textarea
              rows={3}
              value={formData.poznamky}
              onChange={(e) => setFormData({ ...formData, poznamky: e.target.value })}
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
              {loading ? 'Ukladám...' : (player ? 'Aktualizovať' : 'Pridať hráča')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayersManagementAdmin;