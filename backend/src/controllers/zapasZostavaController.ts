// Umiestnenie: backend/src/controllers/zapasZostavaController.ts
//
// ZOSTAVA A PRIEBEH ZÁPASU
//
// Dve veci, ktoré v zápase chýbali:
//   1. kto nastúpil v základe, kto bol na lavičke a koľko minút odohral
//   2. voľný textový priebeh zápasu (udalosti, ktoré nie sú štatistikou
//      viazanou na hráča)
//
// Zostava sa ukladá celá naraz - rovnako ako štatistiky. Administrácia
// pošle výsledný stav a backend ho nahradí, takže netreba riešiť, čo
// presne sa v nej zmenilo.

import { Request, Response } from 'express';
import sequelize from '../config/database';
import Zapas from '../models/Zapas';
import Player from '../models/Player';
import ZapasZostava from '../models/ZapasZostava';
import ZapasUdalost from '../models/ZapasUdalost';
import { sanitizePlainText } from '../utils/sanitize';

const STRANY = ['domaci', 'hostia'];
const ZARADENIA = ['zakladna', 'lavicka'];
const MAX_HRACOV = 40;
const MAX_UDALOSTI = 200;

/** Načíta zápas podľa ID z adresy, alebo pošle chybovú odpoveď. */
const najdiZapas = async (req: Request, res: Response): Promise<Zapas | null> => {
  const zapasId = Number(req.params.id);
  if (!Number.isInteger(zapasId) || zapasId <= 0) {
    res.status(400).json({ success: false, message: 'Neplatné ID zápasu' });
    return null;
  }

  const zapas = await Zapas.findOne({ where: { id: zapasId, aktivity: true } });
  if (!zapas) {
    res.status(404).json({ success: false, message: 'Zápas nenájdený' });
    return null;
  }

  return zapas;
};

const prazdne = (hodnota: any) => hodnota === undefined || hodnota === null || hodnota === '';

/**
 * Overí zoznam hráčov v zostave.
 *
 * @returns zoznam chýb; prázdny znamená, že je všetko v poriadku
 */
const overZostavu = async (zostava: any): Promise<string[]> => {
  const chyby: string[] = [];

  if (!Array.isArray(zostava)) {
    return ['Zostava musí byť pole záznamov'];
  }

  if (zostava.length > MAX_HRACOV) {
    return [`Príliš veľa hráčov v zostave (maximum ${MAX_HRACOV})`];
  }

  const idHracov = new Set<number>();
  const uzPouziteId = new Set<number>();

  zostava.forEach((z: any, index: number) => {
    const poradie = index + 1;

    if (!STRANY.includes(z.strana)) {
      chyby.push(`Záznam ${poradie}: strana musí byť jedna z: ${STRANY.join(', ')}`);
    }

    if (z.zaradenie !== undefined && !ZARADENIA.includes(z.zaradenie)) {
      chyby.push(`Záznam ${poradie}: zaradenie musí byť jedno z: ${ZARADENIA.join(', ')}`);
    }

    // Náš hráč alebo hosťujúci zadaný menom
    const maHracId = !prazdne(z.hrac_id);
    const maMeno =
      typeof z.hostujuci_hrac_meno === 'string' && z.hostujuci_hrac_meno.trim().length > 0;

    if (!maHracId && !maMeno) {
      chyby.push(`Záznam ${poradie}: uveďte hrac_id nášho hráča alebo hostujuci_hrac_meno`);
    }

    if (maHracId) {
      const hracId = Number(z.hrac_id);
      if (!Number.isInteger(hracId) || hracId <= 0) {
        chyby.push(`Záznam ${poradie}: hrac_id musí byť kladné celé číslo`);
      } else {
        // Jeden hráč smie byť v zostave zápasu len raz - inak by sa mu
        // odohrané minúty počítali dvakrát
        if (uzPouziteId.has(hracId)) {
          chyby.push(`Záznam ${poradie}: hráč s ID ${hracId} je v zostave uvedený viackrát`);
        }
        uzPouziteId.add(hracId);
        idHracov.add(hracId);
      }
    }

    if (!prazdne(z.odohrane_minuty)) {
      const minuty = Number(z.odohrane_minuty);
      if (!Number.isInteger(minuty) || minuty < 0 || minuty > 150) {
        chyby.push(`Záznam ${poradie}: odohrané minúty musia byť celé číslo medzi 0 a 150`);
      }
    }

    if (!prazdne(z.hostujuci_hrac_cislo)) {
      const cislo = Number(z.hostujuci_hrac_cislo);
      if (!Number.isInteger(cislo) || cislo < 0 || cislo > 999) {
        chyby.push(`Záznam ${poradie}: číslo dresu musí byť 0-999`);
      }
    }
  });

  // Overíme, že všetci naši hráči existujú - jedným dotazom
  if (idHracov.size > 0) {
    const najdeni = await Player.findAll({
      where: { id: Array.from(idHracov) },
      attributes: ['id'],
    });
    const najdeneId = new Set(najdeni.map((h: any) => h.id));

    for (const id of idHracov) {
      if (!najdeneId.has(id)) {
        chyby.push(`Hráč s ID ${id} neexistuje`);
      }
    }
  }

  return chyby;
};

