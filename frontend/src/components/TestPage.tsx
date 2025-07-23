// frontend/src/components/GalleryTableTest.tsx
// Test komponent pre GalleryTable s mock dátami

import React, { useState } from 'react';
import GalleryTable from './ui/table/GalleryTable';

// Import CSS štýlov pre GalleryTable
import '../styles/components/ui/table/galleryTable.css';

// Mock dáta pre testovanie
const mockGalleries = [
  {
    id: 1,
    nazov: "Slovan x Wisła",
    popis: "Fotografie zo zápasu Slovan Bratislava vs Wisła Krakov",
    slug: "slovan-x-wisla",
    tim_id: 1,
    clanok_id: null,
    zapas_id: null,
    pocet_obrazkov: 45,
    nahladovy_obrazok: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=400&fit=crop&crop=center",
    typ_priradenia: 'tim' as const,
    aktivity: true,
    vytvoreny: "2024-03-15T10:00:00Z",
    aktualizovany: "2024-03-15T10:00:00Z",
    stats: {
      celkovo_zobrazeni: 6080,
      zobrazenia_tyzden: 1250,
      zobrazenia_mesiac: 4320
    }
  },
  {
    id: 2,
    nazov: "Tréning mládežníkov",
    popis: "Tréning U19 pred dôležitým zápasom",
    slug: "trening-mladeznikov",
    tim_id: 2,
    clanok_id: null,
    zapas_id: null,
    pocet_obrazkov: 23,
    nahladovy_obrazok: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop&crop=center",
    typ_priradenia: 'tim' as const,
    aktivity: true,
    vytvoreny: "2024-03-14T15:30:00Z",
    aktualizovany: "2024-03-14T15:30:00Z",
    stats: {
      celkovo_zobrazeni: 1420,
      zobrazenia_tyzden: 890,
      zobrazenia_mesiac: 1420
    }
  },
  {
    id: 3,
    nazov: "Víťazstvo v lige",
    popis: "Oslavy po víťazstve 3:1",
    slug: "vitazstvo-v-lige",
    tim_id: null,
    clanok_id: 15,
    zapas_id: null,
    pocet_obrazkov: 67,
    nahladovy_obrazok: "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400&h=400&fit=crop&crop=center",
    typ_priradenia: 'clanok' as const,
    aktivity: true,
    vytvoreny: "2024-03-13T20:15:00Z",
    aktualizovany: "2024-03-13T20:15:00Z",
    stats: {
      celkovo_zobrazeni: 15420,
      zobrazenia_tyzden: 3250,
      zobrazenia_mesiac: 12100
    }
  },
  {
    id: 4,
    nazov: "Nový štadión",
    popis: "Prvé zábery z nového štadióna",
    slug: "novy-stadion",
    tim_id: null,
    clanok_id: null,
    zapas_id: null,
    pocet_obrazkov: 12,
    nahladovy_obrazok: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=400&fit=crop&crop=center",
    typ_priradenia: 'volna' as const,
    aktivity: true,
    vytvoreny: "2024-03-12T09:00:00Z",
    aktualizovany: "2024-03-12T09:00:00Z",
    stats: {
      celkovo_zobrazeni: 8750,
      zobrazenia_tyzden: 2100,
      zobrazenia_mesiac: 6890
    }
  },
  {
    id: 5,
    nazov: "Fanclub stretnutie",
    popis: "Stretnutie s fanúšikmi pred sezónou",
    slug: "fanclub-stretnutie",
    tim_id: null,
    clanok_id: 8,
    zapas_id: null,
    pocet_obrazkov: 89,
    nahladovy_obrazok: "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=400&h=400&fit=crop&crop=center",
    typ_priradenia: 'clanok' as const,
    aktivity: true,
    vytvoreny: "2024-03-11T18:45:00Z",
    aktualizovany: "2024-03-11T18:45:00Z",
    stats: {
      celkovo_zobrazeni: 3250,
      zobrazenia_tyzden: 650,
      zobrazenia_mesiac: 2100
    }
  },
  {
    id: 6,
    nazov: "Letná príprava",
    popis: "Zábery z letného sústredenia",
    slug: "letna-priprava",
    tim_id: 1,
    clanok_id: null,
    zapas_id: null,
    pocet_obrazkov: 156,
    nahladovy_obrazok: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=400&fit=crop&crop=center",
    typ_priradenia: 'tim' as const,
    aktivity: true,
    vytvoreny: "2024-03-10T12:20:00Z",
    aktualizovany: "2024-03-10T12:20:00Z",
    stats: {
      celkovo_zobrazeni: 12400,
      zobrazenia_tyzden: 1890,
      zobrazenia_mesiac: 8750
    }
  }
];

