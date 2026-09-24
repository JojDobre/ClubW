// Umiestnenie: backend/scripts/preklady.mjs
// Kontrola prekladov hlášok servera (administrácia v češtine a angličtine).
//
//   npm run preklady                        prehľad chýbajúcich prekladov
//   npm run preklady -- --kontrola          skončí chybou, ak niečo chýba (CI)
//   npm run preklady -- --chybajuce x.json  zapíše chýbajúce hlášky do súboru
//
// Hľadá texty, ktoré môžu odísť v odpovedi ako hláška: hodnoty message,
// msg, chyba, sprava, argumenty withMessage() a new ...Error(). Text so
// ${premennou} sa stane vzorom s {0}, {1}... Hlášky skladané inak sú
// v src/i18n/dalsie.json.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(koren, 'package.json'))('typescript');
const SRC = path.join(koren, 'src');
const I18N = path.join(SRC, 'i18n');
const argumenty = process.argv.slice(2);

const DIAKRITIKA = /[áäčďéíľĺňóôŕšťúýžÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/;
const jeHlaska = (s) => DIAKRITIKA.test(s) || /^[A-ZÁ-Ž][a-zá-ž]+( [a-zá-ž0-9]+){1,}/.test(s);
const KLUCE = new Set(['message', 'msg', 'chyba', 'sprava', 'hlaska']);

const subory = [];
const prejdi = (d) => {
  for (const p of fs.readdirSync(d, { withFileTypes: true })) {
    const plna = path.join(d, p.name);
    if (p.isDirectory()) prejdi(plna);
    else if (/\.ts$/.test(p.name)) subory.push(plna);
  }
};
prejdi(SRC);

const kluce = new Map();
const pridaj = (k, miesto) => { if (k && jeHlaska(k) && !kluce.has(k)) kluce.set(k, miesto); };

/** Texty vo výraze (aj vo vetvách ternára a za ||). */
const zberTextov = (u, miesto) => {
  if (ts.isStringLiteral(u) || ts.isNoSubstitutionTemplateLiteral(u)) return pridaj(u.text, miesto);
  if (ts.isTemplateExpression(u)) {
    let k = u.head.text;
    u.templateSpans.forEach((s, i) => { k += `{${i}}` + s.literal.text; zberTextov(s.expression, miesto); });
    return pridaj(k, miesto);
  }
  if (ts.isConditionalExpression(u)) { zberTextov(u.whenTrue, miesto); return zberTextov(u.whenFalse, miesto); }
  if (ts.isBinaryExpression(u) && u.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    // 'text ' + `ďalší ${x}` + ... sa na serveri zlepí do jednej hlášky
    const casti = [];
    const rozloz = (v) => {
      if (ts.isBinaryExpression(v) && v.operatorToken.kind === ts.SyntaxKind.PlusToken) { rozloz(v.left); rozloz(v.right); }
      else if (ts.isParenthesizedExpression(v)) rozloz(v.expression);
      else casti.push(v);
    };
    rozloz(u);
    let k = '', i = 0;
    for (const c of casti) {
      if (ts.isStringLiteral(c) || ts.isNoSubstitutionTemplateLiteral(c)) k += c.text;
      else if (ts.isTemplateExpression(c)) { k += c.head.text; c.templateSpans.forEach((s) => { k += `{${i++}}` + s.literal.text; }); }
      else { k += `{${i++}}`; zberTextov(c, miesto); }
    }
    return pridaj(k, miesto);
  }
  if (ts.isBinaryExpression(u)) { zberTextov(u.left, miesto); return zberTextov(u.right, miesto); }
  if (ts.isParenthesizedExpression(u)) return zberTextov(u.expression, miesto);
};

for (const subor of subory) {
  if (subor.startsWith(I18N)) continue;
  const sf = ts.createSourceFile(subor, fs.readFileSync(subor, 'utf8'), ts.ScriptTarget.Latest, true);
  const navstiv = (u) => {
    const miesto = () => `${path.relative(koren, subor)}:${sf.getLineAndCharacterOfPosition(u.getStart()).line + 1}`;
    if (ts.isPropertyAssignment(u) && KLUCE.has(u.name.getText().replace(/['"]/g, ''))) zberTextov(u.initializer, miesto());
    else if (ts.isVariableDeclaration(u) && u.initializer && /^(sprava|hlaska|message|chyba)$/.test(u.name.getText())) zberTextov(u.initializer, miesto());
    else if (ts.isCallExpression(u) && /\.withMessage$|^odpovedzChybou$/.test(u.expression.getText())) u.arguments.forEach((a) => zberTextov(a, miesto()));
    else if (ts.isNewExpression(u) && /Error$|^ChybaSablony$/.test(u.expression.getText()) && u.arguments?.[0]) zberTextov(u.arguments[0], miesto());
    else if (ts.isReturnStatement(u) && u.expression && ts.isObjectLiteralExpression(u.expression)) { /* spracuje PropertyAssignment */ }
    ts.forEachChild(u, navstiv);
  };
  navstiv(sf);
}
for (const k of JSON.parse(fs.readFileSync(path.join(I18N, 'dalsie.json'), 'utf8'))) if (!kluce.has(k)) kluce.set(k, 'i18n/dalsie.json');

let chyba = false;
const chybajuce = {};
for (const j of ['en', 'cs']) {
  const slovnik = JSON.parse(fs.readFileSync(path.join(I18N, `${j}.json`), 'utf8'));
  const chyb = [...kluce.keys()].filter((k) => !slovnik[k]);
  const zleParametre = [...kluce.keys()].filter((k) => slovnik[k] && [...k.matchAll(/\{(\d+)\}/g)].some((m) => !slovnik[k].includes(`{${m[1]}}`)));
  console.log(`${j}: ${kluce.size} hlášok, chýba ${chyb.length}, zlé parametre ${zleParametre.length}`);
  zleParametre.slice(0, 20).forEach((k) => console.log(`   parameter: ${k} → ${slovnik[k]}`));
  if (argumenty.includes('--podrobne')) chyb.forEach((k) => console.log(`   chýba: ${k}  (${kluce.get(k)})`));
  if (chyb.length || zleParametre.length) chyba = true;
  chyb.forEach((k) => (chybajuce[k] = kluce.get(k)));
}
const i = argumenty.indexOf('--chybajuce');
if (i >= 0) fs.writeFileSync(argumenty[i + 1], JSON.stringify(chybajuce, null, 1));
if (argumenty.includes('--kontrola') && chyba) {
  console.error('Chýbajú preklady hlášok - doplňte ich do src/i18n/en.json a cs.json');
  process.exit(1);
}
