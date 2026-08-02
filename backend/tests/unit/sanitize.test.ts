// Umiestnenie: backend/tests/unit/sanitize.test.ts
// Testy sanitizácie HTML obsahu (ochrana pred stored XSS).

import { describe, it, expect } from 'vitest';
import { sanitizeContent, sanitizePlainText } from '../../src/utils/sanitize';

describe('sanitizeContent', () => {
  it('odstráni skript', () => {
    const vysledok = sanitizeContent('<p>Text</p><script>alert(1)</script>');
    expect(vysledok).not.toContain('<script');
    expect(vysledok).toContain('Text');
  });

  it('odstráni obslužné atribúty udalostí', () => {
    const vysledok = sanitizeContent('<img src="x" onerror="alert(1)">');
    expect(vysledok).not.toContain('onerror');
  });

  it('odstráni odkaz s protokolom javascript', () => {
    const vysledok = sanitizeContent('<a href="javascript:alert(1)">klik</a>');
    expect(vysledok).not.toContain('javascript:');
  });

  it('odstráni rámec iframe', () => {
    expect(sanitizeContent('<iframe src="https://zly.web"></iframe>')).not.toContain('<iframe');
  });

  it('zachová bežné formátovanie z editora', () => {
    const vstup = '<h2>Nadpis</h2><p><strong>tučné</strong> a <em>kurzíva</em></p><ul><li>bod</li></ul>';
    const vysledok = sanitizeContent(vstup);
    expect(vysledok).toContain('<h2>');
    expect(vysledok).toContain('<strong>');
    expect(vysledok).toContain('<li>');
  });

  it('doplní bezpečnostné atribúty na odkazy', () => {
    const vysledok = sanitizeContent('<a href="https://example.com">odkaz</a>');
    expect(vysledok).toContain('noopener');
  });

  it('zvládne prázdny vstup', () => {
    expect(sanitizeContent('')).toBe('');
    expect(sanitizeContent(null)).toBe('');
    expect(sanitizeContent(undefined)).toBe('');
  });
});

describe('sanitizePlainText', () => {
  it('odstráni všetko značkovanie', () => {
    expect(sanitizePlainText('<b>Tučný</b> text')).toBe('Tučný text');
  });

  it('odstráni skript aj s obsahom', () => {
    expect(sanitizePlainText('FC <script>alert(1)</script>Test')).not.toContain('alert');
  });
});
