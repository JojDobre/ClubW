// backend/src/controllers/categoryController.ts
// Controller pre správu rubrík (kategórií) - OPRAVENÝ

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import Category from '../models/Category';
import Article from '../models/Article';

// Validácia pre vytvorenie/úpravu kategórie
export const validateCategory = [
  body('nazov')
    .isLength({ min: 2, max: 100 })
    .withMessage('Názov musí mať 2-100 znakov')
    .trim(),
  body('popis')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Popis môže mať maximálne 500 znakov')
    .trim(),
  body('farba')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Farba musí byť v hex formáte (#RRGGBB)'),
  body('ikona')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Ikona môže mať maximálne 50 znakov'),
  body('poradie')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Poradie musí byť nezáporné číslo'),
];

// GET /api/categories - Zoznam kategórií (verejné API)
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.findAll({
      where: { aktivity: true },
      order: [['poradie', 'ASC'], ['nazov', 'ASC']],
      attributes: ['id', 'nazov', 'slug', 'popis', 'farba', 'ikona', 'poradie'],
    });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error('Chyba pri získavaní kategórií:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní kategórií',
    });
  }
};

// GET /api/admin/categories - Zoznam kategórií pre admin (s neaktívnymi)
export const getAdminCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string || '';
    const active = req.query.active as string || '';

    const whereConditions: any = {};

    // Vyhľadávanie v názve
    if (search) {
      whereConditions[Op.or] = [
        { nazov: { [Op.iLike]: `%${search}%` } },
        { popis: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filtrovanie podľa aktivity
    if (active !== '') {
      whereConditions.aktivity = active === 'true';
    }

    const categories = await Category.findAll({
      where: whereConditions,
      order: [['poradie', 'ASC'], ['nazov', 'ASC']],
    });

    // Získanie počtu článkov pre každú kategóriu osobne
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const articlesCount = await Article.count({
          where: { kategoria_id: category.id }
        });
        
        return {
          ...category.toSafeJSON(),
          pocet_clankov: articlesCount,
        };
      })
    );

    res.json({
      success: true,
      data: { categories: categoriesWithCounts },
    });
  } catch (error) {
    console.error('Chyba pri získavaní admin kategórií:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní kategórií',
    });
  }
};

// GET /api/categories/:slug - Detail kategórie
export const getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      where: { slug, aktivity: true },
      attributes: ['id', 'nazov', 'slug', 'popis', 'farba', 'ikona'],
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategória nebola nájdená',
      });
      return;
    }

    res.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    console.error('Chyba pri získavaní kategórie:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní kategórie',
    });
  }
};

// GET /api/admin/categories/:id - Detail kategórie pre admin
export const getAdminCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategória nebola nájdená',
      });
      return;
    }

    res.json({
      success: true,
      data: { category: category.toSafeJSON() },
    });
  } catch (error) {
    console.error('Chyba pri získavaní kategórie:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri získavaní kategórie',
    });
  }
};

// POST /api/admin/categories - Vytvorenie novej kategórie
export const createCategory = async (req: Request, res: Response): Promise<void> => {
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

    const { nazov, popis, farba, ikona, poradie } = req.body;

    console.log('Vytváram kategóriu s údajmi:', { nazov, popis, farba, ikona, poradie });

    // Kontrola duplicitného názvu
    const existingCategory = await Category.findOne({
      where: { nazov: nazov.trim() },
    });

    if (existingCategory) {
      res.status(400).json({
        success: false,
        message: 'Kategória s týmto názvom už existuje',
      });
      return;
    }

    // Automatické nastavenie poradia ak nie je zadané
    let finalPoradie = poradie;
    if (finalPoradie === undefined || finalPoradie === null) {
      const maxPoradie = await Category.max('poradie') as number;
      finalPoradie = (maxPoradie || 0) + 1;
    }

    // KĽÚČOVÁ OPRAVA: Vygenerujeme slug EXPLICITNE pred vytvorením
    const generatedSlug = Category.generateSlug(nazov.trim());
    console.log('Vygenerovaný slug pred vytvorením:', generatedSlug);

    // Vytvorenie kategórie s explicitne nastaveným slug
    const newCategory = await Category.create({
      nazov: nazov.trim(),
      slug: generatedSlug, // EXPLICITNE nastavujeme slug
      popis: popis?.trim() || null,
      farba: farba || null,
      ikona: ikona?.trim() || null,
      poradie: finalPoradie,
      aktivity: true,
    });

    console.log('Kategória úspešne vytvorená:', newCategory.toSafeJSON());

    res.status(201).json({
      success: true,
      message: 'Kategória úspešne vytvorená',
      data: { category: newCategory.toSafeJSON() },
    });
  } catch (error) {
    console.error('Chyba pri vytváraní kategórie:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vytváraní kategórie',
    });
  }
};

// PUT /api/admin/categories/:id - Úprava kategórie
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
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
    const updateData = req.body;

    // Nájdenie kategórie
    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategória nebola nájdená',
      });
      return;
    }

    // Kontrola duplicitného názvu (okrem seba)
    if (updateData.nazov) {
      const existingCategory = await Category.findOne({
        where: { 
          nazov: updateData.nazov.trim(),
          id: { [Op.ne]: id }
        },
      });

      if (existingCategory) {
        res.status(400).json({
          success: false,
          message: 'Kategória s týmto názvom už existuje',
        });
        return;
      }

      updateData.nazov = updateData.nazov.trim();
      
      // OPRAVA: Ak sa mení názov, vygeneruj nový slug
      if (updateData.nazov !== category.nazov) {
        updateData.slug = Category.generateSlug(updateData.nazov);
        console.log('Nový slug pre aktualizáciu:', updateData.slug);
      }
    }

    // Čistenie prázdnych stringov
    if (updateData.popis === '') updateData.popis = null;
    if (updateData.farba === '') updateData.farba = null;
    if (updateData.ikona === '') updateData.ikona = null;

    // Aktualizácia kategórie
    await category.update(updateData);

    res.json({
      success: true,
      message: 'Kategória úspešne aktualizovaná',
      data: { category: category.toSafeJSON() },
    });
  } catch (error) {
    console.error('Chyba pri aktualizácii kategórie:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri aktualizácii kategórie',
    });
  }
};

