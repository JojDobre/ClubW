// Umiestnenie: frontend/src/pages/admin/emaily/navod.test.ts
// Prevod návodu na e-maily (Markdown) na HTML pre administráciu.

import { describe, it, expect } from 'vitest';
import { markdownNaHtml, NAVOD_HTML } from './navod';

describe('návod na e-maily', () => {
  it('prevedie nadpisy, tabuľky, zoznamy a kód', () => {
    const html = markdownNaHtml('# Návod\n\n| A | B |\n|---|---|\n| **x** | `y` |\n\n- jeden\n  pokračovanie\n- dva\n\n```\nv=spf1 ~all\n```');
    expect(html).toContain('<h1 id="navod">Návod</h1>');
    expect(html).toContain('<td><strong>x</strong></td><td><code>y</code></td>');
    expect(html).toContain('<li>jeden pokračovanie</li><li>dva</li>');
    expect(html).toContain('<pre><code>v=spf1 ~all</code></pre>');
  });

  it('escapuje HTML a pustí len bezpečné odkazy', () => {
    const html = markdownNaHtml('Text <script>x</script> [zlý](javascript:alert(1)) [dobrý](https://brevo.com)');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<a href="https://brevo.com" target="_blank" rel="noopener noreferrer">dobrý</a>');
  });

  it('obsahuje celý návod zo súboru NAVOD-EMAILY.md', () => {
    expect(NAVOD_HTML).toContain('E-maily v ClubW');
    expect(NAVOD_HTML).toContain('A čo vlastný SMTP server?');
  });
});
