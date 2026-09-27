// Umiestnenie: license-server/admin/src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { OznameniaProvider } from './komponenty';
import './styl.css';

createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <OznameniaProvider>
        <App />
      </OznameniaProvider>
    </BrowserRouter>
  </React.StrictMode>
);
