// backend/src/routes/public.ts
// Verejné routes pre frontend - obsluha SPA routing

import { Router, Request, Response } from 'express';
import path from 'path';

const router: Router = Router();

// Middleware pre obsluhu SPA (Single Page Application)
// Všetky frontend routes presmerujeme na index.html
const spaHandler = (req: Request, res: Response) => {
  // Ak je to API request, nechaj ho prejsť ďalej
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint nebol nájdený'
    });
  }

  // Pre všetky ostatné routes (frontend), vráť index.html
  // V produkčnom prostredí by sme slúžili statické súbory
  res.json({
    message: 'SPA Route - frontend by mal obsluhovať túto cestu',
    path: req.path,
    note: 'V produkcii by sa vrátil index.html súbor'
  });
};

// Špecifické frontend routes
router.get('/', spaHandler);
router.get('/clanky', spaHandler);
router.get('/clanek/:slug', spaHandler); // Detail článku
router.get('/admin', spaHandler);
router.get('/admin/*', spaHandler);

// Fallback pre všetky ostatné routes
router.get('*', spaHandler);

export default router;