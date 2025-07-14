// frontend/src/pages/Stats.tsx
// Štatistiky klubu - testovacia stránka pre API

import React, { useState, useEffect } from 'react';

interface StatsData {
  // Základné štatistiky
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalUsers: number;
  
  // FÁZA 3 štatistiky
  totalTeams: number;
  totalPlayers: number;
  totalStaff: number;
  
  // FÁZA 4 štatistiky
  totalLeagues: number;
  totalMatches: number;
  finishedMatches: number;
  upcomingMatches: number;
  totalGoals: number;
  totalCards: number;
  
  lastUpdate: string;
}

interface ApiResponse {
  success: boolean;
  data: StatsData;
  message: string;
}

const Stats: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načítanie štatistík z API
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📡 Volám stats API...');
      const response = await fetch('http://localhost:3000/api/stats');
      console.log('📡 Stats response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP chyba: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('📡 Stats data:', data);
      
      if (data.success) {
        setStats(data.data);
        console.log('✅ Stats nastavené:', data.data);
      } else {
        throw new Error(data.message || 'Chyba pri načítaní štatistík');
      }
    } catch (err) {
      console.error('❌ Chyba pri načítaní štatistík:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Formátovanie čísiel
  const formatNumber = (num: number) => {
    return num.toLocaleString('sk-SK');
  };

  // Formátovanie dátumu
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Výpočet percent
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Načítavam štatistiky...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        ❌ {error}
        <br />
        <button onClick={fetchStats} style={{ marginTop: '10px', padding: '5px 10px' }}>
          Skúsiť znovu
        </button>
      </div>
    );
  }

  if (!stats) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Štatistiky nenájdené</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hlavička */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '32px' }}>
          📊 Štatistiky klubu
        </h1>
        <p style={{ color: '#666', margin: '0 0 10px 0', fontSize: '16px' }}>
          Prehľad všetkých dát a aktivít v systéme
        </p>
        <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>
          Posledná aktualizácia: {formatDate(stats.lastUpdate)}
        </p>
      </div>

      {/* Základné štatistiky */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          color: '#333',
          fontSize: '24px',
          borderBottom: '2px solid #3b82f6',
          paddingBottom: '8px'
        }}>
          📰 Obsah a aktivita
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {/* Články */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
              {formatNumber(stats.totalArticles)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Celkovo článkov
            </div>
            <div style={{ fontSize: '14px', color: '#10b981' }}>
              ✅ {formatNumber(stats.publishedArticles)} publikovaných ({getPercentage(stats.publishedArticles, stats.totalArticles)}%)
            </div>
          </div>

          {/* Zobrazenia */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👁️</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
              {formatNumber(stats.totalViews)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Celkových zobrazení
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              📈 Priemerně {Math.round(stats.totalViews / stats.publishedArticles || 0)} na článok
            </div>
          </div>

          {/* Používatelia */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '8px' }}>
              {formatNumber(stats.totalUsers)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Registrovaných používateľov
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              🔐 Admini, redaktori, trenéri
            </div>
          </div>
        </div>
      </div>

      {/* Športové štatistiky */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          color: '#333',
          fontSize: '24px',
          borderBottom: '2px solid #10b981',
          paddingBottom: '8px'
        }}>
          ⚽ Tímy a hráči
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {/* Tímy */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>
              {formatNumber(stats.totalTeams)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Aktívnych tímov
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              📊 Muži, ženy, mládež
            </div>
          </div>

          {/* Hráči */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚽</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0369a1', marginBottom: '8px' }}>
              {formatNumber(stats.totalPlayers)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Registrovaných hráčov
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              📈 Priemer {Math.round(stats.totalPlayers / stats.totalTeams || 0)} na tím
            </div>
          </div>

          {/* Realizačný tím */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👨‍💼</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
              {formatNumber(stats.totalStaff)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Členov realizačného tímu
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              🎯 Trenéri, asistenti, maséri
            </div>
          </div>
        </div>
      </div>

      {/* Súťaže a zápasy */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          color: '#333',
          fontSize: '24px',
          borderBottom: '2px solid #f59e0b',
          paddingBottom: '8px'
        }}>
          🏅 Súťaže a výsledky
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {/* Ligy */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏅</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
              {formatNumber(stats.totalLeagues)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Aktívnych líg
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              🏆 Súťaže a pohárové zápasy
            </div>
          </div>

          {/* Celkovo zápasov */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤝</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '8px' }}>
              {formatNumber(stats.totalMatches)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Celkovo zápasov
            </div>
            <div style={{ fontSize: '14px', color: '#10b981' }}>
              ✅ {formatNumber(stats.finishedMatches)} ukončených
            </div>
            <div style={{ fontSize: '14px', color: '#3b82f6' }}>
              📅 {formatNumber(stats.upcomingMatches)} naplánovaných
            </div>
          </div>

          {/* Góly */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚽</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>
              {formatNumber(stats.totalGoals)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Strelených gólov
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              📊 Priemer {(stats.totalGoals / stats.finishedMatches || 0).toFixed(1)} na zápas
            </div>
          </div>

          {/* Karty */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🟨</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
              {formatNumber(stats.totalCards)}
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>
              Udelených kariet
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              🟨 Žlté a 🟥 červené karty
            </div>
          </div>
        </div>
      </div>

      {/* Súhrnné metriky */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          color: '#333',
          fontSize: '24px',
          textAlign: 'center'
        }}>
          📈 Kľúčové metriky
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
              {(stats.totalViews / stats.publishedArticles || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Priemerné zobrazenia na článok
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
              {Math.round(stats.totalPlayers / stats.totalTeams || 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Priemerný počet hráčov na tím
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
              {(stats.totalGoals / stats.finishedMatches || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Priemerný počet gólov na zápas
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>
              {getPercentage(stats.finishedMatches, stats.totalMatches)}%
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Dokončených zápasov
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '40px',
        padding: '20px',
        color: '#666',
        fontSize: '14px'
      }}>
        <div style={{ marginBottom: '8px' }}>
          📊 Štatistiky sa aktualizujú automaticky pri zmene dát v systéme
        </div>
        <div>
          🔄 Posledná aktualizácia: {formatDate(stats.lastUpdate)}
        </div>
      </div>
    </div>
  );
};

export default Stats;