// frontend/src/components/PageManagement.tsx
// Komponent pre správu stránok v štýle ArticleManagement s tabuľkou a štatistikami

import React, { useState, useEffect } from 'react';
import StatCard from './ui/cards/StatCard';
import Table from './ui/table/Table';
import { useRouter } from '../context/RouterContext';
import type { TableColumn, TableData, PaginationData } from './ui/table/Table';

// Import CSS štýlov
import '../styles/components/managementPages.css';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

// ===== INTERFACE DEFINITIONS =====
interface Page {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
  v_menu: boolean;
  poradie_menu: number;
  meta_title?: string;
  meta_description?: string;
  publikovany: boolean;
  vytvoreny: string;
  aktualizovany: string;
  // Helper fields z backendu
  url?: string;
  excerpt?: string;
  word_count?: number;
  is_published?: boolean;
  is_in_menu?: boolean;
}

interface PageStats {
  celkovo: number;
  publikovane: number;
  koncepty: number;
  v_menu: number;
  // Zmeny percentá
  celkovo_zmena?: string;
  celkovo_zmena_typ?: 'positive' | 'negative' | 'neutral';
  publikovane_zmena?: string;
  publikovane_zmena_typ?: 'positive' | 'negative' | 'neutral';
  koncepty_zmena?: string;
  koncepty_zmena_typ?: 'positive' | 'negative' | 'neutral';
  menu_zmena?: string;
  menu_zmena_typ?: 'positive' | 'negative' | 'neutral';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

interface PagesListResponse {
  pages: Page[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// ===== MAIN COMPONENT =====
const PageManagement: React.FC = () => {
  // ===== ROUTING =====
  const { navigate } = useRouter();

  // ===== STATE MANAGEMENT =====
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Štatistiky
  const [stats, setStats] = useState<PageStats>({
    celkovo: 0,
    publikovane: 0,
    koncepty: 0,
    v_menu: 0
  });

  // Paginácia - client-side ako v CategoryManagement
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // ===== DEFINÍCIE STĹPCOV PRE TABUĽKU =====
  const tableColumns: TableColumn[] = [
    { id: 'nazov', header: 'Názov', type: 'text', sortable: true, width: '40%' },
    { id: 'status', header: 'Status', type: 'status', sortable: true, width: '20%' },
    { id: 'vytvoreny', header: 'Dátum vytvorenia', type: 'date', sortable: true, width: '18%' },
    { id: 'v_menu', header: 'Menu', type: 'status', sortable: true, width: '10%' },
    { id: 'poradie_menu', header: '# v menu', type: 'text', sortable: true, width: '10%' },
    { id: 'actions', header: 'Akcie', type: 'actions', width: '5%' }
  ];

  // ===== TRANSFORMÁCIA DÁT PRE TABUĽKU =====
  const tableData: TableData[] = pages.map(page => ({
    id: page.id.toString(),
    nazov: page.nazov,
    slug: page.slug,
    status: page.publikovany ? 'Publikované' : 'Koncept',
    status_color: page.publikovany ? 'publikované' : 'koncept',
    v_menu: page.v_menu ? 'Áno' : 'Nie',
    v_menu_color: page.v_menu ? 'publikované' : 'koncept',
    poradie_menu: page.v_menu && page.poradie_menu ? page.poradie_menu.toString() : '-',
    vytvoreny: new Date(page.vytvoreny).toLocaleDateString('sk-SK'),
    aktualizovany: new Date(page.aktualizovany).toLocaleDateString('sk-SK')
  }));

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    console.log('🚀 PageManagement načítaný, načítavam stránky...');
    loadPages();
    loadStats();
  }, []);

  // ===== API FUNCTIONS =====
  
