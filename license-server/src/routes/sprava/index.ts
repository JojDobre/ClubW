// Umiestnenie: license-server/src/routes/sprava/index.ts
// API administrácie licenčného servera (/api/sprava).
// Okrem prihlásenia vyžaduje všetko prihláseného administrátora.

import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { vyzadujHlavicku, vyzadujPrihlasenie } from '../../middleware/prihlasenie';
import prihlasenie from './prihlasenie';
import licencie from './licencie';
import produkty from './produkty';
import ostatne from './ostatne';
import { ChybaVstupu } from './pomocky';

const router = Router();

router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Príliš veľa požiadaviek. Skúste o chvíľu znova.' },
  })
);
router.use(vyzadujHlavicku);
// Odpovede administrácie sa nesmú ukladať do vyrovnávacej pamäte
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.use(prihlasenie);
router.use(vyzadujPrihlasenie);
router.use(licencie);
router.use(produkty);
router.use(ostatne);

router.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Neznáma požiadavka' });
});

// Chyby vstupu ako zrozumiteľná odpoveď, ostatné do spoločného spracovania
router.use((chyba: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (chyba instanceof ChybaVstupu) {
    res.status(chyba.stav).json({ success: false, message: chyba.message });
    return;
  }
  if ((chyba as any)?.name === 'SequelizeValidationError') {
    res.status(400).json({ success: false, message: (chyba as any).errors?.[0]?.message ?? 'Neplatné údaje' });
    return;
  }
  next(chyba);
});

export default router;
