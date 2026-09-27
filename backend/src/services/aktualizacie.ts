// Umiestnenie: backend/src/services/aktualizacie.ts
// Aktualizácie systému z licenčného servera.
//
// AKO TO FUNGUJE:
//  1. Pri overení licencie posiela web svoju verziu. Licenčný server v podpísanej
//     odpovedi vráti dostupnú aktualizáciu a prípadne príkaz administrátora
//     licencií „aktualizuj na verziu X".
//  2. Samotnú aktualizáciu robí samostatný proces scripts/aktualizuj.mjs
//     (v koreni projektu). Musí bežať mimo backendu, lebo backend počas
//     aktualizácie reštartuje.
//  3. Aktualizácie sú predvolene vypnuté - zapína ich AKTUALIZACIE_POVOLENE=true.
//     Vzdialená zmena kódu je citlivá vec a prevádzkovateľ servera o nej
//     má rozhodnúť vedome.
//
// Balík sa sťahuje len z licenčného servera s licenčným kľúčom a jeho
// kontrolný súčet (sha256) je súčasťou podpísanej odpovede - podvrhnutý
// balík aktualizátor odmietne.

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/** Koreň projektu (priečinok s backend/, frontend/, package.json). */
export const KOREN = path.resolve(process.env.CLUBW_KOREN || path.join(__dirname, '..', '..', '..'));

export const SUBOR_BEHU = path.join(KOREN, '.aktualizacia.json');
export const SUBOR_LOGU = path.join(KOREN, 'aktualizacia.log');
const SKRIPT = path.join(KOREN, 'scripts', 'aktualizuj.mjs');

/** Balík verzie z podpísanej odpovede licenčného servera. */
export interface VerziaNaStiahnutie {
  id: number;
  verzia: string;
  tag?: string;
  sha256: string | null;
  velkost?: number | null;
  poznamky?: string | null;
  povinna?: boolean;
}

export interface PrikazServera {
  id: number;
  typ: string;
  verzia: VerziaNaStiahnutie;
}

export interface BehAktualizacie {
  stav: 'prebieha' | 'hotovo' | 'chyba';
  verzia: string;
  z_verzie?: string | null;
  krok?: string | null;
  sprava?: string | null;
  prikaz_id?: number | null;
  pid?: number;
  zaciatok?: string;
  koniec?: string | null;
}

const nacitajVerziu = (): string => {
  for (const subor of [path.join(KOREN, 'package.json'), path.join(__dirname, '..', '..', 'package.json')]) {
    try {
      const v = JSON.parse(fs.readFileSync(subor, 'utf8')).version;
      if (typeof v === 'string' && v) return v;
    } catch {
      // ďalší kandidát
    }
  }
  return '0.0.0';
};

/**
 * Verzia bežiaceho kódu. Číta sa raz pri štarte - po nahratí nových súborov
 * (ešte pred reštartom) má web stále hlásiť verziu, ktorá naozaj beží.
 */
export const VERZIA_APLIKACIE = nacitajVerziu();

export const aktualizacieZapnute = (): boolean => process.env.AKTUALIZACIE_POVOLENE === 'true';

/** Údaje o inštalácii pre licenčný server - prehľad v jeho administrácii. */
export const udajeInstalacie = () => ({
  adresa: process.env.FRONTEND_URL || null,
  node: process.version,
  platforma: process.platform,
  prostredie: process.env.NODE_ENV || 'development',
  sposob: fs.existsSync(path.join(KOREN, '.git')) ? 'git' : 'balik',
  aktualizacie: aktualizacieZapnute(),
});

const procesBezi = (pid?: number): boolean => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    // EPERM = proces existuje, len k nemu nemáme práva
    return e?.code === 'EPERM';
  }
};

/** Posledný (alebo prebiehajúci) beh aktualizátora. */
export const nacitajBeh = (): BehAktualizacie | null => {
  try {
    const beh = JSON.parse(fs.readFileSync(SUBOR_BEHU, 'utf8')) as BehAktualizacie;
    // Proces aktualizátora spadol bez zápisu výsledku (výpadok, kill -9)
    if (beh.stav === 'prebieha' && !procesBezi(beh.pid)) {
      return { ...beh, stav: 'chyba', sprava: beh.sprava || 'Aktualizátor sa neočakávane ukončil. Podrobnosti sú v zázname.' };
    }
    return beh;
  } catch {
    return null;
  }
};

export const aktualizaciaBezi = (): boolean => nacitajBeh()?.stav === 'prebieha';

/** Posledné riadky záznamu aktualizátora. */
export const koniecLogu = (riadkov = 80): string => {
  try {
    const obsah = fs.readFileSync(SUBOR_LOGU, 'utf8');
    return obsah.split(/\r?\n/).slice(-riadkov).join('\n').trim();
  } catch {
    return '';
  }
};

export class AktualizaciaError extends Error {}

/**
 * Spustí aktualizátor ako samostatný proces, ktorý prežije reštart backendu.
 */
