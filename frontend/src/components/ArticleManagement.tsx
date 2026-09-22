// frontend/src/components/ArticleManagement.tsx
// Komponenta pre správu článkov s pokročilými filtrami

import React, { useState, useEffect } from 'react';
import StatCard from './ui/cards/StatCard';
import Table from './ui/table/Table';
import { useRouter } from '../context/RouterContext';
import type { TableColumn, TableData, PaginationData } from './ui/table/Table';
import type { AdvancedFilters } from './ui/table/FilterPopup';

// Import CSS štýlov
import '../styles/components/managementPages.css';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

// ===== INTERFACE DEFINITIONS =====
interface Article {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
  excerpt?: string;
  obrazok?: string;
  autor_id: number;
  kategoria_id: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publikovany_datum?: string;
  views: number;
  meta_title?: string;
  meta_description?: string;
  tags: string[];
  featured: boolean;
  komentare_povolene: boolean;
  vytvoreny: string;
  aktualizovany: string;
  autor: {
    id: number;
    meno: string;
    email: string;
  };
  kategoria: {
    id: number;
    nazov: string;
    slug: string;
    farba?: string;
    ikona?: string;
  };
}

interface Category {
  id: number;
  nazov: string;
  slug: string;
  farba?: string;
  ikona?: string;
  poradie?: number;
  aktivity?: boolean;
}

interface User {
  id: number;
  meno: string;
  email: string;
  rola: string;
}

interface ArticleManagementProps {
  currentUser: User;
}

interface ArticleStats {
  celkovo: number;
  publikovane_30dni: number;
  koncepty: number;
  zobrazenia_30dni: number;
  celkovo_zmena?: string;
  celkovo_zmena_typ?: 'positive' | 'negative' | 'neutral';
  publikovane_zmena?: string;
  publikovane_zmena_typ?: 'positive' | 'negative' | 'neutral';
  koncepty_zmena?: string;
  koncepty_zmena_typ?: 'positive' | 'negative' | 'neutral';
  zobrazenia_zmena?: string;
  zobrazenia_zmena_typ?: 'positive' | 'negative' | 'neutral';
}

