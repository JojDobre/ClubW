// Umiestnenie: frontend/src/pages/admin/emaily/navod.ts
// Návod na nastavenie e-mailov (NAVOD-EMAILY.md v koreni projektu) pre
// administráciu: zobrazenie priamo v E-maily → Nastavenia a stiahnutie
// ako HTML súbor (otvorí sa v prehliadači, dá sa vytlačiť do PDF).
//
// Návod sa nekopíruje - Vite ho pri zostavení vloží zo zdrojového súboru,
// takže v administrácii je vždy aktuálna verzia.

import navodMd from '../../../../../NAVOD-EMAILY.md?raw';

const escapuj = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Riadkové prvky: `kód`, **tučné**, *kurzíva*, [odkaz](adresa). */
const riadok = (text: string) =>
  escapuj(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t: string, url: string) =>
      /^https?:\/\//.test(url) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${t}</a>` : t
    );

/**
 * Prevedie Markdown návodu na HTML. Pozná len to, čo návod používa:
 * nadpisy, odseky, zoznamy, tabuľky, citácie, bloky kódu a čiaru.
 */
export const markdownNaHtml = (md: string): string => {
  const riadky = md.replace(/\r\n/g, '\n').split('\n');
  const vystup: string[] = [];
  let i = 0;
  while (i < riadky.length) {
    const r = riadky[i];
    if (!r.trim()) {
      i++;
      continue;
    }
    // Blok kódu
    if (r.startsWith('```')) {
      const kod: string[] = [];
      i++;
      while (i < riadky.length && !riadky[i].startsWith('```')) kod.push(riadky[i++]);
      i++;
      vystup.push(`<pre><code>${escapuj(kod.join('\n'))}</code></pre>`);
      continue;
    }
    const nadpis = r.match(/^(#{1,4})\s+(.*)$/);
    if (nadpis) {
      const uroven = nadpis[1].length;
      const id = nadpis[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      vystup.push(`<h${uroven} id="${id}">${riadok(nadpis[2])}</h${uroven}>`);
      i++;
      continue;
    }
    if (/^-{3,}$/.test(r.trim())) {
      vystup.push('<hr>');
      i++;
      continue;
    }
    // Tabuľka
    if (r.trim().startsWith('|') && /^\s*\|?\s*:?-{3,}/.test(riadky[i + 1] ?? '')) {
      const bunky = (s: string) => s.trim().replace(/^\||\|$/g, '').split('|').map((b) => b.trim());
      const hlava = bunky(r);
      i += 2;
      const telo: string[][] = [];
      while (i < riadky.length && riadky[i].trim().startsWith('|')) telo.push(bunky(riadky[i++]));
      vystup.push(
        `<div class="tabulka"><table><thead><tr>${hlava.map((b) => `<th>${riadok(b)}</th>`).join('')}</tr></thead><tbody>${telo
          .map((rr) => `<tr>${rr.map((b) => `<td>${riadok(b)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      );
      continue;
    }
    // Citácia
    if (r.startsWith('>')) {
      const cast: string[] = [];
      while (i < riadky.length && riadky[i].startsWith('>')) cast.push(riadky[i++].replace(/^>\s?/, ''));
      vystup.push(`<blockquote>${riadok(cast.join(' '))}</blockquote>`);
      continue;
    }
    // Zoznamy (s pokračovacími riadkami odsadenými medzerami)
    const odrazka = /^\s*[-*]\s+/;
    const cislo = /^\s*\d+\.\s+/;
    if (odrazka.test(r) || cislo.test(r)) {
      const cislovany = cislo.test(r);
      const vzor = cislovany ? cislo : odrazka;
      const polozky: string[] = [];
      while (i < riadky.length && (vzor.test(riadky[i]) || (/^\s{2,}\S/.test(riadky[i]) && polozky.length))) {
        if (vzor.test(riadky[i])) polozky.push(riadky[i].replace(vzor, ''));
        else polozky[polozky.length - 1] += ' ' + riadky[i].trim();
        i++;
      }
      const tag = cislovany ? 'ol' : 'ul';
      vystup.push(`<${tag}>${polozky.map((p) => `<li>${riadok(p)}</li>`).join('')}</${tag}>`);
      continue;
    }
    // Odsek
    const odsek: string[] = [];
    while (
      i < riadky.length &&
      riadky[i].trim() &&
      !/^(#{1,4}\s|```|>|\s*[-*]\s+|\s*\d+\.\s+|\|)/.test(riadky[i]) &&
      !/^-{3,}$/.test(riadky[i].trim())
    ) {
      odsek.push(riadky[i++].trim());
    }
    if (odsek.length) vystup.push(`<p>${riadok(odsek.join(' '))}</p>`);
    else i++;
  }
  return vystup.join('\n');
};

export const NAVOD_HTML = markdownNaHtml(navodMd);

const STYL = `
body{margin:0;padding:32px 20px 64px;background:#f1f5f9;color:#0f172a;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
main{max-width:860px;margin:0 auto;background:#fff;border-radius:16px;padding:32px clamp(20px,5vw,48px);box-shadow:0 12px 32px -24px rgba(15,23,42,.4)}
h1{font-size:1.9rem;line-height:1.2;margin:0 0 16px}h2{font-size:1.4rem;margin:36px 0 12px;padding-top:12px;border-top:1px solid #e2e8f0}
h3{font-size:1.1rem;margin:24px 0 8px}p,ul,ol{margin:0 0 14px}li{margin:0 0 4px}a{color:#0f766e}
code{font:0.9em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#f1f5f9;padding:1px 5px;border-radius:4px}
pre{background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:10px;overflow:auto}pre code{background:none;padding:0;color:inherit}
blockquote{margin:0 0 16px;padding:12px 16px;border-left:4px solid #0f766e;background:#f0fdfa;border-radius:0 10px 10px 0}
.tabulka{overflow-x:auto;margin:0 0 16px}table{border-collapse:collapse;width:100%;font-size:.92rem}
th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;vertical-align:top}th{background:#f8fafc}hr{border:0;border-top:1px solid #e2e8f0;margin:28px 0}hr+h2{border-top:0;padding-top:0;margin-top:0}
@media print{body{background:#fff;padding:0}main{box-shadow:none;padding:0}h2{break-after:avoid}pre,table{break-inside:avoid}}
`;

/** Stiahne návod ako samostatný HTML súbor. */
export const stiahniNavod = () => {
  const html = `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>E-maily v ClubW - návod</title><style>${STYL}</style></head><body><main>${NAVOD_HTML}</main></body></html>`;
  const odkaz = document.createElement('a');
  odkaz.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  odkaz.download = 'navod-emaily.html';
  document.body.appendChild(odkaz);
  odkaz.click();
  odkaz.remove();
  setTimeout(() => URL.revokeObjectURL(odkaz.href), 1000);
};
