// Umiestnenie: backend/src/controllers/mediaController.ts
//
// MEDIA KNIŽNICA - správa nahratých súborov.
//
// Okrem bežného CRUD vie povedať, KDE je súbor použitý. Požiadavka
// hovorí „pri obrázkoch aj popis v koľkých článkoch je použitý" -
// a je to aj poistka pred zmazaním niečoho, čo je na webe vidieť.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import multer from 'multer';
import Media from '../models/Media';
import Article from '../models/Article';
import Page from '../models/Page';
import Galeria from '../models/Galeria';
import User from '../models/user';
import { ulozMedium, zmazMedium } from '../utils/mediaUlozisko';
import { sanitizePlainText } from '../utils/sanitize';
import { zostavStrankovanie } from '../utils/odpoved';
import GaleriaObrazok from '../models/GaleriaObrazok';
import Dokument from '../models/Dokument';

/** Maximálna veľkosť jedného súboru. */
const MAX_VELKOST = 10 * 1024 * 1024; // 10 MB

/**
 * Multer ukladá do PAMÄTE, nie na disk.
 *
 * Súbor sa na disk zapíše až po overení skutočného obsahu - rovnako
 * ako pri fotkách hráčov. Zápis neovereného súboru na disk bol práve
 * to, čo robil upload galérie zraniteľným.
 */
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VELKOST, files: 10 },
}).array('subory', 10);

/** Overí ID z adresy. */
const overId = (id: string): number | null => {
  const cislo = Number(id);
  return Number.isInteger(cislo) && cislo > 0 ? cislo : null;
};

/**
 * Zistí, kde všade je súbor použitý.
 *
 * @param cesta - cesta súboru, napríklad /uploads/media/2026/09/foto.jpg
 * @returns počty výskytov podľa miesta použitia
 */
export const zistiPouzitie = async (cesta: string) => {
  const [clankyObrazok, clankyVObsahu, strankyVObsahu, galerieNahlad, fotkyVGaleriach, dokumenty] = await Promise.all([
    // Hlavný obrázok článku
    Article.count({ where: { obrazok: cesta } }),
    // Vložený priamo v texte článku
    Article.count({ where: { obsah: { [Op.iLike]: `%${cesta}%` } } }),
    Page.count({ where: { obsah: { [Op.iLike]: `%${cesta}%` } } }),
    Galeria.count({ where: { nahladovy_obrazok: cesta } }),
    // Fotka v niektorej galérii (aj keď nie je titulná)
    GaleriaObrazok.count({ where: { cesta_suboru: cesta, aktivity: true } }),
    // Súbor na stiahnutie v sekcii Dokumenty
    Dokument.count({ where: { subor_url: cesta, aktivity: true } }),
  ]);

  const clanky = clankyObrazok + clankyVObsahu;
  const galerie = Math.max(galerieNahlad, fotkyVGaleriach);

  return {
    clanky,
    clanky_ako_hlavny_obrazok: clankyObrazok,
    clanky_v_texte: clankyVObsahu,
    stranky: strankyVObsahu,
    galerie,
    dokumenty,
    spolu: clanky + strankyVObsahu + galerie + dokumenty,
  };
};

/**
 * Počet článkov, v ktorých je obrázok použitý - pre výpis knižnice.
 * Hlavný obrázok aj vloženie v texte sa počítajú ako jeden článok.
 */
const pocetClankov = (cesta: string) =>
  Article.count({
    where: { [Op.or]: [{ obrazok: cesta }, { obsah: { [Op.iLike]: `%${cesta}%` } }] },
  });

/**
 * GET /api/admin/media
 * Zoznam súborov. ?typ=obrazok|dokument, ?hladat=, ?limit=, ?offset=
 */
export const getMediaZoznam = async (req: Request, res: Response): Promise<void> => {
  try {
    const kde: any = { aktivity: true };

    if (req.query.typ && ['obrazok', 'dokument', 'ine'].includes(String(req.query.typ))) {
      kde.typ = req.query.typ;
    }

    if (req.query.hladat) {
      const hladat = String(req.query.hladat).trim();
      kde[Op.or] = [
        { nazov: { [Op.iLike]: `%${hladat}%` } },
        { originalny_nazov: { [Op.iLike]: `%${hladat}%` } },
        { alt_text: { [Op.iLike]: `%${hladat}%` } },
      ];
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { count, rows } = await Media.findAndCountAll({
      where: kde,
      include: [{ model: User, as: 'autor', attributes: ['id', 'meno'], required: false }],
      order: [['vytvoreny', 'DESC']],
      limit,
      offset,
    });

    const pocty = await Promise.all(rows.map((m) => (m.typ === 'obrazok' ? pocetClankov(m.cesta) : 0)));

    res.json({
      success: true,
      data: rows.map((m, i) => ({ ...m.toSafeJSON(), pocet_clankov: pocty[i] })),
      pagination: zostavStrankovanie(count, limit, offset),
    });
  } catch (error) {
    console.error('Chyba pri načítaní media knižnice:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní knižnice' });
  }
};

