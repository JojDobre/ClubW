// frontend/src/components/GalleryManagement.tsx
// Komponent pre správu fotogalérií s grid zobrazením a štatistikami - AKTUALIZOVANÝ

import React, { useState, useEffect } from 'react';
import StatCard from './ui/cards/StatCard';
import GalleryTable from './ui/table/GalleryTable';
import GalleryCreateModal from './ui/table/GalleryCreateModal';
import GalleryEditModal from './ui/table/GalleryEditModal';


// Import CSS štýlov
import '../styles/components/managementPages.css';
import '../styles/components/ui/table/galleryTable.css';
import '../styles/components/ui/table/GalleryModal.css';
import '../styles/components/ui/table/GalleryEditModal.css';


// ===== INTERFACE DEFINITIONS =====
interface Gallery {
  id: number;
  nazov: string;
  popis?: string | null;
  slug: string;
  tim_id?: number | null;
  clanok_id?: number | null;
  zapas_id?: number | null;
  pocet_obrazkov: number;
  nahladovy_obrazok?: string | null;
  typ_priradenia: 'tim' | 'clanok' | 'zapas' | 'volna';
  aktivity: boolean;
  vytvoreny: string;
  aktualizovany: string;
}

interface GalleryStats {
  celkovo_zobrazeni: number;
  zobrazenia_tyzden: number;
  zobrazenia_mesiac: number;
}

interface GalleryWithStats extends Gallery {
  stats?: GalleryStats;
}

interface GalleryManagementStats {
  celkovo: number;
  celkovo_fotiek: number;
  zobrazenia_tyzden: number;
  zobrazenia_mesiac: number;
  // Zmeny percentá
  celkovo_zmena?: string;
  celkovo_zmena_typ?: 'positive' | 'negative' | 'neutral';
  fotiek_zmena?: string;
  fotiek_zmena_typ?: 'positive' | 'negative' | 'neutral';
  tyzden_zmena?: string;
  tyzden_zmena_typ?: 'positive' | 'negative' | 'neutral';
  mesiac_zmena?: string;
  mesiac_zmena_typ?: 'positive' | 'negative' | 'neutral';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ===== MAIN COMPONENT =====
const GalleryManagement: React.FC = () => {
  // ===== STATE MANAGEMENT =====
  const [galleries, setGalleries] = useState<GalleryWithStats[]>([]);
  const [stats, setStats] = useState<GalleryManagementStats>({
    celkovo: 0,
    celkovo_fotiek: 0,
    zobrazenia_tyzden: 0,
    zobrazenia_mesiac: 0
  });

  // UI stavy
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGalleries, setSelectedGalleries] = useState<string[]>([]);
  
