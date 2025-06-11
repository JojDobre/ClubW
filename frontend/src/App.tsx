import React, { useState, useEffect } from 'react';

interface ServerStatus {
  backend: 'ok' | 'error' | 'loading';
  license: 'ok' | 'error' | 'loading';
}

function App() {
  const [status, setStatus] = useState<ServerStatus>({
    backend: 'loading',
    license: 'loading'
  });

  useEffect(() => {
    // Kontrola backend statusu
    fetch('/api/status')
      .then(res => res.json())
      .then(() => setStatus(prev => ({ ...prev, backend: 'ok' })))
      .catch(() => setStatus(prev => ({ ...prev, backend: 'error' })));

    // Kontrola license statusu
    fetch('http://localhost:3001/api/status')
      .then(res => res.json())
      .then(() => setStatus(prev => ({ ...prev, license: 'ok' })))
      .catch(() => setStatus(prev => ({ ...prev, license: 'error' })));
  }, []);

  const getStatusText = (stat: 'ok' | 'error' | 'loading') => {
    switch(stat) {
      case 'ok': return '✅ Pripojený';
      case 'error': return '❌ Nedostupný';
      case 'loading': return '⏳ Kontrolujem...';
    }
  };

  const getStatusClass = (stat: 'ok' | 'error' | 'loading') => {
    switch(stat) {
      case 'ok': return 'status-ok';
      case 'error': return 'status-error';
      case 'loading': return 'status-warning';
    }
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1 style={{margin: 0, fontSize: '2rem', fontWeight: 'bold'}}>ClubW</h1>
          <p style={{margin: '5px 0 0 0', color: '#6b7280'}}>
            Platforma pre správu športových klubov
          </p>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 style={{marginTop: 0}}>Vitajte v ClubW</h2>
          <p>Systém pre kompletnú správu športového klubu je pripravený na použitie.</p>
          
          <h3>Status systému</h3>
          <div className="status-item">
            <strong>Frontend:</strong> 
            <span className="status-ok"> ✅ Spustený</span>
          </div>
          <div className="status-item">
            <strong>Backend API:</strong> 
            <span className={getStatusClass(status.backend)}> {getStatusText(status.backend)}</span>
          </div>
          <div className="status-item">
            <strong>License Server:</strong> 
            <span className={getStatusClass(status.license)}> {getStatusText(status.license)}</span>
          </div>

          <div style={{marginTop: '20px'}}>
            <h3>Dostupné funkcie</h3>
            <ul>
              <li>✅ Základná štruktúra aplikácie</li>
              <li>✅ License server</li>
              <li>✅ Backend API</li>
              <li>✅ React frontend</li>
              <li>⏳ Admin rozhranie (pripravuje sa)</li>
              <li>⏳ Správa tímov (pripravuje sa)</li>
              <li>⏳ Správa článkov (pripravuje sa)</li>
            </ul>
          </div>

          <div style={{marginTop: '20px'}}>
            <button className="btn" onClick={() => alert('Admin rozhranie bude dostupné v ďalšej fáze')}>
              Prejsť do admin rozhrania
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Informácie o projekte</h3>
          <p><strong>Verzia:</strong> 1.0.0</p>
          <p><strong>Prostredie:</strong> Development</p>
          <p><strong>Klient:</strong> Demo FC</p>
          <p><strong>Posledná aktualizácia:</strong> {new Date().toLocaleString('sk-SK')}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
