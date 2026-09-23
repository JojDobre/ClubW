// backend/src/controllers/userController.ts
// Controller pre správu používateľov (CRUD operácie)

import { Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { Op } from 'sequelize';
import User from '../models/user';
import Rola from '../models/Rola';
// Kontrola sily hesla - nahrádza pôvodnú podmienku "aspoň 6 znakov"
import { overSiluHesla } from '../utils/heslo';
import { zostavStrankovanie } from '../utils/odpoved';

type PevnaRola = 'admin' | 'redaktor' | 'trener' | 'uzivatel';
const PEVNE_ROLY: PevnaRola[] = ['admin', 'redaktor', 'trener', 'uzivatel'];

/**
 * Určí rolu používateľa: záznam z tabuľky rolí a k nemu pevnú rolu.
 *
 * Pevná rola (enum) zostáva kvôli spätnej kompatibilite. Pri systémovej
 * role je to jej kód, pri vlastnej sa odvodí z oprávnení - rozhoduje
 * však vždy tabuľka rolí (middleware requireRole).
 */
const urciRolu = async (
  rolaId: unknown,
  kod: unknown
): Promise<{ rola?: Rola; pevna?: PevnaRola; chyba?: string }> => {
  let rola: Rola | null = null;
  if (rolaId !== undefined && rolaId !== null && rolaId !== '') {
    rola = await Rola.findOne({ where: { id: Number(rolaId), aktivity: true } });
    if (!rola) return { chyba: `Rola s ID ${rolaId} neexistuje` };
  } else if (kod) {
    rola = await Rola.findOne({ where: { kod: String(kod), aktivity: true } });
  }
  if (!rola) {
    return PEVNE_ROLY.includes(kod as PevnaRola) ? { pevna: kod as PevnaRola } : {};
  }
  if (PEVNE_ROLY.includes(rola.kod as PevnaRola)) return { rola, pevna: rola.kod as PevnaRola };
  const prava = Object.values(rola.opravnenia || {});
  // Vlastná rola dostane najviac pevnú rolu tréner - sekcie mimo modulov
  // (fanúšikovia, ankety, GDPR) tak ostanú len správcovi a redaktorovi
  const pevna: PevnaRola = prava.some((p: any) => p?.citat) ? 'trener' : 'uzivatel';
  return { rola, pevna };
};

/** Je používateľ (alebo nová rola) správca? */
const jeSpravca = (pevna?: string | null) => pevna === 'admin';

/**
 * Zostane v systéme aspoň jeden aktívny správca, ak sa tento
 * používateľ zmení/zmaže? Bez neho by sa klub zamkol mimo nastavení.
 */
const zostaneSpravca = async (okremId: number): Promise<boolean> =>
  (await User.count({ where: { rola: 'admin', aktivity: true, id: { [Op.ne]: okremId } } })) > 0;

// Validácia pre vytvorenie používateľa
export const validateCreateUser = [
  body('meno')
    .isLength({ min: 2, max: 100 })
    .withMessage('Meno musí mať 2-100 znakov')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Neplatný email formát')
    .normalizeEmail(),
  // Silu hesla overuje overSiluHesla() - kontroluje dĺžku, bežné slová
  // aj to, či heslo neobsahuje meno alebo e-mail používateľa
  body('heslo').custom((hodnota, { req }) => {
    const chyby = overSiluHesla(hodnota, { meno: req.body?.meno, email: req.body?.email });
    if (chyby.length > 0) {
      throw new Error(chyby.join(' '));
    }
    return true;
  }),
  body('priezvisko')
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage('Priezvisko môže mať najviac 100 znakov')
    .trim(),
  body('rola')
    .optional({ values: 'null' })
    .isIn(['admin', 'redaktor', 'trener', 'uzivatel'])
    .withMessage('Neplatná rola'),
  body('rola_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Rola musí byť platné ID'),
  body('tim_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('Tim_id musí byť kladné číslo'),
];

// Validácia pre úpravu používateľa
export const validateUpdateUser = [
  body('meno')
    .optional({ values: 'null' })
    .isLength({ min: 2, max: 100 })
    .withMessage('Meno musí mať 2-100 znakov')
    .trim(),
  body('email')
    .optional({ values: 'null' })
    .isEmail()
    .withMessage('Neplatný email formát')
    .normalizeEmail(),
  body('heslo')
    .optional({ values: 'null' })
    .custom((hodnota, { req }) => {
      const chyby = overSiluHesla(hodnota, { meno: req.body?.meno, email: req.body?.email });
      if (chyby.length > 0) {
        throw new Error(chyby.join(' '));
      }
      return true;
    }),
  body('priezvisko')
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage('Priezvisko môže mať najviac 100 znakov')
    .trim(),
  body('rola')
    .optional({ values: 'null' })
    .isIn(['admin', 'redaktor', 'trener', 'uzivatel'])
    .withMessage('Neplatná rola'),
  body('rola_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Rola musí byť platné ID'),
  body('tim_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('Tim_id musí byť kladné číslo'),
  body('aktivity')
    .optional({ values: 'null' })
    .isBoolean()
    .withMessage('Aktivity musí byť boolean'),
];

// GET /api/users - Získanie zoznamu používateľov
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Query parametre pre filtrovanie a pagináciu
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';
    const active = req.query.active as string || '';

    const offset = (page - 1) * limit;

    // Podmienky pre filtrovanie
    const whereConditions: any = {};

    // Vyhľadávanie v mene a emaile
    if (search) {
      whereConditions[Op.or] = [
        { meno: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filtrovanie podľa role
    if (role) {
      whereConditions.rola = role;
    }

    // Filtrovanie podľa aktivity
    if (active !== '') {
      whereConditions.aktivity = active === 'true';
    }

    // Získanie používateľov s pagináciou
    const { count, rows: users } = await User.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['vytvoreny', 'DESC']],
      attributes: { exclude: ['heslo'] }, // Bez hesla v odpovedi
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: users.map(user => user.toSafeJSON()),
      pagination: zostavStrankovanie(count, limit, offset),
    });
  } catch (error) {
    console.error('Chyba pri získavaní používateľov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní používateľov',
    });
  }
};

