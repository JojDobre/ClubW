#!/usr/bin/env node
// Umiestnenie: scripts/aktualizuj.mjs
// Aktualizátor ClubW - nainštaluje novú verziu z licenčného servera.
//
// Spúšťa ho backend (services/aktualizacie.ts) ako samostatný proces,
// ktorý prežije reštart backendu. Ručne sa dá spustiť takto:
//
//   AKT_VERZIA_ID=12 AKT_VERZIA=1.2.0 AKT_SHA256=<sha256> \
//   LICENSE_KEY=... LICENSE_SERVER_URL=https://licencie.example.sk \
//   node scripts/aktualizuj.mjs
//
// POSTUP:
//  1. stiahne balík z licenčného servera (len s platným licenčným kľúčom)
//  2. overí kontrolný súčet sha256 z podpísanej odpovede servera
//  3. rozbalí ho do dočasného priečinka a skontroluje verziu
//  4. zálohuje súbory, ktoré sa zmenia, a zostavené backend/dist, frontend/build
//     (+ databázu cez pg_dump, ak je k dispozícii)
//  5. nahrá nové súbory a zmaže tie, ktoré nová verzia už nemá
//  6. npm ci, build backendu a frontendu, migrácie databázy
//  7. reštart backendu podľa AKTUALIZACIA_RESTART
//
// Pri chybe v krokoch 5-6 vráti súbory zo zálohy. Databázu automaticky
// nevracia (migrácie môžu byť čiastočne hotové) - dump je v zálohe.
//
// NIKDY SA NEPREPISUJÚ: .env súbory, backend/uploads (fotky), backend/sablony
// (nahraté šablóny), node_modules, .git, zalohy.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUBOR_BEHU = path.join(KOREN, '.aktualizacia.json');
const SUBOR_LOGU = path.join(KOREN, 'aktualizacia.log');
const SUBOR_ZOZNAMU = path.join(KOREN, '.aktualizacia-subory.json');
const ZALOHY = path.join(KOREN, 'zalohy');
const PONECHAT_ZALOH = 3;
const MAX_VELKOST = 300 * 1024 * 1024;

const env = process.env;
const VERZIA_ID = env.AKT_VERZIA_ID;
const VERZIA = (env.AKT_VERZIA || '').replace(/^v/, '');
const SHA256 = (env.AKT_SHA256 || '').toLowerCase();
const PRIKAZ_ID = env.AKT_PRIKAZ_ID || '';
const Z_VERZIE = env.AKT_Z_VERZIE || null;
const SERVER = (env.LICENSE_SERVER_URL || '').replace(/\/+$/, '');
const KLUC = env.LICENSE_KEY || '';
const NPM = env.AKTUALIZACIA_NPM || 'npm';

// Priečinky, v ktorých sa pri prvej aktualizácii mažú súbory, ktoré nová
// verzia nemá. Pri ďalších sa porovnáva so zoznamom z minulej aktualizácie.
const SPRAVOVANE = ['backend/src', 'backend/migrations', 'backend/seeders', 'backend/scripts', 'backend/config', 'frontend/src', 'frontend/public', 'frontend/scripts', 'shared/src', 'sablony', 'scripts'];
// Zostavené časti - zálohujú sa celé, aby sa pri obnove nemuseli znova zostavovať
const ZOSTAVENE = ['backend/dist', 'frontend/build'];

const cas = () => new Date().toISOString();
const log = (...s) => console.log(`[${cas()}]`, ...s);

/** Súbory, na ktoré aktualizácia nikdy nesiahne (relatívna cesta s /). */
const chraneny = (rel) => {
  const casti = rel.split('/');
  const meno = casti[casti.length - 1];
  if (casti.includes('node_modules') || casti[0] === '.git' || casti[0] === 'zalohy') return true;
  if (['.aktualizacia.json', 'aktualizacia.log', '.aktualizacia-subory.json'].includes(rel)) return true;
  if (/^backend\/(uploads|sablony|logs)(\/|$)/.test(rel)) return true;
  if (rel === 'backend/.license-cache.json') return true;
  if ((meno === '.env' || meno.startsWith('.env.')) && meno !== '.env.example') return true;
  return ZOSTAVENE.some((z) => rel === z || rel.startsWith(z + '/'));
};

// ── Stav a hlásenie ────────────────────────────────────────────────────

let beh = {};
try {
  beh = JSON.parse(fs.readFileSync(SUBOR_BEHU, 'utf8'));
} catch {
  // spustené ručne
}
const zapisBeh = (zmeny) => {
  beh = { ...beh, ...zmeny, pid: process.pid };
  fs.writeFileSync(SUBOR_BEHU, JSON.stringify(beh, null, 2));
};

