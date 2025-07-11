// frontend/src/components/CategoryManagement.tsx
// Komponent pre správu kategórií v štýle ArticleManagement s tabuľkou a štatistikami

import React, { useState, useEffect } from 'react';
import StatCard from './ui/cards/StatCard';
import Table from './ui/table/Table';
import type { TableColumn, TableData } from './ui/table/Table';
import AddCategoryModal from './ui/table/AddCategoryModal';

// Import CSS štýlov
import '../styles/components/managementPages.css';

// ===== INTERFACE DEFINITIONS =====
interface Category {
  id: number;
  nazov: string;
  slug: string;
  popis?: string;
  farba?: string;
  ikona?: string;
  poradie: number;
  aktivity: boolean;
  pocet_clankov?: number;
  vytvoreny: string;
  aktualizovany: string;
}

interface CategoryStats {
  celkovo: number;
  aktivne: number;
  neaktivne: number;
  celkovo_clankov: number;
  // Zmeny
  celkovo_zmena?: string;
  celkovo_zmena_typ?: 'positive' | 'negative' | 'neutral';
  aktivne_zmena?: string;
  aktivne_zmena_typ?: 'positive' | 'negative' | 'neutral';
  clankov_zmena?: string;
  clankov_zmena_typ?: 'positive' | 'negative' | 'neutral';
}

export interface CategoryFormData {
  nazov: string;
  slug: string;
  popis: string;
  farba: string;
  ikona: string;
}

