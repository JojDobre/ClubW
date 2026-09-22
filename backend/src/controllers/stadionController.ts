// Umiestnenie: backend/src/controllers/stadionController.ts
// CRUD pre štadióny.
//
// Mazanie je mäkké (aktivity = false) a štadión sa objaví v archíve,
// rovnako ako tímy, hráči, realizačný tím, ligy a sezóny.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Stadion from '../models/Stadion';
import Team from '../models/Team';
import { sanitizePlainText } from '../utils/sanitize';

/** Overí ID z adresy. */
const overId = (id: string): { platne: false; chyba: string } | { platne: true; id: number } => {
  const cislo = Number(id);
  if (!Number.isInteger(cislo) || cislo < 1) {
    return { platne: false, chyba: 'ID štadióna musí byť kladné celé číslo' };
  }
  return { platne: true, id: cislo };
};

/**
 * Vyberie z tela požiadavky len polia, ktoré smie klient nastaviť,
 * a to LEN tie, ktoré naozaj poslal.
 *
 * Nezaslané pole sa nemení - čiastočná úprava tak neprepíše nič iné.
 */
const pripravUdaje = (telo: any): Record<string, unknown> => {
  const udaje: Record<string, unknown> = {};

  if (telo.nazov !== undefined) udaje.nazov = sanitizePlainText(String(telo.nazov)).trim();
  if (telo.adresa !== undefined) {
    udaje.adresa = telo.adresa ? sanitizePlainText(String(telo.adresa)).trim() : null;
  }
  if (telo.fotka !== undefined) udaje.fotka = telo.fotka || null;
  if (telo.poznamka !== undefined) {
    udaje.poznamka = telo.poznamka ? sanitizePlainText(String(telo.poznamka)) : null;
  }
  if (telo.kapacita !== undefined) {
    udaje.kapacita = telo.kapacita === null || telo.kapacita === '' ? null : Number(telo.kapacita);
  }
  if (telo.aktivity !== undefined) udaje.aktivity = Boolean(telo.aktivity);

  return udaje;
};

/**
 * GET /api/stadiums
 * Zoznam aktívnych štadiónov. Čítanie je verejné - adresa štadióna
 * patrí na web, aby fanúšik vedel, kam má prísť.
 */
export const getStadiony = async (req: Request, res: Response): Promise<void> => {
  try {
    const kde: any = { aktivity: true };

    if (req.query.hladat) {
      const hladat = String(req.query.hladat).trim();
      kde[Op.or] = [
        { nazov: { [Op.iLike]: `%${hladat}%` } },
        { adresa: { [Op.iLike]: `%${hladat}%` } },
      ];
    }

    const stadiony = await Stadion.findAll({
      where: kde,
      order: [['nazov', 'ASC']],
    });

    res.json({
      success: true,
      data: stadiony.map((s) => s.toSafeJSON()),
      pocet: stadiony.length,
      message: `Nájdených ${stadiony.length} štadiónov`,
    });
  } catch (error) {
    console.error('Chyba pri načítaní štadiónov:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní štadiónov' });
  }
};

/**
 * GET /api/stadiums/:id
 * Detail štadióna spolu s tímami, ktoré na ňom hrávajú.
 */
export const getStadion = async (req: Request, res: Response): Promise<void> => {
  try {
    const overenie = overId(req.params.id);
    if (!overenie.platne) {
      res.status(400).json({ success: false, message: overenie.chyba });
      return;
    }

    const stadion = await Stadion.findOne({ where: { id: overenie.id, aktivity: true } });
    if (!stadion) {
      res.status(404).json({ success: false, message: 'Štadión nebol nájdený' });
      return;
    }

    const timy = await Team.findAll({
      where: { stadion_id: stadion.id, aktivity: true },
      order: [['poradie', 'ASC'], ['nazov', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        ...stadion.toSafeJSON(),
        timy: timy.map((t) => ({ id: t.id, nazov: t.nazov, vekova_kategoria: t.vekova_kategoria })),
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní štadióna:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní štadióna' });
  }
};

/**
 * POST /api/stadiums
 */
export const createStadion = async (req: Request, res: Response): Promise<void> => {
  try {
    const udaje = pripravUdaje(req.body);

    if (!udaje.nazov || String(udaje.nazov).length < 2) {
      res.status(400).json({ success: false, message: 'Názov štadióna musí mať aspoň 2 znaky' });
      return;
    }

    const stadion = await Stadion.create(udaje as any);

    res.status(201).json({
      success: true,
      data: stadion.toSafeJSON(),
      message: `Štadión ${stadion.nazov} bol vytvorený`,
    });
  } catch (error: any) {
    if (error?.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: error.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri vytváraní štadióna:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní štadióna' });
  }
};

/**
 * PUT /api/stadiums/:id
 */
export const updateStadion = async (req: Request, res: Response): Promise<void> => {
  try {
    const overenie = overId(req.params.id);
    if (!overenie.platne) {
      res.status(400).json({ success: false, message: overenie.chyba });
      return;
    }

    const stadion = await Stadion.findOne({ where: { id: overenie.id, aktivity: true } });
    if (!stadion) {
      res.status(404).json({ success: false, message: 'Štadión nebol nájdený' });
      return;
    }

    const udaje = pripravUdaje(req.body);
    if (udaje.nazov !== undefined && String(udaje.nazov).length < 2) {
      res.status(400).json({ success: false, message: 'Názov štadióna musí mať aspoň 2 znaky' });
      return;
    }

    await stadion.update(udaje);

    res.json({
      success: true,
      data: stadion.toSafeJSON(),
      message: `Štadión ${stadion.nazov} bol upravený`,
    });
  } catch (error: any) {
    if (error?.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: error.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri úprave štadióna:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri úprave štadióna' });
  }
};

/**
 * DELETE /api/stadiums/:id
 * Archivácia - štadión sa presunie do archívu a dá sa odtiaľ obnoviť.
 */
export const deleteStadion = async (req: Request, res: Response): Promise<void> => {
  try {
    const overenie = overId(req.params.id);
    if (!overenie.platne) {
      res.status(400).json({ success: false, message: overenie.chyba });
      return;
    }

    const stadion = await Stadion.findOne({ where: { id: overenie.id, aktivity: true } });
    if (!stadion) {
      res.status(404).json({ success: false, message: 'Štadión nebol nájdený' });
      return;
    }

    // Tímy, ktoré na ňom hrajú, by zostali bez miesta konania domácich
    // zápasov. Radšej vysvetlíme, čo štadión drží.
    const pocetTimov = await Team.count({ where: { stadion_id: stadion.id, aktivity: true } });
    if (pocetTimov > 0) {
      res.status(409).json({
        success: false,
        message:
          `Štadión ${stadion.nazov} nemožno archivovať - hrá na ňom ${pocetTimov} tímov. ` +
          'Najprv im nastavte iný štadión.',
        data: { pocet_timov: pocetTimov },
      });
      return;
    }

    await stadion.update({ aktivity: false });

    res.json({
      success: true,
      message: `Štadión ${stadion.nazov} bol presunutý do archívu`,
    });
  } catch (error) {
    console.error('Chyba pri archivácii štadióna:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri archivácii štadióna' });
  }
};
