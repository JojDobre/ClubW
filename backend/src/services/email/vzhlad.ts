// Umiestnenie: backend/src/services/email/vzhlad.ts
// Z textu šablóny (s jednoduchým zápisom a značkami {{...}}) vyrobí
// e-mail: HTML v farbách klubu s logom a textovú verziu.
//
// Hodnoty značiek (meno, odpovede z formulára...) môžu pochádzať od
// návštevníkov, preto sa vkladajú až po spracovaní zápisu a vždy
// escapované - zápis [odkaz](...) v mene z formulára sa nestane tlačidlom.

export interface KlubEmailu {
  nazov: string;
  logo: string | null;
  farba: string;
  farbaKontrast: string;
  email: string | null;
  telefon: string | null;
  adresa: string | null;
  web: string;
}

export interface HotovyEmail {
  predmet: string;
  text: string;
  html: string;
}

const ZNACKA = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
/** Zástupný znak hodnoty počas spracovania zápisu (nevyskytuje sa v texte) */
const zastupca = (i: number) => `\u0000${i}\u0000`;
const ZASTUPCA = /\u0000(\d+)\u0000/g;

const escapuj = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const bezpecnaAdresa = (url: string) => (/^(https?:\/\/|mailto:|tel:)/i.test(url.trim()) ? url.trim() : null);

/**
 * Vynechá riadky, v ktorých sú všetky značky prázdne
 * („Poznámka: {{poznamka}}" bez poznámky sa neukáže).
 */
const vynechajPrazdneRiadky = (sablona: string, hodnoty: Record<string, string>) =>
  sablona
    .split('\n')
    .filter((riadok) => {
      const znacky = [...riadok.matchAll(ZNACKA)].map((m) => m[1]);
      return znacky.length === 0 || znacky.some((z) => (hodnoty[z] ?? '').trim() !== '');
    })
    .join('\n');

/** Nahradí značky hodnotami (pre predmet a textovú verziu). */
export const doplnZnacky = (sablona: string, hodnoty: Record<string, string>) =>
  sablona.replace(ZNACKA, (_, z: string) => hodnoty[z] ?? '');

// ===== Textová verzia =====

const naText = (sablona: string, hodnoty: Record<string, string>) =>
  doplnZnacky(vynechajPrazdneRiadky(sablona, hodnoty), hodnoty)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, popis: string, url: string) => (popis ? `${popis}: ${url}` : url))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1: $2')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ===== HTML =====

const STYL_ODKAZU = (farba: string) => `color:${farba};text-decoration:underline;`;