const koniecLogu = (riadkov) => {
  try {
    return fs.readFileSync(SUBOR_LOGU, 'utf8').split(/\r?\n/).slice(-riadkov).join('\n');
  } catch {
    return '';
  }
};

const nahlas = async (stav, sprava) => {
  if (!PRIKAZ_ID || !SERVER) return;
  // Dva pokusy: po dlhom kroku (npm ci, build) býva znovupoužité spojenie
  // už zatvorené serverom a prvý pokus zlyhá na „fetch failed"
  for (let pokus = 1; pokus <= 2; pokus++) {
    try {
      await fetch(`${SERVER}/api/license/prikaz/${PRIKAZ_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: KLUC, stav, sprava }),
        signal: AbortSignal.timeout(10000),
      });
      return;
    } catch (e) {
      if (pokus === 2) log(`Stav sa nepodarilo nahlásiť licenčnému serveru: ${e.message}`);
    }
  }
};

/** Vlastné riadky záznamu (bez výstupu npm) - stručné hlásenie pre server. */
const krokyZLogu = (riadkov) =>
  koniecLogu(2000)
    .split('\n')
    .filter((r) => r.startsWith('['))
    .slice(-riadkov)
    .join('\n');

const krok = async (nazov, popis) => {
  log(`── ${popis}`);
  zapisBeh({ krok: nazov, sprava: popis });
  await nahlas('prebieha', popis);
};

// ── Pomocné funkcie ────────────────────────────────────────────────────

const spusti = (prikaz, cwd = KOREN) => {
  log(`$ ${prikaz}`);
  const r = spawnSync(prikaz, { cwd, shell: true, stdio: 'inherit', env: { ...env, npm_config_audit: 'false', npm_config_fund: 'false' } });
  if (r.status !== 0) throw new Error(`Príkaz „${prikaz}" skončil chybou (kód ${r.status ?? r.signal})`);
};

const vsetkySubory = (koren, rel = '') => {
  const vysledok = [];
  const priecinok = path.join(koren, rel);
  if (!fs.existsSync(priecinok)) return vysledok;
  for (const p of fs.readdirSync(priecinok, { withFileTypes: true })) {
    const r = rel ? `${rel}/${p.name}` : p.name;
    if (p.isDirectory()) vysledok.push(...vsetkySubory(koren, r));
    else if (p.isFile()) vysledok.push(r);
  }
  return vysledok;
};

const skopiruj = (z, kam) => {
  fs.mkdirSync(path.dirname(kam), { recursive: true });
  fs.copyFileSync(z, kam);
};

const zmazPrazdnePriecinky = (subor) => {
  let d = path.dirname(path.join(KOREN, subor));
  while (d.startsWith(KOREN) && d !== KOREN) {
    try {
      if (fs.readdirSync(d).length) return;
      fs.rmdirSync(d);
    } catch {
      return;
    }
    d = path.dirname(d);
  }
};

// ── Aktualizácia ───────────────────────────────────────────────────────

const znacka = cas().replace(/[:.]/g, '-');
const DOCASNY = path.join(ZALOHY, `.tmp-${znacka}`);
const ZALOHA = path.join(ZALOHY, `aktualizacia-${znacka}-z-${Z_VERZIE || 'nezname'}`);

// Čo sa zmenilo - na obnovu pri chybe
const pridane = [];
let suboryZmenene = false;
let zavislostiZmenene = false;

const obnov = () => {
  log('── Obnova zo zálohy');
  for (const rel of pridane) {
    try {
      fs.rmSync(path.join(KOREN, rel), { force: true });
      zmazPrazdnePriecinky(rel);
    } catch (e) {
      log(`  nepodarilo sa zmazať ${rel}: ${e.message}`);
    }
  }
  const zSuborov = path.join(ZALOHA, 'subory');
  for (const rel of vsetkySubory(zSuborov)) skopiruj(path.join(zSuborov, rel), path.join(KOREN, rel));
  for (const z of ZOSTAVENE) {
    const zaloha = path.join(ZALOHA, 'zostavene', z);
    if (!fs.existsSync(zaloha)) continue;
    fs.rmSync(path.join(KOREN, z), { recursive: true, force: true });
    fs.cpSync(zaloha, path.join(KOREN, z), { recursive: true });
  }
  if (zavislostiZmenene) spusti(`${NPM} ci --include=dev`);
  log('Pôvodné súbory sú späť.');
};

const hlavny = async () => {
  if (!VERZIA_ID || !VERZIA || !/^[a-f0-9]{64}$/.test(SHA256)) throw new Error('Chýba AKT_VERZIA_ID, AKT_VERZIA alebo platný AKT_SHA256');
  if (!SERVER || !KLUC) throw new Error('Chýba LICENSE_SERVER_URL alebo LICENSE_KEY');
  log(`Aktualizácia ClubW ${Z_VERZIE ?? '?'} → ${VERZIA} (${KOREN})`);
  if (fs.existsSync(path.join(KOREN, '.git'))) {
    log('Upozornenie: projekt je git repozitár. Súbory sa nahradia balíkom, git ich ukáže ako zmenené.');
  }
  fs.mkdirSync(DOCASNY, { recursive: true });
  zapisBeh({ stav: 'prebieha', verzia: VERZIA, z_verzie: Z_VERZIE, prikaz_id: PRIKAZ_ID ? Number(PRIKAZ_ID) : null, zaciatok: beh.zaciatok || cas(), koniec: null });

  // 1. Stiahnutie + 2. kontrolný súčet
  await krok('stiahnutie', `Sťahujem balík verzie ${VERZIA}`);
  const balik = path.join(DOCASNY, 'balik.tar.gz');
  const odpoved = await fetch(`${SERVER}/api/license/balik/${encodeURIComponent(VERZIA_ID)}`, {
    headers: { 'X-License-Key': KLUC },
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  if (!odpoved.ok || !odpoved.body) {
    let sprava = '';
    try {
      sprava = (await odpoved.json()).message || '';
    } catch {
      // nie JSON
    }
    throw new Error(`Licenčný server balík nevydal (HTTP ${odpoved.status}${sprava ? `: ${sprava}` : ''})`);
  }
  const hash = crypto.createHash('sha256');
  let velkost = 0;
  const pocitadlo = new Transform({
    transform(kus, _k, hotovo) {
      velkost += kus.length;
      if (velkost > MAX_VELKOST) return hotovo(new Error('Balík je väčší ako 300 MB'));
      hash.update(kus);
      hotovo(null, kus);
    },
  });
  await pipeline(Readable.fromWeb(odpoved.body), pocitadlo, fs.createWriteStream(balik));
  const sucet = hash.digest('hex');
  log(`Stiahnuté ${(velkost / 1024 / 1024).toFixed(1)} MB, sha256 ${sucet}`);
  if (sucet !== SHA256) throw new Error('Kontrolný súčet balíka nesedí - balík je poškodený alebo podvrhnutý');

  // 3. Rozbalenie a kontrola
  await krok('rozbalenie', 'Rozbaľujem a kontrolujem balík');
  const novy = path.join(DOCASNY, 'novy');
  fs.mkdirSync(novy);
  spusti(`tar -xzf "${balik}" -C "${novy}" --strip-components=1`);
  for (const nutny of ['package.json', 'backend/package.json', 'frontend/package.json', 'scripts/aktualizuj.mjs']) {
    if (!fs.existsSync(path.join(novy, nutny))) throw new Error(`Balík nie je ClubW - chýba v ňom ${nutny}`);
  }
  const verziaBaliku = JSON.parse(fs.readFileSync(path.join(novy, 'package.json'), 'utf8')).version;
  if (String(verziaBaliku).replace(/^v/, '') !== VERZIA) {
    throw new Error(`Balík verzie ${VERZIA} má v package.json verziu ${verziaBaliku}. Pri vydaní treba zvýšiť verziu v package.json.`);
  }
  const nove = vsetkySubory(novy).filter((r) => !chraneny(r));
  const noveSet = new Set(nove);

  // Súbory, ktoré nová verzia nemá
  let predosle = null;
  try {
    predosle = JSON.parse(fs.readFileSync(SUBOR_ZOZNAMU, 'utf8')).subory;
  } catch {
    // prvá aktualizácia
  }
  const kandidati = Array.isArray(predosle) ? predosle : SPRAVOVANE.flatMap((d) => vsetkySubory(KOREN, d));
  const zastarane = [...new Set(kandidati)].filter((r) => !noveSet.has(r) && !chraneny(r) && fs.existsSync(path.join(KOREN, r)));
  log(`V balíku ${nove.length} súborov, na zmazanie ${zastarane.length}`);

  // 4. Záloha
  await krok('zaloha', 'Zálohujem súčasnú verziu');
  const zalohaSuborov = path.join(ZALOHA, 'subory');
  for (const rel of [...nove, ...zastarane]) {
    const cesta = path.join(KOREN, rel);
    if (fs.existsSync(cesta)) skopiruj(cesta, path.join(zalohaSuborov, rel));
    else pridane.push(rel);
  }
  for (const z of ZOSTAVENE) {
    if (fs.existsSync(path.join(KOREN, z))) fs.cpSync(path.join(KOREN, z), path.join(ZALOHA, 'zostavene', z), { recursive: true });
  }
  if (env.DB_NAME && spawnSync('pg_dump', ['--version'], { stdio: 'ignore', shell: false }).status === 0) {
    const dump = spawnSync(
      'pg_dump',
      ['-h', env.DB_HOST || 'localhost', '-p', env.DB_PORT || '5432', '-U', env.DB_USER || 'postgres', '-Fc', '-f', path.join(ZALOHA, 'databaza.dump'), env.DB_NAME],
      { env: { ...env, PGPASSWORD: env.DB_PASSWORD || '' }, stdio: 'inherit' }
    );
    log(dump.status === 0 ? 'Databáza zálohovaná (databaza.dump)' : 'Upozornenie: zálohu databázy sa nepodarilo vytvoriť');
  } else {
    log('Upozornenie: pg_dump nie je dostupný - databáza sa nezálohuje');
  }
  log(`Záloha: ${path.relative(KOREN, ZALOHA)}`);

  try {
    // 5. Nové súbory
    await krok('subory', 'Nahrávam nové súbory');
    suboryZmenene = true;
    for (const rel of nove) skopiruj(path.join(novy, rel), path.join(KOREN, rel));
    for (const rel of zastarane) {
      fs.rmSync(path.join(KOREN, rel), { force: true });
      zmazPrazdnePriecinky(rel);
    }

    // 6. Závislosti, build, migrácie
    await krok('zavislosti', 'Inštalujem závislosti (npm ci)');
    zavislostiZmenene = true;
    spusti(`${NPM} ci --include=dev`);
    await krok('zostavenie', 'Zostavujem backend a frontend');
    spusti(`${NPM} run build --workspace=backend`);
    spusti(`${NPM} run build --workspace=frontend`);
    await krok('migracie', 'Spúšťam migrácie databázy');
    spusti(`${NPM} run db:migrate --workspace=backend`);
  } catch (e) {
    if (suboryZmenene) {
      try {
        obnov();
        e.message += '. Pôvodná verzia bola obnovená zo zálohy.';
      } catch (e2) {
        e.message += `. Obnova zo zálohy zlyhala (${e2.message}) - súbory sú v ${path.relative(KOREN, ZALOHA)}.`;
      }
    }
    throw e;
  }

  fs.writeFileSync(SUBOR_ZOZNAMU, JSON.stringify({ verzia: VERZIA, subory: nove }, null, 2));

  // Hotovo sa zapíše a nahlási pred reštartom - reštart (pm2, systemd)
  // môže ukončiť aj tento proces
  const restart = (env.AKTUALIZACIA_RESTART || '').trim();
  const sprava = restart
    ? `Verzia ${VERZIA} je nainštalovaná, backend sa reštartuje.`
    : `Verzia ${VERZIA} je nainštalovaná. Reštartujte backend (AKTUALIZACIA_RESTART nie je nastavené).`;
  log(`── ${sprava}`);
  zapisBeh({ stav: 'hotovo', krok: 'hotovo', sprava, koniec: cas() });
  await nahlas('hotovo', `${sprava}\n\n${krokyZLogu(40)}`);
  upratDocasne();

  // 7. Reštart
  if (restart === 'ukoncit') {
    const pid = Number(env.AKT_BACKEND_PID);
    if (pid) {
      log(`Ukončujem backend (PID ${pid}) - správca procesov ho spustí s novou verziou`);
      try {
        process.kill(pid, 'SIGTERM');
      } catch (e) {
        log(`Backend sa nepodarilo ukončiť: ${e.message}`);
      }
    }
  } else if (restart) {
    try {
      spusti(restart);
    } catch (e) {
      log(`Reštart zlyhal: ${e.message}. Reštartujte backend ručne.`);
      zapisBeh({ sprava: `Verzia ${VERZIA} je nainštalovaná, ale reštart zlyhal. Reštartujte backend ručne.` });
    }
  }
};

const upratDocasne = () => {
  try {
    fs.rmSync(DOCASNY, { recursive: true, force: true });
    const zalohy = fs
      .readdirSync(ZALOHY)
      .filter((n) => n.startsWith('aktualizacia-'))
      .sort();
    for (const stara of zalohy.slice(0, Math.max(0, zalohy.length - PONECHAT_ZALOH))) {
      fs.rmSync(path.join(ZALOHY, stara), { recursive: true, force: true });
    }
  } catch (e) {
    log(`Upratanie: ${e.message}`);
  }
};

try {
  await hlavny();
} catch (e) {
  log(`CHYBA: ${e.message}`);
  zapisBeh({ stav: 'chyba', sprava: e.message, koniec: cas() });
  await nahlas('chyba', `${e.message}\n\n${krokyZLogu(30)}\n\n--- posledný výstup ---\n${koniecLogu(40)}`);
  upratDocasne();
  process.exitCode = 1;
}
