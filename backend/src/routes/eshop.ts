// Umiestnenie: backend/src/routes/eshop.ts
// API e-shopu.
//
// VEREJNÉ (/api/eshop):
//   GET  /nastavenia                 obchod zapnutý?, mena, doručenia, platby
//   GET  /kategorie                  kategórie s produktmi
//   GET  /produkty                   ?kategoria=slug &odporucane=1 &hladat= &page &limit
//   GET  /produkty/:slug             detail produktu
//   POST /objednavky                 odoslanie objednávky (ceny počíta server)
//   GET  /objednavky/:token          stav objednávky cez tajný odkaz
//   POST /platby/:id/oznamenie       oznámenie o zaplatení od platobnej brány
//
// ADMINISTRÁCIA (/api/admin/eshop, modul oprávnení „eshop"):
//   produkty, kategorie, dorucenia, platby (CRUD), nastavenia, objednavky.
//   Spôsoby platby (obsahujú kód platobnej brány) a nastavenia obchodu
//   smie meniť len správca.

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Op, WhereOptions } from 'sequelize';
import sequelize from '../config/database';
import {
  EshopDorucenie,
  EshopKategoria,
  EshopObjednavka,
  EshopPlatba,
  EshopPolozka,
  EshopProdukt,
  STAVY_OBJEDNAVKY,
  STAVY_PLATBY,
  TYPY_PLATBY,
  suma,
} from '../models/Eshop';
import { authenticateToken, optionalAuth, requireAdmin, requireRole, smieVModule } from '../middleware/auth';
import { odpovedzNaChybuModelu, zostavStrankovanie } from '../utils/odpoved';
import { sanitizeContent, sanitizePlainText } from '../utils/sanitize';
import {
  ChybaEshopu,
  nastaveniaEshopu,
  novyKlucBrany,
  ocistiVlastnosti,
  oznamenieOPlatbe,
  posliZmenuStavu,
  ulozNastaveniaEshopu,
  verejnaObjednavka,
  volnySlug,
  vratNaSklad,
  vytvorObjednavku,
} from '../services/eshop';

export const verejnyEshopRouter = Router();
export const adminEshopRouter = Router();

/** Chyba pre zákazníka alebo správcu, chyba modelu, inak 500. */
const odpovedzChybou = (res: Response, chyba: unknown, sprava: string) => {
  if (chyba instanceof ChybaEshopu) {
    res.status(chyba.stav).json({ success: false, message: chyba.message });
    return;
  }
  if (odpovedzNaChybuModelu(chyba, res)) return;
  console.error(sprava, chyba);
  res.status(500).json({ success: false, message: sprava });
};

/**
 * Len správca (nie vlastná rola s právom „eshop"): spôsob platby obsahuje
 * kód platobnej brány, ktorý sa zobrazí zákazníkom na webe.
 */
const lenSpravca = (req: Request, res: Response, next: () => void) => {
  if ((req as any).user?.rola !== 'admin') {
    res.status(403).json({ success: false, message: 'Spôsoby platby môže meniť len správca' });
    return;
  }
  next();
};

const idZCesty = (req: Request) => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const textAleboNull = (h: unknown, max: number) => {
  if (h === undefined) return undefined;
  const t = sanitizePlainText(String(h ?? '')).trim().slice(0, max);
  return t || null;
};

