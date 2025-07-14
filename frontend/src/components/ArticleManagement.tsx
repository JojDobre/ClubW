// frontend/src/components/ArticleManagement.tsx

import React, { useState, useEffect } from 'react';
import StatCard from './ui/cards/StatCard';
import Table from './ui/table/Table';
import { useRouter } from '../context/RouterContext'; // PRIDANÉ
import type { TableColumn, TableData, PaginationData } from './ui/table/Table';

// Import CSS štýlov
import '../styles/components/managementPages.css';

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
  //Router hook pre navigáciu
  const { navigate } = useRouter();

  const [paginationData, setPaginationData] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // ===== STATE MANAGEMENT =====
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Filtre
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Paginácia
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  
  // Štatistiky
  const [stats, setStats] = useState<ArticleStats>({
    celkovo: 0,
    publikovane_30dni: 0,
    koncepty: 0,
    zobrazenia_30dni: 0
  });
  

  //SEARCH
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');


  // ===== FUNKCIE PRE API =====
  
  // Načítanie článkov z API
  const fetchArticles = async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('clubw_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });

      // Pridanie filtrov ak sú nastavené
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm); // Zmeň searchTerm na debouncedSearchTerm
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);

      const response = await fetch(`http://localhost:3000/api/admin/articles?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setArticles(data.data.articles);
        // Ak je dostupná paginácia, nastavíme ju
        if (data.data.pagination) {
          const pagination = data.data.pagination;
          setCurrentPage(pagination.currentPage);
          setTotalPages(pagination.totalPages);
          setTotalArticles(pagination.totalArticles);
          
          // Nastavenie dát pre Table komponent
          setPaginationData({
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            totalItems: pagination.totalArticles,
            hasNextPage: pagination.hasNextPage,
            hasPrevPage: pagination.hasPrevPage
          });
        }
        setError('');
      } else {
        setError(data.message || 'Chyba pri načítavaní článkov');
      }
    } catch (err) {
      console.error('Chyba pri načítavaní článkov:', err);
      setError('Chyba spojenia so serverom');
      // Fallback na mock dáta v prípade chyby
    } finally {
      setLoading(false);
    }
  };

  // Načítanie kategórií z API
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch('http://localhost:3000/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCategories(data.data.categories);
      } else {
        console.error('Chyba pri načítavaní kategórií:', data.message);
        // Fallback na mock kategórie
      }
    } catch (err) {
      console.error('Chyba pri načítavaní kategórií:', err);
      // Fallback na mock kategórie
    }
  };

  // Načítanie štatistík z API
  const fetchStats = async () => {
  try {
    const token = localStorage.getItem('clubw_token');
    // Načítame všetky články bez limitu pre presné štatistiky
    const response = await fetch('http://localhost:3000/api/admin/articles?limit=1000', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (data.success) {
      const allArticles = data.data.articles;
      
      // Aktuálne dátumy
      const teraz = new Date();
      const pred30Dni = new Date();
      pred30Dni.setDate(pred30Dni.getDate() - 30);
      const pred60Dni = new Date();
      pred60Dni.setDate(pred60Dni.getDate() - 60);
      const predchaddzujuciMesiac = new Date();
      predchaddzujuciMesiac.setDate(predchaddzujuciMesiac.getDate() - 60);

      // === AKTUÁLNE HODNOTY (posledných 30 dní) ===
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

      // === PREDCHÁDZAJÚCE HODNOTY (30-60 dní dozadu) ===
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

      // Koncepy pred mesiacom (pre porovnanie trendu)
      const koncepty_predchadzajuce = allArticles.filter((article: Article) => {
        const vytvoreny = new Date(article.vytvoreny);
        return article.status === 'draft' && vytvoreny >= pred60Dni && vytvoreny < pred30Dni;
      }).length;

      // === VÝPOČET ZMIEN ===
      
      // Funkcia na výpočet percentuálnej zmeny
      const vypocitajZmenu = (aktualne: number, predchadzajuce: number) => {
        if (predchadzajuce === 0) {
          return aktualne > 0 ? { text: `+${aktualne}`, typ: 'positive' as const } : { text: '0', typ: 'neutral' as const };
        }
        const zmena = ((aktualne - predchadzajuce) / predchadzajuce) * 100;
        const zaokruhlenaZmena = Math.round(zmena * 10) / 10; // Zaokrúhlenie na 1 desatinné miesto
        
        if (zaokruhlenaZmena > 0) {
          return { text: `+${zaokruhlenaZmena}%`, typ: 'positive' as const };
        } else if (zaokruhlenaZmena < 0) {
          return { text: `${zaokruhlenaZmena}%`, typ: 'negative' as const };
        } else {
          return { text: '0%', typ: 'neutral' as const };
        }
      };

      // Funkcia na výpočet absolútnej zmeny
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
      
      // Celkový počet článkov - porovnanie s minulým mesiacom
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
        
        // Zmeny
        celkovo_zmena: celkovoZmena.text,
        celkovo_zmena_typ: celkovoZmena.typ,
        publikovane_zmena: publikovaneZmena.text,
        publikovane_zmena_typ: publikovaneZmena.typ,
        koncepty_zmena: konceptyZmena.text,
        koncepty_zmena_typ: konceptyZmena.typ,
        zobrazenia_zmena: zobrazeniZmena.text,
        zobrazenia_zmena_typ: zobrazeniZmena.typ,
      });
      
      console.log('📊 Štatistiky vypočítané:', {
        publikovane: { aktualne: publikovane_30dni, predchadzajuce: publikovane_predchadzajuce, zmena: publikovaneZmena },
        zobrazenia: { aktualne: zobrazenia_30dni, predchadzajuce: zobrazenia_predchadzajuce, zmena: zobrazeniZmena }
      });
    }
  } catch (err) {
    console.error('Chyba pri načítavaní štatistík:', err);
    // Fallback hodnoty
    setStats({
      celkovo: 0,
      publikovane_30dni: 0,
      koncepty: 0,
      zobrazenia_30dni: 0
    });
  }
};


  const handlePageChange = (page: number) => {
    console.log('Zmena stránky na:', page);
    fetchArticles(page);
  };

  // ===== USE EFFECTS =====
  
  // Debouncing pre search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

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

  // Načítanie článkov pri zmene filtrov alebo stránky
  useEffect(() => {
    if (categories.length > 0 && (debouncedSearchTerm.length === 0 || debouncedSearchTerm.length > 2)) {
      fetchArticles(currentPage);
    }
  }, [currentPage, debouncedSearchTerm, filterStatus, filterCategory]);

  // ===== HELPER FUNCTIONS =====
  const getStatusDisplay = (status: string) => {
    // Table komponent automaticky robí value.toLowerCase().replace(' ', '-')
    // Preto musíme vrátiť anglické názvy ktoré sa mapujú na existujúce CSS triedy
    const statusMap = {
      published: 'Publikované',      // -> .status-complete (zelená)
      draft: 'Koncept',          // -> .status-pending (žltá)  
      scheduled: 'Naplánované',  // -> .status-in-progress (fialová)
      archived: 'Archivované'       // -> .status-rejected (červená)
    };
    return statusMap[status as keyof typeof statusMap] || 'Pending';
  };

  // ===== TABLE CONFIGURATION =====
  const tableColumns: TableColumn[] = [
    {
      id: 'nazov',
      header: 'Názov článku',
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
      id: 'autor',
      header: 'Autor',
      type: 'text',
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

  // Transformácia článkov pre tabuľku
  const tableData: TableData[] = articles.map(article => ({
    id: article.id.toString(),
    nazov: article.nazov,
    views: article.views.toLocaleString(),
    status: getStatusDisplay(article.status), // Vracia anglické názvy pre CSS
    muzstvo: 'A', // TODO: Pridať pole mužstvo do Article interface a API
    rubrika: article.kategoria.nazov || 'Bez kategórie',
    datum: new Date(article.vytvoreny).toLocaleDateString('sk-SK'),
    autor: article.autor.meno || 'Neznámy autor' 
  }));

  // ===== EVENT HANDLERS =====
  const handleAddArticle = () => {
    navigate('/article/new');
  };

  const handleEditArticle = (articleId: string) => {
    console.log('Editovanie článku ID:', articleId);
    // Navigácia na edit stránku článku
    navigate(`/articles/edit/${articleId}`);
  };

  const handleDeleteArticle = async (articleId: string) => {
  // Potvrdenie pred vymazaním
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

  const handlePreview = (articleId: number) => {
    console.log('Náhľad článku:', articleId);
    // TODO: Implementovať náhľad článku
  };

  // Funkcia na bulk vymazanie článkov
const handleBulkDeleteArticles = async (selectedIds: string[]) => {
  try {
    const token = localStorage.getItem('clubw_token');
    
    const response = await fetch('http://localhost:3000/api/admin/articles/bulk-delete', {
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

    // Aktualizácia lokálnych dát - odstránenie vymazaných článkov
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
      // Inak refresh aktuálnu stránku
      await fetchArticles(currentPage);
    }

    console.log(`✅ ${data.message}`);
    return data;
    
  } catch (error) {
    console.error('❌ Chyba pri bulk delete článkov:', error);
    throw error;
  }
};

// Funkcia na bulk duplikovanie článkov
const handleBulkDuplicateArticles = async (selectedIds: string[]) => {
  try {
    const token = localStorage.getItem('clubw_token');
    
    const response = await fetch('http://localhost:3000/api/admin/articles/bulk-duplicate', {
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
    
    // JEDNODUCHÉ RIEŠENIE: Refresh celú stránku
    await fetchArticles(currentPage);
    await fetchStats();
    
    return data;
    
  } catch (error) {
    console.error('❌ Chyba pri bulk duplicate článkov:', error);
    throw error;
  }
};

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

  const EditIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20H18C18.5523 20 19 19.5523 19 19V12" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.5"/>
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
        {/* Tabuľka */}
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
        />
      </div>
    </div>
  );
};

export default ArticleManagement;