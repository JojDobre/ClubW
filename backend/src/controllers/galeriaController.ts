// backend/src/controllers/galeriaController.ts
// Controller pre správu fotogalérií - FÁZA 7

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Galeria, GaleriaObrazok, Team, Article, Zapas } from '../models';
import { getGalleryWithImages, getGalleriesByType, getAllGalleriesForAdmin } from '../models';
import { zostavStrankovanie } from '../utils/odpoved';

// ===== HELPER FUNCTIONS =====

// Validácia parametrov
const validatePagination = (page?: string, limit?: string) => {
  const pageNum = page && !isNaN(parseInt(page, 10)) ? parseInt(page, 10) : 1;
  const limitNum = limit && !isNaN(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
  
  return {
    page: Math.max(1, pageNum),
    limit: Math.min(50, Math.max(1, limitNum)), // Max 50 položiek na stránku
    offset: Math.max(0, (Math.max(1, pageNum) - 1) * Math.min(50, Math.max(1, limitNum)))
  };
};

// Validácia typ priradenia
const validateAssignmentType = (typ?: string): 'tim' | 'clanok' | 'zapas' | 'volna' | null => {
  if (!typ) return null;
  const validTypes = ['tim', 'clanok', 'zapas', 'volna'];
  return validTypes.includes(typ) ? typ as any : null;
};

// ===== PUBLIC ENDPOINTS (pre frontend) =====

// GET /api/galleries - Získanie zoznamu verejných galérií s filtrovaním
export const getPublicGalleries = async (req: Request, res: Response) => {
  try {
    const { page, limit, typ, object_id, search } = req.query;
    const { page: pageNum, limit: limitNum, offset } = validatePagination(page as string, limit as string);
    const typPriradenia = validateAssignmentType(typ as string);

    // Verejný výpis: len nezmazané galérie, ktoré sa majú zobrazovať na webe
    const whereClause: any = {
      aktivity: true,
      zobrazit_na_webe: true,
    };

    // Filtrovanie podľa typu priradenia
    if (typPriradenia === 'volna') {
      whereClause.tim_id = null;
      whereClause.clanok_id = null;
      whereClause.zapas_id = null;
    } else if (typPriradenia && object_id) {
      const objectIdNum = parseInt(object_id as string, 10);
      if (!isNaN(objectIdNum)) {
        whereClause[`${typPriradenia}_id`] = objectIdNum;
      }
    }

    // Vyhľadávanie v názve
    if (search && typeof search === 'string' && search.trim()) {
      whereClause.nazov = {
        [Op.iLike]: `%${search.trim()}%`
      };
    }

    // Získanie galérií s náhľadovými obrázkami
    const { count, rows: galerie } = await Galeria.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: GaleriaObrazok,
          as: 'obrazky',
          where: { aktivity: true },
          required: false,
          attributes: ['id', 'cesta_suboru', 'nahladovy_maly', 'je_nahladovy'],
          limit: 1, // Len náhľadový obrázok
          order: [['je_nahladovy', 'DESC'], ['poradie', 'ASC']]
        }
      ],
      order: [['vytvoreny', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true // Pre správny count s include
    });

    // Formátovanie výsledku
    const formattedGalleries = galerie.map(galeria => {
      const galeriaJson = galeria.toJSON();

      // Prednosť má titulný obrázok zvolený v administrácii. Cesty sú uložené
      // celé (/uploads/...), takže sa k nim už nič nepridáva - predtým tu
      // vznikalo /uploads/uploads/... a náhľad sa nenačítal.
      let nahladovyObrazok: string | null = galeria.nahladovy_obrazok || null;

      if (!nahladovyObrazok && galeria.obrazky && galeria.obrazky.length > 0) {
        const prvyObrazok = galeria.obrazky[0] as any; // Type assertion pre include dáta
        nahladovyObrazok = prvyObrazok.nahladovy_maly || prvyObrazok.cesta_suboru;
      }

      return {
        ...galeriaJson,
        nahladovy_obrazok: nahladovyObrazok,
        pocet_obrazkov: galeria.pocet_obrazkov
      };
    });

    res.json({
      success: true,
      data: formattedGalleries,
      pagination: zostavStrankovanie(count, limitNum, offset),
      message: `Načítaných ${galerie.length} galérií`
    });

  } catch (error: any) {
    console.error('Chyba pri načítaní verejných galérií:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní galérií',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// GET /api/galleries/:id - Získanie konkrétnej galérie s obrázkami
export const getPublicGallery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const galeriaId = parseInt(id, 10);

    if (isNaN(galeriaId)) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID galérie'
      });
    }

    // Získanie galérie s obrázkami
    const galeria = await getGalleryWithImages(galeriaId);

    if (!galeria || !galeria.aktivity || !galeria.zobrazit_na_webe) {
      return res.status(404).json({
        success: false,
        message: 'Galéria nenájdená'
      });
    }

    // Formátovanie obrázkov
    const formattedImages = galeria.obrazky?.map(obrazok => obrazok.toJSON()) || [];

    res.json({
      success: true,
      data: {
        ...galeria.toJSON(),
        obrazky: formattedImages
      },
      message: `Galéria "${galeria.nazov}" načítaná`
    });

  } catch (error: any) {
    console.error('Chyba pri načítaní galérie:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní galérie',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// GET /api/galleries/by-type/:typ - Získanie galérií podľa typu priradenia
export const getGalleriesByTypeEndpoint = async (req: Request, res: Response) => {
  try {
    const { typ } = req.params;
    const { object_id, limit } = req.query;
    
    const typPriradenia = validateAssignmentType(typ);
    if (!typPriradenia) {
      return res.status(400).json({
        success: false,
        message: 'Neplatný typ priradenia. Podporované: tim, clanok, zapas, volna'
      });
    }

    const objectIdNum = object_id ? parseInt(object_id as string, 10) : undefined;
    const limitNum = limit ? Math.min(20, parseInt(limit as string, 10)) : 10;

    const galerie = await getGalleriesByType(typPriradenia, objectIdNum);

    // Obmedziť počet výsledkov
    const limitedGalleries = galerie.slice(0, limitNum);

    res.json({
      success: true,
      data: {
        galerie: limitedGalleries.map(galeria => galeria.toJSON()),
        typ: typPriradenia,
        object_id: objectIdNum
      },
      message: `Načítaných ${limitedGalleries.length} galérií typu "${typPriradenia}"`
    });

  } catch (error: any) {
    console.error('Chyba pri načítaní galérií podľa typu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní galérií',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ===== ADMIN ENDPOINTS (pre správu) =====

// GET /api/admin/galleries - Získanie všetkých galérií pre admin
export const getAdminGalleries = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, typ } = req.query;
    const { page: pageNum, limit: limitNum, offset } = validatePagination(page as string, limit as string);
    const typPriradenia = validateAssignmentType(typ as string);

    // Admin vidí aj skryté galérie, ale nie zmazané (aktivity=false)
    const whereClause: any = { aktivity: true };

    // Filtrovanie podľa typu priradenia
    if (typPriradenia === 'volna') {
      whereClause.tim_id = null;
      whereClause.clanok_id = null;
      whereClause.zapas_id = null;
    } else if (typPriradenia) {
      // Pre admin zobrazíme všetky galérie daného typu
      whereClause[Op.or] = [
        { [`${typPriradenia}_id`]: { [Op.ne]: null } }
      ];
    }

    // Vyhľadávanie v názve a popise
    if (search && typeof search === 'string' && search.trim()) {
      whereClause[Op.or] = [
        { nazov: { [Op.iLike]: `%${search.trim()}%` } },
        { popis: { [Op.iLike]: `%${search.trim()}%` } }
      ];
    }

    const galerie = await getAllGalleriesForAdmin();

    // Aplikovanie filtrov na výsledky (jednoduchšie ako komplexné Sequelize queries)
    let filteredGalleries = galerie;

    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredGalleries = filteredGalleries.filter(galeria =>
        galeria.nazov.toLowerCase().includes(searchTerm) ||
        (galeria.popis && galeria.popis.toLowerCase().includes(searchTerm))
      );
    }

    if (typPriradenia) {
      filteredGalleries = filteredGalleries.filter(galeria => {
        if (typPriradenia === 'volna') {
          return !galeria.tim_id && !galeria.clanok_id && !galeria.zapas_id;
        }
        return galeria[`${typPriradenia}_id`] !== null;
      });
    }

    // Manuálna paginácia
    const total = filteredGalleries.length;
    const paginatedGalleries = filteredGalleries.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedGalleries.map(galeria => galeria.toJSON()),
      pagination: zostavStrankovanie(total, limitNum, offset),
      message: `Načítaných ${paginatedGalleries.length} galérií pre admin`
    });

  } catch (error: any) {
    console.error('Chyba pri načítaní admin galérií:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní galérií',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Overí, že objekt, ku ktorému sa galéria priraďuje, existuje.
 *
 * @returns text chyby, alebo null keď je všetko v poriadku
 */
const overPriradenie = async (udaje: any): Promise<string | null> => {
  if (udaje.tim_id) {
    const tim = await Team.findByPk(udaje.tim_id);
    if (!tim) return `Tím s ID ${udaje.tim_id} neexistuje`;
  }
  if (udaje.clanok_id) {
    const clanok = await Article.findByPk(udaje.clanok_id);
    if (!clanok) return `Článok s ID ${udaje.clanok_id} neexistuje`;
  }
  if (udaje.zapas_id) {
    const zapas = await Zapas.findByPk(udaje.zapas_id);
    if (!zapas) return `Zápas s ID ${udaje.zapas_id} neexistuje`;
  }
  return null;
};

// GET /api/admin/galleries/:id - Detail galérie pre editor
//
// Verejný detail skrytú galériu nevráti (404), editor ju ale potrebuje
// otvoriť - práve skrytú galériu chce redaktor dokončiť pred zverejnením.
export const getAdminGallery = async (req: Request, res: Response) => {
  try {
    const galeriaId = parseInt(req.params.id, 10);
    if (isNaN(galeriaId)) {
      return res.status(400).json({ success: false, message: 'Neplatné ID galérie' });
    }

    const galeria = await Galeria.findOne({ where: { id: galeriaId, aktivity: true } });
    if (!galeria) {
      return res.status(404).json({ success: false, message: 'Galéria nenájdená' });
    }

    res.json({ success: true, data: galeria.toJSON() });
  } catch (error: any) {
    console.error('Chyba pri načítaní galérie pre editor:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní galérie' });
  }
};

// POST /api/admin/galleries - Vytvorenie novej galérie
export const createGallery = async (req: Request, res: Response) => {
  try {
    const { nazov, popis, tim_id, clanok_id, zapas_id, zobrazit_na_webe } = req.body;

    // Validácia povinných polí
    if (!nazov || nazov.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Názov galérie musí mať minimálne 3 znaky'
      });
    }

    // Validácia priradenia (len jedno môže byť nastavené)
    const assignments = [tim_id, clanok_id, zapas_id].filter(id => id && id !== '');
    if (assignments.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Galéria môže byť priradená len k jednému objektu (tím, článok alebo zápas)'
      });
    }

    // Vytvorenie galérie
    const galeriaData: any = {
      nazov: nazov.trim(),
      popis: popis ? popis.trim() : null,
      zobrazit_na_webe: zobrazit_na_webe === undefined ? true : Boolean(zobrazit_na_webe),
    };

    // Pridanie priradenia ak je zadané
    if (tim_id && tim_id !== '') galeriaData.tim_id = parseInt(tim_id, 10);
    if (clanok_id && clanok_id !== '') galeriaData.clanok_id = parseInt(clanok_id, 10);
    if (zapas_id && zapas_id !== '') galeriaData.zapas_id = parseInt(zapas_id, 10);

    // Overenie, že priradený objekt naozaj existuje.
    //
    // Bez toho padol zápis až na cudzom kľúči v databáze a používateľ
    // dostal 500 "Chyba servera", z ktorej sa nedalo vyčítať, čo je zle.
    const chybaPriradenia = await overPriradenie(galeriaData);
    if (chybaPriradenia) {
      return res.status(400).json({ success: false, message: chybaPriradenia });
    }

    const galeria = await Galeria.create(galeriaData);

    res.status(201).json({
      success: true,
      data: galeria.toJSON(),
      message: `Galéria "${galeria.nazov}" bola úspešne vytvorená`
    });

  } catch (error: any) {
    console.error('Chyba pri vytváraní galérie:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Chyba validácie',
        errors: error.errors.map((e: any) => e.message)
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Galéria s týmto názvom už existuje'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní galérie',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// PUT /api/admin/galleries/:id - Aktualizácia galérie
export const updateGallery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nazov, popis, tim_id, clanok_id, zapas_id, zobrazit_na_webe } = req.body;
    const galeriaId = parseInt(id, 10);

    if (isNaN(galeriaId)) {
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID galérie'
      });
    }

    // Nájdenie galérie
    const galeria = await Galeria.findByPk(galeriaId);
    if (!galeria) {
      return res.status(404).json({
        success: false,
        message: 'Galéria nenájdená'
      });
    }

    // Validácia názvu
    if (nazov && nazov.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Názov galérie musí mať minimálne 3 znaky'
      });
    }

    // Validácia priradenia
    const assignments = [tim_id, clanok_id, zapas_id].filter(id => id && id !== '' && id !== null);
    if (assignments.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Galéria môže byť priradená len k jednému objektu'
      });
    }

    // Aktualizácia dát
    const updateData: any = {};
    if (nazov !== undefined) updateData.nazov = nazov.trim();
    if (popis !== undefined) updateData.popis = popis ? popis.trim() : null;
    // Viditeľnosť na webe - aktivity cez úpravu meniť nejde, to je zmazanie
    if (zobrazit_na_webe !== undefined) updateData.zobrazit_na_webe = Boolean(zobrazit_na_webe);

    // PRIRADENIE K TÍMU / ČLÁNKU / ZÁPASU
    //
    // Pôvodne sa všetky tri väzby na tomto mieste bezpodmienečne nulovali
    // a znovu nastavovali len z toho, čo prišlo v tele. Úprava samotného
    // názvu tak galérii ticho zmazala priradenie k zápasu - z galérie
    // zápasu sa stala voľná galéria bez toho, aby o to niekto požiadal.
    //
    // Väzby preto prepisujeme LEN vtedy, keď klient aspoň jednu z nich
    // naozaj poslal. Vtedy platí pôvodné pravidlo "galéria patrí najviac
    // k jednému objektu", takže ostatné dve sa vynulujú. Poslať
    // zapas_id: null je stále platný spôsob, ako priradenie zrušiť.
    const poslaneTim = Object.prototype.hasOwnProperty.call(req.body, 'tim_id');
    const poslaneClanok = Object.prototype.hasOwnProperty.call(req.body, 'clanok_id');
    const poslaneZapas = Object.prototype.hasOwnProperty.call(req.body, 'zapas_id');

    if (poslaneTim || poslaneClanok || poslaneZapas) {
      updateData.tim_id = null;
      updateData.clanok_id = null;
      updateData.zapas_id = null;

      if (tim_id && tim_id !== '' && tim_id !== null) updateData.tim_id = parseInt(tim_id, 10);
      if (clanok_id && clanok_id !== '' && clanok_id !== null) updateData.clanok_id = parseInt(clanok_id, 10);
      if (zapas_id && zapas_id !== '' && zapas_id !== null) updateData.zapas_id = parseInt(zapas_id, 10);

      const chybaPriradenia = await overPriradenie(updateData);
      if (chybaPriradenia) {
        return res.status(400).json({ success: false, message: chybaPriradenia });
      }
    }

    await galeria.update(updateData);

    res.json({
      success: true,
      data: galeria.toJSON(),
      message: `Galéria "${galeria.nazov}" bola úspešne aktualizovaná`
    });

  } catch (error: any) {
    console.error('Chyba pri aktualizácii galérie:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Chyba validácie',
        errors: error.errors.map((e: any) => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii galérie',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// DELETE /api/admin/galleries/:id - Vymazanie galérie
export const deleteGallery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const galeriaId = parseInt(id, 10);

    console.log('🗑️ DELETE request pre galériu ID:', galeriaId); // DEBUG LOG

    if (isNaN(galeriaId)) {
      console.log('❌ Neplatné ID galérie:', id); // DEBUG LOG
      return res.status(400).json({
        success: false,
        message: 'Neplatné ID galérie'
      });
    }

    // Nájdenie galérie
    const galeria = await Galeria.findByPk(galeriaId);
    if (!galeria) {
      console.log('❌ Galéria nenájdená, ID:', galeriaId); // DEBUG LOG
      return res.status(404).json({
        success: false,
        message: 'Galéria nenájdená'
      });
    }

    const nazovGalerie = galeria.nazov;
    console.log('✅ Vymazávam galériu:', nazovGalerie); // DEBUG LOG

    // Soft delete - nastavenie aktivity na false
    await galeria.update({ aktivity: false });

    // Taktiež označiť všetky obrázky ako neaktívne
    await GaleriaObrazok.update(
      { aktivity: false },
      { where: { galeria_id: galeriaId } }
    );

    console.log('✅ Galéria úspešne vymazaná:', nazovGalerie); // DEBUG LOG

    res.json({
      success: true,
      message: `Galéria "${nazovGalerie}" bola úspešne vymazaná`
    });

  } catch (error: any) {
    console.error('❌ Chyba pri vymazávaní galérie:', error); // DEBUG LOG
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vymazávaní galérie',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// Export všetkých funkcií
export default {
  // Public endpoints
  getPublicGalleries,
  getPublicGallery,
  getGalleriesByTypeEndpoint,
  
  // Admin endpoints
  getAdminGalleries,
  createGallery,
  updateGallery,
  deleteGallery,
};