// backend/src/controllers/articleController.ts
// Controller pre správu článkov - OPRAVENÝ

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import Article from '../models/Article';
import Category from '../models/Category';
import User from '../models/user';
import Team from '../models/Team';
import Media from '../models/Media';
import { ulozMedium } from '../utils/mediaUlozisko';
import fs from 'fs/promises';
// Sanitizácia HTML obsahu pred uložením do DB - ochrana pred stored XSS
import { sanitizeContent, sanitizePlainText } from '../utils/sanitize';
import path from 'path';
import { zostavStrankovanie } from '../utils/odpoved';

// Validácia pre VYTVORENIE článku - povinné polia musia prísť.
export const validateArticle = [
  body('nazov')
    .isLength({ min: 5, max: 200 })
    .withMessage('Názov musí mať 5-200 znakov')
    .trim(),
  body('obsah')
    .isLength({ min: 10, max: 50000 })
    .withMessage('Obsah musí mať 10-50000 znakov'),
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Excerpt môže mať maximálne 500 znakov')
    .trim(),
  body('kategoria_id')
    .isInt({ min: 1 })
    .withMessage('Kategória je povinná'),
  body('tim_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Tím musí byť platné ID'),
  body('status')
    .isIn(['draft', 'published', 'scheduled', 'archived'])
    .withMessage('Neplatný status článku'),
  body('publikovany_datum')
    .optional()
    .isISO8601()
    .withMessage('Neplatný dátum publikovania'),
  body('meta_title')
    .optional()
    .isLength({ max: 70 })
    .withMessage('Meta title môže mať maximálne 70 znakov'),
  body('meta_description')
    .optional()
    .isLength({ max: 160 })
    .withMessage('Meta description môže mať maximálne 160 znakov'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tagy musia byť pole'),
];

/**
 * Validácia pre ÚPRAVU článku.
 *
 * PREČO SAMOSTATNE: úprava a vytvorenie zdieľali jeden validator, v ktorom
 * boli nazov, obsah, kategoria_id aj status povinné. Znamenalo to, že sa
 * nedal zmeniť samotný názov - požiadavka bez statusu skončila na
 * „Neplatný status článku", hoci status nemal s úpravou nič spoločné.
 *
 * Tu je voliteľné všetko. Pravidlá pre hodnoty zostávajú rovnaké: keď
 * pole príde, musí byť platné; keď nepríde, jednoducho sa nemení.
 */
export const validateArticleUpdate = [
  body('nazov')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Názov musí mať 5-200 znakov')
    .trim(),
  body('obsah')
    .optional()
    .isLength({ min: 10, max: 50000 })
    .withMessage('Obsah musí mať 10-50000 znakov'),
  body('excerpt')
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage('Excerpt môže mať maximálne 500 znakov')
    .trim(),
  body('kategoria_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Kategória musí byť platné ID'),
  body('tim_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Tím musí byť platné ID'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'scheduled', 'archived'])
    .withMessage('Neplatný status článku'),
  body('publikovany_datum')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Neplatný dátum publikovania'),
  body('meta_title')
    .optional({ nullable: true })
    .isLength({ max: 70 })
    .withMessage('Meta title môže mať maximálne 70 znakov'),
  body('meta_description')
    .optional({ nullable: true })
    .isLength({ max: 160 })
    .withMessage('Meta description môže mať maximálne 160 znakov'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tagy musia byť pole'),
];

// === VEREJNÉ API ===

// GET /api/articles - Zoznam publikovaných článkov
export const getPublicArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string || '';
    const featured = req.query.featured as string || '';
    const search = req.query.search as string || '';

    const offset = (page - 1) * limit;

    const whereConditions: any = {
      status: 'published',
      [Op.or]: [
        { publikovany_datum: null },
        { publikovany_datum: { [Op.lte]: new Date() } }
      ]
    };

    // Filtrovanie podľa kategórie
    if (category) {
      const categoryRecord = await Category.findOne({ where: { slug: category } });
      if (categoryRecord) {
        whereConditions.kategoria_id = categoryRecord.id;
      }
    }

    // Filtrovanie featured článkov
    if (featured === 'true') {
      whereConditions.featured = true;
    }

    // Vyhľadávanie v názve a excerpts
    if (search) {
      whereConditions[Op.and] = [
        {
          [Op.or]: [
            { nazov: { [Op.iLike]: `%${search}%` } },
            { excerpt: { [Op.iLike]: `%${search}%` } },
          ]
        }
      ];
    }

    const { count, rows: articles } = await Article.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['publikovany_datum', 'DESC'], ['vytvoreny', 'DESC']],
      include: [
        {
          model: User,
          as: 'autor',
          attributes: ['id', 'meno'],
        },
        {
          model: Category,
          as: 'kategoria',
          attributes: ['id', 'nazov', 'slug', 'farba', 'ikona'],
        },
      ],
      attributes: [
        'id', 'nazov', 'slug', 'excerpt', 'obrazok', 
        'publikovany_datum', 'views', 'featured', 'vytvoreny'
      ],
    });

    const totalPages = Math.ceil(count / limit);

    // Formátovanie výsledkov pre frontend
    const formattedArticles = articles.map(article => ({
      id: article.id,
      nazov: article.nazov,
      slug: article.slug,
      excerpt: article.excerpt,
      obrazok: article.obrazok,
      publikovany_datum: article.publikovany_datum,
      views: article.views,
      featured: article.featured,
      autor: (article as any).autor,
      kategoria: (article as any).kategoria,
      tags: article.getTagsArray(),
      vytvoreny: article.vytvoreny,
    }));

    res.json({
      success: true,
      data: formattedArticles,
      pagination: zostavStrankovanie(count, limit, offset),
    });
  } catch (error) {
    console.error('Chyba pri získavaní článkov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní článkov',
    });
  }
};

