// Umiestnenie: backend/scripts/testovaci-obsah-obrazky.mjs
//
// Kreslí ukážkové obrázky pre skript testovaci-obsah.mjs - bez
// sťahovania z internetu a bez cudzích fotiek. Každý obrázok je SVG,
// ktoré sharp prevedie na JPEG (fotky) alebo PNG (logá, erby).
//
// Fotky sú zámerne štylizované (ihrisko, hráči ako jednoduché postavy),
// aby sa nedali zameniť so skutočnými fotkami klubu.

import sharp from 'sharp';

const PISMO = "'DejaVu Sans', 'Segoe UI', Arial, Helvetica, sans-serif";

/** Deterministický generátor náhodných čísel - rovnaký vstup, rovnaký obrázok. */
export const nahodne = (semienko) => {
  let a = semienko >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const OBLOHY = {
  den: ['#6fa8dc', '#d8ebf7'],
  sumrak: ['#2a1d4d', '#f2905a'],
  noc: ['#04060c', '#1b2a46'],
};

/** Jednoduchá postava hráča. */
const postava = (x, y, s, dres, trenky, pokozka = '#e7c09a') => `
  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})">
    <ellipse cx="0" cy="62" rx="26" ry="6" fill="#000" opacity=".25"/>
    <rect x="-15" y="18" width="11" height="42" rx="5" fill="${dres}"/>
    <rect x="4" y="18" width="11" height="42" rx="5" fill="${dres}"/>
    <rect x="-19" y="-4" width="38" height="26" rx="6" fill="${trenky}"/>
    <path d="M-24 -50 Q0 -60 24 -50 L30 -4 L-30 -4 Z" fill="${dres}"/>
    <rect x="-36" y="-48" width="12" height="36" rx="6" fill="${dres}" transform="rotate(14 -30 -48)"/>
    <rect x="24" y="-48" width="12" height="36" rx="6" fill="${dres}" transform="rotate(-14 30 -48)"/>
    <circle cx="0" cy="-70" r="16" fill="${pokozka}"/>
  </g>`;

const lopta = (x, y, r) => `
  <g transform="translate(${x} ${y})">
    <circle r="${r}" fill="#fff" stroke="#222" stroke-width="${r * 0.08}"/>
    <path d="M0 ${-r * 0.42} L${r * 0.4} ${-r * 0.13} L${r * 0.25} ${r * 0.34} L${-r * 0.25} ${r * 0.34} L${-r * 0.4} ${-r * 0.13} Z" fill="#222"/>
  </g>`;

/**
 * Štylizovaná „fotka" z ihriska.
 *
 * @param {object} o
 * @param {number} o.semienko - variácia rozmiestnenia
 * @param {'den'|'sumrak'|'noc'} o.obloha
 * @param {'zapas'|'trening'|'oslava'|'mladez'|'fanusikovia'|'stadion'|'trofej'} o.motiv
 * @param {string} o.farba - farba nášho dresu
 * @param {string} o.supar - farba dresu súpera
 */
export const fotka = ({ semienko, obloha = 'den', motiv = 'zapas', farba = '#17803d', supar = '#c62828' }) => {
  const r = nahodne(semienko);
  const W = 1600;
  const H = 1000;
  if (motiv === 'trofej') return trofej(r, farba);

  const [o1, o2] = OBLOHY[obloha];
  const svetla = obloha !== 'den';
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="obl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o1}"/><stop offset="1" stop-color="${o2}"/></linearGradient>
    <radialGradient id="ziara"><stop offset="0" stop-color="#fff8d6" stop-opacity=".95"/><stop offset="1" stop-color="#fff8d6" stop-opacity="0"/></radialGradient>
    <linearGradient id="tien" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#obl)"/>`;

  // Tribúna s divákmi
  s += `<path d="M0 300 L${W} 260 L${W} 470 L0 480 Z" fill="#262b35"/>`;
  s += `<path d="M0 300 L${W} 260 L${W} 285 L0 322 Z" fill="#3a404c"/>`;
  const hustota = motiv === 'fanusikovia' ? 2600 : motiv === 'stadion' ? 900 : 1500;
  const farbyDivakov = [farba, '#ffffff', '#d9d9d9', '#30343c', '#8a8f99', farba];
  for (let i = 0; i < hustota; i++) {
    const x = r() * W;
    const yMin = 300 - (x / W) * 40 + 24;
    const y = yMin + r() * (470 - yMin - 6);
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(3 + r() * 3).toFixed(1)}" fill="${farbyDivakov[Math.floor(r() * farbyDivakov.length)]}" opacity=".85"/>`;
  }
  if (motiv === 'fanusikovia') {
    // Šály a vlajky nad hlavami
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 180 + r() * 40;
      const y = 330 + r() * 60;
      s += `<rect x="${x}" y="${y}" width="120" height="22" rx="4" fill="${farba}" transform="rotate(${(-8 + r() * 16).toFixed(0)} ${x} ${y})"/>`;
      s += `<rect x="${x + 20}" y="${y}" width="16" height="22" fill="#fff" transform="rotate(${(-8 + r() * 16).toFixed(0)} ${x} ${y})"/>`;
    }
    s += `<path d="M120 470 L120 250" stroke="#ddd" stroke-width="6"/><path d="M120 250 L330 280 L120 330 Z" fill="${farba}"/>`;
    s += `<path d="M1430 460 L1430 230" stroke="#ddd" stroke-width="6"/><path d="M1430 230 L1220 262 L1430 312 Z" fill="#fff"/>`;
  }

  // Stožiare osvetlenia
  if (svetla || motiv === 'stadion') {
    for (const x of [140, 1460]) {
      s += `<rect x="${x - 6}" y="70" width="12" height="230" fill="#1a1d23"/>`;
      s += `<rect x="${x - 60}" y="40" width="120" height="44" rx="6" fill="#2b2f37"/>`;
      if (svetla) s += `<circle cx="${x}" cy="62" r="260" fill="url(#ziara)" opacity=".6"/>`;
      for (let i = 0; i < 4; i++) s += `<rect x="${x - 52 + i * 27}" y="48" width="22" height="28" rx="4" fill="${svetla ? '#fffbe6' : '#c9ced6'}"/>`;
    }
  }

  // Trávnik s pruhmi a čiarami
  const pruhy = 10;
  let y = 470;
  for (let i = 0; i < pruhy; i++) {
    const v = 30 + i * 9;
    s += `<rect x="0" y="${y}" width="${W}" height="${v + 1}" fill="${i % 2 ? '#2f8a3e' : '#3a9a49'}"/>`;
    y += v;
  }
  s += `<g fill="none" stroke="#f4fff4" stroke-opacity=".85" stroke-width="6">
    <path d="M60 990 L330 486 L1270 486 L1540 990"/>
    <path d="M800 486 L800 1000"/>
    <ellipse cx="800" cy="690" rx="250" ry="88"/>
  </g>`;

  // Postavy podľa motívu
  const postavy = [];
  const pridaj = (n, dres, trenky, yOd, yDo, mierka) => {
    for (let i = 0; i < n; i++) {
      const yy = yOd + r() * (yDo - yOd);
      postavy.push({ x: 120 + r() * (W - 240), y: yy, s: mierka * (0.55 + ((yy - 470) / 530) * 0.9), dres, trenky });
    }
  };
  if (motiv === 'zapas') {
    pridaj(6, farba, '#ffffff', 560, 900, 1.6);
    pridaj(5, supar, '#1d1d1d', 560, 900, 1.6);
  } else if (motiv === 'trening') {
    pridaj(9, farba, '#1d2430', 580, 880, 1.5);
    for (let i = 0; i < 8; i++) s += `<path d="M${300 + i * 130} 900 l-14 26 h28 z" fill="#ff8a00"/>`;
  } else if (motiv === 'oslava') {
    // Skupina hráčov v objatí uprostred
    for (let i = 0; i < 7; i++) postavy.push({ x: 560 + i * 80 + r() * 20, y: 760 + r() * 40, s: 2.2, dres: farba, trenky: '#ffffff' });
    for (let i = 0; i < 60; i++) s += `<rect x="${(r() * W).toFixed(0)}" y="${(r() * 500).toFixed(0)}" width="10" height="18" fill="${[farba, '#fff', '#ffd54a'][i % 3]}" transform="rotate(${(r() * 180).toFixed(0)})"/>`;
  } else if (motiv === 'mladez') {
    pridaj(10, farba, '#ffffff', 600, 900, 1.05);
    pridaj(2, '#1d2430', '#1d2430', 620, 760, 1.6);
  } else if (motiv === 'stadion') {
    pridaj(2, '#ffeb3b', '#1d1d1d', 640, 760, 1.2);
  } else if (motiv === 'fanusikovia') {
    pridaj(3, farba, '#ffffff', 620, 820, 1.3);
  }
  postavy.sort((a, b) => a.y - b.y);
  for (const p of postavy) s += postava(p.x, p.y, p.s, p.dres, p.trenky);
  if (motiv !== 'stadion' && motiv !== 'fanusikovia') s += lopta(400 + r() * 800, 840 + r() * 80, 22);

  // Bránka na kraji pri zápase a tréningu
  if (motiv === 'zapas' || motiv === 'trening') {
    s += `<g fill="none" stroke="#fff" stroke-width="8"><path d="M1330 620 L1330 470 L1560 470 L1560 640"/></g>`;
    s += `<g stroke="#fff" stroke-opacity=".35" stroke-width="2">${Array.from({ length: 10 }, (_, i) => `<path d="M${1340 + i * 22} 476 L${1340 + i * 22} 630"/>`).join('')}</g>`;
  }
  s += `<rect width="${W}" height="${H}" fill="url(#tien)"/></svg>`;
  return s;
};

/** Pohár na tmavom pozadí s konfetami. */
const trofej = (r, farba) => {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs>
    <radialGradient id="poz" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="${farba}"/><stop offset="1" stop-color="#05080a"/></radialGradient>
    <linearGradient id="zlato" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".45" stop-color="#e2b33c"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#poz)"/>`;
  for (let i = 0; i < 140; i++) {
    s += `<rect x="${(r() * 1600).toFixed(0)}" y="${(r() * 1000).toFixed(0)}" width="${(8 + r() * 8).toFixed(0)}" height="${(14 + r() * 10).toFixed(0)}" rx="2" fill="${['#ffd54a', '#ffffff', farba, '#e2b33c'][i % 4]}" opacity=".8" transform="rotate(${(r() * 180).toFixed(0)} 800 500)"/>`;
  }
  s += `<g fill="url(#zlato)">
    <path d="M640 230 H960 V300 C960 450 880 520 800 540 C720 520 640 450 640 300 Z"/>
    <path d="M640 260 C540 260 540 400 660 420 L668 392 C590 380 590 290 640 290 Z"/>
    <path d="M960 260 C1060 260 1060 400 940 420 L932 392 C1010 380 1010 290 960 290 Z"/>
    <rect x="775" y="535" width="50" height="110"/>
    <path d="M700 645 H900 L930 720 H670 Z"/>
    <rect x="640" y="720" width="320" height="70" rx="8"/>
  </g>
  <rect x="700" y="740" width="200" height="30" rx="4" fill="#3b2a0a" opacity=".5"/>
  </svg>`;
  return s;
};

/** Portrét hráča - silueta v drese s číslom. */
export const portret = ({ cislo, farba = '#17803d', druha = '#ffffff', semienko = 1, oblek = false }) => {
  const r = nahodne(semienko);
  const pokozky = ['#f1c9a5', '#e0ac85', '#c98e66', '#8d5a3b', '#f5d5b8'];
  const vlasy = ['#2b1d14', '#4a3222', '#1a1a1a', '#8a5a2b', '#c9a36a'];
  const koza = pokozky[Math.floor(r() * pokozky.length)];
  const vlas = vlasy[Math.floor(r() * vlasy.length)];
  const telo = oblek ? '#1f2633' : farba;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${farba}"/><stop offset="1" stop-color="#0b1015"/></linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#p)"/>
  ${cislo ? `<text x="400" y="560" text-anchor="middle" font-family="${PISMO}" font-weight="900" font-size="560" fill="#fff" opacity=".08">${cislo}</text>` : ''}
  <path d="M120 1000 C120 800 230 700 400 700 C570 700 680 800 680 1000 Z" fill="${telo}"/>
  ${oblek ? `<path d="M340 705 L400 840 L460 705 Z" fill="#ffffff"/><path d="M388 720 L412 720 L420 860 L400 890 L380 860 Z" fill="${farba}"/>` : `<path d="M340 702 Q400 760 460 702" fill="none" stroke="${druha}" stroke-width="18"/>`}
  ${!oblek && cislo ? `<text x="400" y="930" text-anchor="middle" font-family="${PISMO}" font-weight="800" font-size="120" fill="${druha}">${cislo}</text>` : ''}
  <rect x="352" y="560" width="96" height="150" rx="40" fill="${koza}"/>
  <ellipse cx="400" cy="440" rx="130" ry="160" fill="${koza}"/>
  <path d="M264 450 C240 190 560 190 536 450 C526 360 480 335 400 335 C320 335 274 360 264 450 Z" fill="${vlas}"/>
  </svg>`;
};

/** Erb klubu - štít s iniciálkami. */
export const erb = ({ skratka, farba = '#17803d', druha = '#ffffff', tvar = 0 }) => {
  const stit = 'M200 22 L360 72 V196 C360 300 292 360 200 392 C108 360 40 300 40 196 V72 Z';
  const kruh = 'M200 24 A176 176 0 1 1 199.9 24 Z';
  const cesta = tvar % 2 ? kruh : stit;
  const pruh =
    tvar % 3 === 0
      ? `<rect x="0" y="150" width="400" height="70" fill="${druha}" opacity=".9"/>`
      : tvar % 3 === 1
        ? `<path d="M0 330 L330 0 H400 V60 L60 400 H0 Z" fill="${druha}" opacity=".85"/>`
        : `<rect x="165" y="0" width="70" height="400" fill="${druha}" opacity=".9"/>`;
  const velkost = skratka.length > 3 ? 92 : 112;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs><clipPath id="o"><path d="${cesta}"/></clipPath></defs>
  <path d="${cesta}" fill="${farba}"/>
  <g clip-path="url(#o)">${pruh}</g>
  <path d="${cesta}" fill="none" stroke="#11161c" stroke-opacity=".35" stroke-width="10"/>
  <text x="200" y="${tvar % 2 ? 236 : 246}" text-anchor="middle" font-family="${PISMO}" font-weight="900" font-size="${velkost}" fill="#11161c" stroke="#ffffff" stroke-width="6" paint-order="stroke">${escape(skratka)}</text>
  </svg>`;
};

