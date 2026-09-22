// Umiestnenie: backend/src/controllers/kalendarUdalostController.ts
//
// UDALOSTI V KALENDÁRI - tréningy, sústredenia, klubové akcie.
//
// Opakovanie je uložené ako pravidlo. Tento controller ho pri čítaní
// rozvinie na konkrétne dni v žiadanom rozsahu, takže administrácia aj
// web dostanú hotový zoznam výskytov a nemusia pravidlo riešiť samy.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import KalendarUdalost, { TypOpakovania } from '../models/KalendarUdalost';
import Team from '../models/Team';
import { sanitizePlainText } from '../utils/sanitize';

const OPAKOVANIA: TypOpakovania[] = ['ziadne', 'denne', 'tyzdenne', 'dvojtyzdenne', 'mesacne'];

/**
 * Koľko výskytov najviac vrátime na jednu udalosť.
 *
 * Poistka proti dotazu na desať rokov dopredu pri dennom opakovaní -
 * bez nej by odpoveď narástla do tisícov položiek.
 */
const MAX_VYSKYTOV = 400;

/** Prevedie Date na "YYYY-MM-DD" bez ohľadu na časové pásmo. */
const naDatum = (d: Date): string => {
  const rok = d.getFullYear();
  const mesiac = String(d.getMonth() + 1).padStart(2, '0');
  const den = String(d.getDate()).padStart(2, '0');
  return `${rok}-${mesiac}-${den}`;
};

/**
 * Rozvinie pravidlo opakovania na konkrétne dátumy v rozsahu.
 *
 * @param udalost - udalosť s pravidlom
 * @param od - začiatok žiadaného rozsahu (YYYY-MM-DD)
 * @param doKedy - koniec žiadaného rozsahu (YYYY-MM-DD)
 * @returns zoznam dátumov, kedy udalosť v tomto rozsahu nastane
 */
export const rozvinOpakovanie = (
  udalost: { datum: string; opakovanie: TypOpakovania; opakovanie_do: string | null },
  od: string,
  doKedy: string
): string[] => {
  // Bez opakovania je to jediný deň - buď do rozsahu padne, alebo nie
  if (udalost.opakovanie === 'ziadne') {
    return udalost.datum >= od && udalost.datum <= doKedy ? [udalost.datum] : [];
  }

  // Rad nemôže presiahnuť ani koniec opakovania, ani koniec rozsahu
  const koniec = udalost.opakovanie_do && udalost.opakovanie_do < doKedy
    ? udalost.opakovanie_do
    : doKedy;

  const vyskyty: string[] = [];
  const aktualny = new Date(`${udalost.datum}T00:00:00`);

  while (vyskyty.length < MAX_VYSKYTOV) {
    const den = naDatum(aktualny);
    if (den > koniec) break;
    if (den >= od) vyskyty.push(den);

    switch (udalost.opakovanie) {
      case 'denne':
        aktualny.setDate(aktualny.getDate() + 1);
        break;
      case 'tyzdenne':
        aktualny.setDate(aktualny.getDate() + 7);
        break;
      case 'dvojtyzdenne':
        aktualny.setDate(aktualny.getDate() + 14);
        break;
      case 'mesacne':
        aktualny.setMonth(aktualny.getMonth() + 1);
        break;
      default:
        return vyskyty;
    }
  }

  return vyskyty;
};

/** Overí, že reťazec je dátum v tvare YYYY-MM-DD. */
const jeDatum = (hodnota: unknown): boolean =>
  typeof hodnota === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(hodnota) && !isNaN(Date.parse(hodnota));