// GET /api/articles/:slug - Detail článku
export const getPublicArticleBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const article = await Article.findOne({
      where: { 
        slug,
        status: 'published',
        [Op.or]: [
          { publikovany_datum: null },
          { publikovany_datum: { [Op.lte]: new Date() } }
        ]
      },
      include: [
        {
          model: User,
          as: 'autor',
          attributes: ['id', 'meno'],
        },
        {
          model: Category,
          as: 'kategoria',
          attributes: ['id', 'nazov', 'slug', 'farba', 'ikona'],
        },
      ],
    });

    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Článok nebol nájdený',
      });
      return;
    }

    // Zvýšenie počtu zobrazení
    await article.incrementViews();
    await article.reload();

    // Formátovanie pre frontend
    const formattedArticle = {
      id: article.id,
      nazov: article.nazov,
      slug: article.slug,
      obsah: article.obsah,
      excerpt: article.excerpt,
      obrazok: article.obrazok,
      publikovany_datum: article.publikovany_datum,
      views: article.views, 
      
      autor: (article as any).autor,
      kategoria: (article as any).kategoria,
      tags: article.getTagsArray(),
      komentare_povolene: article.komentare_povolene,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      vytvoreny: article.vytvoreny,
    };

    res.json({
      success: true,
      data: formattedArticle,
    });
  } catch (error) {
    console.error('Chyba pri získavaní článku:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní článku',
    });
  }
};

// === ADMIN API ===

// GET /api/admin/articles - Zoznam všetkých článkov pre admin
export const getAdminArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string || '';
    const category = req.query.category as string || '';
    const author = req.query.author as string || '';
    const search = req.query.search as string || '';

    const offset = (page - 1) * limit;
    const whereConditions: any = {};

    // Filtrovanie podľa statusu
    if (status) {
      whereConditions.status = status;
    }

    // Filtrovanie podľa kategórie
    if (category) {
      whereConditions.kategoria_id = parseInt(category);
    }

    // Filtrovanie podľa autora
    if (author) {
      whereConditions.autor_id = parseInt(author);
    }

    // Vyhľadávanie
    if (search) {
      whereConditions[Op.or] = [
        { nazov: { [Op.iLike]: `%${search}%` } },
        { obsah: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: articles } = await Article.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['vytvoreny', 'DESC']],
      include: [
        {
          model: User,
          as: 'autor',
          attributes: ['id', 'meno', 'email'],
        },
        {
          model: Category,
          as: 'kategoria',
          attributes: ['id', 'nazov', 'slug'],
        },
      ],
    });

    const totalPages = Math.ceil(count / limit);

    // Formátovanie pre admin panel
    const formattedArticles = articles.map(article => ({
      ...article.toAdminJSON(),
      autor: (article as any).autor,
      kategoria: (article as any).kategoria,
    }));

    res.json({
      success: true,
      data: formattedArticles,
      pagination: zostavStrankovanie(count, limit, offset),
    });
  } catch (error) {
    console.error('Chyba pri získavaní admin článkov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní článkov',
    });
  }
};

