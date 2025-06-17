// frontend/src/components/StaffManagementAdmin.tsx
// Komponenta pre správu realizačného tímu v admin dashboarde

import React, { useState, useEffect } from 'react';
import { staffApi, teamsApi, Staff, Team } from '../services/teamsApi';

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

interface StaffManagementAdminProps {
  currentUser: User;
}

const StaffManagementAdmin: React.FC<StaffManagementAdminProps> = ({ currentUser }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number>(0);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [showClubStaff, setShowClubStaff] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Možné funkcie realizačného tímu
  const functions = [
    'hlavný tréner',
    'asistent trénera',
    'tréner brankárov',
    'fyzioterapeut',
    'lekár',
    'masér',
    'manažer',
    'sekretár',
    'vedúci mužstva',
    'skaut',
    'kondičný tréner',
    'mentálny kouč',
    'predseda klubu',
    'ostatné'
  ];

  // Načítanie členov realizačného tímu
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await staffApi.getStaff({
        tim_id: selectedTeam || undefined,
        funkcia: selectedFunction || undefined,
        search: searchTerm || undefined,
        include_team: true,
        klubovi: showClubStaff ? true : undefined,
      });

      if (response.success) {
        setStaff(response.data);
        setError('');
      } else {
        setError('Chyba pri načítaní realizačného tímu');
      }
    } catch (err) {
      console.error('Chyba pri načítaní realizačného tímu:', err);
      setError(err instanceof Error ? err.message : 'Neočakávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie tímov pre filter
  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getTeams();
      if (response.success) {
        setTeams(response.data);
      }
    } catch (err) {
      console.error('Chyba pri načítaní tímov:', err);
    }
  };

  // Načítanie dát pri spustení a zmene filtrov
  useEffect(() => {
    fetchStaff();
  }, [searchTerm, selectedTeam, selectedFunction, showClubStaff]);

  useEffect(() => {
    fetchTeams();
  }, []);

  // Vymazanie člena realizačného tímu
  const handleDeleteStaff = async (staffId: number) => {
    if (!window.confirm('Naozaj chcete vymazať tohto člena realizačného tímu?')) {
      return;
    }

    try {
      await staffApi.deleteStaff(staffId);
      await fetchStaff(); // Obnovenie zoznamu
    } catch (err) {
      console.error('Chyba pri mazaní člena realizačného tímu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri mazaní člena realizačného tímu');
    }
  };

  // Formátovanie dátumu
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('sk-SK');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          Správa realizačného tímu
        </h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Spravujte členov realizačného tímu klubu
        </p>
      </div>

      {/* Akcie a filtrovanie */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Pridať člena
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Vyhľadávanie */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Vyhľadávanie
            </label>
            <input
              type="text"
              placeholder="Hľadať člena..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Filter tímu */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Tím
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(Number(e.target.value));
                setShowClubStaff(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="0">Všetky tímy</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.nazov} {team.vekova_kategoria}
                </option>
              ))}
            </select>
          </div>

          {/* Filter funkcie */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Funkcia
            </label>
            <select
              value={selectedFunction}
              onChange={(e) => setSelectedFunction(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky funkcie</option>
              {functions.map((func) => (
                <option key={func} value={func}>
                  {func}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox pre klubových členov */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="clubStaff"
              checked={showClubStaff}
              onChange={(e) => {
                setShowClubStaff(e.target.checked);
                if (e.target.checked) {
                  setSelectedTeam(0);
                }
              }}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="clubStaff" style={{ fontSize: '14px', fontWeight: '500' }}>
              Len kluboví členovia
            </label>
          </div>
        </div>

        <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
          <strong>{staff.length}</strong> členov realizačného tímu
        </div>
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

      {/* Zoznam členov realizačného tímu */}
      {!loading && (
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {staff.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Člen
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Funkcia
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Tím
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Kontakt
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Kvalifikácia
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Akcie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member, index) => (
                    <tr 
                      key={member.id} 
                      style={{ 
                        borderBottom: index < staff.length - 1 ? '1px solid #f1f5f9' : 'none'
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: '#e5e7eb',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {member.fotka ? (
                              <img 
                                src={member.fotka} 
                                alt={member.full_name}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontSize: '20px' }}>👤</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: '500', color: '#1f2937' }}>
                              {member.full_name}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              {member.vek && `${member.vek} rokov`}
                              {member.datum_narodenia && ` • ${formatDate(member.datum_narodenia)}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#d1fae5',
                          color: '#065f46'
                        }}>
                          {member.funkcia}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                        {member.tim ? (
                          <div>
                            <div style={{ fontWeight: '500' }}>{member.tim.nazov}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{member.tim.vekova_kategoria}</div>
                          </div>
                        ) : (
                          <span style={{ 
                            color: '#8b5cf6', 
                            fontSize: '12px', 
                            fontWeight: '500',
                            backgroundColor: '#f3e8ff',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            Celý klub
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {member.ma_kontakt ? (
                          <div style={{ fontSize: '14px' }}>
                            {member.kontakt.email && (
                              <div style={{ marginBottom: '4px' }}>
                                📧 {member.kontakt.email}
                              </div>
                            )}
                            {member.kontakt.telefon && (
                              <div>
                                📞 {member.kontakt.telefon}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '14px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {member.kvalifikacia ? (
                          <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.kvalifikacia}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingStaff(member);
                              setShowAddForm(true);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#3b82f6',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Upraviť
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Vymazať
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#374151' }}>Žiadny realizačný tím</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {searchTerm || selectedTeam || selectedFunction || showClubStaff ? 'Pre zadané kritériá neboli nájdení žiadni členovia.' : 'Zatiaľ nie sú vytvorení žiadni členovia realizačného tímu.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Formulár pre pridanie/úpravu člena realizačného tímu */}
      {showAddForm && (
        <StaffForm
          staff={editingStaff}
          teams={teams}
          functions={functions}
          onClose={() => {
            setShowAddForm(false);
            setEditingStaff(null);
          }}
          onSave={() => {
            setShowAddForm(false);
            setEditingStaff(null);
            fetchStaff();
          }}
        />
      )}

      {/* CSS pre animácie */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

// Komponenta pre formulár člena realizačného tímu
interface StaffFormProps {
  staff?: Staff | null;
  teams: Team[];
  functions: string[];
  onClose: () => void;
  onSave: () => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ staff, teams, functions, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    meno: staff?.meno || '',
    priezvisko: staff?.priezvisko || '',
    funkcia: staff?.funkcia || '',
    email: staff?.email || '',
    telefon: staff?.telefon || '',
    datum_narodenia: staff?.datum_narodenia ? staff.datum_narodenia.split('T')[0] : '',
    kvalifikacia: staff?.kvalifikacia || '',
    tim_id: staff?.tim_id || null,
    poznamky: staff?.poznamky || '',
    poradie: staff?.poradie || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const staffData = {
        ...formData,
        tim_id: formData.tim_id || undefined,
        email: formData.email || undefined,
        telefon: formData.telefon || undefined,
        datum_narodenia: formData.datum_narodenia || undefined,
        kvalifikacia: formData.kvalifikacia || undefined,
        poznamky: formData.poznamky || undefined,
        poradie: Number(formData.poradie) || 0,
      };

      if (staff) {
        await staffApi.updateStaff(staff.id, staffData);
      } else {
        await staffApi.createStaff(staffData as any);
      }

      onSave();
    } catch (err) {
      console.error('Chyba pri ukladaní člena realizačného tímu:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní člena realizačného tímu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {staff ? 'Upraviť člena realizačného tímu' : 'Pridať nového člena realizačného tímu'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Meno */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Meno *
              </label>
              <input
                type="text"
                required
                value={formData.meno}
                onChange={(e) => setFormData({ ...formData, meno: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Priezvisko */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Priezvisko *
              </label>
              <input
                type="text"
                required
                value={formData.priezvisko}
                onChange={(e) => setFormData({ ...formData, priezvisko: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Funkcia */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Funkcia *
              </label>
              <select
                required
                value={formData.funkcia}
                onChange={(e) => setFormData({ ...formData, funkcia: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Vyberte funkciu</option>
                {functions.map((func) => (
                  <option key={func} value={func}>
                    {func}
                  </option>
                ))}
              </select>
            </div>

            {/* Tím */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Tím
              </label>
              <select
                value={formData.tim_id || ''}
                onChange={(e) => setFormData({ ...formData, tim_id: e.target.value ? Number(e.target.value) : null })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Celý klub (žiadny konkrétny tím)</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.nazov} {team.vekova_kategoria}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Telefón */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Telefón
              </label>
              <input
                type="tel"
                value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Dátum narodenia */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Dátum narodenia
              </label>
              <input
                type="date"
                value={formData.datum_narodenia}
                onChange={(e) => setFormData({ ...formData, datum_narodenia: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Poradie */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Poradie
              </label>
              <input
                type="number"
                min="0"
                value={formData.poradie}
                onChange={(e) => setFormData({ ...formData, poradie: Number(e.target.value) })}
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

          {/* Kvalifikácia */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Kvalifikácia
            </label>
            <textarea
              rows={2}
              placeholder="napr. UEFA A licencia, Magister športového managementu"
              value={formData.kvalifikacia}
              onChange={(e) => setFormData({ ...formData, kvalifikacia: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Poznámky */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Poznámky
            </label>
            <textarea
              rows={3}
              value={formData.poznamky}
              onChange={(e) => setFormData({ ...formData, poznamky: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Tlačidlá */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Ukladám...' : (staff ? 'Aktualizovať' : 'Pridať člena')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffManagementAdmin;