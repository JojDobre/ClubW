// Umiestnenie: backend/src/services/sablony.ts
// Šablóny verejného webu - balíčky v priečinkoch, podobne ako témy vo
// WordPresse.
//
// ČO JE ŠABLÓNA: priečinok so súborom sablona.json (názov, verzia,
// autor, nastavenia) a súbormi, ktoré si web načíta - styl.css, zostavený
// skript sablona.js a obrázok náhľadu. Šablóna môže byť len štýl (iné
// farby, písmo, rozloženie) alebo aj skript, ktorý nahradí časti webu
// (hlavičku, pätičku, úvodnú stránku...). Čo šablóna nenahradí, zobrazí
// sa zo základnej šablóny.
//
// KDE LEŽIA:
//   <repozitár>/sablony/   - šablóny dodané so systémom (nedajú sa zmazať)
//   backend/sablony/       - šablóny nahraté v administrácii (SABLONY_DIR)
//
// BEZPEČNOSŤ: skript šablóny beží na webe s rovnakými právami ako web
// sám - je to kód, ktorému správca dôveruje (ako téma vo WordPresse).
// Preto nahrávať a mazať šablóny smie len správca. Pri rozbaľovaní
// balíka sa prísne kontrolujú cesty, prípony a veľkosti.

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { sanitizePlainText } from '../utils/sanitize';

/** Verzia rozhrania šablón, ktorú systém podporuje. */
export const API_SABLON = 1;

/** Šablóna, ktorá je vždy k dispozícii (verejný web, ako ho dodáva ClubW). */
export const ZAKLADNA_SABLONA = 'zakladna';

export const VSTAVANE_DIR = path.resolve(process.env.SABLONY_VSTAVANE_DIR || path.join(process.cwd(), '..', 'sablony'));
export const NAHRATE_DIR = path.resolve(process.env.SABLONY_DIR || path.join(process.cwd(), 'sablony'));

const MANIFEST = 'sablona.json';
const VZOR_SLUGU = /^[a-z0-9][a-z0-9-]{1,39}$/;
const VZOR_KLUCA = /^[a-z][a-z0-9_]{0,39}$/;
const VZOR_VERZIE = /^\d{1,4}\.\d{1,4}(\.\d{1,6})?([-+][0-9A-Za-z.-]{1,20})?$/;

/** Súbory, ktoré smie šablóna obsahovať a web ich servuje. */
export const TYPY_SUBOROV: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

// Limity nahrávaného balíka
export const MAX_VELKOST_ZIP = 15 * 1024 * 1024;
const MAX_SUBOROV = 400;
const MAX_ROZBALENE = 40 * 1024 * 1024;

// ===== Manifest =====

export type TypNastavenia = 'farba' | 'text' | 'dlhy_text' | 'vyber' | 'prepinac' | 'obrazok' | 'cislo';
const TYPY_NASTAVENI: TypNastavenia[] = ['farba', 'text', 'dlhy_text', 'vyber', 'prepinac', 'obrazok', 'cislo'];

export interface NastavenieSablony {
  kluc: string;
  typ: TypNastavenia;
  menovka: string;
  napoveda?: string;
  predvolene?: string | number | boolean | null;
  moznosti?: Array<{ hodnota: string; popis: string }>;
  min?: number;
  max?: number;
}

export interface ManifestSablony {
  slug: string;
  nazov: string;
  verzia: string;
  autor: string | null;
  web_autora: string | null;
  popis: string | null;
  api: number;
  nahlad: string | null;
  styl: string | null;
  skript: string | null;
  nastavenia: NastavenieSablony[];
}

export interface Sablona extends ManifestSablony {
  vstavana: boolean;
  priecinok: string;
}

/** Chyba v balíku šablóny - správa je pre správcu. */
export class ChybaSablony extends Error {}

const kratkyText = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') return null;
  const t = sanitizePlainText(v).trim().slice(0, max);
  return t || null;
};

/** Relatívna cesta k súboru v šablóne (nahlad, styl, skript). */
const cestaSuboru = (v: unknown, pole: string, pripony: string[]): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !/^[A-Za-z0-9_][A-Za-z0-9_./-]{0,150}$/.test(v) || v.includes('..')) {
    throw new ChybaSablony(`Pole „${pole}" v ${MANIFEST} nie je platná cesta k súboru`);
  }
  if (!pripony.includes(path.extname(v).toLowerCase())) {
    throw new ChybaSablony(`Pole „${pole}" musí byť súbor typu ${pripony.join(', ')}`);
  }
  return v;
};

const overNastavenie = (n: any, i: number): NastavenieSablony => {
  const kde = `nastavenie č. ${i + 1}`;
  if (!n || typeof n !== 'object') throw new ChybaSablony(`${kde} nie je objekt`);
  if (typeof n.kluc !== 'string' || !VZOR_KLUCA.test(n.kluc)) {
    throw new ChybaSablony(`${kde}: kľúč musí byť malými písmenami bez medzier (napr. farba_hlavicky)`);
  }
  if (!TYPY_NASTAVENI.includes(n.typ)) {
    throw new ChybaSablony(`${kde} (${n.kluc}): neznámy typ „${n.typ}", povolené sú ${TYPY_NASTAVENI.join(', ')}`);
  }
  const menovka = kratkyText(n.menovka, 80);
  if (!menovka) throw new ChybaSablony(`${kde} (${n.kluc}): chýba menovka`);

  const vysledok: NastavenieSablony = { kluc: n.kluc, typ: n.typ, menovka };
  const napoveda = kratkyText(n.napoveda, 300);
  if (napoveda) vysledok.napoveda = napoveda;

  if (n.typ === 'vyber') {
    if (!Array.isArray(n.moznosti) || n.moznosti.length === 0 || n.moznosti.length > 30) {
      throw new ChybaSablony(`${kde} (${n.kluc}): výber potrebuje 1 až 30 možností`);
    }
    vysledok.moznosti = n.moznosti.map((m: any) => {
      const hodnota = typeof m === 'string' ? m : m?.hodnota;
      const popis = typeof m === 'string' ? m : m?.popis ?? m?.hodnota;
      if (typeof hodnota !== 'string' || !hodnota || hodnota.length > 60) {
        throw new ChybaSablony(`${kde} (${n.kluc}): neplatná možnosť výberu`);
      }
      return { hodnota, popis: kratkyText(popis, 80) ?? hodnota };
    });
  }
  if (n.typ === 'cislo') {
    if (n.min !== undefined) vysledok.min = Number(n.min);
    if (n.max !== undefined) vysledok.max = Number(n.max);
  }

  // Predvolená hodnota prejde rovnakou kontrolou ako hodnota od správcu
  if (n.predvolene !== undefined && n.predvolene !== null) {
    const { hodnota, chyba } = overHodnotu(vysledok, n.predvolene);
    if (chyba) throw new ChybaSablony(`${kde} (${n.kluc}): predvolená hodnota - ${chyba}`);
    vysledok.predvolene = hodnota as NastavenieSablony['predvolene'];
  }
  return vysledok;
};

/**
 * Overí obsah sablona.json. `ocakavanySlug` je názov priečinka - slug
 * v manifeste s ním musí súhlasiť, inak by adresy súborov nesedeli.
 */
export const overManifest = (surovy: unknown, ocakavanySlug?: string): ManifestSablony => {
  if (!surovy || typeof surovy !== 'object' || Array.isArray(surovy)) {
    throw new ChybaSablony(`${MANIFEST} musí obsahovať objekt`);
  }
  const m = surovy as Record<string, any>;

  if (typeof m.slug !== 'string' || !VZOR_SLUGU.test(m.slug)) {
    throw new ChybaSablony('Slug šablóny smie obsahovať malé písmená, číslice a pomlčky (2 až 40 znakov)');
  }
  if (ocakavanySlug && m.slug !== ocakavanySlug) {
    throw new ChybaSablony(`Slug „${m.slug}" nesúhlasí s názvom priečinka „${ocakavanySlug}"`);
  }
  const nazov = kratkyText(m.nazov, 80);
  if (!nazov) throw new ChybaSablony('Šablóna nemá názov');
  const verzia = String(m.verzia ?? '');
  if (!VZOR_VERZIE.test(verzia)) throw new ChybaSablony('Verzia šablóny má tvar napríklad 1.0.0');

  const api = m.api === undefined ? 1 : Number(m.api);
  if (!Number.isInteger(api) || api < 1) throw new ChybaSablony('Pole „api" musí byť celé číslo');
  if (api > API_SABLON) {
    throw new ChybaSablony(`Šablóna vyžaduje novšiu verziu ClubW (rozhranie šablón ${api}, systém podporuje ${API_SABLON})`);
  }

  let webAutora = kratkyText(m.web_autora, 200);
  if (webAutora && !/^https?:\/\//i.test(webAutora)) webAutora = null;

  const nastavenia = m.nastavenia === undefined ? [] : m.nastavenia;
  if (!Array.isArray(nastavenia) || nastavenia.length > 40) {
    throw new ChybaSablony('Nastavenia šablóny musia byť zoznam (najviac 40 položiek)');
  }
  const overene = nastavenia.map(overNastavenie);
  const kluce = new Set<string>();
  for (const n of overene) {
    if (kluce.has(n.kluc)) throw new ChybaSablony(`Nastavenie „${n.kluc}" je v šablóne dvakrát`);
    kluce.add(n.kluc);
  }

  return {
    slug: m.slug,
    nazov,
    verzia,
    autor: kratkyText(m.autor, 120),
    web_autora: webAutora,
    popis: kratkyText(m.popis, 600),
    api,
    nahlad: cestaSuboru(m.nahlad, 'nahlad', ['.png', '.jpg', '.jpeg', '.webp', '.svg']),
    styl: cestaSuboru(m.styl, 'styl', ['.css']),
    skript: cestaSuboru(m.skript, 'skript', ['.js']),
    nastavenia: overene,
  };
};

/** Načíta a overí šablónu z priečinka vrátane existencie jej súborov. */
const nacitajZPriecinka = async (priecinok: string, slug: string): Promise<ManifestSablony> => {
  let obsah: string;
  try {
    obsah = await fsp.readFile(path.join(priecinok, MANIFEST), 'utf8');
  } catch {
    throw new ChybaSablony(`Chýba súbor ${MANIFEST}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(obsah);
  } catch {
    throw new ChybaSablony(`${MANIFEST} nie je platný JSON`);
  }
  const manifest = overManifest(json, slug);
  for (const pole of ['nahlad', 'styl', 'skript'] as const) {
    const subor = manifest[pole];
    if (subor && !(await existujeSubor(priecinok, subor))) {
      throw new ChybaSablony(`Súbor ${subor} (pole „${pole}") v šablóne chýba`);
    }
  }
  return manifest;
};

const existujeSubor = async (priecinok: string, relativna: string): Promise<boolean> => {
  const plna = bezpecnaCesta(priecinok, relativna);
  if (!plna) return false;
  try {
    return (await fsp.stat(plna)).isFile();
  } catch {
    return false;
  }
};

/** Cesta vnútri priečinka šablóny, alebo null ak by z neho unikla. */
const bezpecnaCesta = (priecinok: string, relativna: string): string | null => {
  const plna = path.resolve(priecinok, relativna);
  return plna.startsWith(priecinok + path.sep) ? plna : null;
};

// ===== Zoznam =====

export interface PolozkaZoznamu {
  slug: string;
  vstavana: boolean;
  sablona: Sablona | null;
  /** Prečo sa šablóna nedá použiť (poškodený balík) */
  chyba: string | null;
}

const priecinkySablon = async (koren: string): Promise<string[]> => {
  try {
    const polozky = await fsp.readdir(koren, { withFileTypes: true });
    return polozky.filter((p) => p.isDirectory() && VZOR_SLUGU.test(p.name)).map((p) => p.name);
  } catch {
    return [];
  }
};

/** Všetky šablóny - dodané so systémom aj nahraté, vrátane poškodených. */
export const zoznamSablon = async (): Promise<PolozkaZoznamu[]> => {
  const vysledok: PolozkaZoznamu[] = [];
  const vstavane = await priecinkySablon(VSTAVANE_DIR);
  const nahrate = (await priecinkySablon(NAHRATE_DIR)).filter((s) => !vstavane.includes(s));

  for (const [slugy, koren, vstavana] of [
    [vstavane, VSTAVANE_DIR, true],
    [nahrate, NAHRATE_DIR, false],
  ] as const) {
    for (const slug of slugy) {
      const priecinok = path.join(koren, slug);
      try {
        const manifest = await nacitajZPriecinka(priecinok, slug);
        vysledok.push({ slug, vstavana, sablona: { ...manifest, vstavana, priecinok }, chyba: null });
      } catch (e) {
        vysledok.push({ slug, vstavana, sablona: null, chyba: e instanceof Error ? e.message : 'Neznáma chyba' });
      }
    }
  }

  // Základná vždy prvá, ostatné podľa názvu
  return vysledok.sort((a, b) =>
    a.slug === ZAKLADNA_SABLONA ? -1 : b.slug === ZAKLADNA_SABLONA ? 1 : (a.sablona?.nazov ?? a.slug).localeCompare(b.sablona?.nazov ?? b.slug, 'sk')
  );
};

/** Platná šablóna podľa slugu, alebo null. */
export const najdiSablonu = async (slug: string): Promise<Sablona | null> => {
  if (!VZOR_SLUGU.test(slug)) return null;
  for (const [koren, vstavana] of [
    [VSTAVANE_DIR, true],
    [NAHRATE_DIR, false],
  ] as const) {
    const priecinok = path.join(koren, slug);
    if (!fs.existsSync(path.join(priecinok, MANIFEST))) continue;
    try {
      return { ...(await nacitajZPriecinka(priecinok, slug)), vstavana, priecinok };
    } catch {
      return null;
    }
  }
  return null;
};

/** Plná cesta k súboru šablóny na servovanie, alebo null. */
export const suborSablony = async (slug: string, relativna: string): Promise<string | null> => {
  if (!VZOR_SLUGU.test(slug)) return null;
  if (!TYPY_SUBOROV[path.extname(relativna).toLowerCase()]) return null;
  // Skryté súbory a priečinky (.git, .env) sa neservujú nikdy
  if (relativna.split('/').some((u) => u.startsWith('.') || u === '')) return null;
  for (const koren of [VSTAVANE_DIR, NAHRATE_DIR]) {
    const priecinok = path.join(koren, slug);
    if (!fs.existsSync(path.join(priecinok, MANIFEST))) continue;
    const plna = bezpecnaCesta(priecinok, relativna);
    if (!plna) return null;
    try {
      // Zdrojové súbory šablóny (src/) web nepotrebuje
      if (relativna.startsWith('src/') || relativna.startsWith('node_modules/')) return null;
      return (await fsp.stat(plna)).isFile() ? plna : null;
    } catch {
      return null;
    }
  }
  return null;
};

// ===== Inštalácia z balíka =====

/**
 * Rozbalí dáta položky ZIP s limitom veľkosti. Vlastné rozbaľovanie
 * namiesto entry.getData(): hlavička ZIP môže o veľkosti klamať a malý
 * balík by sa rozbalil na gigabajty („zip bomba").
 */
const rozbalPolozku = (polozka: AdmZip.IZipEntry, zostava: number): Buffer => {
  const hlavicka = polozka.header as unknown as { method: number; flags: number };
  if (hlavicka.flags & 1) throw new ChybaSablony('Balík je zašifrovaný');
  const skomprimovane = polozka.getCompressedData();
  if (hlavicka.method === 0) {
    if (skomprimovane.length > zostava) throw new ChybaSablony('Balík je po rozbalení príliš veľký');
    return skomprimovane;
  }
  if (hlavicka.method !== 8) throw new ChybaSablony('Balík používa nepodporovanú kompresiu (uložte ho ako bežný ZIP)');
  try {
    return zlib.inflateRawSync(skomprimovane, { maxOutputLength: Math.max(zostava, 1) });
  } catch (e: any) {
    if (e?.code === 'ERR_BUFFER_TOO_LARGE' || /maxOutputLength|buffer/i.test(String(e?.message))) {
      throw new ChybaSablony('Balík je po rozbalení príliš veľký');
    }
    throw new ChybaSablony('Balík je poškodený');
  }
};

/** Súbory, ktoré systémy pribaľujú do ZIP a do šablóny nepatria. */
const jeSmetie = (cesta: string) =>
  cesta.startsWith('__MACOSX/') || /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(cesta);

export interface VysledokInstalacie {
  sablona: Sablona;
  /** Verzia, ktorú nahradila (pri aktualizácii) */
  predchadzajucaVerzia: string | null;
}

/**
 * Nainštaluje šablónu z balíka ZIP. Ak už nahratá šablóna s rovnakým
 * slugom existuje, nahradí ju (aktualizácia). Šablóny dodané so
 * systémom sa prepísať nedajú.
 */
export const nainstalujZBalika = async (data: Buffer): Promise<VysledokInstalacie> => {
  let zip: AdmZip;
  try {
    zip = new AdmZip(data);
  } catch {
    throw new ChybaSablony('Súbor nie je platný ZIP balík');
  }

  const polozky = zip.getEntries().filter((p) => !p.isDirectory && !jeSmetie(p.entryName.replace(/\\/g, '/')));
  if (polozky.length === 0) throw new ChybaSablony('Balík je prázdny');
  if (polozky.length > MAX_SUBOROV) throw new ChybaSablony(`Balík má viac ako ${MAX_SUBOROV} súborov`);

  // Balík môže mať šablónu v koreni alebo v jednom priečinku (stadion/…)
  const cesty = polozky.map((p) => p.entryName.replace(/\\/g, '/'));
  let predpona = '';
  if (!cesty.includes(MANIFEST)) {
    const prvy = cesty[0].split('/')[0];
    if (cesty.every((c) => c.startsWith(prvy + '/')) && cesty.includes(`${prvy}/${MANIFEST}`)) {
      predpona = prvy + '/';
    } else {
      throw new ChybaSablony(`V balíku chýba ${MANIFEST} (musí byť v koreni balíka alebo v jeho jedinom priečinku)`);
    }
  }

  // Kontrola všetkých ciest skôr, než sa čokoľvek zapíše na disk
  const subory: Array<{ cesta: string; polozka: AdmZip.IZipEntry }> = [];
  for (let i = 0; i < polozky.length; i++) {
    const cesta = cesty[i].slice(predpona.length);
    const useky = cesta.split('/');
    if (
      !cesta ||
      cesta.startsWith('/') ||
      /^[A-Za-z]:/.test(cesta) ||
      useky.some((u) => u === '' || u === '.' || u === '..' || u.startsWith('.')) ||
      cesta.length > 200
    ) {
      throw new ChybaSablony(`Neplatná cesta v balíku: ${cesty[i]}`);
    }
    // Zdrojové súbory a závislosti sa na web neinštalujú
    if (useky[0] === 'node_modules' || useky[0] === 'src') continue;
    if (!TYPY_SUBOROV[path.extname(cesta).toLowerCase()]) {
      throw new ChybaSablony(`Súbor ${cesta} má nepovolený typ. Povolené: ${Object.keys(TYPY_SUBOROV).join(' ')}`);
    }
    subory.push({ cesta, polozka: polozky[i] });
  }

  const manifestPolozka = subory.find((s) => s.cesta === MANIFEST);
  if (!manifestPolozka) throw new ChybaSablony(`V balíku chýba ${MANIFEST}`);
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(rozbalPolozku(manifestPolozka.polozka, 256 * 1024).toString('utf8'));
  } catch (e) {
    if (e instanceof ChybaSablony) throw e;
    throw new ChybaSablony(`${MANIFEST} nie je platný JSON`);
  }
  const manifest = overManifest(manifestJson);

  if (fs.existsSync(path.join(VSTAVANE_DIR, manifest.slug, MANIFEST))) {
    throw new ChybaSablony(`Šablóna „${manifest.slug}" je dodaná so systémom a nedá sa nahradiť. Zmeňte slug v ${MANIFEST}.`);
  }

  // Rozbalenie do dočasného priečinka a až potom výmena - pri chybe
  // uprostred zostane pôvodná verzia nedotknutá
  await fsp.mkdir(NAHRATE_DIR, { recursive: true });
  const docasny = path.join(NAHRATE_DIR, `.nova-${crypto.randomBytes(6).toString('hex')}`);
  await fsp.mkdir(docasny);
  try {
    let zostava = MAX_ROZBALENE;
    for (const { cesta, polozka } of subory) {
      const obsah = rozbalPolozku(polozka, zostava);
      zostava -= obsah.length;
      if (zostava < 0) throw new ChybaSablony('Balík je po rozbalení príliš veľký');
      const ciel = bezpecnaCesta(docasny, cesta);
      if (!ciel) throw new ChybaSablony(`Neplatná cesta v balíku: ${cesta}`);
      await fsp.mkdir(path.dirname(ciel), { recursive: true });
      await fsp.writeFile(ciel, obsah);
    }

    // Kontrola, že súbory uvedené v manifeste v balíku naozaj sú
    await nacitajZPriecinka(docasny, manifest.slug);

    const ciel = path.join(NAHRATE_DIR, manifest.slug);
    let predchadzajucaVerzia: string | null = null;
    if (fs.existsSync(ciel)) {
      try {
        const stary = JSON.parse(await fsp.readFile(path.join(ciel, MANIFEST), 'utf8'));
        predchadzajucaVerzia = typeof stary?.verzia === 'string' ? stary.verzia : null;
      } catch {
        /* poškodená stará verzia - nahradíme ju */
      }
      const odlozeny = path.join(NAHRATE_DIR, `.stara-${crypto.randomBytes(6).toString('hex')}`);
      await fsp.rename(ciel, odlozeny);
      await fsp.rename(docasny, ciel);
      await fsp.rm(odlozeny, { recursive: true, force: true });
    } else {
      await fsp.rename(docasny, ciel);
    }

    return { sablona: { ...manifest, vstavana: false, priecinok: ciel }, predchadzajucaVerzia };
  } catch (e) {
    await fsp.rm(docasny, { recursive: true, force: true });
    throw e;
  }
};

/** Zmaže nahratú šablónu. Dodané so systémom sa zmazať nedajú. */
export const zmazSablonu = async (slug: string): Promise<void> => {
  if (!VZOR_SLUGU.test(slug)) throw new ChybaSablony('Neplatná šablóna');
  if (fs.existsSync(path.join(VSTAVANE_DIR, slug))) {
    throw new ChybaSablony('Šablóna dodaná so systémom sa nedá zmazať');
  }
  const priecinok = path.join(NAHRATE_DIR, slug);
  if (!fs.existsSync(priecinok)) throw new ChybaSablony('Šablóna sa nenašla');
  await fsp.rm(priecinok, { recursive: true, force: true });
};

// ===== Hodnoty nastavení =====

/** Overí jednu hodnotu nastavenia podľa jeho typu. */
export const overHodnotu = (n: NastavenieSablony, v: unknown): { hodnota?: unknown; chyba?: string } => {
  if (v === null || v === undefined || v === '') {
    return { hodnota: n.typ === 'prepinac' ? false : null };
  }
  switch (n.typ) {
    case 'farba':
      return typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v)
        ? { hodnota: v.toUpperCase() }
        : { chyba: 'farba musí byť v tvare #RRGGBB' };
    case 'text':
    case 'dlhy_text': {
      if (typeof v !== 'string') return { chyba: 'musí byť text' };
      return { hodnota: sanitizePlainText(v).trim().slice(0, n.typ === 'text' ? 300 : 3000) || null };
    }
    case 'vyber':
      return typeof v === 'string' && n.moznosti?.some((m) => m.hodnota === v)
        ? { hodnota: v }
        : { chyba: 'hodnota nie je medzi možnosťami' };
    case 'prepinac':
      return typeof v === 'boolean' ? { hodnota: v } : { chyba: 'musí byť áno/nie' };
    case 'cislo': {
      const c = Number(v);
      if (!Number.isFinite(c)) return { chyba: 'musí byť číslo' };
      if (n.min !== undefined && c < n.min) return { chyba: `najmenej ${n.min}` };
      if (n.max !== undefined && c > n.max) return { chyba: `najviac ${n.max}` };
      return { hodnota: c };
    }
    case 'obrazok':
      // Obrázok z knižnice médií alebo z webu cez https
      return typeof v === 'string' && v.length <= 500 && /^(\/uploads\/[^\s"'()<>]+|https:\/\/[^\s"'()<>]+)$/.test(v)
        ? { hodnota: v }
        : { chyba: 'obrázok musí byť z knižnice médií alebo adresa https://' };
  }
};

/**
 * Hodnoty nastavení šablóny: uložené hodnoty, a kde chýbajú, predvolené.
 * Kľúče, ktoré šablóna (už) nepozná, sa vynechajú.
 */
export const hodnotyNastaveni = (sablona: ManifestSablony, ulozene: Record<string, unknown> | undefined): Record<string, unknown> => {
  const vysledok: Record<string, unknown> = {};
  for (const n of sablona.nastavenia) {
    if (ulozene && Object.prototype.hasOwnProperty.call(ulozene, n.kluc)) {
      const { hodnota, chyba } = overHodnotu(n, ulozene[n.kluc]);
      vysledok[n.kluc] = chyba ? n.predvolene ?? null : hodnota;
    } else {
      vysledok[n.kluc] = n.predvolene ?? (n.typ === 'prepinac' ? false : null);
    }
  }
  return vysledok;
};

/**
 * Overí hodnoty od správcu. Vráti očistené hodnoty alebo prvú chybu
 * s menovkou nastavenia.
 */
export const overHodnoty = (
  sablona: ManifestSablony,
  vstup: Record<string, unknown>
): { hodnoty?: Record<string, unknown>; chyba?: string } => {
  const hodnoty: Record<string, unknown> = {};
  for (const n of sablona.nastavenia) {
    if (!Object.prototype.hasOwnProperty.call(vstup, n.kluc)) continue;
    const { hodnota, chyba } = overHodnotu(n, vstup[n.kluc]);
    if (chyba) return { chyba: `${n.menovka}: ${chyba}` };
    hodnoty[n.kluc] = hodnota;
  }
  return { hodnoty };
};
