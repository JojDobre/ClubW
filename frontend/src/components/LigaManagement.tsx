// frontend/src/components/LigaManagementAdmin.tsx
// Komponenta pre správu líg v admin dashboarde

import React, { useState, useEffect } from 'react';
import StatCard from './ui/cards/StatCard';
import Table from './ui/table/Table';
import type { TableColumn, TableData } from './ui/table/Table';
import { ligaApi, Liga, Team } from '../services/ligaApi';
import LigaFormModal from './LigaFormModal';
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

interface LigaManagementAdminProps {
  user: User; // Zmenené z currentUser na user pre kompatibilitu s App.tsx
}

// Štatistiky pre karty (jednoduché)
interface LigaStats {
  celkovo: number;
  aktivne: number;
  sutaze: number;
  pohary: number;
}

const LigaManagementAdmin: React.FC<LigaManagementAdminProps> = ({ user }) => {
  // State
  const [ligy, setLigy] = useState<Liga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<LigaStats>({
    celkovo: 0,
    aktivne: 0,
    sutaze: 0,
    pohary: 0
  });

  // Modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLiga, setEditingLiga] = useState<Liga | null>(null);

  // Načítanie líg z API
  const fetchLigy = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await ligaApi.getLeagues({ 
        include_stats: 'true',
        include_table: 'false'
      });
      
      setLigy(response.data);
      
      // Výpočet štatistík z response dát
      const statsData: LigaStats = {
        celkovo: response.data.length,
        aktivne: response.data.filter((l: Liga) => l.status === 'active').length,
        sutaze: response.data.filter((l: Liga) => l.typ === 'sutaz').length, 
        pohary: response.data.filter((l: Liga) => l.typ === 'pohar').length
      };
      setStats(statsData);
      
    } catch (err) {
      console.error('Chyba pri načítaní líg:', err);
      setError('Chyba pri načítaní líg');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie dát pri mount
  useEffect(() => {
    fetchLigy();
  }, []);

  // Helper funkcia pre získanie default logo
  const getLeagueLogo = (liga: Liga): string => {
    if (liga.logo) return liga.logo;
    
    // Default logo podľa typu
    switch (liga.typ) {
      case 'pohar':
        return '/uploads/default-cup.svg';
      case 'priatelska':
        return '/uploads/default-friendly.svg';
      default:
        return '/uploads/default-league.svg';
    }
  };
  // Helper funkcie pre tabuľku
  const getStatusBadge = (status: string) => {
    const styles = {
      'active': 'Prebieha',
      'upcoming': 'Pripravuje sa',
      'finished': 'Ukončená',
      'inactive': 'Neaktívna'
    };
    
    return styles[status as keyof typeof styles] || status;
  };

  const getTypeBadge = (typ: string, format: string) => {
    const typText = typ === 'sutaz' ? 'Súťaž' : typ === 'pohar' ? 'Pohár' : 'Priateľská';
    const formatText = format === 'tabulka' ? 'Liga' : format === 'turnaj' ? 'Turnaj' : 'Kombinovaný';
    
    return `${typText} • ${formatText}`;
  };

  // Definícia stĺpcov pre tabuľku
  const tableColumns: TableColumn[] = [
    {
      id: 'checkbox',
      header: '',
      type: 'checkbox',
      width: '50px'
    },
    {
      id: 'liga',
      header: 'Liga',
      type: 'user', // Pre zobrazenie obrázka + názov
      sortable: true,
      width: '35%'
    },
    {
      id: 'typ_format',
      header: 'Typ / Formát',
      type: 'text',
      sortable: true,
      width: '20%'
    },
    {
      id: 'sezona',
      header: 'Sezóna',
      type: 'text',
      sortable: true,
      width: '15%'
    },
    {
      id: 'status',
      header: 'Status',
      type: 'status',
      sortable: true,
      width: '15%'
    },
    {
      id: 'actions',
      header: 'Akcie',
      type: 'actions',
      sortable: false,
      width: '15%'
    }
  ];

  // Konverzia Liga dát pre tabuľku
  const tableData: TableData[] = ligy.map(liga => ({
    id: liga.id.toString(),
    liga: {
      name: liga.nazov,
      avatar: getLeagueLogo(liga),
      subtitle: `${liga.sezona} • ${liga.popis || 'Bez popisu'}`
    },
    typ_format: getTypeBadge(liga.typ, liga.format),
    sezona: liga.sezona,
    status: getStatusBadge(liga.status)
  }));

  // Handler funkcie pre tabuľku
  const handleAddLigaFromTable = () => {
    setEditingLiga(null);
    setShowAddForm(true);
  };

  const handleEditLiga = (ligaId: string) => {
    const liga = ligy.find(l => l.id.toString() === ligaId);
    if (liga) {
      setEditingLiga(liga);
      setShowAddForm(true);
    }
  };

  const handleDeleteLigaFromTable = async (ligaId: string) => {
    if (!window.confirm('Naozaj chcete vymazať túto ligu?')) {
      return;
    }

    try {
      await ligaApi.deleteLeague(Number(ligaId));
      fetchLigy(); // Refresh data
    } catch (err) {
      console.error('Chyba pri mazaní ligy:', err);
      setError('Chyba pri mazaní ligy');
    }
  };

  const handleBulkDeleteLigy = async (selectedIds: string[]) => {
    if (!window.confirm(`Naozaj chcete vymazať ${selectedIds.length} označených líg?`)) {
      return;
    }
    
    try {
      await Promise.all(selectedIds.map(id => ligaApi.deleteLeague(Number(id))));
      fetchLigy(); // Refresh data
    } catch (err) {
      console.error('Chyba pri bulk delete líg:', err);
      setError('Chyba pri mazaní líg');
    }
  };

  const handleBulkDuplicateLigy = (selectedIds: string[]) => {
    // TODO: Bulk duplicate - zatiaľ len console.log
    console.log('Bulk duplicate líg:', selectedIds);
  };

  // Handler pre uloženie ligy z modalu
  const handleSaveLiga = () => {
    setShowAddForm(false);
    setEditingLiga(null);
    fetchLigy(); // Refresh data
  };

  // Handler pre zatvorenie modalu
  const handleCloseModal = () => {
    setShowAddForm(false);
    setEditingLiga(null);
  };

  return (
    <div className="management-page">
      {/* Header */}
      <div className="management-header">
        <h1 className="management-title">
          Správa líg a súťaží
        </h1>
      </div>

      {/* ===== ŠTATISTICKÉ KARTY ===== */}
      <div className="management-stats">
        <StatCard
          title="Celkovo líg"
          value={stats.celkovo}
          icon={<span style={{ fontSize: '20px' }}>🏆</span>}
          variant="default"
        />
        
        <StatCard
          title="Aktívne ligy"
          value={stats.aktivne}
          icon={<span style={{ fontSize: '20px' }}>🟢</span>}
          variant="accent"
        />
        
        <StatCard
          title="Počet súťaží"
          value={stats.sutaze}
          icon={<span style={{ fontSize: '20px' }}>🥇</span>}
          variant="default"
        />
        
        <StatCard
          title="Počet pohárov"
          value={stats.pohary}
          icon={<span style={{ fontSize: '20px' }}>🏆</span>}
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

      {/* ===== TABUĽKA S LIGAMI ===== */}
      <div className="management-content">
        <Table
          columns={tableColumns}
          data={tableData}
          showCheckboxes={true}
          itemsPerPage={15}
          onAddTeam={handleAddLigaFromTable}
          onDeleteSelected={handleBulkDeleteLigy}
          onDuplicateSelected={handleBulkDuplicateLigy}
          onEditRow={handleEditLiga}
          onDeleteRow={handleDeleteLigaFromTable}
        />
      </div>

      {/* Modal pre pridanie/editáciu ligy */}
      {showAddForm && (
        <LigaFormModal
          liga={editingLiga}
          onClose={handleCloseModal}
          onSave={handleSaveLiga}
        />
      )}
    </div>
  );
};

export default LigaManagementAdmin;