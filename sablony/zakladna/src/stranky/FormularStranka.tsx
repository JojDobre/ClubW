// Umiestnenie: sablony/zakladna/src/stranky/FormularStranka.tsx
// Samostatná adresa formulára: /formular/:slug

import React, { useEffect } from 'react';
import { FormularWeb } from '@clubw/jadro';

const FormularStranka: React.FC = () => {
  const kluc = decodeURIComponent(window.location.pathname.replace(/^\/formular\//, '').replace(/\/$/, ''));

  useEffect(() => {
    document.title = 'Formulár';
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
      <FormularWeb kluc={kluc} />
    </div>
  );
};

export default FormularStranka;
