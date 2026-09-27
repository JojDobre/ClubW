// Umiestnenie: backend/src/routes/licencia.ts
// Licencia a verzia systému.
//
// Požiadavka: „overenie licencie, platnosť, aktualizácia systému, verzie".

import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import sequelize from '../config/database';
import { dostupnaAktualizacia, overLicenciu, stavLicencie } from '../middleware/licencia';
import {
  AktualizaciaError,
  VERZIA_APLIKACIE,
  aktualizacieZapnute,
  koniecLogu,
  nacitajBeh,
  spustiAktualizator,
} from '../services/aktualizacie';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

/** @route GET /api/license/status - stav licencie (verejný, bez citlivých údajov) */
router.get('/status', (_req, res) => {
  res.json({ success: true, data: stavLicencie() });
});

/**
 * @route POST /api/license/check - overenie licencie hneď teraz
 *
 * Predtým tlačidlo „Overiť teraz" len znova načítalo uložený stav;
 * skutočné overenie prebiehalo až pri ďalšej plánovanej kontrole.
 */
router.post('/check', authenticateToken, requirePermission('licencia', 'citat'), async (_req, res) => {
  try {
    await overLicenciu();
    res.json({ success: true, data: stavLicencie(), message: 'Licencia bola overená' });
  } catch (chyba) {
    console.error('Chyba pri overovaní licencie:', chyba);
    res.status(500).json({ success: false, message: 'Licenciu sa nepodarilo overiť' });
  }
});

/**
 * @route GET /api/license/version - verzia aplikácie a stav databázy
 *
 * Porovná migrácie v projekte s dobehnutými v databáze - po aktualizácii
 * (git pull) tak administrácia ukáže, že treba spustiť npm run db:migrate.
 * Len pre prihlásených: verzia Node a zoznam migrácií nepatria verejnosti.
 */
router.get('/version', authenticateToken, requirePermission('licencia', 'citat'), async (_req, res) => {
  try {
    const [riadky] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
    const dobehnute = new Set((riadky as any[]).map((r) => r.name));

    let vProjekte: string[] = [];
    try {
      vProjekte = fs
        .readdirSync(path.join(__dirname, '../../migrations'))
        .filter((n) => n.endsWith('.js'))
        .sort();
    } catch {
      // Priečinok migrácií v nasadení nemusí byť - vtedy len nevieme porovnať
    }
    const cakajuce = vProjekte.filter((n) => !dobehnute.has(n));

    res.json({
      success: true,
      data: {
        verzia_aplikacie: VERZIA_APLIKACIE,
        node: process.version,
        prostredie: process.env.NODE_ENV || 'development',
        schema: {
          posledna_migracia: [...dobehnute].sort().pop() ?? null,
          pocet_migracii: dobehnute.size,
          cakajuce_migracie: cakajuce,
        },
        licencia: stavLicencie(),
        bezi_sekund: Math.round(process.uptime()),
      },
    });
  } catch (chyba) {
    console.error('Chyba pri zisťovaní verzie:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera pri zisťovaní verzie' });
  }
});

/**
 * @route GET /api/license/update - dostupná aktualizácia a priebeh aktualizácie
 *
 * Aktualizáciu ponúka licenčný server v podpísanej odpovedi na overenie
 * licencie. Priebeh a záznam zapisuje aktualizátor (scripts/aktualizuj.mjs).
 */
router.get('/update', authenticateToken, requirePermission('licencia', 'citat'), (_req, res) => {
  const a = dostupnaAktualizacia();
  res.json({
    success: true,
    data: {
      verzia: VERZIA_APLIKACIE,
      povolene: aktualizacieZapnute(),
      dostupna: a
        ? { verzia: a.verzia, povinna: Boolean(a.povinna), poznamky: a.poznamky ?? null, velkost: a.velkost ?? null }
        : null,
      beh: nacitajBeh(),
      log: koniecLogu(),
    },
  });
});

/**
 * @route POST /api/license/update - spustí aktualizáciu na dostupnú verziu
 *
 * Nainštalovať sa dá len verzia, ktorú ponúkol licenčný server v podpísanej
 * odpovedi - klient si nevyberá, čo sa stiahne.
 */
router.post('/update', authenticateToken, requirePermission('licencia', 'pisat'), async (_req, res) => {
  try {
    if (!aktualizacieZapnute()) {
      res.status(400).json({
        success: false,
        message: 'Aktualizácie sú na tomto serveri vypnuté. Zapnete ich v backend/.env: AKTUALIZACIE_POVOLENE=true',
      });
      return;
    }
    // Čerstvé overenie - ponuka mohla medzitým zmiznúť alebo sa zmeniť
    await overLicenciu();
    // Overenie mohlo doručiť príkaz licenčného servera, ktorý aktualizáciu už spustil
    const beh = nacitajBeh();
    if (beh?.stav === 'prebieha') {
      res.json({ success: true, data: beh, message: `Aktualizácia na verziu ${beh.verzia} sa spustila` });
      return;
    }
    const a = dostupnaAktualizacia();
    if (!a) {
      res.status(400).json({ success: false, message: 'Žiadna aktualizácia nie je dostupná' });
      return;
    }
    spustiAktualizator(a, null);
    res.json({ success: true, data: nacitajBeh(), message: `Aktualizácia na verziu ${a.verzia} sa spustila` });
  } catch (chyba) {
    if (chyba instanceof AktualizaciaError) {
      res.status(409).json({ success: false, message: chyba.message });
      return;
    }
    console.error('Chyba pri spúšťaní aktualizácie:', chyba);
    res.status(500).json({ success: false, message: 'Aktualizáciu sa nepodarilo spustiť' });
  }
});

export default router;