export const spustiAktualizator = (verzia: VerziaNaStiahnutie, prikazId: number | null): void => {
  if (!aktualizacieZapnute()) throw new AktualizaciaError('Aktualizácie sú na tomto serveri vypnuté (AKTUALIZACIE_POVOLENE)');
  if (aktualizaciaBezi()) throw new AktualizaciaError('Aktualizácia už prebieha');
  if (!verzia.sha256) throw new AktualizaciaError('Balík aktualizácie nemá kontrolný súčet');
  if (!fs.existsSync(SKRIPT)) throw new AktualizaciaError('Chýba skript aktualizátora scripts/aktualizuj.mjs');
  const kluc = process.env.LICENSE_KEY;
  const server = process.env.LICENSE_SERVER_URL;
  if (!kluc || !server) throw new AktualizaciaError('Chýba LICENSE_KEY alebo LICENSE_SERVER_URL');

  // Stav zapíšeme hneď, aby druhé kliknutie (alebo ďalšie overenie licencie)
  // nespustilo aktualizátor znova, kým sa proces rozbehne
  const zaciatok: BehAktualizacie = {
    stav: 'prebieha',
    verzia: verzia.verzia,
    z_verzie: VERZIA_APLIKACIE,
    krok: 'spustenie',
    prikaz_id: prikazId,
    zaciatok: new Date().toISOString(),
    koniec: null,
  };
  fs.writeFileSync(SUBOR_BEHU, JSON.stringify(zaciatok, null, 2));
  fs.writeFileSync(SUBOR_LOGU, `[${new Date().toISOString()}] Spúšťam aktualizáciu ${VERZIA_APLIKACIE} → ${verzia.verzia}\n`);

  const log = fs.openSync(SUBOR_LOGU, 'a');
  try {
    const potomok = spawn(process.execPath, [SKRIPT], {
      cwd: KOREN,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', log, log],
      env: {
        ...process.env,
        AKT_VERZIA_ID: String(verzia.id),
        AKT_VERZIA: verzia.verzia,
        AKT_SHA256: verzia.sha256,
        AKT_PRIKAZ_ID: prikazId ? String(prikazId) : '',
        AKT_Z_VERZIE: VERZIA_APLIKACIE,
        AKT_BACKEND_PID: String(process.pid),
      },
    });
    fs.writeFileSync(SUBOR_BEHU, JSON.stringify({ ...zaciatok, pid: potomok.pid }, null, 2));
    potomok.unref();
  } finally {
    fs.closeSync(log);
  }
};

/**
 * Nahlási licenčnému serveru stav príkazu (napr. že ho táto inštalácia
 * nevykoná). Chyba spojenia sa len zapíše - príkaz príde znova.
 */
export const nahlasPrikaz = async (prikazId: number, stav: 'prevzaty' | 'prebieha' | 'hotovo' | 'chyba', sprava?: string): Promise<void> => {
  const server = process.env.LICENSE_SERVER_URL;
  if (!server) return;
  try {
    await fetch(`${server.replace(/\/+$/, '')}/api/license/prikaz/${prikazId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: process.env.LICENSE_KEY, stav, sprava }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e: any) {
    console.warn(`⚠️  Stav príkazu ${prikazId} sa nepodarilo nahlásiť: ${e.message}`);
  }
};

// Príkazy, ktoré sme už odmietli - nehlásime ich pri každom overení znova
const odmietnutePrikazy = new Set<number>();

/**
 * Spracuje príkaz z podpísanej odpovede licenčného servera.
 */
export const spracujPrikaz = async (prikaz: PrikazServera | null): Promise<void> => {
  if (!prikaz || prikaz.typ !== 'aktualizacia' || !prikaz.verzia) return;

  const beh = nacitajBeh();
  if (beh?.stav === 'prebieha') return;
  // Rovnaký príkaz už bol vykonaný a čaká sa len na reštart / nové overenie
  if (beh?.prikaz_id === prikaz.id && beh.stav === 'hotovo') return;
  // Rovnaký príkaz už raz zlyhal - neopakujeme ho donekonečna, len znova
  // nahlásime výsledok (prvé hlásenie sa možno nedostalo na server)
  if (beh?.prikaz_id === prikaz.id && beh.stav === 'chyba') {
    if (!odmietnutePrikazy.has(prikaz.id)) {
      odmietnutePrikazy.add(prikaz.id);
      await nahlasPrikaz(prikaz.id, 'chyba', beh.sprava || 'Aktualizácia zlyhala');
    }
    return;
  }

  if (!aktualizacieZapnute()) {
    if (!odmietnutePrikazy.has(prikaz.id)) {
      odmietnutePrikazy.add(prikaz.id);
      console.warn(`⚠️  Licenčný server žiada aktualizáciu na ${prikaz.verzia.verzia}, ale aktualizácie sú vypnuté (AKTUALIZACIE_POVOLENE)`);
      await nahlasPrikaz(prikaz.id, 'chyba', 'Aktualizácie sú na tejto inštalácii vypnuté. Na serveri webu treba v backend/.env nastaviť AKTUALIZACIE_POVOLENE=true.');
    }
    return;
  }

  try {
    console.log(`ℹ️  Licenčný server žiada aktualizáciu na ${prikaz.verzia.verzia} - spúšťam aktualizátor`);
    spustiAktualizator(prikaz.verzia, prikaz.id);
    await nahlasPrikaz(prikaz.id, 'prevzaty', 'Aktualizátor spustený');
  } catch (e: any) {
    console.error(`❌ Aktualizáciu sa nepodarilo spustiť: ${e.message}`);
    await nahlasPrikaz(prikaz.id, 'chyba', `Aktualizáciu sa nepodarilo spustiť: ${e.message}`);
  }
};
