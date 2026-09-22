// backend/src/routes/pages.ts
// API routes pre správu stránok (FÁZA 5) - OPRAVENÉ

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Page from '../models/Page';
import { getPublishedPages, getMenuPages, getPageBySlug, getAllPagesForAdmin } from '../models';
import { authenticateToken, requireAdmin, requireEditor } from '../middleware/auth';
import { Op } from 'sequelize';
// Sanitizácia HTML obsahu stránok pred uložením do DB
import { sanitizeContent } from '../utils/sanitize';

const router: Router = Router();

// ===== VEREJNÉ API ENDPOINTS =====

/**
 * GET /api/pages
 * Získanie všetkých publikovaných stránok
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      in_menu, 
      limit = 20, 
      offset = 0 
    } = req.query;

    // Základné podmienky - len publikované
    const whereConditions: any = {
      publikovany: true
    };

    // Vyhľadávanie v názve
    if (search && typeof search === 'string') {
      whereConditions.nazov = {
        [Op.iLike]: `%${search.trim()}%`
      };
    }

    // Filter podľa toho, či je v menu
    if (in_menu !== undefined) {
      whereConditions.v_menu = in_menu === 'true';
    }

    const pages = await Page.findAndCountAll({
      where: whereConditions,
      attributes: ['id', 'nazov', 'slug', 'v_menu', 'poradie_menu', 'meta_title', 'meta_description', 'vytvoreny', 'aktualizovany'],
      order: [
        ['v_menu', 'DESC'], // Najprv stránky v menu
        ['poradie_menu', 'ASC'],
        ['nazov', 'ASC']
      ],
      limit: Math.min(parseInt(limit as string) || 20, 100),
      offset: parseInt(offset as string) || 0
    });

    res.json({
      success: true,
      data: {
        pages: pages.rows.map(page => page.toJSON()),
        pagination: {
          total: pages.count,
          limit: parseInt(limit as string) || 20,
          offset: parseInt(offset as string) || 0,
          has_more: pages.count > (parseInt(offset as string) || 0) + pages.rows.length
        }
      }
    });

  } catch (error) {
    console.error('Chyba pri načítavaní stránok:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri načítavaní stránok'
    });
  }
});

/**
 * GET /api/pages/menu
 * Získanie stránok pre hlavné menu
 */
router.get('/menu', async (req: Request, res: Response) => {
  try {
    const menuPages = await getMenuPages();

    res.json({
      success: true,
      data: {
        pages: menuPages.map(page => ({
          id: page.id,
          nazov: page.nazov,
          slug: page.slug,
          url: page.getUrl(),
          poradie_menu: page.poradie_menu
        }))
      }
    });

  } catch (error) {
    console.error('Chyba pri načítavaní menu stránok:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri načítavaní menu'
    });
  }
});

/**
 * GET /api/pages/:slug
 * Získanie konkrétnej stránky podľa slug
 */
router.get('/:slug', [
  param('slug').isString().isLength({ min: 1, max: 100 }).matches(/^[a-z0-9-]+$/)
], async (req: Request, res: Response) => {
  try {
    // Validácia vstupov
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Neplatný slug',
        errors: errors.array()
      });
    }

    const { slug } = req.params;
    const page = await getPageBySlug(slug);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Stránka nebola nájdená'
      });
    }

    res.json({
      success: true,
      data: {
        page: page.toJSON()
      }
    });

  } catch (error) {
    console.error('Chyba pri načítavaní stránky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri načítavaní stránky'
    });
  }
});

// ===== ADMIN API ENDPOINTS =====

// Admin router s autentifikáciou
export const adminPageRouter: Router = Router();

/**
 * GET /api/admin/pages
 * Získanie všetkých stránok pre admin (vrátane nepublikovaných)
 */
