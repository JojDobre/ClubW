// Umiestnenie: backend/src/routes/fanusik.ts
//
// Účet fanúšika na webe (stránka Môj klub) a výhody členov.
//
// Verejné / fanúšik (/api/fan):
//   POST   /prihlasenie            e-mail + heslo → token
//   POST   /heslo/vyziadat         odkaz na nové heslo e-mailom
//   POST   /heslo/nastavit         token z odkazu + nové heslo → token
//   GET    /ja                     profil, členská karta
//   PUT    /ja                     telefón, adresa, súhlas s oznamami
//   PUT    /ja/heslo               zmena hesla (odhlási ostatné zariadenia)
//   DELETE /ja                     zrušenie účtu (zmaže údaje fanúšika)
//   GET    /vyhody                 výhody pre typ členstva
//   GET    /overenie/:kod          overenie členskej karty z QR kódu
//
// Administrácia (/api/admin):
//   POST   /fans/:id/schvalit      schválenie žiadosti + e-mail / pozvánka
//   POST   /fans/:id/pozvanka      odkaz na nastavenie hesla (aj na skopírovanie)
//   CRUD   /fan-vyhody             výhody členov

import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import Fanusik from '../models/Fanusik';
import FanusikToken from '../models/FanusikToken';
import VyhodaFanusika, { TYPY_CLENSTVA } from '../models/VyhodaFanusika';
import Sponzor from '../models/Sponzor';
import NastaveniaKlubu from '../models/NastaveniaKlubu';
import { authenticateToken, requireEditor, requireAdmin } from '../middleware/auth';
import { overSiluHesla } from '../utils/heslo';
import { sanitizePlainText } from '../utils/sanitize';
import { posliSablonu } from '../services/email/odosielanie';
import { odpovedzNaChybuModelu } from '../utils/odpoved';
import {
  oznamSchvalenie,
  posliOdkazNaHeslo,
  profilFanusika,
  vydajTokenFanusika,
  vyzadujFanusika,
  type RequestFanusika,
} from '../services/fanusikUcet';

export const fanusikRouter = Router();
export const adminFanusikRouter = Router();

const text = (v: unknown, max: number): string => (typeof v === 'string' ? sanitizePlainText(v).trim().slice(0, max) : '');
const chybaServera = (res: Response, kde: string, chyba: unknown) => {
  console.error(`Chyba (${kde}):`, chyba);
  res.status(500).json({ success: false, message: 'Chyba servera, skúste to znova' });
};

// Pokusy o prihlásenie a odkazy na heslo - ochrana proti hádaniu hesiel
// a zasypávaniu schránok
const limitPrihlasenia = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Príliš veľa pokusov o prihlásenie. Skúste to o 15 minút.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const limitOdkazov = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Príliš veľa žiadostí. Skúste to neskôr.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const limitOverenia = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// ===== Prihlásenie a heslo =====

fanusikRouter.post('/prihlasenie', limitPrihlasenia, async (req, res) => {
  try {
    const email = text(req.body?.email, 150).toLowerCase();
    const heslo = typeof req.body?.heslo === 'string' ? req.body.heslo : '';
    const f = email ? await Fanusik.findOne({ where: { email } }) : null;
    // Rovnaká odpoveď pre neexistujúci e-mail aj zlé heslo
    if (!f || !f.aktivity || f.stav === 'zamietnuty' || !(await f.overHeslo(heslo))) {
      res.status(401).json({ success: false, message: 'Nesprávny e-mail alebo heslo' });
      return;
    }
    await f.update({ posledne_prihlasenie: new Date() });
    res.json({ success: true, data: { token: vydajTokenFanusika(f), fanusik: profilFanusika(f) } });
  } catch (chyba) {
    chybaServera(res, 'prihlásenie fanúšika', chyba);
  }
});