const GalleryTableTest: React.FC = () => {
  // ===== STATE MANAGEMENT =====
  const [selectedGalleries, setSelectedGalleries] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // ===== EVENT HANDLERS =====
  const handleGallerySelect = (galleryId: string, selected: boolean) => {
    if (selected) {
      setSelectedGalleries(prev => [...prev, galleryId]);
    } else {
      setSelectedGalleries(prev => prev.filter(id => id !== galleryId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedGalleries(mockGalleries.map(g => g.id.toString()));
    } else {
      setSelectedGalleries([]);
    }
  };

  const handleAddGallery = () => {
    console.log('🖼️ Pridávanie novej galérie...');
    alert('Pridávanie novej galérie - tu bude modal');
  };

  const handleEditGallery = (galleryId: string) => {
    console.log('✏️ Editovanie galérie ID:', galleryId);
    alert(`Editovanie galérie ID: ${galleryId} - tu bude modal alebo navigácia`);
  };

  const handleDeleteGallery = (galleryId: string) => {
    console.log('🗑️ Vymazávanie galérie ID:', galleryId);
    if (window.confirm('Naozaj chcete vymazať túto galériu?')) {
      alert(`Galéria ID ${galleryId} vymazaná`);
    }
  };

  const handleDeleteSelected = async (selectedIds: string[]) => {
    console.log('🗑️ Vymazávanie označených galérií:', selectedIds);
    
    // Simulácia API volania
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    
    alert(`Vymazaných ${selectedIds.length} galérií`);
    setSelectedGalleries([]);
  };

  const handleDuplicateSelected = async (selectedIds: string[]) => {
    console.log('📋 Duplikovanie označených galérií:', selectedIds);
    
    // Simulácia API volania
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    
    alert(`Duplikovaných ${selectedIds.length} galérií`);
    setSelectedGalleries([]);
  };

  // ===== RENDER =====
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
        🧪 Test GalleryTable komponentu
      </h1>
      
      <div style={{ marginBottom: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Debug Info:</h3>
        <p style={{ margin: '4px 0' }}>Označené galérie: {selectedGalleries.length}</p>
        <p style={{ margin: '4px 0' }}>Vyhľadávací term: "{searchTerm}"</p>
        <p style={{ margin: '4px 0' }}>Celkovo galérií: {mockGalleries.length}</p>
      </div>

      <GalleryTable
        galleries={mockGalleries}
        loading={loading}
        selectedGalleries={selectedGalleries}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddGallery={handleAddGallery}
        onEditGallery={handleEditGallery}
        onDeleteGallery={handleDeleteGallery}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onGallerySelect={handleGallerySelect}
        onSelectAll={handleSelectAll}
      />

      {/* Test Controls */}
      <div style={{ marginTop: '40px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>🎮 Test Controls:</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setLoading(!loading)}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {loading ? 'Zastaviť loading' : 'Spustiť loading'}
          </button>
          
          <button 
            onClick={() => setSearchTerm('Slovan')}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            Hľadať "Slovan"
          </button>
          
          <button 
            onClick={() => setSearchTerm('')}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            Vymazať vyhľadávanie
          </button>
          
          <button 
            onClick={() => handleSelectAll(true)}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            Označiť všetko
          </button>
          
          <button 
            onClick={() => setSelectedGalleries([])}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            Zrušiť označenie
          </button>
        </div>
      </div>
    </div>
  );
};

export default GalleryTableTest;