// ===== MAIN COMPONENT =====
const CategoryManagement: React.FC = () => {
  // ===== STATE VARIABLES =====
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Štatistiky
  const [stats, setStats] = useState<CategoryStats>({
    celkovo: 0,
    aktivne: 0,
    neaktivne: 0,
    celkovo_clankov: 0
  });

  // ===== DEFINÍCIE STĹPCOV PRE TABUĽKU =====
  const tableColumns: TableColumn[] = [
    { id: 'nazov', header: 'Názov', type: 'text', sortable: true, width: '35%' },
    { id: 'popis', header: 'Popis', type: 'text', sortable: false, width: '44%' },
    { id: 'pocet_clankov', header: 'Články', type: 'text', sortable: true, width: '5%' },
    { id: 'aktivity', header: 'Stav', type: 'status', sortable: true, width: '10%' },
    { id: 'actions', header: 'Akcie', type: 'actions', width: '5%' }
  ];

  // ===== TRANSFORMÁCIA DÁT PRE TABUĽKU =====
  const tableData: TableData[] = categories.map(category => ({
    id: category.id.toString(),
    nazov: category.nazov,
    slug: category.slug,
    popis: category.popis || 'Bez popisu',
    pocet_clankov: category.pocet_clankov?.toString() || '0',
    poradie: category.poradie.toString(),
    aktivity: category.aktivity ? 'aktívna' : 'neaktívna',
    actions: 'actions',
    // Extra data pre renderovanie
    farba: category.farba,
    ikona: category.ikona
  }));

  // ===== FUNKCIE PRE API VOLANIA =====

  // Načítanie kategórií z API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('clubw_token');
      
      const response = await fetch('http://localhost:3000/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCategories(data.data.categories);
        setError('');
      } else {
        setError(data.message || 'Chyba pri načítavaní kategórií');
      }
    } catch (err) {
      console.error('Chyba pri načítavaní kategórií:', err);
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie štatistík
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('clubw_token');
      
      // Načítame kategórie pre štatistiky
      const response = await fetch('http://localhost:3000/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        const allCategories = data.data.categories;
        
        // Výpočet základných štatistík
        const celkovo = allCategories.length;
        const aktivne = allCategories.filter((cat: Category) => cat.aktivity).length;
        const neaktivne = celkovo - aktivne;
        const celkovo_clankov = allCategories.reduce((sum: number, cat: Category) => 
          sum + (cat.pocet_clankov || 0), 0
        );

        // Simulácia zmien (v skutočnosti by sa porovnávalo s predchádzajúcimi dátami)
        // Tu by mohla byť logika na porovnanie s minulým týždňom/mesiacom
        const celkovo_zmena = celkovo > 0 ? `+${Math.floor(celkovo * 0.1)} tento mesiac` : 'Bez zmeny';
        const aktivne_zmena = aktivne > 0 ? `${Math.round((aktivne/celkovo) * 100)}% aktívnych` : 'Žiadne aktívne';
        const clankov_zmena = celkovo_clankov > 0 ? `+${Math.floor(celkovo_clankov * 0.05)} tento týždeň` : 'Bez článkov';

        setStats({
          celkovo,
          aktivne,
          neaktivne,
          celkovo_clankov,
          celkovo_zmena,
          celkovo_zmena_typ: 'positive',
          aktivne_zmena,
          aktivne_zmena_typ: aktivne === celkovo ? 'positive' : 'neutral',
          clankov_zmena,
          clankov_zmena_typ: 'positive'
        });
      }
    } catch (err) {
      console.error('Chyba pri načítavaní štatistík kategórií:', err);
    }
  };


  // Funkcia na bulk vymazanie kategórií
    const handleBulkDeleteCategories = async (selectedIds: string[]) => {
      try {
        const token = localStorage.getItem('clubw_token');
        
        const response = await fetch('http://localhost:3000/api/admin/categories/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: selectedIds }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Chyba pri mazaní kategórií');
        }

        // Aktualizácia lokálnych dát
        setCategories(prevCategories => 
          prevCategories.filter(category => !selectedIds.includes(category.id.toString()))
        );

        // Aktualizácia štatistík
        await fetchStats();

        console.log(`✅ ${data.message}`);
        return data;
        
      } catch (error) {
        console.error('❌ Chyba pri bulk delete kategórií:', error);
        throw error;
      }
    };

    // Funkcia na bulk duplikovanie kategórií
    const handleBulkDuplicateCategories = async (selectedIds: string[]) => {
      try {
        const token = localStorage.getItem('clubw_token');
        
        const response = await fetch('http://localhost:3000/api/admin/categories/bulk-duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: selectedIds }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Chyba pri duplikovaní kategórií');
        }

        // Aktualizácia lokálnych dát
        setCategories(prevCategories => [...prevCategories, ...data.data.duplicatedCategories]);

        // Aktualizácia štatistík
        await fetchStats();

        console.log(`✅ ${data.message}`);
        return data;
        
      } catch (error) {
        console.error('❌ Chyba pri bulk duplicate kategórií:', error);
        throw error;
      }
    };

  // ===== EVENT HANDLERS =====

  // Handler pre pridanie novej kategórie
  const handleAddCategory = () => {
    setIsAddModalOpen(true);
  };

  // Handler pre uloženie novej kategórie
  const handleSaveCategory = async (categoryData: CategoryFormData) => {
    try {
      const token = localStorage.getItem('clubw_token');
      
      const response = await fetch('http://localhost:3000/api/admin/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Kategória úspešne vytvorená:', data.data.category);
        
        // Refresh zoznamu kategórií
        await fetchCategories();
        await fetchStats();
        
        // Zatvorenie modalu
        setIsAddModalOpen(false);
      } else {
        console.error('❌ Chyba pri vytváraní kategórie:', data.message);
        alert('Chyba pri vytváraní kategórie: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Network chyba:', error);
      alert('Chyba spojenia so serverom');
    }
  };

  // Handler pre vymazanie kategórie
  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Naozaj chcete vymazať túto kategóriu?')) {
      return;
    }

    try {
      const token = localStorage.getItem('clubw_token');
      
      const response = await fetch(`http://localhost:3000/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Kategória vymazaná');
        await fetchCategories();
        await fetchStats();
      } else {
        alert('Chyba pri vymazávaní kategórie: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Chyba pri vymazávaní:', error);
      alert('Chyba spojenia so serverom');
    }
  };

  // ===== USEEFFECT HOOKS =====
  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  // ===== ICON COMPONENTS =====
  const CategoryIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7 3C7.55228 3 8 3.44772 8 4V5H12V4C12 3.44772 12.4477 3 13 3C13.5523 3 14 3.44772 14 4V5H15C16.1046 5 17 5.89543 17 7V15C17 16.1046 16.1046 17 15 17H5C3.89543 17 3 16.1046 3 15V7C3 5.89543 3.89543 5 5 5H6V4C6 3.44772 6.44772 3 7 3Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9H17" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const ActiveIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const ArticleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M9 12H15M9 16H15M9 8H10M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  const FolderIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H15C16.1046 19 17 18.1046 17 17V9C17 7.89543 16.1046 7 15 7H10L8 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="management-loading">
        🏷️ Načítavam kategórie...
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
          Správa rubrík
        </h1>
      </div>

      {/* ===== ŠTATISTIKY KARTY ===== */}
      <div className="management-stats">
        <StatCard
          title="Počet Rubrík"
          value={stats.celkovo}
          icon={<CategoryIcon />}
          variant="default"
        />
        
        <StatCard
          title="Neaktívne Rubriky"
          value={stats.neaktivne}
          icon={<ActiveIcon />}
          variant="accent"
        />
      
      </div>

      {/* ===== TABUĽKA S KATEGÓRIAMI ===== */}
      <div className="management-content">
        <Table
          columns={tableColumns}
          data={tableData}
          showCheckboxes={true}
          itemsPerPage={10}
          onAddCategory={handleAddCategory} 
          onDeleteSelected={handleBulkDeleteCategories}    
          onDuplicateSelected={handleBulkDuplicateCategories}
        />
      </div>

      {/* ===== ADD CATEGORY MODAL ===== */}
      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveCategory}
      />
    </div>
  );
};

export default CategoryManagement;