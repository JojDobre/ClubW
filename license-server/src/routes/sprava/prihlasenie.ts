// Umiestnenie: license-server/src/routes/sprava/prihlasenie.ts
// Prihlásenie, odhlásenie a vlastný účet (heslo, dvojstupňové overenie).

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Administrator, zaznamenaj } from '../../models/sprava';
import { chybaHesla, overHeslo, zahasujHeslo } from '../../utils/heslo';
import { noveTajomstvo, otpauthOdkaz, overKod } from '../../utils/totp';
import { vytvorRelaciu, vyzadujPrihlasenie, zrusRelaciu, zrusVsetkyRelacie } from '../../middleware/prihlasenie';
import { a, ChybaVstupu, ip, text } from './pomocky';

const router = Router();

/** Ochrana pred skúšaním hesiel: 10 pokusov za 15 minút z jednej adresy. */
const limitPrihlasenia = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Príliš veľa pokusov o prihlásenie. Skúste to o 15 minút.' },
});

// Porovnanie s fiktívnym heslom, keď účet neexistuje - odpoveď trvá
// rovnako dlho a neprezradí, či e-mail patrí administrátorovi
let fiktivnyHash: Promise<string> | null = null;
const fiktivny = () => (fiktivnyHash ??= zahasujHeslo('fiktivne-heslo-na-porovnanie'));

router.post(
  '/prihlasenie',
  limitPrihlasenia,
  a(async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const heslo = typeof req.body?.heslo === 'string' ? req.body.heslo : '';
    const admin = email ? await Administrator.findOne({ where: { email } }) : null;
    const sedi = admin ? await overHeslo(heslo, admin.heslo_hash) : (await overHeslo(heslo, await fiktivny()), false);

    if (!admin || !sedi || !admin.aktivny) {
      await zaznamenaj({ typ: 'prihlasenie_neuspesne', popis: `Neúspešné prihlásenie (${email.slice(0, 100) || 'bez e-mailu'})`, ip: ip(req) });
      res.status(401).json({ success: false, message: 'Nesprávny e-mail alebo heslo' });
      return;
    }
    if (admin.totp_aktivne) {
      if (!req.body.kod) {
        res.status(401).json({ success: false, vyzaduje_kod: true, message: 'Zadajte kód z overovacej aplikácie' });
        return;
      }
      if (!admin.totp_tajomstvo || !overKod(admin.totp_tajomstvo, req.body.kod)) {
        await zaznamenaj({ typ: 'prihlasenie_neuspesne', popis: `Nesprávny kód dvojstupňového overenia (${admin.email})`, administrator_id: admin.id, ip: ip(req) });
        res.status(401).json({ success: false, vyzaduje_kod: true, message: 'Kód nie je správny' });
        return;
      }
    }
    await vytvorRelaciu(req, res, admin);
    await admin.update({ posledne_prihlasenie: new Date() });
    await zaznamenaj({ typ: 'prihlasenie', popis: `Prihlásenie: ${admin.meno}`, administrator_id: admin.id, ip: ip(req) });
    res.json({ success: true, data: admin.verejne() });
  })
);

router.post(
  '/odhlasenie',
  a(async (req, res) => {
    await zrusRelaciu(req, res);
    res.json({ success: true });
  })
);

router.get('/ja', vyzadujPrihlasenie, (req, res) => {
  res.json({ success: true, data: req.admin!.verejne() });
});

router.put(
  '/ja',
  vyzadujPrihlasenie,
  a(async (req, res) => {
    const meno = text(req.body.meno, 120, 'Meno', true)!;
    await req.admin!.update({ meno });
    res.json({ success: true, data: req.admin!.verejne(), message: 'Údaje boli uložené' });
  })
);

router.put(
  '/ja/heslo',
  vyzadujPrihlasenie,
  a(async (req, res) => {
    const admin = req.admin!;
    if (!(await overHeslo(String(req.body.stare ?? ''), admin.heslo_hash))) throw new ChybaVstupu('Súčasné heslo nie je správne');
    const chyba = chybaHesla(req.body.nove);
    if (chyba) throw new ChybaVstupu(chyba);
    await admin.update({ heslo_hash: await zahasujHeslo(req.body.nove) });
    // Ostatné zariadenia sa musia prihlásiť novým heslom
    await zrusVsetkyRelacie(admin.id, req.relacia!.id);
    await zaznamenaj({ typ: 'zmena_hesla', popis: `${admin.meno} si zmenil heslo`, administrator_id: admin.id, ip: ip(req) });
    res.json({ success: true, message: 'Heslo bolo zmenené. Ostatné zariadenia boli odhlásené.' });
  })
);

/** Príprava dvojstupňového overenia: nové tajomstvo, zatiaľ neaktívne. */
router.post(
  '/ja/2fa/priprav',
  vyzadujPrihlasenie,
  a(async (req, res) => {
    const admin = req.admin!;
    if (admin.totp_aktivne) throw new ChybaVstupu('Dvojstupňové overenie je už zapnuté');
    const tajomstvo = noveTajomstvo();
    await admin.update({ totp_tajomstvo: tajomstvo });
    res.json({ success: true, data: { tajomstvo, odkaz: otpauthOdkaz(tajomstvo, admin.email) } });
  })
);

router.post(
  '/ja/2fa/zapni',
  vyzadujPrihlasenie,
  a(async (req, res) => {
    const admin = req.admin!;
    if (!admin.totp_tajomstvo) throw new ChybaVstupu('Najprv pripravte dvojstupňové overenie');
    if (!overKod(admin.totp_tajomstvo, req.body.kod)) throw new ChybaVstupu('Kód nie je správny - skontrolujte čas v telefóne');
    await admin.update({ totp_aktivne: true });
    await zaznamenaj({ typ: '2fa_zapnute', popis: `${admin.meno} zapol dvojstupňové overenie`, administrator_id: admin.id, ip: ip(req) });
    res.json({ success: true, data: admin.verejne(), message: 'Dvojstupňové overenie je zapnuté' });
  })
);

router.post(
  '/ja/2fa/vypni',
  vyzadujPrihlasenie,
  a(async (req, res) => {
    const admin = req.admin!;
    if (!(await overHeslo(String(req.body.heslo ?? ''), admin.heslo_hash))) throw new ChybaVstupu('Heslo nie je správne');
    await admin.update({ totp_aktivne: false, totp_tajomstvo: null });
    await zaznamenaj({ typ: '2fa_vypnute', popis: `${admin.meno} vypol dvojstupňové overenie`, administrator_id: admin.id, ip: ip(req) });
    res.json({ success: true, data: admin.verejne(), message: 'Dvojstupňové overenie je vypnuté' });
  })
);

export default router;
