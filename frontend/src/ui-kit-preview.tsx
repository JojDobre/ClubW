// Umiestnenie: frontend/src/ui-kit-preview.tsx
// Samostatný vstupný bod pre kontrolnú obrazovku prvkov rozhrania.
// Spustenie: otvorte /ui-kit.html vo vývojovom režime.

import React from 'react';
import ReactDOM from 'react-dom/client';
import './design/global.css';
import { ToastProvider } from './ui';
import Ukazka from './ui/Ukazka';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <Ukazka />
    </ToastProvider>
  </React.StrictMode>
);
