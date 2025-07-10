// frontend/src/components/ArticleManagement.tsx

import React, { useState, useEffect } from 'react';
import StatCard from './ui/cards/StatCard';
import Table from './ui/table/Table';
import type { TableColumn, TableData } from './ui/table/Table';
import { useRouter } from '../context/RouterContext'; // PRIDANÉ


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
}

// ===== MAIN COMPONENT =====
const ArticleManagement: React.FC<ArticleManagementProps> = ({ currentUser }) => {
  //Router hook pre navigáciu
  const { navigate } = useRouter();

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

  // ===== FUNKCIE PRE API =====
  
  // Načítanie článkov z API
  const fetchArticles = async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('clubw_token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      // Pridanie filtrov ak sú nastavené
      if (searchTerm) params.append('search', searchTerm);
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
          setCurrentPage(data.data.pagination.currentPage);
          setTotalPages(data.data.pagination.totalPages);
          setTotalArticles(data.data.pagination.totalArticles);
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
        
        // Výpočet štatistík z všetkých článkov
        const celkovo = allArticles.length;
        const publikovane_30dni = allArticles.filter((article: Article) => {
          if (article.status !== 'published') return false;
          const publikovanyDatum = new Date(article.publikovany_datum || article.vytvoreny);
          const pred30Dni = new Date();
          pred30Dni.setDate(pred30Dni.getDate() - 30);
          return publikovanyDatum >= pred30Dni;
        }).length;
        const koncepty = allArticles.filter((article: Article) => article.status === 'draft').length;
        const zobrazenia_30dni = allArticles
          .filter((article: Article) => {
            const publikovanyDatum = new Date(article.publikovany_datum || article.vytvoreny);
            const pred30Dni = new Date();
            pred30Dni.setDate(pred30Dni.getDate() - 30);
            return publikovanyDatum >= pred30Dni;
          })
          .reduce((sum: number, article: Article) => sum + article.views, 0);

        setStats({
          celkovo,
          publikovane_30dni,
          koncepty,
          zobrazenia_30dni
        });
      }
    } catch (err) {
      console.error('Chyba pri načítavaní štatistík:', err);
      // Ak zlyhá API, ponechávame mock dáta
      setStats({
        celkovo: 0,
        publikovane_30dni: 0,
        koncepty: 0,
        zobrazenia_30dni: 0
      });
    }
  };

  // ===== USE EFFECTS =====
  
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
    if (categories.length > 0) { // Počkáme kým sa načítajú kategórie
      fetchArticles(currentPage);
    }
  }, [currentPage, searchTerm, filterStatus, filterCategory]);

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
      width: '25%'
    },
    {
      id: 'views',
      header: 'Zobrazenia',
      type: 'text',
      sortable: true,
      width: '10%'
    },
    {
      id: 'status',
      header: 'Status',
      type: 'status',
      sortable: true,
      width: '12%'
    },
    {
      id: 'muzstvo',
      header: 'Mužstvo',
      type: 'text',
      sortable: true,
      width: '10%'
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
    rubrika: article.kategoria.nazov,
    datum: new Date(article.vytvoreny).toLocaleDateString('sk-SK'),
    autor: article.autor.meno
  }));

  // ===== EVENT HANDLERS =====
  const handleAddArticle = () => {
    navigate('/article/new');
  };

  const handleEdit = (articleId: number) => {
    console.log('Úprava článku:', articleId);
    // TODO: Implementovať úpravu článku
  };

  const handleDelete = (articleId: number) => {
    console.log('Mazanie článku:', articleId);
    // TODO: Implementovať mazanie článku
  };

  const handlePreview = (articleId: number) => {
    console.log('Náhľad článku:', articleId);
    // TODO: Implementovať náhľad článku
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
          icon={<ArticleIcon />}
          variant="default"
        />
        
        <StatCard
          title="Publikované (30 dní)"
          value={stats.publikovane_30dni}
          change="+3 tento mesiac"
          changeType="positive"
          icon={<EyeIcon />}
          variant="accent"
        />
        
        <StatCard
          title="Koncepty"
          value={stats.koncepty}
          icon={<DraftIcon />}
          variant="default"
        />
        
        <StatCard
          title="Zobrazenia (30 dní)"
          value={stats.zobrazenia_30dni.toLocaleString()}
          change="+12.3%"
          changeType="positive"
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
          itemsPerPage={10}
          onAddArticle={handleAddArticle}
        />
      </div>
    </div>
  );
};

export default ArticleManagement;