adminPageRouter.get('/', [
  authenticateToken,
  requireEditor
], async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      status, 
      in_menu,
      limit = 20, 
      offset = 0,
      sort_by = 'vytvoreny',
      sort_order = 'DESC'
    } = req.query;

    // Podmienky vyhľadávania
    const whereConditions: any = {};

    if (search && typeof search === 'string') {
      whereConditions[Op.or] = [
        { nazov: { [Op.iLike]: `%${search.trim()}%` } },
        { obsah: { [Op.iLike]: `%${search.trim()}%` } }
      ];
    }

    if (status !== undefined) {
      whereConditions.publikovany = status === 'published';
    }

    if (in_menu !== undefined) {
      whereConditions.v_menu = in_menu === 'true';
    }

    // Validácia sort parametrov
    const allowedSortFields = ['vytvoreny', 'aktualizovany', 'nazov', 'poradie_menu'];
    const sortField = allowedSortFields.includes(sort_by as string) ? sort_by as string : 'vytvoreny';
    const sortDirection = sort_order === 'ASC' ? 'ASC' : 'DESC';

    const pages = await Page.findAndCountAll({
      where: whereConditions,
      order: [[sortField, sortDirection]],
      limit: Math.min(parseInt(limit as string) || 20, 100),
      offset: parseInt(offset as string) || 0
    });

    res.json({
      success: true,
      data: {
        pages: pages.rows.map(page => page.toJSON()),
        pagination: {
          total: pages.count,
          limit: parseInt(limit as string) || 20,
          offset: parseInt(offset as string) || 0,
          has_more: pages.count > (parseInt(offset as string) || 0) + pages.rows.length
        },
        filters: {
          search: search || '',
          status: status || 'all',
          in_menu: in_menu || 'all',
          sort_by: sortField,
          sort_order: sortDirection
        }
      }
    });

  } catch (error) {
    console.error('Chyba pri načítavaní admin stránok:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri načítavaní stránok'
    });
  }
});

/**
 * GET /api/admin/pages/:id
 * Získanie konkrétnej stránky pre úpravu
 */
adminPageRouter.get('/:id', [
  authenticateToken,
  requireEditor,
  param('id').isInt({ min: 1 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID stránky',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const page = await Page.findByPk(parseInt(id));

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Stránka nebola nájdená'
      });
    }

    res.json({
      success: true,
      data: {
        page: page.toJSON()
      }
    });

  } catch (error) {
    console.error('Chyba pri načítavaní stránky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri načítavaní stránky'
    });
  }
});

// ===== CUSTOM SLUG VALIDATION MIDDLEWARE =====
// Vytvoríme vlastný validator pre slug, ktorý bude správne spracovávať prázdne hodnoty

const slugValidator = (value: string, { req }: any) => {
  // Ak je slug prázdny alebo undefined, nevalidujeme ho (automaticky sa vygeneruje)
  if (!value || value.trim() === '') {
    return true;
  }
  
  // Ak je slug zadaný, musí spĺňať podmienky
  if (value.length < 2 || value.length > 100) {
    throw new Error('Slug musí mať 2-100 znakov');
  }
  
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new Error('Slug môže obsahovať len malé písmená, číslice a pomlčky');
  }
  
  return true;
};

/**
 * POST /api/admin/pages
 * Vytvorenie novej stránky
 */
