// Umiestnenie: license-server/src/index.ts
// Hlavný súbor licenčného servera ClubW.
//
// PÔVODNÝ STAV: server nemal databázu a endpoint /api/license/verify
// vracal isValid: true na akýkoľvek vstup. Licencia sa tak nedala reálne
// overiť ani obmedziť - celý biznis model bol len naoko.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import sequelize, { testConnection } from './config/database';
import licencieRoutes from './routes/licencie';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ===== BEZPEČNOSTNÉ MIDDLEWARE =====
app.use(helmet());

// Licenčný server oslovujú weby klientov z rôznych domén, preto CORS
// necháme otvorený - endpointy chráni licenčný kľúč, nie pôvod požiadavky.
app.use(cors({ origin: true }));

// Obmedzenie veľkosti tela požiadavky - overovacie údaje sú malé
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

// Za reverznou proxy potrebujeme skutočnú IP adresu klienta,
// inak by obmedzenie počtu požiadaviek videlo všetkých rovnako
app.set('trust proxy', 1);

// Jednoduché logovanie požiadaviek
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== ROUTES =====
app.get('/health', async (_req, res) => {
  // Skutočný stav databázy, nie natvrdo zapísaná hodnota
  let databaza = 'nedostupná';
  try {
    await sequelize.authenticate();
    databaza = 'pripojená';
  } catch {
    databaza = 'nedostupná';
  }

  res.json({
    status: databaza === 'pripojená' ? 'ok' : 'degraded',
    service: 'ClubW License Server',
    version: '2.0.0',
    databaza,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Verejný kľúč na overovanie podpisov.
 * Klient si ho môže stiahnuť pri prvom nasadení, ale odporúčame vložiť
 * ho priamo do konfigurácie klienta - stiahnutý kľúč by sa dal podvrhnúť.
 */
app.get('/api/public-key', (_req, res) => {
  const verejnyKluc = process.env.LICENSE_PUBLIC_KEY;

  if (!verejnyKluc) {
    res.status(500).json({ success: false, message: 'Verejný kľúč nie je nastavený' });
    return;
  }

  res.json({ success: true, verejnyKluc: verejnyKluc.replace(/\\n/g, '\n') });
});

app.use('/api', licencieRoutes);

// ===== ERROR HANDLING =====
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} nebol nájdený`,
  });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Chyba licenčného servera:', error);

  if (res.headersSent) return;

  if (error.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({ success: false, message: 'Záznam s touto hodnotou už existuje' });
    return;
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Interná chyba servera',
  });
});

// ===== ŠTART =====
const spustiServer = async () => {
  try {
    console.log('🔐 Spúšťanie ClubW License Servera...');

    // Kontrola, či server vie podpisovať odpovede - bez toho je nepoužiteľný
    if (!process.env.LICENSE_PRIVATE_KEY) {
      throw new Error(
        'Chýba LICENSE_PRIVATE_KEY. Vygenerujte pár kľúčov príkazom: npm run generuj-kluce'
      );
    }

    const pripojene = await testConnection();
    if (!pripojene) {
      throw new Error('Nepodarilo sa pripojiť k databáze licencií');
    }

    // Schéma sa vytvára migráciami (npm run db:migrate), nie cez sync()
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('✅ Schéma pripravená (vývojový režim)');
    }

    app.listen(PORT, () => {
      console.log(`✅ License Server beží na porte ${PORT}`);
      console.log(`   Health:  http://localhost:${PORT}/health`);
      console.log(`   Verify:  POST http://localhost:${PORT}/api/license/verify`);
      console.log(`   Admin:   http://localhost:${PORT}/api/admin/licenses (hlavička X-Admin-Key)`);
    });
  } catch (error: any) {
    console.error('❌ Licenčný server sa nepodarilo spustiť:', error.message);
    process.exit(1);
  }
};

spustiServer();

export default app;
