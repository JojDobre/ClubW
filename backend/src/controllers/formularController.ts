// Umiestnenie: backend/src/controllers/formularController.ts
//
// FORMULÁRE - vytváranie, zobrazenie a vyplnené odpovede.
//
// Formuláre v projekte vôbec neexistovali. Požiadavka žiada vytváranie
// (názov, polia s popismi), zobrazenie formulára, zobrazenie vyplnených
// a označovanie prečítané/neprečítané.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Formular from '../models/Formular';
import FormularOdpoved from '../models/FormularOdpoved';
import { sanitizePlainText } from '../utils/sanitize';
import { zostavStrankovanie } from '../utils/odpoved';

const overId = (id: string): number | null => {
  const cislo = Number(id);
  return Number.isInteger(cislo) && cislo > 0 ? cislo : null;
};

/** Nájde formulár podľa ID alebo slugu - web používa čitateľnú adresu. */
const najdiFormular = async (kluc: string) => {
  const id = Number(kluc);
  if (Number.isInteger(id) && id > 0) {
    return Formular.findOne({ where: { id, aktivity: true } });
  }
  return Formular.findOne({ where: { slug: kluc, aktivity: true } });
};

// ===== ADMINISTRÁCIA =====

/** GET /api/admin/forms - zoznam aj s počtom neprečítaných odpovedí */
export const getFormulare = async (_req: Request, res: Response): Promise<void> => {
  try {
    const formulare = await Formular.findAll({
      where: { aktivity: true },
      order: [['vytvoreny', 'DESC']],
    });

    const sPoctami = await Promise.all(
      formulare.map(async (f) => ({
        ...f.toSafeJSON(),
        pocet_odpovedi: await FormularOdpoved.count({ where: { formular_id: f.id } }),
        pocet_neprecitanych: await FormularOdpoved.count({
          where: { formular_id: f.id, precitane: false },
        }),
      }))
    );

    res.json({ success: true, data: sPoctami });
  } catch (error) {
    console.error('Chyba pri načítaní formulárov:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní formulárov' });
  }
};