// GET /api/users/:id - Získanie konkrétneho používateľa
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['heslo'] },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Používateľ nebol nájdený',
      });
      return;
    }

    res.json({
      success: true,
      data: user.toSafeJSON(),
    });
  } catch (error) {
    console.error('Chyba pri získavaní používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní používateľa',
    });
  }
};

// POST /api/users - Vytvorenie nového používateľa
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validácia vstupných údajov
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: String(errors.array()[0]?.msg || 'Chybné vstupné údaje'),
        errors: errors.array(),
      });
      return;
    }

    const { meno, email, heslo, rola, tim_id } = req.body;

    // Kontrola či email už existuje
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Používateľ s týmto emailom už existuje',
      });
      return;
    }

    // Vytvorenie nového používateľa
    // Rola z tabuľky rolí má prednosť. Keď ju klient neposlal, doplníme
    // ju podľa pôvodného enumu, aby mal používateľ vždy platné práva.
    const urcena = await urciRolu(req.body.rola_id, rola || 'uzivatel');
    if (urcena.chyba) {
      res.status(400).json({ success: false, message: urcena.chyba });
      return;
    }
    const rolaId = urcena.rola?.id ?? null;
    const kodRoly = urcena.pevna ?? 'uzivatel';

    // Správcu smie vytvoriť len správca
    if (jeSpravca(kodRoly) && req.user?.rola !== 'admin') {
      res.status(403).json({ success: false, message: 'Rolu Správca smie prideliť len správca' });
      return;
    }

    const newUser = await User.create({
      meno,
      priezvisko: req.body.priezvisko ? String(req.body.priezvisko).trim() : null,
      email: email.toLowerCase(),
      heslo,
      rola: kodRoly,
      rola_id: rolaId,
      tim_id: tim_id || null,
      aktivity: true,
    });

    res.status(201).json({
      success: true,
      message: 'Používateľ úspešne vytvorený',
      data: newUser.toSafeJSON(),
    });
  } catch (error) {
    console.error('Chyba pri vytváraní používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vytváraní používateľa',
    });
  }
};