// GET /api/admin/articles/:id - Detail článku pre admin
export const getAdminArticleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'autor',
          attributes: ['id', 'meno', 'email'],
        },
        {
          model: Category,
          as: 'kategoria',
          attributes: ['id', 'nazov', 'slug'],
        },
      ],
    });

    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Článok nebol nájdený',
      });
      return;
    }

    const formattedArticle = {
      ...article.toAdminJSON(),
      autor: (article as any).autor,
      kategoria: (article as any).kategoria,
    };

    res.json({
      success: true,
      data: formattedArticle,
    });
  } catch (error) {
    console.error('Chyba pri získavaní článku:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní článku',
    });
  }
};

// POST /api/admin/articles - Vytvorenie nového článku
export const createArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validácia vstupných údajov
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Chybné vstupné údaje',
        errors: errors.array(),
      });
      return;
    }

    const {
      nazov, obsah, excerpt, obrazok, kategoria_id, tim_id,
      status, publikovany_datum, meta_title, meta_description,
      tags, featured, komentare_povolene, slug
    } = req.body;

    console.log('Vytváram článok s údajmi:', { nazov, slug, obsah: obsah.substring(0, 50) + '...', kategoria_id });

    // Kontrola existencie kategórie
    const category = await Category.findByPk(kategoria_id);
    if (!category) {
      res.status(400).json({
        success: false,
        message: 'Kategória neexistuje',
      });
      return;
    }

    // Tím je voliteľný, ale keď príde, musí existovať
    if (tim_id) {
      const tim = await Team.findByPk(tim_id);
      if (!tim) {
        res.status(400).json({
          success: false,
          message: `Tím s ID ${tim_id} neexistuje`,
        });
        return;
      }
    }

    // KĽÚČOVÁ OPRAVA: Vygenerujeme slug EXPLICITNE pred vytvorením
    const generatedSlug = slug && slug.trim() ? slug.trim() : Article.generateSlug(nazov.trim());
    console.log('Vygenerovaný slug pred vytvorením:', generatedSlug);

    // Kontrola duplicitného slug
    const existingArticle = await Article.findOne({
      where: { slug: generatedSlug },
    });

    if (existingArticle) {
      res.status(400).json({
        success: false,
        message: 'Článok s týmto slug už existuje',
      });
      return;
    }

    // Vytvorenie článku s explicitne nastaveným slug
    const newArticle = await Article.create({
      nazov: nazov.trim(),
      slug: generatedSlug, // EXPLICITNE nastavujeme slug
      // Obsah prechádza sanitizáciou - odstráni <script>, on* handlery a javascript: odkazy
      obsah: sanitizeContent(obsah),
      excerpt: excerpt ? sanitizePlainText(excerpt) : null,
      obrazok: obrazok || null,
      autor_id: req.userId!, // Z auth middleware
      kategoria_id,
      tim_id: tim_id || null,
      status,
      publikovany_datum: publikovany_datum ? new Date(publikovany_datum) : null,
      meta_title: meta_title?.trim() || null,
      meta_description: meta_description?.trim() || null,
      featured: featured || false,
      komentare_povolene: komentare_povolene !== false,
    });

    // Nastavenie tagov
    if (tags && Array.isArray(tags)) {
      newArticle.setTagsArray(tags);
      await newArticle.save();
    }

    console.log('Článok úspešne vytvorený:', newArticle.toAdminJSON());

    // Načítanie článku s vzťahmi
    const articleWithRelations = await Article.findByPk(newArticle.id, {
      include: [
        {
          model: User,
          as: 'autor',
          attributes: ['id', 'meno', 'email'],
        },
        {
          model: Category,
          as: 'kategoria',
          attributes: ['id', 'nazov', 'slug'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Článok úspešne vytvorený',
      data: {
        ...articleWithRelations!.toAdminJSON(),
        autor: (articleWithRelations as any).autor,
        kategoria: (articleWithRelations as any).kategoria,
      },
    });
  } catch (error) {
    console.error('Chyba pri vytváraní článku:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vytváraní článku',
    });
  }
};

