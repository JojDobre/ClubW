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
  // nullable: formulár posiela prázdne pole ako null a .optional() bez
  // nullable preskočí len undefined - null by prešiel do validátora
  body('popis')
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage('Popis môže mať maximálne 500 znakov')
    .trim(),
  body('farba')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Farba musí byť v hex formáte (#RRGGBB)'),
  body('ikona')
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage('Ikona môže mať maximálne 50 znakov'),
  body('poradie')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('Poradie musí byť nezáporné číslo'),
];

/**
 * Vytvorí adresu rubriky, ktorá ešte neexistuje.
 *
 * PREČO: rôzne názvy môžu dať rovnakú adresu („Mládež" aj „Mladez" dajú
 * "mladez") a stĺpec slug je unikátny - server potom spadol na 500.
 * Názov zložený len zo znakov, ktoré sa do adresy nedostanú („!!!"),
 * dal prázdnu adresu a tiež 500. Pridáme číslo alebo náhradný základ.
 */
const unikatnaAdresa = async (nazov: string, okremId?: number): Promise<string> => {
  const zaklad = Category.generateSlug(nazov) || 'rubrika';
  let kandidat = zaklad;
  let cislo = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const kde: any = { slug: kandidat };
    if (okremId) kde.id = { [Op.ne]: okremId };
    const existuje = await Category.findOne({ where: kde, attributes: ['id'] });
    if (!existuje) return kandidat;
    kandidat = `${zaklad}-${cislo++}`;
  }
};

/** Názov už používa iná rubrika? Bez ohľadu na veľké a malé písmená. */
const nazovJeObsadeny = async (nazov: string, okremId?: number): Promise<boolean> => {
  const kde: any = { nazov: { [Op.iLike]: nazov } };
  if (okremId) kde.id = { [Op.ne]: okremId };
  return Boolean(await Category.findOne({ where: kde, attributes: ['id'] }));
};

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
      data: categories,
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
      data: categoriesWithCounts,
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
      data: category,
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
      data: category.toSafeJSON(),
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

    // Kontrola duplicitného názvu
    if (await nazovJeObsadeny(nazov.trim())) {
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

    const generatedSlug = await unikatnaAdresa(nazov.trim());

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

    res.status(201).json({
      success: true,
      message: 'Kategória úspešne vytvorená',
      data: newCategory.toSafeJSON(),
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

    // Nájdenie kategórie
    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategória nebola nájdená',
      });
      return;
    }

    // Len polia, ktoré formulár naozaj mení. Predtým sa do update posielalo
    // celé telo požiadavky, takže sa dala nastaviť napr. aktivity: false -
    // rubrika potom zmizla z webu a v administrácii ju nebolo ako vrátiť.
    const updateData: Record<string, unknown> = {};
    const { nazov, popis, farba, ikona, poradie } = req.body;

    if (nazov !== undefined) {
      const novyNazov = String(nazov).trim();

      if (await nazovJeObsadeny(novyNazov, category.id)) {
        res.status(400).json({
          success: false,
          message: 'Kategória s týmto názvom už existuje',
        });
        return;
      }

      updateData.nazov = novyNazov;

      // Pri zmene názvu sa mení aj adresa - vždy na takú, ktorá je voľná
      if (novyNazov !== category.nazov) {
        updateData.slug = await unikatnaAdresa(novyNazov, category.id);
      }
    }

    if (popis !== undefined) updateData.popis = popis ? String(popis).trim() || null : null;
    if (farba !== undefined) updateData.farba = farba || null;
    if (ikona !== undefined) updateData.ikona = ikona ? String(ikona).trim() || null : null;
    if (poradie !== undefined && poradie !== null) updateData.poradie = Number(poradie);

    // Aktualizácia kategórie
    await category.update(updateData);

    res.json({
      success: true,
      message: 'Kategória úspešne aktualizovaná',
      data: category.toSafeJSON(),
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

    // Článok bez rubriky byť nemôže (kategoria_id je povinné), takže rubriku
    // s článkami nejde len tak zmazať. Dá sa ale povedať, kam ich presunúť:
    //   DELETE /api/admin/categories/:id?presunut_do=<id inej rubriky>
    const articlesCount = await Article.count({
      where: { kategoria_id: id },
    });

    const presunutDo = req.query.presunut_do ? Number(req.query.presunut_do) : null;

    if (articlesCount > 0 && !presunutDo) {
      res.status(400).json({
        success: false,
        message: `Kategória obsahuje ${articlesCount} článkov. Vyberte, do ktorej kategórie ich presunúť.`,
      });
      return;
    }

    if (articlesCount > 0 && presunutDo) {
      if (presunutDo === category.id) {
        res.status(400).json({
          success: false,
          message: 'Články nemožno presunúť do tej istej kategórie, ktorá sa maže.',
        });
        return;
      }

      const ciel = await Category.findByPk(presunutDo);
      if (!ciel) {
        res.status(400).json({
          success: false,
          message: 'Kategória, do ktorej sa majú články presunúť, neexistuje.',
        });
        return;
      }
    }

    // Presun aj zmazanie naraz - aby nevznikol stav, keď sú články
    // presunuté, ale rubrika zostala, alebo naopak
    await Category.sequelize!.transaction(async (t) => {
      if (articlesCount > 0 && presunutDo) {
        await Article.update(
          { kategoria_id: presunutDo },
          { where: { kategoria_id: category.id }, transaction: t }
        );
      }
      await category.destroy({ transaction: t });
    });

    res.json({
      success: true,
      message:
        articlesCount > 0
          ? `Kategória bola vymazaná, ${articlesCount} článkov bolo presunutých.`
          : 'Kategória úspešne vymazaná',
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
      data: category.toSafeJSON(),
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
        data: categoriesWithArticles
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

    // Helper funkcia pre generovanie unikátneho názvu
    const generateUniqueName = async (originalName: string): Promise<string> => {
      let counter = 1;
      let duplicateName = `${originalName} (kópia)`;
      
      // Kontrolujeme, či už existuje
      while (await Category.findOne({ where: { nazov: duplicateName } })) {
        counter++;
        duplicateName = `${originalName} (kópia ${counter})`;
      }
      
      return duplicateName;
    };

    // Vytvorenie duplikátov
    const duplicatedCategories = [];
    
    for (const category of originalCategories) {
      const duplicateName = await generateUniqueName(category.nazov);
      const duplicateSlug = Category.generateSlug(duplicateName);
      
      const duplicate = await Category.create({
        nazov: duplicateName,
        slug: duplicateSlug,
        popis: category.popis,
        farba: category.farba,
        ikona: category.ikona,
        poradie: category.poradie + 1000, // Posun poradie
        aktivity: false, // OPRAVA: Duplikáty sú vždy neaktívne
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