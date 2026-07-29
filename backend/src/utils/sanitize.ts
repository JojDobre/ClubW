// Umiestnenie: backend/src/utils/sanitize.ts
// Sanitizácia HTML obsahu PRED uložením do databázy.
//
// Obrana v dvoch vrstvách: frontend čistí obsah pri zobrazení,
// backend ho čistí pri ukladaní. Ak by niekto obišiel frontend
// (napr. priamym volaním API), škodlivý kód sa do databázy nedostane.

import sanitizeHtmlLib from 'sanitize-html';

// Povolené tagy - zodpovedajú tomu, čo produkuje HTML editor článkov
const POVOLENE_TAGY = [
  'p', 'br', 'hr', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'figure', 'figcaption',
];

/**
 * Vyčistí HTML obsah od škodlivého kódu (<script>, on* handlery, javascript: odkazy).
 * @param html - surové HTML od používateľa
 * @returns bezpečné HTML na uloženie do databázy
 */
export const sanitizeContent = (html: string | null | undefined): string => {
  if (!html) return '';

  return sanitizeHtmlLib(html, {
    allowedTags: POVOLENE_TAGY,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      // Trieda a inline štýl sú povolené na všetkých tagoch kvôli formátovaniu z editora
      '*': ['class', 'style', 'colspan', 'rowspan'],
    },
    // Povolené protokoly v odkazoch - blokuje javascript: a data:text/html
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      // Pri obrázkoch povolíme aj data: kvôli vloženým náhľadom z editora
      img: ['http', 'https', 'data'],
    },
    // Externé odkazy dostanú bezpečnostné atribúty proti tabnabbingu
    transformTags: {
      a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
};

/**
 * Vyčistí obyčajný text od akéhokoľvek HTML (pre polia ako excerpt, meta popisy).
 * @param text - vstupný text
 * @returns text bez HTML tagov
 */
export const sanitizePlainText = (text: string | null | undefined): string => {
  if (!text) return '';
  return sanitizeHtmlLib(text, { allowedTags: [], allowedAttributes: {} }).trim();
};