  // Modal stavy
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Pagination
  const [paginationData, setPaginationData] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Akčné stavy
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    console.log('🖼️ GalleryManagement načítaný, načítavam galérie...');
    loadGalleries();
    loadStats();
  }, [paginationData.page, searchTerm]);

  // ===== API FUNCTIONS =====
  
  // Načítanie galérií
  const loadGalleries = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: paginationData.page.toString(),
        limit: paginationData.limit.toString(),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`http://localhost:3000/api/admin/galleries?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Neautorizovaný prístup. Prihláste sa znovu.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<{
        galerie: Gallery[];
        pagination: PaginationData;
      }> = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Chyba pri načítaní galérií');
      }

      // Simulácia štatistík pre každú galériu (v reále by to prišlo z API)
      const galleriesWithStats: GalleryWithStats[] = result.data.galerie.map(gallery => ({
        ...gallery,
        stats: {
          celkovo_zobrazeni: Math.floor(Math.random() * 15000) + 500,
          zobrazenia_tyzden: Math.floor(Math.random() * 3000) + 100,
          zobrazenia_mesiac: Math.floor(Math.random() * 8000) + 300
        }
      }));

      setGalleries(galleriesWithStats);
      setPaginationData(result.data.pagination);

      console.log(`✅ Načítaných ${galleriesWithStats.length} galérií`);

    } catch (error: any) {
      console.error('❌ Chyba pri načítaní galérií:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Načítanie štatistík
  const loadStats = async () => {
    try {
      // TODO: Implementovať real API endpoint pre štatistiky
      // Zatiaľ simulácia
      const mockStats: GalleryManagementStats = {
        celkovo: galleries.length,
        celkovo_fotiek: galleries.reduce((sum, g) => sum + g.pocet_obrazkov, 0),
        zobrazenia_tyzden: galleries.reduce((sum, g) => sum + (g.stats?.zobrazenia_tyzden || 0), 0),
        zobrazenia_mesiac: galleries.reduce((sum, g) => sum + (g.stats?.zobrazenia_mesiac || 0), 0),
        celkovo_zmena: '+12%',
        celkovo_zmena_typ: 'positive',
        fotiek_zmena: '+8%',
        fotiek_zmena_typ: 'positive',
        tyzden_zmena: '+15%',
        tyzden_zmena_typ: 'positive',
        mesiac_zmena: '+6%',
        mesiac_zmena_typ: 'positive'
      };

      setStats(mockStats);

    } catch (error: any) {
      console.error('❌ Chyba pri načítaní štatistík:', error);
    }
  };

  // ===== EVENT HANDLERS =====
  
  const handleAddGallery = () => {
    console.log('🖼️ Otváram modal pre pridávanie novej galérie...');
    setIsCreateModalOpen(true);
  };

  const handleGalleryCreated = async () => {
    console.log('✅ Galéria úspešne vytvorená, obnovujem zoznam...');
    await loadGalleries();
    await loadStats();
    setSelectedGalleries([]); // Reset výberu
  };

  const handleEditGallery = (galleryId: string) => {
    console.log('✏️ Editovanie galérie ID:', galleryId);
    // TODO: Navigácia na edit stránku galérie alebo otvorenie edit modálu
    alert(`Editovanie galérie ID: ${galleryId} - tu bude modal alebo navigácia`);
  };

  const handleDeleteGallery = async (galleryId: string) => {
    const gallery = galleries.find(g => g.id.toString() === galleryId);
    if (!gallery) return;

    if (!window.confirm(`Naozaj chcete vymazať galériu "${gallery.nazov}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch(`http://localhost:3000/api/admin/galleries/${galleryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<any> = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Chyba pri vymazávaní galérie');
      }

      // Obnoviť zoznam galérií
      await loadGalleries();
      await loadStats();

      console.log(`✅ Galéria "${gallery.nazov}" úspešne vymazaná`);

    } catch (error: any) {
      console.error('❌ Chyba pri vymazávaní galérie:', error);
      alert(`Chyba pri vymazávaní galérie: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;

    const confirmMessage = `Naozaj chcete vymazať ${selectedIds.length} ${
      selectedIds.length === 1 ? 'galériu' : 'galérií'
    }?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setIsDeleting(true);

      // Vymazanie každej galérie postupne
      for (const id of selectedIds) {
        const response = await fetch(`http://localhost:3000/api/admin/galleries/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('clubw_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Chyba pri vymazávaní galérie ID ${id}`);
        }
      }

      // Obnoviť zoznam galérií
      await loadGalleries();
      await loadStats();
      setSelectedGalleries([]);

      console.log(`✅ Úspešne vymazaných ${selectedIds.length} galérií`);

    } catch (error: any) {
      console.error('❌ Chyba pri vymazávaní galérií:', error);
      alert(`Chyba pri vymazávaní galérií: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateSelected = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;

    try {
      setIsDuplicating(true);

      // TODO: Implementovať duplikovanie galérií
      console.log('📋 Duplikovanie galérií:', selectedIds);
      
      // Simulácia API volania
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert(`Duplikovaných ${selectedIds.length} galérií (simulácia)`);
      setSelectedGalleries([]);

    } catch (error: any) {
      console.error('❌ Chyba pri duplikovaní galérií:', error);
      alert(`Chyba pri duplikovaní galérií: ${error.message}`);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleGallerySelect = (galleryId: string, selected: boolean) => {
    if (selected) {
      setSelectedGalleries(prev => [...prev, galleryId]);
    } else {
      setSelectedGalleries(prev => prev.filter(id => id !== galleryId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedGalleries(galleries.map(g => g.id.toString()));
    } else {
      setSelectedGalleries([]);
    }
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setPaginationData(prev => ({ ...prev, page: 1 })); // Reset na prvú stránku
  };

  const handlePageChange = (page: number) => {
    setPaginationData(prev => ({ ...prev, page }));
  };

  // ===== ICON COMPONENTS =====
  const GalleryIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 15L8 11L12 15L16 11L20 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const PhotoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M14.5 8.5C14.5 9.32843 13.8284 10 13 10C12.1716 10 11.5 9.32843 11.5 8.5C11.5 7.67157 12.1716 7 13 7C13.8284 7 14.5 7.67157 14.5 8.5Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 12.5001L3.75159 10.9675C4.66286 10.1702 6.03628 10.2159 6.89249 11.0721L11.1822 15.3618C11.8694 16.0491 12.9512 16.1428 13.7464 15.5839L14.0446 15.3744C15.1888 14.5702 16.7369 14.6634 17.7765 15.599L21 18.5001" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const EyeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 19C16 19 20 12 20 12C20 12 16 5 12 5C8 5 4 12 4 12C4 12 8 19 12 19Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );

  const TrendIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 7H21V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // ===== RENDER =====
  if (loading && galleries.length === 0) {
    return (
      <div className="management-loading">
        🖼️ Načítavam galérie...
      </div>
    );
  }

  return (
    <div className="management-page">
      {/* ===== HEADER SEKCIA ===== */}
      <div className="management-header">
        <h1 className="management-title">
          Správa fotogalérií
        </h1>
      </div>

      {/* ===== ŠTATISTIKY KARTY ===== */}
      <div className="management-stats">
        <StatCard
          title="Celkovo galérií"
          value={stats.celkovo}
          change={stats.celkovo_zmena}
          changeType={stats.celkovo_zmena_typ}
          icon={<GalleryIcon />}
          variant="default"
        />
        
        <StatCard
          title="Celkovo fotiek"
          value={stats.celkovo_fotiek.toLocaleString()}
          change={stats.fotiek_zmena}
          changeType={stats.fotiek_zmena_typ}
          icon={<PhotoIcon />}
          variant="accent"
        />
        
        <StatCard
          title="Zobrazenia (týždeň)"
          value={stats.zobrazenia_tyzden.toLocaleString()}
          change={stats.tyzden_zmena}
          changeType={stats.tyzden_zmena_typ}
          icon={<EyeIcon />}
          variant="default"
        />
        
        <StatCard
          title="Zobrazenia (mesiac)"
          value={stats.zobrazenia_mesiac.toLocaleString()}
          change={stats.mesiac_zmena}
          changeType={stats.mesiac_zmena_typ}
          icon={<TrendIcon />}
          variant="accent"
        />
      </div>

      {/* ===== GALLERY TABLE ===== */}
      <div className="management-content">
        <GalleryTable
          galleries={galleries}
          loading={loading}
          error={error}
          selectedGalleries={selectedGalleries}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onAddGallery={handleAddGallery}
          onEditGallery={handleEditGallery}
          onDeleteGallery={handleDeleteGallery}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateSelected={handleDuplicateSelected}
          onGallerySelect={handleGallerySelect}
          onSelectAll={handleSelectAll}
        />
      </div>

      {/* ===== CREATE GALLERY MODAL ===== */}
      <GalleryCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGalleryCreated={handleGalleryCreated}
      />
    </div>
  );
};

export default GalleryManagement;