// ===== MAIN COMPONENT =====
const ArticleManagement: React.FC<ArticleManagementProps> = ({ currentUser }) => {
  // Router hook pre navigáciu
  const { navigate } = useRouter();

  // ===== STATE MANAGEMENT =====
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Základné filtre
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Advanced filtre state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    columnVisibility: [],
    statusFilters: [],
    categoryFilters: [],
    dateRangeFilter: null,
    userFilters: []
  });

  // Paginácia
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [paginationData, setPaginationData] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // Štatistiky
  const [stats, setStats] = useState<ArticleStats>({
    celkovo: 0,
    publikovane_30dni: 0,
    koncepty: 0,
    zobrazenia_30dni: 0
  });

  // ===== HELPER FUNCTIONS =====
  const getStatusDisplay = (status: string) => {
    const statusMap = {
      published: 'Publikované',
      draft: 'Koncept',
      scheduled: 'Naplánované',
      archived: 'Archivované'
    };
    return statusMap[status as keyof typeof statusMap] || 'Neznámy';
  };

  const getStatusForFilter = (status: string) => {
    // Vracia originálny status pre filtrovanie
    return status;
  };

  // ===== API FUNCTIONS =====
  
  // Načítanie článkov z API s advanced filtrami
  const fetchArticles = async (page: number = 1, filters?: AdvancedFilters) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('clubw_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });

      // Základné filtre
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);

      // Advanced filtre pre server-side filtrovanie
      if (filters) {
        // Status filtre
        const enabledStatusFilters = filters.statusFilters.filter(f => f.enabled);
        if (enabledStatusFilters.length > 0) {
          enabledStatusFilters.forEach(filter => {
            // Mapovanie slovenských názvov na anglické status hodnoty
            const statusMap: { [key: string]: string } = {
              'Publikované': 'published',
              'Koncept': 'draft',
              'Naplánované': 'scheduled',
              'Archivované': 'archived'
            };
            const englishStatus = statusMap[filter.value] || filter.value;
            params.append('status_filter[]', englishStatus);
          });
        }

        // Category filtre
        const enabledCategoryFilters = filters.categoryFilters.filter(f => f.enabled);
        if (enabledCategoryFilters.length > 0) {
          enabledCategoryFilters.forEach(filter => {
            params.append('category_filter[]', filter.categoryId);
          });
        }

        // Date range filter
        if (filters.dateRangeFilter?.enabled) {
          if (filters.dateRangeFilter.startDate) {
            params.append('date_from', filters.dateRangeFilter.startDate);
          }
          if (filters.dateRangeFilter.endDate) {
            params.append('date_to', filters.dateRangeFilter.endDate);
          }
          if (filters.dateRangeFilter.column) {
            params.append('date_column', filters.dateRangeFilter.column);
          }
        }

        // User filtre
        const enabledUserFilters = filters.userFilters.filter(f => f.enabled);
        if (enabledUserFilters.length > 0) {
          enabledUserFilters.forEach(filter => {
            params.append('author_filter[]', filter.userId);
          });
        }
      }

      const response = await fetch(apiUrl(`/admin/articles?${params.toString()}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setArticles(data.data);

        // Ak je dostupná paginácia, nastavíme ju
        if (data.pagination) {
          const pagination = data.pagination;
          setCurrentPage(pagination.current_page);
          setTotalPages(pagination.pages);
          setTotalArticles(pagination.total);

          // Nastavenie dát pre Table komponent
          setPaginationData({
            currentPage: pagination.current_page,
            totalPages: pagination.pages,
            totalItems: pagination.total,
            hasNextPage: pagination.has_next,
            hasPrevPage: pagination.has_prev
          });
        }
        setError('');
      } else {
        setError(data.message || 'Chyba pri načítavaní článkov');
      }
    } catch (err) {
      console.error('Chyba pri načítavaní článkov:', err);
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie kategórií z API
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(apiUrl('/admin/categories'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        console.error('Chyba pri načítavaní kategórií:', data.message);
      }
    } catch (err) {
      console.error('Chyba pri načítavaní kategórií:', err);
    }
  };

  // Načítanie štatistík z API
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(apiUrl('/admin/articles?limit=1000'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        const allArticles = data.data;
        
        // Aktuálne dátumy
        const teraz = new Date();
        const pred30Dni = new Date();
        pred30Dni.setDate(pred30Dni.getDate() - 30);
        const pred60Dni = new Date();
        pred60Dni.setDate(pred60Dni.getDate() - 60);

        // === AKTUÁLNE HODNOTY ===
        const celkovo = allArticles.length;
        
        const publikovane_30dni = allArticles.filter((article: Article) => {
          if (article.status !== 'published') return false;
          const publikovanyDatum = new Date(article.publikovany_datum || article.vytvoreny);
          return publikovanyDatum >= pred30Dni;
        }).length;
        
        const koncepty = allArticles.filter((article: Article) => article.status === 'draft').length;
        
        const zobrazenia_30dni = allArticles
          .filter((article: Article) => {
            const publikovanyDatum = new Date(article.publikovany_datum || article.vytvoreny);
            return publikovanyDatum >= pred30Dni;
          })
          .reduce((sum: number, article: Article) => sum + (article.views || 0), 0);

        // === PREDCHÁDZAJÚCE HODNOTY ===
        const publikovane_predchadzajuce = allArticles.filter((article: Article) => {
          if (article.status !== 'published') return false;
          const publikovanyDatum = new Date(article.publikovany_datum || article.vytvoreny);
          return publikovanyDatum >= pred60Dni && publikovanyDatum < pred30Dni;
        }).length;

        const zobrazenia_predchadzajuce = allArticles
          .filter((article: Article) => {
            const publikovanyDatum = new Date(article.publikovany_datum || article.vytvoreny);
            return publikovanyDatum >= pred60Dni && publikovanyDatum < pred30Dni;
          })
          .reduce((sum: number, article: Article) => sum + (article.views || 0), 0);

        const koncepty_predchadzajuce = allArticles.filter((article: Article) => {
          const vytvoreny = new Date(article.vytvoreny);
          return article.status === 'draft' && vytvoreny >= pred60Dni && vytvoreny < pred30Dni;
        }).length;

        // === VÝPOČET ZMIEN ===
        const vypocitajZmenu = (aktualne: number, predchadzajuce: number) => {
          if (predchadzajuce === 0) {
            return aktualne > 0 ? { text: `+${aktualne}`, typ: 'positive' as const } : { text: '0', typ: 'neutral' as const };
          }
          const zmena = ((aktualne - predchadzajuce) / predchadzajuce) * 100;
          const zaokruhlenaZmena = Math.round(zmena * 10) / 10;
          
          if (zaokruhlenaZmena > 0) {
            return { text: `+${zaokruhlenaZmena}%`, typ: 'positive' as const };
          } else if (zaokruhlenaZmena < 0) {
            return { text: `${zaokruhlenaZmena}%`, typ: 'negative' as const };
          } else {
            return { text: '0%', typ: 'neutral' as const };
          }
        };

        const vypocitajAbsolutnaZmenu = (aktualne: number, predchadzajuce: number) => {
          const rozdiel = aktualne - predchadzajuce;
          if (rozdiel > 0) {
            return { text: `+${rozdiel} tento mesiac`, typ: 'positive' as const };
          } else if (rozdiel < 0) {
            return { text: `${rozdiel} tento mesiac`, typ: 'negative' as const };
          } else {
            return { text: 'Bez zmeny', typ: 'neutral' as const };
          }
        };

        // Výpočet zmien
        const publikovaneZmena = vypocitajAbsolutnaZmenu(publikovane_30dni, publikovane_predchadzajuce);
        const konceptyZmena = vypocitajAbsolutnaZmenu(koncepty, koncepty_predchadzajuce);
        const zobrazeniZmena = vypocitajZmenu(zobrazenia_30dni, zobrazenia_predchadzajuce);
        
        const celkovo_minuly_mesiac = allArticles.filter((article: Article) => {
          const vytvoreny = new Date(article.vytvoreny);
          return vytvoreny < pred30Dni;
        }).length;
        const celkovoZmena = vypocitajAbsolutnaZmenu(celkovo, celkovo_minuly_mesiac);

        setStats({
          celkovo,
          publikovane_30dni,
          koncepty,
          zobrazenia_30dni,
          celkovo_zmena: celkovoZmena.text,
          celkovo_zmena_typ: celkovoZmena.typ,
          publikovane_zmena: publikovaneZmena.text,
          publikovane_zmena_typ: publikovaneZmena.typ,
          koncepty_zmena: konceptyZmena.text,
          koncepty_zmena_typ: konceptyZmena.typ,
          zobrazenia_zmena: zobrazeniZmena.text,
          zobrazenia_zmena_typ: zobrazeniZmena.typ,
        });
      }
    } catch (err) {
      console.error('Chyba pri načítavaní štatistík:', err);
      setStats({
        celkovo: 0,
        publikovane_30dni: 0,
        koncepty: 0,
        zobrazenia_30dni: 0
      });
    }
  };

  // ===== TABLE CONFIGURATION =====
  const tableColumns: TableColumn[] = [
    {
      id: 'nazov',
      header: 'Název článku',
      type: 'text',
      sortable: true,
      width: '35%'
    },
    {
      id: 'status',
      header: 'Status',
      type: 'status',
      sortable: true,
      width: '12%'
    },
    {
      id: 'rubrika',
      header: 'Rubrika',
      type: 'text',
      sortable: true,
      width: '12%'
    },
    {
      id: 'datum',
      header: 'Dátum',
      type: 'date',
      sortable: true,
      width: '12%'
    },
    {
      id: 'publikovany_datum',
      header: 'Publikovany',
      type: 'date',
      sortable: true,
      width: '12%'
    },
    {
      id: 'autor',
      header: 'Autor',
      type: 'user',
      sortable: true,
      width: '13%'
    },
    {
      id: 'views',
      header: '👁',
      type: 'text',
      sortable: true,
      width: '5%'
    },
    {
      id: 'actions',
      header: 'Akcie',
      type: 'actions',
      sortable: false,
      width: '6%'
    }
  ];

  // Transformácia článkov pre tabuľku s podporou advanced filtrov
  const tableData: TableData[] = articles.map(article => ({
    id: article.id.toString(),
    nazov: article.nazov,
    views: article.views.toLocaleString(),
    status: getStatusDisplay(article.status),
    rubrika: article.kategoria.nazov || 'Bez kategórie',
    datum: new Date(article.vytvoreny).toLocaleDateString('sk-SK'),
    publikovany_datum: article.publikovany_datum 
      ? new Date(article.publikovany_datum).toLocaleDateString('sk-SK')
      : 'Nepublikované',
    autor: {
      id: article.autor_id,
      name: article.autor.meno,
      avatar: `/api/users/${article.autor_id}/avatar`
    },
    
    // Štruktúrované dáta pre advanced filtre
    kategoria: {
      id: article.kategoria_id.toString(),
      nazov: article.kategoria.nazov
    },
    autor_obj: {
      id: article.autor_id.toString(),
      meno: article.autor.meno,
      name: article.autor.meno
    },
    
    // ISO formátované dátumy pre date filter
    vytvoreny: article.vytvoreny,
    publikovany_datum_iso: article.publikovany_datum || article.vytvoreny,
    
    // Originálny status pre filtrovanie
    status_original: article.status
  }));

  // ===== EVENT HANDLERS =====
  
  // Handler pre zmenu stránky
  const handlePageChange = (page: number) => {
    console.log('Zmena stránky na:', page);
    fetchArticles(page, advancedFilters);
  };

  // Handler pre advanced filtre
  const handleAdvancedFiltersChange = (filters: AdvancedFilters) => {
    console.log('Advanced filters applied:', filters);
    setAdvancedFilters(filters);
  };

  // Článok handlers
  const handleAddArticle = () => {
    navigate('/article/new');
  };

  const handleEditArticle = (articleId: string) => {
    console.log('Editovanie článku ID:', articleId);
    navigate(`/articles/edit/${articleId}`);
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (window.confirm('Naozaj chcete vymazať tento článok?')) {
      try {
        await handleBulkDeleteArticles([articleId]);
        console.log('Článok úspešne vymazaný');
      } catch (error) {
        console.error('Chyba pri mazaní článku:', error);
        alert('Chyba pri mazaní článku');
      }
    }
  };

  const handleDuplicateArticle = async (articleId: string) => {
    try {
      await handleBulkDuplicateArticles([articleId]);
      console.log('Článok úspešne duplikovaný');
    } catch (error) {
      console.error('Chyba pri duplikovaní článku:', error);
      alert('Chyba pri duplikovaní článku');
    }
  };

  // Bulk operations
  const handleBulkDeleteArticles = async (selectedIds: string[]) => {
    try {
      const token = localStorage.getItem('clubw_token');
      
      const response = await fetch(apiUrl('/admin/articles/bulk-delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri mazaní článkov');
      }

      // Aktualizácia lokálnych dát
      setArticles(prevArticles => 
        prevArticles.filter(article => !selectedIds.includes(article.id.toString()))
      );

      // Aktualizácia štatistík
      await fetchStats();

      // Ak sa vymazali všetky články na aktuálnej stránke, prejdi na predchádzajúcu
      const remainingArticles = articles.filter(article => !selectedIds.includes(article.id.toString()));
      if (remainingArticles.length === 0 && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else {
        await fetchArticles(currentPage, advancedFilters);
      }

      console.log(`✅ ${data.message}`);
      return data;
      
    } catch (error) {
      console.error('❌ Chyba pri bulk delete článkov:', error);
      throw error;
    }
  };

  const handleBulkDuplicateArticles = async (selectedIds: string[]) => {
    try {
      const token = localStorage.getItem('clubw_token');
      
      const response = await fetch(apiUrl('/admin/articles/bulk-duplicate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri duplikovaní článkov');
      }

      console.log(`✅ ${data.message}`);
      
      // Refresh dát
      await fetchArticles(currentPage, advancedFilters);
      await fetchStats();
      
      return data;
      
    } catch (error) {
      console.error('❌ Chyba pri bulk duplicate článkov:', error);
      throw error;
    }
  };

  // ===== USE EFFECTS =====
  
  // Debouncing pre search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Načítanie dát pri spustení komponentu
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      // Načítanie kategórií najprv
      await fetchCategories();
      
      // Potom načítanie článkov a štatistík
      await Promise.all([
        fetchArticles(currentPage),
        fetchStats()
      ]);
      
      setLoading(false);
    };
    
    initializeData();
  }, []);

  // Načítanie článkov pri zmene debounced search term
  useEffect(() => {
    if (categories.length > 0 && (debouncedSearchTerm.length === 0 || debouncedSearchTerm.length > 2)) {
      // ✅ OPRAVA: Vždy posielaj aktuálne advanced filtre
      fetchArticles(currentPage, advancedFilters);
    }
  }, [currentPage, debouncedSearchTerm, filterStatus, filterCategory, advancedFilters]);

  // ===== ICONS =====
  const ArticleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V8L14 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M14 2V8H19" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const EyeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );

  const DraftIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M17 3C17.5523 3 18 3.44772 18 4V20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20V4C6 3.44772 6.44772 3 7 3H17Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M9 7H15M9 11H15M9 15H13" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="management-loading">
        📰 Načítavam články...
      </div>
    );
  }

  if (error) {
    return (
      <div className="management-error">
        ❌ Chyba: {error}
      </div>
    );
  }

  return (
    <div className="management-page">
      {/* ===== HEADER SEKCIA ===== */}
      <div className="management-header">
        <h1 className="management-title">
          Prehľad článkov
        </h1>
      </div>

      {/* ===== ŠTATISTIKY KARTY ===== */}
      <div className="management-stats">
        <StatCard
          title="Celkovo článkov"
          value={stats.celkovo}
          change={stats.celkovo_zmena}
          changeType={stats.celkovo_zmena_typ}
          icon={<ArticleIcon />}
          variant="default"
        />
        
        <StatCard
          title="Publikované (30 dní)"
          value={stats.publikovane_30dni}
          change={stats.publikovane_zmena}
          changeType={stats.publikovane_zmena_typ}
          icon={<EyeIcon />}
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
          title="Zobrazenia (30 dní)"
          value={stats.zobrazenia_30dni.toLocaleString()}
          change={stats.zobrazenia_zmena}
          changeType={stats.zobrazenia_zmena_typ}
          icon={<EyeIcon />}
          variant="accent"
        />
      </div>

      {/* ===== TABUĽKA S ČLÁNKAMI ===== */}
      <div className="management-content">
        <Table
          columns={tableColumns}
          data={tableData}
          showCheckboxes={true}
          itemsPerPage={15}
          onAddArticle={handleAddArticle}
          onDeleteSelected={handleBulkDeleteArticles}  
          onEditRow={handleEditArticle}        
          onDeleteRow={handleDeleteArticle}   
          onDuplicateRow={handleDuplicateArticle}
          onSearchChange={(term) => setSearchTerm(term)}
          searchTerm={searchTerm}
          onDuplicateSelected={handleBulkDuplicateArticles}
          serverSidePagination={true}
          paginationData={paginationData}
          onPageChange={handlePageChange}
          
          // Advanced filters
          enableAdvancedFilters={true}
          onFiltersChange={handleAdvancedFiltersChange}
          filterCustomLabels={{
            categories: 'Rubrika',
            users: 'Autori',
            dates: 'Dátumy',
            status: 'Status'
          }}
        />
      </div>
    </div>
  );
};

export default ArticleManagement;