/**
 * GET /api/matches/:id/lineup
 * Zostava zápasu rozdelená na domácich a hostí, základ a lavičku.
 */
export const getZostava = async (req: Request, res: Response): Promise<void> => {
  try {
    const zapas = await najdiZapas(req, res);
    if (!zapas) return;

    const zaznamy = await ZapasZostava.findAll({
      where: { zapas_id: zapas.id },
      include: [
        { model: Player, as: 'hrac', attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu'], required: false },
      ],
      order: [['strana', 'ASC'], ['zaradenie', 'ASC'], ['id', 'ASC']],
    });

    const vsetky = zaznamy.map((z) => z.toSafeJSON());
    const podla = (strana: string, zaradenie: string) =>
      vsetky.filter((z) => z.strana === strana && z.zaradenie === zaradenie);

    res.json({
      success: true,
      data: {
        zapas_id: zapas.id,
        domaci: {
          zakladna: podla('domaci', 'zakladna'),
          lavicka: podla('domaci', 'lavicka'),
        },
        hostia: {
          zakladna: podla('hostia', 'zakladna'),
          lavicka: podla('hostia', 'lavicka'),
        },
        vsetky,
        pocet: vsetky.length,
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní zostavy:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní zostavy' });
  }
};

/**
 * PUT /api/matches/:id/lineup
 * Nahradí celú zostavu zápasu.
 *
 * Telo: { "zostava": [ { "strana": "domaci", "hrac_id": 5,
 *                        "zaradenie": "zakladna", "odohrane_minuty": 90 } ] }
 */
export const setZostava = async (req: Request, res: Response): Promise<void> => {
  try {
    const zapas = await najdiZapas(req, res);
    if (!zapas) return;

    const zostava = req.body.zostava ?? req.body;

    const chyby = await overZostavu(zostava);
    if (chyby.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby v zostave',
        errors: chyby,
      });
      return;
    }

    // Celá výmena v jednej transakcii - keď niečo padne, zostava zostane
    // v pôvodnom stave a nie rozpísaná do polovice
    await sequelize.transaction(async (t) => {
      await ZapasZostava.destroy({ where: { zapas_id: zapas.id }, transaction: t });

      if (zostava.length === 0) return;

      await ZapasZostava.bulkCreate(
        zostava.map((z: any) => ({
          zapas_id: zapas.id,
          strana: z.strana,
          hrac_id: prazdne(z.hrac_id) ? null : Number(z.hrac_id),
          hostujuci_hrac_meno: z.hostujuci_hrac_meno
            ? sanitizePlainText(String(z.hostujuci_hrac_meno)).trim().slice(0, 100)
            : null,
          hostujuci_hrac_cislo: prazdne(z.hostujuci_hrac_cislo)
            ? null
            : Number(z.hostujuci_hrac_cislo),
          zaradenie: z.zaradenie || 'zakladna',
          odohrane_minuty: prazdne(z.odohrane_minuty) ? null : Number(z.odohrane_minuty),
          kapitan: Boolean(z.kapitan),
          poznamka: z.poznamka ? sanitizePlainText(String(z.poznamka)).slice(0, 255) : null,
        })),
        { transaction: t }
      );
    });

    const ulozene = await ZapasZostava.findAll({
      where: { zapas_id: zapas.id },
      include: [
        { model: Player, as: 'hrac', attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu'], required: false },
      ],
      order: [['strana', 'ASC'], ['zaradenie', 'ASC'], ['id', 'ASC']],
    });

    res.json({
      success: true,
      data: ulozene.map((z) => z.toSafeJSON()),
      message: `Uložená zostava (${ulozene.length} hráčov)`,
    });
  } catch (error) {
    console.error('Chyba pri ukladaní zostavy:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri ukladaní zostavy' });
  }
};

/**
 * GET /api/matches/:id/events
 * Voľné udalosti zo zápasu, zoradené podľa minúty.
 */
export const getUdalosti = async (req: Request, res: Response): Promise<void> => {
  try {
    const zapas = await najdiZapas(req, res);
    if (!zapas) return;

    const udalosti = await ZapasUdalost.findAll({
      where: { zapas_id: zapas.id },
      // Udalosti bez minúty (pred zápasom, po ňom) patria nakoniec
      order: [
        [sequelize.literal('CASE WHEN minuta IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['minuta', 'ASC'],
        ['poradie', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: udalosti.map((u) => u.toSafeJSON()),
      pocet: udalosti.length,
    });
  } catch (error) {
    console.error('Chyba pri načítaní udalostí zápasu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní udalostí' });
  }
};

/**
 * PUT /api/matches/:id/events
 * Nahradí celý priebeh zápasu.
 *
 * Telo: { "udalosti": [ { "minuta": 12, "text": "Domáci menia brankára" } ] }
 */
export const setUdalosti = async (req: Request, res: Response): Promise<void> => {
  try {
    const zapas = await najdiZapas(req, res);
    if (!zapas) return;

    const udalosti = req.body.udalosti ?? req.body;

    if (!Array.isArray(udalosti)) {
      res.status(400).json({ success: false, message: 'Udalosti musia byť pole záznamov' });
      return;
    }

    if (udalosti.length > MAX_UDALOSTI) {
      res.status(400).json({
        success: false,
        message: `Príliš veľa udalostí (maximum ${MAX_UDALOSTI} na zápas)`,
      });
      return;
    }

    const chyby: string[] = [];
    udalosti.forEach((u: any, index: number) => {
      const poradie = index + 1;

      if (!u.text || typeof u.text !== 'string' || u.text.trim().length === 0) {
        chyby.push(`Udalosť ${poradie}: text nesmie byť prázdny`);
      } else if (u.text.length > 1000) {
        chyby.push(`Udalosť ${poradie}: text je príliš dlhý (maximum 1000 znakov)`);
      }

      if (!prazdne(u.minuta)) {
        const minuta = Number(u.minuta);
        if (!Number.isInteger(minuta) || minuta < 0 || minuta > 150) {
          chyby.push(`Udalosť ${poradie}: minúta musí byť celé číslo medzi 0 a 150`);
        }
      }
    });

    if (chyby.length > 0) {
      res.status(400).json({ success: false, message: 'Validačné chyby v udalostiach', errors: chyby });
      return;
    }

    await sequelize.transaction(async (t) => {
      await ZapasUdalost.destroy({ where: { zapas_id: zapas.id }, transaction: t });

      if (udalosti.length === 0) return;

      await ZapasUdalost.bulkCreate(
        udalosti.map((u: any, index: number) => ({
          zapas_id: zapas.id,
          minuta: prazdne(u.minuta) ? null : Number(u.minuta),
          text: sanitizePlainText(String(u.text)).trim().slice(0, 1000),
          poradie: prazdne(u.poradie) ? index : Number(u.poradie),
        })),
        { transaction: t }
      );
    });

    const ulozene = await ZapasUdalost.findAll({
      where: { zapas_id: zapas.id },
      order: [
        [sequelize.literal('CASE WHEN minuta IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['minuta', 'ASC'],
        ['poradie', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: ulozene.map((u) => u.toSafeJSON()),
      message: `Uložených ${ulozene.length} udalostí`,
    });
  } catch (error) {
    console.error('Chyba pri ukladaní udalostí zápasu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri ukladaní udalostí' });
  }
};
