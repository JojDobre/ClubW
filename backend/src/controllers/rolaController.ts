// Umiestnenie: backend/src/controllers/rolaController.ts
//
// SPRÁVA ROLÍ A OPRÁVNENÍ
//
// Požiadavka: „možnosť vytvoriť rolu a tam nastaviť defaultné
// oprávnenia". Oprávnenia sú mapa modul -> {citat, pisat, mazat},
// takže administrácia ich môže zobraziť ako zaškrtávaciu tabuľku.

import { Request, Response } from 'express';
import Rola, { MODULY } from '../models/Rola';
import User from '../models/user';
import { sanitizePlainText } from '../utils/sanitize';

/** Vyrobí strojový kód z názvu roly. */
const kodZNazvu = (nazov: string): string =>
  nazov
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'rola';

const overId = (id: string): number | null => {
  const cislo = Number(id);
  return Number.isInteger(cislo) && cislo > 0 ? cislo : null;
};

/**
 * GET /api/admin/roles
 * Zoznam rolí aj s počtom používateľov, ktorí ich majú.
 */
export const getRoly = async (_req: Request, res: Response): Promise<void> => {
  try {
    const roly = await Rola.findAll({
      where: { aktivity: true },
      order: [['poradie', 'ASC'], ['nazov', 'ASC']],
    });

    const sPoctom = await Promise.all(
      roly.map(async (rola) => ({
        ...rola.toSafeJSON(),
        pocet_pouzivatelov: await User.count({ where: { rola_id: rola.id } }),
      }))
    );

    res.json({
      success: true,
      data: sPoctom,
      pocet: sPoctom.length,
      // Administrácia z toho vykreslí stĺpce zaškrtávacej tabuľky
      moduly: MODULY,
    });
  } catch (error) {
    console.error('Chyba pri načítaní rolí:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní rolí' });
  }
};

/** GET /api/admin/roles/:id */
export const getRola = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID roly musí byť kladné celé číslo' });
      return;
    }

    const rola = await Rola.findOne({ where: { id, aktivity: true } });
    if (!rola) {
      res.status(404).json({ success: false, message: 'Rola nebola nájdená' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...rola.toSafeJSON(),
        pocet_pouzivatelov: await User.count({ where: { rola_id: rola.id } }),
      },
      moduly: MODULY,
    });
  } catch (error) {
    console.error('Chyba pri načítaní roly:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní roly' });
  }
};

/**
 * POST /api/admin/roles
 * Telo: { nazov, popis, opravnenia: { clanky: {citat,pisat,mazat}, ... } }
 */
export const createRola = async (req: Request, res: Response): Promise<void> => {
  try {
    const nazov = sanitizePlainText(String(req.body.nazov || '')).trim();

    if (nazov.length < 2) {
      res.status(400).json({ success: false, message: 'Názov roly musí mať aspoň 2 znaky' });
      return;
    }

    const kod = req.body.kod ? kodZNazvu(String(req.body.kod)) : kodZNazvu(nazov);

    const existujuca = await Rola.findOne({ where: { kod } });
    if (existujuca) {
      res.status(409).json({
        success: false,
        message: `Rola s kódom „${kod}" už existuje`,
      });
      return;
    }

    const rola = await Rola.create({
      nazov,
      kod,
      popis: req.body.popis ? sanitizePlainText(String(req.body.popis)) : null,
      opravnenia: Rola.ocistiOpravnenia(req.body.opravnenia),
      poradie: Number(req.body.poradie) || 0,
      // Vlastné role nie sú systémové, takže sa dajú zmazať
      je_systemova: false,
    });

    res.status(201).json({
      success: true,
      data: rola.toSafeJSON(),
      message: `Rola ${rola.nazov} bola vytvorená`,
    });
  } catch (error: any) {
    if (error?.name === 'SequelizeValidationError' || error?.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: error.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri vytváraní roly:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní roly' });
  }
};

/**
 * PUT /api/admin/roles/:id
 *
 * Pri systémovej role sa dajú meniť oprávnenia a popis, nie však kód -
 * kód je to, na čo sa odkazuje kód aplikácie aj migrácie.
 */
export const updateRola = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID roly musí byť kladné celé číslo' });
      return;
    }

    const rola = await Rola.findOne({ where: { id, aktivity: true } });
    if (!rola) {
      res.status(404).json({ success: false, message: 'Rola nebola nájdená' });
      return;
    }

    const udaje: any = {};

    if (req.body.nazov !== undefined) {
      const nazov = sanitizePlainText(String(req.body.nazov)).trim();
      if (nazov.length < 2) {
        res.status(400).json({ success: false, message: 'Názov roly musí mať aspoň 2 znaky' });
        return;
      }
      udaje.nazov = nazov;
    }

    if (req.body.popis !== undefined) {
      udaje.popis = req.body.popis ? sanitizePlainText(String(req.body.popis)) : null;
    }

    if (req.body.poradie !== undefined) udaje.poradie = Number(req.body.poradie) || 0;

    if (req.body.opravnenia !== undefined) {
      // Správcovi sa práva neodoberajú - inak by sa klub vedel zamknúť
      // mimo vlastnej administrácie a nemal by sa ako dostať späť
      if (rola.kod === 'admin') {
        res.status(409).json({
          success: false,
          message:
            'Role Správca sa oprávnenia meniť nedajú - je to poistka proti ' +
            'zamknutiu sa mimo administrácie. Vytvorte radšej vlastnú rolu.',
        });
        return;
      }
      udaje.opravnenia = Rola.ocistiOpravnenia(req.body.opravnenia);
    }

    if (req.body.kod !== undefined && !rola.je_systemova) {
      udaje.kod = kodZNazvu(String(req.body.kod));
    }

    await rola.update(udaje);

    res.json({
      success: true,
      data: rola.toSafeJSON(),
      message: `Rola ${rola.nazov} bola upravená`,
    });
  } catch (error: any) {
    if (error?.name === 'SequelizeValidationError' || error?.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: error.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri úprave roly:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri úprave roly' });
  }
};

/**
 * DELETE /api/admin/roles/:id
 *
 * Systémovú rolu ani rolu, ktorú niekto má, nezmažeme - v oboch
 * prípadoch by to niekomu vzalo prístup bez varovania.
 */
export const deleteRola = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID roly musí byť kladné celé číslo' });
      return;
    }

    const rola = await Rola.findOne({ where: { id, aktivity: true } });
    if (!rola) {
      res.status(404).json({ success: false, message: 'Rola nebola nájdená' });
      return;
    }

    if (rola.je_systemova) {
      res.status(409).json({
        success: false,
        message: `Rola ${rola.nazov} je systémová a nedá sa zmazať`,
      });
      return;
    }

    const pocet = await User.count({ where: { rola_id: rola.id } });
    if (pocet > 0) {
      res.status(409).json({
        success: false,
        message:
          `Rolu ${rola.nazov} má priradených ${pocet} používateľov. ` +
          'Najprv im nastavte inú rolu.',
        data: { pocet_pouzivatelov: pocet },
      });
      return;
    }

    await rola.destroy();

    res.json({ success: true, message: `Rola ${rola.nazov} bola zmazaná` });
  } catch (error) {
    console.error('Chyba pri mazaní roly:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní roly' });
  }
};
