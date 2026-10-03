// Umiestnenie: frontend/src/ui/Editor.tsx
// Jednoduchý editor formátovaného textu s panelom nástrojov.
//
// Podľa návrhu má editor článku panel s tlačidlami formátovania nad
// plochou na písanie. Používame contentEditable a document.execCommand —
// je to zastarané rozhranie, ale funguje vo všetkých prehliadačoch bez
// ďalšej knižnice. Pri väčších nárokoch sa dá nahradiť TipTapom bez
// zmeny ostatných komponentov.

import React, { useRef, useEffect, useCallback } from 'react';
import { tr } from '../i18n';
import './Editor.css';

interface NastrojFormatovania {
  prikaz: string;
  hodnota?: string;
  znak: string;
  popis: string;
}

const NASTROJE: NastrojFormatovania[] = [
  { prikaz: 'bold', znak: 'B', popis: tr('Tučné (Ctrl+B)') },
  { prikaz: 'italic', znak: 'I', popis: tr('Kurzíva (Ctrl+I)') },
  { prikaz: 'underline', znak: 'U', popis: tr('Podčiarknuté') },
  { prikaz: 'formatBlock', hodnota: 'h2', znak: 'H2', popis: tr('Nadpis') },
  { prikaz: 'formatBlock', hodnota: 'h3', znak: 'H3', popis: tr('Podnadpis') },
  { prikaz: 'insertUnorderedList', znak: '•', popis: tr('Odrážky') },
  { prikaz: 'insertOrderedList', znak: '1.', popis: tr('Číslovanie') },
  { prikaz: 'formatBlock', hodnota: 'blockquote', znak: '❝', popis: tr('Citát') },
  { prikaz: 'createLink', znak: '🔗', popis: tr('Odkaz') },
  { prikaz: 'removeFormat', znak: '✕', popis: tr('Zrušiť formátovanie') },
];

interface EditorProps {
  hodnota: string;
  onZmena: (html: string) => void;
  placeholder?: string;
  /** Minimálna výška plochy na písanie */
  minVyska?: number;
  /**
   * Tlačidlo „Obrázok" v paneli: editor si zapamätá miesto kurzora
   * a zavolá túto funkciu; tá (napr. po výbere z knižnice) zavolá vloz.
   */
  onObrazok?: (vloz: (adresa: string, popis?: string) => void) => void;
}

export const Editor: React.FC<EditorProps> = ({
  hodnota, onZmena, placeholder = tr('Začnite písať…'), minVyska = 260, onObrazok,
}) => {
  const plochaRef = useRef<HTMLDivElement>(null);
  const rozsahRef = useRef<Range | null>(null);

  /** Zapamätá miesto kurzora v ploche - po výbere obrázka sa naň vloží. */
  const zapamatajKurzor = () => {
    const vyber = window.getSelection();
    const plocha = plochaRef.current;
    rozsahRef.current =
      vyber && vyber.rangeCount > 0 && plocha && plocha.contains(vyber.getRangeAt(0).commonAncestorContainer)
        ? vyber.getRangeAt(0).cloneRange()
        : null;
  };

  const vlozObrazok = useCallback(
    (adresa: string, popis = '') => {
      const plocha = plochaRef.current;
      if (!plocha || !adresa) return;
      plocha.focus();
      const vyber = window.getSelection();
      if (vyber) {
        vyber.removeAllRanges();
        if (rozsahRef.current) {
          vyber.addRange(rozsahRef.current);
        } else {
          // Bez kurzora v texte sa obrázok pridá na koniec
          const koniec = document.createRange();
          koniec.selectNodeContents(plocha);
          koniec.collapse(false);
          vyber.addRange(koniec);
        }
      }
      const img = document.createElement('img');
      img.setAttribute('src', adresa);
      img.setAttribute('alt', popis);
      document.execCommand('insertHTML', false, `<p>${img.outerHTML}</p>`);
      onZmena(plocha.innerHTML);
    },
    [onZmena]
  );

  // Obsah nastavujeme len vtedy, keď sa líši od toho, čo je v ploche.
  // Bez tejto kontroly by React pri každom písmene prekreslil plochu
  // a kurzor by skočil na začiatok.
  useEffect(() => {
    const plocha = plochaRef.current;
    if (plocha && plocha.innerHTML !== hodnota) {
      plocha.innerHTML = hodnota;
    }
  }, [hodnota]);

  const vykonaj = useCallback(
    (nastroj: NastrojFormatovania) => {
      const plocha = plochaRef.current;
      if (!plocha) return;

      plocha.focus();

      if (nastroj.prikaz === 'createLink') {
        const adresa = window.prompt(tr('Zadajte adresu odkazu:'), 'https://');
        if (!adresa) return;
        document.execCommand('createLink', false, adresa);
      } else {
        document.execCommand(nastroj.prikaz, false, nastroj.hodnota);
      }

      onZmena(plocha.innerHTML);
    },
    [onZmena]
  );

  return (
    <div className="cw-editor-box">
      <div className="cw-editor-box__panel" role="toolbar" aria-label={tr('Formátovanie textu')}>
        {NASTROJE.map((n) => (
          <button
            key={`${n.prikaz}-${n.hodnota ?? ''}`}
            type="button"
            title={n.popis}
            aria-label={n.popis}
            className="cw-editor-box__nastroj"
            // onMouseDown namiesto onClick — kliknutie na tlačidlo by inak
            // zrušilo označenie textu skôr, než sa príkaz vykoná
            onMouseDown={(e) => {
              e.preventDefault();
              vykonaj(n);
            }}
          >
            {n.znak}
          </button>
        ))}
        {onObrazok && (
          <button
            type="button"
            title={tr('Vložiť obrázok')}
            aria-label={tr('Vložiť obrázok')}
            className="cw-editor-box__nastroj"
            onMouseDown={(e) => {
              e.preventDefault();
              zapamatajKurzor();
              onObrazok(vlozObrazok);
            }}
          >
            🖼
          </button>
        )}
      </div>

      <div
        ref={plochaRef}
        className="cw-editor-box__plocha"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight: minVyska }}
        onInput={(e) => onZmena((e.target as HTMLDivElement).innerHTML)}
        // Vloženie z Wordu prináša skryté formátovanie, ktoré rozbíja web.
        // Vkladáme preto len čistý text.
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
      />
    </div>
  );
};

export default Editor;
