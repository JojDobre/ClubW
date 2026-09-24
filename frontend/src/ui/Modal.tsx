// Umiestnenie: frontend/src/ui/Modal.tsx
// Modálne okno a potvrdzovací dialóg.

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { tr } from '../i18n';
import './Modal.css';

interface ModalProps {
  otvorene: boolean;
  onZavri: () => void;
  nadpis: string;
  podnadpis?: string;
  /** Obsah spodnej lišty — zvyčajne tlačidlá */
  pata?: React.ReactNode;
  sirka?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  otvorene, onZavri, nadpis, podnadpis, pata, sirka = 'md', children,
}) => {
  const oknoRef = useRef<HTMLDivElement>(null);
  // Prvok, ktorý mal zameranie pred otvorením — vrátime ho späť pri zatvorení
  const predchadzajuciPrvok = useRef<HTMLElement | null>(null);

  // Funkciu na zatvorenie držíme v referencii.
  //
  // CHYBA, KTORÚ TO RIEŠI: rodič odovzdáva onZavri ako novú šípkovú funkciu
  // pri každom prekreslení. Keby bola v zozname závislostí efektu, efekt by
  // sa po každom stlačení klávesy zrušil a spustil nanovo — a jeho upratovanie
  // vracia zameranie na prvok pred otvorením okna. Používateľovi tak po každom
  // písmene vyskočil kurzor z poľa.
  const onZavriRef = useRef(onZavri);
  onZavriRef.current = onZavri;

  useEffect(() => {
    if (!otvorene) return;

    predchadzajuciPrvok.current = document.activeElement as HTMLElement;

    const naKlaves = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onZavriRef.current();
        return;
      }

      // Udržanie zamerania vnútri okna. Bez toho by sa dalo tabulátorom
      // prejsť na obsah pod prekrytím, ktorý používateľ nevidí.
      if (e.key === 'Tab' && oknoRef.current) {
        const zamerateľne = oknoRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (zamerateľne.length === 0) return;

        const prvy = zamerateľne[0];
        const posledny = zamerateľne[zamerateľne.length - 1];

        if (e.shiftKey && document.activeElement === prvy) {
          e.preventDefault();
          posledny.focus();
        } else if (!e.shiftKey && document.activeElement === posledny) {
          e.preventDefault();
          prvy.focus();
        }
      }
    };

    document.addEventListener('keydown', naKlaves);

    // Zabránenie posúvaniu stránky pod modálnym oknom
    const povodnyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Zameranie presunieme do prvého poľa, aby sa dalo hneď písať
    const casovac = setTimeout(() => {
      oknoRef.current
        ?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, select')
        ?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', naKlaves);
      document.body.style.overflow = povodnyOverflow;
      clearTimeout(casovac);
      predchadzajuciPrvok.current?.focus();
    };
    // Zámerne závisí LEN od otvorene — pozri poznámku pri onZavriRef vyššie
  }, [otvorene]);

  if (!otvorene) return null;

  // Portál vykreslí okno mimo hierarchie rodiča, takže ho neovplyvní
  // pretečenie ani vrstvenie nadradených prvkov
  return createPortal(
    <div className="cw-modal-scrim" onClick={onZavri}>
      <div
        ref={oknoRef}
        className={`cw-modal cw-modal--${sirka}`}
        role="dialog"
        aria-modal="true"
        aria-label={nadpis}
        // Kliknutie vnútri okna nesmie okno zavrieť
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cw-modal__head">
          <div>
            <h2 className="cw-modal__title">{nadpis}</h2>
            {podnadpis && <p className="cw-modal__subtitle">{podnadpis}</p>}
          </div>
          <button className="cw-modal__close" onClick={onZavri} aria-label={tr('Zavrieť')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="cw-modal__body">{children}</div>

        {pata && <footer className="cw-modal__foot">{pata}</footer>}
      </div>
    </div>,
    document.body
  );
};

// ===== Potvrdzovací dialóg =====

interface ConfirmProps {
  otvorene: boolean;
  nadpis: string;
  sprava: string;
  /** Text potvrdzovacieho tlačidla */
  potvrdit?: string;
  /** true = akcia je nezvratná, tlačidlo bude červené */
  nebezpecne?: boolean;
  nacitava?: boolean;
  onPotvrd: () => void;
  onZrus: () => void;
}

export const ConfirmDialog: React.FC<ConfirmProps> = ({
  otvorene, nadpis, sprava, potvrdit = tr('Potvrdiť'),
  nebezpecne = false, nacitava = false, onPotvrd, onZrus,
}) => (
  <Modal
    otvorene={otvorene}
    onZavri={onZrus}
    nadpis={nadpis}
    sirka="sm"
    pata={
      <>
        <Button variant="secondary" onClick={onZrus} disabled={nacitava}>
          {tr('Zrušiť')}
        </Button>
        <Button
          variant={nebezpecne ? 'danger' : 'primary'}
          onClick={onPotvrd}
          nacitava={nacitava}
        >
          {potvrdit}
        </Button>
      </>
    }
  >
    <p className="cw-confirm__msg">{sprava}</p>
  </Modal>
);

export default Modal;
