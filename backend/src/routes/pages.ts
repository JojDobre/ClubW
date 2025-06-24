// backend/src/routes/pages.ts
// API routes pre správu stránok (FÁZA 5)

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Page from '../models/Page';
import { getPublishedPages, getMenuPages, getPageBySlug, getAllPagesForAdmin } from '../models';
import { authenticateToken, requireAdmin, requireEditor } from '../middleware/auth';
import { Op } from 'sequelize';

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

/**
 * POST /api/admin/pages
 * Vytvorenie novej stránky
 */
adminPageRouter.post('/', [
  authenticateToken,
  requireEditor,
  body('nazov').isString().isLength({ min: 2, max: 200 }).trim(),
  body('obsah').isString().isLength({ min: 10, max: 100000 }).trim(),
  body('slug').optional().isString().isLength({ min: 2, max: 100 }).matches(/^[a-z0-9-]+$/),
  body('v_menu').optional().isBoolean(),
  body('poradie_menu').optional().isInt({ min: 1, max: 9999 }),
  body('publikovany').optional().isBoolean(),
  body('meta_title').optional().isString().isLength({ max: 100 }).trim(),
  body('meta_description').optional().isString().isLength({ max: 300 }).trim()
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

    // Automatické generovanie slug ak nie je zadaný
    const finalSlug = slug || Page.generateSlug(nazov);

    // Kontrola jedinečnosti slug
    const isUniqueSlug = await Page.validateUniqueSlug(finalSlug);
    if (!isUniqueSlug) {
      return res.status(400).json({
        success: false,
        message: `Slug "${finalSlug}" už existuje. Použite iný slug alebo zmeňte názov.`
      });
    }

    // Získanie automatického poradia ak je stránka v menu a nie je zadané
    const finalPoradieMenu = v_menu && !poradie_menu 
      ? await Page.getNextMenuOrder() 
      : poradie_menu || 10;

    const newPage = await Page.create({
      nazov,
      obsah,
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
  body('nazov').isString().isLength({ min: 2, max: 200 }).trim(),
  body('obsah').isString().isLength({ min: 10, max: 100000 }).trim(),
  body('slug').optional().isString().isLength({ min: 2, max: 100 }).matches(/^[a-z0-9-]+$/),
  body('v_menu').optional().isBoolean(),
  body('poradie_menu').optional().isInt({ min: 1, max: 9999 }),
  body('publikovany').optional().isBoolean(),
  body('meta_title').optional().isString().isLength({ max: 100 }).trim(),
  body('meta_description').optional().isString().isLength({ max: 300 }).trim()
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

    // Ak sa mení slug, skontroluj jedinečnosť
    if (slug && slug !== page.slug) {
      const isUniqueSlug = await Page.validateUniqueSlug(slug, page.id);
      if (!isUniqueSlug) {
        return res.status(400).json({
          success: false,
          message: `Slug "${slug}" už existuje. Použite iný slug.`
        });
      }
    }

    // Aktualizácia
    await page.update({
      nazov,
      obsah,
      slug: slug || page.slug,
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
  body('v_menu').isBoolean()
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
    const { v_menu } = req.body;

    const page = await Page.findByPk(parseInt(id));
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Stránka nebola nájdená'
      });
    }

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
      message: v_menu ? 'Stránka pridaná do menu' : 'Stránka odstránená z menu',
      data: {
        page: page.toJSON()
      }
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii menu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri aktualizácii menu'
    });
  }
});

/**
 * PATCH /api/admin/pages/:id/toggle-publish
 * Publikovanie/skrytie stránky
 */
adminPageRouter.patch('/:id/toggle-publish', [
  authenticateToken,
  requireEditor,
  param('id').isInt({ min: 1 }),
  body('publikovany').isBoolean()
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
    const { publikovany } = req.body;

    const page = await Page.findByPk(parseInt(id));
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Stránka nebola nájdená'
      });
    }

    await page.update({ publikovany });

    res.json({
      success: true,
      message: publikovany ? 'Stránka publikovaná' : 'Stránka skrytá',
      data: {
        page: page.toJSON()
      }
    });

  } catch (error) {
    console.error('Chyba pri publikovaní stránky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri publikovaní stránky'
    });
  }
});

/**
 * PATCH /api/admin/pages/reorder
 * Zmena poradia stránok v menu
 */
adminPageRouter.patch('/reorder', [
  authenticateToken,
  requireEditor,
  body('pages').isArray().withMessage('Pages musí byť pole'),
  body('pages.*.id').isInt({ min: 1 }).withMessage('Každá stránka musí mať platné ID'),
  body('pages.*.poradie_menu').isInt({ min: 1, max: 9999 }).withMessage('Poradie musí byť medzi 1-9999')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné údaje pre zmenu poradia',
        errors: errors.array()
      });
    }

    const { pages } = req.body;

    // Aktualizujeme poradie pre každú stránku
    const updatePromises = pages.map(async (pageData: any) => {
      const page = await Page.findByPk(pageData.id);
      if (page) {
        await page.update({ poradie_menu: pageData.poradie_menu });
      }
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Poradie stránok bolo úspešne aktualizované'
    });

  } catch (error) {
    console.error('Chyba pri zmene poradia:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri zmene poradia stránok'
    });
  }
});

// Export hlavného routera
export default router;