/**
 * GET /api/admin/media/:id
 * Detail súboru vrátane toho, kde všade je použitý.
 */
export const getMedium = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID súboru musí byť kladné celé číslo' });
      return;
    }

    const medium = await Media.findOne({
      where: { id, aktivity: true },
      include: [{ model: User, as: 'autor', attributes: ['id', 'meno'], required: false }],
    });

    if (!medium) {
      res.status(404).json({ success: false, message: 'Súbor nebol nájdený' });
      return;
    }

    const pouzitie = await zistiPouzitie(medium.cesta);

    res.json({
      success: true,
      data: { ...medium.toSafeJSON(), pouzitie },
    });
  } catch (error) {
    console.error('Chyba pri načítaní súboru:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní súboru' });
  }
};

/**
 * POST /api/admin/media/upload
 * Nahratie jedného alebo viacerých súborov (pole "subory").
 */
export const nahrajMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const subory = (req.files as Express.Multer.File[]) || [];

    if (subory.length === 0) {
      res.status(400).json({ success: false, message: 'Žiadny súbor nebol nahraný' });
      return;
    }

    const nahrate: any[] = [];
    const chyby: string[] = [];

    for (const subor of subory) {
      try {
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

        nahrate.push(medium.toSafeJSON());
      } catch (chyba: any) {
        chyby.push(`${subor.originalname}: ${chyba?.message || 'nepodarilo sa uložiť'}`);
      }
    }

    if (nahrate.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Žiadny súbor sa nepodarilo uložiť',
        errors: chyby,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: nahrate,
      errors: chyby.length > 0 ? chyby : undefined,
      message: `Nahratých ${nahrate.length} súborov`,
    });
  } catch (error) {
    console.error('Chyba pri nahrávaní súborov:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri nahrávaní súborov' });
  }
};

/**
 * PUT /api/admin/media/:id
 * Úprava popisných údajov. Samotný súbor sa nemení - na to slúži
 * nové nahratie, aby sa nerozbili odkazy na starú cestu.
 */
export const updateMedium = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID súboru musí byť kladné celé číslo' });
      return;
    }

    const medium = await Media.findOne({ where: { id, aktivity: true } });
    if (!medium) {
      res.status(404).json({ success: false, message: 'Súbor nebol nájdený' });
      return;
    }

    const udaje: any = {};
    if (req.body.nazov !== undefined) {
      udaje.nazov = sanitizePlainText(String(req.body.nazov)).trim().slice(0, 200);
    }
    if (req.body.alt_text !== undefined) {
      udaje.alt_text = req.body.alt_text
        ? sanitizePlainText(String(req.body.alt_text)).trim().slice(0, 255)
        : null;
    }
    if (req.body.popis !== undefined) {
      udaje.popis = req.body.popis ? sanitizePlainText(String(req.body.popis)) : null;
    }

    if (udaje.nazov !== undefined && udaje.nazov.length === 0) {
      res.status(400).json({ success: false, message: 'Názov súboru nesmie byť prázdny' });
      return;
    }

    await medium.update(udaje);

    res.json({
      success: true,
      data: medium.toSafeJSON(),
      message: 'Údaje súboru boli upravené',
    });
  } catch (error) {
    console.error('Chyba pri úprave súboru:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri úprave súboru' });
  }
};

/**
 * DELETE /api/admin/media/:id
 *
 * Súbor, ktorý je niekde použitý, sa nezmaže - inak by na webe zostal
 * prázdny obrázok. Zmazanie sa dá vynútiť cez ?force=true.
 */
export const deleteMedium = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID súboru musí byť kladné celé číslo' });
      return;
    }

    const medium = await Media.findOne({ where: { id, aktivity: true } });
    if (!medium) {
      res.status(404).json({ success: false, message: 'Súbor nebol nájdený' });
      return;
    }

    const pouzitie = await zistiPouzitie(medium.cesta);

    if (pouzitie.spolu > 0 && req.query.force !== 'true') {
      res.status(409).json({
        success: false,
        message:
          `Súbor je použitý na ${pouzitie.spolu} miestach ` +
          `(články: ${pouzitie.clanky}, stránky: ${pouzitie.stranky}, galérie: ${pouzitie.galerie}, ` +
          `dokumenty: ${pouzitie.dokumenty}). ` +
          'Zmazaním by tam zostal nefunkčný odkaz. Ak to naozaj chcete, ' +
          'zopakujte požiadavku s ?force=true',
        data: pouzitie,
      });
      return;
    }

    const cesta = medium.cesta;
    await medium.destroy();
    await zmazMedium(cesta);

    res.json({ success: true, message: `Súbor ${medium.nazov} bol zmazaný` });
  } catch (error) {
    console.error('Chyba pri mazaní súboru:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní súboru' });
  }
};
