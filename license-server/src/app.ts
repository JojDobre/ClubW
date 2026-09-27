// Umiestnenie: license-server/src/app.ts
// Aplikácia licenčného servera (bez spustenia - to robí index.ts).
//
//   /api/license/*    verejné endpointy pre klientske weby (CORS otvorený)
//   /api/public-key   verejný kľúč na overovanie podpisov
//   /api/sprava/*     API administrácie (len z vlastnej domény, s prihlásením)
//   /                 webová administrácia (admin/dist)

import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import sequelize from './config/database';
import licencieRoutes from './routes/licencie';
import spravaRoutes from './routes/sprava';

const app = express();

// Za reverznou proxy (Caddy, nginx) potrebujeme skutočnú IP klienta
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
  })
);

app.use(express.json({ limit: '64kb' }));

// Stručný záznam požiadaviek (bez tela a parametrov - nesú licenčné kľúče)
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test' && req.path.startsWith('/api')) console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/health', async (_req, res) => {
  let databaza = 'nedostupná';
  try {
    await sequelize.authenticate();
    databaza = 'pripojená';
  } catch {
    databaza = 'nedostupná';
  }
  res.status(databaza === 'pripojená' ? 200 : 503).json({
    status: databaza === 'pripojená' ? 'ok' : 'degraded',
    service: 'ClubW License Server',
    version: '3.0.0',
    databaza,
    timestamp: new Date().toISOString(),
  });
});

// Klientske weby bežia na rôznych doménach - CORS len pre verejné endpointy.
// Endpointy chráni licenčný kľúč, nie pôvod požiadavky.
const verejnyCors = cors({ origin: true });

/** Verejný kľúč na overovanie podpisov. Klient ho má mať radšej vložený v konfigurácii. */
app.get('/api/public-key', verejnyCors, (_req, res) => {
  const verejnyKluc = process.env.LICENSE_PUBLIC_KEY;
  if (!verejnyKluc) {
    res.status(500).json({ success: false, message: 'Verejný kľúč nie je nastavený' });
    return;
  }
  res.json({ success: true, verejnyKluc: verejnyKluc.replace(/\\n/g, '\n') });
});

app.use('/api/license', verejnyCors);
app.use('/api', licencieRoutes);
app.use('/api/sprava', spravaRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} nebol nájdený` });
});

// ===== Webová administrácia =====
const priecinokAdministracie = path.resolve(process.env.ADMIN_DIR || path.join(__dirname, '../admin/dist'));
if (fs.existsSync(path.join(priecinokAdministracie, 'index.html'))) {
  app.use(
    express.static(priecinokAdministracie, {
      index: false,
      // Súbory s odtlačkom v názve (assets/...) sa môžu držať dlho
      setHeaders: (res, cesta) => {
        if (cesta.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );
  // Adresy administrácie (/licencie/5, /produkty...) vracajú aplikáciu
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(priecinokAdministracie, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain').send('ClubW License Server beží. Webová administrácia nie je zostavená (npm run build:admin).');
  });
}

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Neplatný JSON' });
    return;
  }
  console.error('Chyba licenčného servera:', error);
  if (res.headersSent) return;
  if (error.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({ success: false, message: 'Záznam s touto hodnotou už existuje' });
    return;
  }
  res.status(500).json({ success: false, message: process.env.NODE_ENV === 'development' ? error.message : 'Interná chyba servera' });
});

export default app;