/** Suma zo vstupu: undefined = nemeniť, '' alebo null = null (ak je povolené). */
const sumaZoVstupu = (h: unknown, nazov: string, mozeBytNull = false): number | null | undefined => {
  if (h === undefined) return undefined;
  if (h === null || h === '') {
    if (mozeBytNull) return null;
    throw new ChybaEshopu(`${nazov} je povinná`);
  }
  const n = Number(String(h).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new ChybaEshopu(`${nazov} nie je platná suma`);
  return suma(n);
};

const celeCislo = (h: unknown, nazov: string, mozeBytNull = false): number | null | undefined => {
  if (h === undefined) return undefined;
  if (h === null || h === '') {
    if (mozeBytNull) return null;
    return 0;
  }
  const n = Number(h);
  if (!Number.isInteger(n) || n < 0) throw new ChybaEshopu(`${nazov} musí byť celé číslo 0 alebo viac`);
  return n;
};

const obrazokZoVstupu = (h: unknown) => {
  if (h === undefined) return undefined;
  const cesta = String(h ?? '').trim();
  if (!cesta) return null;
  if (!/^(\/uploads\/|https?:\/\/)/.test(cesta)) throw new ChybaEshopu('Obrázok musí byť z knižnice médií alebo adresa https://');
  return cesta.slice(0, 255);
};

// =====================================================================
// VEREJNÉ
// =====================================================================

/** Obchod je zapnutý, alebo sa naň pozerá prihlásený redaktor (náhľad). */
const obchodDostupny = async (req: Request) => (await nastaveniaEshopu()).zapnuty || (await smieVModule(req, 'eshop', 'citat'));

verejnyEshopRouter.get('/nastavenia', async (_req: Request, res: Response) => {
  try {
    const nastavenia = await nastaveniaEshopu();
    const [dorucenia, platby] = await Promise.all([
      EshopDorucenie.findAll({ where: { aktivny: true }, order: [['poradie', 'ASC'], ['id', 'ASC']] }),
      EshopPlatba.findAll({ where: { aktivny: true }, order: [['poradie', 'ASC'], ['id', 'ASC']] }),
    ]);
    res.json({
      success: true,
      data: {
        zapnuty: nastavenia.zapnuty,
        mena: nastavenia.mena,
        podmienky_url: nastavenia.podmienky_url,
        predvolena_krajina: nastavenia.predvolena_krajina,
        minimalna_objednavka: nastavenia.minimalna_objednavka,
        dorucenia: dorucenia.map((d) => d.toJSON()),
        platby: platby.map((p) => p.verejne()),
      },
    });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní obchodu');
  }
});

verejnyEshopRouter.get('/kategorie', optionalAuth, async (req: Request, res: Response) => {
  try {
    if (!(await obchodDostupny(req))) {
      res.json({ success: true, data: [] });
      return;
    }
    const kategorie = await EshopKategoria.findAll({ where: { aktivity: true }, order: [['poradie', 'ASC'], ['nazov', 'ASC']] });
    const pocty = (await EshopProdukt.findAll({
      attributes: ['kategoria_id', [sequelize.fn('COUNT', sequelize.col('id')), 'pocet']],
      where: { aktivny: true },
      group: ['kategoria_id'],
      raw: true,
    })) as unknown as Array<{ kategoria_id: number | null; pocet: string }>;
    const podlaId = new Map(pocty.map((p) => [p.kategoria_id, Number(p.pocet)]));
    res.json({
      success: true,
      // Prázdne kategórie web nepotrebuje
      data: kategorie.map((k) => ({ ...k.toJSON(), pocet_produktov: podlaId.get(k.id) ?? 0 })).filter((k) => k.pocet_produktov > 0),
    });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní kategórií');
  }
});

verejnyEshopRouter.get('/produkty', optionalAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 60);
    const strana = Math.max(Number(req.query.page) || 1, 1);
    if (!(await obchodDostupny(req))) {
      res.json({ success: true, data: [], pagination: zostavStrankovanie(0, limit, 0) });
      return;
    }
    const kde: any = { aktivny: true };
    if (req.query.odporucane === '1') kde.odporucany = true;
    if (req.query.hladat) kde.nazov = { [Op.iLike]: `%${String(req.query.hladat).slice(0, 80)}%` };
    if (req.query.kategoria) {
      const kategoria = await EshopKategoria.findOne({ where: { slug: String(req.query.kategoria), aktivity: true } });
      if (!kategoria) {
        res.json({ success: true, data: [], pagination: zostavStrankovanie(0, limit, 0) });
        return;
      }
      kde.kategoria_id = kategoria.id;
    }
    const { count, rows } = await EshopProdukt.findAndCountAll({
      where: kde,
      include: [{ model: EshopKategoria, as: 'kategoria', attributes: ['id', 'nazov', 'slug'], required: false }],
      order: [['poradie', 'ASC'], ['vytvoreny', 'DESC']],
      limit,
      offset: (strana - 1) * limit,
    });
    res.json({ success: true, data: rows.map((p) => p.toJSON()), pagination: zostavStrankovanie(count, limit, (strana - 1) * limit) });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní produktov');
  }
});