// PUT /api/admin/articles/:id - Úprava článku
export const updateArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validácia vstupných údajov
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Chybné vstupné údaje',
        errors: errors.array(),
      });
      return;
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Sanitizácia HTML obsahu pri aktualizácii - rovnaká ochrana ako pri vytváraní
    if (updateData.obsah !== undefined) {
      updateData.obsah = sanitizeContent(updateData.obsah);
    }
    if (updateData.excerpt !== undefined && updateData.excerpt) {
      updateData.excerpt = sanitizePlainText(updateData.excerpt);
    }

    // Nájdenie článku
    const article = await Article.findByPk(id);
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Článok nebol nájdený',
      });
      return;
    }

    // Kontrola oprávnení - len autor alebo admin môže upravovať
    if (article.autor_id !== req.userId && req.user?.rola !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Nemáte oprávnenie upravovať tento článok',
      });
      return;
    }

    // Kontrola kategórie ak sa mení
    if (updateData.kategoria_id) {
      const category = await Category.findByPk(updateData.kategoria_id);
      if (!category) {
        res.status(400).json({
          success: false,
          message: 'Kategória neexistuje',
        });
        return;
      }
    }

    // Tím je voliteľný, ale keď príde, musí existovať
    if (updateData.tim_id) {
      const tim = await Team.findByPk(updateData.tim_id);
      if (!tim) {
        res.status(400).json({
          success: false,
          message: `Tím s ID ${updateData.tim_id} neexistuje`,
        });
        return;
      }
    }

    // Kontrola duplicitného slug ak sa mení
    if (updateData.slug && updateData.slug !== article.slug) {
      const existingArticle = await Article.findOne({
        where: { 
          slug: updateData.slug,
          id: { [Op.ne]: id }
        },
      });

      if (existingArticle) {
        res.status(400).json({
          success: false,
          message: 'Článok s týmto slug už existuje',
        });
        return;
      }
    }

    // OPRAVA: Ak sa mení názov, vygeneruj nový slug (ak sa explicitne nenastaví)
    if (updateData.nazov && updateData.nazov !== article.nazov && !updateData.slug) {
      updateData.slug = Article.generateSlug(updateData.nazov);
      console.log('Nový slug pre aktualizáciu:', updateData.slug);
    }

    // Spracovanie tagov
    if (updateData.tags && Array.isArray(updateData.tags)) {
      article.setTagsArray(updateData.tags);
      delete updateData.tags; // Odstránime z updateData
    }

    // Čistenie prázdnych hodnôt
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    // Aktualizácia článku
    await article.update(updateData);

    // Načítanie aktualizovaného článku s vzťahmi
    const updatedArticle = await Article.findByPk(id, {
      include: [
        {
          model: User,
          as: 'autor',
          attributes: ['id', 'meno', 'email'],
        },
        {
          model: Category,
          as: 'kategoria',
          attributes: ['id', 'nazov', 'slug'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Článok úspešne aktualizovaný',
      data: {
        ...updatedArticle!.toAdminJSON(),
        autor: (updatedArticle as any).autor,
        kategoria: (updatedArticle as any).kategoria,
      },
    });
  } catch (error) {
    console.error('Chyba pri aktualizácii článku:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri aktualizácii článku',
    });
  }
};

