// Umiestnenie: sablony/zakladna/src/stranky/Teams.tsx
// Základná stránka so zoznamom tímov

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '@clubw/jadro';

interface Team {
  id: number;
  nazov: string;
  typ: string;
  vekova_kategoria: string;
  popis?: string;
  pocet_hracov?: number;
  pocet_realizacny_tim?: number;
}

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načítanie tímov z API
  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl('/teams?include_stats=true'));
      
      if (!response.ok) {
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTeams(data.data);
      } else {
        throw new Error('Chyba pri načítaní tímov');
      }
    } catch (err) {
      console.error('Chyba:', err);
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Načítavam tímy...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: 'red' }}>Chyba: {error}</div>
        <button onClick={fetchTeams} style={{ marginTop: '10px' }}>
          Skúsiť znovu
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '24px' }}>
        🏆 Naše tímy
      </h1>
      
      <div style={{ marginBottom: '16px' }}>
        Počet tímov: <strong>{teams.length}</strong>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {teams.map((team) => (
          <div
            key={team.id}
            style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer'  // pridaj
            }}
            onClick={() => window.location.href = `/teams/${team.id}`}  // pridaj
            >
            <h3 style={{ marginBottom: '12px', color: '#1e293b' }}>
              {team.nazov}
            </h3>
            
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
              Typ: {team.typ} | Kategória: {team.vekova_kategoria}
            </div>
            
            {team.popis && (
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                {team.popis}
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span>👥 Hráčov: {team.pocet_hracov || 0}</span>
              <span>🎯 Realizácia: {team.pocet_realizacny_tim || 0}</span>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Žiadne tímy nenájdené
        </div>
      )}
    </div>
  );
};

export default Teams;