/** Vyberie z tela len povolené polia, a to len tie, ktoré klient poslal. */
const pripravUdaje = (telo: any): { udaje: Record<string, unknown>; chyba: string | null } => {
  const udaje: Record<string, unknown> = {};

  if (telo.nazov !== undefined) udaje.nazov = sanitizePlainText(String(telo.nazov)).trim();
  if (telo.popis !== undefined) {
    udaje.popis = telo.popis ? sanitizePlainText(String(telo.popis)) : null;
  }
  if (telo.miesto !== undefined) {
    udaje.miesto = telo.miesto ? sanitizePlainText(String(telo.miesto)).trim() : null;
  }
  if (telo.tim_id !== undefined) udaje.tim_id = telo.tim_id || null;
  if (telo.cas_od !== undefined) udaje.cas_od = telo.cas_od || null;
  if (telo.cas_do !== undefined) udaje.cas_do = telo.cas_do || null;
  if (telo.aktivity !== undefined) udaje.aktivity = Boolean(telo.aktivity);

  if (telo.datum !== undefined) {
    if (!jeDatum(telo.datum)) {
      return { udaje, chyba: 'Dátum musí byť v tvare RRRR-MM-DD' };
    }
    udaje.datum = telo.datum;
  }

  if (telo.opakovanie !== undefined) {
    if (!OPAKOVANIA.includes(telo.opakovanie)) {
      return { udaje, chyba: `Opakovanie musí byť jedno z: ${OPAKOVANIA.join(', ')}` };
    }
    udaje.opakovanie = telo.opakovanie;
  }

  if (telo.opakovanie_do !== undefined) {
    if (telo.opakovanie_do && !jeDatum(telo.opakovanie_do)) {
      return { udaje, chyba: 'Koniec opakovania musí byť v tvare RRRR-MM-DD' };
    }
    udaje.opakovanie_do = telo.opakovanie_do || null;
  }

  return { udaje, chyba: null };
};

/**
 * GET /api/calendar/events?od=2026-10-01&do=2026-10-31&tim_id=1
 *
 * Vráti konkrétne výskyty udalostí v zadanom rozsahu. Bez rozsahu
 * použije aktuálny mesiac.
 */
export const getUdalosti = async (req: Request, res: Response): Promise<void> => {
  try {
    const dnes = new Date();
    const od = jeDatum(req.query.od)
      ? String(req.query.od)
      : naDatum(new Date(dnes.getFullYear(), dnes.getMonth(), 1));
    const doKedy = jeDatum(req.query.do)
      ? String(req.query.do)
      : naDatum(new Date(dnes.getFullYear(), dnes.getMonth() + 1, 0));

    if (od > doKedy) {
      res.status(400).json({ success: false, message: 'Začiatok rozsahu je po jeho konci' });
      return;
    }

    const kde: any = { aktivity: true };
    if (req.query.tim_id) {
      const timId = Number(req.query.tim_id);
      if (Number.isInteger(timId) && timId > 0) kde.tim_id = timId;
    }

    // Vyberieme udalosti, ktoré sa do rozsahu vôbec môžu trafiť:
    // začínajú najneskôr na jeho konci a neskončili pred jeho začiatkom.
    kde.datum = { [Op.lte]: doKedy };
    kde[Op.or] = [{ opakovanie_do: null }, { opakovanie_do: { [Op.gte]: od } }];

    const udalosti = await KalendarUdalost.findAll({
      where: kde,
      include: [
        { model: Team, as: 'tim', attributes: ['id', 'nazov', 'farba_prva'], required: false },
      ],
      order: [['datum', 'ASC']],
    });

    const vyskyty: any[] = [];

    for (const udalost of udalosti) {
      const dni = rozvinOpakovanie(udalost, od, doKedy);
      const zaklad = udalost.toSafeJSON();

      for (const den of dni) {
        vyskyty.push({
          ...zaklad,
          // Deň tohto konkrétneho výskytu; "datum" zostáva začiatkom radu
          datum_vyskytu: den,
          // Kalendár v administrácii ho zobrazuje pod farbou tímu
          farba: zaklad.tim?.farba || null,
        });
      }
    }

    vyskyty.sort((a, b) => {
      if (a.datum_vyskytu !== b.datum_vyskytu) {
        return a.datum_vyskytu < b.datum_vyskytu ? -1 : 1;
      }
      return String(a.cas_od || '').localeCompare(String(b.cas_od || ''));
    });

    res.json({
      success: true,
      data: vyskyty,
      rozsah: { od, do: doKedy },
      message: `Nájdených ${vyskyty.length} výskytov udalostí`,
    });
  } catch (error) {
    console.error('Chyba pri načítaní udalostí kalendára:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní udalostí' });
  }
};

