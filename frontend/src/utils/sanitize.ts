// Umiestnenie: frontend/src/utils/sanitize.ts
// Centrálna sanitizácia HTML obsahu pred vykreslením cez dangerouslySetInnerHTML.
//
// PREČO: obsah článkov a stránok pochádza z HTML editora v admin rozhraní.
// Bez sanitizácie by útočník (alebo kompromitovaný redaktorský účet) mohol
// vložiť <script>, onerror= alebo javascript: odkaz a ukradnúť prihlasovací
// token každému, kto si článok otvorí (stored XSS).

import DOMPurify from 'dompurify';

// Povolené HTML tagy - to, čo reálne produkuje editor článkov
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

// Povolené atribúty - zámerne BEZ on* handlerov (onclick, onerror, ...)
const POVOLENE_ATRIBUTY = [
  'href', 'target', 'rel',
  'src', 'alt', 'title', 'width', 'height',
  'class', 'style',
  'colspan', 'rowspan',
];

/**
 * Vyčistí HTML reťazec od potenciálne škodlivého kódu.
 * @param html - surové HTML z databázy
 * @returns bezpečné HTML pripravené na vykreslenie
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: POVOLENE_TAGY,
    ALLOWED_ATTR: POVOLENE_ATRIBUTY,
    // Zakážeme dátové URI v odkazoch (data:text/html je XSS vektor),
    // pri obrázkoch ich povolíme kvôli vloženým náhľadom z editora
    ALLOW_DATA_ATTR: false,
    // Odkazy na iné protokoly ako http/https/mailto/tel sa odstránia
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
};

/**
 * Pomocník pre priame použitie v JSX.
 * Použitie: <div {...sanitizedHtmlProps(article.obsah)} />
 */
export const sanitizedHtmlProps = (html: string | null | undefined) => ({
  dangerouslySetInnerHTML: { __html: sanitizeHtml(html) },
});