verejnyEshopRouter.get('/produkty/:slug', optionalAuth, async (req: Request, res: Response) => {
  try {
    const produkt =
      (await obchodDostupny(req)) &&
      (await EshopProdukt.findOne({
        where: { slug: String(req.params.slug), aktivny: true },
        include: [{ model: EshopKategoria, as: 'kategoria', attributes: ['id', 'nazov', 'slug'], required: false }],
      }));
    if (!produkt) {
      res.status(404).json({ success: false, message: 'Produkt sa nenašiel' });
      return;
    }
    res.json({ success: true, data: produkt.toJSON() });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní produktu');
  }
});

// Objednávky z jednej adresy - ochrana pred zahltením a skúšaním
const limitObjednavok = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Príliš veľa objednávok za krátky čas. Skúste to o chvíľu.' },
});

verejnyEshopRouter.post('/objednavky', limitObjednavok, async (req: Request, res: Response) => {
  try {
    const objednavka = await vytvorObjednavku(req.body || {});
    res.status(201).json({
      success: true,
      data: { cislo: objednavka.cislo, token: objednavka.token, spolu: suma(objednavka.spolu), mena: objednavka.mena },
      message: 'Objednávka bola odoslaná',
    });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Objednávku sa nepodarilo odoslať');
  }
});

verejnyEshopRouter.get('/objednavky/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const objednavka = /^[a-f0-9]{48}$/.test(token)
      ? await EshopObjednavka.findOne({ where: { token }, include: [{ model: EshopPolozka, as: 'polozky' }], order: [[{ model: EshopPolozka, as: 'polozky' }, 'id', 'ASC']] })
      : null;
    if (!objednavka) {
      res.status(404).json({ success: false, message: 'Objednávka sa nenašla' });
      return;
    }
    res.json({ success: true, data: await verejnaObjednavka(objednavka) });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní objednávky');
  }
});

verejnyEshopRouter.post('/platby/:id/oznamenie', async (req: Request, res: Response) => {
  try {
    const id = idZCesty(req);
    if (!id) {
      res.status(404).json({ success: false, message: 'Spôsob platby neexistuje' });
      return;
    }
    const kluc = String(req.get('x-clubw-kluc') || req.body?.kluc || req.query.kluc || '');
    const { objednavka, zaplatene } = await oznamenieOPlatbe(id, kluc, {
      cislo: req.body?.cislo ?? req.query.cislo,
      vs: req.body?.vs ?? req.body?.variabilny_symbol ?? req.query.vs,
      stav: req.body?.stav ?? req.query.stav,
      referencia: req.body?.referencia ?? req.body?.id_platby,
    });
    res.json({ success: true, data: { cislo: objednavka.cislo, stav_platby: objednavka.stav_platby, zaplatene } });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Oznámenie o platbe sa nepodarilo spracovať');
  }
});

// =====================================================================
// ADMINISTRÁCIA
// =====================================================================

adminEshopRouter.use(authenticateToken, requireRole(['admin', 'redaktor']));

// ----- Kategórie -----

adminEshopRouter.get('/kategorie', async (_req: Request, res: Response) => {
  try {
    const kategorie = await EshopKategoria.findAll({ order: [['poradie', 'ASC'], ['nazov', 'ASC']] });
    const pocty = (await EshopProdukt.findAll({
      attributes: ['kategoria_id', [sequelize.fn('COUNT', sequelize.col('id')), 'pocet']],
      group: ['kategoria_id'],
      raw: true,
    })) as unknown as Array<{ kategoria_id: number | null; pocet: string }>;
    const podlaId = new Map(pocty.map((p) => [p.kategoria_id, Number(p.pocet)]));
    res.json({ success: true, data: kategorie.map((k) => ({ ...k.toJSON(), pocet_produktov: podlaId.get(k.id) ?? 0 })) });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní kategórií');
  }
});

const udajeKategorie = (telo: any) => {
  const udaje: any = {};
  if (telo.nazov !== undefined) udaje.nazov = textAleboNull(telo.nazov, 100) ?? '';
  if (telo.popis !== undefined) udaje.popis = textAleboNull(telo.popis, 1000);
  if (telo.poradie !== undefined) udaje.poradie = celeCislo(telo.poradie, 'Poradie') ?? 0;
  if (telo.aktivity !== undefined) udaje.aktivity = telo.aktivity !== false;
  return udaje;
};