// DELETE /api/admin/categories/:id - Vymazanie kategórie
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Nájdenie kategórie
    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategória nebola nájdená',
      });
      return;
    }

    // Kontrola či kategória nemá články
    const articlesCount = await Article.count({
      where: { kategoria_id: id },
    });

    if (articlesCount > 0) {
      res.status(400).json({
        success: false,
        message: `Nemožno vymazať kategóriu, ktorá obsahuje ${articlesCount} článkov. Najprv presuňte alebo vymažte články.`,
      });
      return;
    }

    // Vymazanie kategórie
    await category.destroy();

    res.json({
      success: true,
      message: 'Kategória úspešne vymazaná',
    });
  } catch (error) {
    console.error('Chyba pri vymazávaní kategórie:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri vymazávaní kategórie',
    });
  }
};

// PATCH /api/admin/categories/:id/toggle-status - Prepnutie aktivity kategórie
export const toggleCategoryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Nájdenie kategórie
    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategória nebola nájdená',
      });
      return;
    }

    // Prepnutie aktivity
    await category.update({ aktivity: !category.aktivity });

    res.json({
      success: true,
      message: `Kategória ${category.aktivity ? 'aktivovaná' : 'deaktivovaná'}`,
      data: { category: category.toSafeJSON() },
    });
  } catch (error) {
    console.error('Chyba pri prepínaní stavu kategórie:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri prepínaní stavu kategórie',
    });
  }
};

// PATCH /api/admin/categories/reorder - Zmena poradia kategórií
export const reorderCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categories } = req.body; // Array of {id, poradie}

    if (!Array.isArray(categories)) {
      res.status(400).json({
        success: false,
        message: 'Neplatné dáta pre zmenu poradia',
      });
      return;
    }

    // Aktualizácia poradia pre každú kategóriu
    const updatePromises = categories.map(({ id, poradie }) =>
      Category.update({ poradie }, { where: { id } })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Poradie kategórií úspešne zmenené',
    });
  } catch (error) {
    console.error('Chyba pri zmene poradia kategórií:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba pri zmene poradia kategórií',
    });
  }
};



// POST /api/admin/categories/bulk-delete - Bulk vymazanie kategórií
export const bulkDeleteCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné ID kategórií - musí byť neprázdne pole',
      });
      return;
    }

    // Nájdenie kategórií a kontrola článkov
    const categories = await Category.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    if (categories.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Žiadne kategórie neboli nájdené',
      });
      return;
    }

    // Kontrola, či kategórie nemajú články
    const categoriesWithArticles = [];
    for (const category of categories) {
      const articlesCount = await Article.count({
        where: { kategoria_id: category.id }
      });
      
      if (articlesCount > 0) {
        categoriesWithArticles.push({
          id: category.id,
          nazov: category.nazov,
          pocetClankov: articlesCount
        });
      }
    }

    if (categoriesWithArticles.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Niektoré kategórie obsahujú články a nemožno ich vymazať',
        data: {
          categoriesWithArticles
        }
      });
      return;
    }

    // Vymazanie kategórií
    const deletedCount = await Category.destroy({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    res.json({
      success: true,
      message: `Úspešne vymazaných ${deletedCount} kategórií`,
      data: {
        deletedCount,
        deletedCategories: categories.map(c => ({ id: c.id, nazov: c.nazov }))
      }
    });

  } catch (error) {
    console.error('Chyba pri bulk delete kategórií:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní kategórií',
    });
  }
};

// POST /api/admin/categories/bulk-duplicate - Bulk duplikovanie kategórií
export const bulkDuplicateCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné ID kategórií - musí byť neprázdne pole',
      });
      return;
    }

    // Nájdenie pôvodných kategórií
    const originalCategories = await Category.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    if (originalCategories.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Žiadne kategórie neboli nájdené',
      });
      return;
    }

    // Vytvorenie duplikátov
    const duplicatedCategories = [];
    
    for (const category of originalCategories) {
      const duplicateName = `${category.nazov} (kópia)`;
      const duplicateSlug = Category.generateSlug(duplicateName);
      
      const duplicate = await Category.create({
        nazov: duplicateName,
        slug: duplicateSlug,
        popis: category.popis,
        farba: category.farba,
        ikona: category.ikona,
        poradie: category.poradie + 1000, // Posun poradie
        aktivity: false, // Duplikáty sú defaultne neaktívne
      });
      
      duplicatedCategories.push(duplicate.toSafeJSON());
    }

    res.json({
      success: true,
      message: `Úspešne duplikovaných ${duplicatedCategories.length} kategórií`,
      data: {
        duplicatedCount: duplicatedCategories.length,
        duplicatedCategories
      }
    });

  } catch (error) {
    console.error('Chyba pri bulk duplicate kategórií:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri duplikovaní kategórií',
    });
  }
};