fanusikRouter.post('/heslo/vyziadat', limitOdkazov, async (req, res) => {
  try {
    const email = text(req.body?.email, 150).toLowerCase();
    const f = email ? await Fanusik.findOne({ where: { email } }) : null;
    // Pošleme len evidovanému a nezamietnutému - odpoveď je vždy rovnaká
    if (f && f.aktivity && f.stav !== 'zamietnuty') await posliOdkazNaHeslo(f, f.heslo_hash ? 'obnova' : 'pozvanka');
    res.json({ success: true, message: 'Ak je e-mail evidovaný, poslali sme naň odkaz na nastavenie hesla.' });
  } catch (chyba) {
    chybaServera(res, 'odkaz na heslo', chyba);
  }
});

fanusikRouter.post('/heslo/nastavit', limitOdkazov, async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const zaznam = token ? await FanusikToken.findOne({ where: { odtlacok: FanusikToken.odtlacokTokenu(token) } }) : null;
    const f = zaznam?.jePouzitelny() ? await Fanusik.findByPk(zaznam.fanusik_id) : null;
    if (!zaznam || !f || !f.aktivity || f.stav === 'zamietnuty') {
      res.status(400).json({ success: false, message: 'Odkaz je neplatný alebo mu vypršala platnosť. Vyžiadajte si nový.' });
      return;
    }
    const chyby = overSiluHesla(req.body?.heslo, { meno: `${f.meno} ${f.priezvisko}`, email: f.email });
    if (chyby.length) {
      res.status(400).json({ success: false, message: chyby[0], errors: chyby });
      return;
    }
    await f.nastavHeslo(req.body.heslo);
    f.posledne_prihlasenie = new Date();
    await f.save();
    await zaznam.update({ pouzity: true });
    res.json({ success: true, message: 'Heslo bolo nastavené', data: { token: vydajTokenFanusika(f), fanusik: profilFanusika(f) } });
  } catch (chyba) {
    chybaServera(res, 'nastavenie hesla fanúšika', chyba);
  }
});

// ===== Môj účet =====

fanusikRouter.get('/ja', vyzadujFanusika, (req: RequestFanusika, res) => {
  res.json({ success: true, data: profilFanusika(req.fanusik!) });
});

fanusikRouter.put('/ja', vyzadujFanusika, async (req: RequestFanusika, res) => {
  try {
    const f = req.fanusik!;
    const b = req.body ?? {};
    if (b.telefon !== undefined) f.telefon = text(b.telefon, 40) || null;
    if (b.adresa !== undefined) f.adresa = text(b.adresa, 255) || null;
    if (b.suhlas_oznamy !== undefined) f.suhlas_oznamy = b.suhlas_oznamy === true;
    await f.save();
    res.json({ success: true, message: 'Údaje boli uložené', data: profilFanusika(f) });
  } catch (chyba) {
    if (!odpovedzNaChybuModelu(chyba, res)) chybaServera(res, 'úprava profilu fanúšika', chyba);
  }
});

fanusikRouter.put('/ja/heslo', vyzadujFanusika, async (req: RequestFanusika, res) => {
  try {
    const f = req.fanusik!;
    if (!(await f.overHeslo(req.body?.stare_heslo))) {
      res.status(400).json({ success: false, message: 'Súčasné heslo nie je správne' });
      return;
    }
    const chyby = overSiluHesla(req.body?.nove_heslo, { meno: `${f.meno} ${f.priezvisko}`, email: f.email });
    if (chyby.length) {
      res.status(400).json({ success: false, message: chyby[0], errors: chyby });
      return;
    }
    await f.nastavHeslo(req.body.nove_heslo);
    await f.save();
    res.json({ success: true, message: 'Heslo bolo zmenené', data: { token: vydajTokenFanusika(f) } });
  } catch (chyba) {
    chybaServera(res, 'zmena hesla fanúšika', chyba);
  }
});

fanusikRouter.delete('/ja', vyzadujFanusika, async (req: RequestFanusika, res) => {
  try {
    const f = req.fanusik!;
    if (!(await f.overHeslo(req.body?.heslo))) {
      res.status(400).json({ success: false, message: 'Heslo nie je správne' });
      return;
    }
    const { meno, priezvisko, email, cislo_karty } = f;
    await f.destroy();
    const klub = await NastaveniaKlubu.nacitaj();
    if (klub?.email) {
      void posliSablonu('fanusik_zruseny_klub', klub.email, { meno, priezvisko, email, cislo_karty });
    }
    res.json({ success: true, message: 'Účet bol zrušený a údaje zmazané' });
  } catch (chyba) {
    chybaServera(res, 'zrušenie účtu fanúšika', chyba);
  }
});