adminPageRouter.post('/', [
  authenticateToken,
  requireEditor,
  body('nazov').isString().isLength({ min: 2, max: 200 }).trim()
    .withMessage('Názov musí mať 2-200 znakov'),
  body('obsah').isString().isLength({ min: 10, max: 100000 }).trim()
    .withMessage('Obsah musí mať 10-100000 znakov'),
  // ✅ OPRAVENÉ: Slug validácia - správne spracovanie prázdnych hodnôt
  body('slug')
    .optional({ nullable: true, checkFalsy: true }) // Akceptuje null, undefined, prázdny string
    .custom(slugValidator),
  body('v_menu').optional().isBoolean()
    .withMessage('V menu musí byť boolean'),
  body('poradie_menu').optional().isInt({ min: 1, max: 9999 })
    .withMessage('Poradie menu musí byť číslo 1-9999'),
  body('publikovany').optional().isBoolean()
    .withMessage('Publikovany musí byť boolean'),
  body('meta_title').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 100 }).trim()
    .withMessage('Meta title môže mať max 100 znakov'),
  body('meta_description').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 300 }).trim()
    .withMessage('Meta description môže mať max 300 znakov')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Chybné vstupné údaje',
        errors: errors.array()
      });
    }

    const {
      nazov,
      obsah,
      slug,
      v_menu = false,
      poradie_menu,
      publikovany = false,
      meta_title,
      meta_description
    } = req.body;

    // ✅ OPRAVENÉ: Automatické generovanie unikátneho slug s číselným suffixom
    const finalSlug = (slug && slug.trim()) 
      ? slug.trim() 
      : await Page.generateUniqueSlugFromTitle(nazov);

    // ✅ ZJEDNODUŠENÉ: Ak je slug zadaný manuálne, skontroluj len jedinečnosť
    if (slug && slug.trim()) {
      const isUniqueSlug = await Page.validateUniqueSlug(finalSlug);
      if (!isUniqueSlug) {
        return res.status(400).json({
          success: false,
          message: `Slug "${finalSlug}" už existuje. Použite iný slug alebo nechajte pole prázdne pre automatické generovanie.`
        });
      }
    }
    // Ak nie je slug zadaný, generateUniqueSlugFromTitle už zabezpečí jedinečnosť

    // Získanie automatického poradia ak je stránka v menu a nie je zadané
    const finalPoradieMenu = v_menu && !poradie_menu 
      ? await Page.getNextMenuOrder() 
      : poradie_menu || 10;

    const newPage = await Page.create({
      nazov,
      obsah: sanitizeContent(obsah), // sanitizácia proti XSS
      slug: finalSlug,
      v_menu,
      poradie_menu: finalPoradieMenu,
      publikovany,
      meta_title: meta_title || null,
      meta_description: meta_description || null
    });

    res.status(201).json({
      success: true,
      message: 'Stránka bola úspešne vytvorená',
      data: {
        page: newPage.toJSON()
      }
    });

  } catch (error) {
    console.error('Chyba pri vytváraní stránky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vytváraní stránky'
    });
  }
});

/**
 * PUT /api/admin/pages/:id
 * Úprava existujúcej stránky
 */
adminPageRouter.put('/:id', [
  authenticateToken,
  requireEditor,
  param('id').isInt({ min: 1 }),
  body('nazov').isString().isLength({ min: 2, max: 200 }).trim()
    .withMessage('Názov musí mať 2-200 znakov'),
  body('obsah').isString().isLength({ min: 10, max: 100000 }).trim()
    .withMessage('Obsah musí mať 10-100000 znakov'),
  // ✅ OPRAVENÉ: Slug validácia pre update
  body('slug')
    .optional({ nullable: true, checkFalsy: true })
    .custom(slugValidator),
  body('v_menu').optional().isBoolean()
    .withMessage('V menu musí byť boolean'),
  body('poradie_menu').optional().isInt({ min: 1, max: 9999 })
    .withMessage('Poradie menu musí byť číslo 1-9999'),
  body('publikovany').optional().isBoolean()
    .withMessage('Publikovany musí byť boolean'),
  body('meta_title').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 100 }).trim()
    .withMessage('Meta title môže mať max 100 znakov'),
  body('meta_description').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 300 }).trim()
    .withMessage('Meta description môže mať max 300 znakov')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Chybné vstupné údaje',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const page = await Page.findByPk(parseInt(id));

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Stránka nebola nájdená'
      });
    }

    const {
      nazov,
      obsah,
      slug,
      v_menu,
      poradie_menu,
      publikovany,
      meta_title,
      meta_description
    } = req.body;

    // ✅ OPRAVENÉ: Spracovanie slug pre update s automatickým číslovaním
    let finalSlug = page.slug; // Ponechaj pôvodný slug
    
    if (slug !== undefined) {
      if (slug && slug.trim()) {
        // Ak je zadaný nový slug, skontroluj jedinečnosť
        finalSlug = slug.trim();
        if (finalSlug !== page.slug) {
          const isUniqueSlug = await Page.validateUniqueSlug(finalSlug, page.id);
          if (!isUniqueSlug) {
            return res.status(400).json({
              success: false,
              message: `Slug "${finalSlug}" už existuje. Použite iný slug.`
            });
          }
        }
      } else {
        // Ak je slug vyčistený (nastavený na prázdny), vygeneruj nový z názvu
        finalSlug = await Page.generateUniqueSlugFromTitle(nazov, page.id);
      }
    }

    // Aktualizácia
    await page.update({
      nazov,
      obsah: sanitizeContent(obsah), // sanitizácia proti XSS
      slug: finalSlug,
      v_menu: v_menu !== undefined ? v_menu : page.v_menu,
      poradie_menu: poradie_menu !== undefined ? poradie_menu : page.poradie_menu,
      publikovany: publikovany !== undefined ? publikovany : page.publikovany,
      meta_title: meta_title !== undefined ? meta_title : page.meta_title,
      meta_description: meta_description !== undefined ? meta_description : page.meta_description
    });

    res.json({
      success: true,
      message: 'Stránka bola úspešne aktualizovaná',
      data: {
        page: page.toJSON()
      }
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii stránky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri aktualizácii stránky'
    });
  }
});