adminEshopRouter.post('/kategorie', async (req: Request, res: Response) => {
  try {
    const udaje = udajeKategorie(req.body || {});
    const kategoria = await EshopKategoria.create({ ...udaje, slug: await volnySlug(EshopKategoria, req.body?.slug || udaje.nazov || '') });
    res.status(201).json({ success: true, data: kategoria, message: 'Kategória bola vytvorená' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Kategóriu sa nepodarilo vytvoriť');
  }
});

adminEshopRouter.put('/kategorie/:id', async (req: Request, res: Response) => {
  try {
    const kategoria = await EshopKategoria.findByPk(idZCesty(req) ?? 0);
    if (!kategoria) {
      res.status(404).json({ success: false, message: 'Kategória sa nenašla' });
      return;
    }
    const udaje = udajeKategorie(req.body || {});
    if (req.body?.slug !== undefined && req.body.slug !== kategoria.slug) udaje.slug = await volnySlug(EshopKategoria, req.body.slug || kategoria.nazov, kategoria.id);
    await kategoria.update(udaje);
    res.json({ success: true, data: kategoria, message: 'Kategória bola uložená' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Kategóriu sa nepodarilo uložiť');
  }
});

adminEshopRouter.delete('/kategorie/:id', async (req: Request, res: Response) => {
  try {
    const kategoria = await EshopKategoria.findByPk(idZCesty(req) ?? 0);
    if (!kategoria) {
      res.status(404).json({ success: false, message: 'Kategória sa nenašla' });
      return;
    }
    // Produkty kategórie zostanú, len bez kategórie
    await EshopProdukt.update({ kategoria_id: null }, { where: { kategoria_id: kategoria.id } });
    await kategoria.destroy();
    res.json({ success: true, message: 'Kategória bola zmazaná' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Kategóriu sa nepodarilo zmazať');
  }
});

// ----- Produkty -----

adminEshopRouter.get('/produkty', async (req: Request, res: Response) => {
  try {
    const kde: any = {};
    if (req.query.kategoria_id) kde.kategoria_id = Number(req.query.kategoria_id) || null;
    if (req.query.hladat) {
      const vyraz = `%${String(req.query.hladat).slice(0, 80)}%`;
      kde[Op.or] = [{ nazov: { [Op.iLike]: vyraz } }, { kod: { [Op.iLike]: vyraz } }];
    }
    const produkty = await EshopProdukt.findAll({
      where: kde,
      include: [{ model: EshopKategoria, as: 'kategoria', attributes: ['id', 'nazov', 'slug'], required: false }],
      order: [['poradie', 'ASC'], ['vytvoreny', 'DESC']],
    });
    res.json({ success: true, data: produkty.map((p) => p.toJSON()) });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní produktov');
  }
});

adminEshopRouter.get('/produkty/:id', async (req: Request, res: Response) => {
  try {
    const produkt = await EshopProdukt.findByPk(idZCesty(req) ?? 0, {
      include: [{ model: EshopKategoria, as: 'kategoria', attributes: ['id', 'nazov', 'slug'], required: false }],
    });
    if (!produkt) {
      res.status(404).json({ success: false, message: 'Produkt sa nenašiel' });
      return;
    }
    res.json({ success: true, data: produkt.toJSON() });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní produktu');
  }
});

const udajeProduktu = async (telo: any) => {
  const udaje: any = {};
  if (telo.nazov !== undefined) udaje.nazov = textAleboNull(telo.nazov, 150) ?? '';
  if (telo.kratky_popis !== undefined) udaje.kratky_popis = textAleboNull(telo.kratky_popis, 300);
  if (telo.popis !== undefined) udaje.popis = telo.popis ? sanitizeContent(String(telo.popis)) : null;
  if (telo.cena !== undefined) udaje.cena = sumaZoVstupu(telo.cena, 'Cena');
  if (telo.povodna_cena !== undefined) udaje.povodna_cena = sumaZoVstupu(telo.povodna_cena, 'Pôvodná cena', true);
  if (telo.obrazok !== undefined) udaje.obrazok = obrazokZoVstupu(telo.obrazok);
  if (telo.obrazky !== undefined) {
    if (!Array.isArray(telo.obrazky)) throw new ChybaEshopu('Ďalšie obrázky musia byť zoznam');
    udaje.obrazky = telo.obrazky.slice(0, 12).map((o: unknown) => obrazokZoVstupu(o)).filter(Boolean);
  }
  if (telo.vlastnosti !== undefined) udaje.vlastnosti = ocistiVlastnosti(telo.vlastnosti);
  if (telo.sklad !== undefined) udaje.sklad = celeCislo(telo.sklad, 'Sklad', true);
  if (telo.kod !== undefined) udaje.kod = textAleboNull(telo.kod, 60);
  if (telo.odporucany !== undefined) udaje.odporucany = telo.odporucany === true;
  if (telo.aktivny !== undefined) udaje.aktivny = telo.aktivny !== false;
  if (telo.poradie !== undefined) udaje.poradie = celeCislo(telo.poradie, 'Poradie') ?? 0;
  if (telo.kategoria_id !== undefined) {
    const id = telo.kategoria_id ? Number(telo.kategoria_id) : null;
    if (id && !(await EshopKategoria.findByPk(id))) throw new ChybaEshopu('Zvolená kategória neexistuje');
    udaje.kategoria_id = id;
  }
  if (udaje.povodna_cena !== undefined && udaje.povodna_cena !== null && udaje.cena !== undefined && udaje.povodna_cena <= udaje.cena) {
    throw new ChybaEshopu('Pôvodná cena musí byť vyššia ako cena (inak ju nechajte prázdnu)');
  }
  return udaje;
};

adminEshopRouter.post('/produkty', async (req: Request, res: Response) => {
  try {
    const udaje = await udajeProduktu(req.body || {});
    const produkt = await EshopProdukt.create({ ...udaje, slug: await volnySlug(EshopProdukt, req.body?.slug || udaje.nazov || '') });
    res.status(201).json({ success: true, data: produkt.toJSON(), message: 'Produkt bol vytvorený' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Produkt sa nepodarilo vytvoriť');
  }
});

adminEshopRouter.put('/produkty/:id', async (req: Request, res: Response) => {
  try {
    const produkt = await EshopProdukt.findByPk(idZCesty(req) ?? 0);
    if (!produkt) {
      res.status(404).json({ success: false, message: 'Produkt sa nenašiel' });
      return;
    }
    const udaje = await udajeProduktu(req.body || {});
    const cena = udaje.cena ?? suma(produkt.cena);
    const povodna = udaje.povodna_cena !== undefined ? udaje.povodna_cena : produkt.povodna_cena === null ? null : suma(produkt.povodna_cena);
    if (povodna !== null && povodna <= cena) throw new ChybaEshopu('Pôvodná cena musí byť vyššia ako cena (inak ju nechajte prázdnu)');
    if (req.body?.slug !== undefined && req.body.slug !== produkt.slug) udaje.slug = await volnySlug(EshopProdukt, req.body.slug || produkt.nazov, produkt.id);
    produkt.set(udaje);
    if (udaje.vlastnosti) produkt.changed('vlastnosti', true);
    if (udaje.obrazky) produkt.changed('obrazky', true);
    await produkt.save();
    res.json({ success: true, data: produkt.toJSON(), message: 'Produkt bol uložený' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Produkt sa nepodarilo uložiť');
  }
});

adminEshopRouter.delete('/produkty/:id', async (req: Request, res: Response) => {
  try {
    const produkt = await EshopProdukt.findByPk(idZCesty(req) ?? 0);
    if (!produkt) {
      res.status(404).json({ success: false, message: 'Produkt sa nenašiel' });
      return;
    }
    // Objednávky si ponechajú názov a cenu, odkaz na produkt sa vymaže
    await produkt.destroy();
    res.json({ success: true, message: 'Produkt bol zmazaný' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Produkt sa nepodarilo zmazať');
  }
});

// ----- Doručenie -----

adminEshopRouter.get('/dorucenia', async (_req: Request, res: Response) => {
  try {
    const dorucenia = await EshopDorucenie.findAll({ order: [['poradie', 'ASC'], ['id', 'ASC']] });
    res.json({ success: true, data: dorucenia.map((d) => d.toJSON()) });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní doručenia');
  }
});

const udajeDorucenia = (telo: any) => {
  const udaje: any = {};
  if (telo.nazov !== undefined) udaje.nazov = textAleboNull(telo.nazov, 100) ?? '';
  if (telo.popis !== undefined) udaje.popis = textAleboNull(telo.popis, 300);
  if (telo.cena !== undefined) udaje.cena = sumaZoVstupu(telo.cena, 'Cena');
  if (telo.zadarmo_od !== undefined) udaje.zadarmo_od = sumaZoVstupu(telo.zadarmo_od, 'Doprava zadarmo od', true);
  if (telo.vyzaduje_adresu !== undefined) udaje.vyzaduje_adresu = telo.vyzaduje_adresu !== false;
  if (telo.aktivny !== undefined) udaje.aktivny = telo.aktivny !== false;
  if (telo.poradie !== undefined) udaje.poradie = celeCislo(telo.poradie, 'Poradie') ?? 0;
  return udaje;
};

adminEshopRouter.post('/dorucenia', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dorucenie = await EshopDorucenie.create(udajeDorucenia(req.body || {}));
    res.status(201).json({ success: true, data: dorucenie.toJSON(), message: 'Spôsob doručenia bol pridaný' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Spôsob doručenia sa nepodarilo pridať');
  }
});

adminEshopRouter.put('/dorucenia/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dorucenie = await EshopDorucenie.findByPk(idZCesty(req) ?? 0);
    if (!dorucenie) {
      res.status(404).json({ success: false, message: 'Spôsob doručenia sa nenašiel' });
      return;
    }
    await dorucenie.update(udajeDorucenia(req.body || {}));
    res.json({ success: true, data: dorucenie.toJSON(), message: 'Spôsob doručenia bol uložený' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Spôsob doručenia sa nepodarilo uložiť');
  }
});

adminEshopRouter.delete('/dorucenia/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dorucenie = await EshopDorucenie.findByPk(idZCesty(req) ?? 0);
    if (!dorucenie) {
      res.status(404).json({ success: false, message: 'Spôsob doručenia sa nenašiel' });
      return;
    }
    // Platby, ktoré boli povolené len pre toto doručenie, ho už nemajú v zozname
    for (const platba of await EshopPlatba.findAll()) {
      if ((platba.dorucenia || []).includes(dorucenie.id)) {
        platba.dorucenia = platba.dorucenia.filter((id) => id !== dorucenie.id);
        platba.changed('dorucenia', true);
        await platba.save();
      }
    }
    await dorucenie.destroy();
    res.json({ success: true, message: 'Spôsob doručenia bol zmazaný' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Spôsob doručenia sa nepodarilo zmazať');
  }
});

// ----- Platby -----

adminEshopRouter.get('/platby', async (_req: Request, res: Response) => {
  try {
    const platby = await EshopPlatba.findAll({ order: [['poradie', 'ASC'], ['id', 'ASC']] });
    res.json({ success: true, data: platby.map((p) => p.toJSON()) });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní platieb');
  }
});

const udajePlatby = async (telo: any) => {
  const udaje: any = {};
  if (telo.nazov !== undefined) udaje.nazov = textAleboNull(telo.nazov, 100) ?? '';
  if (telo.popis !== undefined) udaje.popis = textAleboNull(telo.popis, 300);
  if (telo.typ !== undefined) {
    if (!(TYPY_PLATBY as readonly string[]).includes(telo.typ)) throw new ChybaEshopu('Neplatný typ platby');
    udaje.typ = telo.typ;
  }
  if (telo.poplatok !== undefined) udaje.poplatok = sumaZoVstupu(telo.poplatok, 'Poplatok');
  if (telo.pokyny !== undefined) udaje.pokyny = textAleboNull(telo.pokyny, 2000);
  // Kód brány je zámerne bez úprav - vkladá sa do izolovaného rámca (sandbox)
  if (telo.brana_html !== undefined) udaje.brana_html = String(telo.brana_html ?? '').trim().slice(0, 20000) || null;
  if (telo.dorucenia !== undefined) {
    if (!Array.isArray(telo.dorucenia)) throw new ChybaEshopu('Povolené doručenia musia byť zoznam');
    const ids = [...new Set(telo.dorucenia.map((d: unknown) => Number(d)).filter((d: number) => Number.isInteger(d) && d > 0))] as number[];
    const existujuce = ids.length ? await EshopDorucenie.count({ where: { id: ids } }) : 0;
    if (existujuce !== ids.length) throw new ChybaEshopu('Niektorý zvolený spôsob doručenia neexistuje');
    udaje.dorucenia = ids;
  }
  if (telo.aktivny !== undefined) udaje.aktivny = telo.aktivny !== false;
  if (telo.poradie !== undefined) udaje.poradie = celeCislo(telo.poradie, 'Poradie') ?? 0;
  return udaje;
};

adminEshopRouter.post('/platby', lenSpravca, async (req: Request, res: Response) => {
  try {
    const udaje = await udajePlatby(req.body || {});
    const platba = await EshopPlatba.create({ ...udaje, brana_kluc: udaje.typ === 'brana' ? novyKlucBrany() : null });
    res.status(201).json({ success: true, data: platba.toJSON(), message: 'Spôsob platby bol pridaný' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Spôsob platby sa nepodarilo pridať');
  }
});

adminEshopRouter.put('/platby/:id', lenSpravca, async (req: Request, res: Response) => {
  try {
    const platba = await EshopPlatba.findByPk(idZCesty(req) ?? 0);
    if (!platba) {
      res.status(404).json({ success: false, message: 'Spôsob platby sa nenašiel' });
      return;
    }
    const udaje = await udajePlatby(req.body || {});
    if ((udaje.typ ?? platba.typ) === 'brana' && !platba.brana_kluc) udaje.brana_kluc = novyKlucBrany();
    platba.set(udaje);
    if (udaje.dorucenia) platba.changed('dorucenia', true);
    await platba.save();
    res.json({ success: true, data: platba.toJSON(), message: 'Spôsob platby bol uložený' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Spôsob platby sa nepodarilo uložiť');
  }
});

adminEshopRouter.post('/platby/:id/novy-kluc', lenSpravca, async (req: Request, res: Response) => {
  try {
    const platba = await EshopPlatba.findByPk(idZCesty(req) ?? 0);
    if (!platba) {
      res.status(404).json({ success: false, message: 'Spôsob platby sa nenašiel' });
      return;
    }
    await platba.update({ brana_kluc: novyKlucBrany() });
    res.json({ success: true, data: platba.toJSON(), message: 'Vytvorený nový kľúč - zmeňte ho aj v nastaveniach platobnej brány' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Kľúč sa nepodarilo vytvoriť');
  }
});

adminEshopRouter.delete('/platby/:id', lenSpravca, async (req: Request, res: Response) => {
  try {
    const platba = await EshopPlatba.findByPk(idZCesty(req) ?? 0);
    if (!platba) {
      res.status(404).json({ success: false, message: 'Spôsob platby sa nenašiel' });
      return;
    }
    await platba.destroy();
    res.json({ success: true, message: 'Spôsob platby bol zmazaný' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Spôsob platby sa nepodarilo zmazať');
  }
});

// ----- Nastavenia obchodu -----

adminEshopRouter.get('/nastavenia', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await nastaveniaEshopu() });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní nastavení obchodu');
  }
});

adminEshopRouter.put('/nastavenia', requireAdmin, async (req: Request, res: Response) => {
  try {
    const nastavenia = await ulozNastaveniaEshopu(req.body || {});
    if (nastavenia.zapnuty) {
      // Zapnutý obchod bez doručenia alebo platby by objednávku neprijal
      const [dorucenia, platby] = await Promise.all([
        EshopDorucenie.count({ where: { aktivny: true } }),
        EshopPlatba.count({ where: { aktivny: true } }),
      ]);
      if (!dorucenia || !platby) {
        res.json({ success: true, data: nastavenia, message: 'Uložené, ale obchod nemá aktívny spôsob doručenia alebo platby' });
        return;
      }
    }
    res.json({ success: true, data: nastavenia, message: 'Nastavenia obchodu boli uložené' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Nastavenia obchodu sa nepodarilo uložiť');
  }
});

// ----- Objednávky -----

adminEshopRouter.get('/objednavky', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const strana = Math.max(Number(req.query.page) || 1, 1);
    const kde: WhereOptions<any> = {};
    const podmienky: any = kde;
    if (req.query.stav && (STAVY_OBJEDNAVKY as readonly string[]).includes(String(req.query.stav))) podmienky.stav = String(req.query.stav);
    if (req.query.stav_platby && (STAVY_PLATBY as readonly string[]).includes(String(req.query.stav_platby))) podmienky.stav_platby = String(req.query.stav_platby);
    if (req.query.hladat) {
      const vyraz = `%${String(req.query.hladat).slice(0, 80)}%`;
      podmienky[Op.or] = [{ cislo: { [Op.iLike]: vyraz } }, { meno: { [Op.iLike]: vyraz } }, { email: { [Op.iLike]: vyraz } }];
    }
    const { count, rows } = await EshopObjednavka.findAndCountAll({
      where: kde,
      order: [['vytvorena', 'DESC']],
      limit,
      offset: (strana - 1) * limit,
    });
    const pocty = (await EshopObjednavka.findAll({
      attributes: ['stav', [sequelize.fn('COUNT', sequelize.col('id')), 'pocet']],
      group: ['stav'],
      raw: true,
    })) as unknown as Array<{ stav: string; pocet: string }>;
    const [trzby] = (await sequelize.query(
      `SELECT COALESCE(SUM("spolu"), 0) AS spolu, COUNT(*)::int AS pocet
         FROM "eshop_objednavky" WHERE "stav" <> 'zrusena' AND "vytvorena" >= date_trunc('month', now())`
    )) as any;
    res.json({
      success: true,
      data: rows.map((o) => o.toJSON()),
      pagination: zostavStrankovanie(count, limit, (strana - 1) * limit),
      pocty_stavov: Object.fromEntries(pocty.map((p) => [p.stav, Number(p.pocet)])),
      tento_mesiac: { spolu: suma(trzby[0]?.spolu), pocet: Number(trzby[0]?.pocet || 0) },
    });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní objednávok');
  }
});

adminEshopRouter.get('/objednavky/:id', async (req: Request, res: Response) => {
  try {
    const objednavka = await EshopObjednavka.findByPk(idZCesty(req) ?? 0, {
      include: [{ model: EshopPolozka, as: 'polozky' }],
      order: [[{ model: EshopPolozka, as: 'polozky' }, 'id', 'ASC']],
    });
    if (!objednavka) {
      res.status(404).json({ success: false, message: 'Objednávka sa nenašla' });
      return;
    }
    res.json({ success: true, data: objednavka.toJSON() });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Chyba servera pri načítaní objednávky');
  }
});

adminEshopRouter.put('/objednavky/:id', async (req: Request, res: Response) => {
  try {
    const id = idZCesty(req) ?? 0;
    const telo = req.body || {};
    let zmenaStavu = false;
    const objednavka = await sequelize.transaction(async (t) => {
      const o = await EshopObjednavka.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!o) throw new ChybaEshopu('Objednávka sa nenašla', 404);
      if (telo.stav !== undefined && telo.stav !== o.stav) {
        if (!(STAVY_OBJEDNAVKY as readonly string[]).includes(telo.stav)) throw new ChybaEshopu('Neplatný stav objednávky');
        // Zrušená objednávka už vrátila tovar na sklad - obnovenie by ho nezobralo späť
        if (o.stav === 'zrusena') throw new ChybaEshopu('Zrušenú objednávku nemožno obnoviť - vytvorte novú');
        o.stav = telo.stav;
        zmenaStavu = true;
        if (telo.stav === 'zrusena') await vratNaSklad(o, t);
      }
      if (telo.stav_platby !== undefined && telo.stav_platby !== o.stav_platby) {
        if (!(STAVY_PLATBY as readonly string[]).includes(telo.stav_platby)) throw new ChybaEshopu('Neplatný stav platby');
        o.stav_platby = telo.stav_platby;
        o.uhradena = telo.stav_platby === 'uhradena' ? new Date() : o.uhradena;
      }
      if (telo.poznamka_interna !== undefined) o.poznamka_interna = textAleboNull(telo.poznamka_interna, 2000) ?? null;
      await o.save({ transaction: t });
      return o;
    });
    if (zmenaStavu && telo.upozornit_zakaznika === true) {
      void posliZmenuStavu(objednavka).catch((e) => console.error('E-mail o zmene stavu sa nepodarilo odoslať:', e));
    }
    const plna = await EshopObjednavka.findByPk(objednavka.id, {
      include: [{ model: EshopPolozka, as: 'polozky' }],
      order: [[{ model: EshopPolozka, as: 'polozky' }, 'id', 'ASC']],
    });
    res.json({ success: true, data: plna!.toJSON(), message: 'Objednávka bola uložená' });
  } catch (chyba) {
    odpovedzChybou(res, chyba, 'Objednávku sa nepodarilo uložiť');
  }
});
