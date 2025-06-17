// frontend/src/components/PlayersManagementAdmin.tsx
// Komponenta pre správu hráčov v admin dashboarde

import React, { useState, useEffect } from 'react';
import { playersApi, teamsApi, Player, Team } from '../services/teamsApi';

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

interface PlayersManagementAdminProps {
  currentUser: User;
}

const PlayersManagementAdmin: React.FC<PlayersManagementAdminProps> = ({ currentUser }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number>(0);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Možné pozície hráčov
  const positions = [
    'brankár',
    'obranca', 
    'stredopoliar',
    'útočník',
    'libero',
    'stoper',
    'wingback',
    'defenzívny stredopoliar',
    'ofenzívny stredopoliar',
    'krídelník',
    'druhý útočník'
  ];

  // Načítanie hráčov
  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await playersApi.getPlayers({
        tim_id: selectedTeam || undefined,
        pozicia: selectedPosition || undefined,
        search: searchTerm || undefined,
        include_team: true,
      });

      if (response.success) {
        setPlayers(response.data);
        setError('');
      } else {
        setError('Chyba pri načítaní hráčov');
      }
    } catch (err) {
      console.error('Chyba pri načítaní hráčov:', err);
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
    fetchPlayers();
  }, [searchTerm, selectedTeam, selectedPosition]);

  useEffect(() => {
    fetchTeams();
  }, []);

  // Vymazanie hráča
  const handleDeletePlayer = async (playerId: number) => {
    if (!window.confirm('Naozaj chcete vymazať tohto hráča?')) {
      return;
    }

    try {
      await playersApi.deletePlayer(playerId);
      await fetchPlayers(); // Obnovenie zoznamu
    } catch (err) {
      console.error('Chyba pri mazaní hráča:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri mazaní hráča');
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
          Správa hráčov
        </h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Spravujte všetkých hráčov klubu
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
            + Pridať hráča
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
              placeholder="Hľadať hráča..."
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
              onChange={(e) => setSelectedTeam(Number(e.target.value))}
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

          {/* Filter pozície */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Pozícia
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Všetky pozície</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          {/* Počet hráčov */}
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              <strong>{players.length}</strong> hráčov
            </div>
          </div>
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

      {/* Zoznam hráčov */}
      {!loading && (
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {players.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Hráč
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Pozícia
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Tím
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Vek
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Číslo
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Info
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                      Akcie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr 
                      key={player.id} 
                      style={{ 
                        borderBottom: index < players.length - 1 ? '1px solid #f1f5f9' : 'none'
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
                            {player.fotka ? (
                              <img 
                                src={player.fotka} 
                                alt={player.full_name}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontSize: '20px' }}>👤</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: '500', color: '#1f2937' }}>
                              {player.full_name}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              {player.narodnost && `${player.narodnost} • `}
                              {formatDate(player.datum_narodenia)}
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
                          backgroundColor: '#dbeafe',
                          color: '#1e40af'
                        }}>
                          {player.pozicia}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                        {player.tim ? (
                          <div>
                            <div style={{ fontWeight: '500' }}>{player.tim.nazov}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{player.tim.vekova_kategoria}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                        {player.vek} rokov
                      </td>
                      <td style={{ padding: '16px' }}>
                        {player.cislo_dresu ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            background: '#3b82f6',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            borderRadius: '50%'
                          }}>
                            {player.cislo_dresu}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        <div>
                          {player.vyska && (
                            <div>📏 {player.vyska} cm</div>
                          )}
                          {player.vaha && (
                            <div>⚖️ {player.vaha} kg</div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingPlayer(player);
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
                            onClick={() => handleDeletePlayer(player.id)}
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
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚽</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#374151' }}>Žiadni hráči</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {searchTerm || selectedTeam || selectedPosition ? 'Pre zadané kritériá neboli nájdení žiadni hráči.' : 'Zatiaľ nie sú vytvorení žiadni hráči.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Formulár pre pridanie/úpravu hráča */}
      {showAddForm && (
        <PlayerForm
          player={editingPlayer}
          teams={teams}
          onClose={() => {
            setShowAddForm(false);
            setEditingPlayer(null);
          }}
          onSave={() => {
            setShowAddForm(false);
            setEditingPlayer(null);
            fetchPlayers();
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

// Komponenta pre formulár hráča
interface PlayerFormProps {
  player?: Player | null;
  teams: Team[];
  onClose: () => void;
  onSave: () => void;
}

const PlayerForm: React.FC<PlayerFormProps> = ({ player, teams, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    meno: player?.meno || '',
    priezvisko: player?.priezvisko || '',
    datum_narodenia: player?.datum_narodenia ? player.datum_narodenia.split('T')[0] : '',
    pozicia: player?.pozicia || '',
    tim_id: player?.tim_id || 0,
    cislo_dresu: player?.cislo_dresu || '',
    narodnost: player?.narodnost || '',
    vaha: player?.vaha || '',
    vyska: player?.vyska || '',
    poznamky: player?.poznamky || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const positions = [
    'brankár', 'obranca', 'stredopoliar', 'útočník', 'libero', 'stoper',
    'wingback', 'defenzívny stredopoliar', 'ofenzívny stredopoliar', 'krídelník', 'druhý útočník'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const playerData = {
        ...formData,
        tim_id: Number(formData.tim_id),
        cislo_dresu: formData.cislo_dresu ? Number(formData.cislo_dresu) : undefined,
        vaha: formData.vaha ? Number(formData.vaha) : undefined,
        vyska: formData.vyska ? Number(formData.vyska) : undefined,
      };

      if (player) {
        await playersApi.updatePlayer(player.id, playerData);
      } else {
        await playersApi.createPlayer(playerData as any);
      }

      onSave();
    } catch (err) {
      console.error('Chyba pri ukladaní hráča:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní hráča');
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
            {player ? 'Upraviť hráča' : 'Pridať nového hráča'}
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

            {/* Dátum narodenia */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Dátum narodenia *
              </label>
              <input
                type="date"
                required
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

            {/* Pozícia */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Pozícia *
              </label>
              <select
                required
                value={formData.pozicia}
                onChange={(e) => setFormData({ ...formData, pozicia: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Vyberte pozíciu</option>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>

            {/* Tím */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Tím *
              </label>
              <select
                required
                value={formData.tim_id}
                onChange={(e) => setFormData({ ...formData, tim_id: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value={0}>Vyberte tím</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.nazov} {team.vekova_kategoria}
                  </option>
                ))}
              </select>
            </div>

            {/* Číslo dresu */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Číslo dresu
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={formData.cislo_dresu}
                onChange={(e) => setFormData({ ...formData, cislo_dresu: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Národnosť */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Národnosť
              </label>
              <input
                type="text"
                value={formData.narodnost}
                onChange={(e) => setFormData({ ...formData, narodnost: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Váha */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Váha (kg)
              </label>
              <input
                type="number"
                min="30"
                max="200"
                step="0.1"
                value={formData.vaha}
                onChange={(e) => setFormData({ ...formData, vaha: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Výška */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Výška (cm)
              </label>
              <input
                type="number"
                min="120"
                max="250"
                value={formData.vyska}
                onChange={(e) => setFormData({ ...formData, vyska: e.target.value })}
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
              {loading ? 'Ukladám...' : (player ? 'Aktualizovať' : 'Pridať hráča')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayersManagementAdmin;