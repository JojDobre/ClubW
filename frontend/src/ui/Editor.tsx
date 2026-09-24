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
}

export const Editor: React.FC<EditorProps> = ({
  hodnota, onZmena, placeholder = tr('Začnite písať…'), minVyska = 260,
}) => {
  const plochaRef = useRef<HTMLDivElement>(null);

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
