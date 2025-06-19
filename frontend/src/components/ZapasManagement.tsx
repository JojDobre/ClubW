// frontend/src/components/ZapasManagement.tsx
// Komponenta pre správu zápasov - FÁZA 4

import React, { useState, useEffect } from 'react';
import { 
  matchesApi, 
  leaguesApi, 
  teamsApi, 
  Zapas, 
  Liga, 
  Team, 
  ZapasFormData 
} from '../services/matchesApi';

interface User {
  id: number;
  meno: string;
  email: string;
  rola: 'admin' | 'redaktor' | 'trener' | 'uzivatel';
}

interface ZapasManagementProps {
  user: User;
}

interface ZapasStats {
  celkovo: number;
  bez_vysledku: number;
  tento_mesiac: number;
  nadchadzajuce: number;
}

const ZapasManagement: React.FC<ZapasManagementProps> = ({ user }) => {
  // ===== STATE =====
  const [zapasy, setZapasy] = useState<Zapas[]>([]);
  const [ligy, setLigy] = useState<Liga[]>([]);
  const [timy, setTimy] = useState<Team[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Zapas[]>([]);
  const [stats, setStats] = useState<ZapasStats>({
    celkovo: 0,
    bez_vysledku: 0,
    tento_mesiac: 0,
    nadchadzajuce: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [modalError, setModalError] = useState<string>(''); // Nový state pre chyby v modali
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingZapas, setEditingZapas] = useState<Zapas | null>(null);
  const [selectedZapasy, setSelectedZapasy] = useState<number[]>([]);

  // ===== FILTERS =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLiga, setFilterLiga] = useState<string>('');
  const [filterTim, setFilterTim] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterOdDatumu, setFilterOdDatumu] = useState<string>('');
  const [filterDoDatumu, setFilterDoDatumu] = useState<string>('');

  // ===== SORTING =====
  const [sortField, setSortField] = useState<string>('datum_cas');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // ===== FORM STATE =====
  const [formData, setFormData] = useState<ZapasFormData>({
    datum_cas: '',
    status: 'naplanovany',
    domaci_tim_nazov: '',
    hostujuci_tim_nazov: '',
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [isCustomDomaciTim, setIsCustomDomaciTim] = useState(false);
  const [isCustomHostujuciTim, setIsCustomHostujuciTim] = useState(false);
  const [isCustomLiga, setIsCustomLiga] = useState(false);

  // ===== DATA LOADING =====

  // Načítanie základných dát
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Paralelné načítanie všetkých potrebných dát
      const [ligasResponse, teamsResponse, upcomingResponse] = await Promise.all([
        leaguesApi.getLeagues(),
        teamsApi.getTeams(),
        matchesApi.getUpcomingMatches(5)
      ]);

      if (ligasResponse.success) setLigy(ligasResponse.data);
      if (teamsResponse.success) setTimy(teamsResponse.data);
      if (upcomingResponse.success) setUpcomingMatches(upcomingResponse.data);

      // Načítanie štatistík
      await fetchStats();
      
    } catch (err) {
      console.error('Chyba pri načítaní základných dát:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní dát');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie zápasov s filtrami
  const fetchZapasy = async () => {
    try {
      const filters = {
        search: searchTerm || undefined,
        liga_id: filterLiga ? Number(filterLiga) : undefined,
        tim_id: filterTim ? Number(filterTim) : undefined,
        status: filterStatus || undefined,
        od_datumu: filterOdDatumu || undefined,
        do_datumu: filterDoDatumu || undefined,
        include_details: true,
        limit: 100 // Načítame viac zápasov pre frontend filtrovanie a sortovanie
      };

      const response = await matchesApi.getMatches(filters);
      
      if (response.success) {
        setZapasy(response.data);
        setError('');
      } else {
        setError(response.message || 'Chyba pri načítaní zápasov');
      }
    } catch (err) {
      console.error('Chyba pri načítaní zápasov:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní zápasov');
    }
  };

  // Načítanie štatistík
  const fetchStats = async () => {
    try {
      const [allMatches, withoutResult, monthStats, upcoming] = await Promise.all([
        matchesApi.getMatches({ include_details: false, limit: 1000 }),
        matchesApi.getMatchesWithoutResult(),
        matchesApi.getThisMonthStats(),
        matchesApi.getUpcomingMatches(50)
      ]);

      setStats({
        celkovo: allMatches.success ? allMatches.data.length : 0,
        bez_vysledku: withoutResult.success ? withoutResult.data.length : 0,
        tento_mesiac: monthStats.success ? monthStats.data.total : 0,
        nadchadzajuce: upcoming.success ? upcoming.data.length : 0
      });
    } catch (err) {
      console.error('Chyba pri načítaní štatistík:', err);
    }
  };

  // ===== EFFECTS =====

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchZapasy();
  }, [searchTerm, filterLiga, filterTim, filterStatus, filterOdDatumu, filterDoDatumu]);

  // ===== FORM VALIDATION =====

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    // Povinné polia
    if (!formData.datum_cas) {
      errors.datum_cas = 'Dátum a čas je povinný';
    }

    // Domáci tím
    if (!isCustomDomaciTim && !formData.domaci_tim_id) {
      errors.domaci_tim = 'Domáci tím je povinný';
    } else if (isCustomDomaciTim && !formData.domaci_tim_nazov?.trim()) {
      errors.domaci_tim = 'Názov domáceho tímu je povinný';
    }

    // Hosťujúci tím
    if (!isCustomHostujuciTim && !formData.hostujuci_tim_id) {
      errors.hostujuci_tim = 'Hosťujúci tím je povinný';
    } else if (isCustomHostujuciTim && !formData.hostujuci_tim_nazov?.trim()) {
      errors.hostujuci_tim = 'Názov hosťujúceho tímu je povinný';
    }

    // Video URL validácia
    if (formData.video_url && !/^https?:\/\/.+/.test(formData.video_url)) {
      errors.video_url = 'Video URL musí začínať http:// alebo https://';
    }

    // Počet gólov
    if (formData.goly_domaci !== undefined && (formData.goly_domaci < 0 || formData.goly_domaci > 50)) {
      errors.goly_domaci = 'Počet gólov musí byť medzi 0-50';
    }
    if (formData.goly_hostia !== undefined && (formData.goly_hostia < 0 || formData.goly_hostia > 50)) {
      errors.goly_hostia = 'Počet gólov musí byť medzi 0-50';
    }

    // Počet divákov
    if (formData.pocet_divakov !== undefined && (formData.pocet_divakov < 0 || formData.pocet_divakov > 100000)) {
      errors.pocet_divakov = 'Počet divákov musí byť medzi 0-100000';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== CRUD OPERATIONS =====

  const handleSave = async () => {
    if (!validateForm()) return;

    setModalError(''); // Vymaž predchádzajúce chyby

    try {
      // Príprava dát pre API
      const dataToSend: ZapasFormData = {
        ...formData,
        // Automatické generovanie názvu ak nie je zadaný
        nazov: formData.nazov || generateMatchName()
      };

      // DEBUGGING: Zobrazme aké dáta posielajeme
      console.log('=== FRONTEND DEBUG ===');
      console.log('Form data before sending:', JSON.stringify(dataToSend, null, 2));
      console.log('Custom flags:', {
        isCustomDomaciTim,
        isCustomHostujuciTim,
        isCustomLiga
      });

      // Odstránenie prázdnych polí a konfliktných kombinácií
      Object.keys(dataToSend).forEach(key => {
        const value = (dataToSend as any)[key];
        if (value === '' || value === undefined || value === null) {
          console.log(`Removing empty field: ${key} = ${value}`);
          delete (dataToSend as any)[key];
        }
      });

      // OPRAVA: Zabezpečiť že sa neposielajú konfliktné kombinácie
      if (isCustomDomaciTim) {
        delete dataToSend.domaci_tim_id; // Odstráň ID ak používame custom názov
      } else {
        delete dataToSend.domaci_tim_nazov; // Odstráň custom názov ak používame ID
      }

      if (isCustomHostujuciTim) {
        delete dataToSend.hostujuci_tim_id; // Odstráň ID ak používame custom názov
      } else {
        delete dataToSend.hostujuci_tim_nazov; // Odstráň custom názov ak používame ID
      }

      if (isCustomLiga) {
        delete dataToSend.liga_id; // Odstráň ID ak používame custom názov
      } else {
        delete dataToSend.liga_nazov; // Odstráň custom názov ak používame ID
      }

      console.log('Final data to send:', JSON.stringify(dataToSend, null, 2));

      let response;
      if (editingZapas) {
        response = await matchesApi.updateMatch(editingZapas.id, dataToSend);
      } else {
        response = await matchesApi.createMatch(dataToSend);
      }

      if (response.success) {
        await fetchZapasy();
        await fetchStats();
        await fetchUpcoming();
        handleCloseModal();
        setError('');
        setModalError('');
      } else {
        setModalError(response.message || 'Chyba pri ukladaní zápasu');
      }

    } catch (err) {
      console.error('Chyba pri ukladaní zápasu:', err);
      setModalError(err instanceof Error ? err.message : 'Chyba pri ukladaní zápasu');
    }
  };

  const handleDelete = async (zapasId: number) => {
    const zapas = zapasy.find(z => z.id === zapasId);
    if (!zapas) return;

    const matchName = getMatchDisplayName(zapas);
    if (!window.confirm(`Naozaj chcete vymazať zápas "${matchName}"?`)) {
      return;
    }

    try {
      const response = await matchesApi.deleteMatch(zapasId);
      if (response.success) {
        await fetchZapasy();
        await fetchStats();
        setError('');
      } else {
        setError(response.message || 'Chyba pri mazaní zápasu');
      }
    } catch (err) {
      console.error('Chyba pri mazaní zápasu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri mazaní zápasu');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedZapasy.length === 0) return;

    if (!window.confirm(`Naozaj chcete vymazať ${selectedZapasy.length} zápasov?`)) {
      return;
    }

    try {
      await matchesApi.deleteMatches(selectedZapasy);
      await fetchZapasy();
      await fetchStats();
      setSelectedZapasy([]);
      setError('');
    } catch (err) {
      console.error('Chyba pri bulk mazaní:', err);
      setError('Chyba pri mazaní vybraných zápasov');
    }
  };

  // ===== MODAL HANDLING =====

  const handleOpenAddModal = () => {
    setEditingZapas(null);
    setFormData({
      datum_cas: '',
      status: 'naplanovany',
      domaci_tim_nazov: '',
      hostujuci_tim_nazov: '',
    });
    setIsCustomDomaciTim(false);
    setIsCustomHostujuciTim(false);
    setIsCustomLiga(false);
    setValidationErrors({});
    setShowAddModal(true);
  };

  const handleOpenEditModal = (zapas: Zapas) => {
    setEditingZapas(zapas);
    setFormData({
      nazov: zapas.nazov,
      datum_cas: zapas.datum_cas,
      miesto: zapas.miesto || '',
      kolo: zapas.kolo || '',
      status: zapas.status,
      goly_domaci: zapas.goly_domaci,
      goly_hostia: zapas.goly_hostia,
      pocet_divakov: zapas.pocet_divakov,
      poznamky: zapas.poznamky || '',
      video_url: zapas.video_url || '',
      clanok_id: zapas.clanok_id,
      fotogaleria_id: zapas.fotogaleria_id,
      
      // OPRAVENÉ: Správne handling tímov a líg pri editácii
      domaci_tim_id: zapas.domaci_tim?.id,
      domaci_tim_nazov: zapas.domaci_tim_nazov || zapas.domaci_tim?.nazov || '',
      hostujuci_tim_id: zapas.hostujuci_tim?.id,
      hostujuci_tim_nazov: zapas.hostujuci_tim_nazov || zapas.hostujuci_tim?.nazov || '',
      liga_id: zapas.liga?.id,
      liga_nazov: zapas.liga_nazov || zapas.liga?.nazov || ''
    });
    
    // OPRAVENÉ: Správne nastavenie custom flagov
    setIsCustomDomaciTim(!zapas.domaci_tim?.id && !!zapas.domaci_tim_nazov);
    setIsCustomHostujuciTim(!zapas.hostujuci_tim?.id && !!zapas.hostujuci_tim_nazov);
    setIsCustomLiga(!zapas.liga?.id && !!zapas.liga_nazov);
    
    setValidationErrors({});
    setModalError('');
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingZapas(null);
    setValidationErrors({});
    setModalError(''); // Vymaž modal chyby
  };

  // ===== UTILITY FUNCTIONS =====

  const updateFormData = (field: keyof ZapasFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const generateMatchName = (): string => {
    // OPRAVENÉ: Správne získavanie názvov tímov
    const domaciNazov = isCustomDomaciTim ? 
      (formData.domaci_tim_nazov || '') : 
      (timy.find(t => t.id === formData.domaci_tim_id)?.nazov || '');
    const hostujuciNazov = isCustomHostujuciTim ? 
      (formData.hostujuci_tim_nazov || '') : 
      (timy.find(t => t.id === formData.hostujuci_tim_id)?.nazov || '');
    
    return `${domaciNazov} vs ${hostujuciNazov}`;
  };

  const getMatchDisplayName = (zapas: Zapas): string => {
    // DEBUGGING: Vypisuj údaje o zápase
    console.log('Match display debug:', {
      id: zapas.id,
      domaci_tim_nazov: zapas.domaci_tim_nazov,
      domaci_tim: zapas.domaci_tim,
      hostujuci_tim_nazov: zapas.hostujuci_tim_nazov,
      hostujuci_tim: zapas.hostujuci_tim
    });

    // OPRAVENÉ: Prioritne zobrazujeme custom názvy, ak existujú
    const domaci = zapas.domaci_tim_nazov || zapas.domaci_tim?.nazov || 'Neznámy tím';
    const hostujuci = zapas.hostujuci_tim_nazov || zapas.hostujuci_tim?.nazov || 'Neznámy tím';
    
    console.log('Final names:', { domaci, hostujuci });
    return `${domaci} vs ${hostujuci}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatStatus = (status: string): string => {
    const statuses = {
      naplanovany: 'Naplánovaný',
      prebieha: 'Prebieha',
      ukonceny: 'Ukončený',
      odlozeny: 'Odložený',
      zruseny: 'Zrušený'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStatusColor = (status: string, actualStatus?: string): string => {
    const statusToUse = actualStatus || status;
    const colors = {
      naplanovany: '#3b82f6',
      prebieha: '#10b981',
      ukonceny: '#6b7280',
      odlozeny: '#f59e0b',
      zruseny: '#ef4444'
    };
    return colors[statusToUse as keyof typeof colors] || '#6b7280';
  };

  // Automatické aktualizovanie stavu zápasov
  const fetchUpcoming = async () => {
    try {
      const response = await matchesApi.getUpcomingMatches(5);
      if (response.success) {
        setUpcomingMatches(response.data);
      }
    } catch (err) {
      console.error('Chyba pri načítaní nadchádzajúcich zápasov:', err);
    }
  };

  // ===== SORTING & FILTERING =====

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedAndFilteredZapasy = (): Zapas[] => {
    let filtered = [...zapasy];

    // Sortovanie
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'datum_cas':
          aVal = new Date(a.datum_cas);
          bVal = new Date(b.datum_cas);
          break;
        case 'liga':
          aVal = a.liga?.nazov || a.liga_nazov || '';
          bVal = b.liga?.nazov || b.liga_nazov || '';
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'zapas':
          aVal = getMatchDisplayName(a);
          bVal = getMatchDisplayName(b);
          break;
        case 'kolo':
          aVal = a.kolo || '';
          bVal = b.kolo || '';
          break;
        default:
          aVal = (a as any)[sortField] || '';
          bVal = (b as any)[sortField] || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // ===== RENDER =====

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        fontSize: '18px',
        color: '#64748b'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚽</div>
          <div>Načítavam zápasy...</div>
        </div>
      </div>
    );
  }

  const sortedZapasy = getSortedAndFilteredZapasy();

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              ⚽ Správa zápasov
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: '0'
            }}>
              Plánovanie a správa futbalových zápasov
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedZapasy.length > 0 && (
              <button
                onClick={handleBulkDelete}
                style={{
                  padding: '10px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
              >
                🗑️ Vymazať vybrané ({selectedZapasy.length})
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              ➕ Pridať zápas
            </button>
          </div>
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
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>CELKOVO ZÁPASOV</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{stats.celkovo}</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>BEZ VÝSLEDKU</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>{stats.bez_vysledku}</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>TENTO MESIAC</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{stats.tento_mesiac}</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>NADCHÁDZAJÚCE</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.nadchadzajuce}</div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* Vyhľadávanie */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Vyhľadávanie
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Názov, tím, miesto, kolo..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Liga filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Liga
            </label>
            <select
              value={filterLiga}
              onChange={(e) => setFilterLiga(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky ligy</option>
              {ligy.map(liga => (
                <option key={liga.id} value={liga.id}>
                  {liga.nazov} ({liga.sezona})
                </option>
              ))}
            </select>
          </div>

          {/* Tím filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Tím
            </label>
            <select
              value={filterTim}
              onChange={(e) => setFilterTim(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky tímy</option>
              {timy.map(tim => (
                <option key={tim.id} value={tim.id}>
                  {tim.nazov} ({tim.vekova_kategoria})
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky statusy</option>
              <option value="naplanovany">Naplánovaný</option>
              <option value="prebieha">Prebieha</option>
              <option value="ukonceny">Ukončený</option>
              <option value="odlozeny">Odložený</option>
              <option value="zruseny">Zrušený</option>
            </select>
          </div>

          {/* Dátum od */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Od dátumu
            </label>
            <input
              type="date"
              value={filterOdDatumu}
              onChange={(e) => setFilterOdDatumu(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Dátum do */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Do dátumu
            </label>
            <input
              type="date"
              value={filterDoDatumu}
              onChange={(e) => setFilterDoDatumu(e.target.value)}
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
      </div>

      {/* Nadchádzajúce zápasy */}
      {upcomingMatches.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          padding: '20px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '16px'
          }}>
            📅 Nadchádzajúce zápasy / Zápasy bez výsledku
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingMatches.slice(0, 5).map(zapas => (
              <div
                key={zapas.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getStatusColor(zapas.status, (zapas as any).actual_status)
                  }} />
                  <div>
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>
                      {getMatchDisplayName(zapas)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {zapas.liga?.nazov || zapas.liga_nazov || 'Bez ligy'} • {formatDate(zapas.datum_cas)} {formatTime(zapas.datum_cas)}
                      {zapas.miesto && ` • ${zapas.miesto}`}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Zobraz typ zápasu */}
                  {(zapas as any).match_type === 'without_result' && (
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: '#fef3c7',
                      color: '#92400e'
                    }}>
                      Bez výsledku
                    </span>
                  )}
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: '#dbeafe',
                    color: '#1e40af'
                  }}>
                    {formatStatus((zapas as any).actual_status || zapas.status)}
                  </span>
                  {zapas.vysledok && zapas.vysledok !== '-:-' && (
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: '#10b981',
                      color: 'white'
                    }}>
                      {zapas.vysledok}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zoznam všetkých zápasov */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {sortedZapasy.length === 0 ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚽</div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Žiadne zápasy</h3>
            <p>
              {searchTerm || filterLiga || filterTim || filterStatus || filterOdDatumu || filterDoDatumu
                ? 'Skúste zmeniť filtre alebo vyhľadávací výraz.'
                : 'Začnite pridaním prvého zápasu.'
              }
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={selectedZapasy.length === sortedZapasy.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedZapasy(sortedZapasy.map(z => z.id));
                        } else {
                          setSelectedZapasy([]);
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <button
                      onClick={() => handleSort('zapas')}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Zápas
                      {sortField === 'zapas' && (
                        <span style={{ fontSize: '12px' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>
                    <button
                      onClick={() => handleSort('liga')}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Liga
                      {sortField === 'liga' && (
                        <span style={{ fontSize: '12px' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>
                    <button
                      onClick={() => handleSort('datum_cas')}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Dátum & čas
                      {sortField === 'datum_cas' && (
                        <span style={{ fontSize: '12px' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>
                    <button
                      onClick={() => handleSort('kolo')}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Kolo
                      {sortField === 'kolo' && (
                        <span style={{ fontSize: '12px' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>
                    <button
                      onClick={() => handleSort('status')}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Status
                      {sortField === 'status' && (
                        <span style={{ fontSize: '12px' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Výsledok</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Akcie</th>
                </tr>
              </thead>
              <tbody>
                {sortedZapasy.map((zapas, index) => (
                  <tr
                    key={zapas.id}
                    style={{
                      borderTop: index > 0 ? '1px solid #f1f5f9' : 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedZapasy.includes(zapas.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedZapasy(prev => [...prev, zapas.id]);
                            } else {
                              setSelectedZapasy(prev => prev.filter(id => id !== zapas.id));
                            }
                          }}
                          style={{ marginRight: '12px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                            {getMatchDisplayName(zapas)}
                          </div>
                          {zapas.miesto && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              📍 {zapas.miesto}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#374151' }}>
                      {/* OPRAVENÉ: Prioritne zobrazujeme custom názvy */}
                      {zapas.liga_nazov || zapas.liga?.nazov || '-'}
                      {zapas.liga?.sezona && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {zapas.liga.sezona}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#374151' }}>
                      <div>{formatDate(zapas.datum_cas)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {formatTime(zapas.datum_cas)}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#374151' }}>
                      {zapas.kolo || '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: `${getStatusColor(zapas.status, (zapas as any).actual_status)}20`,
                        color: getStatusColor(zapas.status, (zapas as any).actual_status)
                      }}>
                        {formatStatus((zapas as any).actual_status || zapas.status)}
                      </span>
                      {/* Indikátor ak je status automaticky zmenený */}
                      {(zapas as any).actual_status && (zapas as any).actual_status !== zapas.status && (
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          Auto: {formatStatus((zapas as any).actual_status)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {zapas.vysledok && zapas.vysledok !== '-:-' ? (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: '600',
                          background: '#10b981',
                          color: 'white'
                        }}>
                          {zapas.vysledok}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>
                          Bez výsledku
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {zapas.video_url && (
                          <button
                            onClick={() => window.open(zapas.video_url, '_blank')}
                            style={{
                              padding: '6px 10px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                            title="Otvoriť video"
                          >
                            📹
                          </button>
                        )}
                        {zapas.fotogaleria_id && (
                          <button
                            onClick={() => {/* TODO: implementovať odkaz na fotogalériu */}}
                            style={{
                              padding: '6px 10px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                            title="Otvoriť fotogalériu"
                          >
                            📸
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(zapas)}
                          style={{
                            padding: '6px 10px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                          title="Upraviť"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(zapas.id)}
                          style={{
                            padding: '6px 10px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
                          title="Vymazať"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal pre pridanie/úpravu zápasu */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                margin: 0
              }}>
                {editingZapas ? 'Upraviť zápas' : 'Pridať nový zápas'}
              </h2>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Error message */}
            {modalError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '20px',
                color: '#dc2626'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '24px'
              }}>
                {/* Domáci tím */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Domáci tím <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isCustomDomaciTim}
                        onChange={(e) => {
                          setIsCustomDomaciTim(e.target.checked);
                          if (e.target.checked) {
                            updateFormData('domaci_tim_id', undefined);
                          } else {
                            updateFormData('domaci_tim_nazov', '');
                          }
                        }}
                      />
                      Vlastný názov tímu (nie je v databáze)
                    </label>
                  </div>
                  
                  {isCustomDomaciTim ? (
                    <input
                      type="text"
                      value={formData.domaci_tim_nazov || ''}
                      onChange={(e) => updateFormData('domaci_tim_nazov', e.target.value)}
                      placeholder="Názov domáceho tímu"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${validationErrors.domaci_tim ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <select
                      value={formData.domaci_tim_id || ''}
                      onChange={(e) => updateFormData('domaci_tim_id', e.target.value ? Number(e.target.value) : undefined)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${validationErrors.domaci_tim ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Vyberte domáci tím</option>
                      {timy.map(tim => (
                        <option key={tim.id} value={tim.id}>
                          {tim.nazov} ({tim.vekova_kategoria})
                        </option>
                      ))}
                    </select>
                  )}
                  {validationErrors.domaci_tim && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.domaci_tim}
                    </div>
                  )}
                </div>

                {/* Hosťujúci tím */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Hosťujúci tím <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isCustomHostujuciTim}
                        onChange={(e) => {
                          setIsCustomHostujuciTim(e.target.checked);
                          if (e.target.checked) {
                            updateFormData('hostujuci_tim_id', undefined);
                          } else {
                            updateFormData('hostujuci_tim_nazov', '');
                          }
                        }}
                      />
                      Vlastný názov tímu (nie je v databáze)
                    </label>
                  </div>
                  
                  {isCustomHostujuciTim ? (
                    <input
                      type="text"
                      value={formData.hostujuci_tim_nazov || ''}
                      onChange={(e) => updateFormData('hostujuci_tim_nazov', e.target.value)}
                      placeholder="Názov hosťujúceho tímu"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${validationErrors.hostujuci_tim ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <select
                      value={formData.hostujuci_tim_id || ''}
                      onChange={(e) => updateFormData('hostujuci_tim_id', e.target.value ? Number(e.target.value) : undefined)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${validationErrors.hostujuci_tim ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Vyberte hosťujúci tím</option>
                      {timy.map(tim => (
                        <option key={tim.id} value={tim.id}>
                          {tim.nazov} ({tim.vekova_kategoria})
                        </option>
                      ))}
                    </select>
                  )}
                  {validationErrors.hostujuci_tim && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.hostujuci_tim}
                    </div>
                  )}
                </div>

                {/* Dátum a čas */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Dátum a čas <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.datum_cas}
                    onChange={(e) => updateFormData('datum_cas', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.datum_cas ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.datum_cas && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.datum_cas}
                    </div>
                  )}
                </div>

                {/* Liga */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Liga (povinné) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isCustomLiga}
                        onChange={(e) => {
                          setIsCustomLiga(e.target.checked);
                          if (e.target.checked) {
                            updateFormData('liga_id', undefined);
                          } else {
                            updateFormData('liga_nazov', '');
                          }
                        }}
                      />
                      Vlastný názov ligy (nie je v databáze)
                    </label>
                  </div>
                  
                  {isCustomLiga ? (
                    <input
                      type="text"
                      value={formData.liga_nazov || ''}
                      onChange={(e) => updateFormData('liga_nazov', e.target.value)}
                      placeholder="Názov ligy"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <select
                      value={formData.liga_id || ''}
                      onChange={(e) => updateFormData('liga_id', e.target.value ? Number(e.target.value) : undefined)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Vyberte ligu</option>
                      {ligy.map(liga => (
                        <option key={liga.id} value={liga.id}>
                          {liga.nazov} ({liga.sezona})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Kolo */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Kolo (voliteľné)
                  </label>
                  <input
                    type="text"
                    value={formData.kolo || ''}
                    onChange={(e) => updateFormData('kolo', e.target.value)}
                    placeholder="napr. 15. kolo, semifinále..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Miesto konania */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Miesto konania (voliteľné)
                  </label>
                  <input
                    type="text"
                    value={formData.miesto || ''}
                    onChange={(e) => updateFormData('miesto', e.target.value)}
                    placeholder="napr. Štadión Dukla Zlaté Moravce"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => updateFormData('status', e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="naplanovany">Naplánovaný</option>
                    <option value="prebieha">Prebieha</option>
                    <option value="ukonceny">Ukončený</option>
                    <option value="odlozeny">Odložený</option>
                    <option value="zruseny">Zrušený</option>
                  </select>
                </div>

                {/* Góly domáci */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Góly domáci
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.goly_domaci ?? ''}
                    onChange={(e) => updateFormData('goly_domaci', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.goly_domaci ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.goly_domaci && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.goly_domaci}
                    </div>
                  )}
                </div>

                {/* Góly hostia */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Góly hostia
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.goly_hostia ?? ''}
                    onChange={(e) => updateFormData('goly_hostia', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.goly_hostia ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.goly_hostia && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.goly_hostia}
                    </div>
                  )}
                </div>

                {/* Počet divákov */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Počet divákov
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={formData.pocet_divakov ?? ''}
                    onChange={(e) => updateFormData('pocet_divakov', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.pocet_divakov ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.pocet_divakov && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.pocet_divakov}
                    </div>
                  )}
                </div>

                {/* Video URL */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={formData.video_url || ''}
                    onChange={(e) => updateFormData('video_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.video_url ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.video_url && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.video_url}
                    </div>
                  )}
                </div>

                {/* Poznámky */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Poznámky
                  </label>
                  <textarea
                    value={formData.poznamky || ''}
                    onChange={(e) => updateFormData('poznamky', e.target.value)}
                    placeholder="Doplňujúce informácie o zápase..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* TODO: Pridať súvisiaci článok a fotogalériu keď budú implementované */}
                {/* Článok ID */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    ID súvisiaceho článku
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.clanok_id ?? ''}
                    onChange={(e) => updateFormData('clanok_id', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="ID článku"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Voliteľné prepojenie na článok o zápase
                  </div>
                </div>

                {/* Fotogaléria ID */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    ID fotogalérie
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.fotogaleria_id ?? ''}
                    onChange={(e) => updateFormData('fotogaleria_id', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="ID fotogalérie"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Voliteľné prepojenie na fotogalériu zo zápasu
                  </div>
                </div>
              </div>

              {/* Modal buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 20px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                >
                  {editingZapas ? 'Uložiť zmeny' : 'Pridať zápas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZapasManagement;