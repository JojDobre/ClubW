// Umiestnenie: frontend/scripts/preklady.mjs
// Kontrola prekladov administrácie.
//
//   npm run preklady                    prehľad: koľko textov chýba v en/cs/pl/de/es/fr
//   npm run preklady -- --kontrola      skončí chybou, ak niečo chýba (CI)
//   npm run preklady -- --chybajuce x.json   zapíše chýbajúce texty do súboru
//
// Texty sa hľadajú vo volaniach tr('...') a trn(n, 'a', 'b', 'c') v celom
// src/. Texty, ktoré sa do tr() dostanú ako premenná (názvy systémových
// rolí, sekcie v logoch...), sú v src/i18n/dynamicke.json.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(koren, 'src');
const I18N = path.join(SRC, 'i18n');
const JAZYKY = ['en', 'cs', 'pl', 'de', 'es', 'fr'];
// Počet tvarov množného čísla (trn) v preklade
const TVAROV = { en: 2, cs: 3, pl: 3, de: 2, es: 2, fr: 2 };
const argumenty = process.argv.slice(2);

const subory = [];
const prejdi = (d) => {
  for (const p of fs.readdirSync(d, { withFileTypes: true })) {
    const plna = path.join(d, p.name);
    if (p.isDirectory()) prejdi(plna);
    else if (/\.(ts|tsx)$/.test(p.name) && !/\.d\.ts$/.test(p.name)) subory.push(plna);
  }
};
prejdi(SRC);

const kluce = new Map(); // kľúč -> prvé miesto výskytu
const mnozne = new Set(); // kľúče z trn() - tvary oddelené |
const dynamicke = [];
for (const subor of subory) {
  const zdroj = fs.readFileSync(subor, 'utf8');
  if (!/\btrn?\(/.test(zdroj)) continue;
  const sf = ts.createSourceFile(subor, zdroj, ts.ScriptTarget.Latest, true, subor.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const text = (u) => (u && (ts.isStringLiteral(u) || ts.isNoSubstitutionTemplateLiteral(u)) ? u.text : null);
  const navstiv = (u) => {
    if (ts.isCallExpression(u) && ts.isIdentifier(u.expression)) {
      const miesto = `${path.relative(koren, subor)}:${sf.getLineAndCharacterOfPosition(u.getStart()).line + 1}`;
      if (u.expression.text === 'tr') {
        const k = text(u.arguments[0]);
        if (k !== null) { if (!kluce.has(k)) kluce.set(k, miesto); }
        else dynamicke.push(miesto);
      } else if (u.expression.text === 'trn') {
        const [a, b, c] = u.arguments.slice(1, 4).map(text);
        if (a !== null && b !== null && c !== null) { const k = `${a}|${b}|${c}`; mnozne.add(k); if (!kluce.has(k)) kluce.set(k, miesto); }
      }
    }
    ts.forEachChild(u, navstiv);
  };
  navstiv(sf);
}
for (const k of JSON.parse(fs.readFileSync(path.join(I18N, 'dynamicke.json'), 'utf8'))) if (!kluce.has(k)) kluce.set(k, 'i18n/dynamicke.json');

let chyba = false;
const chybajuce = {};
for (const j of JAZYKY) {
  const slovnik = JSON.parse(fs.readFileSync(path.join(I18N, `${j}.json`), 'utf8'));
  const chyb = [...kluce.keys()].filter((k) => !(k in slovnik) || !slovnik[k]);
  const nepouzite = Object.keys(slovnik).filter((k) => !kluce.has(k));
  // Parametre {x} musia v preklade ostať, inak by sa hodnota stratila
  const zleParametre = [...kluce.keys()].filter((k) => {
    if (!slovnik[k]) return false;
    // trn: každý tvar musí mať svoje parametre a tvarov musí byť správny počet
    const tvary = mnozne.has(k) ? slovnik[k].split('|') : [slovnik[k]];
    if (mnozne.has(k) && tvary.length !== TVAROV[j]) return true;
    const parametre = new Set([...k.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((p) => p !== 'n'));
    return tvary.some((t) => [...parametre].some((p) => !t.includes(`{${p}}`)));
  });
  console.log(`${j}: ${kluce.size} textov, chýba ${chyb.length}, nepoužité ${nepouzite.length}, zlé parametre ${zleParametre.length}`);
  zleParametre.slice(0, 20).forEach((k) => console.log(`   parameter: ${k} → ${slovnik[k]}`));
  if (argumenty.includes('--podrobne')) chyb.forEach((k) => console.log(`   chýba: ${k}  (${kluce.get(k)})`));
  if (chyb.length || zleParametre.length) chyba = true;
  chyb.forEach((k) => (chybajuce[k] = kluce.get(k)));
}
const i = argumenty.indexOf('--chybajuce');
if (i >= 0) fs.writeFileSync(argumenty[i + 1], JSON.stringify(chybajuce, null, 1));
if (argumenty.includes('--kontrola') && chyba) {
  console.error(`Chýbajú preklady - doplňte ich do src/i18n/${JAZYKY.join('/')}.json`);
  process.exit(1);
}