// DELETE /api/admin/articles/:id - Vymazanie článku
export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Článok nebol nájdený',
      });
      return;
    }

    // Kontrola oprávnení - len autor alebo admin môže vymazať
    if (article.autor_id !== req.userId && req.user?.rola !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Nemáte oprávnenie vymazať tento článok',
      });
      return;
    }

    await article.destroy();

    res.json({
      success: true,
      message: 'Článok úspešne vymazaný',
    });
  } catch (error) {
    console.error('Chyba pri vymazávaní článku:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vymazávaní článku',
    });
  }
};

// Pridaj túto funkciu na koniec súboru:
export const uploadArticleImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const subory = (req.files as Express.Multer.File[]) || [];
    const subor = subory[0];

    if (!subor) {
      res.status(400).json({
        success: false,
        message: 'Žiadny súbor nebol nahraný'
      });
      return;
    }

    // Uloženie ide cez media knižnicu: /uploads/media/<rok>/<mesiac>/,
    // obsah sa overí a obrázok sa pre-enkóduje. Zároveň vznikne záznam,
    // takže sa obrázok dá neskôr nájsť a znovu použiť.
    const ulozeny = await ulozMedium(subor.buffer, subor.originalname);

    const medium = await Media.create({
      nazov: subor.originalname.replace(/\.[^.]+$/, '').slice(0, 200),
      originalny_nazov: subor.originalname.slice(0, 255),
      cesta: ulozeny.cesta,
      typ: ulozeny.typ,
      mime_typ: ulozeny.mimeTyp,
      velkost: ulozeny.velkost,
      sirka: ulozeny.sirka,
      vyska: ulozeny.vyska,
      autor_id: req.userId ?? null,
    });

    res.json({
      success: true,
      data: {
        // "filename" ponechávame kvôli existujúcemu frontendu, ktorý ho číta
        filename: medium.cesta,
        cesta: medium.cesta,
        media_id: medium.id,
        originalName: subor.originalname,
        size: medium.velkost,
      },
      message: 'Obrázok bol úspešne nahraný'
    });

  } catch (error: any) {
    console.error('Chyba pri uploade obrázka článku:', error);
    res.status(400).json({
      success: false,
      message: error?.message || 'Chyba pri uploade obrázka'
    });
  }
};

/**
 * GET /api/admin/articles/:id/preview
 *
 * Náhľad článku v tvare, v akom ho vykresľuje verejný web - ale BEZ
 * ohľadu na stav. Koncept aj naplánovaný článok sa tak dajú pozrieť
 * skôr, než ich niekto zverejní.
 *
 * PREČO SAMOSTATNÝ ENDPOINT: verejný detail (GET /api/articles/:slug)
 * zámerne vracia len publikované články, takže koncept cezeň pozrieť
 * nejde. Admin detail zasa vracia iný tvar (toAdminJSON), na ktorom
 * verejná šablóna nebeží. Tento endpoint dáva verejný tvar pod
 * prihlásením, takže frontend môže na náhľad použiť rovnakú šablónu
 * ako na ostrý článok.
 *
 * Pohľad sa NEPOČÍTA do zobrazení - náhľad nie je návšteva.
 */
export const previewArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, {
      include: [
        { model: User, as: 'autor', attributes: ['id', 'meno', 'email'] },
        { model: Category, as: 'kategoria', attributes: ['id', 'nazov', 'slug', 'farba'] },
      ],
    });

    if (!article) {
      res.status(404).json({
        success: false,
        message: 'Článok nebol nájdený',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        article: {
          id: article.id,
          nazov: article.nazov,
          slug: article.slug,
          obsah: article.obsah,
          excerpt: article.excerpt,
          obrazok: article.obrazok,
          publikovany_datum: article.publikovany_datum,
          views: article.views,
          autor: (article as any).autor,
          kategoria: (article as any).kategoria,
          tim_id: article.tim_id,
          tags: article.getTagsArray(),
          featured: article.featured,
          komentare_povolene: article.komentare_povolene,
          meta_title: article.meta_title,
          meta_description: article.meta_description,
          vytvoreny: article.vytvoreny,
        },
        // Frontend podľa toho môže zobraziť pruh "toto je náhľad,
        // článok ešte nie je zverejnený"
        nahlad: {
          status: article.status,
          publikovany: article.status === 'published',
          planovane_na: article.status === 'scheduled' ? article.publikovany_datum : null,
        },
      },
    });
  } catch (error) {
    console.error('Chyba pri náhľade článku:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri načítaní náhľadu',
    });
  }
};