/** Logo partnera - značka a názov. */
export const logoPartnera = ({ nazov, farba, ikona = 0 }) => {
  const ikony = [
    `<circle cx="70" cy="120" r="46" fill="${farba}"/><circle cx="70" cy="120" r="20" fill="#fff"/>`,
    `<rect x="26" y="76" width="88" height="88" rx="18" fill="${farba}"/><path d="M48 140 L70 96 L92 140 Z" fill="#fff"/>`,
    `<path d="M70 70 L120 160 H20 Z" fill="${farba}"/>`,
    `<path d="M24 120 C24 80 70 64 70 64 C70 64 116 80 116 120 C116 160 70 176 70 176 C70 176 24 160 24 120 Z" fill="${farba}"/>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
  ${ikony[ikona % ikony.length]}
  <text x="140" y="138" font-family="${PISMO}" font-weight="800" font-size="${nazov.length > 14 ? 44 : 56}" fill="#1b222c">${escape(nazov)}</text>
  </svg>`;
};

/** Produkt fanshopu na svetlom pozadí. */
export const produkt = ({ typ, farba = '#17803d', druha = '#ffffff', cislo = '10' }) => {
  const tvary = {
    dres: `<path d="M330 230 L420 190 Q500 240 580 190 L670 230 L780 330 L700 420 L650 380 V800 H350 V380 L300 420 L220 330 Z" fill="${farba}"/>
      <path d="M420 190 Q500 260 580 190" fill="none" stroke="${druha}" stroke-width="16"/>
      <text x="500" y="620" text-anchor="middle" font-family="${PISMO}" font-weight="900" font-size="190" fill="${druha}">${cislo}</text>`,
    mikina: `<path d="M330 260 L420 220 Q500 280 580 220 L670 260 L790 700 L720 720 L650 420 V820 H350 V420 L280 720 L210 700 Z" fill="${farba}"/>
      <path d="M420 220 C420 120 580 120 580 220 Q500 270 420 220 Z" fill="${farba}" stroke="#000" stroke-opacity=".15" stroke-width="6"/>
      <rect x="420" y="560" width="160" height="90" rx="20" fill="#000" opacity=".12"/>`,
    sal: `<g transform="rotate(-28 500 500)"><rect x="140" y="440" width="720" height="130" rx="12" fill="${farba}"/>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${200 + i * 110}" y="440" width="40" height="130" fill="${druha}"/>`).join('')}
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${118}" y="${448 + i * 15}" width="24" height="8" fill="${farba}"/><rect x="${858}" y="${448 + i * 15}" width="24" height="8" fill="${farba}"/>`).join('')}</g>`,
    ciapka: `<path d="M280 640 C280 380 720 380 720 640 Z" fill="${farba}"/><rect x="260" y="620" width="480" height="110" rx="20" fill="${druha}"/>
      <circle cx="500" cy="340" r="64" fill="${druha}"/>`,
    hrncek: `<rect x="320" y="330" width="320" height="400" rx="30" fill="#fafafa" stroke="#d7dbe0" stroke-width="8"/>
      <path d="M640 420 C760 420 760 640 640 640" fill="none" stroke="#d7dbe0" stroke-width="40"/>
      <rect x="320" y="430" width="320" height="70" fill="${farba}"/>`,
    lopta: `<circle cx="500" cy="520" r="250" fill="#fff" stroke="#1b222c" stroke-width="10"/>
      <path d="M500 400 L600 470 L560 590 L440 590 L400 470 Z" fill="${farba}"/>
      <path d="M500 270 L500 400 M600 470 L730 430 M560 590 L640 710 M440 590 L360 710 M400 470 L270 430" stroke="#1b222c" stroke-width="10"/>`,
    vlajka: `<rect x="250" y="180" width="18" height="660" rx="9" fill="#9aa1ab"/>
      <path d="M268 200 H780 L720 360 L780 520 H268 Z" fill="${farba}"/><rect x="268" y="320" width="460" height="80" fill="${druha}" opacity=".9"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" fill="#f1f3f5"/>
  <ellipse cx="500" cy="860" rx="300" ry="36" fill="#000" opacity=".08"/>
  ${tvary[typ] ?? tvary.dres}
  </svg>`;
};

