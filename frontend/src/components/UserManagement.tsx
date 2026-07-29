// frontend/src/components/UserManagement.tsx
// Komponenta pre správu používateľov

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

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

interface UserFormData {
  meno: string;
  email: string;
  heslo: string;
  rola: 'admin' | 'redaktor' | 'trener' | 'uzivatel';
  tim_id?: number;
}

interface UserManagementProps {
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Formulárové dáta
  const [formData, setFormData] = useState<UserFormData>({
    meno: '',
    email: '',
    heslo: '',
    rola: 'uzivatel',
  });

  // Načítanie používateľov
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('clubw_token');
      
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filterRole) queryParams.append('role', filterRole);
      if (filterActive) queryParams.append('active', filterActive);

      const response = await fetch(
        apiUrl(`/users?${queryParams.toString()}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
      } else {
        setError(data.message || 'Chyba pri načítavaní používateľov');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Načítanie pri prvom renderovaní a pri zmene filtrov
  useEffect(() => {
    fetchUsers();
  }, [searchTerm, filterRole, filterActive]);

  // Spracovanie formulára
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(''); // Vyčistíme predchádzajúce chyby

    // Frontend validácia
    const validationErrors: string[] = [];
    
    if (formData.meno.trim().length < 2) {
      validationErrors.push('Meno musí mať aspoň 2 znaky');
    }
    
    if (!formData.email.includes('@')) {
      validationErrors.push('Neplatný email formát');
    }
    
    if (!editingUser && formData.heslo.length < 6) {
      validationErrors.push('Heslo musí mať aspoň 6 znakov');
    }
    
    if (editingUser && formData.heslo && formData.heslo.length < 6) {
      validationErrors.push('Nové heslo musí mať aspoň 6 znakov');
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('clubw_token');
      const url = editingUser 
        ? apiUrl(`/users/${editingUser.id}`)
        : apiUrl('/users');
      
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { ...formData, heslo: formData.heslo || undefined } // Heslo voliteľné pri úprave
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchUsers(); // Reload zoznamu
        resetForm();
        setShowAddModal(false);
        setEditingUser(null);
      } else {
        // Spracovanie chýb z backendu
        if (data.errors && Array.isArray(data.errors)) {
          // Validačné chyby z express-validator
          const errorMessages = data.errors.map((err: any) => err.msg || err.message).join(', ');
          setError(errorMessages);
        } else {
          // Ostatné chyby
          setError(data.message || 'Chyba pri ukladaní používateľa');
        }
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  // Reset formulára
  const resetForm = () => {
    setFormData({
      meno: '',
      email: '',
      heslo: '',
      rola: 'uzivatel',
    });
    setError('');
  };

  // Prepnutie aktivity používateľa
  const toggleUserStatus = async (userId: number) => {
    if (userId === currentUser.id) {
      setError('Nemôžete deaktivovať svoj vlastný účet');
      return;
    }

    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(
        apiUrl(`/users/${userId}/toggle-status`),
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        await fetchUsers(); // Reload zoznamu
      } else {
        setError(data.message || 'Chyba pri zmene stavu používateľa');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    }
  };

  // Vymazanie používateľa
  const deleteUser = async (userId: number) => {
    if (userId === currentUser.id) {
      setError('Nemôžete vymazať svoj vlastný účet');
      return;
    }

    if (!window.confirm('Naozaj chcete vymazať tohto používateľa?')) {
      return;
    }

    try {
      const token = localStorage.getItem('clubw_token');
      const response = await fetch(apiUrl(`/users/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        await fetchUsers(); // Reload zoznamu
      } else {
        setError(data.message || 'Chyba pri vymazávaní používateľa');
      }
    } catch (err) {
      setError('Chyba spojenia so serverom');
    }
  };

  // Otvorenie úpravy používateľa
  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      meno: user.meno,
      email: user.email,
      heslo: '', // Prázdne heslo pri úprave
      rola: user.rola,
      tim_id: user.tim_id,
    });
    setError(''); // Vyčistíme chyby
    setShowAddModal(true);
  };

  // Získanie ikony pre rolu
  const getRoleIcon = (rola: string) => {
    switch (rola) {
      case 'admin': return '👑';
      case 'redaktor': return '✍️';
      case 'trener': return '⚽';
      default: return '👤';
    }
  };

  // Získanie slovenského názvu role
  const getRoleName = (rola: string) => {
    switch (rola) {
      case 'admin': return 'Administrátor';
      case 'redaktor': return 'Redaktor';
      case 'trener': return 'Tréner';
      default: return 'Používateľ';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
          👥 Správa používateľov
        </h1>
        <button
          onClick={() => {
            resetForm();
            setError(''); // Vyčistíme chyby
            setShowAddModal(true);
          }}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          ➕ Pridať používateľa
        </button>
      </div>

      {/* Filtre */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Vyhľadávanie
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Meno alebo email..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Rola
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Všetky role</option>
              <option value="admin">Administrátor</option>
              <option value="redaktor">Redaktor</option>
              <option value="trener">Tréner</option>
              <option value="uzivatel">Používateľ</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Stav
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Všetci</option>
              <option value="true">Aktívni</option>
              <option value="false">Neaktívni</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chybová správa */}
      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #dc2626'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabuľka používateľov */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            Načítavam používateľov...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Používateľ
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Rola
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Stav
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Posledné prihlásenie
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Akcie
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>{user.meno}</div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>{user.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{getRoleIcon(user.rola)}</span>
                        <span style={{ fontSize: '14px', color: '#374151' }}>{getRoleName(user.rola)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: user.aktivity ? '#dcfce7' : '#fee2e2',
                        color: user.aktivity ? '#166534' : '#dc2626'
                      }}>
                        {user.aktivity ? 'Aktívny' : 'Neaktívny'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>
                      {user.posledne_prihlasenie 
                        ? new Date(user.posledne_prihlasenie).toLocaleString('sk-SK')
                        : 'Nikdy'
                      }
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => startEdit(user)}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Upraviť
                        </button>
                        
                        {user.id !== currentUser.id && (
                          <>
                            <button
                              onClick={() => toggleUserStatus(user.id)}
                              style={{
                                background: user.aktivity ? '#f59e0b' : '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              {user.aktivity ? '⏸️ Deaktivovať' : '▶️ Aktivovať'}
                            </button>
                            
                            <button
                              onClick={() => deleteUser(user.id)}
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Vymazať
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Žiadni používatelia neboli nájdení.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal pre pridanie/úpravu používateľa */}
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 'bold' }}>
              {editingUser ? 'Upraviť používateľa' : 'Pridať nového používateľa'}
            </h2>

            {/* Chybová správa v modali */}
            {error && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                borderLeft: '4px solid #dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Meno
                </label>
                <input
                  type="text"
                  value={formData.meno}
                  onChange={(e) => setFormData({ ...formData, meno: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Heslo {editingUser && <span style={{ color: '#64748b' }}>(nechajte prázdne pre zachovanie)</span>}
                </label>
                <input
                  type="password"
                  value={formData.heslo}
                  onChange={(e) => setFormData({ ...formData, heslo: e.target.value })}
                  required={!editingUser}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Rola
                </label>
                <select
                  value={formData.rola}
                  onChange={(e) => setFormData({ ...formData, rola: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="uzivatel">Používateľ</option>
                  <option value="trener">Tréner</option>
                  <option value="redaktor">Redaktor</option>
                  <option value="admin">Administrátor</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                    resetForm();
                    setError(''); // Vyčistíme chyby
                  }}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Ukladám...' : (editingUser ? 'Uložiť zmeny' : 'Pridať používateľa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;