/** GET /api/calendar/events/:id - jedna udalosť aj s pravidlom opakovania */
export const getUdalost = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ success: false, message: 'ID udalosti musí byť kladné celé číslo' });
      return;
    }

    const udalost = await KalendarUdalost.findOne({
      where: { id, aktivity: true },
      include: [
        { model: Team, as: 'tim', attributes: ['id', 'nazov', 'farba_prva'], required: false },
      ],
    });

    if (!udalost) {
      res.status(404).json({ success: false, message: 'Udalosť nebola nájdená' });
      return;
    }

    res.json({ success: true, data: udalost.toSafeJSON() });
  } catch (error) {
    console.error('Chyba pri načítaní udalosti:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní udalosti' });
  }
};

/** POST /api/calendar/events */
export const createUdalost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { udaje, chyba } = pripravUdaje(req.body);
    if (chyba) {
      res.status(400).json({ success: false, message: chyba });
      return;
    }

    if (!udaje.nazov || String(udaje.nazov).length < 2) {
      res.status(400).json({ success: false, message: 'Názov udalosti musí mať aspoň 2 znaky' });
      return;
    }
    if (!udaje.datum) {
      res.status(400).json({ success: false, message: 'Dátum udalosti je povinný' });
      return;
    }

    if (udaje.tim_id) {
      const tim = await Team.findOne({ where: { id: udaje.tim_id as number, aktivity: true } });
      if (!tim) {
        res.status(400).json({ success: false, message: `Tím s ID ${udaje.tim_id} neexistuje` });
        return;
      }
    }

    const udalost = await KalendarUdalost.create(udaje as any);

    res.status(201).json({
      success: true,
      data: udalost.toSafeJSON(),
      message: `Udalosť ${udalost.nazov} bola vytvorená`,
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
    console.error('Chyba pri vytváraní udalosti:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní udalosti' });
  }
};

/** PUT /api/calendar/events/:id - zmena platí pre celý rad opakovania */
export const updateUdalost = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ success: false, message: 'ID udalosti musí byť kladné celé číslo' });
      return;
    }

    const udalost = await KalendarUdalost.findOne({ where: { id, aktivity: true } });
    if (!udalost) {
      res.status(404).json({ success: false, message: 'Udalosť nebola nájdená' });
      return;
    }

    const { udaje, chyba } = pripravUdaje(req.body);
    if (chyba) {
      res.status(400).json({ success: false, message: chyba });
      return;
    }

    if (udaje.tim_id) {
      const tim = await Team.findOne({ where: { id: udaje.tim_id as number, aktivity: true } });
      if (!tim) {
        res.status(400).json({ success: false, message: `Tím s ID ${udaje.tim_id} neexistuje` });
        return;
      }
    }

    await udalost.update(udaje);

    res.json({
      success: true,
      data: udalost.toSafeJSON(),
      message: `Udalosť ${udalost.nazov} bola upravená`,
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
    console.error('Chyba pri úprave udalosti:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri úprave udalosti' });
  }
};

/** DELETE /api/calendar/events/:id - zruší celý rad opakovania */
export const deleteUdalost = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ success: false, message: 'ID udalosti musí byť kladné celé číslo' });
      return;
    }

    const udalost = await KalendarUdalost.findOne({ where: { id, aktivity: true } });
    if (!udalost) {
      res.status(404).json({ success: false, message: 'Udalosť nebola nájdená' });
      return;
    }

    await udalost.update({ aktivity: false });

    res.json({ success: true, message: `Udalosť ${udalost.nazov} bola odstránená` });
  } catch (error) {
    console.error('Chyba pri mazaní udalosti:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní udalosti' });
  }
};