/** Zápis jedného riadku/odseku na HTML (bez blokových prvkov). */
const riadokNaHtml = (riadok: string, hodnoty: string[], klub: KlubEmailu) => {
  const vloz = (s: string) =>
    s.replace(ZASTUPCA, (_, i: string) => {
      const hodnota = hodnoty[Number(i)] ?? '';
      // Hodnota, ktorá je celá adresou, sa stane odkazom
      if (/^https?:\/\/\S+$/.test(hodnota.trim())) {
        const url = escapuj(hodnota.trim());
        return `<a href="${url}" style="${STYL_ODKAZU(klub.farba)}">${url}</a>`;
      }
      return escapuj(hodnota).replace(/\n/g, '<br>');
    });
  const adresa = (s: string) => {
    const hodnota = s.replace(ZASTUPCA, (_, i: string) => hodnoty[Number(i)] ?? '');
    const bezpecna = bezpecnaAdresa(hodnota);
    return bezpecna ? escapuj(bezpecna) : null;
  };

  // Text šablóny escapujeme, zástupcovia hodnôt sa vložia nakoniec
  let html = escapuj(riadok);
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (cele, popis: string, url: string) => {
    const a = adresa(url.replace(/&amp;/g, '&'));
    return a ? `<img src="${a}" alt="${popis}" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:8px 0;">` : cele;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (cele, text: string, url: string) => {
    const a = adresa(url.replace(/&amp;/g, '&'));
    return a ? `<a href="${a}" style="${STYL_ODKAZU(klub.farba)}">${text}</a>` : cele;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Holé adresy v texte šablóny
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (_, pred: string, url: string) => `${pred}<a href="${url}" style="${STYL_ODKAZU(klub.farba)}">${url}</a>`);
  return vloz(html);
};

const tlacidlo = (text: string, url: string, klub: KlubEmailu) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 18px;"><tr><td style="border-radius:999px;background:${klub.farba};">` +
  `<a href="${url}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:${klub.farba};color:${klub.farbaKontrast};` +
  `font-weight:700;font-size:15px;text-decoration:none;">${text}</a></td></tr></table>`;

const obsahNaHtml = (sablona: string, hodnotyZnaciek: Record<string, string>, klub: KlubEmailu) => {
  const hodnoty: string[] = [];
  const sZastupcami = vynechajPrazdneRiadky(sablona, hodnotyZnaciek).replace(ZNACKA, (_, z: string) => {
    hodnoty.push(hodnotyZnaciek[z] ?? '');
    return zastupca(hodnoty.length - 1);
  });

  const odseky = sZastupcami
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((o) => o.trim())
    // Odsek zo samých prázdnych hodnôt (napr. {{pokyny}} bez pokynov)
    .filter((o) => o.replace(ZASTUPCA, (_, i: string) => hodnoty[Number(i)] ?? '').trim() !== '');

  return odseky
    .map((odsek) => {
      const riadky = odsek.split('\n');
      // Tlačidlo: odsek je len [Text](adresa)
      const t = odsek.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (t) {
        const url = bezpecnaAdresa(t[2].replace(ZASTUPCA, (_, i: string) => hodnoty[Number(i)] ?? ''));
        if (url) return tlacidlo(riadokNaHtml(t[1], hodnoty, klub), escapuj(url), klub);
      }
      // Zoznam: všetky riadky začínajú „- " alebo „• "
      if (riadky.every((r) => /^\s*[-•]\s+/.test(r))) {
        const polozky = riadky.map((r) => `<li style="margin:0 0 4px;">${riadokNaHtml(r.replace(/^\s*[-•]\s+/, ''), hodnoty, klub)}</li>`).join('');
        return `<ul style="margin:0 0 16px;padding-left:20px;">${polozky}</ul>`;
      }
      return `<p style="margin:0 0 16px;">${riadky.map((r) => riadokNaHtml(r, hodnoty, klub)).join('<br>')}</p>`;
    })
    .join('\n');
};

/** Absolútna adresa obrázka (logo je uložené ako /uploads/...). */
const absolutna = (cesta: string | null, web: string) => (!cesta ? null : /^https?:\/\//.test(cesta) ? cesta : `${web}${cesta.startsWith('/') ? '' : '/'}${cesta}`);

/** Obal e-mailu: hlavička s logom, biela karta s obsahom, pätička. */
export const obalEmailu = (obsah: string, klub: KlubEmailu, moznosti: { pata?: string | null; odhlasenie?: string | null; predmet: string }) => {
  const logo = absolutna(klub.logo, klub.web);
  const kontakt = [klub.adresa, klub.telefon, klub.email].filter(Boolean).map((k) => escapuj(String(k))).join(' · ');
  const pata = moznosti.pata ? escapuj(moznosti.pata).replace(/\n/g, '<br>') : '';
  return `<!doctype html>
<html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapuj(moznosti.predmet)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
<tr><td style="background:${klub.farba};border-radius:16px 16px 0 0;padding:20px 28px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
${logo ? `<td style="padding-right:14px;vertical-align:middle;"><img src="${escapuj(logo)}" alt="" width="44" height="44" style="display:block;width:44px;height:44px;object-fit:contain;background:#ffffff;border-radius:10px;padding:4px;"></td>` : ''}
<td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:${klub.farbaKontrast};">${escapuj(klub.nazov)}</td>
</tr></table>
</td></tr>
<tr><td style="background:#ffffff;padding:28px;border-radius:0 0 16px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a;">
${obsah}
</td></tr>
<tr><td style="padding:18px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
${pata ? `<p style="margin:0 0 8px;">${pata}</p>` : ''}
<p style="margin:0 0 8px;"><a href="${escapuj(klub.web)}" style="color:#64748b;">${escapuj(klub.nazov)}</a>${kontakt ? ` · ${kontakt}` : ''}</p>
${moznosti.odhlasenie ? `<p style="margin:0;">Tieto správy dostávate, lebo ste súhlasili so zasielaním oznamov klubu. <a href="${escapuj(moznosti.odhlasenie)}" style="color:#64748b;">Odhlásiť sa</a></p>` : ''}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
};

/**
 * Vyrobí hotový e-mail zo šablóny.
 *
 * @param sablona - predmet a text so značkami
 * @param hodnoty - hodnoty značiek (spoločné aj vlastné)
 */
export const vyrobEmail = (
  sablona: { predmet: string; obsah: string },
  hodnoty: Record<string, string>,
  klub: KlubEmailu,
  moznosti: { pata?: string | null; odhlasenie?: string | null } = {}
): HotovyEmail => {
  const predmet = doplnZnacky(sablona.predmet, hodnoty).replace(/\s+/g, ' ').trim();
  const pata = moznosti.pata ? doplnZnacky(moznosti.pata, hodnoty) : null;
  let text = naText(sablona.obsah, hodnoty);
  if (pata) text += `\n\n--\n${pata}`;
  if (moznosti.odhlasenie) text += `\n\nOdhlásenie z oznamov: ${moznosti.odhlasenie}`;
  const html = obalEmailu(obsahNaHtml(sablona.obsah, hodnoty, klub), klub, { pata, odhlasenie: moznosti.odhlasenie, predmet });
  return { predmet, text, html };
};
