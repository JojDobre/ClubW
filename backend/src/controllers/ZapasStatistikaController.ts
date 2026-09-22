// Umiestnenie: backend/src/controllers/ZapasStatistikaController.ts
// Správa štatistík zápasu - góly, vlastné góly, asistencie, žlté a červené karty.
//
// PREČO TENTO SÚBOR VZNIKOL: model ZapasStatistika aj databázová tabuľka
// existovali od Fázy 4, ZapasController štatistiky načítaval pri detaile
// zápasu, ale v celom projekte nebol žiadny kód, ktorý by ich vytváral.
// Časť "strelci + minúta, asistenti, karty" tak nebola použiteľná.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import ZapasStatistika from '../models/ZapasStatistika';
import Zapas from '../models/Zapas';
import Player from '../models/Player';
import Team from '../models/Team';

// Povolené typy štatistík (zhodné s ENUM v modeli)
const POVOLENE_TYPY = [
  'gol',
  'asistencia',
  'zlta_karta',
  'cervena_karta',
  'vlastny_gol',
  // Striedanie: hrac_id je ten, kto prichadza, striedany_hrac_id ten,
  // kto odchadza z ihriska.
  'striedanie',
];

// Maximálna minúta - 90 minút + predĺženie + nadstavený čas
const MAX_MINUTA = 130;

/**
 * Jeden záznam štatistiky tak, ako ho posiela klient.
 */
interface StatistikaVstup {
  /** Náš hráč. Pri hosťujúcom sa neuvádza a použije sa meno nižšie. */
  hrac_id?: number | null;
  /** Hosťujúci hráč, ktorý v našej databáze nie je */
  hostujuci_hrac_meno?: string | null;
  hostujuci_hrac_cislo?: number | null;
  typ: string;
  /** Pri striedaní: kto odchádza z ihriska */
  striedany_hrac_id?: number | null;
  striedany_hrac_meno?: string | null;
  minuta?: number | null;
  poznamka?: string | null;
}

/**
 * Overí pole štatistík poslané klientom.
 *
 * @param statistiky - surové dáta z tela požiadavky
 * @returns zoznam chýb (prázdny = dáta sú v poriadku)
 */
export const overStatistiky = async (statistiky: any): Promise<string[]> => {
  const chyby: string[] = [];

  if (!Array.isArray(statistiky)) {
    return ['Štatistiky musia byť pole záznamov'];
  }

  if (statistiky.length > 200) {
    return ['Príliš veľa záznamov štatistík (maximum 200 na zápas)'];
  }

  // ID hráčov si vyzbierame, aby sme databázu volali raz namiesto pre každý záznam
  const idHracov = new Set<number>();

  statistiky.forEach((s: any, index: number) => {
    const poradie = index + 1;

    // Typ udalosti
    if (!s.typ || !POVOLENE_TYPY.includes(s.typ)) {
      chyby.push(`Záznam ${poradie}: neplatný typ "${s.typ}" (povolené: ${POVOLENE_TYPY.join(', ')})`);
    }

    // Hráč. Záznam sa musí týkať buď nášho hráča (hrac_id), alebo
    // hosťujúceho, ktorý v našej databáze nie je a zadáva sa menom.
    const maHracId = s.hrac_id !== undefined && s.hrac_id !== null && s.hrac_id !== '';
    const maMenoHosta =
      typeof s.hostujuci_hrac_meno === 'string' && s.hostujuci_hrac_meno.trim().length > 0;

    if (!maHracId && !maMenoHosta) {
      chyby.push(
        `Záznam ${poradie}: uveďte hrac_id nášho hráča alebo hostujuci_hrac_meno`
      );
    }

    if (maHracId) {
      const hracId = Number(s.hrac_id);
      if (!Number.isInteger(hracId) || hracId <= 0) {
        chyby.push(`Záznam ${poradie}: hrac_id musí byť kladné celé číslo`);
      } else {
        idHracov.add(hracId);
      }
    }

    if (maMenoHosta && s.hostujuci_hrac_meno.length > 100) {
      chyby.push(`Záznam ${poradie}: meno hosťujúceho hráča je príliš dlhé (maximum 100 znakov)`);
    }

    if (
      s.hostujuci_hrac_cislo !== undefined &&
      s.hostujuci_hrac_cislo !== null &&
      s.hostujuci_hrac_cislo !== ''
    ) {
      const cislo = Number(s.hostujuci_hrac_cislo);
      if (!Number.isInteger(cislo) || cislo < 0 || cislo > 999) {
        chyby.push(`Záznam ${poradie}: číslo dresu hosťujúceho hráča musí byť 0-999`);
      }
    }

    // Pri striedaní nás zaujíma aj ten, kto ide z ihriska
    if (s.striedany_hrac_id !== undefined && s.striedany_hrac_id !== null && s.striedany_hrac_id !== '') {
      const striedanyId = Number(s.striedany_hrac_id);
      if (!Number.isInteger(striedanyId) || striedanyId <= 0) {
        chyby.push(`Záznam ${poradie}: striedany_hrac_id musí byť kladné celé číslo`);
      } else {
        idHracov.add(striedanyId);
      }
    }

    // Minúta je voliteľná, ale ak je zadaná, musí dávať zmysel
    if (s.minuta !== undefined && s.minuta !== null && s.minuta !== '') {
      const minuta = Number(s.minuta);
      if (!Number.isInteger(minuta) || minuta < 1 || minuta > MAX_MINUTA) {
        chyby.push(`Záznam ${poradie}: minúta musí byť celé číslo medzi 1 a ${MAX_MINUTA}`);
      }
    }

    // Poznámka
    if (s.poznamka && typeof s.poznamka === 'string' && s.poznamka.length > 500) {
      chyby.push(`Záznam ${poradie}: poznámka je príliš dlhá (maximum 500 znakov)`);
    }
  });

  // Overenie, že všetci uvedení hráči existujú a sú aktívni
  if (idHracov.size > 0) {
    const najdeni = await Player.findAll({
      where: { id: { [Op.in]: Array.from(idHracov) }, aktivity: true },
      attributes: ['id'],
    });
    const najdeneId = new Set(najdeni.map((h: any) => h.id));

    for (const id of idHracov) {
      if (!najdeneId.has(id)) {
        chyby.push(`Hráč s ID ${id} neexistuje alebo nie je aktívny`);
      }
    }
  }

  return chyby;
};

