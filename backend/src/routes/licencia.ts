// Umiestnenie: backend/src/routes/licencia.ts
// Licencia a verzia systému.
//
// Požiadavka: „overenie licencie, platnosť, aktualizácia systému, verzie".

import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import sequelize from '../config/database';
import { overLicenciu, stavLicencie } from '../middleware/licencia';
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const balicek = require('../../package.json');

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
        verzia_aplikacie: balicek.version,
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

export default router;
