// Umiestnenie: frontend/src/utils/sanitize.test.ts
// Obsah článkov z editora: bežné formátovanie ostane, skripty a
// nebezpečné odkazy zmiznú (ochrana pred stored XSS).

import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('čistenie HTML', () => {
  it('ponechá formátovanie článku', () => {
    const html = '<p>Text <strong>tučne</strong> <a href="https://klub.sk">odkaz</a></p><img src="/uploads/a.jpg" alt="Foto">';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('odstráni skripty, handlery a javascript: odkazy', () => {
    const vysledok = sanitizeHtml('<p onclick="x()">A</p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">B</a>');
    expect(vysledok).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(vysledok).toContain('<p>A</p>');
  });

  it('prázdny vstup', () => {
    expect(sanitizeHtml(null)).toBe('');
  });
});