/** SVG → JPEG. */
export const naJpeg = (svg) => sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();

/** SVG → PNG s priehľadným pozadím. */
export const naPng = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

/**
 * Jednoduchý PDF dokument s nadpisom a odsekmi.
 * Štandardné písmo PDF nepozná diakritiku, preto ju odstránime.
 */
export const pdf = (nadpis, odseky) => {
  const bezDiakritiky = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[()\\]/g, '');
  const riadky = [`BT /F1 22 Tf 72 770 Td (${bezDiakritiky(nadpis)}) Tj ET`];
  let y = 730;
  for (const odsek of odseky) {
    // Zalomenie na ~90 znakov
    const slova = bezDiakritiky(odsek).split(' ');
    let riadok = '';
    for (const slovo of slova) {
      if ((riadok + ' ' + slovo).length > 88) {
        riadky.push(`BT /F1 11 Tf 72 ${y} Td (${riadok.trim()}) Tj ET`);
        y -= 16;
        riadok = '';
      }
      riadok += ' ' + slovo;
    }
    riadky.push(`BT /F1 11 Tf 72 ${y} Td (${riadok.trim()}) Tj ET`);
    y -= 28;
  }
  const obsah = riadky.join('\n');
  const objekty = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(obsah)} >>\nstream\n${obsah}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let vystup = '%PDF-1.4\n';
  const pozicie = [];
  objekty.forEach((o, i) => {
    pozicie.push(Buffer.byteLength(vystup));
    vystup += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(vystup);
  vystup += `xref\n0 ${objekty.length + 1}\n0000000000 65535 f \n`;
  for (const p of pozicie) vystup += `${String(p).padStart(10, '0')} 00000 n \n`;
  vystup += `trailer\n<< /Size ${objekty.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(vystup, 'latin1');
};