// ===== Výhody =====

const verejnaVyhoda = (v: VyhodaFanusika & { sponzor?: Sponzor | null }) => ({
  id: v.id,
  nazov: v.nazov,
  popis: v.popis,
  obrazok: v.obrazok,
  kod: v.kod,
  odkaz: v.odkaz,
  platne_do: v.platne_do,
  partner: v.sponzor ? { nazov: v.sponzor.nazov, logo: v.sponzor.logo, web: v.sponzor.web_url } : null,
});

fanusikRouter.get('/vyhody', vyzadujFanusika, async (req: RequestFanusika, res) => {
  try {
    const f = req.fanusik!;
    // Výhody patria len platným členom - čakajúci a po skončení platnosti nevidia kódy
    if (!f.jePlatne()) {
      res.json({ success: true, data: [], meta: { dostupne: false } });
      return;
    }
    const vsetky = await VyhodaFanusika.findAll({
      where: { aktivity: true },
      include: [{ model: Sponzor, as: 'sponzor', required: false }],
      order: [['poradie', 'ASC'], ['id', 'DESC']],
    });
    const moje = vsetky.filter((v) => v.platiPre(f.typ_clenstva));
    res.json({ success: true, data: moje.map((v) => verejnaVyhoda(v as never)), meta: { dostupne: true } });
  } catch (chyba) {
    chybaServera(res, 'výhody fanúšika', chyba);
  }
});

// ===== Overenie karty (QR kód pri vstupe) =====

fanusikRouter.get('/overenie/:kod', limitOverenia, async (req, res) => {
  try {
    const kod = String(req.params.kod || '').slice(0, 40);
    const f = kod.length >= 10 ? await Fanusik.findOne({ where: { overovaci_kod: kod } }) : null;
    if (!f) {
      res.status(404).json({ success: false, message: 'Karta neexistuje' });
      return;
    }
    // Usporiadateľ vidí len to, čo potrebuje - bez e-mailu a telefónu
    res.json({
      success: true,
      data: {
        platne: f.jePlatne(),
        meno: `${f.meno} ${f.priezvisko.charAt(0)}.`,
        typ_clenstva: f.typ_clenstva,
        cislo_karty: f.cislo_karty,
        clenstvo_do: f.clenstvo_do,
      },
    });
  } catch (chyba) {
    chybaServera(res, 'overenie karty', chyba);
  }
});

// ===== Administrácia: schválenie a pozvánky =====

adminFanusikRouter.post('/fans/:id/schvalit', authenticateToken, requireEditor, async (req, res) => {
  try {
    const f = await Fanusik.findByPk(Number(req.params.id));
    if (!f) {
      res.status(404).json({ success: false, message: 'Fanúšik sa nenašiel' });
      return;
    }
    const dnes = new Date().toISOString().slice(0, 10);
    await f.update({ stav: 'aktivny', aktivity: true, clenstvo_od: f.clenstvo_od ?? (dnes as never) });
    await f.reload();
    const { odkaz, odoslany } = await oznamSchvalenie(f);
    res.json({
      success: true,
      message: odoslany ? 'Žiadosť bola schválená a fanúšik dostal e-mail' : 'Žiadosť bola schválená',
      data: { fanusik: f, odkaz, email_odoslany: odoslany },
    });
  } catch (chyba) {
    chybaServera(res, 'schválenie fanúšika', chyba);
  }
});