/**
 * Uloží štatistiky zápasu - staré nahradí novými.
 *
 * Používa transakciu: mazanie a vkladanie musia prebehnúť ako jeden celok,
 * inak by pri zlyhaní vkladania zápas ostal úplne bez štatistík.
 *
 * @param zapasId - ID zápasu
 * @param statistiky - overené záznamy štatistík
 */
export const ulozStatistikyZapasu = async (
  zapasId: number,
  statistiky: StatistikaVstup[]
): Promise<void> => {
  await sequelize.transaction(async (t) => {
    // Staré záznamy označíme ako neaktívne (soft delete zachová históriu)
    await ZapasStatistika.update(
      { aktivity: false },
      { where: { zapas_id: zapasId, aktivity: true }, transaction: t }
    );

    if (statistiky.length === 0) {
      return;
    }

    const prazdne = (hodnota: any) =>
      hodnota === undefined || hodnota === null || hodnota === '';

    const zaznamy = statistiky.map((s: any) => ({
      zapas_id: zapasId,
      hrac_id: prazdne(s.hrac_id) ? null : Number(s.hrac_id),
      hostujuci_hrac_meno: s.hostujuci_hrac_meno
        ? String(s.hostujuci_hrac_meno).trim().slice(0, 100)
        : null,
      hostujuci_hrac_cislo: prazdne(s.hostujuci_hrac_cislo)
        ? null
        : Number(s.hostujuci_hrac_cislo),
      striedany_hrac_id: prazdne(s.striedany_hrac_id) ? null : Number(s.striedany_hrac_id),
      striedany_hrac_meno: s.striedany_hrac_meno
        ? String(s.striedany_hrac_meno).trim().slice(0, 100)
        : null,
      typ: s.typ as any,
      // Prázdnu minútu ukladáme ako null (napr. pri karte bez zaznamenaného času)
      minuta:
        s.minuta === undefined || s.minuta === null || (s.minuta as any) === ''
          ? null
          : Number(s.minuta),
      poznamka: s.poznamka ? String(s.poznamka).trim().slice(0, 500) : null,
      aktivity: true,
    }));

    await ZapasStatistika.bulkCreate(zaznamy, { transaction: t });
  });
};

/**
 * GET /api/matches/:id/statistics
 * Načíta štatistiky konkrétneho zápasu.
 */
