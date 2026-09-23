// Umiestnenie: frontend/scripts/sablony.mjs
// Zostavenie šablón webu a balíkov na nahratie do administrácie.
//
//   npm run sablony                 zostaví všetky šablóny s priečinkom src/
//   npm run sablony -- stadion      zostaví jednu šablónu
//   npm run sablony -- stadion --balik
//                                   zostaví a zabalí do sablony/_balicky/stadion-1.0.0.zip
//
// Šablóna sa zostaví do jedného súboru sablona.js (formát IIFE). React,
// react-router-dom a @clubw/jadro v ňom nie sú - šablóna ich dostane od
// webu cez window.ClubW, aby na stránke bol jediný React.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import AdmZip from 'adm-zip';

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sablony');
const argumenty = process.argv.slice(2);
const balik = argumenty.includes('--balik');
const ziadane = argumenty.filter((a) => !a.startsWith('--'));

// Moduly, ktoré šablóna dostane od webu (a ich miesto vo window.ClubW)
const ZDIELANE = {
  react: 'ClubW.React',
  'react-dom': 'ClubW.ReactDOM',
  'react/jsx-runtime': 'ClubW.jsxRuntime',
  'react-router-dom': 'ClubW.ReactRouterDom',
  '@clubw/jadro': 'ClubW.jadro',
  '@clubw/zakladna': 'ClubW.zakladna',
};

const sablony = ziadane.length
  ? ziadane
  : fs.readdirSync(koren).filter((s) => fs.existsSync(path.join(koren, s, 'src/index.tsx')) || fs.existsSync(path.join(koren, s, 'src/index.ts')));

const zostav = async (slug) => {
  const priecinok = path.join(koren, slug);
  const manifest = JSON.parse(fs.readFileSync(path.join(priecinok, 'sablona.json'), 'utf8'));
  if (manifest.slug !== slug) throw new Error(`${slug}: slug v sablona.json (${manifest.slug}) nesúhlasí s priečinkom`);
  if (slug === 'zakladna') {
    console.log('zakladna: zostavuje sa spolu s webom, preskakujem');
    return;
  }

  const vstup = ['src/index.tsx', 'src/index.ts'].map((s) => path.join(priecinok, s)).find((s) => fs.existsSync(s));
  if (vstup) {
    if (manifest.skript !== 'sablona.js') throw new Error(`${slug}: šablóna so src/ musí mať v sablona.json "skript": "sablona.js"`);
    // Zostavuje sa do dočasného priečinka - Vite nedovolí zapisovať
    // do priečinka so zdrojovými súbormi
    const docasny = fs.mkdtempSync(path.join(os.tmpdir(), `clubw-${slug}-`));
    await build({
      configFile: false,
      logLevel: 'warn',
      root: priecinok,
      plugins: [react()],
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      build: {
        outDir: docasny,
        emptyOutDir: true,
        copyPublicDir: false,
        minify: true,
        lib: { entry: vstup, formats: ['iife'], name: `ClubWSablona_${slug.replace(/-/g, '_')}`, fileName: () => 'sablona.js' },
        rollupOptions: {
          external: Object.keys(ZDIELANE),
          output: { globals: ZDIELANE },
        },
      },
    });
    fs.copyFileSync(path.join(docasny, 'sablona.js'), path.join(priecinok, 'sablona.js'));
    fs.rmSync(docasny, { recursive: true, force: true });
    console.log(`${slug}: zostavené sablona.js (${(fs.statSync(path.join(priecinok, 'sablona.js')).size / 1024).toFixed(1)} kB)`);
  }

  if (balik) {
    const zip = new AdmZip();
    const pridaj = (relativna) => {
      const plna = path.join(priecinok, relativna);
      for (const polozka of fs.readdirSync(plna, { withFileTypes: true })) {
        const cesta = path.posix.join(relativna, polozka.name);
        // Zdrojové súbory a skryté súbory do balíka nepatria
        if (polozka.name.startsWith('.') || cesta === 'src' || cesta === 'node_modules') continue;
        if (polozka.isDirectory()) pridaj(cesta);
        else zip.addFile(`${slug}/${cesta}`, fs.readFileSync(path.join(plna, polozka.name)));
      }
    };
    pridaj('');
    const vystup = path.join(koren, '_balicky');
    fs.mkdirSync(vystup, { recursive: true });
    const subor = path.join(vystup, `${slug}-${manifest.verzia}.zip`);
    zip.writeZip(subor);
    console.log(`${slug}: balík ${path.relative(process.cwd(), subor)}`);
  }
};

for (const slug of sablony) {
  await zostav(slug);
}