// PUT /api/users/:id - Úprava používateľa
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validácia vstupných údajov
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: String(errors.array()[0]?.msg || 'Chybné vstupné údaje'),
        errors: errors.array(),
      });
      return;
    }

    const { id } = req.params;

    // Nájdenie používateľa
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Používateľ nebol nájdený',
      });
      return;
    }

    // Len povolené polia - predtým sa ukladalo celé telo požiadavky
    const POLIA = ['meno', 'priezvisko', 'email', 'heslo', 'tim_id', 'aktivity'];
    const updateData: Record<string, any> = {};
    for (const pole of POLIA) {
      if (req.body[pole] !== undefined) updateData[pole] = req.body[pole];
    }
    if (updateData.heslo === '' || updateData.heslo === null) delete updateData.heslo;
    if (updateData.priezvisko !== undefined) {
      updateData.priezvisko = updateData.priezvisko ? String(updateData.priezvisko).trim() : null;
    }

    const upravujeSpravcu = jeSpravca(user.rola);
    if (upravujeSpravcu && req.user?.rola !== 'admin') {
      res.status(403).json({ success: false, message: 'Účet správcu smie upravovať len správca' });
      return;
    }

    if (req.body.rola_id !== undefined || req.body.rola !== undefined) {
      const urcena = await urciRolu(req.body.rola_id, req.body.rola);
      if (urcena.chyba) {
        res.status(400).json({ success: false, message: urcena.chyba });
        return;
      }
      if (jeSpravca(urcena.pevna) && req.user?.rola !== 'admin') {
        res.status(403).json({ success: false, message: 'Rolu Správca smie prideliť len správca' });
        return;
      }
      if (urcena.pevna) updateData.rola = urcena.pevna;
      updateData.rola_id = urcena.rola?.id ?? null;
    }

    // Posledného aktívneho správcu nejde zosadiť ani vypnúť
    const prestaneBytSpravcom =
      upravujeSpravcu && ((updateData.rola && updateData.rola !== 'admin') || updateData.aktivity === false);
    if (prestaneBytSpravcom && !(await zostaneSpravca(user.id))) {
      res.status(400).json({ success: false, message: 'Klub musí mať aspoň jedného aktívneho správcu' });
      return;
    }
    if (prestaneBytSpravcom && Number(id) === req.userId) {
      res.status(400).json({ success: false, message: 'Sám sebe nemôžete odobrať rolu správcu' });
      return;
    }

    // Kontrola či sa nemení email na už existujúci
    if (updateData.email) {
      const existingUser = await User.findOne({
        where: { 
          email: updateData.email.toLowerCase(),
          id: { [Op.ne]: id }
        },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Používateľ s týmto emailom už existuje',
        });
        return;
      }

      updateData.email = updateData.email.toLowerCase();
    }

    // Aktualizácia používateľa
    await user.update(updateData);

    res.json({
      success: true,
      message: 'Používateľ úspešne aktualizovaný',
      data: user.toSafeJSON(),
    });
  } catch (error) {
    console.error('Chyba pri aktualizácii používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri aktualizácii používateľa',
    });
  }
};

// DELETE /api/users/:id - Vymazanie používateľa
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Kontrola či sa používateľ nepokúša vymazať sám seba
    if (req.userId && parseInt(id) === req.userId) {
      res.status(400).json({
        success: false,
        message: 'Nemôžete vymazať svoj vlastný účet',
      });
      return;
    }

    // Nájdenie používateľa
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Používateľ nebol nájdený',
      });
      return;
    }

    // Vymazanie používateľa
    if (jeSpravca(user.rola) && req.user?.rola !== 'admin') {
      res.status(403).json({ success: false, message: 'Účet správcu smie meniť len správca' });
      return;
    }
    if (jeSpravca(user.rola) && user.aktivity && !(await zostaneSpravca(user.id))) {
      res.status(400).json({ success: false, message: 'Klub musí mať aspoň jedného aktívneho správcu' });
      return;
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'Používateľ úspešne vymazaný',
    });
  } catch (error) {
    console.error('Chyba pri vymazávaní používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vymazávaní používateľa',
    });
  }
};

