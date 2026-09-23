// Umiestnenie: sablony/zakladna/src/stranky/Nenajdena.tsx
// Stránka nenájdená - najprv skúsi presmerovanie starého odkazu.

import React, { useEffect, useState } from 'react';
import { skusPresmerovat } from '@clubw/jadro';

const NenajdenaStranka: React.FC = () => {
  const [overuje, setOveruje] = useState(true);

  useEffect(() => {
    void skusPresmerovat().then((presmeruje) => !presmeruje && setOveruje(false));
  }, []);

  if (overuje) {
    return <p style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Načítavam...</p>;
  }

  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>🔍</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#2d3748' }}>Stránka nenájdená</h2>
      <p style={{ fontSize: '1.1rem', color: '#718096', marginBottom: '30px' }}>
        Ľutujeme, ale stránka ktorú hľadáte neexistuje alebo bola presunutá.
      </p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          background: '#3182ce',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '16px',
        }}
      >
        ← Späť na domovskú stránku
      </a>
    </div>
  );
};

export default NenajdenaStranka;