/** GET /api/admin/forms/:id */
export const getFormular = async (req: Request, res: Response): Promise<void> => {
  try {
    const formular = await najdiFormular(req.params.id);
    if (!formular) {
      res.status(404).json({ success: false, message: 'Formulár nebol nájdený' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...formular.toSafeJSON(),
        pocet_odpovedi: await FormularOdpoved.count({ where: { formular_id: formular.id } }),
        pocet_neprecitanych: await FormularOdpoved.count({
          where: { formular_id: formular.id, precitane: false },
        }),
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní formulára:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní formulára' });
  }
};

/** POST /api/admin/forms */
export const createFormular = async (req: Request, res: Response): Promise<void> => {
  try {
    const nazov = sanitizePlainText(String(req.body.nazov || '')).trim();
    if (nazov.length < 2) {
      res.status(400).json({ success: false, message: 'Názov formulára musí mať aspoň 2 znaky' });
      return;
    }

    const { polia, chyby } = Formular.overPolia(req.body.polia ?? []);
    if (chyby.length > 0) {
      res.status(400).json({ success: false, message: 'Chyby v definícii polí', errors: chyby });
      return;
    }

    // Slug musí byť jedinečný - pri zhode pridáme číslo
    let slug = req.body.slug ? Formular.vyrobSlug(String(req.body.slug)) : Formular.vyrobSlug(nazov);
    let pokus = 1;
    while (await Formular.findOne({ where: { slug } })) {
      pokus++;
      slug = `${Formular.vyrobSlug(nazov)}-${pokus}`;
    }

    const formular = await Formular.create({
      nazov,
      slug,
      popis: req.body.popis ? sanitizePlainText(String(req.body.popis)) : null,
      polia,
      sprava_po_odoslani: req.body.sprava_po_odoslani
        ? sanitizePlainText(String(req.body.sprava_po_odoslani))
        : null,
      email_pre_notifikacie: req.body.email_pre_notifikacie || null,
      aktivny: req.body.aktivny !== false,
    });

    res.status(201).json({
      success: true,
      data: formular.toSafeJSON(),
      message: `Formulár ${formular.nazov} bol vytvorený`,
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
    console.error('Chyba pri vytváraní formulára:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní formulára' });
  }
};

/** PUT /api/admin/forms/:id */
export const updateFormular = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID formulára musí byť kladné celé číslo' });
      return;
    }

    const formular = await Formular.findOne({ where: { id, aktivity: true } });
    if (!formular) {
      res.status(404).json({ success: false, message: 'Formulár nebol nájdený' });
      return;
    }

    const udaje: any = {};

    if (req.body.nazov !== undefined) {
      const nazov = sanitizePlainText(String(req.body.nazov)).trim();
      if (nazov.length < 2) {
        res.status(400).json({ success: false, message: 'Názov formulára musí mať aspoň 2 znaky' });
        return;
      }
      udaje.nazov = nazov;
    }

    if (req.body.polia !== undefined) {
      const { polia, chyby } = Formular.overPolia(req.body.polia);
      if (chyby.length > 0) {
        res.status(400).json({ success: false, message: 'Chyby v definícii polí', errors: chyby });
        return;
      }
      udaje.polia = polia;
    }

    if (req.body.popis !== undefined) {
      udaje.popis = req.body.popis ? sanitizePlainText(String(req.body.popis)) : null;
    }
    if (req.body.sprava_po_odoslani !== undefined) {
      udaje.sprava_po_odoslani = req.body.sprava_po_odoslani
        ? sanitizePlainText(String(req.body.sprava_po_odoslani))
        : null;
    }
    if (req.body.email_pre_notifikacie !== undefined) {
      udaje.email_pre_notifikacie = req.body.email_pre_notifikacie || null;
    }
    if (req.body.aktivny !== undefined) udaje.aktivny = Boolean(req.body.aktivny);

    await formular.update(udaje);

    res.json({
      success: true,
      data: formular.toSafeJSON(),
      message: `Formulár ${formular.nazov} bol upravený`,
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
    console.error('Chyba pri úprave formulára:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri úprave formulára' });
  }
};

/**
 * DELETE /api/admin/forms/:id
 * Mäkké odstránenie - odoslané odpovede sú záznamom o tom, čo ľudia
 * naozaj poslali, a nemajú zmiznúť spolu s formulárom.
 */
export const deleteFormular = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID formulára musí byť kladné celé číslo' });
      return;
    }

    const formular = await Formular.findOne({ where: { id, aktivity: true } });
    if (!formular) {
      res.status(404).json({ success: false, message: 'Formulár nebol nájdený' });
      return;
    }

    await formular.update({ aktivity: false, aktivny: false });

    res.json({ success: true, message: `Formulár ${formular.nazov} bol odstránený` });
  } catch (error) {
    console.error('Chyba pri mazaní formulára:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní formulára' });
  }
};

// ===== ODPOVEDE =====

/**
 * GET /api/admin/forms/:id/responses
 * ?precitane=false vráti len nové odpovede.
 */
export const getOdpovede = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID formulára musí byť kladné celé číslo' });
      return;
    }

    const formular = await Formular.findByPk(id);
    if (!formular) {
      res.status(404).json({ success: false, message: 'Formulár nebol nájdený' });
      return;
    }

    const kde: any = { formular_id: id };
    if (req.query.precitane === 'false') kde.precitane = false;
    if (req.query.precitane === 'true') kde.precitane = true;

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { count, rows } = await FormularOdpoved.findAndCountAll({
      where: kde,
      // Neprečítané navrch, potom najnovšie - to je poradie, v akom
      // ich chce človek v administrácii vidieť
      order: [['precitane', 'ASC'], ['vytvorena', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: rows.map((o) => o.toSafeJSON()),
      formular: { id: formular.id, nazov: formular.nazov, polia: formular.polia },
      pagination: zostavStrankovanie(count, limit, offset),
      pocet_neprecitanych: await FormularOdpoved.count({
        where: { formular_id: id, precitane: false },
      }),
    });
  } catch (error) {
    console.error('Chyba pri načítaní odpovedí:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní odpovedí' });
  }
};

/**
 * PATCH /api/admin/forms/responses/:id/read
 * Prepne prečítané/neprečítané. Bez tela sa stav preklopí.
 */