/**
 * DELETE /api/admin/pages/:id
 * Vymazanie stránky
 */
adminPageRouter.delete('/:id', [
  authenticateToken,
  requireAdmin, // Len admin môže mazať stránky
  param('id').isInt({ min: 1 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID stránky',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const page = await Page.findByPk(parseInt(id));

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Stránka nebola nájdená'
      });
    }

    await page.destroy();

    res.json({
      success: true,
      message: 'Stránka bola úspešne vymazaná'
    });

  } catch (error) {
    console.error('Chyba pri mazaní stránky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri mazaní stránky'
    });
  }
});

/**
 * PATCH /api/admin/pages/:id/toggle-menu
 * Zapnutie/vypnutie stránky v menu
 */
adminPageRouter.patch('/:id/toggle-menu', [
  authenticateToken,
  requireEditor,
  param('id').isInt({ min: 1 }),
  // Hodnota je VOLITEĽNÁ. Endpoint sa volá toggle, takže bez nej sa stav
  // jednoducho preklopí. Pôvodne bola povinná, takže "prepni" bez tela
  // skončilo na 400 - názov endpointu sľuboval niečo iné, než robil.
  // Kto pošle konkrétnu hodnotu, nastaví ju natvrdo (to funguje ďalej).
  body('v_menu').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const page = await Page.findByPk(parseInt(id));
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Stránka nebola nájdená'
      });
    }

    // Bez zadanej hodnoty preklopíme aktuálny stav
    const v_menu = req.body?.v_menu === undefined ? !page.v_menu : Boolean(req.body.v_menu);

    // Ak pridávame do menu a nemá poradie, nastav automatické
    let poradie_menu = page.poradie_menu;
    if (v_menu && !page.v_menu) {
      poradie_menu = await Page.getNextMenuOrder();
    }

    await page.update({
      v_menu,
      poradie_menu
    });

    res.json({
      success: true,
      message: v_menu ? 'Stránka bola pridaná do menu' : 'Stránka bola odstránená z menu',
      data: {
        page: page.toJSON()
      }
    });

  } catch (error) {
    console.error('Chyba pri zmene menu stránky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri zmene menu'
    });
  }
});

/**
 * PATCH /api/admin/pages/:id/toggle-publish
 * Zapnutie/vypnutie publikovania stránky
 */
adminPageRouter.patch('/:id/toggle-publish', [
  authenticateToken,
  requireEditor,
  param('id').isInt({ min: 1 }),
  // Voliteľné z rovnakého dôvodu ako pri toggle-menu
  body('publikovany').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const page = await Page.findByPk(parseInt(id));
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Stránka nebola nájdená'
      });
    }

    // Bez zadanej hodnoty preklopíme aktuálny stav
    const publikovany =
      req.body?.publikovany === undefined ? !page.publikovany : Boolean(req.body.publikovany);

    await page.update({ publikovany });

    res.json({
      success: true,
      message: publikovany ? 'Stránka bola publikovaná' : 'Stránka bola zmenená na koncept',
      data: {
        page: page.toJSON()
      }
    });

  } catch (error) {
    console.error('Chyba pri zmene publikovania stránky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri zmene publikovania'
    });
  }
});

export default router;