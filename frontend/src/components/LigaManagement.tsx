// frontend/src/components/LigaManagement.tsx
// Komponenta pre správu líg a súťaží - FÁZA 4

import React, { useState, useEffect } from 'react';

interface Liga {
  id: number;
  nazov: string;
  sezona: string;
  typ: 'sutaz' | 'pohar' | 'priatelska';
  popis?: string;
  externy_url?: string;
  datum_start?: string;
  datum_koniec?: string;
  logo?: string;
  farba?: string;
  aktivity: boolean;
  pocet_zapasov?: number;
  pocet_timov?: number;
  vytvoreny: string;
  aktualizovany: string;
}

interface LigaFormData {
  nazov: string;
  sezona: string;
  typ: 'sutaz' | 'pohar' | 'priatelska';
  popis: string;
  externy_url: string;
  datum_start: string;
  datum_koniec: string;
  logo: string;
  farba: string;
}

interface User {
  id: number;
  meno: string;
  email: string;
  rola: 'admin' | 'redaktor' | 'trener' | 'uzivatel';
}

interface LigaManagementProps {
  user: User;
}

const LigaManagement: React.FC<LigaManagementProps> = ({ user }) => {
  const [ligy, setLigy] = useState<Liga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTyp, setFilterTyp] = useState<string>('');
  const [filterSezona, setFilterSezona] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLiga, setEditingLiga] = useState<Liga | null>(null);
  const [selectedLigy, setSelectedLigy] = useState<number[]>([]);

  // Form data
  const [formData, setFormData] = useState<LigaFormData>({
    nazov: '',
    sezona: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
    typ: 'sutaz',
    popis: '',
    externy_url: '',
    datum_start: '',
    datum_koniec: '',
    logo: '',
    farba: '#3b82f6'
  });

  // Validácia formulára
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Prednastavené farby pre ligy
  const predefinedColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    '#6366f1', '#ec4899', '#14b8a6', '#f87171'
  ];

  // Načítanie líg z API
  const fetchLigy = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterTyp) params.append('typ', filterTyp);
      if (filterSezona) params.append('sezona', filterSezona);
      params.append('include_stats', 'true');

      const response = await fetch(`http://localhost:3000/api/leagues?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setLigy(data.data);
        setError('');
      } else {
        setError(data.message || 'Chyba pri načítaní líg');
      }
    } catch (err) {
      console.error('Chyba pri načítaní líg:', err);
      setError(err instanceof Error ? err.message : 'Neočakávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie pri spustení komponenta a zmene filtrov
  useEffect(() => {
    fetchLigy();
  }, [searchTerm, filterTyp, filterSezona]);

  // Validácia formulára
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.nazov.trim()) {
      errors.nazov = 'Názov je povinný';
    } else if (formData.nazov.length < 3) {
      errors.nazov = 'Názov musí mať aspoň 3 znaky';
    } else if (formData.nazov.length > 100) {
      errors.nazov = 'Názov môže mať maximálne 100 znakov';
    }

    if (!formData.sezona.trim()) {
      errors.sezona = 'Sezóna je povinná';
    } else if (!/^\d{4}\/\d{4}$/.test(formData.sezona)) {
      errors.sezona = 'Sezóna musí byť vo formáte YYYY/YYYY (napr. 2024/2025)';
    }

    if (formData.externy_url && !/^https?:\/\/.+/.test(formData.externy_url)) {
      errors.externy_url = 'URL musí začínať http:// alebo https://';
    }

    if (formData.datum_start && formData.datum_koniec) {
      const startDate = new Date(formData.datum_start);
      const endDate = new Date(formData.datum_koniec);
      if (startDate >= endDate) {
        errors.datum_koniec = 'Dátum ukončenia musí byť po dátume začiatku';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Uloženie ligy
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const url = editingLiga 
        ? `http://localhost:3000/api/leagues/${editingLiga.id}`
        : 'http://localhost:3000/api/leagues';
      
      const method = editingLiga ? 'PUT' : 'POST';

      // Pripravenie dát - iba s vyplnenými poľami
      const dataToSend: any = {
        nazov: formData.nazov,
        sezona: formData.sezona,
        typ: formData.typ,
        farba: formData.farba
      };
      
      // Pridanie voliteľných polí len ak sú vyplnené
      if (formData.popis && formData.popis.trim() !== '') {
        dataToSend.popis = formData.popis.trim();
      }
      
      if (formData.externy_url && formData.externy_url.trim() !== '') {
        dataToSend.externy_url = formData.externy_url.trim();
      }
      
      if (formData.logo && formData.logo.trim() !== '') {
        dataToSend.logo = formData.logo.trim();
      }
      
      if (formData.datum_start && formData.datum_start.trim() !== '') {
        dataToSend.datum_start = formData.datum_start;
      }
      
      if (formData.datum_koniec && formData.datum_koniec.trim() !== '') {
        dataToSend.datum_koniec = formData.datum_koniec;
      }

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        await fetchLigy(); // Obnovenie zoznamu
        handleCloseModal();
        setError('');
      } else {
        // Spracovanie chybových hlášok
        if (response.status === 409) {
          setError('Liga s týmto názvom a sezónou už existuje');
        } else if (response.status === 400 && data.errors) {
          setError('Validačné chyby: ' + data.errors.join(', '));
        } else {
          setError(data.message || `Chyba servera (${response.status})`);
        }
      }
    } catch (err) {
      console.error('Chyba pri ukladaní:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní');
    }
  };

  // Vymazanie ligy
  const handleDelete = async (ligaId: number) => {
    const liga = ligy.find(l => l.id === ligaId);
    if (!liga) return;

    if (!window.confirm(`Naozaj chcete vymazať ligu "${liga.nazov}"?\n\nUpozornenie: Vymaže sa aj všetky súvisiace zápasy!`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/leagues/${ligaId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchLigy(); // Obnovenie zoznamu
        setError('');
      } else {
        setError(data.message || 'Chyba pri mazaní');
      }
    } catch (err) {
      console.error('Chyba pri mazaní:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri mazaní');
    }
  };

  // Bulk akcie
  const handleBulkDelete = async () => {
    if (selectedLigy.length === 0) return;

    if (!window.confirm(`Naozaj chcete vymazať ${selectedLigy.length} líg?\n\nUpozornenie: Vymaže sa aj všetky súvisiace zápasy!`)) {
      return;
    }

    try {
      const promises = selectedLigy.map(id => 
        fetch(`http://localhost:3000/api/leagues/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      );

      await Promise.all(promises);
      await fetchLigy();
      setSelectedLigy([]);
      setError('');
    } catch (err) {
      console.error('Chyba pri bulk mazaní:', err);
      setError('Chyba pri mazaní vybraných líg');
    }
  };

  // Otvorenie modalu pre pridanie
  const handleOpenAddModal = () => {
    setEditingLiga(null);
    setFormData({
      nazov: '',
      sezona: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
      typ: 'sutaz',
      popis: '',
      externy_url: '',
      datum_start: '',
      datum_koniec: '',
      logo: '',
      farba: '#3b82f6'
    });
    setValidationErrors({});
    setShowAddModal(true);
  };

  // Otvorenie modalu pre úpravu
  const handleOpenEditModal = (liga: Liga) => {
    setEditingLiga(liga);
    setFormData({
      nazov: liga.nazov,
      sezona: liga.sezona,
      typ: liga.typ,
      popis: liga.popis || '',
      externy_url: liga.externy_url || '',
      datum_start: liga.datum_start || '',
      datum_koniec: liga.datum_koniec || '',
      logo: liga.logo || '',
      farba: liga.farba || '#3b82f6'
    });
    setValidationErrors({});
    setShowAddModal(true);
  };

  // Zatvorenie modalu
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingLiga(null);
    setValidationErrors({});
  };

  // Update form data
  const updateFormData = (field: keyof LigaFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Vymazanie validation error pre toto pole
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Získanie unique sezón pre filter
  const getUniqueSezony = () => {
    const sezony = Array.from(new Set(ligy.map(liga => liga.sezona)));
    return sezony.sort().reverse(); // Najnovšie sezóny hore
  };

  // Formátovanie typu ligy
  const formatTypLigy = (typ: string) => {
    const typy = {
      sutaz: 'Súťaž',
      pohar: 'Pohár',
      priatelska: 'Priateľská'
    };
    return typy[typ as keyof typeof typy] || typ;
  };

  // Formátovanie dátumu
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('sk-SK');
  };

  // Filter líg
  const filteredLigy = ligy.filter(liga => {
    const matchesSearch = !searchTerm || 
      liga.nazov.toLowerCase().includes(searchTerm.toLowerCase()) ||
      liga.sezona.includes(searchTerm) ||
      (liga.popis && liga.popis.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTyp = !filterTyp || liga.typ === filterTyp;
    const matchesSezona = !filterSezona || liga.sezona === filterSezona;

    return matchesSearch && matchesTyp && matchesSezona;
  });

  // Loading state
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
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          <div>Načítavam ligy...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
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
              🏆 Ligy & Súťaže
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: '0'
            }}>
              Správa súťaží, líg a turnajov
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedLigy.length > 0 && (
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
                🗑️ Vymazať vybrané ({selectedLigy.length})
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
              ➕ Pridať ligu
            </button>
          </div>
        </div>

        {/* Stats */}
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
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>CELKOVO LÍG</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{ligy.length}</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>AKTÍVNYCH</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
              {ligy.filter(l => l.aktivity).length}
            </div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>ZÁPASOV CELKOVO</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
              {ligy.reduce((sum, liga) => sum + (liga.pocet_zapasov || 0), 0)}
            </div>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px'
        }}>
          {/* Search */}
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
              placeholder="Názov, sezóna, popis..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Typ filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Typ súťaže
            </label>
            <select
              value={filterTyp}
              onChange={(e) => setFilterTyp(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky typy</option>
              <option value="sutaz">Súťaž</option>
              <option value="pohar">Pohár</option>
              <option value="priatelska">Priateľská</option>
            </select>
          </div>

          {/* Sezóna filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Sezóna
            </label>
            <select
              value={filterSezona}
              onChange={(e) => setFilterSezona(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky sezóny</option>
              {getUniqueSezony().map(sezona => (
                <option key={sezona} value={sezona}>{sezona}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {filteredLigy.length === 0 ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Žiadne ligy</h3>
            <p>
              {searchTerm || filterTyp || filterSezona
                ? 'Skúste zmeniť filtre alebo vyhľadávací výraz.'
                : 'Začnite pridaním prvej ligy.'
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
                      checked={selectedLigy.length === filteredLigy.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLigy(filteredLigy.map(l => l.id));
                        } else {
                          setSelectedLigy([]);
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    Liga
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Sezóna</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Typ</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Zápasov</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Dátumy</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Akcie</th>
                </tr>
              </thead>
              <tbody>
                {filteredLigy.map((liga, index) => (
                  <tr 
                    key={liga.id}
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
                          checked={selectedLigy.includes(liga.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLigy(prev => [...prev, liga.id]);
                            } else {
                              setSelectedLigy(prev => prev.filter(id => id !== liga.id));
                            }
                          }}
                          style={{ marginRight: '12px' }}
                        />
                        <div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                          }}>
                            {liga.farba && (
                              <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: liga.farba
                              }} />
                            )}
                            <span style={{ fontWeight: '500', color: '#1e293b' }}>{liga.nazov}</span>
                          </div>
                          {liga.popis && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {liga.popis.substring(0, 60)}{liga.popis.length > 60 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#374151' }}>{liga.sezona}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: liga.typ === 'sutaz' ? '#dbeafe' : 
                                   liga.typ === 'pohar' ? '#fef3c7' :
                                   liga.typ === 'priatelska' ? '#f0f9ff' : '#f3e8ff',
                        color: liga.typ === 'sutaz' ? '#1e40af' : 
                               liga.typ === 'pohar' ? '#92400e' :
                               liga.typ === 'priatelska' ? '#0369a1' : '#6b21a8'
                      }}>
                        {formatTypLigy(liga.typ)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#374151' }}>
                      {liga.pocet_zapasov || 0}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                      {liga.datum_start && (
                        <div>Start: {formatDate(liga.datum_start)}</div>
                      )}
                      {liga.datum_koniec && (
                        <div>Koniec: {formatDate(liga.datum_koniec)}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: liga.aktivity ? '#dcfce7' : '#fee2e2',
                        color: liga.aktivity ? '#166534' : '#991b1b'
                      }}>
                        {liga.aktivity ? 'Aktívna' : 'Neaktívna'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {liga.externy_url && (
                          <button
                            onClick={() => window.open(liga.externy_url, '_blank')}
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
                            title="Otvoriť externý odkaz"
                          >
                            🔗
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(liga)}
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
                          onClick={() => handleDelete(liga.id)}
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

      {/* Modal for Add/Edit */}
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
            maxWidth: '600px',
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
                {editingLiga ? 'Upraviť ligu' : 'Pridať novú ligu'}
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

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {/* Názov */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Názov ligy <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nazov}
                    onChange={(e) => updateFormData('nazov', e.target.value)}
                    placeholder="napr. Slovenská ligovaliga"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.nazov ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.nazov && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.nazov}
                    </div>
                  )}
                </div>

                {/* Sezóna */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Sezóna <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sezona}
                    onChange={(e) => updateFormData('sezona', e.target.value)}
                    placeholder="2024/2025"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.sezona ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.sezona && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.sezona}
                    </div>
                  )}
                </div>

                {/* Typ */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Typ súťaže <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.typ}
                    onChange={(e) => updateFormData('typ', e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="liga">Liga</option>
                    <option value="pohár">Pohár</option>
                    <option value="turnaj">Turnaj</option>
                    <option value="priateľská">Priateľská</option>
                  </select>
                </div>

                {/* Dátum začiatku */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Dátum začiatku
                  </label>
                  <input
                    type="date"
                    value={formData.datum_start}
                    onChange={(e) => updateFormData('datum_start', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Dátum ukončenia */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Dátum ukončenia
                  </label>
                  <input
                    type="date"
                    value={formData.datum_koniec}
                    onChange={(e) => updateFormData('datum_koniec', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.datum_koniec ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.datum_koniec && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.datum_koniec}
                    </div>
                  )}
                </div>

                {/* Farba */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Farba ligy
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={formData.farba}
                      onChange={(e) => updateFormData('farba', e.target.value)}
                      style={{
                        width: '40px',
                        height: '40px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {predefinedColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateFormData('farba', color)}
                          style={{
                            width: '24px',
                            height: '24px',
                            background: color,
                            border: formData.farba === color ? '2px solid #1e293b' : '1px solid #e2e8f0',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Popis */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Popis
                  </label>
                  <textarea
                    value={formData.popis}
                    onChange={(e) => updateFormData('popis', e.target.value)}
                    placeholder="Krátky popis ligy..."
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

                {/* Externý URL */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Externý odkaz (tabuľka, web)
                  </label>
                  <input
                    type="url"
                    value={formData.externy_url}
                    onChange={(e) => updateFormData('externy_url', e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.externy_url ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.externy_url && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.externy_url}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Voliteľný odkaz na oficiálnu tabuľku alebo web súťaže
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
                  {editingLiga ? 'Uložiť zmeny' : 'Pridať ligu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LigaManagement;