export const oznacPrecitane = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID odpovede musí byť kladné celé číslo' });
      return;
    }

    const odpoved = await FormularOdpoved.findByPk(id);
    if (!odpoved) {
      res.status(404).json({ success: false, message: 'Odpoveď nebola nájdená' });
      return;
    }

    const precitane =
      req.body?.precitane === undefined ? !odpoved.precitane : Boolean(req.body.precitane);

    await odpoved.update({ precitane });

    res.json({
      success: true,
      data: odpoved.toSafeJSON(),
      message: precitane ? 'Označené ako prečítané' : 'Označené ako neprečítané',
    });
  } catch (error) {
    console.error('Chyba pri označovaní odpovede:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/** DELETE /api/admin/forms/responses/:id */
export const deleteOdpoved = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID odpovede musí byť kladné celé číslo' });
      return;
    }

    const odpoved = await FormularOdpoved.findByPk(id);
    if (!odpoved) {
      res.status(404).json({ success: false, message: 'Odpoveď nebola nájdená' });
      return;
    }

    await odpoved.destroy();

    res.json({ success: true, message: 'Odpoveď bola zmazaná' });
  } catch (error) {
    console.error('Chyba pri mazaní odpovede:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní odpovede' });
  }
};

// ===== VEREJNÁ ČASŤ =====

/** GET /api/forms/:kluc - definícia formulára pre vykreslenie na webe */
export const getVerejnyFormular = async (req: Request, res: Response): Promise<void> => {
  try {
    const formular = await najdiFormular(req.params.kluc);

    if (!formular || !formular.aktivny) {
      res.status(404).json({ success: false, message: 'Formulár nebol nájdený' });
      return;
    }

    res.json({ success: true, data: formular.verejneUdaje() });
  } catch (error) {
    console.error('Chyba pri načítaní formulára:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní formulára' });
  }
};

/**
 * POST /api/forms/:kluc/submit
 * Odoslanie vyplneného formulára návštevníkom.
 */
export const odosliFormular = async (req: Request, res: Response): Promise<void> => {
  try {
    const formular = await najdiFormular(req.params.kluc);

    if (!formular || !formular.aktivny) {
      res.status(404).json({ success: false, message: 'Formulár nebol nájdený' });
      return;
    }

    const vstup = req.body?.udaje ?? req.body ?? {};
    const chyby: string[] = [];
    const udaje: Record<string, unknown> = {};

    for (const pole of formular.polia) {
      const hodnota = (vstup as any)[pole.kod];
      const prazdna =
        hodnota === undefined ||
        hodnota === null ||
        (typeof hodnota === 'string' && hodnota.trim() === '') ||
        (Array.isArray(hodnota) && hodnota.length === 0);

      if (pole.povinne && prazdna) {
        chyby.push(`Pole „${pole.nazov}" je povinné`);
        continue;
      }

      if (prazdna) continue;

      // Text z formulára ide na obrazovku administrácie, takže z neho
      // odstraňujeme značkovanie rovnako ako inde
      if (Array.isArray(hodnota)) {
        udaje[pole.kod] = hodnota.map((h) => sanitizePlainText(String(h)).slice(0, 500));
      } else if (typeof hodnota === 'boolean') {
        udaje[pole.kod] = hodnota;
      } else {
        udaje[pole.kod] = sanitizePlainText(String(hodnota)).slice(0, 5000);
      }

      if (pole.typ === 'email' && !String(hodnota).includes('@')) {
        chyby.push(`Pole „${pole.nazov}" musí obsahovať platný e-mail`);
      }

      if (pole.typ === 'vyber' && pole.moznosti && !pole.moznosti.includes(String(hodnota))) {
        chyby.push(`Pole „${pole.nazov}": zvolená možnosť nie je v zozname`);
      }
    }

    if (chyby.length > 0) {
      res.status(400).json({ success: false, message: 'Formulár nie je vyplnený správne', errors: chyby });
      return;
    }

    const odpoved = await FormularOdpoved.create({
      formular_id: formular.id,
      udaje,
      ip_adresa: req.ip ?? null,
    });

    res.status(201).json({
      success: true,
      data: odpoved.id,
      message: formular.sprava_po_odoslani || 'Ďakujeme, formulár bol odoslaný.',
    });
  } catch (error) {
    console.error('Chyba pri odosielaní formulára:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri odosielaní formulára' });
  }
};

/**
 * GET /api/admin/forms/unread-count
 * Počet neprečítaných odpovedí naprieč formulármi - odznak v menu.
 */
export const getPocetNeprecitanych = async (_req: Request, res: Response): Promise<void> => {
  try {
    const pocet = await FormularOdpoved.count({
      where: { precitane: false },
      include: [{ model: Formular, as: 'formular', where: { aktivity: true }, required: true }],
    });

    res.json({ success: true, data: pocet });
  } catch (error) {
    console.error('Chyba pri počítaní neprečítaných odpovedí:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};