  // Helper funkcia pre auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('clubw_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // Načítanie všetkých stránok z API (client-side pagination ako CategoryManagement)
  const loadPages = async () => {
    try {
      setLoading(true);
      setError('');

      // API volanie na admin endpoint pre všetky stránky
      const response = await fetch(apiUrl('/admin/pages?limit=1000'), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data: ApiResponse<PagesListResponse> = await response.json();

      if (data.success) {
        setPages(data.data.pages);
        console.log(`✅ Načítaných ${data.data.pages.length} stránok`);
      } else {
        throw new Error(data.message || 'Nepodarilo sa načítať stránky');
      }

    } catch (err) {
      console.error('Chyba pri načítavaní stránok:', err);
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať stránky');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie štatistík z reálnych dát
  const loadStats = async () => {
    try {
      // Štatistiky sa počítajú z načítaných stránok
      const celkovo = pages.length;
      const publikovane = pages.filter(p => p.publikovany).length;
      const koncepty = pages.filter(p => !p.publikovany).length;
      const v_menu = pages.filter(p => p.v_menu).length;

      // Simulácia zmien (v reálnej aplikácii by sa porovnávalo s predchádzajúcim obdobím)
      const stats: PageStats = {
        celkovo,
        publikovane,
        koncepty,
        v_menu,
        celkovo_zmena: celkovo > 0 ? '+' + Math.floor(celkovo * 0.1).toString() : '0',
        celkovo_zmena_typ: celkovo > 0 ? 'positive' : 'neutral',
        publikovane_zmena: publikovane > 0 ? '+' + Math.floor(publikovane * 0.05).toString() : '0',
        publikovane_zmena_typ: publikovane > 0 ? 'positive' : 'neutral',
        koncepty_zmena: koncepty > 0 ? '-' + Math.floor(koncepty * 0.2).toString() : '0',
        koncepty_zmena_typ: koncepty > 0 ? 'negative' : 'neutral',
        menu_zmena: '0',
        menu_zmena_typ: 'neutral'
      };

      setStats(stats);
      console.log('✅ Štatistiky načítané:', stats);
    } catch (err) {
      console.error('Chyba pri načítavaní štatistík:', err);
    }
  };

  // Aktualizovanie štatistík vždy keď sa zmenia stránky
  useEffect(() => {
    loadStats();
  }, [pages]);

  // ===== EVENT HANDLERS =====

  // Pridanie novej stránky - OPRAVENÉ: pridaný úvodný lomítko
  const handleAddPage = () => {
    console.log('🎯 Navigácia na vytvorenie novej stránky');
    navigate('/pages/new'); // OPRAVA: pridaný úvodný lomítko
  };

  // Upravenie stránky - OPRAVENÉ: pridaný úvodný lomítko
  const handleEditPage = (id: string) => {
    console.log('✏️ Upravenie stránky s ID:', id);
    navigate(`/pages/edit/${id}`); // OPRAVA: pridaný úvodný lomítko
  };

  // Duplikovanie stránky
  const handleDuplicatePage = async (id: string) => {
    try {
      console.log('📋 Duplikovanie stránky s ID:', id);
      
      // Najdeme originálnu stránku
      const originalPage = pages.find(p => p.id.toString() === id);
      if (!originalPage) {
        throw new Error('Stránka nenájdená');
      }

      // Helper funkcia pre generovanie unikátneho názvu
      const generateUniqueName = (originalName: string): string => {
        let counter = 1;
        let duplicateName = `${originalName} (kópia)`;
        
        while (pages.some(p => p.nazov === duplicateName)) {
          counter++;
          duplicateName = `${originalName} (kópia ${counter})`;
        }
        
        return duplicateName;
      };

      const uniqueName = generateUniqueName(originalPage.nazov);
      
      const response = await fetch(apiUrl('/admin/pages'), {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          nazov: uniqueName,
          obsah: originalPage.obsah,
          v_menu: false, // Duplikáty nie sú v menu
          publikovany: false, // Duplikáty sú koncepty
          meta_title: originalPage.meta_title,
          meta_description: originalPage.meta_description
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Stránka duplikovaná');
        // Refresh zoznamu stránok
        await loadPages();
      } else {
        throw new Error(data.message || 'Chyba pri duplikovaní');
      }
    } catch (err) {
      console.error('Chyba pri duplikovaní stránky:', err);
      alert('Chyba pri duplikovaní stránky: ' + (err instanceof Error ? err.message : 'Neznáma chyba'));
    }
  };

  // Zmazanie stránky
  const handleDeletePage = async (id: string) => {
    if (!window.confirm('Naozaj chcete zmazať túto stránku?')) {
      return;
    }

    try {
      console.log('🗑️ Mazanie stránky s ID:', id);
      
      const response = await fetch(apiUrl(`/admin/pages/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Stránka zmazaná');
        // Refresh zoznamu stránok
        await loadPages();
      } else {
        throw new Error(data.message || 'Chyba pri mazaní');
      }
    } catch (err) {
      console.error('Chyba pri mazaní stránky:', err);
      alert('Chyba pri mazaní stránky: ' + (err instanceof Error ? err.message : 'Neznáma chyba'));
    }
  };

  // Hromadné mazanie stránok
  const handleBulkDeletePages = async (selectedIds: string[]) => {
    if (!window.confirm(`Naozaj chcete zmazať ${selectedIds.length} vybraných stránok?`)) {
      return;
    }

    try {
      console.log('🗑️ Hromadné mazanie stránok:', selectedIds);
      
      const response = await fetch(apiUrl('/admin/pages/bulk-delete'), {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ ids: selectedIds.map(id => parseInt(id)) })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Stránky zmazané');
        // Refresh zoznamu stránok
        await loadPages();
      } else {
        throw new Error(data.message || 'Chyba pri hromadnom mazaní');
      }
    } catch (err) {
      console.error('Chyba pri hromadnom mazaní stránok:', err);
      alert('Chyba pri hromadnom mazaní: ' + (err instanceof Error ? err.message : 'Neznáma chyba'));
    }
  };

  // Hromadné duplikovanie stránok
  const handleBulkDuplicatePages = async (selectedIds: string[]) => {
    try {
      console.log('📋 Hromadné duplikovanie stránok:', selectedIds);
      
      const response = await fetch(apiUrl('/admin/pages/bulk-duplicate'), {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ ids: selectedIds.map(id => parseInt(id)) })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ ${selectedIds.length} stránok duplikovaných`);
        // Refresh zoznamu stránok
        await loadPages();
      } else {
        throw new Error(data.message || 'Chyba pri hromadnom duplikovaní');
      }
    } catch (err) {
      console.error('Chyba pri hromadnom duplikovaní stránok:', err);
      alert('Chyba pri hromadnom duplikovaní: ' + (err instanceof Error ? err.message : 'Neznáma chyba'));
    }
  };

  // ===== IKONY =====
  const PageIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M14 2V7H19" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 13H16M8 17H16M8 9H12" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const PublishedIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const DraftIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M17 3C17.5523 3 18 3.44772 18 4V20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20V4C6 3.44772 6.44772 3 7 3H17Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M9 7H15M9 11H15M9 15H13" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const MenuIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="management-loading">
        📄 Načítavam stránky...
      </div>
    );
  }

  if (error) {
    return (
      <div className="management-error">
        ❌ Chyba: {error}
        <button 
          onClick={() => loadPages()} 
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Skúsiť znovu
        </button>
      </div>
    );
  }

  return (
    <div className="management-page">
      {/* ===== HEADER SEKCIA ===== */}
      <div className="management-header">
        <h1 className="management-title">
          Správa stránok
        </h1>
      </div>

      {/* ===== ŠTATISTIKY KARTY ===== */}
      <div className="management-stats">
        <StatCard
          title="Celkový počet stránok"
          value={stats.celkovo}
          change={stats.celkovo_zmena}
          changeType={stats.celkovo_zmena_typ}
          icon={<PageIcon />}
          variant="default"
        />
        
        <StatCard
          title="Publikované stránky"
          value={stats.publikovane}
          change={stats.publikovane_zmena}
          changeType={stats.publikovane_zmena_typ}
          icon={<PublishedIcon />}
          variant="accent"
        />
        
        <StatCard
          title="Koncepty"
          value={stats.koncepty}
          change={stats.koncepty_zmena}
          changeType={stats.koncepty_zmena_typ}
          icon={<DraftIcon />}
          variant="default"
        />
        
        <StatCard
          title="Stránky v menu"
          value={stats.v_menu}
          change={stats.menu_zmena}
          changeType={stats.menu_zmena_typ}
          icon={<MenuIcon />}
          variant="accent"
        />
      </div>

      {/* ===== TABUĽKA S STRÁNKAMI ===== */}
      <div className="management-content">
        {/* Tabuľka s client-side paginináciou ako CategoryManagement */}
        <Table
          columns={tableColumns}
          data={tableData}
          showCheckboxes={true}
          itemsPerPage={itemsPerPage}
          onAddPage={handleAddPage} // OPRAVENÉ: predávame funkciu s opravenou navigáciou
          onDeleteSelected={handleBulkDeletePages}  
          onEditRow={handleEditPage}        
          onDeleteRow={handleDeletePage}   
          onDuplicateRow={handleDuplicatePage}
          onSearchChange={(term) => setSearchTerm(term)}
          searchTerm={searchTerm}
          onDuplicateSelected={handleBulkDuplicatePages}
          serverSidePagination={false}
        />
      </div>
    </div>
  );
};

export default PageManagement;