// PATCH /api/users/:id/toggle-status - Prepnutie aktivity používateľa
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Kontrola či sa používateľ nepokúša deaktivovať sám seba
    if (req.userId && parseInt(id) === req.userId) {
      res.status(400).json({
        success: false,
        message: 'Nemôžete deaktivovať svoj vlastný účet',
      });
      return;
    }

    // Nájdenie používateľa
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Používateľ nebol nájdený',
      });
      return;
    }

    if (jeSpravca(user.rola) && req.user?.rola !== 'admin') {
      res.status(403).json({ success: false, message: 'Účet správcu smie meniť len správca' });
      return;
    }
    if (jeSpravca(user.rola) && user.aktivity && !(await zostaneSpravca(user.id))) {
      res.status(400).json({ success: false, message: 'Klub musí mať aspoň jedného aktívneho správcu' });
      return;
    }

    // Prepnutie aktivity
    await user.update({ aktivity: !user.aktivity });

    res.json({
      success: true,
      message: `Používateľ ${user.aktivity ? 'aktivovaný' : 'deaktivovaný'}`,
      data: user.toSafeJSON(),
    });
  } catch (error) {
    console.error('Chyba pri prepínaní stavu používateľa:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri prepínaní stavu používateľa',
    });
  }
};


// POST /api/users/bulk-delete - Bulk vymazanie používateľov
export const bulkDeleteUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné ID používateľov - musí byť neprázdne pole',
      });
      return;
    }

    // Kontrola, že sa používateľ nepokúša vymazať sám seba
    if (req.userId && ids.includes(req.userId.toString())) {
      res.status(400).json({
        success: false,
        message: 'Nemôžete vymazať svoj vlastný účet',
      });
      return;
    }

    // Nájdenie používateľov, ktorí existujú
    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      },
      attributes: ['id', 'meno', 'email', 'rola', 'aktivity']
    });

    // Správcov smie mazať len správca a aspoň jeden aktívny musí zostať
    const spravcovia = users.filter((u) => u.rola === 'admin');
    if (spravcovia.length > 0 && req.user?.rola !== 'admin') {
      res.status(403).json({ success: false, message: 'Účty správcov smie mazať len správca' });
      return;
    }
    if (spravcovia.length > 0) {
      const ostatni = await User.count({ where: { rola: 'admin', aktivity: true, id: { [Op.notIn]: ids } } });
      if (ostatni === 0) {
        res.status(400).json({ success: false, message: 'Klub musí mať aspoň jedného aktívneho správcu' });
        return;
      }
    }

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Žiadni používatelia neboli nájdení',
      });
      return;
    }

    // Vymazanie používateľov
    const deletedCount = await User.destroy({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    res.json({
      success: true,
      message: `Úspešne vymazaných ${deletedCount} používateľov`,
      data: {
        deletedCount,
        deletedUsers: users.map(u => ({ id: u.id, meno: u.meno, email: u.email }))
      }
    });

  } catch (error) {
    console.error('Chyba pri bulk delete používateľov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní používateľov',
    });
  }
};

// POST /api/users/bulk-duplicate - Bulk duplikovanie používateľov
export const bulkDuplicateUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné ID používateľov - musí byť neprázdne pole',
      });
      return;
    }

    // Nájdenie pôvodných používateľov
    const originalUsers = await User.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    if (originalUsers.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Žiadni používatelia neboli nájdení',
      });
      return;
    }

    // Vytvorenie duplikátov
    const duplicatedUsers = [];
    const timestamp = Date.now();
    
    for (const user of originalUsers) {
      const duplicate = await User.create({
        meno: `${user.meno} (kópia)`,
        email: `copy_${timestamp}_${user.email}`,
        heslo: user.heslo, // Zachová hash hesla
        rola: user.rola,
        tim_id: user.tim_id,
        aktivity: false, // Duplikáty sú defaultne neaktívne
      });
      
      duplicatedUsers.push(duplicate.toSafeJSON());
    }

    res.json({
      success: true,
      message: `Úspešne duplikovaných ${duplicatedUsers.length} používateľov`,
      data: {
        duplicatedCount: duplicatedUsers.length,
        duplicatedUsers
      }
    });

  } catch (error) {
    console.error('Chyba pri bulk duplicate používateľov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri duplikovaní používateľov',
    });
  }
};