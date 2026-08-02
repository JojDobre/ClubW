// Umiestnenie: frontend/src/ui/Toast.tsx
// Krátkodobé oznámenia o výsledku akcie.
//
// Poskytuje kontext, takže hlásenie sa dá vyvolať z ktoréhokoľvek miesta:
//   const { uspech, chyba } = useToast();
//   uspech('Článok bol uložený');

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

type TypHlasenia = 'success' | 'error' | 'info' | 'warning';

interface Hlasenie {
  id: number;
  typ: TypHlasenia;
  text: string;
}

interface HodnotaKontextu {
  uspech: (text: string) => void;
  chyba: (text: string) => void;
  info: (text: string) => void;
  varovanie: (text: string) => void;
}

const ToastContext = createContext<HodnotaKontextu | undefined>(undefined);

// Ako dlho hlásenie zostane na obrazovke
const TRVANIE_MS = 3200;
// Chyby necháme dlhšie — používateľ si ich potrebuje prečítať
const TRVANIE_CHYBY_MS = 5500;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hlasenia, setHlasenia] = useState<Hlasenie[]>([]);
  // Počítadlo namiesto Date.now() — dve hlásenia v tej istej milisekunde
  // by inak dostali rovnaký kľúč
  const dalsieId = useRef(1);

  const pridaj = useCallback((typ: TypHlasenia, text: string) => {
    const id = dalsieId.current++;
    setHlasenia((doterajsie) => [...doterajsie, { id, typ, text }]);

    const trvanie = typ === 'error' ? TRVANIE_CHYBY_MS : TRVANIE_MS;
    setTimeout(() => {
      setHlasenia((doterajsie) => doterajsie.filter((h) => h.id !== id));
    }, trvanie);
  }, []);

  const hodnota: HodnotaKontextu = {
    uspech: useCallback((t: string) => pridaj('success', t), [pridaj]),
    chyba: useCallback((t: string) => pridaj('error', t), [pridaj]),
    info: useCallback((t: string) => pridaj('info', t), [pridaj]),
    varovanie: useCallback((t: string) => pridaj('warning', t), [pridaj]),
  };

  return (
    <ToastContext.Provider value={hodnota}>
      {children}
      {createPortal(
        <div
          className="cw-toasts"
          // aria-live oznámi nové hlásenie čítačke obrazovky
          aria-live="polite"
          aria-atomic="false"
        >
          {hlasenia.map((h) => (
            <div key={h.id} className={`cw-toast cw-toast--${h.typ}`}>
              <span className="cw-toast__icon" aria-hidden="true">
                {h.typ === 'success' && '✓'}
                {h.typ === 'error' && '!'}
                {h.typ === 'warning' && '!'}
                {h.typ === 'info' && 'i'}
              </span>
              <span className="cw-toast__text">{h.text}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): HodnotaKontextu => {
  const kontext = useContext(ToastContext);
  if (!kontext) {
    throw new Error('useToast sa musí volať vnútri <ToastProvider>');
  }
  return kontext;
};