adminFanusikRouter.post('/fans/:id/pozvanka', authenticateToken, requireEditor, async (req, res) => {
  try {
    const f = await Fanusik.findByPk(Number(req.params.id));
    if (!f || !f.aktivity || f.stav === 'zamietnuty') {
      res.status(400).json({ success: false, message: 'Pozvánku možno poslať len aktívnemu fanúšikovi' });
      return;
    }
    const { odkaz, odoslany } = await posliOdkazNaHeslo(f, f.heslo_hash ? 'obnova' : 'pozvanka');
    res.json({
      success: true,
      message: odoslany ? 'Odkaz na nastavenie hesla bol odoslaný e-mailom' : 'E-mail sa nepodarilo odoslať - skopírujte odkaz',
      data: { odkaz, email_odoslany: odoslany },
    });
  } catch (chyba) {
    chybaServera(res, 'pozvánka fanúšika', chyba);
  }
});

// ===== Administrácia: výhody =====

const udajeVyhody = (b: Record<string, unknown>) => {
  const datum = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const typy = Array.isArray(b.typy_clenstva) ? b.typy_clenstva.filter((t) => TYPY_CLENSTVA.includes(t as never)) : [];
  const odkaz = text(b.odkaz, 500);
  return {
    nazov: text(b.nazov, 150),
    popis: text(b.popis, 3000) || null,
    obrazok: text(b.obrazok, 500) || null,
    typy_clenstva: [...new Set(typy)] as never,
    sponzor_id: Number(b.sponzor_id) > 0 ? Number(b.sponzor_id) : null,
    kod: text(b.kod, 60) || null,
    // Len bezpečné odkazy: stránka webu alebo http(s)
    odkaz: /^(\/|https?:\/\/)/i.test(odkaz) ? odkaz : null,
    platne_od: datum(b.platne_od),
    platne_do: datum(b.platne_do),
    poradie: Number.isInteger(Number(b.poradie)) ? Number(b.poradie) : 0,
    aktivity: b.aktivity !== false,
  };
};

adminFanusikRouter.get('/fan-vyhody', authenticateToken, requireEditor, async (_req, res) => {
  try {
    const vyhody = await VyhodaFanusika.findAll({
      include: [{ model: Sponzor, as: 'sponzor', required: false, attributes: ['id', 'nazov', 'logo'] }],
      order: [['poradie', 'ASC'], ['id', 'DESC']],
    });
    res.json({ success: true, data: vyhody });
  } catch (chyba) {
    chybaServera(res, 'výpis výhod', chyba);
  }
});

adminFanusikRouter.post('/fan-vyhody', authenticateToken, requireEditor, async (req, res) => {
  try {
    const udaje = udajeVyhody(req.body ?? {});
    if (!udaje.nazov) {
      res.status(400).json({ success: false, message: 'Výhoda musí mať názov' });
      return;
    }
    const vyhoda = await VyhodaFanusika.create(udaje);
    res.status(201).json({ success: true, data: vyhoda, message: 'Výhoda bola pridaná' });
  } catch (chyba) {
    if (!odpovedzNaChybuModelu(chyba, res)) chybaServera(res, 'pridanie výhody', chyba);
  }
});

adminFanusikRouter.put('/fan-vyhody/:id', authenticateToken, requireEditor, async (req, res) => {
  try {
    const vyhoda = await VyhodaFanusika.findByPk(Number(req.params.id));
    if (!vyhoda) {
      res.status(404).json({ success: false, message: 'Výhoda sa nenašla' });
      return;
    }
    const udaje = udajeVyhody({ ...vyhoda.get(), ...(req.body ?? {}) });
    if (!udaje.nazov) {
      res.status(400).json({ success: false, message: 'Výhoda musí mať názov' });
      return;
    }
    await vyhoda.update(udaje);
    res.json({ success: true, data: vyhoda, message: 'Zmeny boli uložené' });
  } catch (chyba) {
    if (!odpovedzNaChybuModelu(chyba, res)) chybaServera(res, 'úprava výhody', chyba);
  }
});

adminFanusikRouter.delete('/fan-vyhody/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pocet = await VyhodaFanusika.destroy({ where: { id: Number(req.params.id) } });
    if (!pocet) {
      res.status(404).json({ success: false, message: 'Výhoda sa nenašla' });
      return;
    }
    res.json({ success: true, message: 'Výhoda bola zmazaná' });
  } catch (chyba) {
    chybaServera(res, 'zmazanie výhody', chyba);
  }
});