export const getMatchStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const zapasId = Number(req.params.id);
    if (!Number.isInteger(zapasId) || zapasId <= 0) {
      res.status(400).json({ success: false, message: 'Neplatné ID zápasu' });
      return;
    }

    const zapas = await Zapas.findOne({ where: { id: zapasId, aktivity: true } });
    if (!zapas) {
      res.status(404).json({ success: false, message: 'Zápas nenájdený' });
      return;
    }

    const statistiky = await ZapasStatistika.findAll({
      where: { zapas_id: zapasId, aktivity: true },
      include: [
        {
          model: Player,
          as: 'hrac',
          attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu', 'tim_id'],
        },
      ],
      // Záznamy bez minúty (napr. karta bez času) zaradíme na koniec
      order: [
        [sequelize.literal('CASE WHEN minuta IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['minuta', 'ASC'],
      ],
    });

    // Rozdelenie podľa typu - frontend tak nemusí filtrovať sám
    const podlaTypu = {
      goly: statistiky.filter((s: any) => s.typ === 'gol'),
      vlastne_goly: statistiky.filter((s: any) => s.typ === 'vlastny_gol'),
      asistencie: statistiky.filter((s: any) => s.typ === 'asistencia'),
      zlte_karty: statistiky.filter((s: any) => s.typ === 'zlta_karta'),
      cervene_karty: statistiky.filter((s: any) => s.typ === 'cervena_karta'),
    };

    res.json({
      success: true,
      data: {
        zapas_id: zapasId,
        vsetky: statistiky,
        podla_typu: podlaTypu,
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní štatistík zápasu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní štatistík' });
  }
};

/**
 * PUT /api/matches/:id/statistics
 * Nastaví štatistiky zápasu - kompletne nahradí predchádzajúce.
 *
 * Telo požiadavky:
 * { "statistiky": [ { "hrac_id": 5, "typ": "gol", "minuta": 23 }, ... ] }
 */
export const setMatchStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const zapasId = Number(req.params.id);
    if (!Number.isInteger(zapasId) || zapasId <= 0) {
      res.status(400).json({ success: false, message: 'Neplatné ID zápasu' });
      return;
    }

    const zapas = await Zapas.findOne({ where: { id: zapasId, aktivity: true } });
    if (!zapas) {
      res.status(404).json({ success: false, message: 'Zápas nenájdený' });
      return;
    }

    const statistiky = req.body.statistiky ?? req.body;

    const chyby = await overStatistiky(statistiky);
    if (chyby.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby v štatistikách',
        errors: chyby,
      });
      return;
    }

    await ulozStatistikyZapasu(zapasId, statistiky);

    // Vrátime uložený stav aj s údajmi o hráčoch
    const ulozene = await ZapasStatistika.findAll({
      where: { zapas_id: zapasId, aktivity: true },
      include: [
        {
          model: Player,
          as: 'hrac',
          attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu'],
        },
      ],
      order: [
        [sequelize.literal('CASE WHEN minuta IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['minuta', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: ulozene,
      message: `Uložených ${ulozene.length} záznamov štatistík`,
    });
  } catch (error) {
    console.error('Chyba pri ukladaní štatistík zápasu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri ukladaní štatistík' });
  }
};

/**
 * GET /api/leagues/:id/top-scorers
 * Poradie najlepších strelcov ligy.
 *
 * Query parametre:
 *   limit - počet hráčov (predvolene 10, maximum 100)
 *   typ   - 'gol' (predvolené) alebo 'asistencia'
 */
export const getTopScorers = async (req: Request, res: Response): Promise<void> => {
  try {
    const ligaId = Number(req.params.id);
    if (!Number.isInteger(ligaId) || ligaId <= 0) {
      res.status(400).json({ success: false, message: 'Neplatné ID ligy' });
      return;
    }

    // Limit zhora ohraničíme, aby sa dotaz nedal zneužiť na zaťaženie servera
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const typ = String(req.query.typ || 'gol');
    if (!POVOLENE_TYPY.includes(typ)) {
      res.status(400).json({ success: false, message: `Neplatný typ "${typ}"` });
      return;
    }

    // Zoskupenie počtu udalostí podľa hráča naprieč zápasmi danej ligy
    const poradie = await ZapasStatistika.findAll({
      attributes: [
        'hrac_id',
        [sequelize.fn('COUNT', sequelize.col('ZapasStatistika.id')), 'pocet'],
      ],
      where: { typ: typ as any, aktivity: true },
      include: [
        {
          model: Zapas,
          as: 'zapas',
          attributes: [],
          where: { liga_id: ligaId, aktivity: true },
          required: true,
        },
        {
          model: Player,
          as: 'hrac',
          attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu', 'tim_id'],
          required: true,
          include: [{ model: Team, as: 'tim', attributes: ['id', 'nazov'], required: false }],
        },
      ],
      group: ['ZapasStatistika.hrac_id', 'hrac.id', 'hrac->tim.id'],
      order: [[sequelize.literal('"pocet"'), 'DESC']],
      limit,
      subQuery: false,
    });

    // COUNT vracia pg driver ako reťazec - prevedieme na číslo,
    // inak by sa čísla na frontende spájali namiesto sčítavania
    const vysledok = poradie.map((r: any, index: number) => ({
      poradie: index + 1,
      hrac: r.hrac,
      pocet: Number(r.get('pocet')),
    }));

    res.json({
      success: true,
      data: vysledok,
      meta: { liga_id: ligaId, typ, limit },
    });
  } catch (error) {
    console.error('Chyba pri načítaní poradia strelcov:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní poradia strelcov' });
  }
};