// POST /api/admin/articles/bulk-delete - Bulk vymazanie článkov
export const bulkDeleteArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné ID článkov - musí byť neprázdne pole',
      });
      return;
    }

    // Nájdenie článkov
    const articles = await Article.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      },
      attributes: ['id', 'nazov', 'autor_id']
    });

    if (articles.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Žiadne články neboli nájdené',
      });
      return;
    }

    // Kontrola oprávnení - len admin alebo autor môže mazať
    if (req.user?.rola !== 'admin') {
      const unauthorizedArticles = articles.filter(article => 
        article.autor_id !== req.userId
      );
      
      if (unauthorizedArticles.length > 0) {
        res.status(403).json({
          success: false,
          message: 'Nemáte oprávnenie vymazať niektoré články',
          errors: unauthorizedArticles.map(a => ({ id: a.id, nazov: a.nazov }))
        });
        return;
      }
    }

    // Vymazanie článkov
    const deletedCount = await Article.destroy({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    res.json({
      success: true,
      message: `Úspešne vymazaných ${deletedCount} článkov`,
      data: {
        deletedCount,
        deletedArticles: articles.map(a => ({ id: a.id, nazov: a.nazov }))
      }
    });

  } catch (error) {
    console.error('Chyba pri bulk delete článkov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní článkov',
    });
  }
};

// POST /api/admin/articles/bulk-duplicate - Bulk duplikovanie článkov
export const bulkDuplicateArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné ID článkov - musí byť neprázdne pole',
      });
      return;
    }

    // Nájdenie pôvodných článkov
    const originalArticles = await Article.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    if (originalArticles.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Žiadne články neboli nájdené',
      });
      return;
    }

    // Kontrola oprávnení - len admin alebo autor môže duplikovať
    if (req.user?.rola !== 'admin') {
      const unauthorizedArticles = originalArticles.filter(article => 
        article.autor_id !== req.userId
      );
      
      if (unauthorizedArticles.length > 0) {
        res.status(403).json({
          success: false,
          message: 'Nemáte oprávnenie duplikovať niektoré články',
        });
        return;
      }
    }

    // Helper funkcia pre generovanie unikátneho názvu
    const generateUniqueName = async (originalName: string): Promise<string> => {
      let counter = 1;
      let duplicateName = `${originalName} (kópia)`;
      
      // Kontrolujeme, či už existuje
      while (await Article.findOne({ where: { nazov: duplicateName } })) {
        counter++;
        duplicateName = `${originalName} (kópia ${counter})`;
      }
      
      return duplicateName;
    };

    // Vytvorenie duplikátov
    const duplicatedArticles = [];
    const timestamp = Date.now();
    
    for (const article of originalArticles) {
      const duplicateTitle = await generateUniqueName(article.nazov);
      const duplicateSlug = Article.generateSlug(`${duplicateTitle}-${timestamp}`);
      
      const duplicate = await Article.create({
        nazov: duplicateTitle,
        slug: duplicateSlug,
        obsah: article.obsah,
        excerpt: article.excerpt,              
        obrazok: article.obrazok,              
        autor_id: req.userId!,                 
        kategoria_id: article.kategoria_id,
        tags: article.tags,                    
        status: 'draft',                       // OPRAVA: Duplikáty sú vždy draft
        featured: false,                       // OPRAVA: Duplikáty nie sú featured
        komentare_povolene: article.komentare_povolene,
        meta_title: article.meta_title,        
        meta_description: article.meta_description, 
      });
      
      duplicatedArticles.push(duplicate.toAdminJSON());
    }

    res.json({
      success: true,
      message: `Úspešne duplikovaných ${duplicatedArticles.length} článkov`,
      data: {
        duplicatedCount: duplicatedArticles.length,
        duplicatedArticles
      }
    });

  } catch (error) {
    console.error('Chyba pri bulk duplicate článkov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri duplikovaní článkov',
    });
  }
};